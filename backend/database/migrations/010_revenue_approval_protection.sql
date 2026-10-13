BEGIN;

-- ZENIMONIES: Protect revenue approval decisions.
-- Requires revenue_ledger_approvals to exist first.

CREATE OR REPLACE FUNCTION protect_revenue_ledger_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION
            'Revenue approval records cannot be deleted.';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION
            'Revenue approval records are immutable. Create a new approval request instead.';
    END IF;

    RETURN NEW;
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
