/**
 * AI safety tests with a mock language model (no network, no API key).
 * Verifies the structured-output path, that fabricated citations or figures are dropped, and
 * how provider failures are classified, retried and routed to the fallback model.
 */
import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APICallError } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { z } from 'zod';
import { __setModelsForTest, AiError, classifyAiError, generateStructured, generateStructuredWithMeta, keepCited, numbersGrounded, type EvidenceItem } from '../src/ai/gateway.js';
import { humanizeIds } from '../src/services/eventAnalysis.js';
import { groundPoints } from '../src/services/research.js';
import { outcomeLabel } from '../src/services/eventLinks.js';

const evidence: EvidenceItem[] = [
  { id: 'E1', kind: 'reported_fact', text: 'Revenue: ₹78,213 Cr (FY26)', sourceDocumentId: 'd1', sourceTitle: 'Yahoo Finance annual financial statements — ITC.NS' },
  { id: 'E2', kind: 'calculated_metric', text: 'EBITDA margin: 38.1% (FY26)', sourceDocumentId: 'd1', sourceTitle: 'Yahoo Finance annual financial statements — ITC.NS' },
  { id: 'E3', kind: 'reported_fact', text: 'Total debt: ₹312 Cr (FY26)', sourceDocumentId: 'd1', sourceTitle: 'Yahoo Finance annual financial statements — ITC.NS' },
];

test('numbersGrounded: figures must appear in the cited evidence', () => {
  assert.equal(numbersGrounded('Revenue reached ₹78,213 Cr in FY26.', [evidence[0]]), true);
  assert.equal(numbersGrounded('Margins of 38.1% leave room for reinvestment.', [evidence[1]]), true);
  assert.equal(numbersGrounded('Revenue reached ₹91,000 Cr.', [evidence[0]]), false, 'invented figure');
  assert.equal(numbersGrounded('Margins of 38.1% are strong.', [evidence[0]]), false, 'figure exists but not in the cited item');
  assert.equal(numbersGrounded('Debt is low relative to two decades of cash generation since 2005.', [evidence[2]]), true, 'years and small counts allowed');
});

test('keepCited: unknown evidence ids are rejected', () => {
  const kept = keepCited([{ text: 'a', evidenceIds: ['E1'] }, { text: 'b', evidenceIds: ['E9'] }, { text: 'c', evidenceIds: [] }], evidence);
  assert.deepEqual(kept.map((k) => k.text), ['a']);
});

test('groundPoints: drops fabricated points and counts them', () => {
  const { kept, dropped } = groundPoints(
    [
      { text: 'Low leverage: total debt of ₹312 Cr.', evidenceIds: ['E3'] },
      { text: 'Revenue will reach ₹1,00,000 Cr by FY28.', evidenceIds: ['E1'] }, // invented forecast
      { text: 'Market share is 77%.', evidenceIds: ['E7'] }, // non-existent evidence
    ],
    evidence,
  );
  assert.deepEqual(kept.map((k) => k.text), ['Low leverage: total debt of ₹312 Cr.']);
  assert.equal(dropped, 2);
});

test('generateStructured: validated JSON from the configured model (mock)', async () => {
  const schema = z.object({ bullCase: z.array(z.object({ text: z.string(), evidenceIds: z.array(z.string()) })) });
  const mock = new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: 'text', text: JSON.stringify({ bullCase: [{ text: 'Revenue of ₹78,213 Cr provides scale.', evidenceIds: ['E1'] }] }) }],
      finishReason: { unified: 'stop', raw: 'stop' },
      usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 10, text: 10, reasoning: 0 } },
      warnings: [],
    }),
  });
  __setModelsForTest({ fast: mock, reasoning: mock, embedding: null, label: 'mock' });
  const out = await generateStructured({ schema, task: 'test', evidence, tier: 'reasoning' });
  assert.equal(out.bullCase[0].evidenceIds[0], 'E1');
  // The prompt sent to the model carries the grounding rules and the numbered evidence.
  const call = mock.doGenerateCalls[0];
  const system = JSON.stringify(call.prompt);
  assert.match(system, /Use ONLY the evidence provided/);
  assert.match(system, /\[E1\]/);
  __setModelsForTest(null);
});

test('generateStructured without a provider fails clearly instead of inventing content', async () => {
  __setModelsForTest(null);
  await assert.rejects(() => generateStructured({ schema: z.object({}), task: 't', evidence }), /AI is not configured|No AI provider/);
});

test('outcome labels never claim more than the record shows', () => {
  assert.equal(outcomeLabel('completed', 0), 'Delivered on time');
  assert.equal(outcomeLabel('completed', -40), 'Delivered early');
  assert.equal(outcomeLabel('completed', 120), 'Delivered late');
  assert.equal(outcomeLabel('completed', null), 'Delivered — timing unverified');
  assert.equal(outcomeLabel('delayed', 90), 'Delayed');
  assert.equal(outcomeLabel('in_progress', null), 'In progress');
  assert.equal(outcomeLabel('outcome_unverified', null), 'Outcome unverified');
  assert.equal(outcomeLabel('abandoned', null), 'Abandoned');
});

// --- Provider failure handling (mock provider errors; no network) -------------------------

const apiError = (statusCode: number, responseBody: string) =>
  new APICallError({ message: `HTTP ${statusCode}`, url: 'https://provider.test/v1', requestBodyValues: {}, statusCode, responseBody, isRetryable: statusCode >= 500 || statusCode === 429 });

const okResult = (text: string) => ({
  content: [{ type: 'text' as const, text }],
  finishReason: { unified: 'stop' as const, raw: 'stop' },
  usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 10, text: 10, reasoning: 0 } },
  warnings: [],
});
const okJson = JSON.stringify({ bullCase: [{ text: 'Revenue of ₹78,213 Cr provides scale.', evidenceIds: ['E1'] }] });
const bullSchema = z.object({ bullCase: z.array(z.object({ text: z.string(), evidenceIds: z.array(z.string()) })) });

test('classifyAiError maps provider failures to actionable codes', () => {
  assert.equal(classifyAiError(apiError(401, '{"error":{"status":"UNAUTHENTICATED"}}')).code, 'invalid_credentials');
  assert.equal(classifyAiError(apiError(404, 'model not found')).code, 'model_unavailable');
  assert.equal(classifyAiError(apiError(429, '{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier","retryDelay":"51188s"}')).code, 'quota_exhausted');
  const perMinute = classifyAiError(apiError(429, '{"quotaId":"GenerateRequestsPerMinutePerProjectPerModel","retryDelay":"7s"}'));
  assert.equal(perMinute.code, 'rate_limited');
  assert.equal(perMinute.retryAfterMs, 7000);
  assert.equal(classifyAiError(apiError(503, 'high demand')).code, 'overloaded');
  assert.equal(classifyAiError(Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' })).code, 'timeout');
  assert.equal(classifyAiError(new TypeError('fetch failed')).code, 'network');
  // Messages never echo key material.
  assert.doesNotMatch(classifyAiError(apiError(400, 'bad request key=AQ.Ab8RN6IdCcSeuEsecret')).message, /AQ\.Ab8/);
});

test('transient errors are retried with backoff, then succeed', async () => {
  let calls = 0;
  const flaky = new MockLanguageModelV3({
    doGenerate: async () => {
      calls++;
      if (calls === 1) throw apiError(503, 'The model is overloaded');
      return okResult(okJson);
    },
  });
  __setModelsForTest({ fast: flaky, reasoning: flaky, embedding: null, label: 'mock' });
  const r = await generateStructuredWithMeta({ schema: bullSchema, task: 't', evidence, tier: 'fast' });
  assert.equal(r.attempts, 2);
  assert.equal(r.usedFallback, false);
  assert.equal(r.output.bullCase.length, 1);
  __setModelsForTest(null);
});

test('non-transient errors fail at once with a clear code (no retry, no fallback)', async () => {
  let calls = 0;
  const denied = new MockLanguageModelV3({
    doGenerate: async () => {
      calls++;
      throw apiError(401, 'API_KEY_INVALID');
    },
  });
  __setModelsForTest({ fast: denied, reasoning: denied, embedding: null, label: 'mock' });
  await assert.rejects(
    () => generateStructuredWithMeta({ schema: bullSchema, task: 't', evidence, tier: 'reasoning' }),
    (e: unknown) => e instanceof AiError && e.code === 'invalid_credentials',
  );
  assert.equal(calls, 1);
  __setModelsForTest(null);
});

test('exhausted reasoning quota falls back to the fast model and is not retried until reset', async () => {
  let reasoningCalls = 0;
  const reasoning = new MockLanguageModelV3({
    doGenerate: async () => {
      reasoningCalls++;
      throw apiError(429, '{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier","retryDelay":"3600s"}');
    },
  });
  const fast = new MockLanguageModelV3({ doGenerate: async () => okResult(okJson) });
  __setModelsForTest({ fast, reasoning, embedding: null, label: 'mock' });
  const first = await generateStructuredWithMeta({ schema: bullSchema, task: 't', evidence, tier: 'reasoning' });
  assert.equal(first.usedFallback, true);
  assert.equal(first.model, 'mock-fast');
  const second = await generateStructuredWithMeta({ schema: bullSchema, task: 't', evidence, tier: 'reasoning' });
  assert.equal(second.usedFallback, true);
  assert.equal(reasoningCalls, 1, 'the exhausted model is skipped until its quota resets');
  __setModelsForTest(null);
});

test('event comparisons read as prose, not evidence ids', () => {
  assert.equal(
    humanizeIds("E1 and E3 are both PLI plants; E1's capex exceeds E3's. E2 differs.", 'E3'),
    "The new announcement and this precedent are both PLI plants; the new announcement's capex exceeds this precedent's. Another precedent differs.",
  );
});

// --- Secondary provider (OpenAI fallback) ------------------------------------------------------

const counting = (impl: () => ReturnType<typeof okResult> | never) => {
  const m = { calls: 0, model: null as unknown as MockLanguageModelV3 };
  m.model = new MockLanguageModelV3({
    doGenerate: async () => {
      m.calls++;
      return impl();
    },
  });
  return m;
};

test('a rate-limited primary switches to the secondary provider; its output is validated the same way', async () => {
  const primary = counting(() => {
    throw apiError(429, '{"quotaId":"GenerateRequestsPerMinutePerProjectPerModel","retryDelay":"60s"}');
  });
  const secondary = counting(() => okResult(okJson));
  __setModelsForTest({ fast: primary.model, reasoning: primary.model, embedding: null, label: 'mock' }, { fast: secondary.model, reasoning: secondary.model, label: 'mock-fallback' });
  const r = await generateStructuredWithMeta({ schema: bullSchema, task: 't', evidence, tier: 'reasoning' });
  assert.equal(r.provider, 'test-fallback');
  assert.equal(r.fallback, 'secondary_provider');
  assert.equal(r.usedFallback, true);
  assert.equal(r.model, 'mock-fallback-reasoning');
  assert.equal(r.output.bullCase[0].evidenceIds[0], 'E1');
  assert.equal(primary.calls, 1, 'a long retry-after is not waited for');
  assert.equal(secondary.calls, 1);
  // Same prompt contract for both providers: grounding rules and numbered evidence.
  const sent = JSON.stringify(secondary.model.doGenerateCalls[0].prompt);
  assert.match(sent, /Use ONLY the evidence provided/);
  assert.match(sent, /\[E1\]/);
  __setModelsForTest(null);
});

test('configuration errors never switch providers (a bad primary key is reported, not hidden)', async () => {
  const primary = counting(() => {
    throw apiError(401, 'API_KEY_INVALID');
  });
  const secondary = counting(() => okResult(okJson));
  __setModelsForTest({ fast: primary.model, reasoning: primary.model, embedding: null, label: 'mock' }, { fast: secondary.model, reasoning: secondary.model, label: 'mock-fallback' });
  await assert.rejects(
    () => generateStructuredWithMeta({ schema: bullSchema, task: 't', evidence, tier: 'fast' }),
    (e: unknown) => e instanceof AiError && e.code === 'invalid_credentials',
  );
  assert.equal(secondary.calls, 0);
  __setModelsForTest(null);
});

test('an exhausted primary quota sends later requests straight to the secondary (no wasted calls)', async () => {
  const primary = counting(() => {
    throw apiError(429, '{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier","retryDelay":"3600s"}');
  });
  const secondary = counting(() => okResult(okJson));
  __setModelsForTest({ fast: primary.model, reasoning: primary.model, embedding: null, label: 'mock' }, { fast: secondary.model, reasoning: secondary.model, label: 'mock-fallback' });
  for (let i = 0; i < 3; i++) assert.equal((await generateStructuredWithMeta({ schema: bullSchema, task: 't', evidence, tier: 'fast' })).provider, 'test-fallback');
  assert.equal(primary.calls, 1, 'the exhausted primary model is skipped until its quota resets');
  assert.equal(secondary.calls, 3);
  __setModelsForTest(null);
});

test('secondary output that fails the schema is rejected, with bounded attempts', async () => {
  const primary = counting(() => {
    throw apiError(503, 'overloaded');
  });
  const secondary = counting(() => okResult(JSON.stringify({ bullCase: [{ text: 'No citations field' }] })));
  __setModelsForTest({ fast: primary.model, reasoning: primary.model, embedding: null, label: 'mock' }, { fast: secondary.model, reasoning: secondary.model, label: 'mock-fallback' });
  await assert.rejects(
    () => generateStructuredWithMeta({ schema: bullSchema, task: 't', evidence, tier: 'fast' }),
    (e: unknown) => e instanceof AiError && e.code === 'overloaded',
  );
  assert.equal(secondary.calls, 2, 'at most two attempts on the secondary provider');
  assert.ok(primary.calls >= 1 && primary.calls <= 3, 'primary retries are bounded');
  __setModelsForTest(null);
});

test('an OpenAI out-of-credit response is an exhausted quota, not a retryable rate limit', () => {
  const e = classifyAiError(apiError(429, '{"error":{"message":"You exceeded your current quota, please check your plan and billing details.","type":"insufficient_quota","code":"insufficient_quota"}}'));
  assert.equal(e.code, 'quota_exhausted');
  assert.doesNotMatch(classifyAiError(apiError(400, 'bad key sk-proj-AbCdEf123456789xyz')).message, /sk-proj-AbCd/);
});
