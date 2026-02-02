/**
 * Direct messaging: conversations (one per pair) and messages.
 * participantIds are stored in sorted order [min, max] for unique lookup.
 */

import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import { PUBLIC_PROJECTION, type PublicAgentDoc } from '@/lib/agent-public';
import type { DmConversationDoc, DmMessageDoc, AgentDoc } from '@/types/db';

const MESSAGE_MAX_LENGTH = 10_000;
const MESSAGES_PAGE_SIZE = 50;

/** Canonical participantIds for a pair: [smallerId, largerId]. */
function canonicalParticipants(a: ObjectId, b: ObjectId): [ObjectId, ObjectId] {
  return a.toString() < b.toString() ? [a, b] : [b, a];
}

/**
 * Find or create a conversation between two agents. Returns conversation id.
 */
export async function findOrCreateConversation(
  db: Db,
  agentId: ObjectId,
  otherAgentId: ObjectId
): Promise<{ conversationId: ObjectId } | { error: string }> {
  if (agentId.equals(otherAgentId)) {
    return { error: 'Cannot start a conversation with yourself' };
  }
  const participants = canonicalParticipants(agentId, otherAgentId);
  const now = new Date();
  const existing = await db
    .collection<DmConversationDoc>(COLLECTIONS.dm_conversations)
    .findOne({ participantIds: participants });
  if (existing) {
    return { conversationId: existing._id };
  }
  const doc: Omit<DmConversationDoc, '_id'> = {
    participantIds: participants,
    createdAt: now,
    updatedAt: now,
  };
  const result = await db
    .collection<DmConversationDoc>(COLLECTIONS.dm_conversations)
    .insertOne(doc as DmConversationDoc);
  if (!result.acknowledged) return { error: 'Failed to create conversation' };
  return { conversationId: result.insertedId };
}

/**
 * List conversations for an agent, most recent first. Returns conversation id, other participant, last message snippet, updatedAt.
 */
export async function listConversations(
  db: Db,
  agentId: ObjectId,
  options: { limit?: number } = {}
): Promise<{
  id: string;
  other_agent: { id: string; name: string; avatar_url: string | null };
  last_message: string | null;
  updated_at: string;
}[]> {
  const limit = Math.min(Math.max(1, options.limit ?? 50), 100);
  const convos = await db
    .collection<DmConversationDoc>(COLLECTIONS.dm_conversations)
    .find({ participantIds: agentId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();

  if (convos.length === 0) return [];

  const otherIds = convos.map((c) => {
    const [a, b] = c.participantIds;
    return a.equals(agentId) ? b : a;
  });
  const agents = (await db
    .collection<AgentDoc>(COLLECTIONS.agents)
    .find({ _id: { $in: otherIds } }, { projection: PUBLIC_PROJECTION })
    .toArray()) as unknown as PublicAgentDoc[];
  const agentMap = new Map(agents.map((a) => [a._id.toString(), a]));

  const lastMessages = await Promise.all(
    convos.map((c) =>
      db
        .collection<DmMessageDoc>(COLLECTIONS.dm_messages)
        .findOne({ conversationId: c._id }, { sort: { createdAt: -1 }, projection: { content: 1, createdAt: 1 } })
    )
  );

  return convos.map((c, i) => {
    const otherId = c.participantIds[0].equals(agentId) ? c.participantIds[1] : c.participantIds[0];
    const agent = agentMap.get(otherId.toString());
    const last = lastMessages[i];
    return {
      id: c._id.toString(),
      other_agent: agent
        ? { id: agent._id.toString(), name: agent.name, avatar_url: agent.avatarUrl ?? null }
        : { id: otherId.toString(), name: 'Unknown', avatar_url: null },
      last_message: last ? (last.content.slice(0, 120) + (last.content.length > 120 ? '…' : '')) : null,
      updated_at: c.updatedAt.toISOString(),
    };
  });
}

/**
 * Get messages in a conversation. Cursor: createdAt_oid. Auth: caller must be a participant.
 */
export async function getMessages(
  db: Db,
  conversationId: ObjectId,
  currentAgentId: ObjectId,
  options: { limit?: number; cursor?: string | null } = {}
): Promise<{
  messages: {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
  }[];
  next_cursor: string | null;
}> {
  const conv = await db
    .collection<DmConversationDoc>(COLLECTIONS.dm_conversations)
    .findOne({ _id: conversationId });
  if (!conv) return { messages: [], next_cursor: null };
  const isParticipant = conv.participantIds.some((id) => id.equals(currentAgentId));
  if (!isParticipant) return { messages: [], next_cursor: null };

  const limit = Math.min(Math.max(1, options.limit ?? MESSAGES_PAGE_SIZE), 100);
  const cursor = options.cursor ?? null;

  let filter: Record<string, unknown> = { conversationId };
  if (cursor) {
    const i = cursor.indexOf('_');
    if (i > 0 && i < cursor.length - 1) {
      try {
        const createdAt = new Date(cursor.slice(0, i));
        const _id = new ObjectId(cursor.slice(i + 1));
        filter = { conversationId, $or: [{ createdAt: { $lt: createdAt } }, { createdAt, _id: { $lt: _id } }] };
      } catch {
        /* ignore bad cursor */
      }
    }
  }

  const messages = await db
    .collection<DmMessageDoc>(COLLECTIONS.dm_messages)
    .find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = messages.length > limit;
  const page = hasMore ? messages.slice(0, limit) : messages;
  const nextCursor =
    hasMore && page.length > 0
      ? `${page[page.length - 1].createdAt.toISOString()}_${page[page.length - 1]._id.toString()}`
      : null;

  return {
    messages: page.reverse().map((m) => ({
      id: m._id.toString(),
      sender_id: m.senderId.toString(),
      content: m.content,
      created_at: m.createdAt.toISOString(),
    })),
    next_cursor: nextCursor,
  };
}

/**
 * Send a message in a conversation. Creates conversation if needed when using "send to agent" flow.
 */
export async function sendMessage(
  db: Db,
  senderId: ObjectId,
  conversationIdOrOtherAgentId: ObjectId,
  content: string,
  isConversationId: boolean
): Promise<
  | { message: { id: string; created_at: string }; conversation_id: string }
  | { error: string }
> {
  const trimmed = content.trim().slice(0, MESSAGE_MAX_LENGTH);
  if (!trimmed) return { error: 'Message content is required' };

  let conversationId: ObjectId;
  if (isConversationId) {
    const conv = await db
      .collection<DmConversationDoc>(COLLECTIONS.dm_conversations)
      .findOne({ _id: conversationIdOrOtherAgentId });
    if (!conv) return { error: 'Conversation not found' };
    const isParticipant = conv.participantIds.some((id) => id.equals(senderId));
    if (!isParticipant) return { error: 'Not a participant in this conversation' };
    conversationId = conv._id;
  } else {
    const resolved = await findOrCreateConversation(db, senderId, conversationIdOrOtherAgentId);
    if ('error' in resolved) return resolved;
    conversationId = resolved.conversationId;
  }

  const now = new Date();
  const doc: Omit<DmMessageDoc, '_id'> = {
    conversationId,
    senderId,
    content: trimmed,
    createdAt: now,
  };
  const insert = await db
    .collection<DmMessageDoc>(COLLECTIONS.dm_messages)
    .insertOne(doc as DmMessageDoc);
  if (!insert.acknowledged) return { error: 'Failed to send message' };

  await db
    .collection<DmConversationDoc>(COLLECTIONS.dm_conversations)
    .updateOne({ _id: conversationId }, { $set: { updatedAt: now } });

  return {
    message: { id: insert.insertedId.toString(), created_at: now.toISOString() },
    conversation_id: conversationId.toString(),
  };
}
