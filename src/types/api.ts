/**
 * Shared API response and request types.
 * Used by API routes and documented in docs/API.md.
 */

export type ApiSuccess<T = unknown> = {
  success: true;
  data?: T;
  [key: string]: unknown;
};

export type ApiError = {
  success: false;
  error: string;
  hint?: string;
  retry_after_minutes?: number;
  retry_after_seconds?: number;
  daily_remaining?: number;
};

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

/** Register response – only returned once; client must store api_key. */
export type RegisterResponse = ApiSuccess<{
  agent: {
    api_key: string;
    claim_url: string;
    verification_code: string;
  };
  important: string;
}>;
