const axios = require('axios');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

const getSecretKey = () => {
  const key = process.env.PAYSTACK_SECRET_KEY;

  if (!key) {
    throw new Error(
      'PAYSTACK_SECRET_KEY is not configured'
    );
  }

  return key;
};

const paystackRequest = async (
  method,
  url,
  data = undefined,
  params = undefined
) => {
  const response = await axios({
    method,
    url: `${PAYSTACK_BASE_URL}${url}`,
    data,
    params,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });

  return response.data;
};


// ============================================================
// GET NIGERIAN BANKS
// ============================================================

const getNigerianBanks = async () => {
  return paystackRequest(
    'GET',
    '/bank',
    undefined,
    {
      country: 'nigeria',
      perPage: 100,
      use_cursor: false,
    }
  );
};


// ============================================================
// RESOLVE NIGERIAN BANK ACCOUNT
// ============================================================

const resolveBankAccount = async (
  accountNumber,
  bankCode
) => {
  return paystackRequest(
    'GET',
    '/bank/resolve',
    undefined,
    {
      account_number: accountNumber,
      bank_code: bankCode,
    }
  );
};


// ============================================================
// CREATE TRANSFER RECIPIENT
// ============================================================

const createTransferRecipient = async ({
  name,
  accountNumber,
  bankCode,
  currency = 'NGN',
}) => {
  return paystackRequest(
    'POST',
    '/transferrecipient',
    {
      type: 'nuban',
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency,
    }
  );
};


// ============================================================
// INITIATE TRANSFER
// ============================================================

const initiateTransfer = async ({
  amount,
  recipient,
  reference,
  reason,
}) => {
  return paystackRequest(
    'POST',
    '/transfer',
    {
      source: 'balance',
      amount: Math.round(Number(amount) * 100),
      recipient,
      reference,
      reason,
      currency: 'NGN',
    }
  );
};


// ============================================================
// VERIFY TRANSFER
// ============================================================

const verifyTransfer = async (reference) => {
  return paystackRequest(
    'GET',
    `/transfer/verify/${encodeURIComponent(reference)}`
  );
};


module.exports = {
  getNigerianBanks,
  resolveBankAccount,
  createTransferRecipient,
  initiateTransfer,
  verifyTransfer,
};
