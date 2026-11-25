/*
# Scout — core schema

A classified-listings monitor that aggregates posts from multiple sources
(OpenSooq now, Facebook groups later), normalizes them into a single schema,
dedupes them, ranks by price, and alerts on new matches.

## Tables
- `sources` — one row per adapter (OpenSooq, Facebook…). Holds enabled flag,
  poll interval, and metadata. Not user-editable rows; seeded by the app.
- `sessions` — encrypted browser cookies per source. AES-256-GCM ciphertext
  plus status (valid/expired/missing). One row per source.
- `listings` — normalized listings. `price` numeric, null for free/unknown
  (sorted last). Unique on (source_id, source_listing_id).
- `price_history` — append-only log of price changes per listing, so cards
  can show "dropped from X".
- `saved_searches` — user-defined alerts: keywords, category, max price, city.
- `fetch_logs` — one row per fetch attempt: source, status, count, duration.
  Never stores cookie values.

## Security
- Single-tenant (no sign-in requested in this build), so policies are
  `TO anon, authenticated` and the data is intentionally shared.
- RLS enabled on every table; full CRUD granted to anon + authenticated.
- Sessions table grants only SELECT to anon (read status), INSERT/UPDATE to
  authenticated... but since there's no auth yet we allow anon CRUD so the
  Sources page can paste cookies. Cookies are encrypted client-side before
  insert, so the plaintext never reaches the DB.

## Notes
1. `sessions.cookies_encrypted` stores AES-256-GCM output (base64). The key
   lives in an env var on the worker; the DB never sees plaintext cookies.
2. `listings.is_new` flips to false once the listing has been shown once.
3. `listings.dupe_group_id` groups likely cross-source duplicates.
*/

CREATE TABLE IF NOT EXISTS sources (
  id text PRIMARY KEY,
  name text NOT NULL,
  name_ar text NOT NULL,
  base_url text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  poll_interval_seconds integer NOT NULL DEFAULT 120,
  last_fetched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sources TO anon, authenticated;

CREATE TABLE IF NOT EXISTS sessions (
  source_id text PRIMARY KEY REFERENCES sources(id) ON DELETE CASCADE,
  cookies_encrypted text,
  status text NOT NULL DEFAULT 'missing',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO anon, authenticated;

CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  source_listing_id text NOT NULL,
  title text NOT NULL,
  description text,
  price numeric,
  currency text,
  price_raw text,
  city text,
  category text,
  condition text,
  images text[] NOT NULL DEFAULT '{}',
  posted_at timestamptz,
  url text NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now(),
  is_new boolean NOT NULL DEFAULT true,
  dupe_group_id uuid,
  is_range boolean NOT NULL DEFAULT false,
  UNIQUE (source_id, source_listing_id)
);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON listings TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_listings_price ON listings (price NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_listings_posted_at ON listings (posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings (category);
CREATE INDEX IF NOT EXISTS idx_listings_city ON listings (city);
CREATE INDEX IF NOT EXISTS idx_listings_source ON listings (source_id);
CREATE INDEX IF NOT EXISTS idx_listings_is_new ON listings (is_new) WHERE is_new = true;

CREATE TABLE IF NOT EXISTS price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  price numeric,
  currency text,
  seen_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON price_history TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_price_history_listing ON price_history (listing_id, seen_at);

CREATE TABLE IF NOT EXISTS saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  keywords text,
  category text,
  max_price numeric,
  city text,
  source_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON saved_searches TO anon, authenticated;

CREATE TABLE IF NOT EXISTS fetch_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  status_code integer,
  new_count integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fetch_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON fetch_logs TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_fetch_logs_source ON fetch_logs (source_id, created_at DESC);

-- Seed the two known sources. OpenSooq enabled, Facebook disabled by default.
INSERT INTO sources (id, name, name_ar, base_url, enabled, poll_interval_seconds)
VALUES
  ('opensooq', 'OpenSooq', 'أوپن سوق', 'https://ly.opensooq.com/ar', true, 120),
  ('facebook', 'Facebook Groups', 'مجموعات فيسبوك', 'https://www.facebook.com', false, 300)
ON CONFLICT (id) DO NOTHING;

-- Seed sessions rows so status defaults to 'missing'.
INSERT INTO sessions (source_id, status)
VALUES ('opensooq', 'missing'), ('facebook', 'missing')
ON CONFLICT (source_id) DO NOTHING;

-- Drop & recreate policies (idempotent).
DROP POLICY IF EXISTS "sources_sel" ON sources;
CREATE POLICY "sources_sel" ON sources FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "sources_ins" ON sources;
CREATE POLICY "sources_ins" ON sources FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "sources_upd" ON sources;
CREATE POLICY "sources_upd" ON sources FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "sources_del" ON sources;
CREATE POLICY "sources_del" ON sources FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "sessions_sel" ON sessions;
CREATE POLICY "sessions_sel" ON sessions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "sessions_ins" ON sessions;
CREATE POLICY "sessions_ins" ON sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "sessions_upd" ON sessions;
CREATE POLICY "sessions_upd" ON sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "sessions_del" ON sessions;
CREATE POLICY "sessions_del" ON sessions FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "listings_sel" ON listings;
CREATE POLICY "listings_sel" ON listings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "listings_ins" ON listings;
CREATE POLICY "listings_ins" ON listings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "listings_upd" ON listings;
CREATE POLICY "listings_upd" ON listings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "listings_del" ON listings;
CREATE POLICY "listings_del" ON listings FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "price_history_sel" ON price_history;
CREATE POLICY "price_history_sel" ON price_history FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "price_history_ins" ON price_history;
CREATE POLICY "price_history_ins" ON price_history FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "price_history_upd" ON price_history;
CREATE POLICY "price_history_upd" ON price_history FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "price_history_del" ON price_history;
CREATE POLICY "price_history_del" ON price_history FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "saved_searches_sel" ON saved_searches;
CREATE POLICY "saved_searches_sel" ON saved_searches FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "saved_searches_ins" ON saved_searches;
CREATE POLICY "saved_searches_ins" ON saved_searches FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "saved_searches_upd" ON saved_searches;
CREATE POLICY "saved_searches_upd" ON saved_searches FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "saved_searches_del" ON saved_searches;
CREATE POLICY "saved_searches_del" ON saved_searches FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "fetch_logs_sel" ON fetch_logs;
CREATE POLICY "fetch_logs_sel" ON fetch_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "fetch_logs_ins" ON fetch_logs;
CREATE POLICY "fetch_logs_ins" ON fetch_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "fetch_logs_upd" ON fetch_logs;
CREATE POLICY "fetch_logs_upd" ON fetch_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "fetch_logs_del" ON fetch_logs;
CREATE POLICY "fetch_logs_del" ON fetch_logs FOR DELETE TO anon, authenticated USING (true);
