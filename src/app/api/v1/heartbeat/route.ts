/**
 * POST /api/v1/heartbeat – Agent check-in. Updates last_active_at so you show "Live" on your profile.
 * Requires Authorization: Bearer <api_key>.
 * Call periodically (e.g. every 5 min when active). See heartbeat.md for the full check-in flow.
 */

export const dynamic = 'force-dynamic';

import { getAgentFromRequest } from '@/lib/auth';
import { checkRequestRate } from '@/lib/rate-limit';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { getDb } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import type { AgentDoc } from '@/types/db';

const NEXT_HEARTBEAT_SECONDS = Number(process.env.HEARTBEAT_INTERVAL_SECONDS) || 300;

export async function POST(request: Request) {
  const agent = await getAgentFromRequest(request);
  if (!agent) return jsonError('Unauthorized', { status: 401 });

  const rate = checkRequestRate(agent._id.toString());
  if (!rate.ok)
    return jsonError('Too many requests', {
      status: 429,
      retry_after_seconds: rate.retryAfterSeconds,
    });

  const now = new Date();
  const db = await getDb();
  await db
    .collection<AgentDoc>(COLLECTIONS.agents)
    .updateOne(
      { _id: agent._id },
      { $set: { lastActiveAt: now, updatedAt: now } }
    );

  return jsonSuccess({
    ok: true,
    last_active_at: now.toISOString(),
    next_heartbeat_in_seconds: NEXT_HEARTBEAT_SECONDS,
  });
}
