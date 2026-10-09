-- ============================================================
-- ZENIMONIES BANKING
-- MIGRATION 009: ADMIN WALLET
--
-- REVIEW DRAFT — DO NOT RUN IN PRODUCTION
--
-- Purpose:
-- Record administrator funding and wallet withdrawals.
-- This wallet is separate from customer accounts and
-- company revenue.
--
-- This migration does not execute real bank transfers.
-- ============================================================
BEGIN;
CREATE TABLE IF NOT EXISTS admin_wallet_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_type VARCHAR(40) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    reference VARCHAR(150) NOT NULL UNIQUE,
    description VARCHAR(250),
    created_by UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,
    verified_by UUID
        REFERENCES users(id) ON DELETE RESTRICT,
    approved_by UUID
        REFERENCES users(id) ON DELETE RESTRICT,
    approved_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT admin_wallet_entry_type_check
        CHECK (
            entry_type IN (
                'funding_deposit',
                'wallet_withdrawal',
                'withdrawal_reversal'
            )
        ),
    CONSTRAINT admin_wallet_amount_check
        CHECK (amount > 0),
    CONSTRAINT admin_wallet_currency_check
        CHECK (currency = 'NGN'),
    CONSTRAINT admin_wallet_status_check
        CHECK (
            status IN (
                'pending',
                'approved',
                'processing',
                'completed',
                'failed',
                'cancelled',
                'reversed'
            )
        ),
    CONSTRAINT admin_wallet_completion_check
        CHECK (
            status <> 'completed'
            OR (
                completed_at IS NOT NULL
                AND verified_by IS NOT NULL
            )
        )
);
CREATE INDEX IF NOT EXISTS idx_admin_wallet_created
    ON admin_wallet_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_wallet_status
    ON admin_wallet_entries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_wallet_type
    ON admin_wallet_entries(entry_type, status);
COMMIT;
