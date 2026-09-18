// ============================================================
// ZENIMONIES - VTPASS AIRTIME SERVICE
// ============================================================

const crypto = require('crypto');

// ============================================================
// CONFIGURATION
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
// AIRTIME SERVICE IDs
// ============================================================

const AIRTIME_SERVICE_IDS = {
  MTN: 'mtn',
  Airtel: 'airtel',
  Glo: 'glo',
  '9mobile': 'etisalat',
};


// ============================================================
// CONFIG VALIDATION
// ============================================================

const validateConfig = () => {
  if (!VTPASS_API_KEY) {
    const error =
      new Error(
        'VTPASS_API_KEY is not configured.'
      );

    error.code =
      'VTPASS_CONFIG_ERROR';

    throw error;
  }

  if (!VTPASS_PUBLIC_KEY) {
    const error =
      new Error(
        'VTPASS_PUBLIC_KEY is not configured.'
      );

    error.code =
      'VTPASS_CONFIG_ERROR';

    throw error;
  }

  if (!VTPASS_SECRET_KEY) {
    const error =
      new Error(
        'VTPASS_SECRET_KEY is not configured.'
      );

    error.code =
      'VTPASS_CONFIG_ERROR';

    throw error;
  }
};


// ============================================================
// NORMALIZE NETWORK
// ============================================================

const normalizeNetwork = (
  network
) => {
  const value =
    String(network || '')
      .trim()
      .toLowerCase();

  if (value === 'mtn') {
    return 'MTN';
  }

  if (value === 'airtel') {
    return 'Airtel';
  }

  if (value === 'glo') {
    return 'Glo';
  }

  if (
    value === '9mobile' ||
    value === 'etisalat'
  ) {
    return '9mobile';
  }

  return null;
};


// ============================================================
// GET SERVICE ID
// ============================================================

const getAirtimeServiceId = (
  network
) => {
  const normalizedNetwork =
    normalizeNetwork(network);

  if (!normalizedNetwork) {
    const error =
      new Error(
        'Unsupported airtime network.'
      );

    error.code =
      'UNSUPPORTED_NETWORK';

    throw error;
  }

  return {
    network:
      normalizedNetwork,

    serviceID:
      AIRTIME_SERVICE_IDS[
        normalizedNetwork
      ],
  };
};


// ============================================================
// GENERATE VTPASS REQUEST ID
//
// VTpass requires the first 12 characters to contain
// today's date/time in Africa/Lagos format:
// YYYYMMDDHHII
// ============================================================

const generateRequestId = () => {
  const now =
    new Date();

  const lagosParts =
    new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone:
          'Africa/Lagos',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }
    ).formatToParts(now);

  const parts = {};

  for (
    const part of lagosParts
  ) {
    parts[part.type] =
      part.value;
  }

  const datePrefix =
    `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}`;

  const randomPart =
    crypto
      .randomBytes(6)
      .toString('hex')
      .toUpperCase();

  return (
    `${datePrefix}${randomPart}`
  );
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

  if (
    method === 'GET'
  ) {
    headers['api-key'] =
      VTPASS_API_KEY;

    headers['public-key'] =
      VTPASS_PUBLIC_KEY;
  }

  // ----------------------------------------------------------
  // POST
  // ----------------------------------------------------------

  if (
    method === 'POST'
  ) {
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

  // ==========================================================
  // SAFE REQUEST DIAGNOSTIC
  // ==========================================================

  const diagnosticPhone =
    body?.phone
      ? String(body.phone).slice(-4)
      : 'N/A';

  console.log(
    '================================================'
  );

  console.log(
    'VTPASS PROVIDER REQUEST'
  );

  console.log(
    '================================================'
  );

  console.log(
    'Environment:',
    VTPASS_BASE_URL.includes(
      'sandbox'
    )
      ? 'SANDBOX'
      : 'LIVE'
  );

  console.log(
    'Endpoint:',
    endpoint
  );

  console.log(
    'Method:',
    method
  );

  console.log(
    'Service ID:',
    body?.serviceID ||
      'N/A'
  );

  console.log(
    'Amount:',
    body?.amount ||
      'N/A'
  );

  console.log(
    'Request ID:',
    body?.request_id ||
      'N/A'
  );

  console.log(
    'Phone last 4:',
    diagnosticPhone
  );

  console.log(
    '================================================'
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

    // ========================================================
    // SAFE RESPONSE DIAGNOSTIC
    // ========================================================

    console.log(
      'VTPASS PROVIDER RESPONSE CODE:',
      data?.code ||
        data?.response_code ||
        'N/A'
    );

    console.log(
      'VTPASS PROVIDER RESPONSE DESCRIPTION:',
      data?.response_description ||
        data?.message ||
        'N/A'
    );

    console.log(
      'VTPASS PROVIDER TRANSACTION STATUS:',
      data?.content
        ?.transactions
        ?.status ||
        'N/A'
    );

    console.log(
      'VTPASS PROVIDER TRANSACTION ID:',
      data?.content
        ?.transactions
        ?.transactionId ||
        data?.transactionId ||
        'N/A'
    );

    // --------------------------------------------------------
    // HTTP ERROR
    // --------------------------------------------------------

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

    console.error(
      'VTPASS PROVIDER REQUEST ERROR:',
      {
        code:
          error?.code ||
          'UNKNOWN',

        status:
          error?.status ||
          null,

        message:
          error?.message ||
          'Unknown provider error',

        providerCode:
          error?.response?.code ||
          error?.response
            ?.response_code ||
          null,

        providerDescription:
          error?.response
            ?.response_description ||
          error?.response
            ?.message ||
          null,
      }
    );

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

    clearTimeout(
      timeout
    );

  }
};


// ============================================================
// PURCHASE AIRTIME
// ============================================================

const purchaseAirtime = async ({
  network,
  phone,
  amount,
}) => {

  const {
    network:
      normalizedNetwork,
    serviceID,
  } =
    getAirtimeServiceId(
      network
    );

  const requestId =
    generateRequestId();

  const cleanPhone =
    String(phone || '')
      .replace(/\s+/g, '')
      .trim();

  const numericAmount =
    Number(amount);

  if (
    !cleanPhone
  ) {
    const error =
      new Error(
        'Airtime phone number is required.'
      );

    error.code =
      'INVALID_PHONE';

    throw error;
  }

  if (
    !Number.isFinite(
      numericAmount
    ) ||
    numericAmount <= 0
  ) {
    const error =
      new Error(
        'A valid airtime amount is required.'
      );

    error.code =
      'INVALID_AMOUNT';

    throw error;
  }

  // ----------------------------------------------------------
  // VTpass Airtime Purchase
  //
  // Official Airtime API requires:
  // request_id
  // serviceID
  // amount
  // phone
  // ----------------------------------------------------------

  const response =
    await vtpassRequest({
      endpoint:
        '/api/pay',

      method:
        'POST',

      body: {
        request_id:
          requestId,

        serviceID:
          serviceID,

        amount:
          numericAmount,

        phone:
          cleanPhone,
      },
    });

  return {
    response,

    requestId,

    network:
      normalizedNetwork,

    serviceID,
  };
};


// ============================================================
// REQUERY AIRTIME TRANSACTION
// ============================================================

const requeryAirtimeTransaction = async ({
  requestId,
}) => {

  if (
    !requestId
  ) {
    const error =
      new Error(
        'VTpass request ID is required for requery.'
      );

    error.code =
      'INVALID_REQUEST_ID';

    throw error;
  }

  const response =
    await vtpassRequest({
      endpoint:
        '/api/requery',

      method:
        'POST',

      body: {
        request_id:
          requestId,
      },
    });

  return {
    response,

    requestId,
  };
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  purchaseAirtime,
  requeryAirtimeTransaction,
  generateRequestId,
  normalizeNetwork,
  getAirtimeServiceId,
};
