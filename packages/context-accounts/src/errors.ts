export const CONTEXT_AUTHORIZATION_ERROR_CODES = [
  "INVALID_INPUT",
  "UNKNOWN_INSTANCE",
  "UNKNOWN_CONTEXT",
  "UNKNOWN_ACCOUNT",
  "UNKNOWN_GRANT",
  "UNAUTHORIZED",
  "TARGET_MISMATCH",
  "VERSION_CONFLICT",
  "DUPLICATE_ID",
  "INVALID_SCOPE",
  "ATTENUATION_VIOLATION",
  "DELEGATION_DEPTH_EXCEEDED",
  "INVALID_TIME",
  "REVOKED",
] as const;

export type ContextAuthorizationErrorCode =
  (typeof CONTEXT_AUTHORIZATION_ERROR_CODES)[number];

export class ContextAuthorizationError extends Error {
  readonly code: ContextAuthorizationErrorCode;

  constructor(code: ContextAuthorizationErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = "ContextAuthorizationError";
    this.code = code;
  }
}
