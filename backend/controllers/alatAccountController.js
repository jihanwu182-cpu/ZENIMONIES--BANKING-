
const {
  getPartnershipAccountDetails,
  saveProviderAccountNumber,
  AccountOpeningError,
} = require('../services/alat/accountOpeningService');

const pool = require('../config/database');

// ============================================================
// ZENIMONIES — ALAT ACCOUNT CONTROLLER
// ============================================================

// ------------------------------------------------------------
// GET CUSTOMER'S ALAT ACCOUNT DETAILS
// ------------------------------------------------------------

const getAlatAccountDetails = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // Retrieve the customer's existing account.
    const existingResult = await pool.query(
      `SELECT account_number, currency, status
       FROM accounts
       WHERE user_id = $1
       ORDER BY id
       LIMIT 1`,
      [userId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer account not found.',
      });
    }

    const existingAccount = existingResult.rows[0];

    // If already provisioned, do not make another ALAT request.
    if (existingAccount.account_number) {
      return res.status(200).json({
        success: true,
        provisioned: true,
        account: {
          accountNumber: existingAccount.account_number,
          currency: existingAccount.currency,
          status: existingAccount.status,
        },
      });
    }

    // Fetch customer details needed for provider lookup.
    const userResult = await pool.query(
      `SELECT phone
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].phone) {
      return res.status(404).json({
        success: false,
        message: 'Customer phone number not found.',
      });
    }

    const phoneNumber = userResult.rows[0].phone;

    // Retrieve bank account details from ALAT.
    const providerResponse =
      await getPartnershipAccountDetails(phoneNumber);

    // Safely extract account number from provider response.
    const accountNumber =
      providerResponse?.data?.accountNumber ||
      providerResponse?.accountNumber;

    if (!accountNumber) {
      return res.status(202).json({
        success: true,
        provisioned: false,
        message: 'Bank account provisioning is not yet complete.',
      });
    }

    // Save the bank-issued number to the existing customer account.
    const savedAccount = await saveProviderAccountNumber({
      userId,
      accountNumber: String(accountNumber),
    });

    return res.status(200).json({
      success: true,
      provisioned: true,
      account: {
        accountNumber: savedAccount.accountNumber,
        currency: existingAccount.currency,
        status: existingAccount.status,
      },
    });
  } catch (error) {
    console.error('ALAT account details error:', error.message);

    if (error instanceof AccountOpeningError) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve bank account details.',
    });
  }
};

module.exports = {
  getAlatAccountDetails,
};
