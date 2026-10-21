import { decodeAbiParameters, encodeAbiParameters, hexToBytes, keccak256, toHex, type Hex } from "viem";
import { hashProtocolIdentifier } from "../../midnight-authorization/src/canonical.ts";
import { runtimeDecisionReceiptId, type DecisionReceipt, type RuntimeDecisionReceiptBody } from "../../midnight-authorization/src/decision-receipt.ts";
import type { GatewayTransport } from "./transport.ts";

/** M6 v1 is numeric 1, padded losslessly for the registry's version selector. */
export const M6_RECEIPT_V1 = toHex(1n, { size: 32 });
export const M6_RECEIPT_V1_FIELDS = [
  { name: "receiptId", type: "bytes32" }, { name: "receiptVersion", type: "bytes32" },
  { name: "proofModuleId", type: "bytes32" }, { name: "proofModuleVersion", type: "string" },
  { name: "proofModuleImplementationHash", type: "bytes32" }, { name: "namespaceHash", type: "bytes32" },
  { name: "templateIdHash", type: "bytes32" }, { name: "templateVersion", type: "string" },
  { name: "templateContentHash", type: "bytes32" }, { name: "instanceCommitment", type: "bytes32" },
  { name: "previousStateCommitment", type: "bytes32" }, { name: "nextStateCommitment", type: "bytes32" },
  { name: "transitionSequence", type: "uint64" }, { name: "contextHash", type: "bytes32" },
  { name: "actionSchemaId", type: "bytes32" }, { name: "purposeHash", type: "bytes32" },
  { name: "recipient", type: "bytes32" }, { name: "validAfter", type: "uint64" },
  { name: "validBefore", type: "uint64" }, { name: "scopedNullifier", type: "bytes32" },
  { name: "outputCommitment", type: "bytes32" }, { name: "sourceNetwork", type: "bytes32" },
  { name: "sourceNetworkName", type: "string" }, { name: "sourceContract", type: "bytes32" },
  { name: "sourceTransaction", type: "bytes" }, { name: "sourceLedgerSequence", type: "uint64" },
] as const;
const ABI = [{ type: "tuple", components: M6_RECEIPT_V1_FIELDS }] as const;
const PUBLIC_FIELDS = ["receiptVersion", "receiptId", "proofModuleId", "proofModuleVersion", "implementationHash", "namespaceHash", "templateIdHash", "semanticVersion", "templateContentHash", "instanceCommitment", "previousStateCommitment", "nextStateCommitment", "transitionSequence", "contextHash", "actionSchemaId", "purposeHash", "recipient", "validAfter", "validBefore", "scopedNullifier", "outputCommitment", "sourceNetwork", "sourceContract", "sourceTransaction", "sourceLedgerSequence"];
const ZERO = toHex(0n, { size: 32 });
const invalid = (): never => { throw new TypeError("INVALID_M6_RECEIPT"); };
function uint64(value: string): bigint {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) invalid();
  const result = BigInt(value); if (result >= 2n ** 64n) invalid(); return result;
}
function version(value: string) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(value)) invalid();
  const [major, minor, patch] = value.split(".").map(uint64);
  return { major: major!, minor: minor!, patch: patch! };
}
function bytes(value: Hex): Uint8Array {
  if (typeof value !== "string" || !/^0x[0-9a-f]{64}$/.test(value)) invalid();
  return hexToBytes(value);
}
function validateStructuralReceipt(receipt: DecisionReceipt): void {
  if (!receipt || Object.keys(receipt).length !== PUBLIC_FIELDS.length || PUBLIC_FIELDS.some(key => !(key in receipt)) || receipt.receiptVersion !== 1 ||
      !["preprod", "undeployed"].includes(receipt.sourceNetwork) || !/^[0-9a-f]{66}$/.test(receipt.sourceTransaction)) invalid();
  const absent = receipt.previousStateCommitment === null && receipt.nextStateCommitment === null && receipt.transitionSequence === null;
  if (!absent && (receipt.previousStateCommitment === null || receipt.nextStateCommitment === null || receipt.transitionSequence === null)) invalid();
  const body: RuntimeDecisionReceiptBody = {
    receiptVersion: 1n,
    moduleIdentity: { moduleIdHash: bytes(receipt.proofModuleId), moduleVersion: version(receipt.proofModuleVersion), implementationHash: bytes(receipt.implementationHash) },
    target: { namespaceHash: bytes(receipt.namespaceHash), templateIdHash: bytes(receipt.templateIdHash), semanticVersion: version(receipt.semanticVersion), templateContentHash: bytes(receipt.templateContentHash) },
    instanceCommitment: bytes(receipt.instanceCommitment), transitioning: !absent,
    previousStateCommitment: bytes(receipt.previousStateCommitment ?? ZERO), nextStateCommitment: bytes(receipt.nextStateCommitment ?? ZERO), transitionSequence: uint64(receipt.transitionSequence ?? "0"),
    contextHash: bytes(receipt.contextHash), actionSchemaId: bytes(receipt.actionSchemaId), purposeHash: bytes(receipt.purposeHash), recipient: bytes(receipt.recipient),
    validAfter: uint64(receipt.validAfter), validBefore: uint64(receipt.validBefore), scopedNullifier: bytes(receipt.scopedNullifier), outputCommitment: bytes(receipt.outputCommitment),
    sourceNetwork: bytes(hashProtocolIdentifier("network-id", receipt.sourceNetwork)), sourceContract: bytes(receipt.sourceContract),
  };
  if (uint64(receipt.sourceLedgerSequence) === 0n || runtimeDecisionReceiptId(body) !== receipt.receiptId) invalid();
}

export function encodeM6ReceiptV1(receipt: DecisionReceipt): Hex {
  try {
    validateStructuralReceipt(receipt);
    return encodeAbiParameters(ABI, [{ receiptId: receipt.receiptId, receiptVersion: M6_RECEIPT_V1,
      proofModuleId: receipt.proofModuleId, proofModuleVersion: receipt.proofModuleVersion, proofModuleImplementationHash: receipt.implementationHash,
      namespaceHash: receipt.namespaceHash, templateIdHash: receipt.templateIdHash, templateVersion: receipt.semanticVersion, templateContentHash: receipt.templateContentHash,
      instanceCommitment: receipt.instanceCommitment, previousStateCommitment: receipt.previousStateCommitment ?? ZERO, nextStateCommitment: receipt.nextStateCommitment ?? ZERO,
      transitionSequence: BigInt(receipt.transitionSequence ?? "0"), contextHash: receipt.contextHash, actionSchemaId: receipt.actionSchemaId, purposeHash: receipt.purposeHash,
      recipient: receipt.recipient, validAfter: BigInt(receipt.validAfter), validBefore: BigInt(receipt.validBefore), scopedNullifier: receipt.scopedNullifier, outputCommitment: receipt.outputCommitment,
      sourceNetwork: hashProtocolIdentifier("network-id", receipt.sourceNetwork), sourceNetworkName: receipt.sourceNetwork, sourceContract: receipt.sourceContract,
      sourceTransaction: `0x${receipt.sourceTransaction}`, sourceLedgerSequence: BigInt(receipt.sourceLedgerSequence) }]);
  } catch { return invalid(); }
}

export function decodeM6ReceiptV1(encoded: Hex): DecisionReceipt {
  try {
    const [wire] = decodeAbiParameters(ABI, encoded);
    if (wire.receiptVersion !== M6_RECEIPT_V1 || wire.sourceNetwork !== hashProtocolIdentifier("network-id", wire.sourceNetworkName)) invalid();
    const absent = wire.previousStateCommitment === ZERO && wire.nextStateCommitment === ZERO && wire.transitionSequence === 0n;
    const receipt: DecisionReceipt = Object.freeze({ receiptVersion: 1, receiptId: wire.receiptId,
      proofModuleId: wire.proofModuleId, proofModuleVersion: wire.proofModuleVersion, implementationHash: wire.proofModuleImplementationHash,
      namespaceHash: wire.namespaceHash, templateIdHash: wire.templateIdHash, semanticVersion: wire.templateVersion, templateContentHash: wire.templateContentHash,
      instanceCommitment: wire.instanceCommitment, previousStateCommitment: absent ? null : wire.previousStateCommitment, nextStateCommitment: absent ? null : wire.nextStateCommitment,
      transitionSequence: absent ? null : String(wire.transitionSequence), contextHash: wire.contextHash, actionSchemaId: wire.actionSchemaId, purposeHash: wire.purposeHash,
      recipient: wire.recipient, validAfter: String(wire.validAfter), validBefore: String(wire.validBefore), scopedNullifier: wire.scopedNullifier, outputCommitment: wire.outputCommitment,
      sourceNetwork: wire.sourceNetworkName, sourceContract: wire.sourceContract, sourceTransaction: wire.sourceTransaction.slice(2), sourceLedgerSequence: String(wire.sourceLedgerSequence) });
    if (encodeM6ReceiptV1(receipt) !== encoded) invalid();
    return receipt;
  } catch { return invalid(); }
}

/** Source event zero is the only receipt-producing call supported by M6 v1. */
export function m6SourceIdentityHash(receipt: DecisionReceipt): Hex {
  return keccak256(encodeAbiParameters([{ type: "string" }, { type: "bytes32" }, { type: "bytes" }, { type: "uint32" }, { type: "uint64" }],
    [receipt.sourceNetwork, receipt.sourceContract, `0x${receipt.sourceTransaction}`, 0, uint64(receipt.sourceLedgerSequence)]));
}

/** Exact verifier metadata; receipt bytes are supplied separately to registerReceipt. */
export function encodeM6GatewaySignature(packet: GatewayTransport): Hex {
  const receipt = decodeM6ReceiptV1(packet.encodedReceipt);
  if (packet.receiptHash !== keccak256(packet.encodedReceipt) || packet.sourceIdentityHash !== m6SourceIdentityHash(receipt)) invalid();
  return encodeAbiParameters([{ type: "bytes32" }, { type: "bytes32" }, { type: "string" }, { type: "uint64" }, { type: "bytes" }],
    [packet.outboxKey, packet.sourceIdentityHash, packet.keyId, BigInt(packet.signedAt), packet.signature]);
}
