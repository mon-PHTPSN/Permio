import { getAddress, isAddress, isHex, keccak256, size, type Hex } from "viem";

import { GatewayError } from "./errors.ts";
import type {
  AllowlistedGatewaySource,
  MidnightSourceEventIdentity,
  ObservedPublicReceipt,
} from "./model.ts";

const SOURCE_FIELDS = [
  "networkId",
  "contractId",
  "transactionId",
  "eventIndex",
  "ledgerSequence",
] as const;

const RECEIPT_FIELDS = [
  "receiptVersion",
  "scopedNullifier",
  "encodedReceipt",
  "receiptHash",
] as const;

const MAX_IDENTIFIER_LENGTH = 256;
const UINT32_MAX = 0xffff_ffff;
const PRINTABLE_IDENTIFIER = /^[\x21-\x7e]+$/;

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new GatewayError("INVALID_INPUT", `${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function assertExactFields(
  value: Record<string, unknown>,
  fields: readonly string[],
  label: string,
): void {
  const expected = new Set(fields);
  const actual = Object.keys(value);
  if (
    actual.length !== fields.length ||
    actual.some((field) => !expected.has(field))
  ) {
    throw new GatewayError(
      "INVALID_INPUT",
      `${label} must contain only the versioned public fields`,
    );
  }
}

function identifier(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_IDENTIFIER_LENGTH ||
    !PRINTABLE_IDENTIFIER.test(value)
  ) {
    throw new GatewayError(
      "INVALID_INPUT",
      `${label} must be a non-empty printable protocol identifier`,
    );
  }
  return value;
}

function bytes32(value: unknown, label: string): Hex {
  if (typeof value !== "string" || !isHex(value, { strict: true }) || size(value) !== 32) {
    throw new GatewayError("INVALID_INPUT", `${label} must be exactly 32 bytes`);
  }
  return value;
}

function encodedBytes(value: unknown): Hex {
  if (
    typeof value !== "string" ||
    !isHex(value, { strict: true }) ||
    value === "0x"
  ) {
    throw new GatewayError(
      "INVALID_INPUT",
      "encodedReceipt must contain non-empty bytes",
    );
  }
  return value;
}

export function parseMidnightSourceEventIdentity(
  value: unknown,
): MidnightSourceEventIdentity {
  const input = record(value, "source identity");
  assertExactFields(input, SOURCE_FIELDS, "source identity");
  if (
    !Number.isSafeInteger(input.eventIndex) ||
    (input.eventIndex as number) < 0 ||
    (input.eventIndex as number) > UINT32_MAX
  ) {
    throw new GatewayError(
      "INVALID_INPUT",
      "eventIndex must be an unsigned 32-bit integer",
    );
  }
  if (typeof input.ledgerSequence !== "bigint" || input.ledgerSequence < 0n) {
    throw new GatewayError(
      "INVALID_INPUT",
      "ledgerSequence must be a non-negative bigint",
    );
  }
  return {
    networkId: identifier(input.networkId, "networkId"),
    contractId: identifier(input.contractId, "contractId"),
    transactionId: identifier(input.transactionId, "transactionId"),
    eventIndex: input.eventIndex as number,
    ledgerSequence: input.ledgerSequence,
  };
}

export function parseObservedPublicReceipt(
  value: unknown,
): ObservedPublicReceipt {
  const input = record(value, "observed receipt");
  assertExactFields(input, RECEIPT_FIELDS, "observed receipt");
  const encodedReceipt = encodedBytes(input.encodedReceipt);
  const receiptHash = bytes32(input.receiptHash, "receiptHash");
  if (keccak256(encodedReceipt) !== receiptHash) {
    throw new GatewayError(
      "RECEIPT_HASH_MISMATCH",
      "receiptHash does not match the exact encoded receipt bytes",
    );
  }
  return {
    receiptVersion: identifier(input.receiptVersion, "receiptVersion"),
    scopedNullifier: bytes32(input.scopedNullifier, "scopedNullifier"),
    encodedReceipt,
    receiptHash,
  };
}

export function assertAllowlistedGatewaySource(
  source: MidnightSourceEventIdentity,
  receiptVersion: string,
  allowlist: readonly AllowlistedGatewaySource[],
): void {
  const matched = allowlist.some(
    (candidate) =>
      candidate.networkId === source.networkId &&
      candidate.contractId === source.contractId &&
      candidate.receiptVersions.includes(receiptVersion),
  );
  if (!matched) {
    throw new GatewayError(
      "SOURCE_NOT_ALLOWLISTED",
      "source network, contract, and receipt version are not allowlisted",
    );
  }
}

export function normalizeVerifierAddress(value: unknown): `0x${string}` {
  if (typeof value !== "string" || !isAddress(value, { strict: true })) {
    throw new GatewayError(
      "INVALID_KEY_EPOCH",
      "verifier must be a valid EVM address",
    );
  }
  return getAddress(value);
}

export function assertProtocolIdentifier(value: unknown, label: string): string {
  return identifier(value, label);
}

export function assertUnixTime(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new GatewayError(
      "INVALID_KEY_EPOCH",
      `${label} must be a non-negative safe integer`,
    );
  }
  return value as number;
}
