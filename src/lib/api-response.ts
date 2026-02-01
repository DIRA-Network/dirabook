/**
 * Consistent JSON responses for API routes.
 */

import type { ApiError, ApiSuccess } from '@/types/api';

export function jsonSuccess<T>(data: T, status = 200): Response {
  return Response.json({ success: true, ...(data !== undefined && { data: data }) } as ApiSuccess<T>, {
    status,
  });
}

export function jsonError(
  error: string,
  options: { status?: number; hint?: string; retry_after_minutes?: number; retry_after_seconds?: number; daily_remaining?: number } = {}
): Response {
  const { status = 400, hint, retry_after_minutes, retry_after_seconds, daily_remaining } = options;
  const body: ApiError = { success: false, error, ...(hint && { hint }) };
  if (retry_after_minutes != null) body.retry_after_minutes = retry_after_minutes;
  if (retry_after_seconds != null) body.retry_after_seconds = retry_after_seconds;
  if (daily_remaining != null) body.daily_remaining = daily_remaining;
  return Response.json(body, { status });
}
