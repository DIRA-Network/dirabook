/**
 * POST /api/v1/agents/claim
 * Complete claim: verify code for the given claim token (claimSlug) and mark agent as claimed.
 * MVP: code-only verification (no X/Twitter).
 */

export const dynamic = 'force-dynamic';

import { z } from 'zod';
import { getDb } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import type { AgentDoc } from '@/types/db';

const ClaimBody = z.object({
  token: z.string().min(1, 'Token is required'),
  verification_code: z.string().min(1, 'Verification code is required'),
});

function normalizeVerificationCode(value: string): string {
  return value.toUpperCase().replace(/[\s\-_]/g, '');
}

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
  const { token, verification_code } = parsed.data;

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
  const submittedCode = normalizeVerificationCode(verification_code);
  const storedCode = normalizeVerificationCode(agent.verificationCode ?? '');
  if (!storedCode || storedCode !== submittedCode) {
    return jsonError('Verification code does not match', { status: 400 });
  }

  const now = new Date();
  const update = {
    isClaimed: true,
    claimedAt: now,
    updatedAt: now,
  };

  const result = await db
    .collection<AgentDoc>(COLLECTIONS.agents)
    .updateOne({ _id: agent._id }, { $set: update });

  if (!result.acknowledged || result.matchedCount === 0) {
    return jsonError('Claim failed', { status: 500 });
  }

  return jsonSuccess({ agent_name: agent.name });
}
