-- ============================================================
-- ZENIMONIES BANKING DATABASE
-- Partnership-ready banking/payment platform
-- No investment functionality
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    full_name VARCHAR(150) NOT NULL,

    email VARCHAR(255) UNIQUE NOT NULL,

    phone VARCHAR(30) UNIQUE NOT NULL,

    password_hash TEXT NOT NULL,

    role VARCHAR(30) NOT NULL DEFAULT 'user',

    status VARCHAR(30) NOT NULL DEFAULT 'active',

    -- ========================================================
    -- KYC / VERIFICATION
    -- ========================================================

    kyc_status VARCHAR(30) NOT NULL DEFAULT 'pending',

    kyc_tier INTEGER NOT NULL DEFAULT 1,

    bvn VARCHAR(11),

    bvn_verified BOOLEAN NOT NULL DEFAULT false,

    id_verified BOOLEAN NOT NULL DEFAULT false,

    tier_3_verified BOOLEAN NOT NULL DEFAULT false,

    tier_3_method VARCHAR(50),

    is_verified BOOLEAN NOT NULL DEFAULT false,

    -- ========================================================
    -- ACCOUNT / TRANSFER LIMITS
    -- ========================================================

    account_limit NUMERIC(18,2) NOT NULL DEFAULT 200000.00,

    daily_transfer_limit NUMERIC(18,2) NOT NULL DEFAULT 50000.00,

    daily_transfer_used NUMERIC(18,2) NOT NULL DEFAULT 0.00,

    daily_transfer_reset_at TIMESTAMP
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT users_kyc_tier_check
        CHECK (kyc_tier IN (1, 2, 3)),

    CONSTRAINT users_kyc_status_check
        CHECK (
            kyc_status IN (
                'pending',
                'under_review',
                'approved',
                'rejected'
            )
        )
);


-- ============================================================
-- ACCOUNTS
-- ============================================================

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    account_number VARCHAR(30) UNIQUE NOT NULL,

    account_type VARCHAR(30) NOT NULL DEFAULT 'personal',

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    balance NUMERIC(18,2) NOT NULL DEFAULT 0.00,

    status VARCHAR(30) NOT NULL DEFAULT 'active',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- DEPOSIT ACCOUNTS
--
-- Provider-issued customer deposit accounts.
--
-- This table does NOT create fake bank accounts.
-- It stores real provider-issued account information after
-- an approved banking/payment provider supplies it.
-- ============================================================

CREATE TABLE IF NOT EXISTS deposit_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    account_number VARCHAR(50) UNIQUE NOT NULL,

    account_name VARCHAR(150) NOT NULL,

    bank_name VARCHAR(150) NOT NULL,

    bank_code VARCHAR(30),

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    status VARCHAR(30) NOT NULL DEFAULT 'active',

    provider VARCHAR(50),

    provider_customer_code VARCHAR(150),

    provider_account_id VARCHAR(150),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- VIRTUAL CARDS
-- One virtual card per user
-- ============================================================

CREATE TABLE IF NOT EXISTS virtual_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    card_number VARCHAR(19) UNIQUE NOT NULL,

    card_number_last4 VARCHAR(4) NOT NULL,

    expiry_month VARCHAR(2) NOT NULL,

    expiry_year VARCHAR(2) NOT NULL,

    cvv_hash TEXT NOT NULL,

    pin_hash TEXT NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'active',

    card_fee NUMERIC(18,2) NOT NULL DEFAULT 1000.00,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT virtual_cards_one_per_user
        UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_virtual_cards_user_id
ON virtual_cards(user_id);

CREATE INDEX IF NOT EXISTS idx_virtual_cards_account_id
ON virtual_cards(account_id);

CREATE INDEX IF NOT EXISTS idx_virtual_cards_status
ON virtual_cards(status);
-- ============================================================
-- TRANSACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL,

    amount NUMERIC(18,2) NOT NULL,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    reference VARCHAR(100) UNIQUE NOT NULL,

    description TEXT,

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    balance_before NUMERIC(18,2),

    balance_after NUMERIC(18,2),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- BENEFICIARIES
-- ============================================================

CREATE TABLE IF NOT EXISTS beneficiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    name VARCHAR(150) NOT NULL,

    bank_name VARCHAR(150) NOT NULL,

    bank_code VARCHAR(30),

    account_number VARCHAR(30) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- BANK TRANSFERS
-- ============================================================

CREATE TABLE IF NOT EXISTS bank_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    beneficiary_id UUID
        REFERENCES beneficiaries(id)
        ON DELETE SET NULL,

    recipient_name VARCHAR(150) NOT NULL,

    recipient_account_number VARCHAR(30) NOT NULL,

    recipient_bank_name VARCHAR(150) NOT NULL,

    recipient_bank_code VARCHAR(30),

    amount NUMERIC(18,2) NOT NULL,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    narration TEXT,

    reference VARCHAR(100) UNIQUE NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    provider_reference VARCHAR(100),

    failure_reason TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    completed_at TIMESTAMP
);


-- ============================================================
-- DEPOSITS
-- ============================================================

CREATE TABLE IF NOT EXISTS deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    amount NUMERIC(18,2) NOT NULL,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    reference VARCHAR(100) UNIQUE NOT NULL,

    provider_reference VARCHAR(100),

    payment_method VARCHAR(50),

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    failure_reason TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    completed_at TIMESTAMP
);


-- ============================================================
-- WITHDRAWALS
-- ============================================================

CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    amount NUMERIC(18,2) NOT NULL,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    reference VARCHAR(100) UNIQUE NOT NULL,

    destination_bank_name VARCHAR(150),

    destination_account_number VARCHAR(30),

    destination_account_name VARCHAR(150),

    provider_reference VARCHAR(100),

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    failure_reason TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    completed_at TIMESTAMP
);


-- ============================================================
-- AIRTIME
-- ============================================================

CREATE TABLE IF NOT EXISTS airtime_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    network VARCHAR(50) NOT NULL,

    phone_number VARCHAR(30) NOT NULL,

    amount NUMERIC(18,2) NOT NULL,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    reference VARCHAR(100) UNIQUE NOT NULL,

    provider_reference VARCHAR(100),

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    failure_reason TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    completed_at TIMESTAMP
);


-- ============================================================
-- DATA
-- ============================================================

CREATE TABLE IF NOT EXISTS data_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    network VARCHAR(50) NOT NULL,

    phone_number VARCHAR(30) NOT NULL,

    plan_code VARCHAR(100),

    plan_name VARCHAR(150),

    amount NUMERIC(18,2) NOT NULL,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    reference VARCHAR(100) UNIQUE NOT NULL,

    provider_reference VARCHAR(100),

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    failure_reason TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    completed_at TIMESTAMP
);


-- ============================================================
-- BILLERS
-- ============================================================

CREATE TABLE IF NOT EXISTS billers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL,

    category VARCHAR(50) NOT NULL,

    provider_code VARCHAR(100) UNIQUE,

    is_active BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- BILL PAYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS bill_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    biller_id UUID
        REFERENCES billers(id)
        ON DELETE SET NULL,

    category VARCHAR(50) NOT NULL,

    biller_name VARCHAR(150) NOT NULL,

    customer_reference VARCHAR(150) NOT NULL,

    customer_name VARCHAR(150),

    amount NUMERIC(18,2) NOT NULL,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    reference VARCHAR(100) UNIQUE NOT NULL,

    provider_reference VARCHAR(100),

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    failure_reason TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    completed_at TIMESTAMP
);


-- ============================================================
-- KYC RECORDS
-- ============================================================

CREATE TABLE IF NOT EXISTS kyc_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    -- ========================================================
    -- TIER 1 - BVN
    -- ========================================================

    bvn VARCHAR(11),

    bvn_verification_status VARCHAR(30)
        NOT NULL DEFAULT 'pending',

    bvn_verified_at TIMESTAMP,

    -- ========================================================
    -- TIER 2 - ID DOCUMENT
    -- ========================================================

    document_type VARCHAR(50),

    document_number VARCHAR(100),

    document_front_url TEXT,

    document_back_url TEXT,

    selfie_url TEXT,

    id_verification_status VARCHAR(30)
        NOT NULL DEFAULT 'pending',

    id_verified_at TIMESTAMP,

    -- ========================================================
    -- TIER 3
    --
    -- User chooses ONE:
    -- bank_statement
    -- utility_bill
    -- proof_of_address
    -- ========================================================

    tier_3_method VARCHAR(50),

    tier_3_document_url TEXT,

    tier_3_verification_status VARCHAR(30)
        NOT NULL DEFAULT 'pending',

    tier_3_verified_at TIMESTAMP,

    -- ========================================================
    -- GENERAL KYC STATUS
    -- ========================================================

    verification_status VARCHAR(30)
        NOT NULL DEFAULT 'pending',

    rejection_reason TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    title VARCHAR(200) NOT NULL,

    message TEXT NOT NULL,

    type VARCHAR(50) NOT NULL DEFAULT 'general',

    is_read BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- SECURITY TOKENS / OTP
-- ============================================================

CREATE TABLE IF NOT EXISTS security_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    token_hash TEXT NOT NULL,

    token_type VARCHAR(50) NOT NULL,

    expires_at TIMESTAMP NOT NULL,

    used_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,

    description TEXT,

    ip_address VARCHAR(100),

    user_agent TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- COMPATIBILITY / EXISTING DATABASES
--
-- These ALTER statements make the schema safe to run against
-- a database that was created using an older version.
-- ============================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS status VARCHAR(30)
NOT NULL DEFAULT 'active';

ALTER TABLE users
ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(30)
NOT NULL DEFAULT 'pending';

ALTER TABLE users
ADD COLUMN IF NOT EXISTS kyc_tier INTEGER
NOT NULL DEFAULT 1;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS bvn VARCHAR(11);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS bvn_verified BOOLEAN
NOT NULL DEFAULT false;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS id_verified BOOLEAN
NOT NULL DEFAULT false;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS tier_3_verified BOOLEAN
NOT NULL DEFAULT false;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS tier_3_method VARCHAR(50);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS account_limit NUMERIC(18,2)
NOT NULL DEFAULT 200000.00;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS daily_transfer_limit NUMERIC(18,2)
NOT NULL DEFAULT 50000.00;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS daily_transfer_used NUMERIC(18,2)
NOT NULL DEFAULT 0.00;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS daily_transfer_reset_at TIMESTAMP
NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN
NOT NULL DEFAULT false;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP
NOT NULL DEFAULT CURRENT_TIMESTAMP;


-- ============================================================
-- KYC RECORD COMPATIBILITY
-- ============================================================

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS bvn VARCHAR(11);

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS bvn_verification_status VARCHAR(30)
NOT NULL DEFAULT 'pending';

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS bvn_verified_at TIMESTAMP;

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS id_verification_status VARCHAR(30)
NOT NULL DEFAULT 'pending';

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS id_verified_at TIMESTAMP;

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS tier_3_method VARCHAR(50);

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS tier_3_document_url TEXT;

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS tier_3_verification_status VARCHAR(30)
NOT NULL DEFAULT 'pending';

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS tier_3_verified_at TIMESTAMP;

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30)
NOT NULL DEFAULT 'pending';

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP
NOT NULL DEFAULT CURRENT_TIMESTAMP;


-- ============================================================
-- ACCOUNT COMPATIBILITY
-- ============================================================

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP
NOT NULL DEFAULT CURRENT_TIMESTAMP;


-- ============================================================
-- BANK TRANSFER COMPATIBILITY
-- ============================================================

ALTER TABLE bank_transfers
ADD COLUMN IF NOT EXISTS beneficiary_id UUID;

-- Add the foreign key only when possible.
-- Existing databases that already have this relationship
-- will simply retain their existing constraint.


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_kyc_tier
ON users(kyc_tier);

CREATE INDEX IF NOT EXISTS idx_users_kyc_status
ON users(kyc_status);

CREATE INDEX IF NOT EXISTS idx_users_bvn
ON users(bvn);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id
ON accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_account_id
ON transactions(account_id);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at
ON transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id
ON beneficiaries(user_id);

CREATE INDEX IF NOT EXISTS idx_bank_transfers_account_id
ON bank_transfers(account_id);

CREATE INDEX IF NOT EXISTS idx_bank_transfers_reference
ON bank_transfers(reference);

CREATE INDEX IF NOT EXISTS idx_bank_transfers_created_at
ON bank_transfers(created_at);

CREATE INDEX IF NOT EXISTS idx_deposits_account_id
ON deposits(account_id);

CREATE INDEX IF NOT EXISTS idx_withdrawals_account_id
ON withdrawals(account_id);

CREATE INDEX IF NOT EXISTS idx_airtime_account_id
ON airtime_transactions(account_id);

CREATE INDEX IF NOT EXISTS idx_data_account_id
ON data_transactions(account_id);

CREATE INDEX IF NOT EXISTS idx_bill_payments_account_id
ON bill_payments(account_id);

CREATE INDEX IF NOT EXISTS idx_billers_category
ON billers(category);

CREATE INDEX IF NOT EXISTS idx_kyc_user_id
ON kyc_records(user_id);

CREATE INDEX IF NOT EXISTS idx_kyc_verification_status
ON kyc_records(verification_status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_security_tokens_user_id
ON security_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_deposit_accounts_user_id
ON deposit_accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_deposit_accounts_status
ON deposit_accounts(status);

CREATE INDEX IF NOT EXISTS idx_deposit_accounts_provider
ON deposit_accounts(provider);


-- ============================================================
-- DEFAULT BILLERS
-- ============================================================

INSERT INTO billers
    (name, category, provider_code)
VALUES
    ('Electricity', 'electricity', 'ELECTRICITY'),

    ('Cable TV', 'cable_tv', 'CABLE_TV'),

    ('Internet', 'internet', 'INTERNET'),

    ('Other Bills', 'other', 'OTHER')

ON CONFLICT (provider_code)
DO NOTHING;


-- ============================================================
-- DEFAULT LIMITS FOR EXISTING USERS
--
-- Existing users are treated as Tier 1 until they are
-- successfully upgraded.
-- ============================================================

UPDATE users
SET
    kyc_tier = 1,
    account_limit = 200000.00,
    daily_transfer_limit = 50000.00
WHERE kyc_tier IS NULL
   OR kyc_tier NOT IN (1, 2, 3);


UPDATE users
SET
    account_limit = 200000.00,
    daily_transfer_limit = 50000.00
WHERE kyc_tier = 1;


UPDATE users
SET
    account_limit = 500000.00,
    daily_transfer_limit = 200000.00
WHERE kyc_tier = 2;


UPDATE users
SET
    account_limit = NULL,
    daily_transfer_limit = 5000000.00
WHERE kyc_tier = 3;


-- ============================================================
-- END OF ZENIMONIES DATABASE SCHEMA
-- ============================================================
