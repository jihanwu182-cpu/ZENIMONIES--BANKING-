
-- Allow accounts to exist before an official account number
-- has been provisioned by the banking/payment provider.

ALTER TABLE accounts
ALTER COLUMN account_number DROP NOT NULL;
