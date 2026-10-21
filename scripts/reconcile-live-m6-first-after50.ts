import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import * as sdk from "@permio/midnight-authorization";
import { restoreM6GovernanceFixture, type createM6RemainingFixturePair } from "./run-live-m6-admission.ts";
import { restoreRemainingAfter45, reviveRemainingCheckpoint } from "./m6-restore-remaining-checkpoint.ts";
import type { M6RemainingCompletedFlow } from "./m6-remaining-ordinary-v2.ts";
import type { PreparedOrdinaryAction } from "./m6-ordinary-action-workflow.ts";
import { captureRemainingPublicEvidence } from "./m6-remaining-public-evidence.ts";

// Reconcile a completed native action. Never restore a wallet, request a proof,
// generate a new signature, allocate an instance or submit a transaction.
const root = "/opt/permio-m6-remaining-preprod-20261019-v1", directory = root + "/private";
const address = "70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c";
assert(process.platform === "linux" && process.argv.length === 2);
for (const name of ["log", "warn", "error", "info", "debug"] as const) console[name] = () => {};
const emit = (v: unknown) => process.stdout.write(JSON.stringify(v) + "\n");
const hash = (v: Uint8Array) => createHash("sha256").update(v).digest("hex");
const hex = (v: Uint8Array) => Buffer.from(v).toString("hex");
const stringify = (v: unknown) => JSON.stringify(v, function (key, value) {
  const original = this[key]; return typeof original === "bigint" ? { $bigint: String(original) }
    : original instanceof Uint8Array ? { $bytes: hex(original) } : value;
});
async function privateFile(name: string) {
  assert(/^[a-z0-9.-]+$/u.test(name)); const p = directory + "/" + name, meta = await lstat(p);
  assert(meta.isFile() && !meta.isSymbolicLink() && meta.uid === 0 && (meta.mode & 0o777) === 0o600 && await realpath(p) === p);
  return readFile(p);
}
let stage = "closed-native-boundary";
const timeout = setTimeout(() => process.exit(2), 900_000);
try {
  const files = await readdir(directory);
  assert.equal(files.filter(n => /^wallet-[0-9]{3}-submission\.json$/u.test(n)).length, 50);
  assert.equal(files.filter(n => /^wallet-[0-9]{3}-reservation\.json$/u.test(n)).length, 51);
  assert(!files.includes("wallet-051-submission.json"));
  const input = JSON.parse((await privateFile("inputs.json")).toString());
  assert(input.networkId === "preprod" && input.testOnlyProvenance.includes("disposable Preprod test"));
  const manifest = JSON.parse((await privateFile("execution-manifest.json")).toString());
  const fixturesBytes = await privateFile("fixture-pair.json"); assert.equal(hash(fixturesBytes), manifest.fixturePairSha256);
  const fixtures = JSON.parse(fixturesBytes.toString()) as ReturnType<typeof createM6RemainingFixturePair>;
  const load = async (pattern: RegExp) => Promise.all(files.filter(n => pattern.test(n)).sort()
    .map(async n => JSON.parse((await privateFile(n)).toString(), reviveRemainingCheckpoint)));
  const saved = await load(/^checkpoint-[0-9]{3}\.json$/u), savedV2 = await load(/^checkpoint-v2-[0-9]+\.json$/u);
  const resume = restoreRemainingAfter45(restoreM6GovernanceFixture(fixtures.stateful), saved, address);
  const candidate = resume.resumePrepared.firstCandidate;
  const proof = savedV2.filter(v => v.stage === "genuine-candidate-proof" && v.value.label === "state-transition-winner");
  assert.equal(proof.length, 1); assert.deepEqual(proof[0]!.value.command, candidate.arguments[0]);
  const journal = JSON.parse((await privateFile("wallet-050-submission.json")).toString());
  const reservation = JSON.parse((await privateFile("wallet-050-reservation.json")).toString());
  assert(journal.submittedAtMostOnce && reservation.entry === "executeRuntimeAction" && !reservation.negativeCase);
  assert.equal(reservation.unboundSha256, hash(proof[0]!.value.bytes));
  assert.equal(journal.balancedSha256, hash(await privateFile("wallet-050-balanced.bin")));
  const receiptId = proof[0]!.value.receiptId as Uint8Array;
  const receiptIdHex = `0x${hex(receiptId)}` as const, transactionId = journal.transactionIds.at(-1) as string;
  setNetworkId("preprod"); const profile = new sdk.PreprodConnectionProfile(input.providerCredential);
  const env = profile.environmentForSdk(), publicData = indexerPublicDataProvider(env.indexer, env.indexerWS);
  stage = "exact-native-finality-and-receipt";
  const native = await publicData.watchForTxData(transactionId);
  assert(native.status === "SucceedEntirely" && Buffer.from(native.tx.serialize()).equals(await privateFile("wallet-050-balanced.bin")));
  const receipt = await sdk.readFinalizedDecisionReceipt(sdk.createIndexedDecisionReceiptReader({ network: "preprod",
    profile, publicDataProvider: publicData, contract: `0x${address}`, receiptId: receiptIdHex }), {
    network: "preprod", contract: `0x${address}`, transactionId, receiptId: receiptIdHex });
  const indexed = await publicData.queryContractState(address); assert(indexed);
  const view = sdk.readPermioAuthorizationLedger(indexed.data), allocation = resume.allocated.allocation;
  assert.equal(view.runtimeInstances.size(), 1n); assert.equal(view.decisionReceipts.size(), 1n);
  assert.equal(view.usedRuntimeActionNullifiers.size(), 1n); assert.equal(view.runtimeActionSessions.size(), 1n);
  assert.equal(view.runtimeInstances.lookup(allocation.instanceCommitment).transitionSequence, 5n);
  assert.deepEqual(view.runtimeInstances.lookup(allocation.instanceCommitment).currentStateCommitment,
    sdk.permioAuthorizationPureCircuits.runtimeStateCommitment(candidate.expectedNextState));
  assert.equal(sdk.runtimeDecisionReceiptId(view.decisionReceipts.lookup(receiptId)), receiptIdHex);
  stage = "historical-real-m4-m5-reconciliation";
  const source = resume.resumePrepared.source;
  const actualSlot = resume.system.assignParticipantSlot(source.assignedBy, {
    namespace: source.namespace, templateId: source.templateId, templateVersion: source.templateVersion, templateHash: source.templateHash,
    assignmentId: source.assignmentId, instanceId: source.instanceId, contextId: source.contextId, slotId: source.slotId,
    subjectAccountId: source.subjectAccountId }, source.assignedAt);
  assert.deepEqual(actualSlot, source);
  const decision = resume.system.authorizeAction(candidate.signedIntent, Number(candidate.arguments[0].effectiveAt));
  assert(decision.allowed);
  // Use the protocol's actual state-label commitment convention.
  const { encodeCanonical } = await import("@permio/protocol");
  const expectedLabel = fixtures.stateful.record.template.states.find(label =>
    hash(encodeCanonical("permio:private-state-id:v1", [label])) === hex(candidate.expectedNextState.stateIdHash));
  assert(expectedLabel && decision.nextState === expectedLabel);
  const initial = savedV2.filter(v => v.stage === "ordinary-action-prepared");
  const final = savedV2.filter(v => v.stage === "ordinary-action-final-prepared");
  assert.equal(initial.length, 1); assert.equal(final.length, 1);
  const i = initial[0]!.value, f = final[0]!.value;
  const privateSentinels = [...resume.privateSentinels, ...resume.setup.privateSentinels, ...candidate.privateSentinels,
    new Date(resume.allocated.instance.expiresAt * 1000).toISOString()];
  const loserSentinels = [f.signedIntent.payload.nonce, hex(f.arguments[20]),
    ...i.evidence.inputs.concat(i.evidence.outputs).flatMap((row: any) => [hex(row.selected.nonce), hex(row.selected.payloadCommitment)])];
  privateSentinels.push(...loserSentinels);
  const cleanup = [...i.prepareArguments]; cleanup[0] = 4n; cleanup[10] = f.arguments[13];
  const loser: PreparedOrdinaryAction = { arguments: f.arguments, preparationArguments: cleanup as unknown as PreparedOrdinaryAction["preparationArguments"],
    expectedNextState: f.expectedNextState, signedIntent: f.signedIntent, privateSentinels: loserSentinels };
  const issuer = candidate.arguments[14];
  const issuers = sdk.buildAuthorityRoot([issuer, { ...issuer, publicKey: sdk.governanceActivatorPublicKey(197n) }]);
  assert.deepEqual(issuers.root, allocation.capabilityIssuersRoot);
  const first: M6RemainingCompletedFlow = { allocation, instance: resume.allocated.instance,
    prepared: { allocation, stateOpening: resume.allocated.stateOpening, issuers }, checked: { receipt, setup: resume.setup,
      candidates: [candidate, loser], state: candidate.arguments[9], sequence: 4n, selectedCandidateIndex: 0, privateSentinels } };
  await writeFile(directory + "/first-completed-after50-private.json", stringify({ first, privateSentinels }), { flag: "wx", mode: 0o600 });
  const collect = (v: unknown) => { if (typeof v === "string" && v.length >= 8) privateSentinels.push(v);
    else if (v && typeof v === "object") Object.values(v).forEach(collect); }; collect(input.secret); privateSentinels.push(input.providerCredential);
  for (const fixture of [fixtures.stateful, fixtures.nonTransitioning]) {
    const templateValues = (v: unknown) => { if (typeof v === "string" && v.startsWith("private-")) privateSentinels.push(v);
      else if (v && typeof v === "object") Object.values(v).forEach(templateValues); }; templateValues(fixture.record.template);
    privateSentinels.push(...fixture.record.template.states);
    for (const reviewer of fixture.policy.reviewers) privateSentinels.push(reviewer.principalId, reviewer.publicKeyPem);
  }
  stage = "partial-public-evidence-scan";
  const scan = await captureRemainingPublicEvidence({ providers: { publicDataProvider: publicData } as sdk.PermioAuthorizationProviders,
    address, receipts: [receipt], privateValues: privateSentinels, outputName: "scanned-first50-public-evidence-v1" });
  const report = { kind: "m6-first-action-after50-readonly-reconciliation", passed: true, contract: address,
    nativeSubmissions: 0, proofsRequested: 0, originalTransactionId: transactionId, originalBlockHeight: native.blockHeight,
    receipt, stateSequence: 5, receiptCount: 1, nullifierCount: 1, pendingPreparationCount: 1,
    realM4M5HistoricalApisVerified: true, historicalClockFromOriginalSignedIntent: true, newAuthorizationMinted: false,
    competingNativeAttemptNotExecuted: true, publicEvidenceScan: scan, milestoneComplete: false };
  await writeFile(root + "/first-receipt-after50-verification-v1.json", JSON.stringify(report), { flag: "wx", mode: 0o600 });
  emit(report);
} catch (error) {
  await writeFile(directory + "/first-after50-reconciliation-private-error.json", JSON.stringify({ stage,
    name: error instanceof Error ? error.name : "unknown", message: error instanceof Error ? error.message : "withheld",
    stack: error instanceof Error ? error.stack : "withheld" }), { flag: "wx", mode: 0o600 });
  emit({ passed: false, stage, detailsWithheld: true, nativeSubmissions: 0 }); process.exitCode = 1;
} finally { clearTimeout(timeout); process.exit(process.exitCode ?? 0); }
