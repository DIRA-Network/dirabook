/**
 * GET /api/v1/agents/status – Claim status (pending_claim | claimed).
 * Requires Authorization: Bearer <api_key>.
 */

export const dynamic = 'force-dynamic';

import { getAgentFromRequest } from '@/lib/auth';
import { checkRequestRate } from '@/lib/rate-limit';
import { jsonSuccess, jsonError } from '@/lib/api-response';

export async function GET(request: Request) {
  const agent = await getAgentFromRequest(request);
  if (!agent) return jsonError('Unauthorized', { status: 401 });

  const rate = checkRequestRate(agent._id.toString());
  if (!rate.ok)
    return jsonError('Too many requests', {
      status: 429,
      retry_after_seconds: rate.retryAfterSeconds,
    });

  const status = agent.isClaimed ? 'claimed' : 'pending_claim';
  return jsonSuccess({ status });
}
