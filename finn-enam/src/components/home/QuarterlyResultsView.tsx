import React from 'react';
import { QuarterlyResults } from '../../types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface QuarterlyResultsViewProps {
  results: QuarterlyResults;
}

export const QuarterlyResultsView: React.FC<QuarterlyResultsViewProps> = ({ results }) => {
  const formatChange = (val: number, isBps = false) => {
    const isPos = val >= 0;
    const sign = isPos ? '+' : '';
    const unit = isBps ? ' bps' : '%';
    return (
      <span
        className={`inline-flex items-center gap-0.5 font-mono text-[11px] font-semibold ${
          isPos ? 'text-emerald-400' : 'text-rose-400'
        }`}
      >
        {isPos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {sign}{val.toFixed(1)}{unit}
      </span>
    );
  };

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-dark-border bg-dark-bg/80 p-3.5">
      <div className="flex items-center justify-between border-b border-dark-border pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-400 font-mono">
            {results.quarter} Headline Financials
          </span>
          <span className="text-[10px] text-slate-500 font-mono">₹ Crores</span>
        </div>
        <div className="text-[11px] text-slate-400">
          EBITDA Margin: <strong className="text-white font-mono">{results.ebitdaMargin.toFixed(1)}%</strong> ({formatChange(results.ebitdaMarginChangeBps, true)})
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Revenue */}
        <div className="rounded-lg bg-dark-surface p-2.5 border border-dark-border">
          <div className="text-[11px] text-dark-textMuted font-medium">Revenue</div>
          <div className="text-sm font-bold text-white font-mono mt-0.5">
            ₹{results.revenue.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-dark-borderSubtle">
            <span className="text-[10px] text-slate-500">YoY:</span>
            {formatChange(results.revenueYoY)}
          </div>
        </div>

        {/* EBITDA */}
        <div className="rounded-lg bg-dark-surface p-2.5 border border-dark-border">
          <div className="text-[11px] text-dark-textMuted font-medium">EBITDA</div>
          <div className="text-sm font-bold text-white font-mono mt-0.5">
            ₹{results.ebitda.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-dark-borderSubtle">
            <span className="text-[10px] text-slate-500">YoY:</span>
            {formatChange(results.ebitdaYoY)}
          </div>
        </div>

        {/* PBT */}
        <div className="rounded-lg bg-dark-surface p-2.5 border border-dark-border">
          <div className="text-[11px] text-dark-textMuted font-medium">PBT</div>
          <div className="text-sm font-bold text-white font-mono mt-0.5">
            ₹{results.pbt.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-dark-borderSubtle">
            <span className="text-[10px] text-slate-500">YoY:</span>
            {formatChange(results.pbtYoY)}
          </div>
        </div>

        {/* PAT */}
        <div className="rounded-lg bg-dark-surface p-2.5 border border-dark-border">
          <div className="text-[11px] text-dark-textMuted font-medium">PAT (Net Profit)</div>
          <div className="text-sm font-bold text-white font-mono mt-0.5">
            ₹{results.pat.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-dark-borderSubtle">
            <span className="text-[10px] text-slate-500">YoY:</span>
            {formatChange(results.patYoY)}
          </div>
        </div>
      </div>
    </div>
  );
};
