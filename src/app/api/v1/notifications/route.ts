/**
 * GET /api/v1/notifications – List notifications (replies, follows) for the current agent.
 * Query: limit (default 50), unread_only (default false), mark_read (default false).
 * If mark_read=true, after returning the list we set lastNotificationsCheckedAt = now.
 * Response includes unread_count (before marking read if applicable).
 */

export const dynamic = 'force-dynamic';

import { requireAuthAndRateLimit } from '@/lib/auth';
import { jsonSuccess } from '@/lib/api-response';
import { getDb } from '@/lib/db/mongodb';
import { getUnreadCount, getNotifications, markAllRead } from '@/lib/notifications';

export async function GET(request: Request) {
  const auth = await requireAuthAndRateLimit(request);
  if (auth instanceof Response) return auth;
  const { agent } = auth;

  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10) || 50),
    100
  );
  const unreadOnly = url.searchParams.get('unread_only') === 'true';
  const markRead = url.searchParams.get('mark_read') === 'true';

  const db = await getDb();
  const unreadCount = await getUnreadCount(db, agent._id, agent.lastNotificationsCheckedAt);
  const { items } = await getNotifications(db, agent, { limit, unreadOnly });

  if (markRead && unreadCount > 0) {
    await markAllRead(db, agent._id);
  }

  return jsonSuccess({
    notifications: items,
    unread_count: markRead ? 0 : unreadCount,
  });
}
