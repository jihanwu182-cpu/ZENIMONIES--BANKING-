const axios = require('axios');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// ============================================================
// PAYSTACK HEADERS
// ============================================================

const getPaystackHeaders = () => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
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
// RESOLVE BANK ACCOUNT
// ============================================================

const resolveBankAccount = async (
  accountNumber,
  bankCode
) => {
  if (!accountNumber || !bankCode) {
    throw new Error(
      'Account number and bank code are required'
    );
  }

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
  if (!email) {
    throw new Error(
      'Email is required to create Paystack customer'
    );
  }

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
  if (!customerCode) {
    throw new Error(
      'Paystack customer code is required'
    );
  }

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
// IMPORTANT:
// ZENIMONIES DOES NOT GENERATE THE ACCOUNT NUMBER.
//
// Paystack generates/issues the receiving account number.
// The returned account_number becomes the customer's
// ZENIMONIES receiving account number.
//
// Example Paystack response:
//
// data: {
//   id: 123,
//   account_name: "...",
//   account_number: "9930000737",
//   bank: {
//     name: "Paystack-Titan"
//   },
//   currency: "NGN"
// }
//
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
  if (!dedicatedAccountId) {
    throw new Error(
      'Dedicated account ID is required'
    );
  }

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
  if (!customerCode) {
    throw new Error(
      'Paystack customer code is required'
    );
  }

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
// EXTRACT PROVIDER-ISSUED ACCOUNT
//
// This helper prevents us from accidentally treating a
// locally generated account number as the real receiving
// account.
//
// ============================================================

const extractDedicatedAccount = (
  paystackResponse
) => {
  const data =
    paystackResponse?.data;

  if (!data) {
    throw new Error(
      'Paystack did not return dedicated account data'
    );
  }

  if (!data.account_number) {
    throw new Error(
      'Paystack did not return an account number'
    );
  }

  return {
    providerAccountId:
      data.id,

    accountNumber:
      data.account_number,

    accountName:
      data.account_name,

    bankName:
      data.bank?.name || null,

    bankCode:
      data.bank?.slug || null,

    currency:
      data.currency || 'NGN',

    active:
      data.active,

    assigned:
      data.assigned,

    customerCode:
      data.customer?.customer_code || null,
  };
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

  extractDedicatedAccount,
};
