
const crypto = require('crypto');

// ============================================================
// ZENIMONIES BANKING
// EDUCATION PAYMENT SERVICE
// SOGO
//
// Supported:
// - WAEC Registration
// - WAEC Result Checker
// - JAMB
// ============================================================

const SOGO_BASE_URL = (
  process.env.SOGO_API_BASE_URL ||
  'https://sandbox.sogo.africa/v1'
).replace(/\/+$/, '');

const SOGO_API_KEY = process.env.SOGO_API_KEY;

const EDUCATION_SERVICE_IDS = {
  WAEC_REGISTRATION: 'waec-registration',
  WAEC_RESULT: 'waec',
  JAMB: 'jamb',
};

// ============================================================
// REQUEST ID
// ============================================================

const generateRequestId = () => crypto.randomUUID();

// ============================================================
// CONFIGURATION
// ============================================================

const validateConfig = () => {
  if (!SOGO_API_KEY) {
    const error = new Error(
      'SOGO_API_KEY is not configured.'
    );

    error.code = 'SOGO_CONFIGURATION_ERROR';
    throw error;
  }
};

// ============================================================
// NORMALIZE EDUCATION SERVICE
// ============================================================

const normalizeEducationService = (service) => {
  if (!service) return null;

  const value = String(service)
    .trim()
    .toLowerCase();

  const serviceMap = {
    'waec-registration':
      EDUCATION_SERVICE_IDS.WAEC_REGISTRATION,

    waec_registration:
      EDUCATION_SERVICE_IDS.WAEC_REGISTRATION,

    waec:
      EDUCATION_SERVICE_IDS.WAEC_RESULT,

    'waec-result':
      EDUCATION_SERVICE_IDS.WAEC_RESULT,

    waec_result:
      EDUCATION_SERVICE_IDS.WAEC_RESULT,

    jamb:
      EDUCATION_SERVICE_IDS.JAMB,
  };

  return serviceMap[value] || null;
};

// ============================================================
// GET EDUCATION SERVICE ID
// ============================================================

const getEducationServiceId = (service) => {
  const serviceId = normalizeEducationService(service);

  if (!serviceId) {
    const error = new Error(
      'Unsupported education service.'
    );

    error.code = 'UNSUPPORTED_EDUCATION_SERVICE';
    throw error;
  }

  return serviceId;
};

// ============================================================
// MAP SOGO PROVIDER
// ============================================================

const getSogoProvider = (service) => {
  const serviceId = getEducationServiceId(service);

  return serviceId === EDUCATION_SERVICE_IDS.JAMB
    ? 'jamb'
    : 'waec';
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
  }, 30000);

  try {
    const response = await fetch(
      `${SOGO_BASE_URL}${endpoint}`,
      {
        method,
        headers,
        body: body !== null
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
      data = { raw: responseText };
    }

    if (!response.ok) {
      const error = new Error(
        data?.message ||
        data?.error ||
        `Sogo request failed with status ${response.status}.`
      );

      error.code =
        data?.code || 'SOGO_HTTP_ERROR';

      error.status = response.status;
      error.response = data;

      throw error;
    }

    return data;

  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error(
        'Sogo request timed out. The transaction outcome must be checked before retrying.'
      );

      timeoutError.code = 'SOGO_TIMEOUT';
      throw timeoutError;
    }

    throw error;

  } finally {
    clearTimeout(timeout);
  }
};

// ============================================================
// EXTRACT EDUCATION PLANS
// ============================================================

const extractPlans = (result) => {
  const candidates = [
    result?.data?.plans,
    result?.plans,
    result?.data?.variations,
    result?.variations,
    result?.data?.items,
    result?.items,
    result?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

// ============================================================
// GET EDUCATION VARIATIONS
//
// Sogo:
// GET /v1/bills/education-plans
// ============================================================

const getEducationVariations = async (service) => {
  const serviceId = getEducationServiceId(service);
  const provider = getSogoProvider(service);

  const result = await sogoRequest({
    endpoint: '/bills/education-plans',
    method: 'GET',
  });

  const allPlans = extractPlans(result);

  const variations = allPlans.filter((plan) => {
    const planProvider = String(
      plan?.provider ||
      plan?.service ||
      plan?.category ||
      ''
    ).trim().toLowerCase();

    // If Sogo does not include a provider field,
    // retain the returned catalogue for compatibility.
    if (!planProvider) return true;

    return planProvider === provider;
  });

  return {
    serviceID: serviceId,
    provider,
    variations,
    responseDescription:
      result?.message || null,
    raw: result,
  };
};

// ============================================================
// VERIFY JAMB PROFILE
//
// Sogo:
// POST /v1/bills/education/verify-jamb
//
// Required:
// profile_id
// ============================================================

const verifyJambProfile = async ({
  profileId,
  variationCode = null,
  service = 'jamb',
}) => {
  const serviceId = getEducationServiceId(service);

  if (serviceId !== EDUCATION_SERVICE_IDS.JAMB) {
    const error = new Error(
      'JAMB profile verification is only available for JAMB.'
    );

    error.code = 'INVALID_JAMB_SERVICE';
    throw error;
  }

  const cleanProfileId = String(
    profileId || ''
  ).trim();

  if (!cleanProfileId) {
    const error = new Error(
      'JAMB Profile ID is required.'
    );

    error.code = 'JAMB_PROFILE_ID_REQUIRED';
    throw error;
  }

  const result = await sogoRequest({
    endpoint: '/bills/education/verify-jamb',
    method: 'POST',
    body: {
      profile_id: cleanProfileId,
    },
  });

  return {
    requestId: null,
    serviceID: serviceId,
    profileId: cleanProfileId,
    variationCode,
    response: result,
  };
};

// ============================================================
// PURCHASE EDUCATION PRODUCT
//
// Sogo:
// POST /v1/bills/education
//
// JAMB:
// provider: jamb
// profile_id: candidate profile ID
//
// WAEC:
// provider: waec
// service_type: result_checker or registration
//
// Both:
// variation_code
// amount
// Idempotency-Key header
// ============================================================

const purchaseEducation = async ({
  service,
  billersCode = null,
  profileId = null,
  variationCode = null,
  amount,
  phone = null,
  additionalFields = {},
  requestId = null,
}) => {
  const serviceId = getEducationServiceId(service);
  const provider = getSogoProvider(service);

  const cleanVariationCode = String(
    variationCode || ''
  ).trim();

  if (!cleanVariationCode) {
    const error = new Error(
      'Education variation code is required.'
    );

    error.code = 'EDUCATION_VARIATION_REQUIRED';
    throw error;
  }

  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    const error = new Error(
      'A valid education payment amount is required.'
    );

    error.code = 'INVALID_EDUCATION_AMOUNT';
    throw error;
  }

  // Reuse the ID saved in the local database.
  // Generate one only for callers that do not supply it.
  const cleanRequestId = String(
    requestId || generateRequestId()
  ).trim();

  if (!cleanRequestId) {
    const error = new Error(
      'A valid Sogo idempotency key is required.'
    );

    error.code = 'REQUEST_ID_REQUIRED';
    throw error;
  }

  const payload = {
    provider,
    variation_code: cleanVariationCode,
    amount: numericAmount,
  };

  if (serviceId === EDUCATION_SERVICE_IDS.JAMB) {
    const cleanProfileId = String(
      profileId || billersCode || ''
    ).trim();

    if (!cleanProfileId) {
      const error = new Error(
        'JAMB Profile ID is required.'
      );

      error.code = 'JAMB_PROFILE_ID_REQUIRED';
      throw error;
    }

    payload.profile_id = cleanProfileId;

  } else {
    const normalizedService = String(
      additionalFields?.service_type ||
      (
        serviceId === EDUCATION_SERVICE_IDS.WAEC_REGISTRATION
          ? 'registration'
          : 'result_checker'
      )
    ).trim().toLowerCase();

    if (
      !['registration', 'result_checker'].includes(
        normalizedService
      )
    ) {
      const error = new Error(
        'Invalid WAEC service type.'
      );

      error.code = 'INVALID_WAEC_SERVICE_TYPE';
      throw error;
    }

    payload.service_type = normalizedService;
  }

  const result = await sogoRequest({
    endpoint: '/bills/education',
    method: 'POST',
    body: payload,
    idempotencyKey: cleanRequestId,
  });

  return {
    requestId: cleanRequestId,
    serviceID: serviceId,
    provider,
    billersCode:
      serviceId === EDUCATION_SERVICE_IDS.JAMB
        ? payload.profile_id
        : null,
    variationCode: cleanVariationCode,
    amount: numericAmount,
    phone,
    response: result,
  };
};

// ============================================================
// REQUERY EDUCATION TRANSACTION
//
// Live:
// GET /v1/transactions/{reference}?type=bill_payment
//
// Sandbox transactions are not persisted for lookup.
// Use webhook and original purchase response.
// ============================================================

const requeryEducationTransaction = async (requestId) => {
  const cleanRequestId = String(
    requestId || ''
  ).trim();

  if (!cleanRequestId) {
    const error = new Error(
      'Sogo transaction reference is required.'
    );

    error.code = 'REQUEST_ID_REQUIRED';
    throw error;
  }

  if (
    SOGO_BASE_URL.includes('sandbox.sogo.africa')
  ) {
    const error = new Error(
      'Sogo sandbox does not support transaction lookup. Use the purchase response and webhook status.'
    );

    error.code = 'SOGO_SANDBOX_REQUERY_UNAVAILABLE';
    throw error;
  }

  return sogoRequest({
    endpoint:
      `/transactions/${encodeURIComponent(cleanRequestId)}?type=bill_payment`,
    method: 'GET',
  });
};

// ============================================================
// GET PROVIDER STATUS
// ============================================================

const getEducationProviderStatus = (providerResponse) => {
  const transaction =
    providerResponse?.data?.transaction ||
    providerResponse?.transaction ||
    providerResponse?.data ||
    providerResponse;

  const status = String(
    transaction?.status ||
    transaction?.transaction_status ||
    providerResponse?.status ||
    ''
  ).trim().toLowerCase();

  if (
    [
      'completed',
      'success',
      'successful',
    ].includes(status)
  ) {
    return 'completed';
  }

  if (
    [
      'pending',
      'processing',
      'initiated',
    ].includes(status)
  ) {
    return 'pending';
  }

  if (
    [
      'failed',
      'failure',
      'cancelled',
      'canceled',
      'refunded',
    ].includes(status)
  ) {
    return 'failed';
  }

  // Unknown responses must not trigger a refund.
  return 'pending';
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  EDUCATION_SERVICE_IDS,

  generateRequestId,

  normalizeEducationService,
  getEducationServiceId,

  getEducationVariations,
  verifyJambProfile,
  purchaseEducation,
  requeryEducationTransaction,
  getEducationProviderStatus,
};
