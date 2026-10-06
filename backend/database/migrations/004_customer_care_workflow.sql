-- ============================================================
-- ZENIMONIES BANKING
-- CUSTOMER CARE WORKFLOW — STAGE 1
-- ============================================================

BEGIN;

-- ============================================================
-- 1. SUPPORT TICKET WORKFLOW
-- ============================================================

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS assigned_to UUID;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS connected_to_customer_care BOOLEAN
    NOT NULL DEFAULT FALSE;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS waiting_since TIMESTAMP;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS customer_response_due_at TIMESTAMP;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS auto_closed_at TIMESTAMP;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS auto_close_reason TEXT;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS last_customer_message_at TIMESTAMP;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS last_agent_message_at TIMESTAMP;

-- ============================================================
-- 2. ASSIGNED AGENT FOREIGN KEY
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'support_tickets_assigned_to_fkey'
  ) THEN
    ALTER TABLE support_tickets
      ADD CONSTRAINT support_tickets_assigned_to_fkey
      FOREIGN KEY (assigned_to)
      REFERENCES users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to
  ON support_tickets(assigned_to);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON support_tickets(status);

CREATE INDEX IF NOT EXISTS idx_support_tickets_waiting_since
  ON support_tickets(waiting_since);

CREATE INDEX IF NOT EXISTS idx_support_tickets_response_due
  ON support_tickets(customer_response_due_at);

CREATE INDEX IF NOT EXISTS idx_support_tickets_connected
  ON support_tickets(connected_to_customer_care);

-- ============================================================
-- 4. SUPPORT MESSAGE INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_created
  ON support_messages(ticket_id, created_at);

-- ============================================================
-- 5. SUPPORT EVENT INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_support_ticket_events_ticket_created
  ON support_ticket_events(ticket_id, created_at);

-- ============================================================
-- 6. COMMENTS / DOCUMENTATION
-- ============================================================

COMMENT ON COLUMN support_tickets.assigned_to IS
  'Authenticated Customer Care agent currently responsible for the case.';

COMMENT ON COLUMN support_tickets.connected_to_customer_care IS
  'TRUE when the customer has requested connection to a real Customer Care agent.';

COMMENT ON COLUMN support_tickets.waiting_since IS
  'Timestamp from which the system has been waiting for the customer response.';

COMMENT ON COLUMN support_tickets.reminder_sent_at IS
  'Timestamp when the automatic no-response reminder was sent.';

COMMENT ON COLUMN support_tickets.customer_response_due_at IS
  'Deadline for the customer to respond before automatic closure.';

COMMENT ON COLUMN support_tickets.auto_closed_at IS
  'Timestamp when the system automatically closed the case.';

COMMENT ON COLUMN support_tickets.auto_close_reason IS
  'Reason recorded when a support case is automatically closed.';

COMMENT ON COLUMN support_tickets.last_customer_message_at IS
  'Timestamp of the latest customer message.';

COMMENT ON COLUMN support_tickets.last_agent_message_at IS
  'Timestamp of the latest Customer Care agent message.';

COMMIT;
