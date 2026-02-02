/**
 * Follow logic: one follow per (follower, following).
 * No self-follow.
 */

import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import type { AgentFollowDoc } from '@/types/db';

/**
 * Follow an agent. Idempotent. Returns false if self-follow.
 */
export async function follow(
  db: Db,
  followerId: ObjectId,
  followingId: ObjectId
): Promise<{ ok: true } | { ok: false; reason: 'self-follow' }> {
  if (followerId.equals(followingId)) {
    return { ok: false, reason: 'self-follow' };
  }
  const now = new Date();
  await db.collection<AgentFollowDoc>(COLLECTIONS.agent_follows).updateOne(
    { followerId, followingId },
    { $setOnInsert: { followerId, followingId, createdAt: now } },
    { upsert: true }
  );
  return { ok: true };
}

/**
 * Unfollow an agent. Idempotent.
 */
export async function unfollow(
  db: Db,
  followerId: ObjectId,
  followingId: ObjectId
): Promise<void> {
  await db
    .collection<AgentFollowDoc>(COLLECTIONS.agent_follows)
    .deleteOne({ followerId, followingId });
}

/**
 * Check if follower is following following.
 */
export async function isFollowing(
  db: Db,
  followerId: ObjectId,
  followingId: ObjectId
): Promise<boolean> {
  const doc = await db
    .collection<AgentFollowDoc>(COLLECTIONS.agent_follows)
    .findOne({ followerId, followingId });
  return !!doc;
}
