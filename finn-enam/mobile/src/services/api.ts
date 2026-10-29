/**
 * FINN Mobile API Service Layer
 * Connects to the Express REST API with graceful instant offline fallback to local fixtures.
 */

import { Company, Announcement, EventMemoryItem, CompanyResearch } from '../types';
import { MOCK_COMPANIES } from '../data/companies';
import { MOCK_ANNOUNCEMENTS } from '../data/announcements';
import { MOCK_EVENT_MEMORY } from '../data/eventMemory';
import { getCompanyResearch } from '../data/research';

// Allow overriding via EXPO_PUBLIC_API_URL (e.g. http://192.168.x.x:3001/api on physical devices)
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface GroundedAnswer {
  ticker: string;
  query: string;
  finding: string;
  citation: string;
  grounded: boolean;
  timestamp: string;
}

export const FinnMobileApi = {
  /**
   * Fetch portfolio companies with current prices, volume ratios, and watchlist states
   */
  async getPortfolio(watchlistOnly = false): Promise<Company[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${API_BASE}/portfolio${watchlistOnly ? '?watchlistOnly=true' : ''}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback to offline fixtures
    }
    return watchlistOnly ? MOCK_COMPANIES.filter((c) => c.inWatchlist) : MOCK_COMPANIES;
  },

  /**
   * Toggle watchlist status on the backend
   */
  async toggleWatchlist(ticker: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/portfolio/${encodeURIComponent(ticker)}/watchlist`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        return data.inWatchlist;
      }
    } catch {
      // Offline fallback
    }
    return false;
  },

  /**
   * Fetch announcements / signals with optional window, category, and severity filtering
   */
  async getSignals(params?: { window?: string; category?: string; severity?: string }): Promise<Announcement[]> {
    try {
      const query = new URLSearchParams();
      if (params?.window) query.set('window', params.window);
      if (params?.category) query.set('category', params.category);
      if (params?.severity) query.set('severity', params.severity);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${API_BASE}/signals?${query.toString()}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return data.items || data;
      }
    } catch {
      // Offline fallback
    }
    return MOCK_ANNOUNCEMENTS;
  },

  /**
   * Fetch Event Memory ledger items
   */
  async getEventMemory(status?: string, category?: string): Promise<EventMemoryItem[]> {
    try {
      const query = new URLSearchParams();
      if (status && status !== 'all') query.set('status', status);
      if (category && category !== 'all') query.set('category', category);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${API_BASE}/memory?${query.toString()}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const rawItems = data.items || data;
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          const normalized = rawItems.map((item: any) => {
            const fallback = MOCK_EVENT_MEMORY.find((m) => m.ticker === item.ticker);
            return {
              id: item.id || fallback?.id || `mem-${item.ticker}`,
              ticker: item.ticker,
              companyName: item.companyName,
              title: item.title,
              commitmentDate: item.commitmentDate,
              sourceDoc: item.sourceDoc || item.commitmentSource || fallback?.sourceDoc || 'Earnings Concall Transcript',
              sourcePageOrQuote: item.sourcePageOrQuote || item.quoteOrTarget || fallback?.sourcePageOrQuote || '',
              category: item.category || fallback?.category || 'capex',
              announcedMetric: item.announcedMetric || item.quoteOrTarget || fallback?.announcedMetric || 'Guidance Target',
              milestoneDeadline: item.milestoneDeadline || fallback?.milestoneDeadline || 'FY25-26',
              status: item.status || fallback?.status || 'pending',
              statusConfidence: item.statusConfidence || fallback?.statusConfidence || 0.95,
              factsSummary: item.factsSummary || fallback?.factsSummary || '',
              aiInterpretation: item.aiInterpretation || fallback?.aiInterpretation || '',
              historicalComps: item.historicalComps || fallback?.historicalComps || [],
              timeline: item.timeline || fallback?.timeline || [],
            } as EventMemoryItem;
          });
          const missingMocks = MOCK_EVENT_MEMORY.filter((m) => !normalized.some((n: any) => n.ticker === m.ticker));
          return [...normalized, ...missingMocks];
        }
      }
    } catch {
      // Offline fallback
    }
    return MOCK_EVENT_MEMORY;
  },

  /**
   * Fetch in-depth company research dossier grounded in primary disclosures
   */
  async getResearch(ticker: string, companyName?: string, sector?: string): Promise<CompanyResearch> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${API_BASE}/research/${encodeURIComponent(ticker)}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }
    return getCompanyResearch(ticker, companyName, sector);
  },

  /**
   * Run targeted primary-grounded Q&A against concalls and filings
   */
  async queryResearch(ticker: string, query: string): Promise<GroundedAnswer | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${API_BASE}/research/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, query }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return null;
  },
};
