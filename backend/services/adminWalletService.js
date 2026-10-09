'use strict';

// ============================================================
// ZENIMONIES BANKING
// ADMIN WALLET SERVICE
//
// Safe initial version:
// - Reads Admin Wallet entries.
// - Separates wallet funds from company revenue.
// - Does not credit unverified deposits.
// - Does not execute or approve withdrawals.
// - Does not modify customer account balances.
//
// Do not connect this service to live financial actions until
// the wallet migration and authorization workflow are tested.
// ============================================================

const pool = require('../config/database');

const CURRENCY = 'NGN';

// ------------------------------------------------------------
// WALLET SUMMARY
//
// Only completed entries are included in the summary.
// Pending and processing withdrawals must be reserved by a
// future atomic withdrawal workflow before withdrawals activate.
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
          ),
          0
        ) AS total_credits,

        COALESCE(
          SUM(
            CASE
              WHEN entry_type = 'wallet_withdrawal'
              AND status = 'completed'
              THEN amount
              ELSE 0
            END
          ),
          0
        ) AS total_withdrawals

      FROM admin_wallet_entries
      WHERE currency = $1
    `,
    [CURRENCY]
  );

  const credits = Number(result.rows[0].total_credits);
  const withdrawals = Number(result.rows[0].total_withdrawals);

  return {
    currency: CURRENCY,
    totalCredits: Number(credits.toFixed(2)),
    totalWithdrawals: Number(withdrawals.toFixed(2)),
    availableBalance: Number(
      (credits - withdrawals).toFixed(2)
    ),
    withdrawalsEnabled: false,
  };
}

// ------------------------------------------------------------
// WALLET HISTORY
// ------------------------------------------------------------

async function getWalletHistory({
  limit = 50,
  offset = 0,
} = {}) {
  const parsedLimit = Number.parseInt(limit, 10);
  const parsedOffset = Number.parseInt(offset, 10);

  const safeLimit = Math.min(
    Math.max(Number.isInteger(parsedLimit) ? parsedLimit : 50, 1),
    100
  );

  const safeOffset = Math.max(
    Number.isInteger(parsedOffset) ? parsedOffset : 0,
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
        verified_by,
        approved_by,
        approved_at,
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
// DISABLED FINANCIAL ACTIONS
//
// Enable these only after:
// 1. The database migration is tested.
// 2. Deposit verification is connected to a trusted provider.
// 3. Withdrawals reserve funds atomically.
// 4. Independent approval and audit logging are implemented.
// ------------------------------------------------------------

async function recordVerifiedFundingDeposit() {
  throw new Error(
    'Admin Wallet deposits are not enabled. Payment verification must be implemented first.'
  );
}

async function requestWithdrawal() {
  throw new Error(
    'Admin Wallet withdrawals are not enabled. Atomic fund reservation and independent approval are required.'
  );
}

module.exports = {
  CURRENCY,
  getWalletSummary,
  getWalletHistory,
  recordVerifiedFundingDeposit,
  requestWithdrawal,
};
