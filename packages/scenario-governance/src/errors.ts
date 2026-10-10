export const GOVERNANCE_ERROR_CODES = [
  "INVALID_POLICY",
  "UNKNOWN_NAMESPACE",
  "UNAUTHORIZED",
  "VERSION_CONFLICT",
  "UNKNOWN_TEMPLATE",
  "TARGET_MISMATCH",
  "INVALID_TRANSITION",
  "INVALID_REPORT",
  "INVALID_ATTESTATION",
  "INELIGIBLE_REVIEWER",
  "DUPLICATE_REVIEW",
  "REVIEW_REJECTED",
  "THRESHOLD_NOT_MET",
  "NOT_ACTIVE",
  "RETIRED",
  "REVOKED",
  "REQUEST_CONFLICT",
  "INVALID_TIME",
] as const;

export type GovernanceErrorCode = (typeof GOVERNANCE_ERROR_CODES)[number];

export class GovernanceError extends Error {
  readonly code: GovernanceErrorCode;

  constructor(code: GovernanceErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = "GovernanceError";
    this.code = code;
  }
}
