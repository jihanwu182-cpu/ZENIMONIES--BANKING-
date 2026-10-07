-- ============================================================
-- ZENIMONIES BANKING
-- CUSTOMER CARE SECURITY VIEW
-- Migration: 005_customer_care_security_view.sql
--
-- PURPOSE:
-- Customer Care agents receive only the minimum information
-- required to investigate a support case.
--
-- NEVER expose through this view:
--   - Full account number
--   - Account balance
--   - Available balance
--   - Ledger balance
--   - balance_before
--   - balance_after
--   - PIN
--   - Password
--   - OTP
--   - Session ID
--   - Full card security information
--
-- Customer Care transaction access is READ-ONLY.
-- ============================================================


-- ============================================================
-- 1. CUSTOMER CARE TRANSACTION VIEW
-- ============================================================

CREATE OR REPLACE VIEW agent_transactions_view AS
SELECT
    t.id AS transaction_id,

    -- Customer identity
    a.user_id AS customer_id,
    u.full_name AS customer_name,
    u.email AS customer_email,
    u.phone AS customer_phone,
    u.kyc_status,

    -- MASKED ACCOUNT ONLY
    CASE
        WHEN a.account_number IS NULL THEN NULL
        WHEN LENGTH(a.account_number) <= 4 THEN
            '****'
        ELSE
            '****' || RIGHT(a.account_number, 4)
    END AS masked_account_number,

    -- Transaction information
    t.reference AS transaction_reference,
    t.type AS transaction_type,
    t.amount AS transaction_amount,
    t.currency AS transaction_currency,
    t.description AS transaction_description,
    t.status AS transaction_status,
    t.created_at AS transaction_created_at,

    -- Bank transfer information where applicable
    bt.id AS bank_transfer_id,
    bt.recipient_name,
    CASE
        WHEN bt.recipient_account_number IS NULL THEN NULL
        WHEN LENGTH(bt.recipient_account_number) <= 4 THEN
            '****'
        ELSE
            '****' || RIGHT(bt.recipient_account_number, 4)
    END AS masked_recipient_account_number,

    bt.recipient_bank_name,
    bt.recipient_bank_code,
    bt.status AS bank_transfer_status,
    bt.provider_reference,
    bt.failure_reason,
    bt.created_at AS transfer_created_at,
    bt.completed_at AS transfer_completed_at

FROM transactions t

INNER JOIN accounts a
    ON a.id = t.account_id

INNER JOIN users u
    ON u.id = a.user_id

LEFT JOIN bank_transfers bt
    ON bt.reference = t.reference
    OR bt.provider_reference = t.reference;


-- ============================================================
-- 2. BANK TRANSFER INVESTIGATION VIEW
--
-- This allows Customer Care to investigate a bank transfer even
-- when the corresponding ledger transaction is not available.
-- ============================================================

CREATE OR REPLACE VIEW agent_bank_transfers_view AS
SELECT
    bt.id AS bank_transfer_id,

    -- Customer
    a.user_id AS customer_id,
    u.full_name AS customer_name,
    u.email AS customer_email,
    u.phone AS customer_phone,
    u.kyc_status,

    -- MASKED ACCOUNT ONLY
    CASE
        WHEN a.account_number IS NULL THEN NULL
        WHEN LENGTH(a.account_number) <= 4 THEN
            '****'
        ELSE
            '****' || RIGHT(a.account_number, 4)
    END AS masked_account_number,

    -- Transfer
    bt.reference AS transaction_reference,
    bt.provider_reference,

    bt.recipient_name,

    -- MASKED RECIPIENT ACCOUNT ONLY
    CASE
        WHEN bt.recipient_account_number IS NULL THEN NULL
        WHEN LENGTH(bt.recipient_account_number) <= 4 THEN
            '****'
        ELSE
            '****' || RIGHT(bt.recipient_account_number, 4)
    END AS masked_recipient_account_number,

    bt.recipient_bank_name,
    bt.recipient_bank_code,

    bt.amount,
    bt.currency,
    bt.narration,
    bt.status,
    bt.failure_reason,
    bt.created_at,
    bt.completed_at

FROM bank_transfers bt

INNER JOIN accounts a
    ON a.id = bt.account_id

INNER JOIN users u
    ON u.id = a.user_id;


-- ============================================================
-- 3. SECURITY COMMENTS
-- ============================================================

COMMENT ON VIEW agent_transactions_view IS
'Read-only Customer Care transaction view. Full account numbers and all customer balances are intentionally excluded.';

COMMENT ON VIEW agent_bank_transfers_view IS
'Read-only Customer Care bank-transfer investigation view. Account numbers are masked and customer balances are excluded.';


-- ============================================================
-- 4. IMPORTANT SECURITY NOTE
-- ============================================================
--
-- These views deliberately DO NOT contain:
--
--   a.balance
--   transactions.balance_before
--   transactions.balance_after
--   full account_number
--
-- Therefore the Customer Care API must query these views instead
-- of returning raw accounts or transaction financial fields.
--
-- ============================================================
