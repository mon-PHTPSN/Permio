import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseSlotKeyProbeLimits, parseSlotKeyResourceSample, slotKeyResourceStopReason } from "./m6-slot-key-guard.ts";

// Real isolated key attempt, NOT mock-compile or a production readiness manifest.
// Default k=19 is a local diagnostic guard, NOT a protocol or ancestry limit.
// Explicit --maximum-k=20 permits a measured real attempt within the same VM.
const limits = parseSlotKeyProbeLimits(process.argv.slice(2));
assert.equal(process.platform, "linux", "Run in the configured WSL environment");
const assets = "packages/midnight-authorization/contracts/managed/permio-authorization";
const infoBytes = await readFile(`${assets}/compiler/contract-info.json`);
const info = JSON.parse(infoBytes);
assert.equal(info["compiler-version"], "0.31.1"); assert.equal(info["runtime-version"], "0.16.0");
assert(info.circuits.some((circuit) => circuit.name === "manageRuntimeParticipantSlots" && circuit.proof === true));
const hash = (value) => createHash("sha256").update(value).digest("hex");
async function fileHash(file) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest("hex");
}
const contractSha256 = await fileHash(`${assets}/contract/index.js`);
const program = `${assets}/zkir/manageRuntimeParticipantSlots.zkir`, programSha256 = hash(await readFile(program));
await mkdir("logs", { recursive: true });
const directory = await mkdtemp("logs/m6-slot-key-probe-");
const prover = `${directory}/slot.prover`, verifier = `${directory}/slot.verifier`;
const startedAtUtc = new Date().toISOString();
const zkir = path.join(os.homedir(), ".compact/versions/0.31.1/x86_64-unknown-linux-musl/zkir");
const child = spawn(zkir, ["compile", program, prover, verifier], {
  stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, RAYON_NUM_THREADS: "1", TOKIO_WORKER_THREADS: "1" },
});
let output = "", measurement = null, guardStopped = false, stopReason = null;
function stop(reason) {
  if (stopReason !== null) return;
  stopReason = reason;
  guardStopped = child.kill("SIGTERM");
  process.stdout.write(`${JSON.stringify({ event: "slot-key-stop-requested", reason, signal: "SIGTERM", guardStopped })}\n`);
}
const onInterrupt = () => stop("caller-interrupted");
process.on("SIGTERM", onInterrupt); process.on("SIGINT", onInterrupt);
const counters = [];
let sampling = false;
let sampleErrors = 0;
const timer = setInterval(async () => {
  if (sampling || !child.pid) return;
  sampling = true;
  try {
    const [status, memory] = await Promise.all([readFile(`/proc/${child.pid}/status`, "utf8"), readFile("/proc/meminfo", "utf8")]);
    const sample = { timestamp: new Date().toISOString(), ...parseSlotKeyResourceSample(status, memory) };
    counters.push(sample);
    const reason = slotKeyResourceStopReason(sample, limits);
    if (reason) stop(reason);
    if (counters.length % 30 === 0) process.stdout.write(`${JSON.stringify({ event: "slot-key-resource-sample", ...sample })}\n`);
  } catch { sampleErrors += 1; /* exited between samples; not an exact peak guarantee */ }
  finally { sampling = false; }
}, 1000);
const deadline = setTimeout(() => stop("diagnostic-timeout"), limits.timeoutSeconds * 1000);
function chunk(bytes) {
  const text = bytes.toString("utf8"); output = (output + text).slice(-65536); process.stdout.write(text);
  const match = output.match(/\(k=(\d+), rows=(\d+)\)/);
  if (match && !measurement) {
    measurement = { k: Number(match[1]), rows: Number(match[2]), observedAtUtc: new Date().toISOString() };
    if (measurement.k > limits.maximumK) stop("local-k-threshold");
  }
}
child.stdout.on("data", chunk); child.stderr.on("data", chunk);
const result = await new Promise((resolve) => {
  child.once("error", () => resolve({ code: null, signal: null, spawnFailed: true }));
  child.once("close", (code, signal) => resolve({ code, signal, spawnFailed: false }));
});
clearInterval(timer);
clearTimeout(deadline);
process.off("SIGTERM", onInterrupt); process.off("SIGINT", onInterrupt);
assert.equal(hash(await readFile(program)), programSha256, "Slot program changed during isolated probe");
assert.equal(hash(await readFile(`${assets}/compiler/contract-info.json`)), hash(infoBytes), "Compiler inventory changed during isolated probe");
assert.equal(await fileHash(`${assets}/contract/index.js`), contractSha256, "Generated contract changed during isolated probe");
let keys = null;
if (result.code === 0 && !guardStopped) {
  assert(measurement && measurement.k <= limits.maximumK);
  const [p, v] = await Promise.all([stat(prover), stat(verifier)]); assert(p.size > 0 && v.size > 0);
  keys = { proverBytes: p.size, verifierBytes: v.size, proverSha256: await fileHash(prover), verifierSha256: await fileHash(verifier) };
}
const report = { reportVersion: 1, kind: "real-isolated-slot-key-probe", startedAtUtc, completedAtUtc: new Date().toISOString(),
  compilerVersion: "0.31.1", runtimeVersion: "0.16.0", programSha256, compilerInfoSha256: hash(infoBytes),
  contractSha256, measurement, result,
  localGuardMaximumK: limits.maximumK, limits, guardStopped, stopReason, guardIsProtocolLimit: false, keys, resourceSamples: counters,
  sampleErrors, sampleIntervalMs: 1000, hardMemoryLimitEnforced: false,
  exactPeakGuaranteed: false, productionKeyInventoryReady: false, chainTransactions: 0, milestoneComplete: false };
await writeFile(`${directory}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ report: `${directory}/report.json`, measurement, result, guardStopped, keys })}\n`);
process.exitCode = guardStopped ? 2 : result.code ?? 1;
