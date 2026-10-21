import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { validatedPublicTransaction } from "./m6-node-replay-policy.ts";
import { runLocalRecoveryDrill, type LocalRecoverySnapshot, type RecoveryTarget } from "./m6-local-recovery.ts";

const execute = promisify(execFile);
const script = fileURLToPath(import.meta.url), root = path.resolve(path.dirname(script), "..");
const nodeUrl = "http://127.0.0.1:9944", indexerUrl = "http://127.0.0.1:8088/api/v4/graphql";
const images = { "midnight-node": "midnightntwrk/midnight-node:1.0.0",
  "midnight-indexer": "midnightntwrk/indexer-standalone:4.3.3" } as const;
// Actual installed image identities, independently read from Docker Image/RepoDigests.
// Compose's historical com.docker.compose.image label is not the running image ID.
const imageIds = { "midnight-node": "sha256:ede01da35e982b6a4b85461ad8492ae2753ef14246fba33c8039b782aa8e39fb",
  "midnight-indexer": "sha256:03afd079b00bcd229df29a24771439c5e7695c339cd89216d0763ce40731cc4b" } as const;
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const emit = (value: unknown) => process.stdout.write(JSON.stringify(value) + "\n");
let stage = "arguments";

async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const response = await fetch(nodeUrl, { method: "POST", headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(5000), body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  assert(response.ok);
  const body = await response.json() as { error?: unknown; result?: T };
  assert(!body.error && body.result !== undefined);
  return body.result;
}

async function source(logFile: string) {
  assert(/^logs[\\/]+m6-live-[0-9TZ.-]+\.jsonl$/u.test(logFile), "Expected exact public Local Dev log");
  const logs = await realpath(path.join(root, "logs")), file = await realpath(path.resolve(root, logFile));
  assert(file.startsWith(logs + path.sep));
  const rows = (await readFile(file, "utf8")).trim().split("\n").map(line => JSON.parse(line));
  const ready = rows.find(row => row.event === "local-stack-ready");
  const allocations = rows.filter(row => row.event === "private-instance-allocation-accepted");
  assert(ready?.networkId === "undeployed" && ready.node === "midnight-node:1.0.0" &&
    ready.indexer === "indexer-standalone:4.3.3" && allocations.length === 1 &&
    allocations[0].contractTag === "permio-authorization-v8");
  const { contractAddress, transactionId } = allocations[0];
  assert(/^[0-9a-f]{64}$/u.test(contractAddress) && /^[0-9a-f]{66}$/u.test(transactionId));
  return { contractAddress: contractAddress as string, transactionId: transactionId as string };
}

async function readSnapshot(logFile: string): Promise<LocalRecoverySnapshot> {
  stage = "public-fixture";
  const fixture = await source(logFile);
  setNetworkId("undeployed");
  stage = "exact-finalized-transaction";
  const response = await fetch(indexerUrl, { method: "POST", headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(10000), body: JSON.stringify({ query: `query RecoverySource($offset: TransactionOffset!) {
      transactions(offset: $offset) { protocolVersion raw contractActions { address }
        ... on RegularTransaction { identifiers transactionResult { status } } }
    }`, variables: { offset: { identifier: fixture.transactionId } } }) });
  assert(response.ok);
  const payload = await response.json() as { errors?: unknown; data?: { transactions?: unknown } };
  assert(!payload.errors);
  const bytes = validatedPublicTransaction(payload.data?.transactions, fixture.transactionId, fixture.contractAddress);
  assert(Transaction.deserialize("signature", "proof", "binding", bytes).identifiers().includes(fixture.transactionId));
  stage = "indexed-contract-state";
  const provider = indexerPublicDataProvider(indexerUrl, "ws://127.0.0.1:8088/api/v4/graphql/ws");
  const state = await provider.queryContractState(fixture.contractAddress); assert(state);
  stage = "node-finalized-head";
  const head = await rpc<string>("chain_getFinalizedHead");
  assert(/^0x[0-9a-f]{64}$/u.test(head));
  const header = await rpc<{ number: string }>("chain_getHeader", [head]);
  assert(/^0x[0-9a-f]+$/u.test(header.number));
  const finalizedHeight = Number.parseInt(header.number, 16);
  assert(Number.isSafeInteger(finalizedHeight) && finalizedHeight > 0);
  return { ...fixture, contractStateSha256: sha(state.serialize()), publicTransactionSha256: sha(bytes), finalizedHeight };
}

async function docker(args: string[]) {
  // Capture Docker errors, which can contain configuration; emit fixed stages only.
  return (await execute("docker", args, { timeout: 60000, maxBuffer: 1024 * 1024, windowsHide: true })).stdout;
}
async function inspect(target: RecoveryTarget) {
  const format = '{"id":{{json .Id}},"image":{{json .Config.Image}},"imageId":{{json .Image}},' +
    '"status":{{json .State.Status}},"health":{{json .State.Health.Status}},' +
    '"bindings":{{json .HostConfig.PortBindings}},"mounts":{{json .Mounts}}}';
  return JSON.parse(await docker(["inspect", "--format", format, target]));
}

async function run(logFile: string) {
  stage = "public-fixture";
  await source(logFile);
  const checkout = path.resolve(root, "../midnight-local-dev");
  const revision = (await execute("git", ["rev-parse", "HEAD"], { cwd: checkout, windowsHide: true })).stdout.trim();
  assert.equal(revision, "902561ddc27a4b096f19835ab1528f38ace515f1");
  const baseline = {} as Record<RecoveryTarget, Awaited<ReturnType<typeof inspect>>>;
  stage = "owned-container-preflight";
  for (const target of ["midnight-node", "midnight-indexer"] as const) {
    const info = await inspect(target);
    assert(info.status === "running" && info.health === "healthy" && info.image === images[target] &&
      info.imageId === imageIds[target] && info.mounts.length === 0);
    const port = target === "midnight-node" ? "9944" : "8088";
    assert.deepEqual(info.bindings, { [port + "/tcp"]: [{ HostIp: "127.0.0.1", HostPort: port }] });
    baseline[target] = info;
  }
  const evidence = path.join(root, "logs", `m6-local-recovery-${new Date().toISOString().replaceAll(":", "-")}.jsonl`);
  await mkdir(path.dirname(evidence), { recursive: true });
  const checkpoint = async (stage: string, target: RecoveryTarget) => {
    const row = { event: "m6-local-recovery-stage", timestamp: new Date().toISOString(), stage, target };
    const { appendFile } = await import("node:fs/promises");
    await appendFile(evidence, JSON.stringify(row) + "\n"); emit(row);
  };
  const result = await runLocalRecoveryDrill({
    checkpoint,
    snapshot: async () => {
      const { stdout } = await execute(process.execPath, [script, "--read-only", logFile],
        { cwd: root, timeout: 45000, maxBuffer: 1024 * 1024, windowsHide: true });
      return JSON.parse(stdout) as LocalRecoverySnapshot;
    },
    stop: async target => {
      assert.equal((await inspect(target)).id, baseline[target].id);
      await docker(["stop", "--time", "30", baseline[target].id]);
      assert.equal((await inspect(target)).status, "exited");
    },
    assertUnavailable: async target => {
      assert.equal((await inspect(target)).status, "exited");
      let responseReceived = false;
      try {
        await fetch(target === "midnight-node" ? nodeUrl : indexerUrl,
          { signal: AbortSignal.timeout(3000) }); responseReceived = true;
      } catch { /* Outage is also independently established by exact Docker state. */ }
      assert(!responseReceived, "Stopped service still returns HTTP");
    },
    startAndWait: async target => {
      assert.equal((await inspect(target)).id, baseline[target].id);
      await docker(["start", baseline[target].id]);
      const deadline = Date.now() + 180000;
      while (Date.now() < deadline) {
        const info = await inspect(target);
        if (info.status === "running" && info.health === "healthy") return;
        await delay(2000);
      }
      throw Error("Owned Local Dev service did not recover");
    },
  });
  const report = { schemaVersion: 1, event: "m6-local-node-indexer-recovery-verified", timestamp: new Date().toISOString(),
    passed: true, network: "undeployed-local-dev", checkoutRevision: revision, contractTag: "permio-authorization-v8",
    scope: "owned infrastructure persistence and cold application reconnect; historical v8 contract, not Preprod v10 action acceptance",
    compiler: "0.31.1", ledgerLibrary: "8.1.0", midnightJs: "4.1.1", baselineContainers: baseline, ...result,
    servicesRecreated: false, newTransactions: 0, proofsCreated: 0, walletInitialized: false,
    unrelatedContainersChanged: false, ecsUsed: false, fullM6Acceptance: false,
    command: `node scripts/verify-live-m6-local-recovery.ts --interrupt-owned-local-stack ${logFile}` };
  await writeFile(evidence.replace(/\.jsonl$/u, ".json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  emit(report);
}

if (process.argv[1] && path.resolve(process.argv[1]) === script) {
  for (const key of ["log", "error", "warn", "info", "debug"] as const) console[key] = () => {};
  try {
    assert(process.argv.length === 4);
    if (process.argv[2] === "--read-only") emit(await readSnapshot(process.argv[3]!));
    else { assert.equal(process.argv[2], "--interrupt-owned-local-stack"); await run(process.argv[3]!); }
    process.exitCode = 0;
  } catch {
    emit({ event: "m6-local-recovery-failed", passed: false, stage, detailsWithheld: true }); process.exitCode = 1;
  }
}
