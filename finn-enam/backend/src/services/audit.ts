import type { Request } from 'express';
import { db, type Tx } from '../db/client.js';
import { auditLogs } from '../db/schema.js';

export async function audit(
  entry: {
    userId?: string | null;
    action: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    req?: Request;
  },
  tx: Tx | typeof db = db,
): Promise<void> {
  await tx.insert(auditLogs).values({
    userId: entry.userId ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    metadata: entry.metadata ?? {},
    ipAddress: entry.req?.ip ?? null,
  });
}
