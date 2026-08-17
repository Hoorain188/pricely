-- 005_store_listing_category.sql
--
-- Restores store_listings.category, which the merge dropped.
--
-- Both scrapers in PriceCompare.Api (TelemartSyncService, MegaPkSyncService)
-- write this on every listing they upsert, and the customer-facing
-- /api/browse and /api/search read it. Without the column those two
-- endpoints fail outright at the SQL level (42703), which is why the
-- customer app showed no stores and returned nothing for a search while
-- the admin panel worked fine — the admin queries never touch it.
--
-- The merged schema has products.category_id -> categories for *matched*
-- products, but scraped listings arrive unmatched (product_id IS NULL),
-- so category_id is not a substitute here: it is the taxonomy for the
-- resolved catalogue, this is the raw label the scraper saw on the page.
--
-- Additive and nullable, so it is safe on a live database and reverses
-- cleanly with DROP COLUMN. Existing rows are backfilled by the next
-- scraper run; until then /api/browse falls back to a title keyword search.

ALTER TABLE store_listings
    ADD COLUMN IF NOT EXISTS category VARCHAR(80);

COMMENT ON COLUMN store_listings.category IS
    'Raw category slug as seen on the store page, set by the scrapers. '
    'Distinct from products.category_id, which is the matched-catalogue taxonomy.';

-- Every browse/search request filters on this, one store at a time.
CREATE INDEX IF NOT EXISTS idx_store_listings_category
    ON store_listings(category);
