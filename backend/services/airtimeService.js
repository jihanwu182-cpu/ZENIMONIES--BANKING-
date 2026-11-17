
const crypto = require('crypto');

// ============================================================
// ZENIMONIES — SOGO AIRTIME SERVICE
// ============================================================

const SOGO_API_BASE_URL = (
  process.env.SOGO_API_BASE_URL ||
  'https://sandbox.sogo.africa/v1'
).replace(/\/+$/, '');

const SOGO_API_KEY = process.env.SOGO_API_KEY;

const REQUEST_TIMEOUT = 60000;

// ============================================================
// NETWORK SLUGS — SOGO
// ============================================================

const AIRTIME_NETWORKS = {
  MTN: 'mtn',
  Airtel: 'airtel',
  Glo: 'glo',
  '9mobile': 't2mobile',
};

// ============================================================
// ENVIRONMENT
// ============================================================

const isSandbox = () => {
  return (
    SOGO_API_BASE_URL.includes('sandbox.sogo.africa') ||
    SOGO_API_KEY?.startsWith('sogo_sk_test_')
  );
};

// ============================================================
// CONFIGURATION VALIDATION
// ============================================================

const validateConfig = () => {
  if (!SOGO_API_KEY) {
    const error = new Error(
      'SOGO_API_KEY is not configured.'
    );
    error.code = 'SOGO_CONFIG_ERROR';
    throw error;
  }

  if (!SOGO_API_KEY.startsWith('sogo_sk_')) {
    const error = new Error(
      'A Sogo secret API key is required.'
    );
    error.code = 'SOGO_INVALID_API_KEY';
    throw error;
  }

  if (
    isSandbox() &&
    !SOGO_API_KEY.startsWith('sogo_sk_test_')
  ) {
    const error = new Error(
      'Sogo Sandbox URL requires a Sandbox secret key.'
    );
    error.code = 'SOGO_ENVIRONMENT_MISMATCH';
    throw error;
  }

  if (
    !isSandbox() &&
    SOGO_API_BASE_URL.includes('api.sogo.africa') &&
    !SOGO_API_KEY.startsWith('sogo_sk_live_')
  ) {
    const error = new Error(
      'Sogo Live URL requires a Live secret key.'
    );
    error.code = 'SOGO_ENVIRONMENT_MISMATCH';
    throw error;
  }
};

// ============================================================
// NORMALIZE NETWORK
// ============================================================

const normalizeNetwork = (network) => {
  const value = String(network || '')
    .trim()
    .toLowerCase();

  if (value === 'mtn') return 'MTN';
  if (value === 'airtel') return 'Airtel';
  if (value === 'glo') return 'Glo';

  if (
    value === '9mobile' ||
    value === 'etisalat' ||
    value === 't2' ||
    value === 't2mobile'
  ) {
    return '9mobile';
  }

  return null;
};

// ============================================================
// GET SOGO NETWORK SLUG
// ============================================================

const getAirtimeServiceId = (network) => {
  const normalizedNetwork = normalizeNetwork(network);

  if (!normalizedNetwork) {
    const error = new Error(
      'Unsupported Sogo airtime network.'
    );
    error.code = 'UNSUPPORTED_NETWORK';
    throw error;
  }

  return {
    network: normalizedNetwork,
    serviceID: AIRTIME_NETWORKS[normalizedNetwork],
  };
};

// ============================================================
// GENERATE SOGO IDEMPOTENCY KEY
//
// Sogo recommends UUID v4.
// This key must be stored before the purchase request.
// ============================================================

const generateRequestId = () => {
  return crypto.randomUUID();
};

// ============================================================
// NORMALIZE SOGO RESPONSE
// ============================================================

const normalizeSogoResponse = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const transaction =
    data.transaction ||
    data.data?.transaction ||
    data.data ||
    data;

  return {
    ...data,

    status:
      transaction?.status ||
      data?.status ||
      null,

    reference:
      transaction?.reference ||
      data?.reference ||
      null,

    transaction,
  };
};

// ============================================================
// SOGO HTTP REQUEST
// ============================================================

const sogoRequest = async ({
  endpoint,
  method = 'GET',
  body = null,
  idempotencyKey = null,
}) => {
  validateConfig();

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SOGO_API_KEY}`,
  };

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT);

  try {
    console.log('SOGO AIRTIME REQUEST', {
      environment: isSandbox() ? 'SANDBOX' : 'LIVE',
      endpoint,
      method,
      hasIdempotencyKey: Boolean(idempotencyKey),
    });

    const response = await fetch(
      `${SOGO_API_BASE_URL}${endpoint}`,
      {
        method,
        headers,
        body:
          body !== null
            ? JSON.stringify(body)
            : undefined,
        signal: controller.signal,
      }
    );

    const responseText = await response.text();

    let data;

    try {
      data = responseText
        ? JSON.parse(responseText)
        : null;
    } catch {
      data = {
        raw: responseText,
      };
    }

    if (!response.ok) {
      const providerError =
        data?.error || data;

      const error = new Error(
        providerError?.message ||
        `Sogo request failed with HTTP ${response.status}.`
      );

      error.code =
        providerError?.code ||
        'SOGO_HTTP_ERROR';

      error.status = response.status;
      error.response = data;

      throw error;
    }

    return {
      data: normalizeSogoResponse(data),
      headers: {
        idempotencyReplayed:
          response.headers.get('idempotency-replayed') === 'true',
      },
    };

  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error(
        'Sogo Airtime request timed out. Transaction outcome must be reconciled.'
      );

      timeoutError.code = 'SOGO_TIMEOUT';
      throw timeoutError;
    }

    console.error('SOGO AIRTIME REQUEST ERROR:', {
      code: error?.code || 'UNKNOWN',
      status: error?.status || null,
      message: error?.message || 'Unknown Sogo error',
    });

    throw error;

  } finally {
    clearTimeout(timeout);
  }
};

// ============================================================
// PURCHASE AIRTIME
//
// POST /v1/bills/airtime
//
// Sogo requires:
// network
// phone
// amount
// Idempotency-Key header
// ============================================================

const purchaseAirtime = async ({
  network,
  phone,
  amount,
  requestId,
}) => {
  const {
    network: normalizedNetwork,
    serviceID,
  } = getAirtimeServiceId(network);

  const finalRequestId =
    requestId || generateRequestId();

  const cleanPhone = String(phone || '')
    .replace(/\s+/g, '')
    .trim();

  const numericAmount = Number(amount);

  if (!cleanPhone) {
    const error = new Error(
      'Airtime phone number is required.'
    );
    error.code = 'INVALID_PHONE';
    throw error;
  }

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    const error = new Error(
      'A valid airtime amount is required.'
    );
    error.code = 'INVALID_AMOUNT';
    throw error;
  }

  if (
    numericAmount < 50 ||
    numericAmount > 50000
  ) {
    const error = new Error(
      'Sogo airtime amount must be between ₦50 and ₦50,000.'
    );
    error.code = 'INVALID_AMOUNT';
    throw error;
  }

  const result = await sogoRequest({
    endpoint: '/bills/airtime',
    method: 'POST',

    idempotencyKey: finalRequestId,

    body: {
      network: serviceID,
      phone: cleanPhone,
      amount: numericAmount,
    },
  });

  return {
    response: result.data,

    requestId: finalRequestId,

    network: normalizedNetwork,

    serviceID,

    idempotencyReplayed:
      result.headers.idempotencyReplayed,
  };
};

// ============================================================
// REQUERY AIRTIME TRANSACTION
//
// LIVE:
// GET /v1/transactions/{idempotency-key}?type=bill_payment
//
// SANDBOX:
// Sogo does not persist Sandbox transactions.
// Resolve them using the registered Sandbox webhook
// and the original purchase response.
// ============================================================

const requeryAirtimeTransaction = async ({
  requestId,
}) => {
  validateConfig();

  if (!requestId) {
    const error = new Error(
      'Sogo idempotency key is required for requery.'
    );
    error.code = 'INVALID_REQUEST_ID';
    throw error;
  }

  if (isSandbox()) {
    const error = new Error(
      'Sogo Sandbox transactions cannot be retrieved through the transaction lookup endpoint. Use the Sandbox webhook and original purchase response.'
    );

    error.code = 'SOGO_SANDBOX_REQUERY_UNAVAILABLE';

    throw error;
  }

  const encodedRequestId =
    encodeURIComponent(requestId);

  const result = await sogoRequest({
    endpoint:
      `/transactions/${encodedRequestId}?type=bill_payment`,

    method: 'GET',
  });

  return {
    response: result.data,
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
