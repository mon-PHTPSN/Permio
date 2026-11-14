import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, readdir, rmdir, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const script = fileURLToPath(new URL("../compile-business-compact.mjs", import.meta.url));
const source = "packages/midnight-authorization/contracts/permio-authorization-v11.compact";
const assets = "packages/midnight-authorization/contracts/managed/permio-authorization-v11";
function invoke(args: string[]) {
  return spawnSync(process.execPath, [script, ...args], { cwd: os.tmpdir(), encoding: "utf8" });
}
function plan(args: string[]) {
  const result = invoke(["--plan", ...args]);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

describe("isolated bounded business Compact build command", () => {
  it("selects the fixed v12 activation target without changing the v11 default", () => {
    const output = plan(["--skip-zk", "--v12"]);
    assert.equal(output.source, "packages/midnight-authorization/contracts/permio-authorization-v12.compact");
    assert.equal(output.assets, "packages/midnight-authorization/contracts/managed/permio-authorization-v12");
    assert.equal(output.contractVersion, 12);
    assert.equal(plan(["--skip-zk"]).source, source);
  });
  it("prioritizes changed predicate/action measurements and refuses insufficient next-pair disk space", async () => {
    const moduleUrl = new URL("../compile-business-compact.mjs", import.meta.url);
    const helpers = await import(moduleUrl.href);
    assert.equal(typeof helpers.orderedCircuitNames, "function");
    assert.deepEqual(helpers.orderedCircuitNames(["other", "executeRuntimeAction", "prepareRuntimeBusinessPredicate", "another"]),
      ["prepareRuntimeBusinessPredicate", "executeRuntimeAction", "another", "other"]);
    assert.equal(helpers.estimatedPairBytes(20), 1024 ** 3);
    assert.throws(() => helpers.requireDiskSpace(2 * 1024 ** 3 - 1, 20), /disk/i);
    assert.doesNotThrow(() => helpers.requireDiskSpace(2 * 1024 ** 3, 20));
    assert.throws(() => helpers.estimatedPairBytes(21), /k/i);
  });

  it("publishes each verified pair exclusively and removes only its own source copy", async () => {
    const moduleUrl = new URL("../compile-business-compact.mjs", import.meta.url);
    const helpers = await import(moduleUrl.href);
    assert.equal(typeof helpers.publishKeyPair, "function");
    const directory = await mkdtemp(path.join(os.tmpdir(), "permio-business-build-test-"));
    try {
      await writeFile(path.join(directory, "sample.prover"), "synthetic-file-copy-prover");
      await writeFile(path.join(directory, "sample.verifier"), "synthetic-file-copy-verifier");
      const keys = path.join(directory, "keys");
      const entry: Record<string, any> = { name: "sample" };
      for (const suffix of ["prover", "verifier"]) {
        const bytes = await readFile(path.join(directory, `sample.${suffix}`));
        entry[`${suffix}Sha256`] = createHash("sha256").update(bytes).digest("hex");
        entry[`${suffix}Bytes`] = bytes.length;
      }
      await helpers.publishKeyPair(directory, keys, entry);
      assert.deepEqual((await readdir(directory)).sort(), ["keys"]);
      assert.equal(await readFile(path.join(keys, "sample.prover"), "utf8"), "synthetic-file-copy-prover");
      assert.equal((await readdir(keys)).includes("build-manifest.json"), false);
      await writeFile(path.join(directory, "sample.prover"), "synthetic-file-copy-prover");
      await writeFile(path.join(directory, "sample.verifier"), "synthetic-file-copy-verifier");
      await assert.rejects(() => helpers.publishKeyPair(directory, keys, entry), /EEXIST/);
      assert.equal(await readFile(path.join(directory, "sample.prover"), "utf8"), "synthetic-file-copy-prover");
    } finally {
      for (const base of [directory, path.join(directory, "keys")]) {
        for (const suffix of ["prover", "verifier"]) await unlink(path.join(base, `sample.${suffix}`)).catch(() => {});
      }
      await rmdir(path.join(directory, "keys")).catch(() => {});
      await rmdir(directory);
    }
  });

  it("selects only pinned v11 source/assets and works from another current directory", () => {
    const output = plan(["--skip-zk"]);
    assert.equal(output.source, source); assert.equal(output.assets, assets);
    assert.equal(output.compilerVersion, "0.31.1"); assert.equal(output.runtimeVersion, "0.16.0");
    assert.deepEqual(output.compile, { command: "compact", args: ["compile", "+0.31.1", "--skip-zk", source, assets] });
    assert.deepEqual(output.threads, { RAYON_NUM_THREADS: "1", TOKIO_WORKER_THREADS: "1" });
    assert.equal(output.mode, "metadata-only"); assert.equal(output.keysReady, false);
    assert.equal(output.keyReuse, "disabled"); assert.equal(output.activation, false);
  });

  it("declares the unchanged k20 and 5/6/8 GiB boundary for measurement and sequential keys", () => {
    for (const mode of ["--measure", "--keys"]) {
      const output = plan([mode]);
      assert.equal(output.requiresAppliedCgroup, true);
      assert.deepEqual(output.limits, { high: 5 * 1024 ** 3, max: 6 * 1024 ** 3, swap: 8 * 1024 ** 3,
        timeoutSeconds: 3600, reserveKiB: 384 * 1024, maximumK: 20 });
      assert.equal(output.maximumConcurrentCompilers, 1);
      assert.equal(output.provisionsSwap, false);
      assert.equal(output.relaxesLimits, false);
    }
  });

  it("requires an explicit run opt-in before measurement or key generation", () => {
    for (const mode of ["--measure", "--keys"]) {
      const result = invoke([mode]);
      assert.notEqual(result.status, 0); assert.match(result.stderr, /explicit --run/i);
    }
  });

  it("rejects ambiguous/unknown modes, target overrides, reuse and resource overrides", () => {
    for (const args of [[], ["--keys", "--measure"], ["--skip-zk", "--keys"], ["--plan", "--plan"],
      ["--source=other.compact"], ["--assets=other"], ["--plan", "--memory-max=12G"],
      ["--plan", "--maximum-k=21"], ["--plan", "--reuse-slot=old"], ["--run"]]) {
      const result = invoke(args);
      assert.notEqual(result.status, 0); assert.match(result.stderr, /usage|unsupported|duplicate|one mode/i);
    }
  });

  it("planning leaves frozen v10 source and generated identities byte-identical", () => {
    const paths = ["../../packages/midnight-authorization/contracts/permio-authorization.compact",
      "../../packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js",
      "../../packages/midnight-authorization/contracts/managed/permio-authorization/compiler/contract-info.json"];
    const fingerprints = () => paths.map(p => createHash("sha256").update(readFileSync(new URL(p, import.meta.url))).digest("hex"));
    const before = fingerprints();
    plan(["--skip-zk"]); plan(["--measure"]); plan(["--keys"]);
    assert.deepEqual(fingerprints(), before);
  });
});
