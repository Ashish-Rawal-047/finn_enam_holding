/**
 * The reviewer demo account: one dedicated login whose credentials are intentionally public (the
 * login page pre-fills them when demo mode is on). It is never a personal account and holds only
 * the demonstration portfolio.
 *
 * Several reviewers share it, so the API refuses anything that would change data other users see
 * or let one reviewer affect another: shared Event Memory records, the account's identity
 * (password, name), and other reviewers' sessions, which are also hidden. With demo mode off the
 * account cannot sign in at all (see assertDemoAllowed in auth.ts).
 */
import { verify } from '@node-rs/argon2';
import type { NextFunction, Request, Response } from 'express';
import { eq, sql } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { userProfiles, users } from '../db/schema.js';
import { ApiError } from '../lib/http.js';
import { userId } from '../middleware/auth.js';
import { createAccount, hashPassword } from './auth.js';
import { addDemoPortfolio } from './portfolio.js';

export type DemoSetup = 'disabled' | 'unconfigured' | 'created' | 'up to date' | 'password reset from DEMO_USER_PASSWORD';

/**
 * Creates or updates the reviewer account from DEMO_USER_EMAIL / DEMO_USER_PASSWORD. Idempotent:
 * re-running never duplicates the account; a changed password is re-hashed; the demo portfolio is
 * topped up. Refuses to take over an existing personal account with the same email.
 *
 * Every environment sharing the database (local API, Render) must use the same DEMO_USER_PASSWORD,
 * or each start-up resets the password to its own value; the result says when that happened.
 */
export async function ensureDemoAccount(): Promise<DemoSetup> {
  if (!env.DEMO_MODE_ENABLED) return 'disabled';
  const email = env.DEMO_USER_EMAIL?.trim().toLowerCase();
  const password = env.DEMO_USER_PASSWORD;
  if (!email || !password) return 'unconfigured';

  let user = await db.query.users.findFirst({ where: sql`lower(${users.email}) = ${email}` });
  let result: DemoSetup = 'up to date';
  if (!user) {
    user = await createAccount({ email, password, fullName: env.DEMO_USER_NAME, isDemoAccount: true });
    result = 'created';
  } else {
    if (!user.isDemoAccount) {
      throw new Error('DEMO_USER_EMAIL belongs to an existing personal account. Use a dedicated address for the reviewer demo.');
    }
    if (!(await verify(user.passwordHash, password))) {
      await db.update(users).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(users.id, user.id));
      result = 'password reset from DEMO_USER_PASSWORD';
    }
    await db.update(userProfiles).set({ fullName: env.DEMO_USER_NAME }).where(eq(userProfiles.userId, user.id));
  }
  await addDemoPortfolio(user.id);
  demoCache.set(user.id, { demo: true, expires: Date.now() + CACHE_MS });
  return result;
}

const CACHE_MS = 60_000;
const demoCache = new Map<string, { demo: boolean; expires: number }>();

export async function isDemoAccount(id: string) {
  const hit = demoCache.get(id);
  if (hit && hit.expires > Date.now()) return hit.demo;
  const [row] = await db.select({ demo: users.isDemoAccount }).from(users).where(eq(users.id, id));
  const demo = Boolean(row?.demo);
  demoCache.set(id, { demo, expires: Date.now() + CACHE_MS });
  return demo;
}

/** Route guard: the shared demo account may not perform `action`. Enforced server-side. */
export function forbidDemo(action: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    isDemoAccount(userId(req))
      .then((demo) => next(demo ? ApiError.forbidden(`The shared reviewer demo account can’t ${action}. Create your own account to try this.`) : undefined))
      .catch(next);
  };
}
