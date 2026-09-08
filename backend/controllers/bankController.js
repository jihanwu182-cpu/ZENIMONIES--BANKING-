const axios = require('axios');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

const getPaystackHeaders = () => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }

  return {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
  };
};

/*
 * GET SUPPORTED NIGERIAN BANKS
 *
 * This endpoint will retrieve the current bank list
 * from Paystack instead of maintaining a short hard-coded list.
 */
const getBanks = async (req, res) => {
  try {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(503).json({
        success: false,
        message:
          'Bank service is not configured yet. Paystack onboarding is required.',
        banks: [],
      });
    }

    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/bank`,
      {
        params: {
          country: 'nigeria',
          currency: 'NGN',
          perPage: 100,
        },
        headers: getPaystackHeaders(),
        timeout: 15000,
      }
    );

    const banks = Array.isArray(response.data?.data)
      ? response.data.data
          .filter(
            (bank) =>
              bank &&
              bank.active !== false &&
              bank.is_deleted !== true
          )
          .map((bank) => ({
            name: bank.name,
            code: bank.code,
            slug: bank.slug,
            active: bank.active,
            country: bank.country,
            currency: bank.currency,
            type: bank.type,
          }))
      : [];

    return res.status(200).json({
      success: true,
      banks,
      count: banks.length,
      meta: response.data?.meta || null,
    });
  } catch (error) {
    console.error(
      'GET BANKS ERROR:',
      error?.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load Nigerian banks',
      banks: [],
    });
  }
};

/*
 * RESOLVE BANK ACCOUNT
 *
 * This will be connected to Paystack's account-resolution
 * service when the Paystack credentials are available.
 */
const resolveBankAccount = async (req, res) => {
  try {
    const {
      account_number,
      bank_code,
    } = req.body;

    if (!account_number || !bank_code) {
      return res.status(400).json({
        success: false,
        message:
          'Account number and bank code are required',
      });
    }

    const cleanAccountNumber = String(
      account_number
    ).replace(/\D/g, '');

    if (cleanAccountNumber.length !== 10) {
      return res.status(400).json({
        success: false,
        message:
          'Account number must contain exactly 10 digits',
      });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(503).json({
        success: false,
        verified: false,
        message:
          'Account verification is not available yet. Paystack onboarding is required.',
      });
    }

    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/bank/resolve`,
      {
        params: {
          account_number: cleanAccountNumber,
          bank_code: String(bank_code),
        },
        headers: getPaystackHeaders(),
        timeout: 15000,
      }
    );

    const account = response.data?.data;

    if (!response.data?.status || !account) {
      return res.status(400).json({
        success: false,
        verified: false,
        message:
          'Unable to verify this bank account',
      });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      account: {
        account_number:
          account.account_number ||
          cleanAccountNumber,
        account_name:
          account.account_name || '',
      },
    });
  } catch (error) {
    console.error(
      'RESOLVE BANK ACCOUNT ERROR:',
      error?.response?.data || error.message
    );

    return res.status(400).json({
      success: false,
      verified: false,
      message:
        error?.response?.data?.message ||
        'Unable to verify bank account',
    });
  }
};

module.exports = {
  getBanks,
  resolveBankAccount,
};
