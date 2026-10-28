import React from 'react';
import { CompanyResearch } from '../../types';
import { Scale, CheckCircle2, AlertCircle, MinusCircle, FileText } from 'lucide-react';

interface NarrativeVsNumbersProps {
  items: CompanyResearch['narrativeVsNumbers'];
}

export const NarrativeVsNumbers: React.FC<NarrativeVsNumbersProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  const getVarianceIcon = (type: 'beat' | 'met' | 'miss') => {
    switch (type) {
      case 'beat':
        return <CheckCircle2 size={13} className="text-emerald-400" />;
      case 'miss':
        return <AlertCircle size={13} className="text-rose-400" />;
      case 'met':
      default:
        return <MinusCircle size={13} className="text-teal-400" />;
    }
  };

  const getVarianceBadgeClass = (type: 'beat' | 'met' | 'miss') => {
    switch (type) {
      case 'beat':
        return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50';
      case 'miss':
        return 'bg-rose-950/40 text-rose-400 border-rose-800/50';
      case 'met':
      default:
        return 'bg-teal-950/40 text-teal-400 border-teal-800/50';
    }
  };

  return (
    <div className="rounded-xl border border-dark-border bg-dark-surface p-4">
      <div className="flex items-center justify-between border-b border-dark-border pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Scale size={16} className="text-teal-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
            Narrative vs. Numbers: 4-Quarter Audit
          </h3>
        </div>
        <span className="text-[10px] text-dark-textMuted font-mono">Management vs. Audited Reality</span>
      </div>

      <p className="text-xs text-slate-400 mb-3 leading-relaxed">
        Tracking stated guidance from earnings call transcripts against audited numbers delivered in subsequent exchange filings.
      </p>

      <div className="space-y-3">
        {items.map((row, idx) => (
          <div
            key={idx}
            className="rounded-lg bg-dark-bg p-3 border border-dark-border text-xs space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-teal-400">
                {row.period}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border ${getVarianceBadgeClass(
                  row.varianceType
                )}`}
              >
                {getVarianceIcon(row.varianceType)}
                <span>{row.variance}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="rounded bg-dark-surface p-2 border border-dark-borderSubtle">
                <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">
                  Management Promised:
                </span>
                <p className="text-slate-300 leading-snug">{row.managementGuidance}</p>
              </div>

              <div className="rounded bg-dark-surface p-2 border border-dark-borderSubtle">
                <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">
                  Audited Delivery:
                </span>
                <p className="text-white font-medium leading-snug">{row.actualDelivered}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <FileText size={10} /> {row.sourceDoc}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

