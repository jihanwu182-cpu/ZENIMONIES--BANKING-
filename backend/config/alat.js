// ============================================================
// ZENIMONIES BANKING — WEMA / ALAT CONFIGURATION
// ============================================================

const getEnv = (name) => {
  const value = process.env[name];

  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null;
};

// Sandbox URL supplied by the ALAT Developer Playground.
// Production URL must be confirmed by Wema before launch.
const BASE_URL =
  getEnv('ALAT_BASE_URL') ||
  'https://apiplayground.alat.ng/create-account-face/api';

const SUBSCRIPTION_KEY = getEnv(
  'ALAT_SUBSCRIPTION_KEY'
);

// This is a separate bank-provided credential.
// It is NOT the same as the subscription key.
const X_API_KEY = getEnv('ALAT_X_API_KEY');

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
