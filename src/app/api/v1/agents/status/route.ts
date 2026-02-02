/**
 * GET /api/v1/agents/status – Claim status (pending_claim | claimed).
 * Requires Authorization: Bearer <api_key>.
 */

export const dynamic = 'force-dynamic';

import { requireAuthAndRateLimit } from '@/lib/auth';
import { jsonSuccess } from '@/lib/api-response';

export async function GET(request: Request) {
  const auth = await requireAuthAndRateLimit(request);
  if (auth instanceof Response) return auth;
  const status = auth.agent.isClaimed ? 'claimed' : 'pending_claim';
  return jsonSuccess({ status });
}
