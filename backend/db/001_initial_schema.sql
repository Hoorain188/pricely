-- 001_initial_schema.sql
--
-- The original 18 tables, written by hand and run in pgAdmin against the
-- Neon database. Kept here so the schema is versioned alongside the code
-- rather than living only inside the database.
--
-- Already applied. Recorded for reference and for rebuilding from scratch.

-- ── Auth & sessions ──────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('admin', 'support', 'readonly', 'user');

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(120) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role NOT NULL DEFAULT 'user',
    phone           VARCHAR(30),
    location        VARCHAR(120),
    avatar_url      TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash  VARCHAR(255) NOT NULL,
    device_name         VARCHAR(120),
    ip_address          VARCHAR(64),
    last_active_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at          TIMESTAMPTZ
);

CREATE TYPE verification_purpose AS ENUM ('signup', 'password_reset');

CREATE TABLE verification_codes (
    id          BIGSERIAL PRIMARY KEY,
    email       VARCHAR(255) NOT NULL,
    code_hash   VARCHAR(255) NOT NULL,
    purpose     verification_purpose NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE team_request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE team_request_type AS ENUM ('invite', 'self_signup');

CREATE TABLE team_requests (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL,
    name            VARCHAR(120),
    requested_role  user_role NOT NULL,
    type            team_request_type NOT NULL,
    status          team_request_status NOT NULL DEFAULT 'pending',
    invited_by      BIGINT REFERENCES users(id),
    reviewed_by     BIGINT REFERENCES users(id),
    invite_token    VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at     TIMESTAMPTZ
);

-- ── Catalog & matching ───────────────────────────────────────────────────

CREATE TABLE stores (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(80) NOT NULL UNIQUE,
    slug        VARCHAR(80) NOT NULL UNIQUE,
    base_url    TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE categories (
    id      BIGSERIAL PRIMARY KEY,
    name    VARCHAR(80) NOT NULL UNIQUE,
    slug    VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE products (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    category_id     BIGINT REFERENCES categories(id),
    image_url       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE listing_match_status AS ENUM ('unmatched', 'needs_review', 'matched', 'rejected');

-- product_id stays NULL until a listing is matched into a product. That
-- nullability is what makes "one product, several store prices" possible.
CREATE TABLE store_listings (
    id              BIGSERIAL PRIMARY KEY,
    store_id        BIGINT NOT NULL REFERENCES stores(id),
    product_id      BIGINT REFERENCES products(id),
    raw_title       VARCHAR(500) NOT NULL,
    price           NUMERIC(12,2) NOT NULL,
    in_stock        BOOLEAN NOT NULL DEFAULT TRUE,
    product_url     TEXT,
    image_url       TEXT,
    match_status    listing_match_status NOT NULL DEFAULT 'unmatched',
    scraped_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_store_listings_match_status ON store_listings(match_status);
CREATE INDEX idx_store_listings_product ON store_listings(product_id);

CREATE TABLE match_groups (
    id              BIGSERIAL PRIMARY KEY,
    confidence      NUMERIC(5,2) NOT NULL,
    status          listing_match_status NOT NULL DEFAULT 'needs_review',
    resolved_by     BIGINT REFERENCES users(id),
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE match_group_listings (
    match_group_id      BIGINT NOT NULL REFERENCES match_groups(id) ON DELETE CASCADE,
    store_listing_id    BIGINT NOT NULL REFERENCES store_listings(id) ON DELETE CASCADE,
    PRIMARY KEY (match_group_id, store_listing_id)
);

-- Appended to on every scrape rather than overwriting the current price —
-- the only way Reports can show "Rs 9,900 → Rs 8,450" later.
CREATE TABLE price_history (
    id                  BIGSERIAL PRIMARY KEY,
    store_listing_id    BIGINT NOT NULL REFERENCES store_listings(id) ON DELETE CASCADE,
    price               NUMERIC(12,2) NOT NULL,
    recorded_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_price_history_listing ON price_history(store_listing_id, recorded_at);

-- ── Shopper activity ─────────────────────────────────────────────────────

CREATE TABLE favorites (
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, product_id)
);

CREATE TABLE price_alerts (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id      BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    target_price    NUMERIC(12,2) NOT NULL,
    is_triggered    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    triggered_at    TIMESTAMPTZ
);

CREATE TABLE search_queries (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id),
    query_text  VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE store_clicks (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT REFERENCES users(id),
    store_listing_id    BIGINT NOT NULL REFERENCES store_listings(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Admin ops ────────────────────────────────────────────────────────────

CREATE TYPE scraper_run_status AS ENUM ('ok', 'fail');

CREATE TABLE scraper_runs (
    id              BIGSERIAL PRIMARY KEY,
    store_id        BIGINT NOT NULL REFERENCES stores(id),
    status          scraper_run_status NOT NULL,
    items_scraped   INT NOT NULL DEFAULT 0,
    error_message   TEXT,
    started_at      TIMESTAMPTZ NOT NULL,
    finished_at     TIMESTAMPTZ
);

CREATE TABLE activity_log (
    id          BIGSERIAL PRIMARY KEY,
    actor_id    BIGINT NOT NULL REFERENCES users(id),
    action      VARCHAR(80) NOT NULL,
    target_type VARCHAR(80),
    target_id   BIGINT,
    details     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_notification_settings (
    user_id                 BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    new_reports             BOOLEAN NOT NULL DEFAULT TRUE,
    sync_failures           BOOLEAN NOT NULL DEFAULT TRUE,
    weekly_summary_email    BOOLEAN NOT NULL DEFAULT FALSE
);
