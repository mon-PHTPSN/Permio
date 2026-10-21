export const GATEWAY_ERROR_CODES = [
  "INVALID_INPUT",
  "SOURCE_NOT_ALLOWLISTED",
  "RECEIPT_HASH_MISMATCH",
  "INVALID_KEY_EPOCH",
  "NO_ACTIVE_SIGNING_KEY",
] as const;

export type GatewayErrorCode = (typeof GATEWAY_ERROR_CODES)[number];

export class GatewayError extends Error {
  readonly code: GatewayErrorCode;

  constructor(code: GatewayErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = "GatewayError";
    this.code = code;
  }
}
