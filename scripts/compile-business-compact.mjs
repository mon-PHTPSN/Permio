import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { constants, createReadStream } from "node:fs";
import { appendFile, copyFile, mkdir, mkdtemp, readFile, readdir, realpath, stat, statfs, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { boundedKeyLimits as limits, boundedKeyStopReason, readNumericCounters, verifyBoundedKeyCgroup } from "./m6-bounded-key-policy.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const contractVersion = process.argv.includes("--v12") ? 12 : 11;
const source = `packages/midnight-authorization/contracts/permio-authorization-v${contractVersion}.compact`;
const assets = `packages/midnight-authorization/contracts/managed/permio-authorization-v${contractVersion}`;
const compiler = path.join(os.homedir(), ".compact/versions/0.31.1/x86_64-unknown-linux-musl/zkir");
const threads = { RAYON_NUM_THREADS: "1", TOKIO_WORKER_THREADS: "1" };
const env = { ...process.env, ...threads };
const compile = { command: "compact", args: ["compile", "+0.31.1", "--skip-zk", source, assets] };
const usage = "usage: --skip-zk | --measure --run | --keys --run; add --plan for read-only inspection, --v12 for activation dispatch";
const diskReserveBytes = 1024 ** 3;

export function orderedCircuitNames(names) {
  const priority = name => name === "manageM4Activation" ? -1 : name === "prepareRuntimeBusinessPredicate" ? 0 : name === "executeRuntimeAction" ? 1 : 2;
  return names.slice().sort((left, right) => priority(left) - priority(right) || left.localeCompare(right));
}

export function estimatedPairBytes(k) {
  assert(Number.isSafeInteger(k) && k > 0 && k <= limits.maximumK, "Invalid bounded program k");
  return 2 ** k * 1024;
}

export function requireDiskSpace(availableBytes, k) {
  assert(Number.isSafeInteger(availableBytes) && availableBytes >= 0, "Invalid available disk counter");
  assert(availableBytes >= diskReserveBytes + estimatedPairBytes(k), "Insufficient disk for next pair plus 1GiB reserve");
}

async function checkDiskSpace(k) {
  const space = await statfs(path.join(root, assets));
  requireDiskSpace(space.bavail * space.bsize, k);
}

function options(args) {
  assert(new Set(args).size === args.length, `duplicate controls; ${usage}`);
  assert(args.every(value => ["--plan", "--skip-zk", "--measure", "--keys", "--run", "--v12"].includes(value)), `unsupported control; ${usage}`);
  const modes = args.filter(value => ["--skip-zk", "--measure", "--keys"].includes(value));
  assert(modes.length === 1 || (modes.length === 0 && args.includes("--plan") && args.every(a => ["--plan", "--v12"].includes(a))), `select one mode; ${usage}`);
  const mode = modes[0] === "--keys" ? "bounded-keys" : modes[0] === "--measure" ? "bounded-measure" : "metadata-only";
  const plan = args.includes("--plan");
  assert(plan || mode === "metadata-only" || args.includes("--run"), "Explicit --run is required for measurement or keys");
  return { mode, plan };
}

async function hash(file) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest("hex");
}
const present = file => stat(file).catch(error => { if (error.code === "ENOENT") return null; throw error; });
const json = (file, value, flag = "w") => writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600, flag });

export async function publishKeyPair(output, keys, entry) {
  assert(/^[A-Za-z][A-Za-z0-9_]*$/.test(entry.name), "Invalid owned circuit name");
  for (const suffix of ["prover", "verifier"]) {
    const file = path.join(output, `${entry.name}.${suffix}`);
    assert.equal((await stat(file)).size, entry[`${suffix}Bytes`]);
    assert.equal(await hash(file), entry[`${suffix}Sha256`]);
  }
  await mkdir(keys, { recursive: true });
  for (const suffix of ["prover", "verifier"]) {
    const file = path.join(output, `${entry.name}.${suffix}`);
    const destination = path.join(keys, `${entry.name}.${suffix}`);
    await copyFile(file, destination, constants.COPYFILE_EXCL);
    assert.equal(await hash(destination), entry[`${suffix}Sha256`]);
    // The destination was copied exclusively and verified. Remove only this
    // run's known source file, avoiding a second complete key inventory.
    await unlink(file);
  }
}

async function appliedCgroup() {
  const relative = (await readFile("/proc/self/cgroup", "utf8")).trim().split("::")[1];
  assert(relative?.startsWith("/") && !relative.includes(".."), "Expected unified Linux cgroup membership");
  const directory = path.join("/sys/fs/cgroup", relative);
  const chain = [];
  for (let current = directory;; current = path.dirname(current)) {
    assert(current === "/sys/fs/cgroup" || current.startsWith("/sys/fs/cgroup/"), "Unexpected cgroup path");
    const row = {};
    for (const key of ["memory.high", "memory.max", "memory.swap.max"]) {
      try { row[key] = (await readFile(path.join(current, key), "utf8")).trim(); }
      catch (error) { if (current !== "/sys/fs/cgroup" || error.code !== "ENOENT") throw error; }
    }
    chain.push(row);
    if (current === "/sys/fs/cgroup") break;
  }
  verifyBoundedKeyCgroup(chain);
  return { directory, chain };
}

async function fingerprints(names) {
  const files = ["contract/index.js", "compiler/contract-info.json", ...names.map(name => `zkir/${name}.zkir`)];
  const result = {};
  for (const file of files) result[file] = await hash(path.join(root, assets, file));
  async function sources(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== "managed") await sources(path.join(directory, entry.name));
      if (entry.isFile() && entry.name.endsWith(".compact")) {
        const file = path.join(directory, entry.name);
        result[path.relative(root, file)] = await hash(file);
      }
    }
  }
  await sources(path.join(root, "packages/midnight-authorization/contracts"));
  return result;
}

async function circuitJob(name, directory, mode, cgroup, batchStarted, report) {
  const output = path.join(directory, name);
  await mkdir(output, { mode: 0o700 });
  const child = spawn(compiler, ["compile", path.join(root, assets, "zkir", `${name}.zkir`),
    path.join(output, `${name}.prover`), path.join(output, `${name}.verifier`)], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  let measurement, stopReason, writes = Promise.resolve(), diskChecks = Promise.resolve(), buffer = "", killTimer;
  const job = { name, startedAtUtc: new Date().toISOString(), peaks: {} };
  report.jobs.push(job);
  function stop(reason) {
    if (stopReason) return;
    stopReason = reason;
    child.kill("SIGTERM");
    killTimer = setTimeout(() => { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); }, 10000);
    killTimer.unref();
  }
  const interrupted = () => stop("caller-interrupted");
  process.on("SIGINT", interrupted); process.on("SIGTERM", interrupted);
  for (const stream of [child.stdout, child.stderr]) stream.on("data", bytes => {
    writes = writes.then(() => appendFile(path.join(output, "compiler.log"), bytes, { mode: 0o600 }))
      .catch(() => stop("compiler-log-write-failed"));
    buffer = (buffer + bytes.toString()).slice(-65536);
    const match = buffer.match(/\(k=(\d+), rows=(\d+)\)/);
    if (match && !measurement) {
      measurement = { k: Number(match[1]), rows: Number(match[2]) };
      if (measurement.k > limits.maximumK) stop("local-k-threshold-not-protocol-limit");
      else if (mode === "bounded-measure") stop("measurement-complete");
      else diskChecks = checkDiskSpace(measurement.k).catch(() => stop("insufficient-output-disk"));
    }
  });
  let samples = Promise.resolve();
  const timer = setInterval(() => {
    samples = samples.then(async () => {
      const memory = readNumericCounters(await readFile("/proc/meminfo", "utf8"));
      const events = readNumericCounters(await readFile(path.join(cgroup, "memory.events"), "utf8"));
      const sample = { atUtc: new Date().toISOString(), elapsedSeconds: (performance.now() - batchStarted) / 1000, memory, events };
      for (const key of ["memory.current", "memory.peak", "memory.swap.current", "memory.swap.peak"]) {
        const value = Number((await readFile(path.join(cgroup, key), "utf8")).trim());
        assert(Number.isSafeInteger(value), "Invalid cgroup resource counter");
        sample[key] = value; job.peaks[key] = Math.max(job.peaks[key] ?? 0, value);
      }
      await appendFile(path.join(output, "resources.jsonl"), `${JSON.stringify(sample)}\n`, { mode: 0o600 });
      const reason = boundedKeyStopReason(memory, events, sample.elapsedSeconds);
      if (reason) stop(reason);
    }).catch(() => stop("resource-observation-failed"));
  }, 1000);
  const result = await new Promise(resolve => {
    child.once("error", () => resolve({ code: null, signal: null, spawnFailed: true }));
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  clearInterval(timer); if (killTimer) clearTimeout(killTimer);
  process.off("SIGINT", interrupted); process.off("SIGTERM", interrupted);
  await samples; await writes; await diskChecks;
  Object.assign(job, result, { measurement, stopReason, completedAtUtc: new Date().toISOString() });
  await json(path.join(output, "result.json"), job);
  return { job, output };
}

async function run(selected) {
  assert(process.platform === "linux", "Run compilation in the configured Linux/WSL environment");
  assert.equal(await realpath(root), path.resolve(root), "Repository must not be redirected through a symlink");
  let cgroup;
  if (selected.mode !== "metadata-only") cgroup = await appliedCgroup();
  const assetPath = path.join(root, assets);
  await mkdir(assetPath, { recursive: true });
  const lock = path.join(assetPath, ".business-build.lock");
  await writeFile(lock, `owned v${contractVersion} build\n`, { flag: "wx", mode: 0o600 });
  let directory, report;
  try {
    const keys = path.join(assetPath, "keys");
    if (await present(keys)) {
      assert(!(await readdir(keys)).some(file => /\.(?:prover|verifier)$/.test(file) || file === "build-manifest.json"),
        `Existing v${contractVersion} keys must be preserved and reviewed, not overwritten or reused`);
    }
    const compiled = spawnSync(compile.command, compile.args, { cwd: root, env, stdio: "inherit" });
    assert(!compiled.error && compiled.status === 0, "Pinned metadata compilation failed");
    const info = JSON.parse(await readFile(path.join(assetPath, "compiler/contract-info.json"), "utf8"));
    assert(info["compiler-version"] === "0.31.1" && info["runtime-version"] === "0.16.0", "Compiler/runtime metadata differs from pinned versions");
    const names = orderedCircuitNames(info.circuits.filter(circuit => circuit.proof).map(circuit => circuit.name));
    assert(names.length > 0 && names.every(name => /^[A-Za-z][A-Za-z0-9_]*$/.test(name)) && new Set(names).size === names.length,
      "Invalid proof-circuit inventory");
    const before = await fingerprints(names);
    if (selected.mode === "metadata-only") {
      process.stdout.write(`${JSON.stringify({ event: "business-metadata-compiled", source, assets, fingerprints: before, keysReady: false })}\n`);
      return;
    }
    const compilerSha256 = await hash(compiler);
    const started = performance.now();
    await mkdir(path.join(root, "logs"), { recursive: true });
    directory = await mkdtemp(path.join(root, "logs/business-compact-"));
    report = { reportVersion: 1, mode: selected.mode, compilerVersion: "0.31.1", runtimeVersion: "0.16.0",
      source, assets, limits, threads, appliedCgroupChain: cgroup.chain, compilerSha256, fingerprints: before,
      jobs: [], circuits: [], keysReady: false, activation: false, keyReuse: "disabled" };
    for (const name of names) {
      verifyBoundedKeyCgroup((await appliedCgroup()).chain);
      const memory = readNumericCounters(await readFile("/proc/meminfo", "utf8"));
      const events = readNumericCounters(await readFile(path.join(cgroup.directory, "memory.events"), "utf8"));
      assert.equal(boundedKeyStopReason(memory, events, (performance.now() - started) / 1000), null, "Resource boundary prevents starting the next compiler");
      if (selected.mode === "bounded-keys") await checkDiskSpace(limits.maximumK);
      const { job, output } = await circuitJob(name, directory, selected.mode, cgroup.directory, started, report);
      await json(path.join(directory, "report.json"), report);
      assert(job.measurement && job.measurement.k <= limits.maximumK && !job.spawnFailed,
        `${name}: bounded compiler did not report an acceptable measured program`);
      assert(selected.mode === "bounded-measure" ? job.stopReason === "measurement-complete" : job.code === 0 && !job.stopReason,
        `${name}: bounded compiler did not complete the requested operation`);
      if (selected.mode === "bounded-keys") {
        const entry = { name, programSha256: before[`zkir/${name}.zkir`] };
        for (const suffix of ["prover", "verifier"]) {
          const file = path.join(output, `${name}.${suffix}`); entry[`${suffix}Bytes`] = (await stat(file)).size;
          assert(entry[`${suffix}Bytes`] > 0, "Compiler produced an empty key"); entry[`${suffix}Sha256`] = await hash(file);
        }
        const binary = path.join(assetPath, "zkir", `${name}.bzkir`);
        entry.binaryProgramBytes = (await stat(binary)).size; entry.binaryProgramSha256 = await hash(binary);
        assert(entry.binaryProgramBytes > 0, "Compiler produced an empty binary program");
        await publishKeyPair(output, keys, entry);
        report.circuits.push(entry);
      }
      await json(path.join(directory, "report.json"), report);
      process.stdout.write(`${JSON.stringify({ event: "business-circuit-observed", name, measurement: job.measurement, mode: selected.mode })}\n`);
    }
    assert.deepEqual(await fingerprints(names), before, "Source/program/generated bindings changed during the build");
    assert.equal(await hash(compiler), compilerSha256, "Pinned compiler changed during the build");
    if (selected.mode === "bounded-keys") {
      assert.equal(report.circuits.length, names.length);
      for (const entry of report.circuits) for (const suffix of ["prover", "verifier"]) {
        assert.equal(await hash(path.join(keys, `${entry.name}.${suffix}`)), entry[`${suffix}Sha256`]);
      }
      for (const entry of report.circuits) {
        assert.equal(await hash(path.join(assetPath, "zkir", `${entry.name}.bzkir`)), entry.binaryProgramSha256);
      }
      await json(path.join(keys, "build-manifest.json"), { manifestVersion: 2, mode: `real-bounded-v${contractVersion}-keys`,
        compilerVersion: "0.31.1", runtimeVersion: "0.16.0", generatedAtUtc: new Date().toISOString(),
        contractSha256: before["contract/index.js"], compilerInfoSha256: before["compiler/contract-info.json"], circuits: report.circuits }, "wx");
      report.keysReady = true;
    }
  } catch (error) {
    if (report) report.failure = { message: error.message };
    throw error;
  } finally {
    if (report && directory) await json(path.join(directory, "report.json"), { ...report, completedAtUtc: new Date().toISOString() });
    await unlink(lock);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) try {
  const selected = options(process.argv.slice(2));
  if (selected.plan) process.stdout.write(`${JSON.stringify({ ...selected, source, assets, contractVersion, compilerVersion: "0.31.1", runtimeVersion: "0.16.0", compile,
    threads, limits, requiresAppliedCgroup: selected.mode !== "metadata-only", maximumConcurrentCompilers: 1,
    provisionsSwap: false, relaxesLimits: false, keyReuse: "disabled", keysReady: false, activation: false })}\n`);
  else { process.umask(0o077); await run(selected); }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
