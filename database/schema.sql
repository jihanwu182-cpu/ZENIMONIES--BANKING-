-- ============================================================
-- ZENIMONIES BANKING DATABASE
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

    kyc_status VARCHAR(30) NOT NULL DEFAULT 'pending',

    is_verified BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
-- TRANSACTIONS
-- Central transaction history
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
-- Saved bank recipients
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
-- AIRTIME PURCHASES
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
-- DATA PURCHASES
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
-- Electricity, TV, internet and other bill providers
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

    document_type VARCHAR(50),

    document_number VARCHAR(100),

    document_front_url TEXT,

    document_back_url TEXT,

    selfie_url TEXT,

    verification_status VARCHAR(30) NOT NULL DEFAULT 'pending',

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
-- LOGIN / SECURITY TOKENS
-- Used later for OTP/password reset/security flows
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
-- Records important account actions
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
-- INDEXES
-- ============================================================

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


CREATE INDEX IF NOT EXISTS idx_notifications_user_id
ON notifications(user_id);


CREATE INDEX IF NOT EXISTS idx_security_tokens_user_id
ON security_tokens(user_id);


CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
ON audit_logs(user_id);


-- ============================================================
-- EXISTING DATABASE COMPATIBILITY
-- ============================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS status VARCHAR(30)
NOT NULL DEFAULT 'active';


ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP
NOT NULL DEFAULT CURRENT_TIMESTAMP;


ALTER TABLE bank_transfers
ADD COLUMN IF NOT EXISTS beneficiary_id UUID
REFERENCES beneficiaries(id)
ON DELETE SET NULL;


-- ============================================================
-- DEFAULT BILLER CATEGORIES
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
