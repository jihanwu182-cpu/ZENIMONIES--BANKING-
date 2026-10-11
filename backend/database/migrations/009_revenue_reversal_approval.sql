BEGIN;

-- ============================================================
-- ZENIMONIES BANKING
-- MIGRATION 009: REVENUE REVERSAL APPROVAL
--
-- REVIEW DRAFT — TEST BEFORE PRODUCTION
--
-- Purpose:
-- 1. Allow reversal entries to be posted through an approved
--    accounting workflow.
-- 2. Require independent approval before posting.
-- 3. Protect posted entries and reversal records from edits.
-- 4. Preserve replacement and accounting validations.
--
-- Requires migration 008_revenue_ledger.sql to be applied.
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

    -- --------------------------------------------------------
    -- 1. Protect deletion
    -- --------------------------------------------------------

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

    -- --------------------------------------------------------
    -- 2. Protect updates and immutable fields
    -- --------------------------------------------------------

    IF TG_OP = 'UPDATE' THEN

        IF OLD.accounting_status = 'posted' THEN
            RAISE EXCEPTION
                'Posted revenue entries are immutable.';
        END IF;

        IF OLD.entry_kind IS DISTINCT FROM NEW.entry_kind THEN
            RAISE EXCEPTION
                'An entry kind cannot be changed after creation.';
        END IF;

        IF OLD.reversal_of_id IS DISTINCT FROM NEW.reversal_of_id THEN
            RAISE EXCEPTION
                'A reversal link cannot be changed.';
        END IF;

        IF OLD.replaces_id IS DISTINCT FROM NEW.replaces_id THEN
            RAISE EXCEPTION
                'A replacement link cannot be changed.';
        END IF;

        -- A reversal may only move from ready to posted.
        -- Its financial identity and amounts must remain fixed.
        IF OLD.entry_kind = 'reversal' THEN

            IF OLD.accounting_status <> 'ready'
               OR NEW.accounting_status <> 'posted'
            THEN
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
               OR NEW.created_at IS DISTINCT FROM OLD.created_at
            THEN
                RAISE EXCEPTION
                    'Reversal identity, source, amounts and reason are immutable.';
            END IF;

        END IF;

    END IF;

    -- --------------------------------------------------------
    -- 3. Validate reversal entries on creation
    -- --------------------------------------------------------

    IF TG_OP = 'INSERT'
       AND NEW.entry_kind = 'reversal'
    THEN

        IF NEW.accounting_status <> 'ready'
           OR NEW.posted_at IS NOT NULL
        THEN
            RAISE EXCEPTION
                'A new reversal must start ready and unposted.';
        END IF;

        IF NEW.reversal_of_id IS NULL THEN
            RAISE EXCEPTION
                'A reversal must reference its original entry.';
        END IF;

        SELECT *
        INTO original_row
        FROM revenue_ledger
        WHERE id = NEW.reversal_of_id
        FOR SHARE;

        IF NOT FOUND
           OR original_row.entry_kind <> 'original'
           OR original_row.accounting_status <> 'posted'
        THEN
            RAISE EXCEPTION
                'A reversal must reference a posted original entry.';
        END IF;

        IF NEW.currency IS DISTINCT FROM original_row.currency
           OR NEW.service_type IS DISTINCT FROM original_row.service_type
           OR NEW.source_type IS DISTINCT FROM original_row.source_type
           OR NEW.source_id IS DISTINCT FROM original_row.source_id
        THEN
            RAISE EXCEPTION
                'Reversal source, service and currency must match the original.';
        END IF;

        IF NEW.gross_fee IS DISTINCT FROM -original_row.gross_fee
           OR NEW.provider_cost IS DISTINCT FROM -original_row.provider_cost
           OR NEW.partner_share IS DISTINCT FROM -original_row.partner_share
           OR NEW.other_direct_cost IS DISTINCT FROM -original_row.other_direct_cost
           OR NEW.zenimonies_revenue IS DISTINCT FROM -original_row.zenimonies_revenue
        THEN
            RAISE EXCEPTION
                'Reversal amounts must exactly negate the original entry.';
        END IF;

        IF NEW.transaction_status NOT IN ('reversed', 'refunded') THEN
            RAISE EXCEPTION
                'A reversal must have reversed or refunded transaction status.';
        END IF;

        IF NEW.reversal_reason IS NULL
           OR BTRIM(NEW.reversal_reason) = ''
        THEN
            RAISE EXCEPTION
                'A reversal reason is required.';
        END IF;

    END IF;

    -- --------------------------------------------------------
    -- 4. Require independent approval for every posting
    -- --------------------------------------------------------

    IF NEW.accounting_status = 'posted' THEN

        IF TG_OP <> 'UPDATE' THEN
            RAISE EXCEPTION
                'Revenue entries must be posted through an approved update.';
        END IF;

        IF OLD.accounting_status <> 'ready' THEN
            RAISE EXCEPTION
                'Only ready revenue entries can be posted.';
        END IF;

        IF NEW.recorded_by IS NULL THEN
            RAISE EXCEPTION
                'A recording administrator is required.';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM revenue_ledger_approvals a
            WHERE a.revenue_ledger_id = NEW.id
              AND a.status = 'approved'
              AND a.prepared_by IS NOT NULL
              AND a.approved_by IS NOT NULL
              AND a.approved_by <> a.prepared_by
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

    -- --------------------------------------------------------
    -- 5. Validate replacement entries
    -- --------------------------------------------------------

    IF NEW.entry_kind = 'original'
       AND NEW.replaces_id IS NOT NULL
    THEN

        SELECT *
        INTO replacement_row
        FROM revenue_ledger
        WHERE id = NEW.replaces_id
        FOR SHARE;

        IF NOT FOUND
           OR replacement_row.entry_kind <> 'original'
           OR replacement_row.accounting_status <> 'posted'
        THEN
            RAISE EXCEPTION
                'A replacement must reference a posted original entry.';
        END IF;

        SELECT *
        INTO reversal_row
        FROM revenue_ledger
        WHERE reversal_of_id = replacement_row.id
          AND accounting_status = 'posted'
        FOR SHARE;

        IF NOT FOUND
           OR reversal_row.entry_kind <> 'reversal'
        THEN
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
           OR reversal_row.zenimonies_revenue IS DISTINCT FROM -replacement_row.zenimonies_revenue
        THEN
            RAISE EXCEPTION
                'The original entry must be fully reversed before replacement.';
        END IF;

        IF NEW.currency IS DISTINCT FROM replacement_row.currency
           OR NEW.service_type IS DISTINCT FROM replacement_row.service_type
           OR NEW.source_type IS DISTINCT FROM replacement_row.source_type
           OR NEW.source_id IS DISTINCT FROM replacement_row.source_id
        THEN
            RAISE EXCEPTION
                'Replacement source, service and currency must match the original.';
        END IF;

    END IF;

    -- --------------------------------------------------------
    -- 6. Validate accounting fields for posted entries
    -- --------------------------------------------------------

    IF NEW.accounting_status = 'posted' THEN

        IF NEW.gross_fee IS NULL
           OR NEW.provider_cost IS NULL
           OR NEW.partner_share IS NULL
           OR NEW.other_direct_cost IS NULL
           OR NEW.zenimonies_revenue IS NULL
           OR NEW.posted_at IS NULL
        THEN
            RAISE EXCEPTION
                'Posted entries require complete amounts and a posting timestamp.';
        END IF;

        IF NEW.zenimonies_revenue <>
           (
               NEW.gross_fee
               - NEW.provider_cost
               - NEW.partner_share
               - NEW.other_direct_cost
           )
        THEN
            RAISE EXCEPTION
                'Zenimonies revenue does not match the accounting calculation.';
        END IF;

        IF NEW.entry_kind = 'original'
           AND NEW.transaction_status <> 'completed'
        THEN
            RAISE EXCEPTION
                'Original revenue can only be posted for completed transactions.';
        END IF;

        IF NEW.entry_kind = 'reversal' THEN

            IF NEW.transaction_status NOT IN ('reversed', 'refunded') THEN
                RAISE EXCEPTION
                    'A posted reversal must be reversed or refunded.';
            END IF;

            IF NEW.reversal_reason IS NULL
               OR BTRIM(NEW.reversal_reason) = ''
            THEN
                RAISE EXCEPTION
                    'A posted reversal requires a reason.';
            END IF;

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

COMMIT;
