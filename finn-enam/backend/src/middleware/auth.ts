import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../lib/http.js';
import { verifyAccessToken, type AccessClaims } from '../services/auth.js';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AccessClaims;
  }
}

/** Requires a valid `Authorization: Bearer <access token>` header. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(ApiError.unauthorized());
    return;
  }
  try {
    req.auth = verifyAccessToken(header.slice('Bearer '.length).trim());
    next();
  } catch (err) {
    next(err);
  }
}

export function userId(req: Request): string {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth.sub;
}
