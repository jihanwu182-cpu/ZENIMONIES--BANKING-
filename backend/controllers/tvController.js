const crypto = require('crypto');

const pool = require('../config/database');

const {
  getTVPlans,
  verifyTVAccount,
  purchaseTV,
} = require('../services/tvService');


// ============================================================
// HELPERS
// ============================================================

const createReference = () => {
  return `ZEN-TV-${Date.now()}-${crypto
    .randomBytes(6)
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


const cleanValue = (value) => {
  return String(value || '')
    .trim();
};


const cleanCustomerReference = (value) => {
  return String(value || '')
    .replace(/\D/g, '')
    .trim();
};


const cleanPhoneNumber = (value) => {
  return String(value || '')
    .replace(/\D/g, '')
    .trim();
};


const normalizeProvider = (provider) => {
  const value =
    String(provider || '')
      .trim()
      .toUpperCase();

  if (value === 'DSTV') {
    return 'DSTV';
  }

  if (value === 'GOTV') {
    return 'GOTV';
  }

  if (value === 'STARTIMES') {
    return 'STARTIMES';
  }

  return '';
};


const getProviderStatus = (
  providerResponse
) => {
  const code =
    String(
      providerResponse?.code ||
        providerResponse?.response_code ||
        ''
    ).trim();

  const transactionStatus =
    String(
      providerResponse
        ?.content
        ?.transactions
        ?.status ||
        ''
    )
      .trim()
      .toLowerCase();

  if (
    code === '000' &&
    transactionStatus === 'delivered'
  ) {
    return 'completed';
  }

  if (
    code === '099' ||
    transactionStatus === 'pending' ||
    transactionStatus === 'initiated'
  ) {
    return 'pending';
  }

  return 'failed';
};


const getProviderReference = (
  providerResponse,
  providerResult
) => {
  return (
    providerResponse
      ?.content
      ?.transactions
      ?.transactionId ||
    providerResponse?.transactionId ||
    providerResponse?.requestId ||
    providerResult?.requestId ||
    null
  );
};


const getCommissionDetails = (
  providerResponse
) => {
  return (
    providerResponse
      ?.content
      ?.transactions
      ?.commission_details ||
    providerResponse
      ?.content
      ?.commission_details ||
    null
  );
};


const getProviderMessage = (
  providerResponse
) => {
  return (
    providerResponse?.response_description ||
    providerResponse?.message ||
    providerResponse?.responseMessage ||
    null
  );
};


// ============================================================
// GET TV PLANS
//
// GET /api/tv/plans?provider=DSTV
// ============================================================

const getPlans = async (
  req,
  res
) => {
  try {
    const provider =
      normalizeProvider(
        req.query?.provider
      );

    if (!provider) {
      return res.status(400).json({
        success: false,
        message:
          'TV provider is required.',
      });
    }

    const result =
      await getTVPlans(
        provider
      );

    return res.status(200).json({
      success: true,

      provider:
        result.provider,

      serviceID:
        result.serviceID,

      plans:
        result.plans,
    });

  } catch (error) {
    console.error(
      'Get TV plans error:',
      error?.message ||
        'Unknown error'
    );

    return res.status(500).json({
      success: false,
      code:
        error?.code ||
        'TV_PLANS_ERROR',
      message:
        error?.message ||
        'Unable to load TV plans.',
    });
  }
};


// ============================================================
// VERIFY TV ACCOUNT
//
// POST /api/tv/verify
//
// Body:
// {
//   provider: "DSTV",
//   billersCode: "1212121212"
// }
// ============================================================

const verifyAccount = async (
  req,
  res
) => {
  const userId =
    getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message:
        'Authentication required.',
    });
  }

  const provider =
    normalizeProvider(
      req.body?.provider
    );

  const billersCode =
    cleanCustomerReference(
      req.body?.billersCode ||
        req.body?.smartcardNumber ||
        req.body?.smartcard ||
        req.body?.iuc
    );

  if (!provider) {
    return res.status(400).json({
      success: false,
      message:
        'TV provider is required.',
    });
  }

  if (!billersCode) {
    return res.status(400).json({
      success: false,
      message:
        'Smartcard or IUC number is required.',
    });
  }

  try {
    const result =
      await verifyTVAccount({
        provider,
        billersCode,
      });

    const response =
      result.response;

    const code =
      String(
        response?.code ||
          response?.response_code ||
          ''
      ).trim();

    if (code !== '000') {
      return res.status(400).json({
        success: false,
        code,
        message:
          response?.response_description ||
          response?.message ||
          'TV account verification failed.',
        provider,
        billersCode,
      });
    }

    const content =
      response?.content || {};

    return res.status(200).json({
      success: true,

      provider,

      serviceID:
        result.serviceID,

      billersCode,

      customer: {
        name:
          content.Customer_Name ||
          content.customer_name ||
          content.name ||
          '',

        currentBouquet:
          content.Current_Bouquet ||
          content.current_bouquet ||
          '',

        renewalAmount:
          Number(
            content.Renewal_Amount ||
              content.renewal_amount ||
              0
          ),

        dueDate:
          content.Due_Date ||
          content.due_date ||
          '',

        status:
          content.Status ||
          content.status ||
          '',
      },

      rawResponse:
        response,
    });

  } catch (error) {
    console.error(
      'TV account verification error:',
      error?.message ||
        'Unknown error'
    );

    return res.status(502).json({
      success: false,
      code:
        error?.code ||
        'TV_VERIFICATION_FAILED',
      message:
        error?.message ||
        'Unable to verify this TV account right now.',
    });
  }
};


// ============================================================
// BUY TV SUBSCRIPTION
//
// POST /api/tv
//
// Transaction PIN middleware should run BEFORE this controller.
// ============================================================

const buyTV = async (
  req,
  res
) => {
  const userId =
    getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message:
        'Authentication required.',
    });
  }

  const provider =
    normalizeProvider(
      req.body?.provider
    );

  const billersCode =
    cleanCustomerReference(
      req.body?.billersCode ||
        req.body?.smartcardNumber ||
        req.body?.smartcard ||
        req.body?.iuc
    );

  const variationCode =
    cleanValue(
      req.body?.variation_code ||
        req.body?.variationCode ||
        req.body?.plan_id
    );

  const phone =
    cleanPhoneNumber(
      req.body?.phone
    );

  const subscriptionType =
    String(
      req.body?.subscription_type ||
        req.body?.subscriptionType ||
        'change'
    )
      .trim()
      .toLowerCase();

  const quantity =
    Number(
      req.body?.quantity || 1
    );

  if (!provider) {
    return res.status(400).json({
      success: false,
      message:
        'TV provider is required.',
    });
  }

  if (!billersCode) {
    return res.status(400).json({
      success: false,
      message:
        'Smartcard or IUC number is required.',
    });
  }

  if (!variationCode) {
    return res.status(400).json({
      success: false,
      message:
        'TV subscription plan is required.',
    });
  }

  if (!/^0\d{10}$/.test(phone)) {
    return res.status(400).json({
      success: false,
      message:
        'Enter a valid Nigerian phone number.',
    });
  }

  if (
    subscriptionType !== 'change' &&
    subscriptionType !== 'renew'
  ) {
    return res.status(400).json({
      success: false,
      message:
        'Invalid TV subscription type.',
    });
  }

  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 12
  ) {
    return res.status(400).json({
      success: false,
      message:
        'TV subscription quantity must be between 1 and 12 months.',
    });
  }


  // ==========================================================
  // VERIFY THE PLAN AGAINST VTpass
  //
  // Never trust the price supplied by the frontend.
  // ==========================================================

  let plansResult;

  try {
    plansResult =
      await getTVPlans(
        provider
      );

  } catch (error) {
    console.error(
      'TV plan verification error:',
      error?.message ||
        'Unknown error'
    );

    return res.status(502).json({
      success: false,
      code:
        'TV_PLAN_LOOKUP_FAILED',
      message:
        'Unable to verify this TV plan right now. Please try again.',
    });
  }


  const selectedPlan =
    plansResult.plans.find(
      (plan) =>
        String(
          plan.variation_code
        ) === variationCode
    );

  if (!selectedPlan) {
    return res.status(400).json({
      success: false,
      code:
        'INVALID_TV_PLAN',
      message:
        'The selected TV plan is no longer available. Please refresh the plans and try again.',
    });
  }


  const amount =
    Number(
      selectedPlan.amount
    );

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return res.status(400).json({
      success: false,
      code:
        'INVALID_TV_PLAN_AMOUNT',
      message:
        'The selected TV plan has an invalid price.',
    });
  }


  const reference =
    createReference();


  let account;
  let billPaymentId;


  // ==========================================================
  // STEP 1
  // RESERVE CUSTOMER WALLET
  // ==========================================================

  const client =
    await pool.connect();

  try {
    await client.query(
      'BEGIN'
    );


    const accountResult =
      await client.query(
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


    if (
      accountResult.rows.length === 0
    ) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(404).json({
        success: false,
        message:
          'Active NGN wallet account not found.',
      });
    }


    account =
      accountResult.rows[0];


    const balance =
      Number(
        account.balance
      );


    if (
      !Number.isFinite(balance)
    ) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to read wallet balance.',
      });
    }


    if (balance < amount) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(400).json({
        success: false,
        code:
          'INSUFFICIENT_BALANCE',
        message:
          'Insufficient wallet balance.',
      });
    }


    const balanceBefore =
      balance;

    const balanceAfter =
      balance - amount;


    // --------------------------------------------------------
    // BILL PAYMENT RECORD
    // --------------------------------------------------------

    const billResult =
      await client.query(
        `
        INSERT INTO bill_payments (
          account_id,
          category,
          biller_name,
          customer_reference,
          amount,
          currency,
          reference,
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
        ]
      );


    billPaymentId =
      billResult.rows[0].id;


    // --------------------------------------------------------
    // UPDATE WALLET
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
    // CENTRAL TRANSACTION HISTORY
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


    await client.query(
      'COMMIT'
    );

  } catch (error) {
    try {
      await client.query(
        'ROLLBACK'
      );
    } catch (_) {
      // Ignore rollback errors.
    }

    console.error(
      'TV wallet transaction error:',
      error?.message ||
        'Unknown error'
    );

    return res.status(500).json({
      success: false,
      code:
        'TV_WALLET_TRANSACTION_FAILED',
      message:
        'Unable to start the TV subscription.',
    });

  } finally {
    client.release();
  }


  // ==========================================================
  // STEP 2
  // CALL VTPASS
  // ==========================================================

  let providerResult;

  try {
    providerResult =
      await purchaseTV({
        provider,
        billersCode,
        variationCode,
        amount,
        phone,
        subscriptionType,
        quantity,
      });

  } catch (error) {
    console.error(
      'VTpass TV purchase error:',
      error?.message ||
        'Unknown error'
    );

    // Keep pending because the provider outcome is unknown.
    return res.status(202).json({
      success: true,
      status: 'pending',
      reference,
      message:
        'Your TV subscription is being processed. We are checking the provider status.',
    });
  }


  const providerResponse =
    providerResult.response;


  const providerStatus =
    getProviderStatus(
      providerResponse
    );


  const providerReference =
    getProviderReference(
      providerResponse,
      providerResult
    );


  const commissionDetails =
    getCommissionDetails(
      providerResponse
    );


  const providerMessage =
    getProviderMessage(
      providerResponse
    );


  // ==========================================================
  // STEP 3
  // SUCCESS
  // ==========================================================

  if (
    providerStatus ===
    'completed'
  ) {
    try {
      await pool.query(
        `
        UPDATE bill_payments
        SET
          provider_reference = $1,
          provider_request_id = $2,
          commission_details = $3,
          provider_response = $4,
          status = 'completed',
          completed_at = CURRENT_TIMESTAMP
        WHERE id = $5
        `,
        [
          providerReference,
          providerResult.requestId,
          commissionDetails,
          providerResponse,
          billPaymentId,
        ]
      );


      await pool.query(
        `
        UPDATE transactions
        SET
          status = 'completed'
        WHERE reference = $1
        `,
        [reference]
      );

    } catch (error) {
      console.error(
        'TV completion update error:',
        error?.message ||
          'Unknown error'
      );

      // Provider has already delivered the service.
      // Never refund automatically here.
      return res.status(202).json({
        success: true,
        status: 'pending',
        reference,
        message:
          'The TV subscription was processed by the provider and is being finalized in your account.',
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
        code:
          selectedPlan.variation_code,
        name:
          selectedPlan.name,
        amount,
      },

      message:
        'TV subscription successful.',
    });
  }


  // ==========================================================
  // PENDING
  // ==========================================================

  if (
    providerStatus ===
    'pending'
  ) {
    await pool.query(
      `
      UPDATE bill_payments
      SET
        provider_reference = $1,
        provider_request_id = $2,
        commission_details = $3,
        provider_response = $4,
        status = 'pending'
      WHERE id = $5
      `,
      [
        providerReference,
        providerResult.requestId,
        commissionDetails,
        providerResponse,
        billPaymentId,
      ]
    );


    await pool.query(
      `
      UPDATE transactions
      SET
        status = 'pending'
      WHERE reference = $1
      `,
      [reference]
    );


    return res.status(202).json({
      success: true,
      status: 'pending',
      reference,
      providerReference,
      provider,

      billersCode,

      plan: {
        code:
          selectedPlan.variation_code,
        name:
          selectedPlan.name,
        amount,
      },

      message:
        'Your TV subscription is being processed. Please check your transaction history for the final status.',
    });
  }


  // ==========================================================
  // EXPLICIT PROVIDER FAILURE
  //
  // Refund the wallet because VTpass explicitly rejected
  // the transaction.
  // ==========================================================

  const refundClient =
    await pool.connect();

  try {
    await refundClient.query(
      'BEGIN'
    );


    const lockedAccount =
      await refundClient.query(
        `
        SELECT
          id,
          balance
        FROM accounts
        WHERE id = $1
        FOR UPDATE
        `,
        [account.id]
      );


    if (
      lockedAccount.rows.length === 0
    ) {
      throw new Error(
        'Account disappeared during TV refund.'
      );
    }


    const currentBalance =
      Number(
        lockedAccount.rows[0]
          .balance
      );


    const refundedBalance =
      currentBalance + amount;


    await refundClient.query(
      `
      UPDATE accounts
      SET
        balance = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [
        refundedBalance,
        account.id,
      ]
    );


    await refundClient.query(
      `
      UPDATE bill_payments
      SET
        provider_reference = $1,
        provider_request_id = $2,
        commission_details = $3,
        provider_response = $4,
        status = 'failed',
        failure_reason = $5
      WHERE id = $6
      `,
      [
        providerReference,
        providerResult.requestId,
        commissionDetails,
        providerResponse,
        providerMessage ||
          'VTpass rejected the TV subscription.',
        billPaymentId,
      ]
    );


    await refundClient.query(
      `
      UPDATE transactions
      SET
        status = 'failed'
      WHERE reference = $1
      `,
      [reference]
    );


    await refundClient.query(
      'COMMIT'
    );

  } catch (error) {
    try {
      await refundClient.query(
        'ROLLBACK'
      );
    } catch (_) {
      // Ignore rollback errors.
    }

    console.error(
      'TV purchase refund error:',
      error?.message ||
        'Unknown error'
    );

    return res.status(500).json({
      success: false,
      code:
        'TV_PURCHASE_REFUND_PENDING',
      reference,
      message:
        'The provider rejected the subscription, but wallet reconciliation requires attention. Please contact support with the transaction reference.',
    });

  } finally {
    refundClient.release();
  }


  return res.status(400).json({
    success: false,
    status: 'failed',
    reference,

    provider,

    billersCode,

    plan: {
      code:
        selectedPlan.variation_code,
      name:
        selectedPlan.name,
      amount,
    },

    message:
      providerMessage ||
      'TV subscription failed. Your wallet has been refunded.',
  });
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getPlans,
  verifyAccount,
  buyTV,
};
