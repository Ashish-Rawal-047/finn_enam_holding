import React from 'react';
import { AlertSettings, DigestWindow, AnnouncementCategory } from '../../types';
import { Drawer } from '../common/Drawer';
import { CATEGORY_LABELS } from '../../data/alertSettings';
import { Check, RotateCcw } from 'lucide-react';

interface SignalFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AlertSettings;
  onChangeSettings: (settings: AlertSettings) => void;
  activeFilterCount: number;
  onResetFilters: () => void;
}

export const SignalFilterDrawer: React.FC<SignalFilterDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onChangeSettings,
  activeFilterCount,
  onResetFilters,
}) => {
  const windows: Array<{ id: DigestWindow; label: string }> = [
    { id: '24h', label: 'Last 24 Hours' },
    { id: '48h', label: 'Last 48 Hours' },
    { id: '7d', label: 'Past 7 Days' },
    { id: 'all', label: 'All Disclosures' },
  ];

  const categories = Object.keys(CATEGORY_LABELS) as AnnouncementCategory[];

  const toggleCategory = (cat: AnnouncementCategory) => {
    onChangeSettings({
      ...settings,
      enabledCategories: {
        ...settings.enabledCategories,
        [cat]: !settings.enabledCategories[cat],
      },
    });
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Signal Filters"
      subtitle={`${activeFilterCount} filter criteria applied`}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-600 dark:text-slate-400 hover:text-stone-900 transition-colors"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={onClose}
            className="rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 px-5 py-2 text-xs font-semibold hover:bg-stone-800 transition-colors"
          >
            Done
          </button>
        </div>
      }
    >
      <div className="space-y-5 text-xs">
        {/* Time Window */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-slate-400 font-semibold">
            Filing Time Horizon
          </label>
          <div className="grid grid-cols-2 gap-2">
            {windows.map((w) => (
              <button
                key={w.id}
                onClick={() => onChangeSettings({ ...settings, activeDigestWindow: w.id })}
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium transition-colors ${
                  settings.activeDigestWindow === w.id
                    ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 border-stone-900 dark:border-white shadow-sm'
                    : 'bg-stone-50 dark:bg-ink-surfaceSubtle text-stone-700 dark:text-slate-300 border-stone-200 dark:border-ink-border'
                }`}
              >
                <span>{w.label}</span>
                {settings.activeDigestWindow === w.id && <Check size={13} />}
              </button>
            ))}
          </div>
        </div>

        {/* Severity Minimum */}
        <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-ink-border">
          <label className="text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-slate-400 font-semibold">
            Signal Significance
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'all' as const, label: 'All Signals & Disclosures' },
              { id: 'high_only' as const, label: 'Material & High Only' },
            ].map((sev) => (
              <button
                key={sev.id}
                onClick={() => onChangeSettings({ ...settings, minSeverity: sev.id })}
                className={`p-2.5 rounded-lg border text-xs font-medium transition-colors ${
                  settings.minSeverity === sev.id
                    ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 border-stone-900 dark:border-white'
                    : 'bg-stone-50 dark:bg-ink-surfaceSubtle text-stone-700 dark:text-slate-300 border-stone-200 dark:border-ink-border'
                }`}
              >
                {sev.label}
              </button>
            ))}
          </div>
        </div>

        {/* Announcement Categories (17 Reference Classes) */}
        <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-ink-border">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-slate-400 font-semibold">
              Corporate Announcement Types
            </label>
            <span className="text-[10px] text-stone-400 font-mono">17 Categories</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {categories.map((cat) => {
              const isChecked = settings.enabledCategories[cat] ?? true;
              return (
                <div
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer select-none text-xs transition-colors ${
                    isChecked
                      ? 'bg-white dark:bg-ink-surface border-stone-300 dark:border-slate-700 text-stone-900 dark:text-white'
                      : 'bg-stone-50 dark:bg-ink-bg border-stone-200/60 dark:border-ink-borderSubtle text-stone-400 dark:text-slate-500'
                  }`}
                >
                  <span className="font-medium truncate mr-2">{CATEGORY_LABELS[cat].label}</span>
                  {isChecked && <Check size={13} className="text-teal-700 dark:text-teal-400 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
