/**
 * Measures research latency per stage against the real providers (Yahoo Finance + AI).
 *   npx tsx scripts/bench-research.ts ITC.NS RELIANCE.NS TCS.NS TRENT.NS
 * For each company:
 *   cold      – refetch all data and regenerate AI (worst case)
 *   warmData  – cached data, regenerate AI ("Refresh research")
 *   cacheHit  – nothing changed: the stored report is reused
 * "firstContentMs" is when facts and calculated metrics are ready to display.
 * Prints timings and token counts only (no credentials, no user data).
 */
import { eq } from 'drizzle-orm';
import { db, pool } from '../src/db/client.js';
import { companies } from '../src/db/schema.js';
import { generateReport } from '../src/services/research.js';

const symbols = process.argv.slice(2);

async function measure(companyId: string, opts: { refreshData?: boolean; forceAi?: boolean }) {
  const start = performance.now();
  let firstContentMs: number | null = null;
  const r = await generateReport(companyId, null, {
    ...opts,
    onProgress: (p) => {
      if (firstContentMs === null && p.sections) firstContentMs = Math.round(performance.now() - start);
    },
  });
  const t = r.timings as { totalMs: number; data?: { totalMs: number; fetchMs?: number; providerMs?: Record<string, number>; writeMs?: Record<string, number> }; ai?: { totalMs: number; groups: Record<string, { ms: number; inputTokens?: number; outputTokens?: number; reasoningTokens?: number; error?: string }> }; persistMs?: number; contextMs?: number };
  const sections = r.report.sections as Record<string, { status: string; claims: Array<{ claimType: string }> }>;
  const aiClaims = Object.values(sections).reduce((n, s) => n + s.claims.filter((c) => c.claimType === 'ai_interpretation').length, 0);
  return {
    totalMs: Math.round(performance.now() - start),
    firstContentMs,
    reused: r.reused,
    dataMs: t.data?.totalMs,
    fetchMs: t.data?.fetchMs,
    providerMs: t.data?.providerMs,
    writeMs: t.data?.writeMs,
    contextMs: t.contextMs,
    aiMs: t.ai?.totalMs,
    aiGroups: t.ai?.groups,
    persistMs: t.persistMs,
    aiClaims,
    status: r.report.status,
    generator: r.report.generator,
  };
}

for (const symbol of symbols) {
  const company = await db.query.companies.findFirst({ where: eq(companies.yahooSymbol, symbol) });
  if (!company) {
    console.log(symbol, 'not in FINN');
    continue;
  }
  const cold = await measure(company.id, { refreshData: true, forceAi: true });
  // BENCH_SKIP_WARM=1 saves AI quota (free tiers allow few requests per day).
  const warmData = process.env.BENCH_SKIP_WARM ? null : await measure(company.id, { forceAi: true });
  const cacheHit = await measure(company.id, {});
  console.log(JSON.stringify({ symbol, cold, warmData: warmData && { totalMs: warmData.totalMs, firstContentMs: warmData.firstContentMs, aiMs: warmData.aiMs, aiClaims: warmData.aiClaims }, cacheHit: { totalMs: cacheHit.totalMs, reused: cacheHit.reused } }));
}
await pool.end();
