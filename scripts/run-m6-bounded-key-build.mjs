import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, constants } from 'node:fs';
import { appendFile, copyFile, mkdir, mkdtemp, readFile, readdir, realpath, rmdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { GiB, boundedKeyLimits as limits, parseBoundedKeyArguments, readNumericCounters,
  verifyBoundedKeyCgroup, boundedKeyStopReason, verifyReusableSlotReport } from './m6-bounded-key-policy.mjs';

const root = process.cwd();
const assets = path.join(root, 'packages/midnight-authorization/contracts/managed/permio-authorization');
const compiler = '/root/.compact/versions/0.31.1/x86_64-unknown-linux-musl/zkir';
const parameters = '/root/.cache/midnight/zk-params';
const owned = '/var/tmp/permio-m6-bounded-key-build';
const swap = `${owned}/paging.swap`, lock = `${owned}/active.lock`;
const runCommand = (name, args) => execFileSync(name, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
async function hash(file) {
  const digest = createHash('sha256');
  for await (const bytes of createReadStream(file)) digest.update(bytes);
  return digest.digest('hex');
}
async function json(file, value) { await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 }); }
async function present(file) { return stat(file).catch(error => { if (error.code === 'ENOENT') return null; throw error; }); }

async function cgroupAncestry(cgroup) {
  const chain = [];
  for (let current = cgroup;; current = path.dirname(current)) {
    assert(current === '/sys/fs/cgroup' || current.startsWith('/sys/fs/cgroup/'), 'Unexpected cgroup path');
    const row = {};
    for (const key of ['memory.high', 'memory.max', 'memory.swap.max']) {
      try { row[key] = (await readFile(`${current}/${key}`, 'utf8')).trim(); }
      catch (error) { if (current !== '/sys/fs/cgroup' || error.code !== 'ENOENT') throw error; }
    }
    chain.push(row);
    if (current === '/sys/fs/cgroup') break;
  }
  return chain;
}

async function worker(directory, name) {
  assert(/^[A-Za-z][A-Za-z0-9_]*$/.test(name));
  assert((await realpath(directory)).startsWith(`${await realpath(root)}/logs/m6-bounded-keys-`));
  const relative = (await readFile('/proc/self/cgroup', 'utf8')).trim().split('::')[1];
  const cgroup = `/sys/fs/cgroup${relative}`;
  verifyBoundedKeyCgroup(await cgroupAncestry(cgroup));
  await json(`${directory}/ready.json`, { cgroup });
  for (let i = 0; i < 120 && !await present(`${directory}/go`); i++) await delay(500);
  assert(await present(`${directory}/go`), 'Controller did not verify applied limits');
  const child = spawn(compiler, ['compile', `${assets}/zkir/${name}.zkir`, `${directory}/${name}.prover`, `${directory}/${name}.verifier`],
    { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, RAYON_NUM_THREADS: '1', TOKIO_WORKER_THREADS: '1' } });
  await json(`${directory}/compiler.json`, { pid: child.pid });
  let output = '', measurement = null, localGuard = null, writes = Promise.resolve();
  for (const stream of [child.stdout, child.stderr]) stream.on('data', bytes => {
    writes = writes.then(() => appendFile(`${directory}/compiler.log`, bytes, { mode: 0o600 }));
    output = (output + bytes.toString()).slice(-65536);
    const match = output.match(/\(k=(\d+), rows=(\d+)\)/);
    if (match && !measurement) {
      measurement = { k: Number(match[1]), rows: Number(match[2]), observedAtUtc: new Date().toISOString() };
      writes = writes.then(() => json(`${directory}/measurement.json`, measurement));
      if (measurement.k > limits.maximumK) { localGuard = 'local-k-threshold-not-protocol-limit'; child.kill('SIGTERM'); }
    }
  });
  const result = await new Promise(resolve => {
    child.once('error', () => resolve({ code: null, signal: null, spawnFailed: true }));
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
  await writes;
  await json(`${directory}/result.json`, { ...result, measurement, localGuard });
  // Keep final cgroup counters readable until the controller acknowledges them.
  for (let i = 0; i < 60 && !await present(`${directory}/release`); i++) await delay(500);
}

async function validateOwned() {
  await mkdir(owned, { mode: 0o700 }).catch(error => { if (error.code !== 'EEXIST') throw error; });
  assert.equal(await realpath(owned), owned);
  const meta = await stat(owned);
  assert(meta.uid === 0 && (meta.mode & 0o777) === 0o700, 'Owned resource directory permissions differ');
  assert.equal(runCommand('findmnt', ['-n', '-o', 'FSTYPE', '-T', owned]), 'ext4');
}

async function cleanupSwap() {
  if (!await present(swap)) return { state: 'absent' };
  assert.equal(await realpath(swap), swap);
  const meta = await stat(swap);
  assert(meta.uid === 0 && (meta.mode & 0o777) === 0o600);
  const rows = (await readFile('/proc/swaps', 'utf8')).trim().split('\n').slice(1).map(line => line.split(/\s+/));
  const active = rows.find(row => row[0] === swap);
  if (active) {
    const memory = readNumericCounters(await readFile('/proc/meminfo', 'utf8'));
    if (memory.MemAvailable < Number(active[3]) + 768 * 1024) return { state: 'retained-active-insufficient-safe-headroom' };
    try { runCommand('swapoff', [swap]); } catch { return { state: 'retained-active-swapoff-failed' }; }
  }
  assert(!(await readFile('/proc/swaps', 'utf8')).split('\n').some(line => line.split(/\s+/)[0] === swap));
  await unlink(swap);
  return { state: 'disabled-and-unlinked' };
}

async function fingerprints(names) {
  const files = ['compiler/contract-info.json', 'contract/index.js', ...names.map(name => `zkir/${name}.zkir`)];
  const hashes = {};
  for (const file of files) hashes[file] = await hash(path.join(assets, file));
  // Included Compact sources must remain unchanged throughout the build too.
  for (const file of (await readdir(path.join(root, 'packages/midnight-authorization/contracts'))).filter(file => file.endsWith('.compact'))) {
    hashes[`source/${file}`] = await hash(path.join(root, 'packages/midnight-authorization/contracts', file));
  }
  return hashes;
}

async function build(options) {
  assert(process.platform === 'linux' && process.getuid() === 0, 'Use the configured root WSL/systemd environment');
  assert(root.endsWith('/Permio-m6-m8-midnight-delivery'), 'Bounded build is scoped to the M6 delivery worktree');
  assert.equal(await realpath(root), root, 'Worktree must not be redirected through a symlink');
  runCommand('compact', ['compile', '+0.31.1', '--skip-zk', 'packages/midnight-authorization/contracts/permio-authorization.compact', assets]);
  const info = JSON.parse(await readFile(`${assets}/compiler/contract-info.json`, 'utf8'));
  assert(info['compiler-version'] === '0.31.1' && info['runtime-version'] === '0.16.0');
  const names = info.circuits.filter(circuit => circuit.proof).map(circuit => circuit.name).sort();
  assert(names.length === 11 && names.every(name => /^[A-Za-z][A-Za-z0-9_]*$/.test(name)) && new Set(names).size === 11);
  const before = await fingerprints(names), compilerSha256 = await hash(compiler);
  const parameterHashes = {};
  for (const file of (await readdir(parameters)).filter(file => /^bls_midnight_2p\d+$/.test(file))) {
    parameterHashes[file] = await hash(path.join(parameters, file));
  }
  let reuse;
  if (options.reuseSlot !== undefined) {
    const directory = await realpath(path.resolve(root, options.reuseSlot));
    const allowed = `${path.dirname(root)}/Permio-m6-low-memory-experiment/logs/`;
    assert(directory.startsWith(allowed) && /^m6-low-memory-[A-Za-z0-9]+$/.test(path.basename(directory)),
      'Reuse is limited to the explicitly requested sibling experiment report');
    const report = JSON.parse(await readFile(`${directory}/report.json`, 'utf8'));
    const keys = verifyReusableSlotReport(report, { programSha256: before['zkir/manageRuntimeParticipantSlots.zkir'],
      zkirSha256: compilerSha256, publicParametersSha256: parameterHashes.bls_midnight_2p20 });
    for (const suffix of ['prover', 'verifier']) {
      assert.equal(await realpath(`${directory}/slot.${suffix}`), `${directory}/slot.${suffix}`);
      assert.equal((await stat(`${directory}/slot.${suffix}`)).size, keys[suffix].bytes);
      assert.equal(await hash(`${directory}/slot.${suffix}`), keys[suffix].sha256);
    }
    const binaryBase = path.join(path.dirname(root), 'Permio-m6-low-memory-experiment/packages/midnight-authorization/contracts/managed/permio-authorization/zkir/manageRuntimeParticipantSlots');
    assert.equal(await realpath(`${binaryBase}.bzkir`), `${binaryBase}.bzkir`);
    assert.equal(await hash(`${binaryBase}.zkir`), before['zkir/manageRuntimeParticipantSlots.zkir']);
    assert((await stat(`${binaryBase}.bzkir`)).size > 0);
    reuse = { directory, keys, reportSha256: await hash(`${directory}/report.json`),
      binary: `${binaryBase}.bzkir`, binarySha256: await hash(`${binaryBase}.bzkir`) };
  }
  assert(!await present(`${assets}/keys/build-manifest.json`), 'Existing inventory must be reviewed rather than overwritten');
  // Also refuse unreviewed existing destination keys; this is not a destructive rebuild.
  for (const name of names) for (const suffix of ['prover', 'verifier']) {
    assert(!await present(`${assets}/keys/${name}.${suffix}`), 'Existing key must be preserved and reviewed');
  }
  await validateOwned();
  await mkdir(lock, { mode: 0o700 });
  let directory, activeUnit = null, interrupted = false, swapCreated = false;
  const interrupt = () => { interrupted = true; };
  const report = { reportVersion: 1, kind: 'real-bounded-current-key-inventory', startedAtUtc: new Date().toISOString(),
    compilerVersion: '0.31.1', runtimeVersion: '0.16.0', limits, compilerSha256, parameterHashes,
    fingerprints: before, jobs: [], entries: [], milestoneComplete: false, ordinaryUserProofCostMeasured: false };
  const started = performance.now();
  process.on('SIGINT', interrupt); process.on('SIGTERM', interrupt);
  try {
    await mkdir(`${root}/logs`, { recursive: true });
    directory = await mkdtemp(`${root}/logs/m6-bounded-keys-`);
    try { assert(!runCommand('pgrep', ['-x', 'zkir']).length, 'Another real-key job is active'); }
    catch (error) { if (error.status !== 1) throw error; }
    const memory = readNumericCounters(await readFile('/proc/meminfo', 'utf8'));
    assert(memory.MemAvailable >= 6 * 1024 * 1024 && memory.SwapTotal === 2 * 1024 * 1024,
      'Initial memory/swap must match the reviewed shared-machine profile');
    assert(!await present(swap), 'Owned swap already exists; no automatic stale-resource takeover');
    assert(Number(runCommand('df', ['--output=avail', '-B1', owned]).split('\n').at(-1).trim()) > 16 * GiB);
    report.swapBefore = await readFile('/proc/swaps', 'utf8');
    await writeFile(swap, '', { flag: 'wx', mode: 0o600 });
    swapCreated = true;
    runCommand('dd', ['if=/dev/zero', `of=${swap}`, 'bs=1M', 'count=6144', 'conv=fsync', 'status=none']);
    assert.equal((await stat(swap)).size, 6 * GiB);
    runCommand('mkswap', [swap]); runCommand('swapon', [swap]);
    const appliedSwap = readNumericCounters(await readFile('/proc/meminfo', 'utf8')).SwapTotal;
    assert(appliedSwap >= 8 * 1024 * 1024 - 8 && appliedSwap <= 8 * 1024 * 1024);
    report.swapAppliedKiB = appliedSwap;
    const ordered = names.slice().sort((a, b) => a === 'updateRuntimeCredentialStatus' ? -1 : b === 'updateRuntimeCredentialStatus' ? 1 : a.localeCompare(b));
    for (const name of ordered) {
      assert(!interrupted && (performance.now() - started) / 1000 < limits.timeoutSeconds, 'Bounded batch stopped');
      if (name === 'manageRuntimeParticipantSlots' && reuse) {
        const binary = `${assets}/zkir/${name}.bzkir`;
        if (!await present(binary)) await copyFile(reuse.binary, binary, constants.COPYFILE_EXCL);
        assert.equal(await hash(binary), reuse.binarySha256, 'Reused SDK binary program differs');
        report.entries.push({ name, programSha256: before[`zkir/${name}.zkir`], proverSha256: reuse.keys.prover.sha256,
          verifierSha256: reuse.keys.verifier.sha256, proverBytes: reuse.keys.prover.bytes, verifierBytes: reuse.keys.verifier.bytes,
          source: 'verified-experiment-slot-reuse', sourceReportSha256: reuse.reportSha256 });
        continue;
      }
      const jobDir = `${directory}/${name}`; await mkdir(jobDir, { mode: 0o700 });
      const unit = `permio-m6-bounded-key-${Date.now()}.service`;
      const job = { name, unit, startedAtUtc: new Date().toISOString(), samples: 0, sampleErrors: 0, peaks: {} };
      report.jobs.push(job);
      activeUnit = unit;
      runCommand('systemd-run', ['--quiet', '--no-block', `--unit=${unit}`, '--setenv=XDG_CACHE_HOME=/root/.cache',
        '--property=MemoryAccounting=yes', '--property=IOAccounting=yes', '--property=MemoryHigh=5G',
        '--property=MemoryMax=6G', '--property=MemorySwapMax=8G', '--property=CPUQuota=100%', '--property=TasksMax=64',
        '--property=RuntimeMaxSec=3700', '--property=TimeoutStopSec=10', '--property=KillMode=control-group',
        '--property=OOMPolicy=stop', '--property=UMask=0077', `--working-directory=${root}`,
        process.execPath, fileURLToPath(import.meta.url), '--worker', jobDir, name]);
      for (let i = 0; i < 120 && !await present(`${jobDir}/ready.json`); i++) await delay(500);
      const { cgroup } = JSON.parse(await readFile(`${jobDir}/ready.json`, 'utf8'));
      job.appliedCgroupChain = await cgroupAncestry(cgroup); verifyBoundedKeyCgroup(job.appliedCgroupChain);
      assert.equal(runCommand('systemctl', ['show', unit, '--property=ControlGroup', '--value']), cgroup.slice('/sys/fs/cgroup'.length));
      await writeFile(`${jobDir}/go`, 'verified\n', { mode: 0o600 });
      process.stdout.write(`${JSON.stringify({ event: 'bounded-key-started', circuit: name, limits, directory: path.relative(root, directory) })}\n`);
      while (true) {
        const sample = { observedAtUtc: new Date().toISOString(), elapsedSeconds: (performance.now() - started) / 1000,
          memory: readNumericCounters(await readFile('/proc/meminfo', 'utf8')), cgroup: {} };
        for (const counter of ['memory.current', 'memory.peak', 'memory.swap.current', 'memory.swap.peak', 'memory.events', 'cpu.stat', 'io.stat', 'memory.pressure']) {
          try { sample.cgroup[counter] = (await readFile(`${cgroup}/${counter}`, 'utf8')).trim(); }
          catch (error) { job.sampleErrors++; if (error.code !== 'ENOENT') throw error; }
        }
        try {
          const child = JSON.parse(await readFile(`${jobDir}/compiler.json`, 'utf8'));
          assert.equal((await readFile(`/proc/${child.pid}/cgroup`, 'utf8')).trim().split('::')[1], cgroup.slice('/sys/fs/cgroup'.length));
          const counters = readNumericCounters(await readFile(`/proc/${child.pid}/status`, 'utf8'));
          sample.compiler = Object.fromEntries(['VmRSS', 'VmHWM', 'VmSwap', 'Threads'].map(key => [key, counters[key]]));
        } catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ESRCH') throw error; }
        for (const counter of ['memory.current', 'memory.peak', 'memory.swap.current', 'memory.swap.peak']) {
          const value = Number(sample.cgroup[counter]);
          if (Number.isFinite(value)) job.peaks[counter] = Math.max(job.peaks[counter] ?? 0, value);
        }
        await appendFile(`${jobDir}/resources.jsonl`, `${JSON.stringify(sample)}\n`, { mode: 0o600 });
        job.samples++; job.lastSample = sample;
        if (job.samples % 15 === 0) process.stdout.write(`${JSON.stringify({ event: 'bounded-key-resource-observation', circuit: name,
          batchElapsedSeconds: Math.round(sample.elapsedSeconds), peaks: job.peaks, availableKiB: sample.memory.MemAvailable,
          measurement: await readFile(`${jobDir}/measurement.json`, 'utf8').catch(() => null) })}\n`);
        const result = await readFile(`${jobDir}/result.json`, 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; });
        if (result) { job.result = JSON.parse(result); break; }
        const reason = interrupted ? 'caller-interrupted' : boundedKeyStopReason(sample.memory,
          readNumericCounters(sample.cgroup['memory.events'] ?? ''), sample.elapsedSeconds);
        if (reason) { job.stopReason = reason; break; }
        await delay(2000);
      }
      await writeFile(`${jobDir}/release`, 'observed\n', { mode: 0o600 });
      runCommand('systemctl', ['stop', unit]); activeUnit = null;
      job.completedAtUtc = new Date().toISOString();
      assert(!job.stopReason && job.result?.code === 0 && !job.result.localGuard && job.result.measurement?.k <= limits.maximumK,
        'Real bounded key generation did not complete');
      const parameterFile = `bls_midnight_2p${job.result.measurement.k}`;
      assert(parameterHashes[parameterFile] && await hash(path.join(parameters, parameterFile)) === parameterHashes[parameterFile],
        'Public proving parameters changed or were not present before the build');
      const entry = { name, programSha256: before[`zkir/${name}.zkir`], source: 'real-bounded-key-generation' };
      for (const suffix of ['prover', 'verifier']) {
        const file = `${jobDir}/${name}.${suffix}`, size = (await stat(file)).size; assert(size > 0);
        entry[`${suffix}Bytes`] = size; entry[`${suffix}Sha256`] = await hash(file);
      }
      report.entries.push(entry);
      await json(`${directory}/report.json`, report);
      process.stdout.write(`${JSON.stringify({ event: 'bounded-key-completed', circuit: name, measurement: job.result.measurement,
        completedPairs: report.entries.length, requiredPairs: names.length })}\n`);
    }
    assert.equal(report.entries.length, names.length);
    assert.deepEqual(await fingerprints(names), before, 'Source/program/generated bindings changed during build');
    assert.equal(await hash(compiler), compilerSha256);
    await mkdir(`${assets}/keys`, { recursive: true });
    for (const entry of report.entries) for (const suffix of ['prover', 'verifier']) {
      const file = entry.source === 'verified-experiment-slot-reuse' ? `${reuse.directory}/slot.${suffix}` : `${directory}/${entry.name}/${entry.name}.${suffix}`;
      assert.equal(await hash(file), entry[`${suffix}Sha256`]);
      await copyFile(file, `${assets}/keys/${entry.name}.${suffix}`, constants.COPYFILE_EXCL);
      assert.equal(await hash(`${assets}/keys/${entry.name}.${suffix}`), entry[`${suffix}Sha256`]);
    }
    for (const entry of report.entries) {
      const binary = `${assets}/zkir/${entry.name}.bzkir`;
      entry.binaryProgramSha256 = await hash(binary);
      entry.binaryProgramBytes = (await stat(binary)).size;
      assert(entry.binaryProgramBytes > 0);
    }
    const manifest = { manifestVersion: 2, mode: 'real-bounded-keys', compilerVersion: '0.31.1', runtimeVersion: '0.16.0',
      generatedAtUtc: new Date().toISOString(), contractSha256: before['contract/index.js'],
      compilerInfoSha256: before['compiler/contract-info.json'], circuits: report.entries };
    await writeFile(`${assets}/keys/build-manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    const { verifyPermioAuthorizationAssets } = await import('../packages/midnight-authorization/src/compiled-assets.ts');
    await verifyPermioAuthorizationAssets(assets);
    report.inventoryVerified = true;
  } catch (error) { report.failure = { message: error.message }; }
  finally {
    // Stop only this controller's exact unit before any attempt to remove swap.
    if (activeUnit) {
      try { runCommand('systemctl', ['stop', activeUnit]); activeUnit = null; }
      catch { report.unitStopFailed = true; }
    }
    report.cleanup = activeUnit ? { state: 'retained-owned-resources-unit-stop-failed' }
      : swapCreated ? await cleanupSwap().catch(() => ({ state: 'cleanup-failed-owned-file-retained' }))
        : { state: 'not-created-by-this-run-existing-resources-untouched' };
    report.completedAtUtc = new Date().toISOString(); report.elapsedSeconds = (performance.now() - started) / 1000;
    report.swapAfter = await readFile('/proc/swaps', 'utf8');
    report.memoryAfter = readNumericCounters(await readFile('/proc/meminfo', 'utf8'));
    if (directory) await json(`${directory}/report.json`, report);
    if (!activeUnit) await rmdir(lock);
    process.off('SIGINT', interrupt); process.off('SIGTERM', interrupt);
    process.stdout.write(`${JSON.stringify({ event: 'bounded-key-build-finished', directory: directory ? path.relative(root, directory) : null,
      inventoryVerified: report.inventoryVerified === true, pairs: report.entries.length, cleanup: report.cleanup,
      failureDetailsWithheld: Boolean(report.failure), milestoneComplete: false })}\n`);
  }
  process.exitCode = report.inventoryVerified ? 0 : 2;
}

if (process.argv[2] === '--worker' && process.argv.length === 5) await worker(process.argv[3], process.argv[4]);
else await build(parseBoundedKeyArguments(process.argv.slice(2)));
