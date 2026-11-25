
const pool = require('../config/database');

// ============================================================
// ZENIMONIES — ELECTRICITY RECONCILIATION
//
// - Read-only transaction history.
// - Returns the latest 20 electricity payments.
// - Only returns transactions belonging to the authenticated user.
// - Does not initiate provider requests.
// - Does not debit or refund customer wallets.
// ============================================================

const getElectricityReconciliation = async (req, res) => {
  const userId =
    req.user?.id ||
    req.user?.user_id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        bp.id,
        bp.reference,
        bp.amount,
        bp.currency,
        bp.status,
        bp.provider_request_id,
        bp.provider_reference,
        bp.provider_response_message,
        bp.electricity_token,
        bp.units,
        bp.meter_number,
        bp.meter_type,
        bp.created_at,
        bp.completed_at
      FROM bill_payments bp
      INNER JOIN accounts a
        ON a.id = bp.account_id
      WHERE
        a.user_id = $1
        AND LOWER(bp.category) = 'electricity'
      ORDER BY bp.created_at DESC
      LIMIT 20
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      transactions: result.rows,
    });
  } catch (error) {
    console.error(
      'Electricity reconciliation history error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve electricity transaction history.',
    });
  }
};

module.exports = {
  getElectricityReconciliation,
};
