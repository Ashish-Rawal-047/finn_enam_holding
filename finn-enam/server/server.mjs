/**
 * FINN REST API Server
 * Complete Backend Connection & Database Integration
 * ENAM AI Engineer Build Challenge
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initDb,
  getDbHealth,
  getCompanies,
  searchCompanies,
  toggleWatchlist,
  setWatchlist,
  getAlerts,
  evaluateAnomalies,
  getAlertPreferences,
  updateAlertPreferences,
  getEventMemories,
  getEventMemoryHistory,
  addEventObservation,
  getResearch,
  queryDocumentChunks,
  saveResearchRun
} from './db.mjs';
import { getAiStatus, answerResearchQuery } from './ai.mjs';
import { EOD_BASELINE_DATE, DEMO_DATA_DISCLAIMER } from './data.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (res.statusCode >= 400) {
        console.warn(`[API] ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
      }
    });
  }
  next();
});

// ============================================================================
// 1. HEALTH & SYSTEM PROVENANCE
// ============================================================================
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await getDbHealth();
    const aiStatus = getAiStatus();

    res.json({
      status: 'ok',
      agent: 'FINN (Financial Investment Agent)',
      version: '1.0.0',
      database: dbHealth,
      ai: aiStatus,
      marketData: {
        eodBaselineDate: EOD_BASELINE_DATE,
        liveProvider: 'Yahoo Finance (NSE)',
        status: 'active'
      },
      primaryGrounding: true,
      disclaimer: DEMO_DATA_DISCLAIMER,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// AI Status endpoint
app.get('/api/ai/status', (req, res) => {
  res.json(getAiStatus());
});

// ============================================================================
// 2. COMPANIES & WATCHLIST UNIVERSE
// ============================================================================

// Portfolio universe with summary statistics
app.get('/api/portfolio', async (req, res) => {
  try {
    const watchlistOnly = req.query.watchlistOnly === 'true';
    const sessionId = req.query.sessionId || 'default_session';
    const data = await getCompanies({ watchlistOnly, sessionId });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Company Search (ticker, name, sector)
app.get('/api/companies/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    const sessionId = req.query.sessionId || 'default_session';
    const results = await searchCompanies(q, sessionId);
    res.json({
      query: q,
      count: results.length,
      results
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Watchlist status for a ticker (REST path param)
app.post('/api/portfolio/:ticker/watchlist', async (req, res) => {
  try {
    const { ticker } = req.params;
    const sessionId = req.body?.sessionId || req.query.sessionId || 'default_session';
    const result = await toggleWatchlist(ticker, sessionId);
    if (!result) {
      return res.status(404).json({ error: `Company with ticker ${ticker} not found` });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Watchlist entries
app.get('/api/watchlist', async (req, res) => {
  try {
    const sessionId = req.query.sessionId || 'default_session';
    const data = await getCompanies({ watchlistOnly: true, sessionId });
    res.json({
      total: data.total,
      companies: data.companies
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add company to watchlist
app.post('/api/watchlist', async (req, res) => {
  try {
    const { ticker, sessionId = 'default_session' } = req.body;
    if (!ticker) {
      return res.status(400).json({ error: 'Ticker is required' });
    }
    const result = await setWatchlist(ticker, true, sessionId);
    if (!result) {
      return res.status(404).json({ error: `Company with ticker ${ticker} not found` });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove company from watchlist
app.delete('/api/watchlist/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const sessionId = req.body?.sessionId || req.query.sessionId || 'default_session';
    const result = await setWatchlist(ticker, false, sessionId);
    if (!result) {
      return res.status(404).json({ error: `Company with ticker ${ticker} not found` });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 3. PUSH SIGNALS & ANOMALY ALERTS
// ============================================================================

// Alerts / Signals endpoint (supports both /api/signals and /api/alerts)
const handleAlerts = async (req, res) => {
  try {
    const { window: timeWindow, category, severity, triggerType } = req.query;
    const items = await getAlerts({ window: timeWindow, category, severity, triggerType });
    res.json({
      total: items.length,
      items,
      alerts: items
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

app.get('/api/signals', handleAlerts);
app.get('/api/alerts', handleAlerts);

// Dynamic Anomaly Evaluator (Deterministic formula: ABS(priceMove) >= threshold or volRatio >= threshold)
app.post('/api/alerts/evaluate', async (req, res) => {
  try {
    const priceThreshold = parseFloat(req.body.priceThreshold || 3.0);
    const volumeThreshold = parseFloat(req.body.volumeThreshold || 2.0);
    const evaluation = await evaluateAnomalies(priceThreshold, volumeThreshold);
    res.json(evaluation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alert Preferences / Sensitivity Settings
app.get('/api/settings/alerts', async (req, res) => {
  try {
    const sessionId = req.query.sessionId || 'default_session';
    const prefs = await getAlertPreferences(sessionId);
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const handleUpdateAlertSettings = async (req, res) => {
  try {
    const sessionId = req.body.sessionId || req.query.sessionId || 'default_session';
    const updated = await updateAlertPreferences(sessionId, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

app.put('/api/settings/alerts', handleUpdateAlertSettings);
app.post('/api/settings/alerts', handleUpdateAlertSettings);

// ============================================================================
// 4. EVENT MEMORY LEDGER
// ============================================================================

// List Event Memory commitments
const handleEventMemories = async (req, res) => {
  try {
    const { status, category, ticker } = req.query;
    const items = await getEventMemories({ status, category, ticker });
    res.json({
      total: items.length,
      items
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

app.get('/api/memory', handleEventMemories);
app.get('/api/events', handleEventMemories);

// Single commitment by ID
app.get('/api/memory/:id', async (req, res) => {
  try {
    const items = await getEventMemories();
    const item = items.find((m) => m.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: `Event Memory commitment ${req.params.id} not found` });
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Event commitment for a specific ticker
app.get('/api/events/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const sym = ticker.toUpperCase();
    const items = await getEventMemories({ ticker: sym });
    if (items.length === 0) {
      return res.status(404).json({ error: `No Event Memory commitment tracked for ${sym}` });
    }
    res.json(items[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Event history with full chronological observation chain
app.get('/api/events/:ticker/history', async (req, res) => {
  try {
    const { ticker } = req.params;
    const history = await getEventMemoryHistory(ticker);
    if (!history) {
      return res.status(404).json({ error: `No Event Memory commitment history tracked for ${ticker}` });
    }
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add subsequent observation to an event memory
app.post('/api/events/observations', async (req, res) => {
  try {
    const { eventMemoryId, observationDate, observationType, reportedUpdate, reportedValue, evidenceExcerpt, newStatus } = req.body;
    if (!eventMemoryId) {
      return res.status(400).json({ error: 'eventMemoryId is required' });
    }
    const result = await addEventObservation({
      eventMemoryId,
      observationDate,
      observationType,
      reportedUpdate,
      reportedValue,
      evidenceExcerpt,
      newStatus
    });
    if (!result) {
      return res.status(404).json({ error: `Event Memory commitment ${eventMemoryId} not found` });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 5. PRIMARY-SOURCE RESEARCH DOSSIER & AI Q&A
// ============================================================================

// 8-Domain Institutional Research Dossier
app.get('/api/research/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const dossier = await getResearch(ticker);
    res.json(dossier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Grounded Primary-Source Q&A
app.post('/api/research/query', async (req, res) => {
  try {
    const { ticker, query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const sym = (ticker || 'TRENT.NS').toUpperCase();
    const contextChunks = await queryDocumentChunks(sym, query);
    const researchDossier = await getResearch(sym);

    // Call AI intelligence engine (Gemini with grounded fallback)
    const result = await answerResearchQuery({
      ticker: sym,
      query,
      contextChunks,
      researchDossier
    });

    // Save research run audit log
    await saveResearchRun({
      ticker: sym,
      query,
      finding: result.finding,
      citation: result.citation,
      grounded: result.grounded,
      confidence: result.confidence
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 6. LIVE / FALLBACK MARKET QUOTE FETCHER
// ============================================================================
app.get('/api/market/quote/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const sym = ticker.toUpperCase();

  // 1. Try Yahoo Finance live fetch with 2s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
    const response = await fetch(yfUrl, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta && meta.regularMarketPrice) {
        return res.json({
          ticker: sym,
          source: 'Yahoo Finance Live',
          price: meta.regularMarketPrice,
          previousClose: meta.chartPreviousClose,
          changePercent: meta.chartPreviousClose ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100 : 0,
          timestamp: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    // Fall back smoothly to cached baseline
  }

  // 2. Baseline fallback from database
  try {
    const companiesData = await getCompanies();
    const comp = companiesData.companies.find((c) => c.ticker === sym);
    if (comp) {
      return res.json({
        ticker: sym,
        source: 'Deterministic EOD Baseline',
        price: comp.currentPrice,
        changePercent: comp.changePercent,
        volumeRatio: comp.volumeRatio,
        timestamp: EOD_BASELINE_DATE
      });
    }
  } catch (err) {
    // Continue to 404
  }

  res.status(404).json({ error: `Ticker ${sym} not found in database or live exchange feed` });
});

// ============================================================================
// 7. SERVE STATIC ASSETS IN PRODUCTION
// ============================================================================
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// ============================================================================
// 8. SERVER INITIALIZATION
// ============================================================================
async function startServer() {
  // Initialize Database connection / migrations
  await initDb();

  app.listen(PORT, () => {
    console.log(`[FINN API] REST Server successfully listening on port ${PORT}`);
    console.log(`[FINN API] Health check endpoint: http://localhost:${PORT}/api/health`);
    console.log(`[FINN API] EOD Baseline Date: ${EOD_BASELINE_DATE}`);
  });
}

startServer().catch((err) => {
  console.error('[FINN API] Fatal error starting server:', err);
  process.exit(1);
});
