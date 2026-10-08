-- ============================================================
-- ZENIMONIES BANKING
-- ADMIN FRAUD CASE MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS fraud_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  case_number VARCHAR(50) UNIQUE NOT NULL,

  transaction_id UUID NOT NULL
    REFERENCES transactions(id)
    ON DELETE RESTRICT,

  reported_by UUID NOT NULL
    REFERENCES users(id)
    ON DELETE RESTRICT,

  customer_user_id UUID NOT NULL
    REFERENCES users(id)
    ON DELETE RESTRICT,

  reason TEXT NOT NULL,

  status VARCHAR(30) NOT NULL DEFAULT 'reported',

  investigation_notes TEXT,

  assigned_admin_id UUID
    REFERENCES users(id)
    ON DELETE SET NULL,

  compliance_status VARCHAR(30)
    NOT NULL DEFAULT 'not_reviewed',

  legal_status VARCHAR(30)
    NOT NULL DEFAULT 'not_escalated',

  resolved_at TIMESTAMP NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fraud_cases_transaction
  ON fraud_cases(transaction_id);

CREATE INDEX IF NOT EXISTS idx_fraud_cases_customer
  ON fraud_cases(customer_user_id);

CREATE INDEX IF NOT EXISTS idx_fraud_cases_status
  ON fraud_cases(status);

CREATE INDEX IF NOT EXISTS idx_fraud_cases_created
  ON fraud_cases(created_at DESC);
