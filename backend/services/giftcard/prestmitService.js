// ============================================================
// ZENIMONIES BANKING
// PRESTMIT GIFT CARD SERVICE
// ============================================================

const PRESTMIT_BASE_URL =
  process.env.PRESTMIT_API_URL ||
  'https://dev-api.prestmit.io/partners/v1';

const PRESTMIT_API_KEY = process.env.PRESTMIT_API_KEY;
const PRESTMIT_API_SECRET = process.env.PRESTMIT_API_SECRET;

// ============================================================
// VALIDATION
// ============================================================

function ensureCredentials() {
  if (!PRESTMIT_API_KEY || !PRESTMIT_API_SECRET) {
    throw new Error(
      'Prestmit API credentials are not configured.'
    );
  }
}

// ============================================================
// GENERIC REQUEST
// ============================================================

async function prestmitRequest(
  endpoint,
  options = {}
) {
  ensureCredentials();

  const response = await fetch(
    `${PRESTMIT_BASE_URL}${endpoint}`,
    {
      ...options,

      headers: {
        'Content-Type': 'application/json',

        'x-api-key': PRESTMIT_API_KEY,
        'x-api-secret': PRESTMIT_API_SECRET,

        ...(options.headers || {}),
      },
    }
  );

  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      raw: text,
    };
  }

  if (!response.ok) {
    const error = new Error(
      data?.message ||
        data?.error ||
        `Prestmit request failed with status ${response.status}`
    );

    error.status = response.status;
    error.response = data;

    throw error;
  }

  return data;
}

// ============================================================
// GET BUY CONFIGURATION
// ============================================================

async function getBuyConfig() {
  return prestmitRequest(
    '/giftcard-trade/buy/config',
    {
      method: 'GET',
    }
  );
}

// ============================================================
// CALCULATE BUY PRICE
// ============================================================

async function calculateBuyPayment(payload) {
  return prestmitRequest(
    '/giftcard-trade/buy/calculate-payment',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

// ============================================================
// CREATE BUY TRANSACTION
// ============================================================

async function createBuyTransaction(payload) {
  return prestmitRequest(
    '/giftcard-trade/buy/create',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

// ============================================================
// CREATE SELL TRANSACTION
// ============================================================

async function createSellTransaction(payload) {
  return prestmitRequest(
    '/giftcard-trade/sell/create',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  getBuyConfig,
  calculateBuyPayment,
  createBuyTransaction,
};
