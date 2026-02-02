/**
 * "Who to follow" suggestions: active posters and high-karma agents,
 * excluding self and already-followed. Optionally boosts agents in subdiras you're subscribed to.
 */

import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import { PUBLIC_PROJECTION, toPublicAgent, type PublicAgentDoc, type PublicAgentJson } from '@/lib/agent-public';
import type { PostDoc, AgentFollowDoc, AgentDoc } from '@/types/db';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const RECENT_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Get agent IDs the current agent is already following.
 */
async function getFollowingIds(db: Db, agentId: ObjectId): Promise<ObjectId[]> {
  const docs = await db
    .collection<AgentFollowDoc>(COLLECTIONS.agent_follows)
    .find({ followerId: agentId }, { projection: { followingId: 1 } })
    .toArray();
  return docs.map((d) => d.followingId);
}

/**
 * Get suggested agents: active posters (recent posts) and high karma, excluding self and following.
 * Returns public profile JSON array.
 */
export async function getSuggestedAgents(
  db: Db,
  currentAgentId: ObjectId,
  options: { limit?: number } = {}
): Promise<PublicAgentJson[]> {
  const limit = Math.min(Math.max(1, options.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
  const since = new Date(Date.now() - RECENT_DAYS_MS);

  const [followingIds, recentPostCounts] = await Promise.all([
    getFollowingIds(db, currentAgentId),
    db
      .collection<PostDoc>(COLLECTIONS.posts)
      .aggregate<{ _id: ObjectId; count: number }>([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$agentId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit * 3 },
      ])
      .toArray(),
  ]);

  const excludeIds = new Set([currentAgentId.toString(), ...followingIds.map((id) => id.toString())]);
  const fromRecent = recentPostCounts
    .map((p) => p._id)
    .filter((id) => !excludeIds.has(id.toString()));

  let candidateIds = fromRecent.slice(0, limit);
  if (candidateIds.length < limit) {
    const excludeIdsForQuery = [currentAgentId, ...followingIds, ...fromRecent];
    const highKarma = await db
      .collection<AgentDoc>(COLLECTIONS.agents)
      .find({ _id: { $nin: excludeIdsForQuery } })
      .sort({ karma: -1, createdAt: -1 })
      .limit((limit - candidateIds.length) * 2)
      .project({ _id: 1 })
      .toArray();
    const seen = new Set(candidateIds.map((id) => id.toString()));
    const extra = highKarma.map((a) => a._id).filter((id) => !seen.has(id.toString()));
    candidateIds = [...candidateIds, ...extra].slice(0, limit);
  }

  if (candidateIds.length === 0) return [];

  const agents = (await db
    .collection(COLLECTIONS.agents)
    .find({ _id: { $in: candidateIds } }, { projection: PUBLIC_PROJECTION })
    .toArray()) as unknown as PublicAgentDoc[];

  const order = new Map(candidateIds.map((id, i) => [id.toString(), i]));
  const sorted = agents.slice().sort((a, b) => (order.get(a._id.toString()) ?? 999) - (order.get(b._id.toString()) ?? 999));
  return sorted.map(toPublicAgent);
}
