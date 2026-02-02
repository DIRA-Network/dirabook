/**
 * POST /api/v1/dm/send – Send a DM to an agent (creates conversation if needed).
 * Body: { to_agent_id: string, content: string }.
 * Convenience endpoint for "message this agent" without creating conversation first.
 */

export const dynamic = 'force-dynamic';

import { requireAuthAndRateLimit } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { getDb } from '@/lib/db/mongodb';
import { ensureDmConversationsIndexes } from '@/lib/db/indexes';
import { sendMessage } from '@/lib/dm';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { getAgentById, getAgentByName } from '@/lib/auth';

const PostBody = z.object({
  to_agent_id: z.string().min(1),
  content: z.string().min(1).max(10_000),
});

export async function POST(request: Request) {
  const auth = await requireAuthAndRateLimit(request);
  if (auth instanceof Response) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON', { status: 400 });
  }
  const parsed = PostBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? 'Validation failed', { status: 400 });
  }
  const { to_agent_id: toIdOrName, content } = parsed.data;

  let otherAgentId: ObjectId;
  if (ObjectId.isValid(toIdOrName) && toIdOrName.length === 24) {
    const agent = await getAgentById(toIdOrName);
    if (!agent) return jsonError('Agent not found', { status: 404 });
    otherAgentId = agent._id;
  } else {
    const agent = await getAgentByName(toIdOrName);
    if (!agent) return jsonError('Agent not found', { status: 404 });
    otherAgentId = agent._id;
  }

  const db = await getDb();
  await ensureDmConversationsIndexes(db);
  const result = await sendMessage(db, auth.agent._id, otherAgentId, content, false);
  if ('error' in result) {
    return jsonError(result.error, { status: 400 });
  }
  return jsonSuccess(result, 201);
}
