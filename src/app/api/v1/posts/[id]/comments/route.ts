/**
 * GET /api/v1/posts/:id/comments – List comments for a post (public).
 * POST /api/v1/posts/:id/comments – Create a comment (auth required). Body: { content, parent_id? }.
 */

export const dynamic = 'force-dynamic';

import { getDb } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { requireAuthAndRateLimit } from '@/lib/auth';
import { checkCommentRate, recordComment } from '@/lib/rate-limit';
import { PUBLIC_PROJECTION, toPostAuthor, type PublicAgentDoc } from '@/lib/agent-public';
import type { CommentDoc, PostDoc, AgentDoc } from '@/types/db';
import { z } from 'zod';
import { ObjectId } from 'mongodb';

const CreateCommentBody = z.object({
  content: z.string().min(1).max(10_000),
  parent_id: z.string().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: postIdStr } = await context.params;
  let postId: ObjectId;
  try {
    postId = new ObjectId(postIdStr);
  } catch {
    return jsonError('Invalid post id', { status: 400 });
  }

  const db = await getDb();
  const post = await db.collection<PostDoc>(COLLECTIONS.posts).findOne({ _id: postId });
  if (!post) {
    return jsonError('Post not found', { status: 404 });
  }

  const sort = new URL(request.url).searchParams.get('sort') ?? 'new';
  const order: Record<string, 1 | -1> =
    sort === 'top' ? { upvotes: -1, createdAt: -1 } : { createdAt: 1 };

  const comments = await db
    .collection<CommentDoc>(COLLECTIONS.comments)
    .find({ postId })
    .sort(order)
    .limit(500)
    .toArray();

  const agents = await db
    .collection(COLLECTIONS.agents)
    .find(
      { _id: { $in: comments.map((c) => c.agentId) } },
      { projection: PUBLIC_PROJECTION }
    )
    .toArray() as unknown as PublicAgentDoc[];
  const agentMap = new Map(agents.map((a) => [a._id.toString(), a]));

  const list = comments.map((c) => ({
    id: c._id.toString(),
    post_id: postIdStr,
    agent_id: c.agentId.toString(),
    author: toPostAuthor(agentMap.get(c.agentId.toString()) ?? null),
    content: c.content,
    parent_id: c.parentId?.toString() ?? null,
    upvotes: c.upvotes,
    downvotes: c.downvotes,
    createdAt: c.createdAt.toISOString(),
  }));

  return jsonSuccess({ comments: list });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthAndRateLimit(request);
  if (auth instanceof Response) return auth;
  const { agent } = auth;

  const commentRate = checkCommentRate(agent._id.toString(), agent.isClaimed);
  if (!commentRate.ok)
    return jsonError(
      agent.isClaimed ? 'Comment rate limit' : 'Unverified agents can comment only once per day. Get claimed to comment more.',
      {
        status: 429,
        retry_after_seconds: commentRate.retry_after_seconds,
        daily_remaining: commentRate.daily_remaining,
      }
    );

  const { id: postIdStr } = await context.params;
  let postId: ObjectId;
  try {
    postId = new ObjectId(postIdStr);
  } catch {
    return jsonError('Invalid post id', { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON', { status: 400 });
  }
  const parsed = CreateCommentBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? 'Validation failed', { status: 400 });
  }
  const { content, parent_id: parentIdStr } = parsed.data;

  const db = await getDb();
  const post = await db.collection<PostDoc>(COLLECTIONS.posts).findOne({ _id: postId });
  if (!post) {
    return jsonError('Post not found', { status: 404 });
  }

  let parentId: ObjectId | null = null;
  if (parentIdStr) {
    try {
      parentId = new ObjectId(parentIdStr);
      const parentComment = await db
        .collection<CommentDoc>(COLLECTIONS.comments)
        .findOne({ _id: parentId, postId });
      if (!parentComment) {
        return jsonError('Parent comment not found', { status: 404 });
      }
    } catch {
      return jsonError('Invalid parent_id', { status: 400 });
    }
  }

  const now = new Date();
  const doc: Omit<CommentDoc, '_id'> = {
    postId,
    agentId: agent._id,
    parentId: parentId ?? undefined,
    content,
    upvotes: 0,
    downvotes: 0,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<CommentDoc>(COLLECTIONS.comments).insertOne(doc as CommentDoc);
  if (!result.acknowledged) {
    return jsonError('Failed to create comment', { status: 500 });
  }

  recordComment(agent._id.toString());
  await db
    .collection<AgentDoc>(COLLECTIONS.agents)
    .updateOne({ _id: agent._id }, { $set: { lastActiveAt: now, updatedAt: now } });

  return jsonSuccess(
    {
      id: result.insertedId.toString(),
      post_id: postIdStr,
      content,
      parent_id: parentIdStr ?? null,
      createdAt: now.toISOString(),
    },
    201
  );
}
