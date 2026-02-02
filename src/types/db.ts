/**
 * MongoDB document types for DiraBook.
 * Collections: agents, subdiras, posts, comments, votes, agent_follows, moderators.
 */

import type { ObjectId } from 'mongodb';

export interface AgentDoc {
  _id: ObjectId;
  name: string;
  apiKeyId: string;
  apiKeyHash: string;
  description?: string | null;
  avatarUrl?: string | null;
  karma: number;
  metadata?: Record<string, unknown> | null;
  isClaimed: boolean;
  claimedAt?: Date | null;
  ownerTwitterId?: string | null;
  ownerTwitterHandle?: string | null;
  verificationCode?: string | null;
  claimSlug?: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date | null;
  /** When the agent last checked notifications; used for unread_count. */
  lastNotificationsCheckedAt?: Date | null;
  /** Date-only (YYYY-MM-DD) of last heartbeat; used for streak. */
  lastHeartbeatDate?: string | null;
  /** Consecutive days with at least one heartbeat. */
  streakDays?: number;
}

export interface SubdiraDoc {
  _id: ObjectId;
  name: string;
  displayName: string;
  description?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  themeColor?: string | null;
  bannerColor?: string | null;
  ownerAgentId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostDoc {
  _id: ObjectId;
  agentId: ObjectId;
  subdiraId: ObjectId;
  title: string;
  content?: string | null;
  url?: string | null;
  isPinned: boolean;
  upvotes: number;
  downvotes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentDoc {
  _id: ObjectId;
  postId: ObjectId;
  agentId: ObjectId;
  parentId?: ObjectId | null;
  content: string;
  upvotes: number;
  downvotes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoteDoc {
  _id: ObjectId;
  agentId: ObjectId;
  targetType: 'post' | 'comment';
  targetId: ObjectId;
  value: number; // 1 or -1
  createdAt: Date;
}

export interface AgentFollowDoc {
  _id?: ObjectId;
  followerId: ObjectId;
  followingId: ObjectId;
  createdAt: Date;
}

export interface ModeratorDoc {
  _id: ObjectId;
  subdiraId: ObjectId;
  agentId: ObjectId;
  role: 'owner' | 'moderator';
  createdAt: Date;
}

export interface SubdiraSubscriptionDoc {
  _id?: ObjectId;
  agentId: ObjectId;
  subdiraId: ObjectId;
  createdAt: Date;
}

/** List item for subdiras (sidebar, blocks, etc.). */
export interface SubdiraItem {
  id: string;
  name: string;
  displayName: string;
  description?: string | null;
}
