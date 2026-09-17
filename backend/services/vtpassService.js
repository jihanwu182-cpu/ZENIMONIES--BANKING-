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
// SIMPLE IN-MEMORY PLAN CACHE
// Keeps repeated dashboard/data-page requests fast.
// Plans are refreshed after 10 minutes.
// ============================================================

const variationCache = new Map();

const CACHE_DURATION_MS = 10 * 60 * 1000;

// ============================================================
// VALIDATE VTpass CONFIGURATION
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

    error.code = 'VTPASS_CONFIGURATION_ERROR';

    throw error;
  }
};

// ============================================================
// NORMALIZE NETWORK NAME
// ============================================================

const normalizeNetwork = (network) => {
  if (!network) {
    return null;
  }

  const value = String(network).trim().toLowerCase();

  const networkMap
