import React from 'react';
import { NavigationTab } from '../../types';
import { Sparkles, Bell, Search, History } from 'lucide-react';

interface BottomNavProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  unreadSignalsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  unreadSignalsCount = 0,
}) => {
  const tabs = [
    {
      id: 'today' as NavigationTab,
      label: 'Today',
      icon: Sparkles,
      badge: 0,
    },
    {
      id: 'signals' as NavigationTab,
      label: 'Signals',
      icon: Bell,
      badge: unreadSignalsCount,
    },
    {
      id: 'research' as NavigationTab,
      label: 'Research',
      icon: Search,
      badge: 0,
    },
    {
      id: 'memory' as NavigationTab,
      label: 'Memory',
      icon: History,
      badge: 0,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-divider bg-white/95 dark:bg-ink-surface/95 backdrop-blur-md px-3 py-1 safe-area-pb transition-colors shadow-float">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex min-h-[50px] flex-1 flex-col items-center justify-center py-1 transition-all select-none active:scale-[0.97] ${
                isActive
                  ? 'text-forest dark:text-emerald font-semibold'
                  : 'text-ink-muted hover:text-ink dark:text-ink-subtle dark:hover:text-ink-light'
              }`}
            >
              <div className="relative">
                <Icon size={19} strokeWidth={isActive ? 2.3 : 1.8} />
                {tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-forest text-[9px] font-mono font-bold text-white px-1 shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="mt-1 text-[11px] tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-1 h-1 w-5 rounded-full bg-forest dark:bg-emerald" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
