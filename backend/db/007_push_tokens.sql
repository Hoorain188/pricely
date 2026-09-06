-- 007_push_tokens.sql
--
-- Where to send a notification.
--
-- A phone that wants notifications asks the operating system for a token —
-- an address for that one app on that one device. Nothing can be sent until
-- the server has been told it, so the app registers it after signing in and
-- this is where it is kept.
--
-- Push travels over HTTPS to Expo's service, so unlike the emailed
-- verification codes it is not affected by outbound SMTP being blocked.

CREATE TABLE IF NOT EXISTS push_tokens (
    id            BIGSERIAL PRIMARY KEY,

    user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Unique because it identifies a device, not a person. Signing in as
    -- someone else on the same phone moves the row rather than adding one,
    -- otherwise the previous account keeps receiving that device's alerts.
    token         VARCHAR(255) NOT NULL UNIQUE,

    platform      VARCHAR(20),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Expo reports tokens that have stopped working (app uninstalled, for
    -- instance). Recording the last accepted send makes stale rows findable.
    last_used_at  TIMESTAMPTZ
);

-- Sending to one person means fetching every device they use.
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);

COMMENT ON TABLE push_tokens IS
    'One row per device that has agreed to receive notifications. '
    'Deleted on logout and when Expo reports the token as dead.';
