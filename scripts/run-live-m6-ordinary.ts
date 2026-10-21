import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const root = "/opt/permio-m6-governance-20261018-v10";
const client = root + "/client", privateDirectory = root + "/private", control = root + "/control";
const mode = process.argv[2];
assert(process.platform === "linux" && process.argv.length === 3 &&
  ["--preflight", "--execute-first-flow-v1", "--resume-after-admission-begin-v1", "--resume-after-admission-finalized-v1"].includes(mode!));
const admittedResume = mode === "--resume-after-admission-finalized-v1";
const resuming = mode === "--resume-after-admission-begin-v1" || admittedResume;
assert(process.cwd() === client && await realpath(client) === client);
for (const key of ["log", "error", "warn", "info", "debug"] as const) console[key] = () => {};
const emit = (value: Readonly<Record<string, unknown>>) => process.stdout.write(JSON.stringify({
  kind: "m6-v10-ordinary-flow", observedAtUtc: new Date().toISOString(), ...value }) + "\n");
const hash = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");
let phase = "private-input-verification", attempts = 0, finalized = 0, resets = 0, checkpoints = 0, capturedUnboundTransactions = 0;
if (resuming) { attempts = finalized = admittedResume ? 10 : 8; checkpoints = admittedResume ? 200 : 100; }
async function privateFile(name: string) {
  assert(/^[a-z0-9.-]+$/.test(name));
  const file = path.join(privateDirectory, name), meta = await lstat(file);
  assert(meta.isFile() && !meta.isSymbolicLink() && meta.uid === 0 && (meta.mode & 0o777) === 0o600 && await realpath(file) === file);
  return readFile(file);
}
async function checkpoint(stage: string, value: unknown) {
  const file = path.join(privateDirectory, `runtime-${String(++checkpoints).padStart(3, "0")}.json`);
  const text = JSON.stringify({ stage, value }, (_, item) => typeof item === "bigint" ? { $bigint: String(item) }
    : item instanceof Uint8Array ? { $bytes: Buffer.from(item).toString("hex") } : item);
  await writeFile(file, text, { flag: "wx", mode: 0o600 });
  emit({ phase: "private-test-checkpoint-saved", stage, contentsLogged: false });
}
async function requestReset() {
  const number = String(++resets).padStart(3, "0"); assert(resets <= 80);
  const request = path.join(control, `reset-${number}.request.json`), ack = path.join(control, `reset-${number}.verified.json`);
  await writeFile(request, JSON.stringify({ number, owner: "permio-m6-ordinary-action-v9-20261018", requestedAtUtc: new Date().toISOString() }),
    { flag: "wx", mode: 0o600 });
  for (let waited = 0; waited < 120_000; waited += 500) {
    try {
      const reply = JSON.parse(await readFile(ack, "utf8"));
      assert(reply.number === number && reply.exactOwnedProverVerified === true && reply.loopbackOnly === true);
      return;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    await delay(500);
  }
  throw Error("Owned prover reset was not verified");
}
try {
  const raw = await privateFile("inputs.json"), input = JSON.parse(raw.toString());
  assert(input.schemaVersion === 1 && input.networkId === "preprod" && typeof input.testOnlyProvenance === "string" &&
    input.testOnlyProvenance.includes("disposable Preprod test"));
  // Testkit opens a file logger at import. Keep that side effect inside the
  // dedicated private test directory before loading the aggregate SDK package.
  process.chdir(privateDirectory);
  try { await import("@midnight-ntwrk/testkit-js"); } finally { process.chdir(client); }
  const sdk = await import("@permio/midnight-authorization");
  const { setNetworkId } = await import("@midnight-ntwrk/midnight-js-network-id");
  const { probePreprodTransports } = await import("./m6-preprod-transport.ts");
  const { PreprodConnectionProfile: TransportProfile } = await import("../packages/midnight-authorization/src/preprod-profile.ts");
  const profile = new sdk.PreprodConnectionProfile(input.providerCredential, "http://127.0.0.1:6300");
  phase = "asset-and-transport-preflight";
  await sdk.verifyPermioAuthorizationAssets(sdk.PERMIO_AUTHORIZATION_ASSETS_PATH);
  const transport = await probePreprodTransports(new TransportProfile(input.providerCredential, "http://127.0.0.1:6300"));
  assert(transport.http.passed && transport.http.genesisHash === sdk.PREPROD_GENESIS_HASH &&
    transport.nodeSubscription.passed && transport.indexerSubscription.passed);
  assert((await fetch("http://127.0.0.1:6300/version", { signal: AbortSignal.timeout(5000) })).status === 200);
  emit({ phase: "preflight-passed", keysVerified: true, expectedGenesisVerified: true,
    nodeAndIndexerSubscriptionsVerified: true, walletInitialized: false, transactionsSubmitted: 0 });
  if (mode !== "--preflight") {
    // This records exact execution scope, not an invented human approval. The
    // invoking agent must follow the current user authorization/tool review.
    const plan = JSON.parse((await privateFile("execution-plan.json")).toString());
    assert(plan.plan === "m6-v10-first-ordinary-action-v1" && plan.transactionCap === 40 &&
      plan.newDeployments === 1 && plan.noAutomaticRetries === true);
    phase = "ordinary-workflow";
    setNetworkId("preprod");
    const { createOrdinaryWalletTransport } = await import("./m6-ordinary-wallet-transport.ts");
    const { ordinaryActionProofProvider } = await import("./m6-ordinary-proof-provider.mjs");
    const { runLiveM6Admission } = await import("./run-live-m6-admission.ts");
    const { parseLiveM6Arguments } = await import("./m6-prover-memory.ts");
    const resumeRecord = resuming ? JSON.parse((await privateFile(admittedResume ? "resume-after-admitted-v1.json" : "resume-after-begin-v1.json")).toString()) : undefined;
    if (resumeRecord) assert(resumeRecord.submitted === (admittedResume ? 10 : 8) && resumeRecord.finalized === (admittedResume ? 10 : 8) &&
      (admittedResume ? resumeRecord.round11WasNeverSubmitted : resumeRecord.round9WasNeverSubmitted) === true &&
      resumeRecord.sameContractOnly === "9a5b8e294e61463c5ce5948ba0120479dd69a582e0e7fc5f84c8c9c4197af3bc");
    const fixture = resuming ? JSON.parse((await privateFile("runtime-001.json")).toString(), (_key, value) => {
      if (value && typeof value === "object" && Object.keys(value).length === 1) {
        if (typeof value.$bigint === "string") return BigInt(value.$bigint);
        if (typeof value.$bytes === "string") return Uint8Array.from(Buffer.from(value.$bytes, "hex"));
      }
      return value;
    }) : undefined;
    if (fixture) assert(fixture.stage === "governance-fixture");
    const wallet = await createOrdinaryWalletTransport({ privateDirectory, profile, submissionCap: 40,
      ...(resumeRecord ? admittedResume ? { resumeAfterAdmissionFinalized: { contractAddress: resumeRecord.sameContractOnly } }
        : { resumeAfterEightFinalized: { contractAddress: resumeRecord.sameContractOnly } } : {}),
      observe(value) {
        if (value.phase === "submission-attempt") attempts += 1;
        if (value.phase === "finalized") finalized += 1;
        emit(value);
      } });
    const providers = sdk.createPreprodAuthorizationProviders(wallet, profile);
    const implementationHash = `0x${hash(await readFile(path.join(sdk.PERMIO_AUTHORIZATION_ASSETS_PATH, "zkir/executeRuntimeAction.zkir")))}` as const;
    const sourceHash = `0x${hash(await readFile(root + "/inputs.json"))}` as const;
    await runLiveM6Admission(parseLiveM6Arguments(["--allocation-only"]), { networkId: "preprod",
      governanceOperationScope:wallet.withGovernanceOperation,
      ordinaryAction: { implementationHash, sourceHash, profile },
      ...(resumeRecord ? { resumeAfterAdmissionBegin: { fixture: fixture.value,
        contractAddress: resumeRecord.sameContractOnly, beginTransactionId: resumeRecord.transactionIds[7],
        ...(admittedResume ? { admissionFinalized: true as const, finalizationTransactionId: resumeRecord.transactionIds[9] } : {}) } } : {}),
      checkpointFixture: value => checkpoint("governance-fixture", value),
      checkpointAllocation: value => checkpoint("instance-allocation", value), checkpointOrdinary: checkpoint,
      async withProviders(use) {
        return use({ ...providers, proofProvider: ordinaryActionProofProvider({ port: 6300,
          beforeProof: requestReset, afterProof: requestReset, observe: emit,
          async captureProvedTransaction(transaction) {
            assert(++capturedUnboundTransactions <= 40);
            const name = `unbound-proved-${admittedResume ? "admitted-" : resuming ? "resume-" : ""}${String(capturedUnboundTransactions).padStart(3, "0")}.bin`;
            const bytes = transaction.serialize();
            await writeFile(path.join(privateDirectory, name), bytes, { flag: "wx", mode: 0o600 });
            assert(hash(await privateFile(name)) === hash(bytes));
            emit({ phase: "proved-unbound-transaction-preserved-privately", capturedUnboundTransactions, transactionSubmitted: false });
          } }) });
      } });
    assert(attempts === 40 && finalized === 40, "Approved first-flow transaction count differs; reconcile before continuing");
    emit({ phase: "first-flow-complete", attempts, finalized, commonReceiptVerified: true,
      disposableModuleAndTemplateRevoked: true, fullM6Acceptance: false });
  }
  assert(hash(await privateFile("inputs.json")) === hash(raw));
  emit({ phase: "finished", mode, attempts, finalized, inputFilesUnchanged: true, milestoneComplete: false });
} catch {
  emit({ phase: "failed", failedStage: phase, attempts, finalized,
    reconciliationRequired: attempts > finalized, automaticRetry: false, detailsWithheld: true, milestoneComplete: false });
  process.exitCode = 1;
} finally { process.exit(process.exitCode ?? 0); }
