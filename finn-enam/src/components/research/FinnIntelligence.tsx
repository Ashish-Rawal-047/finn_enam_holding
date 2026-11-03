/**
 * FINN Intelligence: the structured AI analysis stored with a research report (what changed and
 * why it matters, what supports the business, what concerns investors, what to monitor), and the
 * evidence each point cites. Only points whose citations and figures were verified are stored.
 */
import React, { useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import type { CitedEvidence, Claim, Intelligence, ResearchReport, SectionProgress } from '../../lib/types';
import { dateTime } from '../../lib/format';
import { cx, Eyebrow, Skeleton } from '../ui';
import { ToneIcon } from './Overview';

const KIND: Record<CitedEvidence['kind'], string> = {
  reported_fact: 'Reported',
  calculated_metric: 'Calculated',
  document_excerpt: 'Filing excerpt',
  event: 'Recorded event',
};

/** "Evidence (2)" toggle listing the cited items, their type and a link to the original source. */
export const EvidenceToggle: React.FC<{ evidence: CitedEvidence[] }> = ({ evidence }) => {
  const [open, setOpen] = useState(false);
  if (!evidence.length) return null;
  return (
    <div className="mt-1.5">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex min-h-[28px] items-center gap-1 text-[11px] font-semibold text-forest dark:text-emerald">
        Evidence ({evidence.length}) <ChevronDown size={12} className={cx('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="mt-1 space-y-2 border-l-2 border-divider pl-3 dark:border-ink-border">
          {evidence.map((e) => (
            <li key={e.id} className="text-[11.5px] leading-snug">
              <span className="font-mono text-[10px] text-ink-subtle">{e.id} · {KIND[e.kind]}</span>
              <p className="text-ink dark:text-ink-light">{e.text}</p>
              <span className="flex flex-wrap items-center gap-x-2 text-[10.5px] text-ink-subtle">
                {e.sourceTitle ?? 'Stored company data'}
                {e.sourceUrl && (
                  <a href={e.sourceUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-0.5 font-semibold text-forest dark:text-emerald">
                    Open source <ExternalLink size={10} />
                  </a>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const modelOf = (generator: string) => generator.split(' · ')[1] ?? null;

export const FinnIntelligence: React.FC<{
  report: ResearchReport | null;
  progress?: SectionProgress;
  latestPeriod: string | null;
  analysisDataAsOf: string | null;
  aiConfigured: boolean;
}> = ({ report, progress, latestPeriod, analysisDataAsOf, aiConfigured }) => {
  const section = report?.sections.summary;
  const data = section?.data as { intelligence?: Intelligence; unanswered?: string[] } | undefined;
  const intel = data?.intelligence;
  const model = report ? modelOf(report.generator) : null;
  const stale = report?.dataAsOf && analysisDataAsOf && new Date(analysisDataAsOf).getTime() - new Date(report.dataAsOf).getTime() > 60_000;

  return (
    <section aria-label="FINN Intelligence" className="space-y-4">
      <div>
        <Eyebrow className="block text-forest dark:text-emerald">FINN Intelligence</Eyebrow>
        <p className="mt-0.5 text-[11px] text-ink-subtle">
          {report && intel
            ? `AI interpretation of the cited figures${latestPeriod ? ` · ${latestPeriod}` : ''}${model ? ` · ${model}` : ''} · ${dateTime(report.createdAt)}`
            : 'AI interpretation of the stored figures, with every point citing its evidence'}
        </p>
      </div>

      {progress === 'loading' ? (
        <div className="space-y-2" role="status" aria-label="FINN Intelligence is analysing">
          <p className="text-[12.5px] text-ink-muted">Analysing what changed and why it matters…</p>
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-9/12" />
          <Skeleton className="h-3 w-10/12" />
        </div>
      ) : !report ? (
        <p className="text-[12.5px] leading-relaxed text-ink-muted">
          {aiConfigured ? 'Generate research to get FINN’s analysis of what changed, why it matters and what to watch next, citing the figures above.' : 'AI is not configured on this server; the figures and charts above are unaffected.'}
        </p>
      ) : intel ? (
        <>
          {stale && <p className="text-[11.5px] text-fin-amber">Financial data was updated after this analysis. Refresh research to bring it up to date.</p>}
          <Block title="What changed">
            {intel.changes.length === 0 ? (
              <Empty>No change could be supported by the stored figures.</Empty>
            ) : (
              <ul className="space-y-3.5">
                {intel.changes.map((c, i) => (
                  <li key={i}>
                    <p className="text-[14px] font-medium leading-snug text-ink dark:text-white">{c.change}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                      <span className="font-semibold text-ink dark:text-ink-light">Why it matters. </span>
                      {c.implication}
                    </p>
                    <EvidenceToggle evidence={c.evidence} />
                  </li>
                ))}
              </ul>
            )}
          </Block>
          <div className="grid gap-4">
            <Block title="What supports the business">
              <Points items={intel.supports} tone="positive" empty="No supporting factor could be backed by the evidence." />
            </Block>
            <Block title="What concerns investors">
              <Points items={intel.concerns} tone="negative" empty="No concern is supported by the stored evidence." />
            </Block>
          </div>
          <Block title="What to monitor next">
            {intel.monitor.length === 0 ? (
              <Empty>No monitoring point could be tied to the stored figures.</Empty>
            ) : (
              <ol className="space-y-2.5">
                {intel.monitor.map((m, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-px font-mono text-[11px] text-ink-subtle">{String(i + 1).padStart(2, '0')}</span>
                    <div className="min-w-0">
                      <p className="text-[13px] leading-snug text-ink dark:text-ink-light">{m.question}</p>
                      <EvidenceToggle evidence={m.evidence} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Block>
          {data?.unanswered && data.unanswered.length > 0 && (
            <Block title="What the data cannot answer">
              <ul className="list-disc space-y-1 pl-4 text-[12px] leading-snug text-ink-muted">
                {data.unanswered.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </Block>
          )}
        </>
      ) : section && section.claims.length > 0 ? (
        <LegacySummary claims={section.claims} unanswered={data?.unanswered} />
      ) : (
        <p className="text-[12.5px] leading-relaxed text-ink-muted">{section?.reason ?? 'The analysis is not available for this report.'}</p>
      )}
    </section>
  );
};

const Block: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-2">
    <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">{title}</h4>
    {children}
  </div>
);

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="text-[12px] text-ink-subtle">{children}</p>;

const Points: React.FC<{ items: Array<{ text: string; evidence: CitedEvidence[] }>; tone: 'positive' | 'negative'; empty: string }> = ({ items, tone, empty }) =>
  items.length === 0 ? (
    <Empty>{empty}</Empty>
  ) : (
    <ul className="space-y-2.5">
      {items.map((p, i) => (
        <li key={i} className="flex gap-2">
          <span className={cx('mt-0.5 shrink-0', tone === 'positive' ? 'text-fin-up dark:text-emerald' : 'text-fin-red')}>
            <ToneIcon tone={tone} size={13} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] leading-snug text-ink dark:text-ink-light">{p.text}</p>
            <EvidenceToggle evidence={p.evidence} />
          </div>
        </li>
      ))}
    </ul>
  );

/** Reports generated before the structured format: grouped findings, with a pointer to refresh. */
const LegacySummary: React.FC<{ claims: Claim[]; unanswered?: string[] }> = ({ claims, unanswered }) => (
  <div className="space-y-3">
    <p className="text-[11.5px] text-ink-subtle">This report predates the structured analysis. Refresh research to get it.</p>
    <ul className="space-y-2">
      {claims.map((c, i) => (
        <li key={i} className="text-[13px] leading-snug text-ink dark:text-ink-light">
          {c.label && <span className="mr-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">{c.label}</span>}
          {c.text}
        </li>
      ))}
    </ul>
    {unanswered && unanswered.length > 0 && (
      <ul className="list-disc space-y-1 pl-4 text-[12px] text-ink-muted">
        {unanswered.map((u) => (
          <li key={u}>{u}</li>
        ))}
      </ul>
    )}
  </div>
);
