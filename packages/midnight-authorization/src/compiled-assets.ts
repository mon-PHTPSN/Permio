import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

async function sha256(file: string): Promise<string> {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest("hex");
}

interface KeyEntry {
  name: string; programSha256: string; proverSha256: string; verifierSha256: string;
  proverBytes: number; verifierBytes: number;
}

/** Local build integrity, not governance trust or proof verification. No wallet access. */
export async function verifyPermioAuthorizationAssets(assets: string): Promise<void> {
  const manifest = JSON.parse(await readFile(path.join(assets, "keys/build-manifest.json"), "utf8")) as {
    manifestVersion: number; compilerVersion: string; runtimeVersion: string; mode: string;
    contractSha256: string; compilerInfoSha256: string; circuits: KeyEntry[];
  };
  assert(manifest.manifestVersion === 1 && manifest.mode === "real-sequential-keys" &&
    manifest.compilerVersion === "0.31.1" && manifest.runtimeVersion === "0.16.0",
  "Compact assets require the current real-key build manifest");
  const infoFile = path.join(assets, "compiler/contract-info.json");
  const info = JSON.parse(await readFile(infoFile, "utf8")) as {
    "compiler-version": string; "runtime-version": string; circuits: { name: string; proof?: unknown }[];
  };
  assert(info["compiler-version"] === manifest.compilerVersion &&
    info["runtime-version"] === manifest.runtimeVersion, "Compact asset versions differ");
  assert(await sha256(infoFile) === manifest.compilerInfoSha256 &&
    await sha256(path.join(assets, "contract/index.js")) === manifest.contractSha256,
  "Compact generated bindings differ from the real-key build");
  const expectedNames = info.circuits.filter((circuit) => circuit.proof).map((circuit) => circuit.name).sort();
  assert(expectedNames.length > 0 && expectedNames.every((name) => /^[A-Za-z][A-Za-z0-9_]*$/.test(name)),
    "Invalid compiled circuit inventory");
  assert(Array.isArray(manifest.circuits) && manifest.circuits.length === expectedNames.length &&
    JSON.stringify(manifest.circuits.map((entry) => entry.name).sort()) === JSON.stringify(expectedNames),
  "Compact key inventory is incomplete or duplicated");
  for (const entry of manifest.circuits) {
    assert(await sha256(path.join(assets, "zkir", `${entry.name}.zkir`)) === entry.programSha256,
      "Compact proof program differs from its key build");
    for (const suffix of ["prover", "verifier"] as const) {
      const file = path.join(assets, "keys", `${entry.name}.${suffix}`);
      const size = (await stat(file)).size;
      assert(size > 0 && size === entry[`${suffix}Bytes`] &&
        await sha256(file) === entry[`${suffix}Sha256`], "Compact proving assets are missing or mismatched");
    }
  }
}
