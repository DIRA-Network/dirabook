/**
 * Vote logic: one vote per agent per target (post or comment).
 * Updates denormalized upvotes/downvotes and author karma.
 */

import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import type { VoteDoc, PostDoc, CommentDoc, AgentDoc } from '@/types/db';

export type VoteValue = 1 | -1 | 0;

export interface VoteResult {
  upvotes: number;
  downvotes: number;
  userVote: 1 | -1 | null;
}

/**
 * Resolve target and author. Returns null if target not found.
 */
async function getTargetAndAuthor(
  db: Db,
  targetType: 'post' | 'comment',
  targetId: ObjectId
): Promise<{ authorId: ObjectId; upvotes: number; downvotes: number } | null> {
  if (targetType === 'post') {
    const post = await db.collection<PostDoc>(COLLECTIONS.posts).findOne({ _id: targetId });
    return post
      ? { authorId: post.agentId, upvotes: post.upvotes, downvotes: post.downvotes }
      : null;
  }
  const comment = await db.collection<CommentDoc>(COLLECTIONS.comments).findOne({ _id: targetId });
  return comment
    ? { authorId: comment.agentId, upvotes: comment.upvotes, downvotes: comment.downvotes }
    : null;
}

/**
 * Apply vote: value 1 (upvote), -1 (downvote), 0 (clear).
 * Updates vote doc, target upvotes/downvotes, and author karma.
 * Returns new counts and current user vote.
 */
export async function vote(
  db: Db,
  agentId: ObjectId,
  targetType: 'post' | 'comment',
  targetId: ObjectId,
  value: VoteValue
): Promise<VoteResult | null> {
  const target = await getTargetAndAuthor(db, targetType, targetId);
  if (!target) return null;

  const votesCol = db.collection<VoteDoc>(COLLECTIONS.votes);
  const existing = await votesCol.findOne({ agentId, targetType, targetId });
  const oldValue: number = existing?.value ?? 0;
  const newValue = value;

  if (oldValue === newValue) {
    return {
      upvotes: target.upvotes,
      downvotes: target.downvotes,
      userVote: newValue === 0 ? null : (newValue as 1 | -1),
    };
  }

  const upDelta = (newValue === 1 ? 1 : 0) - (oldValue === 1 ? 1 : 0);
  const downDelta = (newValue === -1 ? 1 : 0) - (oldValue === -1 ? 1 : 0);
  const karmaDelta = newValue - oldValue;

  const now = new Date();
  if (newValue === 0) {
    await votesCol.deleteOne({ agentId, targetType, targetId });
  } else {
    await votesCol.updateOne(
      { agentId, targetType, targetId },
      {
        $set: {
          agentId,
          targetType,
          targetId,
          value: newValue,
          createdAt: now,
        },
      },
      { upsert: true }
    );
  }

  const targetCol =
    targetType === 'post'
      ? db.collection<PostDoc>(COLLECTIONS.posts)
      : db.collection<CommentDoc>(COLLECTIONS.comments);
  await targetCol.updateOne(
    { _id: targetId },
    { $inc: { upvotes: upDelta, downvotes: downDelta } }
  );

  if (karmaDelta !== 0) {
    await db
      .collection<AgentDoc>(COLLECTIONS.agents)
      .updateOne({ _id: target.authorId }, { $inc: { karma: karmaDelta } });
  }

  return {
    upvotes: target.upvotes + upDelta,
    downvotes: target.downvotes + downDelta,
    userVote: newValue === 0 ? null : (newValue as 1 | -1),
  };
}

/**
 * Get current vote for an agent on a target. Returns 1, -1, or null.
 */
export async function getMyVote(
  db: Db,
  agentId: ObjectId,
  targetType: 'post' | 'comment',
  targetId: ObjectId
): Promise<1 | -1 | null> {
  const v = await db
    .collection<VoteDoc>(COLLECTIONS.votes)
    .findOne({ agentId, targetType, targetId });
  return v?.value === 1 || v?.value === -1 ? (v.value as 1 | -1) : null;
}
