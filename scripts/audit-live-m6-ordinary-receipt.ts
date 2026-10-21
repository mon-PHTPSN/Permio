import assert from "node:assert/strict";
import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { ledger } from "../packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js";
import { readFinalizedDecisionReceipt, runtimeDecisionReceiptId } from "../packages/midnight-authorization/src/decision-receipt.ts";
import { createIndexedDecisionReceiptReader } from "../packages/midnight-authorization/src/indexed-decision-receipt.ts";
import { PreprodConnectionProfile } from "../packages/midnight-authorization/src/preprod-profile.ts";

// Separate cold read: no wallet, signing, balancing, proof or submission imports.
const root = "/opt/permio-m6-governance-20261018-v10";
let stage = "local-public-evidence";
for (const key of ["log", "error", "warn", "info", "debug"] as const) console[key] = () => {};
const emit = (value: unknown) => process.stdout.write(JSON.stringify(value) + "\n");
try {
  assert(process.platform === "linux" && process.argv.length === 2 && process.cwd() === root + "/client");
  const privateFile = root + "/private/inputs.json", meta = await lstat(privateFile);
  assert(meta.isFile() && !meta.isSymbolicLink() && meta.uid === 0 &&
    (meta.mode & 0o777) === 0o600 && await realpath(privateFile) === privateFile);
  const inputs = JSON.parse(await readFile(privateFile, "utf8"));
  assert(inputs.networkId === "preprod" && inputs.testOnlyProvenance.includes("disposable Preprod test"));
  const profile = new PreprodConnectionProfile(inputs.providerCredential);
  const events = (await Promise.all(["v2", "v3", "v4", "v5", "v6", "v7", "v8", "v9"].map(version =>
    readFile(root + `/runtime-first-flow-${version}/client-public.jsonl`, "utf8")))).join("\n")
    .split("\n").flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
  const native = events.filter(row => row.kind === "m6-v10-ordinary-flow");
  assert(native.filter(row => row.phase === "submission-attempt").length === 62);
  assert(native.filter(row => row.phase === "finalized").length === 62);
  assert(native.some(row => row.phase === "first-flow-complete" && row.attempts === 62 && row.finalized === 62));
  assert(events.some(row => row.event === "ordinary-action-first-flow-verified" &&
    row.disposableTemplateAndModuleRevoked === true && row.privacyLogScanPassed === true));
  const actions = events.filter(row => row.event === "ordinary-action-finalized-and-receipt-verified");
  assert(actions.length === 1);
  const expected = actions[0].receipt;
  assert(expected.sourceNetwork === "preprod" && expected.sourceContract === "0x" + actions[0].contractAddress &&
    expected.sourceTransaction === actions[0].transactionId &&
    expected.transitionSequence === actions[0].instanceStateSequence);
  // Three credential admissions, one slot assignment, then the ordinary action.
  assert.equal(expected.transitionSequence, "5");
  setNetworkId("preprod");
  const environment = profile.environmentForSdk();
  const provider = indexerPublicDataProvider(environment.indexer, environment.indexerWS);
  stage = "cold-exact-transaction-receipt";
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(Error("Audit read timeout")), 180_000).unref());
  const receipt = await Promise.race([readFinalizedDecisionReceipt(createIndexedDecisionReceiptReader({
    network: "preprod", profile, publicDataProvider: provider,
    contract: expected.sourceContract, receiptId: expected.receiptId,
  }), { network: "preprod", contract: expected.sourceContract,
    transactionId: expected.sourceTransaction, receiptId: expected.receiptId }), timeout]);
  assert.deepEqual(receipt, expected);
  stage = "cold-current-cleanup-state";
  const indexed = await Promise.race([provider.queryContractState(receipt.sourceContract.slice(2)), timeout]);
  assert(indexed);
  const view = ledger(indexed.data);
  const bytes = (value: string) => Buffer.from(value.slice(2), "hex");
  assert.equal(view.proofModules.size(), 1n);
  assert.equal(view.activeTemplates.size(), 1n);
  assert.equal(view.runtimeInstances.size(), 2n);
  assert.equal([...view.proofModules][0]![1].lifecycleStatus, 6n);
  assert.equal([...view.activeTemplates][0]![1].lifecycleStatus, 3n);
  const instance = view.runtimeInstances.lookup(bytes(receipt.instanceCommitment));
  assert.deepEqual([...view.runtimeInstances].map(([,r])=>r.transitionSequence).sort(),[4n,5n]);
  assert.equal([...view.credentialStatusRoots][0]![1].rootSequence,6n);
  assert.equal(instance.transitionSequence, BigInt(receipt.transitionSequence!));
  assert.equal("0x" + Buffer.from(instance.currentStateCommitment).toString("hex"), receipt.nextStateCommitment);
  assert.equal(view.runtimeActionSessions.size(), 0n);
  assert.equal(view.capabilityAttenuationSessions.size(), 0n);
  assert.equal(view.decisionReceipts.size(), 1n);
  assert.equal(view.usedRuntimeActionNullifiers.size(), 1n);
  assert(view.usedRuntimeActionNullifiers.member(bytes(receipt.scopedNullifier)));
  assert.equal(runtimeDecisionReceiptId(view.decisionReceipts.lookup(bytes(receipt.receiptId))), receipt.receiptId);
  const report = { kind: "m6-v10-cold-read-only-first-flow-audit", observedAtUtc: new Date().toISOString(),
    passed: true, network: "preprod", governanceAbi: 10, ordinaryActionProfile: 9,
    transactionsSubmittedByAudit: 0, walletInitializedByAudit: false,
    firstFlowSubmitted: 62, firstFlowFinalized: 62, receipt,
    exactFinalizedTransactionAndReceiptInsertionVerified: true,
    receiptRetainedAfterRevocation: true, templateLifecycleStatus: 3, moduleLifecycleStatus: 6,
    instanceStateSequence: receipt.transitionSequence, remainingActionSessions: 0, remainingCredentialSessions: 0,
    usedActionNullifiers: 1, privacyLogScanPassed: true,
    sourceTrust: "configured authenticated indexer; not an independent consensus light client",
    fullM6Acceptance: false };
  await writeFile(root + "/ordinary-first-flow-read-only-audit-v1.json", JSON.stringify(report, null, 2) + "\n",
    { flag: "wx", mode: 0o600 });
  emit(report);
  process.exit(0);
} catch {
  emit({ kind: "m6-v10-cold-read-only-first-flow-audit", passed: false, stage,
    transactionsSubmittedByAudit: 0, transportDetailsWithheld: true });
  process.exit(1);
}
