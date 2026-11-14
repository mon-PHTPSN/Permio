import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdir, readFile, realpath, stat, unlink, rmdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { readNumericCounters } from './m6-bounded-key-policy.mjs';
import { parseCappedLiveArguments } from './m6-capped-live-policy.mjs';

// Narrow recovery after an exec transport interruption; never a global reset.
const root = process.cwd(), directory = process.argv[2];
assert(process.platform === 'linux' && process.getuid() === 0 && process.argv.length === 3 &&
  root.endsWith('/Permio-m6-m8-midnight-delivery') && await realpath(root) === root);
assert(/^logs\/m6-capped-live-[A-Za-z0-9]+$/.test(directory));
assert(await realpath(`${root}/${directory}`) === `${root}/${directory}`);
const run = (bin, args) => execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const report = { kind: 'owned-capped-runtime-interruption-recovery', directory, atUtc: new Date().toISOString(),
  originalServicesChanged: false, milestoneComplete: false };
const controllers = [];
for (const pid of (await readdir('/proc')).filter(value => /^\d+$/.test(value))) {
  if (await realpath(`/proc/${pid}/cwd`).catch(() => null) !== root) continue;
  // Only this worktree's process arguments, compared in memory and never logged.
  const args = (await readFile(`/proc/${pid}/cmdline`, 'utf8').catch(() => '')).split('\0').filter(Boolean);
  if (args[1] === 'scripts/run-m6-capped-live.mjs') {
    try { if (parseCappedLiveArguments(args.slice(2)).mode === '--slot-state') controllers.push(Number(pid)); }
    catch { /* Not this controller's bounded slot command. */ }
  }
}
assert(controllers.length <= 1, 'Ambiguous controller ownership');
for (const pid of controllers) process.kill(pid, 'SIGTERM');
if (controllers.length) {
  for (let attempt = 0; attempt < 20 && await stat(`${root}/${directory}/report.json`).catch(() => null) === null; attempt++) await delay(1000);
  assert(await stat(`${root}/${directory}/report.json`).catch(() => null), 'Controller has not completed its own cleanup');
  console.log(JSON.stringify({ event: 'owned-controller-cleanup-requested', directory, milestoneComplete: false }));
} else {
  const unit = `permio-m6-capped-client-${directory.slice('logs/m6-capped-live-'.length)}.service`;
  const details = Object.fromEntries(run('systemctl', ['show', unit, '--property=WorkingDirectory', '--property=ControlGroup']).split('\n').map(line => {
    const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)];
  }));
  assert(details.WorkingDirectory === root && details.ControlGroup === `/system.slice/${unit}`);
  run('systemctl', ['stop', unit]);
  const inactive = execFileSync('systemctl', ['show', unit, '--property=ActiveState', '--value'], { encoding: 'utf8' }).trim();
  assert(['inactive', 'failed'].includes(inactive), 'Owned client stop not confirmed');
  const container = JSON.parse(run('docker', ['inspect', 'permio-m6-bounded-proof']))[0];
  assert(container.Name === '/permio-m6-bounded-proof' && container.Config.Labels['permio.owner'] === 'm6-capped-live' &&
    container.Image === 'sha256:82f867abc556806f3742fb165b9cba8c898045a71e99bba8a8b33b37237bb1c9');
  run('docker', ['stop', '--timeout', '10', container.Id]);
  assert(!JSON.parse(run('docker', ['inspect', container.Id]))[0].State.Running);
  run('docker', ['rm', container.Id]);
  const swap = '/var/tmp/permio-m6-capped-live/paging.swap';
  assert(await realpath(swap) === swap);
  const meta = await stat(swap); assert(meta.uid === 0 && (meta.mode & 0o777) === 0o600 && meta.size === 6 * 1024 ** 3);
  const active = (await readFile('/proc/swaps', 'utf8')).split('\n').map(line => line.split(/\s+/)).find(row => row[0] === swap);
  const memory = readNumericCounters(await readFile('/proc/meminfo', 'utf8'));
  assert(!active || memory.MemAvailable >= Number(active[3]) + 768 * 1024, 'Retain owned swap: insufficient safe cleanup headroom');
  if (active) run('swapoff', [swap]);
  assert(!(await readFile('/proc/swaps', 'utf8')).split('\n').some(line => line.split(/\s+/)[0] === swap));
  await unlink(swap);
  assert(await realpath('/var/tmp/permio-m6-capped-live/active.lock') === '/var/tmp/permio-m6-capped-live/active.lock');
  await rmdir('/var/tmp/permio-m6-capped-live/active.lock');
  report.clientStopped = true; report.containerRemoved = true; report.swapDisabledAndUnlinked = true;
  report.swapTotalAfterKiB = readNumericCounters(await readFile('/proc/meminfo', 'utf8')).SwapTotal;
  const original = JSON.parse(run('docker', ['inspect', 'permio-m6-proof-server']))[0];
  report.originalProverRunning = original.State.Running;
  await writeFile(`${directory}/recovery.json`, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify(report));
}
