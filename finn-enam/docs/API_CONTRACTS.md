# FINN API Contracts Specification
**ENAM AI Engineer Build Challenge**
*Base URL:* `http://localhost:3001/api` *(or `$EXPO_PUBLIC_API_BASE_URL`)*

---

## 1. Health & Status

### `GET /api/health`
Returns overall system readiness, database ping, AI provider status, and data source mode.

**Response `200 OK`:**
```json
{
  "status": "ok",
  "database": {
    "connected": true,
    "provider": "Neon PostgreSQL",
    "tablesInitialized": true
  },
  "ai": {
    "configured": true,
    "provider": "Google Gemini 2.0",
    "mode": "live_with_fallback"
  },
  "marketData": {
    "eodBaselineDate": "2026-10-28",
    "liveProvider": "Yahoo Finance (NSE)",
    "status": "active"
  },
  "timestamp": "2026-10-29T02:00:00.000Z"
}
```

---

## 2. Companies & Watchlist

### `GET /api/portfolio`
Query parameters: `?watchlistOnly=true|false`

**Response `200 OK`:**
```json
{
  "total": 18,
  "watchlistCount": 14,
  "advancingCount": 11,
  "decliningCount": 7,
  "avgChangePercent": 1.15,
  "eodBaselineDate": "2026-10-28",
  "dataSource": "database_backed",
  "companies": [
    {
      "id": "comp-trent",
      "ticker": "TRENT.NS",
      "name": "Trent Ltd.",
      "bseCode": "500251",
      "exchange": "NSE",
      "sector": "Consumer Discretionary / Apparel Retail",
      "marketCapCategory": "Large Cap",
      "currentPrice": 7120.45,
      "changePercent": 3.42,
      "volumeRatio": 2.15,
      "inWatchlist": true,
      "sparkline": [6800, 6950, 7120],
      "screenerUrl": "https://www.screener.in/company/TRENT/",
      "irUrl": "https://www.mywestside.com/pages/investor-relations"
    }
  ]
}
```

### `GET /api/companies/search`
Query parameters: `?q=TRENT`

**Response `200 OK`:**
```json
{
  "query": "TRENT",
  "count": 1,
  "results": [
    {
      "id": "comp-trent",
      "ticker": "TRENT.NS",
      "name": "Trent Ltd.",
      "exchange": "NSE",
      "sector": "Consumer Discretionary / Apparel Retail",
      "marketCapCategory": "Large Cap",
      "inWatchlist": true
    }
  ]
}
```

### `GET /api/watchlist`
Returns list of tickers currently followed by the active session.

### `POST /api/watchlist`
Body: `{ "ticker": "DIXON.NS" }`
Adds company to watchlist table. Returns updated state.

### `DELETE /api/watchlist/:ticker`
Removes company from watchlist table. Returns updated state.

---

## 3. Alerts & Push Workflow

### `GET /api/alerts`
Query parameters:
- `window`: `24h` | `48h` | `7d` | `all`
- `category`: Announcement category filter
- `severity`: `critical` | `high` | `normal` | `all`
- `triggerType`: `price_move` | `volume_spike` | `material_filing`

**Response `200 OK`:**
```json
{
  "total": 4,
  "alerts": [
    {
      "id": "alert-dixon-vol-01",
      "ticker": "DIXON.NS",
      "companyName": "Dixon Technologies Ltd.",
      "type": "volume_spike",
      "severity": "critical",
      "headline": "Volume 3.45x 20-DMA with +6.40% Price Expansion",
      "triggerMetric": "+6.40% | 3.45x Vol",
      "explanation": "Exceptional institutional turnover following PLI cabinet approvals.",
      "timestamp": "Today, 14:15 IST",
      "sourceDocTitle": "BSE Regulation 30 Filing & Exchange Series",
      "sourceUrl": "https://www.bseindia.com"
    }
  ]
}
```

### `POST /api/alerts/evaluate`
Body: `{ "priceThreshold": 3.0, "volumeThreshold": 2.0 }`
Calculates real-time / EOD breaches across companies using deterministic math. Returns evaluated breaches.

### `GET /api/settings/alerts` & `PUT /api/settings/alerts`
Persists user anomaly thresholds (`priceMoveThresholdPercent`, `volumeSpikeMultiplier`, `activeDigestWindow`, `enabledCategories`).

---

## 4. Event Memory

### `GET /api/events/:ticker`
Returns the original commitment, current status, announced metrics, and supporting evidence for a given company.

### `GET /api/events/:ticker/history`
Returns the full chronological observation chain linking subsequent filings to the original promise:
```json
{
  "ticker": "TRENT.NS",
  "commitment": {
    "id": "mem-trent-01",
    "title": "Zudio Store Expansion & Margin Defense Commitment",
    "status": "delivered",
    "commitmentDate": "2024-05-08",
    "announcedMetric": "200 net new stores in FY25 while defending >14.5% EBITDA margin",
    "milestoneDeadline": "FY25 Full Year",
    "sourceDoc": "Q4 FY24 Earnings Conference Call Transcript",
    "sourceQuote": "Management guided adding 200 net Zudio stores in FY25..."
  },
  "observations": [
    {
      "id": "obs-trent-01",
      "observationDate": "2024-08-09",
      "observationType": "quarterly_results",
      "reportedUpdate": "Added 68 net Zudio stores in Q1 FY25 with 15.1% margin.",
      "evidenceExcerpt": "Q1 FY25 Investor Presentation, Slide 12",
      "previousStatus": "pending",
      "newStatus": "pending"
    },
    {
      "id": "obs-trent-02",
      "observationDate": "2024-10-24",
      "observationType": "quarterly_results",
      "reportedUpdate": "Added 60 net stores in Q2 FY25 (128 total in H1). Guidance raised to 220+ stores.",
      "evidenceExcerpt": "Q2 FY25 Exchange Disclosure under Reg 30",
      "previousStatus": "pending",
      "newStatus": "delivered"
    }
  ]
}
```

### `POST /api/events/observations`
Body: `{ "eventMemoryId": "mem-trent-01", "observationDate": "2024-10-24", "reportedUpdate": "...", "newStatus": "delivered", "evidenceExcerpt": "..." }`
Records subsequent observation and updates commitment status idempotently.

---

## 5. Primary-Source Research

### `GET /api/research/:ticker`
Returns structured 8-domain institutional research dossier grounded in primary filings:
1. Business Snapshot & Segment Breakdown
2. 8-Tile Financial KPI Scorecard (Revenue, EBITDA Margin, ROCE, ROE, D/E, Working Capital Days, FCF, CFO/PAT)
3. Narrative vs Numbers (Quarterly Guidance Audit)
4. Active Guidance Ledger
5. Cash Flow & Earnings Quality Analysis
6. Bull vs Bear Debate
7. Primary Source Documents List

### `POST /api/research/query`
Body: `{ "ticker": "TRENT.NS", "query": "What is the capex and store addition guidance?" }`
Returns structured grounded answer with exact citation:
```json
{
  "ticker": "TRENT.NS",
  "query": "What is the capex and store addition guidance?",
  "finding": "Management committed to 200+ annual Zudio additions funded entirely from internal accruals with 0 debt.",
  "citation": "Trent Ltd. Q1 FY25 Concall Transcript (Page 14) & Annual Report FY24",
  "grounded": true,
  "confidence": 0.98,
  "timestamp": "2026-10-29T02:00:00.000Z"
}
```

