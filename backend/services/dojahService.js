
const axios = require('axios');

// ============================================================
// ZENIMONIES BANKING
// DOJAH SERVICE
// ============================================================

const DOJAH_BASE_URL =
  process.env.DOJAH_BASE_URL ||
  'https://sandbox.dojah.io';

const DOJAH_APP_ID =
  process.env.DOJAH_APP_ID;

const DOJAH_SECRET_KEY =
  process.env.DOJAH_SECRET_KEY;

// ============================================================
// CONFIGURATION VALIDATION
// ============================================================

const validateDojahConfig = () => {
  if (!DOJAH_APP_ID) {
    throw new Error(
      'DOJAH_APP_ID is not configured'
    );
  }

  if (!DOJAH_SECRET_KEY) {
    throw new Error(
      'DOJAH_SECRET_KEY is not configured'
    );
  }
};

// ============================================================
// DOJAH HEADERS
// ============================================================

const getDojahHeaders = () => {
  validateDojahConfig();

  return {
    Accept: 'application/json',
    AppId: DOJAH_APP_ID,
    Authorization: DOJAH_SECRET_KEY,
  };
};

// ============================================================
// SAFE DOJAH API REQUEST
//
// IMPORTANT:
// Never log BVNs, identity data, selfies, API credentials,
// provider response bodies, or response headers.
// ============================================================

const dojahRequest = async ({
  method,
  url,
  data,
  params,
  headers = {},
}) => {
  try {
    const response = await axios({
      method,
      baseURL: DOJAH_BASE_URL,
      url,
      data,
      params,
      headers: {
        ...getDojahHeaders(),
        ...headers,
      },
      timeout: 30000,
    });

    return {
      success: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    const status =
      error.response?.status || 500;

    // Log only non-sensitive diagnostics.
    console.error('Dojah API request failed:', {
      endpoint: url,
      method,
      status,
      code: error.code || null,
    });

    return {
      success: false,
      status,
      data: null,
      message:
        status >= 500
          ? 'Dojah service is temporarily unavailable.'
          : 'Dojah verification request failed.',
    };
  }
};

// ============================================================
// BVN LOOKUP
//
// GET /api/v1/kyc/bvn
//
// This submits a BVN for lookup.
// A successful API response alone does not approve a customer.
// ============================================================

const verifyBvn = async (bvn) => {
  const normalizedBvn =
    String(bvn || '').trim();

  if (!/^\d{11}$/.test(normalizedBvn)) {
    return {
      success: false,
      status: 400,
      message:
        'BVN must contain exactly 11 digits.',
      data: null,
    };
  }

  return dojahRequest({
    method: 'GET',
    url: '/api/v1/kyc/bvn',
    params: {
      bvn: normalizedBvn,
    },
  });
};

// ============================================================
// DOJAH VERIFICATION LOOKUP
//
// GET /api/v1/kyc/verification
//
// The reference must be generated and associated with the
// authenticated customer by the Zenimonies backend.
//
// Never accept an arbitrary customer ID from the browser
// to decide whose verification record should be updated.
// ============================================================

const getDojahVerification = async (
  referenceId
) => {
  const reference =
    String(referenceId || '').trim();

  if (
    !reference ||
    reference.length > 150
  ) {
    return {
      success: false,
      status: 400,
      message:
        'A valid verification reference is required.',
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
// TEST DOJAH CONNECTION
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
  verifyBvn,
  getDojahVerification,
  testDojahConnection,
};
