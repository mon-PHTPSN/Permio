import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { ContractCall, ContractDeploy, Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { ContractState } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { ledger } from "../packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js";
import { readFinalizedDecisionReceipt, runtimeDecisionReceiptId, type DecisionReceipt } from "../packages/midnight-authorization/src/decision-receipt.ts";
import { isDefiniteNativeAuthRejection } from "./m6-native-negative-outcome.ts";

// Offline consistency/decoder replay. Live node finality remains the source
// verification recorded by the run, rather than a new offline consensus claim.
assert.equal(process.argv.length, 3);
const root = path.resolve("logs/m6-remaining-preprod-20261019/downloaded-public-evidence-v1");
const directory = await realpath(process.argv[2]!); assert.equal(directory, await realpath(path.join(root, "public-evidence")));
const json = async (name: string) => JSON.parse(await readFile(path.join(directory, name), "utf8"));
const bytes = (name: string) => readFile(path.join(directory, name));
const hash = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
assert(manifest.allPublicBytesPrivacyScanned && manifest.nativeAttempts === 100 && manifest.confirmed === 96 && manifest.definiteNativeRejections === 4);
const address = "70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c", contract = `0x${address}` as const;
assert.equal(manifest.contract, address);
assert.equal(manifest.contractSourceSha256, hash(await readFile("packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js")));
setNetworkId("preprod");
const negativeCases = new Map([[51,"independent-competing-transition"],[80,"stale-authority-root"],
  [90,"scoped-action-replay-after-cold-reconnect"],[92,"stale-credential-status-root"]]);
const perEntry = new Map<string, number>(), ids = new Map<number, readonly string[]>();
let confirmed = 0;
for (let round = 1; round <= 100; round++) {
  const n = String(round).padStart(3, "0"), raw = await bytes(`transactions/attempt-${n}.bin`);
  const transaction = Transaction.deserialize("signature", "proof", "binding", raw);
  assert(Buffer.from(transaction.serialize()).equals(raw)); ids.set(round, transaction.identifiers());
  const actions = [...(transaction.intents?.values() ?? [])].flatMap(intent => intent.actions); assert.equal(actions.length, 1);
  const action = actions[0]!; assert(action instanceof ContractCall || action instanceof ContractDeploy); assert.equal(action.address, address);
  const entry = action instanceof ContractDeploy ? "deploy" : typeof action.entryPoint === "string" ? action.entryPoint : Buffer.from(action.entryPoint).toString("utf8");
  assert.equal(entry === "deploy", round === 1); perEntry.set(entry, (perEntry.get(entry) ?? 0) + 1);
  if (negativeCases.has(round)) {
    assert.equal(entry, "executeRuntimeAction"); const result = await json(`transactions/rejection-${n}.json`);
    assert(result.kind === "native-rejected" && result.submittedAtMostOnce && result.negativeCase === negativeCases.get(round));
    assert.equal(result.balancedSha256, hash(raw)); assert.deepEqual(result.transactionIds, transaction.identifiers());
    assert(isDefiniteNativeAuthRejection(result.validation, result.diagnostic));
    assert(!Object.hasOwn(manifest.files, `indexer/finalized-${n}.bin`));
  } else {
    assert((await bytes(`indexer/finalized-${n}.bin`)).equals(raw)); confirmed++;
  }
}
assert.equal(confirmed, 96);
assert.deepEqual(Object.fromEntries([...perEntry].sort()), Object.fromEntries(Object.entries({ deploy:1, governAuthorization:18,
  beginM4Activation:2, stageM4ActivationBinding:2, finalizeM4Activation:2, allocateRuntimeInstance:2,
  updateRuntimeCredentialStatus:39, manageRuntimeParticipantSlots:4, prepareRuntimeAction:20, executeRuntimeAction:6, terminateTemplate:4 }).sort()));
const state = ContractState.deserialize(await bytes("chain/contract-state.bin")), view = ledger(state.data);
assert.equal(view.runtimeInstances.size(), 2n); assert.equal(view.proofModules.size(), 2n); assert.equal(view.activeTemplates.size(), 2n);
assert([...view.proofModules].every(([, value]) => value.lifecycleStatus === 6n));
assert([...view.activeTemplates].every(([, value]) => value.lifecycleStatus === 3n));
assert.equal(view.decisionReceipts.size(), 2n); assert.equal(view.usedRuntimeActionNullifiers.size(), 2n); assert.equal(view.runtimeActionSessions.size(), 3n);
assert.equal([...view.authorityRoots][0]![1].rootSequence, 2n); assert.equal([...view.credentialStatusRoots][0]![1].rootSequence, 7n);
const receipts = await json("receipts/decision-receipts.json") as DecisionReceipt[]; assert(Array.isArray(receipts) && receipts.length === 2);
for (const round of [50,89]) {
  const n = String(round).padStart(3, "0"), provenance = await json(`postrun/historical/receipt-${n}-source.json`);
  const historical = ContractState.deserialize(await bytes(`postrun/historical/receipt-${n}-state.bin`)), historicalView = ledger(historical.data);
  const receipt: DecisionReceipt | undefined = receipts.find(value => ids.get(round)!.includes(value.sourceTransaction)); assert(receipt);
  assert(ids.get(round)!.includes(provenance.transactionId)); assert.equal(receipt.sourceLedgerSequence, String(provenance.blockHeight));
  assert.equal(provenance.transactionSha256, hash(await bytes(`transactions/attempt-${n}.bin`)));
  const key = Uint8Array.from(Buffer.from(receipt.receiptId.slice(2), "hex"));
  const body = historicalView.decisionReceipts.lookup(key); assert.equal(runtimeDecisionReceiptId(body), receipt.receiptId);
  assert.deepEqual(body, view.decisionReceipts.lookup(key)); assert(view.usedRuntimeActionNullifiers.member(body.scopedNullifier));
  assert.equal(body.transitioning, round === 50);
  const decoded = await readFinalizedDecisionReceipt({ async readReceiptAtTransaction(transactionId) {
    assert(ids.get(round)!.includes(transactionId));
    return { network: "preprod", contract, transactionId, ledgerSequence: BigInt(provenance.blockHeight), finalized: true,
      transactionSucceeded: true, receiptIdFromCall: receipt.receiptId, bodyAtTransaction: body };
  } }, { network: "preprod", contract, transactionId: receipt.sourceTransaction, receiptId: receipt.receiptId });
  assert.deepEqual(decoded, receipt);
}
const causal = await json("postrun/reports/action-control-causal-audit-v1.json"); assert(causal.passed && causal.cases.length === 2);
const status = await json("postrun/reports/readset-causal-audit-v1.json");
assert(status.staleStatusRejectedAfterRootUpdate && status.restoringOnlyCredentialStatusBranchMakesExactProgramPass && status.alreadyConsumedActionRejectedWithUnchangedInstance);
const pairing = await json("postrun/positive-controls/pairing.json"); assert.equal(pairing.pairs.length, 3); assert.equal(pairing.unboundPreBindingBytesExported, false);
for (const pair of pairing.pairs) {
  const n = String(pair.control).padStart(3,"0"), raw = await bytes(`postrun/positive-controls/control-${n}-bound.bin`);
  assert.equal(hash(raw), pair.boundControlSha256); Transaction.deserialize("signature", "proof", "binding", raw);
  assert(pair.controlExportedAfterBothTemplatesAndModulesPermanentlyRevoked);
}
for (const name of ["privacy-scan.json","postrun-privacy-scan.json"]) {
  const scan = await json(name); assert(scan.passed && scan.findings.length === 0);
  for (const item of scan.files) assert.equal(hash(await bytes(item.artifact)), item.sha256);
}
const result = { passed: true, observedAtUtc: new Date().toISOString(), boundary: "offline-artifact-integrity-and-decoder-replay",
  contract: address, nativeAttempts: 100, finalizedPublicBytesVerified: 96, definiteNativeRejections: 4, actualReceiptsDecoded: 2,
  liveFinalityProvenanceRetainedFromOriginalRun: true, newNetworkValidation: false, newNativeSubmissions: 0,
  firstStatefulAndSecondNonTransitioningReceiptV1Verified: true, permanentTemplateAndModuleRevocationsVerified: true,
  authorityAndStatusCausalAuditsVerified: true, publicArtifactScansPassed: true, independentHumanReviewStillOpen: true };
await writeFile("logs/m6-remaining-preprod-20261019/download-protocol-verification-v1.json", JSON.stringify(result,null,2)+"\n", {flag:"wx"});
process.stdout.write(JSON.stringify(result)+"\n");
