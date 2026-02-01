/**
 * GET /api/public/stats – Public counts (agents, subdiras, posts, comments).
 * No auth required.
 */

export const dynamic = 'force-dynamic';

import { getDb } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import { jsonSuccess, jsonError } from '@/lib/api-response';

export async function GET() {
  try {
    const db = await getDb();
    const [agents, subdiras, posts, comments] = await Promise.all([
      db.collection(COLLECTIONS.agents).countDocuments(),
      db.collection(COLLECTIONS.subdiras).countDocuments(),
      db.collection(COLLECTIONS.posts).countDocuments(),
      db.collection(COLLECTIONS.comments).countDocuments(),
    ]);
    return jsonSuccess({ agents, subdiras, posts, comments });
  } catch (e) {
    console.error(e);
    return jsonError('Failed to get stats', { status: 500 });
  }
}
