
const crypto = require('crypto');

// ============================================================
// ZENIMONIES BANKING — SOGO TV SERVICE
// Providers: DSTV, GOTV, STARTIMES
// ============================================================

const SOGO_BASE_URL = (
  process.env.SOGO_API_BASE_URL ||
  'https://sandbox.sogo.africa/v1'
).replace(/\/+$/, '');

const SOGO_API_KEY = process.env.SOGO_API_KEY;

const TV_PROVIDERS = {
  DSTV: 'dstv',
  GOTV: 'gotv',
  STARTIMES: 'startimes',
};

const normalizeProvider = (provider) => {
  const value = String(provider || '')
    .trim()
    .toUpperCase();

  return TV_PROVIDERS[value] ? value : '';
};

const getTVServiceId = (provider) => {
  const normalized = normalizeProvider(provider);

  if (!normalized) {
    const error = new Error('Unsupported TV provider.');
    error.code = 'UNSUPPORTED_TV_PROVIDER';
    throw error;
  }

  return TV_PROVIDERS[normalized];
};

const generateRequestId = () => crypto.randomUUID();

const validateConfig = () => {
  if (!SOGO_API_KEY) {
    const error = new Error(
      'SOGO_API_KEY is missing from the backend environment.'
    );
    error.code = 'SOGO_CONFIGURATION_ERROR';
    throw error;
  }
};

const sogoRequest = async ({
  method = 'GET',
  path,
  body = null,
  idempotencyKey = null,
}) => {
  validateConfig();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${SOGO_API_KEY}`,
      'Content-Type': 'application/json',
    };

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const response = await fetch(
      `${SOGO_BASE_URL}${path}`,
      {
        method,
        headers,
        body: body === null ? undefined : JSON.stringify(body),
        signal: controller.signal,
      }
    );

    const responseText = await response.text();

    let data;

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (_) {
      const error = new Error(
        'Sogo returned an invalid JSON response.'
      );
      error.code = 'SOGO_INVALID_RESPONSE';
      error.status = response.status;
      throw error;
    }

    if (!response.ok) {
      const error = new Error(
        data?.message ||
        data?.error?.message ||
        `Sogo request failed with HTTP ${response.status}.`
      );

      error.code =
        data?.code ||
        data?.error?.code ||
        'SOGO_HTTP_ERROR';

      error.status = response.status;
      error.response = data;

      throw error;
    }

    return {
      httpStatus: response.status,
      data,
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error(
        'Sogo request timed out. The transaction outcome may be unknown.'
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
// RESPONSE HELPERS
// ============================================================

const getPayload = (response) => (
  response?.data?.data ||
  response?.data ||
  response?.verification ||
  response ||
  {}
);

const normalizePlan = (plan, provider) => ({
  variation_code:
    plan?.variation_code ||
    plan?.variationCode ||
    plan?.code ||
    plan?.id ||
    null,

  name:
    plan?.name ||
    plan?.package_name ||
    plan?.package ||
    plan?.label ||
    null,

  amount: Number(
    plan?.amount ??
    plan?.price ??
    plan?.monthly_price ??
    plan?.variation_amount ??
    0
  ),

  fixedPrice:
    plan?.fixedPrice ??
    plan?.fixed_price ??
    null,

  channels:
    plan?.channels ??
    null,

  provider,
});

const extractPlans = (response) => {
  const payload = getPayload(response);

  if (Array.isArray(payload)) return payload;

  const candidates = [
    payload?.packages,
    payload?.plans,
    payload?.variations,
    payload?.cable_packages,
    payload?.items,
    response?.data?.packages,
    response?.data?.plans,
    response?.data?.variations,
  ];

  return candidates.find(Array.isArray) || [];
};

// ============================================================
// GET TV PLANS
// GET /v1/bills/cable-packages?provider=dstv
// ============================================================

const getTVPlans = async (provider) => {
  const normalizedProvider = normalizeProvider(provider);
  const providerSlug = getTVServiceId(provider);

  const result = await sogoRequest({
    method: 'GET',
    path: `/bills/cable-packages?provider=${encodeURIComponent(
      providerSlug
    )}`,
  });

  const plans = extractPlans(result);

  if (!plans.length) {
    const error = new Error(
      'Sogo did not return any TV packages for this provider.'
    );
    error.code = 'SOGO_TV_PLANS_EMPTY';
    throw error;
  }

  const normalizedPlans = plans
    .map((plan) => normalizePlan(plan, normalizedProvider))
    .filter((plan) => (
      plan.variation_code &&
      Number.isFinite(plan.amount) &&
      plan.amount > 0
    ));

  if (!normalizedPlans.length) {
    const error = new Error(
      'Sogo returned TV packages without usable variation codes or prices.'
    );
    error.code = 'SOGO_TV_PLANS_INVALID';
    throw error;
  }

  return {
    provider: normalizedProvider,
    serviceID: providerSlug,
    plans: normalizedPlans,
    raw: result.data,
  };
};

// ============================================================
// VERIFY SMARTCARD / IUC
// POST /v1/bills/cable-tv/verify-smartcard
// ============================================================

const verifyTVAccount = async ({
  provider,
  billersCode,
}) => {
  const normalizedProvider = normalizeProvider(provider);
  const providerSlug = getTVServiceId(provider);

  const smartcardNumber = String(billersCode || '')
    .replace(/\D/g, '')
    .trim();

  if (!smartcardNumber) {
    const error = new Error(
      'Smartcard or IUC number is required.'
    );
    error.code = 'TV_SMARTCARD_REQUIRED';
    throw error;
  }

  const result = await sogoRequest({
    method: 'POST',
    path: '/bills/cable-tv/verify-smartcard',
    body: {
      provider: providerSlug,
      smartcard_number: smartcardNumber,
    },
  });

  const payload = getPayload(result);

  const verification =
    payload?.verification ||
    payload?.customer ||
    payload?.data ||
    payload;

  return {
    provider: normalizedProvider,
    serviceID: providerSlug,
    billersCode: smartcardNumber,
    httpStatus: result.httpStatus,
    response: {
      ...result.data,
      content: {
        Customer_Name:
          verification?.customer_name ||
          verification?.Customer_Name ||
          verification?.name ||
          verification?.customer?.name ||
          '',

        Current_Bouquet:
          verification?.current_bouquet ||
          verification?.Current_Bouquet ||
          verification?.current_package ||
          '',

        Renewal_Amount: Number(
          verification?.renewal_amount ||
          verification?.Renewal_Amount ||
          0
        ),

        Due_Date:
          verification?.due_date ||
          verification?.Due_Date ||
          '',

        Status:
          verification?.status ||
          verification?.Status ||
          '',
      },
    },
  };
};

// ============================================================
// PURCHASE TV SUBSCRIPTION
// POST /v1/bills/cable-tv
//
// The controller creates and stores the UUID before calling
// this function. The same UUID is sent as Idempotency-Key.
// ============================================================

const purchaseTV = async ({
  provider,
  billersCode,
  variationCode,
  amount,
  phone,
  subscriptionType = 'change',
  quantity = 1,
  requestId,
  idempotencyKey,
}) => {
  const normalizedProvider = normalizeProvider(provider);
  const providerSlug = getTVServiceId(provider);

  const smartcardNumber = String(billersCode || '')
    .replace(/\D/g, '')
    .trim();

  const numericAmount = Number(amount);

  const cleanPhone = String(phone || '')
    .replace(/\s+/g, '')
    .trim();

  const key = idempotencyKey || requestId;

  if (!key) {
    const error = new Error(
      'A Sogo idempotency key is required.'
    );
    error.code = 'SOGO_IDEMPOTENCY_KEY_REQUIRED';
    throw error;
  }

  if (!smartcardNumber) {
    throw new Error('Smartcard or IUC number is required.');
  }

  if (!variationCode) {
    throw new Error('TV subscription plan is required.');
  }

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('A valid TV subscription amount is required.');
  }

  if (!/^0\d{10}$/.test(cleanPhone)) {
    throw new Error('A valid Nigerian phone number is required.');
  }

  if (!['change', 'renew'].includes(subscriptionType)) {
    throw new Error('Invalid TV subscription type.');
  }

  const result = await sogoRequest({
    method: 'POST',
    path: '/bills/cable-tv',
    idempotencyKey: key,
    body: {
      provider: providerSlug,
      smartcard_number: smartcardNumber,
      subscription_type: subscriptionType,
      variation_code: String(variationCode),
      amount: numericAmount,
    },
  });

  return {
    requestId: key,
    provider: normalizedProvider,
    serviceID: providerSlug,
    billersCode: smartcardNumber,
    httpStatus: result.httpStatus,
    response: result.data,
  };
};

// ============================================================
// REQUERY
//
// Sogo sandbox does not persist transactions for lookup.
// Live lookup uses the stored idempotency key.
// ============================================================

const requeryTVTransaction = async ({
  requestId,
}) => {
  const key = String(requestId || '').trim();

  if (!key) {
    throw new Error('Sogo idempotency key is required.');
  }

  if (SOGO_BASE_URL.includes('sandbox')) {
    const error = new Error(
      'Sogo sandbox does not support transaction lookup. Use the webhook result.'
    );
    error.code = 'SOGO_SANDBOX_REQUERY_UNAVAILABLE';
    throw error;
  }

  const result = await sogoRequest({
    method: 'GET',
    path: `/transactions/${encodeURIComponent(
      key
    )}?type=bill_payment`,
  });

  return {
    requestId: key,
    httpStatus: result.httpStatus,
    response: result.data,
  };
};

module.exports = {
  TV_PROVIDERS,
  normalizeProvider,
  getTVServiceId,
  generateRequestId,
  getTVPlans,
  verifyTVAccount,
  purchaseTV,
  requeryTVTransaction,
};
