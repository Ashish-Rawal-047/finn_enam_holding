import React from 'react';
import { Company, AlertSettings, TriggeredAlert } from '../types';
import { WatchlistManager } from '../components/settings/WatchlistManager';
import { ThresholdSliders } from '../components/settings/ThresholdSliders';
import { CategoryFilters } from '../components/settings/CategoryFilters';
import { SlidersHorizontal } from 'lucide-react';

interface SettingsScreenProps {
  companies: Company[];
  settings: AlertSettings;
  onChangeSettings: (newSettings: AlertSettings) => void;
  onToggleWatchlist: (ticker: string) => void;
  onSelectCompanyForResearch: (ticker: string) => void;
  activeAlerts: TriggeredAlert[];
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  companies,
  settings,
  onChangeSettings,
  onToggleWatchlist,
  onSelectCompanyForResearch,
  activeAlerts,
}) => {
  return (
    <div className="space-y-4 pb-20">
      {/* Settings Header */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-4">
        <div className="flex items-center gap-2 border-b border-dark-border pb-2.5 mb-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-900/60 text-teal-400">
            <SlidersHorizontal size={14} />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
            Watchlist & Signal Filter Controls
          </h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Configure price and volume alert sensitivity thresholds, manage your high-conviction company watchlist, and fine-tune exchange announcement categories.
        </p>
      </div>

      {/* Threshold Sliders (Price % & Volume Spike) */}
      <ThresholdSliders
        settings={settings}
        onChangeSettings={onChangeSettings}
        activeTriggersCount={activeAlerts.length}
      />

      {/* Watchlist Manager */}
      <WatchlistManager
        companies={companies}
        onToggleWatchlist={onToggleWatchlist}
        onSelectCompanyForResearch={onSelectCompanyForResearch}
      />

      {/* Category Filter Toggles (17 Categories) */}
      <CategoryFilters
        settings={settings}
        onChangeSettings={onChangeSettings}
      />

      {/* Severity & Digest Preferences */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-dark-border pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
            Minimum Push Severity Filter
          </h3>
          <span className="text-[10px] text-dark-textMuted font-mono">Push Notification Gate</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { id: 'all' as const, label: 'All Severity' },
            { id: 'high_only' as const, label: 'High & Critical' },
            { id: 'critical_only' as const, label: 'Critical Only' },
          ].map((sev) => (
            <button
              key={sev.id}
              onClick={() => onChangeSettings({ ...settings, minSeverity: sev.id })}
              className={`p-2.5 rounded-lg border text-center transition-all ${
                settings.minSeverity === sev.id
                  ? 'bg-teal-600 border-teal-500 text-white font-semibold'
                  : 'bg-dark-bg border-dark-border text-slate-400 hover:text-white'
              }`}
            >
              {sev.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
