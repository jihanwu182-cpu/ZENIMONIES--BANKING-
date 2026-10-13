BEGIN;

CREATE OR REPLACE FUNCTION protect_revenue_ledger_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION
            'Revenue approval records cannot be deleted.';
    END IF;

    -- Allow only the first decision on a pending request.
    IF OLD.status = 'pending'
       AND NEW.status IN ('approved', 'rejected') THEN

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
                'Approval snapshots and preparer details cannot be changed.';
        END IF;

        IF NEW.approved_by IS NULL OR NEW.decided_at IS NULL THEN
            RAISE EXCEPTION
                'A decision requires an administrator and decision timestamp.';
        END IF;

        IF NEW.approved_by = OLD.prepared_by THEN
            RAISE EXCEPTION
                'The preparer cannot decide their own approval.';
        END IF;

        RETURN NEW;
    END IF;

    RAISE EXCEPTION
        'Revenue approval decisions cannot be changed after submission.';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_revenue_ledger_approval
ON revenue_ledger_approvals;

CREATE TRIGGER trg_protect_revenue_ledger_approval
BEFORE UPDATE OR DELETE
ON revenue_ledger_approvals
FOR EACH ROW
EXECUTE FUNCTION protect_revenue_ledger_approval();

COMMIT;
