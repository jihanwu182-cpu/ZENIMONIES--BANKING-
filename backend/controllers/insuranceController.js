const crypto = require('crypto');
const pool = require('../config/database');

const {
  INSURANCE_SERVICE_IDS,
  getInsurancePlans,
  getMotorInsuranceOptions,
  getMotorInsuranceLgas,
  getMotorInsuranceModels,
  purchaseInsurance,
  requeryInsurance,
} = require('../services/insuranceService');

// ============================================================
// ZENIMONIES BANKING
// INSURANCE PAYMENT CONTROLLER
//
// Supported:
// - Third-Party Motor Insurance
// - Personal Accident Insurance
//
// Uses:
// - accounts
// - bill_payments
// - transactions
// - VTpass
// ============================================================


// ============================================================
// HELPERS
// ============================================================

const createReference = () => {
  return `ZINS-${Date.now()}-${crypto
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

const getInsuranceServiceName = (service) => {
  switch (service) {
    case INSURANCE_SERVICE_IDS.MOTOR:
      return 'Third-Party Motor Insurance';

    case INSURANCE_SERVICE_IDS.PERSONAL_ACCIDENT:
      return 'Personal Accident Insurance';

    default:
      return 'Insurance Payment';
  }
};

const getProviderReference = (
  providerResponse,
  fallbackRequestId = null
) => {
  return (
    providerResponse?.content?.transactions
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
    providerResponse?.content?.transactions
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
    providerResponse?.content?.transactions
      ?.purchased_code ||
    null
  );
};

const extractCertificateUrl = (
  providerResponse
) => {
  return (
    providerResponse?.certUrl ||
    providerResponse?.certificateUrl ||
    providerResponse?.content?.certUrl ||
    providerResponse?.content?.certificateUrl ||
    providerResponse?.content?.transactions
      ?.certUrl ||
    null
  );
};


// ============================================================
// GET INSURANCE PLANS
//
// GET /api/insurance/plans?serviceID=ui-insure
// GET /api/insurance/plans?serviceID=personal-accident-insurance
// ============================================================

const getPlans = async (req, res) => {
  try {
    const serviceID =
      cleanString(
        req.query?.serviceID ||
        req.query?.service
      );

    if (!serviceID) {
      return res.status(400).json({
        success: false,
        code: 'INSURANCE_SERVICE_REQUIRED',
        message:
          'Insurance service is required.',
      });
    }

    if (
      !Object.values(
        INSURANCE_SERVICE_IDS
      ).includes(serviceID)
    ) {
      return res.status(400).json({
        success: false,
        code:
          'UNSUPPORTED_INSURANCE_SERVICE',
        message:
          'Unsupported insurance service.',
      });
    }

    const result =
      await getInsurancePlans(
        serviceID
      );

    const variations =
      Array.isArray(
        result?.content?.variations
      )
        ? result.content.variations
        : [];

    const plans = variations.map(
      (variation) => ({
        variation_code:
          variation?.variation_code ||
          variation?.variationCode ||
          null,

        name:
          variation?.name ||
          variation?.product_name ||
          null,

        variation_amount:
          Number(
            variation?.variation_amount ??
            variation?.amount ??
            0
          ),

        amount:
          Number(
            variation?.variation_amount ??
            variation?.amount ??
            0
          ),

        fixedPrice:
          variation?.fixedPrice ??
          null,

        serviceID,
      })
    );

    return res.status(200).json({
      success: true,
      serviceID,
      serviceName:
        getInsuranceServiceName(
          serviceID
        ),
      plans,
      data: plans,
      responseDescription:
        result?.responseDescription ||
        null,
    });
  } catch (error) {
    console.error(
      'Get insurance plans error:',
      error?.message ||
        'Unknown error'
    );

    return res.status(500).json({
      success: false,
      code:
        error?.code ||
        'INSURANCE_PLANS_ERROR',
      message:
        error?.message ||
        'Unable to load insurance plans.',
    });
  }
};


// ============================================================
// GET MOTOR INSURANCE OPTIONS
//
// GET /api/insurance/motor/options
// ============================================================

const getMotorOptions = async (
  req,
  res
) => {
  try {
    const result =
      await getMotorInsuranceOptions();

    return res.status(200).json({
      success: true,
      message:
        'Motor insurance options loaded successfully.',
      data: result,
    });
  } catch (error) {
    console.error(
      'Motor insurance options error:',
      error?.message ||
        'Unknown error'
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        'Unable to load motor insurance options.',
    });
  }
};


// ============================================================
// GET MOTOR INSURANCE LGAs
//
// GET /api/insurance/motor/lga/:stateCode
// ============================================================

const getMotorLgas = async (
  req,
  res
) => {
  try {
    const stateCode =
      cleanString(
        req.params?.stateCode
      );

    if (!stateCode) {
      return res.status(400).json({
        success: false,
        message:
          'State code is required.',
      });
    }

    const result =
      await getMotorInsuranceLgas(
        stateCode
      );

    return res.status(200).json({
      success: true,
      message:
        'LGAs loaded successfully.',
      data: result,
    });
  } catch (error) {
    console.error(
      'Motor insurance LGA error:',
      error?.message ||
        'Unknown error'
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        'Unable to load LGAs.',
    });
  }
};


// ============================================================
// GET MOTOR INSURANCE MODELS
//
// GET /api/insurance/motor/models/:vehicleMakeCode
// ============================================================

const getMotorModels = async (
  req,
  res
) => {
  try {
    const vehicleMakeCode =
      cleanString(
        req.params?.vehicleMakeCode
      );

    if (!vehicleMakeCode) {
      return res.status(400).json({
        success: false,
        message:
          'Vehicle make code is required.',
      });
    }

    const result =
      await getMotorInsuranceModels(
        vehicleMakeCode
      );

    return res.status(200).json({
      success: true,
      message:
        'Vehicle models loaded successfully.',
      data: result,
    });
  } catch (error) {
    console.error(
      'Motor insurance model error:',
      error?.message ||
        'Unknown error'
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        'Unable to load vehicle models.',
    });
  }
};


// ============================================================
// PURCHASE INSURANCE
//
// POST /api/insurance
//
// transactionPinMiddleware runs BEFORE this controller.
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

  const serviceID =
    cleanString(
      req.body?.serviceID ||
      req.body?.service ||
      req.body?.service_id
    );

  if (!serviceID) {
    return res.status(400).json({
      success: false,
      code:
        'INSURANCE_SERVICE_REQUIRED',
      message:
        'Insurance service is required.',
    });
  }

  if (
    !Object.values(
      INSURANCE_SERVICE_IDS
    ).includes(serviceID)
  ) {
    return res.status(400).json({
      success: false,
      code:
        'UNSUPPORTED_INSURANCE_SERVICE',
      message:
        'Unsupported insurance service.',
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
        'INSURANCE_VARIATION_REQUIRED',
      message:
        'Please select an insurance plan.',
    });
  }

  // ==========================================================
  // PHONE
  // ==========================================================

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


  // ==========================================================
  // MOTOR INSURANCE VALIDATION
  // ==========================================================

  if (
    serviceID ===
    INSURANCE_SERVICE_IDS.MOTOR
  ) {
    const requiredFields = [
      [
        'billersCode',
        'Vehicle plate number',
      ],
      [
        'Insured_Name',
        'Insured name',
      ],
      [
        'email',
        'Email address',
      ],
      [
        'engine_capacity',
        'Engine capacity',
      ],
      [
        'Chasis_Number',
        'Chassis number',
      ],
      [
        'Plate_Number',
        'Plate number',
      ],
      [
        'vehicle_make',
        'Vehicle make',
      ],
      [
        'vehicle_color',
        'Vehicle colour',
      ],
      [
        'vehicle_model',
        'Vehicle model',
      ],
      [
        'YearofMake',
        'Year of make',
      ],
      [
        'state',
        'State',
      ],
      [
        'lga',
        'LGA',
      ],
    ];

    for (
      const [field, label]
      of requiredFields
    ) {
      if (
        bodyValueMissing(
          req.body?.[field]
        )
      ) {
        return res.status(400).json({
          success: false,
          code:
            'INSURANCE_FIELD_REQUIRED',
          message:
            `${label} is required.`,
        });
      }
    }
  }


  // ==========================================================
  // PERSONAL ACCIDENT VALIDATION
  // ==========================================================

  if (
    serviceID ===
    INSURANCE_SERVICE_IDS.PERSONAL_ACCIDENT
  ) {
    const requiredFields = [
      [
        'billersCode',
        'Full name',
      ],
      [
        'full_name',
        'Full name',
      ],
      [
        'address',
        'Address',
      ],
      [
        'dob',
        'Date of birth',
      ],
      [
        'next_kin_name',
        'Next of kin name',
      ],
      [
        'next_kin_phone',
        'Next of kin phone',
      ],
      [
        'business_occupation',
        'Occupation',
      ],
    ];

    for (
      const [field, label]
      of requiredFields
    ) {
      if (
        bodyValueMissing(
          req.body?.[field]
        )
      ) {
        return res.status(400).json({
          success: false,
          code:
            'INSURANCE_FIELD_REQUIRED',
          message:
            `${label} is required.`,
        });
      }
    }
  }


  // ==========================================================
  // GET LIVE VTpass PLAN
  //
  // NEVER TRUST THE FRONTEND PRICE.
  // ==========================================================

  let variationsResult;

  try {
    variationsResult =
      await getInsurancePlans(
        serviceID
      );
  } catch (error) {
    console.error(
      'Insurance variation lookup error:',
      error?.message ||
        'Unknown error'
    );

    return res.status(502).json({
      success: false,
      code:
        'INSURANCE_VARIATION_LOOKUP_FAILED',
      message:
        'Unable to verify the selected insurance plan right now. Please try again.',
    });
  }

  const variations =
    Array.isArray(
      variationsResult?.content?.variations
    )
      ? variationsResult.content.variations
      : [];

  const selectedVariation =
    variations.find(
      (variation) =>
        String(
          variation?.variation_code ||
          variation?.variationCode ||
          ''
        ).trim() ===
        variationCode
    );

  if (!selectedVariation) {
    return res.status(400).json({
      success: false,
      code:
        'INVALID_INSURANCE_PLAN',
      message:
        'The selected insurance plan is no longer available. Please refresh the plans and try again.',
    });
  }

  const amount =
    Number(
      selectedVariation?.variation_amount ??
      selectedVariation?.amount
    );

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return res.status(400).json({
      success: false,
      code:
        'INVALID_INSURANCE_PLAN_AMOUNT',
      message:
        'The selected insurance plan has an invalid price.',
    });
  }


  // ==========================================================
  // LOCAL REFERENCE
  // ==========================================================

  const reference =
    createReference();

  const serviceName =
    getInsuranceServiceName(
      serviceID
    );


  // ==========================================================
  // CUSTOMER REFERENCE
  // ==========================================================

  const customerReference =
    cleanString(
      req.body?.billersCode ||
      req.body?.Plate_Number ||
      req.body?.full_name ||
      req.body?.Insured_Name
    );


  // ==========================================================
  // CUSTOMER NAME
  // ==========================================================

  const customerName =
    cleanString(
      req.body?.Insured_Name ||
      req.body?.full_name ||
      req.body?.next_kin_name
    ) || null;


  // ==========================================================
  // STEP 1
  // DEBIT WALLET + CREATE PENDING PAYMENT
  //
  // EVERYTHING IS ATOMIC.
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
        code:
          'ACTIVE_ACCOUNT_NOT_FOUND',
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


    // ========================================================
    // CREATE PENDING BILL PAYMENT
    // ========================================================

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
          'insurance',
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
          customerReference,
          customerName,
          amount,
          reference,
        ]
      );

    billPaymentId =
      paymentResult.rows[0].id;


    // ========================================================
    // DEBIT WALLET
    // ========================================================

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


    // ========================================================
    // CENTRAL TRANSACTION
    // ========================================================

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
        'insurance_payment',
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
      'Insurance wallet transaction error:',
      error?.message ||
        'Unknown error'
    );

    return res.status(500).json({
      success: false,
      code:
        'INSURANCE_WALLET_TRANSACTION_FAILED',
      message:
        'Unable to start the insurance payment.',
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
    const vtpassPayload = {
      ...req.body,

      serviceID,

      variation_code:
        variationCode,

      phone,

      amount,
    };

    // Internal ZENIMONIES field.
    delete vtpassPayload.transaction_pin;

    providerResult =
      await purchaseInsurance(
        vtpassPayload
      );
  } catch (error) {
    console.error(
      'VTpass insurance purchase error:',
      error?.message ||
        'Unknown error'
    );

    /*
     * Network/timeout errors must NOT automatically
     * refund because VTpass may have processed the
     * transaction.
     *
     * Leave it pending for requery.
     */

    return res.status(202).json({
      success: true,
      status: 'pending',
      reference,
      message:
        'Your insurance payment is being processed. We are checking the provider status.',
    });
  }


  const providerReference =
    getProviderReference(
      providerResult,
      providerResult?.requestId
    );

  const providerMessage =
    providerResult?.responseDescription ||
    getProviderMessage(
      providerResult
    );

  const purchasedCode =
    providerResult?.purchasedCode ||
    extractPurchasedCode(
      providerResult
    );

  const certificateUrl =
    providerResult?.certificateUrl ||
    extractCertificateUrl(
      providerResult
    );


  // ==========================================================
  // STEP 3
  // SUCCESS
  // ==========================================================

  if (
    providerResult?.status ===
    'successful'
  ) {
    try {
      await pool.query(
        `
        UPDATE bill_payments
        SET
          provider_request_id = $1,
          provider_reference = $2,
          provider_response = $3,
          status = 'completed',
          completed_at = CURRENT_TIMESTAMP
        WHERE id = $4
        `,
        [
          providerResult.requestId,
          providerReference,
          providerResult.raw ||
            providerResult.content ||
            providerResult,
          billPaymentId,
        ]
      );

      await pool.query(
        `
        UPDATE transactions
        SET
          status = 'completed'
        WHERE reference = $1
          AND status = 'pending'
        `,
        [reference]
      );
    } catch (error) {
      /*
       * VTpass has already processed the insurance.
       * Never automatically refund here.
       */

      console.error(
        'Insurance completion update error:',
        error?.message ||
          'Unknown error'
      );

      return res.status(202).json({
        success: true,
        status: 'pending',
        reference,
        message:
          'The insurance payment was processed by the provider and is being finalized in your account.',
      });
    }

    return res.status(200).json({
      success: true,
      status: 'successful',
      reference,
      providerReference,
      serviceID,
      serviceName,
      variationCode,
      amount,
      transaction_id:
        providerResult.transactionId ||
        null,
      purchased_code:
        purchasedCode,
      certificate_url:
        certificateUrl,
      data:
        providerResult.content ||
        null,
      message:
        'Insurance payment successful.',
    });
  }


  // ==========================================================
  // STEP 4
  // PENDING
  // ==========================================================

  if (
    providerResult?.status ===
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
          providerResult.raw ||
            providerResult.content ||
            providerResult,
          billPaymentId,
        ]
      );
    } catch (error) {
      console.error(
        'Insurance pending update error:',
        error?.message ||
          'Unknown error'
      );
    }

    return res.status(202).json({
      success: true,
      status: 'pending',
      reference,
      providerReference,
      request_id:
        providerResult.requestId,
      message:
        'Your insurance payment is being processed. Please check your transaction history for the final status.',
    });
  }


  // ==========================================================
  // STEP 5
  // EXPLICIT PROVIDER FAILURE
  //
  // REFUND CUSTOMER
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
        'Account not found during insurance refund.'
      );
    }

    const currentBalance =
      Number(
        lockedAccount.rows[0].balance
      );

    const refundedBalance =
      currentBalance + amount;


    // ========================================================
    // REFUND WALLET
    // ========================================================

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


    // ========================================================
    // MARK BILL PAYMENT FAILED
    // ========================================================

    await refundClient.query(
      `
      UPDATE bill_payments
      SET
        provider_request_id = $1,
        provider_reference = $2,
        provider_response = $3,
        status = 'failed',
        failure_reason = $4
      WHERE id = $5
        AND status = 'pending'
      `,
      [
        providerResult.requestId,
        providerReference,
        providerResult.raw ||
          providerResult.content ||
          providerResult,
        providerMessage ||
          'VTpass rejected the insurance payment.',
        billPaymentId,
      ]
    );


    // ========================================================
    // MARK ORIGINAL TRANSACTION FAILED
    // ========================================================

    await refundClient.query(
      `
      UPDATE transactions
      SET
        status = 'failed'
      WHERE reference = $1
        AND status = 'pending'
      `,
      [reference]
    );


    // ========================================================
    // CREATE REFUND TRANSACTION
    // ========================================================

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
        'insurance_refund',
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

    return res.status(400).json({
      success: false,
      status: 'failed',
      refunded: true,
      reference,
      serviceID,
      serviceName,
      variationCode,
      amount,
      message:
        providerMessage ||
        'Insurance payment failed. Your wallet has been refunded.',
    });
  } catch (error) {
    try {
      await refundClient.query(
        'ROLLBACK'
      );
    } catch (_) {}

    console.error(
      'Insurance refund error:',
      error?.message ||
        'Unknown error'
    );

    return res.status(500).json({
      success: false,
      code:
        'INSURANCE_REFUND_PENDING',
      reference,
      message:
        'The insurance provider rejected the payment, but the wallet refund requires reconciliation. Please contact support with the transaction reference.',
    });
  } finally {
    refundClient.release();
  }
};


// ============================================================
// REQUERY INSURANCE PAYMENT
//
// POST /api/insurance/requery
// ============================================================

const requery = async (
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

  try {
    // ========================================================
    // FIND CUSTOMER PAYMENT
    // ========================================================

    const paymentResult =
      await pool.query(
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
          AND bp.category = 'insurance'
        LIMIT 1
        `,
        [
          requestId,
          userId,
        ]
      );

    if (
      paymentResult.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        code:
          'INSURANCE_PAYMENT_NOT_FOUND',
        message:
          'Insurance payment could not be found.',
      });
    }

    const payment =
      paymentResult.rows[0];


    // ========================================================
    // ALREADY COMPLETED
    // ========================================================

    if (
      payment.status ===
      'completed'
    ) {
      return res.status(200).json({
        success: true,
        status: 'completed',
        requestId,
        reference:
          payment.reference,
        providerReference:
          payment.provider_reference ||
          requestId,
        message:
          'This insurance payment has already been completed.',
      });
    }


    // ========================================================
    // ALREADY FAILED
    // ========================================================

    if (
      payment.status === 'failed'
    ) {
      return res.status(200).json({
        success: true,
        status: 'failed',
        requestId,
        reference:
          payment.reference,
        providerReference:
          payment.provider_reference ||
          requestId,
        message:
          'This insurance payment has already been finalized as failed.',
      });
    }


    // ========================================================
    // REQUERY VTpass
    // ========================================================

    const providerResult =
      await requeryInsurance(
        requestId
      );

    const providerReference =
      providerResult?.transactionId ||
      providerResult?.requestId ||
      requestId;

    const providerMessage =
      providerResult?.responseDescription ||
      null;

    const purchasedCode =
      providerResult?.purchasedCode ||
      null;

    const certificateUrl =
      providerResult?.certificateUrl ||
      null;


    // ========================================================
    // STILL PENDING
    // ========================================================

    if (
      providerResult?.status ===
      'pending'
    ) {
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
          providerResult.raw ||
            providerResult.content ||
            providerResult,
          payment.id,
        ]
      );

      return res.status(200).json({
        success: true,
        status: 'pending',
        requestId,
        reference:
          payment.reference,
        providerReference,
        message:
          'The insurance payment is still being processed.',
      });
    }


    // ========================================================
    // COMPLETED
    // ========================================================

    if (
      providerResult?.status ===
      'successful'
    ) {
      await pool.query(
        `
        UPDATE bill_payments
        SET
          provider_reference = $1,
          provider_response = $2,
          status = 'completed',
          completed_at = CURRENT_TIMESTAMP
        WHERE id = $3
          AND status = 'pending'
        `,
        [
          providerReference,
          providerResult.raw ||
            providerResult.content ||
            providerResult,
          payment.id,
        ]
      );

      await pool.query(
        `
        UPDATE transactions
        SET
          status = 'completed'
        WHERE reference = $1
          AND status = 'pending'
        `,
        [payment.reference]
      );

      return res.status(200).json({
        success: true,
        status: 'completed',
        requestId,
        reference:
          payment.reference,
        providerReference,
        purchased_code:
          purchasedCode,
        certificate_url:
          certificateUrl,
        message:
          'Insurance payment completed successfully.',
      });
    }


    // ========================================================
    // PROVIDER FAILED
    //
    // REFUND SAFELY
    // ========================================================

    const client =
      await pool.connect();

    try {
      await client.query(
        'BEGIN'
      );

      // ------------------------------------------------------
      // LOCK PAYMENT
      // ------------------------------------------------------

      const lockedPaymentResult =
        await client.query(
          `
          SELECT
            id,
            account_id,
            amount,
            currency,
            reference,
            status,
            biller_name
          FROM bill_payments
          WHERE id = $1
          FOR UPDATE
          `,
          [payment.id]
        );

      if (
        lockedPaymentResult.rows.length === 0
      ) {
        throw new Error(
          'Insurance payment disappeared during requery.'
        );
      }

      const lockedPayment =
        lockedPaymentResult.rows[0];

      // ------------------------------------------------------
      // PROTECT AGAINST DUPLICATE REFUNDS
      // ------------------------------------------------------

      if (
        lockedPayment.status !==
        'pending'
      ) {
        await client.query(
          'COMMIT'
        );

        return res.status(200).json({
          success: true,
          status:
            lockedPayment.status,
          requestId,
          reference:
            lockedPayment.reference,
          message:
            'This insurance payment has already been finalized.',
        });
      }

      // ------------------------------------------------------
      // LOCK ACCOUNT
      // ------------------------------------------------------

      const accountResult =
        await client.query(
          `
          SELECT
            id,
            balance
          FROM accounts
          WHERE id = $1
          FOR UPDATE
          `,
          [lockedPayment.account_id]
        );

      if (
        accountResult.rows.length === 0
      ) {
        throw new Error(
          'Customer account not found during insurance refund.'
        );
      }

      const currentBalance =
        Number(
          accountResult.rows[0].balance
        );

      const refundAmount =
        Number(
          lockedPayment.amount
        );

      if (
        !Number.isFinite(
          refundAmount
        ) ||
        refundAmount <= 0
      ) {
        throw new Error(
          'Invalid insurance refund amount.'
        );
      }

      const refundedBalance =
        currentBalance +
        refundAmount;


      // ------------------------------------------------------
      // REFUND ACCOUNT
      // ------------------------------------------------------

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
          lockedPayment.account_id,
        ]
      );


      // ------------------------------------------------------
      // MARK PAYMENT FAILED
      // ------------------------------------------------------

      await client.query(
        `
        UPDATE bill_payments
        SET
          provider_reference = $1,
          provider_response = $2,
          status = 'failed',
          failure_reason = $3
        WHERE id = $4
          AND status = 'pending'
        `,
        [
          providerReference,
          providerResult.raw ||
            providerResult.content ||
            providerResult,
          providerMessage ||
            'VTpass rejected the insurance payment.',
          lockedPayment.id,
        ]
      );


      // ------------------------------------------------------
      // MARK ORIGINAL TRANSACTION FAILED
      // ------------------------------------------------------

      await client.query(
        `
        UPDATE transactions
        SET
          status = 'failed'
        WHERE reference = $1
          AND status = 'pending'
        `,
        [lockedPayment.reference]
      );


      // ------------------------------------------------------
      // REFUND TRANSACTION
      // ------------------------------------------------------

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
          'insurance_refund',
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
          lockedPayment.account_id,
          refundAmount,
          lockedPayment.currency ||
            'NGN',
          `${lockedPayment.reference}-REFUND`,
          `Refund for failed ${lockedPayment.biller_name || 'insurance payment'}`,
          currentBalance,
          refundedBalance,
        ]
      );

      await client.query(
        'COMMIT'
      );

      return res.status(200).json({
        success: true,
        status: 'failed',
        refunded: true,
        requestId,
        reference:
          lockedPayment.reference,
        providerReference,
        refundAmount,
        message:
          providerMessage ||
          'Insurance payment failed and your wallet has been refunded.',
      });
    } catch (refundError) {
      try {
        await client.query(
          'ROLLBACK'
        );
      } catch (_) {}

      console.error(
        'Insurance requery refund error:',
        refundError?.message ||
          'Unknown error'
      );

      return res.status(500).json({
        success: false,
        code:
          'INSURANCE_REFUND_PENDING',
        reference:
          payment.reference,
        message:
          'The insurance provider rejected the payment, but the wallet refund requires reconciliation. Please contact support with the transaction reference.',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(
      'Insurance requery error:',
      error?.message ||
        'Unknown error'
    );

    return res.status(502).json({
      success: false,
      code:
        error?.code ||
        'INSURANCE_REQUERY_FAILED',
      message:
        error?.message ||
        'Unable to check the insurance payment status.',
    });
  }
};


// ============================================================
// HELPER
// ============================================================

function bodyValueMissing(value) {
  return (
    value === undefined ||
    value === null ||
    String(value).trim() === ''
  );
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getPlans,
  getMotorOptions,
  getMotorLgas,
  getMotorModels,
  purchase,
  requery,
};
