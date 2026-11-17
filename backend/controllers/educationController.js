
const crypto = require('crypto');
const pool = require('../config/database');

const {
  EDUCATION_SERVICE_IDS,
  generateRequestId,
  getEducationServiceId,
  getEducationVariations,
  verifyJambProfile,
  purchaseEducation,
  requeryEducationTransaction,
  getEducationProviderStatus,
} = require('../services/educationService');

// ============================================================
// ZENIMONIES BANKING
// EDUCATION PAYMENT CONTROLLER
// SOGO INTEGRATION
//
// Supported:
// - WAEC Registration PIN
// - WAEC Result Checker PIN
// - JAMB PIN
//
// Uses:
// - bill_payments
// - transactions
// - Sogo provider_request_id
//
// Wallet refunds are protected by database row locks.
// ============================================================

// ============================================================
// HELPERS
// ============================================================

const createReference = () => {
  return `ZEDU-${Date.now()}-${crypto
    .randomBytes(5)
    .toString('hex')
    .toUpperCase()}`;
};

const getUserId = (req) => {
  return (
    req.user?.id ||
    req.user?.userId ||
    req.user?.user_id ||
    null
  );
};

const cleanString = (value) => {
  return String(value || '').trim();
};

const cleanPhoneNumber = (phone) => {
  return String(phone || '')
    .replace(/\s+/g, '')
    .trim();
};

const isValidPhoneNumber = (phone) => {
  return /^0\d{10}$/.test(
    cleanPhoneNumber(phone)
  );
};

const getServiceName = (service) => {
  switch (service) {
    case EDUCATION_SERVICE_IDS.WAEC_REGISTRATION:
      return 'WAEC Registration PIN';

    case EDUCATION_SERVICE_IDS.WAEC_RESULT:
      return 'WAEC Result Checker PIN';

    case EDUCATION_SERVICE_IDS.JAMB:
      return 'JAMB PIN';

    default:
      return 'Education Payment';
  }
};

const getProviderReference = (
  providerResponse,
  fallbackRequestId = null
) => {
  return (
    providerResponse?.data?.reference ||
    providerResponse?.data?.id ||
    providerResponse?.reference ||
    providerResponse?.transaction_id ||
    providerResponse?.transactionId ||
    providerResponse?.id ||
    fallbackRequestId ||
    null
  );
};

const getProviderMessage = (providerResponse) => {
  return (
    providerResponse?.data?.message ||
    providerResponse?.message ||
    providerResponse?.error ||
    null
  );
};

const extractPurchasedCode = (providerResponse) => {
  return (
    providerResponse?.data?.purchased_code ||
    providerResponse?.data?.pin ||
    providerResponse?.purchased_code ||
    providerResponse?.Pin ||
    providerResponse?.pin ||
    null
  );
};

const extractTokens = (providerResponse) => {
  const possibleTokens = [
    providerResponse?.data?.tokens,
    providerResponse?.tokens,
  ];

  for (const value of possibleTokens) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
};

const extractCustomerName = (providerResponse) => {
  return (
    providerResponse?.data?.customer_name ||
    providerResponse?.data?.customer?.name ||
    providerResponse?.customer_name ||
    providerResponse?.customer?.name ||
    null
  );
};

const getVariationCode = (variation) => {
  return String(
    variation?.variation_code ||
    variation?.variationCode ||
    variation?.code ||
    ''
  ).trim();
};

const getVariationAmount = (variation) => {
  return Number(
    variation?.variation_amount ??
    variation?.amount ??
    variation?.price ??
    variation?.cost ??
    0
  );
};

const getCommissionDetails = (providerResponse) => {
  return (
    providerResponse?.data?.commission_details ||
    providerResponse?.commission_details ||
    null
  );
};

// ============================================================
// GET EDUCATION PLANS
//
// GET /api/education/plans?service=waec
// GET /api/education/plans?service=waec-registration
// GET /api/education/plans?service=jamb
// ============================================================

const getPlans = async (req, res) => {
  try {
    const service = cleanString(req.query?.service);

    if (!service) {
      return res.status(400).json({
        success: false,
        code: 'EDUCATION_SERVICE_REQUIRED',
        message: 'Education service is required.',
      });
    }

    const serviceId = getEducationServiceId(service);

    const result = await getEducationVariations(serviceId);

    const plans = Array.isArray(result.variations)
      ? result.variations.map((variation) => ({
          variation_code: getVariationCode(variation) || null,

          name:
            variation?.name ||
            variation?.product_name ||
            variation?.description ||
            null,

          amount: getVariationAmount(variation),

          fixedPrice:
            variation?.fixedPrice ??
            variation?.fixed_price ??
            null,
        }))
      : [];

    return res.status(200).json({
      success: true,
      serviceID: serviceId,
      serviceName: getServiceName(serviceId),
      plans,
      responseDescription:
        result.responseDescription || null,
    });

  } catch (error) {
    console.error(
      'Get education plans error:',
      error?.code || error?.message || 'Unknown error'
    );

    const statusMap = {
      UNSUPPORTED_EDUCATION_SERVICE: 400,
      SOGO_CONFIGURATION_ERROR: 500,
      SOGO_TIMEOUT: 504,
      SOGO_HTTP_ERROR: 502,
    };

    return res.status(
      statusMap[error?.code] || 502
    ).json({
      success: false,
      code: error?.code || 'EDUCATION_PLANS_ERROR',
      message:
        error?.message ||
        'Unable to load education plans.',
    });
  }
};

// ============================================================
// VERIFY JAMB PROFILE
//
// POST /api/education/jamb/verify
//
// Body:
// {
//   "profile_id": "0123456789",
//   "variation_code": "..."
//
// This endpoint does NOT debit the wallet.
// ============================================================

const verifyJamb = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const profileId = cleanString(
      req.body?.profile_id ||
      req.body?.profileId
    );

    if (!profileId) {
      return res.status(400).json({
        success: false,
        code: 'JAMB_PROFILE_ID_REQUIRED',
        message: 'JAMB Profile ID is required.',
      });
    }

    const variationCode = cleanString(
      req.body?.variation_code ||
      req.body?.variationCode
    );

    if (!variationCode) {
      return res.status(400).json({
        success: false,
        code: 'JAMB_VARIATION_REQUIRED',
        message: 'JAMB variation code is required.',
      });
    }

    const result = await verifyJambProfile({
      profileId,
      variationCode,
      service: 'jamb',
    });

    const providerResponse = result.response;
    const customerName =
      extractCustomerName(providerResponse);

    return res.status(200).json({
      success: true,
      profileId,
      customerName,
      requestId: result.requestId || null,
      response: providerResponse,
      message: 'JAMB Profile ID verification request completed.',
    });

  } catch (error) {
    console.error(
      'JAMB profile verification error:',
      error?.code || error?.message || 'Unknown error'
    );

    const statusMap = {
      JAMB_PROFILE_ID_REQUIRED: 400,
      JAMB_VARIATION_REQUIRED: 400,
      INVALID_JAMB_SERVICE: 400,
      SOGO_CONFIGURATION_ERROR: 500,
      SOGO_TIMEOUT: 504,
      SOGO_HTTP_ERROR: 502,
    };

    return res.status(
      statusMap[error?.code] || 502
    ).json({
      success: false,
      code:
        error?.code ||
        'JAMB_PROFILE_VERIFICATION_FAILED',
      message:
        error?.message ||
        'Unable to verify the JAMB Profile ID.',
    });
  }
};

// ============================================================
// COMPLETE EDUCATION PAYMENT
//
// The bill payment row is locked first.
// If the webhook already completed the payment,
// this function does not overwrite it.
// ============================================================

const completeEducationPayment = async ({
  paymentId,
  providerRequestId,
  providerReference,
  providerResponse,
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const paymentResult = await client.query(
      `
      SELECT
        id,
        reference,
        status
      FROM bill_payments
      WHERE id = $1
        AND category = 'education'
      FOR UPDATE
      `,
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      throw new Error(
        'Education payment not found during completion.'
      );
    }

    const payment = paymentResult.rows[0];

    if (payment.status !== 'pending') {
      await client.query('COMMIT');

      return {
        updated: false,
        status: payment.status,
      };
    }

    await client.query(
      `
      UPDATE bill_payments
      SET
        provider_request_id = $1,
        provider_reference = $2,
        provider_response = $3,
        commission_details = $4,
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP
      WHERE id = $5
        AND status = 'pending'
      `,
      [
        providerRequestId,
        providerReference,
        providerResponse,
        getCommissionDetails(providerResponse),
        paymentId,
      ]
    );

    await client.query(
      `
      UPDATE transactions
      SET status = 'completed'
      WHERE reference = $1
        AND status = 'pending'
      `,
      [payment.reference]
    );

    await client.query('COMMIT');

    return {
      updated: true,
      status: 'completed',
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
// REFUND EDUCATION PAYMENT
//
// EXACT-ONCE REFUND PROTECTION
//
// 1. Lock bill_payments row.
// 2. Stop if already completed/failed/refunded.
// 3. Lock customer account.
// 4. Credit wallet.
// 5. Mark original payment failed.
// 6. Insert refund ledger entry.
// 7. Commit all changes together.
//
// The webhook and controller must use the same payment-row
// locking approach.
// ============================================================

const refundEducationPayment = async ({
  paymentId,
  providerRequestId,
  providerReference,
  providerResponse,
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
        reference,
        biller_name,
        status
      FROM bill_payments
      WHERE id = $1
        AND category = 'education'
      FOR UPDATE
      `,
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      throw new Error(
        'Education payment not found during refund.'
      );
    }

    const payment = paymentResult.rows[0];

    // Another process already finalized this payment.
    if (payment.status !== 'pending') {
      await client.query('COMMIT');

      return {
        refunded: false,
        status: payment.status,
        reference: payment.reference,
      };
    }

    const refundAmount = Number(payment.amount);

    if (
      !Number.isFinite(refundAmount) ||
      refundAmount <= 0
    ) {
      throw new Error(
        'Invalid education refund amount.'
      );
    }

    const accountResult = await client.query(
      `
      SELECT
        id,
        balance
      FROM accounts
      WHERE id = $1
      FOR UPDATE
      `,
      [payment.account_id]
    );

    if (accountResult.rows.length === 0) {
      throw new Error(
        'Customer account not found during education refund.'
      );
    }

    const currentBalance = Number(
      accountResult.rows[0].balance
    );

    if (!Number.isFinite(currentBalance)) {
      throw new Error(
        'Invalid wallet balance during education refund.'
      );
    }

    const refundedBalance =
      currentBalance + refundAmount;

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
        provider_request_id = COALESCE($1, provider_request_id),
        provider_reference = COALESCE($2, provider_reference),
        provider_response = COALESCE($3, provider_response),
        commission_details = COALESCE($4, commission_details),
        status = 'failed',
        failure_reason = $5
      WHERE id = $6
        AND status = 'pending'
      `,
      [
        providerRequestId || null,
        providerReference || null,
        providerResponse || null,
        getCommissionDetails(providerResponse),
        failureReason ||
          'Sogo rejected the education payment.',
        paymentId,
      ]
    );

    await client.query(
      `
      UPDATE transactions
      SET status = 'failed'
      WHERE reference = $1
        AND status = 'pending'
      `,
      [payment.reference]
    );

    // Deterministic refund reference.
    // The payment row lock prevents a second refund attempt.
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
        'education_refund',
        $2,
        $3,
        $4,
        $5,
        'completed',
        $6,
        $7
      )
      `,
      [
        payment.account_id,
        refundAmount,
        payment.currency || 'NGN',
        `${payment.reference}-REFUND`,
        `Refund for failed ${payment.biller_name || 'education payment'}`,
        currentBalance,
        refundedBalance,
      ]
    );

    await client.query('COMMIT');

    return {
      refunded: true,
      status: 'failed',
      reference: payment.reference,
      refundAmount,
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
// PURCHASE EDUCATION PRODUCT
//
// POST /api/education
//
// WAEC:
// {
//   "service": "waec",
//   "variation_code": "...",
//   "phone": "08012345678"
// }
//
// WAEC Registration:
// {
//   "service": "waec-registration",
//   "variation_code": "...",
//   "phone": "08012345678"
// }
//
// JAMB:
// {
//   "service": "jamb",
//   "variation_code": "...",
//   "profile_id": "0123456789",
//   "phone": "08012345678"
// }
//
// transaction_pin is handled by transactionPinMiddleware.
// ============================================================

const purchase = async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  const serviceInput = cleanString(
    req.body?.service ||
    req.body?.service_id ||
    req.body?.serviceID
  );

  if (!serviceInput) {
    return res.status(400).json({
      success: false,
      code: 'EDUCATION_SERVICE_REQUIRED',
      message: 'Education service is required.',
    });
  }

  let serviceId;

  try {
    serviceId = getEducationServiceId(serviceInput);
  } catch (error) {
    return res.status(400).json({
      success: false,
      code:
        error?.code ||
        'UNSUPPORTED_EDUCATION_SERVICE',
      message:
        error?.message ||
        'Unsupported education service.',
    });
  }

  const variationCode = cleanString(
    req.body?.variation_code ||
    req.body?.variationCode
  );

  if (!variationCode) {
    return res.status(400).json({
      success: false,
      code: 'EDUCATION_VARIATION_REQUIRED',
      message: 'Please select an education plan.',
    });
  }

  const phone = cleanPhoneNumber(req.body?.phone);

  if (!isValidPhoneNumber(phone)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_PHONE_NUMBER',
      message: 'Enter a valid Nigerian phone number.',
    });
  }

  const profileId = cleanString(
    req.body?.profile_id ||
    req.body?.profileId
  );

  if (
    serviceId === EDUCATION_SERVICE_IDS.JAMB &&
    !profileId
  ) {
    return res.status(400).json({
      success: false,
      code: 'JAMB_PROFILE_ID_REQUIRED',
      message: 'JAMB Profile ID is required.',
    });
  }

  // ==========================================================
  // STEP 1: GET CURRENT SOGO PLANS
  //
  // Never trust the price supplied by the frontend.
  // ==========================================================

  let variationsResult;

  try {
    variationsResult =
      await getEducationVariations(serviceId);

  } catch (error) {
    console.error(
      'Sogo education plan lookup error:',
      error?.code || error?.message || 'Unknown error'
    );

    return res.status(502).json({
      success: false,
      code:
        error?.code ||
        'EDUCATION_VARIATION_LOOKUP_FAILED',
      message:
        'Unable to verify the selected education plan right now. Please try again.',
    });
  }

  const variations = Array.isArray(
    variationsResult?.variations
  )
    ? variationsResult.variations
    : [];

  const selectedVariation = variations.find(
    (variation) =>
      getVariationCode(variation) === variationCode
  );

  if (!selectedVariation) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_EDUCATION_PLAN',
      message:
        'The selected education plan is no longer available. Please refresh the plans and try again.',
    });
  }

  const amount = getVariationAmount(selectedVariation);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_EDUCATION_PLAN_AMOUNT',
      message:
        'The selected education plan has an invalid price.',
    });
  }

  // ==========================================================
  // STEP 2: VERIFY JAMB BEFORE DEBIT
  // ==========================================================

  let jambVerification = null;

  if (serviceId === EDUCATION_SERVICE_IDS.JAMB) {
    try {
      jambVerification = await verifyJambProfile({
        profileId,
        variationCode,
        service: 'jamb',
      });

    } catch (error) {
      console.error(
        'JAMB profile verification error:',
        error?.code || error?.message || 'Unknown error'
      );

      return res.status(
        error?.code === 'SOGO_TIMEOUT' ? 504 : 400
      ).json({
        success: false,
        code:
          error?.code ||
          'JAMB_PROFILE_VERIFICATION_FAILED',
        message:
          error?.message ||
          'The JAMB Profile ID could not be verified. No money was deducted.',
      });
    }
  }

  // ==========================================================
  // STEP 3: CREATE LOCAL AND SOGO REFERENCES
  //
  // The Sogo request ID is generated BEFORE the wallet debit.
  // It is stored before calling Sogo.
  // ==========================================================

  const reference = createReference();
  const providerRequestId = generateRequestId();

  const serviceName = getServiceName(serviceId);

  const billersCode =
    serviceId === EDUCATION_SERVICE_IDS.JAMB
      ? profileId
      : phone;

  // ==========================================================
  // STEP 4: RESERVE / DEBIT CUSTOMER WALLET
  // ==========================================================

  const client = await pool.connect();

  let account;
  let billPaymentId;

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

    if (accountResult.rows.length === 0) {
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
    const balanceAfter = balance - amount;

    // --------------------------------------------------------
    // CREATE PENDING BILL PAYMENT
    //
    // Save provider_request_id BEFORE calling Sogo.
    // --------------------------------------------------------

    const paymentResult = await client.query(
      `
      INSERT INTO bill_payments (
        account_id,
        biller_id,
        category,
        biller_name,
        customer_reference,
        customer_name,
        amount,
        currency,
        reference,
        provider_request_id,
        status
      )
      VALUES (
        $1,
        NULL,
        'education',
        $2,
        $3,
        $4,
        $5,
        'NGN',
        $6,
        $7,
        'pending'
      )
      RETURNING id
      `,
      [
        account.id,
        serviceName,
        billersCode,
        extractCustomerName(
          jambVerification?.response
        ),
        amount,
        reference,
        providerRequestId,
      ]
    );

    billPaymentId = paymentResult.rows[0].id;

    // --------------------------------------------------------
    // DEBIT ACCOUNT
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // CENTRAL TRANSACTION
    // --------------------------------------------------------

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
        'education_payment',
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
        `${serviceName} - ${variationCode}`,
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
      'Education wallet transaction error:',
      error?.message || 'Unknown error'
    );

    return res.status(500).json({
      success: false,
      code: 'EDUCATION_WALLET_TRANSACTION_FAILED',
      message: 'Unable to start the education payment.',
    });

  } finally {
    client.release();
  }

  // ==========================================================
  // STEP 5: SEND PAYMENT TO SOGO
  //
  // The same saved providerRequestId is sent as the
  // Idempotency-Key.
  // ==========================================================

  let providerResult;

  try {
    providerResult = await purchaseEducation({
      service: serviceId,
      billersCode,
      profileId,
      variationCode,
      amount,
      phone,
      requestId: providerRequestId,
    });

  } catch (error) {
    console.error(
      'Sogo education purchase error:',
      error?.code || error?.message || 'Unknown error'
    );

    // A timeout or network error is not proof of failure.
    // Keep the wallet debit and payment pending.
    // The webhook/reconciliation process will determine
    // the final outcome.

    return res.status(202).json({
      success: true,
      status: 'pending',
      reference,
      requestId: providerRequestId,
      message:
        'Your education payment is being processed. We are checking the provider status.',
    });
  }

  const providerResponse = providerResult.response;

  const providerStatus =
    getEducationProviderStatus(providerResponse);

  const providerReference =
    getProviderReference(
      providerResponse,
      providerRequestId
    );

  const providerMessage =
    getProviderMessage(providerResponse);

  const purchasedCode =
    extractPurchasedCode(providerResponse);

  const tokens =
    extractTokens(providerResponse);

  const customerName =
    extractCustomerName(providerResponse) ||
    extractCustomerName(jambVerification?.response);

  // ==========================================================
  // STEP 6: COMPLETED
  // ==========================================================

  if (providerStatus === 'completed') {
    try {
      const result = await completeEducationPayment({
        paymentId: billPaymentId,
        providerRequestId,
        providerReference,
        providerResponse,
      });

      return res.status(200).json({
        success: true,
        status: result.status,
        reference,
        requestId: providerRequestId,
        providerReference,
        service: serviceId,
        serviceName,
        variationCode,
        amount,
        phone,
        profileId:
          serviceId === EDUCATION_SERVICE_IDS.JAMB
            ? profileId
            : null,
        purchasedCode,
        tokens,
        customerName,
        message:
          result.status === 'completed'
            ? 'Education payment successful.'
            : 'The education payment has already been finalized.',
      });

    } catch (error) {
      console.error(
        'Education completion update error:',
        error?.message || 'Unknown error'
      );

      // Provider may already have delivered the product.
      // Never refund automatically because a local database
      // update failed after provider success.

      return res.status(202).json({
        success: true,
        status: 'pending',
        reference,
        requestId: providerRequestId,
        message:
          'The provider processed your education payment. Your transaction is being reconciled.',
      });
    }
  }

  // ==========================================================
  // STEP 7: PENDING
  // ==========================================================

  if (providerStatus === 'pending') {
    try {
      await pool.query(
        `
        UPDATE bill_payments
        SET
          provider_reference = $1,
          provider_response = $2,
          status = 'pending'
        WHERE id = $3
          AND status = 'pending'
        `,
        [
          providerReference,
          providerResponse,
          billPaymentId,
        ]
      );

    } catch (error) {
      console.error(
        'Education pending update error:',
        error?.message || 'Unknown error'
      );
    }

    return res.status(202).json({
      success: true,
      status: 'pending',
      reference,
      requestId: providerRequestId,
      providerReference,
      service: serviceId,
      serviceName,
      variationCode,
      amount,
      phone,
      profileId:
        serviceId === EDUCATION_SERVICE_IDS.JAMB
          ? profileId
          : null,
      message:
        'Your education payment is being processed. Please check your transaction history for the final status.',
    });
  }

  // ==========================================================
  // STEP 8: EXPLICIT PROVIDER FAILURE
  //
  // Use the same locked refund function as reconciliation.
  // If a webhook already refunded the payment, this function
  // sees the final status and does not credit the wallet again.
  // ==========================================================

  try {
    const refundResult = await refundEducationPayment({
      paymentId: billPaymentId,
      providerRequestId,
      providerReference,
      providerResponse,
      failureReason:
        providerMessage ||
        'Sogo rejected the education payment.',
    });

    if (!refundResult.refunded) {
      return res.status(200).json({
        success: true,
        status: refundResult.status,
        reference,
        requestId: providerRequestId,
        message:
          'The education payment has already been finalized.',
      });
    }

    return res.status(400).json({
      success: false,
      status: 'failed',
      refunded: true,
      reference,
      requestId: providerRequestId,
      providerReference,
      service: serviceId,
      serviceName,
      variationCode,
      amount,
      message:
        providerMessage ||
        'Education payment failed. Your wallet has been refunded.',
    });

  } catch (error) {
    console.error(
      'Education payment refund error:',
      error?.message || 'Unknown error'
    );

    return res.status(500).json({
      success: false,
      code: 'EDUCATION_REFUND_PENDING',
      reference,
      requestId: providerRequestId,
      message:
        'The education provider rejected the payment, but wallet reconciliation requires attention. Please contact support with the transaction reference.',
    });
  }
};

// ============================================================
// REQUERY EDUCATION TRANSACTION
//
// POST /api/education/requery
//
// Body:
// {
//   "request_id": "Sogo idempotency key"
// }
// ============================================================

const requery = async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  const requestId = cleanString(
    req.body?.request_id ||
    req.body?.requestId
  );

  if (!requestId) {
    return res.status(400).json({
      success: false,
      code: 'REQUEST_ID_REQUIRED',
      message: 'Sogo request ID is required.',
    });
  }

  try {
    // --------------------------------------------------------
    // FIND CUSTOMER PAYMENT
    // --------------------------------------------------------

    const paymentResult = await pool.query(
      `
      SELECT
        bp.id,
        bp.account_id,
        bp.amount,
        bp.currency,
        bp.reference,
        bp.status,
        bp.provider_request_id,
        bp.provider_reference,
        bp.biller_name,
        bp.customer_reference
      FROM bill_payments bp
      INNER JOIN accounts a
        ON a.id = bp.account_id
      WHERE bp.provider_request_id = $1
        AND a.user_id = $2
        AND bp.category = 'education'
      LIMIT 1
      `,
      [
        requestId,
        userId,
      ]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        code: 'EDUCATION_PAYMENT_NOT_FOUND',
        message: 'Education payment could not be found.',
      });
    }

    const payment = paymentResult.rows[0];

    if (payment.status === 'completed') {
      return res.status(200).json({
        success: true,
        status: 'completed',
        requestId,
        reference: payment.reference,
        providerReference:
          payment.provider_reference || requestId,
        message:
          'This education payment has already been completed.',
      });
    }

    if (
      payment.status === 'failed' ||
      payment.status === 'refunded'
    ) {
      return res.status(200).json({
        success: true,
        status: payment.status,
        requestId,
        reference: payment.reference,
        providerReference:
          payment.provider_reference || requestId,
        message:
          'This education payment has already been finalized.',
      });
    }

    // --------------------------------------------------------
    // SOGO REQUERY
    //
    // Sandbox does not support transaction lookup.
    // The webhook is the source of final status there.
    // --------------------------------------------------------

    const providerResponse =
      await requeryEducationTransaction(requestId);

    const providerStatus =
      getEducationProviderStatus(providerResponse);

    const providerReference =
      getProviderReference(
        providerResponse,
        requestId
      );

    const providerMessage =
      getProviderMessage(providerResponse);

    const purchasedCode =
      extractPurchasedCode(providerResponse);

    const tokens =
      extractTokens(providerResponse);

    // --------------------------------------------------------
    // STILL PENDING
    // --------------------------------------------------------

    if (providerStatus === 'pending') {
      await pool.query(
        `
        UPDATE bill_payments
        SET
          provider_reference = $1,
          provider_response = $2,
          status = 'pending'
        WHERE id = $3
          AND status = 'pending'
        `,
        [
          providerReference,
          providerResponse,
          payment.id,
        ]
      );

      return res.status(200).json({
        success: true,
        status: 'pending',
        requestId,
        reference: payment.reference,
        providerReference,
        purchasedCode,
        tokens,
        message:
          'The education payment is still being processed.',
      });
    }

    // --------------------------------------------------------
    // COMPLETED
    // --------------------------------------------------------

    if (providerStatus === 'completed') {
      const result = await completeEducationPayment({
        paymentId: payment.id,
        providerRequestId: requestId,
        providerReference,
        providerResponse,
      });

      return res.status(200).json({
        success: true,
        status: result.status,
        requestId,
        reference: payment.reference,
        providerReference,
        purchasedCode,
        tokens,
        message:
          result.status === 'completed'
            ? 'Education payment completed successfully.'
            : 'The education payment has already been finalized.',
      });
    }

    // --------------------------------------------------------
    // FAILED
    //
    // Same refund helper as immediate failure.
    // --------------------------------------------------------

    const refundResult = await refundEducationPayment({
      paymentId: payment.id,
      providerRequestId: requestId,
      providerReference,
      providerResponse,
      failureReason:
        providerMessage ||
        'Sogo rejected the education payment.',
    });

    if (!refundResult.refunded) {
      return res.status(200).json({
        success: true,
        status: refundResult.status,
        requestId,
        reference: payment.reference,
        message:
          'The education payment has already been finalized.',
      });
    }

    return res.status(200).json({
      success: true,
      status: 'failed',
      refunded: true,
      requestId,
      reference: payment.reference,
      providerReference,
      refundAmount: refundResult.refundAmount,
      purchasedCode,
      tokens,
      message:
        providerMessage ||
        'Education payment failed and your wallet has been refunded.',
    });

  } catch (error) {
    console.error(
      'Education transaction requery error:',
      error?.code || error?.message || 'Unknown error'
    );

    const status =
      error?.code === 'SOGO_TIMEOUT'
        ? 504
        : error?.code === 'SOGO_SANDBOX_REQUERY_UNAVAILABLE'
          ? 409
          : 502;

    return res.status(status).json({
      success: false,
      code:
        error?.code ||
        'EDUCATION_REQUERY_FAILED',
      message:
        error?.message ||
        'Unable to check the education payment status.',
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getPlans,
  verifyJamb,
  purchase,
  requery,
};
