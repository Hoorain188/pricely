-- 003_team_and_hardening.sql
--
-- Columns needed for the team approve/reject/invite flow and for closing
-- two brute-force gaps. All additive and nullable-or-defaulted, so this is
-- safe to run on a live database and reverses cleanly.

-- Counts wrong guesses against a single verification code. Without it a
-- 6-digit code can be attacked one request at a time until it lands;
-- the code is locked after 5 failures.
ALTER TABLE verification_codes
    ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;

-- Invites shouldn't work forever. A link sitting in an old inbox is a
-- standing way into the back office.
ALTER TABLE team_requests
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- invite_token stores a SHA-256 hash, never the raw token — the raw value
-- only ever exists in the invite email.
COMMENT ON COLUMN team_requests.invite_token IS
    'SHA-256 hash of the invite token. The raw token is only in the email.';

CREATE INDEX IF NOT EXISTS idx_team_requests_invite_token ON team_requests(invite_token);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- To undo:
--   DROP INDEX IF EXISTS idx_activity_log_created;
--   DROP INDEX IF EXISTS idx_team_requests_invite_token;
--   ALTER TABLE team_requests DROP COLUMN IF EXISTS expires_at;
--   ALTER TABLE verification_codes DROP COLUMN IF EXISTS attempts;
