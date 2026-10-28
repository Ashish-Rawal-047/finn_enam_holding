import React from 'react';
import { AlertSettings } from '../../types';
import { Sliders, BellRing, Info } from 'lucide-react';

interface ThresholdSlidersProps {
  settings: AlertSettings;
  onChangeSettings: (newSettings: AlertSettings) => void;
  activeTriggersCount: number;
}

export const ThresholdSliders: React.FC<ThresholdSlidersProps> = ({
  settings,
  onChangeSettings,
  activeTriggersCount,
}) => {
  return (
    <div className="rounded-xl border border-dark-border bg-dark-surface p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-dark-border pb-3">
        <div className="flex items-center gap-2">
          <Sliders size={16} className="text-teal-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
            EOD Trigger Sensitivity
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-950/40 border border-rose-800/40 text-[10px] text-rose-400 font-mono">
          <BellRing size={11} />
          <span>{activeTriggersCount} Active Anomaly Alerts</span>
        </div>
      </div>

      {/* Price Move Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium">Price Move Sensitivity (&plusmn;X%)</span>
          <span className="font-mono text-teal-400 font-bold bg-dark-bg px-2 py-0.5 rounded border border-dark-border">
            &plusmn;{settings.priceMoveThresholdPercent.toFixed(1)}% in a day
          </span>
        </div>
        <input
          type="range"
          min="1.5"
          max="8.0"
          step="0.5"
          value={settings.priceMoveThresholdPercent}
          onChange={(e) =>
            onChangeSettings({
              ...settings,
              priceMoveThresholdPercent: parseFloat(e.target.value),
            })
          }
          className="w-full accent-teal-500 cursor-pointer h-1.5 bg-dark-bg rounded-lg"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>&plusmn;1.5% (High Noise)</span>
          <span>&plusmn;4.0% (Balanced)</span>
          <span>&plusmn;8.0% (Only Mega Moves)</span>
        </div>
      </div>

      {/* Volume Spike Slider */}
      <div className="space-y-1.5 pt-2 border-t border-dark-borderSubtle">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium">Volume Spike Threshold (Y&times; 20-DMA)</span>
          <span className="font-mono text-amber-400 font-bold bg-dark-bg px-2 py-0.5 rounded border border-dark-border">
            &gt; {settings.volumeSpikeMultiplier.toFixed(1)}&times; 20-day Average
          </span>
        </div>
        <input
          type="range"
          min="1.2"
          max="4.5"
          step="0.1"
          value={settings.volumeSpikeMultiplier}
          onChange={(e) =>
            onChangeSettings({
              ...settings,
              volumeSpikeMultiplier: parseFloat(e.target.value),
            })
          }
          className="w-full accent-amber-500 cursor-pointer h-1.5 bg-dark-bg rounded-lg"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>1.2&times; (Frequent)</span>
          <span>2.0&times; (Standard)</span>
          <span>4.5&times; (Extreme Outliers)</span>
        </div>
      </div>

      <div className="flex items-start gap-1.5 rounded-lg bg-dark-bg p-2.5 text-[11px] text-slate-400 border border-dark-borderSubtle">
        <Info size={13} className="text-slate-500 flex-shrink-0 mt-0.5" />
        <p>
          End-of-day mathematical calculations benchmarked against 20-day rolling moving volume averages. Configured sensitivity dynamically recalculates the push digest alerts.
        </p>
      </div>
    </div>
  );
};
