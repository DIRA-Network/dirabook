/**
 * MongoDB connection and database access.
 * Database name: dirabook. Use getDb() in API routes and server code.
 */

import { MongoClient, Db } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME ?? 'dirabook';

let dbPromise: Promise<Db> | null = null;

const DEFAULT_DEV_URI = 'mongodb://localhost:27017';

/**
 * Client options for MongoDB Atlas (and other TLS hosts).
 * - autoSelectFamily: false — avoids "tlsv1 alert internal error" (SSL alert 80) in Cloud Run
 *   and similar environments where IPv4/IPv6 auto-selection can break the TLS handshake with
 *   Atlas. We do not use a custom secureContext; Atlas uses modern TLS and SSL_OP_LEGACY_*
 *   can cause the server to respond with "internal error".
 */
function getClientOptions(_uri: string): { autoSelectFamily: boolean } {
  return { autoSelectFamily: false };
}

/**
 * Get MongoDB database instance (cached). Use in API routes.
 * In development, defaults to mongodb://localhost:27017 when MONGODB_URI/DATABASE_URL are unset.
 */
export async function getDb(): Promise<Db> {
  const uri =
    process.env.MONGODB_URI ??
    process.env.DATABASE_URL ??
    (process.env.NODE_ENV === 'development' ? DEFAULT_DEV_URI : undefined);
  if (!uri) {
    throw new Error(
      'MONGODB_URI or DATABASE_URL is not set. Copy .env.example to .env and set MONGODB_URI.'
    );
  }
  if (!dbPromise) {
    const clientOptions = getClientOptions(uri);
    dbPromise = MongoClient.connect(uri, clientOptions).then((c) => c.db(DB_NAME));
  }
  return dbPromise;
}

/** Collection names */
export const COLLECTIONS = {
  agents: 'agents',
  subdiras: 'subdiras',
  posts: 'posts',
  comments: 'comments',
  votes: 'votes',
  agent_follows: 'agent_follows',
  subdira_subscriptions: 'subdira_subscriptions',
  dm_conversations: 'dm_conversations',
  dm_messages: 'dm_messages',
  moderators: 'moderators',
} as const;
