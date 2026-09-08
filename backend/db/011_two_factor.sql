-- 011_two_factor.sql
--
-- Two-factor authentication, using an authenticator app (TOTP).
--
-- Deliberately not email or SMS codes. Email is the thing that is currently
-- broken and blocked outbound; SMS costs money per message. TOTP needs
-- neither — the phone generates the code offline from a shared secret, so it
-- keeps working when nothing else does, and it is the stronger option
-- anyway: nothing is transmitted that could be intercepted.

ALTER TABLE users
    -- The shared secret, base32. Present once setup starts; 2FA is not in
    -- force until totp_enabled flips, so an abandoned setup locks nobody out.
    ADD COLUMN IF NOT EXISTS totp_secret  VARCHAR(64),
    ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN users.totp_secret IS
    'Base32 TOTP secret. Set when setup begins, cleared when 2FA is turned off.';
COMMENT ON COLUMN users.totp_enabled IS
    'True only after a first code has been confirmed, so a half-finished setup cannot lock the account.';

-- Recovery codes, for a lost or wiped phone. Without these, losing the
-- authenticator means losing the account — the usual way 2FA turns into a
-- support problem.
CREATE TABLE IF NOT EXISTS backup_codes (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Hashed, like a password. The plain codes are shown once at setup and
    -- never again; a database dump must not be a set of working keys.
    code_hash  VARCHAR(255) NOT NULL,

    -- Single use. Kept rather than deleted so "you have 6 codes left" is
    -- answerable, and a used code cannot silently work twice.
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backup_codes_user ON backup_codes(user_id) WHERE used_at IS NULL;

COMMENT ON TABLE backup_codes IS
    'One-time recovery codes for signing in without the authenticator app.';
