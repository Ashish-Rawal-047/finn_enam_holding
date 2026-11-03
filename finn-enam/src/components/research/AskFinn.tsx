/**
 * Ask FINN: questions about the selected company, answered by the AI from FINN's stored data
 * for it (statements, calculated metrics, filings, recorded events), with cited evidence.
 */
import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import type { AskResult } from '../../lib/types';
import { useAskFinn } from '../../lib/queries';
import { ApiRequestError } from '../../lib/api';
import { relativeTime } from '../../lib/format';
import { cx, Eyebrow, Spinner } from '../ui';
import { EvidenceToggle } from './FinnIntelligence';

const SUGGESTED = [
  'Why did margins change?',
  'What changed in the latest quarter?',
  'Analyse the cash flow quality',
  'What are the biggest financial risks?',
  'Compare the last four quarters',
  'What should I monitor in the next results?',
];

export const AskFinn: React.FC<{ companyId: string; companyName: string; aiConfigured: boolean }> = ({ companyId, companyName, aiConfigured }) => {
  const ask = useAskFinn(companyId);
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<AskResult[]>([]);
  // Answers belong to one company.
  useEffect(() => {
    setHistory([]);
    setQuestion('');
    ask.reset();
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (q: string) => {
    const text = q.trim();
    if (text.length < 3 || ask.isPending) return;
    ask.mutate(text, {
      onSuccess: (r) => {
        setHistory((h) => [r, ...h.filter((x) => x.question !== r.question)].slice(0, 5));
        setQuestion('');
      },
    });
  };

  const error = ask.error instanceof ApiRequestError && ask.error.status === 429 ? 'You have asked several questions in a short time. Please wait a few minutes.' : ask.error ? (ask.error as Error).message : null;

  return (
    <section aria-label="Ask FINN" className="space-y-3">
      <div>
        <Eyebrow className="block text-forest dark:text-emerald">Ask FINN</Eyebrow>
        <p className="mt-0.5 text-[11px] text-ink-subtle">Answers come only from FINN’s stored data for {companyName}, with the evidence cited.</p>
      </div>
      {!aiConfigured ? (
        <p className="text-[12.5px] text-ink-muted">AI is not configured on this server, so questions cannot be answered.</p>
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(question);
            }}
            className="relative"
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={300}
              placeholder={`Ask about ${companyName}`}
              aria-label="Ask FINN a question"
              className="min-h-[48px] w-full rounded-xl border border-divider bg-paper pl-3.5 pr-12 text-[14px] text-ink placeholder:text-ink-subtle focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15 dark:border-ink-border dark:bg-ink-surface dark:text-white dark:focus:border-emerald"
            />
            <button
              type="submit"
              disabled={ask.isPending || question.trim().length < 3}
              aria-label="Ask"
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-forest text-white disabled:opacity-40 dark:bg-emerald dark:text-ink-bg"
            >
              {ask.isPending ? <Spinner size={15} /> : <ArrowUp size={16} />}
            </button>
          </form>
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 scrollbar-none" aria-label="Suggested questions">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setQuestion(s);
                  submit(s);
                }}
                disabled={ask.isPending}
                className="min-h-[34px] shrink-0 whitespace-nowrap rounded-full border border-divider bg-paper px-3 text-[12px] text-ink-muted transition-colors hover:border-forest/40 hover:text-forest disabled:opacity-50 dark:border-ink-border dark:bg-ink-surface dark:hover:text-emerald"
              >
                {s}
              </button>
            ))}
          </div>
          {ask.isPending && (
            <p className="flex items-center gap-2 text-[12px] text-ink-muted" role="status">
              <Spinner size={12} /> Reading FINN’s data on {companyName}…
            </p>
          )}
          {error && (
            <p role="alert" className="text-[12px] text-fin-red">
              {error}
            </p>
          )}
          {history.map((r, idx) => (
            <article key={r.question} className={cx('space-y-2.5 pt-1', idx > 0 && 'opacity-90')}>
              <h4 className="text-[13.5px] font-semibold leading-snug text-ink dark:text-white">{r.question}</h4>
              {r.answer.length > 0 && (
                <ul className="space-y-2.5">
                  {r.answer.map((p, i) => (
                    <li key={i} className="text-[13px] leading-relaxed text-ink dark:text-ink-light">
                      {p.text}
                      <EvidenceToggle evidence={p.evidence} />
                    </li>
                  ))}
                </ul>
              )}
              {r.notCovered && <p className="text-[12px] leading-snug text-ink-muted">Not covered by the data: {r.notCovered}</p>}
              <p className="text-[10.5px] text-ink-subtle">
                AI interpretation · {r.model} · {r.cached ? 'saved answer' : 'answered'} {relativeTime(r.generatedAt)}
              </p>
            </article>
          ))}
        </>
      )}
    </section>
  );
};
