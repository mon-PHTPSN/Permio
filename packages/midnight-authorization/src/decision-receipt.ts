import {
  Bytes32Descriptor, CompactTypeBoolean, CompactTypeUnsignedInteger, persistentHash,
  type Alignment, type Value,
} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { hashProtocolIdentifier } from "./canonical.ts";
import type { Hex32 } from "./model.ts";

type Version = { major: bigint; minor: bigint; patch: bigint };
export interface RuntimeDecisionReceiptBody {
  receiptVersion: bigint;
  moduleIdentity: { moduleIdHash: Uint8Array; moduleVersion: Version; implementationHash: Uint8Array };
  target: { namespaceHash: Uint8Array; templateIdHash: Uint8Array; semanticVersion: Version;
    templateContentHash: Uint8Array };
  instanceCommitment: Uint8Array;
  transitioning: boolean;
  previousStateCommitment: Uint8Array;
  nextStateCommitment: Uint8Array;
  transitionSequence: bigint;
  contextHash: Uint8Array;
  actionSchemaId: Uint8Array;
  purposeHash: Uint8Array;
  recipient: Uint8Array;
  validAfter: bigint;
  validBefore: bigint;
  scopedNullifier: Uint8Array;
  outputCommitment: Uint8Array;
  sourceNetwork: Uint8Array;
  sourceContract: Uint8Array;
}

export interface DecisionReceipt {
  readonly receiptVersion: 1;
  readonly receiptId: Hex32;
  readonly proofModuleId: Hex32;
  readonly proofModuleVersion: string;
  readonly implementationHash: Hex32;
  readonly namespaceHash: Hex32;
  readonly templateIdHash: Hex32;
  readonly semanticVersion: string;
  readonly templateContentHash: Hex32;
  readonly instanceCommitment: Hex32;
  readonly previousStateCommitment: Hex32 | null;
  readonly nextStateCommitment: Hex32 | null;
  readonly transitionSequence: string | null;
  readonly contextHash: Hex32;
  readonly actionSchemaId: Hex32;
  readonly purposeHash: Hex32;
  readonly recipient: Hex32;
  readonly validAfter: string;
  readonly validBefore: string;
  readonly scopedNullifier: Hex32;
  readonly outputCommitment: Hex32;
  readonly sourceNetwork: string;
  readonly sourceContract: Hex32;
  readonly sourceTransaction: string;
  readonly sourceLedgerSequence: string;
}

interface Descriptor<T = unknown> {
  alignment(): Alignment;
  toValue(value: T): Value;
  fromValue(value: Value): T;
}
function struct<T>(fields: readonly (readonly [string, Descriptor<any>])[]): Descriptor<T> {
  return { alignment: () => fields.flatMap(([, field]) => field.alignment()),
    toValue: (value) => fields.flatMap(([name, field]) => field.toValue((value as Record<string, unknown>)[name])),
    fromValue: (value) => Object.fromEntries(fields.map(([name, field]) => [name, field.fromValue(value)])) as T };
}
const uint16 = new CompactTypeUnsignedInteger(65535n, 2);
const uint64 = new CompactTypeUnsignedInteger(2n ** 64n - 1n, 8);
const versionDescriptor = struct<Version>([["major", uint64], ["minor", uint64], ["patch", uint64]]);
const identityDescriptor = struct([
  ["moduleIdHash", Bytes32Descriptor], ["moduleVersion", versionDescriptor], ["implementationHash", Bytes32Descriptor],
]);
const targetDescriptor = struct([
  ["namespaceHash", Bytes32Descriptor], ["templateIdHash", Bytes32Descriptor],
  ["semanticVersion", versionDescriptor], ["templateContentHash", Bytes32Descriptor],
]);
const descriptor = struct<RuntimeDecisionReceiptBody>([
  ["receiptVersion", uint16], ["moduleIdentity", identityDescriptor], ["target", targetDescriptor],
  ["instanceCommitment", Bytes32Descriptor], ["transitioning", CompactTypeBoolean],
  ["previousStateCommitment", Bytes32Descriptor], ["nextStateCommitment", Bytes32Descriptor],
  ["transitionSequence", uint64], ["contextHash", Bytes32Descriptor], ["actionSchemaId", Bytes32Descriptor],
  ["purposeHash", Bytes32Descriptor], ["recipient", Bytes32Descriptor], ["validAfter", uint64],
  ["validBefore", uint64], ["scopedNullifier", Bytes32Descriptor], ["outputCommitment", Bytes32Descriptor],
  ["sourceNetwork", Bytes32Descriptor], ["sourceContract", Bytes32Descriptor],
]);

function object(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key))) {
    throw new TypeError("Decision receipt has missing or unsupported public fields");
  }
}
function integer(value: unknown): asserts value is bigint {
  if (typeof value !== "bigint" || value < 0n || value >= 2n ** 64n) {
    throw new TypeError("Decision receipt requires exact unsigned 64-bit integers");
  }
}
function bytes(value: unknown, allowZero = false): asserts value is Uint8Array {
  if (!(value instanceof Uint8Array) || value.length !== 32 || (!allowZero && value.every(byte => byte === 0))) {
    throw new TypeError("Decision receipt requires exact nonzero 32-byte fields");
  }
}
function version(value: unknown): asserts value is Version {
  object(value, ["major", "minor", "patch"]);
  Object.values(value).forEach(integer);
}
const BODY_KEYS = ["receiptVersion", "moduleIdentity", "target", "instanceCommitment", "transitioning",
  "previousStateCommitment", "nextStateCommitment", "transitionSequence", "contextHash", "actionSchemaId",
  "purposeHash", "recipient", "validAfter", "validBefore", "scopedNullifier", "outputCommitment",
  "sourceNetwork", "sourceContract"] as const;

/** Structural/integrity validation only; does not establish authorization or finality. */
export function validateRuntimeDecisionReceiptBody(value: unknown): asserts value is RuntimeDecisionReceiptBody {
  object(value, BODY_KEYS);
  if (value.receiptVersion !== 1n || typeof value.transitioning !== "boolean") {
    throw new TypeError("Unsupported decision receipt version or transition discriminator");
  }
  object(value.moduleIdentity, ["moduleIdHash", "moduleVersion", "implementationHash"]);
  bytes(value.moduleIdentity.moduleIdHash); bytes(value.moduleIdentity.implementationHash);
  version(value.moduleIdentity.moduleVersion);
  object(value.target, ["namespaceHash", "templateIdHash", "semanticVersion", "templateContentHash"]);
  for (const key of ["namespaceHash", "templateIdHash", "templateContentHash"]) bytes(value.target[key]);
  version(value.target.semanticVersion);
  for (const key of ["instanceCommitment", "contextHash", "actionSchemaId", "purposeHash", "recipient",
    "scopedNullifier", "outputCommitment", "sourceNetwork", "sourceContract"]) bytes(value[key]);
  for (const key of ["transitionSequence", "validAfter", "validBefore"]) integer(value[key]);
  if ((value.validAfter as bigint) >= (value.validBefore as bigint)) throw new TypeError("Invalid decision receipt validity window");
  bytes(value.previousStateCommitment, !value.transitioning);
  bytes(value.nextStateCommitment, !value.transitioning);
  if (value.transitioning) {
    if (value.transitionSequence === 0n || equal(value.previousStateCommitment, value.nextStateCommitment)) {
      throw new TypeError("Transitioning decision receipt requires a changed commitment and positive sequence");
    }
  } else if (!value.previousStateCommitment.every(byte => byte === 0) ||
      !value.nextStateCommitment.every(byte => byte === 0) || value.transitionSequence !== 0n) {
    throw new TypeError("Non-transitioning decision receipt must omit state fields canonically");
  }
}
function equal(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}
function hex(value: Uint8Array): Hex32 { return `0x${Buffer.from(value).toString("hex")}`; }
function stringVersion(value: Version): string { return `${value.major}.${value.minor}.${value.patch}`; }

/** Exact Compact typed commitment, cross-checked against generated code. */
export function runtimeDecisionReceiptId(body: RuntimeDecisionReceiptBody): Hex32 {
  validateRuntimeDecisionReceiptBody(body);
  return hex(persistentHash(descriptor, body));
}

/** Exact public cell encoding for reconciling the v9 receipt insertion transcript. */
export function runtimeDecisionReceiptAlignedValue(body: RuntimeDecisionReceiptBody) {
  validateRuntimeDecisionReceiptBody(body);
  return { value: descriptor.toValue(body), alignment: descriptor.alignment() };
}

export interface FinalizedDecisionReceiptObservation {
  readonly network: string;
  readonly contract: Hex32;
  readonly transactionId: string;
  readonly ledgerSequence: bigint;
  readonly finalized: boolean;
  readonly transactionSucceeded: boolean;
  /** Adapter must read this receipt from the named transaction, not latest state. */
  readonly receiptIdFromCall: Hex32;
  readonly bodyAtTransaction: unknown;
}
export interface DecisionReceiptSourceReader {
  /** Authenticated indexer adapter; arbitrary caller-supplied JSON is not evidence. */
  readReceiptAtTransaction(transactionId: string): Promise<FinalizedDecisionReceiptObservation>;
}

/** Add provenance only after an adapter reconciles the exact finalized call. */
export async function readFinalizedDecisionReceipt(
  reader: DecisionReceiptSourceReader,
  request: { readonly network: "preprod" | "undeployed"; readonly contract: Hex32;
    readonly transactionId: string; readonly receiptId: Hex32 },
): Promise<DecisionReceipt> {
  object(request, ["network", "contract", "transactionId", "receiptId"]);
  const expected = Object.freeze({ ...request });
  if (!["preprod", "undeployed"].includes(expected.network) || !/^0x[0-9a-f]{64}$/.test(expected.contract) ||
      !/^[0-9a-f]{66}$/.test(expected.transactionId) || !/^0x[0-9a-f]{64}$/.test(expected.receiptId)) {
    throw new TypeError("Decision receipt source requires an exact network, deployment, transaction and receipt");
  }
  const observed = await reader.readReceiptAtTransaction(expected.transactionId);
  if (!observed || observed.finalized !== true || observed.transactionSucceeded !== true ||
      observed.network !== expected.network || observed.contract !== expected.contract ||
      observed.transactionId !== expected.transactionId || observed.receiptIdFromCall !== expected.receiptId) {
    throw new Error("Decision receipt is not from the exact successful finalized call");
  }
  integer(observed.ledgerSequence);
  if (observed.ledgerSequence === 0n) throw new TypeError("Decision receipt source requires a positive ledger sequence");
  validateRuntimeDecisionReceiptBody(observed.bodyAtTransaction);
  const body = observed.bodyAtTransaction;
  if (hex(body.sourceNetwork) !== hashProtocolIdentifier("network-id", expected.network) ||
      hex(body.sourceContract) !== expected.contract || runtimeDecisionReceiptId(body) !== expected.receiptId) {
    throw new Error("Decision receipt body does not match its exact source or typed commitment");
  }
  // Whitelist fields; never spread an indexer response, command or private witness.
  return Object.freeze({ receiptVersion: 1, receiptId: expected.receiptId,
    proofModuleId: hex(body.moduleIdentity.moduleIdHash), proofModuleVersion: stringVersion(body.moduleIdentity.moduleVersion),
    implementationHash: hex(body.moduleIdentity.implementationHash), namespaceHash: hex(body.target.namespaceHash),
    templateIdHash: hex(body.target.templateIdHash), semanticVersion: stringVersion(body.target.semanticVersion),
    templateContentHash: hex(body.target.templateContentHash), instanceCommitment: hex(body.instanceCommitment),
    previousStateCommitment: body.transitioning ? hex(body.previousStateCommitment) : null,
    nextStateCommitment: body.transitioning ? hex(body.nextStateCommitment) : null,
    transitionSequence: body.transitioning ? String(body.transitionSequence) : null,
    contextHash: hex(body.contextHash), actionSchemaId: hex(body.actionSchemaId), purposeHash: hex(body.purposeHash),
    recipient: hex(body.recipient), validAfter: String(body.validAfter), validBefore: String(body.validBefore),
    scopedNullifier: hex(body.scopedNullifier), outputCommitment: hex(body.outputCommitment),
    sourceNetwork: observed.network, sourceContract: observed.contract, sourceTransaction: observed.transactionId,
    sourceLedgerSequence: String(observed.ledgerSequence) });
}
