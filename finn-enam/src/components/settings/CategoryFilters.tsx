import React from 'react';
import { AlertSettings, AnnouncementCategory } from '../../types';
import { CATEGORY_LABELS } from '../../data/alertSettings';
import { CheckSquare, Square, Filter } from 'lucide-react';

interface CategoryFiltersProps {
  settings: AlertSettings;
  onChangeSettings: (newSettings: AlertSettings) => void;
}

export const CategoryFilters: React.FC<CategoryFiltersProps> = ({
  settings,
  onChangeSettings,
}) => {
  const toggleCategory = (cat: AnnouncementCategory) => {
    onChangeSettings({
      ...settings,
      enabledCategories: {
        ...settings.enabledCategories,
        [cat]: !settings.enabledCategories[cat],
      },
    });
  };

  const selectHighSignalOnly = () => {
    const updated: Record<AnnouncementCategory, boolean> = { ...settings.enabledCategories };
    const highSignal: AnnouncementCategory[] = [
      'results',
      'M&A',
      'fund_raise',
      'management_change',
      'capex',
      'litigation',
      'credit_rating',
      'dividend',
    ];
    (Object.keys(updated) as AnnouncementCategory[]).forEach((cat) => {
      updated[cat] = highSignal.includes(cat);
    });
    onChangeSettings({ ...settings, enabledCategories: updated });
  };

  const selectAll = () => {
    const updated: Record<AnnouncementCategory, boolean> = { ...settings.enabledCategories };
    (Object.keys(updated) as AnnouncementCategory[]).forEach((cat) => {
      updated[cat] = true;
    });
    onChangeSettings({ ...settings, enabledCategories: updated });
  };

  const categories = Object.keys(CATEGORY_LABELS) as AnnouncementCategory[];

  return (
    <div className="rounded-xl border border-dark-border bg-dark-surface p-4 space-y-3.5">
      <div className="flex items-center justify-between border-b border-dark-border pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-teal-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
            Announcement Category Filters (17 Classes)
          </h3>
        </div>

        <div className="flex items-center gap-1.5 text-[11px]">
          <button
            onClick={selectHighSignalOnly}
            className="rounded px-2 py-0.5 bg-teal-950/40 text-teal-300 border border-teal-800/40 hover:bg-teal-900/50"
          >
            High Signal Only
          </button>
          <button
            onClick={selectAll}
            className="rounded px-2 py-0.5 bg-dark-bg text-slate-400 border border-dark-border hover:text-white"
          >
            All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {categories.map((cat) => {
          const isEnabled = settings.enabledCategories[cat] ?? true;
          const info = CATEGORY_LABELS[cat];

          return (
            <div
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                isEnabled
                  ? 'bg-dark-bg border-dark-border hover:border-slate-700'
                  : 'bg-dark-bg/30 border-dark-borderSubtle opacity-60'
              }`}
            >
              <div className="mt-0.5 text-teal-400 flex-shrink-0">
                {isEnabled ? <CheckSquare size={14} /> : <Square size={14} className="text-slate-600" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`font-medium ${isEnabled ? 'text-white' : 'text-slate-400'}`}>
                  {info.label}
                </div>
                <div className="text-[10px] text-dark-textMuted line-clamp-1">
                  {info.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

