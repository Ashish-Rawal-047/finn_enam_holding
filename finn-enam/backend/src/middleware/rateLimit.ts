import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../lib/http.js';

/**
 * Fixed-window in-process rate limiter. Adequate for a single instance; a multi-instance
 * deployment should move this to a shared store (e.g. Upstash Redis).
 */
export function rateLimit(opts: { windowMs: number; max: number; key: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const k = `${opts.key}:${req.ip}`;
    const entry = hits.get(k);
    if (!entry || entry.resetAt <= now) {
      hits.set(k, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > opts.max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      next(new ApiError(429, 'RATE_LIMITED', 'Too many attempts. Please wait and try again.'));
      return;
    }
    next();
  };
}
