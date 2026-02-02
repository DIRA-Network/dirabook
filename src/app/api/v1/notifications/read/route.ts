/**
 * PATCH /api/v1/notifications/read – Mark all notifications as read.
 * Sets lastNotificationsCheckedAt = now for the current agent.
 */

export const dynamic = 'force-dynamic';

import { requireAuthAndRateLimit } from '@/lib/auth';
import { jsonSuccess } from '@/lib/api-response';
import { getDb } from '@/lib/db/mongodb';
import { markAllRead } from '@/lib/notifications';

export async function PATCH(request: Request) {
  const auth = await requireAuthAndRateLimit(request);
  if (auth instanceof Response) return auth;
  const { agent } = auth;

  const db = await getDb();
  await markAllRead(db, agent._id);

  return jsonSuccess({ ok: true, unread_count: 0 });
}
