// Constructor sizing only. No wallet, prover service, indexer, signing,
// balancing, submission or activation is available through this entry point.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ApiPromise } from "@polkadot/api";
import { verifyBusinessAuthorizationAssets } from "../packages/midnight-authorization/src/compiled-assets.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const assets = path.join(root, "packages/midnight-authorization/contracts/managed/permio-authorization-v11");
const output = path.join(root, "logs/business-v11-constructor-cost.json");
const nodeUrl = "ws://127.0.0.1:9944";
const expectedGenesis = "0xe72f7a21a0397844563b4206f887b779ffa0d937c2d1b2339441faa1f08b9846";
const expectedNormalMax = 1_299_891_843_000n;
const balancingReserve = 18_000_000_000n;

/** The real integrity verifier must finish before constructor or node code runs. */
export async function withVerifiedBusinessConstructorAssets<T>(
  directory: string, inspect: (inventory: { circuitCount: number; manifestSha256: string }) => Promise<T>,
): Promise<T> {
  await verifyBusinessAuthorizationAssets(directory);
  const manifest = await readFile(path.join(directory, "keys/build-manifest.json"));
  const inventory = JSON.parse(manifest.toString("utf8")) as { circuits: { name: string }[] };
  assert.equal(inventory.circuits.length, 11, "The exact v11 constructor requires all eleven genuine circuit assets");
  return inspect({ circuitCount: inventory.circuits.length, manifestSha256: createHash("sha256").update(manifest).digest("hex") });
}

export function summarizeBusinessConstructorWeight(input: {
  ledgerCost: bigint; nodeOverhead: bigint; normalMaxExtrinsicRefTime: bigint;
}) {
  const { ledgerCost, nodeOverhead, normalMaxExtrinsicRefTime: maximum } = input;
  assert(typeof ledgerCost === "bigint" && ledgerCost >= 0n && typeof nodeOverhead === "bigint" && nodeOverhead >= 0n &&
    typeof maximum === "bigint" && maximum > 0n, "Invalid constructor weight observation");
  const weight = ledgerCost + nodeOverhead;
  return { ledgerCost: String(ledgerCost), nodeOverhead: String(nodeOverhead), estimatedDispatchWeight: String(weight),
    normalMaxExtrinsicRefTime: String(maximum), headroomPercent: Number((maximum - weight) * 10000n / maximum) / 100,
    reserveAdjustedHeadroomPercent: Number((maximum - weight - balancingReserve) * 10000n / maximum) / 100,
    walletBalancingCostReserve: String(balancingReserve), minimumFinalHeadroomPercent: 5,
    balancingReserveClassification: "historical-assumption-not-v11-measurement",
    balancingReserveSource: "scripts/check-m6-ordinary-node-cost.ts (prior same-wallet v9 estimate: 8.96 billion; reserve: 18 billion)",
    weightWithinLimit: weight < maximum, practicalHeadroomPassed: (weight + balancingReserve) * 100n <= maximum * 95n,
    exactBalancedValidationRequired: true };
}

function unsigned(value: unknown): bigint {
  assert(typeof value === "string" && /^\d+$/.test(value) || typeof value === "number" && Number.isSafeInteger(value) && value >= 0,
    "Unexpected node weight encoding");
  return BigInt(value as string | number);
}

async function timed<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Read-only node query deadline exceeded")), 90_000);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}

async function main() {
  let api: ApiPromise | undefined, nodeAccessed = false, genuineKeysVerified = false, stage = "pinned-runtime-preflight";
  const safety = { walletInitialized: false, applicationProofGenerated: false, signed: false,
    candidateBalanced: false, balanced: false, transactionsSubmitted: 0, nativeAcceptance: false,
    syntheticPublicConstructorArguments: true, ephemeralMaintenanceKeyLogged: false };
  const save = async (report: unknown) => {
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
    process.stdout.write(`${JSON.stringify(report)}\n`);
  };
  try {
    assert.deepEqual(process.argv.slice(2), ["--check"], "Usage: node scripts/check-business-deployment-cost.ts --check");
    assert.equal(Number(process.versions.node.split(".")[0]), 22, "Use the pinned Node 22 environment");
    stage = "genuine-asset-preflight";
    await withVerifiedBusinessConstructorAssets(assets, async inventory => {
      genuineKeysVerified = true;
      stage = "constructor-only-candidate";
      const [{ CompiledContract }, { NodeZkConfigProvider }, { createUnprovenDeployTxFromVerifierKeys },
        { CostModel }, runtime, { setNetworkId }, generated, { hashProtocolIdentifier }] = await Promise.all([
        import("@midnight-ntwrk/midnight-js-protocol/compact-js"),
        import("@midnight-ntwrk/midnight-js-node-zk-config-provider"),
        import("@midnight-ntwrk/midnight-js-contracts"),
        import("@midnight-ntwrk/midnight-js-protocol/ledger"),
        import("@midnight-ntwrk/midnight-js-protocol/compact-runtime"),
        import("@midnight-ntwrk/midnight-js-network-id"),
        import("../packages/midnight-authorization/contracts/managed/permio-authorization-v11/contract/index.js"),
        import("../packages/midnight-authorization/src/canonical.ts"),
      ]);
      setNetworkId("undeployed");
      const forbidden = () => { throw new Error("Constructor cost inspection forbids application witnesses or proofs"); };
      const compiledContract = CompiledContract.make<InstanceType<typeof generated.Contract<undefined>>>("permio-authorization-v11", generated.Contract)
        .pipe(CompiledContract.withWitnesses({ getSchnorrReduction: forbidden }), CompiledContract.withCompiledFileAssets(assets));
      const publicHash = (kind: "network-id" | "namespace", value: string) => Uint8Array.from(Buffer.from(hashProtocolIdentifier(kind, value).slice(2), "hex"));
      const publicRoot = { field: BigInt(`0x${"12".repeat(31)}`) };
      const candidate = await createUnprovenDeployTxFromVerifierKeys(new NodeZkConfigProvider(assets), "01".repeat(32), {
        compiledContract, signingKey: runtime.sampleSigningKey(),
        args: [publicHash("network-id", "undeployed"), publicHash("namespace", "test.business-constructor-cost"),
          new Uint8Array(32).fill(3), publicRoot, 1n, 1n, publicRoot, 2n, 2n, 2n],
      }, "02".repeat(32));
      const bound = (await candidate.private.unprovenTx.prove({ check: forbidden, prove: forbidden }, CostModel.initialCostModel())).bind();
      const bytes = bound.serialize();
      stage = "loopback-node-cost";
      const { ApiPromise, WsProvider } = await import("@polkadot/api");
      const provider = new WsProvider(nodeUrl, false, undefined, 30_000);
      api = new ApiPromise({ provider, throwOnConnect: false, noInitWarn: true });
      nodeAccessed = true;
      await timed(provider.connect()); await timed(api.isReadyOrError);
      assert.equal(api.genesisHash.toHex(), expectedGenesis, "Local node genesis differs");
      const nodeVersion = (await timed(api.rpc.system.version())).toString();
      assert(/^1\.0\.0(?:[-+].*)?$/.test(nodeVersion), "Local node version differs from the pinned 1.0.0 deployment");
      const costJson = (await timed(api.call.midnightRuntimeApi!.getTransactionCost!(`0x${Buffer.from(bytes).toString("hex")}`))).toJSON() as { ok?: unknown };
      assert(costJson.ok !== undefined, "Local node did not return a constructor cost");
      const weights = api.consts.system!.blockWeights!.toJSON() as { perClass: { normal: { maxExtrinsic: { refTime: unknown } } } };
      const queries = api.query.midnight as unknown as Record<string, () => Promise<{ toJSON(): unknown }>>;
      assert(queries.configurableTransactionSizeWeight, "Local node overhead query is absent");
      const overhead = (await timed(queries.configurableTransactionSizeWeight())).toJSON() as { refTime: unknown };
      const normalMax = unsigned(weights.perClass.normal.maxExtrinsic.refTime);
      assert.equal(normalMax, expectedNormalMax, "Local node normal extrinsic boundary changed");
      const summary = summarizeBusinessConstructorWeight({ ledgerCost: unsigned(costJson.ok), nodeOverhead: unsigned(overhead.refTime), normalMaxExtrinsicRefTime: normalMax });
      await save({ kind: "v11-genuine-constructor-actual-local-node-cost", observedAtUtc: new Date().toISOString(),
        contractAbiVersion: 11, compilerVersion: "0.31.1", runtimeVersion: "0.16.0", nodeVersion, genesisHash: expectedGenesis,
        provableEntries: inventory.circuitCount, genuineKeysVerified: true, inventoryManifestSha256: inventory.manifestSha256,
        nativeBytes: bytes.length, nativeSha256: createHash("sha256").update(bytes).digest("hex"), ...summary, nodeAccessed, ...safety });
      if (!summary.practicalHeadroomPassed) process.exitCode = 2;
    });
  } catch {
    // SDK errors can embed ephemeral maintenance-key material. Only fixed
    // stage names, never error objects or candidate/private fields, may escape.
    await save({ kind: "v11-constructor-cost-unavailable", observedAtUtc: new Date().toISOString(), stage,
      genuineKeysVerified, requiredProvableEntries: 11, nodeAccessed,
      detailsWithheld: true, ...safety });
    process.exitCode = 1;
  } finally { await api?.disconnect().catch(() => {}); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const key of ["log", "warn", "error", "info", "debug"] as const) console[key] = () => {};
  await main();
}
