# FINN: Requirements Specification & Scope Definition
**ENAM Holdings — AI Engineer Build Challenge**
*Document Version: 1.0.0 | Evaluation Date: October 29 – November 1, 2026*

---

## 1. Executive Summary & Problem Mandate

Modern public-markets investors at high-conviction investment firms (such as ENAM Holdings) face an overwhelming barrage of corporate disclosures, quarterly filings, regulatory circulars, earnings call transcripts, and market movements. In a lean investment team, the competitive advantage lies not in aggregating more data, but in **filtering noise, extracting actionable signals, and holding company managements accountable over multi-year horizons**.

**FINN (Financial Investment Agent)** is a mobile-first, dual-mode intelligence companion designed to integrate seamlessly into a professional equity investor's daily workflow:
1. **PUSH Mode:** Proactively alerts the investor to material changes (price/volume anomalies, executive shifts, quarterly results breakdowns) while filtering out low-signal exchange filings.
2. **PULL Mode:** Enables deep, on-demand fundamental research grounded strictly in primary disclosures (Annual Reports, quarterly releases, and concall transcripts) without relying on noisy secondary commentary.
3. **EVENT MEMORY (Signature Innovation):** An institutional commitment tracker that records executive guidance and corporate promises made in past disclosures, continuously matching subsequent quarterly results and transcripts against historical commitments.

---

## 2. Requirement Taxonomy & Classification Key

To provide complete transparency during evaluation, every requirement in this specification is tagged with its official status:

- `[MANDATORY - BRIEF]`: Explicit, non-negotiable deliverable or behavior outlined in *ENAM_AI_Engineer_Build_Challenge_Main.pdf*.
- `[OPTIONAL / MENU - BRIEF]`: Capabilities presented in the brief as a recommended menu or illustrative guidance to demonstrate product judgment.
- `[PROPOSED ENHANCEMENT - FINN]`: Proprietary architectural features and workflow improvements introduced by our engineering design to maximize investor alpha and operational efficiency.

---

## 3. Comprehensive Requirements Matrix

### 3.1 Push Mode: Proactive Intelligence

| Req ID | Requirement Description | Category | Classification | Verification Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-PUSH-01** | **Windowed Corporate Filing Digest**<br>Display corporate filings and exchange announcements across the user's portfolio. Provide a configurable time window (default: last 24 hours; options for 48h, 7d, or custom date range). | Push Digest | `[MANDATORY - BRIEF]` | User can toggle time windows; announcements within the selected window are surfaced instantly with priority sorting. |
| **REQ-PUSH-02** | **Signal-to-Noise Prioritization**<br>Categorize announcements using the 17 exchange announcement classes defined in the companion reference. Material filings (Results, M&A, Management Change, Capex, Litigation) must be surfaced to the top; routine filings (`unclassified`, compliance forms) must be collapsed or muted. | Filtering Engine | `[MANDATORY - BRIEF]` | Feed displays high-impact items with visual emphasis. Routine filings are collapsed under an expandable drawer with zero clutter. |
| **REQ-PUSH-03** | **Triggered Price & Volume Anomaly Alerts**<br>Flag unusual end-of-day market movements for portfolio stocks: price moves beyond $\pm X\%$ in a session, or traded volume surpassing $Y\times$ its recent 20-day moving average. | Alert System | `[MANDATORY - BRIEF]` | Alerts trigger accurately when thresholds are breached. Thresholds ($X\%$ and $Y\times$) are user-configurable. |
| **REQ-PUSH-04** | **Enriched Management Change Presentation**<br>When a C-suite or board-level change occurs (CEO, CFO, MD, Director), synthesize an executive dossier containing the incoming/outgoing individual's background, past appointments, and tenure. | Presentation Judgment | `[MANDATORY - BRIEF]` | Clicking a management change announcement displays an executive bio card detailing pedigree and past employers. |
| **REQ-PUSH-05** | **Quarterly Results Headline Decomposition**<br>Extract and calculate headline metrics directly from quarterly financial filings: **Revenue**, **EBITDA**, **PBT**, and **PAT**, complete with Quarter-on-Quarter (QoQ) and Year-on-Year (YoY) percentage variations. | Presentation Judgment | `[MANDATORY - BRIEF]` | Clean tabular/card layout displaying Revenue, EBITDA, PBT, PAT with automated YoY/QoQ growth calculations and margin changes. |
| **REQ-PUSH-06** | **High-Impact 1-Line Synthesis for Secondary Filings**<br>For other announcement categories (e.g., Capex, M&A, Credit Rating, Litigation), generate an objective, one-sentence executive summary eliminating boilerplate legal terminology. | Presentation Judgment | `[MANDATORY - BRIEF]` | Each non-routine filing card features a crisp, one-line impact takeaway before the raw filing link. |
| **REQ-PUSH-07** | **Interactive Alert Threshold Management**<br>Allow users to customize sensitivity thresholds for price shifts ($\pm 2\%$ to $\pm 10\%$) and volume spikes ($1.5\times$ to $5\times$) via an intuitive settings bottom-sheet. | User Configuration | `[PROPOSED ENHANCEMENT - FINN]` | Slider/picker allows immediate recalculation and dynamic filtering of anomaly alerts in the UI. |

---

### 3.2 Pull Mode: Primary-Source Fundamental Research

| Req ID | Requirement Description | Category | Classification | Verification Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-PULL-01** | **Strict Primary Data Grounding**<br>Analysis must be strictly grounded in primary corporate documents: Annual Reports (AR), quarterly exchange filings, investor presentations, and earnings conference call transcripts. No broker notes, secondary news, or unverified LLM pre-training memory allowed. | Compliance & Rigor | `[MANDATORY - BRIEF]` | All extracted claims, financial tables, and commentary display direct citations or references to specific primary disclosures. |
| **REQ-PULL-02** | **Generalizable Research Pipeline**<br>The underlying ingestion and analysis architecture must not be hard-wired to static demo tickers. The system must accept any arbitrary NSE/BSE symbol and fetch/synthesize available data. | System Generalization | `[MANDATORY - BRIEF]` | Searching an ad-hoc ticker (e.g., `POLYCAB.NS` or `TRENT.NS`) executes live or on-demand primary extraction. |
| **REQ-PULL-03** | **Narrative vs. Numbers Synthesis**<br>Compare historical management commentary and guidance against actual audited financial delivery over consecutive quarters (promises vs. delivered realities). | Financial Analysis | `[OPTIONAL / MENU - BRIEF]` *(Selected Core)* | Interactive card detailing: *Target guided*, *Actual delivered*, *Variance*, and *Management attribution*. |
| **REQ-PULL-04** | **Business Snapshot & Segment Breakdown**<br>Summarize corporate operations, key operational business segments, and revenue mix distribution. | Financial Analysis | `[OPTIONAL / MENU - BRIEF]` *(Selected Core)* | Segment breakdown visual card showing revenue contribution percentages and business model drivers. |
| **REQ-PULL-05** | **Financial Snapshot & Valuation Ratios**<br>Display current headline metrics: revenue run-rate, operating EBITDA margin, PAT, Debt-to-Equity (D/E), ROCE, and ROE at a glance. | Financial Analysis | `[OPTIONAL / MENU - BRIEF]` *(Selected Core)* | Dense, scannable KPI tile grid formatted cleanly for mobile screens. |
| **REQ-PULL-06** | **Cash Flow Quality & Conversion Analysis**<br>Analyze operating cash flow (CFO) vs. net profit (PAT), Free Cash Flow (FCF) generation, and working capital cycle expansion/contraction to detect accounting red flags. | Financial Analysis | `[OPTIONAL / MENU - BRIEF]` *(Selected Core)* | Cash conversion ratio ($CFO / PAT$) trend and working capital commentary surfaced cleanly. |
| **REQ-PULL-07** | **Explicit Management Guidance Ledger**<br>Extract forward-looking management expectations regarding revenue growth, margin corridors, capital expenditure (capex), and capacity addition timelines. | Financial Analysis | `[OPTIONAL / MENU - BRIEF]` *(Selected Core)* | Structured bullet points citing the specific concall transcript where guidance was uttered. |
| **REQ-PULL-08** | **Bull vs. Bear Debate Synthesis**<br>Provide a balanced, objective thesis outlining key upside drivers versus fundamental risk factors, grounded in balance sheet resilience and market risks. | Financial Analysis | `[OPTIONAL / MENU - BRIEF]` *(Selected Core)* | Dual-column or swipeable mobile cards contrasting the core institutional Bull and Bear arguments. |

---

### 3.3 Signature Feature: Event Memory Engine

| Req ID | Requirement Description | Category | Classification | Verification Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-MEM-01** | **Historical Corporate Commitment Extraction**<br>Extract forward-looking corporate commitments from historical announcements and concall transcripts (e.g., Capex budgets, commissioning deadlines, debt reduction targets, demergers). | Event Memory | `[PROPOSED ENHANCEMENT - FINN]` | Commitments are stored in a structured ledger with *Timestamp*, *Category*, *Target Metric/Date*, and *Source Citation*. |
| **REQ-MEM-02** | **Commitment-to-Outcome Cross-Referencing**<br>When a new quarterly filing, press release, or concall transcript is processed, automatically query the commitment ledger to assess whether past targets were fulfilled, delayed, revised, or abandoned. | Event Memory | `[PROPOSED ENHANCEMENT - FINN]` | New announcements display an "Event Memory Match" tag linking directly to the historical commitment made quarters prior. |
| **REQ-MEM-03** | **Management Credibility Index & Audit Trail**<br>Present an accountability score or delivery track record showing the proportion of past commitments delivered on time versus missed. | Event Memory | `[PROPOSED ENHANCEMENT - FINN]` | Visual timeline tracking commitments from declaration $\rightarrow$ mid-term update $\rightarrow$ final delivery verification. |

---

### 3.4 Universe & Coverage Requirements

| Req ID | Requirement Description | Category | Classification | Verification Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-DATA-01** | **Mock Portfolio Coverage (15–20 Tickers)**<br>Curate a balanced mock portfolio spanning diverse market caps (large, mid, small) and sectors (IT, BFSI, Capital Goods, Pharma, Auto, Consumption, Energy) with pre-cached disclosures and price histories. | Data Universe | `[MANDATORY - BRIEF]` | System contains at least 15 active Indian listed companies with pre-processed announcement feeds, EOD series, and fundamentals. |
| **REQ-DATA-02** | **Ad-Hoc Research Universe (3–5 Out-of-Portfolio Tickers)**<br>Provide 3–5 representative non-portfolio stocks to demonstrate instant on-demand analysis capabilities. | Data Universe | `[MANDATORY - BRIEF]` | Selecting an ad-hoc ticker launches the full Pull research view with equal fidelity. |
| **REQ-DATA-03** | **End-of-Day Price & Volume Data Feed**<br>Ingest daily closing prices, volume, and rolling 20-day averages using reliable public market endpoints (e.g., `yfinance` `.NS`/`.BO` format). | Data Ingestion | `[MANDATORY - BRIEF]` | Calculations for $\Delta\%$ and volume ratios are mathematically accurate against historical market closes. |
| **REQ-DATA-04** | **Exchange Announcements Integration**<br>Classify exchange filings across the mock portfolio into the 17 standard categories defined in the companion guide. | Data Ingestion | `[MANDATORY - BRIEF]` | Disclosures contain timestamp, company name, category tag, original filing URL, and synthesized summary. |

---

### 3.5 Frontend, UX & Interaction Design

| Req ID | Requirement Description | Category | Classification | Verification Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-UI-01** | **Mobile-First Responsive Interface**<br>Flawless usability on mobile viewports (375px–430px) and seamless scaling to desktop displays. Touch-friendly navigation, bottom-docked tabs, and thumb-friendly tap targets ($\ge 44\text{px}$). | UI/UX | `[MANDATORY - BRIEF]` | Tested on standard mobile dimensions; zero horizontal overflow, intuitive gesture-driven sheets. |
| **REQ-UI-02** | **Institutional Aesthetic ("No AI Slop")**<br>Dark-mode native, high information density, sleek typography, clean contrast ratios, and financial terminal elegance (inspired by Bloomberg/Koyfin/Linear). No generic AI conversational fluff. | UI/UX | `[MANDATORY - BRIEF]` | Clean typography, tabular density, color-coded deltas (green/red/amber), zero generic chatbot verbosity. |
| **REQ-UI-03** | **Hybrid Interaction Model**<br>Provide dual modes of exploration: (1) structured dashboard views with instant filter toggles, and (2) an embedded contextual query assistant (copilot sheet) for targeted questions on primary documents. | Interaction Model | `[MANDATORY - BRIEF]` | User can navigate through visual cards or invoke on-demand answers citing source documents. |
| **REQ-UI-04** | **Offline/Low-Connectivity Resilience**<br>Pre-cache portfolio fundamentals and announcement feeds so the mobile application remains snappy and responsive even under cellular network fluctuations. | UI/UX | `[PROPOSED ENHANCEMENT - FINN]` | Immediate UI render using local cache; background sync refreshes telemetry without freezing views. |

---

### 3.6 Architecture, Efficiency & Cost Optimization

| Req ID | Requirement Description | Category | Classification | Verification Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-ARCH-01** | **Smart Tiered Model Routing**<br>Route tasks intelligently: rule/regex heuristics for initial classification $\rightarrow$ fast/low-cost LLM (e.g., Gemini 1.5/2.5 Flash) for extraction and summarization $\rightarrow$ high-reasoning tier only for complex multi-quarter synthesis. | AI Architecture | `[MANDATORY - BRIEF]` | Benchmark cost per company research kept minimal; token caching implemented for primary document chunks. |
| **REQ-ARCH-02** | **Document Chunking & Vector/Lexical Grounding**<br>Process multi-hundred-page Annual Reports and concall transcripts with targeted chunking, metadata tagging (fiscal year, quarter, section), and semantic/hybrid retrieval. | AI Architecture | `[MANDATORY - BRIEF]` | Ingested documents return exact page/transcript paragraph citations for generated answers. |
| **REQ-ARCH-03** | **Deterministic Fallback Pipeline**<br>Ensure zero demo failure risk by embedding deterministic mock fixtures and local JSON datasets for all 15–20 portfolio companies and 3–5 ad-hoc tickers, with live APIs enabled when keys are present. | Reliability | `[PROPOSED ENHANCEMENT - FINN]` | Application boots and runs 100% reliably out-of-the-box in offline/disconnected environments. |

---

## 4. Deliverable & Submission Alignment

Per the assignment brief, evaluation is strictly focused on building ability, product instinct, judgment, and architecture:

1. **Working Prototype:** Fully runnable mobile-first web app deployed or locally servable with zero setup friction.
2. **GitHub Repository:** Clean commit history, structured directory hierarchy, and complete technical documentation.
3. **AI Build History:** Transparent log of coding agent invocations, prompt iterations, and design trade-offs.
4. **Covering Note:** Concise executive synthesis addressed to `assessment@enam.com` with subject: `ENAM - IIT screening - 2027`.

---

## 5. Scope Triage: First-Pass Priority vs. Contingency Cuts

To ensure delivery ahead of the **Sunday, November 1, 2026** deadline:

### Must-Have (Phase 1 & 2 — Milestone Target)
- [x] Full mobile-first layout with bottom navigation (Push Feed, Company Research, Event Memory, Portfolio Watchlist).
- [x] Push digest with 24h/48h/7d windowing and 17-category exchange announcement classification.
- [x] Triggered price ($\pm X\%$) and volume ($>Y\times$) anomaly alert engine with configurable sliders.
- [x] Presentation judgment cards: Management change with background bio, Quarterly results with Revenue/EBITDA/PBT/PAT YoY & QoQ tables.
- [x] Pull company deep-dive: Business snapshot, Financial snapshot, Narrative vs. Numbers, Guidance, Bull/Bear thesis.
- [x] Event Memory engine: Working commitment tracker matching historical guidance to actual earnings delivery.
- [x] Curated 18-company mock portfolio + 4 out-of-portfolio research companies with realistic, high-fidelity data.

### Should-Have (Phase 3)
- [ ] Live ticker lookup with simulated or live ingestion pipeline for arbitrary NSE tickers.
- [ ] Exportable executive one-pager summary for portfolio risk meetings.
- [ ] Custom alert bookmarking and note-taking.

### Deliberately Left Out (Scope Boundary)
- *Real-time intraday tick-by-tick streaming:* EOD data and batch filings satisfy real investor workflows without unnecessary infra overhead.
- *Native iOS/Android App Store compilation:* Responsive mobile web (PWA-ready) gives instant multi-device testing with zero install friction.
- *Broader broker/news sentiment scrapers:* Strictly avoided per the explicit brief requirement: primary data only.

