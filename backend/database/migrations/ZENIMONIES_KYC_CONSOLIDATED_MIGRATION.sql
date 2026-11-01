-- ZENIMONIES BANKING — Consolidated KYC storage and attempt-history migration
-- Additive and re-runnable. Back up production before execution.
-- This migration does NOT change user verification flags or approval tiers.

BEGIN;

-- Tier 2: authenticated Cloudinary metadata.
ALTER TABLE kyc_records
  ADD COLUMN IF NOT EXISTS tier_2_document_front_asset_id TEXT,
  ADD COLUMN IF NOT EXISTS tier_2_document_front_public_id VARCHAR(500),
  ADD COLUMN IF NOT EXISTS tier_2_document_front_resource_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS tier_2_document_front_format VARCHAR(30),
  ADD COLUMN IF NOT EXISTS tier_2_document_back_asset_id TEXT,
  ADD COLUMN IF NOT EXISTS tier_2_document_back_public_id VARCHAR(500),
  ADD COLUMN IF NOT EXISTS tier_2_document_back_resource_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS tier_2_document_back_format VARCHAR(30),
  ADD COLUMN IF NOT EXISTS tier_2_selfie_asset_id TEXT,
  ADD COLUMN IF NOT EXISTS tier_2_selfie_public_id VARCHAR(500),
  ADD COLUMN IF NOT EXISTS tier_2_selfie_resource_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS tier_2_selfie_format VARCHAR(30);

-- Tier 3: authenticated Cloudinary metadata.
ALTER TABLE kyc_records
  ADD COLUMN IF NOT EXISTS tier_3_document_asset_id TEXT,
  ADD COLUMN IF NOT EXISTS tier_3_document_public_id VARCHAR(500),
  ADD COLUMN IF NOT EXISTS tier_3_document_resource_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS tier_3_document_format VARCHAR(30),
  ADD COLUMN IF NOT EXISTS tier_3_selfie_asset_id TEXT,
  ADD COLUMN IF NOT EXISTS tier_3_selfie_public_id VARCHAR(500),
  ADD COLUMN IF NOT EXISTS tier_3_selfie_resource_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS tier_3_selfie_format VARCHAR(30);

-- Provider evidence.
ALTER TABLE kyc_records
  ADD COLUMN IF NOT EXISTS id_provider_validation_result VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_kyc_records_id_provider_validation_result
  ON kyc_records (id_provider_validation_result);

-- Preserve previous verification references.
CREATE TABLE IF NOT EXISTS kyc_verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  kyc_record_id UUID REFERENCES kyc_records(id) ON DELETE SET NULL,
  verification_type VARCHAR(50) NOT NULL,
  reference VARCHAR(150) NOT NULL UNIQUE,
  document_type VARCHAR(100),
  attempt_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  identity_status VARCHAR(50),
  liveness_status VARCHAR(50),
  provider_validation_result VARCHAR(50),
  rejection_reason TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  archived_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kyc_attempts_user_created
  ON kyc_verification_attempts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kyc_attempts_record
  ON kyc_verification_attempts(kyc_record_id);

-- Backfill currently stored references without clearing active references.
INSERT INTO kyc_verification_attempts (
  user_id,
  kyc_record_id,
  verification_type,
  reference,
  document_type,
  attempt_status,
  identity_status,
  liveness_status,
  provider_validation_result,
  rejection_reason,
  started_at,
  completed_at,
  archived_at
)
SELECT
  user_id,
  id,
  COALESCE(NULLIF(dojah_verification_type, ''), 'unknown'),
  dojah_reference,
  document_type,
  COALESCE(verification_status, 'pending'),
  id_verification_status,
  liveness_status,
  id_provider_validation_result,
  COALESCE(id_rejection_reason, rejection_reason),
  dojah_started_at,
  dojah_checked_at,
  CURRENT_TIMESTAMP
FROM kyc_records
WHERE dojah_reference IS NOT NULL
  AND BTRIM(dojah_reference) <> ''
ON CONFLICT (reference) DO NOTHING;

COMMIT;
