
const pool = require('../config/database');

const {
  prepareRevenueApproval: prepareApproval,
  decideRevenueApproval: decideApproval,
  postRevenueEntry: postEntry,
} = require('../services/revenueService');

// ============================================================
// ZENIMONIES BANKING — ADMIN REVENUE CONTROLLER
// All routes must be protected by adminMiddleware.
// Actor IDs come only from the authenticated req.userId.
// ============================================================

function sendError(res, error, action) {
  console.error(`Admin revenue ${action} error:`, error.message);

  const knownErrors = [
    'was not found',
    'required',
    'must be',
    'cannot',
    'Only ',
    'All accounting amounts',
    'The entry ',
    'This entry ',
    'This request ',
    'A separate administrator',
    'A rejection reason',
    'Decision must',
    'Invalid ',
    'Direct posting is disabled',
    'Posted entries',
    'Unable to calculate',
    'Could not save',
    'Revenue entry could not',
  ];

  const isValidationError = knownErrors.some(
    (message) => error.message.startsWith(message)
  );

  return res.status(isValidationError ? 400 : 500).json({
    success: false,
    message: isValidationError
      ? error.message
      : `Unable to ${action}.`,
  });
}

// GET /api/admin/revenue/summary
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
    return sendError(res, error, 'load revenue summary');
  }
};

// GET /api/admin/revenue/entries
const getRevenueEntries = async (req, res) => {
  try {
    const limitValue = Number.parseInt(req.query.limit, 10);
    const offsetValue = Number.parseInt(req.query.offset, 10);

    const limit = Number.isInteger(limitValue)
      ? Math.min(Math.max(limitValue, 1), 100)
      : 50;

    const offset = Number.isInteger(offsetValue)
      ? Math.max(offsetValue, 0)
      : 0;

    const result = await pool.query(
      `SELECT
         id, revenue_reference, entry_kind,
         reversal_of_id, replaces_id,
         service_type, source_type, source_id,
         source_reference, customer_user_id,
         partner_id, partner_terms_id, currency,
         gross_fee, provider_cost, partner_share,
         other_direct_cost, zenimonies_revenue,
         accounting_status, transaction_status,
         description, reversal_reason, created_at, posted_at
       FROM revenue_ledger
       ORDER BY created_at DESC, id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return res.status(200).json({
      success: true,
      limit,
      offset,
      data: result.rows,
    });
  } catch (error) {
    return sendError(res, error, 'load revenue entries');
  }
};

// GET /api/admin/revenue/approvals/pending
const getPendingRevenueApprovals = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         a.id AS approval_id,
         a.revenue_ledger_id,
         a.prepared_by,
         a.status,
         a.gross_fee,
         a.provider_cost,
         a.partner_share,
         a.other_direct_cost,
         a.zenimonies_revenue,
         a.prepared_at,
         l.revenue_reference,
         l.service_type,
         l.source_type,
         l.source_reference,
         l.currency,
         l.transaction_status,
         l.accounting_status
       FROM revenue_ledger_approvals a
       JOIN revenue_ledger l
         ON l.id = a.revenue_ledger_id
       WHERE a.status = 'pending'
       ORDER BY a.prepared_at ASC
       LIMIT 100`
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    return sendError(res, error, 'load pending approvals');
  }
};

// POST /api/admin/revenue/entries/:id/prepare-approval
const prepareRevenueApproval = async (req, res) => {
  try {
    const approval = await prepareApproval({
      entryId: req.params.id,
      preparedBy: req.userId,
    });

    return res.status(201).json({
      success: true,
      message: 'Revenue entry submitted for independent approval.',
      data: approval,
    });
  } catch (error) {
    return sendError(res, error, 'prepare approval');
  }
};

// PATCH /api/admin/revenue/approvals/:id/decision
const decideRevenueApproval = async (req, res) => {
  try {
    const decision = req.body?.decision;
    const reason = req.body?.reason;

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Decision must be approved or rejected.',
      });
    }

    const approval = await decideApproval({
      approvalId: req.params.id,
      approvedBy: req.userId,
      decision,
      reason,
    });

    return res.status(200).json({
      success: true,
      message: `Revenue approval ${decision}.`,
      data: approval,
    });
  } catch (error) {
    return sendError(res, error, 'decide approval');
  }
};

// POST /api/admin/revenue/entries/:id/post
const postRevenueEntry = async (req, res) => {
  try {
    const entry = await postEntry({
      entryId: req.params.id,
      recordedBy: req.userId,
    });

    return res.status(200).json({
      success: true,
      message: 'Approved revenue entry posted.',
      data: entry,
    });
  } catch (error) {
    return sendError(res, error, 'post revenue entry');
  }
};

module.exports = {
  getRevenueSummary,
  getRevenueEntries,
  getPendingRevenueApprovals,
  prepareRevenueApproval,
  decideRevenueApproval,
  postRevenueEntry,
};
