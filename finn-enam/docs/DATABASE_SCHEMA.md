# FINN PostgreSQL Database Schema
**Target Engine:** Neon Hosted PostgreSQL (v15 / v16)
**Driver:** `pg` (node-postgres) with Connection Pooling & SSL (`rejectUnauthorized: false`)

---

## 1. Schema Diagram

```
┌─────────────────┐       ┌──────────────────────┐
│    companies    │◄──────┤  watchlist_entries   │
└────────┬────────┘       └──────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       ┌──────────────────────┐
│source_documents │◄──────┤   document_chunks    │
└────────┬────────┘       └──────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐ 1:N   ┌──────────────────────┐
│ event_memories  ├──────►│  event_observations  │
└────────┬────────┘       └──────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       ┌──────────────────────┐
│     alerts      │       │  alert_preferences   │
└─────────────────┘       └──────────────────────┘
         ▲
         │ 1:N
┌─────────────────┐
│  research_runs  │
└─────────────────┘
```

---

## 2. Table Specifications

### 1. `companies`
Stores the universe of Indian listed equities (NSE/BSE).
```sql
CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(64) PRIMARY KEY,
    ticker VARCHAR(32) NOT NULL,
    bse_code VARCHAR(16),
    name VARCHAR(255) NOT NULL,
    exchange VARCHAR(16) NOT NULL DEFAULT 'NSE',
    sector VARCHAR(128) NOT NULL,
    market_cap_category VARCHAR(32) NOT NULL, -- 'Large Cap', 'Mid Cap', 'Small Cap'
    current_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    change_percent NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    volume_ratio NUMERIC(8, 2) NOT NULL DEFAULT 1.00,
    sparkline JSONB DEFAULT '[]'::jsonb,
    screener_url TEXT,
    ir_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_companies_exchange_ticker UNIQUE (exchange, ticker)
);
CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies(sector);
```

### 2. `watchlist_entries`
Tracks which equities are actively monitored by user / session.
```sql
CREATE TABLE IF NOT EXISTS watchlist_entries (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    session_id VARCHAR(64) NOT NULL DEFAULT 'default_session',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_watchlist_company_session UNIQUE (company_id, session_id)
);
CREATE INDEX IF NOT EXISTS idx_watchlist_session ON watchlist_entries(session_id);
```

### 3. `source_documents`
Catalogs official primary statutory filings (Annual Reports, Concalls, Regulation 30/33 disclosures).
```sql
CREATE TABLE IF NOT EXISTS source_documents (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(512) NOT NULL,
    document_type VARCHAR(64) NOT NULL, -- 'annual_report', 'quarterly_results', 'concall_transcript', 'investor_presentation', 'announcement'
    source_url TEXT NOT NULL,
    publication_date DATE NOT NULL,
    reporting_period VARCHAR(32), -- 'FY24', 'Q1 FY25', 'Q2 FY25'
    page_count INTEGER,
    extraction_status VARCHAR(32) NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'failed'
    extracted_text TEXT,
    source_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_source_doc_url UNIQUE (source_url)
);
CREATE INDEX IF NOT EXISTS idx_source_docs_company ON source_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_source_docs_period ON source_documents(reporting_period);
```

### 4. `event_memories`
Stores the original corporate commitment extracted verbatim from concall or filing.
```sql
CREATE TABLE IF NOT EXISTS event_memories (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    source_document_id VARCHAR(64) REFERENCES source_documents(id) ON DELETE SET NULL,
    event_type VARCHAR(32) NOT NULL, -- 'capex', 'margin', 'capacity', 'revenue', 'debt'
    commitment_title VARCHAR(255) NOT NULL,
    original_statement TEXT NOT NULL,
    announcement_date DATE NOT NULL,
    disclosed_amount NUMERIC(16, 2), -- in ₹ Crores (nullable)
    disclosed_target TEXT, -- e.g. "200 net new stores"
    expected_milestone VARCHAR(128), -- e.g. "March 2025"
    expected_date DATE,
    evidence_excerpt TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'delivered', 'delayed', 'revised', 'unverified'
    status_confidence NUMERIC(4, 2) DEFAULT 0.95,
    facts_summary TEXT,
    ai_interpretation TEXT,
    historical_comps JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_memories_company ON event_memories(company_id);
CREATE INDEX IF NOT EXISTS idx_event_memories_status ON event_memories(status);
```

### 5. `event_observations`
Chronological evidence chain recording subsequent disclosures without erasing earlier observations.
```sql
CREATE TABLE IF NOT EXISTS event_observations (
    id VARCHAR(64) PRIMARY KEY,
    event_memory_id VARCHAR(64) NOT NULL REFERENCES event_memories(id) ON DELETE CASCADE,
    source_document_id VARCHAR(64) REFERENCES source_documents(id) ON DELETE SET NULL,
    observation_date DATE NOT NULL,
    observation_type VARCHAR(64) NOT NULL, -- 'quarterly_results', 'exchange_filing', 'concall_update'
    reported_update TEXT NOT NULL,
    reported_value TEXT,
    evidence_excerpt TEXT,
    previous_status VARCHAR(32),
    new_status VARCHAR(32) NOT NULL,
    status_delta VARCHAR(16) DEFAULT 'positive', -- 'positive', 'neutral', 'negative'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_obs_memory ON event_observations(event_memory_id);
CREATE INDEX IF NOT EXISTS idx_event_obs_date ON event_observations(observation_date);
```

### 6. `alerts`
Stores prioritized regulatory disclosures, price jumps, and volume anomalies.
```sql
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    source_document_id VARCHAR(64) REFERENCES source_documents(id) ON DELETE SET NULL,
    event_memory_id VARCHAR(64) REFERENCES event_memories(id) ON DELETE SET NULL,
    category VARCHAR(64) NOT NULL, -- 17 ENAM categories
    severity VARCHAR(32) NOT NULL, -- 'critical', 'high', 'normal', 'routine'
    headline VARCHAR(512) NOT NULL,
    explanation TEXT NOT NULL,
    trigger_type VARCHAR(64) NOT NULL, -- 'price_move', 'volume_spike', 'material_filing', 'guidance_miss'
    trigger_value VARCHAR(64), -- e.g. "+6.40% | 3.45x Vol"
    time_horizon VARCHAR(16) DEFAULT '24h', -- '24h', '48h', '7d'
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_routine BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_company ON alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(event_timestamp);
```

### 7. `alert_preferences`
Stores user/session anomaly sensitivity sliders.
```sql
CREATE TABLE IF NOT EXISTS alert_preferences (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL DEFAULT 'default_session',
    price_change_threshold NUMERIC(4, 2) NOT NULL DEFAULT 3.00,
    volume_threshold NUMERIC(4, 2) NOT NULL DEFAULT 2.00,
    volume_reference_days INTEGER NOT NULL DEFAULT 20,
    digest_window VARCHAR(16) NOT NULL DEFAULT '24h',
    min_severity VARCHAR(32) NOT NULL DEFAULT 'all',
    selected_categories JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_preferences_session UNIQUE (session_id)
);
```

### 8. `document_chunks`
Stores text segments from primary filings for full-text search and grounded extraction.
```sql
CREATE TABLE IF NOT EXISTS document_chunks (
    id VARCHAR(64) PRIMARY KEY,
    source_document_id VARCHAR(64) NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    page_number INTEGER,
    section_heading VARCHAR(255),
    text_content TEXT NOT NULL,
    tsv_content TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', text_content)) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chunks_tsv ON document_chunks USING GIN(tsv_content);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(source_document_id);
```

### 9. `research_runs`
Audit log of on-demand research queries and findings.
```sql
CREATE TABLE IF NOT EXISTS research_runs (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) REFERENCES companies(id) ON DELETE SET NULL,
    ticker VARCHAR(32) NOT NULL,
    query_text TEXT NOT NULL,
    finding TEXT NOT NULL,
    citation TEXT NOT NULL,
    grounded BOOLEAN NOT NULL DEFAULT TRUE,
    confidence NUMERIC(4, 2) DEFAULT 0.95,
    status VARCHAR(32) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_research_runs_ticker ON research_runs(ticker);
```
