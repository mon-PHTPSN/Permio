import assert from 'node:assert/strict';
import { it } from 'node:test';
import { boundedKeyLimits as limits, parseBoundedKeyArguments, readNumericCounters,
  verifyBoundedKeyCgroup, boundedKeyStopReason, verifyReusableSlotReport } from '../m6-bounded-key-policy.mjs';

const applied = { 'memory.high': String(limits.high), 'memory.max': String(limits.max), 'memory.swap.max': String(limits.swap) };
it('bounded real-key building requires explicit opt-in and rejects unknown or duplicate controls', () => {
  assert.deepEqual(parseBoundedKeyArguments(['--run']), { reuseSlot: undefined });
  assert.deepEqual(parseBoundedKeyArguments(['--run', '--reuse-slot=../fixture/logs/m6-low-memory-ABC123']),
    { reuseSlot: '../fixture/logs/m6-low-memory-ABC123' });
  for (const args of [[], ['--run', '--force'], ['--run', '--reuse-slot='], ['--run', '--reuse-slot=a', '--reuse-slot=b'],
    ['--maximum-k=21'], ['--run', '--memory-max=12G']]) assert.throws(() => parseBoundedKeyArguments(args));
});
it('numeric bounded-key sampling excludes textual payloads and rejects duplicate or unsafe counters', () => {
  assert.deepEqual(readNumericCounters('VmRSS: 12 kB\nVmSwap: 0 kB\nName: private-name\n'), { VmRSS: 12, VmSwap: 0 });
  assert.throws(() => readNumericCounters('VmRSS: 1\nVmRSS: 2'));
  assert.throws(() => readNumericCounters('VmRSS: 999999999999999999'));
});
it('bounded-key worker verifies actual limits and ancestor ceilings before starting the compiler', () => {
  verifyBoundedKeyCgroup([applied, { 'memory.max': 'max', 'memory.swap.max': 'max' }, {}]);
  assert.throws(() => verifyBoundedKeyCgroup([]));
  for (const key of Object.keys(applied)) assert.throws(() => verifyBoundedKeyCgroup([{ ...applied, [key]: 'max' }]));
  assert.throws(() => verifyBoundedKeyCgroup([applied, { 'memory.max': '1' }]));
  assert.throws(() => verifyBoundedKeyCgroup([applied, { 'memory.swap.max': '0' }]));
});
it('ordinary paging is allowed but duration, OOM and shared-memory emergencies stop the owned job', () => {
  assert.equal(boundedKeyStopReason({ MemAvailable: 600000, SwapFree: 2000000 }, { high: 400 }, 1800), null);
  assert.equal(boundedKeyStopReason({ MemAvailable: 1000000, SwapFree: 1000000 }, {}, 3600), 'bounded-duration');
  assert.equal(boundedKeyStopReason({ MemAvailable: 300000, SwapFree: 1000000 }, {}, 1), 'shared-machine-emergency-reserve');
  assert.equal(boundedKeyStopReason({ MemAvailable: 600000, SwapFree: 100000 }, {}, 1), 'shared-machine-swap-exhaustion');
  assert.equal(boundedKeyStopReason({ MemAvailable: 1000000, SwapFree: 1000000 }, { oom_kill: 1 }, 1), 'cgroup-oom-kill');
  assert.throws(() => boundedKeyStopReason({}, {}, 1));
});

// Synthetic report validates the guard only, not real compilation or key acceptance.
const expected = { programSha256: 'ab'.repeat(32), zkirSha256: 'cd'.repeat(32), publicParametersSha256: 'ef'.repeat(32) };
const successful = { kind: 'actual-pinned-slot-key-paging-experiment', compilerVersion: '0.31.1', runtimeVersion: '0.16.0',
  result: { code: 0, signal: null, measurement: { k: 20, rows: 818608 } }, fingerprints: expected, fingerprintsAfter: expected,
  keys: { prover: { bytes: 10, sha256: '11'.repeat(32) }, verifier: { bytes: 5, sha256: '22'.repeat(32) } } };
it('slot-key reuse binds exact program, compiler, public parameters and successful result, not the old deployment tag', () => {
  assert.deepEqual(verifyReusableSlotReport(successful, expected), successful.keys);
  for (const key of Object.keys(expected)) {
    assert.throws(() => verifyReusableSlotReport(successful, { ...expected, [key]: '33'.repeat(32) }));
    assert.throws(() => verifyReusableSlotReport({ ...successful,
      fingerprintsAfter: { ...expected, [key]: '33'.repeat(32) } }, expected));
  }
});
it('failed, guarded, mock, legacy or malformed slot-key reports cannot create a ready inventory', () => {
  for (const changed of [{ result: { ...successful.result, code: 1 } }, { stopReason: 'bounded-duration' },
    { failure: { message: 'failed' } }, { kind: 'mock' }, { compilerVersion: '0.35.0' },
    { result: { ...successful.result, measurement: { k: 19, rows: 818608 } } },
    { keys: { ...successful.keys, prover: { bytes: 0, sha256: '11'.repeat(32) } } }]) {
    assert.throws(() => verifyReusableSlotReport({ ...successful, ...changed }, expected));
  }
});
