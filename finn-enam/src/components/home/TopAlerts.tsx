import React, { useState } from 'react';
import { TriggeredAlert } from '../../types';
import { AlertTriangle, TrendingUp, Flame, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '../common/Badge';

interface TopAlertsProps {
  alerts: TriggeredAlert[];
  onSelectAlert: (alert: TriggeredAlert) => void;
}

export const TopAlerts: React.FC<TopAlertsProps> = ({ alerts, onSelectAlert }) => {
  const [showAll, setShowAll] = useState<boolean>(false);

  if (!alerts || alerts.length === 0) return null;

  const visibleAlerts = showAll ? alerts : alerts.slice(0, 3);

  const getAlertIcon = (type: TriggeredAlert['type']) => {
    switch (type) {
      case 'volume_spike':
        return <Flame size={14} className="text-amber-400" />;
      case 'price_move':
        return <TrendingUp size={14} className="text-emerald-400" />;
      case 'material_filing':
      case 'guidance_miss':
      default:
        return <AlertTriangle size={14} className="text-rose-400" />;
    }
  };

  const getSeverityBadgeVariant = (severity: TriggeredAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'rose';
      case 'high':
        return 'amber';
      default:
        return 'teal';
    }
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            Key Market Triggers
          </h2>
          <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-950/80 text-[10px] font-bold text-rose-400 border border-rose-800/50 px-1">
            {alerts.length}
          </span>
        </div>
        <span className="text-[10px] text-dark-textMuted font-mono">Threshold Watched</span>
      </div>

      <div className="space-y-1.5">
        {visibleAlerts.map((alert) => (
          <div
            key={alert.id}
            onClick={() => onSelectAlert(alert)}
            className="group relative flex cursor-pointer items-center justify-between gap-2.5 rounded-xl border border-dark-border bg-dark-surface p-3 transition-all hover:border-slate-700 hover:bg-dark-surfaceElevated active:scale-[0.99] overflow-hidden"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900 border border-slate-800">
                {getAlertIcon(alert.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono text-xs font-bold text-white tracking-tight">
                    {alert.ticker}
                  </span>
                  <Badge variant={getSeverityBadgeVariant(alert.severity)} size="sm">
                    {alert.triggerMetric}
                  </Badge>
                  <span className="text-[10px] text-slate-500 font-mono ml-auto truncate">
                    {alert.timestamp}
                  </span>
                </div>
                <h3 className="text-xs font-medium text-slate-200 truncate mt-0.5 group-hover:text-white transition-colors">
                  {alert.headline}
                </h3>
              </div>
            </div>

            <ChevronRight
              size={15}
              className="text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300 flex-shrink-0"
            />
          </div>
        ))}

        {alerts.length > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-slate-400 hover:text-teal-400 transition-colors"
          >
            {showAll ? (
              <>
                <ChevronUp size={13} />
                <span>Show Fewer Triggers</span>
              </>
            ) : (
              <>
                <ChevronDown size={13} />
                <span>Show {alerts.length - 3} More Triggers</span>
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
};
