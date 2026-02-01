/**
 * X (Twitter) API helpers for claim verification.
 * Verifies a specific tweet (by URL) contains the verification code and returns the author as owner.
 *
 * Requires X API v2 access and TWITTER_BEARER_TOKEN (App-only or OAuth 2.0 Bearer).
 * Endpoint: GET /2/tweets/:id (tweet lookup).
 */

const X_API_BASE = 'https://api.twitter.com/2';

export interface TwitterVerifyResult {
  ok: boolean;
  /** X user id of the tweet author */
  userId?: string;
  /** Username of the tweet author (no @) */
  username?: string;
  /** Human-readable error */
  error?: string;
}

/**
 * Extract tweet ID from X/Twitter status URL.
 * Supports: twitter.com/username/status/123, x.com/username/status/123, twitter.com/i/status/123.
 */
export function parseTweetIdFromUrl(urlOrId: string): string | null {
  const s = urlOrId.trim();
  // Already a numeric ID (e.g. "1234567890123456789")
  if (/^\d+$/.test(s)) return s;
  // URL: .../status/123 or .../status/123?
  const match = s.match(
    /(?:twitter\.com|x\.com)\/(?:\w+\/)?status\/(\d+)/
  );
  return match ? match[1] : null;
}

/**
 * Verify a specific tweet (by URL or ID): fetch the tweet and check its text contains the verification code.
 * Owner is taken from the tweet author (no 7-day window; we verify the exact post they link).
 *
 * Returns { ok: true, userId, username } if the tweet exists and contains the code.
 * Returns { ok: false, error } otherwise.
 */
export async function verifyTweetUrlContainsCode(
  tweetUrlOrId: string,
  verificationCode: string
): Promise<TwitterVerifyResult> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN ?? process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    return { ok: false, error: 'Twitter API not configured (missing TWITTER_BEARER_TOKEN)' };
  }

  const tweetId = parseTweetIdFromUrl(tweetUrlOrId);
  if (!tweetId) {
    return { ok: false, error: 'Invalid tweet link. Use a link like https://x.com/username/status/123…' };
  }

  const url = new URL(`${X_API_BASE}/tweets/${tweetId}`);
  url.searchParams.set('expansions', 'author_id');
  url.searchParams.set('user.fields', 'id,username');
  url.searchParams.set('tweet.fields', 'text');

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { ok: false, error: `Twitter API request failed: ${msg}` };
  }

  if (!res.ok) {
    const body = await res.text();
    let error = `Twitter API error ${res.status}`;
    try {
      const j = JSON.parse(body) as { detail?: string; errors?: Array<{ message?: string }> };
      error = j.detail ?? j.errors?.[0]?.message ?? body.slice(0, 200) ?? error;
    } catch {
      if (body) error = `${error}: ${body.slice(0, 150)}`;
    }
    return { ok: false, error };
  }

  const data = (await res.json()) as {
    data?: { id: string; text: string; author_id?: string };
    includes?: { users?: Array<{ id: string; username?: string }> };
  };

  const tweet = data.data;
  if (!tweet) {
    return { ok: false, error: 'Tweet not found or unavailable' };
  }

  if (!tweet.text.includes(verificationCode)) {
    return { ok: false, error: 'That tweet does not contain the verification code' };
  }

  const users = data.includes?.users ?? [];
  const author = users.find((u) => u.id === tweet.author_id) ?? users[0];
  const authorId = tweet.author_id ?? author?.id;
  const username = author?.username ?? null;

  if (!authorId || !username) {
    return { ok: false, error: 'Could not determine tweet author' };
  }

  return {
    ok: true,
    userId: authorId,
    username,
  };
}
