-- ZENIMONIES — NIN Tier 1 + Admin review compatibility
-- Back up the production database before running. Safe to re-run.
BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS nin VARCHAR(11),
  ADD COLUMN IF NOT EXISTS nin_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE kyc_records
  ADD COLUMN IF NOT EXISTS nin VARCHAR(11),
  ADD COLUMN IF NOT EXISTS nin_verification_status VARCHAR(30) NOT NULL DEFAULT 'not_verified',
  ADD COLUMN IF NOT EXISTS nin_verified_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS nin_rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS nin_provider_validation_result VARCHAR(30),
  ADD COLUMN IF NOT EXISTS bvn_provider_validation_result VARCHAR(30),
  ADD COLUMN IF NOT EXISTS dojah_reference VARCHAR(150),
  ADD COLUMN IF NOT EXISTS dojah_verification_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS dojah_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS dojah_checked_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS tier_3_document_public_id VARCHAR(500),
  ADD COLUMN IF NOT EXISTS tier_3_document_resource_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS tier_3_document_format VARCHAR(30),
  ADD COLUMN IF NOT EXISTS tier_3_selfie_public_id VARCHAR(500),
  ADD COLUMN IF NOT EXISTS tier_3_selfie_resource_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS tier_3_selfie_format VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_kyc_records_user_nin
  ON kyc_records(user_id, nin_verification_status);
CREATE INDEX IF NOT EXISTS idx_kyc_records_nin
  ON kyc_records(nin)
  WHERE nin IS NOT NULL AND nin <> '';
CREATE INDEX IF NOT EXISTS idx_kyc_records_dojah_reference
  ON kyc_records(dojah_reference)
  WHERE dojah_reference IS NOT NULL;

COMMIT;
