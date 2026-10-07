-- ============================================================
-- ZENIMONIES BANKING
-- CUSTOMER CARE → ADMINISTRATION ESCALATION
--
-- Migration: 006_customer_care_admin_escalation.sql
--
-- SECURITY MODEL:
--
-- Customer
--     ↓
-- Customer Care
--     ↓
-- Forward to Administration
--     ↓
-- Administration takes charge
--
-- Customer Care NEVER receives Admin privileges.
-- ============================================================


-- ============================================================
-- 1. ESCALATION FLAG
-- ============================================================

ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS escalated_to_admin
BOOLEAN NOT NULL DEFAULT FALSE;


-- ============================================================
-- 2. ESCALATION TIMESTAMP
-- ============================================================

ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS escalated_at
TIMESTAMP;


-- ============================================================
-- 3. WHO ESCALATED THE CASE
-- ============================================================

ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS escalated_by
UUID;


-- ============================================================
-- 4. ADMINISTRATION TAKEOVER TIMESTAMP
-- ============================================================

ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS admin_taken_at
TIMESTAMP;


-- ============================================================
-- 5. REASON FOR ESCALATION
-- ============================================================

ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS escalation_reason
TEXT;


-- ============================================================
-- 6. MAKE SURE ADMIN ASSIGNMENT COLUMN EXISTS
--
-- Your original support table already used
-- assigned_admin_id in the initial schema.
-- We keep that column for Administration assignment.
-- ============================================================

ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS assigned_admin_id
UUID;


-- ============================================================
-- 7. CUSTOMER CARE ESCALATED-BY FOREIGN KEY
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'support_tickets_escalated_by_fkey'
          AND conrelid = 'support_tickets'::regclass
    ) THEN

        ALTER TABLE support_tickets
        ADD CONSTRAINT support_tickets_escalated_by_fkey
        FOREIGN KEY (escalated_by)
        REFERENCES users(id)
        ON DELETE SET NULL;

    END IF;

END
$$;


-- ============================================================
-- 8. ADMIN ASSIGNMENT FOREIGN KEY
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'support_tickets_assigned_admin_id_fkey'
          AND conrelid = 'support_tickets'::regclass
    ) THEN

        ALTER TABLE support_tickets
        ADD CONSTRAINT support_tickets_assigned_admin_id_fkey
        FOREIGN KEY (assigned_admin_id)
        REFERENCES users(id)
        ON DELETE SET NULL;

    END IF;

END
$$;


-- ============================================================
-- 9. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS
idx_support_tickets_escalated_to_admin
ON support_tickets(escalated_to_admin);


CREATE INDEX IF NOT EXISTS
idx_support_tickets_assigned_admin_id
ON support_tickets(assigned_admin_id);


CREATE INDEX IF NOT EXISTS
idx_support_tickets_escalated_at
ON support_tickets(escalated_at);


CREATE INDEX IF NOT EXISTS
idx_support_tickets_admin_queue
ON support_tickets(
    escalated_to_admin,
    assigned_admin_id,
    status
);


-- ============================================================
-- 10. DOCUMENT THE SECURITY MODEL
-- ============================================================

COMMENT ON COLUMN support_tickets.escalated_to_admin IS
'TRUE when Customer Care has forwarded the case to Administration.';


COMMENT ON COLUMN support_tickets.escalated_at IS
'Timestamp when Customer Care forwarded the case to Administration.';


COMMENT ON COLUMN support_tickets.escalated_by IS
'Customer Care agent who forwarded the case.';


COMMENT ON COLUMN support_tickets.admin_taken_at IS
'Timestamp when an Administrator took responsibility for the case.';


COMMENT ON COLUMN support_tickets.assigned_admin_id IS
'Administrator currently responsible for the escalated case.';


COMMENT ON COLUMN support_tickets.escalation_reason IS
'Reason Customer Care provided when forwarding the case to Administration.';


-- ============================================================
-- COMPLETE
-- ============================================================

SELECT
    'Customer Care → Administration escalation migration ready'
    AS status;
