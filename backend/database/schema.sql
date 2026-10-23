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

    gender VARCHAR(30),
    
    password_hash TEXT NOT NULL,

    role VARCHAR(30) NOT NULL DEFAULT 'user',

    status VARCHAR(30) NOT NULL DEFAULT 'active',

    -- ========================================================
    -- LEGAL IDENTITY
    -- ========================================================

    date_of_birth DATE,

    legal_name VARCHAR(150),

        legal_name_locked BOOLEAN NOT NULL DEFAULT false,

    legal_dob_locked BOOLEAN NOT NULL DEFAULT false,

    -- ========================================================
    -- PROFILE INFORMATION
    -- ========================================================

    address TEXT,

    city VARCHAR(100),

    state VARCHAR(100),

    lga VARCHAR(100),

    country VARCHAR(100) NOT NULL DEFAULT 'Nigeria',

    profile_photo TEXT,

    -- ========================================================
    -- KYC / VERIFICATION
    -- ========================================================

    kyc_status VARCHAR(30) NOT NULL DEFAULT 'not_verified',

    kyc_tier INTEGER NOT NULL DEFAULT 0,

    bvn VARCHAR(11),

    bvn_verified BOOLEAN NOT NULL DEFAULT false,

    id_verified BOOLEAN NOT NULL DEFAULT false,

    tier_3_verified BOOLEAN NOT NULL DEFAULT false,

    tier_3_method VARCHAR(50),

    is_verified BOOLEAN NOT NULL DEFAULT false,

    -- ========================================================
    -- ACCOUNT / TRANSFER LIMITS
    -- ========================================================

    account_limit NUMERIC(18,2) NOT NULL DEFAULT 50000.00,

    daily_transfer_limit NUMERIC(18,2) NOT NULL DEFAULT 20000.00,

    daily_transfer_used NUMERIC(18,2) NOT NULL DEFAULT 0.00,

    daily_transfer_reset_at TIMESTAMP
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT users_kyc_tier_check
        CHECK (kyc_tier IN (0, 1, 2, 3)),

    CONSTRAINT users_kyc_status_check
        CHECK (
            kyc_status IN (
                'not_verified',
                'pending',
                'under_review',
                'approved',
                'verified',
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

    transaction_fee NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    
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

    recipient_account_number VARCHAR(30),

    recipient_phone VARCHAR(30),

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
-- AIRTIME PAYMENT DETAILS
-- ============================================================

ALTER TABLE airtime_transactions
ADD COLUMN IF NOT EXISTS provider_request_id VARCHAR(150);

ALTER TABLE airtime_transactions
ADD COLUMN IF NOT EXISTS commission_details JSONB;

ALTER TABLE airtime_transactions
ADD COLUMN IF NOT EXISTS provider_response JSONB;

-- ============================================================
-- AIRTIME PROVIDER REQUEST INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_airtime_provider_request
ON airtime_transactions(provider_request_id);

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
-- DATA PAYMENT DETAILS
-- ============================================================

ALTER TABLE data_transactions
ADD COLUMN IF NOT EXISTS commission_details JSONB;

ALTER TABLE data_transactions
ADD COLUMN IF NOT EXISTS provider_response JSONB;

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
-- ELECTRICITY BILL PAYMENT DETAILS
-- ============================================================

ALTER TABLE bill_payments
ADD COLUMN IF NOT EXISTS meter_type VARCHAR(20);

ALTER TABLE bill_payments
ADD COLUMN IF NOT EXISTS meter_number VARCHAR(50);

ALTER TABLE bill_payments
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30)
NOT NULL DEFAULT 'not_verified';

ALTER TABLE bill_payments
ADD COLUMN IF NOT EXISTS verified_customer_name VARCHAR(150);

ALTER TABLE bill_payments
ADD COLUMN IF NOT EXISTS verified_customer_address TEXT;

ALTER TABLE bill_payments
ADD COLUMN IF NOT EXISTS electricity_token TEXT;

ALTER TABLE bill_payments
ADD COLUMN IF NOT EXISTS units VARCHAR(50);

ALTER TABLE bill_payments
ADD COLUMN IF NOT EXISTS tariff_class VARCHAR(100);

ALTER TABLE bill_payments
ADD COLUMN IF NOT EXISTS provider_response_message TEXT;


-- ============================================================
-- ELECTRICITY BILL PAYMENT INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bill_payments_meter_number
ON bill_payments(meter_number);

CREATE INDEX IF NOT EXISTS idx_bill_payments_verification_status
ON bill_payments(verification_status);

CREATE INDEX IF NOT EXISTS idx_bill_payments_provider_reference
ON bill_payments(provider_reference);


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

    bvn_rejection_reason TEXT,

    bvn_provider_reference VARCHAR(150),

    bvn_verified_name VARCHAR(150),

    bvn_verified_date_of_birth DATE,

    -- ========================================================
    -- TIER 2 - ID DOCUMENT
    -- ========================================================

    document_type VARCHAR(50),

    document_number VARCHAR(100),

    document_front_url TEXT,

    document_back_url TEXT,

    selfie_url TEXT,

    liveness_status VARCHAR(30)
    NOT NULL DEFAULT 'pending',

liveness_score NUMERIC(5,2),

selfie_match_score NUMERIC(5,2),

liveness_provider_reference VARCHAR(150),

    id_verification_status VARCHAR(30)
        NOT NULL DEFAULT 'pending',

    id_verified_at TIMESTAMP,

    id_rejection_reason TEXT,

    -- ========================================================
    -- TIER 3
    -- ========================================================

    tier_3_method VARCHAR(50),

    tier_3_document_url TEXT,

    tier_3_verification_status VARCHAR(30)
        NOT NULL DEFAULT 'pending',

    tier_3_verified_at TIMESTAMP,

    tier_3_rejection_reason TEXT,

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
-- AUTHENTICATION SESSIONS
-- ============================================================
--
-- Server-side sessions allow Zenimonies to enforce an
-- inactivity timeout independently of JWT expiration.
--
-- A session becomes inactive/locked after 5 minutes without
-- authenticated activity.
-- ============================================================

CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    session_token_hash TEXT NOT NULL UNIQUE,

    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    last_activity_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    expires_at TIMESTAMP NOT NULL,

    revoked_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
ON auth_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_hash
ON auth_sessions(session_token_hash);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
ON auth_sessions(expires_at);

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
-- ============================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS status VARCHAR(30)
NOT NULL DEFAULT 'active';

ALTER TABLE users
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS legal_name VARCHAR(150);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS legal_name_locked BOOLEAN
NOT NULL DEFAULT false;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS legal_dob_locked BOOLEAN
NOT NULL DEFAULT false;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(30)
NOT NULL DEFAULT 'not_verified';

ALTER TABLE users
ADD COLUMN IF NOT EXISTS kyc_tier INTEGER
NOT NULL DEFAULT 0;

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
NOT NULL DEFAULT 50000.00;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS daily_transfer_limit NUMERIC(18,2)
NOT NULL DEFAULT 25000.00;

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
ADD COLUMN IF NOT EXISTS bvn_rejection_reason TEXT;

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS bvn_provider_reference VARCHAR(150);

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS bvn_verified_name VARCHAR(150);

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS bvn_verified_date_of_birth DATE;

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS liveness_status VARCHAR(30)
NOT NULL DEFAULT 'pending';

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS liveness_provider_reference VARCHAR(150);

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS id_rejection_reason TEXT;

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS tier_3_rejection_reason TEXT;

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
-- DOJAH KYC SESSION REFERENCES
-- ============================================================

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS dojah_reference VARCHAR(150);

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS dojah_verification_type VARCHAR(30);

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS dojah_started_at TIMESTAMP;

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS dojah_checked_at TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS
idx_kyc_dojah_reference_unique
ON kyc_records (dojah_reference)
WHERE dojah_reference IS NOT NULL;
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
ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(30);

ALTER TABLE bank_transfers
ALTER COLUMN recipient_account_number DROP NOT NULL;

-- ============================================================
-- BENEFICIARIES COMPATIBILITY
-- Supports both ZENIMONIES and external bank recipients
-- ============================================================

ALTER TABLE beneficiaries
ADD COLUMN IF NOT EXISTS recipient_type VARCHAR(20)
NOT NULL DEFAULT 'bank';

ALTER TABLE beneficiaries
ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(30);

ALTER TABLE beneficiaries
ALTER COLUMN account_number DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_type
ON beneficiaries(user_id, recipient_type);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_phone
ON beneficiaries(user_id, recipient_phone);


-- ============================================================
-- ZENIMONIES SAVINGS DATABASE
-- ============================================================

CREATE TABLE IF NOT EXISTS savings_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE RESTRICT,

    amount NUMERIC(18,2) NOT NULL
        CHECK (amount >= 5000),

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN'
        CHECK (currency = 'NGN'),

    duration_days INTEGER NOT NULL
        CHECK (duration_days IN (30, 60, 90, 180, 365)),

    start_date TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    maturity_date TIMESTAMPTZ NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (
            status IN (
                'active',
                'matured',
                'completed'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_savings_maturity
        CHECK (
            maturity_date =
            start_date + (duration_days * INTERVAL '1 day')
        )
);

CREATE INDEX IF NOT EXISTS idx_savings_plans_user
ON savings_plans(user_id);

CREATE INDEX IF NOT EXISTS idx_savings_plans_account
ON savings_plans(account_id);

CREATE INDEX IF NOT EXISTS idx_savings_plans_maturity
ON savings_plans(maturity_date)
WHERE status = 'active';

ALTER TABLE savings_plans
ADD COLUMN IF NOT EXISTS
maturity_transaction_reference VARCHAR(100) UNIQUE;
-- ============================================================
-- NOTIFICATIONS COMPATIBILITY
-- ============================================================

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
ON notifications(created_at DESC);


-- ============================================================
-- PASSKEY / WEBAUTHN CREDENTIALS
-- ============================================================

CREATE TABLE IF NOT EXISTS passkey_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    credential_id TEXT NOT NULL UNIQUE,

    public_key TEXT NOT NULL,

    counter BIGINT NOT NULL DEFAULT 0,

    device_type VARCHAR(50),

    backed_up BOOLEAN NOT NULL DEFAULT false,

    transports TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    last_used_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_passkey_credentials_user_id
ON passkey_credentials(user_id);

CREATE INDEX IF NOT EXISTS idx_passkey_credentials_credential_id
ON passkey_credentials(credential_id);

CREATE INDEX IF NOT EXISTS idx_passkey_credentials_last_used_at
ON passkey_credentials(last_used_at);

-- ============================================================
-- WEBAUTHN CHALLENGES
-- ============================================================

CREATE TABLE IF NOT EXISTS webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    challenge TEXT NOT NULL,

    challenge_type VARCHAR(30) NOT NULL,

    expires_at TIMESTAMP NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user_id
ON webauthn_challenges(user_id);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_type
ON webauthn_challenges(challenge_type);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires_at
ON webauthn_challenges(expires_at);

-- ============================================================
-- PASSKEY AUTHENTICATION ATTEMPTS
-- ============================================================
--
-- Tracks failed Passkey/WebAuthn authentication attempts.
-- This is used to enforce the Passkey failure fallback policy.
--
-- Login policy:
-- Passkey/Biometric → maximum 3 failed attempts → Password
--
-- No biometric data is stored by Zenimonies.
-- ============================================================

CREATE TABLE IF NOT EXISTS passkey_auth_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES users(id)
        ON DELETE CASCADE,

    email VARCHAR(255),

    attempt_type VARCHAR(30) NOT NULL DEFAULT 'login',

    failed_attempts INTEGER NOT NULL DEFAULT 0,

    locked_until TIMESTAMP,

    last_failed_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_passkey_auth_attempts_user_id
ON passkey_auth_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_passkey_auth_attempts_email
ON passkey_auth_attempts(email);

CREATE INDEX IF NOT EXISTS idx_passkey_auth_attempts_type
ON passkey_auth_attempts(attempt_type);


-- ============================================================
-- ACCOUNT UNLOCK PASSCODE
-- ============================================================
--
-- This is the 6-digit Passcode used ONLY to unlock the
-- Zenimonies account/app after Passkey/Face ID fallback.
--
-- IMPORTANT:
-- - This is NOT the Transaction PIN.
-- - Transaction PIN will be exactly 4 digits and stored
--   separately.
-- - The actual Passcode is NEVER stored.
-- - Only a secure password hash is stored.
-- - Failed attempts are tracked server-side.
-- ============================================================

CREATE TABLE IF NOT EXISTS account_passcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    passcode_hash TEXT NOT NULL,

    failed_attempts INTEGER NOT NULL DEFAULT 0,

    locked_until TIMESTAMP,

    last_failed_at TIMESTAMP,

    last_used_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT account_passcodes_one_per_user
        UNIQUE (user_id),

    CONSTRAINT account_passcodes_failed_attempts_check
        CHECK (failed_attempts >= 0)
);

CREATE INDEX IF NOT EXISTS idx_account_passcodes_user_id
ON account_passcodes(user_id);

CREATE INDEX IF NOT EXISTS idx_account_passcodes_locked_until
ON account_passcodes(locked_until);


-- ============================================================
-- TV PAYMENT DETAILS
-- ============================================================

ALTER TABLE bill_payments
ADD COLUMN IF NOT EXISTS provider_request_id VARCHAR(150);

ALTER TABLE bill_payments
ADD COLUMN IF NOT EXISTS commission_details JSONB;

ALTER TABLE bill_payments
ADD COLUMN IF NOT EXISTS provider_response JSONB;

CREATE INDEX IF NOT EXISTS idx_bill_payments_provider_request
ON bill_payments(provider_request_id);


-- ============================================================
-- ZENIMONIES BANKING
-- STAGE 1: BUSINESS AND POS TERMINAL REGISTRY
-- PostgreSQL
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- BUSINESS PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    business_account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE RESTRICT,

    business_name VARCHAR(200) NOT NULL,

    registration_number VARCHAR(100),

    business_type VARCHAR(100),

    country VARCHAR(10) NOT NULL DEFAULT 'NG',

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    business_address TEXT,

    verification_status VARCHAR(30)
        NOT NULL DEFAULT 'pending'
        CHECK (
            verification_status IN (
                'pending',
                'under_review',
                'verified',
                'rejected'
            )
        ),

    status VARCHAR(30)
        NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'active',
                'suspended',
                'closed'
            )
        ),

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (business_account_id)
);

CREATE INDEX IF NOT EXISTS
    idx_businesses_owner
ON businesses(owner_user_id);

CREATE INDEX IF NOT EXISTS
    idx_businesses_status
ON businesses(status, verification_status);

-- ============================================================
-- POS TERMINALS
-- ============================================================

CREATE TABLE IF NOT EXISTS pos_terminals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    terminal_id VARCHAR(40) NOT NULL UNIQUE,

    business_id UUID NOT NULL
        REFERENCES businesses(id)
        ON DELETE RESTRICT,

    business_account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE RESTRICT,

    terminal_name VARCHAR(100),

    manufacturer VARCHAR(100),

    model VARCHAR(100),

    serial_number VARCHAR(150),

    device_fingerprint TEXT,

    -- Store a hash of the terminal secret, never
    -- the raw terminal secret.
    secret_hash TEXT NOT NULL,

    status VARCHAR(30)
        NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'active',
                'disabled',
                'revoked'
            )
        ),

    last_seen_at TIMESTAMPTZ,

    activated_at TIMESTAMPTZ,

    activated_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS
    idx_pos_terminals_business
ON pos_terminals(business_id);

CREATE INDEX IF NOT EXISTS
    idx_pos_terminals_account
ON pos_terminals(business_account_id);

CREATE INDEX IF NOT EXISTS
    idx_pos_terminals_status
ON pos_terminals(status);

CREATE INDEX IF NOT EXISTS
    idx_pos_terminals_serial
ON pos_terminals(serial_number);

-- ============================================================
-- POS TERMINAL AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS pos_terminal_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    terminal_id UUID NOT NULL
        REFERENCES pos_terminals(id)
        ON DELETE RESTRICT,

    actor_user_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    action VARCHAR(50) NOT NULL,

    details JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS
    idx_pos_terminal_audit_terminal
ON pos_terminal_audit(terminal_id, created_at DESC);

-- ============================================================
-- END STAGE 1 SCHEMA
-- ============================================================
-- ============================================================
-- ZENIMONIES: REGISTRATION PROFILE FIELDS
-- ============================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS surname VARCHAR(100);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS registration_account_type VARCHAR(20)
NOT NULL DEFAULT 'personal';


-- Allow only the two registration account choices.
-- Safely create the constraint only if it does not exist.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
            'users_registration_account_type_check'
          AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT users_registration_account_type_check
        CHECK (
            registration_account_type
            IN ('personal', 'business')
        );
    END IF;
END
$$;

-- ============================================================
-- ZENIMONIES SMS ALERT PREFERENCES
-- ============================================================

CREATE TABLE IF NOT EXISTS sms_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL UNIQUE
        REFERENCES users(id)
        ON DELETE CASCADE,

    transaction_alerts BOOLEAN NOT NULL DEFAULT true,

    security_alerts BOOLEAN NOT NULL DEFAULT true,

    promotional_alerts BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_kyc_tier
ON users(kyc_tier);

CREATE INDEX IF NOT EXISTS idx_users_kyc_status
ON users(kyc_status);

CREATE INDEX IF NOT EXISTS idx_users_bvn
ON users(bvn);

CREATE INDEX IF NOT EXISTS idx_users_date_of_birth
ON users(date_of_birth);

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
-- EXISTING USER NORMALIZATION
--
-- IMPORTANT:
-- Existing users are NOT automatically marked verified.
--
-- If their KYC status was previously "approved", it remains
-- approved and can later be normalized by the KYC controller.
-- ============================================================

UPDATE users
SET kyc_status = 'not_verified'
WHERE kyc_status IS NULL
   OR TRIM(kyc_status) = '';


-- ============================================================
-- NORMALIZE EXISTING USERS WHO HAVE NO SUCCESSFUL VERIFICATION
-- ============================================================

UPDATE users
SET
    kyc_status = 'not_verified',
    kyc_tier = 0,
    account_limit = 50000.00,
    daily_transfer_limit = 20000.00
WHERE COALESCE(bvn_verified, false) = false
  AND COALESCE(id_verified, false) = false
  AND COALESCE(tier_3_verified, false) = false
  AND (
      kyc_status IN (
          'pending',
          'under_review'
      )
      OR kyc_status IS NULL
  );


-- ============================================================
-- VERIFIED TIER 1
-- ============================================================

UPDATE users
SET
    kyc_status = 'approved',
    kyc_tier = 1,
    account_limit = 300000.00,
    daily_transfer_limit = 50000.00
WHERE bvn_verified = true
  AND id_verified = false
  AND tier_3_verified = false;


-- ============================================================
-- VERIFIED TIER 2
-- ============================================================

UPDATE users
SET
    kyc_status = 'approved',
    kyc_tier = 2,
    account_limit = 500000.00,
    daily_transfer_limit = 200000.00
WHERE id_verified = true
  AND tier_3_verified = false;


-- ============================================================
-- VERIFIED TIER 3
-- ============================================================

UPDATE users
SET
    kyc_status = 'approved',
    kyc_tier = 3,
    account_limit = 999999999999.99,
    daily_transfer_limit = 5000000.00
WHERE tier_3_verified = true;

-- ============================================================
-- ZENIMONIES KYC STATUS FIX
-- ============================================================

-- ------------------------------------------------------------
-- 1. Fix existing records where ONLY BVN was submitted.
--
-- We only reset Tier 2/Tier 3 when there is no evidence that
-- those submissions were actually made.
-- ------------------------------------------------------------

UPDATE kyc_records
SET
    id_verification_status = 'not_verified',
    liveness_status = 'not_verified',
    tier_3_verification_status = 'not_verified',
    updated_at = CURRENT_TIMESTAMP
WHERE bvn_verification_status = 'pending'
  AND document_type IS NULL
  AND document_number IS NULL
  AND document_front_url IS NULL
  AND document_back_url IS NULL
  AND selfie_url IS NULL
  AND tier_3_method IS NULL
  AND tier_3_document_url IS NULL;


-- ------------------------------------------------------------
-- 2. Change the database defaults.
--
-- A brand-new KYC record must NOT automatically make every
-- verification method pending.
-- ------------------------------------------------------------

ALTER TABLE kyc_records
ALTER COLUMN bvn_verification_status
SET DEFAULT 'not_verified';

ALTER TABLE kyc_records
ALTER COLUMN id_verification_status
SET DEFAULT 'not_verified';

ALTER TABLE kyc_records
ALTER COLUMN liveness_status
SET DEFAULT 'not_verified';

ALTER TABLE kyc_records
ALTER COLUMN tier_3_verification_status
SET DEFAULT 'not_verified';


-- ------------------------------------------------------------
-- 3. Keep the general record status separate.
--
-- A record can have an overall pending workflow while individual
-- verification methods remain Not Verified.
-- ------------------------------------------------------------

ALTER TABLE kyc_records
ALTER COLUMN verification_status
SET DEFAULT 'not_verified';

-- ============================================================
-- ZENIMONIES SAVINGS MATURITY MIGRATION
-- ============================================================

ALTER TABLE savings_plans
ADD COLUMN IF NOT EXISTS
maturity_transaction_reference VARCHAR(100);

-- Prevent duplicate maturity transaction references.
CREATE UNIQUE INDEX IF NOT EXISTS
idx_savings_maturity_transaction_reference
ON savings_plans (maturity_transaction_reference)
WHERE maturity_transaction_reference IS NOT NULL;

-- ============================================================
-- ZENIMONIES SAVE WALLET
-- ============================================================
--
-- This is the customer's flexible Save Wallet.
--
-- IMPORTANT:
-- This is NOT the existing savings_plans table.
--
-- savings_plans = fixed-duration savings/maturity product
-- save_wallets  = flexible customer wallet
--
-- The Save Wallet is funded by:
-- 1. Manual "Save Money"
-- 2. Spend & Save automatic savings
--
-- Money can be withdrawn from the Save Wallet back into
-- the customer's main account.
-- ============================================================


-- ============================================================
-- SAVE WALLETS
-- ============================================================

CREATE TABLE IF NOT EXISTS save_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    balance NUMERIC(18,2) NOT NULL DEFAULT 0.00,

    -- ========================================================
    -- SPEND & SAVE
    -- ========================================================

    spend_save_enabled BOOLEAN NOT NULL DEFAULT false,

    spend_save_amount NUMERIC(18,2) NOT NULL DEFAULT 0.00,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    -- One Save Wallet per account
    CONSTRAINT save_wallets_one_per_account
        UNIQUE (account_id),

    -- One Save Wallet per user
    CONSTRAINT save_wallets_one_per_user
        UNIQUE (user_id),

    -- Wallet balance cannot be negative
    CONSTRAINT save_wallets_balance_check
        CHECK (balance >= 0.00),

    -- Save amount cannot be negative
    CONSTRAINT save_wallets_spend_save_amount_check
        CHECK (spend_save_amount >= 0.00),

    -- Save Wallet currently supports NGN
    CONSTRAINT save_wallets_currency_check
        CHECK (currency = 'NGN')
);


-- ============================================================
-- SAVE WALLET TRANSACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS save_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    wallet_id UUID NOT NULL
        REFERENCES save_wallets(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    type VARCHAR(40) NOT NULL,

    direction VARCHAR(10) NOT NULL,

    amount NUMERIC(18,2) NOT NULL,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    reference VARCHAR(100) NOT NULL UNIQUE,

    description TEXT,

    balance_before NUMERIC(18,2) NOT NULL,

    balance_after NUMERIC(18,2) NOT NULL,

    related_transaction_id UUID
        REFERENCES transactions(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    -- ========================================================
    -- VALIDATION
    -- ========================================================

    CONSTRAINT save_wallet_transaction_amount_check
        CHECK (amount > 0.00),

    CONSTRAINT save_wallet_transaction_direction_check
        CHECK (
            direction IN (
                'credit',
                'debit'
            )
        ),

    CONSTRAINT save_wallet_transaction_type_check
        CHECK (
            type IN (
                'manual_save',
                'spend_save',
                'withdrawal',
                'reversal',
                'adjustment'
            )
        ),

    CONSTRAINT save_wallet_transaction_balance_before_check
        CHECK (balance_before >= 0.00),

    CONSTRAINT save_wallet_transaction_balance_after_check
        CHECK (balance_after >= 0.00),

    CONSTRAINT save_wallet_transaction_currency_check
        CHECK (currency = 'NGN')
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_save_wallets_user_id
ON save_wallets(user_id);

CREATE INDEX IF NOT EXISTS idx_save_wallets_account_id
ON save_wallets(account_id);

CREATE INDEX IF NOT EXISTS idx_save_wallet_transactions_wallet
ON save_wallet_transactions(wallet_id);

CREATE INDEX IF NOT EXISTS idx_save_wallet_transactions_user
ON save_wallet_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_save_wallet_transactions_account
ON save_wallet_transactions(account_id);

CREATE INDEX IF NOT EXISTS idx_save_wallet_transactions_created
ON save_wallet_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_save_wallet_transactions_type
ON save_wallet_transactions(type);

CREATE INDEX IF NOT EXISTS idx_save_wallet_transactions_reference
ON save_wallet_transactions(reference);


-- ============================================================
-- END SAVE WALLET
-- ============================================================


-- ============================================================
-- ZENIMONIES BANKING
-- REVENUE ACCOUNTING TABLES
-- Add inside schema.sql after the users table is defined.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. REVENUE PARTNERS
CREATE TABLE IF NOT EXISTS revenue_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_name VARCHAR(200) NOT NULL,
    partner_type VARCHAR(50) NOT NULL DEFAULT 'payment_provider',
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT revenue_partners_status_check
        CHECK (status IN ('pending', 'active', 'suspended', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_revenue_partners_status
ON revenue_partners(status);


-- 2. PARTNER COMMERCIAL TERMS
CREATE TABLE IF NOT EXISTS revenue_partner_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL
        REFERENCES revenue_partners(id) ON DELETE RESTRICT,
    service_type VARCHAR(60) NOT NULL,
    share_basis VARCHAR(40) NOT NULL,
    fixed_charge NUMERIC(18,2),
    percentage_rate NUMERIC(7,4),
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    effective_from TIMESTAMPTZ NOT NULL,
    effective_until TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT revenue_partner_terms_basis_check
        CHECK (share_basis IN (
            'fixed_per_transaction',
            'percent_of_customer_fee',
            'percent_after_provider_cost'
        )),

    CONSTRAINT revenue_partner_terms_status_check
        CHECK (status IN ('draft', 'approved', 'expired', 'cancelled')),

    CONSTRAINT revenue_partner_terms_amount_check
        CHECK (
            (fixed_charge IS NULL OR fixed_charge >= 0)
            AND (
                percentage_rate IS NULL
                OR percentage_rate BETWEEN 0 AND 100
            )
        ),

    CONSTRAINT revenue_partner_terms_dates_check
        CHECK (
            effective_until IS NULL
            OR effective_until > effective_from
        )
);

CREATE INDEX IF NOT EXISTS idx_revenue_partner_terms_lookup
ON revenue_partner_terms(partner_id, service_type, status, effective_from);


-- 3. REVENUE LEDGER
CREATE TABLE IF NOT EXISTS revenue_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revenue_reference VARCHAR(100) NOT NULL UNIQUE,
    entry_kind VARCHAR(20) NOT NULL DEFAULT 'original',

    reversal_of_id UUID
        REFERENCES revenue_ledger(id) ON DELETE RESTRICT,

    replaces_id UUID
        REFERENCES revenue_ledger(id) ON DELETE RESTRICT,

    service_type VARCHAR(60) NOT NULL,
    source_type VARCHAR(60) NOT NULL,
    source_id UUID,
    source_reference VARCHAR(150),

    customer_user_id UUID
        REFERENCES users(id) ON DELETE SET NULL,

    partner_id UUID
        REFERENCES revenue_partners(id) ON DELETE RESTRICT,

    partner_terms_id UUID
        REFERENCES revenue_partner_terms(id) ON DELETE RESTRICT,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    gross_fee NUMERIC(18,2) NOT NULL DEFAULT 0,
    provider_cost NUMERIC(18,2),
    partner_share NUMERIC(18,2),
    other_direct_cost NUMERIC(18,2),
    zenimonies_revenue NUMERIC(18,2),

    accounting_status VARCHAR(30) NOT NULL DEFAULT 'incomplete',
    transaction_status VARCHAR(30) NOT NULL DEFAULT 'pending',

    description TEXT,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    posted_at TIMESTAMPTZ,
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT revenue_ledger_entry_kind_check
        CHECK (entry_kind IN ('original', 'reversal')),

    CONSTRAINT revenue_ledger_entry_links_check
        CHECK (
            (entry_kind = 'original' AND reversal_of_id IS NULL)
            OR
            (
                entry_kind = 'reversal'
                AND reversal_of_id IS NOT NULL
                AND replaces_id IS NULL
            )
        ),

    CONSTRAINT revenue_ledger_status_check
        CHECK (accounting_status IN (
            'incomplete', 'ready', 'posted', 'reversed'
        )),

    CONSTRAINT revenue_ledger_transaction_status_check
        CHECK (transaction_status IN (
            'pending', 'completed', 'failed', 'reversed', 'refunded'
        )),

    CONSTRAINT revenue_ledger_amounts_check
        CHECK (
            (
                entry_kind = 'original'
                AND gross_fee >= 0
                AND (provider_cost IS NULL OR provider_cost >= 0)
                AND (partner_share IS NULL OR partner_share >= 0)
                AND (other_direct_cost IS NULL OR other_direct_cost >= 0)
            )
            OR
            (
                entry_kind = 'reversal'
                AND gross_fee <= 0
                AND (provider_cost IS NULL OR provider_cost <= 0)
                AND (partner_share IS NULL OR partner_share <= 0)
                AND (other_direct_cost IS NULL OR other_direct_cost <= 0)
            )
        ),

    CONSTRAINT revenue_ledger_revenue_calculation_check
        CHECK (
            provider_cost IS NULL
            OR partner_share IS NULL
            OR other_direct_cost IS NULL
            OR zenimonies_revenue IS NULL
            OR zenimonies_revenue =
                gross_fee - provider_cost
                - partner_share - other_direct_cost
        ),

    CONSTRAINT revenue_ledger_posted_check
        CHECK (
            accounting_status <> 'posted'
            OR (
                transaction_status IN ('completed', 'reversed', 'refunded')
                AND provider_cost IS NOT NULL
                AND partner_share IS NOT NULL
                AND other_direct_cost IS NOT NULL
                AND zenimonies_revenue IS NOT NULL
                AND posted_at IS NOT NULL
            )
        ),

    CONSTRAINT revenue_ledger_reversal_reason_check
        CHECK (
            entry_kind <> 'reversal'
            OR NULLIF(BTRIM(reversal_reason), '') IS NOT NULL
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_ledger_source_unique
ON revenue_ledger(source_type, source_id, service_type)
WHERE source_id IS NOT NULL
  AND entry_kind = 'original'
  AND replaces_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_ledger_one_reversal
ON revenue_ledger(reversal_of_id)
WHERE reversal_of_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_ledger_one_replacement
ON revenue_ledger(replaces_id)
WHERE replaces_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_revenue_ledger_created
ON revenue_ledger(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_ledger_service_status
ON revenue_ledger(service_type, accounting_status, transaction_status);

CREATE INDEX IF NOT EXISTS idx_revenue_ledger_partner
ON revenue_ledger(partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_ledger_customer
ON revenue_ledger(customer_user_id, created_at DESC);


-- 4. REVENUE LEDGER APPROVALS
CREATE TABLE IF NOT EXISTS revenue_ledger_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    revenue_ledger_id UUID NOT NULL
        REFERENCES revenue_ledger(id) ON DELETE RESTRICT,

    prepared_by UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    approved_by UUID
        REFERENCES users(id) ON DELETE RESTRICT,

    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    gross_fee NUMERIC(18,2) NOT NULL,
    provider_cost NUMERIC(18,2) NOT NULL,
    partner_share NUMERIC(18,2) NOT NULL,
    other_direct_cost NUMERIC(18,2) NOT NULL,
    zenimonies_revenue NUMERIC(18,2) NOT NULL,

    prepared_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMPTZ,
    decision_reason TEXT,

    CONSTRAINT revenue_approval_status_check
        CHECK (status IN ('pending', 'approved', 'rejected')),

    CONSTRAINT revenue_approval_different_admins_check
        CHECK (approved_by IS NULL OR approved_by <> prepared_by),

    CONSTRAINT revenue_approval_decision_check
        CHECK (
            (
                status = 'pending'
                AND approved_by IS NULL
                AND decided_at IS NULL
            )
            OR
            (
                status IN ('approved', 'rejected')
                AND approved_by IS NOT NULL
                AND decided_at IS NOT NULL
            )
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_approval_one_pending
ON revenue_ledger_approvals(revenue_ledger_id)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_revenue_approvals_entry_history
ON revenue_ledger_approvals(revenue_ledger_id, prepared_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_approvals_status
ON revenue_ledger_approvals(status, prepared_at DESC);


-- 5. PARTNER SETTLEMENTS
-- Recording a settlement does not send money.
CREATE TABLE IF NOT EXISTS revenue_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_reference VARCHAR(100) NOT NULL UNIQUE,

    partner_id UUID NOT NULL
        REFERENCES revenue_partners(id) ON DELETE RESTRICT,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    amount NUMERIC(18,2) NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    destination_name VARCHAR(200),
    destination_account_number VARCHAR(50),
    destination_bank_name VARCHAR(150),
    destination_bank_code VARCHAR(30),

    payment_reference VARCHAR(150),
    failure_reason TEXT,
    reason TEXT NOT NULL,

    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT revenue_settlements_amount_check
        CHECK (amount > 0),

    CONSTRAINT revenue_settlements_period_check
        CHECK (period_end > period_start),

    CONSTRAINT revenue_settlements_status_check
        CHECK (status IN (
            'pending', 'approved', 'processing',
            'completed', 'failed', 'cancelled'
        )),

    CONSTRAINT revenue_settlements_approval_check
        CHECK (
            status NOT IN ('approved', 'processing', 'completed')
            OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)
        ),

    CONSTRAINT revenue_settlements_completed_check
        CHECK (
            status <> 'completed'
            OR (
                completed_at IS NOT NULL
                AND NULLIF(BTRIM(payment_reference), '') IS NOT NULL
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_revenue_settlements_partner
ON revenue_settlements(partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_settlements_status
ON revenue_settlements(status, created_at DESC);


-- 6. COMPANY-OWNED REVENUE MOVEMENTS
-- These records do not execute bank transfers.
-- No customer account ID is stored here.
CREATE TABLE IF NOT EXISTS company_revenue_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_reference VARCHAR(100) NOT NULL UNIQUE,
    movement_type VARCHAR(30) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    amount NUMERIC(18,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    counterparty_name VARCHAR(200),
    destination_account_number VARCHAR(50),
    destination_bank_name VARCHAR(150),
    destination_bank_code VARCHAR(30),

    external_reference VARCHAR(150),
    reason TEXT NOT NULL,
    failure_reason TEXT,

    created_by UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    approved_by UUID
        REFERENCES users(id) ON DELETE RESTRICT,

    approved_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT company_revenue_movements_type_check
        CHECK (movement_type IN (
            'company_deposit',
            'company_withdrawal',
            'company_transfer'
        )),

    CONSTRAINT company_revenue_movements_amount_check
        CHECK (amount > 0),

    CONSTRAINT company_revenue_movements_status_check
        CHECK (status IN (
            'pending', 'approved', 'processing',
            'completed', 'failed', 'cancelled'
        )),

    CONSTRAINT company_revenue_movements_approval_check
        CHECK (
            status NOT IN ('approved', 'processing', 'completed')
            OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)
        ),

    CONSTRAINT company_revenue_movements_completed_check
        CHECK (
            status <> 'completed'
            OR (
                completed_at IS NOT NULL
                AND NULLIF(BTRIM(external_reference), '') IS NOT NULL
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_company_revenue_movements_status
ON company_revenue_movements(status, created_at DESC);


-- 7. REVENUE AUDIT EVENTS
CREATE TABLE IF NOT EXISTS revenue_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    actor_user_id UUID
        REFERENCES users(id) ON DELETE SET NULL,

    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id UUID,
    reason TEXT,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    ip_address VARCHAR(100),
    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_revenue_audit_entity
ON revenue_audit_events(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_audit_created
ON revenue_audit_events(created_at DESC);

-- ============================================================
-- END REVENUE ACCOUNTING TABLE DEFINITIONS
-- ============================================================

-- ============================================================
-- REVENUE FUNCTION 1: PARTNER TERMS PROTECTION
-- ============================================================

CREATE OR REPLACE FUNCTION validate_revenue_partner_term()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    partner_status VARCHAR(30);
BEGIN
    -- Prevent deletion of approved partner terms.
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'approved' THEN
            RAISE EXCEPTION
                'Approved partner terms cannot be deleted.';
        END IF;

        RETURN OLD;
    END IF;

    -- Approved terms cannot be edited.
    IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
        RAISE EXCEPTION
            'Approved partner terms cannot be edited. Create a new terms record.';
    END IF;

    -- Validate terms when approved.
    IF NEW.status = 'approved' THEN
        SELECT status
        INTO partner_status
        FROM revenue_partners
        WHERE id = NEW.partner_id
        FOR SHARE;

        IF partner_status IS DISTINCT FROM 'active' THEN
            RAISE EXCEPTION
                'Partner terms require an active partner.';
        END IF;

        IF NEW.approved_by IS NULL
           OR NEW.approved_at IS NULL THEN
            RAISE EXCEPTION
                'Approved terms require an approver and timestamp.';
        END IF;

        IF NEW.created_by IS NOT NULL
           AND NEW.created_by = NEW.approved_by THEN
            RAISE EXCEPTION
                'The term creator cannot approve their own terms.';
        END IF;

        IF NEW.effective_until IS NOT NULL
           AND NEW.effective_until <= NEW.effective_from THEN
            RAISE EXCEPTION
                'Partner terms have an invalid effective period.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


-- ============================================================
-- REVENUE FUNCTION 2: LEDGER AND REVERSAL PROTECTION
-- ============================================================

CREATE OR REPLACE FUNCTION protect_revenue_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    original_row revenue_ledger%ROWTYPE;
    replacement_row revenue_ledger%ROWTYPE;
    reversal_row revenue_ledger%ROWTYPE;
BEGIN
    -- Protect deletion of posted or referenced entries.
    IF TG_OP = 'DELETE' THEN
        IF OLD.accounting_status = 'posted'
           OR OLD.entry_kind = 'reversal'
           OR EXISTS (
               SELECT 1
               FROM revenue_ledger r
               WHERE r.reversal_of_id = OLD.id
                  OR r.replaces_id = OLD.id
           )
        THEN
            RAISE EXCEPTION
                'Posted or referenced revenue entries cannot be deleted.';
        END IF;
        RETURN OLD;
    END IF;

    -- Protect immutable fields and posted entries.
    IF TG_OP = 'UPDATE' THEN
        IF OLD.accounting_status = 'posted' THEN
            RAISE EXCEPTION 'Posted revenue entries are immutable.';
        END IF;

        IF OLD.entry_kind IS DISTINCT FROM NEW.entry_kind THEN
            RAISE EXCEPTION 'An entry kind cannot be changed after creation.';
        END IF;

        IF OLD.reversal_of_id IS DISTINCT FROM NEW.reversal_of_id THEN
            RAISE EXCEPTION 'A reversal link cannot be changed.';
        END IF;

        IF OLD.replaces_id IS DISTINCT FROM NEW.replaces_id THEN
            RAISE EXCEPTION 'A replacement link cannot be changed.';
        END IF;

        -- A reversal may only transition from ready to posted.
        IF OLD.entry_kind = 'reversal' THEN
            IF OLD.accounting_status <> 'ready'
               OR NEW.accounting_status <> 'posted' THEN
                RAISE EXCEPTION
                    'A reversal can only transition from ready to posted.';
            END IF;

            IF NEW.id IS DISTINCT FROM OLD.id
               OR NEW.revenue_reference IS DISTINCT FROM OLD.revenue_reference
               OR NEW.entry_kind IS DISTINCT FROM OLD.entry_kind
               OR NEW.reversal_of_id IS DISTINCT FROM OLD.reversal_of_id
               OR NEW.replaces_id IS DISTINCT FROM OLD.replaces_id
               OR NEW.service_type IS DISTINCT FROM OLD.service_type
               OR NEW.source_type IS DISTINCT FROM OLD.source_type
               OR NEW.source_id IS DISTINCT FROM OLD.source_id
               OR NEW.source_reference IS DISTINCT FROM OLD.source_reference
               OR NEW.customer_user_id IS DISTINCT FROM OLD.customer_user_id
               OR NEW.partner_id IS DISTINCT FROM OLD.partner_id
               OR NEW.partner_terms_id IS DISTINCT FROM OLD.partner_terms_id
               OR NEW.currency IS DISTINCT FROM OLD.currency
               OR NEW.gross_fee IS DISTINCT FROM OLD.gross_fee
               OR NEW.provider_cost IS DISTINCT FROM OLD.provider_cost
               OR NEW.partner_share IS DISTINCT FROM OLD.partner_share
               OR NEW.other_direct_cost IS DISTINCT FROM OLD.other_direct_cost
               OR NEW.zenimonies_revenue IS DISTINCT FROM OLD.zenimonies_revenue
               OR NEW.transaction_status IS DISTINCT FROM OLD.transaction_status
               OR NEW.description IS DISTINCT FROM OLD.description
               OR NEW.reversal_reason IS DISTINCT FROM OLD.reversal_reason
               OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
                RAISE EXCEPTION
                    'Reversal identity, source, amounts and reason are immutable.';
            END IF;
        END IF;
    END IF;

    -- Validate reversal entries at creation.
    IF TG_OP = 'INSERT' AND NEW.entry_kind = 'reversal' THEN
        IF NEW.accounting_status <> 'ready'
           OR NEW.posted_at IS NOT NULL THEN
            RAISE EXCEPTION
                'A new reversal must start ready and unposted.';
        END IF;

        IF NEW.reversal_of_id IS NULL THEN
            RAISE EXCEPTION 'A reversal must reference its original entry.';
        END IF;

        SELECT *
        INTO original_row
        FROM revenue_ledger
        WHERE id = NEW.reversal_of_id
        FOR SHARE;

        IF NOT FOUND
           OR original_row.entry_kind <> 'original'
           OR original_row.accounting_status <> 'posted' THEN
            RAISE EXCEPTION
                'A reversal must reference a posted original entry.';
        END IF;

        IF NEW.currency IS DISTINCT FROM original_row.currency
           OR NEW.service_type IS DISTINCT FROM original_row.service_type
           OR NEW.source_type IS DISTINCT FROM original_row.source_type
           OR NEW.source_id IS DISTINCT FROM original_row.source_id THEN
            RAISE EXCEPTION
                'Reversal source, service and currency must match the original.';
        END IF;

        IF NEW.gross_fee IS DISTINCT FROM -original_row.gross_fee
           OR NEW.provider_cost IS DISTINCT FROM -original_row.provider_cost
           OR NEW.partner_share IS DISTINCT FROM -original_row.partner_share
           OR NEW.other_direct_cost IS DISTINCT FROM -original_row.other_direct_cost
           OR NEW.zenimonies_revenue IS DISTINCT FROM -original_row.zenimonies_revenue THEN
            RAISE EXCEPTION
                'Reversal amounts must exactly negate the original entry.';
        END IF;

        IF NEW.transaction_status NOT IN ('reversed', 'refunded') THEN
            RAISE EXCEPTION
                'A reversal must have reversed or refunded transaction status.';
        END IF;

        IF NEW.reversal_reason IS NULL
           OR BTRIM(NEW.reversal_reason) = '' THEN
            RAISE EXCEPTION 'A reversal reason is required.';
        END IF;
    END IF;

    -- Require independent approval for every posting.
    IF NEW.accounting_status = 'posted' THEN
        IF TG_OP <> 'UPDATE' THEN
            RAISE EXCEPTION
                'Revenue entries must be posted through an approved update.';
        END IF;

        IF OLD.accounting_status <> 'ready' THEN
            RAISE EXCEPTION 'Only ready revenue entries can be posted.';
        END IF;

        IF NEW.recorded_by IS NULL THEN
            RAISE EXCEPTION 'A recording administrator is required.';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM revenue_ledger_approvals a
            WHERE a.revenue_ledger_id = NEW.id
              AND a.status = 'approved'
              AND a.prepared_by IS NOT NULL
              AND a.approved_by IS NOT NULL
              AND a.approved_by <> a.prepared_by
              AND a.prepared_by <> NEW.recorded_by
              AND a.approved_by <> NEW.recorded_by
              AND a.gross_fee = NEW.gross_fee
              AND a.provider_cost = NEW.provider_cost
              AND a.partner_share = NEW.partner_share
              AND a.other_direct_cost = NEW.other_direct_cost
              AND a.zenimonies_revenue = NEW.zenimonies_revenue
        ) THEN
            RAISE EXCEPTION
                'Posting requires a matching independent approval.';
        END IF;
    END IF;

    -- Validate replacement entries against the reversed original.
    IF NEW.entry_kind = 'original' AND NEW.replaces_id IS NOT NULL THEN
        SELECT *
        INTO replacement_row
        FROM revenue_ledger
        WHERE id = NEW.replaces_id
        FOR SHARE;

        IF NOT FOUND
           OR replacement_row.entry_kind <> 'original'
           OR replacement_row.accounting_status <> 'posted' THEN
            RAISE EXCEPTION
                'A replacement must reference a posted original entry.';
        END IF;

        SELECT *
        INTO reversal_row
        FROM revenue_ledger
        WHERE reversal_of_id = replacement_row.id
          AND accounting_status = 'posted'
        FOR SHARE;

        IF NOT FOUND OR reversal_row.entry_kind <> 'reversal' THEN
            RAISE EXCEPTION
                'A replacement requires a posted reversal of the original.';
        END IF;

        IF reversal_row.currency IS DISTINCT FROM replacement_row.currency
           OR reversal_row.service_type IS DISTINCT FROM replacement_row.service_type
           OR reversal_row.source_type IS DISTINCT FROM replacement_row.source_type
           OR reversal_row.source_id IS DISTINCT FROM replacement_row.source_id
           OR reversal_row.gross_fee IS DISTINCT FROM -replacement_row.gross_fee
           OR reversal_row.provider_cost IS DISTINCT FROM -replacement_row.provider_cost
           OR reversal_row.partner_share IS DISTINCT FROM -replacement_row.partner_share
           OR reversal_row.other_direct_cost IS DISTINCT FROM -replacement_row.other_direct_cost
           OR reversal_row.zenimonies_revenue IS DISTINCT FROM -replacement_row.zenimonies_revenue THEN
            RAISE EXCEPTION
                'The original entry must be fully reversed before replacement.';
        END IF;

        IF NEW.currency IS DISTINCT FROM replacement_row.currency
           OR NEW.service_type IS DISTINCT FROM replacement_row.service_type
           OR NEW.source_type IS DISTINCT FROM replacement_row.source_type
           OR NEW.source_id IS DISTINCT FROM replacement_row.source_id THEN
            RAISE EXCEPTION
                'Replacement source, service and currency must match the original.';
        END IF;
    END IF;

    -- Validate accounting fields on posted entries.
    IF NEW.accounting_status = 'posted' THEN
        IF NEW.gross_fee IS NULL
           OR NEW.provider_cost IS NULL
           OR NEW.partner_share IS NULL
           OR NEW.other_direct_cost IS NULL
           OR NEW.zenimonies_revenue IS NULL
           OR NEW.posted_at IS NULL THEN
            RAISE EXCEPTION
                'Posted entries require complete amounts and a posting timestamp.';
        END IF;

        IF NEW.zenimonies_revenue <>
           (NEW.gross_fee - NEW.provider_cost
            - NEW.partner_share - NEW.other_direct_cost) THEN
            RAISE EXCEPTION
                'Zenimonies revenue does not match the accounting calculation.';
        END IF;

        IF NEW.entry_kind = 'original'
           AND NEW.transaction_status <> 'completed' THEN
            RAISE EXCEPTION
                'Original revenue can only be posted for completed transactions.';
        END IF;

        IF NEW.entry_kind = 'reversal' THEN
            IF NEW.transaction_status NOT IN ('reversed', 'refunded') THEN
                RAISE EXCEPTION
                    'A posted reversal must be reversed or refunded.';
            END IF;

            IF NEW.reversal_reason IS NULL
               OR BTRIM(NEW.reversal_reason) = '' THEN
                RAISE EXCEPTION 'A posted reversal requires a reason.';
            END IF;
        END IF;
    END IF;

    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- ============================================================
-- REVENUE FUNCTION 3: FINANCIAL WORKFLOW PROTECTION
-- ============================================================

CREATE OR REPLACE FUNCTION validate_revenue_workflow_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    old_status TEXT;
    new_status TEXT;
BEGIN
    IF TG_TABLE_NAME NOT IN (
        'revenue_settlements',
        'company_revenue_movements'
    ) THEN
        RAISE EXCEPTION
            'Unsupported financial workflow table.';
    END IF;

    -- Financial workflow records cannot be deleted.
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION
            'Financial workflow records cannot be deleted. Use an audited cancellation or correction process.';
    END IF;

    new_status := NEW.status;

    -- New records must start pending.
    IF TG_OP = 'INSERT' THEN
        IF new_status <> 'pending' THEN
            RAISE EXCEPTION
                'New financial records must start with pending status.';
        END IF;

        IF NEW.approved_by IS NOT NULL
           OR NEW.approved_at IS NOT NULL
           OR NEW.completed_at IS NOT NULL THEN
            RAISE EXCEPTION
                'New financial records cannot contain approval or completion details.';
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        old_status := OLD.status;

        IF old_status = 'completed' THEN
            RAISE EXCEPTION
                'Completed financial records are immutable.';
        END IF;

        -- Allow only approved status transitions.
        IF new_status IS DISTINCT FROM old_status THEN
            IF NOT (
                (old_status = 'pending'
                    AND new_status IN ('approved', 'cancelled'))
                OR
                (old_status = 'approved'
                    AND new_status IN ('processing', 'cancelled'))
                OR
                (old_status = 'processing'
                    AND new_status IN ('completed', 'failed'))
                OR
                (old_status = 'failed'
                    AND new_status = 'cancelled')
            ) THEN
                RAISE EXCEPTION
                    'Invalid financial workflow transition: % to %.',
                    old_status, new_status;
            END IF;
        END IF;

        -- Protect approval details after approval.
        IF old_status IN ('approved', 'processing') THEN
            IF NEW.approved_by IS DISTINCT FROM OLD.approved_by
               OR NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
                RAISE EXCEPTION
                    'Approval details cannot be changed after approval.';
            END IF;

            IF NEW.amount IS DISTINCT FROM OLD.amount
               OR NEW.currency IS DISTINCT FROM OLD.currency
               OR NEW.created_by IS DISTINCT FROM OLD.created_by
               OR NEW.reason IS DISTINCT FROM OLD.reason THEN
                RAISE EXCEPTION
                    'Approved financial details cannot be changed.';
            END IF;

            IF TG_TABLE_NAME = 'revenue_settlements' THEN
                IF NEW.partner_id IS DISTINCT FROM OLD.partner_id
                   OR NEW.period_start IS DISTINCT FROM OLD.period_start
                   OR NEW.period_end IS DISTINCT FROM OLD.period_end
                   OR NEW.destination_name IS DISTINCT FROM OLD.destination_name
                   OR NEW.destination_account_number IS DISTINCT FROM OLD.destination_account_number
                   OR NEW.destination_bank_name IS DISTINCT FROM OLD.destination_bank_name
                   OR NEW.destination_bank_code IS DISTINCT FROM OLD.destination_bank_code THEN
                    RAISE EXCEPTION
                        'Approved settlement details cannot be changed.';
                END IF;
            ELSE
                IF NEW.movement_type IS DISTINCT FROM OLD.movement_type
                   OR NEW.counterparty_name IS DISTINCT FROM OLD.counterparty_name
                   OR NEW.destination_account_number IS DISTINCT FROM OLD.destination_account_number
                   OR NEW.destination_bank_name IS DISTINCT FROM OLD.destination_bank_name
                   OR NEW.destination_bank_code IS DISTINCT FROM OLD.destination_bank_code THEN
                    RAISE EXCEPTION
                        'Approved company movement details cannot be changed.';
                END IF;
            END IF;
        END IF;

        IF OLD.completed_at IS NOT NULL
           AND NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
            RAISE EXCEPTION
                'A recorded completion timestamp cannot be changed.';
        END IF;
    END IF;

    -- Approval must be independent from the creator.
    IF new_status IN ('approved', 'processing', 'completed') THEN
        IF NEW.approved_by IS NULL OR NEW.approved_at IS NULL THEN
            RAISE EXCEPTION
                'Approval details are required.';
        END IF;

        IF NEW.created_by IS NOT NULL
           AND NEW.created_by = NEW.approved_by THEN
            RAISE EXCEPTION
                'The creator cannot approve their own financial record.';
        END IF;
    END IF;

    -- Completed records require proof of completion.
    IF new_status = 'completed' THEN
        IF NEW.completed_at IS NULL THEN
            RAISE EXCEPTION
                'A completion timestamp is required.';
        END IF;

        IF TG_TABLE_NAME = 'revenue_settlements'
           AND NULLIF(BTRIM(NEW.payment_reference), '') IS NULL THEN
            RAISE EXCEPTION
                'A completed settlement requires a payment reference.';
        END IF;

        IF TG_TABLE_NAME = 'company_revenue_movements'
           AND NULLIF(BTRIM(NEW.external_reference), '') IS NULL THEN
            RAISE EXCEPTION
                'A completed company movement requires an external reference.';
        END IF;
    END IF;

    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- ============================================================
-- REVENUE FUNCTION 4: AUDIT EVENT RECORDING
-- ============================================================

CREATE OR REPLACE FUNCTION record_revenue_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    entity_uuid UUID;
    event_name TEXT;
    metadata_json JSONB;
    actor_uuid UUID;
    row_data JSONB;
    actor_text TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        row_data := to_jsonb(OLD);
        entity_uuid := OLD.id;
        event_name := TG_TABLE_NAME || '.delete';
    ELSE
        row_data := to_jsonb(NEW);
        entity_uuid := NEW.id;

        IF TG_OP = 'INSERT' THEN
            event_name := TG_TABLE_NAME || '.insert';
        ELSE
            event_name := TG_TABLE_NAME || '.update';
        END IF;
    END IF;

    -- Identify the actor without casting invalid text to UUID.
    actor_text := COALESCE(
        NULLIF(row_data->>'recorded_by', ''),
        NULLIF(row_data->>'created_by', ''),
        NULLIF(row_data->>'approved_by', ''),
        NULLIF(row_data->>'prepared_by', '')
    );

    actor_uuid := NULL;

    IF actor_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        actor_uuid := actor_text::UUID;
    END IF;

    metadata_json := jsonb_build_object(
        'reference',
        COALESCE(
            row_data->>'revenue_reference',
            row_data->>'settlement_reference',
            row_data->>'movement_reference'
        ),
        'entry_kind', row_data->>'entry_kind',
        'reversal_of_id', row_data->>'reversal_of_id',
        'replaces_id', row_data->>'replaces_id',
        'status', row_data->>'accounting_status',
        'workflow_status', row_data->>'status',
        'transaction_status', row_data->>'transaction_status',
        'amount', row_data->>'amount',
        'gross_fee', row_data->>'gross_fee',
        'provider_cost', row_data->>'provider_cost',
        'partner_share', row_data->>'partner_share',
        'other_direct_cost', row_data->>'other_direct_cost',
        'zenimonies_revenue', row_data->>'zenimonies_revenue',
        'currency', row_data->>'currency'
    );

    INSERT INTO revenue_audit_events (
        actor_user_id,
        event_type,
        entity_type,
        entity_id,
        metadata
    )
    VALUES (
        actor_uuid,
        event_name,
        TG_TABLE_NAME,
        entity_uuid,
        metadata_json
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================
-- REVENUE FUNCTION 5: APPROVAL PROTECTION
-- ============================================================

CREATE OR REPLACE FUNCTION protect_revenue_ledger_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- New requests must start pending without a decision.
    IF TG_OP = 'INSERT' THEN
        IF NEW.status <> 'pending'
           OR NEW.approved_by IS NOT NULL
           OR NEW.decided_at IS NOT NULL THEN
            RAISE EXCEPTION
                'New revenue approval requests must start pending without a decision.';
        END IF;

        RETURN NEW;
    END IF;

    -- Approval history cannot be deleted.
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION
            'Revenue approval records cannot be deleted.';
    END IF;

    -- Only a pending request may receive its first final decision.
    IF OLD.status <> 'pending'
       OR NEW.status NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION
            'Only a pending revenue approval can receive a final decision.';
    END IF;

    -- Freeze the request identity and financial snapshot.
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.revenue_ledger_id IS DISTINCT FROM OLD.revenue_ledger_id
       OR NEW.prepared_by IS DISTINCT FROM OLD.prepared_by
       OR NEW.gross_fee IS DISTINCT FROM OLD.gross_fee
       OR NEW.provider_cost IS DISTINCT FROM OLD.provider_cost
       OR NEW.partner_share IS DISTINCT FROM OLD.partner_share
       OR NEW.other_direct_cost IS DISTINCT FROM OLD.other_direct_cost
       OR NEW.zenimonies_revenue IS DISTINCT FROM OLD.zenimonies_revenue
       OR NEW.prepared_at IS DISTINCT FROM OLD.prepared_at THEN
        RAISE EXCEPTION
            'Approval request details cannot be changed when deciding.';
    END IF;

    -- Every decision needs an administrator and timestamp.
    IF NEW.approved_by IS NULL
       OR NEW.decided_at IS NULL THEN
        RAISE EXCEPTION
            'A decision requires an administrator and decision timestamp.';
    END IF;

    -- The preparer cannot approve or reject their own request.
    IF NEW.approved_by = OLD.prepared_by THEN
        RAISE EXCEPTION
            'The preparer cannot decide their own approval.';
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================
-- RECREATE REVENUE TRIGGERS SAFELY
-- Existing financial records are preserved.
-- ============================================================
DROP TRIGGER IF EXISTS trg_validate_revenue_partner_term
ON revenue_partner_terms;
DROP TRIGGER IF EXISTS trg_protect_revenue_ledger
ON revenue_ledger;
DROP TRIGGER IF EXISTS trg_validate_revenue_settlement
ON revenue_settlements;
DROP TRIGGER IF EXISTS trg_validate_company_revenue_movement
ON company_revenue_movements;
DROP TRIGGER IF EXISTS trg_protect_revenue_ledger_approval
ON revenue_ledger_approvals;
DROP TRIGGER IF EXISTS trg_audit_revenue_ledger_approvals
ON revenue_ledger_approvals;
DROP TRIGGER IF EXISTS trg_audit_revenue_ledger
ON revenue_ledger;
DROP TRIGGER IF EXISTS trg_audit_revenue_settlements
ON revenue_settlements;
DROP TRIGGER IF EXISTS trg_audit_company_revenue_movements
ON company_revenue_movements;
CREATE TRIGGER trg_validate_revenue_partner_term
BEFORE INSERT OR UPDATE OR DELETE
ON revenue_partner_terms
FOR EACH ROW
EXECUTE FUNCTION validate_revenue_partner_term();
CREATE TRIGGER trg_protect_revenue_ledger
BEFORE INSERT OR UPDATE OR DELETE
ON revenue_ledger
FOR EACH ROW
EXECUTE FUNCTION protect_revenue_ledger();
CREATE TRIGGER trg_validate_revenue_settlement
BEFORE INSERT OR UPDATE OR DELETE
ON revenue_settlements
FOR EACH ROW
EXECUTE FUNCTION validate_revenue_workflow_transition();
CREATE TRIGGER trg_validate_company_revenue_movement
BEFORE INSERT OR UPDATE OR DELETE
ON company_revenue_movements
FOR EACH ROW
EXECUTE FUNCTION validate_revenue_workflow_transition();
CREATE TRIGGER trg_protect_revenue_ledger_approval
BEFORE INSERT OR UPDATE OR DELETE
ON revenue_ledger_approvals
FOR EACH ROW
EXECUTE FUNCTION protect_revenue_ledger_approval();
CREATE TRIGGER trg_audit_revenue_ledger_approvals
AFTER INSERT OR UPDATE OR DELETE
ON revenue_ledger_approvals
FOR EACH ROW
EXECUTE FUNCTION record_revenue_audit_event();
CREATE TRIGGER trg_audit_revenue_ledger
AFTER INSERT OR UPDATE OR DELETE
ON revenue_ledger
FOR EACH ROW
EXECUTE FUNCTION record_revenue_audit_event();
CREATE TRIGGER trg_audit_revenue_settlements
AFTER INSERT OR UPDATE OR DELETE
ON revenue_settlements
FOR EACH ROW
EXECUTE FUNCTION record_revenue_audit_event();
CREATE TRIGGER trg_audit_company_revenue_movements
AFTER INSERT OR UPDATE OR DELETE
ON company_revenue_movements
FOR EACH ROW
EXECUTE FUNCTION record_revenue_audit_event();
-- ============================================================
-- END OF ZENIMONIES DATABASE SCHEMA
-- ============================================================
