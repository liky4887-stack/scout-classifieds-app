# Scout — مراقب الإعلانات المبوبة

A bilingual (Arabic/English, RTL-first) web app that monitors classified listings from multiple sources, shows new posts within minutes, and ranks them by price low to high.

## Features

- **Multi-source aggregation** via an adapter pattern — add sources without touching core code
- **OpenSooq adapter** (live) — reads phones, cars, real estate, and electronics from ly.opensooq.com/ar
- **Facebook Groups adapter** (stub, disabled by default) — structural placeholder only
- **Normalized listing schema** with Arabic-Indic digit parsing, currency detection, range handling
- **Deduplication** by source+sourceId and cross-source duplicate flagging via title similarity + price match
- **Price history** tracking — cards show "dropped from X" when prices change
- **Feed** with filters (category, city, price range, source, new-in-last-15-min) and sorting (price asc/desc, newest; nulls always last)
- **Saved searches** with keyword, category, max price, and city filters
- **Session management** — paste browser cookies, encrypted with AES-256-GCM, status per source (valid/expired/missing)
- **Background worker** — edge function that polls each enabled source on a configurable interval (default 2 min)
- **Fetch logging** — every fetch logs source, status code, count, duration (never cookie values)
- **Safety** — realistic User-Agent, 3-5 second delay between requests, exponential backoff on 403/429, stops on repeated blocks

## Tech Stack

- **Frontend**: Next.js 13, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Postgres, Edge Functions)
- **Encryption**: Web Crypto API (AES-256-GCM)

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Feed | `/` | All listings, sortable, filterable |
| Listing Detail | `/listing/[id]` | Full listing with images, description, price history |
| Saved Searches | `/searches` | Create and manage alert subscriptions |
| Sources | `/sources` | Session status, interval, enable/disable per source |
| Settings | `/settings` | Appearance, language, data stats |

## Running Locally

### Web App

```bash
npm install
npm run dev
```

The app runs on http://localhost:3000

### Worker (Edge Function)

The worker is deployed as a Supabase Edge Function. To trigger a fetch manually:

```bash
curl -X GET https://<your-supabase-url>/functions/v1/scout-worker \
  -H "Authorization: Bearer <anon-key>"
```

Or click the refresh button in the navbar — it triggers the worker from the UI.

### Tests

```bash
npm test
```

Tests cover:
- Price parser: Arabic digits, ranges, nulls, currency markers
- Dedupe: source+sourceId exact, cross-source title similarity + price match
- Sort order: price asc/desc with nulls always last, newest
- Adapter parser: against saved HTML fixture

## Project Structure

```
lib/
  types.ts              — NormalizedListing, SourceAdapter, etc.
  price.ts              — Arabic digit conversion + price parser
  dedupe.ts             — Title similarity + duplicate detection
  sort.ts               — Sort with nulls-last guarantee
  crypto.ts             — AES-256-GCM cookie encryption
  supabase.ts           — Supabase client singleton
  persist.ts            — Listing persistence + price history
  format.ts             — Date/number formatting helpers
  sources/
    interface.ts        — SourceAdapter interface
    opensooq.ts         — OpenSooq adapter (LIVE)
    facebook.ts         — Facebook adapter (STUB, disabled)
    registry.ts         — Adapter registry

app/
  layout.tsx            — RTL root layout with Arabic font
  page.tsx              — Feed page
  listing/[id]/page.tsx — Listing detail
  searches/page.tsx     — Saved searches
  sources/page.tsx      — Source management
  settings/page.tsx     — Settings

supabase/
  config.toml           — Edge function config
  functions/
    scout-worker/       — Background polling worker

tests/
  price.test.ts         — Price parser tests
  dedupe.test.ts        — Dedupe tests
  sort.test.ts          — Sort order tests
  adapter.test.ts       — OpenSooq adapter parser tests
  fixtures/             — HTML fixtures for adapter tests
```

## Deliverable Status

### Working Code
- All lib modules (types, price, dedupe, sort, crypto, supabase, persist, format)
- OpenSooq adapter (fetches + parses HTML)
- Facebook adapter (stub — structural only, returns empty)
- All 5 pages (Feed, Listing Detail, Saved Searches, Sources, Settings)
- Navbar with RTL nav, theme toggle, worker trigger
- Listing card component with price drop indicator
- Edge function worker (fetches sources, parses, stores, logs)
- Database migration (6 tables with RLS, seeded sources)
- All 4 test suites

### Stubs
- Facebook Groups adapter — `lib/sources/facebook.ts` — intentionally not implemented (Meta ToS risk)

### Sources
- **OpenSooq**: LIVE — fetches 4 category pages, parses listings
- **Facebook Groups**: DISABLED BY DEFAULT — stub only

### Legal Warning

OpenSooq's terms restrict automated collection. This tool is for personal use of your own logged-in session. Do not run at scale without reviewing their ToS.

Facebook groups have no public API for posts. Scraping a logged-in account breaks Meta's Terms and can get the account banned.
