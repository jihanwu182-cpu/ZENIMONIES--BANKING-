
const axios = require('axios');
const crypto = require('crypto');

// ============================================================
// ZENIMONIES — SOGO DATA SERVICE
// ============================================================

const SOGO_API_BASE_URL = (
  process.env.SOGO_API_BASE_URL ||
  'https://sandbox.sogo.africa/v1'
).replace(/\/+$/, '');

const SOGO_API_KEY = process.env.SOGO_API_KEY;

const REQUEST_TIMEOUT_MS = 30000;
const CACHE_DURATION_MS = 10 * 60 * 1000;

const variationCache = new Map();

const NETWORKS = {
  mtn: 'mtn',
  airtel: 'airtel',
  glo: 'glo',
  '9mobile': 't2mobile',
  etisalat: 't2mobile',
  t2mobile: 't2mobile',
  smile: 'smile',
};

// ============================================================
// ERRORS
// ============================================================

const createError = (message, code, status, response = null) => {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.response = response;
  return error;
};

// ============================================================
// CONFIGURATION
// ============================================================

const validateConfig = () => {
  if (!SOGO_API_KEY) {
    throw createError(
      'Sogo API key is not configured.',
      'SOGO_CONFIGURATION_ERROR',
      500
    );
  }

  if (
    SOGO_API_BASE_URL.includes('sandbox.sogo.africa') &&
    !SOGO_API_KEY.startsWith('sogo_sk_test_')
  ) {
    throw createError(
      'Sogo Sandbox URL requires a Sandbox secret key.',
      'SOGO_ENVIRONMENT_MISMATCH',
      500
    );
  }

  if (
    SOGO_API_BASE_URL.includes('api.sogo.africa') &&
    !SOGO_API_KEY.startsWith('sogo_sk_live_')
  ) {
    throw createError(
      'Sogo Live URL requires a Live secret key.',
      'SOGO_ENVIRONMENT_MISMATCH',
      500
    );
  }
};

// ============================================================
// NETWORK NORMALIZATION
// ============================================================

const normalizeNetwork = (network) => {
  const value = String(network || '')
    .trim()
    .toLowerCase();

  return NETWORKS[value] || null;
};

// ============================================================
// REQUEST ID
// ============================================================

const generateRequestId = () => crypto.randomUUID();

// ============================================================
// HTTP REQUEST
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

  try {
    const response = await axios({
      method,
      url: `${SOGO_API_BASE_URL}${endpoint}`,
      headers,
      data: body || undefined,
      timeout: REQUEST_TIMEOUT_MS,
    });

    return {
      data: response.data,
      statusCode: response.status,
      idempotencyReplayed:
        String(
          response.headers?.['idempotency-replayed'] || ''
        ).toLowerCase() === 'true',
    };
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw createError(
        'Sogo Data request timed out. The transaction must be reconciled.',
        'SOGO_TIMEOUT',
        504
      );
    }

    if (!error.response) {
      throw createError(
        'Unable to reach Sogo. The transaction outcome is unknown.',
        'SOGO_NETWORK_ERROR',
        503
      );
    }

    const responseData = error.response.data || {};

    const message =
      responseData.message ||
      responseData.error ||
      'Sogo request failed.';

    throw createError(
      message,
      responseData.code || 'SOGO_HTTP_ERROR',
      error.response.status,
      responseData
    );
  }
};

// ============================================================
// PLAN RESPONSE NORMALIZATION
// ============================================================

const extractPlans = (responseData) => {
  const data = responseData?.data;

  const plans =
    Array.isArray(data) ? data :
    Array.isArray(data?.plans) ? data.plans :
    Array.isArray(data?.variations) ? data.variations :
    Array.isArray(data?.data) ? data.data :
    Array.isArray(responseData?.plans) ? responseData.plans :
    Array.isArray(responseData?.variations)
      ? responseData.variations
      : [];

  return plans.map((plan) => {
    const amount = Number(
      plan.amount ??
      plan.price ??
      plan.variation_amount ??
      plan.cost
    );

    return {
      variation_code: String(
        plan.variation_code ??
        plan.variationCode ??
        plan.code ??
        ''
      ),

      name:
        plan.name ||
        plan.plan_name ||
        plan.description ||
        'Data bundle',

      amount,

      network: plan.network || null,

      validity:
        plan.validity ||
        plan.validity_period ||
        null,

      allowance:
        plan.allowance ||
        plan.bundle ||
        plan.data_size ||
        null,

      raw: plan,
    };
  }).filter((plan) => {
    return (
      plan.variation_code &&
      Number.isFinite(plan.amount) &&
      plan.amount > 0
    );
  });
};

// ============================================================
// GET DATA PLANS
// GET /v1/bills/data-plans?network=mtn
// ============================================================

const getDataPlans = async (
  network,
  { forceRefresh = false } = {}
) => {
  const normalizedNetwork = normalizeNetwork(network);

  if (!normalizedNetwork) {
    throw createError(
      'Unsupported mobile network.',
      'UNSUPPORTED_NETWORK',
      400
    );
  }

  const cached = variationCache.get(normalizedNetwork);

  if (
    cached &&
    !forceRefresh &&
    Date.now() - cached.timestamp < CACHE_DURATION_MS
  ) {
    return cached.data;
  }

  const result = await sogoRequest({
    endpoint:
      `/bills/data-plans?network=${encodeURIComponent(
        normalizedNetwork
      )}`,
    method: 'GET',
  });

  const plans = extractPlans(result.data);

  if (plans.length === 0) {
    throw createError(
      'Sogo returned no valid data plans for this network.',
      'SOGO_EMPTY_DATA_CATALOGUE',
      502,
      result.data
    );
  }

  const response = {
    network: normalizedNetwork,
    serviceID: normalizedNetwork,
    plans,
  };

  variationCache.set(normalizedNetwork, {
    timestamp: Date.now(),
    data: response,
  });

  return response;
};

// ============================================================
// PURCHASE DATA PLAN
// POST /v1/bills/data
// ============================================================

const purchaseDataPlan = async ({
  network,
  phone,
  variationCode,
  amount,
  idempotencyKey,
}) => {
  const normalizedNetwork = normalizeNetwork(network);

  if (!normalizedNetwork) {
    throw createError(
      'Unsupported mobile network.',
      'UNSUPPORTED_NETWORK',
      400
    );
  }

  const cleanPhone = String(phone || '')
    .replace(/\s+/g, '')
    .trim();

  if (!/^0\d{10}$/.test(cleanPhone)) {
    throw createError(
      'A valid Nigerian phone number is required.',
      'INVALID_PHONE_NUMBER',
      400
    );
  }

  if (!variationCode) {
    throw createError(
      'Data plan variation code is required.',
      'VARIATION_CODE_REQUIRED',
      400
    );
  }

  if (!idempotencyKey) {
    throw createError(
      'A saved transaction idempotency key is required.',
      'IDEMPOTENCY_KEY_REQUIRED',
      400
    );
  }

  if (!crypto.validateUUID) {
    // UUID format is checked below without relying on
    // non-standard crypto methods.
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(String(idempotencyKey))) {
      throw createError(
        'Invalid transaction idempotency key.',
        'INVALID_IDEMPOTENCY_KEY',
        400
      );
    }
  }

  const result = await sogoRequest({
    endpoint: '/bills/data',
    method: 'POST',
    idempotencyKey: String(idempotencyKey),
    body: {
      network: normalizedNetwork,
      phone: cleanPhone,
      variation_code: String(variationCode),
    },
  });

  const transaction =
    result.data?.data ||
    result.data?.transaction ||
    result.data;

  return {
    requestId: String(idempotencyKey),
    network: normalizedNetwork,
    phone: cleanPhone,
    variationCode: String(variationCode),
    amount: Number(amount),
    response: result.data,
    transaction,
    idempotencyReplayed: result.idempotencyReplayed,
  };
};

// ============================================================
// REQUERY TRANSACTION
// ============================================================

const requeryTransaction = async (requestId) => {
  if (!requestId) {
    throw createError(
      'Sogo idempotency key is required.',
      'REQUEST_ID_REQUIRED',
      400
    );
  }

  // Sandbox transactions are not persisted for lookup.
  if (SOGO_API_BASE_URL.includes('sandbox.sogo.africa')) {
    throw createError(
      'Sogo Sandbox does not support transaction lookup. Use the purchase response and webhook.',
      'SOGO_SANDBOX_REQUERY_UNAVAILABLE',
      501
    );
  }

  const result = await sogoRequest({
    endpoint:
      `/transactions/${encodeURIComponent(
        requestId
      )}?type=bill_payment`,
    method: 'GET',
  });

  return result.data;
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  normalizeNetwork,
  generateRequestId,
  getDataPlans,
  purchaseDataPlan,
  requeryTransaction,
};
