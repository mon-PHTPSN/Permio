import assert from 'node:assert/strict';

export const GiB = 1024 ** 3;
export const boundedKeyLimits = Object.freeze({ high: 5 * GiB, max: 6 * GiB, swap: 8 * GiB,
  timeoutSeconds: 3600, reserveKiB: 384 * 1024, maximumK: 20 });

export function parseBoundedKeyArguments(args) {
  assert(args.length >= 1 && args[0] === '--run', 'Explicit --run is required');
  const rest = args.slice(1);
  assert(rest.length <= 1 && rest.every(value => value.startsWith('--reuse-slot=')),
    'usage: --run [--reuse-slot=<experiment-report-directory>]');
  const reuseSlot = rest[0]?.slice('--reuse-slot='.length);
  assert(reuseSlot === undefined || reuseSlot.length > 0, 'Empty slot reuse directory');
  return { reuseSlot };
}

export function readNumericCounters(text) {
  const counters = {};
  for (const line of text.trim().split('\n')) {
    if (!line.trim()) continue;
    const [rawKey, rawValue] = line.trim().split(/\s+/);
    const key = rawKey.replace(/:$/, '');
    // Strings, paths, process identities and unknown textual values are excluded.
    if (!/^\d+$/.test(rawValue ?? '')) continue;
    assert(!(key in counters), 'Duplicate resource counter');
    const value = Number(rawValue);
    assert(Number.isSafeInteger(value), 'Unsafe resource counter');
    counters[key] = value;
  }
  return counters;
}

export function verifyBoundedKeyCgroup(chain) {
  assert(Array.isArray(chain) && chain.length > 0, 'Missing cgroup ancestry');
  for (const [key, expected] of [['memory.high', boundedKeyLimits.high], ['memory.max', boundedKeyLimits.max],
    ['memory.swap.max', boundedKeyLimits.swap]]) {
    assert(String(chain[0][key]) === String(expected), `Applied ${key} differs from the reviewed profile`);
  }
  for (const ancestor of chain.slice(1)) {
    for (const [key, expected] of [['memory.max', boundedKeyLimits.max], ['memory.swap.max', boundedKeyLimits.swap]]) {
      const value = ancestor[key];
      assert(value === undefined || value === 'max' || (/^\d+$/.test(value) && Number(value) >= expected),
        `Ancestor ${key} is more restrictive`);
    }
  }
}

export function boundedKeyStopReason(memory, events, elapsedSeconds) {
  assert(Number.isFinite(elapsedSeconds) && elapsedSeconds >= 0, 'Invalid elapsed time');
  assert(Number.isSafeInteger(memory.MemAvailable) && Number.isSafeInteger(memory.SwapFree), 'Missing memory counters');
  if (elapsedSeconds >= boundedKeyLimits.timeoutSeconds) return 'bounded-duration';
  if ((events.oom_kill ?? 0) > 0) return 'cgroup-oom-kill';
  if (memory.MemAvailable < boundedKeyLimits.reserveKiB) return 'shared-machine-emergency-reserve';
  if (memory.SwapFree < 256 * 1024 && memory.MemAvailable < 768 * 1024) return 'shared-machine-swap-exhaustion';
  return null;
}

/** Local build provenance only: never a governance attestation or proof verification. */
export function verifyReusableSlotReport(report, expected) {
  assert(report.kind === 'actual-pinned-slot-key-paging-experiment' && report.compilerVersion === '0.31.1' &&
    report.runtimeVersion === '0.16.0' && report.result?.code === 0 && report.result.signal === null &&
    !report.stopReason && !report.failure && report.keys, 'Slot report is not a successful real pinned build');
  assert(report.result.measurement?.k === 20 && report.result.measurement.rows === 818608,
    'Slot report has an unexpected program measurement');
  for (const key of ['programSha256', 'zkirSha256', 'publicParametersSha256']) {
    assert(report.fingerprints?.[key] === expected[key] && report.fingerprintsAfter?.[key] === expected[key],
      `Slot report ${key} differs from the current program/compiler/parameters`);
  }
  for (const key of ['prover', 'verifier']) {
    assert(Number.isSafeInteger(report.keys[key]?.bytes) && report.keys[key].bytes > 0 &&
      /^[0-9a-f]{64}$/.test(report.keys[key].sha256), 'Malformed slot key metadata');
  }
  return report.keys;
}
