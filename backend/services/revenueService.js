const pool = require('../config/database');
const crypto = require('crypto');

// ============================================================
// ZENIMONIES BANKING
// REVENUE ACCOUNTING SERVICE
//
// Accounting only. Never moves customer funds.
// Posted entries require independent administrator approval.
// Reversals are created ready and posted only after approval.
// ============================================================

const MONEY_PATTERN = /^\d{1,16}(\.\d{1,2})?$/;

const ALLOWED_SOURCES = new Set([
  'transfer',
  'airtime',
  'data',
  'bill_payment',
  'pos',
  'other',
]);

const ALLOWED_SERVICES = new Set([
  'transfer',
  'airtime',
  'data',
  'electricity',
  'internet',
  'tv',
  'pos',
  'other',
]);

const ALLOWED_TRANSACTION_STATUSES = new Set([
  'pending',
  'completed',
  'failed',
  'reversed',
  'refunded',
]);

function requiredText(value, field, maxLength = 150) {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.trim().length > maxLength
  ) {
    throw new Error(`Invalid ${field}.`);
  }

  return value.trim();
}

function optionalUuid(value, field) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  ) {
    throw new Error(`Invalid ${field}.`);
  }

  return value;
}

function money(value, field, allowNull = false) {
  if (value === null || value === undefined || value === '') {
    if (allowNull) return null;
    throw new Error(`${field} is required.`);
  }

  const stringValue = String(value);

  if (!MONEY_PATTERN.test(stringValue)) {
    throw new Error(`Invalid ${field}.`);
  }

  const amount = Number(stringValue);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${field} cannot be negative.`);
  }

  return amount.toFixed(2);
}

function calculateZenimoniesRevenue({
  grossFee,
  providerCost,
  partnerShare,
  otherDirectCost,
}) {
  if (
    grossFee == null ||
    providerCost == null ||
    partnerShare == null ||
    otherDirectCost == null
  ) {
    return null;
  }

  return (
    Number(grossFee) -
    Number(providerCost) -
    Number(partnerShare) -
    Number(otherDirectCost)
  ).toFixed(2);
}

function assertActor(actorId, field = 'administrator') {
  const id = optionalUuid(actorId, field);

  if (!id) {
    throw new Error(`${field} is required.`);
  }

  return id;
}

function assertCompleteAccounting(entry) {
  const fields = [
    'gross_fee',
    'provider_cost',
    'partner_share',
    'other_direct_cost',
    'zenimonies_revenue',
  ];

  for (const field of fields) {
    if (entry[field] === null || entry[field] === undefined) {
      throw new Error('All accounting amounts are required.');
    }
  }

  const calculated = calculateZenimoniesRevenue({
    grossFee: entry.gross_fee,
    providerCost: entry.provider_cost,
    partnerShare: entry.partner_share,
    otherDirectCost: entry.other_direct_cost,
  });

  if (calculated !== Number(entry.zenimonies_revenue).toFixed(2)) {
    throw new Error('Unable to calculate consistent revenue.');
  }
}

function assertTransactionStatus(status) {
  if (!ALLOWED_TRANSACTION_STATUSES.has(status)) {
    throw new Error('Invalid transaction status.');
  }
}

function assertEntryType(entry) {
  if (!entry || !['original', 'reversal'].includes(entry.entry_kind)) {
    throw new Error('The entry was not found.');
  }
}

// ============================================================
// CREATE ORIGINAL ENTRY
//
// Entries cannot be created directly as posted or as reversals.
// ============================================================

async function createRevenueEntry(input = {}, options = {}) {
  if (input.entryKind === 'reversal') {
    throw new Error(
      'Use the dedicated reversal workflow to create a reversal.'
    );
  }

  if (
    input.accountingStatus &&
    input.accountingStatus !== 'incomplete'
  ) {
    throw new Error(
      'New revenue entries must start incomplete.'
    );
  }

  const serviceType = requiredText(
    input.serviceType,
    'serviceType',
    60
  );

  const sourceType = requiredText(
    input.sourceType,
    'sourceType',
    60
  );

  if (!ALLOWED_SERVICES.has(serviceType)) {
    throw new Error('Unsupported service type.');
  }

  if (!ALLOWED_SOURCES.has(sourceType)) {
    throw new Error('Unsupported source type.');
  }

  const transactionStatus = input.transactionStatus || 'pending';
  assertTransactionStatus(transactionStatus);

  const actorId = optionalUuid(input.recordedBy, 'recordedBy');

  const grossFee = money(input.grossFee ?? '0.00', 'grossFee');

  const providerCost = money(
    input.providerCost,
    'providerCost',
    true
  );

  const partnerShare = money(
    input.partnerShare,
    'partnerShare',
    true
  );

  const otherDirectCost = money(
    input.otherDirectCost,
    'otherDirectCost',
    true
  );

  const revenue = calculateZenimoniesRevenue({
    grossFee,
    providerCost,
    partnerShare,
    otherDirectCost,
  });

  const client = options.client || (await pool.connect());
  const ownsClient = !options.client;

  try {
    if (ownsClient) await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO revenue_ledger (
        revenue_reference,
        entry_kind,
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
        recorded_by
      )
      VALUES (
        $1, 'original', $2, $3, $4, $5, $6, $7, $8,
        'NGN', $9, $10, $11, $12, $13,
        'incomplete', $14, $15, $16
      )
      RETURNING *`,
      [
        input.revenueReference || `REV-${crypto.randomUUID()}`,
        serviceType,
        sourceType,
        optionalUuid(input.sourceId, 'sourceId'),
        input.sourceReference
          ? requiredText(input.sourceReference, 'sourceReference')
          : null,
        optionalUuid(input.customerUserId, 'customerUserId'),
        optionalUuid(input.partnerId, 'partnerId'),
        optionalUuid(input.partnerTermsId, 'partnerTermsId'),
        grossFee,
        providerCost,
        partnerShare,
        otherDirectCost,
        revenue,
        transactionStatus,
        input.description
          ? requiredText(input.description, 'description', 1000)
          : null,
        actorId,
      ]
    );

    if (ownsClient) await client.query('COMMIT');

    return result.rows[0];
  } catch (error) {
    if (ownsClient) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    if (ownsClient) client.release();
  }
}

// ============================================================
// PREPARE ORIGINAL ENTRY FOR INDEPENDENT APPROVAL
// ============================================================

async function prepareRevenueApproval({ entryId, preparedBy }) {
  const id = assertActor(entryId, 'entryId');
  const preparer = assertActor(preparedBy, 'preparedBy');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT *
       FROM revenue_ledger
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (!result.rowCount) {
      throw new Error('Revenue entry was not found.');
    }

    const entry = result.rows[0];
    assertEntryType(entry);

    if (entry.accounting_status !== 'ready') {
      throw new Error('Only ready entries can be submitted for approval.');
    }

    if (
      entry.entry_kind === 'original' &&
      entry.transaction_status !== 'completed'
    ) {
      throw new Error(
        'Only completed transactions can be submitted for approval.'
      );
    }

    assertCompleteAccounting(entry);

    const existing = await client.query(
      `SELECT id
       FROM revenue_ledger_approvals
       WHERE revenue_ledger_id = $1
         AND status = 'pending'
       LIMIT 1`,
      [id]
    );

    if (existing.rowCount) {
      throw new Error('This entry already has a pending approval.');
    }

    const approval = await client.query(
      `INSERT INTO revenue_ledger_approvals (
        revenue_ledger_id,
        prepared_by,
        status,
        gross_fee,
        provider_cost,
        partner_share,
        other_direct_cost,
        zenimonies_revenue
      )
      VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        id,
        preparer,
        entry.gross_fee,
        entry.provider_cost,
        entry.partner_share,
        entry.other_direct_cost,
        entry.zenimonies_revenue,
      ]
    );

    await client.query('COMMIT');
    return approval.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// APPROVE OR REJECT
// ============================================================

async function decideRevenueApproval({
  approvalId,
  approvedBy,
  decision,
  reason,
}) {
  const id = assertActor(approvalId, 'approvalId');
  const approver = assertActor(approvedBy, 'approvedBy');

  if (!['approved', 'rejected'].includes(decision)) {
    throw new Error('Decision must be approved or rejected.');
  }

  const decisionReason =
    typeof reason === 'string' ? requiredText(reason, 'reason', 1000) : null;

  if (decision === 'rejected' && !decisionReason) {
    throw new Error('A rejection reason is required.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT a.*, l.accounting_status, l.entry_kind,
              l.transaction_status, l.gross_fee AS current_gross_fee,
              l.provider_cost AS current_provider_cost,
              l.partner_share AS current_partner_share,
              l.other_direct_cost AS current_other_direct_cost,
              l.zenimonies_revenue AS current_revenue
       FROM revenue_ledger_approvals a
       JOIN revenue_ledger l ON l.id = a.revenue_ledger_id
       WHERE a.id = $1
       FOR UPDATE OF a, l`,
      [id]
    );

    if (!result.rowCount) {
      throw new Error('Revenue approval was not found.');
    }

    const approval = result.rows[0];

    if (approval.status !== 'pending') {
      throw new Error('This approval has already been decided.');
    }

    if (approval.prepared_by === approver) {
      throw new Error(
        'A separate administrator must decide this approval.'
      );
    }

    if (approval.accounting_status !== 'ready') {
      throw new Error('The entry is no longer ready for approval.');
    }

    const matches =
      Number(approval.gross_fee) === Number(approval.current_gross_fee) &&
      Number(approval.provider_cost) === Number(approval.current_provider_cost) &&
      Number(approval.partner_share) === Number(approval.current_partner_share) &&
      Number(approval.other_direct_cost) === Number(approval.current_other_direct_cost) &&
      Number(approval.zenimonies_revenue) === Number(approval.current_revenue);

    if (!matches) {
      throw new Error(
        'Accounting amounts changed. Prepare a new approval request.'
      );
    }

    // Record the decision. The database trigger must permit this
    // one controlled transition from pending to approved/rejected.
    const updated = await client.query(
      `UPDATE revenue_ledger_approvals
       SET status = $2,
           approved_by = $3,
           decided_at = CURRENT_TIMESTAMP,
           decision_reason = $4
       WHERE id = $1
         AND status = 'pending'
       RETURNING *`,
      [id, decision, approver, decisionReason]
    );

    if (!updated.rowCount) {
      throw new Error('The approval decision could not be recorded.');
    }

    // Record the approval decision using the actual audit table schema.
    await client.query(
      `INSERT INTO revenue_audit_events
         (
           actor_user_id,
           event_type,
           entity_type,
           entity_id,
           reason,
           metadata,
           created_at
         )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, CURRENT_TIMESTAMP)`,
      [
        approver,
        decision === 'approved'
          ? 'revenue_approval_approved'
          : 'revenue_approval_rejected',
        'revenue_ledger_approval',
        id,
        decisionReason,
        JSON.stringify({
          revenue_ledger_id: approval.revenue_ledger_id,
          prepared_by: approval.prepared_by,
          decision,
        }),
      ]
    );


    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
// ============================================================
// MARK AN ORIGINAL ENTRY READY
// ============================================================

async function markRevenueEntryReady({
  entryId,
  providerCost,
  partnerShare,
  otherDirectCost,
}) {
  const id = assertActor(entryId, 'entryId');
  const client = await pool.connect();

  const costs = {
    providerCost: money(providerCost, 'providerCost'),
    partnerShare: money(partnerShare, 'partnerShare'),
    otherDirectCost: money(otherDirectCost, 'otherDirectCost'),
  };

  try {
    await client.query('BEGIN');

    const current = await client.query(
      `SELECT *
       FROM revenue_ledger
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (!current.rowCount) {
      throw new Error('Revenue entry was not found.');
    }

    const entry = current.rows[0];

    if (entry.entry_kind !== 'original') {
      throw new Error('Only original entries can be prepared this way.');
    }

    if (entry.accounting_status === 'posted') {
      throw new Error('Posted entries cannot be modified.');
    }

    if (entry.transaction_status !== 'completed') {
      throw new Error(
        'Only completed transactions can be prepared for posting.'
      );
    }
   const pendingApproval = await client.query(
  `SELECT id
   FROM revenue_ledger_approvals
   WHERE revenue_ledger_id = $1
     AND status = 'pending'
   LIMIT 1`,
  [id]
);

if (pendingApproval.rowCount > 0) {
  throw new Error(
    'A pending approval exists. Resolve it before changing accounting amounts.'
  );
}

    const revenue = calculateZenimoniesRevenue({
      grossFee: entry.gross_fee,
      providerCost: costs.providerCost,
      partnerShare: costs.partnerShare,
      otherDirectCost: costs.otherDirectCost,
    });

    const updated = await client.query(
      `UPDATE revenue_ledger
       SET provider_cost = $2,
           partner_share = $3,
           other_direct_cost = $4,
           zenimonies_revenue = $5,
           accounting_status = 'ready',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND accounting_status IN ('incomplete', 'ready')
       RETURNING *`,
      [
        id,
        costs.providerCost,
        costs.partnerShare,
        costs.otherDirectCost,
        revenue,
      ]
    );

    if (!updated.rowCount) {
      throw new Error('Revenue entry could not be updated.');
    }

    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// POST AFTER INDEPENDENT APPROVAL
// ============================================================

async function postRevenueEntry({ entryId, recordedBy }) {
  const id = assertActor(entryId, 'entryId');
  const poster = assertActor(recordedBy, 'recordedBy');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const current = await client.query(
      `SELECT *
       FROM revenue_ledger
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (!current.rowCount) {
      throw new Error('Revenue entry was not found.');
    }

    const entry = current.rows[0];
    assertEntryType(entry);

    if (entry.accounting_status !== 'ready') {
      throw new Error('Only ready entries can be posted.');
    }

    if (
      entry.entry_kind === 'original' &&
      entry.transaction_status !== 'completed'
    ) {
      throw new Error('Only completed transactions can be posted.');
    }

    if (
      entry.entry_kind === 'reversal' &&
      !['reversed', 'refunded'].includes(entry.transaction_status)
    ) {
      throw new Error('Invalid reversal transaction status.');
    }

    assertCompleteAccounting(entry);

    const approvals = await client.query(
      `SELECT *
       FROM revenue_ledger_approvals
       WHERE revenue_ledger_id = $1
         AND status = 'approved'
         AND gross_fee = $2
         AND provider_cost = $3
         AND partner_share = $4
         AND other_direct_cost = $5
         AND zenimonies_revenue = $6
       ORDER BY decided_at DESC
       FOR UPDATE`,
      [
        id,
        entry.gross_fee,
        entry.provider_cost,
        entry.partner_share,
        entry.other_direct_cost,
        entry.zenimonies_revenue,
      ]
    );

    const approval = approvals.rows.find(
      (a) =>
        a.prepared_by !== poster &&
        a.approved_by !== poster &&
        a.prepared_by !== a.approved_by
    );

    if (!approval) {
      throw new Error(
        'Posting requires matching independent approval from different administrators.'
      );
    }

    const updated = await client.query(
      `UPDATE revenue_ledger
       SET accounting_status = 'posted',
           recorded_by = $2,
           posted_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND accounting_status = 'ready'
       RETURNING *`,
      [id, poster]
    );

    if (!updated.rowCount) {
      throw new Error('Revenue entry could not be posted.');
    }
await client.query(
  `INSERT INTO revenue_audit_events (
     actor_user_id,
     event_type,
     entity_type,
     entity_id,
     reason,
     metadata,
     created_at
   )
   VALUES ($1, $2, $3, $4, $5, $6::jsonb, CURRENT_TIMESTAMP)`,
  [
    poster,
    'revenue_entry_posted',
    'revenue_ledger',
    id,
    null,
    JSON.stringify({
      entry_kind: entry.entry_kind,
      transaction_status: entry.transaction_status,
      approval_id: approval.id,
      approved_by: approval.approved_by,
      prepared_by: approval.prepared_by,
      zenimonies_revenue: entry.zenimonies_revenue,
      currency: entry.currency,
    }),
  ]
);
    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// CREATE A REVERSAL AND ITS PENDING APPROVAL REQUEST
// ============================================================

async function reverseRevenueEntry({
  originalEntryId,
  reversalReason,
  recordedBy,
  transactionStatus = 'refunded',
}) {
  const originalId = assertActor(originalEntryId, 'originalEntryId');
  const preparer = assertActor(recordedBy, 'recordedBy');
  const reason = requiredText(reversalReason, 'reversalReason', 1000);

  if (!['reversed', 'refunded'].includes(transactionStatus)) {
    throw new Error('Invalid reversal transaction status.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT *
       FROM revenue_ledger
       WHERE id = $1
       FOR UPDATE`,
      [originalId]
    );

    if (!result.rowCount) {
      throw new Error('Original revenue entry was not found.');
    }

    const original = result.rows[0];

    if (
      original.entry_kind !== 'original' ||
      original.accounting_status !== 'posted'
    ) {
      throw new Error('Only a posted original entry can be reversed.');
    }

    assertCompleteAccounting(original);

    const existing = await client.query(
      `SELECT id
       FROM revenue_ledger
       WHERE reversal_of_id = $1
       LIMIT 1`,
      [originalId]
    );

    if (existing.rowCount) {
      throw new Error('This revenue entry already has a reversal.');
    }

    const reference = `REV-${crypto.randomUUID()}`;
    const negative = (value) => (-Number(value)).toFixed(2);

    const reversalResult = await client.query(
      `INSERT INTO revenue_ledger (
        revenue_reference,
        entry_kind,
        reversal_of_id,
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
        recorded_by,
        posted_at,
        reversal_reason
      )
      VALUES (
        $1, 'reversal', $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15,
        'ready', $16, $17, $18, NULL, $19
      )
      RETURNING *`,
      [
        reference,
        original.id,
        original.service_type,
        original.source_type,
        original.source_id,
        original.source_reference,
        original.customer_user_id,
        original.partner_id,
        original.partner_terms_id,
        original.currency,
        negative(original.gross_fee),
        negative(original.provider_cost),
        negative(original.partner_share),
        negative(original.other_direct_cost),
        negative(original.zenimonies_revenue),
        transactionStatus,
        `Reversal of ${original.revenue_reference}`,
        preparer,
        reason,
      ]
    );

    const reversal = reversalResult.rows[0];

    await client.query(
      `INSERT INTO revenue_ledger_approvals (
        revenue_ledger_id,
        prepared_by,
        status,
        gross_fee,
        provider_cost,
        partner_share,
        other_direct_cost,
        zenimonies_revenue
      )
      VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7)`,
      [
        reversal.id,
        preparer,
        reversal.gross_fee,
        reversal.provider_cost,
        reversal.partner_share,
        reversal.other_direct_cost,
        reversal.zenimonies_revenue,
      ]
    );

    await client.query('COMMIT');
    return reversal;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  calculateZenimoniesRevenue,
  createRevenueEntry,
  markRevenueEntryReady,
  prepareRevenueApproval,
  decideRevenueApproval,
  postRevenueEntry,
  reverseRevenueEntry,
};
