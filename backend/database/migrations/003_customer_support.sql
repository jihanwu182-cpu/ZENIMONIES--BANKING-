-- ============================================================
-- ZENIMONIES BANKING
-- CUSTOMER CARE / SUPPORT SYSTEM
-- Migration: 003_customer_support.sql
-- ============================================================

-- ============================================================
-- SUPPORT CATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS support_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL UNIQUE,

    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SUPPORT TICKETS
-- ============================================================

CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_number VARCHAR(40) NOT NULL UNIQUE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    category_id UUID
        REFERENCES support_categories(id)
        ON DELETE SET NULL,

    subject VARCHAR(200) NOT NULL,

    description TEXT NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'open',

    priority VARCHAR(20) NOT NULL DEFAULT 'normal',

    assigned_admin_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    transaction_id UUID
        REFERENCES transactions(id)
        ON DELETE SET NULL,

    last_message_at TIMESTAMP,

    resolved_at TIMESTAMP,

    closed_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT support_tickets_status_check
        CHECK (
            status IN (
                'open',
                'in_progress',
                'pending',
                'resolved',
                'closed'
            )
        ),

    CONSTRAINT support_tickets_priority_check
        CHECK (
            priority IN (
                'low',
                'normal',
                'high',
                'urgent'
            )
        )
);

-- ============================================================
-- SUPPORT MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL
        REFERENCES support_tickets(id)
        ON DELETE CASCADE,

    sender_user_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    sender_type VARCHAR(20) NOT NULL,

    message TEXT NOT NULL,

    is_internal BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT support_messages_sender_type_check
        CHECK (
            sender_type IN (
                'customer',
                'admin'
            )
        )
);

-- ============================================================
-- SUPPORT ATTACHMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS support_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL
        REFERENCES support_tickets(id)
        ON DELETE CASCADE,

    message_id UUID
        REFERENCES support_messages(id)
        ON DELETE CASCADE,

    user_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    file_name VARCHAR(255) NOT NULL,

    file_url TEXT NOT NULL,

    file_type VARCHAR(100),

    file_size INTEGER,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SUPPORT TICKET EVENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS support_ticket_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL
        REFERENCES support_tickets(id)
        ON DELETE CASCADE,

    actor_user_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    event_type VARCHAR(50) NOT NULL,

    old_value TEXT,

    new_value TEXT,

    note TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id
ON support_tickets(user_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
ON support_tickets(status);

CREATE INDEX IF NOT EXISTS idx_support_tickets_priority
ON support_tickets(priority);

CREATE INDEX IF NOT EXISTS idx_support_tickets_category
ON support_tickets(category_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_admin
ON support_tickets(assigned_admin_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_transaction
ON support_tickets(transaction_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at
ON support_tickets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket
ON support_messages(ticket_id);

CREATE INDEX IF NOT EXISTS idx_support_messages_created_at
ON support_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_support_attachments_ticket
ON support_attachments(ticket_id);

CREATE INDEX IF NOT EXISTS idx_support_ticket_events_ticket
ON support_ticket_events(ticket_id);

-- ============================================================
-- DEFAULT SUPPORT CATEGORIES
-- ============================================================

INSERT INTO support_categories
    (name, description)
VALUES
    (
        'Account',
        'Questions about customer accounts and account access.'
    ),
    (
        'Login & Security',
        'Login problems, password issues and account security.'
    ),
    (
        'KYC & Verification',
        'BVN, identity verification and KYC issues.'
    ),
    (
        'Transfers',
        'Bank transfer and money transfer issues.'
    ),
    (
        'Airtime & Data',
        'Airtime and mobile data purchase issues.'
    ),
    (
        'Bills',
        'Electricity, cable, internet and other bill payments.'
    ),
    (
        'Gift Cards',
        'Gift card purchases, sales and related issues.'
    ),
    (
        'Business Banking',
        'Business account and business banking support.'
    ),
    (
        'POS',
        'POS terminal and merchant support.'
    ),
    (
        'Other',
        'Other customer support requests.'
    )
ON CONFLICT (name) DO NOTHING;
