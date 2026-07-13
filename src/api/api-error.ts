/**
 * api-error.ts — generic REST error for Latch's XHR API clients.
 *
 * Carries the backend's machine-readable `code` and HTTP `status` alongside
 * the human message, so callers can branch on `code` (e.g. 'NOT_READY',
 * 'EXHAUSTED') without string-matching. Shared across api clients (pair-code,
 * multisig, …) — was historically named CosignApiError before the backend
 * cosign transport was removed.
 */
export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}
