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

    daily_transfer_limit NUMERIC(18,2) NOT NULL DEFAULT 25000.00,

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


  -- ========================================================
  -- ZENIMONIES SAVINGS DATABASE
  -- ========================================================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS savings_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        user_id UUID NOT NULL
          REFERENCES users(id)
          ON DELETE RESTRICT,

        account_id UUID NOT NULL
          REFERENCES accounts(id)
          ON DELETE RESTRICT,

        amount NUMERIC(18, 2) NOT NULL
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
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS
      idx_savings_plans_user
      ON savings_plans(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS
      idx_savings_plans_account
      ON savings_plans(account_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS
      idx_savings_plans_maturity
      ON savings_plans(maturity_date)
      WHERE status = 'active';
    `);

    console.log(
      'Database migration completed: savings_plans table is available'
    );


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
    daily_transfer_limit = 25000.00
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
    account_limit = 200000.00,
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
-- END OF ZENIMONIES DATABASE SCHEMA
-- ============================================================
