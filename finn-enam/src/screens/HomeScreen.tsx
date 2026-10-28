import React, { useState } from 'react';
import {
  Announcement,
  Company,
  DigestWindow,
  TriggeredAlert,
} from '../types';
import { TopAlerts } from '../components/home/TopAlerts';
import { DigestWindowBar } from '../components/home/DigestWindowBar';
import { AnnouncementCard } from '../components/home/AnnouncementCard';
import { RoutinePaperworkDrawer } from '../components/home/RoutinePaperworkDrawer';
import { Drawer } from '../components/common/Drawer';
import { Badge } from '../components/common/Badge';
import { TrendingUp, TrendingDown, ExternalLink, ShieldCheck } from 'lucide-react';

interface HomeScreenProps {
  companies: Company[];
  announcements: Announcement[];
  triggeredAlerts: TriggeredAlert[];
  activeWindow: DigestWindow;
  onChangeWindow: (w: DigestWindow) => void;
  onOpenEventMemory: (memoryId: string) => void;
  onSelectCompanyForResearch: (ticker: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  companies,
  announcements,
  triggeredAlerts,
  activeWindow,
  onChangeWindow,
  onOpenEventMemory,
  onSelectCompanyForResearch,
}) => {
  const [materialOnly, setMaterialOnly] = useState<boolean>(true);
  const [selectedAlert, setSelectedAlert] = useState<TriggeredAlert | null>(null);
  const [selectedDocForModal, setSelectedDocForModal] = useState<Announcement | null>(null);

  // Filter announcements based on window and material toggle
  const filteredAnnouncements = announcements.filter((ann) => {
    if (activeWindow === '24h') {
      if (ann.timestamp.includes('2d') || ann.timestamp.includes('3d') || ann.timestamp.includes('4d')) {
        return false;
      }
    } else if (activeWindow === '48h') {
      if (ann.timestamp.includes('3d') || ann.timestamp.includes('4d')) {
        return false;
      }
    }

    if (materialOnly && ann.isRoutine) {
      return false;
    }

    return true;
  });

  const materialList = filteredAnnouncements.filter((a) => !a.isRoutine);
  const routineList = announcements.filter((a) => a.isRoutine);

  // Portfolio metrics summary
  const advancingCount = companies.filter((c) => c.changePercent > 0).length;
  const decliningCount = companies.filter((c) => c.changePercent < 0).length;
  const avgChange = (
    companies.reduce((acc, c) => acc + c.changePercent, 0) / (companies.length || 1)
  ).toFixed(2);

  return (
    <div className="space-y-3.5 pb-20">
      {/* Portfolio Quick Health Summary */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-dark-border pb-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-white uppercase text-[11px] tracking-wider">
              Portfolio Posture
            </span>
            <span className="text-[10px] text-slate-500 font-mono">18 Stocks</span>
          </div>
          <div className="flex items-center gap-2.5 font-mono text-[10px]">
            <span className="flex items-center gap-0.5 text-emerald-400">
              <TrendingUp size={11} /> {advancingCount} Up
            </span>
            <span className="flex items-center gap-0.5 text-rose-400">
              <TrendingDown size={11} /> {decliningCount} Down
            </span>
            <span className="text-slate-400 font-semibold">
              Avg: <strong className={parseFloat(avgChange) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{avgChange}%</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-dark-textMuted">
          <span className="flex items-center gap-1">
            <ShieldCheck size={11} className="text-teal-400" /> Primary Disclosures
          </span>
          <span className="font-mono text-slate-400">EOD Close Baseline</span>
        </div>
      </div>

      {/* Top 3-5 Triggered Anomaly Alerts */}
      <TopAlerts
        alerts={triggeredAlerts}
        onSelectAlert={(alert) => setSelectedAlert(alert)}
      />

      {/* Windowed Digest Controls */}
      <DigestWindowBar
        activeWindow={activeWindow}
        onChangeWindow={onChangeWindow}
        materialOnly={materialOnly}
        onToggleMaterialOnly={() => setMaterialOnly(!materialOnly)}
        filteredCount={filteredAnnouncements.length}
        totalCount={announcements.length}
      />

      {/* Prioritized Announcement Stream */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            Prioritized Disclosures ({materialList.length})
          </h2>
          <span className="text-[10px] text-dark-textMuted font-mono">Signal Filtered</span>
        </div>

        {materialList.map((ann) => (
          <AnnouncementCard
            key={ann.id}
            announcement={ann}
            onOpenEventMemory={onOpenEventMemory}
            onOpenPrimaryDoc={(item) => setSelectedDocForModal(item)}
          />
        ))}
      </section>

      {/* Routine Paperwork Collapsible Drawer */}
      <RoutinePaperworkDrawer routineAnnouncements={routineList} />

      {/* Triggered Alert Detail Drawer */}
      {selectedAlert && (
        <Drawer
          isOpen={Boolean(selectedAlert)}
          onClose={() => setSelectedAlert(null)}
          title={selectedAlert.headline}
          subtitle={`${selectedAlert.ticker} • ${selectedAlert.timestamp}`}
          footer={
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setSelectedAlert(null);
                  onSelectCompanyForResearch(selectedAlert.ticker);
                }}
                className="flex-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white py-2 text-xs font-semibold text-center transition-colors"
              >
                Open Deep Research for {selectedAlert.ticker}
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant={selectedAlert.severity === 'critical' ? 'rose' : 'amber'}>
                {selectedAlert.triggerMetric}
              </Badge>
              <span className="font-mono text-slate-400 text-[11px]">
                {selectedAlert.companyName}
              </span>
            </div>

            <div className="rounded-lg bg-dark-bg p-3 border border-dark-border text-slate-200 leading-relaxed">
              <div className="text-[10px] uppercase font-mono text-slate-400 mb-1">
                Anomaly Assessment & Why It Matters:
              </div>
              {selectedAlert.explanation}
            </div>

            <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300">Mathematical Detection Criteria:</div>
              <p>• Traded volume calculated against 20-day Simple Moving Average (SMA-20).</p>
              <p>• Daily price delta calculated from previous official exchange close.</p>
              <p>• Verified against primary BSE/NSE end-of-day market tick feed.</p>
            </div>
          </div>
        </Drawer>
      )}

      {/* Primary Document Modal */}
      {selectedDocForModal && (
        <Drawer
          isOpen={Boolean(selectedDocForModal)}
          onClose={() => setSelectedDocForModal(null)}
          title="Primary Exchange Disclosure"
          subtitle={selectedDocForModal.ticker}
          footer={
            <a
              href={selectedDocForModal.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-teal-600 hover:bg-teal-500 text-white py-2.5 text-xs font-semibold transition-colors"
            >
              <span>Download Official Exchange PDF</span>
              <ExternalLink size={12} />
            </a>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="rounded-lg bg-dark-bg p-3 border border-dark-border">
              <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                Official Filing Title
              </span>
              <h4 className="font-semibold text-white text-sm">{selectedDocForModal.sourceDocTitle}</h4>
            </div>

            <div className="space-y-1 text-slate-300 text-xs">
              <div className="text-[10px] uppercase font-mono text-slate-500">Summary Takeaway</div>
              <p className="leading-relaxed">{selectedDocForModal.oneLineTakeaway}</p>
            </div>

            <div className="rounded-lg bg-slate-900/60 p-2.5 border border-slate-800 text-[11px] text-slate-400">
              <strong className="text-slate-300">Grounding Discipline:</strong> This filing is parsed directly from exchange repositories. FINN guarantees zero hallucinations or broker commentary interference.
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
};
