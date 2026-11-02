/**
 * Companies, market data and signals.
 */
import { Router } from 'express';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { companies, managementChanges, portfolioHoldings, signals, sourceDocuments } from '../db/schema.js';
import { ApiError, handle, paginated, paginationQuery, parse, uuidParam } from '../lib/http.js';
import { userId } from '../middleware/auth.js';
import { categoryLabel, signalsVisibleTo } from '../services/alerts.js';
import { announcementsForCompany } from '../services/announcements.js';
import { companyReliability } from '../services/events.js';
import { getHistory, getQuotes, type Range } from '../services/market.js';
import { searchCompanies } from '../services/portfolio.js';
import { freshness, importCompany, syncCompany } from '../services/companyData.js';
import { audit } from '../services/audit.js';
import { rateLimit } from '../middleware/rateLimit.js';

// Manual refreshes hit Yahoo Finance directly; keep them polite.
const refreshLimiter = rateLimit({ windowMs: 60_000, max: 6, key: 'refresh' });

export const marketRouter = Router();

marketRouter.get(
  '/companies/search',
  handle(async (req, res) => {
    const { q, limit } = parse(z.object({ q: z.string().trim().max(60).default(''), limit: z.coerce.number().int().min(1).max(25).default(10) }), req.query);
    res.json(await searchCompanies(q, limit));
  }),
);

async function loadCompany(id: string) {
  const company = await db.query.companies.findFirst({ where: eq(companies.id, id) });
  if (!company) throw ApiError.notFound('Company not found');
  return company;
}

marketRouter.post(
  '/companies/import',
  handle(async (req, res) => {
    const { symbol } = parse(z.object({ symbol: z.string().trim().min(1).max(25).regex(/^[A-Za-z0-9&.\-]+$/, 'Invalid symbol') }), req.body);
    const { company, created } = await importCompany(symbol);
    await audit({ userId: userId(req), action: 'company.import', entityType: 'company', entityId: company.id, metadata: { symbol }, req });
    res.status(created ? 201 : 200).json({ company, created, freshness: await freshness(company.id) });
  }),
);

marketRouter.post(
  '/companies/:id/refresh',
  refreshLimiter,
  handle(async (req, res) => {
    const id = parse(uuidParam, req.params.id);
    const result = await syncCompany(id, { force: true });
    res.json({ ...result, freshness: await freshness(id) });
  }),
);

marketRouter.get(
  '/companies/:id/freshness',
  handle(async (req, res) => {
    res.json({ items: await freshness(parse(uuidParam, req.params.id)) });
  }),
);

marketRouter.get(
  '/companies/:id',
  handle(async (req, res) => {
    const id = parse(uuidParam, req.params.id);
    const company = await loadCompany(id);
    const [held] = await db.select().from(portfolioHoldings).where(and(eq(portfolioHoldings.companyId, id), eq(portfolioHoldings.userId, userId(req))));
    res.json({ ...company, inPortfolio: Boolean(held) });
  }),
);

marketRouter.get(
  '/companies/:id/overview',
  handle(async (req, res) => {
    const id = parse(uuidParam, req.params.id);
    const company = await loadCompany(id);
    const [quotes, announcements, mgmt, reliability, held] = await Promise.all([
      getQuotes([id]),
      announcementsForCompany(id, 15),
      db.select().from(managementChanges).where(eq(managementChanges.companyId, id)).orderBy(desc(managementChanges.effectiveDate)).limit(10),
      companyReliability(id),
      db.select().from(portfolioHoldings).where(and(eq(portfolioHoldings.companyId, id), eq(portfolioHoldings.userId, userId(req)))),
    ]);
    res.json({
      company: { ...company, inPortfolio: held.length > 0 },
      quote: quotes.get(id) ?? null,
      announcements: announcements.map((a) => ({ ...a, categoryLabel: categoryLabel(a.category) })),
      managementChanges: mgmt,
      executionReliability: reliability,
    });
  }),
);

const signalQuery = paginationQuery.extend({
  type: z.enum(['price_move', 'volume_spike', 'management_change', 'corporate_announcement', 'financial_result', 'historical_precedent', 'event_update']).optional(),
});

marketRouter.get(
  '/signals',
  handle(async (req, res) => {
    const q = parse(signalQuery, req.query);
    const { total, items } = await signalsVisibleTo(userId(req), { limit: q.pageSize, offset: (q.page - 1) * q.pageSize, type: q.type });
    res.json(paginated(items.map((s) => ({ ...s, categoryLabel: categoryLabel(s.category) })), total, q));
  }),
);

marketRouter.get(
  '/signals/:id',
  handle(async (req, res) => {
    const id = parse(uuidParam, req.params.id);
    const [row] = await db
      .select({ signal: signals, company: { id: companies.id, name: companies.name, nseSymbol: companies.nseSymbol, bseCode: companies.bseCode } })
      .from(signals)
      .innerJoin(companies, eq(companies.id, signals.companyId))
      .where(eq(signals.id, id));
    if (!row) throw ApiError.notFound('Signal not found');
    const docIds = [row.signal.sourceDocumentId, ...row.signal.evidence.map((e) => e.sourceDocumentId)].filter((x): x is string => Boolean(x));
    const docs = docIds.length ? await db.select().from(sourceDocuments).where(inArray(sourceDocuments.id, [...new Set(docIds)])) : [];
    res.json({
      ...row.signal,
      categoryLabel: categoryLabel(row.signal.category),
      company: row.company,
      sourceDocuments: docs,
    });
  }),
);

marketRouter.get(
  '/companies/:id/signals',
  handle(async (req, res) => {
    const id = parse(uuidParam, req.params.id);
    const q = parse(paginationQuery, req.query);
    await loadCompany(id);
    // Company feed is chronological and unfiltered by thresholds: it is the full record.
    const all = await db.select().from(signals).where(eq(signals.companyId, id)).orderBy(desc(signals.occurredAt));
    const page = all.slice((q.page - 1) * q.pageSize, q.page * q.pageSize).map((s) => ({ ...s, categoryLabel: categoryLabel(s.category) }));
    res.json(paginated(page, all.length, q));
  }),
);

marketRouter.get(
  '/market/:companyId',
  handle(async (req, res) => {
    const id = parse(uuidParam, req.params.companyId);
    await loadCompany(id);
    const quote = (await getQuotes([id])).get(id);
    if (!quote) throw ApiError.notFound('No market data is stored for this company yet');
    res.json(quote);
  }),
);

marketRouter.get(
  '/market/:companyId/history',
  handle(async (req, res) => {
    const id = parse(uuidParam, req.params.companyId);
    const { range } = parse(z.object({ range: z.enum(['1W', '1M', '3M', '6M', '1Y', 'MAX']).default('3M') }), req.query);
    await loadCompany(id);
    res.json({ range, ...(await getHistory(id, range as Range)) });
  }),
);
