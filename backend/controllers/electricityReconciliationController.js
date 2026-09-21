const pool = require('../config/database');

// ============================================================
// ELECTRICITY RECONCILIATION — READ ONLY
// ============================================================
// This endpoint ONLY reads existing electricity payments.
// It does NOT:
// - debit money
// - refund money
// - create a payment
// - change payment status
// - call the Sogo purchase endpoint
// ============================================================

const getElectricityReconciliation = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const result = await pool.query(
      `
      SELECT
        bp.id,
        bp.reference,
        bp.biller_name,
        bp.category,
        bp.customer_reference,
        bp.customer_name,
        bp.amount,
        bp.currency,
        bp.status,
        bp.provider_reference,
        bp.provider_request_id,
        bp.failure_reason,
        bp.meter_type,
        bp.meter_number,
        bp.verification_status,
        bp.verified_customer_name,
        bp.verified_customer_address,
        bp.electricity_token,
        bp.units,
        bp.tariff_class,
        bp.provider_response_message,
        bp.provider_response,
        bp.created_at,
        bp.completed_at
      FROM bill_payments bp
      INNER JOIN accounts a
        ON a.id = bp.account_id
      WHERE a.user_id = $1
        AND bp.category = 'electricity'
      ORDER BY bp.created_at DESC
      LIMIT 20
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      payments: result.rows,
    });
  } catch (error) {
    console.error(
      'Electricity reconciliation read error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load electricity reconciliation data.',
    });
  }
};

module.exports = {
  getElectricityReconciliation,
};
