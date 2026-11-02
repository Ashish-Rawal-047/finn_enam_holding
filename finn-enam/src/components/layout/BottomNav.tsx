import React from 'react';
import { motion } from 'framer-motion';
import { TABS, type TabId } from './navigation';

interface BottomNavProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  badges?: Partial<Record<TabId, number>>;
}

/**
 * The app's only navigation: five equal tabs, icon above label, at the foot of the frame. It is
 * part of the layout column (not an overlay), so screen content always ends above it.
 */
export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab, badges = {} }) => (
  <nav aria-label="Primary" className="relative z-40 flex-none border-t border-divider/80 bg-paper/95 backdrop-blur-xl nav-safe dark:border-ink-border dark:bg-ink-surface/95">
    <ul className="grid grid-cols-5 px-1">
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        const Icon = tab.icon;
        const badge = badges[tab.id] ?? 0;
        return (
          <li key={tab.id}>
            <button
              onClick={() => onSelectTab(tab.id)}
              aria-current={active ? 'page' : undefined}
              aria-label={tab.label}
              className={`relative flex min-h-[58px] w-full flex-col items-center justify-center gap-1 pt-1.5 select-none transition-colors duration-200 ${
                active ? 'text-forest dark:text-emerald' : 'text-ink-muted dark:text-ink-subtle'
              }`}
            >
              <span className="relative flex h-8 w-12 items-center justify-center">
                {active && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute inset-0 rounded-full bg-sage dark:bg-emerald-subtle"
                    transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                  />
                )}
                <Icon size={20} strokeWidth={active ? 2 : 1.6} className="relative" aria-hidden />
                {badge > 0 && (
                  <span
                    key={badge}
                    className="badge-pop absolute -top-0.5 right-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-forest px-1 font-mono text-[9px] font-semibold text-white ring-2 ring-paper dark:bg-emerald dark:text-ink-bg dark:ring-ink-surface"
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              <span className={`text-[10.5px] leading-none tracking-[-0.01em] whitespace-nowrap ${active ? 'font-semibold' : 'font-medium'}`} aria-hidden>
                {tab.id === 'memory' ? (
                  <>
                    <span className="xs:hidden">Memory</span>
                    <span className="hidden xs:inline">Event Memory</span>
                  </>
                ) : (
                  tab.label
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  </nav>
);
