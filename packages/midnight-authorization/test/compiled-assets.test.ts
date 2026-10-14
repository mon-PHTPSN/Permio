import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "node:test";
import { verifyPermioAuthorizationAssets } from "../src/compiled-assets.ts";

const hash = (data: string) => createHash("sha256").update(data).digest("hex");

// Fake bytes test the integrity guard only, never a real compiler/proof claim.
it("rejects missing, stale, empty, duplicated and mismatched build assets before live startup", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "permio-assets-test-"));
  try {
    for (const child of ["compiler", "contract", "keys", "zkir"]) {
      await mkdir(path.join(directory, child));
    }
    await assert.rejects(verifyPermioAuthorizationAssets(directory), /ENOENT/);
    const info = JSON.stringify({ "compiler-version": "0.31.1", "runtime-version": "0.16.0",
      circuits: [{ name: "testCircuit", proof: {} }] });
    await writeFile(path.join(directory, "compiler/contract-info.json"), info);
    await writeFile(path.join(directory, "contract/index.js"), "fixture");
    await writeFile(path.join(directory, "zkir/testCircuit.zkir"), "program");
    await writeFile(path.join(directory, "keys/testCircuit.prover"), "prover");
    await writeFile(path.join(directory, "keys/testCircuit.verifier"), "verifier");
    const entry = { name: "testCircuit", programSha256: hash("program"), proverSha256: hash("prover"),
      verifierSha256: hash("verifier"), proverBytes: 6, verifierBytes: 8 };
    const manifest = { manifestVersion: 1, compilerVersion: "0.31.1", runtimeVersion: "0.16.0",
      mode: "real-sequential-keys", contractSha256: hash("fixture"), compilerInfoSha256: hash(info),
      circuits: [entry] };
    const save = async (value: unknown) => writeFile(path.join(directory, "keys/build-manifest.json"), JSON.stringify(value));
    await save(manifest);
    await verifyPermioAuthorizationAssets(directory);
    await save({ ...manifest, circuits: [entry, entry] });
    await assert.rejects(verifyPermioAuthorizationAssets(directory), /incomplete or duplicated/);
    await save(manifest);
    for (const [file, replacement, pattern] of [
      ["zkir/testCircuit.zkir", "altered", /proof program differs/],
      ["contract/index.js", "altered", /bindings differ/],
      ["keys/testCircuit.prover", "", /missing or mismatched/],
      ["keys/testCircuit.verifier", "replaced", /missing or mismatched/],
    ] as const) {
      const original = await readFile(path.join(directory, file));
      await writeFile(path.join(directory, file), replacement);
      await assert.rejects(verifyPermioAuthorizationAssets(directory), pattern);
      await writeFile(path.join(directory, file), original);
    }
  } finally {
    // Exact path created by mkdtemp in this test, never a repository/user path.
    await rm(directory, { recursive: true, force: true });
  }
});
