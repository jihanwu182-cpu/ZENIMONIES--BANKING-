-- ============================================================
-- ZENIMONIES BANKING
-- GIFT CARD SYSTEM
-- Migration 002
-- ============================================================

BEGIN;

-- ============================================================
-- GIFT CARD BRANDS
-- ============================================================

CREATE TABLE IF NOT EXISTS gift_card_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,

    description TEXT,
    logo_url TEXT,

    country_code VARCHAR(10),
    currency VARCHAR(10) DEFAULT 'USD',

    buy_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sell_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    status VARCHAR(30) NOT NULL DEFAULT 'active',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gift_card_brands_status
ON gift_card_brands(status);


-- ============================================================
-- GIFT CARD PRODUCTS
-- ============================================================

CREATE TABLE IF NOT EXISTS gift_card_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    brand_id UUID NOT NULL
        REFERENCES gift_card_brands(id)
        ON DELETE RESTRICT,

    name VARCHAR(200) NOT NULL,

    country_code VARCHAR(10),
    currency VARCHAR(10) DEFAULT 'USD',

    card_type VARCHAR(50) DEFAULT 'digital',

    min_amount NUMERIC(18,2),
    max_amount NUMERIC(18,2),

    buy_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sell_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    status VARCHAR(30) NOT NULL DEFAULT 'active',

    provider VARCHAR(50),

    provider_product_id VARCHAR(150),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gift_card_products_brand
ON gift_card_products(brand_id);

CREATE INDEX IF NOT EXISTS idx_gift_card_products_status
ON gift_card_products(status);


-- ============================================================
-- GIFT CARD RATES
-- ============================================================

CREATE TABLE IF NOT EXISTS gift_card_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    product_id UUID NOT NULL
        REFERENCES gift_card_products(id)
        ON DELETE CASCADE,

    provider VARCHAR(50) NOT NULL,

    buy_rate NUMERIC(18,6),
    sell_rate NUMERIC(18,6),

    buy_fee NUMERIC(18,2) DEFAULT 0,
    sell_fee NUMERIC(18,2) DEFAULT 0,

    currency VARCHAR(10) DEFAULT 'NGN',

    effective_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_until TIMESTAMP,

    status VARCHAR(30) NOT NULL DEFAULT 'active',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gift_card_rates_product
ON gift_card_rates(product_id);

CREATE INDEX IF NOT EXISTS idx_gift_card_rates_status
ON gift_card_rates(status);


-- ============================================================
-- GIFT CARD BUY ORDERS
-- ============================================================

CREATE TABLE IF NOT EXISTS gift_card_buy_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    product_id UUID
        REFERENCES gift_card_products(id)
        ON DELETE RESTRICT,

    provider VARCHAR(50),

    provider_transaction_id VARCHAR(150),

    reference VARCHAR(100) UNIQUE NOT NULL,

    face_value NUMERIC(18,2) NOT NULL,

    customer_amount NUMERIC(18,2) NOT NULL,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    status VARCHAR(40) NOT NULL DEFAULT 'pending',

    gift_card_code TEXT,

    failure_reason TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gift_card_buy_orders_user
ON gift_card_buy_orders(user_id);

CREATE INDEX IF NOT EXISTS idx_gift_card_buy_orders_status
ON gift_card_buy_orders(status);

CREATE INDEX IF NOT EXISTS idx_gift_card_buy_orders_provider_tx
ON gift_card_buy_orders(provider_transaction_id);


-- ============================================================
-- GIFT CARD SELL ORDERS
-- ============================================================

CREATE TABLE IF NOT EXISTS gift_card_sell_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    product_id UUID
        REFERENCES gift_card_products(id)
        ON DELETE RESTRICT,

    provider VARCHAR(50),

    provider_transaction_id VARCHAR(150),

    reference VARCHAR(100) UNIQUE NOT NULL,

    face_value NUMERIC(18,2) NOT NULL,

    estimated_payout NUMERIC(18,2),

    final_payout NUMERIC(18,2),

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    status VARCHAR(40) NOT NULL DEFAULT 'pending',

    card_details JSONB DEFAULT '{}'::jsonb,

    attachments JSONB DEFAULT '[]'::jsonb,

    rejection_reason TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gift_card_sell_orders_user
ON gift_card_sell_orders(user_id);

CREATE INDEX IF NOT EXISTS idx_gift_card_sell_orders_status
ON gift_card_sell_orders(status);

CREATE INDEX IF NOT EXISTS idx_gift_card_sell_orders_provider_tx
ON gift_card_sell_orders(provider_transaction_id);


-- ============================================================
-- GIFT CARD WEBHOOK EVENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS gift_card_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    provider VARCHAR(50) NOT NULL,

    event_id VARCHAR(200),

    event_type VARCHAR(100),

    provider_transaction_id VARCHAR(150),

    payload JSONB NOT NULL,

    processed BOOLEAN NOT NULL DEFAULT FALSE,

    processed_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gift_card_webhook_provider_tx
ON gift_card_webhook_events(provider_transaction_id);

CREATE INDEX IF NOT EXISTS idx_gift_card_webhook_processed
ON gift_card_webhook_events(processed);


-- ============================================================
-- GIFT CARD PROVIDER CONFIGURATION
-- ============================================================

CREATE TABLE IF NOT EXISTS gift_card_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) UNIQUE NOT NULL,

    environment VARCHAR(30) NOT NULL DEFAULT 'sandbox',

    enabled BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- INITIAL PROVIDER
-- ============================================================

INSERT INTO gift_card_providers (
    name,
    environment,
    enabled
)
VALUES (
    'prestmit',
    'sandbox',
    FALSE
)
ON CONFLICT (name) DO NOTHING;


COMMIT;
