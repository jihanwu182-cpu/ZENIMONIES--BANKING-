

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

    // Retrieve the customer's existing account only.
    const existingResult = await pool.query(
      `SELECT id, account_number, currency, status
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

    // Already assigned: never call the provider or overwrite.
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

    // Retrieve the authenticated customer's phone number.
    const userResult = await pool.query(
      `SELECT phone
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );

    if (
      userResult.rows.length === 0 ||
      !userResult.rows[0].phone
    ) {
      return res.status(404).json({
        success: false,
        message: 'Customer phone number not found.',
      });
    }

    const phoneNumber = userResult.rows[0].phone;

    // Lookup provider account details.
    const providerResponse =
      await getPartnershipAccountDetails(phoneNumber);

    // NOTE: This extraction depends on ALAT's actual response contract
    // and still requires confirmation against the official documentation.
    const rawAccountNumber =
      providerResponse?.data?.accountNumber ??
      providerResponse?.accountNumber ??
      null;

    if (rawAccountNumber === null || rawAccountNumber === undefined) {
      return res.status(202).json({
        success: true,
        provisioned: false,
        message: 'Bank account provisioning is not yet complete.',
      });
    }

    // Validate before attempting database persistence.
    const accountNumber = String(rawAccountNumber).trim();

    if (!/^\d{10}$/.test(accountNumber)) {
      console.error(
        'ALAT returned an invalid account number format.'
      );

      return res.status(502).json({
        success: false,
        message: 'The bank returned an invalid account number.',
      });
    }

    // Persist to the existing account only.
    // The persistence service prevents overwrites and duplicates.
    const savedAccount = await saveProviderAccountNumber({
      userId,
      accountNumber,
    });

    if (!savedAccount?.success || !savedAccount.accountNumber) {
      return res.status(500).json({
        success: false,
        message: 'Unable to securely save bank account details.',
      });
    }

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
    // Do not expose raw provider response data or sensitive details.
    console.error(
      'ALAT account details request failed:',
      error?.code || 'UNKNOWN_ERROR'
    );

    if (error instanceof AccountOpeningError) {
      return res.status(400).json({
        success: false,
        message: 'Unable to process the bank account request.',
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
