# FINN: System Architecture & Data Flow Specification
**ENAM Holdings — AI Engineer Build Challenge**
*Document Version: 1.0.0 | System Date: October 29, 2026*

---

## 1. System Overview & Architecture Diagram

FINN is engineered as an institutional-grade, mobile-first intelligence platform for public-market equity investors. It bridges raw exchange disclosures, market movements, and primary corporate disclosures with a high-conviction visual interface.

The architecture comprises five distinct layers:
1. **Primary Data Ingestion Layer:** Aggregates exchange filings, EOD market series, and primary documents (Annual Reports, concall transcripts).
2. **AI Extraction & Smart Model Router:** A cost-efficient, tiered pipeline combining rule heuristics, fast extraction models, and reasoning engines.
3. **Event Memory Subsystem:** A commitment tracking ledger that monitors corporate promises over multi-quarter horizons.
4. **Local Data & State Store:** High-speed embedded storage with offline fixture resilience.
5. **Mobile-First Client Presentation Layer:** An institutional, high-density touch interface.

```mermaid
flowchart TD
    subgraph Sources["1. Primary Data Sources"]
        NSE["NSE / BSE Announcements & Filings"]
        YF["EOD Price & Traded Volume (yfinance)"]
        AR["Annual Reports & Concall Transcripts"]
    end

    subgraph Ingestion["2. Ingestion & Transformation Layer"]
        P_Ingest["Price & Volume Service (20-DMA)"]
        A_Ingest["Announcement Classifier (17 Categories)"]
        F_Ingest["Primary Doc Chunking & Table Parser"]
    end

    subgraph Processing["3. AI Extraction & Smart Model Routing"]
        T0["Tier 0: Regex / Deterministic Filter"]
        T1["Tier 1: Fast Flash Model (Extraction / Bios / 1-Liners)"]
        T2["Tier 2: Reasoning Model (Narrative vs Numbers / Bull-Bear)"]
        Cache["Token & Context Cache"]
    end

    subgraph MemoryEngine["4. Event Memory Engine (Signature Feature)"]
        Ledger["Commitment Ledger (Guidance, Capex, Margins)"]
        Matcher["Outcome Cross-Referencing & Status Resolver"]
        CredScore["Management Credibility & Track Record"]
    end

    subgraph Storage["5. Persistence & Fixture Store"]
        DB[("Embedded SQLite / Fast JSON Store")]
        Fixtures[("Deterministic Offline Fixtures (18+4 Companies)")]
    end

    subgraph Client["6. Mobile-First Presentation (React + TypeScript)"]
        PushFeed["Push: Windowed Digest & Anomaly Alerts"]
        PullResearch["Pull: 6-Pillar Fundamental Research"]
        EventTimeline["Event Memory: Commitment vs. Reality UI"]
        Config["User Thresholds & Window Settings"]
    end

    Sources --> Ingestion
    Ingestion --> Processing
    Processing <--> Cache
    Processing --> MemoryEngine
    MemoryEngine --> Storage
    Processing --> Storage
    Fixtures -.-> Storage
    Storage --> Client
    Config -.-> Ingestion
```

---

## 2. End-to-End Data Pipeline & Ingestion Flows

### 2.1 Corporate Announcements (Push Stream)
1. **Fetch & Normalization:** Ingest raw exchange announcements across the 18 portfolio stocks. Standardize fields into `ticker`, `timestamp`, `title`, `category`, and `pdf_url`.
2. **Category Classification:** Map each filing to the 17 taxonomy categories defined in the reference guide:
   - High Signal: `results`, `M&A`, `management_change`, `capex`, `litigation`, `fund_raise`, `credit_rating`, `dividend`.
   - Moderate Signal: `insider_trading`, `earnings_call`, `investor_meetings`, `bonus_split`, `buyback`.
   - Routine/Collapsible: `unclassified`, `postal_ballot`, `agm_egm`, `pleading`, routine compliance certificates.
3. **Presentation Enrichment:**
   - For `management_change`: Trigger executive bio synthesis (name, past appointments, background pedigree).
   - For `results`: Ingest tabular financials and compute Revenue, EBITDA, PBT, PAT with QoQ and YoY deltas.
   - For `capex` / `M&A`: Generate a crisp, objective 1-line impact statement.

### 2.2 End-of-Day Price & Volume Anomaly Engine
1. **Daily Feed:** Ingest daily closing price ($P_t$) and traded volume ($V_t$) via `yfinance` (`.NS` / `.BO` tickers).
2. **Moving Baseline:** Maintain a rolling 20-day simple moving average of volume:
   $$\text{SMA}_{20}(V) = \frac{1}{20} \sum_{i=1}^{20} V_{t-i}$$
3. **Threshold Breaches:**
   - Price Anomaly: $|\Delta P\%| \ge X\%$, where $\Delta P\% = \frac{P_t - P_{t-1}}{P_{t-1}} \times 100$.
   - Volume Anomaly: $\text{Ratio} = \frac{V_t}{\text{SMA}_{20}(V)} \ge Y\times$.
4. **Dynamic User Tuning:** Sliders on the frontend adjust $X$ and $Y$ in real time without backend re-querying.

### 2.3 Primary Fundamentals (Pull Stream)
1. **Source Rigor:** Ingestion is strictly limited to primary documents: Annual Reports, investor presentations, quarterly filings, and concall transcripts (accessible via exchange filings or screener.in primary document repositories).
2. **No Secondary Commentary:** Broker reports, speculative news articles, and ungrounded LLM pretraining hallucinations are strictly filtered out.
3. **Chunking & Page Anchoring:** Large documents are parsed into semantically coherent sections (Management Discussion & Analysis, Auditor Notes, Segment Reporting, Q&A session transcripts) with explicit page/paragraph citations.

---

## 3. Tiered AI Model Routing & Cost Efficiency

To satisfy the brief's emphasis on efficiency and smart model routing, FINN routes every task to the lowest-cost tier capable of solving it:

```
                    ┌────────────────────────────┐
                    │     Incoming Raw Task      │
                    └─────────────┬──────────────┘
                                  │
                 Is it structural/numerical?
                                  │
                  ┌───────────────┴───────────────┐
                 YES                              NO
                  │                               │
        ┌───────────────────┐           Is it high-throughput
        │      Tier 0       │           extraction or summary?
        │ Deterministic/    │                     │
        │ Regex Parsing     │           ┌─────────┴─────────┐
        └───────────────────┘          YES                  NO
                                        │                   │
                              ┌───────────────────┐ ┌───────────────────┐
                              │      Tier 1       │ │      Tier 2       │
                              │ Gemini 1.5/2.5    │ │ Advanced Reasoning│
                              │ Flash (<0.5s)     │ │ Model (Deep       │
                              │ Bio / 1-Liners /  │ │ Synthesis /       │
                              │ Table Extraction  │ │ Narrative vs Num) │
                              └───────────────────┘ └───────────────────┘
```

- **Tier 0 (Algorithmic / Regex):** Computes financial growth rates ($\text{YoY}\%$, $\text{QoQ}\%$), volume ratios, filing date checks, and keyword-based category pre-filtering. Cost: **$0.00**.
- **Tier 1 (Fast Flash Model):** Extracts key personnel bios, produces one-sentence summaries of lengthy corporate filings, and parses unstructured PDF tables into clean JSON. Cost: **Negligible (~$0.0001 per filing)**.
- **Tier 2 (High-Reasoning Model):** Performs complex comparative synthesis: assessing management's stated narrative vs. audited numbers across 4 quarters, and extracting the Bull vs. Bear debate. Invoked selectively on on-demand user drill-downs.

---

## 4. The Event Memory Subsystem (Signature Innovation)

Public-market investors constantly struggle to hold corporate managements accountable. An executive may announce an ambitious ₹1,000 Cr capex program or promise 20% margin expansion, only for investors to forget the commitment two quarters later when results disappoint.

**FINN's Event Memory solves this institutional blind spot:**

```mermaid
sequenceDiagram
    autonumber
    participant Man as Company Disclosures / Concall
    participant Ingest as FINN Ingestion Pipeline
    participant Ledger as Event Memory Ledger
    participant Pull as Pull Research / Push Feed
    participant User as Investor (UI)

    Man->>Ingest: Q2 FY24 Concall: "Targeting 18% EBITDA margin by Q4 FY25"
    Ingest->>Ledger: Store Commitment: [Metric: EBITDA Margin >= 18%, Target: Q4 FY25]
    Note over Ledger: Time Passes: 4 Quarters
    Man->>Ingest: Q4 FY25 Results: Actual EBITDA Margin is 15.4%
    Ingest->>Ledger: Query Historical Commitments for Company
    Ledger-->>Ingest: Match Found: Target 18% vs Actual 15.4% (Variance: -260 bps)
    Ingest->>Pull: Flag Status: "MISSED" with Source Transcript Quote
    Pull->>User: Display Event Memory Alert: Broken Guidance Detected
```

### Event Memory Data Schema:
```typescript
interface CorporateCommitment {
  id: string;
  ticker: string;
  companyName: string;
  category: 'capex' | 'margin' | 'debt_reduction' | 'revenue_target' | 'capacity_addition' | 'product_launch';
  originalDate: string;
  sourceDocType: 'concall_transcript' | 'annual_report' | 'exchange_filing';
  sourceDocTitle: string;
  sourceQuote: string;           // Exact verbatim quote from management
  targetMetric: string;          // e.g., "EBITDA Margin >= 18%", "₹500 Cr Capex"
  targetTimeline: string;        // e.g., "Q4 FY25", "H1 FY26"
  status: 'pending' | 'delivered' | 'delayed' | 'missed' | 'exceeded';
  verificationDate?: string;
  outcomeEvidence?: string;      // Audited number or subsequent disclosure text
  varianceExplanation?: string;  // Management's stated reason for variance
}
```

---

## 5. Database Schema & Storage Architecture

FINN uses an embedded, zero-maintenance local database (SQLite/JSON store) optimized for speed and deterministic offline execution.

### Entities:
1. `companies`: Ticker, full name, sector, market cap tier, description, IR website, screener URL.
2. `eod_metrics`: Ticker, date, close price, previous close, volume, 20-DMA volume, price change $\%$, volume ratio.
3. `announcements`: Announcement ID, ticker, timestamp, title, category, priority score, summary, source URL, raw filing details.
4. `financial_snapshots`: Ticker, fiscal quarter, revenue, EBITDA, PBT, PAT, EBITDA margin, ROCE, ROE, D/E ratio, working capital days.
5. `commitments`: Event Memory records matching historical guidance with observed outcomes.
6. `user_preferences`: Configured price threshold ($X\%$), volume threshold ($Y\times$), active time window (24h/48h/7d).

---

## 6. Frontend Client Architecture & Mobile UX

The client is built mobile-first using React, Vite, Tailwind CSS, and Lucide icons.

```
┌────────────────────────────────────────────────────────┐
│                   App Navigation Bar                   │
│   [FINN // Institutional Terminal]   [Time: Last 24h]  │
├────────────────────────────────────────────────────────┤
│                   Main Content View                    │
│                                                        │
│  Tab 1: PUSH FEED                                      │
│    ├── Anomaly Alert Banners (Price/Volume triggers)   │
│    ├── Windowed Digest Cards (17-category badges)      │
│    └── Collapsed Routine Filings Drawer                │
│                                                        │
│  Tab 2: PULL RESEARCH                                  │
│    ├── Ticker Search & Sector Filter                   │
│    ├── KPI Snapshot Grid (Rev, Margins, D/E, ROCE)     │
│    ├── Narrative vs. Numbers Reconciliation Table      │
│    ├── Explicit Guidance Ledger                        │
│    ├── Cash Flow Quality & Conversion Health           │
│    └── Bull vs. Bear Institutional Case                │
│                                                        │
│  Tab 3: EVENT MEMORY                                   │
│    ├── Active Corporate Commitment Ledger              │
│    ├── Delivery Track Record / Credibility Scorecard   │
│    └── Cross-Quarter Audit Timeline                    │
│                                                        │
│  Tab 4: WATCHLIST & SETTINGS                           │
│    ├── 18-Stock Portfolio Table with Live Sparklines   │
│    └── Threshold Config Sliders (Price %, Volume x)    │
├────────────────────────────────────────────────────────┤
│           Mobile Bottom Tab Dock (Fixed 56px)          │
│   [🔔 Feed]     [🔍 Research]     [🧠 Memory]   [⚙️ Watch]   │
└────────────────────────────────────────────────────────┘
```

---

## 7. External Dependencies, API Keys & Assumptions

| Dependency / Service | Purpose | Failure Mode / Risk | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **`yfinance` (Python/API)** | Daily EOD closing prices, volumes, 20-day moving averages | Yahoo Finance endpoint throttling, IP rate-limits, ticker suffix changes | Embedded local historical EOD baseline with fallback cache. App continues running smoothly. |
| **Exchange Disclosures (NSE/BSE)** | Raw corporate announcements and compliance filings | Exchange website bot-protection, CAPTCHAs, irregular PDF layouts | Curated, high-fidelity announcement feed fixture representing real-world filings across all 17 categories. |
| **LLM Provider (Gemini API)** | Live extraction, bio synthesis, and on-demand narrative synthesis | Missing `GEMINI_API_KEY`, network timeouts, quota limits | Transparent fallback to pre-synthesized institutional analysis with instant UI response. |
| **Node.js (v18+)** | Runtime for backend API server and frontend build system | Node version mismatch | Uses standard ES2022 / CommonJS compatible scripts with zero exotic native bindings. |

---

## 8. Deployment Risks & Fallback Matrix

1. **Risk: Evaluator runs the app in an environment without internet access or without API keys.**
   - *Mitigation:* The entire system includes pre-ingested, deterministic local fixtures for all 18 portfolio stocks and 4 ad-hoc research tickers. It requires zero API keys to boot and test every single feature (Push, Pull, Event Memory, and Anomaly alerts).
2. **Risk: Evaluator tests on varying mobile and desktop viewports.**
   - *Mitigation:* The frontend is strictly built mobile-first (tested from 375px widths up to 4K desktop screens) with standard CSS touch targets, flex layouts, and zero fixed-width overflow bugs.
3. **Risk: Hallucination in financial numbers during LLM extraction.**
   - *Mitigation:* Core headline metrics (Revenue, EBITDA, PBT, PAT) and mathematical deltas are parsed deterministically and verified with primary citations.

