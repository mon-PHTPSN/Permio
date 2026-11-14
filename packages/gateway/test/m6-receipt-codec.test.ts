import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeAbiParameters, encodeAbiParameters, keccak256 } from "viem";
import { hashProtocolIdentifier } from "../../midnight-authorization/src/canonical.ts";
import { readFinalizedDecisionReceipt, runtimeDecisionReceiptId, type RuntimeDecisionReceiptBody } from "../../midnight-authorization/src/decision-receipt.ts";
import { encodeM6ReceiptV1, decodeM6ReceiptV1, M6_RECEIPT_V1_FIELDS, m6SourceIdentityHash } from "../src/m6-receipt-codec.ts";

async function receipt(transitioning = false) {
  const bytes = (n: number) => new Uint8Array(32).fill(n);
  const body: RuntimeDecisionReceiptBody = {
    receiptVersion: 1n,
    moduleIdentity: { moduleIdHash: bytes(1), moduleVersion: { major: 18446744073709551615n, minor: 2n, patch: 3n }, implementationHash: bytes(2) },
    target: { namespaceHash: bytes(3), templateIdHash: bytes(4), semanticVersion: { major: 4n, minor: 5n, patch: 6n }, templateContentHash: bytes(5) },
    instanceCommitment: bytes(6), transitioning, previousStateCommitment: bytes(transitioning ? 7 : 0), nextStateCommitment: bytes(transitioning ? 8 : 0), transitionSequence: transitioning ? 9007199254740993n : 0n,
    contextHash: bytes(9), actionSchemaId: bytes(10), purposeHash: bytes(11), recipient: bytes(12), validAfter: 100n, validBefore: 200n,
    scopedNullifier: bytes(13), outputCommitment: bytes(14), sourceNetwork: Uint8Array.from(Buffer.from(hashProtocolIdentifier("network-id", "preprod").slice(2), "hex")), sourceContract: bytes(15),
  };
  const request = { network: "preprod" as const, contract: `0x${Buffer.from(body.sourceContract).toString("hex")}` as const, transactionId: "01" + "ab".repeat(32), receiptId: runtimeDecisionReceiptId(body) };
  return readFinalizedDecisionReceipt({ readReceiptAtTransaction: async () => ({ ...request, network: request.network, transactionId: request.transactionId, ledgerSequence: 9007199254740993n, finalized: true, transactionSucceeded: true, receiptIdFromCall: request.receiptId, bodyAtTransaction: body }) }, request);
}

for (const transitioning of [false, true]) test(`M6 ABI round trip preserves exact authoritative fields (transitioning=${transitioning})`, async () => {
  const original = await receipt(transitioning);
  const encoded = encodeM6ReceiptV1(original);
  assert.deepEqual(decodeM6ReceiptV1(encoded), original);
  assert.notEqual(original.receiptId, keccak256(encoded));
  assert.equal(original.recipient.length, 66);
  assert.equal(original.sourceTransaction.length, 66);
  assert.equal(original.proofModuleVersion, "18446744073709551615.2.3");
});

test("M6 encoding rejects truncated provenance, recipient casts and uncommitted changes", async () => {
  const original = await receipt();
  for (const changed of [ { ...original, sourceTransaction: original.sourceTransaction.slice(2) }, { ...original, recipient: `0x${original.recipient.slice(-40)}` }, { ...original, outputCommitment: original.instanceCommitment }, { ...original, proofModuleVersion: "01.2.3" }, { ...original, proofModuleVersion: "18446744073709551616.2.3" }, { ...original, transitionSequence: "0" }, { ...original, privatePayload: "excluded" } ]) {
    assert.throws(() => encodeM6ReceiptV1(changed as any), /INVALID_M6_RECEIPT/);
  }
});

test("M6 decoder rejects trailing ABI bytes, wrong source hash and state discriminator", async () => {
  const encoded = encodeM6ReceiptV1(await receipt());
  assert.throws(() => decodeM6ReceiptV1(`${encoded}00`), /INVALID_M6_RECEIPT/);
  const [wire] = decodeAbiParameters([{ type: "tuple", components: M6_RECEIPT_V1_FIELDS }], encoded);
  for (const changed of [{ ...wire, sourceNetwork: wire.sourceContract }, { ...wire, transitionSequence: 1n }, { ...wire, sourceTransaction: `0x${"00".repeat(32)}` }]) {
    assert.throws(() => decodeM6ReceiptV1(encodeAbiParameters([{ type: "tuple", components: M6_RECEIPT_V1_FIELDS }], [changed as any])), /INVALID_M6_RECEIPT/);
  }
});

test("source identity binds all 33 transaction bytes and exact ledger sequence", async () => {
  const original = await receipt();
  assert.notEqual(m6SourceIdentityHash(original), m6SourceIdentityHash({ ...original, sourceTransaction: "02" + original.sourceTransaction.slice(2) }));
  assert.notEqual(m6SourceIdentityHash(original), m6SourceIdentityHash({ ...original, sourceLedgerSequence: "9007199254740994" }));
});
