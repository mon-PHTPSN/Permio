import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execute = promisify(execFile);
const COUNTERS = ["VmRSS", "VmHWM", "VmSwap", "RssAnon", "RssFile", "VmData", "Threads"] as const;

// The minimal upstream image has bash but no cat/head. Read only named public
// resource counters, never request bodies, environment variables or process args.
export const MEMORY_COUNTER_COMMAND = `
while IFS= read -r line; do
  case "$line" in VmRSS:*|VmHWM:*|VmSwap:*|RssAnon:*|RssFile:*|VmData:*|Threads:*) printf '%s\\n' "$line";; esac
done < /proc/1/status
for counter in memory.current memory.peak memory.swap.current; do
  if [[ -r /sys/fs/cgroup/$counter ]]; then
    read -r value < /sys/fs/cgroup/$counter
    printf '%s: %s\\n' "$counter" "$value"
  fi
done
while read -r name value; do
  case "$name" in anon|file) printf 'cgroup.%s: %s\\n' "$name" "$value";; esac
done < /sys/fs/cgroup/memory.stat
while read -r name value; do
  case "$name" in oom|oom_kill) printf 'cgroup.%s: %s\\n' "$name" "$value";; esac
done < /sys/fs/cgroup/memory.events
`;

export function parseProverMemoryCounters(output: string): Readonly<Record<string, number>> {
  const allowed = new Set<string>([
    ...COUNTERS, "memory.current", "memory.peak", "memory.swap.current",
    "cgroup.anon", "cgroup.file", "cgroup.oom", "cgroup.oom_kill",
  ]);
  const result: Record<string, number> = {};
  for (const line of output.split(/\r?\n/u)) {
    const match = /^([\w.]+):\s+(\d+)(?:\s+kB)?\s*$/u.exec(line);
    if (!match || !allowed.has(match[1]!)) continue;
    const value = Number(match[2]);
    if (!Number.isSafeInteger(value)) throw new TypeError("Invalid memory counter");
    const name = match[1]!;
    if (Object.hasOwn(result, name)) throw new TypeError("Duplicate memory counter");
    result[name] = value;
  }
  if (!Object.hasOwn(result, "VmRSS") || !Object.hasOwn(result, "VmHWM")) {
    throw new TypeError("Missing prover RSS or high-water counter");
  }
  return result;
}

export async function readProverMemory(): Promise<Readonly<Record<string, number>>> {
  const { stdout } = await execute("docker", [
    "exec", "permio-m6-proof-server", "/bin/bash", "-c", MEMORY_COUNTER_COMMAND,
  ], { timeout: 10_000, maxBuffer: 16_384, windowsHide: true });
  return parseProverMemoryCounters(stdout);
}

export interface MemorySampler {
  capture(phase: string): Promise<void>;
  stop(): Promise<void>;
}

export async function startProverMemorySampler(
  emit: (event: string, evidence: Readonly<Record<string, unknown>>) => void,
  read: () => Promise<Readonly<Record<string, number>>> = readProverMemory,
  intervalMs = 5_000,
): Promise<MemorySampler> {
  if (!Number.isSafeInteger(intervalMs) || intervalMs <= 0) {
    throw new TypeError("Memory sampling interval must be positive");
  }
  let active: Promise<void> | undefined;
  let stopped = false;
  let sampleCount = 0;
  let errorCount = 0;
  const capture = async (phase: string): Promise<void> => {
    // Periodic ticks skip rather than queue; explicit phase samples wait.
    const pending = (active ?? Promise.resolve()).then(async () => {
      try {
        const counters = await read();
        sampleCount += 1;
        emit("prover-memory-sample", { phase, counters, processCountersUnit: "KiB except Threads", cgroupCountersUnit: "bytes except oom counts" });
      } catch {
        errorCount += 1;
        // Do not serialize arbitrary command errors: they may contain data.
        emit("prover-memory-sample-unavailable", { phase });
      }
    });
    active = pending;
    await pending;
    if (active === pending) active = undefined;
  };
  await capture("initial");
  if (errorCount > 0) throw new Error("Initial prover memory sample failed; check Docker access");
  const timer = setInterval(() => {
    if (!active && !stopped) void capture("periodic");
  }, intervalMs);
  timer.unref();
  return {
    capture,
    async stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      await capture("final");
      emit("prover-memory-sampling-finished", { sampleCount, errorCount, complete: errorCount === 0 });
    },
  };
}

export function parseLiveM6Arguments(args: readonly string[]) {
  const accounts = args.filter((value) => !value.startsWith("--"));
  const options = args.filter((value) => value.startsWith("--"));
  const allowed = new Set(["--governance-only", "--allocation-only", "--credential-binding", "--slot-state", "--memory-smoke", "--profile-memory"]);
  if (accounts.length > 1 || options.some((value) => !allowed.has(value)) ||
      new Set(options).size !== options.length ||
      ["--governance-only", "--allocation-only", "--credential-binding", "--slot-state", "--memory-smoke"].filter((option) => options.includes(option)).length > 1) {
    throw new TypeError("usage: run-live-m6-admission.ts [account-file] [--governance-only | --allocation-only | --credential-binding | --slot-state | --memory-smoke] [--profile-memory]");
  }
  return {
    accountFile: accounts[0],
    governanceOnly: options.includes("--governance-only") || options.includes("--allocation-only") || options.includes("--credential-binding") || options.includes("--slot-state"),
    allocationOnly: options.includes("--allocation-only"),
    credentialBinding: options.includes("--credential-binding"),
    slotState: options.includes("--slot-state"),
    memorySmoke: options.includes("--memory-smoke"),
    profileMemory: options.includes("--profile-memory") || options.includes("--memory-smoke"),
  };
}
