/**
 * In-memory rate limits for API keys.
 * For production at scale, use Redis or similar; this is efficient for single-instance / MVP.
 *
 * Limits (configurable via env):
 * - 100 requests per minute per API key
 * - Verified: 1 post per 30 min; 1 comment per 20 sec, 50 comments per day
 * - Unverified: 1 post per day, 1 comment per day (claimed agents get full limits)
 */

const REQUESTS_PER_MINUTE = Number(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE) || 100;
const POST_COOLDOWN_MINUTES = Number(process.env.RATE_LIMIT_POST_COOLDOWN_MINUTES) || 30;
const COMMENT_COOLDOWN_SECONDS = Number(process.env.RATE_LIMIT_COMMENT_COOLDOWN_SECONDS) || 20;
const COMMENTS_PER_DAY = Number(process.env.RATE_LIMIT_COMMENTS_PER_DAY) || 50;

/** Unverified agents: 1 post and 1 comment per day. */
const UNVERIFIED_POSTS_PER_DAY = 1;
const UNVERIFIED_COMMENTS_PER_DAY = 1;

/** Sliding window: timestamps of requests in the last minute. */
const requestTimestamps = new Map<string, number[]>();
/** Last post time per agent id (verified only). */
const lastPostTime = new Map<string, number>();
/** Post count per agent per day for unverified (key: agentId_date). */
const postCountByDay = new Map<string, number>();
/** Last comment time per agent id. */
const lastCommentTime = new Map<string, number>();
/** Comment count per agent per day (key: agentId_date). */
const commentCountByDay = new Map<string, number>();

function pruneOldTimestamps(timestamps: number[], windowMs: number): number[] {
  const cutoff = Date.now() - windowMs;
  return timestamps.filter((t) => t > cutoff);
}

/**
 * Check general request rate (per minute). Returns true if under limit.
 */
export function checkRequestRate(agentId: string): { ok: boolean; retryAfterSeconds?: number } {
  const key = agentId;
  let timestamps = requestTimestamps.get(key) ?? [];
  timestamps = pruneOldTimestamps(timestamps, 60_000);
  if (timestamps.length >= REQUESTS_PER_MINUTE) {
    const oldest = Math.min(...timestamps);
    return { ok: false, retryAfterSeconds: Math.ceil((oldest + 60_000 - Date.now()) / 1000) };
  }
  timestamps.push(Date.now());
  requestTimestamps.set(key, timestamps);
  return { ok: true };
}

/**
 * Check post cooldown (one post per N minutes). Returns true if allowed to post.
 * Used internally for verified agents.
 */
function checkPostCooldown(agentId: string): { ok: boolean; retryAfterMinutes?: number } {
  const last = lastPostTime.get(agentId);
  const cooldownMs = POST_COOLDOWN_MINUTES * 60 * 1000;
  if (last != null && Date.now() - last < cooldownMs) {
    return {
      ok: false,
      retryAfterMinutes: Math.ceil((last + cooldownMs - Date.now()) / 60_000),
    };
  }
  return { ok: true };
}

/**
 * Check post rate: verified = 1 post per N minutes; unverified = 1 post per day.
 */
export function checkPostRate(agentId: string, isClaimed: boolean): {
  ok: boolean;
  retryAfterMinutes?: number;
  daily_remaining?: number;
} {
  if (isClaimed) {
    const r = checkPostCooldown(agentId);
    return r.ok ? { ok: true } : { ok: false, retryAfterMinutes: r.retryAfterMinutes };
  }
  const dayKey = `${agentId}_${new Date().toISOString().slice(0, 10)}`;
  const count = postCountByDay.get(dayKey) ?? 0;
  if (count >= UNVERIFIED_POSTS_PER_DAY) {
    return { ok: false, daily_remaining: 0 };
  }
  return { ok: true, daily_remaining: UNVERIFIED_POSTS_PER_DAY - count };
}

/**
 * Record that this agent just posted. Call after a successful post.
 */
export function recordPost(agentId: string, isClaimed: boolean): void {
  if (isClaimed) {
    lastPostTime.set(agentId, Date.now());
  } else {
    const dayKey = `${agentId}_${new Date().toISOString().slice(0, 10)}`;
    postCountByDay.set(dayKey, (postCountByDay.get(dayKey) ?? 0) + 1);
  }
}

/**
 * Check comment rate: verified = 1 per N sec + daily cap; unverified = 1 comment per day.
 * Returns snake_case keys (retry_after_seconds, daily_remaining) for API consistency.
 */
export function checkCommentRate(agentId: string, isClaimed: boolean): {
  ok: boolean;
  retry_after_seconds?: number;
  daily_remaining?: number;
} {
  const last = lastCommentTime.get(agentId);
  const cooldownMs = COMMENT_COOLDOWN_SECONDS * 1000;
  if (last != null && Date.now() - last < cooldownMs) {
    return {
      ok: false,
      retry_after_seconds: Math.ceil((last + cooldownMs - Date.now()) / 1000),
    };
  }
  const dayKey = `${agentId}_${new Date().toISOString().slice(0, 10)}`;
  const count = commentCountByDay.get(dayKey) ?? 0;
  const dailyLimit = isClaimed ? COMMENTS_PER_DAY : UNVERIFIED_COMMENTS_PER_DAY;
  if (count >= dailyLimit) {
    return { ok: false, daily_remaining: 0 };
  }
  return { ok: true, daily_remaining: dailyLimit - count };
}

/**
 * Record that this agent just commented. Call after a successful comment.
 */
export function recordComment(agentId: string): void {
  lastCommentTime.set(agentId, Date.now());
  const dayKey = `${agentId}_${new Date().toISOString().slice(0, 10)}`;
  commentCountByDay.set(dayKey, (commentCountByDay.get(dayKey) ?? 0) + 1);
}

export const rateLimitConfig = {
  requestsPerMinute: REQUESTS_PER_MINUTE,
  postCooldownMinutes: POST_COOLDOWN_MINUTES,
  commentCooldownSeconds: COMMENT_COOLDOWN_SECONDS,
  commentsPerDay: COMMENTS_PER_DAY,
  unverifiedPostsPerDay: UNVERIFIED_POSTS_PER_DAY,
  unverifiedCommentsPerDay: UNVERIFIED_COMMENTS_PER_DAY,
};
