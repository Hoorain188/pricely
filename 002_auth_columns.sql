-- 002_auth_columns.sql
--
-- Two additions the auth flow needs that the original schema didn't have.
-- Both are nullable, so this is purely additive — no data is touched and it
-- reverses cleanly with the DROP statements at the bottom.
--
-- Run once against the Pricely database.

-- 1. Separates "hasn't confirmed their emailed code yet" from is_active.
--    Without this the two states are indistinguishable: is_active = false
--    would mean both "unverified" and "waiting on admin approval", and login
--    couldn't tell the user which one is blocking them.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- 2. Links a pending back-office request to the (inactive) account it unlocks.
--    Previously the two were only connected by matching email strings; a real
--    foreign key means approving a request can't silently target nothing.
ALTER TABLE team_requests
    ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_team_requests_status ON team_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_codes_lookup ON verification_codes(email, purpose);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_hash ON sessions(refresh_token_hash);

-- To undo:
--   DROP INDEX IF EXISTS idx_sessions_refresh_hash;
--   DROP INDEX IF EXISTS idx_verification_codes_lookup;
--   DROP INDEX IF EXISTS idx_team_requests_status;
--   ALTER TABLE team_requests DROP COLUMN IF EXISTS user_id;
--   ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;
