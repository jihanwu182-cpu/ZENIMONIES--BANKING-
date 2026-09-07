-- Zenimonies Banking Database Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(30) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'user',
    kyc_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_number VARCHAR(30) UNIQUE NOT NULL,
    account_type VARCHAR(30) NOT NULL DEFAULT 'personal',
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    balance NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    amount NUMERIC(18,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    reference VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Transfers
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_account_id UUID NOT NULL REFERENCES accounts(id),
    recipient_account_id UUID NOT NULL REFERENCES accounts(id),
    amount NUMERIC(18,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    reference VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Deposits
CREATE TABLE IF NOT EXISTS deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    amount NUMERIC(18,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    reference VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    amount NUMERIC(18,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    reference VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- KYC records
CREATE TABLE IF NOT EXISTS kyc_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(50),
    document_number VARCHAR(100),
    verification_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accounts_user_id
ON accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_account_id
ON transactions(account_id);

CREATE INDEX IF NOT EXISTS idx_transfers_sender
ON transfers(sender_account_id);

CREATE INDEX IF NOT EXISTS idx_transfers_recipient
ON transfers(recipient_account_id);

CREATE INDEX IF NOT EXISTS idx_deposits_account_id
ON deposits(account_id);

CREATE INDEX IF NOT EXISTS idx_withdrawals_account_id
ON withdrawals(account_id);

CREATE INDEX IF NOT EXISTS idx_kyc_user_id
ON kyc_records(user_id);
