import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants, createReadStream } from 'node:fs';
import { appendFile, copyFile, mkdir, mkdtemp, readFile, realpath, rmdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { GiB, readNumericCounters } from './m6-bounded-key-policy.mjs';
import { cappedLiveLimits as defaultLiveLimits, cappedClientLimits, cappedLiveStopReason, verifyCappedLiveInitialMemory, verifyCappedClientCgroup, parseCappedLiveArguments, verifySlotResetRequest, proverSoftLimitHelperArguments, verifyProverCgroupLimits } from './m6-capped-live-policy.mjs';
import { readProverMemory } from './m6-prover-memory.ts';

// Default: 4+1 GiB hard RAM. Explicit experimental reclaim: prover high5/max6,
// client max1 GiB; both share the same 8 GiB host swap, never a reservation.
const root = process.cwd(), name = 'permio-m6-bounded-proof', original = 'permio-m6-proof-server';
const image = 'sha256:82f867abc556806f3742fb165b9cba8c898045a71e99bba8a8b33b37237bb1c9';
const owned = '/var/tmp/permio-m6-capped-live', swap = `${owned}/paging.swap`, lock = `${owned}/active.lock`;
const execute = (bin, args) => execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const inspect = id => JSON.parse(execute('docker', ['inspect', id]))[0];
const exists = file => stat(file).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
function clientUnitState(unit) {
  assert(/^permio-m6-capped-client-[A-Za-z0-9]+\.service$/.test(unit));
  const result = spawnSync('systemctl', ['show', unit, '--property=LoadState', '--property=ActiveState', '--property=WorkingDirectory', '--property=Result'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  assert(!result.error, 'Cannot inspect owned client unit');
  const state = Object.fromEntries(result.stdout.trim().split('\n').map(line => {
    const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)];
  }));
  assert(state.LoadState === 'not-found' || result.status === 0, 'Client unit inspection failed');
  return state;
}
function stopOwnedClient(unit) {
  const state = clientUnitState(unit);
  if (state.LoadState === 'not-found') return;
  assert(state.WorkingDirectory === root, 'Never stop a foreign client unit');
  execute('systemctl', ['stop', unit]);
  const after = clientUnitState(unit);
  assert(after.LoadState === 'not-found' || ['inactive', 'failed'].includes(after.ActiveState), 'Client unit stop not verified');
}
async function hash(file) { const h = createHash('sha256'); for await (const bytes of createReadStream(file)) h.update(bytes); return h.digest('hex'); }
async function ready(port) {
  const response = await fetch(`http://127.0.0.1:${port}/ready`, { signal: AbortSignal.timeout(5000) });
  assert(response.ok, 'Local prover is not ready');
  return response.json();
}
async function cleanupSwap() {
  const rows = (await readFile('/proc/swaps', 'utf8')).trim().split('\n').slice(1).map(line => line.split(/\s+/));
  const active = rows.find(row => row[0] === swap);
  if (active) {
    const memory = readNumericCounters(await readFile('/proc/meminfo', 'utf8'));
    if (memory.MemAvailable < Number(active[3]) + 768 * 1024) return 'retained-active-insufficient-safe-headroom';
    try { execute('swapoff', [swap]); } catch { return 'retained-active-swapoff-failed'; }
  }
  assert.equal(await realpath(swap), swap);
  const metadata = await stat(swap); assert(metadata.uid === 0 && (metadata.mode & 0o777) === 0o600);
  assert(!(await readFile('/proc/swaps', 'utf8')).split('\n').some(line => line.split(/\s+/)[0] === swap));
  await unlink(swap); return 'disabled-and-unlinked';
}

assert(process.platform === 'linux' && process.getuid() === 0, 'Use the configured Linux/systemd environment');
assert(root.endsWith('/Permio-m6-m8-midnight-delivery') && await realpath(root) === root, 'Exact M6 worktree required');
const { mode, prover, resetBeforeSlot } = parseCappedLiveArguments(process.argv.slice(2));
const cappedLiveLimits = Object.freeze({ ...defaultLiveLimits, memory: prover.memoryMax });
let cgroupDriver;
if (prover.profile === 'experiment-reclaim') {
  const actual = execute('docker', ['info', '--format', '{{.CgroupDriver}} {{.CgroupVersion}}']).split(' ');
  assert(actual.length === 2 && actual[1] === '2' && ['cgroupfs', 'systemd'].includes(actual[0]),
    'Exact owned-file soft-limit application requires an allowlisted cgroup v2 driver');
  cgroupDriver = actual[0];
}
function applyProverReclaimHigh(id) {
  if (prover.profile !== 'experiment-reclaim') return undefined;
  const container = inspect(id);
  const args = proverSoftLimitHelperArguments(container, id, image, cgroupDriver);
  const result = execFileSync('docker', args, { encoding: 'utf8', timeout: 30_000,
    stdio: ['ignore', 'pipe', 'pipe'] }).trim().split(/\s+/);
  assert(result.length === 3 && result[0] === String(prover.memoryHigh) &&
    result.slice(1).every(value => value === 'max' || /^\d+$/.test(value)), 'Owned soft-limit result differs');
  return { memoryHighBytes: Number(result[0]), parentMemoryMax: result[1], parentSwapMax: result[2],
    cgroupDriver, writableScope: 'exact-owned-leaf-memory.high-only', helperRamMaxBytes: 64 * 1024 ** 2,
    helperNetwork: 'none', helperCapabilities: 'none', originalProverUnchanged: true };
}
const { verifyPermioAuthorizationAssets } = await import('../packages/midnight-authorization/src/compiled-assets.ts');
await verifyPermioAuthorizationAssets(path.join(root, 'packages/midnight-authorization/contracts/managed/permio-authorization'));
const source = inspect(original);
assert(source.Image === image && source.State.Running && source.HostConfig.NanoCpus === 4_000_000_000, 'Original tested prover profile differs');
const oldReady = await ready(6300);
assert(oldReady.jobsProcessing === 0 && oldReady.jobsPending === 0 && oldReady.jobCapacity === 1, 'Do not overlap another original-prover workload');
assert(source.Mounts.length === 1 && source.Mounts[0].Destination === '/.cache/midnight' &&
  source.Mounts[0].Source.replaceAll('\\', '/').endsWith('/logs/m6-proof-server-public-cache'), 'Unexpected original cache mount');
assert(execute('docker', ['ps', '-a', '--filter', `name=^/${name}$`, '--format', '{{.ID}}']) === '', 'Never take over an existing capped container');
// Make the existing public k20 parameters available without a download or a new parameter choice.
const parameterSource = '/root/.cache/midnight/zk-params/bls_midnight_2p20';
const parameterTarget = path.join(root, 'logs/m6-proof-server-public-cache/zk-params/bls_midnight_2p20');
const parameterHash = '1cc62978558fdc1e445cd70cfd9a86ec3c2e2151b6d74811232d37faf9133ff1';
assert.equal(await hash(parameterSource), parameterHash);
if (!await exists(parameterTarget)) await copyFile(parameterSource, parameterTarget, constants.COPYFILE_EXCL);
assert.equal(await hash(parameterTarget), parameterHash);
await mkdir(owned, { mode: 0o700 }).catch(error => { if (error.code !== 'EEXIST') throw error; });
assert.equal(await realpath(owned), owned);
const ownedMetadata = await stat(owned); assert(ownedMetadata.uid === 0 && (ownedMetadata.mode & 0o777) === 0o700);
assert.equal(execute('findmnt', ['-n', '-o', 'FSTYPE', '-T', owned]), 'ext4');
await mkdir(lock, { mode: 0o700 });
let directory, id, clientUnit, clientReady, childResult, swapCreated = false, interrupted = false;
const onInterrupt = () => { interrupted = true; };
process.on('SIGINT', onInterrupt); process.on('SIGTERM', onInterrupt);
const started = performance.now();
const report = { kind: 'capped-real-local-node-runtime', mode, image, startedAtUtc: new Date().toISOString(),
  limits: { memoryHigh: prover.memoryHigh, memoryMaxBytes: cappedLiveLimits.memory, swapMaxBytes: cappedLiveLimits.swap,
    dockerMemoryPlusSwapBytes: cappedLiveLimits.memory + cappedLiveLimits.swap,
    cpus: prover.cpus, rayonThreads: prover.rayonThreads, serverWorkers: prover.serverWorkers,
    serverJobTimeoutSeconds: prover.serverJobTimeoutSeconds, jobs: 1, timeoutSeconds: cappedLiveLimits.timeoutSeconds },
  proverWorkerProfile: prover.profile,
  resetOwnedProverBeforeSlot: resetBeforeSlot,
  clientLimits: cappedClientLimits, combinedClientAndProverRamMaxBytes: cappedClientLimits.max + cappedLiveLimits.memory,
  swapBudgetsAreSharedNotAdditiveReservations: true,
  originalProverChanged: false, milestoneComplete: false, ordinaryUserActionProved: false };
try {
  await mkdir(`${root}/logs`, { recursive: true }); directory = await mkdtemp(`${root}/logs/m6-capped-live-`);
  const memory = readNumericCounters(await readFile('/proc/meminfo', 'utf8'));
  report.initialMemory = { availableKiB: memory.MemAvailable, swapTotalKiB: memory.SwapTotal, swapFreeKiB: memory.SwapFree };
  verifyCappedLiveInitialMemory(memory);
  assert(!await exists(swap), 'Existing owned swap requires explicit review');
  assert(Number(execute('df', ['--output=avail', '-B1', owned]).split('\n').at(-1).trim()) > 16 * GiB);
  await writeFile(swap, '', { flag: 'wx', mode: 0o600 }); swapCreated = true;
  execute('dd', ['if=/dev/zero', `of=${swap}`, 'bs=1M', 'count=6144', 'conv=fsync', 'status=none']);
  assert.equal((await stat(swap)).size, 6 * GiB);
  execute('mkswap', [swap]); execute('swapon', [swap]);
  const appliedSwap = readNumericCounters(await readFile('/proc/meminfo', 'utf8')).SwapTotal;
  assert(appliedSwap >= 8 * 1024 * 1024 - 8 && appliedSwap <= 8 * 1024 * 1024); report.appliedHostSwapKiB = appliedSwap;
  id = execute('docker', ['create', '--name', name, '--label', 'permio.owner=m6-capped-live', '--cpus', String(prover.cpus),
    '--memory', String(cappedLiveLimits.memory), '--memory-swap', String(cappedLiveLimits.memory + cappedLiveLimits.swap),
    '--publish', '127.0.0.1:6301:6300', '--volumes-from', `${original}:ro`,
    '--env', `RAYON_NUM_THREADS=${prover.rayonThreads}`, '--env', 'MIDNIGHT_PROOF_SERVER_JOB_CAPACITY=1',
    '--env', `MIDNIGHT_PROOF_SERVER_NUM_WORKERS=${prover.serverWorkers}`,
    '--env', `MIDNIGHT_PROOF_SERVER_JOB_TIMEOUT=${prover.serverJobTimeoutSeconds}`, image]);
  assert(/^[0-9a-f]{64}$/.test(id));
  execute('docker', ['start', id]);
  report.proverSoftLimitApplication = applyProverReclaimHigh(id);
  const actual = inspect(id);
  assert(actual.Image === image && actual.HostConfig.Memory === cappedLiveLimits.memory &&
    actual.HostConfig.MemorySwap === cappedLiveLimits.memory + cappedLiveLimits.swap &&
    actual.HostConfig.NanoCpus === prover.cpus * 1_000_000_000 && actual.Mounts.every(mount => !mount.RW));
  assert.deepEqual(actual.Config.Env.filter(value => value.startsWith('RAYON_NUM_THREADS=')),
    [`RAYON_NUM_THREADS=${prover.rayonThreads}`], 'Applied proving worker count differs');
  assert.deepEqual(actual.Config.Env.filter(value => value.startsWith('MIDNIGHT_PROOF_SERVER_JOB_CAPACITY=')),
    ['MIDNIGHT_PROOF_SERVER_JOB_CAPACITY=1'], 'Applied proving job capacity differs');
  assert.deepEqual(actual.Config.Env.filter(value => value.startsWith('MIDNIGHT_PROOF_SERVER_NUM_WORKERS=')),
    [`MIDNIGHT_PROOF_SERVER_NUM_WORKERS=${prover.serverWorkers}`], 'Applied server worker count differs');
  assert.deepEqual(actual.Config.Env.filter(value => value.startsWith('MIDNIGHT_PROOF_SERVER_JOB_TIMEOUT=')),
    [`MIDNIGHT_PROOF_SERVER_JOB_TIMEOUT=${prover.serverJobTimeoutSeconds}`], 'Applied server job timeout differs');
  report.appliedDockerLimits = { memoryBytes: actual.HostConfig.Memory, memoryPlusSwapBytes: actual.HostConfig.MemorySwap,
    nanoCpus: actual.HostConfig.NanoCpus, rayonThreads: prover.rayonThreads, serverWorkers: prover.serverWorkers,
    serverJobTimeoutSeconds: prover.serverJobTimeoutSeconds, jobs: 1, publicCacheReadOnly: true };
  // Literal paths and task-specific variables: no outer-shell expansion or environment dump.
  const raw = execute('docker', ['exec', id, '/bin/bash', '-c',
    'readarray -t m6Max < /sys/fs/cgroup/memory.max; readarray -t m6SwapMax < /sys/fs/cgroup/memory.swap.max; readarray -t m6High < /sys/fs/cgroup/memory.high; declare -p m6Max m6SwapMax m6High']);
  const applied = Object.fromEntries([...raw.matchAll(/declare -a (m6Max|m6SwapMax|m6High)=\(\[0\]="(max|\d+)"\)/g)].map(match => [match[1], match[2]]));
  verifyProverCgroupLimits(applied, prover);
  report.appliedCgroupLimits = applied;
  let serviceReady;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { serviceReady = await ready(6301); if (serviceReady.jobCapacity === 1) break; } catch { /* bounded startup wait */ }
    await delay(1000);
  }
  assert(serviceReady?.jobCapacity === 1 && serviceReady.jobsProcessing === 0 && serviceReady.jobsPending === 0);
  const proposedUnit = `permio-m6-capped-client-${path.basename(directory).slice('m6-capped-live-'.length)}.service`;
  assert(clientUnitState(proposedUnit).LoadState === 'not-found', 'Never take over an existing client unit');
  await writeFile(`${directory}/client.log`, '', { flag: 'wx', mode: 0o600 });
  clientUnit = proposedUnit;
  execute('systemd-run', ['--quiet', '--no-block', `--unit=${clientUnit}`, '--property=MemoryAccounting=yes',
    `--property=MemoryHigh=${cappedClientLimits.high}`, `--property=MemoryMax=${cappedClientLimits.max}`,
    `--property=MemorySwapMax=${cappedClientLimits.swap}`, '--property=CPUQuota=100%', '--property=TasksMax=128',
    '--property=RuntimeMaxSec=7300', '--property=TimeoutStopSec=10', '--property=KillMode=control-group',
    '--property=OOMPolicy=stop', '--property=UMask=0077', `--property=StandardOutput=append:${directory}/client.log`,
    `--property=StandardError=append:${directory}/client.log`, `--working-directory=${root}`,
    process.execPath, `--max-old-space-size=${cappedClientLimits.oldSpaceMiB}`, `${root}/scripts/m6-capped-client.mjs`, directory, mode]);
  for (let attempt = 0; attempt < 120 && !await exists(`${directory}/client-ready.json`); attempt++) {
    assert(!['inactive', 'failed'].includes(clientUnitState(clientUnit).ActiveState), 'Capped client exited before readiness');
    assert(!interrupted, 'Caller interrupted client startup'); await delay(500);
  }
  clientReady = JSON.parse(await readFile(`${directory}/client-ready.json`, 'utf8'));
  assert(clientReady.cgroup === `/sys/fs/cgroup/system.slice/${clientUnit}` && Number.isSafeInteger(clientReady.pid) && clientReady.pid > 0);
  assert(execute('systemctl', ['show', clientUnit, '--property=ControlGroup', '--value']) === clientReady.cgroup.slice('/sys/fs/cgroup'.length));
  assert((await readFile(`/proc/${clientReady.pid}/cgroup`, 'utf8')).trim().split('::')[1] === clientReady.cgroup.slice('/sys/fs/cgroup'.length));
  const actualClientChain = [];
  for (let current = clientReady.cgroup;; current = path.dirname(current)) {
    assert(current === '/sys/fs/cgroup' || current.startsWith('/sys/fs/cgroup/'));
    const row = {};
    for (const key of ['memory.high', 'memory.max', 'memory.swap.max']) {
      try { row[key] = (await readFile(`${current}/${key}`, 'utf8')).trim(); }
      catch (error) { if (current !== '/sys/fs/cgroup' || error.code !== 'ENOENT') throw error; }
    }
    actualClientChain.push(row);
    if (current === '/sys/fs/cgroup') break;
  }
  verifyCappedClientCgroup(actualClientChain);
  assert.deepEqual(clientReady.chain, actualClientChain, 'Worker and controller client-limit reads differ');
  report.appliedClientCgroupChain = actualClientChain;
  if (resetBeforeSlot) await writeFile(`${directory}/slot-reset-enabled`, 'enabled\n', { flag: 'wx', mode: 0o600 });
  await writeFile(`${directory}/client-go`, 'verified\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ event: 'capped-runtime-client-and-prover-started', directory: path.relative(root, directory),
    combinedRamMaxBytes: report.combinedClientAndProverRamMaxBytes, hostSwapKiB: appliedSwap, milestoneComplete: false }));
  report.samples = 0;
  while (!childResult) {
    const sample = { atUtc: new Date().toISOString(), elapsedSeconds: (performance.now() - started) / 1000,
      memory: readNumericCounters(await readFile('/proc/meminfo', 'utf8')) };
    const container = inspect(id); sample.containerOomKilled = container.State.OOMKilled; sample.containerRunning = container.State.Running;
    sample.client = {};
    for (const key of ['memory.current', 'memory.peak', 'memory.swap.current', 'memory.swap.peak', 'memory.events']) {
      try { sample.client[key] = readNumericCounters(key === 'memory.events' ?
        await readFile(`${clientReady.cgroup}/${key}`, 'utf8') : `${key}: ${await readFile(`${clientReady.cgroup}/${key}`, 'utf8')}`); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    try {
      assert((await readFile(`/proc/${clientReady.pid}/cgroup`, 'utf8')).trim().split('::')[1] === clientReady.cgroup.slice('/sys/fs/cgroup'.length),
        'Client PID no longer belongs to the owned cgroup');
      const counters = readNumericCounters(await readFile(`/proc/${clientReady.pid}/status`, 'utf8'));
      sample.client.process = Object.fromEntries(['VmRSS', 'VmHWM', 'VmSwap', 'Threads'].map(key => [key, counters[key]]));
    } catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ESRCH') throw error; }
    await appendFile(`${directory}/resources.jsonl`, `${JSON.stringify(sample)}\n`, { mode: 0o600 }); report.samples++; report.lastSample = sample;
    const resultFile = await readFile(`${directory}/client-result.json`, 'utf8').catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
    if (resultFile) { childResult = JSON.parse(resultFile); assert(Number.isInteger(childResult.code) && childResult.code >= 0 && childResult.code <= 255); break; }
    const clientState = clientUnitState(clientUnit);
    const reason = (sample.client['memory.events']?.oom_kill ?? 0) > 0 || clientState.Result === 'oom-kill' ? 'capped-client-oom-kill' :
      ['inactive', 'failed'].includes(clientState.ActiveState) ? 'capped-client-exited' :
      cappedLiveStopReason(sample.memory, { running: sample.containerRunning, oomKilled: sample.containerOomKilled },
      sample.elapsedSeconds, interrupted);
    if (reason) { report.stopReason = reason; break; }
    if (resetBeforeSlot && !report.slotProverReset) {
      const request = await readFile(`${directory}/slot-reset-request.json`, 'utf8').catch(error => {
        if (error.code !== 'ENOENT') throw error; return null;
      });
      if (request !== null) {
        verifySlotResetRequest(JSON.parse(request), clientReady.pid, path.basename(directory));
        assert(container.Image === image && container.Name === `/${name}` &&
          container.Config.Labels['permio.owner'] === 'm6-capped-live', 'Never reset a foreign prover');
        const idle = await ready(6301);
        assert(idle.jobsProcessing === 0 && idle.jobsPending === 0 && idle.jobCapacity === 1, 'Never interrupt a proving job');
        const reset = { requestedAtUtc: new Date().toISOString(), before: await readProverMemory(name) };
        execute('docker', ['stop', '--timeout', '10', id]);
        execute('docker', ['start', id]);
        const resetSoftLimitApplication = applyProverReclaimHigh(id);
        let restartedReady;
        for (let attempt = 0; attempt < 25; attempt++) {
          assert(!interrupted && (performance.now() - started) / 1000 < cappedLiveLimits.timeoutSeconds,
            'Workflow interruption/deadline still applies during owned restart');
          try {
            const state = await ready(6301);
            if (state.jobsProcessing === 0 && state.jobsPending === 0 && state.jobCapacity === 1) {
              restartedReady = state; break;
            }
          } catch { /* bounded owned-service startup, not a proof retry */ }
          await delay(500);
        }
        assert(restartedReady, 'Owned prover did not restart ready');
        const after = inspect(id);
        assert(after.Image === image && after.Name === `/${name}` && after.State.Running && !after.State.OOMKilled &&
          after.Config.Labels['permio.owner'] === 'm6-capped-live' &&
          after.HostConfig.Memory === cappedLiveLimits.memory &&
          after.HostConfig.MemorySwap === cappedLiveLimits.memory + cappedLiveLimits.swap &&
          after.HostConfig.NanoCpus === prover.cpus * 1_000_000_000, 'Restart changed owned limits/identity');
        const actualLimits = execute('docker', ['exec', id, '/bin/bash', '-c',
          'read -r m6Max < /sys/fs/cgroup/memory.max; read -r m6Swap < /sys/fs/cgroup/memory.swap.max; read -r m6High < /sys/fs/cgroup/memory.high; printf "%s %s %s" "$m6Max" "$m6Swap" "$m6High"']);
        assert.equal(actualLimits, `${cappedLiveLimits.memory} ${cappedLiveLimits.swap} ${prover.memoryHigh}`);
        const memoryAfterReset = readNumericCounters(await readFile('/proc/meminfo', 'utf8'));
        assert.equal(cappedLiveStopReason(memoryAfterReset, { running: true, oomKilled: false },
          (performance.now() - started) / 1000, interrupted), null, 'Safety guards still apply after owned restart');
        report.slotProverReset = { ...reset, completedAtUtc: new Date().toISOString(), after: await readProverMemory(name),
          softLimitApplication: resetSoftLimitApplication,
          sameContainerImageAndLimitsVerified: true, privateStateHeldByClient: true, proofOrTransactionRetried: false };
        await writeFile(`${directory}/slot-reset-ready`, 'ready\n', { flag: 'wx', mode: 0o600 });
        console.log(JSON.stringify({ event: 'owned-prover-reset-before-slot-verified',
          directory: path.relative(root, directory), milestoneComplete: false }));
      }
    }
    if (report.samples % 15 === 0) console.log(JSON.stringify({ event: 'capped-runtime-resource-observation', elapsedSeconds: sample.elapsedSeconds,
      availableKiB: sample.memory.MemAvailable, freeSwapKiB: sample.memory.SwapFree, client: sample.client, milestoneComplete: false }));
    await delay(2000);
  }
  await writeFile(`${directory}/client-release`, 'observed\n', { flag: 'wx', mode: 0o600 });
  report.clientResult = childResult ?? { code: null, interruptedByController: true };
  report.workflowCompleted = childResult?.code === 0 && !report.stopReason;
} catch (error) { report.failure = { message: error.message }; }
finally {
  let clientStopped = !clientUnit;
  if (clientUnit) {
    try { report.ownedClientUnitBeforeStop = clientUnitState(clientUnit); stopOwnedClient(clientUnit); clientStopped = true; report.ownedClientUnitStopped = true; }
    catch { report.ownedClientUnitRetained = true; }
  }
  let containerStopped = !id;
  if (id) {
    try {
      const actual = inspect(id); assert(actual.Config.Labels['permio.owner'] === 'm6-capped-live' && actual.Name === `/${name}`);
      execute('docker', ['stop', '--timeout', '10', id]); containerStopped = true;
      execute('docker', ['rm', id]); report.ownedContainerRemoved = true;
    } catch { report.ownedContainerRetained = true; }
  }
  report.swapCleanup = !swapCreated ? 'not-created-existing-resources-untouched' : !containerStopped || !clientStopped ? 'retained-unit-stop-unverified' :
    await cleanupSwap().catch(() => 'cleanup-failed-owned-swap-retained');
  report.completedAtUtc = new Date().toISOString(); report.elapsedSeconds = (performance.now() - started) / 1000;
  try { const after = inspect(original); report.originalProverAfter = { running: after.State.Running, image: after.Image }; }
  catch { report.originalProverAfter = { inspectionUnavailable: true }; }
  report.memoryAfter = readNumericCounters(await readFile('/proc/meminfo', 'utf8'));
  if (directory) await writeFile(`${directory}/report.json`, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  if (containerStopped && clientStopped) await rmdir(lock);
  process.off('SIGINT', onInterrupt); process.off('SIGTERM', onInterrupt);
  console.log(JSON.stringify({ event: 'capped-live-finished', report: directory ? path.relative(root, `${directory}/report.json`) : null,
    workflowCompleted: report.workflowCompleted === true, stopReason: report.stopReason ?? null, swapCleanup: report.swapCleanup,
    ownedContainerRemoved: report.ownedContainerRemoved === true, failureDetailsWithheld: Boolean(report.failure), milestoneComplete: false }));
}
process.exitCode = report.workflowCompleted ? 0 : 2;
