import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateForPreferences, type AlertPrefs } from '../src/services/alerts.js';
import { classifyAnnouncement, extractCroreAmount, materialityScore, priorityFromMultiple, priorityFromScore } from '../src/services/classify.js';
import { combineScores, qualifies, scoreStructured, type ComparableEvent } from '../src/services/similarity.js';
import { computeExecution } from '../src/services/events.js';
import { parseCapacity, parseExpectedCompletion, mapEventCategory } from '../src/services/extraction.js';
import { computeVolumeStats, pctChange } from '../src/services/market.js';
import { computeMetrics } from '../src/services/research.js';
import { announcementDedupHash } from '../src/services/announcements.js';
import { tradingDaysBack } from '../src/providers/adapters/demo.js';
import { resolveWindow, zonedMidnight } from '../src/services/digest.js';
import { isRoutineFiling } from '../src/services/classify.js';
import { acceptable, declaredIcons, domainFromWebsite, inspectImage, normalizeSymbol } from '../src/services/logos.js';

const prefs: AlertPrefs = {
  priceMoveThresholdPct: 2.5,
  volumeSurgeMultiple: 2,
  announcementCategories: [],
  managementChangeAlerts: true,
  financialResultAlerts: true,
  eventAlerts: true,
  minimumPriority: 'low',
  inAppNotifications: true,
};

const priceSignal = (changePercent: number) => ({ type: 'price_move', category: 'price_move', priority: 'medium' as const, metrics: { changePercent } });

test('price threshold: default ±2.5% is inclusive and symmetric', () => {
  assert.equal(evaluateForPreferences(priceSignal(2.49), prefs).notify, false);
  assert.equal(evaluateForPreferences(priceSignal(2.5), prefs).notify, true);
  assert.equal(evaluateForPreferences(priceSignal(-2.5), prefs).notify, true);
  assert.equal(evaluateForPreferences(priceSignal(-1.2), prefs).notify, false);
});

test('price priority is relative to the user threshold', () => {
  assert.equal(evaluateForPreferences(priceSignal(3), prefs).priority, 'medium'); // 1.2× threshold
  assert.equal(evaluateForPreferences(priceSignal(5.1), prefs).priority, 'high'); // 2.04×
  assert.equal(evaluateForPreferences(priceSignal(-7.6), prefs).priority, 'critical'); // 3.04×
  // A stricter user sees the same 5.1% move as only medium.
  assert.equal(evaluateForPreferences(priceSignal(5.1), { ...prefs, priceMoveThresholdPct: 5 }).priority, 'medium');
});

test('volume surge threshold uses the configured multiple', () => {
  const v = (volumeRatio: number) => ({ type: 'volume_spike', category: 'volume_spike', priority: 'medium' as const, metrics: { volumeRatio } });
  assert.equal(evaluateForPreferences(v(1.99), prefs).notify, false);
  assert.equal(evaluateForPreferences(v(2), prefs).notify, true);
  assert.equal(evaluateForPreferences(v(3.45), { ...prefs, volumeSurgeMultiple: 3.5 }).notify, false);
});

test('category toggles, minimum priority and master switch are honoured', () => {
  const mgmt = { type: 'management_change', category: 'management_change', priority: 'high' as const, metrics: {} };
  assert.equal(evaluateForPreferences(mgmt, { ...prefs, managementChangeAlerts: false }).notify, false);
  const ann = { type: 'corporate_announcement', category: 'credit_rating', priority: 'medium' as const, metrics: {} };
  assert.equal(evaluateForPreferences(ann, prefs).notify, true, 'empty category list means all');
  assert.equal(evaluateForPreferences(ann, { ...prefs, announcementCategories: ['acquisition'] }).notify, false);
  assert.equal(evaluateForPreferences(ann, { ...prefs, minimumPriority: 'high' }).notify, false);
  assert.equal(evaluateForPreferences(priceSignal(9), { ...prefs, inAppNotifications: false }).notify, false);
});

test('priority bands', () => {
  assert.equal(priorityFromMultiple(0.9), 'low');
  assert.equal(priorityFromMultiple(1), 'medium');
  assert.equal(priorityFromScore(90), 'critical');
  assert.equal(priorityFromScore(64), 'medium');
});

test('classification maps provider labels and refines coarse ones by title', () => {
  assert.equal(classifyAnnouncement('M&A', 'Execution of Share Purchase Agreement'), 'acquisition');
  assert.equal(classifyAnnouncement('press_release', 'Contract Award of ₹26,000 Crore for 240 aero engines'), 'order_win');
  assert.equal(classifyAnnouncement('capex', 'Board approval for new manufacturing facility in Noida'), 'capacity_addition');
  assert.equal(classifyAnnouncement(null, 'Appointment of Mr X as Chief Financial Officer'), 'management_change');
  assert.equal(classifyAnnouncement('unclassified', 'Certificate under Regulation 74(5)'), 'routine');
});

test('materiality: senior roles and large amounts rank higher; routine stays low', () => {
  const cfo = materialityScore({ category: 'management_change', title: 'Appointment of CFO', managementRole: 'Chief Financial Officer' });
  const cs = materialityScore({ category: 'management_change', title: 'Appointment of Company Secretary', managementRole: 'Company Secretary' });
  assert.ok(cfo > cs);
  const big = materialityScore({ category: 'order_win', title: 'Contract award of ₹26,000 Crore' });
  const small = materialityScore({ category: 'order_win', title: 'Contract award of ₹40 Crore' });
  assert.ok(big > small);
  assert.ok(materialityScore({ category: 'routine', title: 'Shareholding pattern' }) < 20);
  assert.equal(extractCroreAmount('capex of ₹1,200 Crore'), 1200);
  assert.equal(extractCroreAmount('Rs. 2.5 lakh crore'), 250000);
  assert.equal(extractCroreAmount('no amount'), null);
});

test('announcement dedup hash ignores case/punctuation and time-of-day', () => {
  const a = announcementDedupHash('c1', 'results', 'Financial Results for Q2!', '2026-10-28T08:30:00Z');
  const b = announcementDedupHash('c1', 'results', 'financial results for q2', '2026-10-28T15:00:00Z');
  const c = announcementDedupHash('c1', 'results', 'financial results for q2', '2026-10-29T08:30:00Z');
  assert.equal(a, b);
  assert.notEqual(a, c);
});

const ev = (over: Partial<ComparableEvent>): ComparableEvent => ({
  id: 'x',
  companyId: 'dixon',
  category: 'manufacturing_facility',
  projectType: 'electronics assembly',
  title: 'Notebook assembly plant',
  originalAnnouncement: 'New facility for notebook and IT hardware assembly in Noida',
  expectedCapexCr: 250,
  expectedCapacityUnit: null,
  ...over,
});

test('similar-event scoring: same company + category + project type qualifies', () => {
  const current = ev({ id: 'new', title: 'Display modules and notebook EMS facility', originalAnnouncement: 'Capex for display modules and notebook EMS facility in Greater Noida', expectedCapexCr: 1200 });
  const { score, matchedOn } = scoreStructured(current, ev({}));
  assert.ok(score >= 0.7, `score ${score}`);
  assert.ok(matchedOn.includes('same company'));
  assert.ok(qualifies(current, ev({}), combineScores(score, null)));
});

test('similar-event scoring: embeddings alone never match unrelated events', () => {
  const other = ev({ companyId: 'trent', category: 'acquisition', projectType: 'retail stores', title: 'Acquire stake', originalAnnouncement: 'Share purchase agreement', expectedCapexCr: null });
  const { score } = scoreStructured(ev({}), other);
  const combined = combineScores(score, 0.99);
  assert.equal(qualifies(ev({}), other, combined), false);
});

test('execution metrics: delay, durations, capex variance and accuracy', () => {
  const event = { announcedAt: '2023-11-14', expectedCompletionDate: '2024-12-31', expectedCapexCr: 250, expectedCapacityValue: null };
  const late = computeExecution(event, 'completed', { actualCompletionDate: '2025-07-31', actualCapexCr: 300 });
  assert.equal(late.delayDays, 212);
  assert.equal(late.capexVariancePct, 20);
  assert.equal(late.guidanceAccuracy, 'major_slip');
  const onTime = computeExecution(event, 'completed', { actualCompletionDate: '2025-01-15', actualCapexCr: 255 });
  assert.equal(onTime.guidanceAccuracy, 'accurate');
  assert.equal(computeExecution(event, 'abandoned', {}).guidanceAccuracy, 'missed');
  const delayed = computeExecution(event, 'delayed', { revisedCompletionDate: '2025-03-31' });
  assert.equal(delayed.delayDays, 90);
  assert.equal(delayed.guidanceAccuracy, 'minor_slip');
});

test('timeline parsing from announcement text', () => {
  assert.equal(parseExpectedCompletion('commercial production by Q3 FY25', '2023-11-14'), '2024-12-31');
  assert.equal(parseExpectedCompletion('to be commissioned by December 2026', '2025-01-01'), '2026-12-31');
  assert.equal(parseExpectedCompletion('complete within 18 months', '2024-01-15'), '2025-07-15');
  assert.equal(parseExpectedCompletion('by FY27', '2025-01-01'), '2027-03-31');
  assert.equal(parseExpectedCompletion('no date mentioned', '2025-01-01'), null);
  assert.deepEqual(parseCapacity('adding 500 MW of capacity'), { value: 500, unit: 'MW' });
  assert.equal(mapEventCategory('capacity_addition', 'new plant in Pune'), 'manufacturing_facility');
  assert.equal(mapEventCategory('results', 'Q2 results'), null);
});

test('volume stats exclude the current session from its own baseline', () => {
  const candles = Array.from({ length: 21 }, (_, i) => ({ tradeDate: `d${i}`, volume: i === 20 ? 3000 : 1000 }));
  const stats = computeVolumeStats(candles);
  assert.equal(stats[19].volumeRatio, null, 'fewer than 20 prior sessions');
  assert.equal(stats[20].avgVolume20d, 1000);
  assert.equal(stats[20].volumeRatio, 3);
  assert.equal(pctChange(102.5, 100), 2.5);
});

test('research metrics are computed only from disclosed values', () => {
  const metrics = computeMetrics({
    periodType: 'annual',
    revenue: 1000,
    ebitda: 150,
    pat: 80,
    totalEquity: 400,
    ebit: 120,
    capitalEmployed: 600,
    borrowings: 100,
    operatingCashFlow: 96,
    capex: 40,
    receivables: null,
    inventory: null,
    payables: null,
  } as never);
  const get = (label: string) => metrics.find((m) => m.label === label)!.value;
  assert.equal(get('EBITDA margin'), 15);
  assert.equal(get('ROE'), 20);
  assert.equal(get('ROCE'), 20);
  assert.equal(get('Debt to equity'), 0.25);
  assert.equal(get('CFO / PAT'), 1.2);
  assert.equal(get('Free cash flow'), 56);
  assert.equal(get('Receivable days'), null, 'missing inputs stay unavailable');
});

test('demo calendar skips weekends', () => {
  const days = tradingDaysBack('2026-10-28', 5);
  assert.deepEqual(days, ['2026-10-22', '2026-10-23', '2026-10-26', '2026-10-27', '2026-10-28']);
});

test('digest window: rolling windows end now; custom ranges cover whole local days', () => {
  const now = new Date('2026-11-03T06:00:00Z');
  const day = resolveWindow({ window: '24h' }, now, 'Asia/Kolkata');
  assert.equal(day.end.getTime() - day.start.getTime(), 24 * 3_600_000);
  assert.equal(resolveWindow({ window: '7d' }, now, 'Asia/Kolkata').start.toISOString(), '2026-10-27T06:00:00.000Z');

  const custom = resolveWindow({ window: 'custom', from: '2026-10-25', to: '2026-10-27' }, now, 'Asia/Kolkata');
  assert.equal(custom.start.toISOString(), '2026-10-24T18:30:00.000Z', 'IST midnight');
  assert.equal(custom.end.toISOString(), '2026-10-27T18:30:00.000Z', 'end of the "to" day, exclusive');
  assert.equal(zonedMidnight('2026-03-08', 'America/New_York').toISOString(), '2026-03-08T05:00:00.000Z', 'before the DST switch');
  assert.equal(zonedMidnight('2026-03-09', 'America/New_York').toISOString(), '2026-03-09T04:00:00.000Z', 'after the DST switch');

  assert.throws(() => resolveWindow({ window: 'custom', from: '2026-10-28' }, now, 'Asia/Kolkata'), /both/);
  assert.throws(() => resolveWindow({ window: 'custom', from: '2026-10-29', to: '2026-10-28' }, now, 'Asia/Kolkata'), /on or before/);
  assert.throws(() => resolveWindow({ window: 'custom', from: '2026-11-04', to: '2026-11-05' }, now, 'Asia/Kolkata'), /future/);
  assert.throws(() => resolveWindow({ window: 'custom', from: '2025-01-01', to: '2026-11-03' }, now, 'Asia/Kolkata'), /366/);
});

test('routine filings: the same rule hides them from alerts and folds them in the digest', () => {
  assert.equal(isRoutineFiling('routine', 90), true);
  assert.equal(isRoutineFiling('investor_meeting', 10), true);
  assert.equal(isRoutineFiling('dividend', 25), false);
});

test('logos: symbols are normalised; domains come only from a provider-reported website', () => {
  assert.equal(normalizeSymbol('reliance'), 'RELIANCE.NS');
  assert.equal(normalizeSymbol('500325.bo'), '500325.BO');
  assert.equal(normalizeSymbol('M&M.NS'), 'M&M.NS');
  assert.equal(normalizeSymbol('../etc/passwd'), null);
  assert.equal(domainFromWebsite('https://www.ril.com'), 'ril.com');
  assert.equal(domainFromWebsite('https://www.aboutbajajfinserv.com/finance-about-us'), 'aboutbajajfinserv.com');
  assert.equal(domainFromWebsite('hal-india.co.in'), 'hal-india.co.in');
  assert.equal(domainFromWebsite(null), null, 'no website, no domain: never guessed from the name');
  assert.equal(domainFromWebsite('http://127.0.0.1/admin'), null, 'IP literals are not company domains');
  assert.equal(domainFromWebsite('http://localhost:3001'), null);
});

test('logos: only real, roughly square images of at least 16 px are accepted', () => {
  const png = (w: number, h: number) => {
    const b = Buffer.alloc(32);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
    b.writeUInt32BE(w, 16);
    b.writeUInt32BE(h, 20);
    return b;
  };
  assert.deepEqual(inspectImage(png(128, 128)), { contentType: 'image/png', width: 128, height: 128 });
  assert.equal(acceptable(inspectImage(png(128, 128))!), true);
  assert.equal(acceptable(inspectImage(png(8, 8))!), false, 'too small');
  assert.equal(acceptable(inspectImage(png(600, 100))!), false, 'a banner, not a logo');
  const ico = Buffer.alloc(40);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(2, 4);
  ico[6] = 16;
  ico[22] = 0; // 0 = 256 px
  assert.equal(inspectImage(ico)?.width, 256, 'largest icon in an .ico');
  assert.equal(inspectImage(Buffer.from('<html><body>Not found</body></html>')), null, 'an HTML error page is not an image');
  assert.equal(inspectImage(Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>'))?.contentType, 'image/svg+xml');
});

test('logos: icons declared by the official homepage, largest first', () => {
  const html = `<head><link rel="icon" href="/favicon-32x32.png" sizes="32x32"><link href="/apple-touch-icon.png" rel="apple-touch-icon" sizes="180x180"><link rel="manifest" href="/site.webmanifest"><link rel="stylesheet" href="/a.css"></head>`;
  const icons = declaredIcons(html, 'https://www.polycab.com/');
  assert.deepEqual(icons.filter((i) => !i.manifest).map((i) => i.url), ['https://www.polycab.com/apple-touch-icon.png', 'https://www.polycab.com/favicon-32x32.png']);
  assert.ok(icons.some((i) => i.manifest && i.url === 'https://www.polycab.com/site.webmanifest'));
});
