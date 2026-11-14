import assert from "node:assert/strict";
import { it } from "node:test";
import { readFileSync } from "node:fs";
import { Contract, ledger } from "../contracts/managed/permio-authorization-v12/contract/index.js";
import { permioAuthorizationWitnesses } from "../src/compact-crypto.ts";
import * as readers from "../src/indexed-decision-receipt.ts";
import { businessActionFixture } from "./fixtures/business-action.ts";
import type { PublicDataProvider } from "@midnight-ntwrk/midnight-js-types";

it("v12 decodes its actual predicate-enforcing action receipt and checks exact insertion", async () => {
  const api = readers as unknown as Record<string, (...args: any[]) => any>;
  assert.equal(typeof api.assertV12DecisionReceiptInsertion, "function", "v12 insertion reader is missing");
  const f = businessActionFixture({ contract: new Contract(permioAuthorizationWitnesses), predicateKinds: [1, 2, 3] });
  f.finishPreparation();
  for (let index = 0; index < 3; index++) f.proveBusiness();
  const accepted = f.execute();
  const receipt = ledger(f.current).decisionReceipts.lookup(accepted.result);
  assert.equal(receipt.receiptVersion, 1n);
  const layout = JSON.parse(readFileSync(new URL("../contracts/managed/permio-authorization-v12/compiler/contract-info.json", import.meta.url), "utf8")).ledger;
  assert.deepEqual(layout.find((item: any) => item.name === "decisionReceipts").index, [1, 12]);
  const transcript = accepted.proofData.publicTranscript;
  assert.doesNotThrow(() => api.assertV12DecisionReceiptInsertion!(transcript, receipt));
  assert.throws(() => api.assertV12DecisionReceiptInsertion!([], receipt), /Exact v12 action/);
  assert.throws(() => api.assertV12DecisionReceiptInsertion!([...transcript, ...transcript], receipt), /Exact v12 action/);
  assert.throws(() => api.assertV12DecisionReceiptInsertion!(transcript, { ...receipt, outputCommitment: new Uint8Array(32).fill(251) }), /Exact v12 action/);
});

it("the explicit v12 reader retains the local indexer access boundary", () => {
  const input = { network: "undeployed" as const, indexerUrl: "http://127.0.0.1:8088/api/v4/graphql",
    contract: `0x${"16".repeat(32)}` as const, receiptId: `0x${"17".repeat(32)}` as const,
    publicDataProvider: {} as PublicDataProvider };
  assert.equal(typeof readers.createIndexedActivationDecisionReceiptReader(input).readReceiptAtTransaction, "function");
  assert.throws(() => readers.createIndexedActivationDecisionReceiptReader({ ...input, indexerUrl: "http://example.invalid/api/v4/graphql" }));
  assert.throws(() => readers.createIndexedActivationDecisionReceiptReader({ ...input, indexerUrl: "http://private-key@127.0.0.1:8088/api/v4/graphql" }));
});
