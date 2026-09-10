const axios = require('axios');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// ============================================================
// PAYSTACK HEADERS
// ============================================================

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
// PAYSTACK ERROR HANDLER
// ============================================================

const getPaystackErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Paystack request failed'
  );
};

// ============================================================
// GET SUPPORTED BANKS
// ============================================================

const getBanks = async () => {
  try {
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
  } catch (error) {
    throw new Error(
      `Unable to retrieve Paystack banks: ${getPaystackErrorMessage(error)}`
    );
  }
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

  try {
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
  } catch (error) {
    throw new Error(
      `Unable to resolve bank account: ${getPaystackErrorMessage(error)}`
    );
  }
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

  if (!firstName) {
    throw new Error(
      'First name is required to create Paystack customer'
    );
  }

  if (!lastName) {
    throw new Error(
      'Last name is required to create Paystack customer'
    );
  }

  if (!phone) {
    throw new Error(
      'Phone number is required to create Paystack customer'
    );
  }

  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/customer`,
      {
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
      },
      {
        headers: getPaystackHeaders(),
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      `Unable to create Paystack customer: ${getPaystackErrorMessage(error)}`
    );
  }
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

  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/customer/${encodeURIComponent(
        customerCode
      )}`,
      {
        headers: getPaystackHeaders(),
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      `Unable to retrieve Paystack customer: ${getPaystackErrorMessage(error)}`
    );
  }
};

// ============================================================
// VALIDATE PAYSTACK CUSTOMER
//
// Required by Paystack for certain Nigerian business
// categories, including Financial Services.
//
// The customer's BVN and a bank account connected to
// that BVN are required for bank-account validation.
// ============================================================

const validatePaystackCustomer = async ({
  customerCode,
  bvn,
  accountNumber,
  bankCode,
}) => {
  if (!customerCode) {
    throw new Error(
      'Paystack customer code is required'
    );
  }

  if (!bvn) {
    throw new Error(
      'BVN is required to validate the Paystack customer'
    );
  }

  if (!accountNumber) {
    throw new Error(
      'Bank account number is required for Paystack customer validation'
    );
  }

  if (!bankCode) {
    throw new Error(
      'Bank code is required for Paystack customer validation'
    );
  }

  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/customer/${encodeURIComponent(
        customerCode
      )}/identification`,
      {
        country: 'NG',
        type: 'bank_account',
        account_number: accountNumber,
        bvn,
        bank_code: bankCode,
      },
      {
        headers: getPaystackHeaders(),
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      `Unable to validate Paystack customer: ${getPaystackErrorMessage(error)}`
    );
  }
};

// ============================================================
// CREATE DEDICATED VIRTUAL ACCOUNT
//
// IMPORTANT:
//
// ZENIMONIES DOES NOT GENERATE ACCOUNT NUMBERS.
//
// Paystack is the source of truth.
//
// The account number saved in the ZENIMONIES database must
// come directly from:
//
// paystackResponse.data.account_number
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

  // ----------------------------------------------------------
  // TEST MODE
  //
  // Paystack documents test-bank for Nigerian test DVAs.
  // ----------------------------------------------------------

  const isTestKey = String(
    process.env.PAYSTACK_SECRET_KEY || ''
  ).startsWith('sk_test_');

  if (preferredBank) {
    payload.preferred_bank = preferredBank;
  } else if (isTestKey) {
    payload.preferred_bank = 'test-bank';
  }

  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/dedicated_account`,
      payload,
      {
        headers: getPaystackHeaders(),
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      `Unable to create Paystack dedicated account: ${getPaystackErrorMessage(error)}`
    );
  }
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

  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/dedicated_account/${encodeURIComponent(
        dedicatedAccountId
      )}`,
      {
        headers: getPaystackHeaders(),
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      `Unable to retrieve dedicated account: ${getPaystackErrorMessage(error)}`
    );
  }
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

  try {
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
  } catch (error) {
    throw new Error(
      `Unable to retrieve customer dedicated accounts: ${getPaystackErrorMessage(error)}`
    );
  }
};

// ============================================================
// EXTRACT REAL PROVIDER ACCOUNT
//
// This function deliberately refuses to return an account
// unless Paystack supplied account_number.
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
      'Paystack did not return a real account number. No ZENIMONIES account number will be created.'
    );
  }

  return {
    providerAccountId:
      data.id
        ? String(data.id)
        : null,

    accountNumber:
      String(data.account_number),

    accountName:
      data.account_name || null,

    bankName:
      data.bank?.name ||
      null,

    bankCode:
      data.bank?.slug ||
      null,

    currency:
      data.currency ||
      'NGN',

    active:
      data.active === true,

    assigned:
      data.assigned === true,

    customerCode:
      data.customer?.customer_code ||
      null,
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
  validatePaystackCustomer,

  createDedicatedVirtualAccount,
  getDedicatedVirtualAccount,
  getCustomerDedicatedAccounts,

  extractDedicatedAccount,
};
