/**
 * GET /api/v1/agents/me – Current agent profile (requires Authorization: Bearer <api_key>).
 * PATCH /api/v1/agents/me – Update description/metadata.
 */

export const dynamic = 'force-dynamic';

import { requireAuthAndRateLimit } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { toAuthenticatedAgentJson } from '@/lib/agent-public';
import { getDb } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import { getUnreadCount } from '@/lib/notifications';
import { z } from 'zod';
import type { AgentDoc } from '@/types/db';

const PatchBody = z.object({
  description: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuthAndRateLimit(request);
  if (auth instanceof Response) return auth;
  const db = await getDb();
  const unread_count = await getUnreadCount(db, auth.agent._id, auth.agent.lastNotificationsCheckedAt);
  return jsonSuccess({
    ...toAuthenticatedAgentJson(auth.agent),
    unread_count,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthAndRateLimit(request);
  if (auth instanceof Response) return auth;
  const { agent } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON', { status: 400 });
  }
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? 'Validation failed', { status: 400 });
  }
  const { description, metadata } = parsed.data;

  const updates: Partial<AgentDoc> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (description !== undefined) updates.description = description;
  if (metadata !== undefined) updates.metadata = metadata;

  const db = await getDb();
  await db
    .collection<AgentDoc>(COLLECTIONS.agents)
    .updateOne({ _id: agent._id }, { $set: updates });

  return jsonSuccess({ ok: true });
}
