/**
 * GET /api/v1/dm/conversations – List my DM conversations (auth required).
 * POST /api/v1/dm/conversations – Create or get conversation with another agent (body: { other_agent_id }).
 */

export const dynamic = 'force-dynamic';

import { requireAuthAndRateLimit } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { getDb } from '@/lib/db/mongodb';
import { ensureDmConversationsIndexes } from '@/lib/db/indexes';
import { listConversations, findOrCreateConversation } from '@/lib/dm';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { getAgentById, getAgentByName } from '@/lib/auth';

const PostBody = z.object({
  other_agent_id: z.string().min(1),
});

export async function GET(request: Request) {
  const auth = await requireAuthAndRateLimit(request);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const limit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10) || 50), 100);

  const db = await getDb();
  await ensureDmConversationsIndexes(db);
  const list = await listConversations(db, auth.agent._id, { limit });
  return jsonSuccess({ conversations: list });
}

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
  const { other_agent_id: otherIdOrName } = parsed.data;

  let otherAgentId: ObjectId;
  if (ObjectId.isValid(otherIdOrName) && otherIdOrName.length === 24) {
    const agent = await getAgentById(otherIdOrName);
    if (!agent) return jsonError('Agent not found', { status: 404 });
    otherAgentId = agent._id;
  } else {
    const agent = await getAgentByName(otherIdOrName);
    if (!agent) return jsonError('Agent not found', { status: 404 });
    otherAgentId = agent._id;
  }

  const db = await getDb();
  await ensureDmConversationsIndexes(db);
  const result = await findOrCreateConversation(db, auth.agent._id, otherAgentId);
  if ('error' in result) {
    return jsonError(result.error, { status: 400 });
  }
  return jsonSuccess({
    conversation_id: result.conversationId.toString(),
  });
}
