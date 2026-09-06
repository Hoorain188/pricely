-- 010_alert_paused.sql
--
-- Lets an alert be switched off without deleting it.
--
-- The Alerts screen has had a switch per alert since it was built, and it
-- only ever changed a value in the app's memory — nothing reached the server,
-- so a "paused" alert still fired, and the switch went back to on the moment
-- the screen was reopened.
--
-- Defaults to true so every existing alert stays armed.

ALTER TABLE price_alerts
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN price_alerts.is_active IS
    'False means paused by the shopper: kept, watched, but never fired.';

-- The checker asks for untriggered, active alerts on the store just scraped.
DROP INDEX IF EXISTS idx_price_alerts_listing;
CREATE INDEX IF NOT EXISTS idx_price_alerts_listing
    ON price_alerts(store_listing_id) WHERE is_triggered = false AND is_active = true;
