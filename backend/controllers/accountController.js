const pool = require('../config/database');

const getAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT
        id,
        account_number,
        account_type,
        currency,
        balance,
        status,
        created_at
       FROM accounts
       WHERE user_id = $1
       ORDER BY created_at ASC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    return res.status(200).json({
      success: true,
      account: result.rows[0],
    });
  } catch (error) {
    console.error('Get account error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve account',
    });
  }
};

const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT
        t.id,
        t.type,
        t.amount,
        t.currency,
        t.reference,
        t.description,
        t.status,
        t.created_at
       FROM transactions t
       INNER JOIN accounts a
         ON a.id = t.account_id
       WHERE a.user_id = $1
       ORDER BY t.created_at DESC
       LIMIT 100`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      transactions: result.rows,
    });
  } catch (error) {
    console.error('Get transactions error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve transactions',
    });
  }
};

module.exports = {
  getAccount,
  getTransactions,
};
