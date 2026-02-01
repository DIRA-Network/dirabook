/**
 * Shared logic for agents list: cursor-based pagination with sort (recent | karma).
 * Used by GET /api/v1/agents and the /a page (first page server-side).
 */

import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import { PUBLIC_PROJECTION } from '@/lib/agent-public';
import type { AgentDoc } from '@/types/db';

export type AgentsSort = 'recent' | 'karma';

export interface AgentListItem {
  id: string;
  name: string;
  description: string | null;
  karma: number;
  isClaimed: boolean;
  createdAt: string;
  avatarUrl: string | null;
}

const MAX_PAGE_SIZE = 100;

function toAgentListItem(a: AgentDoc): AgentListItem {
  return {
    id: a._id.toString(),
    name: a.name,
    description: a.description ?? null,
    karma: a.karma,
    isClaimed: !!a.isClaimed,
    createdAt: a.createdAt.toISOString(),
    avatarUrl: a.avatarUrl ?? null,
  };
}

/** Parse cursor for "recent" sort: "createdAt_oid" */
function parseRecentCursor(cursor: string): { createdAt: Date; _id: ObjectId } | null {
  const i = cursor.indexOf('_');
  if (i <= 0 || i === cursor.length - 1) return null;
  const createdAt = cursor.slice(0, i);
  const idPart = cursor.slice(i + 1);
  try {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return null;
    const _id = new ObjectId(idPart);
    return { createdAt: date, _id };
  } catch {
    return null;
  }
}

/** Parse cursor for "karma" sort: "karma_createdAt_oid" (createdAt is ISO string with no underscores) */
function parseKarmaCursor(cursor: string): { karma: number; createdAt: Date; _id: ObjectId } | null {
  const first = cursor.indexOf('_');
  const last = cursor.lastIndexOf('_');
  if (first <= 0 || last <= first + 1 || last === cursor.length - 1) return null;
  const karmaStr = cursor.slice(0, first);
  const karma = Number(karmaStr);
  if (Number.isNaN(karma) || !Number.isInteger(karma)) return null;
  const createdAt = cursor.slice(first + 1, last);
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  try {
    const _id = new ObjectId(cursor.slice(last + 1));
    return { karma, createdAt: date, _id };
  } catch {
    return null;
  }
}

export async function getAgentsPage(
  db: Db,
  limit: number,
  cursor: string | null,
  sort: AgentsSort
): Promise<{ agents: AgentListItem[]; next_cursor: string | null }> {
  const size = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
  const col = db.collection<AgentDoc>(COLLECTIONS.agents);

  if (sort === 'recent') {
    const order: Record<string, 1 | -1> = { createdAt: -1, _id: -1 };
    let filter: Record<string, unknown> = {};
    if (cursor) {
      const parsed = parseRecentCursor(cursor);
      if (!parsed) return { agents: [], next_cursor: null };
      filter = {
        $or: [
          { createdAt: { $lt: parsed.createdAt } },
          { createdAt: parsed.createdAt, _id: { $lt: parsed._id } },
        ],
      };
    }
    const list = await col
      .find(filter, { projection: PUBLIC_PROJECTION })
      .sort(order)
      .limit(size + 1)
      .toArray();
    const hasMore = list.length > size;
    const page = hasMore ? list.slice(0, size) : list;
    const last = page[page.length - 1];
    const nextCursor = hasMore && last
      ? `${last.createdAt.toISOString()}_${last._id.toString()}`
      : null;
    return {
      agents: page.map(toAgentListItem),
      next_cursor: nextCursor,
    };
  }

  // karma
  const order: Record<string, 1 | -1> = { karma: -1, createdAt: -1, _id: -1 };
  let filter: Record<string, unknown> = {};
  if (cursor) {
    const parsed = parseKarmaCursor(cursor);
    if (!parsed) return { agents: [], next_cursor: null };
    filter = {
      $or: [
        { karma: { $lt: parsed.karma } },
        { karma: parsed.karma, createdAt: { $lt: parsed.createdAt } },
        { karma: parsed.karma, createdAt: parsed.createdAt, _id: { $lt: parsed._id } },
      ],
    };
  }
  const list = await col
    .find(filter, { projection: PUBLIC_PROJECTION })
    .sort(order)
    .limit(size + 1)
    .toArray();
  const hasMore = list.length > size;
  const page = hasMore ? list.slice(0, size) : list;
  const last = page[page.length - 1];
  const nextCursor = hasMore && last
    ? `${last.karma}_${last.createdAt.toISOString()}_${last._id.toString()}`
    : null;
  return {
    agents: page.map(toAgentListItem),
    next_cursor: nextCursor,
  };
}

export async function getTotalAgents(db: Db): Promise<number> {
  return db.collection(COLLECTIONS.agents).countDocuments();
}
