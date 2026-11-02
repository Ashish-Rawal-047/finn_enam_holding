import React from 'react';
import { Bell, Moon, Sun } from 'lucide-react';
import { FinnLogo } from '../common/FinnLogo';
import { TABS, type TabId } from './navigation';

interface AppHeaderProps {
  activeTab: TabId;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  unreadCount: number;
  onOpenNotifications: () => void;
  liveMode: 'realtime' | 'polling' | 'connecting';
}

const iconBtn =
  'relative flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-colors duration-200 hover:bg-paper hover:text-forest-dark dark:hover:bg-ink-surface dark:hover:text-white';

/** Compact app bar at the top of the frame: brand, current tab, live status, notifications and theme. */
export const AppHeader: React.FC<AppHeaderProps> = ({ activeTab, theme, onToggleTheme, unreadCount, onOpenNotifications, liveMode }) => {
  const title = TABS.find((t) => t.id === activeTab)?.label ?? '';
  return (
    <header className="relative z-30 flex-none border-b border-divider/70 bg-cream/95 backdrop-blur-xl safe-pt dark:border-ink-border dark:bg-ink-bg/95">
      <div className="flex h-14 items-center justify-between gap-2 pl-4 pr-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <FinnLogo size={22} primaryColor={theme === 'dark' ? '#6DBE96' : '#236B52'} secondaryColor={theme === 'dark' ? '#8ACFAC' : '#397E65'} />
          <div className="flex min-w-0 items-baseline gap-1.5">
            <span className="font-serif text-[20px] leading-none text-forest-dark dark:text-white">Finn</span>
            <span className="truncate text-[12px] text-ink-muted">· {title}</span>
          </div>
        </div>

        <div className="flex items-center">
          <span
            className="mr-1 inline-flex items-center gap-1.5 px-1.5 text-[10.5px] font-medium text-ink-muted"
            title={liveMode === 'realtime' ? 'Notifications stream live via Neon Realtime' : 'Notifications refresh every 30 seconds'}
          >
            <span className="relative flex h-1.5 w-1.5">
              {liveMode === 'realtime' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fin-up opacity-60" />}
              <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${liveMode === 'realtime' ? 'bg-fin-up' : 'bg-ink-subtle'}`} />
            </span>
            {liveMode === 'realtime' ? 'Live' : liveMode === 'connecting' ? '…' : 'Synced'}
          </span>
          <button onClick={onOpenNotifications} className={iconBtn} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}>
            <Bell size={18} strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span
                key={unreadCount}
                className="badge-pop absolute right-1 top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-fin-red px-1 font-mono text-[9px] font-semibold text-white ring-2 ring-cream dark:ring-ink-bg"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button onClick={onToggleTheme} className={iconBtn} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            {theme === 'light' ? <Moon size={17} strokeWidth={1.75} /> : <Sun size={17} strokeWidth={1.75} />}
          </button>
        </div>
      </div>
    </header>
  );
};
