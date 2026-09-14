const axios = require('axios');

// ============================================================
// DOJAH CONFIGURATION
// ============================================================

const DOJAH_BASE_URL =
  process.env.DOJAH_BASE_URL ||
  'https://sandbox.dojah.io';

const DOJAH_APP_ID =
  process.env.DOJAH_APP_ID;

const DOJAH_SECRET_KEY =
  process.env.DOJAH_SECRET_KEY;

// ============================================================
// CHECK DOJAH CONFIGURATION
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
// DOJAH API REQUEST
// ============================================================

const dojahRequest = async ({
  method,
  url,
  data,
  params,
  headers = {},
}) => {
  try {
    console.log('============================================');
    console.log('DOJAH REQUEST');
    console.log('============================================');
    console.log('Method:', method);
    console.log('Base URL:', DOJAH_BASE_URL);
    console.log('Endpoint:', url);
    console.log('Params:', params || null);

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

    console.log('============================================');
    console.log('DOJAH RESPONSE SUCCESS');
    console.log('============================================');
    console.log('HTTP Status:', response.status);
    console.log(
      'Response:',
      JSON.stringify(
        response.data,
        null,
        2
      )
    );

    return {
      success: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    console.error('============================================');
    console.error('DOJAH API ERROR');
    console.error('============================================');

    console.error(
      'HTTP Status:',
      error.response?.status || 'NO HTTP STATUS'
    );

    console.error(
      'HTTP Status Text:',
      error.response?.statusText || 'N/A'
    );

    console.error(
      'Endpoint:',
      url
    );

    console.error(
      'Response Data:',
      JSON.stringify(
        error.response?.data || null,
        null,
        2
      )
    );

    console.error(
      'Response Headers:',
      JSON.stringify(
        error.response?.headers || null,
        null,
        2
      )
    );

    console.error(
      'Error Message:',
      error.message
    );

    console.error(
      'Error Code:',
      error.code || 'N/A'
    );

    console.error('============================================');

    return {
      success: false,
      status:
        error.response?.status ||
        500,
      data:
        error.response?.data ||
        null,
      message:
        error.response?.data?.message ||
        error.message ||
        'Dojah request failed',
    };
  }
};

// ============================================================
// BVN LOOKUP
//
// GET /api/v1/kyc/bvn?bvn=XXXXXXXXXXX
//
// IMPORTANT:
// This only sends the BVN to Dojah and returns Dojah's response.
// It does NOT mark the Zenimonies user as verified.
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

  console.log('============================================');
  console.log('DOJAH BVN VERIFICATION START');
  console.log('============================================');

  // Never log the actual BVN.

  const result = await dojahRequest({
    method: 'GET',
    url: '/api/v1/kyc/bvn',
    params: {
      bvn: normalizedBvn,
    },
  });

  if (!result.success) {
    console.error(
      'DOJAH BVN VERIFICATION FAILED'
    );

    console.error(
      'Status:',
      result.status
    );

    console.error(
      'Message:',
      result.message
    );

    console.error(
      'Data:',
      JSON.stringify(
        result.data || null,
        null,
        2
      )
    );
  } else {
    console.log(
      'DOJAH BVN REQUEST COMPLETED'
    );
  }

  console.log('============================================');

  return result;
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
  testDojahConnection,
};
