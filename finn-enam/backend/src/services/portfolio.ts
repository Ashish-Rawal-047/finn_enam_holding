/**
 * Portfolio + watchlists. Every query is scoped by the authenticated user's id; there is no
 * code path that reads or writes another user's holdings.
 */
import { and, asc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { MOCK_COMPANIES } from '../content/demo/companies.js';
import { db } from '../db/client.js';
import { companies, portfolioHoldings, signals, watchlistCompanies, watchlists } from '../db/schema.js';
import { ApiError } from '../lib/http.js';
import { providers } from '../providers/registry.js';
import { ProviderUnavailableError } from '../providers/types.js';
import { fanOutNotifications } from './alerts.js';
import { getQuotes } from './market.js';
import { syncCompany } from './companyData.js';

export const companyColumns = {
  id: companies.id,
  name: companies.name,
  nseSymbol: companies.nseSymbol,
  yahooSymbol: companies.yahooSymbol,
  bseCode: companies.bseCode,
  isin: companies.isin,
  sector: companies.sector,
  industry: companies.industry,
  marketCapCategory: companies.marketCapCategory,
  isDemo: companies.isDemo,
};

export async function getPortfolio(userId: string) {
  const holdings = await db
    .select({ ...companyColumns, addedAt: portfolioHoldings.addedAt })
    .from(portfolioHoldings)
    .innerJoin(companies, eq(companies.id, portfolioHoldings.companyId))
    .where(eq(portfolioHoldings.userId, userId))
    .orderBy(asc(companies.name));
  const ids = holdings.map((h) => h.id);
  const [quotes, signalCounts] = await Promise.all([
    getQuotes(ids),
    ids.length
      ? db
          .select({ companyId: signals.companyId, count: sql<number>`count(*)::int` })
          .from(signals)
          .innerJoin(sql`notifications n`, sql`n.signal_id = ${signals.id} and n.user_id = ${userId}`)
          .where(and(inArray(signals.companyId, ids), sql`n.read_at is null and n.archived_at is null`))
          .groupBy(signals.companyId)
      : Promise.resolve([]),
  ]);
  const counts = new Map(signalCounts.map((c) => [c.companyId, c.count]));
  return holdings.map((h) => ({ ...h, quote: quotes.get(h.id) ?? null, activeSignalCount: counts.get(h.id) ?? 0 }));
}

/** Resolves a company by uuid, NSE symbol, BSE code or ISIN; imports it from the provider when possible. */
export async function resolveCompany(ref: { companyId?: string; symbol?: string }) {
  if (ref.companyId) {
    const c = await db.query.companies.findFirst({ where: eq(companies.id, ref.companyId) });
    if (!c) throw ApiError.notFound('Company not found');
    return c;
  }
  const raw = (ref.symbol ?? '').trim();
  if (!raw) throw ApiError.badRequest('Provide companyId or symbol');
  const symbol = raw.toUpperCase().replace(/\.(NS|BO)$/, '');
  const existing = await db.query.companies.findFirst({
    where: or(eq(companies.nseSymbol, symbol), eq(companies.bseCode, symbol), eq(companies.isin, symbol), eq(companies.yahooSymbol, raw.toUpperCase())),
  });
  if (existing) return existing;

  try {
    const record = await providers.companyInfo.getBySymbol(symbol);
    if (!record) throw ApiError.notFound(`No company found for "${raw}" with the configured company-information provider (${providers.companyInfo.info.name}).`);
    const [created] = await db
      .insert(companies)
      .values({ ...record, isDemo: providers.companyInfo.info.isDemo, yahooSymbol: record.yahooSymbol ?? null })
      .onConflictDoNothing()
      .returning();
    const company = created ?? (await db.query.companies.findFirst({ where: eq(companies.nseSymbol, record.nseSymbol ?? symbol) }));
    if (!company) throw ApiError.notFound('Company not found');
    // Pull its market data and statements so it is immediately usable.
    await syncCompany(company.id).catch(() => undefined);
    return company;
  } catch (err) {
    if (err instanceof ProviderUnavailableError) {
      throw ApiError.notFound(`"${raw}" is not in FINN's database and no company-information provider is configured to look it up.`);
    }
    throw err;
  }
}

export async function addToPortfolio(userId: string, ref: { companyId?: string; symbol?: string }) {
  const company = await resolveCompany(ref);
  const inserted = await db
    .insert(portfolioHoldings)
    .values({ userId, companyId: company.id })
    .onConflictDoNothing()
    .returning({ companyId: portfolioHoldings.companyId });
  if (inserted.length) {
    // Surface recent signals for the newly tracked company.
    await fanOutNotifications({ userId, sinceDays: 7 });
  }
  return { company, added: inserted.length > 0 };
}

export async function removeFromPortfolio(userId: string, companyId: string) {
  const removed = await db
    .delete(portfolioHoldings)
    .where(and(eq(portfolioHoldings.userId, userId), eq(portfolioHoldings.companyId, companyId)))
    .returning({ companyId: portfolioHoldings.companyId });
  if (!removed.length) throw ApiError.notFound('Company is not in your portfolio');
  // Keep watchlists consistent with the tracked universe.
  await db.execute(sql`
    delete from watchlist_companies wc using watchlists w
    where wc.watchlist_id = w.id and w.user_id = ${userId} and wc.company_id = ${companyId}`);
}

/** Adds the fixture "watchlist" companies (18) for a quick start. */
export async function addDemoPortfolio(userId: string) {
  const symbols = MOCK_COMPANIES.filter((c) => c.inWatchlist).map((c) => c.ticker.replace('.NS', ''));
  const rows = await db.select({ id: companies.id }).from(companies).where(inArray(companies.nseSymbol, symbols));
  if (rows.length) {
    await db.insert(portfolioHoldings).values(rows.map((r) => ({ userId, companyId: r.id }))).onConflictDoNothing();
    const [core] = await db.select({ id: watchlists.id }).from(watchlists).where(eq(watchlists.userId, userId)).orderBy(asc(watchlists.position)).limit(1);
    if (core) await db.insert(watchlistCompanies).values(rows.map((r) => ({ watchlistId: core.id, companyId: r.id }))).onConflictDoNothing();
  }
  await fanOutNotifications({ userId, sinceDays: 30 });
  return rows.length;
}

export async function searchCompanies(q: string, limit: number) {
  const term = q.trim();
  if (!term) return { items: [], providerSearched: false };
  const like = `%${term.replace(/[%_]/g, '')}%`;
  const local = await db
    .select(companyColumns)
    .from(companies)
    .where(or(ilike(companies.name, like), ilike(companies.nseSymbol, like), ilike(companies.bseCode, like), ilike(companies.isin, like)))
    .orderBy(sql`case when upper(${companies.nseSymbol}) = upper(${term}) then 0 when ${companies.name} ilike ${`${term}%`} then 1 else 2 end`, asc(companies.name))
    .limit(limit);

  // Ask the provider for companies FINN does not hold yet (when one is configured).
  let remote: Array<{ name: string; nseSymbol: string | null; bseCode: string | null; isin: string | null; sector: string | null; yahooSymbol: string | null; exchange: string | null }> = [];
  let providerSearched = false;
  try {
    const found = await providers.companyInfo.search(term, limit);
    providerSearched = true;
    const known = new Set(local.map((c) => c.nseSymbol));
    const knownYahoo = new Set(local.map((c) => (c as { yahooSymbol?: string | null }).yahooSymbol).filter(Boolean));
    // A BSE listing of a company that is also on NSE (or already in FINN) is the same company:
    // offer only the NSE line so it is never imported twice.
    const base = (s: string) => s.replace(/\.(NS|BO)$/i, '').toUpperCase();
    const nseBases = new Set(found.filter((r) => r.yahooSymbol?.toUpperCase().endsWith('.NS')).map((r) => base(r.yahooSymbol!)));
    const localNames = new Set(local.map((c) => c.name.toLowerCase()));
    const sameAsNse = (r: (typeof found)[number]) =>
      Boolean(r.yahooSymbol?.toUpperCase().endsWith('.BO') && (known.has(base(r.yahooSymbol)) || nseBases.has(base(r.yahooSymbol)) || localNames.has(r.name.toLowerCase())));
    remote = found
      .filter((r) => !(r.nseSymbol && known.has(r.nseSymbol)) && !(r.yahooSymbol && knownYahoo.has(r.yahooSymbol)) && !sameAsNse(r))
      .map((r) => ({ name: r.name, nseSymbol: r.nseSymbol, bseCode: r.bseCode, isin: r.isin, sector: r.sector, yahooSymbol: r.yahooSymbol ?? null, exchange: r.exchange ?? null }));
  } catch (err) {
    if (!(err instanceof ProviderUnavailableError)) throw err;
  }
  return { items: local, external: remote, providerSearched, provider: providers.companyInfo.info };
}

// ---------------------------------------------------------------------------
// Watchlists
// ---------------------------------------------------------------------------

export async function listWatchlists(userId: string) {
  const lists = await db.select().from(watchlists).where(eq(watchlists.userId, userId)).orderBy(asc(watchlists.position), asc(watchlists.createdAt));
  const members = lists.length
    ? await db
        .select({ watchlistId: watchlistCompanies.watchlistId, ...companyColumns })
        .from(watchlistCompanies)
        .innerJoin(companies, eq(companies.id, watchlistCompanies.companyId))
        .where(inArray(watchlistCompanies.watchlistId, lists.map((l) => l.id)))
        .orderBy(asc(companies.name))
    : [];
  return lists.map((l) => ({ ...l, companies: members.filter((m) => m.watchlistId === l.id).map(({ watchlistId: _w, ...c }) => c) }));
}

async function ownedWatchlist(userId: string, id: string) {
  const [w] = await db.select().from(watchlists).where(and(eq(watchlists.id, id), eq(watchlists.userId, userId)));
  if (!w) throw ApiError.notFound('Watchlist not found');
  return w;
}

export async function createWatchlist(userId: string, name: string) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(watchlists).where(eq(watchlists.userId, userId));
  if (n >= 20) throw ApiError.unprocessable('You can have at most 20 watchlists');
  try {
    const [w] = await db.insert(watchlists).values({ userId, name: name.trim(), position: n }).returning();
    return w;
  } catch (err) {
    if ((err as { cause?: { code?: string } }).cause?.code === '23505' || (err as { code?: string }).code === '23505') {
      throw ApiError.conflict('A watchlist with this name already exists');
    }
    throw err;
  }
}

export async function renameWatchlist(userId: string, id: string, name: string) {
  await ownedWatchlist(userId, id);
  const [w] = await db.update(watchlists).set({ name: name.trim(), updatedAt: new Date() }).where(eq(watchlists.id, id)).returning();
  return w;
}

export async function deleteWatchlist(userId: string, id: string) {
  await ownedWatchlist(userId, id);
  await db.delete(watchlists).where(eq(watchlists.id, id));
}

export async function addToWatchlist(userId: string, watchlistId: string, ref: { companyId?: string; symbol?: string }) {
  await ownedWatchlist(userId, watchlistId);
  // A watchlist entry implies tracking: the company joins the portfolio too.
  const { company } = await addToPortfolio(userId, ref);
  await db.insert(watchlistCompanies).values({ watchlistId, companyId: company.id }).onConflictDoNothing();
  return company;
}

export async function removeFromWatchlist(userId: string, watchlistId: string, companyId: string) {
  await ownedWatchlist(userId, watchlistId);
  await db.delete(watchlistCompanies).where(and(eq(watchlistCompanies.watchlistId, watchlistId), eq(watchlistCompanies.companyId, companyId)));
}
