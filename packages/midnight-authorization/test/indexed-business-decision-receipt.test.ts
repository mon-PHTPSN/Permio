import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { before, describe, it } from "node:test";
import { ChargedState, ContractState } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { getNetworkId, setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import type { PublicDataProvider } from "@midnight-ntwrk/midnight-js-types";
import { ledger as businessLedger } from "../contracts/managed/permio-authorization-v11/contract/index.js";
import { ledger as legacyLedger } from "../contracts/managed/permio-authorization/contract/index.js";
import * as readers from "../src/indexed-decision-receipt.ts";
import { runtimeDecisionReceiptId, validateRuntimeDecisionReceiptBody } from "../src/decision-receipt.ts";
import { businessActionFixture } from "./fixtures/business-action.ts";
import { ordinaryActionFixture } from "./fixtures/ordinary-action.ts";

// Actual generated Compact execution with synthetic genesis. This establishes
// codec/transcript compatibility, not native proofs, finality or live indexing.
describe("explicit v11 indexed decision receipt boundary", () => {
  let business: ReturnType<typeof businessActionFixture>;
  let accepted: ReturnType<ReturnType<typeof businessActionFixture>["execute"]>;
  let legacy: ReturnType<typeof ordinaryActionFixture>;
  let legacyAccepted: ReturnType<ReturnType<typeof ordinaryActionFixture>["execute"]>;
  before(() => {
    business = businessActionFixture(); business.finishPreparation(); business.proveBusiness(); accepted = business.execute();
    legacy = ordinaryActionFixture(); legacy.finishPreparation(); legacyAccepted = legacy.execute();
  });

  it("pins both actual generated ledger layouts without changing the public receipt schema", () => {
    const readLayout = (name: string) => JSON.parse(readFileSync(new URL(
      `../contracts/managed/${name}/compiler/contract-info.json`, import.meta.url), "utf8")).ledger;
    const oldInfo = readLayout("permio-authorization"), newInfo = readLayout("permio-authorization-v11");
    assert.deepEqual(oldInfo.find((entry: any) => entry.name === "decisionReceipts").index, [1, 13]);
    assert.deepEqual(newInfo.find((entry: any) => entry.name === "decisionReceipts").index, [1, 12]);
    assert.deepEqual(oldInfo.find((entry: any) => entry.name === "runtimeInstances").index, [1, 7]);
    assert.deepEqual(newInfo.find((entry: any) => entry.name === "runtimeInstances").index, [1, 6]);
    const receipt = business.view().decisionReceipts.lookup(accepted.result);
    assert.equal(receipt.receiptVersion, 1n);
    assert.doesNotThrow(() => validateRuntimeDecisionReceiptBody(receipt));
  });

  it("accepts the actual v11 insertion that the legacy path rejects", () => {
    const receipt = business.view().decisionReceipts.lookup(accepted.result);
    assert.throws(() => readers.assertV9DecisionReceiptInsertion(accepted.proofData.publicTranscript, receipt),
      /Exact v9 action did not prove absence and insert this receipt body/);
    assert.equal(typeof readers.assertV11DecisionReceiptInsertion, "function");
    assert.doesNotThrow(() => readers.assertV11DecisionReceiptInsertion(accepted.proofData.publicTranscript, receipt));
  });

  it("rejects missing, duplicate or substituted v11 receipt insertions", () => {
    const receipt = business.view().decisionReceipts.lookup(accepted.result), transcript = accepted.proofData.publicTranscript;
    assert.equal(typeof readers.assertV11DecisionReceiptInsertion, "function");
    assert.throws(() => readers.assertV11DecisionReceiptInsertion([], receipt), /Exact v11 action/);
    assert.throws(() => readers.assertV11DecisionReceiptInsertion([...transcript, ...transcript], receipt), /Exact v11 action/);
    assert.throws(() => readers.assertV11DecisionReceiptInsertion(transcript,
      { ...receipt, outputCommitment: new Uint8Array(32).fill(251) }), /Exact v11 action/);
  });

  it("keeps the old guard on the old path and rejects its transcript through the v11 guard", () => {
    const receipt = legacy.view().decisionReceipts.lookup(legacyAccepted.result);
    assert.doesNotThrow(() => readers.assertV9DecisionReceiptInsertion(legacyAccepted.proofData.publicTranscript, receipt));
    assert.throws(() => readers.assertV9DecisionReceiptInsertion([], receipt),
      { message: "Exact v9 action did not prove absence and insert this receipt body" });
    assert.equal(typeof readers.assertV11DecisionReceiptInsertion, "function");
    assert.throws(() => readers.assertV11DecisionReceiptInsertion(legacyAccepted.proofData.publicTranscript, receipt), /Exact v11 action/);
  });

  it("decodes the serialized generated v11 state using its own ledger and the unchanged receipt codec", () => {
    const state = new ContractState();
    state.data = business.current instanceof ChargedState ? business.current : new ChargedState(business.current);
    const decoded = ContractState.deserialize(state.serialize());
    const view = businessLedger(decoded.data), receipt = view.decisionReceipts.lookup(accepted.result);
    assert.equal(view.decisionReceipts.member(accepted.result), true);
    assert.equal(runtimeDecisionReceiptId(receipt), `0x${Buffer.from(accepted.result).toString("hex")}`);
    let recognizedByLegacy = false;
    try { recognizedByLegacy = legacyLedger(decoded.data).decisionReceipts.member(accepted.result); } catch { /* Different version layout. */ }
    assert.equal(recognizedByLegacy, false);
  });

  it("exposes an explicit reader while preserving the local indexer source boundary", () => {
    assert.equal(typeof readers.createIndexedBusinessDecisionReceiptReader, "function");
    const input = { network: "undeployed" as const, indexerUrl: "http://127.0.0.1:8088/api/v4/graphql",
      contract: `0x${"16".repeat(32)}` as const, receiptId: `0x${"17".repeat(32)}` as const,
      publicDataProvider: {} as PublicDataProvider };
    assert.equal(typeof readers.createIndexedBusinessDecisionReceiptReader(input).readReceiptAtTransaction, "function");
    assert.throws(() => readers.createIndexedBusinessDecisionReceiptReader({ ...input,
      indexerUrl: "http://example.invalid/api/v4/graphql" }));
    assert.throws(() => readers.createIndexedBusinessDecisionReceiptReader({ ...input,
      indexerUrl: "http://private-key@127.0.0.1:8088/api/v4/graphql" }));
  });

  it("retains sanitized transient finality errors for the explicit v11 reader", async () => {
    assert.equal(typeof readers.createIndexedBusinessDecisionReceiptReader, "function");
    const previous = (() => { try { return getNetworkId(); } catch { return "undeployed"; } })();
    try {
      setNetworkId("undeployed");
      const reader = readers.createIndexedBusinessDecisionReceiptReader({ network: "undeployed", indexerUrl: "http://127.0.0.1:8088/api/v4/graphql",
        contract: `0x${"16".repeat(32)}`, receiptId: `0x${"17".repeat(32)}`,
        publicDataProvider: { async watchForTxData() { throw new TypeError("fetch failed"); } } as unknown as PublicDataProvider });
      await assert.rejects(reader.readReceiptAtTransaction("00" + "18".repeat(32)),
        error => error instanceof Error && error.name === "IndexedReceiptUnavailableError" && error.message === "INDEXED_RECEIPT_UNAVAILABLE");
    } finally { setNetworkId(previous); }
  });
});
