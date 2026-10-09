'use strict';

// ============================================================
// ZENIMONIES BANKING
// ADMIN WALLET SERVICE
//
// IMPORTANT:
// - Admin Wallet funds are separate from company revenue.
// - This service does not execute real bank transfers.
// - Funding must be verified before crediting a wallet.
// - Withdrawals must be authorized and confirmed.
// ============================================================

const pool = require('../config/database');

const CURRENCY = 'NGN';

const VALID_ENTRY_TYPES = new Set([
  'funding_deposit',
  'wallet_withdrawal',
  'withdrawal_reversal',
]);

const VALID_STATUSES = new Set([
  'pending',
  'completed',
  'failed',
  'reversed',
]);

function normalizeAmount(value) {
  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isSafeInteger(Math.round(amount * 100))
  ) {
    throw new Error('A valid positive amount is required.');
  }

  return Math.round(amount * 100) / 100;
}

function normalizeReference(value) {
  const reference = String(value || '').trim();

  if (!reference || reference.length > 150) {
    throw new Error('A valid transaction reference is required.');
  }

  return reference;
}

function normalizeActorId(value) {
  const id = String(value || '').trim();

  if (!id || id.length > 150) {
    throw new Error('An authenticated administrator ID is required.');
  }

  return id;
}

// ------------------------------------------------------------
// GET WALLET SUMMARY
//
// Reads existing admin-wallet tables.
// Does not create tables or modify customer balances.
// ------------------------------------------------------------

async function getWalletSummary(client = pool) {
  const result = await client.query(
    `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN entry_type IN (
                'funding_deposit',
                'withdrawal_reversal'
              )
              AND status = 'completed'
              THEN amount
              ELSE 0
            END
          ), 0
        ) AS total_credits,

        COALESCE(
          SUM(
            CASE
              WHEN entry_type = 'wallet_withdrawal'
              AND status = 'completed'
              THEN amount
              ELSE 0
            END
          ), 0
        ) AS total_withdrawals

      FROM admin_wallet_entries
      WHERE currency = $1
    `,
    [CURRENCY]
  );

  const totalCredits = Number(result.rows[0].total_credits);
  const totalWithdrawals = Number(result.rows[0].total_withdrawals);

  return {
    currency: CURRENCY,
    totalCredits: Number(totalCredits.toFixed(2)),
    totalWithdrawals: Number(totalWithdrawals.toFixed(2)),
    availableBalance: Number(
      (totalCredits - totalWithdrawals).toFixed(2)
    ),
  };
}

// ------------------------------------------------------------
// GET WALLET HISTORY
// ------------------------------------------------------------

async function getWalletHistory({ limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(
    Math.max(Number.parseInt(limit, 10) || 50, 1),
    100
  );

  const safeOffset = Math.max(
    Number.parseInt(offset, 10) || 0,
    0
  );

  const result = await pool.query(
    `
      SELECT
        id,
        entry_type,
        amount,
        currency,
        status,
        reference,
        description,
        created_by,
        created_at,
        completed_at
      FROM admin_wallet_entries
      ORDER BY created_at DESC, id DESC
      LIMIT $1 OFFSET $2
    `,
    [safeLimit, safeOffset]
  );

  return result.rows;
}

// ------------------------------------------------------------
// RECORD A VERIFIED FUNDING DEPOSIT
//
// This function intentionally does not accept arbitrary
// client confirmation that money has arrived.
//
// Call it only from a trusted, verified payment-provider
// callback or a separately authorized reconciliation process.
// ------------------------------------------------------------

async function recordVerifiedFundingDeposit({
  amount,
  reference,
  description = 'Verified Admin Wallet funding',
  actorId,
  verifiedBy,
  client = pool,
}) {
  const normalizedAmount = normalizeAmount(amount);
  const normalizedReference = normalizeReference(reference);
  const normalizedActorId = normalizeActorId(actorId);
  const normalizedVerifiedBy = normalizeActorId(verifiedBy);

  const db = client;

  const result = await db.query(
    `
      INSERT INTO admin_wallet_entries (
        entry_type,
        amount,
        currency,
        status,
        reference,
        description,
        created_by,
        verified_by,
        completed_at
      )
      VALUES (
        'funding_deposit',
        $1,
        $2,
        'completed',
        $3,
        $4,
        $5,
        $6,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (reference) DO NOTHING
      RETURNING
        id,
        entry_type,
        amount,
        currency,
        status,
        reference,
        created_at,
        completed_at
    `,
    [
      normalizedAmount,
      CURRENCY,
      normalizedReference,
      String(description).slice(0, 250),
      normalizedActorId,
      normalizedVerifiedBy,
    ]
  );

  if (result.rowCount === 0) {
    throw new Error(
      'This reference has already been recorded. Verify the existing entry.'
    );
  }

  return result.rows[0];
}

// ------------------------------------------------------------
// WITHDRAWAL SUPPORT
//
// Intentionally not implemented yet.
//
// A real withdrawal must reserve funds atomically, verify the
// approved destination, authorize the request, use a trusted
// bank-transfer provider, and reconcile the provider result.
// ------------------------------------------------------------

async function requestWithdrawal() {
  throw new Error(
    'Admin Wallet withdrawals are not enabled. Secure destination verification and bank-transfer integration are required.'
  );
}

module.exports = {
  CURRENCY,
  getWalletSummary,
  getWalletHistory,
  recordVerifiedFundingDeposit,
  requestWithdrawal,
};
