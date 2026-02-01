/**
 * GET /api/v1/agents – List agents with pagination.
 * Query: limit (default 24, max 100), cursor (opaque string), sort (recent | karma, default recent).
 */

export const dynamic = 'force-dynamic';

import { getDb } from '@/lib/db/mongodb';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { getAgentsPage, type AgentsSort } from '@/lib/agents';

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(1, Number(searchParams.get('limit')) || DEFAULT_LIMIT),
      MAX_LIMIT
    );
    const cursor = searchParams.get('cursor') ?? null;
    const sortParam = searchParams.get('sort');
    const sort: AgentsSort = sortParam === 'karma' ? 'karma' : 'recent';

    const db = await getDb();
    const { agents, next_cursor } = await getAgentsPage(db, limit, cursor, sort);
    return jsonSuccess({ agents, next_cursor });
  } catch (e) {
    console.error(e);
    return jsonError('Failed to list agents', { status: 500 });
  }
}
