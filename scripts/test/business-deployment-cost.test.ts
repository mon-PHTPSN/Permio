import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, unlink, rmdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "node:test";
import { summarizeBusinessConstructorWeight, withVerifiedBusinessConstructorAssets } from "../check-business-deployment-cost.ts";

it("rejects missing and three-of-eleven key inventories before any node or provider access", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "permio-business-cost-preflight-"));
  let accesses = 0;
  const forbiddenInspection = async () => { accesses++; throw new Error("Node/wallet/proof/submission must remain unreachable"); };
  try {
    await assert.rejects(() => withVerifiedBusinessConstructorAssets(directory, forbiddenInspection), /ENOENT/);
    await mkdir(path.join(directory, "compiler")); await mkdir(path.join(directory, "contract")); await mkdir(path.join(directory, "keys"));
    const names = ["prepareRuntimeBusinessPredicate", "executeRuntimeAction", ...Array.from({ length: 9 }, (_, i) => `other${i}`)];
    const info = JSON.stringify({ "compiler-version": "0.31.1", "runtime-version": "0.16.0", circuits: names.map(name => ({ name, proof: true })) });
    const contract = "synthetic metadata fixture, never executable or usable as proving assets";
    const sha = (text: string) => createHash("sha256").update(text).digest("hex");
    await writeFile(path.join(directory, "compiler/contract-info.json"), info);
    await writeFile(path.join(directory, "contract/index.js"), contract);
    await writeFile(path.join(directory, "keys/build-manifest.json"), JSON.stringify({ manifestVersion: 2,
      mode: "real-bounded-v11-keys", compilerVersion: "0.31.1", runtimeVersion: "0.16.0",
      compilerInfoSha256: sha(info), contractSha256: sha(contract), circuits: names.slice(0, 3).map(name => ({ name })) }));
    await assert.rejects(() => withVerifiedBusinessConstructorAssets(directory, forbiddenInspection), /inventory is incomplete/);
    assert.equal(accesses, 0);
  } finally {
    for (const file of ["compiler/contract-info.json", "contract/index.js", "keys/build-manifest.json"]) await unlink(path.join(directory, file)).catch(() => {});
    for (const subdirectory of ["compiler", "contract", "keys"]) await rmdir(path.join(directory, subdirectory)).catch(() => {});
    await rmdir(directory);
  }
});

it("v12 refuses incomplete assets before constructor or node inspection", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "permio-activation-cost-preflight-"));
  let accessed = false;
  try {
    await assert.rejects(() => withVerifiedBusinessConstructorAssets(directory, async () => { accessed = true; }, 12), /ENOENT/);
    assert.equal(accessed, false);
  } finally { await rmdir(directory); }
});

it("v12 inspects only a complete ten-entry version-matched inventory", async () => {
  // Synthetic bytes test integrity and routing only, never proof validity.
  const directory = await mkdtemp(path.join(os.tmpdir(), "permio-activation-cost-inventory-"));
  const sha = (text: string) => createHash("sha256").update(text).digest("hex");
  const names = ["allocateRuntimeInstance", "manageRuntimeParticipantSlots", "prepareRuntimeBusinessPredicate",
    "prepareRuntimeAction", "executeRuntimeAction", "governAuthorization", "terminateTemplate", "manageM4Activation",
    "stageM4ActivationBinding", "updateRuntimeCredentialStatus"];
  try {
    for (const child of ["compiler", "contract", "keys", "zkir"]) await mkdir(path.join(directory, child));
    const info = JSON.stringify({ "compiler-version": "0.31.1", "runtime-version": "0.16.0", circuits: names.map(name => ({name, proof: true})) });
    await writeFile(path.join(directory, "compiler/contract-info.json"), info);
    await writeFile(path.join(directory, "contract/index.js"), "fixture");
    const circuits = [];
    for (const name of names) {
      for (const file of [`zkir/${name}.zkir`, `zkir/${name}.bzkir`, `keys/${name}.prover`, `keys/${name}.verifier`]) {
        await writeFile(path.join(directory, file), "fixture");
      }
      circuits.push({name, programSha256: sha("fixture"), proverSha256: sha("fixture"), verifierSha256: sha("fixture"),
        binaryProgramSha256: sha("fixture"), proverBytes: 7, verifierBytes: 7, binaryProgramBytes: 7});
    }
    await writeFile(path.join(directory, "keys/build-manifest.json"), JSON.stringify({manifestVersion: 2,
      mode: "real-bounded-v12-keys", compilerVersion: "0.31.1", runtimeVersion: "0.16.0", circuits,
      compilerInfoSha256: sha(info), contractSha256: sha("fixture")}));
    let accesses = 0;
    const count = await withVerifiedBusinessConstructorAssets(directory, async inventory => { accesses++; return inventory.circuitCount; }, 12);
    assert.equal(count, 10);
    await assert.rejects(() => withVerifiedBusinessConstructorAssets(directory, async () => { accesses++; }), /current real-key build manifest/);
    assert.equal(accesses, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

it("requires five percent headroom after the explicitly assumed historical 18-billion reserve", () => {
  const normalMaxExtrinsicRefTime = 1_000_000_000_000n, nodeOverhead = 5_000_000_000n;
  const safe = summarizeBusinessConstructorWeight({ ledgerCost: 920_000_000_000n, nodeOverhead, normalMaxExtrinsicRefTime });
  assert.equal(safe.estimatedDispatchWeight, "925000000000");
  assert.equal(safe.headroomPercent, 7.5);
  assert.equal(safe.reserveAdjustedHeadroomPercent, 5.7);
  assert.equal(safe.practicalHeadroomPassed, true);
  const threshold = summarizeBusinessConstructorWeight({ ledgerCost: 927_000_000_000n, nodeOverhead, normalMaxExtrinsicRefTime });
  assert.equal(threshold.practicalHeadroomPassed, true);
  const above = summarizeBusinessConstructorWeight({ ledgerCost: 927_000_000_001n, nodeOverhead, normalMaxExtrinsicRefTime });
  assert.equal(above.weightWithinLimit, true);
  assert.equal(above.practicalHeadroomPassed, false);
  assert.equal(above.walletBalancingCostReserve, "18000000000");
  assert.equal(above.balancingReserveClassification, "historical-assumption-not-v11-measurement");
  for (const invalid of [{ ledgerCost: -1n }, { nodeOverhead: -1n }, { normalMaxExtrinsicRefTime: 0n }]) {
    assert.throws(() => summarizeBusinessConstructorWeight({ ledgerCost: 1n, nodeOverhead, normalMaxExtrinsicRefTime, ...invalid }));
  }
});
