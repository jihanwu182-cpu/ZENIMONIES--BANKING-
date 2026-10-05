-- ============================================================
-- ZENIMONIES BANKING
-- PRODUCTION DATABASE SECURITY UPGRADE
-- STAGE 1
--
-- SAFE MIGRATION
-- Does NOT delete existing users, accounts or transactions.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. USERS — SECURITY FIELDS
-- ============================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER
    NOT NULL DEFAULT 0;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(100);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN
    NOT NULL DEFAULT false;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN
    NOT NULL DEFAULT false;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;


-- ============================================================
-- 2. USER SECURITY VALIDATION
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_failed_login_attempts_check'
          AND conrelid = 'users'::regclass
    ) THEN

        ALTER TABLE users
        ADD CONSTRAINT users_failed_login_attempts_check
        CHECK (failed_login_attempts >= 0);

    END IF;
END
$$;


-- ============================================================
-- 3. TRANSACTION IDEMPOTENCY
--
-- Prevents the same payment request from being processed twice.
-- ============================================================

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(150);

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS provider_reference VARCHAR(150);

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS provider VARCHAR(100);

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS reversal_reference VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_transactions_idempotency_key
ON transactions(account_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS
idx_transactions_provider_reference
ON transactions(provider_reference)
WHERE provider_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS
idx_transactions_status
ON transactions(status);

CREATE INDEX IF NOT EXISTS
idx_transactions_reference
ON transactions(reference);


-- ============================================================
-- 4. TRANSACTION VALIDATION
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'transactions_amount_positive'
          AND conrelid = 'transactions'::regclass
    ) THEN

        ALTER TABLE transactions
        ADD CONSTRAINT transactions_amount_positive
        CHECK (amount > 0);

    END IF;
END
$$;


-- ============================================================
-- 5. BANK TRANSFER IDEMPOTENCY
-- ============================================================

ALTER TABLE bank_transfers
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(150);

ALTER TABLE bank_transfers
ADD COLUMN IF NOT EXISTS provider VARCHAR(100);

ALTER TABLE bank_transfers
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE bank_transfers
ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;

ALTER TABLE bank_transfers
ADD COLUMN IF NOT EXISTS reversal_reference VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_bank_transfers_idempotency
ON bank_transfers(account_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS
idx_bank_transfers_provider_reference
ON bank_transfers(provider_reference)
WHERE provider_reference IS NOT NULL;


-- ============================================================
-- 6. DEPOSIT IDEMPOTENCY
-- ============================================================

ALTER TABLE deposits
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(150);

ALTER TABLE deposits
ADD COLUMN IF NOT EXISTS provider VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_deposits_idempotency
ON deposits(account_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS
idx_deposits_provider_reference
ON deposits(provider_reference)
WHERE provider_reference IS NOT NULL;


-- ============================================================
-- 7. AIRTIME IDEMPOTENCY
-- ============================================================

ALTER TABLE airtime_transactions
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(150);

ALTER TABLE airtime_transactions
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS
idx_airtime_idempotency
ON airtime_transactions(account_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;


-- ============================================================
-- 8. DATA PAYMENT IDEMPOTENCY
-- ============================================================

ALTER TABLE data_transactions
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(150);

ALTER TABLE data_transactions
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS
idx_data_idempotency
ON data_transactions(account_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;


-- ============================================================
-- 9. BILL PAYMENT IDEMPOTENCY
-- ============================================================

ALTER TABLE bill_payments
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(150);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_bill_payments_idempotency
ON bill_payments(account_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;


-- ============================================================
-- 10. WITHDRAWAL IDEMPOTENCY
-- ============================================================

ALTER TABLE withdrawals
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(150);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_withdrawals_idempotency
ON withdrawals(account_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;


-- ============================================================
-- 11. TRANSACTION PIN
--
-- Separate from account unlock passcode.
-- We store ONLY a secure hash.
-- ============================================================

CREATE TABLE IF NOT EXISTS transaction_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    pin_hash TEXT NOT NULL,

    failed_attempts INTEGER NOT NULL DEFAULT 0,

    locked_until TIMESTAMPTZ,

    last_used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT transaction_pins_one_per_user
        UNIQUE (user_id),

    CONSTRAINT transaction_pins_failed_attempts_check
        CHECK (failed_attempts >= 0)
);

CREATE INDEX IF NOT EXISTS
idx_transaction_pins_user
ON transaction_pins(user_id);


-- ============================================================
-- 12. SECURITY EVENTS
--
-- Separate security history from normal audit logs.
-- ============================================================

CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    event_type VARCHAR(100) NOT NULL,

    severity VARCHAR(20) NOT NULL DEFAULT 'info',

    ip_address VARCHAR(100),

    user_agent TEXT,

    device_id VARCHAR(150),

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT security_events_severity_check
    CHECK (
        severity IN (
            'info',
            'warning',
            'critical'
        )
    )
);

CREATE INDEX IF NOT EXISTS
idx_security_events_user
ON security_events(user_id);

CREATE INDEX IF NOT EXISTS
idx_security_events_type
ON security_events(event_type);

CREATE INDEX IF NOT EXISTS
idx_security_events_created
ON security_events(created_at DESC);


-- ============================================================
-- 13. TRUSTED DEVICES
-- ============================================================

CREATE TABLE IF NOT EXISTS trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    device_id VARCHAR(150) NOT NULL,

    device_name VARCHAR(150),

    device_type VARCHAR(50),

    platform VARCHAR(50),

    app_version VARCHAR(50),

    last_seen_at TIMESTAMPTZ,

    trusted_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT trusted_devices_unique
    UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS
idx_trusted_devices_user
ON trusted_devices(user_id);

CREATE INDEX IF NOT EXISTS
idx_trusted_devices_device
ON trusted_devices(device_id);


-- ============================================================
-- 14. SESSION SECURITY
-- ============================================================

ALTER TABLE auth_sessions
ADD COLUMN IF NOT EXISTS device_id VARCHAR(150);

ALTER TABLE auth_sessions
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100);

ALTER TABLE auth_sessions
ADD COLUMN IF NOT EXISTS user_agent TEXT;

ALTER TABLE auth_sessions
ADD COLUMN IF NOT EXISTS revoked_reason VARCHAR(150);

CREATE INDEX IF NOT EXISTS
idx_auth_sessions_device
ON auth_sessions(device_id);

CREATE INDEX IF NOT EXISTS
idx_auth_sessions_active
ON auth_sessions(user_id, revoked_at, expires_at);


-- ============================================================
-- 15. KYC HISTORY
--
-- Never rely only on the current kyc_records row.
-- Keep historical verification decisions.
-- ============================================================

CREATE TABLE IF NOT EXISTS kyc_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    kyc_record_id UUID
        REFERENCES kyc_records(id)
        ON DELETE SET NULL,

    tier INTEGER NOT NULL,

    status VARCHAR(50) NOT NULL,

    method VARCHAR(100),

    rejection_reason TEXT,

    provider_reference VARCHAR(150),

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS
idx_kyc_history_user
ON kyc_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS
idx_kyc_history_record
ON kyc_history(kyc_record_id);


-- ============================================================
-- 16. ADMIN ACTION LOG
--
-- Stronger tracking of administrative actions.
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    admin_user_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    target_user_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,

    reason TEXT,

    ip_address VARCHAR(100),

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS
idx_admin_actions_admin
ON admin_actions(admin_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS
idx_admin_actions_target
ON admin_actions(target_user_id, created_at DESC);


-- ============================================================
-- 17. REFUND / REVERSAL RECORDS
-- ============================================================

CREATE TABLE IF NOT EXISTS transaction_reversals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    transaction_id UUID NOT NULL
        REFERENCES transactions(id)
        ON DELETE RESTRICT,

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE RESTRICT,

    original_reference VARCHAR(100) NOT NULL,

    reversal_reference VARCHAR(100) NOT NULL UNIQUE,

    amount NUMERIC(18,2) NOT NULL,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    reason TEXT,

    status VARCHAR(30) NOT NULL DEFAULT 'completed',

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT transaction_reversals_amount_check
    CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS
idx_transaction_reversals_transaction
ON transaction_reversals(transaction_id);

CREATE INDEX IF NOT EXISTS
idx_transaction_reversals_account
ON transaction_reversals(account_id);


-- ============================================================
-- 18. ACCOUNT BALANCE SAFETY
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'accounts_balance_non_negative'
          AND conrelid = 'accounts'::regclass
    ) THEN

        ALTER TABLE accounts
        ADD CONSTRAINT accounts_balance_non_negative
        CHECK (balance >= 0);

    END IF;
END
$$;


-- ============================================================
-- 19. STANDARD ACCOUNT INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS
idx_users_status
ON users(status);

CREATE INDEX IF NOT EXISTS
idx_users_email
ON users(email);

CREATE INDEX IF NOT EXISTS
idx_users_phone
ON users(phone);

CREATE INDEX IF NOT EXISTS
idx_users_last_login
ON users(last_login_at);

CREATE INDEX IF NOT EXISTS
idx_transactions_account_status
ON transactions(account_id, status);

CREATE INDEX IF NOT EXISTS
idx_transactions_account_created
ON transactions(account_id, created_at DESC);


-- ============================================================
-- 20. CLEAN UP EXPIRED SECURITY DATA
--
-- These indexes make scheduled cleanup efficient.
-- ============================================================

CREATE INDEX IF NOT EXISTS
idx_security_tokens_expiry
ON security_tokens(expires_at);

CREATE INDEX IF NOT EXISTS
idx_webauthn_challenges_expiry
ON webauthn_challenges(expires_at);


COMMIT;

-- ============================================================
-- END STAGE 1
-- ============================================================
