-- ZENIMONIES: store the Tier 2 identity provider result separately
-- from the administrator's final identity approval.
ALTER TABLE kyc_records
  ADD COLUMN IF NOT EXISTS id_provider_validation_result VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_kyc_records_id_provider_validation_result
  ON kyc_records (id_provider_validation_result);
