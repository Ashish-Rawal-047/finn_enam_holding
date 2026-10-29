/**
 * FINN API Client Layer
 * Connects to the Express REST API with graceful instant offline fallback to local fixtures.
 */

import { Company, Announcement, EventMemoryItem, CompanyResearch } from '../types';
import { MOCK_COMPANIES } from '../data/companies';
import { MOCK_ANNOUNCEMENTS } from '../data/announcements';
import { MOCK_EVENT_MEMORY } from '../data/eventMemory';
import { getCompanyResearch } from '../data/research';

const API_BASE = '/api';

export interface GroundedAnswer {
  ticker: string;
  query: string;
  finding: string;
  citation: string;
  grounded: boolean;
  timestamp: string;
}

export const FinnApi = {
  /**
   * Fetch portfolio companies with current prices, volume ratios, and watchlist states
   */
  async getPortfolio(watchlistOnly = false): Promise<Company[]> {
    try {
      const res = await fetch(`${API_BASE}/portfolio${watchlistOnly ? '?watchlistOnly=true' : ''}`);
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

      const res = await fetch(`${API_BASE}/signals?${query.toString()}`);
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

      const res = await fetch(`${API_BASE}/memory?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return data.items || data;
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
      const res = await fetch(`${API_BASE}/research/${encodeURIComponent(ticker)}`);
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
      const res = await fetch(`${API_BASE}/research/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, query }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback to local heuristic
    }
    return null;
  },
};

