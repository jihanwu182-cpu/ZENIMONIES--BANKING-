const VTPASS_BASE_URL =
  process.env.VTPASS_BASE_URL || 'https://sandbox.vtpass.com';

const VTPASS_API_KEY =
  process.env.VTPASS_API_KEY;

const VTPASS_PUBLIC_KEY =
  process.env.VTPASS_PUBLIC_KEY;

const VTPASS_SECRET_KEY =
  process.env.VTPASS_SECRET_KEY;


// ============================================================
// VTpass DATA SERVICE IDs
// ============================================================

const DATA_SERVICE_IDS = {
  MTN: 'mtn-data',
  Airtel: 'airtel-data',
  Glo: 'glo-data',
  '9mobile': 'etisalat-data',
};


// ============================================================
// PLAN CACHE
// ============================================================

const variationCache = new Map();

const CACHE_DURATION_MS =
  10 * 60 * 1000;


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
// GET SERVICE ID
// ============================================================

const getDataServiceId = (network) => {
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

  return DATA_SERVICE_IDS[
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
    Math.random()
      .toString(36)
      .substring(2, 14);

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
  // API Key + Public Key
  // ----------------------------------------------------------

  if (method === 'GET') {
    headers['api-key'] =
      VTPASS_API_KEY;

    headers['public-key'] =
      VTPASS_PUBLIC_KEY;
  }


  // ----------------------------------------------------------
  // POST
  // API Key + Secret Key
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
// GET DATA PLANS
// ============================================================

const getDataPlans = async (
  network,
  {
    forceRefresh = false,
  } = {}
) => {
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
    getDataServiceId(
      normalizedNetwork
    );


  const cached =
    variationCache.get(
      normalizedNetwork
    );


  const cacheIsValid =
    cached &&
    Date.now() -
      cached.timestamp <
      CACHE_DURATION_MS;


  if (
    cacheIsValid &&
    !forceRefresh
  ) {
    return cached.data;
  }


  const result =
    await vtpassRequest({
      endpoint:
        `/api/service-variations?serviceID=${encodeURIComponent(
          serviceId
        )}`,

      method: 'GET',
    });

const variations =
  result?.content?.variations ||
  result?.content?.varations ||
  [];


// ============================================================
// TEMPORARY VTpass CATALOGUE DIAGNOSTIC
// ============================================================

console.log(
  `VTpass ${normalizedNetwork} returned ${variations.length} variations.`
);

console.log(
  `VTpass ${normalizedNetwork} catalogue:`,
  variations.map((variation) => ({
    code:
      variation?.variation_code,

    name:
      variation?.name,

    amount:
      variation?.variation_amount,
  }))
);
  

  const plans =
    variations.map(
      (variation) => ({
        variation_code:
          variation.variation_code,

        name:
          variation.name,

        amount:
          Number(
            variation.variation_amount
          ),

        fixedPrice:
          variation.fixedPrice,

        serviceID:
          serviceId,

        network:
          normalizedNetwork,
      })
    );


  const response = {
    network:
      normalizedNetwork,

    serviceID:
      serviceId,

    plans,

    responseDescription:
      result?.response_description ||
      null,
  };


  variationCache.set(
    normalizedNetwork,
    {
      timestamp:
        Date.now(),

      data:
        response,
    }
  );


  return response;
};


// ============================================================
// PURCHASE DATA PLAN
// ============================================================

const purchaseDataPlan = async ({
  network,
  phone,
  variationCode,
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
    getDataServiceId(
      normalizedNetwork
    );


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


  if (!variationCode) {
    const error = new Error(
      'Data plan variation code is required.'
    );

    error.code =
      'VARIATION_CODE_REQUIRED';

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
      'A valid data plan amount is required.'
    );

    error.code =
      'INVALID_AMOUNT';

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
      cleanPhone,

    variation_code:
      String(variationCode),

    amount:
      numericAmount,

    phone:
      cleanPhone,
  };


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

    network:
      normalizedNetwork,

    serviceID:
      serviceId,

    phone:
      cleanPhone,

    variationCode:
      String(variationCode),

    amount:
      numericAmount,

    response:
      result,
  };
};


// ============================================================
// REQUERY TRANSACTION
// ============================================================

const requeryTransaction =
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
  getDataServiceId,
  generateRequestId,
  getDataPlans,
  purchaseDataPlan,
  requeryTransaction,
};
