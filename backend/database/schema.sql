-- ============================================================
-- PAYSTACK DEPOSIT ACCOUNTS
-- ============================================================

CREATE TABLE IF NOT EXISTS deposit_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    provider VARCHAR(50) NOT NULL DEFAULT 'paystack',

    provider_customer_code VARCHAR(150),

    provider_account_id VARCHAR(150),

    account_number VARCHAR(30) UNIQUE NOT NULL,

    account_name VARCHAR(150) NOT NULL,

    bank_name VARCHAR(150) NOT NULL,

    bank_code VARCHAR(30),

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    status VARCHAR(30) NOT NULL DEFAULT 'active',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deposit_accounts_user_id
ON deposit_accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_deposit_accounts_account_id
ON deposit_accounts(account_id);

CREATE INDEX IF NOT EXISTS idx_deposit_accounts_provider_customer
ON deposit_accounts(provider_customer_code);

CREATE INDEX IF NOT EXISTS idx_deposit_accounts_provider_account
ON deposit_accounts(provider_account_id);
