/**
 * AI service layer. Provider and models come from configuration (see config/env.ts):
 * Google Gemini (FINN's provider), with Anthropic or an OpenAI-compatible endpoint available as
 * alternative configurations. No paid fallback provider is used.
 *
 * Rules every caller relies on:
 *  - Output is always structured JSON validated against a zod schema.
 *  - The model is given an evidence pack with stable ids and must cite those ids;
 *    `keepCited` drops claims whose citations are not in the pack and `numbersGrounded`
 *    drops claims containing figures that do not appear in the cited evidence.
 *  - Without a configured provider, callers receive AiUnavailableError and present the
 *    feature as unavailable rather than inventing content.
 *  - Provider failures are classified (AiError.code) and transient ones are retried with
 *    bounded exponential backoff. Nothing is ever substituted for a failed response.
 *  - Every provider call is recorded in ai_usage (tokens, latency, outcome; never prompts or keys).
 */
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { APICallError, embedMany, generateText, NoObjectGeneratedError, Output, RetryError, type EmbeddingModel, type LanguageModel } from 'ai';
import { ZodError, type z } from 'zod';
import { ai, env } from '../config/env.js';
import { db } from '../db/client.js';
import { aiUsage } from '../db/schema.js';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type AiErrorCode =
  | 'not_configured'
  | 'invalid_credentials'
  | 'quota_exhausted'
  | 'rate_limited'
  | 'overloaded'
  | 'timeout'
  | 'model_unavailable'
  | 'malformed_response'
  | 'network'
  | 'provider_error';

const USER_MESSAGES: Record<AiErrorCode, string> = {
  not_configured: 'AI is not configured on the server.',
  invalid_credentials: 'The AI provider rejected the configured API key.',
  quota_exhausted: 'FINN’s free daily AI allowance (Google Gemini) is used up.',
  rate_limited: 'The AI provider is rate-limiting requests. Please try again shortly.',
  overloaded: 'The AI provider is temporarily overloaded.',
  timeout: 'The AI provider did not respond in time.',
  model_unavailable: 'The configured AI model is not available to this key.',
  malformed_response: 'The AI provider returned a response that did not match the required structure.',
  network: 'The AI provider could not be reached (network error).',
  provider_error: 'The AI provider returned an error.',
};

const RETRYABLE = new Set<AiErrorCode>(['rate_limited', 'overloaded', 'timeout', 'network', 'malformed_response']);

/** "4 Nov, 1:30 pm IST" — FINN's users are in India. */
const istTime = (d: Date) =>
  `${d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()} IST`;

export class AiError extends Error {
  readonly retryable: boolean;
  /** For an exhausted quota: when the provider says it resets (null when it did not say). */
  resetsAt: Date | null = null;
  constructor(
    public readonly code: AiErrorCode,
    public readonly detail: string,
    public readonly retryAfterMs: number | null = null,
  ) {
    super(`${USER_MESSAGES[code]}${detail ? ` (${detail})` : ''}`);
    this.retryable = RETRYABLE.has(code);
  }
  get userMessage() {
    if (this.code === 'quota_exhausted') {
      const when = this.resetsAt ? ` It resets around ${istTime(this.resetsAt)}.` : ' It resets daily.';
      return `${USER_MESSAGES.quota_exhausted}${when} Reported figures, charts and saved research are unaffected.`;
    }
    return USER_MESSAGES[this.code];
  }
}

export class AiUnavailableError extends AiError {
  constructor(message = `${ai.reason ?? 'unknown reason'} Set AI_PROVIDER, AI_API_KEY and AI_MODEL in backend/.env.`) {
    super('not_configured', message);
  }
}

/** Provider messages are trimmed and scrubbed of anything that looks like a key or URL query. */
const scrub = (s: string) =>
  s
    .replace(/(key|token)=[^&\s"]+/gi, '$1=***')
    .replace(/\b(AIza|AQ\.|sk-|sk-ant-)[A-Za-z0-9._-]{8,}/g, '***')
    .slice(0, 240);

function parseRetryDelay(body: string | undefined, headers: Record<string, string> | undefined): number | null {
  const header = headers?.['retry-after'];
  if (header && /^\d+(\.\d+)?$/.test(header)) return Number(header) * 1000;
  const m = body?.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  return m ? Number(m[1]) * 1000 : null;
}

export function classifyAiError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  if (RetryError.isInstance(err)) return classifyAiError(err.lastError);
  if (APICallError.isInstance(err)) {
    const status = err.statusCode ?? 0;
    const body = err.responseBody ?? '';
    const text = `${err.message} ${body}`;
    const retryAfter = parseRetryDelay(body, err.responseHeaders);
    if (status === 401 || /API_KEY_INVALID|invalid api key|invalid x-api-key|UNAUTHENTICATED/i.test(text)) return new AiError('invalid_credentials', scrub(err.message));
    if (status === 403) return new AiError('invalid_credentials', scrub(err.message));
    if (status === 404 || /not found|no longer available|does not exist/i.test(err.message)) return new AiError('model_unavailable', scrub(err.message));
    if (status === 402 || /insufficient.{0,20}(credit|balance|funds)|billing/i.test(err.message)) return new AiError('quota_exhausted', scrub(err.message));
    if (status === 429) {
      // Daily or zero quotas will not recover within a retry window; per-minute limits will.
      if (/PerDay|limit:\s*0\b|"quotaValue"\s*:\s*"0"/i.test(text)) return new AiError('quota_exhausted', scrub(err.message), retryAfter);
      return new AiError('rate_limited', scrub(err.message), retryAfter);
    }
    if (status === 408) return new AiError('timeout', scrub(err.message));
    if (status >= 500) return new AiError('overloaded', scrub(err.message), retryAfter);
    return new AiError('provider_error', scrub(err.message));
  }
  if (NoObjectGeneratedError.isInstance(err) || err instanceof ZodError || (err as Error)?.name === 'AI_TypeValidationError' || (err as Error)?.name === 'AI_JSONParseError') {
    return new AiError('malformed_response', scrub((err as Error).message));
  }
  const e = err as Error & { code?: string; cause?: { code?: string } };
  if (e?.name === 'TimeoutError' || e?.name === 'AbortError' || /timed? ?out|aborted/i.test(e?.message ?? '')) return new AiError('timeout', scrub(e.message ?? ''));
  if (/fetch failed|ECONNRESET|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|socket/i.test(`${e?.message} ${e?.code} ${e?.cause?.code}`)) return new AiError('network', scrub(e.message ?? ''));
  return new AiError('provider_error', scrub(e?.message ?? String(err)));
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

type Tier = 'fast' | 'reasoning';

interface Models {
  fast: LanguageModel;
  reasoning: LanguageModel;
  embedding: EmbeddingModel | null;
  label: string;
  provider: string;
  fastId: string;
  reasoningId: string;
}

function buildModels(): Models | null {
  const fastId = env.AI_MODEL;
  const reasoningId = env.AI_REASONING_MODEL ?? env.AI_MODEL;
  switch (ai.provider) {
    case 'anthropic': {
      const p = createAnthropic({ apiKey: env.AI_API_KEY, ...(env.AI_BASE_URL ? { baseURL: env.AI_BASE_URL } : {}) });
      return { fast: p(fastId!), reasoning: p(reasoningId!), embedding: null, label: `Anthropic · ${reasoningId}`, provider: 'anthropic', fastId: fastId!, reasoningId: reasoningId! };
    }
    case 'google': {
      const p = createGoogleGenerativeAI({ apiKey: env.AI_API_KEY, ...(env.AI_BASE_URL ? { baseURL: env.AI_BASE_URL } : {}) });
      return { fast: p(fastId!), reasoning: p(reasoningId!), embedding: env.AI_EMBEDDING_MODEL ? p.textEmbeddingModel(env.AI_EMBEDDING_MODEL) : null, label: `Google · ${reasoningId}`, provider: 'google', fastId: fastId!, reasoningId: reasoningId! };
    }
    case 'openai-compatible': {
      const p = createOpenAICompatible({ name: 'custom', apiKey: env.AI_API_KEY, baseURL: env.AI_BASE_URL! });
      return { fast: p(fastId!), reasoning: p(reasoningId!), embedding: env.AI_EMBEDDING_MODEL ? p.textEmbeddingModel(env.AI_EMBEDDING_MODEL) : null, label: `${env.AI_BASE_URL} · ${reasoningId}`, provider: 'openai-compatible', fastId: fastId!, reasoningId: reasoningId! };
    }
    default:
      return null;
  }
}

let models = buildModels();

/** Test seam: inject mock models (e.g. MockLanguageModelV3 from 'ai/test'). */
export function __setModelsForTest(m: { fast: LanguageModel; reasoning: LanguageModel; embedding: EmbeddingModel | null; label: string } | null) {
  models = m ? { ...m, provider: 'test', fastId: 'mock-fast', reasoningId: 'mock-reasoning' } : null;
  probe = null;
  quotaBlockedUntil.clear();
  quotaResetKnown.clear();
}

export const aiStatus = () => ({
  configured: Boolean(models),
  provider: models?.provider ?? null,
  chatModel: models?.fastId ?? null,
  reasoningModel: models?.reasoningId ?? null,
  embeddingModel: models?.embedding ? env.AI_EMBEDDING_MODEL ?? null : null,
  label: models?.label ?? null,
  embeddings: Boolean(models?.embedding),
  reason: models ? null : ai.reason ?? null,
});

export const aiLabel = () => models?.label ?? null;

// ---------------------------------------------------------------------------
// Usage tracking
// ---------------------------------------------------------------------------

export interface CallMeta {
  feature: string;
  userId?: string | null;
}

interface UsageNumbers {
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
}

function costOf(u: UsageNumbers): number | null {
  if (env.AI_PRICE_INPUT_PER_MTOK === undefined || env.AI_PRICE_OUTPUT_PER_MTOK === undefined) return null;
  const output = (u.outputTokens ?? 0) + (u.reasoningTokens ?? 0);
  return Math.round(((u.inputTokens ?? 0) * env.AI_PRICE_INPUT_PER_MTOK + output * env.AI_PRICE_OUTPUT_PER_MTOK) / 1e4) / 100;
}

function recordUsage(row: { meta: CallMeta; model: string; tier: Tier; status: 'ok' | 'error'; errorCode?: string; attempts: number; usage?: UsageNumbers; latencyMs: number }) {
  if (!models || models.provider === 'test') return;
  const u = row.usage ?? {};
  const int = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : null);
  const values: typeof aiUsage.$inferInsert = {
    userId: row.meta.userId ?? null,
    feature: row.meta.feature,
    provider: models.provider,
    model: row.model,
    tier: row.tier,
    status: row.status,
    errorCode: row.errorCode ?? null,
    attempts: row.attempts,
    inputTokens: int(u.inputTokens),
    outputTokens: int(u.outputTokens),
    reasoningTokens: int(u.reasoningTokens),
    latencyMs: row.latencyMs,
    costUsd: row.status === 'ok' ? costOf(u) : null,
  };
  const insert: Promise<unknown> = db.insert(aiUsage).values(values).execute();
  insert.catch((e: Error) => console.warn('[ai] usage not recorded:', e.message));
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

const GROUNDING_RULES = `You are FINN, an equity research analyst for an Indian institutional investor.
Hard rules:
1. Use ONLY the evidence provided. Never use outside knowledge for numbers, dates, quotes, events, products, segments or competitors.
2. Every point must cite one or more evidence ids exactly as given (e.g. "E3").
3. Never invent financial figures, ratios, management quotations, guidance, announcements or documents. Only repeat numbers that appear in the cited evidence.
4. Interpretations are allowed but must follow from the cited evidence.
5. If evidence is insufficient for a section, return an empty list for it and name the gap in "unanswered".`;

export interface EvidenceItem {
  id: string; // "E1", "E2", ...
  kind: 'reported_fact' | 'calculated_metric' | 'document_excerpt' | 'event';
  text: string;
  sourceDocumentId: string | null;
  sourceTitle: string | null;
}

export function renderEvidence(items: EvidenceItem[]): string {
  return items.map((e) => `[${e.id}] (${e.kind}${e.sourceTitle ? `; source: ${e.sourceTitle}` : ''}) ${e.text}`).join('\n');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAX_WAIT_MS = 20_000;

/**
 * Quotas are per model. Once a model reports an exhausted quota it is not called again until the
 * provider's reset time (capped at 24 h; 15 min when the provider gives none), so requests go
 * straight to the fallback instead of failing first.
 */
const quotaBlockedUntil = new Map<string, number>();
/** Models whose block time came from the provider (rather than FINN's 15-minute default). */
const quotaResetKnown = new Set<string>();
const blockedUntil = (modelId: string) => {
  const until = quotaBlockedUntil.get(modelId);
  return until && until > Date.now() ? until : null;
};

function providerOptions(thinking?: 'minimal' | 'low' | 'medium' | 'high') {
  const level = thinking ?? env.AI_THINKING_LEVEL;
  if (models?.provider === 'google' && level) return { google: { thinkingConfig: { thinkingLevel: level } } };
  return undefined;
}

export interface GenerationResult<T> {
  output: T;
  model: string;
  usedFallback: boolean;
  attempts: number;
  latencyMs: number;
  usage: UsageNumbers;
}

/**
 * Runs one structured generation with bounded retries:
 *   attempt n waits min(1s·2^(n-1) + jitter, provider retry-after, 20s) after a transient error.
 * Non-transient errors (bad key, missing model, exhausted quota) fail immediately. A reasoning
 * call that is still overloaded/rate-limited/timing out after its retries, or whose model quota
 * is exhausted, is tried once on the fast model (quotas are per model), and the result says so.
 */
export async function generateStructuredWithMeta<T extends z.ZodType>(opts: {
  schema: T;
  task: string;
  evidence: EvidenceItem[];
  tier?: Tier;
  thinking?: 'minimal' | 'low' | 'medium' | 'high';
  meta?: CallMeta;
}): Promise<GenerationResult<z.infer<T>>> {
  if (!models) throw new AiUnavailableError();
  const m = models;
  const meta = opts.meta ?? { feature: 'unspecified' };
  const tier = opts.tier ?? 'fast';
  const run = async (which: Tier, maxAttempts: number) => {
    const model = which === 'reasoning' ? m.reasoning : m.fast;
    const modelId = which === 'reasoning' ? m.reasoningId : m.fastId;
    let attempts = 0;
    const started = performance.now();
    const until = blockedUntil(modelId);
    if (until) {
      // Exhausted quota: no request is sent until it resets.
      const blocked = new AiError('quota_exhausted', `${modelId} quota resets at ${new Date(until).toISOString()}`);
      if (quotaResetKnown.has(modelId)) blocked.resetsAt = new Date(until);
      throw blocked;
    }
    for (;;) {
      attempts++;
      try {
        const res = await generateText({
          model,
          system: GROUNDING_RULES,
          prompt: `${opts.task}\n\nEVIDENCE:\n${renderEvidence(opts.evidence)}`,
          output: Output.object({ schema: opts.schema }),
          temperature: 0,
          maxRetries: 0, // retries are handled here so they are classified and bounded
          timeout: env.AI_TIMEOUT_MS,
          providerOptions: providerOptions(opts.thinking),
        });
        const output = opts.schema.parse(res.output);
        const usage = { inputTokens: res.usage.inputTokens, outputTokens: res.usage.outputTokens, reasoningTokens: res.usage.reasoningTokens };
        const latencyMs = Math.round(performance.now() - started);
        recordUsage({ meta, model: modelId, tier: which, status: 'ok', attempts, usage, latencyMs });
        return { output, model: modelId, attempts, latencyMs, usage };
      } catch (raw) {
        const err = classifyAiError(raw);
        const wait = Math.min(err.retryAfterMs ?? 1000 * 2 ** (attempts - 1) + Math.random() * 400, MAX_WAIT_MS);
        if (err.code === 'quota_exhausted') {
          const until = Date.now() + Math.min(err.retryAfterMs ?? 15 * 60_000, 24 * 3600_000);
          quotaBlockedUntil.set(modelId, until);
          if (err.retryAfterMs !== null) {
            quotaResetKnown.add(modelId);
            err.resetsAt = new Date(until);
          } else quotaResetKnown.delete(modelId);
        }
        if (!err.retryable || attempts >= maxAttempts || (err.retryAfterMs ?? 0) > MAX_WAIT_MS) {
          console.warn(`[ai] ${meta.feature}: ${err.code} after ${attempts} attempt(s) on ${modelId}: ${err.detail}`);
          recordUsage({ meta, model: modelId, tier: which, status: 'error', errorCode: err.code, attempts, latencyMs: Math.round(performance.now() - started) });
          throw err;
        }
        console.warn(`[ai] ${meta.feature}: ${err.code} on attempt ${attempts}; retrying in ${Math.round(wait)}ms`);
        await sleep(wait);
      }
    }
  };
  try {
    const r = await run(tier, env.AI_MAX_RETRIES + 1);
    return { ...r, usedFallback: false };
  } catch (err) {
    const e = err as AiError;
    if (tier === 'reasoning' && m.fastId !== m.reasoningId && ['overloaded', 'rate_limited', 'timeout', 'quota_exhausted'].includes(e.code)) {
      console.warn(`[ai] ${meta.feature}: reasoning model unavailable (${e.code}); trying the fast model once`);
      const r = await run('fast', 1);
      return { ...r, usedFallback: true };
    }
    throw err;
  }
}

export async function generateStructured<T extends z.ZodType>(opts: Parameters<typeof generateStructuredWithMeta<T>>[0]): Promise<z.infer<T>> {
  return (await generateStructuredWithMeta(opts)).output;
}

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

export async function embedTexts(texts: string[], meta: CallMeta = { feature: 'embedding' }): Promise<number[][]> {
  if (!models?.embedding) throw new AiUnavailableError('No embedding model is configured.');
  if (texts.length === 0) return [];
  const started = performance.now();
  try {
    const { embeddings, usage } = await embedMany({
      model: models.embedding,
      values: texts,
      providerOptions: {
        google: { outputDimensionality: env.AI_EMBEDDING_DIMENSIONS, taskType: 'SEMANTIC_SIMILARITY' },
      },
      maxParallelCalls: 1,
      maxRetries: env.AI_MAX_RETRIES,
    });
    recordUsage({ meta, model: env.AI_EMBEDDING_MODEL ?? 'embedding', tier: 'fast', status: 'ok', attempts: 1, usage: { inputTokens: usage?.tokens }, latencyMs: Math.round(performance.now() - started) });
    return embeddings;
  } catch (raw) {
    const err = classifyAiError(raw);
    recordUsage({ meta, model: env.AI_EMBEDDING_MODEL ?? 'embedding', tier: 'fast', status: 'error', errorCode: err.code, attempts: 1, latencyMs: Math.round(performance.now() - started) });
    throw err;
  }
}

export const embeddingsAvailable = () => Boolean(models?.embedding);

// ---------------------------------------------------------------------------
// Availability check
// ---------------------------------------------------------------------------

type ModelCheck = { id: string; available: boolean; error: { code: AiErrorCode; message: string } | null; quotaResetsAt: string | null };
let probe: { at: number; latencyMs: number; fast: ModelCheck; reasoning: ModelCheck } | null = null;
const PROBE_TTL_MS = 10 * 60_000;

/**
 * Gemini: the model metadata endpoint verifies the key and that the model is served to it, and
 * consumes no generation quota. Other providers: one tiny generation (counted in ai_usage).
 */
async function checkModel(tier: Tier): Promise<ModelCheck> {
  const m = models!;
  const id = tier === 'reasoning' ? m.reasoningId : m.fastId;
  const until = blockedUntil(id);
  const quota = until ? { code: 'quota_exhausted' as AiErrorCode, message: USER_MESSAGES.quota_exhausted } : null;
  try {
    if (m.provider === 'google') {
      const base = (env.AI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
      const res = await fetch(`${base}/models/${encodeURIComponent(id)}`, { headers: { 'x-goog-api-key': env.AI_API_KEY ?? '' }, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) {
        const code: AiErrorCode = res.status === 404 ? 'model_unavailable' : res.status === 400 || res.status === 401 || res.status === 403 ? 'invalid_credentials' : res.status === 429 ? 'rate_limited' : 'provider_error';
        return { id, available: false, error: { code, message: USER_MESSAGES[code] }, quotaResetsAt: null };
      }
    } else {
      const started = performance.now();
      const res = await generateText({ model: tier === 'reasoning' ? m.reasoning : m.fast, prompt: 'Reply with the single word OK.', maxRetries: 1, timeout: 30_000 });
      recordUsage({ meta: { feature: 'status_probe' }, model: id, tier, status: 'ok', attempts: 1, usage: { inputTokens: res.usage.inputTokens, outputTokens: res.usage.outputTokens }, latencyMs: Math.round(performance.now() - started) });
    }
    return { id, available: !until, error: quota, quotaResetsAt: until ? new Date(until).toISOString() : null };
  } catch (raw) {
    const err = classifyAiError(raw);
    return { id, available: false, error: { code: err.code, message: err.userMessage }, quotaResetsAt: null };
  }
}

export async function probeAi(force = false) {
  if (!models) return { available: false, checkedAt: null, latencyMs: null, models: null, error: { code: 'not_configured' as AiErrorCode, message: ai.reason ?? USER_MESSAGES.not_configured } };
  if (force || !probe || Date.now() - probe.at >= PROBE_TTL_MS) {
    const started = performance.now();
    const [fast, reasoning] = await Promise.all([checkModel('fast'), models.reasoningId === models.fastId ? null : checkModel('reasoning')]);
    probe = { at: Date.now(), latencyMs: Math.round(performance.now() - started), fast, reasoning: reasoning ?? fast };
  }
  // Quota blocks can start or end between probes; reflect the current state.
  const live = (c: ModelCheck): ModelCheck => {
    const until = blockedUntil(c.id);
    if (until) return { ...c, available: false, error: { code: 'quota_exhausted', message: USER_MESSAGES.quota_exhausted }, quotaResetsAt: new Date(until).toISOString() };
    return c.error?.code === 'quota_exhausted' ? { ...c, available: true, error: null, quotaResetsAt: null } : c;
  };
  const fast = live(probe.fast);
  const reasoning = live(probe.reasoning);
  const available = fast.available || reasoning.available;
  return {
    available,
    checkedAt: new Date(probe.at).toISOString(),
    latencyMs: probe.latencyMs,
    models: { fast, reasoning },
    error: available ? null : reasoning.error ?? fast.error,
  };
}

// ---------------------------------------------------------------------------
// Grounding helpers
// ---------------------------------------------------------------------------

/** Keeps only items whose citations all resolve to evidence ids in the pack. */
export function keepCited<T extends { evidenceIds: string[] }>(items: T[], evidence: EvidenceItem[]): T[] {
  const valid = new Set(evidence.map((e) => e.id));
  return items.filter((i) => i.evidenceIds.length > 0 && i.evidenceIds.every((id) => valid.has(id)));
}

const NUMBER = /(?<![A-Za-z])[-−]?\d[\d,]*(?:\.\d+)?/g;
const normaliseNumber = (n: string) => n.replace(/[,−]/g, (c) => (c === '−' ? '-' : '')).replace(/^-/, '');

/**
 * True when every figure in `text` appears in the cited evidence. Years and small counts
 * (<= 10) are allowed because they are commonly used descriptively ("two segments").
 */
export function numbersGrounded(text: string, cited: EvidenceItem[]): boolean {
  const haystack = cited.map((e) => e.text.replace(/,/g, '')).join(' ');
  for (const raw of text.match(NUMBER) ?? []) {
    const n = normaliseNumber(raw);
    const value = Number(n);
    if (!Number.isFinite(value)) continue;
    if (Number.isInteger(value) && (value <= 10 || (value >= 1990 && value <= 2100))) continue;
    if (!haystack.includes(n) && !haystack.includes(value.toString())) return false;
  }
  return true;
}
