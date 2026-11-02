# FINN — Database schema (Lakebase Postgres on Neon)

The source of truth is `backend/src/db/schema.ts` (Drizzle). Migrations live in `backend/drizzle/`:
* `0000_enable_pgvector.sql` runs `CREATE EXTENSION vector`
* `0001_init.sql` creates the tables, enums, foreign keys and indexes
* `0002_yfinance_and_event_links.sql` adds live-data columns, `data_syncs` and alert → event links
* `0003_favourites_research_jobs_ai_usage.sql` adds alert favourites, research jobs, AI usage tracking, report reuse hashes and AI precedent assessments
* `0004_company_logos_and_demo_account.sql` adds `companies.website_domain` (backfilled from the provider-reported website) and `companies.logo_url`, the `company_logos` cache, and `users.is_demo_account`

Apply them with `npm run db:migrate`, which uses the direct, unpooled URL.

| # | Entity | Table | Key constraints |
| --- | --- | --- | --- |
| 1 | Users | `users` | unique `lower(email)`; `is_demo_account` marks the shared reviewer account |
| 2 | User profiles | `user_profiles` | PK/FK `user_id` → users (cascade) |
| — | Auth sessions | `auth_sessions` | unique `token_hash`; refresh rotation and revocation |
| 3 | Companies | `companies` | unique `nse_symbol`, `bse_code`, `isin`; `is_demo`; `website_domain` (verified identity), optional `logo_url` |
| — | Company logos | `company_logos` | PK `symbol` (Yahoo form); FK `company_id` → companies (set null); `status` ok \| missing, `source`, image bytes, `checked_at` (ok: 30 days, missing: 3 days, unreachable site: 1 hour) |
| 4 | User portfolios | `portfolio_holdings` | PK (`user_id`, `company_id`) |
| 5 | Watchlists | `watchlists` | unique (`user_id`, `lower(name)`) |
| 6 | Watchlist companies | `watchlist_companies` | PK (`watchlist_id`, `company_id`) |
| 7 | Market prices | `market_prices` | PK `company_id` (latest quote) |
| 8 | Historical price candles | `price_candles` | PK (`company_id`, `interval`, `trade_date`) |
| 9 | Trading volumes | `trading_volumes` | PK (`company_id`, `trade_date`); 20-session average and ratio |
| 10 | Corporate announcements | `corporate_announcements` | unique `dedup_hash`; materiality score |
| 11 | Financial statements | `financial_statements` | unique (`company_id`, `period_type`, `period_end`); values in ₹ crore; NULL means not disclosed |
| 12 | Management changes | `management_changes` | unique (company, `lower(person)`, `lower(role)`, change type) |
| 13 | Signals | `signals` | unique `dedup_key` (one per underlying event) |
| 14 | Notifications | `notifications` | unique (`user_id`, `signal_id`); `read_at` and `favourited_at` are independent per-user states (partial index on favourites) |
| 15 | Alert preferences | `alert_preferences` | PK `user_id`; default ±2.5% / 2.0× |
| 16 | Research reports | `research_reports` | generator (names the models actually used), sections (jsonb), limitations, `data_as_of`, `input_hash` (evidence + model; identical hash ⇒ reuse), `timings` |
| — | Research jobs | `research_jobs` | owner `requested_by`; status, stage, per-section `progress`, `partial` sections, `report_id`, `reused`, `timings` |
| 17 | Research evidence | `research_evidence` | claim, `claim_type`, source document |
| 18 | Corporate events | `corporate_events` | unique `dedup_hash`; `embedding vector(1024)` |
| 19 | Event milestones | `event_milestones` | date, status after, evidence |
| 20 | Event execution records | `event_execution_records` | PK `event_id`; delay, variances, accuracy, evidence (NOT NULL) |
| 21 | Similar-event relationships | `event_similarities` | PK (`event_id`, `similar_event_id`); structured, semantic and combined scores; optional `ai_assessment` (verdict, comparison, model) written only from the two stored records |
| 22 | Source documents | `source_documents` | unique `content_hash` |
| 23 | User activity / audit | `audit_logs` | user, action, entity, metadata, IP |
| — | Job runs | `job_runs` | ingestion observability |
| — | Data syncs | `data_syncs` | PK (`company_id`, `dataset`, `provider`); drives caching and freshness |
| — | AI usage | `ai_usage` | per provider call: feature, model, tier, status/error code, attempts, tokens, latency, optional cost; never prompts or keys |

Every table has a primary key, which is the replica identity Neon Realtime needs.

Multi-step writes run in transactions: registration, event creation with its first milestone, and a research report with its evidence.
