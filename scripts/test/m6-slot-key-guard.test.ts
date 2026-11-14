import assert from "node:assert/strict";
import test from "node:test";
import { parseSlotKeyProbeLimits, parseSlotKeyResourceSample, slotKeyResourceStopReason } from "../m6-slot-key-guard.ts";

test("slot-key probe keeps the historical k19 default and requires explicit k20", () => {
  assert.deepEqual(parseSlotKeyProbeLimits([]), { maximumK: 19, maximumRssMiB: 6144, minimumAvailableMiB: 768, timeoutSeconds: 1800 });
  assert.equal(parseSlotKeyProbeLimits(["--maximum-k=20"]).maximumK, 20);
  assert.equal(parseSlotKeyProbeLimits(["--timeout-seconds=60", "--maximum-rss-mib=2048"]).maximumRssMiB, 2048);
});

test("slot-key probe rejects malformed, duplicate, unsafe or unbounded arguments", () => {
  for (const args of [["--maximum-k=20", "--maximum-k=19"], ["--unknown=1"], ["--maximum-k", "20"],
    ["--maximum-k=21"], ["--maximum-k=0"], ["--maximum-rss-mib=6145"], ["--minimum-available-mib=0"],
    ["--timeout-seconds=3601"], ["--timeout-seconds=-1"], ["--maximum-k=999999999999999999"]]) {
    assert.throws(() => parseSlotKeyProbeLimits(args));
  }
});

const status = "VmRSS: 123 kB\nVmHWM: 456 kB\nVmSwap: 0 kB\nThreads: 2\nPRIVATE-SENTINEL: secret\n";
const memory = "MemAvailable: 2097152 kB\nSwapFree: 1048576 kB\nMemTotal: 9999999 kB\n";
test("slot-key resource sampling returns numeric public counters only", () => {
  assert.deepEqual(parseSlotKeyResourceSample(status, memory), {
    VmRSS: 123, VmHWM: 456, VmSwap: 0, Threads: 2, MemAvailableKiB: 2097152, SwapFreeKiB: 1048576,
  });
  assert(!JSON.stringify(parseSlotKeyResourceSample(status, memory)).includes("PRIVATE-SENTINEL"));
});

test("slot-key resource parser rejects missing, duplicate and unsafe measurements", () => {
  assert.throws(() => parseSlotKeyResourceSample("VmRSS: 1 kB\n", memory));
  assert.throws(() => parseSlotKeyResourceSample(`${status}VmRSS: 2 kB\n`, memory));
  assert.throws(() => parseSlotKeyResourceSample(status.replace("123", "999999999999999999"), memory));
});

test("slot-key sampling stops at the RSS, historical high-water or shared-VM reserve boundary", () => {
  const limits = parseSlotKeyProbeLimits([]), sample = parseSlotKeyResourceSample(status, memory);
  assert.equal(slotKeyResourceStopReason(sample, limits), null);
  assert.equal(slotKeyResourceStopReason({ ...sample, VmRSS: 6144 * 1024 }, limits), "compiler-rss-threshold");
  assert.equal(slotKeyResourceStopReason({ ...sample, VmHWM: 6144 * 1024 }, limits), "compiler-rss-threshold");
  assert.equal(slotKeyResourceStopReason({ ...sample, MemAvailableKiB: 768 * 1024 }, limits), "shared-wsl-memory-reserve");
});
