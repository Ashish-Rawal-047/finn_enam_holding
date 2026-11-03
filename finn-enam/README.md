# FINN — Financial Investment Agent (ENAM Holdings)

A mobile investment-intelligence app (on a laptop it opens as the same app in a centred, phone-width frame) with five bottom-navigation tabs: **Home** (Recent Filings and materiality-ranked Portfolio Alerts), **Signals** (portfolio monitor and charts), **Research** (structured, evidence-linked company research), **Event Memory** (corporate commitments tracked to evidenced outcomes, with historical-precedent detection) and **Settings**.

* **Frontend:** React 18 · Vite · TypeScript · Tailwind · Lucide · TanStack Query
* **Backend:** Node · Express 5 · TypeScript · Drizzle ORM
* **Neon:** Lakebase Postgres with pgvector, Realtime
* **Market data:** Yahoo Finance through `yfinance` (Python bridge)
* **AI:** configurable provider (Neon AI Gateway, Anthropic, OpenAI, Google or any OpenAI-compatible endpoint) through the AI SDK

**Read first: what is live and what is demo**

* **Yahoo Finance (real, delayed):** company profiles, quotes, daily price history and annual/quarterly statements come from Yahoo Finance via `yfinance`. Quotes are labelled *End-of-day close* or *Delayed ~N min*; this is never presented as real-time. Statements keep the currency Yahoo reports (Infosys files in USD); nothing is converted. Ratios are calculated by FINN and labelled as calculations.
* **Demo:** corporate announcements (no licensed free NSE/BSE filings feed is wired), Event Memory seed events, and any company Yahoo cannot resolve (currently Tata Motors, see below). Demo rows are flagged `is_demo` and labelled "Demo data".
* **Real records:** users, portfolios, watchlists, alert settings, notifications and read state, research reports and Event Memory edits, persisted in Neon.
* **AI (real, when configured):** research analysis, event classification, commitment extraction, semantic matching and precedent comparison run on the provider in `backend/.env` (see *AI research*). Without a provider, research shows reported facts and calculated metrics only and marks the AI sections "Unavailable"; nothing is simulated.
* `yfinance` is an unofficial client of Yahoo's public endpoints, suitable for research and personal use. For commercial redistribution, use a licensed provider through the same adapter interface.

## Reviewer demo access

Open the app and the login page already holds the reviewer demo credentials; press **Sign in to demo** (or **Sign in**). Nothing is submitted automatically, and the fields can be cleared for a normal login.

| | |
| --- | --- |
| Email | `reviewer@finn.demo` |
| Password | `FinnReview2026!` |

These credentials are public on purpose. They belong to a dedicated, shared demo account (not a personal one) holding the 18-company demonstration portfolio. The API enforces its limits:

* the profile, password and other reviewers' sessions cannot be changed, and other reviewers' sessions are not listed;
* shared Event Memory records cannot be created or edited;
* the account's own portfolio, watchlists, alert settings, read state and favourites can be changed (they are shared by everyone using the demo login);
* with `DEMO_MODE_ENABLED=false` the account cannot sign in at all.

The account is created or updated idempotently at API start-up (when demo mode is on) and by `npm run demo:seed`; re-running never creates a duplicate, and an existing personal account with the same email is never taken over.

## Prerequisites

* Node.js ≥ 22. The Neon CLI's `neon skills` subcommand needs 22.20 or newer; the app itself runs on 22.17.
* The Neon CLI (`npm i -g neon`), signed in with `neon login`.
* Python ≥ 3.9 for the Yahoo Finance bridge.

## Setup

```bash
npm install                      # installs frontend + backend (postinstall)
neon login                       # once
neon deploy                      # provisions neon.ts services; writes DATABASE_URL, NEON_* to .env.local
cp backend/.env.example backend/.env
#   then set JWT_SECRET and JWT_REFRESH_SECRET (the command to generate them is in the file)
python -m venv backend/python/.venv
backend/python/.venv/bin/pip install -r backend/python/requirements.txt
#   on Windows: backend\python\.venv\Scripts\pip install -r backend\python\requirements.txt
npm run db:migrate               # pgvector + schema (direct connection)
npm run db:seed                  # demo universe, history, filings, Event Memory, research
```

To enable the reviewer demo login locally, set `DEMO_MODE_ENABLED=true`, `DEMO_USER_EMAIL` and `DEMO_USER_PASSWORD` in `backend/.env`, and the matching `VITE_DEMO_LOGIN_ENABLED=true`, `VITE_DEMO_EMAIL` and `VITE_DEMO_PASSWORD` in a root `.env` (see the two `.env.example` files). Restart the API and Vite afterwards.

## AI research

Set these in `backend/.env` (never in frontend code), then restart the API:

```bash
AI_PROVIDER=google           # or anthropic | openai | openai-compatible | neon
AI_API_KEY=...               # not needed for neon
AI_MODEL=gemini-3.5-flash-lite        # fast tier + fallback
AI_REASONING_MODEL=gemini-3.5-flash   # research synthesis (optional, defaults to AI_MODEL)
AI_EMBEDDING_MODEL=gemini-embedding-001  # optional: semantic Event Memory matching
AI_BASE_URL=                 # openai-compatible only
```

At startup the API logs the provider and checks that each model is served to the key (for Gemini this is a metadata lookup that uses no generation quota). `GET /api/ai/status` returns the same check; `GET /api/ai/usage` returns your requests, tokens and latency.

How AI is used, and kept honest:

* **Research** runs as three analysis groups in parallel (business; financial strength, cash, commitments and guidance; bull/bear, risks and summary), each over a compact, numbered evidence pack built from stored statements, calculated metrics, filings and events. Every point must cite evidence ids; points that cite unknown evidence, or quote figures absent from the cited evidence, are dropped and counted in the report's limitations.
* **Event Memory**: new announcements are classified and their commitments extracted (AI numbers and dates are kept only when they appear in the source text); events are embedded for semantic matching; the top precedents get an AI comparison written only from the two stored records. Outcomes always come from FINN's execution records, never from the model.
* **Failures** are classified (invalid key, exhausted quota, rate limit, overload, timeout, unavailable model, malformed response, network). Transient ones are retried with bounded exponential backoff. If the reasoning model is overloaded or out of quota, the fast model is used once and the report says so; a model with an exhausted quota is skipped until its reset time. Facts and metrics are never blocked by AI failures.
* **Free tiers**: Gemini's free tier allows very few requests per model per day (20 for `gemini-3.5-flash` on the key tested). A research report uses three requests; unchanged reports are reused rather than regenerated. Use a paid tier for regular use.
* To backfill AI for events stored before a provider was configured: `npm --prefix backend run jobs:run -- event-intelligence`.

## Local development

```bash
npm run dev:api     # API on http://localhost:3001 (tsx watch; runs the scheduler)
npm run dev         # web on http://localhost:5173 (proxies /api to :3001)
```

Open http://localhost:5173 and register. On Home, **Load the demo portfolio** to start tracking.

To run ingestion jobs by hand: `npm --prefix backend run jobs:run -- market`, `... -- announcements` or `... -- event-intelligence`.

To measure research latency per stage against the real providers: `cd backend && npx tsx scripts/bench-research.ts ITC.NS RELIANCE.NS` (set `BENCH_SKIP_WARM=1` to save AI quota).

## Tests

```bash
npm run typecheck            # frontend + backend TypeScript
npm test                     # backend unit tests (alert maths, dedup, similarity, execution, parsing, AI grounding and failure handling)
npm run test:api             # end-to-end API tests (server running + migrated/seeded DB)
npm run build                # production build (web + API)
APP_URL=http://localhost:3001 npm run audit:ui   # 390×844, 430×932, 768×1024, 1440×900 screenshots + overflow checks
```

## Production

The hosted deployment (Vercel frontend, Render API, Neon, Gemini), its environment variables and the update workflow are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

```bash
npm run build
NODE_ENV=production npm start    # API serves the built SPA from ./dist on the same origin
```

* Provide environment variables through your host's secret store, not files:
  * `DATABASE_URL` (pooled)
  * `DATABASE_URL_UNPOOLED` (for migrations)
  * `JWT_SECRET` and `JWT_REFRESH_SECRET`
  * `AI_PROVIDER=google`, `AI_API_KEY` (Gemini key), `AI_MODEL`
  * `NEON_REALTIME_*`
  * `CORS_ORIGINS`
  * optional `LOGO_DEV_TOKEN` (higher-resolution company logos)
* Reviewer demo login (both sides must agree):
  * backend (runtime): `DEMO_MODE_ENABLED=true`, `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD`, optional `DEMO_USER_NAME`
  * frontend (build time, compiled into the public bundle): `VITE_DEMO_LOGIN_ENABLED=true`, `VITE_DEMO_EMAIL`, `VITE_DEMO_PASSWORD`. When the backend serves the built app (`npm start`), set them where `npm run build` runs; on a separate static host (Vercel, Netlify), set them in that project's environment and also `VITE_API_BASE_URL`.
  * Only ever put the dedicated demo account's credentials in `VITE_*` variables. To withdraw access, set `DEMO_MODE_ENABLED=false` (the account stops signing in immediately) and rebuild without the `VITE_DEMO_*` values.
* Run `npm run db:migrate` on each release, before starting. With demo mode on, the API creates the reviewer account at start-up; `npm run demo:seed` does the same on its own.
* Add the production origin to `preview.realtime.allowedOrigins` in `neon.ts`, then `neon deploy`.
* Serve over HTTPS. Refresh cookies are `Secure` when `NODE_ENV=production`.
* Run a single API instance, or set `ENABLE_SCHEDULER=false` on all but one so jobs are not duplicated. The login rate limiter is per-process; use a shared store (for example Upstash Redis) when scaling out.

## Security

* Secrets are read only on the server (`backend/src/config/env.ts`, validated at startup and never logged). The frontend `.env.example` holds only public values: an optional `VITE_API_BASE_URL` and the reviewer demo login (`VITE_DEMO_*`), which must only ever name the dedicated demo account. The logo provider token, if any, stays on the server; logos are proxied.
* `.env`, `.env.*` and `.neon` are git-ignored.
* Passwords use Argon2id. Access tokens live in memory; refresh tokens are `httpOnly` / `SameSite=Strict` cookies, rotated with reuse detection.
* Every data query is scoped to the authenticated user. Helmet sets a CSP.

## Data providers

`backend/src/providers/` defines adapters for company info, market data, history, announcements, financial statements and transcripts. `yfinance` (default for company info, market data and financials) is in `providers/adapters/yfinance.ts` and `backend/python/yf_provider.py`. It caches profile and history for 6 hours and statements for 7 days (`data_syncs`), runs at most two Python calls at a time, and surfaces Yahoo rate limits as HTTP 429 instead of retrying aggressively. If the Python environment is missing, the registry falls back to `demo`.

Search on Research accepts a company name, NSE symbol (`ITC`), BSE code already in FINN, or Yahoo ticker (`ITC.NS`, `500875.BO`). Companies Yahoo resolves are imported, stored and refreshed by the market job.

Renamed or demerged listings need an explicit symbol: Zomato maps to `ETERNAL.NS` (same entity, renamed). Tata Motors demerged into `TMPV.NS` (passenger vehicles) and `TMCV.NS` (commercial vehicles); FINN does not pick one for you, so `TATAMOTORS` stays on demo data until its `yahoo_symbol` is set.

To add a licensed provider:

1. Review its documentation: endpoints, rate limits, NSE/BSE coverage, history depth, pricing and licensing.
2. Implement the interfaces in `providers/adapters/<vendor>.ts` against its real responses.
3. Register it in `providers/registry.ts`.
4. Set `<CAPABILITY>_PROVIDER` and its key in `backend/.env`.

## Company logos

Every company row, card and header uses one component, `src/components/company/CompanyLogo.tsx`, which loads `GET /api/logos/:symbol` (for example `RELIANCE.NS`). The API resolves the logo once and caches it in `company_logos`:

1. a verified `logo_url` stored on the company, when set;
2. a logo provider for the company's verified website domain (`logo.dev` when `LOGO_DEV_TOKEN` is set, otherwise Google's favicon service);
3. icons the official website declares (apple-touch-icon, sized icons, web manifest), then `/favicon.ico`.

The domain is the hostname of the website Yahoo Finance reports for that exact listing (`companies.website_domain`), including for search results FINN has not imported yet; it is never derived from the company name. Every candidate is downloaded and checked (image signature, size of at least 16 px, roughly square). When nothing verifies, the UI shows the company's initials. To pin a logo by hand, set `companies.logo_url` to a URL on the company's own site and delete its `company_logos` row.

Coverage without a token: favicons are often small (Reliance and ITC publish only 16 px icons, drawn small rather than blurred), and some sites declare no icon at all (Trent, which shows initials).

## Documentation

* [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): system design, alert engine, Event Memory, AI layer, jobs
* [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md): REST API
* [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md): schema and constraints
* [docs/TESTING_REPORT.md](docs/TESTING_REPORT.md): what was verified, and how
* `mobile/`: an earlier React Native (Expo) client, not updated in this iteration
