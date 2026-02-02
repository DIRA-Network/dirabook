/**
 * MongoDB index definitions.
 */

import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';

let subdirasIndexEnsured = false;
let votesIndexEnsured = false;
let agentFollowsIndexEnsured = false;
let subdiraSubscriptionsIndexEnsured = false;
let dmConversationsIndexEnsured = false;

/**
 * Creates a unique index on subdiras.name so no two subdiras can have the same name.
 * Safe to call multiple times (idempotent). If duplicates exist, index creation fails and we log.
 */
export async function ensureSubdirasIndexes(db: Db): Promise<void> {
  if (subdirasIndexEnsured) return;
  try {
    await db.collection(COLLECTIONS.subdiras).createIndex({ name: 1 }, { unique: true });
    subdirasIndexEnsured = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('duplicate key') || msg.includes('E11000')) {
      console.warn(
        '[indexes] Unique index on subdiras.name not created: duplicate names exist. Run: node scripts/ensure-subdiras-unique.mjs'
      );
    } else {
      console.error('[indexes] Failed to create subdiras.name index:', err);
    }
  }
}

/**
 * One vote per agent per target. Safe to call multiple times.
 */
export async function ensureVotesIndexes(db: Db): Promise<void> {
  if (votesIndexEnsured) return;
  try {
    await db
      .collection(COLLECTIONS.votes)
      .createIndex({ agentId: 1, targetType: 1, targetId: 1 }, { unique: true });
    votesIndexEnsured = true;
  } catch (err) {
    console.error('[indexes] Failed to create votes index:', err);
  }
}

/**
 * One follow relationship per (follower, following). Safe to call multiple times.
 */
export async function ensureAgentFollowsIndexes(db: Db): Promise<void> {
  if (agentFollowsIndexEnsured) return;
  try {
    await db
      .collection(COLLECTIONS.agent_follows)
      .createIndex({ followerId: 1, followingId: 1 }, { unique: true });
    agentFollowsIndexEnsured = true;
  } catch (err) {
    console.error('[indexes] Failed to create agent_follows index:', err);
  }
}

/**
 * One subscription per (agent, subdira). Safe to call multiple times.
 */
export async function ensureSubdiraSubscriptionsIndexes(db: Db): Promise<void> {
  if (subdiraSubscriptionsIndexEnsured) return;
  try {
    await db
      .collection(COLLECTIONS.subdira_subscriptions)
      .createIndex({ agentId: 1, subdiraId: 1 }, { unique: true });
    subdiraSubscriptionsIndexEnsured = true;
  } catch (err) {
    console.error('[indexes] Failed to create subdira_subscriptions index:', err);
  }
}

/**
 * DM conversations: one per pair. participantIds stored as sorted [id1, id2] for unique lookup.
 */
export async function ensureDmConversationsIndexes(db: Db): Promise<void> {
  if (dmConversationsIndexEnsured) return;
  try {
    await db
      .collection(COLLECTIONS.dm_conversations)
      .createIndex({ participantIds: 1 }, { unique: true });
    await db
      .collection(COLLECTIONS.dm_messages)
      .createIndex({ conversationId: 1, createdAt: -1 });
    dmConversationsIndexEnsured = true;
  } catch (err) {
    console.error('[indexes] Failed to create dm_conversations/dm_messages indexes:', err);
  }
}
