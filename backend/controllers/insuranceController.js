// ============================================================
// ZENIMONIES BANKING
// INSURANCE CONTROLLER
// ============================================================

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
// GET INSURANCE PLANS
// GET /api/insurance/plans
// ============================================================

const getPlans = async (req, res) => {
  try {
    const serviceID =
      req.query.serviceID ||
      INSURANCE_SERVICE_IDS.MOTOR;

    if (
      !Object.values(
        INSURANCE_SERVICE_IDS
      ).includes(serviceID)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported insurance service.',
      });
    }

    const result =
      await getInsurancePlans(serviceID);

    return res.status(200).json({
      success: true,
      message:
        'Insurance plans loaded successfully.',
      plans:
        result?.content?.variations || [],
      data:
        result?.content?.variations || [],
    });
  } catch (error) {
    console.error(
      'Insurance plans error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Unable to load insurance plans.',
    });
  }
};

// ============================================================
// GET MOTOR INSURANCE OPTIONS
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
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Unable to load motor insurance options.',
    });
  }
};

// ============================================================
// GET MOTOR INSURANCE LGAs
// GET /api/insurance/motor/lga/:stateCode
// ============================================================

const getMotorLgas = async (
  req,
  res
) => {
  try {
    const { stateCode } = req.params;

    if (!stateCode) {
      return res.status(400).json({
        success: false,
        message: 'State code is required.',
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
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Unable to load LGAs.',
    });
  }
};

// ============================================================
// GET MOTOR INSURANCE MODELS
// GET /api/insurance/motor/models/:vehicleMakeCode
// ============================================================

const getMotorModels = async (
  req,
  res
) => {
  try {
    const {
      vehicleMakeCode,
    } = req.params;

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
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Unable to load vehicle models.',
    });
  }
};

// ============================================================
// PURCHASE INSURANCE
// POST /api/insurance
//
// Transaction PIN middleware should run before this
// controller.
// ============================================================

const purchase = async (
  req,
  res
) => {
  try {
    const body = req.body || {};

    const {
      serviceID,
      variation_code,
      transaction_pin,
    } = body;

    if (!serviceID) {
      return res.status(400).json({
        success: false,
        message:
          'Insurance service ID is required.',
      });
    }

    if (
      !Object.values(
        INSURANCE_SERVICE_IDS
      ).includes(serviceID)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Unsupported insurance service.',
      });
    }

    if (!variation_code) {
      return res.status(400).json({
        success: false,
        message:
          'Insurance plan is required.',
      });
    }

    /*
     * transaction_pin is normally validated by
     * transactionPinMiddleware.
     *
     * We keep this fallback validation here as an
     * additional protection.
     */
    if (
      !transaction_pin &&
      !req.transactionPinVerified
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Transaction PIN is required.',
      });
    }

    // --------------------------------------------------------
    // MOTOR INSURANCE VALIDATION
    // --------------------------------------------------------

    if (
      serviceID ===
      INSURANCE_SERVICE_IDS.MOTOR
    ) {
      const requiredMotorFields = [
        ['billersCode', 'Vehicle plate number'],
        ['phone', 'Phone number'],
        ['Insured_Name', 'Insured name'],
        ['email', 'Email address'],
        [
          'engine_capacity',
          'Engine capacity',
        ],
        [
          'Chasis_Number',
          'Chassis number',
        ],
        ['Plate_Number', 'Plate number'],
        ['vehicle_make', 'Vehicle make'],
        [
          'vehicle_color',
          'Vehicle colour',
        ],
        [
          'vehicle_model',
          'Vehicle model',
        ],
        ['YearofMake', 'Year of make'],
        ['state', 'State'],
        ['lga', 'LGA'],
      ];

      for (const [
        field,
        label,
      ] of requiredMotorFields) {
        if (
          body[field] === undefined ||
          body[field] === null ||
          String(body[field]).trim() === ''
        ) {
          return res.status(400).json({
            success: false,
            message: `${label} is required.`,
          });
        }
      }
    }

    // --------------------------------------------------------
    // PERSONAL ACCIDENT VALIDATION
    // --------------------------------------------------------

    if (
      serviceID ===
      INSURANCE_SERVICE_IDS.PERSONAL_ACCIDENT
    ) {
      const requiredPersonalFields = [
        ['billersCode', 'Full name'],
        ['phone', 'Phone number'],
        ['full_name', 'Full name'],
        ['address', 'Address'],
        ['dob', 'Date of birth'],
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

      for (const [
        field,
        label,
      ] of requiredPersonalFields) {
        if (
          body[field] === undefined ||
          body[field] === null ||
          String(body[field]).trim() === ''
        ) {
          return res.status(400).json({
            success: false,
            message: `${label} is required.`,
          });
        }
      }
    }

    // --------------------------------------------------------
    // REMOVE INTERNAL FIELDS BEFORE VTpass
    // --------------------------------------------------------

    const vtpassPayload = {
      ...body,
    };

    delete vtpassPayload.transaction_pin;

    // --------------------------------------------------------
    // CALL VTpass
    // --------------------------------------------------------

    const result =
      await purchaseInsurance(
        vtpassPayload
      );

    // --------------------------------------------------------
    // PROVIDER SUCCESS
    // --------------------------------------------------------

    if (
      result.status === 'successful'
    ) {
      return res.status(200).json({
        success: true,
        status: 'successful',
        message:
          'Insurance purchase completed successfully.',
        request_id:
          result.requestId,
        transaction_id:
          result.transactionId,
        purchased_code:
          result.purchasedCode,
        certificate_url:
          result.certificateUrl,
        data: result.content,
      });
    }

    // --------------------------------------------------------
    // PROVIDER PENDING
    // --------------------------------------------------------

    if (
      result.status === 'pending'
    ) {
      return res.status(200).json({
        success: true,
        status: 'pending',
        message:
          'Insurance purchase is pending confirmation.',
        request_id:
          result.requestId,
        transaction_id:
          result.transactionId,
        data: result.content,
      });
    }

    // --------------------------------------------------------
    // PROVIDER FAILURE
    // --------------------------------------------------------

    return res.status(400).json({
      success: false,
      status: 'failed',
      message:
        result.responseDescription ||
        'Insurance purchase failed.',
      request_id:
        result.requestId,
      data: result.content,
    });
  } catch (error) {
    console.error(
      'Insurance purchase error:',
      error
    );

    return res.status(500).json({
      success: false,
      status: 'failed',
      message:
        error.message ||
        'Unable to process insurance purchase.',
    });
  }
};

// ============================================================
// REQUERY
// POST /api/insurance/requery
// ============================================================

const requery = async (
  req,
  res
) => {
  try {
    const requestId =
      req.body?.request_id ||
      req.body?.requestId;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message:
          'Request ID is required.',
      });
    }

    const result =
      await requeryInsurance(
        requestId
      );

    return res.status(200).json({
      success: true,
      status: result.status,
      message:
        result.responseDescription ||
        'Insurance transaction status retrieved.',
      request_id:
        result.requestId,
      transaction_id:
        result.transactionId,
      purchased_code:
        result.purchasedCode,
      certificate_url:
        result.certificateUrl,
      data: result.content,
    });
  } catch (error) {
    console.error(
      'Insurance requery error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Unable to requery insurance transaction.',
    });
  }
};

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
