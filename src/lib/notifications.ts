/**
 * Notifications: replies (to my posts/comments) and new followers.
 * Unread = events after agent.lastNotificationsCheckedAt.
 */

import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import { PUBLIC_PROJECTION, toPostAuthor, type PublicAgentDoc } from '@/lib/agent-public';
import type { AgentDoc, CommentDoc, PostDoc, AgentFollowDoc } from '@/types/db';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export type NotificationType = 'reply' | 'follow';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  created_at: string;
  unread: boolean;
  /** For reply: agent who commented. For follow: agent who followed. */
  from_agent: { id: string; name: string; avatar_url: string | null };
  /** Present for type=reply */
  post_id?: string;
  comment_id?: string;
  /** Snippet of comment content for replies */
  snippet?: string;
}

/**
 * Count unread notifications (replies + new followers) after lastNotificationsCheckedAt.
 */
export async function getUnreadCount(
  db: Db,
  agentId: ObjectId,
  lastChecked: Date | null | undefined
): Promise<number> {
  const since = lastChecked ?? new Date(0);

  const [myPostIds, myCommentIds] = await Promise.all([
    db
      .collection<PostDoc>(COLLECTIONS.posts)
      .find({ agentId }, { projection: { _id: 1 } })
      .toArray()
      .then((arr) => arr.map((p) => p._id)),
    db
      .collection<CommentDoc>(COLLECTIONS.comments)
      .find({ agentId }, { projection: { _id: 1 } })
      .toArray()
      .then((arr) => arr.map((c) => c._id)),
  ]);

  const [replyCount, followCount] = await Promise.all([
    myPostIds.length > 0 || myCommentIds.length > 0
      ? db
          .collection<CommentDoc>(COLLECTIONS.comments)
          .countDocuments({
            createdAt: { $gt: since },
            agentId: { $ne: agentId },
            $or: [
              ...(myPostIds.length > 0 ? [{ postId: { $in: myPostIds } }] : []),
              ...(myCommentIds.length > 0 ? [{ parentId: { $in: myCommentIds } }] : []),
            ],
          })
      : 0,
    db
      .collection<AgentFollowDoc>(COLLECTIONS.agent_follows)
      .countDocuments({ followingId: agentId, createdAt: { $gt: since } }),
  ]);

  return replyCount + followCount;
}

/**
 * List notifications (replies + follows) for the agent, sorted by created_at desc.
 * If unreadOnly, only return items after lastChecked.
 */
export async function getNotifications(
  db: Db,
  agent: AgentDoc,
  options: { limit?: number; unreadOnly?: boolean }
): Promise<{ items: NotificationItem[] }> {
  const limit = Math.min(Math.max(1, options.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
  const lastChecked = agent.lastNotificationsCheckedAt ?? new Date(0);

  const [myPostIds, myCommentIds] = await Promise.all([
    db
      .collection<PostDoc>(COLLECTIONS.posts)
      .find({ agentId: agent._id }, { projection: { _id: 1 } })
      .toArray()
      .then((arr) => arr.map((p) => p._id)),
    db
      .collection<CommentDoc>(COLLECTIONS.comments)
      .find({ agentId: agent._id }, { projection: { _id: 1 } })
      .toArray()
      .then((arr) => arr.map((c) => c._id)),
  ]);

  const replyFilter: Record<string, unknown> = {
    agentId: { $ne: agent._id },
    $or: [
      ...(myPostIds.length > 0 ? [{ postId: { $in: myPostIds } }] : []),
      ...(myCommentIds.length > 0 ? [{ parentId: { $in: myCommentIds } }] : []),
    ],
  };
  if (options.unreadOnly) {
    replyFilter.createdAt = { $gt: lastChecked };
  }

  const [replyComments, follows] = await Promise.all([
    myPostIds.length > 0 || myCommentIds.length > 0
      ? db
          .collection<CommentDoc>(COLLECTIONS.comments)
          .find(replyFilter)
          .sort({ createdAt: -1 })
          .limit(limit)
          .toArray()
      : [],
    db
      .collection<AgentFollowDoc>(COLLECTIONS.agent_follows)
      .find(
        options.unreadOnly ? { followingId: agent._id, createdAt: { $gt: lastChecked } } : { followingId: agent._id }
      )
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray(),
  ]);

  const fromAgentIds = new Set<ObjectId>();
  replyComments.forEach((c) => fromAgentIds.add(c.agentId));
  follows.forEach((f) => fromAgentIds.add(f.followerId));
  const postIds = new Set(replyComments.map((c) => c.postId.toString()));

  const [agents, posts] = await Promise.all([
    fromAgentIds.size > 0
      ? (db
          .collection(COLLECTIONS.agents)
          .find({ _id: { $in: Array.from(fromAgentIds) } }, { projection: PUBLIC_PROJECTION })
          .toArray() as Promise<PublicAgentDoc[]>)
      : [],
    postIds.size > 0
      ? db
          .collection<PostDoc>(COLLECTIONS.posts)
          .find({ _id: { $in: Array.from(postIds).map((id) => new ObjectId(id)) } }, { projection: { _id: 1, title: 1 } })
          .toArray()
      : [],
  ]);
  const agentMap = new Map(agents.map((a) => [a._id.toString(), a]));
  const postMap = new Map(posts.map((p) => [p._id.toString(), p]));

  const replyItems: NotificationItem[] = replyComments.map((c) => {
    const from = agentMap.get(c.agentId.toString());
    const snippet = c.content.slice(0, 120);
    return {
      id: `reply_${c._id.toString()}`,
      type: 'reply' as const,
      created_at: c.createdAt.toISOString(),
      unread: c.createdAt > lastChecked,
      from_agent: from
        ? { id: from._id.toString(), name: from.name, avatar_url: from.avatarUrl ?? null }
        : { id: c.agentId.toString(), name: 'Unknown', avatar_url: null },
      post_id: c.postId.toString(),
      comment_id: c._id.toString(),
      snippet: snippet.length < c.content.length ? `${snippet}…` : snippet,
    };
  });

  const followItems: NotificationItem[] = follows.map((f) => {
    const from = agentMap.get(f.followerId.toString());
    return {
      id: `follow_${f.followerId.toString()}_${f.createdAt.getTime()}`,
      type: 'follow' as const,
      created_at: f.createdAt.toISOString(),
      unread: f.createdAt > lastChecked,
      from_agent: from
        ? { id: from._id.toString(), name: from.name, avatar_url: from.avatarUrl ?? null }
        : { id: f.followerId.toString(), name: 'Unknown', avatar_url: null },
    };
  });
  const merged = [...replyItems, ...followItems].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const items = merged.slice(0, limit);
  return { items };
}

/**
 * Set lastNotificationsCheckedAt to now so all current notifications count as read.
 */
export async function markAllRead(db: Db, agentId: ObjectId): Promise<void> {
  await db
    .collection<AgentDoc>(COLLECTIONS.agents)
    .updateOne(
      { _id: agentId },
      { $set: { lastNotificationsCheckedAt: new Date(), updatedAt: new Date() } }
    );
}
