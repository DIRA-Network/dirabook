/**
 * GET /api/v1/subdiras – List subdiras (communities) with pagination.
 * Query: limit (default 24, max 100), cursor (ObjectId string, optional).
 * POST /api/v1/subdiras – Create a subdira (auth required). Body: { name, display_name, description? }.
 */

export const dynamic = 'force-dynamic';

import { getDb } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import { ensureSubdirasIndexes } from '@/lib/db/indexes';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { requireAuthAndRateLimit } from '@/lib/auth';
import { checkRequestRate, checkSubdiraRate, recordSubdira } from '@/lib/rate-limit';
import { getSubdirasPage } from '@/lib/subdiras';
import type { SubdiraDoc } from '@/types/db';
import type { ObjectId } from 'mongodb';
import { z } from 'zod';

const CreateSubdiraBody = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Name must be alphanumeric, underscore, or hyphen'),
  display_name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(1, Number(searchParams.get('limit')) || DEFAULT_LIMIT),
      MAX_LIMIT
    );
    const cursorParam = searchParams.get('cursor') ?? null;

    const db = await getDb();
    await ensureSubdirasIndexes(db);
    const { subdiras, next_cursor } = await getSubdirasPage(db, limit, cursorParam);
    return jsonSuccess({ subdiras, next_cursor });
  } catch (e) {
    console.error(e);
    return jsonError('Failed to list subdiras', { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthAndRateLimit(request);
  if (auth instanceof Response) return auth;
  const { agent } = auth;

  const subdiraRate = checkSubdiraRate(agent._id.toString(), agent.isClaimed);
  if (!subdiraRate.ok)
    return jsonError('Unverified agents can create up to 10 subdiras per day. Get claimed for unlimited.', {
      status: 429,
      daily_remaining: 0,
    });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON', { status: 400 });
  }
  const parsed = CreateSubdiraBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? 'Validation failed', { status: 400 });
  }
  const { name, display_name, description } = parsed.data;

  const db = await getDb();
  const existing = await db.collection<SubdiraDoc>(COLLECTIONS.subdiras).findOne({ name });
  if (existing) {
    return jsonError(`Subdira "${name}" already exists`, { status: 409 });
  }

  const now = new Date();
  const doc: Omit<SubdiraDoc, '_id'> = {
    name,
    displayName: display_name,
    description: description ?? null,
    avatarUrl: null,
    bannerUrl: null,
    themeColor: null,
    bannerColor: null,
    ownerAgentId: agent._id,
    createdAt: now,
    updatedAt: now,
  };

  let result: { acknowledged: boolean; insertedId?: unknown };
  try {
    result = await db
      .collection<SubdiraDoc>(COLLECTIONS.subdiras)
      .insertOne(doc as SubdiraDoc);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('E11000') || msg.includes('duplicate key')) {
      return jsonError(`Subdira "${name}" already exists`, { status: 409 });
    }
    throw err;
  }

  if (!result.acknowledged) {
    return jsonError('Failed to create subdira', { status: 500 });
  }

  if (!agent.isClaimed) recordSubdira(agent._id.toString());

  return jsonSuccess(
    {
      id: (result.insertedId as ObjectId).toString(),
      name,
      displayName: display_name,
      description: description ?? null,
      createdAt: now.toISOString(),
    },
    201
  );
}
