
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

const MONEY_PATTERN = /^\d{1,16}(\.\d{1,2})?$/;

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
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  ) {
    throw new Error(`Invalid ${field}.`);
  }

  return value;
}

function money(value, field, options = {}) {
  const { allowNull = false, allowNegative = false } = options;

  if (value === null || value === undefined || value === '') {
    if (allowNull) return null;
    throw new Error(`${field} is required.`);
  }

  const stringValue = String(value);

  if (!MONEY_PATTERN.test(stringValue)) {
    throw new Error(`Invalid ${field}. Use an amount with up to 2 decimals.`);
  }

  const amount = Number(stringValue);

  if (!Number.isFinite(amount)) {
    throw new Error(`Invalid ${field}.`);
  }

  if (!allowNegative && amount < 0) {
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
  // We cannot calculate final company revenue until every cost
  // component is known. Never silently assume missing costs are zero.
  if (
    grossFee === null ||
    providerCost === null ||
    partnerShare === null ||
    otherDirectCost === null
  ) {
    return null;
  }

  const result =
    Number(grossFee) -
    Number(providerCost) -
    Number(partnerShare) -
    Number(otherDirectCost);

  if (!Number.isFinite(result)) {
    throw new Error('Unable to calculate revenue.');
  }

  return result.toFixed(2);
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

    if (normalized.accountingStatus === 'posted') {
      if (normalized.transactionStatus !== 'completed') {
        throw new Error(
          'Original revenue entries can be posted only for completed transactions.'
        );
      }
    }

    const postedAt =
      normalized.accountingStatus === 'posted'
        ? new Date()
        : null;

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
// REVERSE A POSTED ENTRY
//
// The database trigger remains responsible for checking that
// the reversal exactly negates the original entry.
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

  if (!['reversed', 'refunded'].includes(transactionStatus)) {
    throw new Error('Invalid reversal transaction status.');
  }

  const reason = requiredText(
    reversalReason,
    'reversalReason',
    1000
  );

  const actorId = optionalUuid(recordedBy, 'recordedBy');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

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
      throw new Error('Only a posted original entry can be reversed.');
    }

    if (
      original.provider_cost === null ||
      original.partner_share === null ||
      original.other_direct_cost === null ||
      original.zenimonies_revenue === null
    ) {
      throw new Error(
        'The original entry is missing accounting amounts.'
      );
    }

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
      throw new Error('This revenue entry already has a reversal.');
    }

    const reversedInput = {
      revenueReference: `REV-${crypto.randomUUID()}`,
      entryKind: 'reversal',
      reversalOfId: original.id,
      serviceType: original.service_type,
      sourceType: original.source_type,
      sourceId: original.source_id,
      sourceReference: original.source_reference,
      customerUserId: original.customer_user_id,
      partnerId: original.partner_id,
      partnerTermsId: original.partner_terms_id,
      currency: original.currency,
      grossFee: (-Number(original.gross_fee)).toFixed(2),
      providerCost: (-Number(original.provider_cost)).toFixed(2),
      partnerShare: (-Number(original.partner_share)).toFixed(2),
      otherDirectCost: (-Number(original.other_direct_cost)).toFixed(2),
      transactionStatus,
      accountingStatus: 'posted',
      reversalReason: reason,
      recordedBy: actorId,
      description: `Reversal of ${original.revenue_reference}`,
    };

    // A reversal's negative values are required. The normal
    // original-entry normalizer intentionally rejects negatives,
    // so the reversal uses a dedicated validated insert below.
    const reversedRevenue = (
      -Number(original.zenimonies_revenue)
    ).toFixed(2);

    const reversalResult = await client.query(
      `
        INSERT INTO revenue_ledger (
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
          $10, $11, $12, $13, $14, $15, 'posted', $16, $17,
          $18, CURRENT_TIMESTAMP, $19
        )
        RETURNING *
      `,
      [
        reversedInput.revenueReference,
        original.id,
        original.service_type,
        original.source_type,
        original.source_id,
        original.source_reference,
        original.customer_user_id,
        original.partner_id,
        original.partner_terms_id,
        original.currency,
        reversedInput.grossFee,
        reversedInput.providerCost,
        reversedInput.partnerShare,
        reversedInput.otherDirectCost,
        reversedRevenue,
        transactionStatus,
        reversedInput.description,
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

async function postRevenueEntry({ entryId, recordedBy }) {
  const id = optionalUuid(entryId, 'entryId');

  if (!id) {
    throw new Error('entryId is required.');
  }

  const actorId = optionalUuid(recordedBy, 'recordedBy');
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
      throw new Error('Only original entries can be posted by this method.');
    }

    if (entry.accounting_status !== 'ready') {
      throw new Error('Only ready entries can be posted.');
    }

    if (entry.transaction_status !== 'completed') {
      throw new Error('Only completed transactions can be posted.');
    }

    if (
      entry.provider_cost === null ||
      entry.partner_share === null ||
      entry.other_direct_cost === null ||
      entry.zenimonies_revenue === null
    ) {
      throw new Error('All accounting amounts are required.');
    }

    const result = await client.query(
      `
        UPDATE revenue_ledger
        SET
          accounting_status = 'posted',
          posted_at = CURRENT_TIMESTAMP,
          recorded_by = COALESCE($2, recorded_by),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND accounting_status = 'ready'
        RETURNING *
      `,
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
  postRevenueEntry,
  reverseRevenueEntry,
};
