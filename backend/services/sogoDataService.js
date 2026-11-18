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
  't2 mobile': 't2mobile',
  smile: 'smile',
};

// ============================================================
// ERRORS
// ============================================================

const createError = (
  message,
  code,
  status,
  response = null
) => {
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
    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT'
    ) {
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
      typeof message === 'string'
        ? message
        : 'Sogo request failed.',
      responseData.code || 'SOGO_HTTP_ERROR',
      error.response.status,
      responseData
    );
  }
};

// ============================================================
// PLAN HELPERS
// ============================================================

const firstValue = (...values) => {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      return value;
    }
  }

  return null;
};

const normalizeAmount = (plan) => {
  const value = firstValue(
    plan.amount,
    plan.price,
    plan.variation_amount,
    plan.variationAmount,
    plan.cost,
    plan.selling_price,
    plan.sellingPrice,
    plan.amount_ngn,
    plan.price_ngn
  );

  if (value === null) {
    return NaN;
  }

  if (typeof value === 'string') {
    return Number(
      value.replace(/[₦,\s]/g, '')
    );
  }

  return Number(value);
};

const normalizeVariationCode = (plan) => {
  return String(
    firstValue(
      plan.variation_code,
      plan.variationCode,
      plan.variation_id,
      plan.variationId,
      plan.plan_code,
      plan.planCode,
      plan.code,
      plan.product_code,
      plan.productCode,
      plan.id
    ) || ''
  ).trim();
};

const normalizePlanName = (plan) => {
  return String(
    firstValue(
      plan.name,
      plan.plan_name,
      plan.planName,
      plan.bundle_name,
      plan.bundleName,
      plan.product_name,
      plan.productName,
      plan.title,
      plan.description,
      plan.details,
      plan.plan_description,
      plan.planDescription
    ) || 'Data bundle'
  ).trim();
};

const normalizeAllowance = (plan) => {
  return firstValue(
    plan.allowance,
    plan.bundle,
    plan.data_size,
    plan.dataSize,
    plan.volume,
    plan.size,
    plan.data,
    plan.data_volume,
    plan.dataVolume,
    plan.capacity
  );
};

const normalizeValidity = (plan) => {
  return firstValue(
    plan.validity,
    plan.validity_period,
    plan.validityPeriod,
    plan.duration,
    plan.expiry,
    plan.expiration,
    plan.period
  );
};

// ============================================================
// PLAN ARRAY DETECTION
// ============================================================

const PLAN_ARRAY_KEYS = [
  'plans',
  'variations',
  'bundles',
  'data_plans',
  'dataPlans',
  'products',
  'packages',
  'available_plans',
  'availablePlans',
];

const looksLikePlan = (item) => {
  if (!item || typeof item !== 'object') {
    return false;
  }

  const hasCode = Boolean(
    firstValue(
      item.variation_code,
      item.variationCode,
      item.variation_id,
      item.plan_code,
      item.planCode,
      item.code,
      item.product_code,
      item.id
    )
  );

  const hasAmount = firstValue(
    item.amount,
    item.price,
    item.variation_amount,
    item.variationAmount,
    item.cost,
    item.selling_price
  ) !== null;

  const hasPlanName = Boolean(
    firstValue(
      item.name,
      item.plan_name,
      item.planName,
      item.bundle_name,
      item.product_name,
      item.title,
      item.description
    )
  );

  return hasCode && (hasAmount || hasPlanName);
};

// ============================================================
// EXTRACT PLAN ARRAYS
// ============================================================

const extractPlanArrays = (responseData) => {
  const foundArrays = [];
  const visited = new Set();

  const walk = (value, depth = 0) => {
    if (
      value === null ||
      value === undefined ||
      depth > 8
    ) {
      return;
    }

    if (typeof value !== 'object') {
      return;
    }

    if (visited.has(value)) {
      return;
    }

    visited.add(value);

    if (Array.isArray(value)) {
      const validItems = value.filter(looksLikePlan);

      if (validItems.length > 0) {
        foundArrays.push(validItems);
      }

      value.forEach(item => walk(item, depth + 1));

      return;
    }

    // Look at recognized catalog keys first.
    for (const key of PLAN_ARRAY_KEYS) {
      if (value[key] !== undefined) {
        walk(value[key], depth + 1);
      }
    }

    // Support nested provider response structures.
    for (const key of Object.keys(value)) {
      if (PLAN_ARRAY_KEYS.includes(key)) {
        continue;
      }

      walk(value[key], depth + 1);
    }
  };

  walk(responseData);

  return foundArrays;
};

// ============================================================
// PLAN NORMALIZATION
// ============================================================

const extractPlans = (responseData) => {
  const planArrays = extractPlanArrays(responseData);

  const allPlans = planArrays.flat();

  const normalizedPlans = allPlans
    .map(plan => {
      const amount = normalizeAmount(plan);

      const variationCode =
        normalizeVariationCode(plan);

      const name =
        normalizePlanName(plan);

      const allowance =
        normalizeAllowance(plan);

      const validity =
        normalizeValidity(plan);

      const description = firstValue(
        plan.description,
        plan.details,
        plan.plan_description,
        plan.planDescription
      );

      const category = firstValue(
        plan.category,
        plan.plan_category,
        plan.planCategory,
        plan.type,
        plan.plan_type,
        plan.planType
      );

      const network = firstValue(
        plan.network,
        plan.network_slug,
        plan.networkSlug,
        plan.serviceID,
        plan.service_id
      );

      const promotional =
        firstValue(
          plan.is_promotional,
          plan.isPromotional,
          plan.promotion,
          plan.promotional,
          plan.promo,
          false
        );

      return {
        variation_code: variationCode,
        name,
        amount,

        network,

        validity:
          validity !== null
            ? String(validity)
            : null,

        allowance:
          allowance !== null
            ? String(allowance)
            : null,

        description:
          description !== null
            ? String(description)
            : null,

        category:
          category !== null
            ? String(category)
            : null,

        fixedPrice: firstValue(
          plan.fixedPrice,
          plan.fixed_price,
          plan.fixedprice
        ),

        isPromotional:
          Boolean(promotional),

        raw: plan,
      };
    })
    .filter(plan => {
      return (
        plan.variation_code &&
        Number.isFinite(plan.amount) &&
        plan.amount > 0
      );
    });

  // ----------------------------------------------------------
  // REMOVE DUPLICATE VARIATION CODES
  // ----------------------------------------------------------

  const uniquePlans = new Map();

  for (const plan of normalizedPlans) {
    if (!uniquePlans.has(plan.variation_code)) {
      uniquePlans.set(
        plan.variation_code,
        plan
      );
    }
  }

  return Array.from(uniquePlans.values());
};

// ============================================================
// GET DATA PLANS
// GET /v1/bills/data-plans?network=mtn
// ============================================================

const getDataPlans = async (
  network,
  { forceRefresh = false } = {}
) => {
  const normalizedNetwork =
    normalizeNetwork(network);

  if (!normalizedNetwork) {
    throw createError(
      'Unsupported mobile network.',
      'UNSUPPORTED_NETWORK',
      400
    );
  }

  // ----------------------------------------------------------
  // CACHE
  // ----------------------------------------------------------

  const cached =
    variationCache.get(normalizedNetwork);

  if (
    cached &&
    !forceRefresh &&
    Date.now() - cached.timestamp <
      CACHE_DURATION_MS
  ) {
    return cached.data;
  }

  // ----------------------------------------------------------
  // REQUEST PROVIDER CATALOG
  // ----------------------------------------------------------

  const result = await sogoRequest({
    endpoint:
      `/bills/data-plans?network=${encodeURIComponent(
        normalizedNetwork
      )}`,
    method: 'GET',
  });

  // ----------------------------------------------------------
  // NORMALIZE RESPONSE
  // ----------------------------------------------------------

  const plans = extractPlans(result.data);

  // ----------------------------------------------------------
  // NETWORK VALIDATION
  // ----------------------------------------------------------

  const verifiedPlans = plans.filter(plan => {
    if (!plan.network) {
      return true;
    }

    const planNetwork =
      normalizeNetwork(plan.network);

    return (
      !planNetwork ||
      planNetwork === normalizedNetwork
    );
  });

  // ----------------------------------------------------------
  // EMPTY CATALOG
  // ----------------------------------------------------------

  if (verifiedPlans.length === 0) {
    console.error(
      'Sogo returned no valid data plans.',
      {
        network: normalizedNetwork,
        responseStructure:
          Object.keys(result.data || {}),
      }
    );

    throw createError(
      'Sogo returned no valid data plans for this network.',
      'SOGO_EMPTY_DATA_CATALOGUE',
      502,
      result.data
    );
  }

  // ----------------------------------------------------------
  // SORT PLANS BY PRICE
  // ----------------------------------------------------------

  verifiedPlans.sort(
    (a, b) => a.amount - b.amount
  );

  // ----------------------------------------------------------
  // RESPONSE
  // ----------------------------------------------------------

  const response = {
    network: normalizedNetwork,
    serviceID: normalizedNetwork,
    plans: verifiedPlans,
  };

  // ----------------------------------------------------------
  // CACHE
  // ----------------------------------------------------------

  variationCache.set(
    normalizedNetwork,
    {
      timestamp: Date.now(),
      data: response,
    }
  );

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
  const normalizedNetwork =
    normalizeNetwork(network);

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

  // ----------------------------------------------------------
  // VALIDATE IDEMPOTENCY KEY
  // ----------------------------------------------------------

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (
    !idempotencyKey ||
    !uuidPattern.test(String(idempotencyKey))
  ) {
    throw createError(
      'A valid saved transaction idempotency key is required.',
      'INVALID_IDEMPOTENCY_KEY',
      400
    );
  }

  // ----------------------------------------------------------
  // PURCHASE REQUEST
  // ----------------------------------------------------------

  const result = await sogoRequest({
    endpoint: '/bills/data',
    method: 'POST',

    idempotencyKey:
      String(idempotencyKey),

    body: {
      network: normalizedNetwork,
      phone: cleanPhone,
      variation_code:
        String(variationCode),
    },
  });

  // ----------------------------------------------------------
  // RESPONSE NORMALIZATION
  // ----------------------------------------------------------

  const transaction =
    result.data?.data?.transaction ||
    result.data?.data ||
    result.data?.transaction ||
    result.data;

  return {
    requestId:
      String(idempotencyKey),

    network:
      normalizedNetwork,

    phone:
      cleanPhone,

    variationCode:
      String(variationCode),

    amount:
      Number(amount),

    response:
      result.data,

    transaction,

    statusCode:
      result.statusCode,

    idempotencyReplayed:
      result.idempotencyReplayed,
  };
};

// ============================================================
// REQUERY TRANSACTION
// ============================================================

const requeryTransaction = async (
  requestId
) => {
  if (!requestId) {
    throw createError(
      'Sogo idempotency key is required.',
      'REQUEST_ID_REQUIRED',
      400
    );
  }

  // Sandbox transactions are not persisted for lookup.
  if (
    SOGO_API_BASE_URL.includes(
      'sandbox.sogo.africa'
    )
  ) {
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
// CLEAR PLAN CACHE
// ============================================================

const clearDataPlanCache = (
  network = null
) => {
  if (!network) {
    variationCache.clear();
    return;
  }

  const normalizedNetwork =
    normalizeNetwork(network);

  if (normalizedNetwork) {
    variationCache.delete(
      normalizedNetwork
    );
  }
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
  clearDataPlanCache,
};
