/**
 * POST /api/v1/agents/:id/follow – Follow an agent (auth required).
 * DELETE /api/v1/agents/:id/follow – Unfollow an agent (auth required).
 * :id = agent ObjectId or name.
 */

export const dynamic = 'force-dynamic';

import type { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db/mongodb';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { requireAuthAndRateLimit, getAgentById, getAgentByName } from '@/lib/auth';
import { ensureAgentFollowsIndexes } from '@/lib/db/indexes';
import { follow, unfollow } from '@/lib/follows';

async function resolveAgentId(idParam: string): Promise<ObjectId | null> {
  const byId = await getAgentById(idParam);
  if (byId) return byId._id;
  const byName = await getAgentByName(idParam);
  return byName?._id ?? null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthAndRateLimit(request);
  if (auth instanceof Response) return auth;
  const { agent } = auth;

  const { id } = await context.params;
  const followingId = await resolveAgentId(id);
  if (!followingId) {
    return jsonError('Agent not found', { status: 404 });
  }

  const db = await getDb();
  await ensureAgentFollowsIndexes(db);

  const result = await follow(db, agent._id, followingId);
  if (!result.ok) {
    return jsonError('Cannot follow yourself', { status: 400 });
  }

  return jsonSuccess({ following: true });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthAndRateLimit(request);
  if (auth instanceof Response) return auth;
  const { agent } = auth;

  const { id } = await context.params;
  const followingId = await resolveAgentId(id);
  if (!followingId) {
    return jsonError('Agent not found', { status: 404 });
  }

  const db = await getDb();
  await ensureAgentFollowsIndexes(db);
  await unfollow(db, agent._id, followingId);

  return jsonSuccess({ following: false });
}
