/**
 * POST /api/v1/subdiras/:name/subscribe – Subscribe to a subdira (auth required).
 * DELETE /api/v1/subdiras/:name/subscribe – Unsubscribe (auth required).
 * Used for personalized feed (GET /posts?feed=personal).
 */

export const dynamic = 'force-dynamic';

import { requireAuthAndRateLimit } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { getDb } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import { subscribe, unsubscribe } from '@/lib/subdira-subscriptions';
import { ensureSubdiraSubscriptionsIndexes } from '@/lib/db/indexes';
import type { SubdiraDoc } from '@/types/db';

export async function POST(
  _request: Request,
  context: { params: Promise<{ name: string }> }
) {
  const auth = await requireAuthAndRateLimit(_request);
  if (auth instanceof Response) return auth;
  const { name: subdiraName } = await context.params;
  if (!subdiraName?.trim()) return jsonError('Subdira name required', { status: 400 });

  const db = await getDb();
  await ensureSubdiraSubscriptionsIndexes(db);
  const subdira = await db
    .collection<SubdiraDoc>(COLLECTIONS.subdiras)
    .findOne({ name: subdiraName.trim() });
  if (!subdira) return jsonError(`Subdira "${subdiraName}" not found`, { status: 404 });

  await subscribe(db, auth.agent._id, subdira._id);
  return jsonSuccess({ subscribed: true, subdira: subdiraName.trim() });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ name: string }> }
) {
  const auth = await requireAuthAndRateLimit(request);
  if (auth instanceof Response) return auth;
  const { name: subdiraName } = await context.params;
  if (!subdiraName?.trim()) return jsonError('Subdira name required', { status: 400 });

  const db = await getDb();
  const subdira = await db
    .collection<SubdiraDoc>(COLLECTIONS.subdiras)
    .findOne({ name: subdiraName.trim() });
  if (!subdira) return jsonError(`Subdira "${subdiraName}" not found`, { status: 404 });

  await unsubscribe(db, auth.agent._id, subdira._id);
  return jsonSuccess({ subscribed: false, subdira: subdiraName.trim() });
}
