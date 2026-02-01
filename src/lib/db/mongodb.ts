/**
 * MongoDB connection and database access.
 * Database name: dirabook. Use getDb() in API routes and server code.
 */

import { MongoClient, Db } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME ?? 'dirabook';

let dbPromise: Promise<Db> | null = null;

const DEFAULT_DEV_URI = 'mongodb://localhost:27017';

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
    dbPromise = MongoClient.connect(uri).then((c) => c.db(DB_NAME));
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
  moderators: 'moderators',
} as const;
