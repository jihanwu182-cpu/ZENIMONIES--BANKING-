const axios = require('axios');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

const getPaystackHeaders = () => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new Error(
      'PAYSTACK_SECRET_KEY is not configured'
    );
  }

  return {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
};

// Get supported banks
const getBanks = async () => {
  const response = await axios.get(
    `${PAYSTACK_BASE_URL}/bank`,
    {
      params: {
        country: 'nigeria',
        perPage: 100,
      },
      headers: getPaystackHeaders(),
    }
  );

  return response.data;
};

// Resolve Nigerian bank account
const resolveBankAccount = async (
  accountNumber,
  bankCode
) => {
  const response = await axios.get(
    `${PAYSTACK_BASE_URL}/bank/resolve`,
    {
      params: {
        account_number: accountNumber,
        bank_code: bankCode,
      },
      headers: getPaystackHeaders(),
    }
  );

  return response.data;
};

module.exports = {
  getBanks,
  resolveBankAccount,
};
