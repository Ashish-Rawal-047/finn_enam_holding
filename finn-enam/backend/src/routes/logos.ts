/**
 * Company logos, served from FINN's own origin. Public (an <img> cannot send the bearer token, and
 * a listed company's logo is public information); nothing user-specific is read or returned.
 */
import { Router } from 'express';
import { ApiError, handle } from '../lib/http.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { getLogo, normalizeSymbol } from '../services/logos.js';

export const logosRouter = Router();

// Generous: a screen shows up to ~25 logos and cached ones are cheap. Resolution of new symbols is
// further limited inside the service.
const limiter = rateLimit({ windowMs: 60_000, max: 300, key: 'logos' });

logosRouter.get(
  '/:symbol',
  limiter,
  handle(async (req, res) => {
    const symbol = normalizeSymbol(String(req.params.symbol));
    if (!symbol) throw ApiError.badRequest('Use a listing symbol such as RELIANCE.NS or 500325.BO');
    const logo = await getLogo(symbol);
    // The page may be on another origin (VITE_API_BASE_URL); the image is public either way.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (logo.status !== 'ok' || !logo.image) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      throw ApiError.notFound('No verified logo for this company');
    }
    res.setHeader('Content-Type', logo.contentType ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // An SVG opened directly must not run scripts or load anything.
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    res.setHeader('X-Logo-Source', logo.source ?? '');
    res.end(logo.image);
  }),
);
