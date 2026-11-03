/** Executive overview (rule-based assessments) and key financial insights (period comparisons). */
import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ExternalLink, HelpCircle, Minus } from 'lucide-react';
import type { Assessment, FinancialAnalysis, Insight, Tone } from '../../lib/types';
import { relativeTime } from '../../lib/format';
import { cx, Eyebrow } from '../ui';

export const toneText: Record<Tone, string> = {
  positive: 'text-fin-up dark:text-emerald',
  negative: 'text-fin-red',
  neutral: 'text-ink-muted',
};
const toneRail: Record<Tone, string> = {
  positive: 'bg-fin-up dark:bg-emerald',
  negative: 'bg-fin-red',
  neutral: 'bg-divider-dark/40 dark:bg-ink-border',
};

export const ToneIcon: React.FC<{ tone: Tone; size?: number }> = ({ tone, size = 13 }) =>
  tone === 'positive' ? <ArrowUpRight size={size} strokeWidth={2} aria-hidden /> : tone === 'negative' ? <ArrowDownRight size={size} strokeWidth={2} aria-hidden /> : <Minus size={size} strokeWidth={2} aria-hidden />;

const providerName = (p: string | null) => (p === 'yfinance' ? 'Yahoo Finance (yfinance, unofficial)' : p === 'demo' ? 'demonstration data' : (p ?? 'stored statements'));

export const SourceLine: React.FC<{ analysis: FinancialAnalysis }> = ({ analysis: a }) => (
  <p className="text-[11px] leading-snug text-ink-subtle">
    Calculated from {providerName(a.sources[0]?.provider ?? null)} statements{a.dataAsOf ? ` · data updated ${relativeTime(a.dataAsOf)}` : ''}
    {a.isDemo ? ' · demonstration data, not live filings' : ''}
  </p>
);

export const IntelligenceOverview: React.FC<{ analysis: FinancialAnalysis; openQuestion: { text: string; origin: 'ai' | 'data' } | null }> = ({ analysis: a, openQuestion }) => {
  const [rules, setRules] = useState(false);
  const positive = a.insights.find((i) => i.tone === 'positive');
  const negative = a.insights.find((i) => i.tone === 'negative');
  if (!a.assessments.length) return null;
  return (
    <section aria-label="Financial position" className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <Eyebrow>
          Financial position{a.latestPeriod ? ` · ${a.latestPeriod}${a.previousPeriod ? ` vs ${a.previousPeriod}` : ''}` : ''}
        </Eyebrow>
        <button onClick={() => setRules((r) => !r)} aria-expanded={rules} className="inline-flex min-h-[32px] shrink-0 items-center gap-1 whitespace-nowrap text-[11.5px] font-semibold text-forest dark:text-emerald">
          <HelpCircle size={12} /> How assessed
        </button>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-divider bg-divider dark:border-ink-border dark:bg-ink-border">
        {a.assessments.map((s) => (
          <AssessmentCell key={s.key} a={s} />
        ))}
      </div>
      {rules && (
        <ul className="space-y-1.5 rounded-xl bg-cream-light p-3 text-[11.5px] leading-snug text-ink-muted dark:bg-ink-surfaceSubtle">
          {a.assessments.map((s) => (
            <li key={s.key}>
              <span className="font-semibold text-ink dark:text-white">{s.title}:</span> {s.rule}
            </li>
          ))}
          <li>FINN does not combine these into an overall score.</li>
        </ul>
      )}
      {(positive || negative || openQuestion) && (
        <dl className="space-y-2.5 pt-1 text-[12.5px] leading-snug">
          {positive && <Development label="Major positive" insight={positive} />}
          {negative && <Development label="Major negative" insight={negative} />}
          {openQuestion && (
            <div className="flex gap-2.5">
              <dt className="sr-only">Open question</dt>
              <HelpCircle size={14} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden />
              <dd className="min-w-0">
                <span className="text-ink dark:text-ink-light">{openQuestion.text}</span>
                <span className="mt-0.5 block text-[10.5px] text-ink-subtle">{openQuestion.origin === 'ai' ? 'Open question · from FINN Intelligence' : 'Open question · data limitation'}</span>
              </dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
};

const AssessmentCell: React.FC<{ a: Assessment }> = ({ a }) => (
  <div className="bg-paper p-3.5 dark:bg-ink-surface" title={a.rule}>
    <Eyebrow className="block">{a.title}</Eyebrow>
    <div className={cx('mt-1.5 flex items-start gap-1 text-[13.5px] font-semibold leading-tight', toneText[a.tone])}>
      <span className="mt-[2px] shrink-0">
        <ToneIcon tone={a.tone} />
      </span>
      {a.label}
    </div>
    {a.value && <div className="mt-1 font-mono text-[12.5px] text-ink dark:text-white">{a.value}</div>}
    <p className="mt-1 text-[11px] leading-snug text-ink-muted">{a.detail}</p>
  </div>
);

/** The arrow shows which way the figure moved; the colour shows whether that is good or bad. */
const DirectionIcon: React.FC<{ direction: Insight['direction'] }> = ({ direction }) =>
  direction === 'up' ? <ArrowUpRight size={12} strokeWidth={2} aria-hidden /> : direction === 'down' ? <ArrowDownRight size={12} strokeWidth={2} aria-hidden /> : <Minus size={12} strokeWidth={2} aria-hidden />;

const Development: React.FC<{ label: string; insight: Insight }> = ({ label, insight: i }) => (
  <div className="flex gap-2.5">
    <span className={cx('mt-0.5 shrink-0', toneText[i.tone])}>
      <ToneIcon tone={i.tone} size={14} />
    </span>
    <div className="min-w-0">
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">{label}</dt>
      <dd className="text-ink dark:text-ink-light">
        {i.headline}: <span className="font-mono">{i.display}</span>
        {i.change && <span className="text-ink-muted"> ({i.change} vs {i.previousPeriod})</span>}
      </dd>
    </div>
  </div>
);

export const InsightCards: React.FC<{ analysis: FinancialAnalysis }> = ({ analysis: a }) => {
  if (!a.insights.length) {
    return <p className="text-[12.5px] leading-relaxed text-ink-muted">{a.gaps[a.gaps.length - 1] ?? 'Two consecutive fiscal years are needed to compare periods.'}</p>;
  }
  return (
    <ul className="space-y-2.5">
      {a.insights.map((i) => (
        <li key={i.key} className="relative overflow-hidden rounded-xl border border-divider bg-paper py-3.5 pl-4 pr-3.5 dark:border-ink-border dark:bg-ink-surface">
          <span className={cx('absolute inset-y-0 left-0 w-[3px]', toneRail[i.tone])} aria-hidden />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Eyebrow className="block">{i.metric}</Eyebrow>
              <h4 className="mt-1 text-[14.5px] font-semibold leading-snug text-ink dark:text-white">{i.headline}</h4>
            </div>
            {i.change && (
              <span className={cx('inline-flex shrink-0 items-center gap-0.5 font-mono text-[12px] font-medium', toneText[i.tone])}>
                <DirectionIcon direction={i.direction} />
                {i.change}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-mono text-[22px] font-medium leading-none text-ink dark:text-white">{i.display}</span>
            {i.previousDisplay && (
              <span className="text-[11.5px] text-ink-muted">
                {i.previousPeriod}: <span className="font-mono">{i.previousDisplay}</span>
              </span>
            )}
          </div>
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-muted">
            <span className="font-semibold text-ink dark:text-ink-light">Why it matters. </span>
            {i.whyItMatters}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-ink-subtle">
            <span title={`Formula: ${i.formula}`}>Calculated from reported figures · {i.period} vs {i.previousPeriod}</span>
            {i.source.url && (
              <a href={i.source.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-0.5 font-semibold text-forest dark:text-emerald">
                Source <ExternalLink size={10} />
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};
