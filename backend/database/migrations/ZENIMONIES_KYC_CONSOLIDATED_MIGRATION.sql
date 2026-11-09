-- ZENIMONIES BANKING — Consolidated KYC storage and attempt-history migration
-- Additive and re-runnable. Back up production before execution.
-- This migration does NOT change user verification flags or approval tiers.

BEGIN;
-- Permanently store the customer's selected Tier 1 method.
ALTER TABLE kyc_records
  ADD COLUMN IF NOT EXISTS tier1_method VARCHAR(10);

-- Backfill existing records where the selected method is identifiable.
UPDATE kyc_records
SET tier1_method = CASE
  WHEN LOWER(COALESCE(dojah_verification_type, '')) IN ('bvn', 'nin')
    THEN LOWER(dojah_verification_type)
  WHEN NULLIF(BTRIM(COALESCE(bvn, '')), '') IS NOT NULL
    AND NULLIF(BTRIM(COALESCE(nin, '')), '') IS NULL
    THEN 'bvn'
  WHEN NULLIF(BTRIM(COALESCE(nin, '')), '') IS NOT NULL
    AND NULLIF(BTRIM(COALESCE(bvn, '')), '') IS NULL
    THEN 'nin'
  ELSE tier1_method
END
WHERE tier1_method IS NULL;

-- Tier 2: authenticated Cloudinary metadata (never store delivery URLs here).
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

-- Tier 3: the existing migration/schema already has some of these fields;
-- IF NOT EXISTS makes this safe when they are already present.
ALTER TABLE kyc_records
  ADD COLUMN IF NOT EXISTS tier_3_document_asset_id TEXT,
  ADD COLUMN IF NOT EXISTS tier_3_document_public_id VARCHAR(500),
  ADD COLUMN IF NOT EXISTS tier_3_document_resource_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS tier_3_document_format VARCHAR(30),
  ADD COLUMN IF NOT EXISTS tier_3_selfie_asset_id TEXT,
  ADD COLUMN IF NOT EXISTS tier_3_selfie_public_id VARCHAR(500),
  ADD COLUMN IF NOT EXISTS tier_3_selfie_resource_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS tier_3_selfie_format VARCHAR(30);

-- Separate provider evidence from the administrator's final Tier 2 decision.
ALTER TABLE kyc_records
  ADD COLUMN IF NOT EXISTS id_provider_validation_result VARCHAR(30),
  ADD COLUMN IF NOT EXISTS tier_2_bvn_provider_validation_result VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_kyc_records_id_provider_validation_result
  ON kyc_records (id_provider_validation_result);

-- Preserve prior provider references for audit/history. Webhook processing
-- must continue to query ONLY kyc_records.dojah_reference (active reference).
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

-- Backfill currently stored references once. This does not clear active refs.
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
-- Preserve the active Tier 3 liveness failure reason separately
-- from the administrator's Tier 3 document-review decision.
ALTER TABLE kyc_records
  ADD COLUMN IF NOT EXISTS liveness_rejection_reason TEXT;
COMMIT;
