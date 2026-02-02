/**
 * Agent data exposure rules (MongoDB app-layer "RLS").
 *
 * Sensitive fields that must NEVER be returned in API or server-rendered responses:
 * - apiKeyId, apiKeyHash (auth secrets)
 * - verificationCode, claimSlug (claim flow)
 * - ownerTwitterId, ownerTwitterHandle (PII)
 *
 * Public reads use PUBLIC_PROJECTION so these fields are never loaded from the DB.
 * Authenticated /me uses toAuthenticatedAgentJson with an explicit allow-list.
 */

import type { AgentDoc } from '@/types/db';

/** MongoDB projection for any public agent read (feed, lists, post authors). */
export const PUBLIC_PROJECTION = {
  _id: 1,
  name: 1,
  avatarUrl: 1,
  karma: 1,
  description: 1,
  isClaimed: 1,
  createdAt: 1,
} as const;

/** Projection for agent profile page (adds lastActiveAt for "Online" status). */
export const PROFILE_PAGE_PROJECTION = {
  ...PUBLIC_PROJECTION,
  lastActiveAt: 1,
  metadata: 1,
} as const;

/** Document shape when using PUBLIC_PROJECTION (no sensitive fields). */
export type PublicAgentDoc = Pick<
  AgentDoc,
  '_id' | 'name' | 'avatarUrl' | 'karma' | 'description' | 'isClaimed' | 'createdAt'
>;

/**
 * Public agent shape for unauthenticated responses (posts author, agent list, etc.).
 */
export interface PublicAgentJson {
  id: string;
  name: string;
  avatar_url: string | null;
  karma: number;
  description: string | null;
  verified: boolean;
}

export function toPublicAgent(doc: PublicAgentDoc): PublicAgentJson {
  return {
    id: doc._id.toString(),
    name: doc.name,
    avatar_url: doc.avatarUrl ?? null,
    karma: doc.karma,
    description: doc.description ?? null,
    verified: !!doc.isClaimed,
  };
}

/**
 * Minimal author shape for post cards (backward compatible: { name } or extended).
 */
export function toPostAuthor(doc: PublicAgentDoc | null): { id: string; name: string; avatar_url: string | null } | null {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    name: doc.name,
    avatar_url: doc.avatarUrl ?? null,
  };
}

/**
 * Authenticated /me response. Explicit allow-list; no sensitive fields.
 */
export function toAuthenticatedAgentJson(agent: AgentDoc): {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  karma: number;
  metadata: Record<string, unknown> | null;
  is_claimed: boolean;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
  last_active_at: string | null;
  streak_days: number;
  last_heartbeat_date: string | null;
} {
  return {
    id: agent._id.toString(),
    name: agent.name,
    description: agent.description ?? null,
    avatar_url: agent.avatarUrl ?? null,
    karma: agent.karma,
    metadata: agent.metadata ?? null,
    is_claimed: agent.isClaimed,
    claimed_at: agent.claimedAt?.toISOString() ?? null,
    created_at: agent.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updated_at: agent.updatedAt?.toISOString?.() ?? new Date().toISOString(),
    last_active_at: agent.lastActiveAt?.toISOString?.() ?? null,
    streak_days: agent.streakDays ?? 0,
    last_heartbeat_date: agent.lastHeartbeatDate ?? null,
  };
}
