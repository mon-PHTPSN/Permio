import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashProtocolIdentifier } from "../src/canonical.ts";
import {
  readFinalizedDecisionReceipt, runtimeDecisionReceiptId, validateRuntimeDecisionReceiptBody,
  type RuntimeDecisionReceiptBody, type FinalizedDecisionReceiptObservation,
} from "../src/decision-receipt.ts";
import type { Hex32 } from "../src/model.ts";

const bytes = (value: number) => new Uint8Array(32).fill(value);
const hex = (value: Uint8Array): Hex32 => `0x${Buffer.from(value).toString("hex")}`;
function fixture(transitioning = true) {
  const version = { major: 1n, minor: 0n, patch: 0n };
  const body: RuntimeDecisionReceiptBody = {
    receiptVersion: 1n, moduleIdentity: { moduleIdHash: bytes(1), moduleVersion: version, implementationHash: bytes(2) },
    target: { namespaceHash: bytes(3), templateIdHash: bytes(4), semanticVersion: version, templateContentHash: bytes(5) },
    instanceCommitment: bytes(6), transitioning, previousStateCommitment: bytes(transitioning ? 7 : 0),
    nextStateCommitment: bytes(transitioning ? 8 : 0), transitionSequence: transitioning ? 9n : 0n,
    contextHash: bytes(10), actionSchemaId: bytes(11), purposeHash: bytes(12), recipient: bytes(13),
    validAfter: 100n, validBefore: 200n, scopedNullifier: bytes(14), outputCommitment: bytes(15),
    sourceNetwork: Uint8Array.from(Buffer.from(hashProtocolIdentifier("network-id", "preprod").slice(2), "hex")),
    sourceContract: bytes(16),
  };
  const expected = { network: "preprod" as const, contract: hex(body.sourceContract),
    transactionId: "00" + "17".repeat(32), receiptId: runtimeDecisionReceiptId(body) };
  const observation: FinalizedDecisionReceiptObservation = {
    network: "preprod", contract: expected.contract, transactionId: expected.transactionId,
    ledgerSequence: 123n, finalized: true, transactionSucceeded: true,
    receiptIdFromCall: expected.receiptId, bodyAtTransaction: body,
  };
  return { body, expected, observation,
    read: (value = observation) => readFinalizedDecisionReceipt({ readReceiptAtTransaction: async () => value }, expected) };
}

describe("common decision receipt integrity and source boundary", () => {
  it("requires exact finality and transaction provenance and emits only versioned public fields", async () => {
    const f = fixture();
    const receipt = await f.read();
    assert.equal(receipt.receiptId, f.expected.receiptId);
    assert.equal(receipt.sourceTransaction.length, 66);
    assert.equal(receipt.sourceLedgerSequence, "123");
    assert.equal(receipt.transitionSequence, "9");
    assert.equal(receipt.previousStateCommitment, hex(f.body.previousStateCommitment));
    assert(Object.isFrozen(receipt));
    assert.equal(Object.keys(receipt).length, 25);
    assert.doesNotThrow(() => JSON.stringify(receipt));
    for (const field of ["session", "account", "signature", "evidence", "record", "stateIdHash", "nonceHash"]) {
      assert.equal(field in receipt, false);
    }
  });
  it("uses canonical absent state fields for a non-transitioning action", async () => {
    const f = fixture(false), receipt = await f.read();
    assert.equal(receipt.previousStateCommitment, null);
    assert.equal(receipt.nextStateCommitment, null);
    assert.equal(receipt.transitionSequence, null);
    for (const field of ["previousStateCommitment", "nextStateCommitment"] as const) {
      assert.throws(() => validateRuntimeDecisionReceiptBody({ ...f.body, [field]: bytes(1) }), /omit state/);
    }
    assert.throws(() => validateRuntimeDecisionReceiptBody({ ...f.body, transitionSequence: 1n }), /omit state/);
  });
  it("rejects pending, failed, foreign, substituted and latest-state observations", async () => {
    const f = fixture();
    for (const change of [
      { finalized: false }, { transactionSucceeded: false }, { network: "undeployed" },
      { contract: hex(bytes(18)) }, { transactionId: "00" + "18".repeat(32) },
      { receiptIdFromCall: hex(bytes(19)) }, { ledgerSequence: 0n },
      { bodyAtTransaction: { ...f.body, outputCommitment: bytes(20) } },
      { bodyAtTransaction: { ...f.body, sourceContract: bytes(20) } },
    ]) await assert.rejects(f.read({ ...f.observation, ...change }));
    await assert.rejects(readFinalizedDecisionReceipt({ readReceiptAtTransaction: async () => {
      throw new Error("indexer unavailable");
    } }, f.expected), /indexer unavailable/);
  });
  it("rejects extra private data, malformed layouts, unsupported versions and noncanonical integers", () => {
    const f = fixture();
    for (const change of [
      { privateEvidence: "private-canary-never-export" }, { receiptVersion: 2n }, { transitioning: 1 },
      { scopedNullifier: bytes(0) }, { outputCommitment: new Uint8Array(31) },
      { transitionSequence: 2n ** 64n }, { validAfter: 200n }, { validBefore: Number.MAX_SAFE_INTEGER },
      { nextStateCommitment: f.body.previousStateCommitment },
      { moduleIdentity: { ...f.body.moduleIdentity, secretKey: bytes(21) } },
      { target: { ...f.body.target, semanticVersion: { major: 1, minor: 0n, patch: 0n } } },
    ]) assert.throws(() => validateRuntimeDecisionReceiptBody({ ...f.body, ...change }));
  });
  it("binds every schema field and target/version to the typed commitment", () => {
    const f = fixture();
    for (const field of ["instanceCommitment", "contextHash", "actionSchemaId", "purposeHash", "recipient",
      "scopedNullifier", "outputCommitment", "sourceNetwork", "sourceContract"] as const) {
      assert.notEqual(runtimeDecisionReceiptId({ ...f.body, [field]: bytes(22) }), f.expected.receiptId);
    }
    assert.notEqual(runtimeDecisionReceiptId({ ...f.body, validBefore: 201n }), f.expected.receiptId);
    assert.notEqual(runtimeDecisionReceiptId({ ...f.body, moduleIdentity: { ...f.body.moduleIdentity,
      moduleVersion: { major: 2n, minor: 0n, patch: 0n } } }), f.expected.receiptId);
    assert.notEqual(runtimeDecisionReceiptId({ ...f.body, target: { ...f.body.target,
      templateContentHash: bytes(22) } }), f.expected.receiptId);
  });
  it("rejects a 32-byte hash where the pinned SDK uses a 33-byte transaction identifier", async () => {
    const f = fixture();
    let reads = 0;
    await assert.rejects(readFinalizedDecisionReceipt({ readReceiptAtTransaction: async () => {
      reads++; return f.observation;
    } }, { ...f.expected, transactionId: "17".repeat(32) }), /exact network/);
    assert.equal(reads, 0);
  });
  it("pins the requested source before awaiting an indexer read", async () => {
    const f = fixture(), request = { ...f.expected };
    const receipt = await readFinalizedDecisionReceipt({ readReceiptAtTransaction: async transactionId => {
      request.transactionId = "00" + "99".repeat(32);
      request.contract = hex(bytes(99));
      assert.equal(transactionId, f.expected.transactionId);
      return f.observation;
    } }, request);
    assert.equal(receipt.sourceTransaction, f.expected.transactionId);
    assert.equal(receipt.sourceContract, f.expected.contract);
  });
});
