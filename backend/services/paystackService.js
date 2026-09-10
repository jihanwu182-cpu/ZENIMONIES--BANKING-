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


// ============================================================
// GET SUPPORTED BANKS
// ============================================================

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


// ============================================================
// RESOLVE NIGERIAN BANK ACCOUNT
// ============================================================

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


// ============================================================
// CREATE PAYSTACK CUSTOMER
// ============================================================

const createPaystackCustomer = async ({
  email,
  firstName,
  lastName,
  phone,
}) => {
  const response = await axios.post(
    `${PAYSTACK_BASE_URL}/customer`,
    {
      email,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      phone: phone || undefined,
    },
    {
      headers: getPaystackHeaders(),
    }
  );

  return response.data;
};


// ============================================================
// GET PAYSTACK CUSTOMER
// ============================================================

const getPaystackCustomer = async (
  customerCode
) => {
  const response = await axios.get(
    `${PAYSTACK_BASE_URL}/customer/${encodeURIComponent(
      customerCode
    )}`,
    {
      headers: getPaystackHeaders(),
    }
  );

  return response.data;
};


// ============================================================
// CREATE DEDICATED VIRTUAL ACCOUNT
//
// This is the permanent receiving account assigned to
// the customer by Paystack.
//
// IMPORTANT:
// The account number returned by Paystack is NOT generated
// by ZENIMONIES.
// ============================================================

const createDedicatedVirtualAccount = async ({
  customerCode,
  preferredBank,
}) => {
  if (!customerCode) {
    throw new Error(
      'Paystack customer code is required'
    );
  }

  const payload = {
    customer: customerCode,
  };

  if (preferredBank) {
    payload.preferred_bank = preferredBank;
  }

  const response = await axios.post(
    `${PAYSTACK_BASE_URL}/dedicated_account`,
    payload,
    {
      headers: getPaystackHeaders(),
    }
  );

  return response.data;
};


// ============================================================
// GET DEDICATED VIRTUAL ACCOUNT
// ============================================================

const getDedicatedVirtualAccount = async (
  dedicatedAccountId
) => {
  const response = await axios.get(
    `${PAYSTACK_BASE_URL}/dedicated_account/${encodeURIComponent(
      dedicatedAccountId
    )}`,
    {
      headers: getPaystackHeaders(),
    }
  );

  return response.data;
};


// ============================================================
// LIST CUSTOMER DEDICATED ACCOUNTS
// ============================================================

const getCustomerDedicatedAccounts = async (
  customerCode
) => {
  const response = await axios.get(
    `${PAYSTACK_BASE_URL}/dedicated_account`,
    {
      params: {
        customer: customerCode,
      },
      headers: getPaystackHeaders(),
    }
  );

  return response.data;
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getBanks,
  resolveBankAccount,

  createPaystackCustomer,
  getPaystackCustomer,

  createDedicatedVirtualAccount,
  getDedicatedVirtualAccount,
  getCustomerDedicatedAccounts,
};
