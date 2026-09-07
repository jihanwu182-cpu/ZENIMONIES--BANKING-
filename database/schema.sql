-- =========================================================
-- ZENIMONIES BANKING DATABASE SCHEMA
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =========================================================
-- USERS
-- =========================================================

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


-- =========================================================
-- ACCOUNTS
-- =========================================================

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

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- TRANSACTIONS
-- =========================================================

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

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- INTERNAL TRANSFERS
-- Zenimonies account -> Zenimonies account
-- =========================================================

CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    sender_account_id UUID NOT NULL
        REFERENCES accounts(id),

    recipient_account_id UUID
        REFERENCES accounts(id),

    amount NUMERIC(18,2) NOT NULL,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    reference VARCHAR(100) UNIQUE NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    description TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- EXTERNAL BANK TRANSFERS
-- Zenimonies -> another bank
-- =========================================================

CREATE TABLE IF NOT EXISTS bank_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    recipient_name VARCHAR(150) NOT NULL,

    recipient_account_number VARCHAR(30) NOT NULL,

    recipient_bank_name VARCHAR(150) NOT NULL,

    recipient_bank_code VARCHAR(30),

    amount NUMERIC(18,2) NOT NULL,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    narration VARCHAR(255),

    reference VARCHAR(100) UNIQUE NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    provider_reference VARCHAR(150),

    failure_reason TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    completed_at TIMESTAMP
);


-- =========================================================
-- BENEFICIARIES
-- =========================================================

CREATE TABLE IF NOT EXISTS beneficiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    name VARCHAR(150) NOT NULL,

    bank_name VARCHAR(150) NOT NULL,

    bank_code VARCHAR(30),

    account_number VARCHAR(30) NOT NULL,

    account_name VARCHAR(150),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- DEPOSITS
-- =========================================================

CREATE TABLE IF NOT EXISTS deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    amount NUMERIC(18,2) NOT NULL,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    reference VARCHAR(100) UNIQUE NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    provider_reference VARCHAR(150),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    completed_at TIMESTAMP
);


-- =========================================================
-- WITHDRAWALS
-- =========================================================

CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    amount NUMERIC(18,2) NOT NULL,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    reference VARCHAR(100) UNIQUE NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    provider_reference VARCHAR(150),

    failure_reason TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    completed_at TIMESTAMP
);


-- =========================================================
-- KYC RECORDS
-- =========================================================

CREATE TABLE IF NOT EXISTS kyc_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    document_type VARCHAR(50),

    document_number VARCHAR(100),

    verification_status VARCHAR(30) NOT NULL DEFAULT 'pending',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- SERVICE PROVIDERS
-- =========================================================

CREATE TABLE IF NOT EXISTS service_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL,

    service_type VARCHAR(30) NOT NULL,

    code VARCHAR(50) UNIQUE,

    is_active BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- AIRTIME PURCHASES
-- =========================================================

CREATE TABLE IF NOT EXISTS airtime_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    provider_id UUID
        REFERENCES service_providers(id),

    phone_number VARCHAR(30) NOT NULL,

    amount NUMERIC(18,2) NOT NULL,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    reference VARCHAR(100) UNIQUE NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    provider_reference VARCHAR(150),

    failure_reason TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    completed_at TIMESTAMP
);


-- =========================================================
-- DATA PURCHASES
-- =========================================================

CREATE TABLE IF NOT EXISTS data_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    provider_id UUID
        REFERENCES service_providers(id),

    phone_number VARCHAR(30) NOT NULL,

    plan_code VARCHAR(100) NOT NULL,

    plan_name VARCHAR(150),

    amount NUMERIC(18,2) NOT NULL,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    reference VARCHAR(100) UNIQUE NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    provider_reference VARCHAR(150),

    failure_reason TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    completed_at TIMESTAMP
);


-- =========================================================
-- BILL PAYMENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS bill_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    provider_id UUID
        REFERENCES service_providers(id),

    bill_type VARCHAR(50) NOT NULL,

    customer_number VARCHAR(100) NOT NULL,

    customer_name VARCHAR(150),

    amount NUMERIC(18,2) NOT NULL,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    reference VARCHAR(100) UNIQUE NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    provider_reference VARCHAR(150),

    failure_reason TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    completed_at TIMESTAMP
);


-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_accounts_user_id
ON accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_account_id
ON transactions(account_id);

CREATE INDEX IF NOT EXISTS idx_transfers_sender
ON transfers(sender_account_id);

CREATE INDEX IF NOT EXISTS idx_transfers_recipient
ON transfers(recipient_account_id);

CREATE INDEX IF NOT EXISTS idx_bank_transfers_account_id
ON bank_transfers(account_id);

CREATE INDEX IF NOT EXISTS idx_bank_transfers_status
ON bank_transfers(status);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id
ON beneficiaries(user_id);

CREATE INDEX IF NOT EXISTS idx_deposits_account_id
ON deposits(account_id);

CREATE INDEX IF NOT EXISTS idx_withdrawals_account_id
ON withdrawals(account_id);

CREATE INDEX IF NOT EXISTS idx_kyc_user_id
ON kyc_records(user_id);

CREATE INDEX IF NOT EXISTS idx_service_providers_type
ON service_providers(service_type);

CREATE INDEX IF NOT EXISTS idx_airtime_account_id
ON airtime_purchases(account_id);

CREATE INDEX IF NOT EXISTS idx_data_account_id
ON data_purchases(account_id);

CREATE INDEX IF NOT EXISTS idx_bill_payments_account_id
ON bill_payments(account_id);


-- =========================================================
-- END OF ZENIMONIES DATABASE SCHEMA
-- =========================================================
