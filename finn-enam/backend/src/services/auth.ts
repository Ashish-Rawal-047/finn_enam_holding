/**
 * Authentication: argon2id password hashing, short-lived JWT access tokens, and
 * rotating refresh tokens bound to a server-side session row.
 *
 * Refresh tokens are JWTs signed with JWT_REFRESH_SECRET carrying the session id. The
 * database stores only a SHA-256 hash of the current token. Presenting a superseded
 * token (reuse) revokes the whole session.
 */
import crypto from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import jwt from 'jsonwebtoken';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { alertPreferences, authSessions, userProfiles, users, watchlists } from '../db/schema.js';
import { ApiError } from '../lib/http.js';

const ARGON2_OPTS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const; // OWASP baseline

export interface AccessClaims {
  sub: string;
  email: string;
  sid: string;
}

export const hashPassword = (password: string) => hash(password, ARGON2_OPTS);

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function signAccessToken(claims: AccessClaims): string {
  return jwt.sign(claims, env.JWT_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    issuer: 'finn',
    audience: 'finn-api',
  });
}

export function verifyAccessToken(token: string): AccessClaims {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { issuer: 'finn', audience: 'finn-api' }) as jwt.JwtPayload;
    if (typeof decoded.sub !== 'string' || typeof decoded.email !== 'string' || typeof decoded.sid !== 'string') {
      throw new Error('bad claims');
    }
    return { sub: decoded.sub, email: decoded.email, sid: decoded.sid };
  } catch {
    throw ApiError.unauthorized('Access token is invalid or expired');
  }
}

function signRefreshToken(sessionId: string, userId: string): string {
  return jwt.sign({ sid: sessionId, sub: userId, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
    issuer: 'finn',
    audience: 'finn-refresh',
  });
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  sessionId: string;
}

async function createSession(
  user: { id: string; email: string },
  meta: { userAgent?: string; ip?: string },
): Promise<IssuedTokens> {
  const refreshExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  const sessionId = crypto.randomUUID();
  const refreshToken = signRefreshToken(sessionId, user.id);
  await db.insert(authSessions).values({
    id: sessionId,
    userId: user.id,
    tokenHash: sha256(refreshToken),
    userAgent: meta.userAgent?.slice(0, 300),
    ipAddress: meta.ip,
    expiresAt: refreshExpiresAt,
  });
  return {
    accessToken: signAccessToken({ sub: user.id, email: user.email, sid: sessionId }),
    refreshToken,
    refreshExpiresAt,
    sessionId,
  };
}

/** Creates a user with profile, default alert settings and a first watchlist (no session). */
export async function createAccount(input: { email: string; password: string; fullName: string; timezone?: string; isDemoAccount?: boolean }) {
  const email = input.email.trim().toLowerCase();
  const existing = await db.query.users.findFirst({ where: sql`lower(${users.email}) = ${email}` });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await hashPassword(input.password);
  return db.transaction(async (tx) => {
    const [created] = await tx.insert(users).values({ email, passwordHash, isDemoAccount: input.isDemoAccount ?? false }).returning();
    await tx.insert(userProfiles).values({
      userId: created.id,
      fullName: input.fullName.trim(),
      timezone: input.timezone ?? 'Asia/Kolkata',
    });
    await tx.insert(alertPreferences).values({ userId: created.id });
    await tx.insert(watchlists).values({ userId: created.id, name: 'Core Portfolio', position: 0 });
    return created;
  });
}

export async function registerUser(
  input: { email: string; password: string; fullName: string; timezone?: string },
  meta: { userAgent?: string; ip?: string },
) {
  const user = await createAccount(input);
  return { user, tokens: await createSession(user, meta) };
}

export async function loginUser(input: { email: string; password: string }, meta: { userAgent?: string; ip?: string }) {
  const email = input.email.trim().toLowerCase();
  const user = await db.query.users.findFirst({ where: sql`lower(${users.email}) = ${email}` });
  // Verify against a dummy hash when the user is unknown so timing does not reveal accounts.
  const ok = user
    ? await verify(user.passwordHash, input.password)
    : await verify(DUMMY_HASH, input.password).then(() => false);
  if (!user || !ok) throw ApiError.unauthorized('Email or password is incorrect');
  assertDemoAllowed(user);
  return { user, tokens: await createSession(user, meta) };
}

const DUMMY_HASH = await hashPassword(crypto.randomBytes(16).toString('hex'));

/** With demo mode off, the public reviewer credentials stop working (sign-in and session refresh). */
function assertDemoAllowed(user: { isDemoAccount: boolean }) {
  if (user.isDemoAccount && !env.DEMO_MODE_ENABLED) throw ApiError.forbidden('Reviewer demo access is currently disabled.');
}

export async function rotateRefreshToken(presented: string, meta: { userAgent?: string; ip?: string }) {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(presented, env.JWT_REFRESH_SECRET, { issuer: 'finn', audience: 'finn-refresh' }) as jwt.JwtPayload;
  } catch {
    throw ApiError.unauthorized('Session expired. Please sign in again.');
  }
  const sessionId = String(payload.sid);
  const session = await db.query.authSessions.findFirst({ where: eq(authSessions.id, sessionId) });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw ApiError.unauthorized('Session expired. Please sign in again.');
  }
  if (session.tokenHash !== sha256(presented)) {
    // An older token from this session was replayed: assume theft and kill the session.
    await db.update(authSessions).set({ revokedAt: new Date() }).where(eq(authSessions.id, sessionId));
    throw ApiError.unauthorized('Session was revoked for your security. Please sign in again.');
  }
  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user) throw ApiError.unauthorized();
  assertDemoAllowed(user);

  const refreshToken = signRefreshToken(sessionId, user.id);
  // Compare-and-swap on the old hash so two concurrent refreshes cannot both win.
  const updated = await db
    .update(authSessions)
    .set({ tokenHash: sha256(refreshToken), lastUsedAt: new Date(), userAgent: meta.userAgent?.slice(0, 300), ipAddress: meta.ip })
    .where(and(eq(authSessions.id, sessionId), eq(authSessions.tokenHash, session.tokenHash)))
    .returning({ id: authSessions.id });
  if (updated.length === 0) throw ApiError.unauthorized('Session was refreshed elsewhere. Please retry.');

  return {
    user,
    tokens: {
      accessToken: signAccessToken({ sub: user.id, email: user.email, sid: sessionId }),
      refreshToken,
      refreshExpiresAt: session.expiresAt,
      sessionId,
    } satisfies IssuedTokens,
  };
}

export async function revokeSessionByToken(presented: string | undefined): Promise<void> {
  if (!presented) return;
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(authSessions.tokenHash, sha256(presented)), isNull(authSessions.revokedAt)));
}

export async function listActiveSessions(userId: string) {
  return db
    .select({
      id: authSessions.id,
      userAgent: authSessions.userAgent,
      ipAddress: authSessions.ipAddress,
      createdAt: authSessions.createdAt,
      lastUsedAt: authSessions.lastUsedAt,
      expiresAt: authSessions.expiresAt,
    })
    .from(authSessions)
    .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt), gt(authSessions.expiresAt, new Date())))
    .orderBy(sql`${authSessions.lastUsedAt} desc`);
}

export async function revokeSession(userId: string, sessionId: string): Promise<boolean> {
  const rows = await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(authSessions.id, sessionId), eq(authSessions.userId, userId), isNull(authSessions.revokedAt)))
    .returning({ id: authSessions.id });
  return rows.length > 0;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string, keepSessionId?: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || !(await verify(user.passwordHash, currentPassword))) {
    throw ApiError.unauthorized('Current password is incorrect');
  }
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() }).where(eq(users.id, userId));
    // Sign out every other device.
    await tx
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(authSessions.userId, userId),
          isNull(authSessions.revokedAt),
          keepSessionId ? sql`${authSessions.id} <> ${keepSessionId}` : sql`true`,
        ),
      );
  });
}
