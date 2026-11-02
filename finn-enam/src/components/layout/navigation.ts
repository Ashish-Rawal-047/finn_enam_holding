import { BookOpenText, ChartCandlestick, History, House, SlidersHorizontal, type LucideIcon } from 'lucide-react';

export type TabId = 'home' | 'signals' | 'research' | 'memory' | 'settings';

export const TABS: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'signals', label: 'Signals', icon: ChartCandlestick },
  { id: 'research', label: 'Research', icon: BookOpenText },
  { id: 'memory', label: 'Event Memory', icon: History },
  { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
];
