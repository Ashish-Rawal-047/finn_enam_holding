# FINN: Institutional Financial Investment Agent
**ENAM Holdings — AI Engineer Build Challenge**
*Submission Email: `assessment@enam.com` | Subject: `ENAM - IIT screening - 2027`*
*Target Delivery Date: Sunday, November 1, 2026 | Build Date: October 29, 2026*

---

## 1. Executive Summary & Design Philosophy

FINN is a mobile-first investment intelligence companion purpose-built for high-conviction public market investors. Rather than acting as another overwhelming dashboard widget collector, FINN embraces the philosophy of **"Quiet Luxury Meets Investment Intelligence"**:

> **"Show the conclusion first. Reveal details on demand. Filter the noise before the investor opens the app."**

### Core Architectural Pillars
1. **PUSH (Proactive Intelligence):** Windowed digest (24h/48h/7d) of corporate exchange announcements mapped to the 17 taxonomy categories, coupled with real-time price and volume anomaly alerts ($\pm X\%$ and $Y\times$ 20-DMA).
2. **PULL (Primary-Source Research):** Deep corporate fundamentals strictly grounded in Annual Reports, audited financial releases, and concall transcripts. Zero broker notes, secondary rumors, or hallucinated AI commentary.
3. **EVENT MEMORY™ (Signature Innovation):** An institutional commitment tracker recording management promises (capex programs, store rollout deadlines, margin targets) and continuously cross-referencing subsequent quarterly audited deliveries against historical promises.
4. **Deterministic Demonstration Reliability:** Seamlessly runs out-of-the-box with bundled deterministic fixtures across 18 portfolio equities and 4 ad-hoc research companies, with live Yahoo Finance and REST endpoints when connected. Zero demo failure risk.

---

## 2. Quick Start & Execution

FINN includes both a **Native Mobile Application (React Native + Expo)** and an integrated **Node.js / Express REST API backend** with web fallback.

### A. Run Native Mobile App (React Native & Expo — Port 8081)

```bash
# 1. Navigate to mobile app directory
cd finn-enam/mobile

# 2. Start Expo Metro bundler
npm run web
# Opens at http://localhost:8081/

# --- OR ---
# Start native iOS/Android development client
npx expo start
```

### B. Run Unified API Server + Web Fallback (Port 3001)

```bash
# 1. Navigate to the project root
cd finn-enam

# 2. Install dependencies
npm install

# 3. Start unified API + Web Server (Port 3001)
npm start
# Opens at http://localhost:3001/

# --- OR ---

# Run Vite HMR Development Client (Port 5173)
npm run dev
```

### Verified Ports
- **Expo Mobile Web Preview:** `http://localhost:8081/` (Serves the genuine React Native mobile app)
- **Unified Production Server:** `http://localhost:3001/` (Express REST API + Web fallback)
- **Vite Dev Client:** `http://localhost:5173/`
- **API Health Endpoint:** `http://localhost:3001/api/health`

---

## 3. Product Tour: 4 Core Institutional Destinations

```
┌─────────────────────────────────────────────────────────────┐
│                          APP HEADER                         │
│  [FN] FINN ENAM INTEL   [EOD OCT 28]  [★ 18]  [⚙]  [☼/☾]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [TODAY]          [SIGNALS]       [RESEARCH]      [MEMORY]  │
│  Morning          Alert Inbox     Primary Deep    Account-  │
│  Briefing         & Triage        Dives & Q&A     ability   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Destination 1: TODAY — The Investor's Briefing
- **Main Editorial Focal Point:** A single prominent takeaway answering *"What deserves attention today and why?"* (e.g. *“3 companies require your attention today”*).
- **Restrained Watchlist Strip:** Exactly 3 key metrics (Watchlist count, priority signal count, net market posture).
- **Top 3 Priority Signals:** High-impact disclosures displayed with one-line takeaways and relevance tags. Full inbox accessible via one click.
- **Event Memory Spotlight:** Surfaces an active historical commitment directly on the briefing screen with an audit trail deep-link.

### Destination 2: SIGNALS — Prioritized Alert Inbox
- **Progressive Triage Structure:**
  - **Needs Immediate Attention:** Results beats/misses, litigation demands, executive shifts.
  - **Worth Watching:** Capex commissioning, credit rating revisions, promoter pledges.
  - **Routine Compliance (Collapsible):** ESOP allocations, secretarial forms, and grievance reports safely stowed in an expandable drawer with zero visual clutter.
- **Signal Detail Drawer (Slide-Over):** Progressive disclosure layer revealing:
  - Executive Takeaway & Relevance $\rightarrow$ Audited Financial Table / Executive Bio $\rightarrow$ Linked Event Memory target $\rightarrow$ Official Exchange PDF link.
- **Filter Sheet:** Filter by window (`24h`, `48h`, `7d`, `All`), severity, or any of the 17 announcement categories.

### Destination 3: RESEARCH — Primary-Grounded Workspace
- **Instant Search Autocomplete:** As the investor types, matching companies appear with ticker, name, sector, and live price. Also accepts zero-shot arbitrary NSE tickers.
- **Identity & Snapshot:** Ticker badge, market cap, sector, and one-tap watchlist star.
- **5 Segmented Exploration Tabs:**
  1. *Overview:* Business summary, segment revenue mix, and core competitive moat.
  2. *Financials:* TTM Revenue, EBITDA margin, ROCE, ROE, D/E leverage, and Cash Conversion ($CFO/PAT$).
  3. *Track Record (Narrative vs. Numbers):* 4-quarter audit comparing management guidance against audited figures delivered.
  4. *Thesis (Bull vs. Bear):* Balanced institutional arguments grounded in balance sheet facts.
  5. *Evidence:* Clickable links to official Annual Reports and earnings call transcripts.
- **Primary-Grounded Q&A Bar:** Answers investor queries (margin guidance, capex, working capital, risks) strictly citing primary transcripts.

### Destination 4: EVENT MEMORY™ — Institutional Commitment Ledger
- **Accountability Ledger:** Tracks historical promises (capex programs, margin corridors, store rollout targets, debt reductions).
- **Audit Detail Drawer:**
  - Original commitment date, target milestone, and verbatim management quote.
  - 3-step chronological observation timeline.
  - Audited facts vs. AI capital allocation interpretation.
  - Historical comparable precedents (e.g., Avenue Supermarts / Havells).

### Secondary Controls (Slide-Over Drawers)
- **Watchlist & Thresholds Drawer:** Search, star/unstar stocks, filter by market cap, and configure price ($\pm 2\%$ to $\pm 10\%$) and volume ($1.5\times$ to $5\times$) anomaly sliders with instant recalculation.
- **Visual System Toggle:** Warm Ivory editorial theme default (`#FBFBF9`) and Executive Midnight dark theme (`#0F1115`).

---

## 4. REST API Documentation

The Node.js Express server (`server/server.mjs`) provides standard RESTful endpoints:

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | System health, EOD baseline date, and primary data status |
| `/api/portfolio` | `GET` | Full company universe with prices, 20-DMA volume ratios, and watchlist flags |
| `/api/portfolio/:ticker/watchlist` | `POST` | Toggles watchlist status for a company |
| `/api/signals` | `GET` | Filtered exchange announcements (supports `?window=`, `?category=`, `?severity=`) |
| `/api/alerts/evaluate` | `POST` | Evaluates price/volume breaches against customizable thresholds |
| `/api/research/:ticker` | `GET` | Deep research dossier grounded in primary filings |
| `/api/research/query` | `POST` | Answers investor questions with exact primary citations |
| `/api/memory` | `GET` | Event Memory commitment ledger items and audit timelines |
| `/api/memory/:id` | `GET` | Detailed commitment record with chronological observation chain |
| `/api/market/quote/:ticker` | `GET` | Real-time quote fetcher with automatic fallback to EOD baseline |

---

## 5. Mobile-First Verification & Quality Assurance

The interface was built strictly mobile-first and audited via Chrome DevTools Protocol (CDP) at **390 × 844 CSS pixels**:
- **Horizontal Overflow:** 0px (`windowWidth: 390`, `bodyScrollWidth: 390`, `overflow: false`).
- **Touch Target Disciplines:** All primary navigation buttons, filter chips, and drawer triggers meet or exceed $\ge 44\text{px}$ touch target standards.
- **Font Hierarchy:** Serif editorial headings (Newsreader) paired with high-legibility sans-serif bodies (Inter) and tabular monospace numbers (JetBrains Mono).

### Verified Native Mobile Screenshots (Forest Green × Cream Design System)
- `mobile/screenshots/mobile-screen1-today.png` — Mobile 390px Morning Briefing with serif focal headline, portfolio summary, top 3 priority signals.
- `mobile/screenshots/mobile-screen2-signals.png` — Mobile 390px Categorized Signal Inbox (Needs Attention, Worth Watching, Routine compliance drawer).
- `mobile/screenshots/mobile-screen3-research.png` — Mobile 390px Research Workspace with segment breakdown progress bars, 8-tile KPI grid, and external links.
- `mobile/screenshots/mobile-screen4-memory.png` — Mobile 390px Event Memory Corporate Commitment Ledger with status chips, metric targets, and audit links.
- `mobile/screenshots/mobile-screen5-settings.png` — Mobile 390px Settings Sheet with Watchlist manager, alert sensitivity chips, and 17 category toggles.
- `mobile/screenshots/mobile-screen6-signal-detail.png` — Mobile 390px Signal Detail Modal with Executive Takeaway, regulatory filing references, and deep-link CTA.

---

## 6. Submission Deliverables Checklist

- [x] **Working Prototype:** Fully functional web application and REST API running on `http://localhost:3001/`.
- [x] **Code Quality:** Strict TypeScript (`tsc` passed with 0 errors), clean modular architecture.
- [x] **Mobile Optimization:** Flawless 390px execution with 0 layout overflows.
- [x] **Primary Grounding:** Strict citations of Annual Reports, concalls, and Regulation 30/33 filings.
- [x] **Signature Feature:** Event Memory™ ledger matching historical commitments to audited outcomes.
- [x] **Documentation:** `docs/REQUIREMENTS.md`, `docs/BUILD_PLAN.md`, `docs/ARCHITECTURE.md`, and this `README.md`.
- [x] **Submission Ready:** Target email `assessment@enam.com`, subject `ENAM - IIT screening - 2027`.
