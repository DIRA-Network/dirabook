/**
 * GET /api/v1/dm/conversations/:id/messages – List messages (auth, cursor).
 * POST /api/v1/dm/conversations/:id/messages – Send a message (body: { content }).
 */

export const dynamic = 'force-dynamic';

import { requireAuthAndRateLimit } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { getDb } from '@/lib/db/mongodb';
import { ensureDmConversationsIndexes } from '@/lib/db/indexes';
import { getMessages, sendMessage } from '@/lib/dm';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

const PostBody = z.object({
  content: z.string().min(1).max(10_000),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthAndRateLimit(request);
  if (auth instanceof Response) return auth;

  const { id: convIdStr } = await context.params;
  let conversationId: ObjectId;
  try {
    conversationId = new ObjectId(convIdStr);
  } catch {
    return jsonError('Invalid conversation id', { status: 400 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10) || 50), 100);
  const cursor = url.searchParams.get('cursor') ?? null;

  const db = await getDb();
  await ensureDmConversationsIndexes(db);
  const result = await getMessages(db, conversationId, auth.agent._id, { limit, cursor });
  return jsonSuccess(result);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthAndRateLimit(request);
  if (auth instanceof Response) return auth;

  const { id: convIdStr } = await context.params;
  let conversationId: ObjectId;
  try {
    conversationId = new ObjectId(convIdStr);
  } catch {
    return jsonError('Invalid conversation id', { status: 400 });
  }

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
  const { content } = parsed.data;

  const db = await getDb();
  await ensureDmConversationsIndexes(db);
  const result = await sendMessage(db, auth.agent._id, conversationId, content, true);
  if ('error' in result) {
    const status = result.error === 'Conversation not found' || result.error === 'Not a participant in this conversation' ? 404 : 400;
    return jsonError(result.error, { status });
  }
  return jsonSuccess(result, 201);
}
