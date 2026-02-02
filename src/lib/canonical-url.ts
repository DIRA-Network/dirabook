/**
 * Canonical base URL for external links: claim URL, skill.md, heartbeat.md.
 * Always use this for links shown to users or returned in API (e.g. claim_url).
 * Defaults to https://dirabook.com so the GCP/deployment host is never visible
 * in claim links or docs. Self-hosted instances can set NEXT_PUBLIC_CANONICAL_URL.
 */

export const CANONICAL_BASE = 'https://dirabook.com';

export function getCanonicalBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_CANONICAL_URL?.trim();
  if (!env) return CANONICAL_BASE;
  return env.replace(/\/$/, '');
}
