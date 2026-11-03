import { useCallback, useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { useAuth } from './auth/AuthContext';
import { AuthScreen } from './screens/AuthScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SignalsScreen } from './screens/SignalsScreen';
import { ResearchScreen } from './screens/ResearchScreen';
import { EventMemoryScreen } from './screens/EventMemoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AppHeader } from './components/layout/AppHeader';
import { BottomNav } from './components/layout/BottomNav';
import { AppFrame, AppShell, scrollAppToTop } from './components/layout/AppShell';
import type { TabId } from './components/layout/navigation';
import { CompanySheet } from './components/company/CompanySheet';
import { SignalDetail } from './components/signals/SignalDetail';
import { EventDetailSheet } from './components/memory/EventDetailSheet';
import { CreateEventSheet } from './components/memory/CreateEventSheet';
import { NotificationCenter } from './components/notifications/NotificationCenter';
import { FinnLogo } from './components/common/FinnLogo';
import { LiveNotifications, useUnreadCount, type LiveMode } from './lib/live';
import { usePortfolio } from './lib/queries';
import { Spinner } from './components/ui';

type Theme = 'light' | 'dark';

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem('finn-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage unavailable */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function App() {
  const { status, user } = useAuth();
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0E1B16' : '#F7F5ED');
    try {
      localStorage.setItem('finn-theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  // Adopt the theme saved on the profile once after sign-in.
  useEffect(() => {
    if (user?.theme) setTheme(user.theme);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'loading') {
    return (
      <AppFrame>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center" role="status">
          <FinnLogo size={40} />
          <Spinner className="text-forest dark:text-emerald" />
          <SlowStartNote />
        </div>
      </AppFrame>
    );
  }
  if (status === 'anonymous') {
    return (
      <AppFrame>
        <AuthScreen />
      </AppFrame>
    );
  }
  return <Shell theme={theme} setTheme={setTheme} />;
}

/** Shown only if loading takes a while (a sleeping free-tier server can need up to a minute). */
function SlowStartNote() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 3_000);
    return () => clearTimeout(t);
  }, []);
  return slow ? <p className="text-[12px] text-ink-muted">Connecting…</p> : null;
}

// --- URL routing ---------------------------------------------------------------------
// Paths: /  /signals  /research  /event-memory  /event-memory/:eventId?compare=:newEventId  /settings
const TAB_PATH: Record<TabId, string> = { home: '/', signals: '/signals', research: '/research', memory: '/event-memory', settings: '/settings' };

interface Route {
  tab: TabId;
  eventId: string | null;
  compareWith: string | null;
}

function parseRoute(): Route {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(window.location.search);
  const m = /^\/event-memory\/([0-9a-f-]{36})$/i.exec(path);
  if (m) return { tab: 'memory', eventId: m[1], compareWith: params.get('compare') };
  const tab = (Object.entries(TAB_PATH).find(([, p]) => p === path)?.[0] as TabId | undefined) ?? 'home';
  return { tab, eventId: null, compareWith: null };
}

function routeUrl(r: Route) {
  if (r.tab === 'memory' && r.eventId) return `/event-memory/${r.eventId}${r.compareWith ? `?compare=${r.compareWith}` : ''}`;
  return TAB_PATH[r.tab];
}

function Shell({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const initial = useState(parseRoute)[0];
  const [tab, setTab] = useState<TabId>(initial.tab);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [signalId, setSignalId] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(initial.eventId);
  const [compareWith, setCompareWith] = useState<string | null>(initial.compareWith);
  const [memoryFocus, setMemoryFocus] = useState<string | null>(null);
  const [researchCompanyId, setResearchCompanyId] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [liveMode, setLiveMode] = useState<LiveMode>('connecting');
  const onMode = useCallback((m: LiveMode) => setLiveMode(m), []);
  const unread = useUnreadCount(liveMode);
  const portfolio = usePortfolio();
  const companiesWithAlerts = (portfolio.data ?? []).filter((h) => h.activeSignalCount > 0).length;

  const navigate = useCallback((r: Route, replace = false) => {
    const url = routeUrl(r);
    if (url !== window.location.pathname + window.location.search) window.history[replace ? 'replaceState' : 'pushState'](r, '', url);
  }, []);

  // Browser back/forward.
  useEffect(() => {
    const onPop = () => {
      const r = parseRoute();
      setTab(r.tab);
      setEventId(r.eventId);
      setCompareWith(r.compareWith);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = (t: TabId) => {
    setTab(t);
    setEventId(null);
    setCompareWith(null);
    navigate({ tab: t, eventId: null, compareWith: null });
    scrollAppToTop();
  };
  const openResearch = (id: string) => {
    setResearchCompanyId(id);
    setCompanyId(null);
    setSignalId(null);
    go('research');
  };
  const openCompany = (id: string) => {
    setSignalId(null);
    setEventId(null);
    setCompanyId(id);
  };
  const openEvent = (id: string, compare: string | null = null) => {
    setSignalId(null);
    setCompanyId(null);
    setNotificationsOpen(false);
    setEventId(id);
    setCompareWith(compare);
    if (tab === 'memory' || compare) {
      setTab('memory');
      navigate({ tab: 'memory', eventId: id, compareWith: compare });
    }
  };
  /** From an alert: land on Event Memory with the exact historical event open, compared with the new one. */
  const viewHistoricalEvent = (historicalEventId: string, newEventId: string, companySymbol?: string | null) => {
    setMemoryFocus(companySymbol ?? null);
    openEvent(historicalEventId, newEventId);
    scrollAppToTop();
  };
  const closeEvent = () => {
    setEventId(null);
    setCompareWith(null);
    if (tab === 'memory') navigate({ tab: 'memory', eventId: null, compareWith: null }, true);
  };

  const badges = { signals: companiesWithAlerts };

  return (
    <MotionConfig reducedMotion="user">
      <LiveNotifications onMode={onMode} />
      <AppShell
        screenKey={tab}
        header={
          <AppHeader
            activeTab={tab}
            theme={theme}
            onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            unreadCount={unread}
            onOpenNotifications={() => setNotificationsOpen(true)}
          />
        }
        navigation={<BottomNav activeTab={tab} onSelectTab={go} badges={badges} />}
        overlays={
          <>
            <CompanySheet companyId={companyId} theme={theme} onClose={() => setCompanyId(null)} onInspectSignal={setSignalId} onOpenResearch={openResearch} />
            <EventDetailSheet eventId={eventId} compareWithId={compareWith} onClose={closeEvent} onOpenEvent={(id) => openEvent(id)} onOpenCompany={openCompany} />
            <CreateEventSheet
              open={creatingEvent}
              onClose={() => setCreatingEvent(false)}
              onCreated={(id) => {
                setCreatingEvent(false);
                setTab('memory');
                openEvent(id);
                navigate({ tab: 'memory', eventId: id, compareWith: null });
              }}
            />
            <NotificationCenter
              open={notificationsOpen}
              onClose={() => setNotificationsOpen(false)}
              onInspectSignal={setSignalId}
              onViewHistoricalEvent={(h, n, sym) => viewHistoricalEvent(h, n, sym)}
            />
            <SignalDetail signalId={signalId} onClose={() => setSignalId(null)} onOpenCompany={openCompany} onOpenEvent={(id) => openEvent(id)} />
          </>
        }
      >
        {tab === 'home' && (
          <HomeScreen
            onInspectSignal={setSignalId}
            onOpenNotifications={() => setNotificationsOpen(true)}
            onGoToSettings={() => go('settings')}
            onOpenCompany={openCompany}
            onOpenEvent={(id) => openEvent(id)}
            onGoToMemory={() => go('memory')}
            onViewHistoricalEvent={viewHistoricalEvent}
          />
        )}
        {tab === 'signals' && <SignalsScreen onOpenCompany={openCompany} onInspectSignal={setSignalId} onGoToSettings={() => go('settings')} />}
        {tab === 'research' && <ResearchScreen companyId={researchCompanyId} onSelectCompany={setResearchCompanyId} onOpenCompany={openCompany} />}
        {tab === 'memory' && <EventMemoryScreen onOpenEvent={(id) => openEvent(id)} onCreateEvent={() => setCreatingEvent(true)} focusQuery={memoryFocus} />}
        {tab === 'settings' && <SettingsScreen theme={theme} onSetTheme={setTheme} onOpenCompany={openCompany} />}
      </AppShell>
    </MotionConfig>
  );
}

export default App;
