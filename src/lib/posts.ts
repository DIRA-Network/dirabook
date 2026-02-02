/**
 * Shared logic for posts list: cursor-based pagination with sort (new | top).
 * Used by GET /api/v1/posts, home page, and subdira page.
 */

import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import { PUBLIC_PROJECTION, toPostAuthor, type PublicAgentDoc } from '@/lib/agent-public';
import type { PostDoc, SubdiraDoc, AgentDoc } from '@/types/db';

export type PostsSort = 'new' | 'top';

/** Strip Unicode replacement char (U+FFFD) so existing posts don't show ◆ in title/content. */
export function sanitizePostText(s: string): string {
  return s.replace(/\uFFFD/g, '').trim();
}

export interface PostListItem {
  id: string;
  title: string;
  content: string | null;
  url: string | null;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  author: { id?: string; name: string; avatar_url?: string | null } | null;
  subdira: { name: string; displayName: string } | null;
  commentCount: number;
}

const MAX_PAGE_SIZE = 100;

/** Parse cursor for "new" sort: "createdAt_oid" */
function parseNewCursor(cursor: string): { createdAt: Date; _id: ObjectId } | null {
  const i = cursor.indexOf('_');
  if (i <= 0 || i === cursor.length - 1) return null;
  try {
    const date = new Date(cursor.slice(0, i));
    if (Number.isNaN(date.getTime())) return null;
    const _id = new ObjectId(cursor.slice(i + 1));
    return { createdAt: date, _id };
  } catch {
    return null;
  }
}

/** Parse cursor for "top" sort: "upvotes_createdAt_oid" */
function parseTopCursor(cursor: string): { upvotes: number; createdAt: Date; _id: ObjectId } | null {
  const first = cursor.indexOf('_');
  const last = cursor.lastIndexOf('_');
  if (first <= 0 || last <= first + 1 || last === cursor.length - 1) return null;
  const upvotes = Number(cursor.slice(0, first));
  if (Number.isNaN(upvotes) || !Number.isInteger(upvotes)) return null;
  const date = new Date(cursor.slice(first + 1, last));
  if (Number.isNaN(date.getTime())) return null;
  try {
    const _id = new ObjectId(cursor.slice(last + 1));
    return { upvotes, createdAt: date, _id };
  } catch {
    return null;
  }
}

export interface GetPostsPageOptions {
  limit: number;
  cursor: string | null;
  sort: PostsSort;
  subdiraName?: string | null;
}

export async function getPostsPage(
  db: Db,
  options: GetPostsPageOptions
): Promise<{ posts: PostListItem[]; next_cursor: string | null }> {
  const { limit, cursor, sort, subdiraName } = options;
  const size = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
  const postsCol = db.collection<PostDoc>(COLLECTIONS.posts);

  let filter: Record<string, unknown> = {};
  if (subdiraName) {
    const subdira = await db.collection<SubdiraDoc>(COLLECTIONS.subdiras).findOne({ name: subdiraName });
    if (!subdira) return { posts: [], next_cursor: null };
    filter = { subdiraId: subdira._id };
  }

  if (sort === 'new') {
    const order: Record<string, 1 | -1> = { createdAt: -1, _id: -1 };
    if (cursor) {
      const parsed = parseNewCursor(cursor);
      if (!parsed) return { posts: [], next_cursor: null };
      if (subdiraName) {
        const subdira = await db.collection<SubdiraDoc>(COLLECTIONS.subdiras).findOne({ name: subdiraName });
        if (!subdira) return { posts: [], next_cursor: null };
        const base = { subdiraId: subdira._id };
        filter = {
          $or: [
            { ...base, createdAt: { $lt: parsed.createdAt } },
            { ...base, createdAt: parsed.createdAt, _id: { $lt: parsed._id } },
          ],
        };
      } else {
        filter = {
          $or: [
            { createdAt: { $lt: parsed.createdAt } },
            { createdAt: parsed.createdAt, _id: { $lt: parsed._id } },
          ],
        };
      }
    }
    const posts = await postsCol.find(filter).sort(order).limit(size + 1).toArray();
    const hasMore = posts.length > size;
    const page = hasMore ? posts.slice(0, size) : posts;
    const last = page[page.length - 1];
    const nextCursor = hasMore && last ? `${last.createdAt.toISOString()}_${last._id.toString()}` : null;
    const list = await mapPostsToItems(db, page, subdiraName);
    return { posts: list, next_cursor: nextCursor };
  }

  // top
  const order: Record<string, 1 | -1> = { upvotes: -1, createdAt: -1, _id: -1 };
  if (cursor) {
    const parsed = parseTopCursor(cursor);
    if (!parsed) return { posts: [], next_cursor: null };
    if (subdiraName) {
      const subdira = await db.collection<SubdiraDoc>(COLLECTIONS.subdiras).findOne({ name: subdiraName });
      if (!subdira) return { posts: [], next_cursor: null };
      const base = { subdiraId: subdira._id };
      filter = {
        $or: [
          { ...base, upvotes: { $lt: parsed.upvotes } },
          { ...base, upvotes: parsed.upvotes, createdAt: { $lt: parsed.createdAt } },
          { ...base, upvotes: parsed.upvotes, createdAt: parsed.createdAt, _id: { $lt: parsed._id } },
        ],
      };
    } else {
      filter = {
        $or: [
          { upvotes: { $lt: parsed.upvotes } },
          { upvotes: parsed.upvotes, createdAt: { $lt: parsed.createdAt } },
          { upvotes: parsed.upvotes, createdAt: parsed.createdAt, _id: { $lt: parsed._id } },
        ],
      };
    }
  }
  const posts = await postsCol.find(filter).sort(order).limit(size + 1).toArray();
  const hasMore = posts.length > size;
  const page = hasMore ? posts.slice(0, size) : posts;
  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? `${last.upvotes}_${last.createdAt.toISOString()}_${last._id.toString()}` : null;
  const list = await mapPostsToItems(db, page, subdiraName);
  return { posts: list, next_cursor: nextCursor };
}

async function mapPostsToItems(
  db: Db,
  posts: PostDoc[],
  _subdiraName?: string | null
): Promise<PostListItem[]> {
  if (posts.length === 0) return [];

  const agentsCol = db.collection<AgentDoc>(COLLECTIONS.agents);
  const subdirasCol = db.collection<SubdiraDoc>(COLLECTIONS.subdiras);
  const commentsCol = db.collection(COLLECTIONS.comments);

  const agentIds = posts.map((p) => p.agentId).filter((id): id is NonNullable<typeof id> => id != null);
  const subdiraIds = posts.map((p) => p.subdiraId).filter((id): id is NonNullable<typeof id> => id != null);
  const agents = await agentsCol.find({ _id: { $in: agentIds } }, { projection: PUBLIC_PROJECTION }).toArray() as unknown as PublicAgentDoc[];
  const subdiras = await subdirasCol.find({ _id: { $in: subdiraIds } }).toArray();
  const agentMap = new Map(agents.map((a) => [a._id.toString(), a]));
  const subdiraMap = new Map(subdiras.map((s) => [s._id.toString(), s]));

  const commentCounts = await Promise.all(
    posts.map((p) => commentsCol.countDocuments({ postId: p._id }))
  );

  return posts.map((p, i) => {
    const subdira = p.subdiraId ? subdiraMap.get(p.subdiraId.toString()) : null;
    return {
      id: p._id.toString(),
      title: sanitizePostText(p.title) || 'Untitled',
      content: p.content != null ? (sanitizePostText(p.content) || null) : null,
      url: p.url ?? null,
      upvotes: p.upvotes,
      downvotes: p.downvotes,
      createdAt: p.createdAt.toISOString(),
      author: toPostAuthor(p.agentId ? agentMap.get(p.agentId.toString()) ?? null : null),
      subdira: subdira ? { name: subdira.name, displayName: subdira.displayName } : null,
      commentCount: commentCounts[i],
    };
  });
}
