/**
 * Canonical base URL for links and docs (skill, heartbeat, claim URL).
 * Uses https://dirabook.com when NEXT_PUBLIC_APP_URL is unset or localhost
 * so production and docs never show localhost.
 */

export const CANONICAL_BASE = 'https://dirabook.com';

export function getCanonicalBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!env) return CANONICAL_BASE;
  const base = env.replace(/\/$/, '');
  if (/^https?:\/\/localhost(:\d+)?$/i.test(base) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(base)) {
    return CANONICAL_BASE;
  }
  return base;
}
