import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { ContractCall, ContractDeploy, Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { ContractState } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { ledger } from "../packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js";
import { readFinalizedDecisionReceipt, runtimeDecisionReceiptId, type DecisionReceipt } from "../packages/midnight-authorization/src/decision-receipt.ts";
import { isDefiniteIncludedM6ActionFailure,findM6SingleFallibleContractSegment,isDefiniteNativeAuthRejection } from "./m6-native-negative-outcome.ts";

// Offline consistency/decoder replay. Live node finality remains the source
// verification recorded by the run, rather than a new offline consensus claim.
assert(process.argv.length === 3 || process.argv.length === 4 && process.argv[3] === "--preliminary");
const preliminary = process.argv[3] === "--preliminary";
const root = path.resolve("logs/m6-remaining-preprod-20261019/" +
  (preliminary ? "downloaded-recovery150-preliminary-public-evidence-v1" : "downloaded-recovery150-public-evidence-v1"));
const directory = await realpath(process.argv[2]!); assert.equal(directory, await realpath(path.join(root, "public-evidence")));
const json = async (name: string) => JSON.parse(await readFile(path.join(directory, name), "utf8"));
const bytes = (name: string) => readFile(path.join(directory, name));
const hash = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
assert(manifest.allPublicBytesPrivacyScanned && manifest.nativeAttempts === 135 && manifest.confirmed === 130 && manifest.definiteNativeRejections === 4);
const address = "70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c", contract = `0x${address}` as const;
assert.equal(manifest.contract, address);
assert.equal(manifest.contractSourceSha256, hash(await readFile("packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js")));
setNetworkId("preprod");
const negativeCases = new Map([[87,"independent-competing-transition"],[116,"stale-authority-root"],
  [126,"scoped-action-replay-after-cold-reconnect"],[128,"stale-credential-status-root"]]);
const perEntry = new Map<string, number>(), ids = new Map<number, readonly string[]>();
let confirmed = 0;
assert(manifest.sourceSnapshot===10&&manifest.unused55BytesExcluded&&manifest.localPreSendFailure55Counted===1&&manifest.publicBoundTransactions===134);
assert.equal(manifest.sourceManifestSha256,"865355cfb7f446d2dff5f230e5aed8e8c6eaeb0c9bad1b86bb939f85f10b5aa7");
assert.equal(hash(await bytes("postrun/source/public-source-manifest.json")),manifest.sourceManifestSha256);
const sourceManifest=await json("postrun/source/public-source-manifest.json");assert(sourceManifest.snapshotVersion===10&&Object.keys(sourceManifest.files).length===212);
for(const n of ["051","055"])assert(!Object.hasOwn(manifest.files,`transactions/attempt-${n}.bin`));
assert(!manifest.files["transactions/attempt-051.bin"]&&!manifest.files["transactions/attempt-055.bin"]);
assert.equal(manifest.restorationStillPending, preliminary);
for (let round = 1; round <= 136; round++) {
  if(round===51||round===55)continue;
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
    if(result.inclusion){
      const failed=await bytes(`indexer/failed-contract-${n}.bin`);assert(failed.equals(raw));
      const segment=findM6SingleFallibleContractSegment(transaction,address);
      assert(isDefiniteIncludedM6ActionFailure({...result.inclusion,exactBoundBytesMatched:true,intendedSegmentId:segment.segmentId,
        segmentStatusMap:new Map(result.inclusion.segmentStatusEntries),contractCallHasGuaranteedTranscript:!!segment.call.guaranteedTranscript,
        contractCallHasFallibleTranscript:!!segment.call.fallibleTranscript}));
    }else assert(isDefiniteNativeAuthRejection(result.validation,result.diagnostic));
    assert(!Object.hasOwn(manifest.files, `indexer/finalized-${n}.bin`));
  } else {
    assert((await bytes(`indexer/finalized-${n}.bin`)).equals(raw)); confirmed++;
  }
}
assert.equal(confirmed, 130);
assert.deepEqual(Object.fromEntries([...perEntry].sort()), Object.fromEntries(Object.entries({ deploy:1, governAuthorization:18,
  beginM4Activation:2, stageM4ActivationBinding:2, finalizeM4Activation:2, allocateRuntimeInstance:4,
  updateRuntimeCredentialStatus:60, manageRuntimeParticipantSlots:6, prepareRuntimeAction:28, executeRuntimeAction:7, terminateTemplate:4 }).sort()));
const state = ContractState.deserialize(await bytes("chain/contract-state.bin")), view = ledger(state.data);
assert.equal(view.runtimeInstances.size(), 4n); assert.equal(view.proofModules.size(), 2n); assert.equal(view.activeTemplates.size(), 2n);
assert([...view.proofModules].every(([, value]) => value.lifecycleStatus === 6n));
assert([...view.activeTemplates].every(([, value]) => value.lifecycleStatus === 3n));
assert.equal(view.decisionReceipts.size(), 3n); assert.equal(view.usedRuntimeActionNullifiers.size(), 3n); assert.equal(view.runtimeActionSessions.size(), 4n);
assert.equal([...view.authorityRoots][0]![1].rootSequence, 2n); assert.equal([...view.credentialStatusRoots][0]![1].rootSequence, 11n);
const receipts = await json("receipts/decision-receipts.json") as DecisionReceipt[]; assert(Array.isArray(receipts) && receipts.length === 3);
for (const round of [50,86,125]) {
  const n = String(round).padStart(3, "0"), provenance = await json(`postrun/historical/receipt-${n}-source.json`);
  const historical = ContractState.deserialize(await bytes(`postrun/historical/receipt-${n}-state.bin`)), historicalView = ledger(historical.data);
  const receipt: DecisionReceipt | undefined = receipts.find(value => ids.get(round)!.includes(value.sourceTransaction)); assert(receipt);
  assert(ids.get(round)!.includes(provenance.transactionId)); assert.equal(receipt.sourceLedgerSequence, String(provenance.blockHeight));
  assert.equal(provenance.transactionSha256, hash(await bytes(`transactions/attempt-${n}.bin`)));
  const key = Uint8Array.from(Buffer.from(receipt.receiptId.slice(2), "hex"));
  const body = historicalView.decisionReceipts.lookup(key); assert.equal(runtimeDecisionReceiptId(body), receipt.receiptId);
  assert.deepEqual(body, view.decisionReceipts.lookup(key)); assert(view.usedRuntimeActionNullifiers.member(body.scopedNullifier));
  assert.equal(body.transitioning, round !== 125);
  const decoded = await readFinalizedDecisionReceipt({ async readReceiptAtTransaction(transactionId) {
    assert(ids.get(round)!.includes(transactionId));
    return { network: "preprod", contract, transactionId, ledgerSequence: BigInt(provenance.blockHeight), finalized: true,
      transactionSucceeded: true, receiptIdFromCall: receipt.receiptId, bodyAtTransaction: body };
  } }, { network: "preprod", contract, transactionId: receipt.sourceTransaction, receiptId: receipt.receiptId });
  assert.deepEqual(decoded, receipt);
}
assert.deepEqual([...view.runtimeInstances].map(([,v])=>String(v.transitionSequence)).sort(),["1","4","5","6"]);
const winner=Transaction.deserialize("signature","proof","binding",await bytes("transactions/attempt-125.bin"));
const replay=Transaction.deserialize("signature","proof","binding",await bytes("transactions/attempt-126.bin"));
assert(winner.identifiers().every(id=>!replay.identifiers().includes(id)),"Replay must reach contract execution with fresh outer identifiers");
assert.notEqual(findM6SingleFallibleContractSegment(winner,address).call.communicationCommitment,findM6SingleFallibleContractSegment(replay,address).call.communicationCommitment);
const causal = await json("postrun/reports/action-control-causal-audit-recovery150-v1.json"); assert(causal.passed && causal.cases.length === 2);
const status = await json("postrun/reports/readset-causal-audit-recovery150-v1.json");
assert(status.staleStatusRejectedAfterRootUpdate && status.restoringOnlyCredentialStatusBranchMakesExactProgramPass && status.alreadyConsumedActionRejectedWithUnchangedInstance);
const pairing = await json("postrun/positive-controls/pairing.json"); assert.equal(pairing.pairs.length, 4); assert.equal(pairing.unboundPreBindingBytesExported, false);
const recovered87=await json("postrun/reports/after87-recovery-verification-v1.json");
assert(recovered87.passed&&recovered87.posthocOutcomeRecorded&&recovered87.native87NeverResubmitted&&recovered87.actualM4M5ApisUsed&&recovered87.actualReceiptDecoded);
const historicalFailure=await json("postrun/final-runtime-v5/report.json"),lastRuntime=await json("postrun/final-runtime-v6/report.json");
assert(historicalFailure.exitCode===1&&lastRuntime.exitCode===0&&lastRuntime.temporarySwapRemoved&&lastRuntime.originalSwappinessRestored);
for (const pair of pairing.pairs) {
  const n = String(pair.control).padStart(3,"0"), raw = await bytes(`postrun/positive-controls/control-${n}-bound.bin`);
  assert.equal(hash(raw), pair.boundControlSha256); Transaction.deserialize("signature", "proof", "binding", raw);
  assert(pair.controlExportedAfterBothTemplatesAndModulesPermanentlyRevoked);
}
for (const name of ["privacy-scan.json","postrun-privacy-scan.json", ...(preliminary ? [] : ["complete-privacy-scan.json"])]) {
  const scan = await json(name); assert(scan.passed && scan.findings.length === 0);
  for (const item of scan.files) assert.equal(hash(await bytes(item.artifact)), item.sha256);
}
if (!preliminary) {
  const restoration = await json("postrun/restoration/public-restore.json");
  const retention = await json("postrun/restoration/test-credential-retention.json");
  assert(restoration.restored && restoration.allContentAndMetadataRestored && restoration.originalSwapFilePreserved && restoration.temporarySwapAbsent);
  assert.equal(restoration.offloadedPublicPaths, 16); assert.equal(restoration.duplicatePairsRestored, 23);
  assert(retention.testOnlyProvenanceVerified && retention.privateDirectory0700 && retention.credentialFiles0600 &&
    retention.publicValuesOrCredentialsIncluded === false && retention.continuingAuthorizedM6Use);
}
const result = { passed: true, observedAtUtc: new Date().toISOString(), boundary: "offline-artifact-integrity-and-decoder-replay",
  contract: address, nativeAttempts: 135, finalizedPublicBytesVerified: 130, definiteNativeRejections: 4, actualReceiptsDecoded: 3,
  liveFinalityProvenanceRetainedFromOriginalRun: true, newNetworkValidation: false, newNativeSubmissions: 0,
  unused55BytesAbsent:true,
  twoStatefulAndOneNonTransitioningReceiptV1Verified: true, permanentTemplateAndModuleRevocationsVerified: true,
  authorityAndStatusCausalAuditsVerified: true, publicArtifactScansPassed: true, restorationStillPending: preliminary,
  independentHumanReviewStillOpen: true };
await writeFile("logs/m6-remaining-preprod-20261019/" + (preliminary ? "recovery150-preliminary-protocol-verification-v1.json" :
  "recovery150-download-protocol-verification-v1.json"), JSON.stringify(result,null,2)+"\n", {flag:"wx"});
process.stdout.write(JSON.stringify(result)+"\n");
