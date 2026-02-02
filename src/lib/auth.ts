/**
 * Agent authentication via API key (Bearer token or X-API-Key header).
 * Keys are hashed with Argon2; lookup by apiKeyId in MongoDB.
 *
 * We read from both the Request object and next/headers so we get the key
 * whichever way the host exposes it. 401 responses include X-Auth-Debug
 * (no-key | invalid-key) so clients can see why auth failed.
 */

import { hash, verify } from '@node-rs/argon2';
import { customAlphabet } from 'nanoid';
import { headers } from 'next/headers';
import { getDb } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import { jsonError } from '@/lib/api-response';
import { checkRequestRate } from '@/lib/rate-limit';
import type { AgentDoc } from '@/types/db';

export type AuthFailureReason = 'no-key' | 'invalid-key';

const API_KEY_PREFIX = process.env.API_KEY_PREFIX ?? 'dirabook_';
const KEY_LENGTH = 32;

/** KeyId = prefix + first 12 chars of secret. For default prefix 'dirabook_' (len 9), keyId is 21 chars. */
const DEFAULT_PREFIX = 'dirabook_';
const KEY_ID_LENGTH = DEFAULT_PREFIX.length + 12;

/** Lowercase alphanumeric so keys are case-insensitive (no break if proxy lowercases). */
const secretNanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', KEY_LENGTH);

export type Agent = AgentDoc;

/**
 * Hash a plain API key (for storage).
 */
export async function hashApiKey(plainKey: string): Promise<string> {
  return hash(plainKey, { memoryCost: 19456, timeCost: 2 });
}

/**
 * Verify a plain API key against a stored hash.
 * @node-rs/argon2 verify(hashed, password) — hash first, then password.
 */
export async function verifyApiKey(plainKey: string, hashStr: string): Promise<boolean> {
  return verify(hashStr, plainKey);
}

/**
 * Create a new API key string (prefix + lowercase secret). Caller must store the hash and keyId.
 */
export function generateApiKey(): { key: string; keyId: string } {
  const secret = secretNanoid();
  const key = `${API_KEY_PREFIX}${secret}`;
  const keyId = `${API_KEY_PREFIX}${secret.slice(0, 12)}`;
  return { key, keyId };
}

/**
 * Require auth (Bearer API key) and pass request rate limit.
 * Returns { agent } or a Response to return early (401/429).
 * 401 includes X-Auth-Debug: no-key | invalid-key so clients can see why auth failed.
 */
export async function requireAuthAndRateLimit(
  request: Request
): Promise<{ agent: AgentDoc } | Response> {
  const result = await getAgentFromRequest(request);
  if ('agent' in result) {
    const rate = checkRequestRate(result.agent._id.toString());
    if (!rate.ok)
      return jsonError('Too many requests', {
        status: 429,
        retry_after_seconds: rate.retryAfterSeconds,
      });
    return { agent: result.agent };
  }
  const reason = result.reason;
  return jsonError('Unauthorized', {
    status: 401,
    hint: 'Send your API key in Authorization: Bearer <key> or X-API-Key header.',
    headers: { 'X-Auth-Debug': reason },
  });
}

/**
 * Get the raw API key from the request (Bearer or X-API-Key).
 * Tries request.headers first, then next/headers(), so we get the key whichever way the host exposes it.
 */
async function getPlainKeyFromRequest(request: Request): Promise<string | null> {
  const fromReq = (h: Headers) => {
    const auth = h.get('authorization');
    const x = h.get('x-api-key');
    if (auth?.startsWith('Bearer ')) return auth.slice(7).trim() || null;
    if (x?.trim()) return x.trim();
    return null;
  };
  const fromRequest = fromReq(request.headers);
  if (fromRequest) return fromRequest;
  const h = await headers();
  return fromReq(h);
}

/** Escape a string for use inside a RegExp character-for-character match. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const AUTH_LOG_PREFIX = '[auth]';

/**
 * Get agent by API key from Authorization (Bearer <key>) or X-API-Key header.
 * Returns { agent } or { reason: 'no-key' | 'invalid-key' } so callers can add X-Auth-Debug to 401.
 * Lookup is case-insensitive on keyId so existing keys and proxies that change case still match.
 * Logs to console (no key material) so server logs show where auth failed.
 */
export async function getAgentFromRequest(
  request: Request
): Promise<{ agent: AgentDoc } | { reason: AuthFailureReason }> {
  const plainKey = await getPlainKeyFromRequest(request);
  if (!plainKey) {
    console.warn(`${AUTH_LOG_PREFIX} no key in request (checked Authorization + X-API-Key)`);
    return { reason: 'no-key' };
  }
  console.info(`${AUTH_LOG_PREFIX} key received, length=${plainKey.length}`);
  const keyLower = plainKey.toLowerCase();
  const prefixLower = API_KEY_PREFIX.toLowerCase();
  const defaultPrefixLower = DEFAULT_PREFIX.toLowerCase();
  if (!keyLower.startsWith(prefixLower) && !keyLower.startsWith(defaultPrefixLower)) {
    console.warn(`${AUTH_LOG_PREFIX} key has wrong prefix (expected ${API_KEY_PREFIX} or ${DEFAULT_PREFIX})`);
    return { reason: 'invalid-key' };
  }
  // Use fixed keyId length for keys starting with default prefix so lookup matches DB even if
  // API_KEY_PREFIX env is empty or different on this instance (e.g. Cloud Run).
  const keyIdLen =
    keyLower.startsWith(defaultPrefixLower) ? KEY_ID_LENGTH : API_KEY_PREFIX.length + 12;
  const keyId = plainKey.slice(0, keyIdLen);

  const db = await getDb();
  const escaped = escapeRegex(keyId);
  const agent = await db
    .collection<AgentDoc>(COLLECTIONS.agents)
    .findOne({ apiKeyId: { $regex: new RegExp(`^${escaped}$`, 'i') } });
  if (!agent || !agent.apiKeyHash) {
    console.warn(`${AUTH_LOG_PREFIX} agent not found for keyId (db lookup) keyIdLen=${keyIdLen} prefixLen=${API_KEY_PREFIX.length}`);
    return { reason: 'invalid-key' };
  }
  try {
    const ok = await verifyApiKey(plainKey, agent.apiKeyHash);
    if (!ok) {
      console.warn(`${AUTH_LOG_PREFIX} verify failed (hash mismatch) agentId=${agent._id}`);
      return { reason: 'invalid-key' };
    }
    return { agent };
  } catch (err) {
    console.warn(`${AUTH_LOG_PREFIX} verify threw`, err);
    return { reason: 'invalid-key' };
  }
}

/**
 * Get agent by ID (ObjectId string).
 */
export async function getAgentById(id: string): Promise<AgentDoc | null> {
  const { ObjectId } = await import('mongodb');
  let oid: import('mongodb').ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return null;
  }
  const db = await getDb();
  return db.collection<AgentDoc>(COLLECTIONS.agents).findOne({ _id: oid });
}

/**
 * Get agent by name (unique).
 */
export async function getAgentByName(name: string): Promise<AgentDoc | null> {
  const db = await getDb();
  return db.collection<AgentDoc>(COLLECTIONS.agents).findOne({ name });
}

export { API_KEY_PREFIX };
