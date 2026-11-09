-- ============================================================
-- ZENIMONIES — TIER 1 DOJAH LIVENESS STORAGE
-- Safe additive migration. Does not delete or rewrite existing KYC data.
-- ============================================================

ALTER TABLE kyc_records
  ADD COLUMN IF NOT EXISTS tier_1_liveness_status VARCHAR(30)
    NOT NULL DEFAULT 'pending';

ALTER TABLE kyc_records
  ADD COLUMN IF NOT EXISTS tier_1_liveness_verified_at TIMESTAMP;

ALTER TABLE kyc_records
  ADD COLUMN IF NOT EXISTS tier_1_liveness_rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_kyc_records_tier1_liveness_status
  ON kyc_records(tier_1_liveness_status);

-- The active KYC controller archives replaced Dojah references here.
-- Create only if the consolidated migration has not already created it.
CREATE TABLE IF NOT EXISTS kyc_verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kyc_record_id UUID REFERENCES kyc_records(id) ON DELETE SET NULL,
  verification_type VARCHAR(50) NOT NULL,
  reference VARCHAR(150) NOT NULL UNIQUE,
  document_type VARCHAR(50),
  attempt_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  identity_status VARCHAR(30),
  liveness_status VARCHAR(30),
  provider_validation_result VARCHAR(30),
  rejection_reason TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kyc_verification_attempts_user_id
  ON kyc_verification_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_kyc_verification_attempts_kyc_record_id
  ON kyc_verification_attempts(kyc_record_id);
