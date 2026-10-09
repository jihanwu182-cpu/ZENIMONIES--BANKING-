
-- ============================================================
-- ZENIMONIES BANKING
-- MIGRATION 008: REVENUE LEDGER & PARTNER ACCOUNTING
-- REVIEW DRAFT — DO NOT RUN IN PRODUCTION YET
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
ON revenue_partner_terms(
    partner_id,
    service_type,
    status,
    effective_from
);

-- ============================================================
-- 3. REVENUE LEDGER
-- Customer transaction principal is NOT company revenue.
-- Reversals are separate negative accounting entries.
-- ============================================================

CREATE TABLE IF NOT EXISTS revenue_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    revenue_reference VARCHAR(100) NOT NULL UNIQUE,

    entry_kind VARCHAR(20) NOT NULL DEFAULT 'original',

    reversal_of_id UUID
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
    reversal_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT revenue_ledger_entry_kind_check
        CHECK (entry_kind IN ('original', 'reversal')),

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
                AND reversal_of_id IS NOT NULL
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
WHERE source_id IS NOT NULL AND entry_kind = 'original';

CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_ledger_one_reversal
ON revenue_ledger(reversal_of_id)
WHERE reversal_of_id IS NOT NULL;

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
-- Recording a settlement does NOT send money.
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


-- ============================================================
-- 5. COMPANY-OWNED FUND MOVEMENTS
-- These records have NO customer account_id.
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


-- ============================================================
-- 6. REVENUE ACCOUNTING AUDIT EVENTS
-- ============================================================

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
ON revenue_audit_events(
    entity_type,
    entity_id,
    created_at DESC
);

CREATE INDEX IF NOT EXISTS idx_revenue_audit_created
ON revenue_audit_events(created_at DESC);


-- ============================================================
-- 7. PARTNER TERMS APPROVAL PROTECTION
-- Only active partners can have approved terms.
-- ============================================================

CREATE OR REPLACE FUNCTION validate_revenue_partner_term()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    current_partner_status VARCHAR(30);
BEGIN
    IF NEW.status = 'approved' THEN
        SELECT status
        INTO current_partner_status
        FROM revenue_partners
        WHERE id = NEW.partner_id
        FOR SHARE;

        IF current_partner_status IS DISTINCT FROM 'active' THEN
            RAISE EXCEPTION
                'Partner terms require an active partner.';
        END IF;

        IF NEW.approved_by IS NULL OR NEW.approved_at IS NULL THEN
            RAISE EXCEPTION
                'Approved terms require an approver and timestamp.';
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

DROP TRIGGER IF EXISTS trg_validate_revenue_partner_term
ON revenue_partner_terms;

CREATE TRIGGER trg_validate_revenue_partner_term
BEFORE INSERT OR UPDATE OF
    partner_id,
    status,
    approved_by,
    approved_at,
    effective_from,
    effective_until
ON revenue_partner_terms
FOR EACH ROW
EXECUTE FUNCTION validate_revenue_partner_term();


-- ============================================================
-- 8. POSTED REVENUE IMMUTABILITY AND REVERSAL VALIDATION
--
-- Posted originals cannot be edited or deleted.
-- A reversal must be a new, separately posted entry.
-- Reversal amounts must negate the original amounts exactly.
-- ============================================================

CREATE OR REPLACE FUNCTION protect_revenue_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    original_row revenue_ledger%ROWTYPE;
BEGIN
    -- Protect posted entries and all reversal records from deletion.
    IF TG_OP = 'DELETE' THEN
        IF OLD.accounting_status = 'posted'
           OR OLD.entry_kind = 'reversal' THEN
            RAISE EXCEPTION
                'Posted entries and reversal entries cannot be deleted.';
        END IF;

        RETURN OLD;
    END IF;

    -- A posted original or a reversal is immutable.
    IF TG_OP = 'UPDATE' THEN
        IF OLD.accounting_status = 'posted'
           OR OLD.entry_kind = 'reversal' THEN
            RAISE EXCEPTION
                'Posted entries and reversals cannot be edited. Create a reversal and corrected replacement instead.';
        END IF;
    END IF;

    -- Validate reversal records on insertion.
    IF NEW.entry_kind = 'reversal' THEN
        IF TG_OP <> 'INSERT' THEN
            RAISE EXCEPTION
                'Reversal entries cannot be edited.';
        END IF;

        SELECT *
        INTO original_row
        FROM revenue_ledger
        WHERE id = NEW.reversal_of_id
        FOR SHARE;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'The original revenue entry was not found.';
        END IF;

        IF original_row.entry_kind <> 'original'
           OR original_row.accounting_status <> 'posted' THEN
            RAISE EXCEPTION
                'Only a posted original entry can be reversed.';
        END IF;

        IF original_row.currency <> NEW.currency
           OR original_row.service_type <> NEW.service_type
           OR original_row.source_type <> NEW.source_type
           OR original_row.source_id IS DISTINCT FROM NEW.source_id THEN
            RAISE EXCEPTION
                'The reversal must match the original currency, service and source.';
        END IF;

        IF NEW.gross_fee <> -original_row.gross_fee
           OR NEW.provider_cost IS DISTINCT FROM -original_row.provider_cost
           OR NEW.partner_share IS DISTINCT FROM -original_row.partner_share
           OR NEW.other_direct_cost IS DISTINCT FROM -original_row.other_direct_cost
           OR NEW.zenimonies_revenue IS DISTINCT FROM -original_row.zenimonies_revenue THEN
            RAISE EXCEPTION
                'Reversal amounts must exactly negate the original amounts.';
        END IF;

        IF NEW.accounting_status <> 'posted'
           OR NEW.transaction_status NOT IN ('reversed', 'refunded')
           OR NEW.posted_at IS NULL THEN
            RAISE EXCEPTION
                'A reversal must be posted and marked reversed or refunded.';
        END IF;

        IF NULLIF(BTRIM(NEW.reversal_reason), '') IS NULL THEN
            RAISE EXCEPTION
                'A reversal reason is required.';
        END IF;
    END IF;

    -- Validate all entries being posted.
    IF NEW.accounting_status = 'posted' THEN
        IF NEW.provider_cost IS NULL
           OR NEW.partner_share IS NULL
           OR NEW.other_direct_cost IS NULL
           OR NEW.zenimonies_revenue IS NULL
           OR NEW.posted_at IS NULL THEN
            RAISE EXCEPTION
                'Posting requires all accounting amounts and posted_at.';
        END IF;

        IF NEW.zenimonies_revenue <>
           NEW.gross_fee
           - NEW.provider_cost
           - NEW.partner_share
           - NEW.other_direct_cost THEN
            RAISE EXCEPTION
                'Revenue does not match the accounting formula.';
        END IF;

        IF NEW.entry_kind = 'original'
           AND NEW.transaction_status <> 'completed' THEN
            RAISE EXCEPTION
                'Original revenue can be posted only for a completed transaction.';
        END IF;
    END IF;

    NEW.updated_at := CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_revenue_ledger
ON revenue_ledger;

CREATE TRIGGER trg_protect_revenue_ledger
BEFORE INSERT OR UPDATE OR DELETE
ON revenue_ledger
FOR EACH ROW
EXECUTE FUNCTION protect_revenue_ledger();


-- ============================================================
-- 9. SETTLEMENT AND COMPANY MOVEMENT WORKFLOW PROTECTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION validate_revenue_workflow_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE'
       AND OLD.status = 'completed'
       AND NEW.status <> 'completed' THEN
        RAISE EXCEPTION
            'Completed records cannot be reopened.';
    END IF;

    IF NEW.status IN ('approved', 'processing', 'completed')
       AND (
           NEW.approved_by IS NULL
           OR NEW.approved_at IS NULL
       ) THEN
        RAISE EXCEPTION
            'Approval details are required before processing or completion.';
    END IF;

    IF NEW.status = 'completed' THEN
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

DROP TRIGGER IF EXISTS trg_validate_revenue_settlement
ON revenue_settlements;

CREATE TRIGGER trg_validate_revenue_settlement
BEFORE INSERT OR UPDATE
ON revenue_settlements
FOR EACH ROW
EXECUTE FUNCTION validate_revenue_workflow_transition();

DROP TRIGGER IF EXISTS trg_validate_company_revenue_movement
ON company_revenue_movements;

CREATE TRIGGER trg_validate_company_revenue_movement
BEFORE INSERT OR UPDATE
ON company_revenue_movements
FOR EACH ROW
EXECUTE FUNCTION validate_revenue_workflow_transition();


-- ============================================================
-- END MIGRATION 008
-- ============================================================

COMMIT;
