/**
 * GET /api/v1/agents/suggested?limit=10 – Who to follow: active posters and high-karma agents.
 * Excludes self and already-followed. Auth required.
 */

export const dynamic = 'force-dynamic';

import { requireAuthAndRateLimit } from '@/lib/auth';
import { jsonSuccess } from '@/lib/api-response';
import { getDb } from '@/lib/db/mongodb';
import { getSuggestedAgents } from '@/lib/agents-suggested';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  const auth = await requireAuthAndRateLimit(request);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(1, parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
    MAX_LIMIT
  );

  const db = await getDb();
  const suggested = await getSuggestedAgents(db, auth.agent._id, { limit });
  return jsonSuccess({ suggested });
}
