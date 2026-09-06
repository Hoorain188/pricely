-- 008_alerts_on_listings.sql
--
-- Lets a price alert point at the listing the shopper was actually looking
-- at, instead of only at a matched product.
--
-- price_alerts.product_id is NOT NULL and references products, which holds
-- the 24 items the matcher has resolved so far. Shoppers browse
-- store_listings — 15,000 of them, nearly all still unmatched — so an alert
-- could only be set on a rounding error's worth of the catalogue.
--
-- Both columns are nullable now and exactly one is expected to be set: a
-- listing alert watches one store's price, a product alert watches every
-- store selling it, and both are worth having once matching catches up.

ALTER TABLE price_alerts
    ADD COLUMN IF NOT EXISTS store_listing_id BIGINT REFERENCES store_listings(id) ON DELETE CASCADE;

ALTER TABLE price_alerts
    ALTER COLUMN product_id DROP NOT NULL;

-- An alert that names neither has nothing to watch, and one that names both
-- would be ambiguous about which price wins.
ALTER TABLE price_alerts
    DROP CONSTRAINT IF EXISTS price_alerts_target_check;

ALTER TABLE price_alerts
    ADD CONSTRAINT price_alerts_target_check
    CHECK ((product_id IS NULL) <> (store_listing_id IS NULL));

-- The checker runs after every scrape and asks "which untriggered alerts
-- involve the listings that just changed".
CREATE INDEX IF NOT EXISTS idx_price_alerts_listing
    ON price_alerts(store_listing_id) WHERE is_triggered = false;

CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id);

COMMENT ON COLUMN price_alerts.store_listing_id IS
    'The listing being watched. Exactly one of this and product_id is set.';
