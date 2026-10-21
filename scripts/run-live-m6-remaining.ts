import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const root = "/opt/permio-m6-remaining-preprod-20261019-v1";
const client = root + "/client", privateDirectory = root + "/private";
const mode = process.argv[2];
assert(process.platform === "linux" && process.argv.length === 3 &&
  ["--preflight", "--deploy-only", "--prepare-governance", "--ordinary-matrix"].includes(mode!) && process.cwd() === client && await realpath(client) === client);
for (const name of ["log", "error", "warn", "info", "debug"] as const) console[name] = () => {};
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const emit = (value: Readonly<Record<string, unknown>>) => process.stdout.write(JSON.stringify({
  kind: "m6-remaining-preprod", observedAtUtc: new Date().toISOString(), ...value }) + "\n");
let stage = "private-inputs", attempts = 0, finalized = 0, checkpoints = 0, resets = 0;
async function privateFile(name: string) {
  assert(/^[a-z0-9.-]+$/u.test(name)); const file = privateDirectory + "/" + name, meta = await lstat(file);
  assert(meta.isFile() && !meta.isSymbolicLink() && meta.uid === 0 && (meta.mode & 0o777) === 0o600 && await realpath(file) === file);
  return readFile(file);
}
async function checkpoint(stage: string, value: unknown) {
  await writeFile(privateDirectory + `/checkpoint-${String(++checkpoints).padStart(3, "0")}.json`,
    JSON.stringify({ stage, value }, (_, item) => typeof item === "bigint" ? { $bigint: String(item) }
      : item instanceof Uint8Array ? { $bytes: Buffer.from(item).toString("hex") } : item), { flag: "wx", mode: 0o600 });
  emit({ phase: "private-checkpoint-saved", stage, contentsLogged: false });
}
async function reset(cpuThreads: 1 | 2 = 2) {
  const number = String(++resets).padStart(3, "0"); assert(resets <= 200);
  await writeFile(root + `/control/reset-${number}.request.json`, JSON.stringify({ number,
    owner: "permio-m6-remaining-preprod-20261019-v1", cpuThreads }), { flag: "wx", mode: 0o600 });
  for (let n = 0; n < 240; n++) {
    try {
      const reply = JSON.parse(await readFile(root + `/control/reset-${number}.verified.json`, "utf8"));
      assert(reply.number === number && reply.exactOwnedProverVerified && reply.loopbackOnly);
      if (mode === "--ordinary-matrix") assert(reply.cpuThreads === cpuThreads && reply.ramMaxBytes === 29 * 1024 ** 3 / 2 &&
        reply.ramHighBytes === 27 * 1024 ** 3 / 2 && reply.sharedHostSwapBytes === 119 * 1024 ** 3 / 8);
      return;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    await delay(500);
  }
  throw Error("Owned prover reset not verified");
}
try {
  const raw = await privateFile("inputs.json"), input = JSON.parse(raw.toString());
  assert(input.schemaVersion === 1 && input.networkId === "preprod" &&
    input.testOnlyProvenance.includes("disposable Preprod test"));
  const approval = JSON.parse((await privateFile("run-approval.json")).toString());
  assert(approval.userApproved && approval.nativeCap === 100 && approval.newContractDeployments === 1 && approval.noAutomaticRetries);
  // Testkit's import-time logger stays inside the root-only test directory.
  process.chdir(privateDirectory);
  try { await import("@midnight-ntwrk/testkit-js"); } finally { process.chdir(client); }
  const sdk = await import("@permio/midnight-authorization");
  const { probePreprodTransports } = await import("./m6-preprod-transport.ts");
  const { PreprodConnectionProfile: TransportProfile } = await import("../packages/midnight-authorization/src/preprod-profile.ts");
  const profile = new sdk.PreprodConnectionProfile(input.providerCredential, "http://127.0.0.1:6300");
  stage = "asset-and-network-preflight";
  await sdk.verifyPermioAuthorizationAssets(sdk.PERMIO_AUTHORIZATION_ASSETS_PATH);
  const transport = await probePreprodTransports(new TransportProfile(input.providerCredential, "http://127.0.0.1:6300"));
  assert(transport.http.passed && transport.http.genesisHash === sdk.PREPROD_GENESIS_HASH &&
    transport.nodeSubscription.passed && transport.indexerSubscription.passed);
  const version = await fetch("http://127.0.0.1:6300/version", { signal: AbortSignal.timeout(5000) });
  assert(version.ok && (await version.text()).trim() === "8.1.3");
  emit({ phase: "preflight-passed", genuineKeysVerified: true, expectedGenesisVerified: true,
    nodeAndIndexerSubscriptionsVerified: true, proverVersion: "8.1.3", transactionsSubmitted: 0 });
  if (mode === "--deploy-only" || mode === "--prepare-governance" || mode === "--ordinary-matrix") {
    stage = mode === "--deploy-only" ? "fresh-deployment" : "qualified-governance-continuation";
    if (mode === "--prepare-governance") checkpoints = 100;
    if (mode === "--ordinary-matrix") checkpoints = 500;
    const { setNetworkId } = await import("@midnight-ntwrk/midnight-js-network-id"); setNetworkId("preprod");
    const { createRemainingWalletTransport } = await import("./m6-remaining-wallet-transport.ts");
    const { ordinaryActionProofProvider } = await import("./m6-ordinary-proof-provider.mjs");
    const { runLiveM6Admission, createM6RemainingFixturePair } = await import("./run-live-m6-admission.ts");
    const { parseLiveM6Arguments } = await import("./m6-prover-memory.ts");
    const implementationHash = `0x${hash(await readFile(sdk.PERMIO_AUTHORIZATION_ASSETS_PATH + "/zkir/executeRuntimeAction.zkir"))}` as const;
    const sourceHash = `0x${hash(await readFile(sdk.PERMIO_AUTHORIZATION_ASSETS_PATH + "/contract/index.js"))}` as const;
    const ordinaryAction = { implementationHash, sourceHash, profile };
    const fixtures = mode === "--deploy-only" ? createM6RemainingFixturePair(ordinaryAction)
      : JSON.parse((await privateFile("fixture-pair.json")).toString()) as ReturnType<typeof createM6RemainingFixturePair>;
    if (mode === "--deploy-only") {
    await writeFile(privateDirectory + "/fixture-pair.json", JSON.stringify(fixtures), { flag: "wx", mode: 0o600 });
    const { REMAINING_POSITIVE_BUDGET, REMAINING_GOVERNANCE_BUDGET } = await import("./m6-remaining-test-budget.ts");
    await writeFile(privateDirectory + "/execution-manifest.json", JSON.stringify({ nativeCap: 100, positiveMaximum: 87,
      negativeMaximum: 13, perEntry: REMAINING_POSITIVE_BUDGET, governance: REMAINING_GOVERNANCE_BUDGET,
      fixturePairSha256: hash(await privateFile("fixture-pair.json")), implementationHash, sourceHash,
      statefulTemplateHash: fixtures.stateful.record.target.templateHash,
      nonTransitioningTemplateHash: fixtures.nonTransitioning.record.target.templateHash }), { flag: "wx", mode: 0o600 });
    } else {
      const manifest = JSON.parse((await privateFile("execution-manifest.json")).toString());
      assert(manifest.fixturePairSha256 === hash(await privateFile("fixture-pair.json")) && manifest.implementationHash === implementationHash &&
        manifest.sourceHash === sourceHash && manifest.nativeCap === 100);
    }
    const wallet = await createRemainingWalletTransport({ profile, observe(value) {
      if (value.phase === "submission-attempt") attempts++;
      if (value.phase === "finalized") finalized++;
      emit(value);
    } });
    const providers = sdk.createPreprodAuthorizationProviders(wallet, profile);
    let captured = 0;
    const proofProvider = ordinaryActionProofProvider({ port: 6300, beforeProof: async transaction => {
      const actions = [...(transaction.intents?.values() ?? [])].flatMap(intent => intent.actions);
      const entry = actions[0] && "entryPoint" in actions[0] ? actions[0].entryPoint : undefined;
      await reset(entry === "executeRuntimeAction" || entry instanceof Uint8Array && Buffer.from(entry).toString("utf8") === "executeRuntimeAction" ? 1 : 2);
    }, afterProof: () => reset(), observe: emit,
      captureProvedTransaction: async transaction => {
        const name = mode === "--deploy-only" ? "deployment-unbound-proved.bin" :
          `${mode === "--ordinary-matrix" ? "matrix" : "governance"}-unbound-proved-${String(++captured).padStart(3,"0")}.bin`;
        await writeFile(privateDirectory + "/" + name, transaction.serialize(), { flag: "wx", mode: 0o600 });
      } });
    if (mode === "--deploy-only") {
    await runLiveM6Admission(parseLiveM6Arguments(["--allocation-only"]), {
      networkId: "preprod", deploymentOnly: true, governanceOperationScope: wallet.withGovernanceOperation,
      ordinaryAction, fixtureOverride: fixtures.stateful,
      checkpointFixture: value => checkpoint("governance-fixture", value),
      withProviders: use => use({ ...providers, proofProvider }),
    });
    assert(attempts === 1 && finalized === 1);
    emit({ phase: "one-fresh-deployment-finalized", attempts, finalized, approvedCap: 100,
      moduleActivated: false, templateActivated: false, milestoneComplete: false });
    } else if (mode === "--prepare-governance") {
      const reconciled = wallet.journalState();
      assert(reconciled.reservedMaximumAttempts === 1 && reconciled.contractAddress && attempts === 0);
      const contractAddress = reconciled.contractAddress;
      for (const [index, fixture] of [fixtures.stateful, fixtures.nonTransitioning].entries()) {
        await runLiveM6Admission(parseLiveM6Arguments(["--governance-only"]), {
          networkId: "preprod", governanceOperationScope: wallet.withGovernanceOperation, ordinaryAction, fixtureOverride: fixture,
          existingFreshDeployment: { contractAddress, registeredModules: index as 0 | 1, activeTemplates: index as 0 | 1 },
          pauseAfterAdmission: true, checkpointOrdinary: checkpoint,
          withProviders: use => use({ ...providers, proofProvider }),
        });
      }
      assert(Number(attempts) === 18 && finalized === 18 && wallet.journalState().reservedMaximumAttempts === 19);
      emit({ phase: "two-modules-and-templates-admitted", contractAddress, attempts, finalized,
        totalNewFinalized: 19, instancesAllocated: 0, milestoneComplete: false });
    } else {
      const revision = JSON.parse((await privateFile("execution-manifest-v2.json")).toString());
      assert(revision.previousManifestSha256 === hash(await privateFile("execution-manifest.json")) &&
        revision.nativeCap === 100 && revision.positiveMaximum === 96 && revision.negativeMaximum === 4 &&
        revision.newContractDeployments === 1 && revision.applicationInstances === 2 && revision.noAutomaticRetries);
      const reconciled = wallet.journalState(); assert(reconciled.reservedMaximumAttempts === 19 && reconciled.contractAddress);
      const { runRemainingOrdinaryMatrix } = await import("./m6-remaining-ordinary.ts");
      const privateScanValues = [input.providerCredential];
      const collectSecret = (value: unknown) => {
        if (typeof value === "string" && value.length >= 8) privateScanValues.push(value);
        else if (value && typeof value === "object") Object.values(value).forEach(collectSecret);
      };
      collectSecret(input.secret);
      await runRemainingOrdinaryMatrix({ fixtures, address: reconciled.contractAddress, profile,
        providers: { ...providers, proofProvider }, wallet, checkpoint, emit, privateScanValues });
    }
  }
  assert(hash(await privateFile("inputs.json")) === hash(raw));
  emit({ phase: "finished", mode, attempts, finalized, privateInputsUnchanged: true, milestoneComplete: false });
} catch (error) {
  await writeFile(privateDirectory + `/remaining-${mode?.slice(2)}-private-error.json`, JSON.stringify({ stage,
    name: error instanceof Error ? error.name : "unknown", message: error instanceof Error ? error.message : "withheld",
    stack: error instanceof Error ? error.stack : "withheld" }), { flag: "wx", mode: 0o600 });
  emit({ phase: "failed", stage, attempts, finalized, reconciliationRequired: attempts > finalized,
    automaticNativeRetry: false, detailsWithheld: true }); process.exitCode = 1;
} finally { process.exit(process.exitCode ?? 0); }
