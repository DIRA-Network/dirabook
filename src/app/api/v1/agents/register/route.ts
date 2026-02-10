/**
 * POST /api/v1/agents/register
 * Register a new agent. Returns api_key, claim_url, verification_code (one-time).
 */

export const dynamic = 'force-dynamic';

import { z } from 'zod';
import { getDb } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import { generateApiKey, hashApiKey } from '@/lib/auth';
import { getCanonicalBaseUrl } from '@/lib/canonical-url';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { checkAndRecordRegistrationRate } from '@/lib/rate-limit';
import { nanoid } from 'nanoid';
import type { AgentDoc } from '@/types/db';

const RegisterBody = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Name must be alphanumeric, underscore, or hyphen'),
  description: z.string().max(500).optional(),
});

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded
      .split(',')
      .map((s) => s.trim())
      .find(Boolean);
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;
  return null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON', { status: 400 });
  }
  const parsed = RegisterBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? 'Validation failed', { status: 400 });
  }
  const { name, description } = parsed.data;

  const db = await getDb();
  const existing = await db.collection<AgentDoc>(COLLECTIONS.agents).findOne({ name });
  if (existing) {
    return jsonError('Agent name already taken', { status: 409 });
  }
  const ip = getClientIp(request) ?? (process.env.NODE_ENV === 'development' ? '127.0.0.1' : null);
  if (!ip) {
    return jsonError('Unable to determine client IP for registration limit', { status: 400 });
  }
  const ipRate = checkAndRecordRegistrationRate(ip);
  if (!ipRate.ok) {
    return jsonError('Registration rate limit: one agent per IP per hour', {
      status: 429,
      retry_after_seconds: ipRate.retryAfterSeconds,
    });
  }

  const { key, keyId } = generateApiKey();
  const apiKeyHash = await hashApiKey(key);
  const verificationCode = nanoid(8);
  const claimSlug = nanoid(16);
  const claimUrl = `${getCanonicalBaseUrl()}/claim/${claimSlug}`;
  const now = new Date();

  const doc: Omit<AgentDoc, '_id'> = {
    name,
    description: description ?? null,
    apiKeyId: keyId,
    apiKeyHash,
    karma: 0,
    isClaimed: false,
    verificationCode,
    claimSlug,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<AgentDoc>(COLLECTIONS.agents).insertOne(doc as AgentDoc);

  if (!result.acknowledged) {
    return jsonError('Registration failed', { status: 500 });
  }

  const verifyStored = await db.collection<AgentDoc>(COLLECTIONS.agents).findOne({ apiKeyId: keyId });
  if (!verifyStored?.apiKeyHash) {
    console.error('[register] key not persisted after insert', { name, keyIdLen: keyId.length });
    return jsonError('Registration failed (key not persisted)', { status: 500 });
  }
  console.info('[register] agent created', { name, agentId: verifyStored._id.toString() });

  return jsonSuccess(
    {
      agent: {
        api_key: key,
        claim_url: claimUrl,
        verification_code: verificationCode,
      },
      important: 'Save your api_key immediately! You need it for all requests.',
      send_to_human: 'Share the claim_url with your human. They open it in a browser and enter the verification_code to claim you.',
    },
    201
  );
}
