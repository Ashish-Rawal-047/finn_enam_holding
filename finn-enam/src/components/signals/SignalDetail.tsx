import React from 'react';
import { ExternalLink, FileText, History } from 'lucide-react';
import { Drawer } from '../common/Drawer';
import { useSignal } from '../../lib/queries';
import { dateTime, humanize, shortDate } from '../../lib/format';
import { DemoPill, ErrorState, Eyebrow, LoadingBlock, PriorityBadge, SecondaryButton } from '../ui';
import { CompanyLogo } from '../company/CompanyLogo';

interface Props {
  signalId: string | null;
  onClose: () => void;
  onOpenCompany: (companyId: string) => void;
  onOpenEvent: (eventId: string) => void;
}

/** Evidence view for one signal: metrics, the facts it was derived from and its documents. */
export const SignalDetail: React.FC<Props> = ({ signalId, onClose, onOpenCompany, onOpenEvent }) => {
  const signal = useSignal(signalId);
  const s = signal.data;
  if (!signalId) return null;
  return (
    <Drawer
      isOpen={Boolean(signalId)}
      onClose={onClose}
      title={s?.categoryLabel ?? 'Signal'}
      subtitle={s ? `${s.company?.nseSymbol ?? ''} · ${s.company?.name ?? ''}` : undefined}
      leading={s?.company && <CompanyLogo {...s.company} size="md" />}
      footer={
        s && (
          <div className="flex gap-2">
            {s.eventId && (
              <SecondaryButton className="flex-1" onClick={() => onOpenEvent(s.eventId!)}>
                <History size={14} /> Event Memory
              </SecondaryButton>
            )}
            <SecondaryButton className="flex-1" onClick={() => s.company && onOpenCompany(s.company.id)}>
              Company signals
            </SecondaryButton>
          </div>
        )
      }
    >
      {signal.isLoading ? (
        <LoadingBlock rows={3} />
      ) : signal.isError || !s ? (
        <ErrorState error={signal.error} onRetry={() => signal.refetch()} />
      ) : (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={s.priority} />
            <span className="font-mono text-[11px] text-ink-muted">Materiality {s.materialityScore}/100</span>
            {s.isDemo && <DemoPill />}
          </div>
          <div>
            <h3 className="font-semibold leading-snug text-ink dark:text-white">{s.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{s.description}</p>
          </div>

          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-cream-light dark:bg-ink-surfaceSubtle p-2.5">
              <dt className="text-ink-muted">Event date</dt>
              <dd className="font-mono font-semibold text-ink dark:text-white">{shortDate(s.occurredAt)}</dd>
            </div>
            <div className="rounded-xl bg-cream-light dark:bg-ink-surfaceSubtle p-2.5">
              <dt className="text-ink-muted">Detected</dt>
              <dd className="font-mono font-semibold text-ink dark:text-white">{dateTime(s.detectedAt)}</dd>
            </div>
            {Object.entries(s.metrics)
              .filter(([, v]) => v !== null && v !== '')
              .map(([k, v]) => (
                <div key={k} className="rounded-xl bg-cream-light dark:bg-ink-surfaceSubtle p-2.5">
                  <dt className="text-ink-muted">{humanize(k.replace(/([A-Z])/g, ' $1').toLowerCase())}</dt>
                  <dd className="break-words font-mono font-semibold text-ink dark:text-white">{typeof v === 'number' ? Number(v.toFixed(2)).toLocaleString('en-IN') : String(v)}</dd>
                </div>
              ))}
          </dl>

          <section className="space-y-2">
            <Eyebrow>Evidence</Eyebrow>
            {s.evidence.length === 0 ? (
              <p className="text-xs text-ink-muted">No supporting evidence was recorded for this signal.</p>
            ) : (
              <ul className="space-y-2">
                {s.evidence.map((e, i) => (
                  <li key={i} className="rounded-xl border border-divider dark:border-ink-border p-3 text-xs">
                    <div className="font-semibold text-ink dark:text-white">{e.label}</div>
                    <p className="mt-0.5 leading-relaxed text-ink-muted">{e.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {(s.sourceDocuments?.length ?? 0) > 0 && (
            <section className="space-y-2">
              <Eyebrow>Source documents</Eyebrow>
              {s.sourceDocuments!.map((d) => (
                <div key={d.id} className="flex items-start gap-2 rounded-xl border border-divider dark:border-ink-border p-3 text-xs">
                  <FileText size={14} className="mt-0.5 shrink-0 text-forest dark:text-emerald" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink dark:text-white">{d.title}</div>
                    <div className="text-ink-muted">
                      {humanize(d.documentType)} · {d.provider}
                      {d.publishedAt ? ` · ${shortDate(d.publishedAt)}` : ''}
                    </div>
                    {d.excerpt && <p className="mt-1 text-ink-muted">{d.excerpt}</p>}
                    {d.url ? (
                      <a href={d.url} target="_blank" rel="noreferrer noopener" className="mt-1 inline-flex items-center gap-1 font-semibold text-forest dark:text-emerald">
                        Open original <ExternalLink size={11} />
                      </a>
                    ) : (
                      <p className="mt-1 text-[10.5px] text-ink-subtle">No original document link is available.</p>
                    )}
                  </div>
                  {d.isDemo && <DemoPill />}
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
};
