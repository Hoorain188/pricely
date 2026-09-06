-- 009_user_notification_prefs.sql
--
-- Preferences for the notifications a shopper receives.
--
-- user_notification_settings existed already, but only held back-office
-- concerns — new_reports, sync_failures, weekly_summary_email — because the
-- settings screen it was built for is the admin one. Price alerts are a
-- shopper feature and had nowhere to record whether someone wants them, or
-- by which route.
--
-- Both default to true: someone who sets a price alert has asked to be told
-- when it hits, so being told is the expected behaviour and switching it off
-- is the deliberate act.

ALTER TABLE user_notification_settings
    ADD COLUMN IF NOT EXISTS price_alerts_push  BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS price_alerts_email BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN user_notification_settings.price_alerts_push IS
    'Send a push notification when a watched price reaches its target.';
COMMENT ON COLUMN user_notification_settings.price_alerts_email IS
    'Send an email as well. Independent of push: a phone can be off.';

-- A missing row means "never opened settings", which must not read as
-- "wants nothing" — the code treats an absent row as both enabled, and this
-- keeps the stored default saying the same thing.
