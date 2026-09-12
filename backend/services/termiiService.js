const axios = require('axios');

const BASE_URL =
  process.env.TERMII_BASE_URL ||
  'https://api.ng.termii.com/api';

const API_KEY = process.env.TERMII_API_KEY;

// Convert phone number to international format.
const formatPhone = (phone) => {
  let number = String(phone || '').replace(/\s+/g, '');

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

const sendPhoneOtp = async ({ phone, otp }) => {
  if (!API_KEY) {
    throw new Error('TERMII_API_KEY is missing.');
  }

  const response = await axios.post(
    `${BASE_URL}/sms/send`,
    {
      api_key: API_KEY,
      to: formatPhone(phone),
      from: 'Zenimonies',
      sms: `Your Zenimonies verification code is ${otp}. It expires in 10 minutes. Do not share this code with anyone.`,
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
};

module.exports = {
  sendPhoneOtp,
  formatPhone,
};
