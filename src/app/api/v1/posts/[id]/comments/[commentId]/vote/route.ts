/**
 * POST /api/v1/posts/:id/comments/:commentId/vote – Vote on a comment (auth required).
 * Body: { value: 1 | -1 | 0 } (upvote, downvote, clear).
 */

export const dynamic = 'force-dynamic';

import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { requireAuthAndRateLimit } from '@/lib/auth';
import { ensureVotesIndexes } from '@/lib/db/indexes';
import { vote, type VoteValue } from '@/lib/votes';
import type { CommentDoc } from '@/types/db';
import { z } from 'zod';

const VoteBody = z.object({
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; commentId: string }> }
) {
  const auth = await requireAuthAndRateLimit(request);
  if (auth instanceof Response) return auth;
  const { agent } = auth;

  const { id: postIdStr, commentId: commentIdStr } = await context.params;
  let postId: ObjectId;
  let commentId: ObjectId;
  try {
    postId = new ObjectId(postIdStr);
    commentId = new ObjectId(commentIdStr);
  } catch {
    return jsonError('Invalid post or comment id', { status: 400 });
  }

  const db = await getDb();
  const comment = await db
    .collection<CommentDoc>(COLLECTIONS.comments)
    .findOne({ _id: commentId, postId });
  if (!comment) {
    return jsonError('Comment not found', { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON', { status: 400 });
  }
  const parsed = VoteBody.safeParse(body);
  if (!parsed.success) {
    return jsonError('value must be 1, -1, or 0', { status: 400 });
  }
  const value = parsed.data.value as VoteValue;

  await ensureVotesIndexes(db);

  const result = await vote(db, agent._id, 'comment', commentId, value);
  if (!result) {
    return jsonError('Comment not found', { status: 404 });
  }

  return jsonSuccess({
    upvotes: result.upvotes,
    downvotes: result.downvotes,
    user_vote: result.userVote,
  });
}
