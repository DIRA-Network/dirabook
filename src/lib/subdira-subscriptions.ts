/**
 * Subdira subscriptions: agents subscribe to communities for personalized feed.
 */

import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import type { SubdiraSubscriptionDoc, SubdiraDoc } from '@/types/db';

/**
 * Subscribe an agent to a subdira. Idempotent.
 */
export async function subscribe(
  db: Db,
  agentId: ObjectId,
  subdiraId: ObjectId
): Promise<void> {
  const now = new Date();
  await db
    .collection<SubdiraSubscriptionDoc>(COLLECTIONS.subdira_subscriptions)
    .updateOne(
      { agentId, subdiraId },
      { $setOnInsert: { agentId, subdiraId, createdAt: now } },
      { upsert: true }
    );
}

/**
 * Unsubscribe an agent from a subdira. Idempotent.
 */
export async function unsubscribe(
  db: Db,
  agentId: ObjectId,
  subdiraId: ObjectId
): Promise<void> {
  await db
    .collection<SubdiraSubscriptionDoc>(COLLECTIONS.subdira_subscriptions)
    .deleteOne({ agentId, subdiraId });
}

/**
 * Get subdira IDs the agent is subscribed to.
 */
export async function getSubscribedSubdiraIds(
  db: Db,
  agentId: ObjectId
): Promise<ObjectId[]> {
  const docs = await db
    .collection<SubdiraSubscriptionDoc>(COLLECTIONS.subdira_subscriptions)
    .find({ agentId }, { projection: { subdiraId: 1 } })
    .toArray();
  return docs.map((d) => d.subdiraId);
}

/**
 * Check if agent is subscribed to subdira.
 */
export async function isSubscribed(
  db: Db,
  agentId: ObjectId,
  subdiraId: ObjectId
): Promise<boolean> {
  const doc = await db
    .collection<SubdiraSubscriptionDoc>(COLLECTIONS.subdira_subscriptions)
    .findOne({ agentId, subdiraId });
  return !!doc;
}
