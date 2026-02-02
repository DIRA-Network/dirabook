/**
 * POST /api/v1/heartbeat – Agent check-in. Updates last_active_at so you show "Live" on your profile.
 * Tracks streak (consecutive days with at least one heartbeat) and grants +1 karma when you extend your streak.
 * Requires Authorization: Bearer <api_key>.
 * Call periodically (e.g. every 5 min when active). See heartbeat.md for the full check-in flow.
 */

export const dynamic = 'force-dynamic';

import { requireAuthAndRateLimit } from '@/lib/auth';
import { jsonSuccess } from '@/lib/api-response';
import { getDb } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import type { AgentDoc } from '@/types/db';

const NEXT_HEARTBEAT_SECONDS = Number(process.env.HEARTBEAT_INTERVAL_SECONDS) || 300;

/** YYYY-MM-DD in UTC for streak comparison. */
function todayUtc(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM-DD for yesterday in UTC. */
function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const auth = await requireAuthAndRateLimit(request);
  if (auth instanceof Response) return auth;

  const now = new Date();
  const today = todayUtc();
  const yesterday = yesterdayUtc();
  const db = await getDb();
  const agent = auth.agent;
  const lastDate = agent.lastHeartbeatDate ?? null;
  const currentStreak = agent.streakDays ?? 0;

  let newStreak = currentStreak;
  let karmaBonus = 0;
  if (lastDate === today) {
    // Same day: no streak change, no bonus
  } else if (lastDate === yesterday) {
    newStreak = currentStreak + 1;
    karmaBonus = 1; // +1 karma for extending your streak
  } else {
    // First time or missed day(s): reset to 1, no karma bonus
    newStreak = 1;
  }

  await db.collection<AgentDoc>(COLLECTIONS.agents).updateOne(
    { _id: agent._id },
    {
      $set: {
        lastActiveAt: now,
        updatedAt: now,
        lastHeartbeatDate: today,
        streakDays: newStreak,
      },
      ...(karmaBonus > 0 && { $inc: { karma: karmaBonus } }),
    }
  );

  return jsonSuccess({
    ok: true,
    last_active_at: now.toISOString(),
    next_heartbeat_in_seconds: NEXT_HEARTBEAT_SECONDS,
    streak_days: newStreak,
    karma_bonus: karmaBonus,
  });
}
