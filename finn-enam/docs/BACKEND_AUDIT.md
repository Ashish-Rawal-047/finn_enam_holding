# FINN Backend Audit Report
**ENAM AI Engineer Build Challenge**
*Audit Date: October 29, 2026 | Target Evaluation: November 1, 2026*

---

## 1. Executive Summary

This audit evaluates the current backend architecture, API endpoints, data persistence, and client connections in FINN (`finn-enam`). The project contains:
- An **Express 5.3 REST API backend** (`finn-enam/server/server.mjs`) running on port `3001`.
- An in-memory data store (`finn-enam/server/data.mjs`) covering 18 portfolio equities, 6 corporate announcements, 3 Event Memory ledger items, and comprehensive research dossiers.
- A **React Native Expo mobile client** (`finn-enam/mobile/`) with a centralized API service layer (`mobile/src/services/api.ts`).
- A **Vite web client** (`finn-enam/src/`) acting as a desktop fallback.

---

## 2. API Endpoint Verification

| Endpoint | Method | Status | Current Implementation | Audit Findings & Gaps |
| :--- | :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | **Functional** | Returns agent name, EOD baseline date (`2026-10-28`), counts, and demo disclaimer. | Lacks dynamic database ping and AI configuration status indicators. |
| `/api/portfolio` | `GET` | **Functional** | Returns 18 companies. Supports `?watchlistOnly=true`. | Data is read from in-memory array; lacks database persistence. |
| `/api/portfolio/:ticker/watchlist` | `POST` | **Functional** | Toggles `inWatchlist` boolean in memory for the given ticker. | Changes reset when the Node.js process restarts. |
| `/api/companies/search` | `GET` | **Missing** | Not implemented on server. | Mobile currently filters local arrays. Required for scalable universe search. |
| `/api/watchlist` | `GET/POST/DELETE` | **Partial** | Handled through `/api/portfolio/:ticker/watchlist`. | Needs explicit RESTful watchlist endpoints persisting to `watchlist_entries`. |
| `/api/signals` | `GET` | **Functional** | Returns announcements filtered by `?window=`, `?category=`, `?severity=`. | In-memory only; does not query persistent `alerts` or `source_documents`. |
| `/api/alerts` | `GET` | **Partial** | Covered partly by `/api/signals` and `/api/alerts/evaluate`. | Needs dedicated endpoint querying persistent alerts table with filter support. |
| `/api/alerts/evaluate` | `POST` | **Functional** | Accepts `priceThreshold` and `volumeThreshold`; calculates breaches against 18 companies. | Calculation works correctly in code; results are not persisted to database. |
| `/api/settings/alerts` | `GET/PUT` | **Missing** | Not implemented on server. Preferences live in client state. | Needs persistence in `alert_preferences` table. |
| `/api/memory` | `GET` | **Functional** | Returns 3 in-memory commitment items with filtering by status/category. | Missing full observations history chain and database backing. |
| `/api/events/:ticker` | `GET` | **Missing** | Only `/api/memory/:id` exists. | Needs route returning original commitment and observation chain by ticker. |
| `/api/events/observations` | `POST` | **Missing** | No endpoint to record subsequent evidence disclosures. | Required to record new observations for Event Memory. |
| `/api/research/:ticker` | `GET` | **Functional** | Returns bespoke research for TRENT, DIXON, POLYCAB, or zero-shot synthetic profile for others. | Lacks document chunk references and database storage of research runs. |
| `/api/research/query` | `POST` | **Functional** | Matches keyword queries on margins, capex, cash, and returns grounded excerpts. | Rule-based simulation; needs optional Gemini API integration with caching. |
| `/api/market/quote/:ticker` | `GET` | **Functional** | Calls Yahoo Finance with 2s timeout; falls back to EOD baseline. | Works reliably; needs clear data-source tagging (`live` vs `eod_baseline`). |

---

## 3. Data Storage & Persistence State

- **Current State:** Zero database drivers (`pg`) or ORMs are installed in `package.json`. All entities reside in JS objects inside `server/data.mjs`.
- **Target Provider:** Hosted **Neon PostgreSQL** via `DATABASE_URL` environment variable.
- **Resilience Requirement:** If `DATABASE_URL` is unconfigured or unreachable, the server must gracefully degrade to deterministic demonstration fixtures with clear status flags, without crashing.

---

## 4. AI & Integration State

- **AI Provider:** No external LLM SDK currently installed. Query answering uses deterministic pattern matching over primary document excerpts.
- **Target Integration:** Google Gemini API (`@google/genai` or direct REST) configured via `GEMINI_API_KEY`, supporting structured JSON output, citation verification, and caching.
- **Document Pipeline:** Needs database-backed `source_documents` and `document_chunks` with full-text search indexing.

