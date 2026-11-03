# FINN REST API

Base path `/api`. Everything except `/live`, `/health` and `/auth/{register,login,refresh,logout}` needs `Authorization: Bearer <accessToken>`.

**Errors** always use one envelope:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Request validation failed", "details": [{ "path": "priceMoveThresholdPct", "message": "..." }] } }
```

Codes:

| Code | HTTP status |
| --- | --- |
| `VALIDATION_FAILED` | 400 |
| `INVALID_JSON` | 400 |
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `UNPROCESSABLE` | 422 |
| `RATE_LIMITED` | 429 |
| `SERVICE_UNAVAILABLE` | 503 |
| `INTERNAL` | 500 |

**Pagination.** List endpoints take `?page=1&pageSize=20` (maximum 100) and return `{ items, pagination: { page, pageSize, total, totalPages } }`.

## Auth
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/register` | `{ email, password (≥10, letters+digits), fullName, timezone? }` → `201 { accessToken, user }` + refresh cookie |
| POST | `/auth/login` | `{ email, password }` → `{ accessToken, user }` + refresh cookie. Rate-limited. |
| POST | `/auth/refresh` | Uses the `finn_rt` cookie; rotates it. A replayed old token revokes the session. |
| POST | `/auth/logout` | Revokes the session and clears the cookie → `204` |
| GET | `/auth/me` | `{ user }`; `user.isDemoAccount` marks the shared reviewer demo account |
| GET | `/auth/sessions` | Active sessions; `current` marks this device. The demo account sees only its current session |
| DELETE | `/auth/sessions/:id` | Revoke one of *your* sessions (`403` for the demo account) |
| POST | `/auth/password` | `{ currentPassword, newPassword }`; signs out other devices (`403` for the demo account) |

**Reviewer demo account.** Login and refresh return `403` while `DEMO_MODE_ENABLED` is off. When it is on, the account cannot change its password or profile (only `theme` in `PATCH /settings`), revoke sessions, or write Event Memory (`POST /events`, `PATCH /events/:id`, `POST /events/:id/milestones`): those return `403` with an explanation.

## Logos
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/logos/:symbol` | Public (no token). `symbol` in Yahoo form (`RELIANCE.NS`, `500325.BO`; a bare symbol is read as NSE). Returns the verified logo image (`Cache-Control: public, max-age=86400`, `Cross-Origin-Resource-Policy: cross-origin`, `X-Logo-Source`), `404` when no logo can be verified (show initials), `400` for a malformed symbol. Rate-limited |

## Portfolio and watchlists
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/portfolio` | Holdings with latest quote, 30-session sparkline, unread signal count |
| POST | `/portfolio` | `{ companyId }` or `{ symbol }` (NSE symbol, BSE code or ISIN). `201` when added, `200` when already held, `404` when unknown and no provider can resolve it. |
| POST | `/portfolio/demo` | Adds the 18 demo companies |
| DELETE | `/portfolio/:companyId` | `204`, or `404` if not held |
| GET / POST | `/watchlists` | List / create `{ name }` (unique per user, maximum 20) |
| PATCH / DELETE | `/watchlists/:id` | Rename / delete (owner only) |
| POST | `/watchlists/:id/companies` | `{ companyId \| symbol }` (also tracks the company) |
| DELETE | `/watchlists/:id/companies/:companyId` | |

## Companies, market data, signals
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/companies/search?q=&limit=` | `{ items, external, providerSearched, provider }`; `items` match name, NSE symbol, BSE code or ISIN in FINN; `external` are Yahoo Finance results (`symbol`, `yahooSymbol`, `exchange`, `name`) not yet imported |
| POST | `/companies/import` | `{ symbol }` (NSE symbol or Yahoo ticker). Resolves, validates and stores the company with profile, history and statements. `201` created / `200` existing, `{ company, created, freshness }`; `404` if Yahoo cannot resolve it; `429` on Yahoo rate limit |
| POST | `/companies/:id/refresh` | Force-refresh profile, history and statements (6 per minute per user). Returns `freshness` |
| GET | `/companies/:id/freshness` | Per dataset (`profile`, `history`, `financials`): `fetchedAt`, `status`, `provider`, `error` |
| GET | `/companies/:id` | Company plus `inPortfolio` |
| GET | `/companies/:id/overview` | Quote, announcements (with materiality), management changes, execution reliability |
| GET | `/companies/:id/signals` | Full chronological signal record (paginated) |
| GET | `/market/:companyId` | Latest quote with volume and 20-day average, `quoteTiming` (`end_of_day` \| `delayed` \| `synthetic`), `delayMinutes`, `currency`, day and 52-week range, `marketCap`, `enterpriseValue`, `updatedAt` |
| GET | `/market/:companyId/history?range=1W\|1M\|3M\|6M\|1Y\|MAX` | Candles with % change, volume ratio and 20/50/200-day SMAs; `isDemo`, `provider` |
| GET | `/signals?type=` | Signals on your portfolio that pass *your* thresholds; priority is relative to them |
| GET | `/signals/:id` | Metrics, evidence and cited source documents |

## Research
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/research/:companyId?reportId=` | `{ company, report \| null, history, quote, freshness, activeJob }`. Reads stored data only (no provider calls). `report.dataAsOf` is the newest data the report used; `report.timings` holds stage timings. `activeJob` is your in-flight job for this company, so a reloaded page can resume progress |
| POST | `/research/:companyId/generate` | `{ refreshData?: boolean }` → `202 { job, deduplicated }`. Runs in the background: syncs stale data (all with `refreshData`), builds facts and metrics, then AI analysis. If an identical report exists (same evidence and model), it is reused (`job.reused: true`) instead of regenerated. An identical request already running returns that job (`deduplicated: true`) |
| POST | `/research/:companyId/refresh` | `{ refreshData?: boolean }` → `202 { job, deduplicated }`. Regenerates the AI analysis even if inputs are unchanged, from cached data (or freshly fetched data with `refreshData`) |
| GET | `/research/jobs/:jobId` | `{ job }`, owner only (others get `404`). `status`: queued \| running \| succeeded \| failed; `stage`: data \| analysis \| ai \| saving \| done; `progress`: per-section `loading` \| `available` \| `partial` \| `unavailable`; `partial`: the sections completed so far (facts and metrics arrive first, AI sections as each analysis group finishes); `reportId`, `reused`, `timings`, `error`. Jobs interrupted by a server restart are marked failed |
| GET | `/research/:companyId/evidence?reportId=` | Evidence rows (claim, type, document) and the company's source documents |
| GET | `/research/:companyId/financials` | Deterministic analysis of the stored statements (no AI, works without a report): `annual[]` / `quarterly[]` period points (reported values, margins, cash conversion, net debt, ratios, growth vs the period one year earlier with `comparedWith`; periods inside the range that the source did not report are `missing: true` slots with no values), `assessments[]` (growth, profitability, cash generation, balance sheet: `label`, `tone`, `detail`, the `rule` used), `insights[]` (latest fiscal year vs the previous one: value, previous value, change, direction, tone, `whyItMatters`, formula, source document and URL), `gaps[]`, `isFinancialSector`, `dataAsOf` |
| POST | `/research/:companyId/ask` | `{ question }` (3–300 characters) → `{ question, answer: [{ text, evidence[] }], notCovered, model, generatedAt, dataAsOf, cached }`. Answered by the fast AI model from the company's stored evidence only; each point's citations and figures are verified (unverifiable points are dropped). Identical questions on unchanged data are served from a 12-hour cache. Rate limited: 12 per 10 minutes. `503` when AI is unavailable |

## Event Memory
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/events?scope=portfolio\|all&status=&category=&companyId=&q=` | Paginated; includes precedent count and delay |
| POST | `/events` | Create (see `createEventInput` in `services/events.ts`). Runs similarity matching. `409` on duplicate. |
| GET | `/events/:id` | Detail: milestones, execution record, `outcome` label, `matchedBy` (alerts/events that cite this one as precedent), similar events with scores, explanations, `sameCompany` and `outcome` (same-company precedents first), company reliability |
| PATCH | `/events/:id` | Update fields or `status`. Outcomes (`completed` / `delayed` / `abandoned`) need `sourceDocument(Id)` + `evidenceExcerpt`, and `completed` also needs `execution.actualCompletionDate`; otherwise `422`. |
| GET / POST | `/events/:id/milestones` | Timeline / add a milestone (same evidence rules) |
| GET | `/events/similar/:companyId` | Similarity links for a company's events |

## Notifications and settings
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/notifications?status=all\|unread\|read\|favourites\|archived&priority=&sort=recent\|attention` | Paginated, with `total`, `unread`, `read`, `favourites` and `archived` counts. `all`, `unread` and `read` (and their counts) cover the active feed only; `favourites` includes archived favourites (flagged); `archived` lists archived alerts, newest archive first. Each item has `favourited` / `favouritedAt`, `archived` / `archivedAt` and `hasNote` / `noteUpdatedAt`. `attention`: unread first (priority, materiality, recency), then read by `readAt` desc. Read notifications are never removed. Each item has `categoryLabel` and `historicalMatch` (`{ eventId, title, company, sameCompany, score, outcome, explanation }` or `null`) |
| PATCH | `/notifications/:id/read` | `{ read: true\|false }` (owner only); the first `readAt` is kept |
| POST | `/notifications/read-all` | Marks all read; nothing is hidden |
| GET | `/alerts/favourites?page=&pageSize=&sort=attention\|recent` | Your bookmarked alerts, read and unread, in the normal order, with the same counts as `/notifications` |
| POST | `/alerts/:alertId/favourite` | Bookmark an alert (`alertId` is your notification id). Idempotent; changes nothing else (read state, priority, order). `{ id, favourited: true, favouritedAt, readAt }`; another user's id is `404` |
| DELETE | `/alerts/:alertId/favourite` | Remove the bookmark. Idempotent. `{ id, favourited: false, favouritedAt: null, readAt }` |
| GET | `/alerts/archived?page=&pageSize=` | Your archived alerts, newest archive first, with the same counts as `/notifications` |
| POST | `/alerts/:alertId/archive` | Move an alert out of the active feed. Idempotent (the first archive time is kept); never deletes; read state, favourite, note and evidence are unchanged. `{ id, archived: true, archivedAt, readAt, favourited, favouritedAt }`; another user's id is `404` |
| POST | `/alerts/:alertId/restore` | Return it to the active feed, unchanged otherwise. Idempotent. `{ id, archived: false, archivedAt: null, … }` |
| GET | `/alerts/:alertId/note` | `{ note: { content, createdAt, updatedAt } \| null }` — your personal note on the alert |
| PUT | `/alerts/:alertId/note` | `{ content }` (trimmed, 1–4,000 characters) creates or replaces your note (one per user per alert) → `{ note }` |
| DELETE | `/alerts/:alertId/note` | Deletes your note → `{ deleted: true\|false }` (idempotent). Notes on another user's alert are `404` for every method |
| POST | `/notifications/read-all` | (unchanged) marks the **active** feed read; archived alerts keep their read state |
| POST | `/notifications/live` | `{ url, sealed }` Neon Realtime capability for your notifications, or `503` when Realtime is off |
| GET / PATCH | `/settings` | Profile: `fullName`, `timezone` (validated IANA zone), `bio`, `theme` |
| GET / PATCH | `/settings/alerts` | `priceMoveThresholdPct` (1–20, default 2.5), `volumeSurgeMultiple` (1.5–10), `announcementCategories[]`, `managementChangeAlerts`, `financialResultAlerts`, `eventAlerts`, `minimumPriority`, `inAppNotifications`. PATCH re-runs the alert engine and returns `newNotifications`. |
| GET | `/digest?window=24h\|48h\|7d\|custom&from=YYYY-MM-DD&to=YYYY-MM-DD` | Filings digest: every announcement on your portfolio in the window. `24h` is the default; rolling windows end now. `custom` needs `from` and `to` (inclusive local days in your profile time zone, at most 366 days, `from` not in the future); otherwise `400`. Returns `{ window: { id, start, end, fromDate, toDate, timezone }, total, materialCount, routineCount, byPriority, material[], routine[], latestFilingAt, isDemo }`. `material` is ranked by materiality, then recency; `routine` (category routine or materiality below 20, the same rule that keeps a filing from alerting) is newest first. Each group returns at most 100 items; counts cover the whole window. Items: `{ id, company, category, categoryLabel, title, summary, announcedAt, exchange, materialityScore, priority, routine, signalId, sourceDocument, isDemo }`. `latestFilingAt` is your portfolio's newest filing at any time, so an empty window can say how far back to look |
| GET | `/home` | Greeting name, quote of the day (with source), portfolio overview, top-5 priority alerts |
| GET | `/live` | Liveness: `{ ok, uptimeSeconds }` as soon as the process is up, no database (host health checks, client wake-up probe) |
| GET | `/health` | Readiness: database (bounded 4 s ping), AI, Realtime and provider status, `uptimeSeconds` (no secrets) |

## AI
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/ai/status?refresh=0\|1` | `{ configured, provider, model, reasoningModel, embeddingModel, available, models: { fast, reasoning }, checkedAt, latencyMs, error, reason }`. Each model entry: `{ id, available, error: { code, message } \| null, quotaResetsAt }`. Checked against the provider (cached 10 min; `refresh=1` forces it). Never includes keys, base URLs or other environment values. Error codes: `not_configured`, `invalid_credentials`, `quota_exhausted`, `rate_limited`, `overloaded`, `timeout`, `model_unavailable`, `malformed_response`, `network`, `provider_error` |
| GET | `/ai/usage?days=30` | Your AI requests in the window: `totals` (requests, errors, input/output/reasoning tokens, `costUsd` only when `AI_PRICE_*` are set), `byFeature` (per feature and model, with average latency) and the 20 most `recent` calls. Prompts are never stored |
