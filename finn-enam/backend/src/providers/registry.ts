/**
 * Selects a concrete adapter per capability from environment configuration.
 *
 * Adapters: `yfinance` (Yahoo Finance via the Python bridge) and `demo` (labelled fixtures).
 * Licensed NSE/BSE vendors are added by writing an adapter against their documented API and
 * registering it below; a configured but unknown name resolves to an "unavailable" adapter
 * that fails loudly rather than pretending to return data.
 */
import { env } from '../config/env.js';
import { demoAnnouncements, demoCompanyInfo, demoFinancials, demoMarketData } from './adapters/demo.js';
import { yfinanceAvailable, yfinanceCompanyInfo, yfinanceMarketData } from './adapters/yfinance.js';

import {
  ProviderUnavailableError,
  type AnnouncementsProvider,
  type CompanyInfoProvider,
  type FinancialsProvider,
  type MarketDataProvider,
  type ProviderInfo,
  type TranscriptsProvider,
} from './types.js';

// yfinance needs the Python bridge (backend/python/.venv). Without it, fall back to the
// clearly-labelled demo fixtures rather than failing every request.
const yfOk = yfinanceAvailable();
const pick = (name: string) => (name === 'yfinance' && !yfOk ? 'demo' : name);
if (!yfOk && [env.MARKET_DATA_PROVIDER, env.COMPANY_INFO_PROVIDER, env.FINANCIALS_PROVIDER].includes('yfinance')) {
  console.warn('[providers] yfinance requested but backend/python/.venv is missing; using demo fixtures. See README → Live data.');
}

function unavailableInfo(capability: string, name: string): ProviderInfo {
  const description =
    name === 'none'
      ? `No ${capability} provider is configured.`
      : `"${name}" is not an implemented ${capability} adapter. Add one in backend/src/providers/adapters.`;
  return { name, isDemo: false, configured: false, description };
}

function fail(capability: string, name: string): never {
  throw new ProviderUnavailableError(capability, unavailableInfo(capability, name).description);
}

function marketData(name: string): MarketDataProvider {
  if (name === 'yfinance') return yfinanceMarketData;
  if (name === 'demo') return demoMarketData;
  return { info: unavailableInfo('market data', name), getDailyHistory: async () => fail('market data', name) };
}

function companyInfo(name: string): CompanyInfoProvider {
  if (name === 'yfinance') return yfinanceCompanyInfo;
  if (name === 'demo') return demoCompanyInfo;
  return {
    info: unavailableInfo('company information', name),
    search: async () => fail('company information', name),
    getBySymbol: async () => fail('company information', name),
  };
}

function announcements(name: string): AnnouncementsProvider {
  if (name === 'demo') return demoAnnouncements;
  return { info: unavailableInfo('announcements', name), listAnnouncements: async () => fail('announcements', name) };
}

function financials(name: string): FinancialsProvider {
  // yfinance statements are synced by services/companyData.ts (richer than this contract).
  if (name === 'demo' || name === 'yfinance') return demoFinancials;
  return { info: unavailableInfo('financial statements', name), getStatements: async () => fail('financial statements', name) };
}

function transcripts(name: string): TranscriptsProvider {
  return { info: unavailableInfo('earnings call transcripts', name), listTranscripts: async () => fail('earnings call transcripts', name) };
}

export const providers = {
  marketData: marketData(pick(env.MARKET_DATA_PROVIDER)),
  companyInfo: companyInfo(pick(env.COMPANY_INFO_PROVIDER)),
  announcements: announcements(env.ANNOUNCEMENTS_PROVIDER),
  financials: financials(pick(env.FINANCIALS_PROVIDER)),
  transcripts: transcripts(env.TRANSCRIPTS_PROVIDER),
};

export const liveFinancials = pick(env.FINANCIALS_PROVIDER) === 'yfinance';

export function providerStatus() {
  const status = Object.fromEntries(Object.entries(providers).map(([k, p]) => [k, p.info]));
  if (liveFinancials) status.financials = { name: 'yfinance', isDemo: false, configured: true, description: 'Yahoo Finance annual & quarterly statements via yfinance (unofficial; coverage varies).' };
  return status;
}
