/**
 * End-to-end API tests against a running server backed by a migrated + seeded database.
 *   API_URL=http://localhost:3001/api npx tsx --test test/api.integration.ts
 */
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// Async so the event loop keeps running: a blocking exec would leave a keep-alive socket
// that the server has closed in the fetch pool, and the next request would fail.
const execFileAsync = promisify(execFile);

const API = process.env.API_URL ?? 'http://localhost:3001/api';
const stamp = Date.now();

interface Client {
  token: string;
  cookie: string;
  email: string;
}

async function call(path: string, opts: { method?: string; body?: unknown; client?: Client; cookie?: string } = {}) {
  const res = await fetch(`${API}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.client ? { Authorization: `Bearer ${opts.client.token}` } : {}),
      ...(opts.cookie ?? opts.client?.cookie ? { Cookie: opts.cookie ?? opts.client!.cookie } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  return { status: res.status, json, setCookie: res.headers.get('set-cookie') };
}

const cookieOf = (setCookie: string | null) => (setCookie ?? '').split(';')[0];

async function register(name: string): Promise<Client> {
  const email = `${name}.${stamp}@finn.test`;
  const r = await call('/auth/register', { method: 'POST', body: { email, password: 'Str0ngPassw0rd!', fullName: `${name} Tester` } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return { token: r.json.accessToken, cookie: cookieOf(r.setCookie), email };
}

// Event Memory is shared across users, so test events must not outlive the run.
after(async () => {
  const { pool } = await import('../src/db/client.js');
  await pool.query(`delete from signals where event_id in (select id from corporate_events where title like 'Integration test OSAT line %')`);
  await pool.query(`delete from corporate_events where title like 'Integration test OSAT line %'`);
  await pool.query(`delete from source_documents where provider = 'user' and title in ('Integration test filing', 'Q4 FY28 investor presentation', 'Q4 FY28 results')`);
  await pool.query(`delete from users where email like '%@finn.test'`);
  await pool.end();
});

let alice: Client;
let bob: Client;

/** Starts research (202 + job), polls the job until it finishes, returns the job and its report. */
async function research(companyId: string, client: Client, path: 'generate' | 'refresh' = 'generate', body: Record<string, unknown> = {}) {
  const start = await call(`/research/${companyId}/${path}`, { method: 'POST', client, body });
  assert.equal(start.status, 202, JSON.stringify(start.json));
  let job = start.json.job;
  for (let i = 0; i < 240 && !['succeeded', 'failed'].includes(job.status); i++) {
    await new Promise((r) => setTimeout(r, 500));
    job = (await call(`/research/jobs/${job.id}`, { client })).json.job;
  }
  assert.equal(job.status, 'succeeded', `research job failed: ${job.error}`);
  const report = (await call(`/research/${companyId}?reportId=${job.reportId}`, { client })).json.report;
  return { job, report };
}

before(async () => {
  const health = await call('/health');
  assert.equal(health.status, 200, 'server must be running with a reachable database');
  alice = await register('alice');
  bob = await register('bob');
});

test('auth: validation, duplicate email, login, me, refresh rotation and reuse detection', async () => {
  const weak = await call('/auth/register', { method: 'POST', body: { email: 'x@finn.test', password: 'short', fullName: 'X' } });
  assert.equal(weak.status, 400);
  assert.equal(weak.json.error.code, 'VALIDATION_FAILED');

  const dup = await call('/auth/register', { method: 'POST', body: { email: alice.email, password: 'Str0ngPassw0rd!', fullName: 'Dup' } });
  assert.equal(dup.status, 409);

  const bad = await call('/auth/login', { method: 'POST', body: { email: alice.email, password: 'wrong-password-1' } });
  assert.equal(bad.status, 401);

  const login = await call('/auth/login', { method: 'POST', body: { email: alice.email, password: 'Str0ngPassw0rd!' } });
  assert.equal(login.status, 200);
  const firstCookie = cookieOf(login.setCookie);
  assert.match(login.setCookie ?? '', /HttpOnly/i);

  const me = await call('/auth/me', { client: { ...alice, token: login.json.accessToken } });
  assert.equal(me.json.user.email, alice.email);
  assert.equal(me.json.user.fullName, 'alice Tester');

  const refreshed = await call('/auth/refresh', { method: 'POST', cookie: firstCookie });
  assert.equal(refreshed.status, 200);
  const replay = await call('/auth/refresh', { method: 'POST', cookie: firstCookie });
  assert.equal(replay.status, 401, 'reusing a rotated refresh token is rejected');
  const afterReuse = await call('/auth/refresh', { method: 'POST', cookie: cookieOf(refreshed.setCookie) });
  assert.equal(afterReuse.status, 401, 'reuse detection revokes the whole session');

  assert.equal((await call('/portfolio')).status, 401, 'protected routes require a token');
  assert.equal((await call('/portfolio', { client: { ...alice, token: 'garbage' } })).status, 401);
});

test('portfolio: add by symbol, add by id, duplicate is idempotent, remove, unknown symbol is 404', async () => {
  const search = await call('/companies/search?q=dixon', { client: alice });
  assert.equal(search.status, 200);
  const dixon = search.json.items.find((c: { nseSymbol: string }) => c.nseSymbol === 'DIXON');
  assert.ok(dixon, 'demo universe contains DIXON');

  assert.equal((await call('/portfolio', { method: 'POST', client: alice, body: { symbol: 'TRENT' } })).status, 201);
  assert.equal((await call('/portfolio', { method: 'POST', client: alice, body: { companyId: dixon.id } })).status, 201);
  const again = await call('/portfolio', { method: 'POST', client: alice, body: { companyId: dixon.id } });
  assert.equal(again.status, 200);
  assert.equal(again.json.added, false);

  const missing = await call('/portfolio', { method: 'POST', client: alice, body: { symbol: 'NOSUCHCO' } });
  assert.equal(missing.status, 404);

  const list = await call('/portfolio', { client: alice });
  assert.equal(list.json.total, 2);
  const trent = list.json.items.find((h: { nseSymbol: string }) => h.nseSymbol === 'TRENT');
  assert.ok(trent.quote, 'holdings include the latest quote');
  // Demo flag must agree with the data's provenance (yfinance = real, demo = fixture).
  assert.equal(trent.quote.isDemo, trent.quote.provider === 'demo', 'demo flag matches provider');

  assert.equal((await call(`/portfolio/${trent.id}`, { method: 'DELETE', client: alice })).status, 204);
  assert.equal((await call(`/portfolio/${trent.id}`, { method: 'DELETE', client: alice })).status, 404);
  assert.equal((await call('/portfolio/not-a-uuid', { method: 'DELETE', client: alice })).status, 400);
});

test('isolation: users never see or change each other’s data', async () => {
  const bobList = await call('/portfolio', { client: bob });
  assert.equal(bobList.json.total, 0, 'bob starts empty even though alice tracks companies');

  const aliceNotifs = await call('/notifications?status=all', { client: alice });
  const anyAlice = aliceNotifs.json.items[0];
  if (anyAlice) {
    const steal = await call(`/notifications/${anyAlice.id}/read`, { method: 'PATCH', client: bob, body: { read: true } });
    assert.equal(steal.status, 404, 'bob cannot mark alice’s notification');
  }

  const aliceSessions = await call('/auth/sessions', { client: alice });
  const sid = aliceSessions.json.items[0].id;
  assert.equal((await call(`/auth/sessions/${sid}`, { method: 'DELETE', client: bob })).status, 404);

  const w = await call('/watchlists', { method: 'POST', client: alice, body: { name: `Private ${stamp}` } });
  assert.equal(w.status, 201);
  assert.equal((await call(`/watchlists/${w.json.id}`, { method: 'DELETE', client: bob })).status, 404);
  const bobLists = await call('/watchlists', { client: bob });
  assert.ok(!bobLists.json.items.some((l: { id: string }) => l.id === w.json.id));
});

test('alert engine: thresholds drive notifications and re-evaluation on settings change', async () => {
  const demo = await call('/portfolio/demo', { method: 'POST', client: bob });
  assert.equal(demo.status, 201);
  assert.ok(demo.json.added >= 15);

  const prefs = await call('/settings/alerts', { client: bob });
  assert.equal(prefs.json.priceMoveThresholdPct, 2.5, 'default ±2.5%');

  // Very strict: nothing qualifies on price.
  await call('/settings/alerts', { method: 'PATCH', client: bob, body: { priceMoveThresholdPct: 20, volumeSurgeMultiple: 10 } });
  const strict = await call('/signals?type=price_move', { client: bob });
  assert.equal(strict.json.pagination.total, 0);

  const loose = await call('/settings/alerts', { method: 'PATCH', client: bob, body: { priceMoveThresholdPct: 2.5, volumeSurgeMultiple: 2 } });
  assert.equal(loose.status, 200);
  const priceSignals = await call('/signals?type=price_move&pageSize=100', { client: bob });
  assert.ok(priceSignals.json.pagination.total > 0);
  for (const s of priceSignals.json.items) assert.ok(Math.abs(s.metrics.changePercent) >= 2.5, `${s.title} respects threshold`);

  const invalid = await call('/settings/alerts', { method: 'PATCH', client: bob, body: { priceMoveThresholdPct: 0.1 } });
  assert.equal(invalid.status, 400);

  const home = await call('/home', { client: bob });
  assert.equal(home.status, 200);
  assert.equal(home.json.greetingName, 'bob');
  assert.ok(home.json.quote.author && home.json.quote.source);
  assert.equal(home.json.overview.trackedCompanies, demo.json.added);
  assert.equal(home.json.overview.advancing + home.json.overview.declining + home.json.overview.unchanged, home.json.overview.withMarketData);
  assert.ok(home.json.priorityAlerts.length <= 5);
});

test('notifications: pagination, read/unread, mark all', async () => {
  const page1 = await call('/notifications?status=all&page=1&pageSize=2', { client: bob });
  assert.equal(page1.status, 200);
  assert.ok(page1.json.items.length <= 2);
  assert.ok(page1.json.pagination.totalPages >= 1);
  const first = page1.json.items[0];
  if (first) {
    const read = await call(`/notifications/${first.id}/read`, { method: 'PATCH', client: bob, body: { read: true } });
    assert.ok(read.json.readAt);
    const unread = await call(`/notifications/${first.id}/read`, { method: 'PATCH', client: bob, body: { read: false } });
    assert.equal(unread.json.readAt, null);
  }
  await call('/notifications/read-all', { method: 'POST', client: bob });
  const after = await call('/notifications?status=unread', { client: bob });
  assert.equal(after.json.unread, 0);
  assert.equal((await call('/notifications?pageSize=500', { client: bob })).status, 400, 'page size is bounded');
});

test('deduplication: re-running ingestion jobs creates no duplicate signals or notifications', async () => {
  const before = await call('/notifications?status=all&pageSize=1', { client: bob });
  const signalsBefore = await call('/signals?pageSize=1', { client: bob });
  for (const job of ['market', 'announcements']) {
    await execFileAsync('npx', ['tsx', 'src/jobs/cli.ts', job], { cwd: new URL('..', import.meta.url), shell: true });
  }
  const after = await call('/notifications?status=all&pageSize=1', { client: bob });
  const signalsAfter = await call('/signals?pageSize=1', { client: bob });
  assert.equal(after.json.pagination.total, before.json.pagination.total);
  assert.equal(signalsAfter.json.pagination.total, signalsBefore.json.pagination.total);
});

test('event memory: seeded precedent was detected for the new Dixon facility', async () => {
  const events = await call('/events?scope=all&q=dixon&pageSize=50', { client: bob });
  const capex = events.json.items.find((e: { title: string }) => /Display Modules and Notebook/i.test(e.title));
  assert.ok(capex, 'announcement ingestion extracted the Dixon capex event');
  assert.equal(capex.category, 'manufacturing_facility');
  assert.equal(capex.expectedCapexCr, 1200);
  const detail = await call(`/events/${capex.id}`, { client: bob });
  const precedent = detail.json.similarEvents.find((s: { event: { title: string } }) => /Notebook Assembly Plant/i.test(s.event.title));
  assert.ok(precedent, 'matched the 2023 notebook plant');
  assert.ok(precedent.matchedOn.includes('same company'));
  assert.match(precedent.explanation, /previously announced a similar manufacturing facility in 2023/);

  const sig = await call('/signals?type=historical_precedent&pageSize=50', { client: bob });
  assert.ok(sig.json.items.some((s: { eventId: string }) => s.eventId === capex.id), 'a "Historical precedent detected" signal exists');

  const similar = await call(`/events/similar/${capex.companyId}`, { client: bob });
  assert.ok(similar.json.items.length > 0);
});

test('event memory: create, dedupe, milestones and evidence-gated completion', async () => {
  const search = await call('/companies/search?q=KAYNES', { client: alice });
  const kaynes = search.json.items[0];
  const body = {
    companyId: kaynes.id,
    category: 'manufacturing_facility',
    projectType: 'semiconductor',
    title: `Integration test OSAT line ${stamp}`,
    originalAnnouncement: 'Board approved an additional OSAT packaging line in Sanand with capex of ₹500 crore, to be completed by December 2027.',
    announcedAt: '2026-10-30',
    expectedCapexCr: 500,
    expectedCompletionDate: '2027-12-31',
    sourceDocument: { title: 'Integration test filing', documentType: 'exchange_filing' },
  };
  const created = await call('/events', { method: 'POST', client: alice, body });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const id = created.json.event.id;
  assert.ok(created.json.event.similarEvents.length > 0, 'matched the existing Kaynes OSAT commitment');

  const dup = await call('/events', { method: 'POST', client: alice, body });
  assert.equal(dup.status, 409, 'same company + category + title + date is deduplicated');

  const noEvidence = await call(`/events/${id}`, { method: 'PATCH', client: alice, body: { status: 'completed', execution: { actualCompletionDate: '2028-03-31' } } });
  assert.equal(noEvidence.status, 422, 'cannot complete without evidence');

  const noDate = await call(`/events/${id}/milestones`, {
    method: 'POST',
    client: alice,
    body: { milestoneDate: '2028-03-31', statusAfter: 'completed', description: 'Line commissioned', sourceDocument: { title: 'Q4 FY28 results' }, evidenceExcerpt: 'Commissioned in March 2028.' },
  });
  assert.equal(noDate.status, 422, 'completion needs an actual completion date');

  const progress = await call(`/events/${id}/milestones`, { method: 'POST', client: alice, body: { milestoneDate: '2027-02-01', statusAfter: 'in_progress', description: 'Civil works started' } });
  assert.equal(progress.status, 201);

  const done = await call(`/events/${id}/milestones`, {
    method: 'POST',
    client: alice,
    body: {
      milestoneDate: '2028-03-31',
      statusAfter: 'completed',
      description: 'Line commissioned',
      sourceDocument: { title: 'Q4 FY28 investor presentation', documentType: 'investor_presentation' },
      evidenceExcerpt: 'The OSAT line was commissioned on 31 March 2028 at a cost of ₹560 crore.',
      execution: { actualCompletionDate: '2028-03-31', actualCapexCr: 560 },
    },
  });
  assert.equal(done.status, 201, JSON.stringify(done.json));

  const detail = await call(`/events/${id}`, { client: alice });
  assert.equal(detail.json.status, 'completed');
  assert.equal(detail.json.execution.delayDays, 91);
  assert.equal(detail.json.execution.capexVariancePct, 12);
  assert.equal(detail.json.execution.guidanceAccuracy, 'major_slip');
  const milestones = await call(`/events/${id}/milestones`, { client: alice });
  assert.equal(milestones.json.items.length, 3);

  assert.equal((await call('/events/00000000-0000-0000-0000-000000000000', { client: alice })).status, 404);
  const invalid = await call('/events', { method: 'POST', client: alice, body: { ...body, category: 'nonsense' } });
  assert.equal(invalid.status, 400);
});

test('research: generation separates facts, calculations and interpretations; evidence lists sources', async () => {
  const search = await call('/companies/search?q=POLYCAB', { client: alice });
  const polycab = search.json.items[0];
  const existing = await call(`/research/${polycab.id}`, { client: alice });
  assert.equal(existing.status, 200);
  assert.ok(existing.json.report, 'a research report exists (seeded fixture or generated)');
  assert.equal(existing.json.report.isDemo, existing.json.report.generator === 'demo-fixture' || !existing.json.report.generator.includes('yfinance'), 'demo flag matches how the report was built');

  const { report } = await research(polycab.id, alice);
  const fin = report.sections.financialSnapshot;
  assert.ok(['available', 'partial'].includes(fin.status));
  assert.ok(fin.claims.some((c: { claimType: string }) => c.claimType === 'reported_fact'));
  assert.ok(fin.claims.some((c: { claimType: string; formula?: string }) => c.claimType === 'calculated_metric' && c.formula));
  const live = report.generator.includes('yfinance');
  if (live) {
    // Real statements: balance-sheet facts are reported and cite the Yahoo Finance source.
    assert.equal(report.sections.balanceSheet.status, 'available');
    const bsFacts = report.sections.balanceSheet.claims.filter((c: { claimType: string }) => c.claimType === 'reported_fact');
    assert.ok(bsFacts.length > 0);
    assert.ok(bsFacts.every((c: { sourceTitle: string | null }) => /Yahoo Finance/.test(c.sourceTitle ?? '')), 'facts cite Yahoo Finance');
    assert.equal(report.isDemo, false);
  } else {
    assert.equal(report.sections.balanceSheet.status, 'unavailable', 'missing data is explicit, never invented');
  }
  // Without transcripts, narrative-vs-numbers must say it cannot be completed rather than invent statements.
  if (report.sections.narrativeVsNumbers.status === 'unavailable') assert.match(report.sections.narrativeVsNumbers.reason, /cannot be completed/);
  assert.ok(report.limitations.length > 0);

  const evidence = await call(`/research/${polycab.id}/evidence`, { client: alice });
  assert.ok(evidence.json.items.length > 0);
  assert.ok(evidence.json.documents.length > 0);

  // A company with no stored data gets an honest, mostly-unavailable report.
  // A company with no retrievable statements (Tata Motors: demerged, Yahoo symbol retired) stays honest.
  const s2 = await call('/companies/search?q=TATAMOTORS', { client: alice });
  const bare = await research(s2.json.items[0].id, alice);
  assert.equal(bare.report.sections.financialSnapshot.status, 'unavailable');
});

test('market data: history ranges, moving averages and company feeds', async () => {
  const search = await call('/companies/search?q=TRENT', { client: alice });
  const id = search.json.items[0].id;
  const h = await call(`/market/${id}/history?range=1Y`, { client: alice });
  assert.equal(h.status, 200);
  assert.ok(h.json.candles.length > 200);
  assert.equal(h.json.isDemo, h.json.provider === 'demo', 'history demo flag matches provider');
  const last = h.json.candles[h.json.candles.length - 1];
  assert.ok(last.sma20 && last.sma50 && last.sma200);
  assert.equal((await call(`/market/${id}/history?range=10Y`, { client: alice })).status, 400);
  const quote = await call(`/market/${id}`, { client: alice });
  assert.equal(typeof quote.json.lastPrice, 'number');
  const overview = await call(`/companies/${id}/overview`, { client: alice });
  assert.ok(Array.isArray(overview.json.announcements));
  const feed = await call(`/companies/${id}/signals`, { client: alice });
  assert.equal(feed.status, 200);
  const signal = feed.json.items[0];
  if (signal) {
    const detail = await call(`/signals/${signal.id}`, { client: alice });
    assert.ok(Array.isArray(detail.json.evidence));
  }
});

test('settings: profile update validates time zones', async () => {
  const ok = await call('/settings', { method: 'PATCH', client: alice, body: { fullName: 'Alice Rao', timezone: 'Asia/Kolkata' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.profile.fullName, 'Alice Rao');
  const bad = await call('/settings', { method: 'PATCH', client: alice, body: { timezone: 'Mars/Olympus' } });
  assert.equal(bad.status, 400);
});

test('errors use one envelope; unknown endpoints are 404', async () => {
  const r = await call('/does-not-exist', { client: alice });
  assert.equal(r.status, 404);
  assert.equal(r.json.error.code, 'NOT_FOUND');
});

test('alerts: read alerts stay listed, sink below unread and persist; mark-all hides nothing', async () => {
  const q = '/notifications?status=all&sort=attention&pageSize=100';
  const before = await call(q, { client: bob });
  const total = before.json.pagination.total;
  assert.ok(total >= 3, 'bob has alerts from the demo portfolio');
  // Make two alerts unread, then read one of them.
  const [a, b] = before.json.items;
  await call(`/notifications/${a.id}/read`, { method: 'PATCH', client: bob, body: { read: false } });
  await call(`/notifications/${b.id}/read`, { method: 'PATCH', client: bob, body: { read: false } });
  await call(`/notifications/${a.id}/read`, { method: 'PATCH', client: bob, body: { read: true } });
  const after = await call(q, { client: bob });
  assert.equal(after.json.pagination.total, total, 'nothing disappears when marked read');
  const ids = after.json.items.map((n: { id: string }) => n.id);
  assert.ok(ids.includes(a.id), 'read alert is still listed');
  const firstReadIdx = after.json.items.findIndex((n: { readAt: string | null }) => n.readAt);
  const lastUnreadIdx = after.json.items.map((n: { readAt: string | null }) => !n.readAt).lastIndexOf(true);
  assert.ok(lastUnreadIdx < firstReadIdx, 'all unread alerts are above read alerts');
  assert.ok(ids.indexOf(b.id) < ids.indexOf(a.id), 'the read alert moved below the unread one');
  // Filters
  const unread = await call('/notifications?status=unread&sort=attention', { client: bob });
  assert.ok(unread.json.items.every((n: { readAt: string | null }) => !n.readAt));
  const read = await call('/notifications?status=read&sort=attention', { client: bob });
  assert.ok(read.json.items.every((n: { readAt: string | null }) => n.readAt));
  assert.equal(unread.json.unread + read.json.read, total);
  // Mark all as read: still all listed.
  await call('/notifications/read-all', { method: 'POST', client: bob });
  const all = await call(q, { client: bob });
  assert.equal(all.json.pagination.total, total);
  assert.equal(all.json.unread, 0);
});

test('event memory ↔ alerts: historical match is attached, same-company first, and links both ways', async () => {
  const list = await call('/notifications?status=all&sort=attention&pageSize=100', { client: bob });
  const withMatch = list.json.items.filter((n: { historicalMatch: unknown }) => n.historicalMatch);
  assert.ok(withMatch.length > 0, 'at least one alert carries a historical event match');
  const dixon = withMatch.find((n: { company: { nseSymbol: string } }) => n.company.nseSymbol === 'DIXON');
  assert.ok(dixon, 'the Dixon capex alert carries its precedent');
  const m = dixon.historicalMatch;
  assert.equal(m.sameCompany, true, 'same-company precedent is preferred');
  assert.equal(m.event.company.nseSymbol, 'DIXON');
  assert.ok(['Delivered on time', 'Delivered early', 'Delivered late', 'Delivered — timing unverified', 'Delayed', 'Abandoned', 'In progress', 'Outcome unverified'].includes(m.outcome));
  // Deep-link target: the exact historical event, which lists the new event among those it matched.
  const hist = await call(`/events/${m.event.id}`, { client: bob });
  assert.equal(hist.status, 200);
  assert.ok(hist.json.matchedBy.some((x: { id: string }) => x.id === m.newEventId), 'reverse link persisted');
  assert.ok(hist.json.milestones.length > 0, 'milestone timeline available');
  // Re-processing the same announcements does not duplicate matches.
  const newEvent = await call(`/events/${m.newEventId}`, { client: bob });
  const ids = newEvent.json.similarEvents.map((x: { similarEventId: string }) => x.similarEventId);
  assert.equal(new Set(ids).size, ids.length, 'no duplicate similarity rows');
  assert.equal(newEvent.json.similarEvents[0].sameCompany, true, 'same-company precedent ranks first');
});

test('live company data: unresolvable symbols are rejected, known companies resolve via Yahoo', async () => {
  const bad = await call('/companies/import', { method: 'POST', client: alice, body: { symbol: 'NOTAREALCO123' } });
  assert.equal(bad.status, 404);
  assert.match(bad.json.error.message, /could not be resolved/);
  const itc = await call('/companies/import', { method: 'POST', client: alice, body: { symbol: 'ITC.NS' } });
  assert.ok([200, 201].includes(itc.status));
  assert.equal(itc.json.company.yahooSymbol, 'ITC.NS');
  assert.equal(itc.json.company.isDemo, false);
  const fresh = await call(`/companies/${itc.json.company.id}/freshness`, { client: alice });
  assert.ok(fresh.json.items.some((f: { dataset: string; status: string }) => f.dataset === 'financials' && f.status === 'ok'));
  const quote = await call(`/market/${itc.json.company.id}`, { client: alice });
  assert.equal(quote.json.isDemo, false);
  assert.equal(quote.json.quoteTiming, 'end_of_day', 'delayed Yahoo quotes are never labelled live');
});

test('favourites: independent of read state and order, persisted, filtered and private', async () => {
  const q = '/notifications?status=all&sort=attention&pageSize=100';
  const items = (await call(q, { client: bob })).json.items;
  const [x, y] = items;
  await call(`/notifications/${x.id}/read`, { method: 'PATCH', client: bob, body: { read: false } });
  await call(`/notifications/${y.id}/read`, { method: 'PATCH', client: bob, body: { read: true } });
  const before = await call(q, { client: bob });
  const order = before.json.items.map((n: { id: string }) => n.id);
  const favs0 = before.json.favourites;

  // Favourite an unread alert: stays unread, same position, count +1. Repeating is idempotent.
  const fav = await call(`/alerts/${x.id}/favourite`, { method: 'POST', client: bob });
  assert.equal(fav.status, 200);
  assert.equal(fav.json.favourited, true);
  assert.equal(fav.json.readAt, null, 'favouriting does not mark as read');
  assert.equal((await call(`/alerts/${x.id}/favourite`, { method: 'POST', client: bob })).json.favourited, true);
  const after = await call(q, { client: bob });
  assert.deepEqual(after.json.items.map((n: { id: string }) => n.id), order, 'favouriting does not change order');
  assert.equal(after.json.favourites, favs0 + 1, 'no duplicate favourite');
  assert.equal(after.json.items.find((n: { id: string }) => n.id === x.id).priority, items[0].priority, 'priority unchanged');

  // Favourite a read alert; then mark the unread favourite as read: it stays a favourite.
  await call(`/alerts/${y.id}/favourite`, { method: 'POST', client: bob });
  await call(`/notifications/${x.id}/read`, { method: 'PATCH', client: bob, body: { read: true } });
  const favs = await call('/alerts/favourites', { client: bob });
  assert.equal(favs.status, 200);
  const favIds = favs.json.items.map((n: { id: string }) => n.id);
  assert.ok(favIds.includes(x.id) && favIds.includes(y.id), 'read and unread favourites are both listed');
  assert.ok(favs.json.items.every((n: { favourited: boolean }) => n.favourited));
  const filtered = await call('/notifications?status=favourites&sort=attention', { client: bob });
  assert.equal(filtered.json.pagination.total, favs0 + 2);

  // Persisted: a fresh login sees the same favourites.
  const login = await call('/auth/login', { method: 'POST', body: { email: bob.email, password: 'Str0ngPassw0rd!' } });
  const again = await call('/alerts/favourites', { client: { ...bob, token: login.json.accessToken } });
  assert.equal(again.json.pagination.total, favs0 + 2);

  // Private: another user cannot favourite, unfavourite or see these alerts.
  assert.equal((await call(`/alerts/${x.id}/favourite`, { method: 'POST', client: alice })).status, 404);
  assert.equal((await call(`/alerts/${x.id}/favourite`, { method: 'DELETE', client: alice })).status, 404);
  assert.ok(!(await call('/alerts/favourites', { client: alice })).json.items.some((n: { id: string }) => favIds.includes(n.id)));

  // Remove: count drops, the alert remains in the normal list with its read state.
  const del = await call(`/alerts/${x.id}/favourite`, { method: 'DELETE', client: bob });
  assert.equal(del.json.favourited, false);
  assert.ok(del.json.readAt, 'unfavouriting keeps read state');
  const end = await call(q, { client: bob });
  assert.equal(end.json.favourites, favs0 + 1);
  assert.ok(end.json.items.some((n: { id: string }) => n.id === x.id), 'still listed after removal');
  await call(`/alerts/${y.id}/favourite`, { method: 'DELETE', client: bob });
});

test('filings digest: windowed, prioritised, routine separated, private and validated', async () => {
  const carol = await register('carol');
  assert.equal((await call('/portfolio/demo', { method: 'POST', client: carol })).status, 201);
  const held = new Set((await call('/portfolio', { client: carol })).json.items.map((h: { id: string }) => h.id));

  const day = await call('/digest', { client: carol });
  assert.equal(day.status, 200);
  assert.equal(day.json.window.id, '24h', 'defaults to the last 24 hours');
  assert.equal(Date.parse(day.json.window.end) - Date.parse(day.json.window.start), 24 * 3_600_000);
  assert.ok(day.json.latestFilingAt, 'the demo portfolio has filings');

  // A week ending on the newest filing, so the test does not depend on today's date.
  const to = day.json.latestFilingAt.slice(0, 10);
  const from = new Date(Date.parse(`${to}T00:00:00Z`) - 6 * 86_400_000).toISOString().slice(0, 10);
  const week = await call(`/digest?window=custom&from=${from}&to=${to}`, { client: carol });
  assert.equal(week.status, 200);
  const d = week.json;
  assert.ok(d.total > 0);
  assert.equal(d.materialCount + d.routineCount, d.total);
  assert.equal(Object.values(d.byPriority as Record<string, number>).reduce((a, b) => a + b, 0), d.materialCount);
  assert.ok(d.material.every((i: { routine: boolean }) => !i.routine) && d.routine.every((i: { routine: boolean }) => i.routine));
  const scores = d.material.map((i: { materialityScore: number }) => i.materialityScore);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a), 'most material first');
  const all = [...d.material, ...d.routine];
  assert.ok(all.every((i: { company: { id: string } }) => held.has(i.company.id)), 'only portfolio companies');
  assert.ok(all.every((i: { announcedAt: string }) => i.announcedAt >= d.window.start && i.announcedAt < d.window.end), 'inside the window');

  // Private: a user with an empty portfolio sees nothing in the same window.
  const empty = await register('dave');
  const none = await call(`/digest?window=custom&from=${from}&to=${to}`, { client: empty });
  assert.equal(none.json.total, 0);
  assert.equal(none.json.latestFilingAt, null);

  for (const bad of ['window=custom&from=2026-10-28', `window=custom&from=${to}&to=${from}`, 'window=custom&from=2026-02-31&to=2026-03-01', 'window=custom&from=2025-01-01&to=2026-11-03', 'window=30d']) {
    assert.equal((await call(`/digest?${bad}`, { client: carol })).status, 400, bad);
  }
  assert.equal((await call('/digest')).status, 401);
});

test('research jobs: progressive, owner-only, de-duplicated, reuse unchanged reports', async () => {
  const search = await call('/companies/search?q=POLYCAB', { client: alice });
  const id = search.json.items[0].id;
  // The research test generated this report from the same data: it is reused, not regenerated.
  const reused = await research(id, alice);
  assert.equal(reused.job.reused, true, 'identical inputs reuse the stored report');
  assert.ok(reused.job.timings.totalMs < 15_000);
  // Another user cannot read the job.
  assert.equal((await call(`/research/jobs/${reused.job.id}`, { client: bob })).status, 404);
  // Two identical requests in a row share one job.
  const a = await call(`/research/${id}/refresh`, { method: 'POST', client: alice, body: {} });
  const b = await call(`/research/${id}/refresh`, { method: 'POST', client: alice, body: {} });
  assert.equal(a.status, 202);
  if (b.json.deduplicated) assert.equal(b.json.job.id, a.json.job.id);
  // GET exposes the in-flight job so a reloaded page can resume showing progress.
  const live = await call(`/research/${id}`, { client: alice });
  if (live.json.activeJob) assert.equal(live.json.activeJob.id, a.json.job.id);
  let job = a.json.job;
  for (let i = 0; i < 240 && !['succeeded', 'failed'].includes(job.status); i++) {
    await new Promise((r) => setTimeout(r, 500));
    job = (await call(`/research/jobs/${job.id}`, { client: alice })).json.job;
  }
  assert.equal(job.status, 'succeeded');
  assert.equal(job.reused, false, 'refresh regenerates the analysis');
  assert.ok(job.timings.data, 'stage timings are recorded');
  assert.equal(job.progress.financialSnapshot, 'available', 'facts and metrics are available without AI');
});

test('ai: status and usage are authenticated and never expose credentials', async () => {
  assert.equal((await call('/ai/status')).status, 401);
  const s = await call('/ai/status', { client: alice });
  assert.equal(s.status, 200);
  assert.equal(typeof s.json.configured, 'boolean');
  const keyLike = /AQ\.[A-Za-z0-9_-]{10}|AIza[0-9A-Za-z_-]{10}|sk-[A-Za-z0-9]{10}|api[_-]?key/i;
  assert.doesNotMatch(JSON.stringify(s.json), keyLike, 'no key material');
  if (s.json.configured) {
    assert.ok(s.json.provider && s.json.model, 'provider and model are reported');
    assert.ok(s.json.models.fast.id && s.json.models.reasoning.id);
  }
  const u = await call('/ai/usage', { client: alice });
  assert.equal(u.status, 200);
  assert.ok(u.json.totals.requests >= 0);
  assert.doesNotMatch(JSON.stringify(u.json), keyLike);
});

test('logos: public, verified images served from FINN; unknown or malformed symbols are refused', async () => {
  const res = await fetch(`${API}/logos/RELIANCE.NS`);
  assert.equal(res.status, 200, 'no sign-in needed: an <img> cannot send a token');
  assert.match(res.headers.get('content-type') ?? '', /^image\//);
  assert.equal(res.headers.get('cross-origin-resource-policy'), 'cross-origin');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.ok((await res.arrayBuffer()).byteLength > 100);
  assert.equal((await fetch(`${API}/logos/reliance`)).status, 200, 'a bare NSE symbol resolves');
  assert.equal((await fetch(`${API}/logos/${encodeURIComponent('../../etc')}`)).status, 400);
  assert.equal((await fetch(`${API}/logos/NOSUCHCO123.NS`)).status, 404, 'no verified logo: the UI shows initials');
});

test('reviewer demo account: signs in, sees demo data, cannot change shared records or other reviewers', { skip: !process.env.TEST_DEMO_EMAIL && 'set TEST_DEMO_EMAIL / TEST_DEMO_PASSWORD (the running API needs DEMO_MODE_ENABLED=true)' }, async () => {
  const login = await call('/auth/login', { method: 'POST', body: { email: process.env.TEST_DEMO_EMAIL, password: process.env.TEST_DEMO_PASSWORD } });
  assert.equal(login.status, 200, JSON.stringify(login.json));
  assert.equal(login.json.user.isDemoAccount, true);
  const demo: Client = { token: login.json.accessToken, cookie: cookieOf(login.setCookie), email: process.env.TEST_DEMO_EMAIL! };
  assert.ok((await call('/portfolio', { client: demo })).json.total > 0, 'demo portfolio is populated');

  assert.equal((await call('/auth/password', { method: 'POST', client: demo, body: { currentPassword: process.env.TEST_DEMO_PASSWORD, newPassword: 'Changed2026password' } })).status, 403);
  assert.equal((await call('/settings', { method: 'PATCH', client: demo, body: { fullName: 'Someone else' } })).status, 403);
  assert.equal((await call('/settings', { method: 'PATCH', client: demo, body: { theme: 'light' } })).status, 200, 'theme is a harmless preference');
  const event = (await call('/events?pageSize=1', { client: demo })).json.items[0];
  assert.equal((await call(`/events/${event.id}`, { method: 'PATCH', client: demo, body: { status: 'delayed' } })).status, 403, 'Event Memory is shared');
  assert.equal((await call(`/events/${event.id}/milestones`, { method: 'POST', client: demo, body: {} })).status, 403);

  const other = await call('/auth/login', { method: 'POST', body: { email: process.env.TEST_DEMO_EMAIL, password: process.env.TEST_DEMO_PASSWORD } });
  const sessions = (await call('/auth/sessions', { client: demo })).json.items;
  assert.deepEqual(sessions.map((s: { current: boolean }) => s.current), [true], 'other reviewers’ sessions are hidden');
  assert.ok(other.json.accessToken);
  assert.equal((await call(`/auth/sessions/${sessions[0].id}`, { method: 'DELETE', client: demo })).status, 403);

  // Ordinary accounts keep every capability.
  assert.equal((await call('/settings', { method: 'PATCH', client: alice, body: { fullName: 'alice Tester' } })).status, 200);
});

test('archive and restore: out of the active feed, never deleted, state preserved, private', async () => {
  const q = '/notifications?status=all&sort=attention&pageSize=100';
  const before = (await call(q, { client: bob })).json;
  const [x] = before.items;
  assert.ok(x, 'bob has alerts');
  await call(`/notifications/${x.id}/read`, { method: 'PATCH', client: bob, body: { read: false } });
  const start = (await call(q, { client: bob })).json;

  const arch = await call(`/alerts/${x.id}/archive`, { method: 'POST', client: bob });
  assert.equal(arch.status, 200);
  assert.equal(arch.json.archived, true);
  assert.equal(arch.json.readAt, null, 'archiving does not mark as read');
  const again = await call(`/alerts/${x.id}/archive`, { method: 'POST', client: bob });
  assert.equal(again.json.archivedAt, arch.json.archivedAt, 'idempotent: the first archive time is kept');

  const active = (await call(q, { client: bob })).json;
  assert.ok(!active.items.some((n: { id: string }) => n.id === x.id), 'gone from the active feed');
  assert.equal(active.pagination.total, start.pagination.total - 1);
  assert.equal(active.unread, start.unread - 1, 'archived alerts leave the unread count');
  assert.equal(active.archived, start.archived + 1);
  const unreadView = (await call('/notifications?status=unread&pageSize=100', { client: bob })).json;
  assert.ok(!unreadView.items.some((n: { id: string }) => n.id === x.id));
  const archived = await call('/alerts/archived', { client: bob });
  assert.equal(archived.status, 200);
  const item = archived.json.items.find((n: { id: string }) => n.id === x.id);
  assert.ok(item && item.archived && item.readAt === null, 'listed under Archived, still unread');
  assert.equal((await call('/notifications?status=archived', { client: bob })).json.pagination.total, archived.json.pagination.total);

  // Mark-all-read touches only the active feed.
  await call('/notifications/read-all', { method: 'POST', client: bob });
  const stillUnread = (await call('/alerts/archived', { client: bob })).json.items.find((n: { id: string }) => n.id === x.id);
  assert.equal(stillUnread.readAt, null, 'archived alerts keep their own read state');

  // Private: another user can neither archive, restore nor see it.
  assert.equal((await call(`/alerts/${x.id}/archive`, { method: 'POST', client: alice })).status, 404);
  assert.equal((await call(`/alerts/${x.id}/restore`, { method: 'POST', client: alice })).status, 404);
  assert.ok(!(await call('/alerts/archived', { client: alice })).json.items.some((n: { id: string }) => n.id === x.id));

  const restored = await call(`/alerts/${x.id}/restore`, { method: 'POST', client: bob });
  assert.equal(restored.json.archived, false);
  const after = (await call(q, { client: bob })).json;
  assert.equal(after.items.filter((n: { id: string }) => n.id === x.id).length, 1, 'back once, no duplicate');
  assert.equal(after.pagination.total, start.pagination.total);
  assert.equal((await call('/alerts/not-a-uuid/archive', { method: 'POST', client: bob })).status, 400);
});

test('personal notes: one per user per alert, validated, private, kept through archive and restore', async () => {
  const items = (await call('/notifications?status=all&sort=attention&pageSize=100', { client: bob })).json.items;
  const y = items[1] ?? items[0];
  assert.equal((await call(`/alerts/${y.id}/note`, { client: bob })).json.note, null);
  assert.equal((await call(`/alerts/${y.id}/note`, { method: 'PUT', client: bob, body: { content: '   ' } })).status, 400, 'empty note rejected');
  assert.equal((await call(`/alerts/${y.id}/note`, { method: 'PUT', client: bob, body: { content: 'x'.repeat(4001) } })).status, 400, 'over-long note rejected');

  const saved = await call(`/alerts/${y.id}/note`, { method: 'PUT', client: bob, body: { content: '  Check margin impact of the new plant  ' } });
  assert.equal(saved.status, 200);
  assert.equal(saved.json.note.content, 'Check margin impact of the new plant');
  const edited = await call(`/alerts/${y.id}/note`, { method: 'PUT', client: bob, body: { content: 'Compare with FY22 capex timeline' } });
  assert.equal(edited.json.note.content, 'Compare with FY22 capex timeline', 'saving again updates the single note');
  assert.equal(edited.json.note.createdAt, saved.json.note.createdAt);
  const listed = (await call('/notifications?status=all&pageSize=100', { client: bob })).json.items.find((n: { id: string }) => n.id === y.id);
  assert.equal(listed.hasNote, true);

  // Private to the account that wrote it.
  assert.equal((await call(`/alerts/${y.id}/note`, { client: alice })).status, 404);
  assert.equal((await call(`/alerts/${y.id}/note`, { method: 'PUT', client: alice, body: { content: 'intrusion' } })).status, 404);
  assert.equal((await call(`/alerts/${y.id}/note`, { method: 'DELETE', client: alice })).status, 404);

  // Combined: favourite + note survive read, archive and restore.
  await call(`/notifications/${y.id}/read`, { method: 'PATCH', client: bob, body: { read: false } });
  await call(`/alerts/${y.id}/favourite`, { method: 'POST', client: bob });
  await call(`/notifications/${y.id}/read`, { method: 'PATCH', client: bob, body: { read: true } });
  await call(`/alerts/${y.id}/archive`, { method: 'POST', client: bob });
  const favs = (await call('/alerts/favourites', { client: bob })).json.items.find((n: { id: string }) => n.id === y.id);
  assert.ok(favs && favs.archived, 'archived favourites stay listed under Favourites, flagged');
  await call(`/alerts/${y.id}/restore`, { method: 'POST', client: bob });
  const back = (await call('/notifications?status=all&pageSize=100', { client: bob })).json.items.find((n: { id: string }) => n.id === y.id);
  assert.ok(back.readAt && back.favourited && back.hasNote && !back.archived, 'read, favourite and note all preserved');
  assert.equal((await call(`/alerts/${y.id}/note`, { client: bob })).json.note.content, 'Compare with FY22 capex timeline');

  const del = await call(`/alerts/${y.id}/note`, { method: 'DELETE', client: bob });
  assert.equal(del.json.deleted, true);
  assert.equal((await call(`/alerts/${y.id}/note`, { method: 'DELETE', client: bob })).json.deleted, false, 'deleting twice is harmless');
  assert.equal((await call('/notifications?status=all&pageSize=100', { client: bob })).json.items.find((n: { id: string }) => n.id === y.id).hasNote, false);
  await call(`/alerts/${y.id}/favourite`, { method: 'DELETE', client: bob });
});

test('research financials: charts and comparisons match the stored statements; Ask FINN validates input', async () => {
  const { pool } = await import('../src/db/client.js');
  const { rows } = await pool.query(
    `select c.id, s.period_label, s.revenue, s.pat from companies c join financial_statements s on s.company_id = c.id
     where s.period_type = 'annual' and s.revenue is not null and s.pat is not null order by c.id, s.period_end desc limit 1`,
  );
  if (!rows.length) return; // no statements stored in this database
  const id = rows[0].id as string;
  assert.equal((await call(`/research/${id}/financials`)).status, 401);
  const r = await call(`/research/${id}/financials`, { client: alice });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const latest = r.json.annual.filter((p: { missing: boolean }) => !p.missing).at(-1);
  assert.equal(latest.period, rows[0].period_label);
  assert.equal(latest.revenue, rows[0].revenue, 'charted revenue is the stored figure');
  assert.equal(latest.pat, rows[0].pat);
  assert.equal(latest.netMargin, Math.round((rows[0].pat / rows[0].revenue) * 1000) / 10);
  for (const s of r.json.assessments) assert.ok(['positive', 'negative', 'neutral'].includes(s.tone) && s.rule.length > 20);
  for (const i of r.json.insights) assert.ok(i.period && i.previousPeriod && i.whyItMatters && i.formula);
  assert.equal(r.json.annual.some((p: { missing: boolean; revenue: number | null }) => p.missing && p.revenue !== null), false, 'gaps carry no values');
  assert.equal((await call('/research/00000000-0000-4000-8000-000000000000/financials', { client: alice })).status, 404);
  // Ask FINN: input is validated before any AI call.
  assert.equal((await call(`/research/${id}/ask`, { method: 'POST', body: { question: 'Why?' } })).status, 401);
  assert.equal((await call(`/research/${id}/ask`, { method: 'POST', client: alice, body: { question: 'x' } })).status, 400);
  assert.equal((await call(`/research/${id}/ask`, { method: 'POST', client: alice, body: { question: 'q'.repeat(301) } })).status, 400);
});

test('logout revokes the refresh session', async () => {
  const login = await call('/auth/login', { method: 'POST', body: { email: bob.email, password: 'Str0ngPassw0rd!' } });
  const cookie = cookieOf(login.setCookie);
  assert.equal((await call('/auth/logout', { method: 'POST', cookie })).status, 204);
  assert.equal((await call('/auth/refresh', { method: 'POST', cookie })).status, 401);
});
