import assert from 'node:assert/strict';
import { GiB } from './m6-bounded-key-policy.mjs';

export const cappedLiveLimits = Object.freeze({ memory: 4 * GiB, swap: 8 * GiB, cpus: 4,
  timeoutSeconds: 7200, reserveKiB: 384 * 1024 });
export const cappedClientLimits = Object.freeze({ high: 0.75 * GiB, max: GiB, swap: 4 * GiB,
  oldSpaceMiB: 3072 });

/** Default profiles stay unchanged; reclaim is an explicit reproduction of the key experiment. */
export function parseCappedLiveArguments(args) {
  assert(Array.isArray(args) && args.length >= 2 && args.length <= 5 && args[0] === '--run' &&
    ['--slot-state', '--credential-binding', '--allocation-only'].includes(args[1]) &&
    args.slice(2).every(value => ['--serial-prover', '--reset-before-slot', '--experiment-reclaim'].includes(value)) &&
    new Set(args.slice(2)).size === args.length - 2 &&
    (!args.includes('--reset-before-slot') || args[1] === '--slot-state') &&
    (!args.includes('--experiment-reclaim') || (args[1] === '--slot-state' &&
      args.includes('--reset-before-slot') && !args.includes('--serial-prover'))),
  'usage: --run MODE [--serial-prover] [--reset-before-slot] | --run --slot-state --reset-before-slot --experiment-reclaim');
  const reclaim = args.includes('--experiment-reclaim'), serial = reclaim || args.includes('--serial-prover');
  return Object.freeze({ mode: args[1], resetBeforeSlot: args.includes('--reset-before-slot'), prover: Object.freeze({
    profile: reclaim ? 'experiment-reclaim' : serial ? 'one-worker' : 'four-worker', cpus: serial ? 1 : cappedLiveLimits.cpus,
    memoryHigh: reclaim ? 5 * GiB : 'max', memoryMax: reclaim ? 6 * GiB : cappedLiveLimits.memory,
    rayonThreads: serial ? 1 : 4,
    serverWorkers: serial ? 1 : 2, serverJobTimeoutSeconds: 600,
  }) });
}

/** Only this controller's exact owned prover receives a writable single-file mount. */
export function proverCgroupPaths(expectedId, driver = 'cgroupfs') {
  assert(/^[a-f0-9]{64}$/.test(expectedId), 'Invalid exact prover container ID');
  assert(['cgroupfs', 'systemd'].includes(driver), 'Unsupported Docker cgroup driver');
  const parent = driver === 'cgroupfs' ? '/sys/fs/cgroup/docker' : '/sys/fs/cgroup/system.slice';
  return Object.freeze({ parent, leaf: driver === 'cgroupfs' ? `${parent}/${expectedId}` : `${parent}/docker-${expectedId}.scope` });
}

export function proverSoftLimitHelperArguments(container, expectedId, expectedImage, driver = 'cgroupfs') {
  const paths = proverCgroupPaths(expectedId, driver);
  assert(/^[a-f0-9]{64}$/.test(expectedId) &&
    expectedImage === 'sha256:82f867abc556806f3742fb165b9cba8c898045a71e99bba8a8b33b37237bb1c9' &&
    container?.Id === expectedId && container.Image === expectedImage &&
    container.Name === '/permio-m6-bounded-proof' && container.State.Running &&
    container.Config.Labels['permio.owner'] === 'm6-capped-live' &&
    (container.HostConfig.CgroupParent === '' || (driver === 'systemd' && container.HostConfig.CgroupParent === 'system.slice')) &&
    container.HostConfig.CgroupnsMode === 'private' &&
    container.HostConfig.Memory === 6 * GiB && container.HostConfig.MemorySwap === 14 * GiB &&
    container.HostConfig.NanoCpus === 1_000_000_000, 'Never change a foreign or unbounded prover cgroup');
  return ['run', '--rm', '--name', `permio-m6-high-${expectedId.slice(0, 12)}`, '--label', 'permio.owner=m6-capped-live',
    '--network', 'none', '--cap-drop', 'ALL', '--read-only', '--security-opt', 'no-new-privileges',
    '--pids-limit', '16', '--memory', '67108864', '--memory-swap', '67108864', '--cpus', '0.25',
    '--entrypoint', '/bin/bash',
    '--mount', `type=bind,src=${paths.leaf}/memory.high,dst=/run/m6-high`,
    '--mount', `type=bind,src=${paths.parent}/memory.max,dst=/run/m6-parent-max,readonly`,
    '--mount', `type=bind,src=${paths.parent}/memory.swap.max,dst=/run/m6-parent-swap,readonly`,
    expectedImage, '-c', 'set -eu; read -r m6Max < /run/m6-parent-max; read -r m6Swap < /run/m6-parent-swap; ' +
    '[[ "$m6Max" == max || "$m6Max" -ge 6442450944 ]]; [[ "$m6Swap" == max || "$m6Swap" -ge 8589934592 ]]; ' +
    'printf "5368709120\\n" > /run/m6-high; read -r m6High < /run/m6-high; printf "%s %s %s\\n" "$m6High" "$m6Max" "$m6Swap"'];
}

export function verifyProverCgroupLimits(applied, profile) {
  assert(applied.m6Max === String(profile.memoryMax) && applied.m6SwapMax === String(cappedLiveLimits.swap) &&
    applied.m6High === String(profile.memoryHigh), 'Actual prover soft/hard/swap cgroup limits differ');
}

/** Public resource handshake only; never accept a command, endpoint or container ID. */
export function verifySlotResetRequest(request, expectedPid, expectedRunName) {
  assert(request && typeof request === 'object' && !Array.isArray(request) &&
    Object.keys(request).sort().join(',') === 'clientPid,kind,runName' &&
    Number.isSafeInteger(expectedPid) && expectedPid > 0 &&
    /^m6-capped-live-[A-Za-z0-9]+$/.test(expectedRunName) &&
    request.kind === 'reset-before-slot' && request.clientPid === expectedPid && request.runName === expectedRunName,
  'Invalid owned slot-prover reset request');
}

export function verifyCappedClientCgroup(chain) {
  assert(Array.isArray(chain) && chain.length > 0, 'Missing client cgroup ancestry');
  for (const [key, expected] of [['memory.high', cappedClientLimits.high], ['memory.max', cappedClientLimits.max],
    ['memory.swap.max', cappedClientLimits.swap]]) {
    assert(String(chain[0][key]) === String(expected), `Client ${key} differs from the fixed profile`);
  }
  for (const ancestor of chain.slice(1)) {
    for (const [key, expected] of [['memory.max', cappedClientLimits.max], ['memory.swap.max', cappedClientLimits.swap]]) {
      const value = ancestor[key];
      assert(value === undefined || value === 'max' || (/^\d+$/.test(value) && Number(value) >= expected),
        `Ancestor client ${key} is more restrictive`);
    }
  }
}

/** A monitored paging experiment, not a reservation or a production capacity claim. */
export function verifyCappedLiveInitialMemory(memory) {
  for (const key of ['MemAvailable', 'SwapTotal', 'SwapFree']) {
    assert(Number.isSafeInteger(memory[key]) && memory[key] >= 0, 'Missing initial memory counters');
  }
  assert(memory.SwapTotal === 2 * 1024 * 1024 && memory.SwapFree <= memory.SwapTotal,
    'Original 2 GiB swap must be preserved');
  assert(memory.MemAvailable >= 4.25 * 1024 * 1024 &&
    memory.MemAvailable + memory.SwapFree >= 6 * 1024 * 1024,
  'Insufficient initial RAM and paging headroom');
}

export function cappedLiveStopReason(memory, state, elapsedSeconds, interrupted = false) {
  assert(Number.isFinite(elapsedSeconds) && elapsedSeconds >= 0, 'Invalid elapsed time');
  assert(Number.isSafeInteger(memory.MemAvailable) && Number.isSafeInteger(memory.SwapFree), 'Missing memory counters');
  assert(typeof state.running === 'boolean' && typeof state.oomKilled === 'boolean', 'Missing container state');
  if (interrupted) return 'caller-interrupted';
  if (elapsedSeconds >= cappedLiveLimits.timeoutSeconds) return 'bounded-duration';
  if (state.oomKilled) return 'capped-prover-oom-kill';
  if (!state.running) return 'capped-prover-exited';
  if (memory.MemAvailable < cappedLiveLimits.reserveKiB) return 'shared-machine-emergency-reserve';
  // A hard-capped process may exhaust paging even when other cgroups have free
  // physical RAM. Do not wait for whole-machine RAM exhaustion as well.
  if (memory.SwapFree < 512 * 1024) return 'shared-machine-swap-exhaustion';
  return null;
}
