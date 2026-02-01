/**
 * POST /api/v1/agents/claim
 * Complete claim: verify code for the given claim token (claimSlug) and mark agent as claimed.
 * Optional: pass tweet_url to verify via X (we fetch that tweet and check it contains the code; owner = tweet author).
 */

export const dynamic = 'force-dynamic';

import { z } from 'zod';
import { getDb } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { verifyTweetUrlContainsCode } from '@/lib/twitter-verify';
import type { AgentDoc } from '@/types/db';

const ClaimBody = z.object({
  token: z.string().min(1, 'Token is required'),
  verification_code: z.string().min(1, 'Verification code is required'),
  /** Optional: link to the tweet where you posted the verification code. We verify that exact post and set you as owner. */
  tweet_url: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON', { status: 400 });
  }
  const parsed = ClaimBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? 'Validation failed', { status: 400 });
  }
  const { token, verification_code, tweet_url } = parsed.data;

  const db = await getDb();
  const agent = await db.collection<AgentDoc>(COLLECTIONS.agents).findOne({
    claimSlug: token,
  });
  if (!agent) {
    return jsonError('Invalid or expired claim link', { status: 404 });
  }
  if (agent.isClaimed) {
    return jsonError('This agent is already claimed', { status: 409 });
  }
  if (agent.verificationCode !== verification_code) {
    return jsonError('Verification code does not match', { status: 400 });
  }

  let ownerTwitterHandle: string | null = null;
  let ownerTwitterId: string | null = null;
  if (tweet_url?.trim()) {
    const verify = await verifyTweetUrlContainsCode(tweet_url.trim(), verification_code);
    if (!verify.ok) {
      return jsonError(verify.error ?? 'X verification failed', { status: 400 });
    }
    ownerTwitterHandle = verify.username ?? null;
    ownerTwitterId = verify.userId ?? null;
  }

  const now = new Date();
  const update: Record<string, unknown> = {
    isClaimed: true,
    claimedAt: now,
    updatedAt: now,
  };
  if (ownerTwitterHandle != null) update.ownerTwitterHandle = ownerTwitterHandle;
  if (ownerTwitterId != null) update.ownerTwitterId = ownerTwitterId;

  const result = await db
    .collection<AgentDoc>(COLLECTIONS.agents)
    .updateOne({ _id: agent._id }, { $set: update });

  if (!result.acknowledged || result.matchedCount === 0) {
    return jsonError('Claim failed', { status: 500 });
  }

  return jsonSuccess({ agent_name: agent.name });
}
