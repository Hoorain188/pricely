-- 006_pending_signups.sql
--
-- Holds a signup between "form submitted" and "email code confirmed", so
-- that nothing reaches users until the address is proven.
--
-- Before this, signup inserted into users with email_verified_at null and
-- then sent the code. When the code did not arrive the account still
-- existed, and the app had no way past it:
--
--   login  -> "Please verify your email first" (no way to ask for a code)
--   signup -> "An account with this email already exists"
--
-- The address was stuck. An abandoned signup now leaves a row here instead,
-- which expires on its own.

CREATE TABLE IF NOT EXISTS pending_signups (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    name            VARCHAR(120) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL
);

-- One pending signup per address: starting over replaces the previous
-- attempt rather than stacking rows that all answer the same code.
CREATE INDEX IF NOT EXISTS idx_pending_signups_expires ON pending_signups(expires_at);

COMMENT ON TABLE pending_signups IS
    'Signups awaiting email confirmation. Promoted into users on verify, '
    'discarded when expires_at passes. Never contains a plaintext password.';

-- The rows already stranded by the old flow are deliberately left alone.
--
-- Deleting every user with email_verified_at IS NULL was the obvious move and
-- the wrong one: two of them are team members whose actions are referenced by
-- activity_log, so removing them would either break the audit trail or mean
-- deleting audit rows to hide that it happened. The rest are real people who
-- tried to sign up.
--
-- AuthService handles them instead. Signing up with an address that exists
-- but was never verified is allowed, and confirming the code updates that row
-- in place rather than inserting a second one — so the id, and anything
-- pointing at it, survives.
