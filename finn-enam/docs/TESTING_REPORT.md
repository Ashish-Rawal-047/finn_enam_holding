# FINN testing report

Last run: 2–3 November 2026, against the Neon `production` branch, Yahoo Finance via yfinance, and Google Gemini (free tier) as the AI provider.

## Automated

| Suite | Command | Result |
| --- | --- | --- |
| TypeScript (web + API) | `npm run typecheck` | pass |
| Production build | `npm run build` | pass (one chunk-size warning, 638 kB) |
| Database migrations | `npm run db:migrate` | applied `0003_favourites_research_jobs_ai_usage` (28 tables) |
| Unit | `npm test` | 31 / 31 |
| End-to-end API | `npm run test:api` (API running, DB migrated and seeded) | 19 / 19 with research. Latest run (logos, demo account): 20 / 20 with the two research tests skipped to save AI quota (`--test-skip-pattern=research`), and `TEST_DEMO_EMAIL` / `TEST_DEMO_PASSWORD` set so the demo-account test runs |
| Database migrations (logos, demo) | `npm run db:migrate` | applied `0004_company_logos_and_demo_account` (29 tables); `website_domain` backfilled for all 23 companies |
| Secret scan of `dist/` | grep for connection strings, key prefixes, secret variable names | clean; no `.env` file is tracked |

The unit tests cover the alert engine, similarity, execution maths and parsing. For AI they use a mock model, with no network and no key. The AI tests check:

* grounding: unknown citations are dropped, and so are figures absent from the cited evidence
* the structured-output prompt
* error classification:
  * invalid key, missing model
  * daily quota vs per-minute rate limit
  * overload, timeout, network
  * key material is never echoed
* bounded retry with backoff
* no retry on non-transient errors
* fallback to the fast model on an exhausted quota
* the quota breaker skips the exhausted model until it resets
* event comparisons read as prose, not evidence ids

The API tests added in this round:

* **Favourites:**
  * an unread favourite stays unread, in the same position and priority
  * favouriting twice is idempotent
  * a read alert can be favourited, and marking a favourite read keeps it
  * the filter and `/alerts/favourites` list both
  * favourites persist across a fresh login
  * another user gets `404` on favourite and unfavourite, and cannot see them
  * removing decrements the count and keeps the alert and its read state
* **Research jobs:**
  * `202` + job
  * owner-only (`404` for others)
  * identical requests de-duplicated
  * unchanged inputs reuse the stored report
  * refresh regenerates
  * stage timings are recorded
  * facts and metrics are available without AI
* **AI endpoints:** authentication is required, and no key material appears in status or usage.
* **Logos (`/logos/:symbol`):** public image with `nosniff` and cross-origin resource policy; bare NSE symbols resolve; malformed symbols return `400`, unverifiable ones `404`. Unit tests cover symbol normalisation, domains taken only from a provider-reported website (never from the name, never IP or localhost), image signatures and size/aspect checks, and icons declared by a homepage.
* **Reviewer demo account:** signs in with a populated portfolio; password change, profile rename, session revocation and Event Memory writes return `403`; theme changes work; only the current session is listed; ordinary accounts keep every capability. Checked by hand as well: with `DEMO_MODE_ENABLED=false` the reviewer login returns `403` and normal login still works; `npm run demo:seed` twice leaves one account.
* **Filings digest (`/digest`):**
  * defaults to the last 24 hours
  * a custom range covers whole local days (IST midnight boundaries; unit-tested, including a DST zone)
  * material filings are ranked by materiality; routine filings are separate
  * only portfolio companies, only inside the window
  * a user with an empty portfolio sees nothing
  * missing, reversed, impossible, future or over-366-day ranges return `400`
  * unauthenticated requests return `401`

## Research latency (measured, `backend/scripts/bench-research.ts`)

Before: the previous pipeline (sequential Yahoo calls in separate Python processes, one large AI call, synchronous request). After: one concurrent Yahoo fetch, three parallel AI groups, background job, report reuse.

| Company | Before: full refresh | After: full refresh | After: facts & metrics on screen | After: unchanged data (reused) |
| --- | --- | --- | --- | --- |
| ITC.NS | 81.1 s | **28.2 s** | 9.4 s | 1.1 s |
| RELIANCE.NS | 48.9 s | 16.8 s* | 11.4 s | 3.4 s |
| TCS.NS | 51.6 s | 13.5 s* | 8.7 s | 1.5 s |
| TRENT.NS | 46.8 s | 30.8 s* | 9.8 s | 2.2 s |

\* The free-tier daily quota for `gemini-3.5-flash` (20 requests) ran out during benchmarking, so these runs used the automatic fallback model, `gemini-3.5-flash-lite`. Their AI times are therefore not directly comparable with "Before"; ITC is the like-for-like comparison.

Stage detail:

* **Yahoo retrieval** (profile, history, 6 statements):
  * before, sequential: 12.9–18.8 s
  * after, one process with up to 4 concurrent requests: **4.3–6.2 s**
  * slowest single request: company info, 2.3–5.1 s
* **Database writes:** 3.2–4.4 s per full sync (history 1.4–1.9 s, profile ~1 s, financials ~1.1 s after batching into one upsert)
* **Unchanged data:**
  * the data stage takes 0.3 s (freshness check only)
  * opening a stored report takes 1.1–1.6 s in the UI
* **AI on ITC with `gemini-3.5-flash`:** the three groups ran in parallel, finishing in 10.1 s, 11.5 s and 17.8 s
  * before, the single combined call took 24.7–38.4 s
  * output and thinking tokens dominate, not input (1.6–2.5k input tokens per group)
* **UI, refresh on cached data** (flash-lite fallback):
  * progress panel within 17 ms of the click
  * facts and metrics in 2.1–3.2 s
  * complete in 8.3–13.5 s

Remaining bottlenecks:

1. AI generation, especially the bull/bear/summary group.
2. Yahoo's company-info request.
3. Round trips to Neon from this machine (~100–250 ms each).

## UI verification (headless Chrome, 1440×900 and 390×844)

| Check | Result |
| --- | --- |
| Favourite an unread alert | Star becomes filled forest green (`#236B52`), `aria-pressed=true`, label "Remove from favourites"; the alert stays unread in the same position; Favourites 0 → 1 immediately; toast "Added to favourites" |
| Mark the favourite as read | Still favourited; moves below unread alerts as before |
| Favourites filter | Lists read and unread favourites; count shown on the chip |
| Reload | Favourites persist |
| Remove the favourite | Count drops to 0 immediately; empty state "No favourite alerts yet. / Bookmark important developments to access them quickly." |
| Notification centre | Same All / Unread / Read / Favourites filters and a star on every row |
| Research progress | "FINN Intelligence is analyzing ITC Limited…", stages and per-section chips; sections show "Analyzing" with skeletons until their AI group lands |
| Research result | 11 sections; AI points labelled "AI interpretation" with their source; fallback disclosed in limitations |
| Filings digest | Defaults to 24 hours. With the demo fixtures (newest filing 29 Oct) it shows "No filings in the last 24 hours", gives the date of the latest filing and offers "Show the last 7 days". 7 days: 13 filings, 10 material, ranked high → low, and 3 routine, collapsed until opened. Custom 25–27 Oct: 5 filings. A reversed range shows an inline message. Opening a filing opens its signal evidence. The chosen window survives a tab switch. No horizontal overflow at 390 px |
| Login page | Fresh browser: email and password pre-filled with the reviewer account, "Reviewer demo account" panel, nothing submitted until "Sign in to demo" is pressed; signs in within 2–3 s |
| Section names | Home shows "Recent Filings" and "Portfolio Alerts"; alert filters All / Unread / Read / Favourites, History and Mark all as read unchanged |
| Recent Filings empty state | One compact row: icon, "No filings in the last 24 hours", "Most recent filing on your portfolio: 29 Oct 2026, 6:15 pm (4d ago)", "Show the last 7 days" (74 px tall on desktop, 145 px on a phone) |
| Company logos | Every alert card, Signals row, Research search result (including MARUTI.NS, not in FINN), Research header, Event Memory row and event page, Settings holdings and watchlists. No broken images; Trent shows initials. Reliance, ITC, TCS, Infosys, Dixon, Polycab and HAL show their logos |
| All five tabs | Render without errors at both sizes; no JS errors in the console |

## Data accuracy

* **Statements:** ITC's stored annual statements were compared with a fresh Yahoo response — 20 of 20 values match (revenue, PAT, total assets, operating cash flow, capex).
* **AI figures:** the AI summary quotes the stored figures (FY26 revenue ₹78,213 Cr, PAT ₹20,689 Cr), and every AI figure passed the grounding check.

## Event Memory AI (live provider)

The `event-intelligence` job:

* embedded all 14 events (`gemini-embedding-001`, 1024 dimensions)
* re-ran matching with semantic scores
* stored 16 precedent comparisons across 9 events

Spot-checks: comparisons cite only figures from the two records (e.g. ₹1,200 Cr vs ₹250 Cr planned capex). They say "no execution outcome recorded" when none exists. Recorded outcomes come from FINN's execution records.

## Not verified / known limitations

* **`gemini-3.5-flash` quota:** its daily free-tier quota is exhausted until Google's reset, so the latest reports used the fallback model (disclosed in each report). The pro models (`gemini-3.1-pro-preview`) have no free-tier quota on this key.
* **Announcements:** still demonstration fixtures. No licensed filings feed is connected, so AI classification of new announcements has run only on stored events.
* **Tata Motors:** still demo until a Yahoo symbol is chosen (`TMPV.NS` or `TMCV.NS`).
* **Logo coverage:** without `LOGO_DEV_TOKEN`, logos come from favicons and the official websites. Reliance, ITC, HDFC Bank and Maruti only publish 16 px icons (drawn small, not stretched). Trent's site declares no icon, so it shows initials. Websites that time out are retried after an hour.
* **Unexplained test failure:** the deduplication API test failed once, on the first run that ingested a new trading day. Its job output was not captured. It has passed on both runs since (isolated, and the final full suite).

## Alert swipe actions, archive and notes (feature branch, Neon branch `dev-alert-productivity`)

Tested against a Neon copy-on-write branch of production; production was not migrated or modified.

| Check | Result |
| --- | --- |
| Migration `0005` on the dev branch | applied (30 tables); all 72 notifications kept their read and favourite states |
| Unit tests | 31 / 31 |
| API tests | 22 / 22 (research skipped to save AI quota), including: archive is idempotent, leaves the active feed and its unread/read counts, keeps read state (also through mark-all-read), lists under Archived, restore returns it once; notes create, update (one per alert), validate (empty / over 4,000 characters → 400), survive archive and restore, delete idempotently; another user gets 404 for archive, restore and every note method; a favourite, read alert with a note keeps all three through archive and restore |
| Browser, 375×812, 390×844, 430×932 (touch) | 20 / 20 each: swipe right marks read then unread (toast with Undo); a short swipe does nothing; a vertical drag over a card scrolls the feed and triggers nothing; swipe left archives; the Archived view shows it still unread; Restore returns it once; note save → refresh → edit → refresh → delete with confirmation, indicator appears and disappears; keyboard-operable actions menu (Enter opens with focus on the first item, Escape closes); Save and Evidence still work; no horizontal overflow; no JS errors |
| Browser, 1280×800 (mouse) | 19 / 19: the same with a mouse drag (no touch-scroll check) |
