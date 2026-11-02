import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useCompanySearch } from '../../lib/queries';
import type { CompanySummary } from '../../lib/types';
import { DemoPill, Spinner, Ticker, cx, inputCls } from '../ui';
import { CompanyLogo } from './CompanyLogo';

/** Debounced company search over FINN's database (and the company provider when configured). */
export const CompanyPicker: React.FC<{
  onPick: (c: CompanySummary) => void;
  onPickSymbol?: (symbol: string) => void;
  placeholder?: string;
  excludeIds?: Set<string>;
}> = ({ onPick, onPickSymbol, placeholder = 'Search by name, NSE, BSE or ISIN', excludeIds }) => {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(t);
  }, [term]);
  const search = useCompanySearch(debounced);
  const items = (search.data?.items ?? []).filter((c) => !excludeIds?.has(c.id));

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input className={cx(inputCls, 'pl-10')} value={term} onChange={(e) => setTerm(e.target.value)} placeholder={placeholder} aria-label="Search companies" />
        {search.isFetching && <Spinner size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />}
      </div>
      {debounced && !search.isLoading && (
        <ul className="max-h-64 overflow-y-auto rounded-xl border border-divider dark:border-ink-border bg-paper dark:bg-ink-surface divide-y divide-divider/70 dark:divide-ink-border">
          {items.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(c);
                  setTerm('');
                }}
                className="flex w-full min-h-[52px] items-center justify-between gap-2 px-3 py-2 text-left hover:bg-cream-light dark:hover:bg-ink-surfaceSubtle"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <CompanyLogo {...c} size="sm" />
                  <span className="min-w-0">
                    <Ticker symbol={c.nseSymbol} /> <span className="font-mono text-[10px] text-ink-muted">{c.bseCode ? `BSE ${c.bseCode}` : ''}</span>
                    <span className="block truncate text-xs text-ink-muted">{c.name}</span>
                  </span>
                </span>
                {c.isDemo && <DemoPill />}
              </button>
            </li>
          ))}
          {items.length === 0 && (
            <li className="px-3 py-3 text-xs text-ink-muted">
              No match in FINN’s database.
              {onPickSymbol && /^[A-Za-z0-9&.-]{2,20}$/.test(debounced) && (
                <button type="button" onClick={() => onPickSymbol(debounced)} className="ml-1 font-semibold text-forest dark:text-emerald">
                  Try adding “{debounced.toUpperCase()}” by symbol
                </button>
              )}
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
