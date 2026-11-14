import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "node:test";
import { verifyBusinessAuthorizationAssets, verifyPermioAuthorizationAssets } from "../src/compiled-assets.ts";

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
    await writeFile(path.join(directory, "zkir/testCircuit.bzkir"), "binary-program");
    await writeFile(path.join(directory, "keys/testCircuit.prover"), "prover");
    await writeFile(path.join(directory, "keys/testCircuit.verifier"), "verifier");
    const entry = { name: "testCircuit", programSha256: hash("program"), proverSha256: hash("prover"),
      verifierSha256: hash("verifier"), proverBytes: 6, verifierBytes: 8,
      binaryProgramSha256: hash('binary-program'), binaryProgramBytes: 14 };
    const manifest = { manifestVersion: 2, compilerVersion: "0.31.1", runtimeVersion: "0.16.0",
      mode: "real-sequential-keys", contractSha256: hash("fixture"), compilerInfoSha256: hash(info),
      circuits: [entry] };
    const save = async (value: unknown) => writeFile(path.join(directory, "keys/build-manifest.json"), JSON.stringify(value));
    await save(manifest);
    await verifyPermioAuthorizationAssets(directory);
    await save({ ...manifest, manifestVersion: 1 });
    await assert.rejects(verifyPermioAuthorizationAssets(directory), /current real-key build manifest/);
    await save(manifest);
    await rm(path.join(directory, 'zkir/testCircuit.bzkir'));
    await assert.rejects(verifyPermioAuthorizationAssets(directory), /ENOENT/);
    await writeFile(path.join(directory, 'zkir/testCircuit.bzkir'), 'binary-program');
    await save({ ...manifest, mode: "real-bounded-keys" });
    await verifyPermioAuthorizationAssets(directory);
    await save({ ...manifest, mode: "mock-or-unverified-inventory" });
    await assert.rejects(verifyPermioAuthorizationAssets(directory), /current real-key build manifest/);
    await save({ ...manifest, circuits: [entry, entry] });
    await assert.rejects(verifyPermioAuthorizationAssets(directory), /incomplete or duplicated/);
    await save(manifest);
    for (const [file, replacement, pattern] of [
      ["zkir/testCircuit.zkir", "altered", /proof program differs/],
      ["zkir/testCircuit.bzkir", "altered", /binary proof program/],
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

async function businessAssetsFixture(names = ["prepareRuntimeBusinessPredicate", "executeRuntimeAction"]) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "permio-business-assets-test-"));
  for (const child of ["compiler", "contract", "keys", "zkir"]) await mkdir(path.join(directory, child));
  const info = JSON.stringify({ "compiler-version": "0.31.1", "runtime-version": "0.16.0",
    circuits: names.map(name => ({ name, proof: {} })) });
  await writeFile(path.join(directory, "compiler/contract-info.json"), info);
  await writeFile(path.join(directory, "contract/index.js"), "fixture");
  const circuits = [];
  for (const name of names) {
    for (const [file, content] of [[`zkir/${name}.zkir`, "program"], [`zkir/${name}.bzkir`, "binary-program"],
      [`keys/${name}.prover`, "prover"], [`keys/${name}.verifier`, "verifier"]]) {
      await writeFile(path.join(directory, file!), content!);
    }
    circuits.push({ name, programSha256: hash("program"), proverSha256: hash("prover"),
      verifierSha256: hash("verifier"), proverBytes: 6, verifierBytes: 8,
      binaryProgramSha256: hash("binary-program"), binaryProgramBytes: 14 });
  }
  const manifest = { manifestVersion: 2, compilerVersion: "0.31.1", runtimeVersion: "0.16.0",
    mode: "real-bounded-v11-keys", contractSha256: hash("fixture"), compilerInfoSha256: hash(info), circuits };
  const save = async (value: unknown = manifest) =>
    writeFile(path.join(directory, "keys/build-manifest.json"), JSON.stringify(value));
  await save();
  return { directory, manifest, save };
}

// Synthetic file bytes exercise profile isolation and integrity, not proof validity.
it("keeps legacy and business authorization real-key profiles separate", async () => {
  const { directory, manifest, save } = await businessAssetsFixture();
  try {
    await verifyBusinessAuthorizationAssets(directory);
    await assert.rejects(verifyPermioAuthorizationAssets(directory), /current real-key build manifest/);
    for (const mode of ["real-sequential-keys", "real-bounded-keys", "mock-or-unverified-inventory"]) {
      await save({ ...manifest, mode });
      await assert.rejects(verifyBusinessAuthorizationAssets(directory), /current real-key build manifest/);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

it("requires both business predicate preparation and execution proof circuits", async () => {
  for (const names of [["executeRuntimeAction"], ["prepareRuntimeBusinessPredicate"], ["testCircuit"]]) {
    const { directory } = await businessAssetsFixture(names);
    try {
      await assert.rejects(verifyBusinessAuthorizationAssets(directory), /business authorization proof circuits/i);
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
  const { directory, manifest, save } = await businessAssetsFixture();
  try {
    const info = JSON.stringify({ "compiler-version": "0.31.1", "runtime-version": "0.16.0",
      circuits: [{ name: "prepareRuntimeBusinessPredicate" }, { name: "executeRuntimeAction", proof: {} }] });
    await writeFile(path.join(directory, "compiler/contract-info.json"), info);
    await save({ ...manifest, compilerInfoSha256: hash(info),
      circuits: manifest.circuits.filter(entry => entry.name === "executeRuntimeAction") });
    await assert.rejects(verifyBusinessAuthorizationAssets(directory), /business authorization proof circuits/i);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

it("preserves every hash, size and inventory guard for business authorization assets", async () => {
  const { directory, manifest, save } = await businessAssetsFixture();
  try {
    const circuit = "executeRuntimeAction";
    for (const [file, replacement, pattern] of [
      ["compiler/contract-info.json", `${await readFile(path.join(directory, "compiler/contract-info.json"), "utf8")} `, /bindings differ/],
      ["contract/index.js", "Fixture", /bindings differ/],
      [`zkir/${circuit}.zkir`, "Program", /proof program differs/],
      [`zkir/${circuit}.bzkir`, "Binary-program", /binary proof program/],
      [`keys/${circuit}.prover`, "Prover", /missing or mismatched/],
      [`keys/${circuit}.verifier`, "Verifier", /missing or mismatched/],
      [`zkir/${circuit}.bzkir`, "", /binary proof program/],
      [`keys/${circuit}.prover`, "", /missing or mismatched/],
      [`keys/${circuit}.verifier`, "", /missing or mismatched/],
    ] as const) {
      const original = await readFile(path.join(directory, file));
      await writeFile(path.join(directory, file), replacement);
      await assert.rejects(verifyBusinessAuthorizationAssets(directory), pattern);
      await writeFile(path.join(directory, file), original);
    }
    await save({ ...manifest, circuits: [manifest.circuits[0], manifest.circuits[0]] });
    await assert.rejects(verifyBusinessAuthorizationAssets(directory), /incomplete or duplicated/);
    await save({ ...manifest, circuits: [manifest.circuits[0]] });
    await assert.rejects(verifyBusinessAuthorizationAssets(directory), /incomplete or duplicated/);
    await save(manifest);
    await verifyBusinessAuthorizationAssets(directory);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
