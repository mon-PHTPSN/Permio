import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// Real pinned compilation, not mock proving. Bound concurrency across circuits
// as well as inside each compiler process. Never change WSL/Docker memory.
assert.equal(process.platform, "linux", "Run Compact key generation in the configured Linux/WSL environment");
const source = "packages/midnight-authorization/contracts/permio-authorization.compact";
const assets = "packages/midnight-authorization/contracts/managed/permio-authorization";
const zkir = process.env.PERMIO_ZKIR ?? path.join(os.homedir(),
  ".compact/versions/0.31.1/x86_64-unknown-linux-musl/zkir");
const env = { ...process.env, RAYON_NUM_THREADS: "1", TOKIO_WORKER_THREADS: "1" };

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.error || result.status !== 0) {
    process.stderr.write(`Compact subprocess failed: status=${result.status}, signal=${result.signal ?? "none"}\n`);
    process.exit(result.status ?? 1);
  }
}
async function hash(file) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest("hex");
}

run("compact", ["compile", "+0.31.1", "--skip-zk", source, assets]);
const info = JSON.parse(await readFile(path.join(assets, "compiler/contract-info.json"), "utf8"));
assert.equal(info["compiler-version"], "0.31.1");
assert.equal(info["runtime-version"], "0.16.0");
const names = info.circuits.filter((circuit) => circuit.proof).map((circuit) => circuit.name);
assert(names.length > 0 && names.every((name) => /^[A-Za-z][A-Za-z0-9_]*$/.test(name)));
// Fail early on the largest changed circuit instead of holding a batch of keys.
names.sort((left, right) => left === "updateRuntimeCredentialStatus" ? -1
  : right === "updateRuntimeCredentialStatus" ? 1 : left.localeCompare(right));
await mkdir(path.join(assets, "keys"), { recursive: true });
const entries = [];
for (const name of names) {
  const program = path.join(assets, "zkir", `${name}.zkir`);
  const prover = path.join(assets, "keys", `${name}.prover`);
  const verifier = path.join(assets, "keys", `${name}.verifier`);
  const programSha256 = await hash(program);
  run(zkir, ["compile", program, prover, verifier]);
  assert.equal(await hash(program), programSha256, "Proof program changed during key generation");
  const proverBytes = (await stat(prover)).size;
  const verifierBytes = (await stat(verifier)).size;
  assert(proverBytes > 0 && verifierBytes > 0, "Key generation produced an empty artifact");
  entries.push({ name, programSha256, proverSha256: await hash(prover),
    verifierSha256: await hash(verifier), proverBytes, verifierBytes });
}
// Generated public build metadata; keys/ is ignored. This is written only
// after every real key pair succeeds, so interrupted builds cannot claim ready.
await writeFile(path.join(assets, "keys/build-manifest.json"), JSON.stringify({
  manifestVersion: 1, compilerVersion: "0.31.1", runtimeVersion: "0.16.0",
  contractSha256: await hash(path.join(assets, "contract/index.js")),
  compilerInfoSha256: await hash(path.join(assets, "compiler/contract-info.json")),
  generatedAtUtc: new Date().toISOString(), mode: "real-sequential-keys", circuits: entries,
}, null, 2));
process.stdout.write(`Verified ${entries.length} real Compact key pairs.\n`);
