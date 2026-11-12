
const axios = require('axios');

const BASE_URL =
  (
    process.env.TERMII_BASE_URL ||
    'https://api.ng.termii.com/api'
  ).replace(/\/+$/, '');

const API_KEY = process.env.TERMII_API_KEY;

// ============================================================
// PHONE NUMBER FORMAT
// ============================================================

const formatPhone = (phone) => {
  let number = String(phone || '')
    .trim()
    .replace(/\s+/g, '');

  if (number.startsWith('+')) {
    return number;
  }

  if (number.startsWith('0')) {
    return `+234${number.substring(1)}`;
  }

  if (number.startsWith('234')) {
    return `+${number}`;
  }

  return number;
};

// ============================================================
// SAFE TERMII ERROR LOGGING
// Never log API keys, OTPs or complete request payloads.
// ============================================================

const logTermiiError = (error) => {
  const response = error.response;

  if (response) {
    const data = response.data || {};

    const safeDetails = {
      http_status: response.status,
      error_code:
        data.code ||
        data.error_code ||
        null,
      message:
        data.message ||
        data.error ||
        data.detail ||
        null,
      errors:
        data.errors ||
        null,
    };

    console.error(
      'Termii SMS API rejected request:',
      JSON.stringify(safeDetails).slice(0, 3000)
    );

    return;
  }

  console.error('Termii SMS connection error:', {
    code: error.code || null,
    message: error.message || 'Unknown connection error',
  });
};

// ============================================================
// SEND PHONE OTP
// ============================================================

const sendPhoneOtp = async ({ phone, otp }) => {
  if (!API_KEY) {
    throw new Error('TERMII_API_KEY is missing.');
  }

  if (!phone || !otp) {
    throw new Error(
      'Phone number and OTP are required.'
    );
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/sms/send`,
      {
        api_key: API_KEY,
        to: formatPhone(phone),
        from: 'Zenimonies',
        sms:
          `Your Zenimonies verification code is ${otp}. ` +
          'It expires in 10 minutes. Do not share this code with anyone.',
        type: 'plain',
        channel: 'generic',
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return response.data;

  } catch (error) {
    logTermiiError(error);

    throw new Error(
      'Termii could not process the phone verification SMS.'
    );
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  sendPhoneOtp,
  formatPhone,
};
