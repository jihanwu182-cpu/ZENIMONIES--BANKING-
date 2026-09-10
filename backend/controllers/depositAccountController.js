const pool = require('../config/database');

// ============================================================
// GET DEDICATED DEPOSIT ACCOUNT
// GET /api/deposits/account
//
// Requires:
// Authorization: Bearer YOUR_JWT_TOKEN
//
// IMPORTANT:
// This endpoint NEVER generates an account number.
// It only returns the real provider-issued account that
// was previously stored in deposit_accounts.
// ============================================================

const getDepositAccount = async (req, res) => {
  try {
    // ----------------------------------------------------------
    // AUTHENTICATED USER
    // ----------------------------------------------------------

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userId = req.user.id;

    // ----------------------------------------------------------
    // GET USER'S ACTIVE DEPOSIT ACCOUNT
    // ----------------------------------------------------------

    const result = await pool.query(
      `
      SELECT
        id,
        account_number,
        account_name,
        bank_name,
        bank_code,
        currency,
        status,
        provider,
        provider_customer_code,
        provider_account_id,
        created_at,
        updated_at
      FROM deposit_accounts
      WHERE user_id = $1
        AND status = 'active'
      ORDER BY created_at ASC
      LIMIT 1
      `,
      [userId]
    );

    // ----------------------------------------------------------
    // NO ACCOUNT FOUND
    // ----------------------------------------------------------

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          'Dedicated deposit account has not been activated yet',
      });
    }

    const depositAccount = result.rows[0];

    // ----------------------------------------------------------
    // RESPONSE
    // ----------------------------------------------------------

    return res.status(200).json({
      success: true,
      depositAccount,
    });

  } catch (error) {
    console.error(
      'GET DEPOSIT ACCOUNT ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve deposit account',
    });
  }
};


// ============================================================
// EXPORT
// ============================================================

module.exports = {
  getDepositAccount,
};
