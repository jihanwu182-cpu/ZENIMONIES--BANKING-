
const pool = require('../config/database');
const crypto = require('crypto');

// ============================================================
// ZENIMONIES BANKING
// REVENUE ACCOUNTING SERVICE
//
// IMPORTANT:
// - Does not move customer funds.
// - Does not execute partner payouts.
// - Does not treat transaction principal as company revenue.
// - Unknown costs remain NULL.
// - Posted ledger entries are immutable.
// - Reversals use signed amounts.
// ============================================================

const ALLOWED_CURRENCIES = new Set(['NGN']);

const ALLOWED_ENTRY_STATUSES = new Set([
  'pending',
  'completed',
  'failed',
  'reversed',
  'refunded',
]);

const ALLOWED_ACCOUNTING_STATUSES = new Set([
  'incomplete',
  'ready',
  'posted',
]);

const ALLOWED_ENTRY_KINDS = new Set([
  'original',
  'reversal',
]);

const ALLOWED_SOURCE_TYPES = new Set([
  'transfer',
  'airtime',
  'data',
  'bill_payment',
  'pos',
  'other',
]);

const ALLOWED_SERVICE_TYPES = new Set([
  'transfer',
  'airtime',
  'data',
  'electricity',
  'internet',
  'tv',
  'pos',
  'other',
]);

const AMOUNT_FIELDS = [
  'grossFee',
  'providerCost',
  'partnerShare',
  'otherDirectCost',
  'zenimoniesRevenue',
];
// ============================================================
// VALIDATION HELPERS
// ============================================================

function requiredText(value, field, maxLength = 150) {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
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
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new Error(`Invalid ${field}.`);
  }

  return value;
}
// ============================================================
// EXACT MONEY HELPERS — NO FLOATING-POINT ARITHMETIC
// Supports PostgreSQL NUMERIC(18,2) amounts.
// ============================================================

const MONEY_PATTERN = /^-?\d{1,16}(?:\.\d{1,2})?$/;

/**
 * Convert a decimal amount into integer kobo using BigInt.
 * Never use JavaScript Number for financial calculations.
 */
function decimalToCents(value, field = 'amount') {
  const text = String(value);

  if (!MONEY_PATTERN.test(text)) {
    throw new Error(
      `Invalid ${field}. Use up to 16 whole-number digits and 2 decimal places.`
    );
  }

  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const [whole, fraction = ''] = unsigned.split('.');

  const cents =
    BigInt(whole) * 100n +
    BigInt((fraction + '00').slice(0, 2));

  return negative ? -cents : cents;
}

/**
 * Convert integer kobo into an exact decimal string.
 * Example: 12345n becomes "123.45".
 */
function centsToDecimal(cents) {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const whole = absolute / 100n;
  const fraction = String(absolute % 100n).padStart(2, '0');

  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

function money(value, field, options = {}) {
  const { allowNull = false, allowNegative = false } = options;

  if (value === null || value === undefined || value === '') {
    if (allowNull) return null;
    throw new Error(`${field} is required.`);
  }

  const cents = decimalToCents(value, field);

  if (!allowNegative && cents < 0n) {
    throw new Error(`${field} cannot be negative.`);
  }

  return centsToDecimal(cents);
}

function calculateZenimoniesRevenue({
  grossFee,
  providerCost,
  partnerShare,
  otherDirectCost,
}) {
  // Unknown costs must remain unknown, never silently become zero.
  if (
    grossFee === null ||
    grossFee === undefined ||
    providerCost === null ||
    providerCost === undefined ||
    partnerShare === null ||
    partnerShare === undefined ||
    otherDirectCost === null ||
    otherDirectCost === undefined
  ) {
    return null;
  }

  const revenueCents =
    decimalToCents(grossFee, 'grossFee') -
    decimalToCents(providerCost, 'providerCost') -
    decimalToCents(partnerShare, 'partnerShare') -
    decimalToCents(otherDirectCost, 'otherDirectCost');

  return centsToDecimal(revenueCents);
}


function validateEnums(input) {
  if (!ALLOWED_CURRENCIES.has(input.currency)) {
    throw new Error('Unsupported currency.');
  }

  if (!ALLOWED_SOURCE_TYPES.has(input.sourceType)) {
    throw new Error('Unsupported source type.');
  }

  if (!ALLOWED_SERVICE_TYPES.has(input.serviceType)) {
    throw new Error('Unsupported service type.');
  }

  if (!ALLOWED_ENTRY_STATUSES.has(input.transactionStatus)) {
    throw new Error('Unsupported transaction status.');
  }

  if (!ALLOWED_ACCOUNTING_STATUSES.has(input.accountingStatus)) {
    throw new Error('Unsupported accounting status.');
  }

  if (!ALLOWED_ENTRY_KINDS.has(input.entryKind)) {
    throw new Error('Unsupported ledger entry kind.');
  }
}

// ============================================================
// NORMALIZE LEDGER INPUT
// ============================================================

function normalizeLedgerInput(input = {}) {
  const normalized = {
    revenueReference:
      input.revenueReference ||
      `REV-${crypto.randomUUID()}`,

    entryKind: input.entryKind || 'original',

    reversalOfId: optionalUuid(
      input.reversalOfId,
      'reversalOfId'
    ),

    replacesId: optionalUuid(
      input.replacesId,
      'replacesId'
    ),

    serviceType: requiredText(
      input.serviceType,
      'serviceType',
      60
    ),

    sourceType: requiredText(
      input.sourceType,
      'sourceType',
      60
    ),

    sourceId: optionalUuid(input.sourceId, 'sourceId'),

    sourceReference:
      input.sourceReference == null
        ? null
        : requiredText(input.sourceReference, 'sourceReference'),

    customerUserId: optionalUuid(
      input.customerUserId,
      'customerUserId'
    ),

    partnerId: optionalUuid(input.partnerId, 'partnerId'),

    partnerTermsId: optionalUuid(
      input.partnerTermsId,
      'partnerTermsId'
    ),

    currency: input.currency || 'NGN',

    grossFee: money(input.grossFee ?? '0.00', 'grossFee'),

    providerCost: money(
      input.providerCost,
      'providerCost',
      { allowNull: true }
    ),

    partnerShare: money(
      input.partnerShare,
      'partnerShare',
      { allowNull: true }
    ),

    otherDirectCost: money(
      input.otherDirectCost,
      'otherDirectCost',
      { allowNull: true }
    ),

    description:
      input.description == null
        ? null
        : requiredText(input.description, 'description', 1000),

    recordedBy: optionalUuid(input.recordedBy, 'recordedBy'),

    transactionStatus: input.transactionStatus || 'pending',

    accountingStatus: input.accountingStatus || 'incomplete',

    reversalReason:
      input.reversalReason == null
        ? null
        : requiredText(input.reversalReason, 'reversalReason', 1000),
  };

  normalized.zenimoniesRevenue = calculateZenimoniesRevenue({
    grossFee: normalized.grossFee,
    providerCost: normalized.providerCost,
    partnerShare: normalized.partnerShare,
    otherDirectCost: normalized.otherDirectCost,
  });

  validateEnums(normalized);

  if (normalized.entryKind === 'original' && normalized.reversalOfId) {
    throw new Error('Original entries cannot reference a reversal target.');
  }

  if (normalized.entryKind === 'reversal' && !normalized.reversalOfId) {
    throw new Error('A reversal must reference the entry it reverses.');
  }

  if (normalized.entryKind === 'reversal' && normalized.replacesId) {
    throw new Error('A reversal cannot be a replacement entry.');
  }

  if (
    normalized.accountingStatus === 'posted' &&
    normalized.zenimoniesRevenue === null
  ) {
    throw new Error(
      'Cannot post revenue while any accounting cost is unknown.'
    );
  }

  return normalized;
}

// ============================================================
// CREATE A LEDGER ENTRY
//
// This records accounting information only.
// It does not execute transactions or payouts.
// ============================================================

async function createRevenueEntry(input, options = {}) {
  const normalized = normalizeLedgerInput(input);
  const client = options.client || (await pool.connect());
  const ownsClient = !options.client;

  try {
    if (ownsClient) {
      await client.query('BEGIN');
    }

    // Direct posting is disabled.
// Revenue must go through the separate approval workflow.
if (normalized.accountingStatus === 'posted') {
  throw new Error(
    'Direct posting is disabled. Prepare the entry and obtain approval from a different administrator before posting.'
  );
}

const postedAt = null;

    const result = await client.query(
      `
        INSERT INTO revenue_ledger (
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
          partner_shareu,
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
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23
        )
        RETURNING *
      `,
      [
        normalized.revenueReference,
        normalized.entryKind,
        normalized.reversalOfId,
        normalized.replacesId,
        normalized.serviceType,
        normalized.sourceType,
        normalized.sourceId,
        normalized.sourceReference,
        normalized.customerUserId,
        normalized.partnerId,
        normalized.partnerTermsId,
        normalized.currency,
        normalized.grossFee,
        normalized.providerCost,
        normalized.partnerShare,
        normalized.otherDirectCost,
        normalized.zenimoniesRevenue,
        normalized.accountingStatus,
        normalized.transactionStatus,
        normalized.description,
        normalized.recordedBy,
        postedAt,
        normalized.reversalReason,
      ]
    );

    if (ownsClient) {
      await client.query('COMMIT');
    }

    return result.rows[0];
  } catch (error) {
    if (ownsClient) {
      await client.query('ROLLBACK').catch(() => {});
    }

    throw error;
  } finally {
    if (ownsClient) {
      client.release();
    }
  }
}

// ============================================================
// REVERSE A POSTED REVENUE ENTRY
// ZENIMONIES BANKING
//
// - Requires an identified administrator.
// - Only reverses a posted original entry.
// - Prevents duplicate reversals.
// - Uses exact negative amounts.
// - Creates the reversal as READY, never POSTED.
// - Posting must use the separate approval workflow.
// ============================================================
async function reverseRevenueEntry({
  originalEntryId,
  reversalReason,
  recordedBy,
  transactionStatus = 'refunded',
}) {
  const originalId = optionalUuid(
    originalEntryId,
    'originalEntryId'
  );
  if (!originalId) {
    throw new Error('originalEntryId is required.');
  }
  const actorId = optionalUuid(recordedBy, 'recordedBy');
  if (!actorId) {
    throw new Error(
      'recordedBy is required to create an auditable reversal.'
    );
  }
  if (!['reversed', 'refunded'].includes(transactionStatus)) {
    throw new Error(
      'transactionStatus must be reversed or refunded.'
    );
  }
  const reason = requiredText(
    reversalReason,
    'reversalReason',
    1000
  );
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Lock the original to prevent concurrent reversal attempts.
    const originalResult = await client.query(
      `
        SELECT *
        FROM revenue_ledger
        WHERE id = $1
        FOR UPDATE
      `,
      [originalId]
    );
    if (originalResult.rowCount !== 1) {
      throw new Error('Original revenue entry was not found.');
    }
    const original = originalResult.rows[0];
    if (
      original.entry_kind !== 'original' ||
      original.accounting_status !== 'posted'
    ) {
      throw new Error(
        'Only a posted original revenue entry can be reversed.'
      );
    }
    if (
      original.gross_fee === null ||
      original.provider_cost === null ||
      original.partner_share === null ||
      original.other_direct_cost === null ||
      original.zenimonies_revenue === null
    ) {
      throw new Error(
        'The original entry is missing accounting amounts.'
      );
    }
    // A posted or pending reversal must not be duplicated.
    const existingReversal = await client.query(
      `
        SELECT id
        FROM revenue_ledger
        WHERE reversal_of_id = $1
        LIMIT 1
      `,
      [originalId]
    );
    if (existingReversal.rowCount > 0) {
      throw new Error(
        'This revenue entry already has a reversal.'
      );
    }
    const negativeAmount = (value) =>
  centsToDecimal(-decimalToCents(value, 'reversal amount'));
    const reversalReference = `REV-${crypto.randomUUID()}`;
    const reversalResult = await client.query(
      `
        INSERT INTO revenue_ledger (
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
          recorded_by,
          posted_at,
          reversal_reason
        )
        VALUES (
          $1, 'reversal', $2, NULL,
          $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15,
          'ready', $16, $17, $18, NULL, $19
        )
        RETURNING *
      `,
      [
        reversalReference,
        original.id,
        original.service_type,
        original.source_type,
        original.source_id,
        original.source_reference,
        original.customer_user_id,
        original.partner_id,
        original.partner_terms_id,
        original.currency,
        negativeAmount(original.gross_fee),
        negativeAmount(original.provider_cost),
        negativeAmount(original.partner_share),
        negativeAmount(original.other_direct_cost),
        negativeAmount(original.zenimonies_revenue),
        transactionStatus,
        `Reversal of ${original.revenue_reference}`,
        actorId,
        reason,
      ]
    );
    await client.query('COMMIT');
    return reversalResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// MARK COSTS READY FOR POSTING
//
// This does not post automatically. A separate authorized
// workflow must confirm transaction completion and cost values.
// ============================================================

async function markRevenueEntryReady({
  entryId,
  providerCost,
  partnerShare,
  otherDirectCost,
}) {
  const id = optionalUuid(entryId, 'entryId');

  if (!id) {
    throw new Error('entryId is required.');
  }

  const normalizedProviderCost = money(
    providerCost,
    'providerCost'
  );

  const normalizedPartnerShare = money(
    partnerShare,
    'partnerShare'
  );

  const normalizedOtherDirectCost = money(
    otherDirectCost,
    'otherDirectCost'
  );

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const current = await client.query(
      `
        SELECT *
        FROM revenue_ledger
        WHERE id = $1
        FOR UPDATE
      `,
      [id]
    );

    if (current.rowCount !== 1) {
      throw new Error('Revenue entry was not found.');
    }

    const entry = current.rows[0];

    if (entry.entry_kind !== 'original') {
      throw new Error('Only original entries can be prepared for posting.');
    }

    if (entry.accounting_status === 'posted') {
      throw new Error('Posted entries cannot be modified.');
    }

    if (entry.transaction_status !== 'completed') {
      throw new Error(
        'Only completed transactions can be prepared for posting.'
      );
    }

    const calculatedRevenue = calculateZenimoniesRevenue({
      grossFee: entry.gross_fee,
      providerCost: normalizedProviderCost,
      partnerShare: normalizedPartnerShare,
      otherDirectCost: normalizedOtherDirectCost,
    });

    if (calculatedRevenue === null) {
      throw new Error('Unable to calculate company revenue.');
    }

    const result = await client.query(
      `
        UPDATE revenue_ledger
        SET
          provider_cost = $2,
          partner_share = $3,
          other_direct_cost = $4,
          zenimonies_revenue = $5,
          accounting_status = 'ready',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND accounting_status IN ('incomplete', 'ready')
        RETURNING *
      `,
      [
        id,
        normalizedProviderCost,
        normalizedPartnerShare,
        normalizedOtherDirectCost,
        calculatedRevenue,
      ]
    );

    if (result.rowCount !== 1) {
      throw new Error('Revenue entry could not be updated.');
    }

    await client.query('COMMIT');

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// POST A READY ENTRY
//
// Call only from a protected backend workflow after independent
// checks of source transaction, fee collection and cost evidence.
// ============================================================

async function prepareRevenueApproval({ entryId, preparedBy }) {
  const id = optionalUuid(entryId, 'entryId');
  const actorId = optionalUuid(preparedBy, 'preparedBy');

  if (!id || !actorId) {
    throw new Error('entryId and preparedBy are required.');
  }

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

    if (result.rowCount !== 1) {
      throw new Error('Revenue entry was not found.');
    }

    const entry = result.rows[0];

    const eligibleForApproval =
  entry.accounting_status === 'ready' &&
  (
    (entry.entry_kind === 'original' &&
      entry.transaction_status === 'completed') ||
    (entry.entry_kind === 'reversal' &&
      ['reversed', 'refunded'].includes(entry.transaction_status))
  );

if (!eligibleForApproval) {
  throw new Error(
    'Only ready original entries or ready reversals can be submitted for approval.'
  );
}

    if (
      entry.provider_cost === null ||
      entry.partner_share === null ||
      entry.other_direct_cost === null ||
      entry.zenimonies_revenue === null
    ) {
      throw new Error('All accounting amounts must be known.');
    }

    const existing = await client.query(
      `SELECT id
       FROM revenue_ledger_approvals
       WHERE revenue_ledger_id = $1
         AND status = 'pending'
       LIMIT 1`,
      [id]
    );

    if (existing.rowCount > 0) {
      throw new Error('This entry already has a pending approval request.');
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
        actorId,
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


async function decideRevenueApproval({
  approvalId,
  approvedBy,
  decision,
  reason,
}) {
  const id = optionalUuid(approvalId, 'approvalId');
  const actorId = optionalUuid(approvedBy, 'approvedBy');

  if (!id || !actorId) {
    throw new Error('approvalId and approvedBy are required.');
  }

  if (!['approved', 'rejected'].includes(decision)) {
    throw new Error('Decision must be approved or rejected.');
  }

  const decisionReason =
    reason == null || reason.trim() === ''
      ? null
      : requiredText(reason, 'reason', 1000);

  if (decision === 'rejected' && !decisionReason) {
    throw new Error('A rejection reason is required.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Read the approval's ledger ID without locking it.
    // Lock ordering for financial actions is:
    // ledger entry first, approval second.
    const referenceResult = await client.query(
      `SELECT revenue_ledger_id
       FROM revenue_ledger_approvals
       WHERE id = $1`,
      [id]
    );

    if (referenceResult.rowCount !== 1) {
      throw new Error('Approval request was not found.');
    }

    const ledgerId = referenceResult.rows[0].revenue_ledger_id;

    // Always lock the ledger entry before the approval row.
    const entryResult = await client.query(
      `SELECT *
       FROM revenue_ledger
       WHERE id = $1
       FOR UPDATE`,
      [ledgerId]
    );

    if (entryResult.rowCount !== 1) {
      throw new Error('Revenue entry was not found.');
    }

    const entry = entryResult.rows[0];

    // Now lock and re-read the approval. Its status may have
    // changed since the initial, unlocked lookup.
    const approvalResult = await client.query(
      `SELECT *
       FROM revenue_ledger_approvals
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (approvalResult.rowCount !== 1) {
      throw new Error('Approval request was not found.');
    }

    const approval = approvalResult.rows[0];

    if (approval.revenue_ledger_id !== ledgerId) {
      throw new Error('Approval request does not match its ledger entry.');
    }

    if (approval.status !== 'pending') {
      throw new Error('This request has already been decided.');
    }

    if (approval.prepared_by === actorId) {
      throw new Error(
        'The administrator who prepared this entry cannot decide its approval.'
      );
    }

    const eligible =
      entry.accounting_status === 'ready' &&
      (
        (
          entry.entry_kind === 'original' &&
          entry.transaction_status === 'completed'
        ) ||
        (
          entry.entry_kind === 'reversal' &&
          ['reversed', 'refunded'].includes(
            entry.transaction_status
          )
        )
      );

    const amountsMatch =
      String(entry.gross_fee) === String(approval.gross_fee) &&
      String(entry.provider_cost) === String(approval.provider_cost) &&
      String(entry.partner_share) === String(approval.partner_share) &&
      String(entry.other_direct_cost) === String(approval.other_direct_cost) &&
      String(entry.zenimonies_revenue) ===
        String(approval.zenimonies_revenue);

    if (!eligible || !amountsMatch) {
      throw new Error(
        'The entry changed after submission. Prepare a new approval request.'
      );
    }

    const update = await client.query(
      `UPDATE revenue_ledger_approvals
       SET status = $2,
           approved_by = $3,
           decided_at = CURRENT_TIMESTAMP,
           decision_reason = $4
       WHERE id = $1
         AND status = 'pending'
       RETURNING *`,
      [id, decision, actorId, decisionReason]
    );

    if (update.rowCount !== 1) {
      throw new Error('Could not save the approval decision.');
    }

    await client.query('COMMIT');
    return update.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function postRevenueEntry({ entryId, recordedBy }) {
  const id = optionalUuid(entryId, 'entryId');
  const actorId = optionalUuid(recordedBy, 'recordedBy');

  if (!id || !actorId) {
    throw new Error('entryId and recordedBy are required.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the ledger entry so concurrent posting attempts
    // cannot post the same entry simultaneously.
    const current = await client.query(
      `SELECT *
       FROM revenue_ledger
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (current.rowCount !== 1) {
      throw new Error('Revenue entry was not found.');
    }

    const entry = current.rows[0];

    
const eligibleForPosting =
  entry.accounting_status === 'ready' &&
  (
    (entry.entry_kind === 'original' &&
      entry.transaction_status === 'completed') ||
    (entry.entry_kind === 'reversal' &&
      ['reversed', 'refunded'].includes(entry.transaction_status))
  );

if (!eligibleForPosting) {
  throw new Error(
    'Only ready original entries or ready reversals can be posted.'
  );
}


    if (
      entry.provider_cost === null ||
      entry.partner_share === null ||
      entry.other_direct_cost === null ||
      entry.zenimonies_revenue === null
    ) {
      throw new Error(
        'All accounting amounts must be known before posting.'
      );
    }

    // Verify that the revenue calculation is still correct.
    const calculatedRevenue = calculateZenimoniesRevenue({
      grossFee: entry.gross_fee,
      providerCost: entry.provider_cost,
      partnerShare: entry.partner_share,
      otherDirectCost: entry.other_direct_cost,
    });

    if (
  calculatedRevenue === null ||
  decimalToCents(calculatedRevenue, 'calculated revenue') !==
    decimalToCents(entry.zenimonies_revenue, 'ledger revenue')
   ) {
      throw new Error(
        'The revenue calculation does not match the ledger amounts.'
      );
    }

    // Find a previously approved request for these exact amounts.
    const approvalResult = await client.query(
      `SELECT id, prepared_by, approved_by
       FROM revenue_ledger_approvals
       WHERE revenue_ledger_id = $1
         AND status = 'approved'
         AND prepared_by <> approved_by
         AND gross_fee = $2
         AND provider_cost = $3
         AND partner_share = $4
         AND other_direct_cost = $5
         AND zenimonies_revenue = $6
       ORDER BY decided_at DESC
       LIMIT 1
       FOR SHARE`,
      [
        id,
        entry.gross_fee,
        entry.provider_cost,
        entry.partner_share,
        entry.other_direct_cost,
        entry.zenimonies_revenue,
      ]
    );

    if (approvalResult.rowCount !== 1) {
      throw new Error(
        'A different administrator must approve these exact amounts before posting.'
      );
    }

    const approval = approvalResult.rows[0];

    // The person posting must be different from both the
    // person who prepared the request and the approver.
    if (
      actorId === approval.prepared_by ||
      actorId === approval.approved_by
    ) {
      throw new Error(
        'The preparer and approver cannot post this revenue entry.'
      );
    }

    // Post only if the entry is still ready.
    const result = await client.query(
      `UPDATE revenue_ledger
       SET accounting_status = 'posted',
           posted_at = CURRENT_TIMESTAMP,
           recorded_by = $2,
           updated_at = CURRENT_TIMESTAMP
       
WHERE id = $1
  AND accounting_status = 'ready'
  AND (
    (entry_kind = 'original' AND transaction_status = 'completed')
    OR
    (entry_kind = 'reversal' AND transaction_status IN ('reversed', 'refunded'))
  )

       RETURNING *`,
      [id, actorId]
    );

    if (result.rowCount !== 1) {
      throw new Error('Revenue entry could not be posted.');
    }

    await client.query('COMMIT');

    return result.rows[0];
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

