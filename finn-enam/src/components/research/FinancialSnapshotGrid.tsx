import React from 'react';
import { CompanyResearch } from '../../types';
import { ShieldCheck, AlertCircle } from 'lucide-react';

interface FinancialSnapshotGridProps {
  financials: CompanyResearch['financialSnapshot'];
  cashQuality: CompanyResearch['cashQualityAnalysis'];
}

export const FinancialSnapshotGrid: React.FC<FinancialSnapshotGridProps> = ({
  financials,
  cashQuality,
}) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Revenue TTM */}
        <div className="rounded-xl border border-dark-border bg-dark-surface p-3">
          <span className="text-[10px] font-mono uppercase text-dark-textMuted">Revenue (TTM)</span>
          <div className="text-base font-bold text-white font-mono mt-1">
            {financials.revenueTtm}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Consolidated top line</span>
        </div>

        {/* EBITDA Margin */}
        <div className="rounded-xl border border-dark-border bg-dark-surface p-3">
          <span className="text-[10px] font-mono uppercase text-dark-textMuted">EBITDA Margin</span>
          <div className="text-base font-bold text-teal-400 font-mono mt-1">
            {financials.ebitdaMargin}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Operating core margin</span>
        </div>

        {/* ROCE / ROE */}
        <div className="rounded-xl border border-dark-border bg-dark-surface p-3">
          <span className="text-[10px] font-mono uppercase text-dark-textMuted">ROCE / ROE</span>
          <div className="text-base font-bold text-white font-mono mt-1">
            {financials.roce} <span className="text-xs text-slate-500">/ {financials.roe}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Capital productivity</span>
        </div>

        {/* D/E & Leverage */}
        <div className="rounded-xl border border-dark-border bg-dark-surface p-3">
          <span className="text-[10px] font-mono uppercase text-dark-textMuted">Debt-to-Equity</span>
          <div className="text-base font-bold text-emerald-400 font-mono mt-1">
            {financials.debtToEquity}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Prudent balance sheet</span>
        </div>
      </div>

      {/* Cash Conversion & Quality Strip */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-3.5 space-y-2">
        <div className="flex items-center justify-between border-b border-dark-border pb-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={15} className="text-teal-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
              Cash Flow Quality & Conversion Audit
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400">
              CFO / PAT: <strong className="text-white">{financials.cfoPatConversion.toFixed(2)}x</strong>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              FCF TTM: <strong className="text-white">{financials.fcfTtm}</strong>
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {cashQuality.cfoVsPatCommentary}
        </p>

        <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400 font-mono">
          <span>Working Capital Cycle: <strong className="text-slate-200">{financials.workingCapitalDays} days</strong></span>
          {cashQuality.redFlagsDetected ? (
            <span className="flex items-center gap-1 text-rose-400">
              <AlertCircle size={12} /> Red Flag Detected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck size={12} /> No Accounting Anomalies
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
