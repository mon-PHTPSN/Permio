import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { parseLiveM6Arguments, parseProverMemoryCounters, startProverMemorySampler, readProverMemory } from "../m6-prover-memory.ts";

test("memory parser retains only whitelisted numeric resource counters", () => {
  assert.deepEqual(parseProverMemoryCounters("VmRSS:\t123 kB\nVmHWM: 456 kB\nThreads: 4\nmemory.current: 8192\ncgroup.oom_kill: 0\nprivateWitness: 123\nmnemonic: private\n"), {
    VmRSS: 123, VmHWM: 456, Threads: 4, "memory.current": 8192, "cgroup.oom_kill": 0,
  });
});

test("memory parser rejects incomplete, duplicate and unsafe counters", () => {
  assert.throws(() => parseProverMemoryCounters("VmRSS: 1 kB"), /Missing/u);
  assert.throws(() => parseProverMemoryCounters("VmRSS: 1\nVmRSS: 2\nVmHWM: 3"), /Duplicate/u);
  assert.throws(() => parseProverMemoryCounters("VmRSS: 999999999999999999\nVmHWM: 3"), /Invalid/u);
});

test("prover sampling distinguishes soft reclaim events from hard-limit and OOM events", () => {
  assert.deepEqual(parseProverMemoryCounters('VmRSS: 1\nVmHWM: 2\ncgroup.high: 13988\ncgroup.max: 0\ncgroup.oom: 0\ncgroup.oom_kill: 0\n'), {
    VmRSS: 1, VmHWM: 2, 'cgroup.high': 13988, 'cgroup.max': 0, 'cgroup.oom': 0, 'cgroup.oom_kill': 0,
  });
});

test("diagnostic arguments cannot silently replace the full acceptance scope", () => {
  assert.deepEqual(parseLiveM6Arguments([]), { accountFile: undefined, governanceOnly: false, allocationOnly: false, credentialBinding: false, slotState: false, memorySmoke: false, profileMemory: false, boundedProver: false });
  assert.equal(parseLiveM6Arguments(["--slot-state"]).slotState, true);
  assert.equal(parseLiveM6Arguments(["--slot-state"]).governanceOnly, true);
  assert.throws(() => parseLiveM6Arguments(["--slot-state", "--allocation-only"]), /usage/u);
  assert.equal(parseLiveM6Arguments(["--credential-binding"]).credentialBinding, true);
  assert.throws(() => parseLiveM6Arguments(["--credential-binding", "--allocation-only"]), /usage/u);
  assert.equal(parseLiveM6Arguments(["--allocation-only"]).governanceOnly, true);
  assert.equal(parseLiveM6Arguments(["--allocation-only"]).allocationOnly, true);
  assert.throws(() => parseLiveM6Arguments(["--allocation-only", "--memory-smoke"]), /usage/u);
  assert.throws(() => parseLiveM6Arguments(["--allocation-only", "--governance-only"]), /usage/u);
  assert.equal(parseLiveM6Arguments(["--memory-smoke"]).profileMemory, true);
  assert.equal(parseLiveM6Arguments(["--profile-memory", "accounts.json", "--governance-only"]).accountFile, "accounts.json");
  for (const args of [["--memory-smoke", "--governance-only"], ["--typo"], ["a", "b"], ["--memory-smoke", "--memory-smoke"]]) {
    assert.throws(() => parseLiveM6Arguments(args), /usage/u);
  }
});

test("secondary local prover selection requires explicit flag, enables sampling and cannot inject a container command", async () => {
  const selected = parseLiveM6Arguments(["--slot-state", "--bounded-prover"]);
  assert.equal(selected.boundedProver, true);
  assert.equal(selected.profileMemory, true);
  assert.throws(() => parseLiveM6Arguments(["--bounded-prover", "--bounded-prover"]), /usage/u);
  await assert.rejects(readProverMemory("arbitrary-container; private-command"), /Unknown/u);
});

test("sampler bounds concurrent reads and finishes with a final sample", async () => {
  const events: [string, Readonly<Record<string, unknown>>][] = [];
  let concurrent = 0;
  let maximum = 0;
  const sampler = await startProverMemorySampler((event, evidence) => events.push([event, evidence]), async () => {
    concurrent += 1;
    maximum = Math.max(maximum, concurrent);
    await delay(8);
    concurrent -= 1;
    return { VmRSS: 1, VmHWM: 2 };
  }, 2);
  await delay(20);
  await Promise.all([sampler.capture("one"), sampler.capture("two")]);
  await sampler.stop();
  const eventCount = events.length;
  await delay(12);
  await sampler.stop();
  assert.equal(maximum, 1);
  assert.equal(events.length, eventCount);
  assert.equal(events.at(-2)![1].phase, "final");
  assert.equal(events.at(-1)![1].complete, true);
});

test("sampling failures never print command errors or fabricate successful profiling", async () => {
  const events: unknown[] = [];
  let calls = 0;
  const sampler = await startProverMemorySampler((event, evidence) => events.push({ event, ...evidence }), async () => {
    if (++calls > 1) throw new Error("PRIVATE-WITNESS-SENTINEL");
    return { VmRSS: 1, VmHWM: 2 };
  }, 60_000);
  await sampler.stop();
  assert.equal(JSON.stringify(events).includes("PRIVATE-WITNESS-SENTINEL"), false);
  assert.deepEqual(events.at(-1), { event: "prover-memory-sampling-finished", sampleCount: 1, errorCount: 1, complete: false });
});

test("missing Docker access fails before starting the diagnostic workload", async () => {
  await assert.rejects(startProverMemorySampler(() => {}, async () => { throw new Error("unavailable"); }), /Initial/u);
});
