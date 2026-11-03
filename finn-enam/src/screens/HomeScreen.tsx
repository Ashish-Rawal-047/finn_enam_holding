import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useAddDemoPortfolio, useEvents, useHome, usePortfolio } from '../lib/queries';
import { greetingFor, humanize, shortDate } from '../lib/format';
import { QuoteBlock } from '../components/home/QuoteBlock';
import { PortfolioPanel } from '../components/home/PortfolioPanel';
import { AlertList } from '../components/home/AlertList';
import { FilingsDigest } from '../components/home/FilingsDigest';
import { EASE_OUT } from '../components/motion';
import { EmptyState, ErrorState, Eyebrow, PrimaryButton, SecondaryButton, SectionTitle, Skeleton, TextButton, Ticker } from '../components/ui';
import { StatusBadge } from './EventMemoryScreen';
import { CompanyLogo } from '../components/company/CompanyLogo';

interface Props {
  onInspectSignal: (signalId: string) => void;
  onOpenNotifications: () => void;
  onGoToSettings: () => void;
  onOpenCompany: (companyId: string) => void;
  onOpenEvent: (eventId: string) => void;
  onGoToMemory: () => void;
  onViewHistoricalEvent: (historicalEventId: string, newEventId: string, companySymbol?: string | null) => void;
}

export const HomeScreen: React.FC<Props> = ({ onInspectSignal, onOpenNotifications, onGoToSettings, onOpenCompany, onOpenEvent, onGoToMemory, onViewHistoricalEvent }) => {
  const { user } = useAuth();
  const home = useHome();
  const portfolio = usePortfolio();
  const events = useEvents({ scope: 'portfolio', page: 1 });
  const demo = useAddDemoPortfolio();
  const now = new Date();
  const dateLine = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const upcoming = (events.data?.items ?? [])
    .filter((e) => !['completed', 'abandoned'].includes(e.status))
    .sort((a, b) => (a.expectedCompletionDate ?? '9999').localeCompare(b.expectedCompletionDate ?? '9999'))
    .slice(0, 3);

  return (
    <div className="space-y-8 pt-5">
      {/* Greeting + quotation */}
      <section className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE_OUT }} className="space-y-3">
          <Eyebrow>{dateLine}</Eyebrow>
          <h1 className="font-serif text-[30px] leading-[1.08] text-forest-dark dark:text-white">
            {greetingFor(now)}
            {/* The shared demo account is greeted without a name. */}
            {home.data?.greetingName && !user?.isDemoAccount ? (
              <>
                , <span className="italic text-forest dark:text-emerald">{home.data.greetingName}</span>.
              </>
            ) : (
              '.'
            )}
          </h1>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.18, ease: EASE_OUT }}>
          <QuoteBlock />
        </motion.div>
      </section>

      {home.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[260px] w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : home.isError || !home.data ? (
        <ErrorState error={home.error} onRetry={() => home.refetch()} />
      ) : home.data.overview.trackedCompanies === 0 ? (
        <EmptyState
          title="Your portfolio is empty"
          body="Add the companies you follow and FINN will monitor prices, volumes, filings and corporate events for them."
          action={
            <div className="flex flex-col gap-2">
              <PrimaryButton busy={demo.isPending} onClick={() => demo.mutate()}>
                Load the demo portfolio
              </PrimaryButton>
              <SecondaryButton onClick={onGoToSettings}>Add companies</SecondaryButton>
            </div>
          }
        />
      ) : (
        <>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.28, ease: EASE_OUT }}>
            <PortfolioPanel overview={home.data.overview} holdings={portfolio.data ?? []} onOpenCompany={onOpenCompany} />
          </motion.div>

          <FilingsDigest onInspectSignal={onInspectSignal} />

          <AlertList onInspectSignal={onInspectSignal} onOpenCompany={onOpenCompany} onOpenHistory={onOpenNotifications} onViewHistoricalEvent={onViewHistoricalEvent} />

          {/* Corporate developments from Event Memory */}
          {upcoming.length > 0 && (
            <section className="space-y-4">
              <SectionTitle
                title="Company developments"
                action={
                  <TextButton onClick={onGoToMemory}>
                    Event Memory <ArrowRight size={14} strokeWidth={1.75} />
                  </TextButton>
                }
              />
              <ul className="divide-y divide-divider overflow-hidden rounded-card border border-divider bg-paper dark:divide-ink-border dark:border-ink-border dark:bg-ink-surface">
                {upcoming.map((e) => (
                  <li key={e.id}>
                    <button onClick={() => onOpenEvent(e.id)} className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-cream-light dark:hover:bg-ink-surfaceSubtle">
                      <span className="w-[60px] shrink-0 font-mono text-[11px] leading-tight text-ink-muted" title="Expected completion">
                        {e.expectedCompletionDate ? shortDate(e.expectedCompletionDate).replace(/^\d+ /, '') : 'No date'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <CompanyLogo {...e.company} size="xs" />
                          <Ticker symbol={e.company.nseSymbol} />
                          <span className="truncate text-[11px] text-ink-muted">{humanize(e.category)}</span>
                          <span className="ml-auto">
                            <StatusBadge status={e.status} />
                          </span>
                        </div>
                        <div className="mt-1 line-clamp-2 text-[13.5px] font-medium leading-snug text-ink dark:text-white">{e.title}</div>
                      </div>
                      <span className="hidden">
                        <StatusBadge status={e.status} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
};
