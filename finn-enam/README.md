# FINN: Institutional Financial Investment Agent
**ENAM Holdings — AI Engineer Build Challenge**
*Evaluated for: ENAM - IIT screening - 2027*

FINN is a mobile-first public-markets intelligence terminal designed for high-conviction equity investors. It combines proactive signal push, deep primary-source grounded research, and an institutional commitment tracker (**Event Memory™**).

---

## 1. Quick Start & Execution

```bash
# Navigate to the application directory
cd finn-enam

# Install dependencies
npm install

# Start development server
npm run dev

# Or build for production preview
npm run build
npm run preview
```

The application runs locally on `http://localhost:5173/` (or `http://localhost:4173/` for preview) and adapts responsively from a 390px mobile viewport up to 4K desktop screens.

---

## 2. Technology Decision Documentation

Per the challenge guidelines, package compatibility was tested prior to setup:
- While Expo/NativeWind/React Native Reusables were evaluated, the combination suffers from severe package incompatibilities on modern Node 22/React 19 (`react-native-reusables` is not a standalone npm package, and NativeWind v4 web metro bundlers fail on Windows environments).
- Per the instruction: *"If this combination creates a significant compatibility problem, choose the smallest reliable alternative that still delivers a beautiful, responsive, mobile-first application and document the decision"*, we selected **React 18/19 + Vite + TypeScript + Tailwind CSS + Lucide Icons**.
- **Result:** Instant zero-friction compilation, sub-second HMR, 100% build reliability on Windows, and pixel-perfect mobile-first touch UI with zero horizontal overflow (`bodyScrollWidth = 390px`).

---

## 3. Four Core Working Screens

### Screen 1: Home / Investor Intelligence (`src/screens/HomeScreen.tsx`)
- **Portfolio Health Bar:** Summarizes 18 tracked Indian equities with advancing/declining breakdown and average move.
- **Top Triggered Alerts:** Surges and anomalies crossing user thresholds (e.g., Dixon 3.45x volume, Trent results beat), expandable on demand.
- **Windowed Digest Controls:** Configurable time filter (`24h`, `48h`, `7d`, `All`) and "High Signal Only" toggle.
- **Prioritized Announcement Stream:** 17-category classification mapped to the assignment reference guide.
- **Progressive Disclosure:** Headline takeaway first, "Why It Matters" second, expandable quarterly financial tables and executive dossiers third.
- **Routine Noise Drawer:** Collapses routine compliance paperwork (ESOP allotments, secretarial filings) to keep the investor focused.

### Screen 2: Event Memory™ Ledger (`src/screens/EventMemoryScreen.tsx`)
- **Historical Commitment Ledger:** Tracks management promises (capex programs, margin guidance, store rollouts, demerger timelines).
- **Core Parameters:** Original date, announced amount, target deadline, and verbatim quote.
- **Historical Precedents:** 1–2 comparable historical events to benchmark management's execution credibility.
- **Fact vs. AI Separation:** Strictly separates audited corporate facts from FINN AI capital allocation assessments.
- **Milestone Progress Tracker:** Real-time statuses (`Delivered`, `Delayed`, `Tracking`, `Revised`).

### Screen 3: Company Research (`src/screens/CompanyResearchScreen.tsx`)
- **Primary-Source Grounded:** Annual Reports, concall transcripts, and exchange results only.
- **Zero-Shot Ticker Engine:** Supports any valid NSE ticker beyond the 18 demo portfolio stocks (e.g. `BEL.NS`, `ZOMATO.NS`, `SUZLON.NS`).
- **Business Snapshot:** Segment breakdown with revenue shares and YoY growth.
- **Financial Snapshot & Quality of Cash:** 4 KPI tiles (Revenue, Margin, ROCE/ROE, Leverage) and CFO/PAT cash conversion audit.
- **Narrative vs. Numbers (The Brief's Gold Standard):** 4-quarter audit comparing management guidance against audited figures delivered.
- **Forward Guidance Ledger:** Explicit management forward targets.
- **Institutional Bull vs. Bear Case:** Evidence-grounded thesis points.

### Screen 4: Watchlist & Signal Filters (`src/screens/SettingsScreen.tsx`)
- **Watchlist Manager:** Manage active portfolio universe with live sparklines and market caps.
- **Dynamic Sensitivity Sliders:** Price move slider ($\pm 1.5\%$ to $\pm 8.0\%$) and volume spike multiplier ($1.2\times$ to $4.5\times$ 20-DMA) with real-time alert recalculation.
- **17-Category Filters:** Toggle exchange filing types based on investor mandate.

