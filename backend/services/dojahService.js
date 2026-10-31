const axios = require('axios');

// ============================================================
// ZENIMONIES BANKING — DOJAH SERVICE
// ============================================================

const DOJAH_BASE_URL =
  process.env.DOJAH_BASE_URL || 'https://sandbox.dojah.io';

const DOJAH_APP_ID = process.env.DOJAH_APP_ID;
const DOJAH_SECRET_KEY = process.env.DOJAH_SECRET_KEY;

// ============================================================
// CONFIG VALIDATION
// ============================================================

const validateDojahConfig = () => {
  if (!DOJAH_APP_ID) {
    throw new Error('DOJAH_APP_ID is not configured');
  }
  if (!DOJAH_SECRET_KEY) {
    throw new Error('DOJAH_SECRET_KEY is not configured');
  }
};

// ============================================================
// HEADERS
// ============================================================

const getDojahHeaders = () => {
  validateDojahConfig();

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    AppId: DOJAH_APP_ID,
    Authorization: DOJAH_SECRET_KEY, // raw key — NO "Bearer"
  };
};

// ============================================================
// SAFE REQUEST HELPER
// ============================================================

const dojahRequest = async ({ method, url, data, params }) => {
  try {
    const response = await axios({
      method,
      baseURL: DOJAH_BASE_URL,
      url,
      data,
      params,
      headers: getDojahHeaders(),
      timeout: 30000,
    });

    return {
      success: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    const status = error.response?.status || 500;

    // Never log sensitive data
    console.error('Dojah API request failed:', {
      endpoint: url,
      method,
      status,
      code: error.code || null,
    });

    return {
      success: false,
      status,
      data: error.response?.data || null,
      message:
        status >= 500
          ? 'Dojah service is temporarily unavailable.'
          : 'Dojah verification request failed.',
    };
  }
};

// ============================================================
// VALIDATE BVN (used by Tier 1)
// GET /api/v1/kyc/bvn
// ============================================================

const validateBvn = async ({ bvn, firstName, lastName, dateOfBirth }) => {
  const normalizedBvn = String(bvn || '').trim();
  const first = String(firstName || '').trim();
  const last = String(lastName || '').trim();
  const dob = String(dateOfBirth || '').trim();

  if (!/^\d{11}$/.test(normalizedBvn)) {
    return {
      success: false,
      status: 400,
      data: null,
      message: 'Invalid BVN format.',
    };
  }

  if (!first || !last || !dob) {
    return {
      success: false,
      status: 400,
      data: null,
      message: 'Required identity details are missing.',
    };
  }

  return dojahRequest({
    method: 'GET',
    url: '/api/v1/kyc/bvn',
    params: {
      bvn: normalizedBvn,
      first_name: first,
      last_name: last,
      dob,
    },
  });
};

// ============================================================
// SIMPLE BVN LOOKUP (optional)
// ============================================================

const verifyBvn = async (bvn) => {
  const normalizedBvn = String(bvn || '').trim();

  if (!/^\d{11}$/.test(normalizedBvn)) {
    return {
      success: false,
      status: 400,
      message: 'BVN must contain exactly 11 digits.',
      data: null,
    };
  }

  return dojahRequest({
    method: 'GET',
    url: '/api/v1/kyc/bvn',
    params: { bvn: normalizedBvn },
  });
};

// ============================================================
// GET VERIFICATION RESULT (for widget / confirm)
// GET /api/v1/kyc/verification
// ============================================================

const getDojahVerification = async (referenceId) => {
  const reference = String(referenceId || '').trim();

  if (!reference || reference.length > 150) {
    return {
      success: false,
      status: 400,
      message: 'A valid verification reference is required.',
      data: null,
    };
  }

  return dojahRequest({
    method: 'GET',
    url: '/api/v1/kyc/verification',
    params: {
      reference_id: reference,
    },
  });
};


// ============================================================
// VALIDATE NIN (Tier 1 alternative)
// GET /api/v1/kyc/nin
// The lookup response is identity data, not an approval flag.
// Approval is completed only after the signed verification webhook.
// ============================================================
const validateNin = async (nin) => {
  const normalizedNin = String(nin || '').trim();

  if (!/^\d{11}$/.test(normalizedNin)) {
    return {
      success: false,
      status: 400,
      data: null,
      message: 'NIN must contain exactly 11 digits.',
    };
  }

  return dojahRequest({
    method: 'GET',
    url: '/api/v1/kyc/nin',
    params: { nin: normalizedNin },
  });
};

// ============================================================
// TEST CONNECTION
// ============================================================

const testDojahConnection = () => {
  try {
    validateDojahConfig();
    return {
      success: true,
      configured: true,
      baseUrl: DOJAH_BASE_URL,
    };
  } catch (error) {
    return {
      success: false,
      configured: false,
      message: error.message,
    };
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  dojahRequest,
  validateBvn,
  validateNin,
  verifyBvn,
  getDojahVerification,
  testDojahConnection,
};
