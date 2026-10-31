-- ============================================================
-- ZENIMONIES — TIER 1 NIN ALTERNATIVE MIGRATION
-- Run once against the production PostgreSQL database.
-- Does not alter existing BVN, Tier 2, or Tier 3 data.
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS nin VARCHAR(11),
  ADD COLUMN IF NOT EXISTS nin_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE kyc_records
  ADD COLUMN IF NOT EXISTS nin VARCHAR(11),
  ADD COLUMN IF NOT EXISTS nin_verification_status VARCHAR(30) NOT NULL DEFAULT 'not_verified',
  ADD COLUMN IF NOT EXISTS nin_verified_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS nin_rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_kyc_records_user_nin
  ON kyc_records(user_id, nin_verification_status);

CREATE INDEX IF NOT EXISTS idx_kyc_records_nin
  ON kyc_records(nin)
  WHERE nin IS NOT NULL AND nin <> '';

-- A customer may complete Tier 1 with either BVN or NIN.
-- Tier 2 still requires users.bvn_verified = TRUE.
