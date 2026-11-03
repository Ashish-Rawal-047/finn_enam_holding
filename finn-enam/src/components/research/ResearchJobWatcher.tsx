/**
 * App-wide research job tracking. Mounted in the app shell, so it keeps working whichever tab is
 * open: when one of the user's jobs leaves the active list, it fetches the outcome once, refreshes
 * that company's research data and shows a notice with a link back to it.
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { request } from '../../lib/api';
import { useActiveResearchJobs } from '../../lib/queries';
import type { ActiveResearchJob, ResearchJob } from '../../lib/types';
import { useToast } from '../common/Toast';

export function ResearchJobWatcher({ onOpen }: { onOpen: (companyId: string) => void }) {
  const jobs = useActiveResearchJobs();
  const qc = useQueryClient();
  const toast = useToast();
  const seen = useRef<Map<string, ActiveResearchJob>>(new Map());
  const open = useRef(onOpen);
  open.current = onOpen;

  useEffect(() => {
    if (!jobs.data) return;
    const now = new Map(jobs.data.map((j) => [j.id, j]));
    for (const [id, j] of seen.current) {
      if (now.has(id)) continue;
      void (async () => {
        const job = await request<{ job: ResearchJob }>(`/research/jobs/${id}`)
          .then((r) => r.job)
          .catch(() => null);
        // Cache the outcome, so a screen showing this job never reverts to a stale "running" state.
        if (job) qc.setQueryData(['research-job', id], job);
        for (const key of [['research', j.companyId], ['financials', j.companyId], ['evidence', j.companyId], ['history', j.companyId], ['overview', j.companyId]]) {
          void qc.invalidateQueries({ queryKey: key });
        }
        const name = j.company.nseSymbol ?? j.company.yahooSymbol?.replace(/\.(NS|BO)$/, '') ?? j.company.name;
        const view = { label: 'View', onClick: () => open.current(j.companyId) };
        if (job?.status === 'succeeded') toast(job.reused ? `Research up to date · ${name}` : `Research ready · ${name}`, 'success', view);
        else if (job?.status === 'failed') toast(`Research failed · ${name}`, 'info', view);
      })();
    }
    seen.current = now;
  }, [jobs.data, qc, toast]);

  return null;
}
