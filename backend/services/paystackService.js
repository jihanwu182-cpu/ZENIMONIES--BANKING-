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
    console.error(
      'Paystack get banks error:',
      error.response?.data || error.message
    );

    throw new Error(
      error.response?.data?.message ||
      'Unable to retrieve supported banks'
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
    console.error(
      'Paystack resolve bank account error:',
      error.response?.data || error.message
    );

    throw new Error(
      error.response?.data?.message ||
      'Unable to resolve bank account'
    );
  }
};


// ============================================================
// CREATE PAYSTACK CUSTOMER
// ============================================================
//
// Creates the customer on Paystack.
//
// IMPORTANT:
// This does NOT create a bank account number.
// Paystack customer creation and dedicated account
// creation are separate operations.
//
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

  try {
    const payload = {
      email,
    };

    if (firstName) {
      payload.first_name = firstName;
    }

    if (lastName) {
      payload.last_name = lastName;
    }

    if (phone) {
      payload.phone = phone;
    }

    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/customer`,
      payload,
      {
        headers: getPaystackHeaders(),
      }
    );

    if (
      !response.data ||
      !response.data.status ||
      !response.data.data
    ) {
      throw new Error(
        response.data?.message ||
        'Paystack customer creation failed'
      );
    }

    if (
      !response.data.data.customer_code
    ) {
      throw new Error(
        'Paystack customer code was not returned'
      );
    }

    return response.data;

  } catch (error) {
    console.error(
      'Paystack create customer error:',
      error.response?.data || error.message
    );

    throw new Error(
      error.response?.data?.message ||
      error.message ||
      'Unable to create Paystack customer'
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
    console.error(
      'Paystack get customer error:',
      error.response?.data || error.message
    );

    throw new Error(
      error.response?.data?.message ||
      'Unable to retrieve Paystack customer'
    );
  }
};


// ============================================================
// CREATE DEDICATED VIRTUAL ACCOUNT
// ============================================================
//
// IMPORTANT:
//
// ZENIMONIES DOES NOT GENERATE ACCOUNT NUMBERS.
//
// This function asks Paystack to create/assign a dedicated
// receiving account for the Paystack customer.
//
// The account number returned by Paystack is the ONLY account
// number that should be stored as the customer's receiving
// account.
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

  try {
    const payload = {
      customer: customerCode,
    };

    // Optional Paystack preferred bank.
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

    if (
      !response.data ||
      !response.data.status ||
      !response.data.data
    ) {
      throw new Error(
        response.data?.message ||
        'Paystack dedicated account creation failed'
      );
    }

    // --------------------------------------------------------
    // CRITICAL SAFETY CHECK
    // --------------------------------------------------------
    //
    // Never allow registration to continue if Paystack did
    // not return a real account number.
    //

    if (
      !response.data.data.account_number
    ) {
      throw new Error(
        'Paystack did not return a real dedicated account number'
      );
    }

    return response.data;

  } catch (error) {
    console.error(
      'Paystack dedicated account error:',
      error.response?.data || error.message
    );

    throw new Error(
      error.response?.data?.message ||
      error.message ||
      'Unable to create Paystack dedicated account'
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
    console.error(
      'Paystack get dedicated account error:',
      error.response?.data || error.message
    );

    throw new Error(
      error.response?.data?.message ||
      'Unable to retrieve dedicated account'
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
    console.error(
      'Paystack list dedicated accounts error:',
      error.response?.data || error.message
    );

    throw new Error(
      error.response?.data?.message ||
      'Unable to retrieve customer dedicated accounts'
    );
  }
};


// ============================================================
// EXTRACT PROVIDER-ISSUED ACCOUNT
// ============================================================
//
// This function takes the Paystack response and extracts
// ONLY provider-issued account information.
//
// There is NO account-number generation here.
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

  // ----------------------------------------------------------
  // ACCOUNT NUMBER MUST COME FROM PAYSTACK
  // ----------------------------------------------------------

  if (!data.account_number) {
    throw new Error(
      'Paystack did not return an account number'
    );
  }

  return {
    providerAccountId:
      data.id
        ? String(data.id)
        : null,

    accountNumber:
      data.account_number,

    accountName:
      data.account_name || null,

    bankName:
      data.bank?.name ||
      data.bank_name ||
      null,

    bankCode:
      data.bank?.id
        ? String(data.bank.id)
        : data.bank_code
          ? String(data.bank_code)
          : null,

    currency:
      data.currency ||
      'NGN',

    active:
      data.active,

    assigned:
      data.assigned,

    customerCode:
      data.customer?.customer_code ||
      null,
  };
};


// ============================================================
// CREATE OR GET CUSTOMER DEDICATED ACCOUNT
// ============================================================
//
// This helper is useful if registration is retried.
//
// First we ask Paystack whether the customer already has a
// dedicated account.
//
// If one exists, we return the existing provider-issued
// account instead of creating another one.
//
// If none exists, we ask Paystack to create one.
//
// ============================================================

const getOrCreateDedicatedVirtualAccount = async ({
  customerCode,
  preferredBank,
}) => {
  if (!customerCode) {
    throw new Error(
      'Paystack customer code is required'
    );
  }

  // ----------------------------------------------------------
  // CHECK EXISTING PAYSTACK DEDICATED ACCOUNTS
  // ----------------------------------------------------------

  const existingResponse =
    await getCustomerDedicatedAccounts(
      customerCode
    );

  if (
    existingResponse?.status &&
    Array.isArray(existingResponse.data) &&
    existingResponse.data.length > 0
  ) {
    const activeAccount =
      existingResponse.data.find(
        (account) =>
          account &&
          account.account_number &&
          (
            account.active === true ||
            account.assigned === true
          )
      );

    const account =
      activeAccount ||
      existingResponse.data.find(
        (item) =>
          item &&
          item.account_number
      );

    if (account) {
      return {
        status: true,
        message:
          'Existing Paystack dedicated account found',
        data: account,
      };
    }
  }

  // ----------------------------------------------------------
  // CREATE NEW PROVIDER ACCOUNT
  // ----------------------------------------------------------

  return createDedicatedVirtualAccount({
    customerCode,
    preferredBank,
  });
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

  getOrCreateDedicatedVirtualAccount,

  extractDedicatedAccount,
};
