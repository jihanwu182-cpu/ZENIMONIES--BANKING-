const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING
// ADMIN REVENUE CONTROLLER
//
// READ ONLY.
// Customer transaction principal is never company revenue.
// Reversal entries use signed amounts to cancel prior entries.
// Unknown costs remain unknown and are never assumed to be zero.
// ============================================================

const getRevenueSummary = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        currency,

        COUNT(*)::int AS total_entries,

        COUNT(*) FILTER (
          WHERE accounting_status = 'posted'
            AND entry_kind = 'original'
        )::int AS posted_original_entries,

        COUNT(*) FILTER (
          WHERE accounting_status = 'posted'
            AND entry_kind = 'reversal'
        )::int AS posted_reversal_entries,

        COUNT(*) FILTER (
          WHERE accounting_status = 'incomplete'
        )::int AS incomplete_entries,

        COALESCE(
          SUM(gross_fee) FILTER (
            WHERE accounting_status = 'posted'
          ), 0
        )::numeric(18,2) AS net_gross_fees,

        COALESCE(
          SUM(provider_cost) FILTER (
            WHERE accounting_status = 'posted'
          ), 0
        )::numeric(18,2) AS net_provider_costs,

        COALESCE(
          SUM(partner_share) FILTER (
            WHERE accounting_status = 'posted'
          ), 0
        )::numeric(18,2) AS net_partner_shares,

        COALESCE(
          SUM(other_direct_cost) FILTER (
            WHERE accounting_status = 'posted'
          ), 0
        )::numeric(18,2) AS net_other_direct_costs,

        COALESCE(
          SUM(zenimonies_revenue) FILTER (
            WHERE accounting_status = 'posted'
          ), 0
        )::numeric(18,2) AS net_zenimonies_revenue

      FROM revenue_ledger
      GROUP BY currency
      ORDER BY currency
    `);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(
      'Admin revenue summary error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load revenue summary.',
    });
  }
};

const getRevenueEntries = async (req, res) => {
  try {
    const limitValue = Number.parseInt(req.query.limit, 10);

    const limit = Number.isInteger(limitValue)
      ? Math.min(Math.max(limitValue, 1), 100)
      : 50;

    const offsetValue = Number.parseInt(req.query.offset, 10);

    const offset = Number.isInteger(offsetValue)
      ? Math.max(offsetValue, 0)
      : 0;

    const result = await pool.query(
      `
        SELECT
          id,
          revenue_reference,
          entry_kind,
          reversal_of_id,
          replaces_id,
          service_type,
          source_type,
          source_id,
          source_reference,
          customer_user_id,
          partner_id,
          partner_terms_id,
          currency,
          gross_fee,
          provider_cost,
          partner_share,
          other_direct_cost,
          zenimonies_revenue,
          accounting_status,
          transaction_status,
          description,
          reversal_reason,
          created_at,
          posted_at,
          reversed_at

        FROM revenue_ledger
        ORDER BY created_at DESC, id DESC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    return res.status(200).json({
      success: true,
      limit,
      offset,
      data: result.rows,
    });
  } catch (error) {
    console.error(
      'Admin revenue entries error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load revenue entries.',
    });
  }
};

module.exports = {
  getRevenueSummary,
  getRevenueEntries,
};
