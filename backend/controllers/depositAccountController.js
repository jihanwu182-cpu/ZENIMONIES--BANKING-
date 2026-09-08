const pool = require('../config/database');

/*
 * Get the logged-in user's dedicated deposit account.
 *
 * This endpoint does NOT create or invent an account number.
 * It only returns an account that has already been created
 * and stored in the deposit_accounts table.
 */
const getDepositAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT
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
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          'Dedicated deposit account has not been activated yet',
      });
    }

    return res.status(200).json({
      success: true,
      depositAccount: result.rows[0],
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

module.exports = {
  getDepositAccount,
};
