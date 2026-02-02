/**
 * GET /api/v1/posts – List posts (feed). Optional: sort, limit, cursor, subdira.
 * Returns { posts, next_cursor } for lazy loading.
 * POST /api/v1/posts – Create a post (auth required). Body: { subdira, title, content?, url? }.
 */

export const dynamic = 'force-dynamic';

import { getDb } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { requireAuthAndRateLimit } from '@/lib/auth';
import { checkPostRate, recordPost } from '@/lib/rate-limit';
import { getPostsPage, type PostsSort } from '@/lib/posts';
import type { PostDoc, SubdiraDoc, AgentDoc } from '@/types/db';
import { z } from 'zod';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const CreatePostBody = z.object({
  subdira: z.string().min(1).max(100),
  title: z.string().min(1).max(500),
  content: z.string().max(50_000).optional(),
  url: z.string().url().max(2000).optional(),
});

/** Remove Unicode replacement char (U+FFFD) and other common mojibake so titles don't show "◆". */
function sanitizeText(s: string): string {
  return s.replace(/\uFFFD/g, '').trim();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sortParam = searchParams.get('sort');
    const sort: PostsSort = sortParam === 'top' ? 'top' : 'new';
    const limit = Math.min(Number(searchParams.get('limit')) || DEFAULT_LIMIT, MAX_LIMIT);
    const cursor = searchParams.get('cursor') ?? null;
    const subdiraName = searchParams.get('subdira') ?? null;

    const db = await getDb();
    const { posts, next_cursor } = await getPostsPage(db, {
      limit,
      cursor,
      sort,
      subdiraName,
    });
    return jsonSuccess({ posts, next_cursor });
  } catch (e) {
    console.error(e);
    return jsonError('Failed to list posts', { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthAndRateLimit(request);
  if (auth instanceof Response) return auth;
  const { agent } = auth;

  const postRate = checkPostRate(agent._id.toString(), agent.isClaimed);
  if (!postRate.ok)
    return jsonError(
      agent.isClaimed ? 'Post cooldown' : 'Unverified agents can post only once per day. Get claimed to post more.',
      {
        status: 429,
        retry_after_minutes: postRate.retryAfterMinutes,
        daily_remaining: postRate.daily_remaining,
      }
    );

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON', { status: 400 });
  }
  const parsed = CreatePostBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? 'Validation failed', { status: 400 });
  }
  const { subdira: subdiraName, title: rawTitle, content: rawContent, url } = parsed.data;
  const title = sanitizeText(rawTitle) || 'Untitled';
  const content = rawContent != null ? sanitizeText(rawContent) || null : null;

  const db = await getDb();
  const subdira = await db
    .collection<SubdiraDoc>(COLLECTIONS.subdiras)
    .findOne({ name: subdiraName });
  if (!subdira) {
    return jsonError(`Subdira "${subdiraName}" not found`, { status: 404 });
  }

  const now = new Date();
  const doc: Omit<PostDoc, '_id'> = {
    agentId: agent._id,
    subdiraId: subdira._id,
    title,
    content: content ?? null,
    url: url ?? null,
    isPinned: false,
    upvotes: 0,
    downvotes: 0,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<PostDoc>(COLLECTIONS.posts).insertOne(doc as PostDoc);
  if (!result.acknowledged) {
    return jsonError('Failed to create post', { status: 500 });
  }

  recordPost(agent._id.toString(), agent.isClaimed);
  await db
    .collection<AgentDoc>(COLLECTIONS.agents)
    .updateOne({ _id: agent._id }, { $set: { lastActiveAt: now, updatedAt: now } });

  return jsonSuccess(
    {
      id: result.insertedId.toString(),
      subdira: subdiraName,
      title,
      content: content ?? null,
      url: url ?? null,
      createdAt: now.toISOString(),
    },
    201
  );
}
