# FINN: Engineering Build Plan & Roadmap
**ENAM Holdings — AI Engineer Build Challenge**
*Target Completion: Sunday, November 1, 2026 | Current Date: October 29, 2026*

---

## 1. Project Philosophy & Core Directives

> *"Thin-but-working beats broad-but-broken. A focused prototype that nails one or two workflows beautifully beats a broad one that doesn't run. A demo that doesn't run is the worst outcome."* — **ENAM Build Challenge Brief**

To succeed within our strict 72-hour delivery window, FINN's build strategy adheres to four core engineering principles:

1. **Deterministic Demonstration Reliability:** Live web scrapers and external LLM APIs are prone to IP bans, exchange rate-limits, and network latency during live evaluations. FINN couples live data connectors with rich, pre-ingested, deterministic local fixtures for all 18 portfolio tickers and 4 research companies. If an external API is slow or throttled, the app degrades gracefully with zero downtime.
2. **Mobile-First High Density:** Public-market fund managers check their phones constantly between meetings and earnings calls. The frontend is built strictly mobile-first (optimized for 375px–430px screens) with desktop adaptability, presenting dense, high-signal financial tables, collapsible noise drawers, and gesture-friendly sheets.
3. **Primary-Source Grounding:** No hallucinatory AI slop. Pull analysis and push summaries cite specific primary disclosures (Exchange PDFs, Board outcome circulars, Concall transcripts, and Annual Reports).
4. **Lean Model Routing:** Smart tiering combines algorithmic heuristics and regex for classification, fast/low-cost models for extraction, and reasoning-oriented prompts only for multi-quarter commitment synthesis.

---

## 2. Technology Stack Selection & Rationale

| Layer | Selected Technology | Strategic Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18 + Vite + TypeScript** | Blazing-fast HMR, lightweight bundle size, strict type-safety for complex financial data models, and zero build friction on Windows environments. |
| **Styling & Design System** | **Tailwind CSS + Lucide Icons + Framer Motion** | Utility-first CSS enables custom Bloomberg/Koyfin-inspired dark theme styling, pixel-perfect mobile micro-interactions, responsive bottom sheets, and fluid collapsible cards. |
| **State & Data Caching** | **Zustand + TanStack Query** | Minimalist state management for user alert thresholds, time-window toggles, active tickers, and instant caching of company fundamental sheets. |
| **Backend & Ingestion Engine** | **Node.js (Express / Fastify) + Python Data Microservice** | Dual-capability backend: Node.js handles API routing, Event Memory ledger querying, and client serving; Python microservice leverages `yfinance` and HTML parsers for data feeds. |
| **Data Storage** | **Embedded SQLite / LowDB JSON Store** | Zero-configuration, zero-dependency persistence for the Event Memory commitment ledger, user threshold settings, and cached primary filings. |
| **AI / LLM Ingestion** | **Tiered Model Routing (Gemini 1.5/2.5 Flash + Heuristic Parsers)** | Sub-second extraction latency, large context window (1M+ tokens for full annual reports), cost efficiency, and structured JSON output schema enforcement. |

---

## 3. Targeted 72-Hour Implementation Phases

```
Timeline: Oct 29, 2026  ───────────►  Oct 30, 2026  ───────────►  Oct 31, 2026  ───────────►  Nov 01, 2026
Phase 1: Architecture, Scaffolding, Data Fixtures & Ingestion Layer
                    Phase 2: Push Engine, Digest & Presentation Cards
                                        Phase 3: Pull Fundamental Research & Primary Citations
                                                            Phase 4: Event Memory Engine & Generalizer
                                                                                Phase 5: Polish & Submission
```

### Phase 1: Environment Scaffolding & Universe Definition (Day 1: Oct 29)
- [x] Analyze brief and reference documents; author `REQUIREMENTS.md`, `BUILD_PLAN.md`, and `ARCHITECTURE.md`.
- [ ] Scaffold `finn-enam` workspace: modern React Vite mobile client and Express backend service.
- [ ] Curate 18-company mock portfolio and 4 ad-hoc research tickers across diverse Indian market sectors:
  - *Large-Cap:* Reliance Industries (`RELIANCE.NS`), TCS (`TCS.NS`), HDFC Bank (`HDFCBANK.NS`), Infosys (`INFY.NS`), Larsen & Toubro (`LT.NS`), Bharti Airtel (`BHARTIARTL.NS`), Titan (`TITAN.NS`), Tata Motors (`TATAMOTORS.NS`).
  - *Mid-Cap:* Trent (`TRENT.NS`), Polycab India (`POLYCAB.NS`), Persistent Systems (`PERSISTENT.NS`), Dixon Technologies (`DIXON.NS`), Sun Pharma (`SUNPHARMA.NS`), Bajaj Finance (`BAJFINANCE.NS`).
  - *High-Growth / Small-Cap:* Kaynes Technology (`KAYNES.NS`), CDSL (`CDSL.NS`), KPIT Tech (`KPITTECH.NS`), Hindustan Aeronautics (`HAL.NS`).
  - *Ad-Hoc Research Examples:* Zomato (`ZOMATO.NS`), Uno Minda (`UNOMINDA.NS`), Suzlon Energy (`SUZLON.NS`), Jyoti CNC (`JYOTICNC.NS`).
- [ ] Ingest and bundle realistic EOD price/volume history (20-day baseline + anomaly spikes) and exchange announcements mapped to the 17 reference categories.

### Phase 2: Push Intelligence Engine & Presentation Judgment (Day 2 Morning: Oct 30)
- [ ] Implement Windowed Digest filtering:
  - Time-window selector (`24 Hours`, `48 Hours`, `7 Days`, `All Recent`).
  - Category filter pills with unread count badges.
- [ ] Build Signal-to-Noise Prioritization Engine:
  - Auto-sort high-impact categories (`results`, `M&A`, `management_change`, `capex`, `litigation`, `fund_raise`) to top.
  - Automatically collapse `unclassified` routine compliance forms into an expandable disclosure drawer.
- [ ] Implement Triggered Anomaly Alert Engine:
  - Daily price variation calculation: $\Delta\% = \frac{P_{today} - P_{prev}}{P_{prev}} \times 100$.
  - Volume anomaly calculation: $\text{Ratio} = \frac{V_{today}}{\text{MA}_{20}(V)}$.
  - Interactive threshold sliders allowing the user to configure triggers.
- [ ] Implement High-Judgment Presentation Cards:
  - **Management Change Card:** Executive pedigree badge, past roles, and context.
  - **Quarterly Results Card:** Clean comparative table showing Revenue, EBITDA, PBT, PAT with QoQ and YoY growth rates and EBITDA margin.
  - **One-Line Synthesis:** High-density, plain-English summary for capex, credit rating, and litigations.

### Phase 3: Pull Fundamental Research Engine (Day 2 Afternoon: Oct 30)
- [ ] Build Company Deep-Dive Research Screen:
  - Quick-switcher for portfolio companies + search bar for ad-hoc tickers.
- [ ] Construct the 6 Highest-Impact Fundamental Research Modules:
  1. **Business Snapshot:** Operations overview, core segments, and revenue mix breakdown.
  2. **Financial Snapshot:** Key valuation and operational metrics (Revenue run-rate, EBITDA margin, ROCE, ROE, D/E).
  3. **Narrative vs. Numbers (The Brief's Gold Standard):** 4-quarter comparison of management's verbal promises vs. audited financial realities.
  4. **Explicit Management Guidance Ledger:** Capex timelines, margin corridors, and volume growth targets.
  5. **Cash Quality & Conversion:** Operating cash flow (CFO) vs. PAT, Free Cash Flow (FCF), and working capital days.
  6. **Bull vs. Bear Debate:** Institutional arguments grounded in primary balance sheet facts.
- [ ] Primary Source Citations: Every claim, metric, and quote links back to specific Annual Reports or earnings call transcripts.

### Phase 4: Event Memory Engine & Generalization Pipeline (Day 3: Oct 31)
- [ ] Construct the **Event Memory Ledger**:
  - Ingest past promises (e.g., "Commissioning 50MW plant by Q3 FY25", "Targeting 22% EBITDA margin by H2").
  - Index commitments by company, category (Capex, Margin, Debt, Product), and commitment date.
- [ ] Implement Automated Commitment-to-Outcome Matching:
  - As new quarterly disclosures or announcements appear, match keywords and semantic targets.
  - Surface status tags: `Delivered`, `Delayed`, `Underway`, `Missed`.
  - Display an audit trail directly inside announcement cards.
- [ ] Build the Generalizable Research Ingestor:
  - Ticker resolution interface allowing any valid NSE ticker to be queried.
  - Live data retrieval from `yfinance` and public filings with instant fallback.

### Phase 5: Mobile UI Polish, Stress Testing & Submission Packaging (Day 4: Nov 1)
- [ ] Mobile UX optimization:
  - Audit touch targets ($\ge 44\text{px}$), bottom navigation bar, safe-area insets for modern mobile displays.
  - Haptic-feel animations and gesture sheet transitions.
- [ ] Offline & Low-Bandwidth Verification:
  - Verify seamless operation with zero external internet dependency using embedded local datasets.
- [ ] Create Submission Deliverables:
  - AI build log generation.
  - Comprehensive covering note and email draft for `assessment@enam.com`.
  - Git repository hygiene, `README.md`, and clean start script (`npm run dev`).

---

## 4. Frontend Priorities & Visual Architecture

The frontend is the primary evaluation surface. It must convey high conviction, institutional authority, and rapid scannability:

```
┌────────────────────────────────────────────────────────┐
│  FINN // Institutional Terminal           [LIVE] 🟢   │
│  Portfolio: 18 Companies | Digest: Last 24 Hours       │
├────────────────────────────────────────────────────────┤
│  [🔔 PUSH FEED]   [📊 RESEARCH]   [🧠 EVENT MEMORY]    │
├────────────────────────────────────────────────────────┤
│  ▲ TRIGGERED ALERTS (2 Active)                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ⚡ DIXON.NS  | Volume Spike: 3.4x 20DMA (+6.2%)  │  │
│  │ ⚡ POLYCAB.NS | Quarterly PAT +34% YoY Beats Est │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ▼ MATERIAL ANNOUNCEMENTS (Prioritized)                │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🏢 TRENT.NS — Quarterly Results (Q2 FY25)        │  │
│  │   • Rev: ₹4,156 Cr (+39% YoY) | PAT: ₹370 Cr     │  │
│  │   • Margin: 15.2% (+140 bps YoY)                 │  │
│  │   [View Financial Table] [Event Memory Match]   │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 👤 INFY.NS — Management Change (CFO)             │  │
│  │   Incoming: Jayesh Sanghrajka                    │  │
│  │   Pedigree: 18 yrs at Infosys, Ex-KPMG           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ▷ Routine Paperwork (14 collapsed)                  ▼ │
├────────────────────────────────────────────────────────┤
│  [ 📰 Feed ]   [ 🔍 Research ]   [ ⚙️ Settings ]       │
└────────────────────────────────────────────────────────┘
```

### Visual & UX Standards:
- **Dark-Mode Terminal Aesthetic:** Pure zinc/slate dark surfaces (`#090A0F`, `#12151E`, `#1A202C`), with high-contrast typography and subtle borders.
- **Color Semantics:**
  - `Emerald (#10B981)`: Positive moves, delivered commitments, margin expansion.
  - `Rose (#F43F5E)`: Negative variances, missed guidance, executive departures.
  - `Amber (#F59E0B)`: Material warnings, volume spikes, delayed milestones.
  - `Cyan/Indigo (#6366F1)`: Event Memory matches and primary source links.
- **Thumb-Zone Usability:** All key interactive triggers, drawer openers, and time filters live within the lower 60% of the mobile screen.

---

## 5. Backend Module Boundaries & Service Contracts

```
finn-enam/
├── backend/
│   ├── server.ts                    # Main Express/Node server & API dispatcher
│   ├── services/
│   │   ├── priceVolumeService.ts    # EOD pricing, moving averages, anomaly triggers
│   │   ├── announcementService.ts   # Exchange filing classification & digest builder
│   │   ├── fundamentalService.ts    # Annual report & concall primary data parser
│   │   ├── eventMemoryService.ts    # Historical commitment ledger & tracker
│   │   └── llmRouterService.ts      # Tiered LLM routing, prompts & token caching
│   ├── data/
│   │   ├── mockPortfolio.json       # 18 curated Indian companies + baseline stats
│   │   ├── announcements.json       # Multi-category filings with rich metadata
│   │   ├── fundamentals.json        # Structured primary financials & transcripts
│   │   └── commitments.json         # Historical promises & verified outcomes
│   └── utils/
│       └── financialMath.ts         # EBITDA, margins, YoY/QoQ, volume ratio formulas
```

---

## 6. Testing, Verification & Quality Assurance Plan

1. **Financial Calculation Accuracy:** Unit tests verifying EBITDA margin, percentage YoY/QoQ calculations, and volume anomaly ratios against known values.
2. **Classification Correctness:** Verify that announcements are accurately classified across the 17 categories defined in the reference brief.
3. **Responsive Viewport Audit:** Test across Chrome DevTools mobile emulation: iPhone 14/15 Pro (393x852), Pixel 7 (412x915), iPad Mini (768x1024), and 1440px desktop.
4. **Resilience & Offline Test:** Disable network connectivity; confirm the application functions smoothly using deterministic local fixtures.

---

## 7. Submission Checklist (Per Official Brief)

- [ ] **Working Mobile-First Prototype:** Clean responsive build, running locally via standard commands or hosted online.
- [ ] **GitHub Repository:** Clean tree, comprehensive documentation in `docs/`, clear commit messages.
- [ ] **AI Build History:** Detailed logs and transcripts demonstrating effective agentic pairing and prompt engineering.
- [ ] **Covering Note (Email to assessment@enam.com):**
  - Subject line: `ENAM - IIT screening - 2027`
  - Concise summary of architectural choices, trade-offs, and deliberate omissions.
  - Direct links to repository and live preview.

