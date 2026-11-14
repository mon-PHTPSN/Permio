import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Language diagnostics only: no production compilation, keys, wallet or node.
assert.equal(process.platform, "linux", "Run the pinned Compact diagnostics in WSL/Linux");
assert.equal(process.argv.length, 2, "This diagnostic accepts no arguments");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = "packages/midnight-authorization/test/fixtures/compiler-bounds";
await mkdir(path.join(root, "logs"), { recursive: true });
const output = await mkdtemp(path.join(root, "logs/m6-slot-bounds-"));
const startedAtUtc = new Date().toISOString();
const cases = [];
for (const [name, expectedOutcome, expectedDiagnostic] of [
  ["runtime-vector-bound", "reject", /invalid context for reference to variable name count/],
  ["runtime-loop-bound", "reject", /invalid context for reference to variable name count/],
  ["constant-bound", "accept", null],
]) {
  const input = `${fixtures}/${name}.compact`;
  const destination = path.join(output, name);
  const args = ["compile", "+0.31.1", "--skip-zk", input, destination];
  const run = spawnSync("compact", args, { cwd: root, encoding: "utf8" });
  if (run.error) throw run.error;
  assert.equal(run.signal, null, `${name}: compiler was terminated`);
  // compact's wrapper can return 1 or 255 for a compiler exception. A nonzero
  // exit alone is NOT enough: require the exact expected diagnostic below.
  assert.equal(Number.isInteger(run.status), true, `${name}: no compiler exit status`);
  assert.equal(run.status === 0, expectedOutcome === "accept", `${name}: unexpected compiler outcome`);
  const diagnostic = `${run.stdout}${run.stderr}`.trim();
  if (expectedDiagnostic) assert.match(diagnostic, expectedDiagnostic, `${name}: rejection is not the expected language error`);
  let generatedControl = null;
  if (expectedOutcome === "accept") {
    const info = JSON.parse(await readFile(path.join(destination, "compiler/contract-info.json"), "utf8"));
    assert.equal(info["compiler-version"], "0.31.1");
    assert.equal(info["runtime-version"], "0.16.0");
    assert.equal(info.circuits.length, 1);
    assert.equal(info.circuits[0].proof, false);
    generatedControl = { compilerVersion: info["compiler-version"], runtimeVersion: info["runtime-version"],
      circuit: info.circuits[0].name, proofRequired: info.circuits[0].proof };
  }
  cases.push({ name, input, sourceSha256: createHash("sha256").update(await readFile(path.join(root, input))).digest("hex"),
    command: ["compact", ...args.map((arg) => path.isAbsolute(arg) ? path.relative(root, arg) : arg)],
    expectedOutcome, observedExitCode: run.status, diagnostic, generatedControl });
}
const report = { reportVersion: 1, kind: "compiler-language-diagnostic-only", startedAtUtc,
  completedAtUtc: new Date().toISOString(), compilerVersion: "0.31.1", runtimeVersion: "0.16.0",
  cases, productionAssetsChanged: false, generatedKeyPairs: 0, chainTransactions: 0,
  milestoneComplete: false,
  inference: "Runtime-sized loops/vectors cannot encode unrestricted slot provenance in a single fixed witness. This is not proof that all M6 architectures are infeasible." };
await writeFile(path.join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ report: path.relative(root, path.join(output, "report.json")), ...report }, null, 2)}\n`);
