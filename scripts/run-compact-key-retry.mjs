import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

// Public build diagnostics only: never read /proc/*/cmdline, environ or wallet
// files. No memory limits, toolchain versions, containers or contract changes.
assert.equal(process.platform, "linux", "Run in the configured WSL environment");
assert.equal(process.argv.length, 2, "This diagnostic takes no arguments");
const directory = path.resolve("logs", `m6-key-retry-${new Date().toISOString().replaceAll(":", "-")}`);
mkdirSync(directory, { recursive: true });
const events = path.join(directory, "resources.jsonl");
const output = path.join(directory, "compiler.log");
const started = performance.now();
const peaks = new Map();

function event(name, fields = {}) {
  const line = `${JSON.stringify({ timestamp: new Date().toISOString(), event: name,
    elapsedSeconds: Math.round((performance.now() - started) / 100) / 10, ...fields })}\n`;
  appendFileSync(events, line);
  process.stdout.write(line);
}
function oomRecords() {
  try {
    return execFileSync("dmesg", ["--color=never"], { encoding: "utf8" })
      .split("\n").filter((line) => /Out of memory: Killed process/.test(line));
  } catch { return null; }
}
const baselineOom = oomRecords();
const bootId = readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
const child = spawn(process.execPath, ["scripts/compile-compact-sequential.mjs"], {
  stdio: ["ignore", "pipe", "pipe"],
});
for (const stream of [child.stdout, child.stderr]) {
  stream.on("data", (chunk) => { appendFileSync(output, chunk); process.stdout.write(chunk); });
}
event("started", { buildPid: child.pid, bootId, logDirectory: path.relative(process.cwd(), directory),
  memoryUnit: "KiB", baselineKernelOomRecords: baselineOom?.length ?? null });

function sample() {
  try {
    const rows = execFileSync("ps", ["-eo", "pid=,ppid=,comm=,rss=,vsz=,time="], { encoding: "utf8" })
      .trim().split("\n").map((line) => {
        const [pid, parentPid, name, rssKiB, virtualKiB, cpuTime] = line.trim().split(/\s+/);
        return { pid: Number(pid), parentPid: Number(parentPid), name,
          rssKiB: Number(rssKiB), virtualKiB: Number(virtualKiB), cpuTime };
      });
    const selected = new Set([child.pid]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const row of rows) if (selected.has(row.parentPid) && !selected.has(row.pid)) {
        selected.add(row.pid); changed = true;
      }
    }
    const processes = rows.filter((row) => selected.has(row.pid)).map((row) => {
      let status = "";
      try { status = readFileSync(`/proc/${row.pid}/status`, "utf8"); } catch { /* exited between samples */ }
      const counters = {};
      for (const field of ["VmHWM", "VmSwap", "Threads"]) {
        const match = status.match(new RegExp(`^${field}:\\s+(\\d+)`, "m"));
        if (match) counters[field] = Number(match[1]);
      }
      const record = { ...row, ...counters };
      const previous = peaks.get(row.pid);
      peaks.set(row.pid, { pid: row.pid, name: row.name,
        maxSampledRssKiB: Math.max(row.rssKiB, previous?.maxSampledRssKiB ?? 0),
        maxObservedHwmKiB: Math.max(counters.VmHWM ?? 0, previous?.maxObservedHwmKiB ?? 0),
        maxSampledSwapKiB: Math.max(counters.VmSwap ?? 0, previous?.maxSampledSwapKiB ?? 0) });
      return record;
    });
    const memory = {};
    for (const line of readFileSync("/proc/meminfo", "utf8").split("\n")) {
      const match = line.match(/^(MemTotal|MemAvailable|SwapTotal|SwapFree):\s+(\d+)/);
      if (match) memory[`${match[1]}KiB`] = Number(match[2]);
    }
    event("sample", { memory, processes });
  } catch {
    event("sample-unavailable", { detailsWithheld: true });
  }
}
sample();
const timer = setInterval(sample, 10_000);
const result = await new Promise((resolve) => {
  child.once("error", () => resolve({ code: null, signal: null, spawnFailed: true }));
  child.once("close", (code, signal) => resolve({ code, signal, spawnFailed: false }));
});
clearInterval(timer);
const finalOom = oomRecords();
const newOom = baselineOom && finalOom ? finalOom.filter((line) => !baselineOom.includes(line)) : null;
event("finished", { ...result, observedProcessPeaks: [...peaks.values()], newKernelOomRecords: newOom,
  exactPeakGuaranteed: false, userProofLatencyMeasured: false });
process.exitCode = result.code ?? 1;
