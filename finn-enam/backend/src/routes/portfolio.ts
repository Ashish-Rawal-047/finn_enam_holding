import { Router } from 'express';
import { z } from 'zod';
import { handle, parse, uuidParam } from '../lib/http.js';
import { userId } from '../middleware/auth.js';
import { audit } from '../services/audit.js';
import {
  addDemoPortfolio,
  addToPortfolio,
  addToWatchlist,
  createWatchlist,
  deleteWatchlist,
  getPortfolio,
  listWatchlists,
  removeFromPortfolio,
  removeFromWatchlist,
  renameWatchlist,
} from '../services/portfolio.js';

const companyRef = z
  .object({ companyId: z.string().uuid().optional(), symbol: z.string().trim().min(1).max(20).optional() })
  .refine((v) => v.companyId || v.symbol, 'Provide companyId or symbol');

export const portfolioRouter = Router();

portfolioRouter.get(
  '/portfolio',
  handle(async (req, res) => {
    const items = await getPortfolio(userId(req));
    res.json({ items, total: items.length });
  }),
);

portfolioRouter.post(
  '/portfolio',
  handle(async (req, res) => {
    const body = parse(companyRef, req.body);
    const { company, added } = await addToPortfolio(userId(req), body);
    await audit({ userId: userId(req), action: 'portfolio.add', entityType: 'company', entityId: company.id, req });
    res.status(added ? 201 : 200).json({ company, added });
  }),
);

portfolioRouter.post(
  '/portfolio/demo',
  handle(async (req, res) => {
    const added = await addDemoPortfolio(userId(req));
    await audit({ userId: userId(req), action: 'portfolio.add_demo', metadata: { added }, req });
    res.status(201).json({ added });
  }),
);

portfolioRouter.delete(
  '/portfolio/:companyId',
  handle(async (req, res) => {
    const companyId = parse(uuidParam, req.params.companyId);
    await removeFromPortfolio(userId(req), companyId);
    await audit({ userId: userId(req), action: 'portfolio.remove', entityType: 'company', entityId: companyId, req });
    res.status(204).end();
  }),
);

// --- watchlists ---------------------------------------------------------------------------

const watchlistName = z.object({ name: z.string().trim().min(1).max(60) });

portfolioRouter.get(
  '/watchlists',
  handle(async (req, res) => {
    res.json({ items: await listWatchlists(userId(req)) });
  }),
);

portfolioRouter.post(
  '/watchlists',
  handle(async (req, res) => {
    const { name } = parse(watchlistName, req.body);
    const w = await createWatchlist(userId(req), name);
    await audit({ userId: userId(req), action: 'watchlist.create', entityType: 'watchlist', entityId: w.id, req });
    res.status(201).json(w);
  }),
);

portfolioRouter.patch(
  '/watchlists/:id',
  handle(async (req, res) => {
    const id = parse(uuidParam, req.params.id);
    const { name } = parse(watchlistName, req.body);
    res.json(await renameWatchlist(userId(req), id, name));
  }),
);

portfolioRouter.delete(
  '/watchlists/:id',
  handle(async (req, res) => {
    const id = parse(uuidParam, req.params.id);
    await deleteWatchlist(userId(req), id);
    await audit({ userId: userId(req), action: 'watchlist.delete', entityType: 'watchlist', entityId: id, req });
    res.status(204).end();
  }),
);

portfolioRouter.post(
  '/watchlists/:id/companies',
  handle(async (req, res) => {
    const id = parse(uuidParam, req.params.id);
    const body = parse(companyRef, req.body);
    res.status(201).json(await addToWatchlist(userId(req), id, body));
  }),
);

portfolioRouter.delete(
  '/watchlists/:id/companies/:companyId',
  handle(async (req, res) => {
    const id = parse(uuidParam, req.params.id);
    const companyId = parse(uuidParam, req.params.companyId);
    await removeFromWatchlist(userId(req), id, companyId);
    res.status(204).end();
  }),
);
