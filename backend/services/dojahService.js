const axios = require('axios');

// ============================================================
// DOJAH CONFIGURATION
// ============================================================

const DOJAH_BASE_URL =
  process.env.DOJAH_BASE_URL || 'https://sandbox.dojah.io';

const DOJAH_APP_ID =
  process.env.DOJAH_APP_ID;

const DOJAH_SECRET_KEY =
  process.env.DOJAH_SECRET_KEY;

// ============================================================
// VALIDATE CONFIGURATION
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
// DOJAH CLIENT
// ============================================================

const dojahClient = axios.create({
  baseURL: DOJAH_BASE_URL,

  timeout: 30000,

  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// ============================================================
// ADD DOJAH AUTHENTICATION
// ============================================================

const getHeaders = () => {
  validateDojahConfig();

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',

    AppId: DOJAH_APP_ID,

    Authorization:
      `Bearer ${DOJAH_SECRET_KEY}`,
  };
};

// ============================================================
// GENERIC DOJAH REQUEST
// ============================================================

const dojahRequest = async ({
  method,
  url,
  data,
  params,
  headers = {},
}) => {
  try {
    const response =
      await dojahClient.request({
        method,
        url,
        data,
        params,

        headers: {
          ...getHeaders(),
          ...headers,
        },
      });

    return {
      success: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    console.error(
      'Dojah API error:',
      error.response?.data ||
        error.message
    );

    return {
      success: false,

      status:
        error.response?.status || 500,

      data:
        error.response?.data || null,

      message:
        error.response?.data?.message ||
        error.message ||
        'Dojah request failed',
    };
  }
};

// ============================================================
// TEST DOJAH CONNECTION
// ============================================================
//
// This does NOT verify a customer.
//
// It simply confirms that Zenimonies can communicate with
// the configured Dojah environment.
//
// ============================================================

const testDojahConnection = async () => {
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
  testDojahConnection,
};
