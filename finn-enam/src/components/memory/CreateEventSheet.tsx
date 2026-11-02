import React, { useState } from 'react';
import { GitCompare } from 'lucide-react';
import { FullScreenSheet } from '../common/FullScreenSheet';
import { CompanyPicker } from '../company/CompanyPicker';
import { useEventMutations } from '../../lib/queries';
import { humanize } from '../../lib/format';
import type { CompanySummary, EventCategory } from '../../lib/types';
import { ErrorState, Field, Panel, PrimaryButton, SecondaryButton, Ticker, inputCls } from '../ui';
import { CompanyLogo } from '../company/CompanyLogo';

const CATEGORIES: EventCategory[] = [
  'manufacturing_facility',
  'capacity_expansion',
  'acquisition',
  'merger',
  'rnd_project',
  'new_business_division',
  'restructuring',
  'financial_target',
  'fundraise',
  'other',
];

export const CreateEventSheet: React.FC<{ open: boolean; onClose: () => void; onCreated: (id: string) => void }> = ({ open, onClose, onCreated }) => {
  const { create } = useEventMutations();
  const [company, setCompany] = useState<CompanySummary | null>(null);
  const [result, setResult] = useState<{ id: string; matches: number; precedent: boolean } | null>(null);
  const [form, setForm] = useState({
    category: 'manufacturing_facility' as EventCategory,
    projectType: '',
    title: '',
    originalAnnouncement: '',
    announcedAt: new Date().toISOString().slice(0, 10),
    docTitle: '',
    docUrl: '',
    expectedCapexCr: '',
    expectedCapacityValue: '',
    expectedCapacityUnit: '',
    expectedCompletionDate: '',
    commitments: '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const num = (v: string) => (v.trim() ? Number(v) : null);

  const reset = () => {
    setCompany(null);
    setResult(null);
    create.reset();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    create.mutate(
      {
        companyId: company.id,
        category: form.category,
        projectType: form.projectType || null,
        title: form.title,
        originalAnnouncement: form.originalAnnouncement,
        announcedAt: form.announcedAt,
        sourceDocument: form.docTitle ? { title: form.docTitle, url: form.docUrl || null, documentType: 'exchange_filing', publishedAt: form.announcedAt } : null,
        expectedCapexCr: num(form.expectedCapexCr),
        expectedCapacityValue: num(form.expectedCapacityValue),
        expectedCapacityUnit: form.expectedCapacityUnit || null,
        expectedCompletionDate: form.expectedCompletionDate || null,
        commitments: form.commitments
          .split('\n')
          .map((c) => c.trim())
          .filter((c) => c.length >= 3),
      },
      { onSuccess: (r) => setResult({ id: r.event.id, matches: r.matches.length, precedent: Boolean(r.precedentSignalId) }) },
    );
  };

  return (
    <FullScreenSheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Record a corporate event"
      subtitle="Add a commitment to FINN’s institutional memory"
    >
      {result ? (
        <Panel className="space-y-3 text-center">
          <GitCompare size={24} className="mx-auto text-forest dark:text-emerald" />
          <p className="text-sm font-semibold text-ink dark:text-white">Event recorded</p>
          <p className="text-xs text-ink-muted">
            {result.matches > 0
              ? `FINN found ${result.matches} similar historical event${result.matches === 1 ? '' : 's'}.${result.precedent ? ' A “Historical precedent detected” alert was raised.' : ''}`
              : 'No similar historical event was found.'}
          </p>
          <PrimaryButton className="w-full" onClick={() => onCreated(result.id)}>
            Open event
          </PrimaryButton>
        </Panel>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Company">
            {company ? (
              <div className="flex items-center justify-between rounded-xl border border-divider dark:border-ink-border bg-paper dark:bg-ink-surface px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  <CompanyLogo {...company} size="xs" />
                  <Ticker symbol={company.nseSymbol} /> <span className="truncate text-xs text-ink-muted">{company.name}</span>
                </span>
                <button type="button" onClick={() => setCompany(null)} className="min-h-[36px] text-xs font-semibold text-forest dark:text-emerald">
                  Change
                </button>
              </div>
            ) : (
              <CompanyPicker onPick={setCompany} />
            )}
          </Field>
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
            <Field label="Category">
              <select className={inputCls} value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {humanize(c)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Project type">
              <input className={inputCls} value={form.projectType} onChange={set('projectType')} placeholder="e.g. electronics assembly" />
            </Field>
          </div>
          <Field label="Title">
            <input className={inputCls} value={form.title} onChange={set('title')} required minLength={5} placeholder="e.g. New Greater Noida notebook assembly plant" />
          </Field>
          <Field label="Original announcement" hint="Paste the disclosed text. Do not paraphrase management statements as quotes.">
            <textarea className={inputCls} rows={4} value={form.originalAnnouncement} onChange={set('originalAnnouncement')} required minLength={10} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Announced on">
              <input type="date" className={inputCls} value={form.announcedAt} onChange={set('announcedAt')} required />
            </Field>
            <Field label="Expected completion">
              <input type="date" className={inputCls} value={form.expectedCompletionDate} onChange={set('expectedCompletionDate')} />
            </Field>
          </div>
          <Field label="Source document title">
            <input className={inputCls} value={form.docTitle} onChange={set('docTitle')} placeholder="e.g. Outcome of board meeting — Reg 30 disclosure" />
          </Field>
          <Field label="Source URL">
            <input type="url" className={inputCls} value={form.docUrl} onChange={set('docUrl')} placeholder="https://" />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Capex ₹ Cr">
              <input type="number" min={0} step="any" className={inputCls} value={form.expectedCapexCr} onChange={set('expectedCapexCr')} />
            </Field>
            <Field label="Capacity">
              <input type="number" min={0} step="any" className={inputCls} value={form.expectedCapacityValue} onChange={set('expectedCapacityValue')} />
            </Field>
            <Field label="Unit">
              <input className={inputCls} value={form.expectedCapacityUnit} onChange={set('expectedCapacityUnit')} placeholder="MW" />
            </Field>
          </div>
          <Field label="Management commitments" hint="One per line.">
            <textarea className={inputCls} rows={3} value={form.commitments} onChange={set('commitments')} />
          </Field>
          {create.isError && <ErrorState error={create.error} />}
          <div className="flex gap-2">
            <SecondaryButton type="button" className="flex-1" onClick={onClose}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" className="flex-1" busy={create.isPending} disabled={!company}>
              Save & find precedents
            </PrimaryButton>
          </div>
        </form>
      )}
    </FullScreenSheet>
  );
};
