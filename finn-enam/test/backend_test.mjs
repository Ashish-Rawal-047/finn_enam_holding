/**
 * FINN Backend Integration & API Contract Test Suite
 * ENAM AI Engineer Build Challenge
 */

const BASE_URL = 'http://localhost:3001/api';

async function runTests() {
  console.log('====================================================');
  console.log('   FINN BACKEND & DATABASE INTEGRATION TEST SUITE   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health & Provenance
    console.log('Test 1: Health Check (/api/health)');
    const healthRes = await fetch(`${BASE_URL}/health`);
    assert(healthRes.status === 200, 'Health endpoint returns HTTP 200');
    const health = await healthRes.json();
    assert(health.status === 'ok', 'Status is "ok"');
    assert(health.database && typeof health.database.connected === 'boolean', 'Database status reported');
    assert(health.ai && typeof health.ai.configured === 'boolean', 'AI status reported');
    assert(health.marketData && health.marketData.eodBaselineDate === '2026-10-28', 'EOD baseline date matches 2026-10-28');

    // 2. Portfolio Universe
    console.log('\nTest 2: Portfolio Universe (/api/portfolio)');
    const portRes = await fetch(`${BASE_URL}/portfolio`);
    assert(portRes.status === 200, 'Portfolio endpoint returns HTTP 200');
    const portfolio = await portRes.json();
    assert(portfolio.total >= 18, `Portfolio total companies >= 18 (got ${portfolio.total})`);
    assert(Array.isArray(portfolio.companies), 'Companies list is an array');
    const trent = portfolio.companies.find((c) => c.ticker === 'TRENT.NS');
    assert(Boolean(trent), 'TRENT.NS is present in portfolio universe');
    assert(typeof trent.currentPrice === 'number' && trent.currentPrice > 0, 'Current price is numeric');
    assert(typeof trent.changePercent === 'number', 'Change percent is numeric');
    assert(typeof trent.volumeRatio === 'number', 'Volume ratio is numeric');
    assert(Array.isArray(trent.sparkline) && trent.sparkline.length > 0, 'Sparkline array present');

    // 3. Company Search
    console.log('\nTest 3: Company Search (/api/companies/search?q=trent)');
    const searchRes = await fetch(`${BASE_URL}/companies/search?q=trent`);
    assert(searchRes.status === 200, 'Search endpoint returns HTTP 200');
    const searchData = await searchRes.json();
    assert(searchData.count > 0, `Search returns results for "trent" (got ${searchData.count})`);
    assert(searchData.results[0].ticker === 'TRENT.NS', 'First search result is TRENT.NS');

    // 4. Watchlist Toggle
    console.log('\nTest 4: Watchlist Toggle (/api/portfolio/:ticker/watchlist)');
    const initialWatchlist = trent.inWatchlist;
    const toggleRes = await fetch(`${BASE_URL}/portfolio/TRENT.NS/watchlist`, { method: 'POST' });
    assert(toggleRes.status === 200, 'Toggle watchlist returns HTTP 200');
    const toggleData = await toggleRes.json();
    assert(toggleData.inWatchlist === !initialWatchlist, 'inWatchlist status inverted');
    // Restore
    await fetch(`${BASE_URL}/portfolio/TRENT.NS/watchlist`, { method: 'POST' });

    // 5. Watchlist Endpoint
    console.log('\nTest 5: Watchlist Endpoint (/api/watchlist)');
    const wlRes = await fetch(`${BASE_URL}/watchlist`);
    assert(wlRes.status === 200, 'Watchlist endpoint returns HTTP 200');
    const wlData = await wlRes.json();
    assert(Array.isArray(wlData.companies), 'Watchlist companies is an array');

    // 6. Signals & Alerts Filtering
    console.log('\nTest 6: Signals & Alerts (/api/signals & /api/alerts)');
    const sigRes = await fetch(`${BASE_URL}/signals?window=24h`);
    assert(sigRes.status === 200, 'Signals endpoint returns HTTP 200');
    const sigData = await sigRes.json();
    assert(sigData.total > 0, `Signals total > 0 (got ${sigData.total})`);
    const alertsRes = await fetch(`${BASE_URL}/alerts?severity=critical`);
    assert(alertsRes.status === 200, 'Alerts endpoint returns HTTP 200');
    const alertsData = await alertsRes.json();
    assert(alertsData.items.every((a) => a.severity === 'critical'), 'All returned alerts are critical');

    // 7. Dynamic Anomaly Math Evaluator
    console.log('\nTest 7: Dynamic Anomaly Evaluator (/api/alerts/evaluate)');
    const evalRes = await fetch(`${BASE_URL}/alerts/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceThreshold: 3.0, volumeThreshold: 2.0 })
    });
    assert(evalRes.status === 200, 'Evaluate endpoint returns HTTP 200');
    const evalData = await evalRes.json();
    assert(evalData.totalBreaches >= 4, `Total breaches >= 4 at ±3% / 2.0x (got ${evalData.totalBreaches})`);
    const polycabAlert = evalData.alerts.find((a) => a.ticker === 'POLYCAB.NS');
    assert(Boolean(polycabAlert), 'POLYCAB.NS flagged for price or volume breach');
    const dixonAlert = evalData.alerts.find((a) => a.ticker === 'DIXON.NS');
    assert(Boolean(dixonAlert), 'DIXON.NS flagged for +6.15% expansion');

    // 8. Alert Preferences Persistence
    console.log('\nTest 8: Alert Preferences (/api/settings/alerts)');
    const prefRes = await fetch(`${BASE_URL}/settings/alerts`);
    assert(prefRes.status === 200, 'Get alert preferences returns HTTP 200');
    const updatePrefRes = await fetch(`${BASE_URL}/settings/alerts`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceChangeThreshold: 4.5, volumeThreshold: 2.5, digestWindow: '48h' })
    });
    assert(updatePrefRes.status === 200, 'Update alert preferences returns HTTP 200');
    const updatedPref = await updatePrefRes.json();
    assert(updatedPref.priceChangeThreshold === 4.5, 'Updated priceChangeThreshold to 4.5');
    assert(updatedPref.volumeThreshold === 2.5, 'Updated volumeThreshold to 2.5');
    assert(updatedPref.digestWindow === '48h', 'Updated digestWindow to 48h');
    // Reset to defaults
    await fetch(`${BASE_URL}/settings/alerts`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceChangeThreshold: 3.0, volumeThreshold: 2.0, digestWindow: '24h' })
    });

    // 9. Event Memory
    console.log('\nTest 9: Event Memory Ledger (/api/events/TRENT.NS)');
    const eventRes = await fetch(`${BASE_URL}/events/TRENT.NS`);
    assert(eventRes.status === 200, 'Event endpoint returns HTTP 200');
    const event = await eventRes.json();
    assert(event.ticker === 'TRENT.NS', 'Event ticker matches TRENT.NS');
    assert(event.status === 'delivered', 'Event status matches "delivered"');
    assert(Boolean(event.quoteOrTarget || event.announcedMetric), 'Target metric present');

    // 10. Event Memory Chronological History
    console.log('\nTest 10: Event Memory History (/api/events/TRENT.NS/history)');
    const histRes = await fetch(`${BASE_URL}/events/TRENT.NS/history`);
    assert(histRes.status === 200, 'History endpoint returns HTTP 200');
    const history = await histRes.json();
    assert(history.ticker === 'TRENT.NS', 'History ticker is TRENT.NS');
    assert(Array.isArray(history.observations), 'Observations is an array');
    assert(history.observations.length >= 2, `Observations count >= 2 (got ${history.observations.length})`);

    // 11. Add Subsequent Observation
    console.log('\nTest 11: Add Event Observation (/api/events/observations)');
    const addObsRes = await fetch(`${BASE_URL}/events/observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventMemoryId: 'mem-trent-01',
        observationDate: '2026-10-29',
        observationType: 'Q3 FY25 Interim Verification',
        reportedUpdate: 'Cumulative 154 net Zudio stores operational, pacing ahead of 200 annual target.',
        newStatus: 'delivered',
        evidenceExcerpt: 'BSE Intimation under SEBI LODR Regulation 30'
      })
    });
    assert(addObsRes.status === 200, 'Add observation returns HTTP 200');
    const addObsData = await addObsRes.json();
    assert(addObsData.totalObservations >= 3, `Observation added, total >= 3 (got ${addObsData.totalObservations})`);

    // 12. Primary-Source Research Dossier
    console.log('\nTest 12: Research Dossier (/api/research/TRENT.NS)');
    const resDossierRes = await fetch(`${BASE_URL}/research/TRENT.NS`);
    assert(resDossierRes.status === 200, 'Research dossier returns HTTP 200');
    const dossier = await resDossierRes.json();
    assert(dossier.ticker === 'TRENT.NS', 'Dossier ticker is TRENT.NS');
    assert(Boolean(dossier.businessSnapshot?.keyMoat), 'Business snapshot & moat present');
    assert(Boolean(dossier.financialSnapshot?.ebitdaMargin), 'Financial KPI scorecard present');
    assert(Array.isArray(dossier.narrativeVsNumbers), 'Narrative vs Numbers audit present');
    assert(Array.isArray(dossier.guidanceLedger), 'Active guidance ledger present');
    assert(Boolean(dossier.cashQualityAnalysis?.cfoVsPatCommentary), 'Cash quality analysis present');
    assert(Array.isArray(dossier.bullBear?.bullCase), 'Bull thesis present');
    assert(Array.isArray(dossier.bullBear?.bearCase), 'Bear thesis present');
    assert(Array.isArray(dossier.primarySources), 'Primary sources list present');

    // 13. Grounded Q&A Extraction
    console.log('\nTest 13: Grounded Q&A Extraction (/api/research/query)');
    const qaRes = await fetch(`${BASE_URL}/research/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker: 'TRENT.NS',
        query: 'What is the EBITDA margin and store expansion guidance?'
      })
    });
    assert(qaRes.status === 200, 'Research query returns HTTP 200');
    const qaData = await qaRes.json();
    assert(Boolean(qaData.finding), 'Grounded finding returned');
    assert(Boolean(qaData.citation), 'Exact primary document citation returned');
    assert(qaData.grounded === true, 'Grounded flag is true');

    // 14. Live / Baseline Market Quote
    console.log('\nTest 14: Market Quote (/api/market/quote/TRENT.NS)');
    const quoteRes = await fetch(`${BASE_URL}/market/quote/TRENT.NS`);
    assert(quoteRes.status === 200, 'Market quote returns HTTP 200');
    const quote = await quoteRes.json();
    assert(quote.ticker === 'TRENT.NS', 'Quote ticker is TRENT.NS');
    assert(typeof quote.price === 'number', 'Price is numeric');

    console.log('\n====================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();

