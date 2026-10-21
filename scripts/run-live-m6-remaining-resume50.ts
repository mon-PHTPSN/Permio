import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import type { createM6RemainingFixturePair } from "./run-live-m6-admission.ts";

const root = "/opt/permio-m6-remaining-preprod-20261019-v1", client = root + "/client", privateDirectory = root + "/private";
assert(process.platform === "linux" && process.argv.length === 3 && process.argv[2] === "--second-after50" &&
  process.cwd() === client && await realpath(client) === client);
for (const name of ["log", "error", "warn", "info", "debug"] as const) console[name] = () => {};
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const emit = (value: Readonly<Record<string, unknown>>) => process.stdout.write(JSON.stringify({ kind: "m6-remaining-preprod-v4",
  observedAtUtc: new Date().toISOString(), ...value }) + "\n");
let stage = "checkpoint-boundary", attempts = 0, finalized = 0, resets = 0, checkpoints = 3000, captured = 0;
async function privateFile(name: string) {
  assert(/^[a-z0-9.-]+$/u.test(name)); const file = privateDirectory + "/" + name, stat = await lstat(file);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.uid === 0 && (stat.mode & 0o777) === 0o600 && await realpath(file) === file);
  return readFile(file);
}
async function checkpoint(stage: string, value: unknown) {
  const text = JSON.stringify({ stage, value }, function (key, encoded) {
    const original = this[key]; return typeof original === "bigint" ? { $bigint: String(original) }
      : original instanceof Uint8Array ? { $bytes: Buffer.from(original).toString("hex") } : encoded;
  });
  await writeFile(privateDirectory + `/checkpoint-v4-${++checkpoints}.json`, text, { flag: "wx", mode: 0o600 });
  emit({ phase: "private-checkpoint-saved", stage, contentsLogged: false });
}
async function reset(mainProof?: 1) {
  const profilePath = root + "/control-ordinary-v4/small-prover-profile.json", stat = await lstat(profilePath);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.uid === 0 && (stat.mode & 0o777) === 0o600 && await realpath(profilePath) === profilePath);
  const profile = JSON.parse(await readFile(profilePath, "utf8"));
  assert(profile.owner === "permio-m6-remaining-preprod-20261019-v1" && [2, 3, 4].includes(profile.cpuThreads));
  const cpuThreads: 1 | 2 | 3 | 4 = mainProof ?? profile.cpuThreads;
  const number = String(++resets).padStart(3, "0"); assert(resets <= 180);
  await writeFile(root + `/control-ordinary-v4/reset-${number}.request.json`, JSON.stringify({ number,
    owner: "permio-m6-remaining-preprod-20261019-v1", cpuThreads }), { flag: "wx", mode: 0o600 });
  for (let n = 0; n < 240; n++) {
    try {
      const reply = JSON.parse(await readFile(root + `/control-ordinary-v4/reset-${number}.verified.json`, "utf8"));
      assert(reply.number === number && reply.exactOwnedProverVerified && reply.loopbackOnly && reply.cpuThreads === cpuThreads);
      assert(reply.ramMaxBytes === 29 * 1024 ** 3 / 2 && reply.sharedHostSwapBytes === 119 * 1024 ** 3 / 8 &&
        reply.ramHighBytes === (cpuThreads === 1 ? 27 : 23) * 1024 ** 3 / 2); return;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    await delay(500);
  }
  throw Error("Owned v3 prover reset not independently verified");
}
try {
  const paused = JSON.parse(await readFile(root + "/pause-after45-v1.json", "utf8"));
  assert(paused.pausedAtExactFinalizedBoundary && paused.alreadyFinalized === 45 && paused.rollingWalletCheckpointSaved &&
    paused.ownedClientAndProverStopped && paused.temporaryResourcesRestored && !paused.completedTransactionsReplayed);
  const files = await readdir(privateDirectory);
  assert(files.filter(name => /^wallet-[0-9]{3}-submission\.json$/u.test(name)).length === 50 &&
    files.filter(name => /^wallet-[0-9]{3}-reservation\.json$/u.test(name)).length === 51 && !files.some(name => /^wallet-052-/u.test(name)));
  const rawInputs = await privateFile("inputs.json"), input = JSON.parse(rawInputs.toString());
  assert(input.schemaVersion === 1 && input.networkId === "preprod" && input.testOnlyProvenance.includes("disposable Preprod test"));
  const approval = JSON.parse((await privateFile("run-approval.json")).toString());
  assert(approval.userApproved && approval.nativeCap === 100 && approval.newContractDeployments === 1 && approval.noAutomaticRetries);
  const revision = JSON.parse((await privateFile("execution-manifest-v5.json")).toString());
  assert(revision.nativeCap === 100 && revision.applicationInstances === 2 && revision.resumeAfterNativeAttempts === 50 &&
    revision.abandonedReservationId === 51 && revision.phaseReservationCeiling === 92 && revision.additionalNativeThisPhaseMaximum === 41 &&
    revision.thirdInstanceNotAuthorized && revision.finalRevocationDeferred && revision.noAutomaticRetries);
  const abandoned = JSON.parse((await privateFile("wallet-051-abandoned.json")).toString());
  assert(abandoned.neverSubmittedVerified && abandoned.originalExpiryPassed && abandoned.reservationId === 51);
  process.chdir(privateDirectory); try { await import("@midnight-ntwrk/testkit-js"); } finally { process.chdir(client); }
  const sdk = await import("@permio/midnight-authorization");
  const { setNetworkId } = await import("@midnight-ntwrk/midnight-js-network-id"); setNetworkId("preprod");
  const { restoreM6GovernanceFixture } = await import("./run-live-m6-admission.ts");
  const { reviveRemainingCheckpoint, restoreRemainingAfter45 } = await import("./m6-restore-remaining-checkpoint.ts");
  const { createRemainingWalletTransport } = await import("./m6-remaining-wallet-transport.ts");
  const { ordinaryActionProofProvider } = await import("./m6-ordinary-proof-provider.mjs");
  const { runRemainingOrdinaryMatrixV2 } = await import("./m6-remaining-ordinary-v2.ts");
  const { probePreprodTransports } = await import("./m6-preprod-transport.ts");
  const { PreprodConnectionProfile: TransportProfile } = await import("../packages/midnight-authorization/src/preprod-profile.ts");
  stage = "pinned-assets-and-network";
  await sdk.verifyPermioAuthorizationAssets(sdk.PERMIO_AUTHORIZATION_ASSETS_PATH);
  const manifest = JSON.parse((await privateFile("execution-manifest.json")).toString());
  assert(manifest.fixturePairSha256 === hash(await privateFile("fixture-pair.json")) && manifest.nativeCap === 100 &&
    manifest.implementationHash === `0x${hash(await readFile(sdk.PERMIO_AUTHORIZATION_ASSETS_PATH + "/zkir/executeRuntimeAction.zkir"))}` &&
    manifest.sourceHash === `0x${hash(await readFile(sdk.PERMIO_AUTHORIZATION_ASSETS_PATH + "/contract/index.js"))}`);
  const fixtures = JSON.parse((await privateFile("fixture-pair.json")).toString()) as ReturnType<typeof createM6RemainingFixturePair>;
  const profile = new sdk.PreprodConnectionProfile(input.providerCredential, "http://127.0.0.1:6300");
  const transport = await probePreprodTransports(new TransportProfile(input.providerCredential, "http://127.0.0.1:6300"));
  assert(transport.http.passed && transport.http.genesisHash === sdk.PREPROD_GENESIS_HASH &&
    transport.nodeSubscription.passed && transport.indexerSubscription.passed);
  const version = await fetch("http://127.0.0.1:6300/version", { signal: AbortSignal.timeout(5000) });
  assert(version.ok && (await version.text()).trim() === "8.1.3");
  stage = "private-data-restore-and-50-exact-outcomes";
  const saved = await Promise.all(files.filter(name => /^checkpoint-[0-9]{3}\.json$/u.test(name)).sort()
    .map(async name => JSON.parse((await privateFile(name)).toString(), reviveRemainingCheckpoint)));
  const address = "70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c";
  const resume = restoreRemainingAfter45(restoreM6GovernanceFixture(fixtures.stateful), saved, address);
  const wallet = await createRemainingWalletTransport({ profile, planVersion: 4, phaseAttemptCeiling: 92, observe(value) {
    if (value.phase === "submission-attempt") attempts++;
    if (value.phase === "finalized") finalized++;
    emit(value);
  } });
  assert(wallet.journalState().reservedMaximumAttempts === 51 && wallet.journalState().contractAddress === address);
  const providers = sdk.createPreprodAuthorizationProviders(wallet, profile);
  const state = await providers.publicDataProvider.queryContractState(address); assert(state);
  const view = sdk.readPermioAuthorizationLedger(state.data), allocation = resume.allocated.allocation;
  assert.equal(view.runtimeInstances.size(), 1n); assert.equal(view.decisionReceipts.size(), 1n);
  assert.equal(view.usedRuntimeActionNullifiers.size(), 1n); assert.equal(view.runtimeActionSessions.size(), 1n);
  const instance = view.runtimeInstances.lookup(allocation.instanceCommitment);
  const completedFirst = JSON.parse((await privateFile("first-completed-after50-private.json")).toString(), reviveRemainingCheckpoint) as
    NonNullable<Parameters<typeof runRemainingOrdinaryMatrixV2>[0]["completedFirst"]>;
  assert.equal(instance.transitionSequence, completedFirst.first.checked.sequence + 1n);
  assert.deepEqual(instance.currentStateCommitment, sdk.permioAuthorizationPureCircuits.runtimeStateCommitment(
    completedFirst.first.checked.candidates[completedFirst.first.checked.selectedCandidateIndex]!.expectedNextState));
  assert.deepEqual(view.credentialStatusRoots.lookup(allocation.target.namespaceHash).root, resume.setup.credentials!.status.root);
  assert.equal(view.credentialStatusRoots.lookup(allocation.target.namespaceHash).rootSequence, 3n);
  assert.equal(view.authorityRoots.lookup(allocation.target.namespaceHash).rootSequence, 1n);
  const firstReceipt = completedFirst.first.checked.receipt;
  const receiptId = Uint8Array.from(Buffer.from(firstReceipt.receiptId.replace(/^0x/u, ""), "hex"));
  assert.equal(sdk.runtimeDecisionReceiptId(view.decisionReceipts.lookup(receiptId)), firstReceipt.receiptId);
  emit({ phase: "checkpoint-50-continuation-qualified", alreadyAttempted: 50, alreadyConfirmed: 50,
    priorNativeRejections: 0, explicitlyAbandonedReservation: 51, allPriorExactBytesAndOutcomesReconciled: true, firstReceiptAndStateVerified: true,
    newContractDeployments: 0, additionalNativeAttemptsMaximum: 41, noAutomaticRetries: true });
  const proofProvider = ordinaryActionProofProvider({ port: 6300, beforeProof: async transaction => {
    const actions = [...(transaction.intents?.values() ?? [])].flatMap(intent => intent.actions);
    const entry = actions[0] && "entryPoint" in actions[0] ? actions[0].entryPoint : undefined;
    await reset(entry === "executeRuntimeAction" || entry instanceof Uint8Array && Buffer.from(entry).toString("utf8") === "executeRuntimeAction" ? 1 : undefined);
  }, afterProof: () => reset(), observe: emit, captureProvedTransaction: async transaction => {
    assert(++captured <= 60); await writeFile(privateDirectory + `/matrix-v4-unbound-proved-${String(captured).padStart(3, "0")}.bin`,
      transaction.serialize(), { flag: "wx", mode: 0o600 });
  } });
  const privateScanValues = [input.providerCredential];
  const collect = (value: unknown) => {
    if (typeof value === "string" && value.length >= 8) privateScanValues.push(value);
    else if (value && typeof value === "object") Object.values(value).forEach(collect);
  }; collect(input.secret);
  stage = "remaining-ordinary-matrix-v4";
  await runRemainingOrdinaryMatrixV2({ fixtures, address, profile, resume, completedFirst, secondFlowOnly: true,
    providers: { ...providers, proofProvider }, wallet, checkpoint, emit, privateScanValues });
  assert(attempts === 41 && finalized === 38 && wallet.journalState().reservedMaximumAttempts === 92 && wallet.journalState().maximumNativeAttemptsReserved === 91);
  assert(hash(await privateFile("inputs.json")) === hash(rawInputs));
  emit({ phase: "finished", firstFlowPhaseOnly: false, attempts, finalized, totalNewAttempts: 91, totalNewFinalized: 88,
    nativeNegativeRejections: 3, applicationInstances: 2, remainingNativeAttemptsMaximum: 9, finalRevocationDeferred: true, firstConflictNativeTestStillOpen: true,
    privateInputsUnchanged: true, milestoneComplete: false });
} catch (error) {
  await writeFile(privateDirectory + "/remaining-ordinary-matrix-v4-private-error.json", JSON.stringify({ stage,
    name: error instanceof Error ? error.name : "unknown", message: error instanceof Error ? error.message : "withheld",
    stack: error instanceof Error ? error.stack : "withheld" }), { flag: "wx", mode: 0o600 });
  emit({ phase: "failed", stage, attempts, finalized, reconciliationRequired: attempts > finalized,
    automaticNativeRetry: false, detailsWithheld: true }); process.exitCode = 1;
} finally { process.exit(process.exitCode ?? 0); }
