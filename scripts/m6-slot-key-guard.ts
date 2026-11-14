import assert from "node:assert/strict";

export interface SlotKeyProbeLimits {
  readonly maximumK: number;
  readonly maximumRssMiB: number;
  readonly minimumAvailableMiB: number;
  readonly timeoutSeconds: number;
}

/** Local diagnostic policy only; never a protocol or participant-chain limit. */
export function parseSlotKeyProbeLimits(args: readonly string[]): SlotKeyProbeLimits {
  const values = new Map<string, number>();
  const ranges = new Map([
    ["maximum-k", [1, 20]], ["maximum-rss-mib", [256, 6144]],
    ["minimum-available-mib", [256, 4096]], ["timeout-seconds", [10, 3600]],
  ]);
  for (const argument of args) {
    const match = /^--([a-z-]+)=([1-9][0-9]*)$/u.exec(argument);
    assert(match && ranges.has(match[1]) && !values.has(match[1]), "Invalid or duplicate slot-key probe argument");
    const value = Number(match[2]);
    const [minimum, maximum] = ranges.get(match[1])!;
    assert(Number.isSafeInteger(value) && value >= minimum && value <= maximum, "Slot-key probe argument exceeds diagnostic bounds");
    values.set(match[1], value);
  }
  return {
    maximumK: values.get("maximum-k") ?? 19,
    maximumRssMiB: values.get("maximum-rss-mib") ?? 6144,
    minimumAvailableMiB: values.get("minimum-available-mib") ?? 768,
    timeoutSeconds: values.get("timeout-seconds") ?? 1800,
  };
}

export interface SlotKeyResourceSample {
  readonly VmRSS: number;
  readonly VmHWM: number;
  readonly VmSwap: number;
  readonly Threads: number;
  readonly MemAvailableKiB: number;
  readonly SwapFreeKiB: number;
}

export function parseSlotKeyResourceSample(status: string, memory: string): SlotKeyResourceSample {
  function number(text: string, name: string): number {
    const matches = [...text.matchAll(new RegExp(`^${name}:\\s+(\\d+)(?:\\s+kB)?\\s*$`, "gm"))];
    assert(matches.length === 1, "Missing or duplicate key resource counter");
    const value = Number(matches[0][1]);
    assert(Number.isSafeInteger(value) && value >= 0, "Invalid key resource counter");
    return value;
  }
  return {
    VmRSS: number(status, "VmRSS"), VmHWM: number(status, "VmHWM"),
    VmSwap: number(status, "VmSwap"), Threads: number(status, "Threads"),
    MemAvailableKiB: number(memory, "MemAvailable"), SwapFreeKiB: number(memory, "SwapFree"),
  };
}

/** Reactive sampling guard, NOT a guaranteed RSS cap or a cgroup memory limit. */
export function slotKeyResourceStopReason(sample: SlotKeyResourceSample, limits: SlotKeyProbeLimits): string | null {
  if (sample.VmRSS >= limits.maximumRssMiB * 1024 || sample.VmHWM >= limits.maximumRssMiB * 1024) return "compiler-rss-threshold";
  if (sample.MemAvailableKiB <= limits.minimumAvailableMiB * 1024) return "shared-wsl-memory-reserve";
  return null;
}
