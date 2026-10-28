import React, { useState } from 'react';
import { EventMemoryItem } from '../types';
import { CommitmentCard } from '../components/memory/CommitmentCard';
import { Drawer } from '../components/common/Drawer';
import { History, Sparkles, ShieldCheck } from 'lucide-react';

interface EventMemoryScreenProps {
  memoryItems: EventMemoryItem[];
  initialActiveId?: string | null;
}

export const EventMemoryScreen: React.FC<EventMemoryScreenProps> = ({
  memoryItems,
  initialActiveId,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [evidenceModalItem, setEvidenceModalItem] = useState<EventMemoryItem | null>(null);

  // Status and Category filter pills
  const statusOptions: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Status' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'pending', label: 'Tracking' },
    { id: 'delayed', label: 'Delayed' },
  ];

  const categoryOptions: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Domains' },
    { id: 'capacity', label: 'Capacity' },
    { id: 'capex', label: 'Capex' },
    { id: 'margin', label: 'Margin' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'product', label: 'Restructuring' },
  ];

  const filteredItems = memoryItems.filter((item) => {
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesStatus && matchesCategory;
  });

  const deliveredCount = memoryItems.filter((i) => i.status === 'delivered').length;
  const pendingCount = memoryItems.filter((i) => i.status === 'pending').length;
  const delayedCount = memoryItems.filter((i) => i.status === 'delayed').length;

  return (
    <div className="space-y-4 pb-20">
      {/* Event Memory Institutional Value Header */}
      <div className="rounded-xl border border-teal-900/40 bg-teal-950/20 p-4">
        <div className="flex items-center justify-between border-b border-teal-900/30 pb-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-900/60 text-teal-400">
              <History size={14} />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-300 font-mono">
              FINN Event Memory™ Ledger
            </h2>
          </div>
          <span className="text-[10px] text-teal-400/80 font-mono">Management Accountability</span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-3">
          Cross-quarter commitment ledger tracking historical management promises (capex, margins, timelines) against subsequent audited disclosures.
        </p>

        {/* Milestone Stats */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-dark-bg/80 p-2 border border-dark-border">
            <span className="text-[10px] uppercase font-mono text-emerald-400 block">Delivered</span>
            <span className="text-base font-bold text-white font-mono">{deliveredCount}</span>
          </div>
          <div className="rounded-lg bg-dark-bg/80 p-2 border border-dark-border">
            <span className="text-[10px] uppercase font-mono text-sky-400 block">In Progress</span>
            <span className="text-base font-bold text-white font-mono">{pendingCount}</span>
          </div>
          <div className="rounded-lg bg-dark-bg/80 p-2 border border-dark-border">
            <span className="text-[10px] uppercase font-mono text-rose-400 block">Delayed</span>
            <span className="text-base font-bold text-white font-mono">{delayedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
          {statusOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedStatus(opt.id)}
              className={`rounded-md px-2.5 py-1 font-medium transition-all whitespace-nowrap ${
                selectedStatus === opt.id
                  ? 'bg-teal-600 text-white font-semibold shadow-sm'
                  : 'bg-dark-surface text-slate-400 hover:text-white border border-dark-border'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
          {categoryOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedCategory(opt.id)}
              className={`rounded-md px-2 py-0.5 transition-all whitespace-nowrap ${
                selectedCategory === opt.id
                  ? 'bg-slate-700 text-teal-300 font-medium'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Commitment Cards Stream */}
      <div className="space-y-3">
        {filteredItems.map((item) => (
          <CommitmentCard
            key={item.id}
            item={item}
            defaultExpanded={item.id === initialActiveId}
            onOpenSourceEvidence={(mem) => setEvidenceModalItem(mem)}
          />
        ))}

        {filteredItems.length === 0 && (
          <div className="rounded-xl border border-dashed border-dark-border p-8 text-center text-xs text-slate-500">
            No corporate commitments match the selected filter criteria.
          </div>
        )}
      </div>

      {/* Supporting Evidence Modal */}
      {evidenceModalItem && (
        <Drawer
          isOpen={Boolean(evidenceModalItem)}
          onClose={() => setEvidenceModalItem(null)}
          title="Source Document Evidence"
          subtitle={`${evidenceModalItem.ticker} • ${evidenceModalItem.title}`}
          footer={
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 text-[11px]">
                <ShieldCheck size={12} className="text-teal-400" /> Primary Source Grounded
              </span>
              <button
                onClick={() => setEvidenceModalItem(null)}
                className="rounded-lg bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 text-xs font-semibold"
              >
                Done
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="rounded-lg bg-dark-bg p-3 border border-dark-border">
              <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                Primary Source Filing Reference
              </span>
              <p className="font-semibold text-white">{evidenceModalItem.sourceDoc}</p>
              <div className="text-[11px] text-teal-400 font-mono mt-1">
                Announced: {evidenceModalItem.commitmentDate}
              </div>
            </div>

            <div className="rounded-lg border-l-2 border-teal-500 bg-teal-950/20 p-3">
              <span className="text-[10px] uppercase font-mono text-teal-400 block mb-1">
                Verbatim Primary Disclosure Excerpt:
              </span>
              <p className="text-slate-200 italic leading-relaxed">
                {evidenceModalItem.sourcePageOrQuote}
              </p>
            </div>

            <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles size={12} className="text-teal-400" />
                Audit Trail Verification Methodology:
              </div>
              <p>• Commitments are extracted using deterministic NLP across official earnings call transcripts and board resolutions.</p>
              <p>• Follow-on quarterly 10-Q/Results releases are scanned automatically for capital expenditure and commissioning disclosures.</p>
              <p>• Discrepancies between narrative guidance and audited numbers are surfaced directly to the portfolio manager.</p>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
};
