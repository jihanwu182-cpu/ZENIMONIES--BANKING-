– ZENIMONIES: Pending email and phone changes
– Existing verified contact details remain unchanged until verification.

ALTER TABLE users
ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS pending_phone VARCHAR(30);

CREATE UNIQUE INDEX IF NOT EXISTS users_pending_email_unique
ON users (LOWER(pending_email))
WHERE pending_email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_pending_phone_unique
ON users (pending_phone)
WHERE pending_phone IS NOT NULL;
