
-- ============================================================
-- ZENIMONIES BANKING
-- MIGRATION 008: REVENUE LEDGER & PARTNER ACCOUNTING
--
-- Does not modify or delete existing customer transactions.
-- Partner terms remain unconfigured until formally approved.
-- Customer principal is never recorded as company revenue.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. REVENUE PARTNERS
-- ============================================================

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


-- ============================================================
-- 2. PARTNER COMMERCIAL TERMS
--
-- No default percentage or charge is assumed.
-- Only approved terms may be used for accounting.
-- ============================================================

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
        CHECK (
            share_basis IN (
                'fixed_per_transaction',
                'percent_of_customer_fee',
                'percent_after_provider_cost'
            )
        ),

    CONSTRAINT revenue_partner_terms_status_check
        CHECK (
            status IN ('draft', 'approved', 'expired', 'cancelled')
        ),

    CONSTRAINT revenue_partner_terms_amount_check
        CHECK (
            (fixed_charge IS NULL OR fixed_charge >= 0)
            AND
            (
                percentage_rate IS NULL
                OR percentage_rate BETWEEN 0 AND 100
            )
        ),

    CONSTRAINT revenue_partner_terms_basis_value_check
        CHECK (
            (
                share_basis = 'fixed_per_transaction'
                AND fixed_charge IS NOT NULL
                AND percentage_rate IS NULL
            )
            OR
            (
                share_basis IN (
                    'percent_of_customer_fee',
                    'percent_after_provider_cost'
                )
                AND percentage_rate IS NOT NULL
                AND fixed_charge IS NULL
            )
        ),

    CONSTRAINT revenue_partner_terms_dates_check
        CHECK (
            effective_until IS NULL
            OR effective_until > effective_from
        ),

    CONSTRAINT revenue_partner_terms_approval_check
        CHECK (
            status <> 'approved'
            OR (
                approved_by IS NOT NULL
                AND approved_at IS NOT NULL
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_revenue_partner_terms_lookup
ON revenue_partner_terms(partner_id, service_type, status, effective_from);


-- ============================================================
-- 3. REVENUE LEDGER
--
-- One row represents one service-fee accounting event.
-- source_id is deliberately not a foreign key because the
-- source can belong to different existing service tables.
--
-- gross_fee = fee/margin attributable to the service.
-- provider_cost = actual recorded provider cost.
-- partner_share = actual applicable partner share.
-- other_direct_cost = other direct service costs.
--
-- ZENIMONIES revenue is calculated only when all applicable
-- cost and partner fields are known.
-- ============================================================

CREATE TABLE IF NOT EXISTS revenue_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    revenue_reference VARCHAR(100) NOT NULL UNIQUE,

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

    CONSTRAINT revenue_ledger_amounts_check
        CHECK (
            gross_fee >= 0
            AND (provider_cost IS NULL OR provider_cost >= 0)
            AND (partner_share IS NULL OR partner_share >= 0)
            AND (other_direct_cost IS NULL OR other_direct_cost >= 0)
        ),

    CONSTRAINT revenue_ledger_status_check
        CHECK (
            accounting_status IN (
                'incomplete',
                'ready',
                'posted',
                'reversed'
            )
        ),

    CONSTRAINT revenue_ledger_transaction_status_check
        CHECK (
            transaction_status IN (
                'pending',
                'completed',
                'failed',
                'reversed',
                'refunded'
            )
        ),

    CONSTRAINT revenue_ledger_revenue_calculation_check
        CHECK (
            (
                provider_cost IS NULL
                OR partner_share IS NULL
                OR other_direct_cost IS NULL
                OR zenimonies_revenue IS NULL
            )
            OR
            zenimonies_revenue =
                gross_fee
                - provider_cost
                - partner_share
                - other_direct_cost
        ),

    CONSTRAINT revenue_ledger_posted_check
        CHECK (
            accounting_status <> 'posted'
            OR (
                transaction_status = 'completed'
                AND provider_cost IS NOT NULL
                AND partner_share IS NOT NULL
                AND other_direct_cost IS NOT NULL
                AND zenimonies_revenue IS NOT NULL
                AND posted_at IS NOT NULL
            )
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_ledger_source_unique
ON revenue_ledger(source_type, source_id, service_type)
WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_revenue_ledger_created
ON revenue_ledger(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_ledger_service_status
ON revenue_ledger(service_type, accounting_status, transaction_status);

CREATE INDEX IF NOT EXISTS idx_revenue_ledger_partner
ON revenue_ledger(partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_ledger_customer
ON revenue_ledger(customer_user_id, created_at DESC);


-- ============================================================
-- 4. PARTNER SETTLEMENTS
--
-- Tracks amounts owed to partners separately from revenue.
-- Creating a settlement does not itself send money.
-- ============================================================

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
        CHECK (
            status IN (
                'pending',
                'approved',
                'processing',
                'completed',
                'failed',
                'cancelled'
            )
        ),

    CONSTRAINT revenue_settlements_approval_check
        CHECK (
            status NOT IN ('approved', 'processing', 'completed')
            OR (
                approved_by IS NOT NULL
                AND approved_at IS NOT NULL
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_revenue_settlements_partner
ON revenue_settlements(partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_settlements_status
ON revenue_settlements(status, created_at DESC);


-- ============================================================
-- 5. COMPANY REVENUE MOVEMENTS
--
-- Company-owned funds only.
-- This table intentionally has no customer account_id.
-- It does not debit or credit customer account balances.
-- Actual payment execution must be implemented separately.
-- ============================================================

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

    approved_by UUID REFERENCES users(id) ON DELETE RESTRICT,

    approved_at TIMESTAMPTZ,

    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT company_revenue_movements_type_check
        CHECK (
            movement_type IN (
                'company_deposit',
                'company_withdrawal',
                'company_transfer'
            )
        ),

    CONSTRAINT company_revenue_movements_amount_check
        CHECK (amount > 0),

    CONSTRAINT company_revenue_movements_status_check
        CHECK (
            status IN (
                'pending',
                'approved',
                'processing',
                'completed',
                'failed',
                'cancelled'
            )
        ),

    CONSTRAINT company_revenue_movements_approval_check
        CHECK (
            status NOT IN ('approved', 'processing', 'completed')
            OR (
                approved_by IS NOT NULL
                AND approved_at IS NOT NULL
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_company_revenue_movements_status
ON company_revenue_movements(status, created_at DESC);


-- ============================================================
-- 6. REVENUE ACCOUNTING AUDIT EVENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS revenue_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

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

COMMIT;

-- ============================================================
-- END MIGRATION 008
-- ============================================================
