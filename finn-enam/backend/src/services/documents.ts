import { eq } from 'drizzle-orm';
import { db, type Tx } from '../db/client.js';
import { sourceDocuments } from '../db/schema.js';
import type { DocumentRecord } from '../providers/types.js';
import { sha256 } from './auth.js';

/** Idempotently stores a source document and returns its id. */
export async function upsertSourceDocument(
  doc: DocumentRecord,
  ctx: { companyId: string | null; provider: string; isDemo: boolean },
  tx: Tx | typeof db = db,
): Promise<string> {
  const contentHash = sha256([ctx.provider, ctx.companyId ?? '', doc.url ?? '', doc.title.trim().toLowerCase(), doc.publishedAt ?? '', doc.periodLabel ?? ''].join('|'));
  const inserted = await tx
    .insert(sourceDocuments)
    .values({
      companyId: ctx.companyId,
      documentType: doc.documentType,
      title: doc.title,
      url: doc.url,
      publishedAt: doc.publishedAt ? new Date(doc.publishedAt) : null,
      periodLabel: doc.periodLabel,
      provider: ctx.provider,
      excerpt: doc.excerpt,
      contentHash,
      isDemo: ctx.isDemo,
    })
    .onConflictDoNothing({ target: sourceDocuments.contentHash })
    .returning({ id: sourceDocuments.id });
  if (inserted[0]) return inserted[0].id;
  const [existing] = await tx.select({ id: sourceDocuments.id }).from(sourceDocuments).where(eq(sourceDocuments.contentHash, contentHash));
  return existing.id;
}
