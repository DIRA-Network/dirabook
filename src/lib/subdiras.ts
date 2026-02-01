/**
 * Shared logic for subdiras list: pagination + post counts.
 * Used by GET /api/v1/subdiras and the /d page (first page server-side).
 */

import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import type { SubdiraDoc } from '@/types/db';

export interface SubdiraListItem {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  avatarUrl: string | null;
  postCount: number;
  createdAt: string;
}

export async function getSubdirasPage(
  db: Db,
  limit: number,
  cursor: string | null
): Promise<{ subdiras: SubdiraListItem[]; next_cursor: string | null }> {
  const filter: { _id?: { $lt: ObjectId } } = {};
  if (cursor) {
    try {
      filter._id = { $lt: new ObjectId(cursor) };
    } catch {
      return { subdiras: [], next_cursor: null };
    }
  }

  const list = await db
    .collection<SubdiraDoc>(COLLECTIONS.subdiras)
    .find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = list.length > limit;
  const page = hasMore ? list.slice(0, limit) : list;
  const nextCursor = hasMore ? page[page.length - 1]._id.toString() : null;

  const subdiraIds = page.map((s) => s._id);
  const counts = await db
    .collection(COLLECTIONS.posts)
    .aggregate<{ _id: ObjectId; count: number }>([
      { $match: { subdiraId: { $in: subdiraIds } } },
      { $group: { _id: '$subdiraId', count: { $sum: 1 } } },
    ])
    .toArray();
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

  const subdiras: SubdiraListItem[] = page.map((s) => ({
    id: s._id.toString(),
    name: s.name,
    displayName: s.displayName,
    description: s.description ?? null,
    avatarUrl: s.avatarUrl ?? null,
    postCount: countMap.get(s._id.toString()) ?? 0,
    createdAt: s.createdAt.toISOString(),
  }));

  return { subdiras, next_cursor: nextCursor };
}

export async function getCommunitiesStats(db: Db): Promise<{
  communities: number;
  posts: number;
}> {
  const [communities, posts] = await Promise.all([
    db.collection(COLLECTIONS.subdiras).countDocuments(),
    db.collection(COLLECTIONS.posts).countDocuments(),
  ]);
  return { communities, posts };
}
