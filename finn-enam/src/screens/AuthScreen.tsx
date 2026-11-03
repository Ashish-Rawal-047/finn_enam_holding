import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ApiRequestError, isServerStarting, waitForServer } from '../lib/api';
import { FinnLogo } from '../components/common/FinnLogo';
import { EASE_OUT } from '../components/motion';

/**
 * Optional pre-filled sign-in (build-time VITE_DEMO_*), for the dedicated demo account only. The
 * fields are filled silently; nothing on the page marks it as a demo. The backend decides whether
 * that account may sign in (DEMO_MODE_ENABLED).
 */
const DEMO =
  import.meta.env.VITE_DEMO_LOGIN_ENABLED === 'true' && import.meta.env.VITE_DEMO_EMAIL && import.meta.env.VITE_DEMO_PASSWORD
    ? { email: import.meta.env.VITE_DEMO_EMAIL, password: import.meta.env.VITE_DEMO_PASSWORD }
    : null;

const rise = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.06 * i, ease: EASE_OUT } });

const input =
  'w-full min-h-[48px] rounded-lg border border-divider bg-paper px-3.5 text-[14.5px] text-ink placeholder:text-ink-subtle transition-colors focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15 dark:border-ink-border dark:bg-ink-surface dark:text-white dark:focus:border-emerald';
const label = 'mb-1.5 block text-[12px] font-medium text-ink-muted';

export const AuthScreen: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  // Pre-filled when configured, never auto-submitted; the fields stay editable for any account.
  const [email, setEmail] = useState(DEMO?.email ?? '');
  const [password, setPassword] = useState(DEMO?.password ?? '');
  const [fullName, setFullName] = useState('');
  // Wake the API while the page is read: a free-tier host may need up to a minute to start.
  // A quiet "Connecting…" appears only if it is not answering within a moment.
  const [server, setServer] = useState<'checking' | 'starting' | 'ready' | 'unreachable'>('checking');
  useEffect(() => {
    let cancelled = false;
    const slow = setTimeout(() => !cancelled && setServer((s) => (s === 'checking' ? 'starting' : s)), 1_500);
    waitForServer().then((ok) => !cancelled && setServer(ok ? 'ready' : 'unreachable'));
    return () => {
      cancelled = true;
      clearTimeout(slow);
    };
  }, []);
  const [error, setError] = useState<string | null>(null);
  // 'connecting': waiting for a sleeping server before sending the credentials.
  const [busy, setBusy] = useState<false | 'connecting' | 'signing-in'>(false);
  // Synchronous guard: a double tap must not send two requests before React re-renders.
  const inFlight = useRef(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    try {
      // Credentials are sent only once the server is answering, so they are never lost to a
      // gateway error mid cold start. Bounded: waitForServer gives up after 90 s.
      setBusy('connecting');
      if (!(await waitForServer())) {
        setServer('unreachable');
        setError('FINN is not responding right now. Check your connection, then try again.');
        return;
      }
      setServer('ready');
      setBusy('signing-in');
      await (mode === 'login' ? login(email, password) : register({ email, password, fullName }));
    } catch (err) {
      if (isServerStarting(err)) setError('FINN could not be reached. Please try again in a moment.');
      else if (err instanceof ApiRequestError && Array.isArray(err.details)) setError((err.details as Array<{ message: string }>).map((d) => d.message).join(' '));
      else setError((err as Error).message);
    } finally {
      // Always release the button, whatever happened (on success this screen unmounts).
      inFlight.current = false;
      setBusy(false);
    }
  };

  const switchMode = () => {
    const next = mode === 'login' ? 'register' : 'login';
    setMode(next);
    setError(null);
    // A new account never starts from the pre-filled credentials; sign-in restores them if empty.
    if (next === 'register') {
      if (email === DEMO?.email) setEmail('');
      if (password === DEMO?.password) setPassword('');
    } else if (DEMO && !email && !password) {
      setEmail(DEMO.email);
      setPassword(DEMO.password);
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-7 py-12 safe-pt safe-pb">
      <div className="my-auto w-full">
        <motion.div {...rise(0)} className="flex items-center gap-2.5">
          <FinnLogo size={30} />
          <span className="font-serif text-[24px] leading-none text-forest-dark dark:text-white">Finn</span>
        </motion.div>

        <motion.div {...rise(1)} className="mt-10">
          <h1 className="font-serif text-[34px] leading-[1.08] text-forest-dark dark:text-white">{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h1>
          <p className="mt-2 text-[13.5px] text-ink-muted">Investment intelligence for ENAM Holdings.</p>
        </motion.div>

        <motion.form {...rise(2)} onSubmit={submit} className="mt-9 space-y-4" noValidate>
          {mode === 'register' && (
            <label className="block">
              <span className={label}>Full name</span>
              <input className={input} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
            </label>
          )}
          <label className="block">
            <span className={label}>Email</span>
            <input className={input} type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label className="block">
            <span className={label}>Password</span>
            <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
            {mode === 'register' && <span className="mt-1.5 block text-[11.5px] text-ink-muted">At least 10 characters, with letters and numbers.</span>}
          </label>

          {error && (
            <p role="alert" className="text-[12.5px] leading-snug text-fin-red">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy !== false}
            aria-busy={busy !== false}
            className="!mt-6 flex w-full min-h-[50px] items-center justify-center gap-2 rounded-lg bg-forest text-[14.5px] font-semibold text-white transition-colors duration-200 hover:bg-forest-light active:scale-[0.99] disabled:opacity-60 dark:bg-emerald dark:text-ink-bg"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {busy === 'connecting' ? 'Connecting…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          {(server === 'starting' || server === 'unreachable') && !error && (
            <p role="status" className="text-center text-[12px] leading-snug text-ink-muted">
              {server === 'starting' ? 'Waking the FINN server. This can take up to a minute after a quiet period.' : 'FINN is not responding. Please try again shortly.'}
            </p>
          )}
        </motion.form>

        <motion.div {...rise(3)} className="mt-8 text-center text-[13px] text-ink-muted">
          {mode === 'login' ? 'New to FINN?' : 'Already have an account?'}{' '}
          <button type="button" onClick={switchMode} className="min-h-[40px] font-semibold text-forest hover:underline dark:text-emerald">
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </button>
        </motion.div>
      </div>
    </div>
  );
};
