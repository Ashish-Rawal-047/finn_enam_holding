import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Bell, BellRing, Building2, Check, ChevronLeft, ChevronRight, Globe, KeyRound, ListChecks, LogOut, Monitor, Pencil, Plus, SunMoon, Trash2, UserRound, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  useAddDemoPortfolio,
  useAddToPortfolio,
  useAlertSettings,
  useHealth,
  usePortfolio,
  useRemoveFromPortfolio,
  useSessionMutations,
  useSessions,
  useSettings,
  useUpdateAlerts,
  useUpdateProfile,
  useWatchlistMutations,
  useWatchlists,
} from '../lib/queries';
import { dateTime } from '../lib/format';
import type { AlertPreferences, Priority } from '../lib/types';
import { CompanyPicker } from '../components/company/CompanyPicker';
import { Change, DemoPill, EmptyState, ErrorState, Eyebrow, Field, LoadingBlock, Panel, PrimaryButton, ScreenTitle, SecondaryButton, SectionTitle, Spinner, Ticker, cx, inputCls } from '../components/ui';
import { CompanyLogo } from '../components/company/CompanyLogo';
import { scrollAppToTop } from '../components/layout/AppShell';

type Page = 'profile' | 'companies' | 'watchlists' | 'alerts' | 'notifications' | 'security' | 'status';

const PAGE_TITLE: Record<Page, string> = {
  profile: 'Profile',
  companies: 'Tracked companies',
  watchlists: 'Watchlists',
  alerts: 'Alert triggers',
  notifications: 'Notifications',
  security: 'Password & sessions',
  status: 'System status',
};

/**
 * Settings as a phone settings list: grouped rows showing their current value, each opening a
 * sub-page with a back control. Appearance switches in place; sign out is its own row.
 */
export const SettingsScreen: React.FC<{ theme: 'light' | 'dark'; onSetTheme: (t: 'light' | 'dark') => void; onOpenCompany: (id: string) => void }> = ({
  theme,
  onSetTheme,
  onOpenCompany,
}) => {
  const [page, setPage] = useState<Page | null>(null);
  const go = (p: Page | null) => {
    setPage(p);
    scrollAppToTop();
  };

  if (page) {
    return (
      <div className="space-y-4 pt-2">
        <button onClick={() => go(null)} className="-ml-1.5 inline-flex min-h-[40px] items-center gap-0.5 text-[13px] font-medium text-forest dark:text-emerald">
          <ChevronLeft size={18} strokeWidth={2} /> Settings
        </button>
        <h1 className="font-serif text-[24px] leading-tight text-forest-dark dark:text-white">{PAGE_TITLE[page]}</h1>
        {page === 'profile' && <ProfileSection />}
        {page === 'companies' && <PortfolioSection onOpenCompany={onOpenCompany} />}
        {page === 'watchlists' && <WatchlistsPanel />}
        {page === 'alerts' && <AlertsSection part="triggers" />}
        {page === 'notifications' && <AlertsSection part="notifications" />}
        {page === 'security' && <SecuritySection />}
        {page === 'status' && <SystemStatus />}
      </div>
    );
  }
  return <SettingsHome theme={theme} onSetTheme={onSetTheme} onOpen={go} />;
};

const SettingsHome: React.FC<{ theme: 'light' | 'dark'; onSetTheme: (t: 'light' | 'dark') => void; onOpen: (p: Page) => void }> = ({ theme, onSetTheme, onOpen }) => {
  const { user, logout } = useAuth();
  const settings = useSettings();
  const portfolio = usePortfolio();
  const lists = useWatchlists();
  const prefs = useAlertSettings();
  const update = useUpdateProfile();
  const profile = settings.data?.profile;
  const name = profile?.fullName ?? user?.fullName ?? '';
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-5 pt-5">
      <ScreenTitle title="Settings" />

      <button onClick={() => onOpen('profile')} className="flex w-full items-center gap-3 rounded-card border border-divider bg-paper px-4 py-3.5 text-left transition-colors hover:bg-cream-light dark:border-ink-border dark:bg-ink-surface dark:hover:bg-ink-surfaceSubtle">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage font-serif text-[17px] text-forest dark:bg-emerald-subtle dark:text-emerald" aria-hidden>
          {initials || <UserRound size={18} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-medium text-ink dark:text-white">{name || 'Your profile'}</span>
          <span className="block truncate text-[12px] text-ink-muted">{user?.email}</span>
        </span>
        <ChevronRight size={17} strokeWidth={1.75} className="shrink-0 text-ink-subtle" />
      </button>

      <SettingsGroup title="Portfolio">
        <SettingsRow icon={<Building2 size={17} />} label="Tracked companies" value={portfolio.data ? String(portfolio.data.length) : undefined} onClick={() => onOpen('companies')} />
        <SettingsRow icon={<ListChecks size={17} />} label="Watchlists" value={lists.data ? String(lists.data.length) : undefined} onClick={() => onOpen('watchlists')} />
      </SettingsGroup>

      <SettingsGroup title="Alerts & notifications">
        <SettingsRow
          icon={<BellRing size={17} />}
          label="Alert triggers"
          value={prefs.data ? `±${prefs.data.priceMoveThresholdPct}% · ${prefs.data.volumeSurgeMultiple}×` : undefined}
          onClick={() => onOpen('alerts')}
        />
        <SettingsRow icon={<Bell size={17} />} label="Notifications" value={prefs.data ? (prefs.data.inAppNotifications ? `On · ${prefs.data.minimumPriority}+` : 'Off') : undefined} onClick={() => onOpen('notifications')} />
      </SettingsGroup>

      <SettingsGroup title="Preferences">
        <li className="flex min-h-[52px] items-center gap-3 px-4">
          <span className="text-ink-muted" aria-hidden>
            <SunMoon size={17} />
          </span>
          <span className="flex-1 text-[14px] text-ink dark:text-white">Appearance</span>
          <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-2 rounded-lg bg-cream-dark p-0.5 dark:bg-ink-surfaceSubtle">
            {(['light', 'dark'] as const).map((t) => (
              <button
                key={t}
                role="radio"
                aria-checked={theme === t}
                onClick={() => {
                  onSetTheme(t);
                  update.mutate({ theme: t });
                }}
                className={cx('min-h-[32px] rounded-md px-3 text-[12.5px] font-medium capitalize transition-colors', theme === t ? 'bg-paper text-ink shadow-card dark:bg-ink-surface dark:text-white' : 'text-ink-muted')}
              >
                {t}
              </button>
            ))}
          </div>
        </li>
        <SettingsRow icon={<Globe size={17} />} label="Time zone" value={profile?.timezone} onClick={() => onOpen('profile')} />
      </SettingsGroup>

      <SettingsGroup title="Account">
        <SettingsRow icon={<KeyRound size={17} />} label="Password & sessions" onClick={() => onOpen('security')} />
        <SettingsRow icon={<Activity size={17} />} label="System status" onClick={() => onOpen('status')} />
        <li>
          <button onClick={() => logout()} className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-[14px] font-medium text-fin-red">
            <LogOut size={17} aria-hidden /> Sign out
          </button>
        </li>
      </SettingsGroup>
    </div>
  );
};

const SettingsGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-1.5">
    <Eyebrow className="px-1">{title}</Eyebrow>
    <ul className="divide-y divide-divider overflow-hidden rounded-card border border-divider bg-paper dark:divide-ink-border dark:border-ink-border dark:bg-ink-surface">{children}</ul>
  </section>
);

const SettingsRow: React.FC<{ icon: React.ReactNode; label: string; value?: string; onClick: () => void }> = ({ icon, label, value, onClick }) => (
  <li>
    <button onClick={onClick} className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-cream-light dark:hover:bg-ink-surfaceSubtle">
      <span className="text-ink-muted" aria-hidden>
        {icon}
      </span>
      <span className="flex-1 text-[14px] text-ink dark:text-white">{label}</span>
      {value && <span className="max-w-[45%] truncate text-[12.5px] capitalize text-ink-muted">{value}</span>}
      <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-ink-subtle" />
    </button>
  </li>
);

// ---------------------------------------------------------------------------

const TIMEZONES: string[] = (() => {
  try {
    return (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? ['Asia/Kolkata', 'UTC'];
  } catch {
    return ['Asia/Kolkata', 'UTC'];
  }
})();

const ProfileSection: React.FC = () => {
  const settings = useSettings();
  const update = useUpdateProfile();
  const { refreshUser } = useAuth();
  const [form, setForm] = useState({ fullName: '', timezone: 'Asia/Kolkata', bio: '' });
  useEffect(() => {
    if (settings.data) setForm({ fullName: settings.data.profile.fullName, timezone: settings.data.profile.timezone, bio: settings.data.profile.bio ?? '' });
  }, [settings.data]);

  if (settings.isLoading) return <LoadingBlock rows={2} />;
  if (settings.isError) return <ErrorState error={settings.error} onRetry={() => settings.refetch()} />;

  return (
    <Panel>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate({ fullName: form.fullName, timezone: form.timezone, bio: form.bio || null }, { onSuccess: () => refreshUser() });
        }}
      >
        <Field label="Full name">
          <input className={inputCls} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required maxLength={120} />
        </Field>
        <Field label="Email" hint="Email changes are not supported in this version.">
          <input className={cx(inputCls, 'opacity-70')} value={settings.data!.profile.email} readOnly />
        </Field>
        <Field label="Time zone">
          <select className={inputCls} value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Field>
        <Field label="About you">
          <textarea className={inputCls} rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={500} placeholder="e.g. Portfolio manager, Indian mid-caps" />
        </Field>
        {update.isError && <ErrorState error={update.error} />}
        <PrimaryButton type="submit" busy={update.isPending} className="w-full">
          {update.isSuccess ? <Check size={15} /> : null}
          {update.isSuccess ? 'Saved' : 'Save profile'}
        </PrimaryButton>
      </form>
    </Panel>
  );
};

// ---------------------------------------------------------------------------

const PortfolioSection: React.FC<{ onOpenCompany: (id: string) => void }> = ({ onOpenCompany }) => {
  const portfolio = usePortfolio();
  const add = useAddToPortfolio();
  const remove = useRemoveFromPortfolio();
  const demo = useAddDemoPortfolio();
  const held = useMemo(() => new Set((portfolio.data ?? []).map((h) => h.id)), [portfolio.data]);

  return (
    <div className="space-y-4">
      <Panel className="space-y-3">
        <SectionTitle title="Add companies" />
        <CompanyPicker excludeIds={held} onPick={(c) => add.mutate({ companyId: c.id })} onPickSymbol={(symbol) => add.mutate({ symbol })} />
        {add.isPending && (
          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Spinner size={12} /> Adding…
          </p>
        )}
        {add.isError && <ErrorState error={add.error} />}
      </Panel>

      <Panel padded={false} className="overflow-hidden">
        <div className="p-4 pb-2">
          <SectionTitle title={`Tracked companies (${portfolio.data?.length ?? 0})`} />
        </div>
        {portfolio.isLoading ? (
          <div className="p-4"><LoadingBlock rows={3} /></div>
        ) : portfolio.isError ? (
          <div className="p-4"><ErrorState error={portfolio.error} onRetry={() => portfolio.refetch()} /></div>
        ) : (portfolio.data ?? []).length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No companies tracked"
              action={
                <PrimaryButton busy={demo.isPending} onClick={() => demo.mutate()}>
                  Load the 18-company demo portfolio
                </PrimaryButton>
              }
            />
          </div>
        ) : (
          <ul className="grid divide-y divide-divider dark:divide-ink-border">
            {portfolio.data!.map((h) => (
              <li key={h.id} className="group flex items-center gap-2 px-4 py-1.5">
                <button onClick={() => onOpenCompany(h.id)} className="flex min-w-0 flex-1 items-center gap-2.5 py-1 text-left">
                  <CompanyLogo {...h} size="sm" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <Ticker symbol={h.nseSymbol} />
                      <Change value={h.quote?.changePercent} className="text-[11px]" />
                    </span>
                    <span className="block truncate text-xs text-ink-muted">{h.name}</span>
                  </span>
                </button>
                <button
                  onClick={() => remove.mutate(h.id)}
                  disabled={remove.isPending && remove.variables === h.id}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-ink-subtle opacity-70 transition-all hover:bg-fin-redBg hover:text-fin-red hover:opacity-100 group-hover:opacity-100"
                  aria-label={`Remove ${h.name}`}
                >
                  {remove.isPending && remove.variables === h.id ? <Spinner size={14} /> : <Trash2 size={15} strokeWidth={1.75} />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
};

const WatchlistsPanel: React.FC = () => {
  const lists = useWatchlists();
  const m = useWatchlistMutations();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  return (
    <Panel className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim()) m.create.mutate(newName.trim(), { onSuccess: () => setNewName('') });
        }}
      >
        <input className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New watchlist name" maxLength={60} aria-label="New watchlist name" />
        <PrimaryButton type="submit" busy={m.create.isPending} className="px-3" aria-label="Create watchlist">
          <Plus size={16} />
        </PrimaryButton>
      </form>
      {m.create.isError && <ErrorState error={m.create.error} />}
      {lists.isLoading ? (
        <LoadingBlock rows={2} />
      ) : (
        (lists.data ?? []).map((w) => (
          <div key={w.id} className="rounded-xl border border-divider dark:border-ink-border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              {editing?.id === w.id ? (
                <form
                  className="flex flex-1 gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    m.rename.mutate({ id: w.id, name: editing.name }, { onSuccess: () => setEditing(null) });
                  }}
                >
                  <input className={inputCls} value={editing.name} onChange={(e) => setEditing({ id: w.id, name: e.target.value })} aria-label="Watchlist name" />
                  <button type="submit" className="flex h-11 w-11 items-center justify-center text-forest" aria-label="Save name">
                    <Check size={16} />
                  </button>
                  <button type="button" onClick={() => setEditing(null)} className="flex h-11 w-11 items-center justify-center text-ink-muted" aria-label="Cancel">
                    <X size={16} />
                  </button>
                </form>
              ) : (
                <>
                  <div className="text-sm font-semibold text-ink dark:text-white">
                    {w.name} <span className="font-mono text-[11px] font-normal text-ink-muted">({w.companies.length})</span>
                  </div>
                  <div className="flex">
                    <button onClick={() => setEditing({ id: w.id, name: w.name })} className="flex h-10 w-10 items-center justify-center text-ink-muted" aria-label={`Rename ${w.name}`}>
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => m.remove.mutate(w.id)} className="flex h-10 w-10 items-center justify-center text-ink-muted hover:text-fin-red" aria-label={`Delete ${w.name}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {w.companies.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full border border-divider dark:border-ink-border bg-cream-light dark:bg-ink-surfaceSubtle pl-1 text-[11px]">
                  <CompanyLogo {...c} size="xs" className="rounded-full" />
                  <span className="font-mono font-semibold">{c.nseSymbol}</span>
                  <button onClick={() => m.removeCompany.mutate({ id: w.id, companyId: c.id })} className="flex h-7 w-7 items-center justify-center text-ink-muted hover:text-fin-red" aria-label={`Remove ${c.name} from ${w.name}`}>
                    <X size={12} />
                  </button>
                </span>
              ))}
              {w.companies.length === 0 && <span className="text-[11px] text-ink-muted">Empty</span>}
            </div>
            {adding === w.id ? (
              <div className="space-y-2">
                <CompanyPicker
                  excludeIds={new Set(w.companies.map((c) => c.id))}
                  onPick={(c) => m.addCompany.mutate({ id: w.id, ref: { companyId: c.id } })}
                  onPickSymbol={(symbol) => m.addCompany.mutate({ id: w.id, ref: { symbol } })}
                />
                {m.addCompany.isError && <ErrorState error={m.addCompany.error} />}
                <SecondaryButton className="w-full" onClick={() => setAdding(null)}>
                  Done
                </SecondaryButton>
              </div>
            ) : (
              <button onClick={() => setAdding(w.id)} className="inline-flex min-h-[36px] items-center gap-1 text-xs font-semibold text-forest dark:text-emerald">
                <Plus size={13} /> Add company
              </button>
            )}
          </div>
        ))
      )}
    </Panel>
  );
};

// ---------------------------------------------------------------------------

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical'];

/** `triggers`: what raises an alert. `notifications`: whether and from which priority you are told. */
const AlertsSection: React.FC<{ part: 'triggers' | 'notifications' }> = ({ part }) => {
  const prefs = useAlertSettings();
  const update = useUpdateAlerts();
  const [draft, setDraft] = useState<AlertPreferences | null>(null);
  useEffect(() => {
    if (prefs.data) setDraft(prefs.data);
  }, [prefs.data]);

  if (prefs.isLoading || !draft) return <LoadingBlock rows={3} />;
  if (prefs.isError) return <ErrorState error={prefs.error} onRetry={() => prefs.refetch()} />;

  const allCategories = prefs.data!.categories ?? [];
  const selected = new Set(draft.announcementCategories);
  const toggleCategory = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDraft({ ...draft, announcementCategories: [...next] });
  };

  const save = () => {
    const { categories: _c, ...patch } = draft;
    update.mutate(patch);
  };

  return (
    <div className="space-y-4">
      {part === 'triggers' && (
        <>
          <Panel className="space-y-5">
            <SectionTitle title="Market triggers" />
            <Slider
              label="Price movement threshold"
              value={draft.priceMoveThresholdPct}
              min={1}
              max={10}
              step={0.5}
              format={(v) => `±${v.toFixed(1)}%`}
              onChange={(v) => setDraft({ ...draft, priceMoveThresholdPct: v })}
              hint="Default ±2.5%. Alerts when the daily close moves at least this much."
            />
            <Slider
              label="Volume surge threshold"
              value={draft.volumeSurgeMultiple}
              min={1.5}
              max={6}
              step={0.1}
              format={(v) => `${v.toFixed(1)}× 20-day avg`}
              onChange={(v) => setDraft({ ...draft, volumeSurgeMultiple: v })}
              hint="Alerts when daily volume is at least this multiple of the previous 20 sessions' average."
            />
          </Panel>

          <Panel className="space-y-3">
            <SectionTitle title="Corporate developments" />
            <Toggle label="Management changes" desc="CEO, CFO, MD, chairman and board changes" checked={draft.managementChangeAlerts} onChange={(v) => setDraft({ ...draft, managementChangeAlerts: v })} />
            <Toggle label="Financial results" desc="Quarterly and annual results" checked={draft.financialResultAlerts} onChange={(v) => setDraft({ ...draft, financialResultAlerts: v })} />
            <Toggle label="Projects & Event Memory" desc="Precedent alerts and status changes on tracked commitments" checked={draft.eventAlerts} onChange={(v) => setDraft({ ...draft, eventAlerts: v })} />
            <div className="space-y-2 pt-1">
              <Eyebrow>Announcement categories</Eyebrow>
              <p className="text-[11px] text-ink-muted">{selected.size === 0 ? 'All material categories are on. Pick categories to restrict alerts.' : `${selected.size} selected.`}</p>
              <div className="flex flex-wrap gap-1.5">
                {allCategories
                  .filter((c) => !['routine', 'management_change', 'results'].includes(c.id))
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCategory(c.id)}
                      aria-pressed={selected.has(c.id)}
                      className={cx(
                        'min-h-[36px] rounded-full border px-3 text-xs',
                        selected.has(c.id) ? 'border-forest bg-forest text-white' : 'border-divider dark:border-ink-border text-ink-muted',
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
              </div>
            </div>
          </Panel>
        </>
      )}

      {part === 'notifications' && (
        <Panel className="space-y-3">
          <Toggle label="In-app notifications" desc="Turn all notifications off without losing your settings" checked={draft.inAppNotifications} onChange={(v) => setDraft({ ...draft, inAppNotifications: v })} />
          <Field label="Minimum priority to notify">
            <div className="grid grid-cols-4 gap-1.5">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDraft({ ...draft, minimumPriority: p })}
                  className={cx('min-h-[40px] rounded-xl border text-xs font-medium capitalize', draft.minimumPriority === p ? 'border-forest bg-forest text-white' : 'border-divider dark:border-ink-border text-ink-muted')}
                >
                  {p}
                </button>
              ))}
            </div>
          </Field>
        </Panel>
      )}

      {update.isError && <ErrorState error={update.error} />}
      {update.isSuccess && (
        <p className="rounded-xl bg-sage dark:bg-ink-surfaceSubtle px-3 py-2 text-xs text-forest dark:text-emerald">
          Saved. The alert engine re-evaluated your portfolio: {update.data.newNotifications} new notification{update.data.newNotifications === 1 ? '' : 's'}.
        </p>
      )}
      <PrimaryButton className="w-full" busy={update.isPending} onClick={save}>
        {part === 'triggers' ? 'Save alert triggers' : 'Save notification settings'}
      </PrimaryButton>
    </div>
  );
};

const Slider: React.FC<{ label: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void; hint?: string }> = ({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  hint,
}) => (
  <label className="block space-y-2">
    <span className="flex items-center justify-between gap-2">
      <span className="text-sm font-medium text-ink dark:text-white">{label}</span>
      <span className="rounded-lg bg-sage dark:bg-ink-surfaceSubtle px-2 py-0.5 font-mono text-xs font-semibold text-forest dark:text-emerald">{format(value)}</span>
    </span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-11 w-full accent-[#164E3B] cursor-pointer" />
    {hint && <span className="block text-[11px] text-ink-muted">{hint}</span>}
  </label>
);

const Toggle: React.FC<{ label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, desc, checked, onChange }) => (
  <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full min-h-[52px] items-center justify-between gap-3 text-left">
    <span>
      <span className="block text-sm font-medium text-ink dark:text-white">{label}</span>
      {desc && <span className="block text-[11px] text-ink-muted">{desc}</span>}
    </span>
    <span className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-forest' : 'bg-divider dark:bg-ink-border')}>
      <span className={cx('absolute top-0.5 h-6 w-6 rounded-full bg-paper shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </span>
  </button>
);

// ---------------------------------------------------------------------------

const SecuritySection: React.FC = () => {
  const sessions = useSessions();
  const { revoke, changePassword } = useSessionMutations();
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });

  return (
    <div className="space-y-4">
      <Panel className="space-y-3">
        <SectionTitle title="Password" />
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            changePassword.mutate(pw, { onSuccess: () => setPw({ currentPassword: '', newPassword: '' }) });
          }}
        >
          <Field label="Current password">
            <input type="password" autoComplete="current-password" className={inputCls} value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required />
          </Field>
          <Field label="New password" hint="At least 10 characters with letters and numbers. Other devices are signed out.">
            <input type="password" autoComplete="new-password" className={inputCls} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required minLength={10} />
          </Field>
          {changePassword.isError && <ErrorState error={changePassword.error} />}
          {changePassword.isSuccess && <p className="text-xs text-forest dark:text-emerald">Password changed. Other sessions were signed out.</p>}
          <PrimaryButton type="submit" className="w-full" busy={changePassword.isPending}>
            Change password
          </PrimaryButton>
        </form>
      </Panel>

      <Panel className="space-y-3">
        <SectionTitle title="Active sessions" />
        {sessions.isLoading ? (
          <LoadingBlock rows={2} />
        ) : (
          <ul className="space-y-2">
            {(sessions.data ?? []).map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-xl border border-divider dark:border-ink-border p-3">
                <Monitor size={16} className="shrink-0 text-ink-muted" />
                <div className="min-w-0 flex-1 text-xs">
                  <div className="truncate font-medium text-ink dark:text-white">{s.userAgent ?? 'Unknown device'}</div>
                  <div className="text-ink-muted">
                    Last active {dateTime(s.lastUsedAt)}
                    {s.current && <span className="ml-1 font-semibold text-forest dark:text-emerald">· this device</span>}
                  </div>
                </div>
                {!s.current && (
                  <button onClick={() => revoke.mutate(s.id)} className="min-h-[40px] rounded-lg px-2 text-xs font-semibold text-fin-red">
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
};

const SystemStatus: React.FC = () => {
  const health = useHealth();
  return (
    <Panel className="space-y-2">
      {health.data ? (
        <ul className="space-y-1.5 text-xs">
          <StatusRow label="Database (Neon)" ok={health.data.database.connected} detail={health.data.database.connected ? `${health.data.database.latencyMs} ms` : 'unreachable'} />
          <StatusRow label="AI (Google Gemini)" ok={health.data.ai.configured} detail={health.data.ai.configured ? health.data.ai.chatModel ?? '' : 'not configured'} />
          <StatusRow label="Live notifications (Neon Realtime)" ok={health.data.realtime.configured} detail={health.data.realtime.configured ? 'live' : 'polling fallback'} />
          {Object.entries(health.data.providers).map(([k, p]) => (
            <StatusRow key={k} label={k.replace(/([A-Z])/g, ' $1').toLowerCase()} ok={p.configured} detail={p.isDemo ? 'demo data' : p.configured ? p.name : 'not configured'} demo={p.isDemo} />
          ))}
        </ul>
      ) : (
        <LoadingBlock rows={1} />
      )}
    </Panel>
  );
};

const StatusRow: React.FC<{ label: string; ok: boolean; detail: string; demo?: boolean }> = ({ label, ok, detail, demo }) => (
  <li className="flex items-center justify-between gap-2">
    <span className="flex items-center gap-2 capitalize text-ink dark:text-ink-light">
      <span className={cx('h-2 w-2 rounded-full', demo ? 'bg-fin-amber' : ok ? 'bg-emerald' : 'bg-ink-subtle')} />
      {label}
    </span>
    <span className="flex items-center gap-1 font-mono text-[11px] text-ink-muted">
      {demo && <DemoPill />} {!demo && detail}
    </span>
  </li>
);
