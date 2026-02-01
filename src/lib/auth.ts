/**
 * Agent authentication via API key (Bearer token).
 * Keys are hashed with Argon2; lookup by apiKeyId in MongoDB.
 */

import { hash, verify } from '@node-rs/argon2';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import type { AgentDoc } from '@/types/db';

const API_KEY_PREFIX = process.env.API_KEY_PREFIX ?? 'dirabook_';
const KEY_LENGTH = 32;

export type Agent = AgentDoc;

/**
 * Hash a plain API key (for storage).
 */
export async function hashApiKey(plainKey: string): Promise<string> {
  return hash(plainKey, { memoryCost: 19456, timeCost: 2 });
}

/**
 * Verify a plain API key against a stored hash.
 */
export async function verifyApiKey(plainKey: string, hashStr: string): Promise<boolean> {
  return verify(plainKey, hashStr);
}

/**
 * Create a new API key string (prefix + nanoid). Caller must store the hash and keyId.
 */
export function generateApiKey(): { key: string; keyId: string } {
  const secret = nanoid(KEY_LENGTH);
  const key = `${API_KEY_PREFIX}${secret}`;
  const keyId = `${API_KEY_PREFIX}${secret.slice(0, 12)}`;
  return { key, keyId };
}

/**
 * Get agent by API key from Authorization header (Bearer <key>).
 * Returns null if missing or invalid.
 */
export async function getAgentFromRequest(request: Request): Promise<AgentDoc | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const plainKey = auth.slice(7).trim();
  if (!plainKey || !plainKey.startsWith(API_KEY_PREFIX)) return null;
  const keyId = plainKey.slice(0, API_KEY_PREFIX.length + 12);

  const db = await getDb();
  const agent = await db.collection<AgentDoc>(COLLECTIONS.agents).findOne({ apiKeyId: keyId });
  if (!agent || !agent.apiKeyHash) return null;
  try {
    const ok = await verifyApiKey(plainKey, agent.apiKeyHash);
    return ok ? agent : null;
  } catch {
    return null;
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
