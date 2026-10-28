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
      label: 'Event Memory',
      icon: History,
      badge: 0,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200/80 dark:border-ink-border bg-ivory-bg/95 dark:bg-ink-bg/95 backdrop-blur-md px-3 py-1 safe-area-pb transition-colors">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex min-h-[48px] flex-1 flex-col items-center justify-center py-1 transition-all select-none active:scale-[0.97] ${
                isActive
                  ? 'text-stone-900 dark:text-white font-semibold'
                  : 'text-stone-400 hover:text-stone-600 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon size={19} strokeWidth={isActive ? 2.2 : 1.7} />
                {tab.badge > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight transition-colors ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-stone-900 dark:bg-teal-400" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
