
const crypto = require('crypto');
const pool = require('../config/database');

const {
  getTVPlans,
  verifyTVAccount,
  purchaseTV,
  generateRequestId,
} = require('../services/tvService');

// ============================================================
// ZENIMONIES BANKING — SOGO TV CONTROLLER
//
// Providers:
// - DSTV
// - GOTV
// - STARTIMES
//
// Uses:
// - bill_payments
// - transactions
// - accounts
//
// Sogo idempotency key is stored BEFORE provider purchase.
// ============================================================

// ============================================================
// HELPERS
// ============================================================

const createReference = () => (
  `ZEN-TV-${Date.now()}-${crypto
    .randomBytes(6)
    .toString('hex')
    .toUpperCase()}`
);

const getUserId = (req) => (
  req.user?.id ||
  req.user?.userId ||
  req.user?.user_id ||
  null
);

const cleanValue = (value) => (
  String(value || '').trim()
);

const cleanCustomerReference = (value) => (
  String(value || '').replace(/\D/g, '').trim()
);

const cleanPhoneNumber = (value) => (
  String(value || '').replace(/\D/g, '').trim()
);

const normalizeProvider = (provider) => {
  const value = String(provider || '')
    .trim()
    .toUpperCase();

  return ['DSTV', 'GOTV', 'STARTIMES'].includes(value)
    ? value
    : '';
};

const getSogoTransaction = (response) => (
  response?.data?.data ||
  response?.data ||
  response?.transaction ||
  response ||
  {}
);

const getProviderStatus = (response) => {
  const transaction = getSogoTransaction(response);

  const status = String(
    transaction?.status ||
    response?.status ||
    ''
  ).trim().toLowerCase();

  if ([
    'completed',
    'complete',
    'successful',
    'success',
  ].includes(status)) {
    return 'completed';
  }

  if ([
    'processing',
    'pending',
    'initiated',
    'queued',
  ].includes(status)) {
    return 'pending';
  }

  if ([
    'failed',
    'failure',
    'declined',
    'cancelled',
    'canceled',
  ].includes(status)) {
    return 'failed';
  }

  if (status === 'refunded') {
    return 'refunded';
  }

  // Unknown responses are never treated as failure.
  return 'unknown';
};

const getProviderReference = (response, fallback) => {
  const transaction = getSogoTransaction(response);

  return (
    transaction?.reference ||
    transaction?.id ||
    transaction?.transaction_id ||
    response?.reference ||
    response?.transaction_id ||
    fallback ||
    null
  );
};

const getProviderMessage = (response) => {
  const transaction = getSogoTransaction(response);

  return (
    transaction?.message ||
    transaction?.description ||
    response?.message ||
    response?.description ||
    null
  );
};

const getCustomerName = (response) => (
  response?.content?.Customer_Name ||
  response?.content?.customer_name ||
  response?.verification?.customer_name ||
  response?.verification?.name ||
  response?.customer?.name ||
  ''
);

const getCommissionDetails = (response) => (
  response?.commission_details ||
  response?.data?.commission_details ||
  null
);

// ============================================================
// SAVE PROVIDER RESPONSE
// ============================================================

const saveProviderResponse = async ({
  billPaymentId,
  providerReference,
  providerRequestId,
  providerResponse,
  status,
}) => {
  await pool.query(
    `
    UPDATE bill_payments
    SET
      provider_reference = $1,
      provider_request_id = $2,
      provider_response = $3::jsonb,
      status = $4
    WHERE id = $5
      AND status = 'pending'
    `,
    [
      providerReference,
      providerRequestId,
      JSON.stringify(providerResponse || {}),
      status,
      billPaymentId,
    ]
  );
};

// ============================================================
// COMPLETE TV TRANSACTION
// ============================================================

const completeTVTransaction = async ({
  billPaymentId,
  reference,
  providerReference,
  providerRequestId,
  providerResponse,
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const paymentResult = await client.query(
      `
      SELECT id, status
      FROM bill_payments
      WHERE id = $1
      FOR UPDATE
      `,
      [billPaymentId]
    );

    if (!paymentResult.rows.length) {
      throw new Error('TV payment record not found.');
    }

    const currentStatus = paymentResult.rows[0].status;

    if (currentStatus === 'completed') {
      await client.query('COMMIT');

      return {
        status: 'completed',
        alreadyProcessed: true,
      };
    }

    if (currentStatus !== 'pending') {
      await client.query('COMMIT');

      return {
        status: currentStatus,
        alreadyProcessed: true,
      };
    }

    await client.query(
      `
      UPDATE bill_payments
      SET
        provider_reference = $1,
        provider_request_id = $2,
        provider_response = $3::jsonb,
        commission_details = $4,
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP
      WHERE id = $5
        AND status = 'pending'
      `,
      [
        providerReference,
        providerRequestId,
        JSON.stringify(providerResponse || {}),
        getCommissionDetails(providerResponse),
        billPaymentId,
      ]
    );

    await client.query(
      `
      UPDATE transactions
      SET status = 'completed'
      WHERE reference = $1
        AND status = 'pending'
      `,
      [reference]
    );

    await client.query('COMMIT');

    return {
      status: 'completed',
      alreadyProcessed: false,
    };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}

    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// REFUND TV TRANSACTION
//
// The bill payment row is locked before crediting the wallet.
// This makes duplicate failure/refund processing safe.
// ============================================================

const refundTVTransaction = async ({
  billPaymentId,
  reference,
  providerReference,
  providerRequestId,
  providerResponse,
  finalStatus = 'failed',
  failureReason,
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const paymentResult = await client.query(
      `
      SELECT
        id,
        account_id,
        amount,
        currency,
        status,
        reference,
        biller_name
      FROM bill_payments
      WHERE id = $1
      FOR UPDATE
      `,
      [billPaymentId]
    );

    if (!paymentResult.rows.length) {
      throw new Error('TV payment not found during refund.');
    }

    const payment = paymentResult.rows[0];

    if ([
      'failed',
      'refunded',
    ].includes(String(payment.status).toLowerCase())) {
      await client.query('COMMIT');

      return {
        status: payment.status,
        refunded: true,
        alreadyProcessed: true,
      };
    }

    if (payment.status === 'completed') {
      await client.query('COMMIT');

      return {
        status: 'completed',
        refunded: false,
        alreadyProcessed: true,
      };
    }

    if (payment.status !== 'pending') {
      await client.query('COMMIT');

      return {
        status: payment.status,
        refunded: false,
        alreadyProcessed: true,
      };
    }

    const accountResult = await client.query(
      `
      SELECT id, balance
      FROM accounts
      WHERE id = $1
      FOR UPDATE
      `,
      [payment.account_id]
    );

    if (!accountResult.rows.length) {
      throw new Error('Customer wallet not found during TV refund.');
    }

    const currentBalance = Number(accountResult.rows[0].balance);
    const refundAmount = Number(payment.amount);

    if (
      !Number.isFinite(currentBalance) ||
      !Number.isFinite(refundAmount) ||
      refundAmount <= 0
    ) {
      throw new Error('Invalid TV refund amount or wallet balance.');
    }

    const refundedBalance = Number(
      (currentBalance + refundAmount).toFixed(2)
    );

    await client.query(
      `
      UPDATE accounts
      SET
        balance = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [
        refundedBalance,
        payment.account_id,
      ]
    );

    await client.query(
      `
      UPDATE bill_payments
      SET
        provider_reference = $1,
        provider_request_id = $2,
        provider_response = $3::jsonb,
        commission_details = $4,
        status = $5,
        failure_reason = $6
      WHERE id = $7
        AND status = 'pending'
      `,
      [
        providerReference,
        providerRequestId,
        JSON.stringify(providerResponse || {}),
        getCommissionDetails(providerResponse),
        finalStatus,
        failureReason || 'Sogo confirmed that the TV subscription failed.',
        billPaymentId,
      ]
    );

    await client.query(
      `
      UPDATE transactions
      SET
        status = 'failed',
        balance_after = $1
      WHERE reference = $2
        AND status = 'pending'
      `,
      [
        refundedBalance,
        reference,
      ]
    );

    const refundReference = `ZEN-TV-REFUND-${reference}`;

    await client.query(
      `
      INSERT INTO transactions (
        account_id,
        type,
        amount,
        currency,
        reference,
        description,
        status,
        balance_before,
        balance_after,
        created_at
      )
      VALUES (
        $1,
        'tv_refund',
        $2,
        $3,
        $4,
        $5,
        'completed',
        $6,
        $7,
        CURRENT_TIMESTAMP
      )
      `,
      [
        payment.account_id,
        refundAmount,
        payment.currency || 'NGN',
        refundReference,
        `Sogo TV subscription refund - ${reference}`,
        currentBalance,
        refundedBalance,
      ]
    );

    await client.query('COMMIT');

    return {
      status: finalStatus,
      refunded: true,
      alreadyProcessed: false,
      refundReference,
      refundedBalance,
    };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}

    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// GET TV PLANS
// GET /api/tv/plans?provider=DSTV
// ============================================================

const getPlans = async (req, res) => {
  try {
    const provider = normalizeProvider(req.query?.provider);

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'A valid TV provider is required.',
      });
    }

    const result = await getTVPlans(provider);

    return res.status(200).json({
      success: true,
      provider: result.provider,
      serviceID: result.serviceID,
      plans: result.plans,
    });
  } catch (error) {
    console.error(
      'Sogo TV plans error:',
      error?.code || error?.message || 'Unknown error'
    );

    return res.status(502).json({
      success: false,
      code: error?.code || 'TV_PLANS_ERROR',
      message: error?.message || 'Unable to load TV plans.',
    });
  }
};

// ============================================================
// VERIFY TV ACCOUNT
// POST /api/tv/verify
// ============================================================

const verifyAccount = async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  const provider = normalizeProvider(req.body?.provider);

  const billersCode = cleanCustomerReference(
    req.body?.billersCode ||
    req.body?.smartcardNumber ||
    req.body?.smartcard ||
    req.body?.iuc
  );

  if (!provider) {
    return res.status(400).json({
      success: false,
      message: 'A valid TV provider is required.',
    });
  }

  if (!billersCode) {
    return res.status(400).json({
      success: false,
      message: 'Smartcard or IUC number is required.',
    });
  }

  try {
    const result = await verifyTVAccount({
      provider,
      billersCode,
    });

    const response = result.response || {};
    const customerName = getCustomerName(response);

    if (response?.success === false ||
        response?.verified === false ||
        response?.verification?.verified === false) {
      return res.status(400).json({
        success: false,
        message:
          response?.message ||
          'Sogo could not verify this TV smartcard.',
        provider,
        billersCode,
      });
    }

    return res.status(200).json({
      success: true,
      provider,
      serviceID: result.serviceID,
      billersCode,
      customer: {
        name: customerName,
        currentBouquet:
          response?.content?.Current_Bouquet || '',
        renewalAmount: Number(
          response?.content?.Renewal_Amount || 0
        ),
        dueDate: response?.content?.Due_Date || '',
        status: response?.content?.Status || '',
      },
      rawResponse: response,
    });
  } catch (error) {
    console.error(
      'Sogo TV smartcard verification error:',
      error?.code || error?.message || 'Unknown error'
    );

    return res.status(502).json({
      success: false,
      code: error?.code || 'TV_VERIFICATION_FAILED',
      message:
        error?.message ||
        'Unable to verify this TV account right now.',
    });
  }
};

// ============================================================
// BUY TV SUBSCRIPTION
// POST /api/tv
//
// The transaction PIN middleware runs before this controller.
// ============================================================

const buyTV = async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  const provider = normalizeProvider(req.body?.provider);

  const billersCode = cleanCustomerReference(
    req.body?.billersCode ||
    req.body?.smartcardNumber ||
    req.body?.smartcard ||
    req.body?.iuc
  );

  const variationCode = cleanValue(
    req.body?.variation_code ||
    req.body?.variationCode ||
    req.body?.plan_id
  );

  const phone = cleanPhoneNumber(req.body?.phone);

  const subscriptionType = String(
    req.body?.subscription_type ||
    req.body?.subscriptionType ||
    'change'
  ).trim().toLowerCase();

  if (!provider) {
    return res.status(400).json({
      success: false,
      message: 'A valid TV provider is required.',
    });
  }

  if (!billersCode) {
    return res.status(400).json({
      success: false,
      message: 'Smartcard or IUC number is required.',
    });
  }

  if (!variationCode) {
    return res.status(400).json({
      success: false,
      message: 'TV subscription plan is required.',
    });
  }

  if (!/^0\d{10}$/.test(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Enter a valid Nigerian phone number.',
    });
  }

  if (!['change', 'renew'].includes(subscriptionType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid TV subscription type.',
    });
  }

  // ----------------------------------------------------------
  // STEP 1: VERIFY PLAN AND PRICE AGAINST SOGO
  // ----------------------------------------------------------

  let plansResult;

  try {
    plansResult = await getTVPlans(provider);
  } catch (error) {
    console.error(
      'Sogo TV plan lookup error:',
      error?.code || error?.message
    );

    return res.status(502).json({
      success: false,
      code: 'TV_PLAN_LOOKUP_FAILED',
      message:
        'Unable to verify the selected TV plan right now. Please try again.',
    });
  }

  const selectedPlan = plansResult.plans.find(
    (plan) => String(plan.variation_code) === variationCode
  );

  if (!selectedPlan) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_TV_PLAN',
      message:
        'The selected TV plan is no longer available. Refresh the plans and try again.',
    });
  }

  const amount = Number(selectedPlan.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_TV_PLAN_AMOUNT',
      message: 'The selected TV plan has an invalid price.',
    });
  }

  // ----------------------------------------------------------
  // STEP 2: CREATE REFERENCES BEFORE PROVIDER REQUEST
  // ----------------------------------------------------------

  const reference = createReference();
  const providerRequestId = generateRequestId();

  let account;
  let billPaymentId;

  // ----------------------------------------------------------
  // STEP 3: RESERVE CUSTOMER WALLET AND SAVE SOGO KEY
  // ----------------------------------------------------------

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const accountResult = await client.query(
      `
      SELECT
        id,
        user_id,
        account_number,
        currency,
        balance,
        status
      FROM accounts
      WHERE user_id = $1
        AND currency = 'NGN'
        AND status = 'active'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE
      `,
      [userId]
    );

    if (!accountResult.rows.length) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Active NGN wallet account not found.',
      });
    }

    account = accountResult.rows[0];

    const balance = Number(account.balance);

    if (!Number.isFinite(balance)) {
      await client.query('ROLLBACK');

      return res.status(500).json({
        success: false,
        message: 'Unable to read wallet balance.',
      });
    }

    if (balance < amount) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_BALANCE',
        message: 'Insufficient wallet balance.',
      });
    }

    const balanceBefore = balance;
    const balanceAfter = Number((balance - amount).toFixed(2));

    const billResult = await client.query(
      `
      INSERT INTO bill_payments (
        account_id,
        category,
        biller_name,
        customer_reference,
        amount,
        currency,
        reference,
        provider_request_id,
        status
      )
      VALUES (
        $1,
        'cable_tv',
        $2,
        $3,
        $4,
        'NGN',
        $5,
        $6,
        'pending'
      )
      RETURNING id
      `,
      [
        account.id,
        provider,
        billersCode,
        amount,
        reference,
        providerRequestId,
      ]
    );

    billPaymentId = billResult.rows[0].id;

    await client.query(
      `
      UPDATE accounts
      SET
        balance = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [
        balanceAfter,
        account.id,
      ]
    );

    await client.query(
      `
      INSERT INTO transactions (
        account_id,
        type,
        amount,
        currency,
        reference,
        description,
        status,
        balance_before,
        balance_after
      )
      VALUES (
        $1,
        'tv_subscription',
        $2,
        'NGN',
        $3,
        $4,
        'pending',
        $5,
        $6
      )
      `,
      [
        account.id,
        amount,
        reference,
        `TV subscription - ${provider} ${selectedPlan.name} for ${billersCode}`,
        balanceBefore,
        balanceAfter,
      ]
    );

    await client.query('COMMIT');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}

    console.error(
      'TV wallet reservation error:',
      error?.message || 'Unknown error'
    );

    return res.status(500).json({
      success: false,
      code: 'TV_WALLET_TRANSACTION_FAILED',
      message: 'Unable to start the TV subscription.',
    });
  } finally {
    client.release();
  }

  // ----------------------------------------------------------
  // STEP 4: CALL SOGO USING THE SAVED IDEMPOTENCY KEY
  // ----------------------------------------------------------

  let providerResult;

  try {
    providerResult = await purchaseTV({
      provider,
      billersCode,
      variationCode,
      amount,
      phone,
      subscriptionType,
      requestId: providerRequestId,
      idempotencyKey: providerRequestId,
    });
  } catch (error) {
    // A timeout or network failure is ambiguous.
    // Keep the payment pending; never refund automatically.
    console.error(
      'Sogo TV purchase outcome requires reconciliation:',
      error?.code || error?.message || 'Unknown error'
    );

    return res.status(202).json({
      success: true,
      status: 'pending',
      reference,
      provider_request_id: providerRequestId,
      message:
        'Your TV subscription is being processed. Please do not retry this payment.',
    });
  }

  const providerResponse = providerResult?.response || {};
  const providerStatus = getProviderStatus(providerResponse);

  const providerReference = getProviderReference(
    providerResponse,
    providerRequestId
  );

  const providerMessage = getProviderMessage(providerResponse);

  // ----------------------------------------------------------
  // STEP 5: COMPLETED
  // ----------------------------------------------------------

  if (providerStatus === 'completed') {
    try {
      const result = await completeTVTransaction({
        billPaymentId,
        reference,
        providerReference,
        providerRequestId,
        providerResponse,
      });

      if (result.status !== 'completed') {
        return res.status(202).json({
          success: true,
          status: result.status,
          reference,
          message:
            'The TV transaction has already been resolved and requires reconciliation.',
        });
      }

      return res.status(200).json({
        success: true,
        status: 'completed',
        reference,
        providerReference,
        provider,
        billersCode,
        plan: {
          code: selectedPlan.variation_code,
          name: selectedPlan.name,
          amount,
        },
        message: 'TV subscription successful.',
      });
    } catch (error) {
      console.error(
        'TV completion reconciliation error:',
        error?.message || 'Unknown error'
      );

      return res.status(202).json({
        success: true,
        status: 'pending',
        reference,
        message:
          'Sogo reported completion, but your transaction is being finalized. Please do not retry.',
      });
    }
  }

  // ----------------------------------------------------------
  // STEP 6: PENDING / PROCESSING / UNKNOWN
  // ----------------------------------------------------------

  if (
    providerStatus === 'pending' ||
    providerStatus === 'unknown'
  ) {
    try {
      await saveProviderResponse({
        billPaymentId,
        providerReference,
        providerRequestId,
        providerResponse,
        status: 'pending',
      });
    } catch (error) {
      console.error(
        'TV pending response save error:',
        error?.message
      );
    }

    return res.status(202).json({
      success: true,
      status: 'pending',
      reference,
      providerReference,
      provider,
      billersCode,
      plan: {
        code: selectedPlan.variation_code,
        name: selectedPlan.name,
        amount,
      },
      message:
        providerMessage ||
        'Your TV subscription is being processed. Please check your transaction history for the final status.',
    });
  }

  // ----------------------------------------------------------
  // STEP 7: EXPLICIT FAILURE / REFUND
  // ----------------------------------------------------------

  try {
    const refundResult = await refundTVTransaction({
      billPaymentId,
      reference,
      providerReference,
      providerRequestId,
      providerResponse,
      finalStatus:
        providerStatus === 'refunded'
          ? 'refunded'
          : 'failed',
      failureReason:
        providerMessage ||
        'Sogo confirmed that the TV subscription failed.',
    });

    if (refundResult.status === 'completed') {
      return res.status(409).json({
        success: false,
        status: 'completed',
        reference,
        message:
          'The TV subscription was already completed. No refund was made.',
      });
    }

    return res.status(200).json({
      success: false,
      status: refundResult.status,
      reference,
      refunded: refundResult.refunded,
      refundReference: refundResult.refundReference || null,
      message: refundResult.alreadyProcessed
        ? 'This TV transaction has already been refunded.'
        : 'The TV subscription failed and your wallet has been refunded.',
    });
  } catch (error) {
    console.error(
      'TV refund reconciliation error:',
      error?.message || 'Unknown error'
    );

    return res.status(500).json({
      success: false,
      code: 'TV_REFUND_PENDING',
      reference,
      message:
        'Sogo reported a failed TV subscription, but the wallet refund requires reconciliation. Please contact support with this reference.',
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getPlans,
  verifyAccount,
  buyTV,
};
