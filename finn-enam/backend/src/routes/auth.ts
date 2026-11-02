import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { userProfiles, users } from '../db/schema.js';
import { ApiError, handle, parse, uuidParam } from '../lib/http.js';
import { requireAuth, userId } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { audit } from '../services/audit.js';
import {
  changePassword,
  listActiveSessions,
  loginUser,
  registerUser,
  revokeSession,
  revokeSessionByToken,
  rotateRefreshToken,
  type IssuedTokens,
} from '../services/auth.js';
import { forbidDemo, isDemoAccount } from '../services/demo.js';

export const REFRESH_COOKIE = 'finn_rt';

const password = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128)
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Password must contain letters and numbers');

const registerBody = z.object({
  email: z.string().email().max(254),
  password,
  fullName: z.string().trim().min(1).max(120),
  timezone: z.string().max(64).optional(),
});

const loginBody = z.object({ email: z.string().email(), password: z.string().min(1).max(128) });

function meta(req: Request) {
  return { userAgent: req.get('user-agent') ?? undefined, ip: req.ip };
}

function setRefreshCookie(res: Response, tokens: IssuedTokens) {
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    expires: tokens.refreshExpiresAt,
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

async function profileFor(id: string) {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
      fullName: userProfiles.fullName,
      timezone: userProfiles.timezone,
      bio: userProfiles.bio,
      theme: userProfiles.theme,
      isDemoAccount: users.isDemoAccount,
    })
    .from(users)
    .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.id, id));
  if (!row) throw ApiError.unauthorized();
  return row;
}

export const authRouter = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 30, key: 'auth' });

authRouter.post(
  '/register',
  authLimiter,
  handle(async (req, res) => {
    const body = parse(registerBody, req.body);
    const { user, tokens } = await registerUser(body, meta(req));
    await audit({ userId: user.id, action: 'auth.register', req });
    setRefreshCookie(res, tokens);
    res.status(201).json({ accessToken: tokens.accessToken, user: await profileFor(user.id) });
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  handle(async (req, res) => {
    const body = parse(loginBody, req.body);
    const { user, tokens } = await loginUser(body, meta(req));
    await audit({ userId: user.id, action: 'auth.login', req });
    setRefreshCookie(res, tokens);
    res.json({ accessToken: tokens.accessToken, user: await profileFor(user.id) });
  }),
);

authRouter.post(
  '/refresh',
  handle(async (req, res) => {
    const presented = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!presented) throw ApiError.unauthorized('No session');
    try {
      const { user, tokens } = await rotateRefreshToken(presented, meta(req));
      setRefreshCookie(res, tokens);
      res.json({ accessToken: tokens.accessToken, user: await profileFor(user.id) });
    } catch (err) {
      clearRefreshCookie(res);
      throw err;
    }
  }),
);

authRouter.post(
  '/logout',
  handle(async (req, res) => {
    await revokeSessionByToken(req.cookies?.[REFRESH_COOKIE]);
    clearRefreshCookie(res);
    res.status(204).end();
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  handle(async (req, res) => {
    res.json({ user: await profileFor(userId(req)) });
  }),
);

authRouter.get(
  '/sessions',
  requireAuth,
  handle(async (req, res) => {
    const sessions = (await listActiveSessions(userId(req))).map((s) => ({ ...s, current: s.id === req.auth!.sid }));
    // The demo account is shared: other reviewers' sessions (device, IP) are not shown.
    res.json({ items: (await isDemoAccount(userId(req))) ? sessions.filter((s) => s.current) : sessions });
  }),
);

authRouter.delete(
  '/sessions/:id',
  requireAuth,
  forbidDemo('sign out other sessions'),
  handle(async (req, res) => {
    const id = parse(uuidParam, req.params.id);
    if (!(await revokeSession(userId(req), id))) throw ApiError.notFound('Session not found');
    await audit({ userId: userId(req), action: 'auth.session_revoked', entityType: 'session', entityId: id, req });
    res.status(204).end();
  }),
);

authRouter.post(
  '/password',
  requireAuth,
  forbidDemo('change its password'),
  authLimiter,
  handle(async (req, res) => {
    const body = parse(z.object({ currentPassword: z.string().min(1), newPassword: password }), req.body);
    await changePassword(userId(req), body.currentPassword, body.newPassword, req.auth!.sid);
    await audit({ userId: userId(req), action: 'auth.password_changed', req });
    res.status(204).end();
  }),
);
