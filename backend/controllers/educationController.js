const crypto = require('crypto');
const pool = require('../config/database');
const {
  EDUCATION_SERVICE_IDS,
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
//
// Supported:
// - WAEC Registration PIN
// - WAEC Result Checker PIN
// - JAMB PIN
//
// Uses the existing bill_payments table and central
// transactions table.
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
  return String(value || '')
    .trim();
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
    providerResponse
      ?.content
      ?.transactions
      ?.transactionId ||
    providerResponse?.transactionId ||
    providerResponse?.requestId ||
    fallbackRequestId ||
    null
  );
};
const getProviderMessage = (
  providerResponse
) => {
  return (
    providerResponse?.response_description ||
    providerResponse?.message ||
    providerResponse
      ?.content
      ?.transactions
      ?.response_description ||
    null
  );
};
const extractPurchasedCode = (
  providerResponse
) => {
  return (
    providerResponse?.purchased_code ||
    providerResponse?.Pin ||
    providerResponse?.pin ||
    providerResponse
      ?.content
      ?.transactions
      ?.purchased_code ||
    null
  );
};
const extractTokens = (
  providerResponse
) => {
  if (
    Array.isArray(
      providerResponse?.tokens
    )
  ) {
    return providerResponse.tokens;
  }
  if (
    Array.isArray(
      providerResponse
        ?.content
        ?.tokens
    )
  ) {
    return providerResponse
      .content
      .tokens;
  }
  return [];
};
// ============================================================
// GET EDUCATION PLANS
//
// GET /api/education/plans?service=waec
// GET /api/education/plans?service=waec-registration
// GET /api/education/plans?service=jamb
//
// The frontend must use the variation amount returned here.
// The purchase controller independently verifies the price
// again before debiting the customer's wallet.
// ============================================================
const getPlans = async (
  req,
  res
) => {
  try {
    const service =
      cleanString(
        req.query?.service
      );
    if (!service) {
      return res.status(400).json({
        success: false,
        code:
          'EDUCATION_SERVICE_REQUIRED',
        message:
          'Education service is required.',
      });
    }
    const serviceId =
      getEducationServiceId(
        service
      );
    const result =
      await getEducationVariations(
        serviceId
      );
    const plans =
      Array.isArray(
        result.variations
      )
        ? result.variations.map(
            (variation) => ({
              variation_code:
                variation
                  ?.variation_code ||
                variation
                  ?.variationCode ||
                null,
              name:
                variation?.name ||
                variation?.product_name ||
                null,
              amount:
                Number(
                  variation
                    ?.variation_amount ??
                    variation?.amount ??
                    0
                ),
              fixedPrice:
                variation?.fixedPrice ||
                null,
            })
          )
        : [];
    return res.status(200).json({
      success: true,
      serviceID:
        serviceId,
      serviceName:
        getServiceName(
          serviceId
        ),
      plans,
      responseDescription:
        result.responseDescription ||
        null,
    });
  } catch (error) {
    console.error(
      'Get education plans error:',
      error?.code ||
        error?.message ||
        'Unknown error'
    );
    const statusMap = {
      UNSUPPORTED_EDUCATION_SERVICE: 400,
      VTPASS_CONFIGURATION_ERROR: 500,
      VTPASS_TIMEOUT: 504,
    };
    const status =
      statusMap[
        error?.code
      ] || 500;
    return res.status(status).json({
      success: false,
      code:
        error?.code ||
        'EDUCATION_PLANS_ERROR',
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
//   "profile_id": "0123456789"
// }
//
// This endpoint does NOT debit the customer's wallet.
// ============================================================
const verifyJamb = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }
    const profileId =
      cleanString(
        req.body?.profile_id ||
        req.body?.profileId
      );
    if (!profileId) {
      return res.status(400).json({
        success: false,
        code:
          'JAMB_PROFILE_ID_REQUIRED',
        message:
          'JAMB Profile ID is required.',
      });
    }
    const variationCode =
  req.body?.variation_code ||
  req.body?.variationCode;

if (!variationCode) {
  return res.status(400).json({
    success: false,
    message: 'JAMB variation code is required',
  });
}

const result = await verifyJambProfile({
  profileId,
  variationCode,
  service: 'jamb',
});
    const providerResponse =
      result.response;
    const customerName =
      providerResponse
        ?.content
        ?.Customer_Name ||
      providerResponse
        ?.content
        ?.customer_name ||
      null;
    return res.status(200).json({
      success: true,
      profileId,
      customerName,
      requestId:
        result.requestId,
      message:
        customerName
          ? 'JAMB Profile ID verified successfully.'
          : 'JAMB Profile ID verified successfully.',
    });
  } catch (error) {
    console.error(
      'JAMB profile verification error:',
      error?.code ||
        error?.message ||
        'Unknown error'
    );
    const statusMap = {
      JAMB_PROFILE_ID_REQUIRED: 400,
      INVALID_JAMB_SERVICE: 400,
      VTPASS_CONFIGURATION_ERROR: 500,
      VTPASS_TIMEOUT: 504,
      VTPASS_HTTP_ERROR: 502,
    };
    return res.status(
      statusMap[
        error?.code
      ] || 502
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
// PURCHASE EDUCATION PRODUCT
//
// POST /api/education
//
// Expected body:
//
// WAEC:
// {
//   "service": "waec",
//   "variation_code": "waecdirect",
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
//   "variation_code": "utme-no-mock",
//   "profile_id": "0123456789",
//   "phone": "08012345678"
// }
//
// transaction_pin is handled by transactionPinMiddleware
// before this controller runs.
// ============================================================
const purchase = async (
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
  const serviceInput =
    cleanString(
      req.body?.service ||
      req.body?.service_id ||
      req.body?.serviceID
    );
  if (!serviceInput) {
    return res.status(400).json({
      success: false,
      code:
        'EDUCATION_SERVICE_REQUIRED',
      message:
        'Education service is required.',
    });
  }
  let serviceId;
  try {
    serviceId =
      getEducationServiceId(
        serviceInput
      );
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
  const variationCode =
    cleanString(
      req.body?.variation_code ||
      req.body?.variationCode
    );
  if (!variationCode) {
    return res.status(400).json({
      success: false,
      code:
        'EDUCATION_VARIATION_REQUIRED',
      message:
        'Please select an education plan.',
    });
  }
  const phone =
    cleanPhoneNumber(
      req.body?.phone
    );
  if (!isValidPhoneNumber(phone)) {
    return res.status(400).json({
      success: false,
      code:
        'INVALID_PHONE_NUMBER',
      message:
        'Enter a valid Nigerian phone number.',
    });
  }
  const profileId =
    cleanString(
      req.body?.profile_id ||
      req.body?.profileId
    );
  // ==========================================================
  // JAMB REQUIRES PROFILE ID
  // ==========================================================
  if (
    serviceId ===
    EDUCATION_SERVICE_IDS.JAMB &&
    !profileId
  ) {
    return res.status(400).json({
      success: false,
      code:
        'JAMB_PROFILE_ID_REQUIRED',
      message:
        'JAMB Profile ID is required.',
    });
  }
  // ==========================================================
  // GET CURRENT VTpass VARIATIONS
  //
  // NEVER trust the price sent by the frontend.
  // ==========================================================
  let variationsResult;
  try {
    variationsResult =
      await getEducationVariations(
        serviceId
      );
  } catch (error) {
    console.error(
      'Education variation lookup error:',
      error?.code ||
        error?.message ||
        'Unknown error'
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
  const selectedVariation =
    variationsResult.variations.find(
      (variation) =>
        String(
          variation?.variation_code ||
          ''
        ).trim() ===
        variationCode
    );
  if (!selectedVariation) {
    return res.status(400).json({
      success: false,
      code:
        'INVALID_EDUCATION_PLAN',
      message:
        'The selected education plan is no longer available. Please refresh the plans and try again.',
    });
  }
  const amount =
    Number(
      selectedVariation
        ?.variation_amount ??
      selectedVariation?.amount
    );
  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return res.status(400).json({
      success: false,
      code:
        'INVALID_EDUCATION_PLAN_AMOUNT',
      message:
        'The selected education plan has an invalid price.',
    });
  }
  // ==========================================================
  // JAMB PROFILE VERIFICATION
  //
  // Verify BEFORE taking money.
  // ==========================================================
  let jambVerification =
    null;
  if (
    serviceId ===
    EDUCATION_SERVICE_IDS.JAMB
  ) {
    try {
      jambVerification =
       await verifyJambProfile({
        profileId,
       variationCode,
       service: 'jamb',
     });
    } catch (error) {
      console.error(
        'JAMB purchase profile verification error:',
        error?.code ||
          error?.message ||
          'Unknown error'
      );
      return res.status(
        error?.code ===
          'VTPASS_TIMEOUT'
          ? 504
          : 400
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
  // CREATE LOCAL REFERENCE
  // ==========================================================
  const reference =
    createReference();
  const serviceName =
    getServiceName(
      serviceId
    );
  /*
   * WAEC does not use a customer billersCode in the
   * documented VTpass purchase payload.
   *
   * The existing educationService currently requires one,
   * so for WAEC we use the recipient phone as the local
   * customer reference passed into that service.
   *
   * JAMB correctly uses the JAMB Profile ID.
   */
  const billersCode =
    serviceId ===
    EDUCATION_SERVICE_IDS.JAMB
      ? profileId
      : phone;
  // ==========================================================
  // STEP 1
  // RESERVE / DEBIT CUSTOMER WALLET
  // ==========================================================
  const client =
    await pool.connect();
  let account;
  let billPaymentId;
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
    if (
      balance < amount
    ) {
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
    // CREATE PENDING EDUCATION PAYMENT
    // --------------------------------------------------------
    const paymentResult =
      await client.query(
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
          NULL,
          'pending'
        )
        RETURNING id
        `,
        [
          account.id,
          serviceName,
          billersCode,
          jambVerification
            ?.response
            ?.content
            ?.Customer_Name ||
            null,
          amount,
          reference,
        ]
      );
    billPaymentId =
      paymentResult.rows[0].id;
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
    await client.query(
      'COMMIT'
    );
  } catch (error) {
    try {
      await client.query(
        'ROLLBACK'
      );
    } catch (_) {}
    console.error(
      'Education wallet transaction error:',
      error?.message ||
        'Unknown error'
    );
    return res.status(500).json({
      success: false,
      code:
        'EDUCATION_WALLET_TRANSACTION_FAILED',
      message:
        'Unable to start the education payment.',
    });
  } finally {
    client.release();
  }
  // ==========================================================
  // STEP 2
  // SEND PAYMENT TO VTPASS
  // ==========================================================
  let providerResult;
  try {
    providerResult =
      await purchaseEducation({
        service: serviceId,
        billersCode,
        variationCode,
        amount,
        phone,
        additionalFields:
  serviceId === EDUCATION_SERVICE_IDS.WAEC_RESULT ||
  serviceId === EDUCATION_SERVICE_IDS.WAEC_REGISTRATION
    ? {
        quantity: Math.max(
          1,
          Number(req.body?.quantity || 1)
        ),
      }
    : {},
      });
  } catch (error) {
    console.error(
      'VTpass education purchase error:',
      error?.code ||
        error?.message ||
        'Unknown error'
    );
    /*
     * IMPORTANT:
     *
     * A timeout/network error does NOT automatically mean
     * the provider rejected the transaction.
     *
     * Keep the wallet transaction pending so it can be
     * requeried.
     */
    return res.status(202).json({
      success: true,
      status: 'pending',
      reference,
      message:
        'Your education payment is being processed. We are checking the provider status.',
    });
  }
  const providerResponse =
    providerResult.response;
  const providerStatus =
    getEducationProviderStatus(
      providerResponse
    );
  const providerReference =
    getProviderReference(
      providerResponse,
      providerResult.requestId
    );
  const providerMessage =
    getProviderMessage(
      providerResponse
    );
  const purchasedCode =
    extractPurchasedCode(
      providerResponse
    );
  const tokens =
    extractTokens(
      providerResponse
    );
  // ==========================================================
  // STEP 3
  // COMPLETED
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
          provider_request_id = $1,
          provider_reference = $2,
          provider_response = $3,
          commission_details = $4,
          status = 'completed',
          completed_at = CURRENT_TIMESTAMP
        WHERE id = $5
        `,
        [
          providerResult.requestId,
          providerReference,
          providerResponse,
          providerResponse
            ?.content
            ?.transactions
            ?.commission_details ||
            null,
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
      /*
       * Provider already delivered the product.
       * Never refund automatically here.
       */
      console.error(
        'Education completion update error:',
        error?.message ||
          'Unknown error'
      );
      return res.status(202).json({
        success: true,
        status: 'pending',
        reference,
        message:
          'The education payment was processed by the provider and is being finalized in your account.',
      });
    }
    return res.status(200).json({
      success: true,
      status: 'completed',
      reference,
      providerReference,
      service: serviceId,
      serviceName,
      variationCode,
      amount,
      phone,
      profileId:
        serviceId ===
        EDUCATION_SERVICE_IDS.JAMB
          ? profileId
          : null,
      purchasedCode,
      tokens,
      customerName:
        jambVerification
          ?.response
          ?.content
          ?.Customer_Name ||
        providerResponse
          ?.content
          ?.transactions
          ?.name ||
        null,
      message:
        'Education payment successful.',
    });
  }
  // ==========================================================
  // STEP 4
  // PENDING
  // ==========================================================
  if (
    providerStatus ===
    'pending'
  ) {
    try {
      await pool.query(
        `
        UPDATE bill_payments
        SET
          provider_request_id = $1,
          provider_reference = $2,
          provider_response = $3,
          status = 'pending'
        WHERE id = $4
        `,
        [
          providerResult.requestId,
          providerReference,
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
    } catch (error) {
      console.error(
        'Education pending update error:',
        error?.message ||
          'Unknown error'
      );
    }
    return res.status(202).json({
      success: true,
      status: 'pending',
      reference,
      providerReference,
      service: serviceId,
      serviceName,
      variationCode,
      amount,
      phone,
      profileId:
        serviceId ===
        EDUCATION_SERVICE_IDS.JAMB
          ? profileId
          : null,
      message:
        'Your education payment is being processed. Please check your transaction history for the final status.',
    });
  }
  // ==========================================================
  // STEP 5
  // EXPLICIT PROVIDER FAILURE
  //
  // Refund the customer.
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
        'Account disappeared during education payment refund.'
      );
    }
    const currentBalance =
      Number(
        lockedAccount
          .rows[0]
          .balance
      );
    const refundedBalance =
      currentBalance + amount;
    // --------------------------------------------------------
    // REFUND WALLET
    // --------------------------------------------------------
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
    // --------------------------------------------------------
    // UPDATE BILL PAYMENT
    // --------------------------------------------------------
    await refundClient.query(
      `
      UPDATE bill_payments
      SET
        provider_request_id = $1,
        provider_reference = $2,
        provider_response = $3,
        commission_details = $4,
        status = 'failed',
        failure_reason = $5
      WHERE id = $6
      `,
      [
        providerResult.requestId,
        providerReference,
        providerResponse,
        providerResponse
          ?.content
          ?.transactions
          ?.commission_details ||
          null,
        providerMessage ||
          'VTpass rejected the education payment.',
        billPaymentId,
      ]
    );
    // --------------------------------------------------------
    // UPDATE CENTRAL TRANSACTION
    // --------------------------------------------------------
    await refundClient.query(
      `
      UPDATE transactions
      SET
        status = 'failed'
      WHERE reference = $1
      `,
      [reference]
    );
    // --------------------------------------------------------
    // CREATE REFUND TRANSACTION
    //
    // This makes the refund visible in transaction history.
    // --------------------------------------------------------
    await refundClient.query(
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
        'NGN',
        $3,
        $4,
        'completed',
        $5,
        $6
      )
      `,
      [
        account.id,
        amount,
        `${reference}-REFUND`,
        `Refund for failed ${serviceName}`,
        currentBalance,
        refundedBalance,
      ]
    );
    await refundClient.query(
      'COMMIT'
    );
  } catch (error) {
    try {
      await refundClient.query(
        'ROLLBACK'
      );
    } catch (_) {}
    console.error(
      'Education payment refund error:',
      error?.message ||
        'Unknown error'
    );
    /*
     * DO NOT claim that the customer was refunded.
     *
     * The original payment remains something that requires
     * reconciliation.
     */
    return res.status(500).json({
      success: false,
      code:
        'EDUCATION_REFUND_PENDING',
      reference,
      message:
        'The education provider rejected the payment, but wallet reconciliation requires attention. Please contact support with the transaction reference.',
    });
  } finally {
    refundClient.release();
  }
  return res.status(400).json({
    success: false,
    status: 'failed',
    reference,
    service: serviceId,
    serviceName,
    variationCode,
    amount,
    message:
      providerMessage ||
      'Education payment failed. Your wallet has been refunded.',
  });
};
// ============================================================
// REQUERY EDUCATION TRANSACTION
//
// POST /api/education/requery
//
// Body:
// {
//   "request_id": "VTpass request ID"
// }
//
// This is useful for pending transactions.
// ============================================================
const requery = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }
    const requestId =
      cleanString(
        req.body?.request_id ||
        req.body?.requestId
      );
    if (!requestId) {
      return res.status(400).json({
        success: false,
        code:
          'REQUEST_ID_REQUIRED',
        message:
          'VTpass request ID is required.',
      });
    }
    const providerResponse =
      await requeryEducationTransaction(
        requestId
      );
    const providerStatus =
      getEducationProviderStatus(
        providerResponse
      );
    return res.status(200).json({
      success: true,
      status:
        providerStatus,
      requestId,
      providerReference:
        getProviderReference(
          providerResponse,
          requestId
        ),
      purchasedCode:
        extractPurchasedCode(
          providerResponse
        ),
      tokens:
        extractTokens(
          providerResponse
        ),
      providerResponse,
    });
  } catch (error) {
    console.error(
      'Education transaction requery error:',
      error?.code ||
        error?.message ||
        'Unknown error'
    );
    return res.status(
      error?.code ===
        'VTPASS_TIMEOUT'
        ? 504
        : 502
    ).json({
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
