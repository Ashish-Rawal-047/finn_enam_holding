import { AlertSettings, AnnouncementCategory } from '../types';

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  priceMoveThresholdPercent: 4.0,
  volumeSpikeMultiplier: 2.0,
  activeDigestWindow: '24h',
  enabledCategories: {
    results: true,
    'M&A': true,
    fund_raise: true,
    management_change: true,
    litigation: true,
    insider_trading: true,
    earnings_call: true,
    investor_meetings: true,
    credit_rating: true,
    dividend: true,
    bonus_split: true,
    capex: true,
    press_release: true,
    postal_ballot: true,
    agm_egm: true,
    pledging: true,
    unclassified: false // Default collapsed/unselected to filter routine noise
  },
  minSeverity: 'all',
  includeOutOfPortfolio: false
};

export const CATEGORY_LABELS: Record<AnnouncementCategory, { label: string; desc: string }> = {
  results: { label: 'Quarterly Results', desc: 'Financial results, board meetings, shareholder letters' },
  'M&A': { label: 'M&A & Restructuring', desc: 'Acquisitions, mergers, demergers, and joint ventures' },
  fund_raise: { label: 'Fund Raising', desc: 'Rights issues, QIPs, preferential allotments, buybacks' },
  management_change: { label: 'Management Change', desc: 'CEO, CFO, MD, and Director transitions' },
  litigation: { label: 'Litigation & Regulatory', desc: 'Regulatory orders, fines, lawsuits, insolvency' },
  insider_trading: { label: 'Insider Trading', desc: 'Promoter and insider share acquisitions/sales' },
  earnings_call: { label: 'Earnings Call', desc: 'Concall schedules, recordings, and transcripts' },
  investor_meetings: { label: 'Investor Meetings', desc: 'Fund presentations and analyst conference meets' },
  credit_rating: { label: 'Credit Ratings', desc: 'Agency upgrades, downgrades, and reaffirmations' },
  dividend: { label: 'Dividends', desc: 'Dividend declarations and record dates' },
  bonus_split: { label: 'Bonus / Split', desc: 'Bonus issues and stock split announcements' },
  capex: { label: 'Capex & Expansions', desc: 'New plant approvals, capacity additions' },
  press_release: { label: 'Press Releases', desc: 'Order wins, partnerships, product launches' },
  postal_ballot: { label: 'Postal Ballot', desc: 'Shareholder voting notices and outcomes' },
  agm_egm: { label: 'AGM / EGM', desc: 'Annual & extraordinary general meetings' },
  pledging: { label: 'Promoter Pledging', desc: 'Pledge creation, invocation, or release of shares' },
  unclassified: { label: 'Routine Paperwork', desc: 'ESOP allotments, compliance forms, certificates' }
};
