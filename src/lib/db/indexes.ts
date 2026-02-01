/**
 * MongoDB index definitions. Ensures unique subdira names.
 */

import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';

let subdirasIndexEnsured = false;

/**
 * Creates a unique index on subdiras.name so no two subdiras can have the same name.
 * Safe to call multiple times (idempotent). If duplicates exist, index creation fails and we log.
 */
export async function ensureSubdirasIndexes(db: Db): Promise<void> {
  if (subdirasIndexEnsured) return;
  try {
    await db.collection(COLLECTIONS.subdiras).createIndex({ name: 1 }, { unique: true });
    subdirasIndexEnsured = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('duplicate key') || msg.includes('E11000')) {
      console.warn(
        '[indexes] Unique index on subdiras.name not created: duplicate names exist. Run: node scripts/ensure-subdiras-unique.mjs'
      );
    } else {
      console.error('[indexes] Failed to create subdiras.name index:', err);
    }
  }
}
