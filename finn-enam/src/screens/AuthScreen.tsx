import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ApiRequestError, apiUrl } from '../lib/api';
import { FinnLogo } from '../components/common/FinnLogo';

/**
 * Public reviewer demo credentials (build-time VITE_DEMO_*). They belong to a dedicated, shared
 * demo account; the backend decides whether that account may sign in (DEMO_MODE_ENABLED).
 */
const DEMO =
  import.meta.env.VITE_DEMO_LOGIN_ENABLED === 'true' && import.meta.env.VITE_DEMO_EMAIL && import.meta.env.VITE_DEMO_PASSWORD
    ? { email: import.meta.env.VITE_DEMO_EMAIL, password: import.meta.env.VITE_DEMO_PASSWORD }
    : null;

export const AuthScreen: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  // Pre-filled, never auto-submitted; the fields stay editable for a normal sign-in.
  const [email, setEmail] = useState(DEMO?.email ?? '');
  const [password, setPassword] = useState(DEMO?.password ?? '');
  const [fullName, setFullName] = useState('');
  // Wake the API while the reviewer reads the page: a free-tier host may be asleep and take
  // up to a minute to start. Fire-and-forget; the sign-in request itself is unchanged.
  useEffect(() => {
    fetch(apiUrl('/health')).catch(() => undefined);
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      if (err instanceof ApiRequestError && Array.isArray(err.details)) {
        setError((err.details as Array<{ message: string }>).map((d) => d.message).join(' '));
      } else {
        setError((err as Error).message);
      }
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void run(() => (mode === 'login' ? login(email, password) : register({ email, password, fullName })));
  };

  const input =
    'w-full rounded-xl border border-divider dark:border-ink-border bg-paper dark:bg-ink-surface px-3.5 py-3 text-sm text-ink dark:text-white placeholder:text-ink-subtle focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest';

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto px-6 py-10 safe-pt safe-pb">
      <div className="my-auto w-full max-w-sm space-y-8">
        <div className="space-y-3">
          <FinnLogo size={40} />
          <h1 className="font-serif text-4xl text-ink dark:text-white leading-tight">
            {mode === 'login' ? 'Welcome back.' : 'Open your desk.'}
          </h1>
          <p className="text-sm text-ink-muted">FINN — institutional investment intelligence for ENAM.</p>
        </div>

        {DEMO && mode === 'login' && (
          <section aria-label="Reviewer demo account" className="flex items-center gap-3 rounded-xl border border-forest/20 bg-sage/60 px-3.5 py-3 dark:border-emerald/25 dark:bg-emerald-subtle/40">
            <UserRoundCheck size={18} strokeWidth={1.75} className="shrink-0 text-forest dark:text-emerald" />
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-forest dark:text-emerald">Reviewer demo account</p>
              <p className="text-[12px] leading-snug text-ink-muted">Pre-filled below · demo data only</p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEmail(DEMO.email);
                setPassword(DEMO.password);
                void run(() => login(DEMO.email, DEMO.password));
              }}
              className="min-h-[40px] shrink-0 rounded-lg border border-forest px-3 text-[12.5px] font-semibold text-forest transition-colors hover:bg-forest hover:text-white disabled:opacity-60 dark:border-emerald dark:text-emerald dark:hover:bg-emerald dark:hover:text-ink-bg"
            >
              Sign in to demo
            </button>
          </section>
        )}

        <form onSubmit={submit} className="space-y-3" noValidate>
          {mode === 'register' && (
            <label className="block space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">Full name</span>
              <input className={input} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
            </label>
          )}
          <label className="block space-y-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">Email</span>
            <input className={input} type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">Password</span>
            <input
              className={input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
            {mode === 'register' && <span className="block text-[11px] text-ink-muted">At least 10 characters, with letters and numbers.</span>}
          </label>

          {error && (
            <p role="alert" className="rounded-xl bg-fin-redBg dark:bg-fin-redBgDark border border-fin-red/30 px-3 py-2 text-xs text-fin-red">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-forest text-white text-sm font-semibold hover:bg-forest-light disabled:opacity-60 transition-colors"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="space-y-4 text-center">
          <button
            type="button"
            onClick={() => {
              const next = mode === 'login' ? 'register' : 'login';
              setMode(next);
              setError(null);
              // A new account never starts from the demo credentials; sign-in restores them if the fields are empty.
              if (next === 'register') {
                if (email === DEMO?.email) setEmail('');
                if (password === DEMO?.password) setPassword('');
              } else if (DEMO && !email && !password) {
                setEmail(DEMO.email);
                setPassword(DEMO.password);
              }
            }}
            className="min-h-[44px] text-sm font-semibold text-forest dark:text-emerald hover:underline"
          >
            {mode === 'login' ? 'New to FINN? Create an account' : 'Already have an account? Sign in'}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-ink-muted">
            <ShieldCheck size={13} /> Passwords are hashed with Argon2id; sessions use rotating refresh tokens.
          </p>
        </div>
      </div>
    </div>
  );
};
