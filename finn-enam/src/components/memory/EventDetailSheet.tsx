import React, { useState } from 'react';
import { ExternalLink, FileText, GitCompare, PlusCircle } from 'lucide-react';
import { FullScreenSheet } from '../common/FullScreenSheet';
import { useEvent, useEventMutations } from '../../lib/queries';
import { crore, humanize, shortDate } from '../../lib/format';
import type { EventDetail, EventStatus, OutcomeLabel, SourceDocument } from '../../lib/types';
import { ApiRequestError } from '../../lib/api';
import { DemoPill, ErrorState, Eyebrow, Field, LoadingBlock, Panel, PrimaryButton, SecondaryButton, SectionTitle, inputCls } from '../ui';
import { ExecutionBar, StatusBadge } from '../../screens/EventMemoryScreen';
import { CompanyLogo } from '../company/CompanyLogo';

const LIFECYCLE: EventStatus[] = ['announced', 'initiated', 'in_progress', 'on_track', 'completed'];
const ALL_STATUSES: EventStatus[] = ['announced', 'initiated', 'in_progress', 'on_track', 'delayed', 'completed', 'abandoned', 'outcome_unverified'];
const OUTCOMES: EventStatus[] = ['completed', 'delayed', 'abandoned'];

interface Props {
  eventId: string | null;
  /** When opened from an alert's historical match: the new event to compare against. */
  compareWithId?: string | null;
  onClose: () => void;
  onOpenEvent: (id: string) => void;
  onOpenCompany: (id: string) => void;
}

export const EventDetailSheet: React.FC<Props> = ({ eventId, compareWithId, onClose, onOpenEvent, onOpenCompany }) => {
  const event = useEvent(eventId);
  const newEvent = useEvent(compareWithId && compareWithId !== eventId ? compareWithId : null);
  const [updating, setUpdating] = useState(false);
  const e = event.data;
  if (!eventId) return null;
  return (
    <FullScreenSheet
      open={Boolean(eventId)}
      onClose={() => {
        setUpdating(false);
        onClose();
      }}
      title={e?.title ?? 'Event'}
      subtitle={e ? `${e.company.nseSymbol ?? ''} · ${e.company.name}` : undefined}
      leading={e && <CompanyLogo {...e.company} size="md" />}
    >
      {event.isLoading ? (
        <LoadingBlock rows={4} />
      ) : event.isError || !e ? (
        <ErrorState error={event.error} onRetry={() => event.refetch()} />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={e.status} />
            <span className="text-xs text-ink-muted">{humanize(e.category)}{e.projectType ? ` · ${e.projectType}` : ''}</span>
            {e.isDemo && <DemoPill />}
            <span className="text-[10.5px] text-ink-subtle">Extracted: {e.extractionMethod}</span>
          </div>

          <OutcomeBanner outcome={e.outcome} delayDays={e.execution?.delayDays ?? null} />

          {newEvent.data && <Comparison historical={e} current={newEvent.data} onOpenEvent={onOpenEvent} />}

          <Lifecycle status={e.status} />
          <div className="space-y-1.5">
            <ExecutionBar event={{ ...e, delayDays: e.execution?.delayDays ?? null }} />
            <div className="flex justify-between font-mono text-[10.5px] text-ink-muted">
              <span>Announced {shortDate(e.announcedAt)}</span>
              <span>{e.expectedCompletionDate ? `Target ${shortDate(e.expectedCompletionDate)}` : 'No target disclosed'}</span>
            </div>
          </div>

          {/* Commitment */}
          <Panel className="space-y-3">
            <SectionTitle title="Original announcement" meta={`Announced ${shortDate(e.announcedAt)}`} />
            <p className="border-l-2 border-forest dark:border-emerald pl-3 text-sm leading-relaxed text-ink dark:text-ink-light">{e.originalAnnouncement}</p>
            {e.isDemo && <p className="text-[10.5px] text-ink-muted">Demo fixture text — not a verbatim management quotation.</p>}
            {e.sourceDocument && <DocLine doc={e.sourceDocument} />}
            {e.commitments.length > 0 && (
              <div>
                <Eyebrow>Management commitments</Eyebrow>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-ink dark:text-ink-light">
                  {e.commitments.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            {e.investmentSignificance && (
              <div>
                <Eyebrow>Investment significance</Eyebrow>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{e.investmentSignificance}</p>
              </div>
            )}
          </Panel>

          {/* Expected vs actual */}
          <Panel className="space-y-3">
            <SectionTitle title="Expected vs actual" />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Cell label="Expected completion" value={e.expectedCompletionDate ? shortDate(e.expectedCompletionDate) : 'Not disclosed'} />
              <Cell label="Actual completion" value={e.execution?.actualCompletionDate ? shortDate(e.execution.actualCompletionDate) : 'Not reported'} />
              <Cell label="Expected outlay" value={crore(e.expectedCapexCr)} />
              <Cell label="Actual outlay" value={crore(e.execution?.actualCapexCr)} />
              <Cell label="Expected capacity" value={e.expectedCapacityValue ? `${e.expectedCapacityValue} ${e.expectedCapacityUnit ?? ''}` : '—'} />
              <Cell label="Actual capacity" value={e.execution?.actualCapacityValue ? `${e.execution.actualCapacityValue} ${e.expectedCapacityUnit ?? ''}` : '—'} />
            </div>
            {e.execution ? (
              <div className="rounded-xl bg-cream-light dark:bg-ink-surfaceSubtle p-3 text-xs space-y-1">
                <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono">
                  <span>Delay: {e.execution.delayDays !== null ? `${e.execution.delayDays} days (${(e.execution.delayDays / 30.44).toFixed(1)} mo)` : 'not computable'}</span>
                  {e.execution.capexVariancePct !== null && <span>Outlay variance: {e.execution.capexVariancePct}%</span>}
                  {e.execution.guidanceAccuracy && <span>Guidance: {humanize(e.execution.guidanceAccuracy)}</span>}
                </div>
                <p className="text-ink-muted">Evidence: {e.execution.evidenceExcerpt}</p>
              </div>
            ) : (
              <p className="text-[11px] text-ink-muted">No outcome recorded yet. An outcome can only be recorded with supporting evidence.</p>
            )}
          </Panel>

          {/* Precedents */}
          <section className="space-y-2">
            <SectionTitle title="Historical precedents" meta="Same-company history first · structured match (company, category, project type, scale, wording) plus semantic similarity when embeddings exist" />
            {e.similarEvents.length === 0 ? (
              <p className="rounded-xl border border-dashed border-divider dark:border-ink-border p-4 text-xs text-ink-muted">No comparable historical event is recorded.</p>
            ) : (
              e.similarEvents.map((s) => (
                <Panel key={s.similarEventId} className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-forest dark:text-emerald">
                        <GitCompare size={12} /> {Math.round(s.combinedScore * 100)}% match
                        {s.semanticScore !== null && <span className="font-normal text-ink-muted">(semantic {Math.round(s.semanticScore * 100)}%)</span>}
                      </div>
                      <div className="mt-0.5 text-sm font-semibold leading-snug text-ink dark:text-white">{s.event.title}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-muted">
                        <CompanyLogo {...s.company} size="xs" />
                        {s.company.nseSymbol} · announced {shortDate(s.event.announcedAt)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={s.event.status} />
                      <span className={`text-[10.5px] font-semibold ${OUTCOME_TEXT[s.outcome]}`}>{s.outcome}</span>
                      {s.sameCompany && <span className="text-[10px] text-ink-subtle">Same company</span>}
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-ink dark:text-ink-light">{s.explanation}</p>
                  <div className="flex flex-wrap gap-1">
                    {s.matchedOn.map((m) => (
                      <span key={m} className="rounded-md border border-divider dark:border-ink-border px-1.5 py-0.5 text-[10px] text-ink-muted">
                        {m}
                      </span>
                    ))}
                  </div>
                  <button onClick={() => onOpenEvent(s.similarEventId)} className="min-h-[36px] text-xs font-semibold text-forest dark:text-emerald hover:underline">
                    Inspect original event →
                  </button>
                </Panel>
              ))
            )}
          </section>

          {e.matchedBy.length > 0 && (
            <section className="space-y-2">
              <SectionTitle title="Matched by later announcements" meta="Newer commitments for which this event is a precedent" />
              <ul className="divide-y divide-divider overflow-hidden rounded-card border border-divider bg-paper dark:divide-ink-border dark:border-ink-border dark:bg-ink-surface">
                {e.matchedBy.map((m) => (
                  <li key={m.id}>
                    <button onClick={() => onOpenEvent(m.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-cream-light dark:hover:bg-ink-surfaceSubtle">
                      <CompanyLogo {...m.company} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink dark:text-white">{m.title}</span>
                        <span className="font-mono text-[10.5px] text-ink-muted">
                          {m.company.nseSymbol} · {shortDate(m.announcedAt)} · {Math.round(m.combinedScore * 100)}% match
                        </span>
                      </span>
                      <StatusBadge status={m.status} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Milestones */}
          <section className="space-y-2">
            <SectionTitle
              title="Milestones & evidence"
              action={
                !updating && (
                  <button onClick={() => setUpdating(true)} className="inline-flex min-h-[40px] items-center gap-1 text-xs font-semibold text-forest dark:text-emerald">
                    <PlusCircle size={14} /> Add update
                  </button>
                )
              }
            />
            {updating && <MilestoneForm event={e} onDone={() => setUpdating(false)} />}
            <ol className="ml-2 border-l-2 border-divider dark:border-ink-border">
              {[...e.milestones].reverse().map((m) => (
                <li key={m.id} className="relative pb-4 pl-4">
                  <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-cream dark:border-ink-bg bg-forest dark:bg-emerald" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-ink dark:text-white">{shortDate(m.milestoneDate)}</span>
                    <StatusBadge status={m.statusAfter} />
                    {m.reportedMetric && <span className="font-mono text-[10.5px] text-ink-muted">{m.reportedMetric}</span>}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink dark:text-ink-light">{m.description}</p>
                  {m.sourceDocument && <DocLine doc={m.sourceDocument} />}
                </li>
              ))}
            </ol>
          </section>

          {e.companyReliability.eventsWithOutcome > 0 && (
            <Panel className="space-y-1">
              <SectionTitle title={`${e.company.nseSymbol} execution reliability`} />
              <p className="text-xs text-ink dark:text-ink-light">
                {e.companyReliability.completed} completed · {e.companyReliability.delayed} delayed · {e.companyReliability.abandoned} abandoned
                {e.companyReliability.onTimeRate !== null && ` · ${e.companyReliability.onTimeRate}% on time`}
                {e.companyReliability.averageDelayDays !== null && ` · avg delay ${e.companyReliability.averageDelayDays} days`}
              </p>
            </Panel>
          )}

          <SecondaryButton className="w-full" onClick={() => onOpenCompany(e.companyId)}>
            Open {e.company.nseSymbol} signals
          </SecondaryButton>
        </div>
      )}
    </FullScreenSheet>
  );
};

const OUTCOME_TEXT: Record<OutcomeLabel, string> = {
  'Delivered on time': 'text-fin-up dark:text-emerald',
  'Delivered early': 'text-fin-up dark:text-emerald',
  'Delivered late': 'text-fin-amber',
  'Delivered — timing unverified': 'text-forest dark:text-emerald',
  Delayed: 'text-fin-amber',
  Abandoned: 'text-fin-red',
  'In progress': 'text-ink-muted',
  'Outcome unverified': 'text-ink-muted',
};

const OutcomeBanner: React.FC<{ outcome: OutcomeLabel; delayDays: number | null }> = ({ outcome, delayDays }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-divider bg-paper px-4 py-3 dark:border-ink-border dark:bg-ink-surface">
    <div>
      <Eyebrow>Execution outcome</Eyebrow>
      <div className={`mt-0.5 font-serif text-[20px] leading-tight ${OUTCOME_TEXT[outcome]}`}>{outcome}</div>
    </div>
    {delayDays !== null && (
      <div className="text-right">
        <Eyebrow>{delayDays > 0 ? 'Delay' : 'Ahead'}</Eyebrow>
        <div className="mt-0.5 font-mono text-[15px] text-ink dark:text-white">{Math.abs(delayDays)} days</div>
      </div>
    )}
  </div>
);

/** New announcement vs. the historical precedent it was matched to. */
const Comparison: React.FC<{ historical: EventDetail; current: EventDetail; onOpenEvent: (id: string) => void }> = ({ historical: h, current: c, onOpenEvent }) => {
  const months = (a: string, b: string | null) => (b ? Math.round((Date.parse(b) - Date.parse(a)) / (86_400_000 * 30.44)) : null);
  const plannedNew = months(c.announcedAt, c.expectedCompletionDate);
  const plannedOld = months(h.announcedAt, h.expectedCompletionDate);
  const rows: Array<{ label: string; now: string; then: string; same?: boolean }> = [
    { label: 'Company', now: c.company.name, then: h.company.name, same: c.companyId === h.companyId },
    { label: 'Category', now: humanize(c.category), then: humanize(h.category), same: c.category === h.category },
    { label: 'Project type', now: c.projectType ?? '—', then: h.projectType ?? '—', same: Boolean(c.projectType && c.projectType === h.projectType) },
    { label: 'Announced', now: shortDate(c.announcedAt), then: shortDate(h.announcedAt) },
    { label: 'Planned timeline', now: plannedNew !== null ? `${plannedNew} months` : 'Not disclosed', then: plannedOld !== null ? `${plannedOld} months` : 'Not disclosed' },
    { label: 'Expected completion', now: c.expectedCompletionDate ? shortDate(c.expectedCompletionDate) : 'Not disclosed', then: h.expectedCompletionDate ? shortDate(h.expectedCompletionDate) : 'Not disclosed' },
    { label: 'Actual completion', now: c.execution?.actualCompletionDate ? shortDate(c.execution.actualCompletionDate) : '—', then: h.execution?.actualCompletionDate ? shortDate(h.execution.actualCompletionDate) : 'Not reported' },
    { label: 'Investment', now: crore(c.expectedCapexCr), then: h.execution?.actualCapexCr ? `${crore(h.expectedCapexCr)} planned · ${crore(h.execution.actualCapexCr)} actual` : crore(h.expectedCapexCr) },
    { label: 'Capacity', now: c.expectedCapacityValue ? `${c.expectedCapacityValue} ${c.expectedCapacityUnit ?? ''}` : '—', then: h.expectedCapacityValue ? `${h.expectedCapacityValue} ${h.expectedCapacityUnit ?? ''}` : '—' },
    { label: 'Status / outcome', now: humanize(c.status), then: h.outcome },
    { label: 'Delay', now: '—', then: h.execution?.delayDays !== null && h.execution?.delayDays !== undefined ? `${h.execution.delayDays} days` : 'Not computable' },
  ];
  return (
    <Panel padded={false} className="overflow-hidden border-forest/25 dark:border-emerald/25">
      <div className="flex items-center gap-2 border-b border-divider bg-sage/60 px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-eyebrow text-forest dark:border-ink-border dark:bg-emerald-subtle/40 dark:text-emerald">
        <GitCompare size={13} /> New announcement vs historical precedent
      </div>
      <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-divider px-4 py-2 text-2xs font-medium uppercase tracking-eyebrow text-ink-subtle dark:border-ink-border">
        <span />
        <button onClick={() => onOpenEvent(c.id)} className="truncate text-left text-forest hover:underline dark:text-emerald">New · {c.company.nseSymbol}</button>
        <span>Historical</span>
      </div>
      <dl className="divide-y divide-divider dark:divide-ink-border">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 px-4 py-2 text-[12px]">
            <dt className="text-ink-muted">{r.label}</dt>
            <dd className="text-ink dark:text-white">{r.now}</dd>
            <dd className="text-ink dark:text-white">
              {r.then}
              {r.same !== undefined && <span className={`ml-1.5 text-[10px] font-semibold ${r.same ? 'text-forest dark:text-emerald' : 'text-ink-subtle'}`}>{r.same ? 'same' : 'differs'}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-divider px-4 py-2.5 text-[11.5px] leading-snug text-ink-muted dark:border-ink-border">
        New: “{c.title}”. Historical: “{h.title}”.
      </p>
    </Panel>
  );
};

const Cell: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-divider dark:border-ink-border p-2.5">
    <div className="text-[10.5px] text-ink-muted">{label}</div>
    <div className="font-mono font-semibold text-ink dark:text-white">{value}</div>
  </div>
);

const DocLine: React.FC<{ doc: SourceDocument }> = ({ doc }) => (
  <div className="mt-1 flex items-start gap-1.5 text-[11px] text-ink-muted">
    <FileText size={12} className="mt-0.5 shrink-0" />
    <span className="min-w-0">
      {doc.title}
      {doc.publishedAt ? ` · ${shortDate(doc.publishedAt)}` : ''}
      {doc.url && (
        <a href={doc.url} target="_blank" rel="noreferrer noopener" className="ml-1 inline-flex items-center gap-0.5 font-semibold text-forest dark:text-emerald">
          open <ExternalLink size={10} />
        </a>
      )}
      {doc.isDemo && <span className="ml-1 text-fin-amber">(demo)</span>}
    </span>
  </div>
);

const Lifecycle: React.FC<{ status: EventStatus }> = ({ status }) => {
  const idx = LIFECYCLE.indexOf(status);
  const offPath = idx === -1;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1" aria-label={`Lifecycle: ${humanize(status)}`}>
        {LIFECYCLE.map((s, i) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${!offPath && i <= idx ? 'bg-forest dark:bg-emerald' : 'bg-divider dark:bg-ink-border'}`} />
        ))}
      </div>
      <div className="flex justify-between text-[9.5px] font-mono uppercase text-ink-subtle">
        <span>Announced</span>
        <span>{offPath ? humanize(status) : 'Completed'}</span>
      </div>
    </div>
  );
};

const MilestoneForm: React.FC<{ event: EventDetail; onDone: () => void }> = ({ event, onDone }) => {
  const { addMilestone } = useEventMutations(event.id);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    milestoneDate: today,
    statusAfter: event.status as EventStatus,
    description: '',
    reportedMetric: '',
    docTitle: '',
    docUrl: '',
    evidenceExcerpt: '',
    actualCompletionDate: '',
    revisedCompletionDate: '',
    actualCapexCr: '',
  });
  const set = (k: keyof typeof form) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: ev.target.value }));
  const needsEvidence = OUTCOMES.includes(form.statusAfter);
  const error = addMilestone.error instanceof ApiRequestError ? addMilestone.error : null;

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    addMilestone.mutate(
      {
        milestoneDate: form.milestoneDate,
        statusAfter: form.statusAfter,
        description: form.description,
        reportedMetric: form.reportedMetric || null,
        evidenceExcerpt: form.evidenceExcerpt || null,
        sourceDocument: form.docTitle ? { title: form.docTitle, url: form.docUrl || null, documentType: 'exchange_filing', publishedAt: form.milestoneDate } : null,
        execution: needsEvidence
          ? {
              actualCompletionDate: form.actualCompletionDate || null,
              revisedCompletionDate: form.revisedCompletionDate || null,
              actualCapexCr: form.actualCapexCr ? Number(form.actualCapexCr) : null,
            }
          : undefined,
      },
      { onSuccess: onDone },
    );
  };

  return (
    <Panel>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Date">
            <input type="date" className={inputCls} value={form.milestoneDate} onChange={set('milestoneDate')} required />
          </Field>
          <Field label="New status">
            <select className={inputCls} value={form.statusAfter} onChange={set('statusAfter')}>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="What happened">
          <textarea className={inputCls} rows={3} value={form.description} onChange={set('description')} required minLength={5} />
        </Field>
        <Field label="Reported metric (optional)">
          <input className={inputCls} value={form.reportedMetric} onChange={set('reportedMetric')} placeholder="e.g. 60% of capacity commissioned" />
        </Field>
        <Field label={`Source document title${needsEvidence ? ' (required)' : ''}`}>
          <input className={inputCls} value={form.docTitle} onChange={set('docTitle')} required={needsEvidence} placeholder="e.g. Q3 FY26 investor presentation" />
        </Field>
        <Field label="Source URL (optional)">
          <input type="url" className={inputCls} value={form.docUrl} onChange={set('docUrl')} placeholder="https://" />
        </Field>
        <Field label={`Evidence excerpt${needsEvidence ? ' (required)' : ''}`}>
          <textarea className={inputCls} rows={2} value={form.evidenceExcerpt} onChange={set('evidenceExcerpt')} required={needsEvidence} />
        </Field>
        {needsEvidence && (
          <div className="grid grid-cols-2 gap-2">
            {form.statusAfter === 'completed' ? (
              <Field label="Actual completion">
                <input type="date" className={inputCls} value={form.actualCompletionDate} onChange={set('actualCompletionDate')} required />
              </Field>
            ) : (
              <Field label="Revised completion">
                <input type="date" className={inputCls} value={form.revisedCompletionDate} onChange={set('revisedCompletionDate')} />
              </Field>
            )}
            <Field label="Actual outlay (₹ Cr)">
              <input type="number" min={0} step="any" className={inputCls} value={form.actualCapexCr} onChange={set('actualCapexCr')} />
            </Field>
          </div>
        )}
        {needsEvidence && <p className="text-[11px] text-ink-muted">Outcomes require a source document and an evidence excerpt; FINN will not record them otherwise.</p>}
        {error && <ErrorState error={error} />}
        <div className="flex gap-2">
          <SecondaryButton type="button" className="flex-1" onClick={onDone}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit" className="flex-1" busy={addMilestone.isPending}>
            Save update
          </PrimaryButton>
        </div>
      </form>
    </Panel>
  );
};
