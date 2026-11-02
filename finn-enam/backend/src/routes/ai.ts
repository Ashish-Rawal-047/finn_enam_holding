/**
 * AI diagnostics. Safe values only: provider and model names, availability and usage counts.
 * Keys, base URLs and other environment values are never returned.
 */
import { Router } from 'express';
import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { aiStatus, probeAi } from '../ai/gateway.js';
import { db } from '../db/client.js';
import { aiUsage } from '../db/schema.js';
import { handle, parse } from '../lib/http.js';
import { userId } from '../middleware/auth.js';

export const aiRouter = Router();

aiRouter.get(
  '/ai/status',
  handle(async (req, res) => {
    const { refresh } = parse(z.object({ refresh: z.enum(['0', '1']).default('0') }), req.query);
    const s = aiStatus();
    const live = await probeAi(refresh === '1');
    res.json({
      configured: s.configured,
      provider: s.provider,
      model: s.chatModel,
      reasoningModel: s.reasoningModel,
      embeddingModel: s.embeddingModel,
      available: live.available,
      models: live.models,
      checkedAt: live.checkedAt,
      latencyMs: live.latencyMs,
      error: live.error,
      reason: s.reason,
    });
  }),
);

/** The signed-in user's AI usage (requests they triggered), last `days` days. */
aiRouter.get(
  '/ai/usage',
  handle(async (req, res) => {
    const { days } = parse(z.object({ days: z.coerce.number().int().min(1).max(90).default(30) }), req.query);
    const since = new Date(Date.now() - days * 86_400_000);
    const mine = and(eq(aiUsage.userId, userId(req)), gt(aiUsage.createdAt, since));
    const [byFeature, recent] = await Promise.all([
      db
        .select({
          feature: aiUsage.feature,
          model: aiUsage.model,
          requests: sql<number>`count(*)::int`,
          errors: sql<number>`count(*) filter (where ${aiUsage.status} = 'error')::int`,
          inputTokens: sql<number>`coalesce(sum(${aiUsage.inputTokens}), 0)::int`,
          outputTokens: sql<number>`coalesce(sum(${aiUsage.outputTokens}), 0)::int`,
          reasoningTokens: sql<number>`coalesce(sum(${aiUsage.reasoningTokens}), 0)::int`,
          avgLatencyMs: sql<number>`round(avg(${aiUsage.latencyMs}))::int`,
          costUsd: sql<number | null>`sum(${aiUsage.costUsd})`,
        })
        .from(aiUsage)
        .where(mine)
        .groupBy(aiUsage.feature, aiUsage.model)
        .orderBy(desc(sql`count(*)`)),
      db
        .select({
          feature: aiUsage.feature,
          model: aiUsage.model,
          status: aiUsage.status,
          errorCode: aiUsage.errorCode,
          attempts: aiUsage.attempts,
          inputTokens: aiUsage.inputTokens,
          outputTokens: aiUsage.outputTokens,
          reasoningTokens: aiUsage.reasoningTokens,
          latencyMs: aiUsage.latencyMs,
          costUsd: aiUsage.costUsd,
          createdAt: aiUsage.createdAt,
        })
        .from(aiUsage)
        .where(mine)
        .orderBy(desc(aiUsage.createdAt))
        .limit(20),
    ]);
    const totals = byFeature.reduce(
      (t, r) => ({
        requests: t.requests + r.requests,
        errors: t.errors + r.errors,
        inputTokens: t.inputTokens + r.inputTokens,
        outputTokens: t.outputTokens + r.outputTokens,
        reasoningTokens: t.reasoningTokens + r.reasoningTokens,
      }),
      { requests: 0, errors: 0, inputTokens: 0, outputTokens: 0, reasoningTokens: 0 },
    );
    const priced = byFeature.some((r) => r.costUsd !== null);
    res.json({
      days,
      totals: { ...totals, costUsd: priced ? Math.round(byFeature.reduce((s, r) => s + (r.costUsd ?? 0), 0) * 100) / 100 : null },
      costNote: priced ? null : 'Cost is not reported: set AI_PRICE_INPUT_PER_MTOK and AI_PRICE_OUTPUT_PER_MTOK to your provider’s prices.',
      byFeature,
      recent,
    });
  }),
);
