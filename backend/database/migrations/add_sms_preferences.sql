-- ============================================================
-- ZENIMONIES BANKING
-- SMS ALERT PREFERENCES
-- Additive migration: does not modify existing tables.
-- ============================================================

CREATE TABLE IF NOT EXISTS sms_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL UNIQUE
        REFERENCES users(id)
        ON DELETE CASCADE,

    -- Transaction alerts:
    -- transfers, deposits, payments and related events.
    transaction_alerts BOOLEAN NOT NULL DEFAULT true,

    -- Account security alerts:
    -- security-related account activity.
    security_alerts BOOLEAN NOT NULL DEFAULT true,

    -- Optional promotional and marketing messages.
    promotional_alerts BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS
    idx_sms_preferences_user_id
ON sms_preferences(user_id);

-- ============================================================
-- END SMS PREFERENCES MIGRATION
-- ============================================================
