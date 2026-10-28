import React from 'react';
import { Newspaper, History, Search, SlidersHorizontal } from 'lucide-react';

export type ScreenId = 'home' | 'memory' | 'research' | 'settings';

interface BottomNavProps {
  activeScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeScreen,
  onSelectScreen,
  unreadCount = 3,
}) => {
  const tabs = [
    {
      id: 'home' as ScreenId,
      label: 'Intel Feed',
      icon: Newspaper,
      badge: unreadCount,
    },
    {
      id: 'memory' as ScreenId,
      label: 'Event Memory',
      icon: History,
      badge: 0,
    },
    {
      id: 'research' as ScreenId,
      label: 'Research',
      icon: Search,
      badge: 0,
    },
    {
      id: 'settings' as ScreenId,
      label: 'Watchlist',
      icon: SlidersHorizontal,
      badge: 0,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-dark-border bg-dark-bg/95 backdrop-blur-lg px-1 py-1 safe-area-pb">
      <div className="mx-auto flex w-full max-w-xl items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeScreen === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectScreen(tab.id)}
              className={`relative flex min-h-[48px] flex-1 flex-col items-center justify-center py-1 transition-all active:scale-95 ${
                isActive ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />
                {tab.badge > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 font-medium tracking-tight ${isActive ? 'font-semibold text-white' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-6 rounded-full bg-teal-400" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
