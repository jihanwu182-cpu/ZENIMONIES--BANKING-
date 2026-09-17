const crypto = require('crypto');


// ============================================================
// VTpass CONFIGURATION
// ============================================================

const VTPASS_BASE_URL =
  process.env.VTPASS_BASE_URL || 'https://sandbox.vtpass.com';

const VTPASS_API_KEY =
  process.env.VTPASS_API_KEY;

const VTPASS_PUBLIC_KEY =
  process.env.VTPASS_PUBLIC_KEY;

const VTPASS_SECRET_KEY =
  process.env.VTPASS_SECRET_KEY;


// ============================================================
// VTpass AIRTIME SERVICE IDs
// ============================================================

const AIRTIME_SERVICE_IDS = {
  MTN: 'mtn',
  Airtel: 'airtel',
  Glo: 'glo',
  '9mobile': 'etisalat',
};


// ============================================================
// CONFIGURATION CHECK
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
// NORMALIZE NETWORK
// ============================================================

const normalizeNetwork = (network) => {
  if (!network) {
    return null;
  }

  const value =
    String(network)
      .trim()
      .toLowerCase();

  const networkMap = {
    mtn: 'MTN',
    airtel: 'Airtel',
    glo: 'Glo',
    '9mobile': '9mobile',
    etisalat: '9mobile',
  };

  return networkMap[value] || null;
};


// ============================================================
// GET AIRTIME SERVICE ID
// ============================================================

const getAirtimeServiceId = (network) => {
  const normalizedNetwork =
    normalizeNetwork(network);

  if (!normalizedNetwork) {
    const error = new Error(
      'Unsupported mobile network.'
    );

    error.code =
      'UNSUPPORTED_NETWORK';

    throw error;
  }

  return AIRTIME_SERVICE_IDS[
    normalizedNetwork
  ];
};


// ============================================================
// GENERATE VTpass REQUEST ID
// ============================================================

const generateRequestId = () => {
  const now = new Date();

  const formatter =
    new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone: 'Africa/Lagos',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }
    );

  const parts =
    formatter.formatToParts(now);

  const getPart = (type) =>
    parts.find(
      (part) =>
        part.type === type
    )?.value || '';

  const year =
    getPart('year');

  const month =
    getPart('month');

  const day =
    getPart('day');

  const hour =
    getPart('hour');

  const minute =
    getPart('minute');

  const timestamp =
    `${year}${month}${day}${hour}${minute}`;

  const randomPart =
    crypto
      .randomBytes(6)
      .toString('hex');

  return `${timestamp}${randomPart}`;
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
// PURCHASE AIRTIME
// ============================================================

const purchaseAirtime = async ({
  network,
  phone,
  amount,
}) => {

  const normalizedNetwork =
    normalizeNetwork(network);


  if (!normalizedNetwork) {
    const error = new Error(
      'Unsupported mobile network.'
    );

    error.code =
      'UNSUPPORTED_NETWORK';

    throw error;
  }


  const serviceId =
    getAirtimeServiceId(
      normalizedNetwork
    );


  // ----------------------------------------------------------
  // Clean phone number
  // ----------------------------------------------------------

  const cleanPhone =
    String(phone || '')
      .replace(/\s+/g, '')
      .trim();


  if (
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


  // ----------------------------------------------------------
  // Validate amount
  // ----------------------------------------------------------

  const numericAmount =
    Number(amount);


  if (
    !Number.isFinite(
      numericAmount
    ) ||
    numericAmount <= 0
  ) {
    const error = new Error(
      'A valid airtime amount is required.'
    );

    error.code =
      'INVALID_AMOUNT';

    throw error;
  }


  // ----------------------------------------------------------
  // Generate unique VTpass request ID
  // ----------------------------------------------------------

  const requestId =
    generateRequestId();


  // ----------------------------------------------------------
  // VTpass Airtime payload
  // ----------------------------------------------------------

  const payload = {
    request_id:
      requestId,

    serviceID:
      serviceId,

    amount:
      numericAmount,

    phone:
      cleanPhone,

    billersCode:
      cleanPhone,
  };


  // ----------------------------------------------------------
  // Send purchase request
  // ----------------------------------------------------------

  const result =
    await vtpassRequest({
      endpoint:
        '/api/pay',

      method:
        'POST',

      body:
        payload,
    });


  // ----------------------------------------------------------
  // Return normalized result
  // ----------------------------------------------------------

  return {
    requestId,

    network:
      normalizedNetwork,

    serviceID:
      serviceId,

    phone:
      cleanPhone,

    amount:
      numericAmount,

    response:
      result,
  };
};


// ============================================================
// REQUERY AIRTIME TRANSACTION
// ============================================================

const requeryAirtimeTransaction =
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
          String(requestId),
      },
    });
  };


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  normalizeNetwork,
  getAirtimeServiceId,
  generateRequestId,
  purchaseAirtime,
  requeryAirtimeTransaction,
};
