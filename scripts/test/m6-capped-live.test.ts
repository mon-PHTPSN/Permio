import assert from 'node:assert/strict';
import { it } from 'node:test';
import { cappedLiveLimits, cappedClientLimits, cappedLiveStopReason, verifyCappedLiveInitialMemory, verifyCappedClientCgroup, parseCappedLiveArguments, verifySlotResetRequest, proverCgroupPaths, proverSoftLimitHelperArguments, verifyProverCgroupLimits } from '../m6-capped-live-policy.mjs';

const initial = { MemAvailable: 5010060, SwapTotal: 2097152, SwapFree: 2091852 };
it('worker profiles are explicit and allowlisted without changing RAM, swap, jobs or deadlines', () => {
  for (const mode of ['--slot-state', '--credential-binding', '--allocation-only'] as const) {
    assert.deepEqual(parseCappedLiveArguments(['--run', mode]), {
      mode, resetBeforeSlot: false, prover: { profile: 'four-worker', cpus: 4, rayonThreads: 4, serverWorkers: 2, serverJobTimeoutSeconds: 600,
        memoryHigh: 'max', memoryMax: 4 * 1024 ** 3 },
    });
    const serial = parseCappedLiveArguments(['--run', mode, '--serial-prover']);
    assert.deepEqual(serial, { mode, resetBeforeSlot: false, prover: { profile: 'one-worker', cpus: 1, rayonThreads: 1,
      serverWorkers: 1, serverJobTimeoutSeconds: 600, memoryHigh: 'max', memoryMax: 4 * 1024 ** 3 } });
    assert(Object.isFrozen(serial) && Object.isFrozen(serial.prover));
  }
  assert.equal(cappedLiveLimits.memory + cappedClientLimits.max, 5 * 1024 ** 3);
  assert.equal(cappedLiveLimits.swap, 8 * 1024 ** 3);
  assert.equal(cappedLiveLimits.timeoutSeconds, 7200);
  for (const args of [[], ['--run'], ['--run', '--unknown'], ['--serial-prover', '--slot-state'],
    ['--run', '--slot-state', '--workers=16'], ['--run', '--slot-state', '--serial-prover', '--serial-prover']]) {
    assert.throws(() => parseCappedLiveArguments(args));
  }
});

it('experiment reclaim reproduces 5/6 GiB and one worker without enlarging shared swap or changing defaults', () => {
  const args = ['--run', '--slot-state', '--reset-before-slot', '--experiment-reclaim'];
  const { prover } = parseCappedLiveArguments(args);
  assert.deepEqual(prover, { profile: 'experiment-reclaim', cpus: 1, rayonThreads: 1, serverWorkers: 1,
    serverJobTimeoutSeconds: 600, memoryHigh: 5 * 1024 ** 3, memoryMax: 6 * 1024 ** 3 });
  assert.equal(prover.memoryMax + cappedClientLimits.max, 7 * 1024 ** 3);
  assert.equal(cappedLiveLimits.swap, 8 * 1024 ** 3);
  assert.equal(parseCappedLiveArguments(['--run', '--slot-state']).prover.memoryMax, 4 * 1024 ** 3);
  for (const value of [args.concat('--experiment-reclaim'), args.concat('--serial-prover'),
    ['--run', '--slot-state', '--experiment-reclaim'], ['--run', '--allocation-only', '--experiment-reclaim']]) {
    assert.throws(() => parseCappedLiveArguments(value));
  }
});

it('soft-limit helper can write only the exact owned prover high file, with no capabilities or network', () => {
  const id = 'a'.repeat(64), image = 'sha256:82f867abc556806f3742fb165b9cba8c898045a71e99bba8a8b33b37237bb1c9';
  const container = { Id: id, Image: image, Name: '/permio-m6-bounded-proof', State: { Running: true },
    Config: { Labels: { 'permio.owner': 'm6-capped-live' } }, HostConfig: { CgroupParent: '', CgroupnsMode: 'private',
      Memory: 6 * 1024 ** 3, MemorySwap: 14 * 1024 ** 3, NanoCpus: 1_000_000_000 } };
  const args = proverSoftLimitHelperArguments(container, id, image);
  assert.equal(args.filter(value => value.startsWith('type=bind') && !value.endsWith(',readonly')).length, 1);
  assert(args.includes(`type=bind,src=/sys/fs/cgroup/docker/${id}/memory.high,dst=/run/m6-high`));
  assert(args.includes('none') && args.includes('ALL') && args.includes('--read-only') && args.includes('no-new-privileges'));
  assert(!args.includes('--privileged') && !args.includes('/var/run/docker.sock'));
  for (const altered of [{ ...container, Id: 'b'.repeat(64) }, { ...container, Image: 'foreign' },
    { ...container, Name: '/permio-m6-proof-server' }, { ...container, State: { Running: false } },
    { ...container, Config: { Labels: { 'permio.owner': 'foreign' } } },
    { ...container, HostConfig: { ...container.HostConfig, Memory: 0 } },
    { ...container, HostConfig: { ...container.HostConfig, CgroupParent: '/foreign' } }]) {
    assert.throws(() => proverSoftLimitHelperArguments(altered, id, image));
  }
  assert.throws(() => proverSoftLimitHelperArguments(container, '../foreign', image));
  assert.throws(() => proverSoftLimitHelperArguments(container, id, 'foreign-image'));
});

it('cloud systemd cgroups retain exact ownership and a single writable high file', () => {
  const id = 'a'.repeat(64), image = 'sha256:82f867abc556806f3742fb165b9cba8c898045a71e99bba8a8b33b37237bb1c9';
  const container = { Id: id, Image: image, Name: '/permio-m6-bounded-proof', State: { Running: true },
    Config: { Labels: { 'permio.owner': 'm6-capped-live' } }, HostConfig: { CgroupParent: '', CgroupnsMode: 'private',
      Memory: 6 * 1024 ** 3, MemorySwap: 14 * 1024 ** 3, NanoCpus: 1_000_000_000 } };
  const paths = proverCgroupPaths(id, 'systemd');
  assert.deepEqual(paths, { parent: '/sys/fs/cgroup/system.slice', leaf: `/sys/fs/cgroup/system.slice/docker-${id}.scope` });
  const args = proverSoftLimitHelperArguments(container, id, image, 'systemd');
  assert.equal(args.filter(value => value.startsWith('type=bind') && !value.endsWith(',readonly')).length, 1);
  assert(args.includes(`type=bind,src=${paths.leaf}/memory.high,dst=/run/m6-high`));
  assert(args.includes('type=bind,src=/sys/fs/cgroup/system.slice/memory.max,dst=/run/m6-parent-max,readonly'));
  assert(!args.some(value => value.includes('/var/run/docker.sock')));
  proverSoftLimitHelperArguments({ ...container, HostConfig: { ...container.HostConfig, CgroupParent: 'system.slice' } }, id, image, 'systemd');
  for (const CgroupParent of ['foreign.slice', '/system.slice', '../system.slice']) {
    assert.throws(() => proverSoftLimitHelperArguments({ ...container, HostConfig: { ...container.HostConfig, CgroupParent } }, id, image, 'systemd'));
  }
});

it('cgroup path selection rejects unknown drivers and path injection', () => {
  assert.throws(() => proverCgroupPaths('../foreign', 'systemd'));
  assert.throws(() => proverCgroupPaths('a'.repeat(64), 'foreign' as 'systemd'));
  assert.throws(() => proverCgroupPaths('a'.repeat(64), '../systemd' as 'systemd'));
  assert.deepEqual(proverCgroupPaths('a'.repeat(64)), {
    parent: '/sys/fs/cgroup/docker', leaf: `/sys/fs/cgroup/docker/${'a'.repeat(64)}`,
  });
});

it('applied high threshold is mandatory, not confused with Docker memory reservation', () => {
  const { prover } = parseCappedLiveArguments(['--run', '--slot-state', '--reset-before-slot', '--experiment-reclaim']);
  const applied = { m6High: String(5 * 1024 ** 3), m6Max: String(6 * 1024 ** 3), m6SwapMax: String(8 * 1024 ** 3) };
  verifyProverCgroupLimits(applied, prover);
  for (const value of [{ ...applied, m6High: 'max' }, { ...applied, m6High: '1' },
    { ...applied, m6Max: 'max' }, { ...applied, m6SwapMax: 'max' }]) {
    assert.throws(() => verifyProverCgroupLimits(value, prover));
  }
});

it('owned reset requires explicit slot-only opt-in, rejects duplicates and preserves normal defaults', () => {
  const profile = parseCappedLiveArguments(['--run', '--slot-state', '--reset-before-slot']);
  assert.equal(profile.resetBeforeSlot, true); assert.equal(profile.prover.cpus, 4);
  assert.equal(parseCappedLiveArguments(['--run', '--slot-state', '--serial-prover', '--reset-before-slot']).prover.cpus, 1);
  for (const args of [['--run', '--credential-binding', '--reset-before-slot'],
    ['--run', '--allocation-only', '--reset-before-slot'],
    ['--run', '--slot-state', '--reset-before-slot', '--reset-before-slot']]) {
    assert.throws(() => parseCappedLiveArguments(args));
  }
});

it('reset handshake binds exact owned client/run and cannot supply a foreign container, command or endpoint', () => {
  const request = { kind: 'reset-before-slot', clientPid: 123, runName: 'm6-capped-live-Test1' };
  verifySlotResetRequest(request, 123, request.runName);
  for (const value of [null, [], { ...request, clientPid: 456 }, { ...request, kind: 'activate' },
    { ...request, runName: 'm6-capped-live-Other' }, { ...request, containerId: 'foreign' },
    { ...request, endpoint: 'https://remote.invalid' }, { ...request, command: 'PRIVATE' }]) {
    assert.throws(() => verifySlotResetRequest(value, 123, request.runName));
  }
  assert.throws(() => verifySlotResetRequest(request, 0, request.runName));
  assert.throws(() => verifySlotResetRequest(request, 123, '../foreign'));
});

it('capped runtime startup counts existing paging headroom without raising the hard RAM cap', () => {
  verifyCappedLiveInitialMemory(initial);
  assert.equal(cappedLiveLimits.memory, 4 * 1024 ** 3);
  assert.equal(cappedLiveLimits.swap, 8 * 1024 ** 3);
  assert.throws(() => verifyCappedLiveInitialMemory({ ...initial, MemAvailable: 4.25 * 1024 ** 2 - 1 }));
  assert.throws(() => verifyCappedLiveInitialMemory({ ...initial, SwapFree: 0 }));
  assert.throws(() => verifyCappedLiveInitialMemory({ ...initial, SwapTotal: 8 * 1024 ** 2 }));
  assert.throws(() => verifyCappedLiveInitialMemory({ ...initial, SwapFree: initial.SwapTotal + 1 }));
  assert.throws(() => verifyCappedLiveInitialMemory({ ...initial, MemAvailable: Number.NaN }));
});

it('the client and prover have a combined 5 GiB hard RAM ceiling, not an uncapped client', () => {
  assert.equal(cappedClientLimits.max + cappedLiveLimits.memory, 5 * 1024 ** 3);
  verifyCappedClientCgroup([{ 'memory.high': String(cappedClientLimits.high), 'memory.max': String(cappedClientLimits.max),
    'memory.swap.max': String(cappedClientLimits.swap) }, { 'memory.max': 'max', 'memory.swap.max': 'max' }]);
  assert(cappedClientLimits.oldSpaceMiB > cappedClientLimits.max / 1024 ** 2,
    'V8 virtual heap must not auto-shrink to the physical RAM cap during paging');
});

it('client startup rejects unapplied, missing and restrictive ancestor limits before wallet imports', () => {
  const leaf = { 'memory.high': String(cappedClientLimits.high), 'memory.max': String(cappedClientLimits.max),
    'memory.swap.max': String(cappedClientLimits.swap) };
  assert.throws(() => verifyCappedClientCgroup([]));
  assert.throws(() => verifyCappedClientCgroup([{ ...leaf, 'memory.high': 'max' }]));
  assert.throws(() => verifyCappedClientCgroup([{ ...leaf, 'memory.max': 'max' }]));
  assert.throws(() => verifyCappedClientCgroup([{ ...leaf, 'memory.swap.max': '0' }]));
  assert.throws(() => verifyCappedClientCgroup([leaf, { 'memory.max': '1' }]));
  assert.throws(() => verifyCappedClientCgroup([leaf, { 'memory.swap.max': '1' }]));
});

it('capped runtime keeps time, OOM, exit and shared-machine emergency guards', () => {
  const state = { running: true, oomKilled: false };
  assert.equal(cappedLiveStopReason(initial, state, 1), null);
  assert.equal(cappedLiveStopReason(initial, state, 1, true), 'caller-interrupted');
  assert.equal(cappedLiveStopReason(initial, state, 7200), 'bounded-duration');
  assert.equal(cappedLiveStopReason(initial, { ...state, oomKilled: true }, 1), 'capped-prover-oom-kill');
  assert.equal(cappedLiveStopReason(initial, { ...state, running: false }, 1), 'capped-prover-exited');
  assert.equal(cappedLiveStopReason({ ...initial, MemAvailable: 383 * 1024 }, state, 1), 'shared-machine-emergency-reserve');
  assert.equal(cappedLiveStopReason({ ...initial, MemAvailable: 767 * 1024, SwapFree: 255 * 1024 }, state, 1), 'shared-machine-swap-exhaustion');
  assert.equal(cappedLiveStopReason({ ...initial, MemAvailable: 2 * 1024 ** 2, SwapFree: 511 * 1024 }, state, 1), 'shared-machine-swap-exhaustion');
  assert.equal(cappedLiveStopReason({ ...initial, SwapFree: 512 * 1024 }, state, 1), null);
  assert.throws(() => cappedLiveStopReason({}, state, 1));
});
