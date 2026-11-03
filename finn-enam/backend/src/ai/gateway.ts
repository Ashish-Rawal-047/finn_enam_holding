/**
 * AI service layer. Provider and models come from configuration (see config/env.ts):
 * Neon AI Gateway, Anthropic, OpenAI, Google (Gemini) or any OpenAI-compatible endpoint as the
 * primary provider, and optionally OpenAI (Responses API) as a secondary provider that takes over
 * when the primary is rate-limited, out of quota, overloaded or unreachable.
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
import { createNeon } from '@neon/ai-sdk-provider';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { APICallError, embedMany, generateText, NoObjectGeneratedError, Output, RetryError, type EmbeddingModel, type LanguageModel } from 'ai';
import { ZodError, type z } from 'zod';
import { ai, aiFallback, env } from '../config/env.js';
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
  quota_exhausted: 'The AI provider quota or credits for this key are exhausted.',
  rate_limited: 'The AI provider is rate-limiting requests. Please try again shortly.',
  overloaded: 'The AI provider is temporarily overloaded.',
  timeout: 'The AI provider did not respond in time.',
  model_unavailable: 'The configured AI model is not available to this key.',
  malformed_response: 'The AI provider returned a response that did not match the required structure.',
  network: 'The AI provider could not be reached (network error).',
  provider_error: 'The AI provider returned an error.',
};

const RETRYABLE = new Set<AiErrorCode>(['rate_limited', 'overloaded', 'timeout', 'network', 'malformed_response']);

export class AiError extends Error {
  readonly retryable: boolean;
  constructor(
    public readonly code: AiErrorCode,
    public readonly detail: string,
    public readonly retryAfterMs: number | null = null,
  ) {
    super(`${USER_MESSAGES[code]}${detail ? ` (${detail})` : ''}`);
    this.retryable = RETRYABLE.has(code);
  }
  get userMessage() {
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
      if (/PerDay|limit:\s*0\b|"quotaValue"\s*:\s*"0"|insufficient_quota|exceeded your current quota/i.test(text)) return new AiError('quota_exhausted', scrub(err.message), retryAfter);
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

/** One provider's models. FINN uses a primary provider and, optionally, a secondary fallback. */
interface Models {
  fast: LanguageModel;
  reasoning: LanguageModel;
  embedding: EmbeddingModel | null;
  label: string;
  /** Provider id as recorded in ai_usage ('google', 'openai', ...). */
  provider: string;
  /** Display name ('Google', 'OpenAI', ...). */
  name: string;
  fastId: string;
  reasoningId: string;
  pricing: { input?: number; output?: number };
}

function buildModels(): Models | null {
  const fastId = env.AI_MODEL;
  const reasoningId = env.AI_REASONING_MODEL ?? env.AI_MODEL;
  const pricing = { input: env.AI_PRICE_INPUT_PER_MTOK, output: env.AI_PRICE_OUTPUT_PER_MTOK };
  switch (ai.provider) {
    case 'neon': {
      const neon = createNeon({ baseURL: env.NEON_AI_GATEWAY_BASE_URL, apiKey: env.NEON_AI_GATEWAY_TOKEN });
      const f = fastId ?? 'claude-haiku-4-5';
      const r = reasoningId ?? 'claude-sonnet-4-6';
      return { fast: neon(f), reasoning: neon(r), embedding: neon.embeddingModel(env.AI_EMBEDDING_MODEL ?? 'qwen3-embedding-0-6b'), label: `Neon AI Gateway · ${r}`, provider: 'neon', name: 'Neon AI Gateway', fastId: f, reasoningId: r, pricing };
    }
    case 'anthropic': {
      const p = createAnthropic({ apiKey: env.AI_API_KEY, ...(env.AI_BASE_URL ? { baseURL: env.AI_BASE_URL } : {}) });
      return { fast: p(fastId!), reasoning: p(reasoningId!), embedding: null, label: `Anthropic · ${reasoningId}`, provider: 'anthropic', name: 'Anthropic', fastId: fastId!, reasoningId: reasoningId!, pricing };
    }
    case 'openai': {
      const p = createOpenAI({ apiKey: env.AI_API_KEY, ...(env.AI_BASE_URL ? { baseURL: env.AI_BASE_URL } : {}) });
      return { fast: p(fastId!), reasoning: p(reasoningId!), embedding: env.AI_EMBEDDING_MODEL ? p.embedding(env.AI_EMBEDDING_MODEL) : null, label: `OpenAI · ${reasoningId}`, provider: 'openai', name: 'OpenAI', fastId: fastId!, reasoningId: reasoningId!, pricing };
    }
    case 'google': {
      const p = createGoogleGenerativeAI({ apiKey: env.AI_API_KEY, ...(env.AI_BASE_URL ? { baseURL: env.AI_BASE_URL } : {}) });
      return { fast: p(fastId!), reasoning: p(reasoningId!), embedding: env.AI_EMBEDDING_MODEL ? p.textEmbeddingModel(env.AI_EMBEDDING_MODEL) : null, label: `Google · ${reasoningId}`, provider: 'google', name: 'Google', fastId: fastId!, reasoningId: reasoningId!, pricing };
    }
    case 'openai-compatible': {
      const p = createOpenAICompatible({ name: 'custom', apiKey: env.AI_API_KEY, baseURL: env.AI_BASE_URL! });
      return { fast: p(fastId!), reasoning: p(reasoningId!), embedding: env.AI_EMBEDDING_MODEL ? p.textEmbeddingModel(env.AI_EMBEDDING_MODEL) : null, label: `${env.AI_BASE_URL} · ${reasoningId}`, provider: 'openai-compatible', name: 'OpenAI-compatible', fastId: fastId!, reasoningId: reasoningId!, pricing };
    }
    default:
      return null;
  }
}

/**
 * Secondary provider: OpenAI through the Responses API. Generation only — embeddings stay on the
 * primary provider, because vectors from different models cannot be compared with each other.
 */
function buildFallback(): Models | null {
  if (aiFallback.provider !== 'openai') return null;
  const p = createOpenAI({ apiKey: env.OPENAI_API_KEY, ...(env.OPENAI_BASE_URL ? { baseURL: env.OPENAI_BASE_URL } : {}) });
  const fastId = env.OPENAI_MODEL!;
  const reasoningId = env.OPENAI_REASONING_MODEL ?? fastId;
  return {
    fast: p.responses(fastId),
    reasoning: p.responses(reasoningId),
    embedding: null,
    label: `OpenAI · ${reasoningId}`,
    provider: 'openai',
    name: 'OpenAI',
    fastId,
    reasoningId,
    pricing: { input: env.OPENAI_PRICE_INPUT_PER_MTOK, output: env.OPENAI_PRICE_OUTPUT_PER_MTOK },
  };
}

let models = buildModels();
let fallback = buildFallback();

type TestModels = { fast: LanguageModel; reasoning: LanguageModel; embedding: EmbeddingModel | null; label: string };

/** Test seam: inject mock models (e.g. MockLanguageModelV3 from 'ai/test'), optionally a fallback. */
export function __setModelsForTest(m: TestModels | null, fb: Omit<TestModels, 'embedding'> | null = null) {
  models = m ? { ...m, provider: 'test', name: 'Test', fastId: 'mock-fast', reasoningId: 'mock-reasoning', pricing: {} } : null;
  fallback = m && fb ? { ...fb, embedding: null, provider: 'test-fallback', name: 'Test fallback', fastId: 'mock-fallback-fast', reasoningId: 'mock-fallback-reasoning', pricing: {} } : null;
  probe = null;
  quotaBlockedUntil.clear();
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
  fallback: fallback
    ? { configured: true, provider: fallback.provider, chatModel: fallback.fastId, reasoningModel: fallback.reasoningId, reason: null }
    : { configured: false, provider: null, chatModel: null, reasoningModel: null, reason: aiFallback.reason ?? null },
});

/** The primary provider's label (stable, so identical research inputs are still recognised). */
export const aiLabel = () => models?.label ?? null;

/** Display name of a provider id recorded with a result ('google' → 'Google'). */
export const providerName = (id: string) => (models?.provider === id ? models.name : fallback?.provider === id ? fallback.name : id);

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

/** Estimated USD cost from the provider's configured prices; null when prices are not set. */
function costOf(u: UsageNumbers, p: Models): number | null {
  if (p.pricing.input === undefined || p.pricing.output === undefined) return null;
  const output = (u.outputTokens ?? 0) + (u.reasoningTokens ?? 0);
  return Math.round(((u.inputTokens ?? 0) * p.pricing.input + output * p.pricing.output) / 1e4) / 100;
}

function recordUsage(p: Models, row: { meta: CallMeta; model: string; tier: Tier; status: 'ok' | 'error'; errorCode?: string; attempts: number; usage?: UsageNumbers; latencyMs: number }) {
  if (p.provider.startsWith('test')) return;
  const u = row.usage ?? {};
  const int = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : null);
  const values: typeof aiUsage.$inferInsert = {
    userId: row.meta.userId ?? null,
    feature: row.meta.feature,
    provider: p.provider,
    model: row.model,
    tier: row.tier,
    status: row.status,
    errorCode: row.errorCode ?? null,
    attempts: row.attempts,
    inputTokens: int(u.inputTokens),
    outputTokens: int(u.outputTokens),
    reasoningTokens: int(u.reasoningTokens),
    latencyMs: row.latencyMs,
    costUsd: row.status === 'ok' ? costOf(u, p) : null,
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
/** Attempts on the secondary provider (bounded; it is only reached after the primary failed). */
const FALLBACK_ATTEMPTS = 2;

/**
 * Quotas are per model. Once a model reports an exhausted quota it is not called again until the
 * provider's reset time (capped at 24 h; 15 min when the provider gives none), so requests go
 * straight to the next model instead of failing first. Keyed by provider and model.
 */
const quotaBlockedUntil = new Map<string, number>();
const quotaKey = (p: Models, modelId: string) => `${p.provider}:${modelId}`;
const blockedUntil = (p: Models, modelId: string) => {
  const until = quotaBlockedUntil.get(quotaKey(p, modelId));
  return until && until > Date.now() ? until : null;
};

/** Failures that justify trying another provider: capacity and availability, not configuration. */
const SWITCHABLE = new Set<AiErrorCode>(['quota_exhausted', 'rate_limited', 'overloaded', 'timeout', 'network']);

function providerOptions(p: Models, thinking?: 'minimal' | 'low' | 'medium' | 'high') {
  const level = thinking ?? env.AI_THINKING_LEVEL;
  if (p.provider === 'google' && level) return { google: { thinkingConfig: { thinkingLevel: level } } };
  return undefined;
}

export interface GenerationResult<T> {
  output: T;
  model: string;
  /** Provider that produced the output ('google', 'openai', ...). */
  provider: string;
  usedFallback: boolean;
  /** How the output was obtained when the requested model failed. */
  fallback: 'secondary_provider' | 'fast_model' | null;
  attempts: number;
  latencyMs: number;
  usage: UsageNumbers;
}

/**
 * Runs one structured generation. The prompt, grounding rules and output schema are identical for
 * every provider, and every output is validated against the caller's schema.
 *
 *  1. The primary provider (Gemini), with bounded retries for transient errors:
 *     attempt n waits min(1s·2^(n-1) + jitter, provider retry-after, 20s).
 *  2. If it failed with a capacity or availability error (quota, rate limit, overload, timeout,
 *     network), the secondary provider (OpenAI), at most FALLBACK_ATTEMPTS attempts.
 *  3. For research (reasoning tier), the primary's fast model once, as a last resort.
 * Configuration errors (bad key, unknown model) and malformed output never switch providers.
 * Calls are sequential, so a request is never sent to two providers at once.
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
  const primary = models;
  const secondary = fallback;
  const meta = opts.meta ?? { feature: 'unspecified' };
  const tier = opts.tier ?? 'fast';
  const run = async (p: Models, which: Tier, maxAttempts: number) => {
    const model = which === 'reasoning' ? p.reasoning : p.fast;
    const modelId = which === 'reasoning' ? p.reasoningId : p.fastId;
    let attempts = 0;
    const started = performance.now();
    const until = blockedUntil(p, modelId);
    if (until) throw new AiError('quota_exhausted', `${modelId} quota resets at ${new Date(until).toISOString()}`);
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
          providerOptions: providerOptions(p, opts.thinking),
        });
        const output = opts.schema.parse(res.output);
        const usage = { inputTokens: res.usage.inputTokens, outputTokens: res.usage.outputTokens, reasoningTokens: res.usage.reasoningTokens };
        const latencyMs = Math.round(performance.now() - started);
        recordUsage(p, { meta, model: modelId, tier: which, status: 'ok', attempts, usage, latencyMs });
        return { output, model: modelId, provider: p.provider, attempts, latencyMs, usage };
      } catch (raw) {
        const err = classifyAiError(raw);
        const wait = Math.min(err.retryAfterMs ?? 1000 * 2 ** (attempts - 1) + Math.random() * 400, MAX_WAIT_MS);
        if (err.code === 'quota_exhausted') quotaBlockedUntil.set(quotaKey(p, modelId), Date.now() + Math.min(err.retryAfterMs ?? 15 * 60_000, 24 * 3600_000));
        if (!err.retryable || attempts >= maxAttempts || (err.retryAfterMs ?? 0) > MAX_WAIT_MS) {
          console.warn(`[ai] ${meta.feature}: ${err.code} after ${attempts} attempt(s) on ${p.provider}/${modelId}: ${err.detail}`);
          recordUsage(p, { meta, model: modelId, tier: which, status: 'error', errorCode: err.code, attempts, latencyMs: Math.round(performance.now() - started) });
          throw err;
        }
        console.warn(`[ai] ${meta.feature}: ${err.code} on attempt ${attempts} (${p.provider}); retrying in ${Math.round(wait)}ms`);
        await sleep(wait);
      }
    }
  };

  let first: AiError;
  try {
    return { ...(await run(primary, tier, env.AI_MAX_RETRIES + 1)), usedFallback: false, fallback: null };
  } catch (err) {
    first = err as AiError;
    if (!SWITCHABLE.has(first.code)) throw first;
  }
  if (secondary) {
    console.warn(`[ai] ${meta.feature}: ${primary.name} unavailable (${first.code}); switching to ${secondary.name}`);
    try {
      return { ...(await run(secondary, tier, FALLBACK_ATTEMPTS)), usedFallback: true, fallback: 'secondary_provider' };
    } catch (err) {
      console.warn(`[ai] ${meta.feature}: ${secondary.name} fallback failed (${(err as AiError).code})`);
    }
  }
  if (tier === 'reasoning' && primary.fastId !== primary.reasoningId) {
    console.warn(`[ai] ${meta.feature}: trying ${primary.name}'s fast model once`);
    return { ...(await run(primary, 'fast', 1)), usedFallback: true, fallback: 'fast_model' };
  }
  throw first;
}

export async function generateStructured<T extends z.ZodType>(opts: Parameters<typeof generateStructuredWithMeta<T>>[0]): Promise<z.infer<T>> {
  return (await generateStructuredWithMeta(opts)).output;
}

// ---------------------------------------------------------------------------
// Embeddings (primary provider only: vectors from different models are not comparable)
// ---------------------------------------------------------------------------

export async function embedTexts(texts: string[], meta: CallMeta = { feature: 'embedding' }): Promise<number[][]> {
  if (!models?.embedding) throw new AiUnavailableError('No embedding model is configured.');
  if (texts.length === 0) return [];
  const p = models;
  const started = performance.now();
  try {
    const { embeddings, usage } = await embedMany({
      model: p.embedding!,
      values: texts,
      providerOptions: {
        neon: { dimensions: env.AI_EMBEDDING_DIMENSIONS },
        google: { outputDimensionality: env.AI_EMBEDDING_DIMENSIONS, taskType: 'SEMANTIC_SIMILARITY' },
        openai: { dimensions: env.AI_EMBEDDING_DIMENSIONS },
      },
      maxParallelCalls: 1,
      maxRetries: env.AI_MAX_RETRIES,
    });
    recordUsage(p, { meta, model: env.AI_EMBEDDING_MODEL ?? 'embedding', tier: 'fast', status: 'ok', attempts: 1, usage: { inputTokens: usage?.tokens }, latencyMs: Math.round(performance.now() - started) });
    return embeddings;
  } catch (raw) {
    const err = classifyAiError(raw);
    recordUsage(p, { meta, model: env.AI_EMBEDDING_MODEL ?? 'embedding', tier: 'fast', status: 'error', errorCode: err.code, attempts: 1, latencyMs: Math.round(performance.now() - started) });
    throw err;
  }
}

export const embeddingsAvailable = () => Boolean(models?.embedding);

// ---------------------------------------------------------------------------
// Availability check
// ---------------------------------------------------------------------------

type ModelCheck = { id: string; available: boolean; error: { code: AiErrorCode; message: string } | null; quotaResetsAt: string | null };
type ProviderCheck = { fast: ModelCheck; reasoning: ModelCheck };
let probe: { at: number; latencyMs: number; primary: ProviderCheck; secondary: ProviderCheck | null } | null = null;
const PROBE_TTL_MS = 10 * 60_000;

const statusCode = (status: number): AiErrorCode =>
  status === 404 ? 'model_unavailable' : status === 400 || status === 401 || status === 403 ? 'invalid_credentials' : status === 429 ? 'rate_limited' : 'provider_error';

/**
 * Gemini and the OpenAI fallback: the model metadata endpoint verifies the key and that the model
 * is served to it, and consumes no generation quota or credit. Other providers: one tiny generation.
 */
async function checkModel(p: Models, tier: Tier): Promise<ModelCheck> {
  const id = tier === 'reasoning' ? p.reasoningId : p.fastId;
  const until = blockedUntil(p, id);
  const quota = until ? { code: 'quota_exhausted' as AiErrorCode, message: USER_MESSAGES.quota_exhausted } : null;
  try {
    const metadata: { url: string; headers: Record<string, string> } | null =
      p.provider === 'google'
        ? { url: `${(env.AI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '')}/models/${encodeURIComponent(id)}`, headers: { 'x-goog-api-key': env.AI_API_KEY ?? '' } }
        : p === fallback
          ? { url: `${(env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')}/models/${encodeURIComponent(id)}`, headers: { Authorization: `Bearer ${env.OPENAI_API_KEY ?? ''}` } }
          : null;
    if (metadata) {
      const res = await fetch(metadata.url, { headers: metadata.headers, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) {
        const code = statusCode(res.status);
        return { id, available: false, error: { code, message: USER_MESSAGES[code] }, quotaResetsAt: null };
      }
    } else {
      const started = performance.now();
      const res = await generateText({ model: tier === 'reasoning' ? p.reasoning : p.fast, prompt: 'Reply with the single word OK.', maxRetries: 1, timeout: 30_000 });
      recordUsage(p, { meta: { feature: 'status_probe' }, model: id, tier, status: 'ok', attempts: 1, usage: { inputTokens: res.usage.inputTokens, outputTokens: res.usage.outputTokens }, latencyMs: Math.round(performance.now() - started) });
    }
    return { id, available: !until, error: quota, quotaResetsAt: until ? new Date(until).toISOString() : null };
  } catch (raw) {
    const err = classifyAiError(raw);
    return { id, available: false, error: { code: err.code, message: err.userMessage }, quotaResetsAt: null };
  }
}

async function checkProvider(p: Models): Promise<ProviderCheck> {
  const [fast, reasoning] = await Promise.all([checkModel(p, 'fast'), p.reasoningId === p.fastId ? null : checkModel(p, 'reasoning')]);
  return { fast, reasoning: reasoning ?? fast };
}

export async function probeAi(force = false) {
  if (!models) return { available: false, checkedAt: null, latencyMs: null, models: null, fallback: null, error: { code: 'not_configured' as AiErrorCode, message: ai.reason ?? USER_MESSAGES.not_configured } };
  if (force || !probe || Date.now() - probe.at >= PROBE_TTL_MS) {
    const started = performance.now();
    const [primary, secondary] = await Promise.all([checkProvider(models), fallback ? checkProvider(fallback) : Promise.resolve(null)]);
    probe = { at: Date.now(), latencyMs: Math.round(performance.now() - started), primary, secondary };
  }
  // Quota blocks can start or end between probes; reflect the current state.
  const live = (p: Models, c: ModelCheck): ModelCheck => {
    const until = blockedUntil(p, c.id);
    if (until) return { ...c, available: false, error: { code: 'quota_exhausted', message: USER_MESSAGES.quota_exhausted }, quotaResetsAt: new Date(until).toISOString() };
    return c.error?.code === 'quota_exhausted' ? { ...c, available: true, error: null, quotaResetsAt: null } : c;
  };
  const fast = live(models, probe.primary.fast);
  const reasoning = live(models, probe.primary.reasoning);
  const secondary = fallback && probe.secondary ? { provider: fallback.provider, fast: live(fallback, probe.secondary.fast), reasoning: live(fallback, probe.secondary.reasoning) } : null;
  const available = fast.available || reasoning.available || Boolean(secondary && (secondary.fast.available || secondary.reasoning.available));
  return {
    available,
    checkedAt: new Date(probe.at).toISOString(),
    latencyMs: probe.latencyMs,
    models: { fast, reasoning },
    fallback: secondary,
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
