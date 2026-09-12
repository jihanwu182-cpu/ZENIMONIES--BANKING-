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
// CHECK CONFIGURATION
// ============================================================

const checkDojahConfig = () => {
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
// DOJAH REQUEST
// ============================================================

const dojahRequest = async ({
  method = 'GET',
  url,
  params = {},
  data = undefined,
}) => {
  checkDojahConfig();

  try {
    const response = await axios({
      method,
      url: `${DOJAH_BASE_URL}${url}`,

      params,

      data,

      headers: {
        AppId: DOJAH_APP_ID,
        Authorization: DOJAH_SECRET_KEY,
        Accept: 'application/json',
      },

      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    const status =
      error.response?.status || 500;

    const responseData =
      error.response?.data || null;

    console.error(
      'Dojah API error:',
      {
        status,
        data: responseData,
        message: error.message,
      }
    );

    const dojahError =
      new Error(
        responseData?.message ||
        responseData?.error ||
        'Dojah verification request failed'
      );

    dojahError.status = status;
    dojahError.response =
      responseData;

    throw dojahError;
  }
};

// ============================================================
// VERIFY BVN
// ============================================================
//
// Dojah Sandbox BVN endpoint:
//
// GET /api/v1/kyc/bvn?bvn=XXXXXXXXXXX
//
// ============================================================

const verifyBVN = async (bvn) => {
  if (!/^\d{11}$/.test(String(bvn))) {
    throw new Error(
      'BVN must contain exactly 11 digits'
    );
  }

  return dojahRequest({
    method: 'GET',

    url: '/api/v1/kyc/bvn',

    params: {
      bvn: String(bvn),
    },
  });
};

// ============================================================
// VERIFY NIN
// ============================================================
//
// Dojah NIN endpoint:
//
// GET /api/v1/kyc/nin?nin=XXXXXXXXXXX
//
// ============================================================

const verifyNIN = async (nin) => {
  if (!/^\d{11}$/.test(String(nin))) {
    throw new Error(
      'NIN must contain exactly 11 digits'
    );
  }

  return dojahRequest({
    method: 'GET',

    url: '/api/v1/kyc/nin',

    params: {
      nin: String(nin),
    },
  });
};

// ============================================================
// VERIFY VIRTUAL NIN
// ============================================================

const verifyVNIN = async (vnin) => {
  const value =
    String(vnin || '').trim();

  if (!value) {
    throw new Error(
      'vNIN is required'
    );
  }

  return dojahRequest({
    method: 'GET',

    url: '/api/v1/kyc/vnin',

    params: {
      vnin: value,
    },
  });
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  verifyBVN,
  verifyNIN,
  verifyVNIN,
};
