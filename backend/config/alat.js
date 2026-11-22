
// ============================================================
// ZENIMONIES BANKING — WEMA / ALAT CONFIGURATION
// ============================================================

const getEnv = (name) => {
  const value = process.env[name];

  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null;
};

// Official ALAT Playground gateway.
// Endpoint paths must include their own product/API paths.
// Override ALAT_BASE_URL in Render when WEMA provides a different
// gateway URL for your subscribed product or production access.
const BASE_URL =
  getEnv('ALAT_BASE_URL') ||
  'https://playground.azure-api.net';

const SUBSCRIPTION_KEY = getEnv(
  'ALAT_SUBSCRIPTION_KEY'
);

// Separate bank-provided credential.
// This is NOT the subscription key.
const X_API_KEY = getEnv(
  'ALAT_X_API_KEY'
);

// Configuration is considered ready only when both
// required credentials are present.
const isConfigured = Boolean(
  SUBSCRIPTION_KEY && X_API_KEY
);

const getMissingCredentials = () => {
  const missing = [];

  if (!SUBSCRIPTION_KEY) {
    missing.push('ALAT_SUBSCRIPTION_KEY');
  }

  if (!X_API_KEY) {
    missing.push('ALAT_X_API_KEY');
  }

  return missing;
};

module.exports = {
  BASE_URL,
  SUBSCRIPTION_KEY,
  X_API_KEY,
  isConfigured,
  getMissingCredentials,
};
