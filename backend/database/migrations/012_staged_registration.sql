
-- ============================================================
-- ZENIMONIES STAGED REGISTRATION
-- Temporary verification records only.
-- Does not create or modify existing customer accounts.
-- ============================================================

CREATE TABLE IF NOT EXISTS pending_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    phone VARCHAR(30) NOT NULL,
    phone_otp_hash CHAR(64),
    phone_otp_expires_at TIMESTAMPTZ,
    phone_otp_attempts INTEGER NOT NULL DEFAULT 0,
    phone_otp_sent_at TIMESTAMPTZ,
    phone_verified_at TIMESTAMPTZ,

    email VARCHAR(255),
    email_otp_hash CHAR(64),
    email_otp_expires_at TIMESTAMPTZ,
    email_otp_attempts INTEGER NOT NULL DEFAULT 0,
    email_otp_sent_at TIMESTAMPTZ,
    email_verified_at TIMESTAMPTZ,

    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pending_registration_phone_attempts
        CHECK (phone_otp_attempts BETWEEN 0 AND 5),

    CONSTRAINT pending_registration_email_attempts
        CHECK (email_otp_attempts BETWEEN 0 AND 5)
);

CREATE INDEX IF NOT EXISTS idx_pending_registration_phone
ON pending_registrations (phone, expires_at)
WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pending_registration_email
ON pending_registrations (LOWER(email), expires_at)
WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pending_registration_expiry
ON pending_registrations (expires_at)
WHERE completed_at IS NULL;
