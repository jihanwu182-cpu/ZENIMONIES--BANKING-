const {
  generateRequestId,
} = require('./vtpassService');


// ============================================================
// ZENIMONIES BANKING
// EDUCATION PAYMENT SERVICE
// VTpass
// ============================================================

const VTPASS_BASE_URL =
  process.env.VTPASS_BASE_URL ||
  'https://sandbox.vtpass.com';

const VTPASS_API_KEY =
  process.env.VTPASS_API_KEY;

const VTPASS_PUBLIC_KEY =
  process.env.VTPASS_PUBLIC_KEY;

const VTPASS_SECRET_KEY =
  process.env.VTPASS_SECRET_KEY;


// ============================================================
// VTpass EDUCATION SERVICE IDs
// ============================================================

const EDUCATION_SERVICE_IDS = {
  WAEC_REGISTRATION:
    'waec-registration',

  WAEC_RESULT:
    'waec',

  JAMB:
    'jamb',
};


// ============================================================
// CONFIGURATION
// ============================================================

const validateConfig = () => {
  const missing = [];

  if (!VTPASS_API_KEY) {
    missing.push('VTPASS_API_KEY');
  }

  if (!VTPASS_PUBLIC_KEY) {
    missing.push('VTPASS_PUBLIC_KEY');
  }

  if (!VTPASS_SECRET_KEY) {
    missing.push('VTPASS_SECRET_KEY');
  }

  if (missing.length > 0) {
    const error = new Error(
      `Missing VTpass environment variables: ${missing.join(', ')}`
    );

    error.code =
      'VTPASS_CONFIGURATION_ERROR';

    throw error;
  }
};


// ============================================================
// NORMALIZE EDUCATION SERVICE
// ============================================================

const normalizeEducationService = (
  service
) => {
  if (!service) {
    return null;
  }

  const value =
    String(service)
      .trim()
      .toLowerCase();

  const serviceMap = {
    'waec-registration':
      EDUCATION_SERVICE_IDS.WAEC_REGISTRATION,

    'waec_registration':
      EDUCATION_SERVICE_IDS.WAEC_REGISTRATION,

    'waec':
      EDUCATION_SERVICE_IDS.WAEC_RESULT,

    'waec-result':
      EDUCATION_SERVICE_IDS.WAEC_RESULT,

    'waec_result':
      EDUCATION_SERVICE_IDS.WAEC_RESULT,

    'jamb':
      EDUCATION_SERVICE_IDS.JAMB,
  };

  return serviceMap[value] || null;
};


// ============================================================
// GET EDUCATION SERVICE ID
// ============================================================

const getEducationServiceId = (
  service
) => {
  const serviceId =
    normalizeEducationService(
      service
    );

  if (!serviceId) {
    const error = new Error(
      'Unsupported education service.'
    );

    error.code =
      'UNSUPPORTED_EDUCATION_SERVICE';

    throw error;
  }

  return serviceId;
};


// ============================================================
// VTpass HTTP REQUEST
// ============================================================

const vtpassRequest = async ({
  endpoint,
  method = 'GET',
  body = null,
}) => {
  validateConfig();

  const headers = {
    Accept:
      'application/json',

    'Content-Type':
      'application/json',
  };


  // ----------------------------------------------------------
  // GET
  // ----------------------------------------------------------

  if (method === 'GET') {
    headers['api-key'] =
      VTPASS_API_KEY;

    headers['public-key'] =
      VTPASS_PUBLIC_KEY;
  }


  // ----------------------------------------------------------
  // POST
  // ----------------------------------------------------------

  if (method === 'POST') {
    headers['api-key'] =
      VTPASS_API_KEY;

    headers['secret-key'] =
      VTPASS_SECRET_KEY;
  }


  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      30000
    );


  try {
    const response =
      await fetch(
        `${VTPASS_BASE_URL}${endpoint}`,
        {
          method,

          headers,

          body:
            body !== null
              ? JSON.stringify(body)
              : undefined,

          signal:
            controller.signal,
        }
      );


    const text =
      await response.text();

    let data;


    try {
      data =
        text
          ? JSON.parse(text)
          : null;
    } catch {
      data = {
        raw: text,
      };
    }


    if (!response.ok) {
      const error =
        new Error(
          data?.response_description ||
            data?.message ||
            `VTpass request failed with status ${response.status}.`
        );

      error.code =
        'VTPASS_HTTP_ERROR';

      error.status =
        response.status;

      error.response =
        data;

      throw error;
    }


    return data;

  } catch (error) {

    if (
      error?.name ===
      'AbortError'
    ) {
      const timeoutError =
        new Error(
          'VTpass request timed out.'
        );

      timeoutError.code =
        'VTPASS_TIMEOUT';

      throw timeoutError;
    }

    throw error;

  } finally {
    clearTimeout(timeout);
  }
};


// ============================================================
// GET EDUCATION VARIATIONS
//
// Used for services that have selectable products/options.
//
// Example:
//
// GET /api/education/variations?service=waec-registration
// ============================================================

const getEducationVariations =
  async (service) => {

    const serviceId =
      getEducationServiceId(
        service
      );


    const result =
      await vtpassRequest({
        endpoint:
          `/api/service-variations?serviceID=${encodeURIComponent(
            serviceId
          )}`,

        method:
          'GET',
      });


    const variations =
      result?.content?.variations ||
      result?.content?.varations ||
      [];


    return {
      serviceID:
        serviceId,

      variations,

      responseDescription:
        result?.response_description ||
        null,

      raw:
        result,
    };
  };


// ============================================================
// VERIFY JAMB PROFILE
//
// VTpass requires JAMB profile verification before vending
// a JAMB PIN.
//
// We keep this separate from the actual purchase.
// ============================================================

const verifyJambProfile =
  async ({
    profileId,
    service = 'jamb',
  }) => {

    const serviceId =
      getEducationServiceId(
        service
      );


    if (
      serviceId !==
      EDUCATION_SERVICE_IDS.JAMB
    ) {
      const error = new Error(
        'JAMB profile verification is only available for JAMB.'
      );

      error.code =
        'INVALID_JAMB_SERVICE';

      throw error;
    }


    const cleanProfileId =
      String(
        profileId || ''
      )
        .trim();


    if (!cleanProfileId) {
      const error = new Error(
        'JAMB Profile ID is required.'
      );

      error.code =
        'JAMB_PROFILE_ID_REQUIRED';

      throw error;
    }


    const requestId =
      generateRequestId();


    const result =
      await vtpassRequest({
        endpoint:
          '/api/merchant-verify',

        method:
          'POST',

        body: {
          request_id:
            requestId,

          serviceID:
            serviceId,

          billersCode:
            cleanProfileId,

          type:
            'jamb',
        },
      });


    return {
      requestId,

      serviceID:
        serviceId,

      profileId:
        cleanProfileId,

      response:
        result,
    };
  };


// ============================================================
// PURCHASE EDUCATION PRODUCT
//
// This is the common purchase method for:
// - WAEC Registration
// - WAEC Result Checker
// - JAMB PIN
//
// The controller will decide what fields are required for
// each product.
// ============================================================

const purchaseEducation =
  async ({
    service,
    billersCode,
    variationCode = null,
    amount,
    phone,
    additionalFields = {},
  }) => {

    const serviceId =
      getEducationServiceId(
        service
      );


    const cleanBillersCode =
      String(
        billersCode || ''
      )
        .trim();


    if (!cleanBillersCode) {
      const error = new Error(
        'Education customer reference is required.'
      );

      error.code =
        'EDUCATION_BILLERS_CODE_REQUIRED';

      throw error;
    }


    const numericAmount =
      Number(amount);


    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      const error = new Error(
        'A valid education payment amount is required.'
      );

      error.code =
        'INVALID_EDUCATION_AMOUNT';

      throw error;
    }


    const cleanPhone =
      phone
        ? String(phone)
            .replace(/\s+/g, '')
            .trim()
        : null;


    if (
      cleanPhone &&
      !/^0\d{10}$/.test(
        cleanPhone
      )
    ) {
      const error = new Error(
        'A valid Nigerian phone number is required.'
      );

      error.code =
        'INVALID_PHONE_NUMBER';

      throw error;
    }


    const requestId =
      generateRequestId();


    const payload = {
      request_id:
        requestId,

      serviceID:
        serviceId,

      billersCode:
        cleanBillersCode,

      amount:
        numericAmount,
    };


    // --------------------------------------------------------
    // VARIATION CODE
    // --------------------------------------------------------

    if (variationCode) {
      payload.variation_code =
        String(
          variationCode
        );
    }


    // --------------------------------------------------------
    // PHONE
    // --------------------------------------------------------

    if (cleanPhone) {
      payload.phone =
        cleanPhone;
    }


    // --------------------------------------------------------
    // ADDITIONAL PROVIDER FIELDS
    //
    // These are deliberately added only when supplied.
    // This keeps the service flexible for VTpass products
    // that require extra fields.
    // --------------------------------------------------------

    if (
      additionalFields &&
      typeof additionalFields ===
        'object'
    ) {
      Object.assign(
        payload,
        additionalFields
      );
    }


    const result =
      await vtpassRequest({
        endpoint:
          '/api/pay',

        method:
          'POST',

        body:
          payload,
      });


    return {
      requestId,

      serviceID:
        serviceId,

      billersCode:
        cleanBillersCode,

      variationCode:
        variationCode
          ? String(
              variationCode
            )
          : null,

      amount:
        numericAmount,

      phone:
        cleanPhone,

      response:
        result,
    };
  };


// ============================================================
// REQUERY EDUCATION TRANSACTION
//
// Used when VTpass returns pending/unclear status.
// ============================================================

const requeryEducationTransaction =
  async (requestId) => {

    if (!requestId) {
      const error = new Error(
        'VTpass request ID is required.'
      );

      error.code =
        'REQUEST_ID_REQUIRED';

      throw error;
    }


    return vtpassRequest({
      endpoint:
        '/api/requery',

      method:
        'POST',

      body: {
        request_id:
          String(
            requestId
          ),
      },
    });
  };


// ============================================================
// GET PROVIDER STATUS
// ============================================================

const getEducationProviderStatus =
  (providerResponse) => {

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


    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    if (
      code === '000' &&
      [
        'delivered',
        'completed',
        'successful',
      ].includes(
        transactionStatus
      )
    ) {
      return 'completed';
    }


    // --------------------------------------------------------
    // PENDING
    // --------------------------------------------------------

    if (
      code === '099' ||
      [
        'pending',
        'initiated',
        'processing',
      ].includes(
        transactionStatus
      )
    ) {
      return 'pending';
    }


    // --------------------------------------------------------
    // FAILED
    // --------------------------------------------------------

    return 'failed';
  };


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  EDUCATION_SERVICE_IDS,

  normalizeEducationService,

  getEducationServiceId,

  getEducationVariations,

  verifyJambProfile,

  purchaseEducation,

  requeryEducationTransaction,

  getEducationProviderStatus,
};
