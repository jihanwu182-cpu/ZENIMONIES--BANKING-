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
// TEST DOJAH CONFIGURATION
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
  testDojahConnection,
};
