import assert from 'node:assert/strict';
import { readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { verifyCappedClientCgroup } from './m6-capped-live-policy.mjs';

// No wallet/SDK imports until this process's own applied limits are verified.
const root = process.cwd(), [directory, mode] = process.argv.slice(2);
assert(process.platform === 'linux' && process.getuid() === 0 && root.endsWith('/Permio-m6-m8-midnight-delivery'));
assert(directory && mode && process.argv.length === 4 && ['--slot-state', '--credential-binding', '--allocation-only'].includes(mode));
assert(await realpath(root) === root && await realpath(directory) === directory &&
  path.dirname(directory) === `${root}/logs` && /^m6-capped-live-[A-Za-z0-9]+$/.test(path.basename(directory)));
const relative = (await readFile('/proc/self/cgroup', 'utf8')).trim().split('::')[1];
assert(/^\/system.slice\/permio-m6-capped-client-[A-Za-z0-9]+\.service$/.test(relative));
const cgroup = `/sys/fs/cgroup${relative}`, chain = [];
for (let current = cgroup;; current = path.dirname(current)) {
  assert(current === '/sys/fs/cgroup' || current.startsWith('/sys/fs/cgroup/'));
  const row = {};
  for (const key of ['memory.high', 'memory.max', 'memory.swap.max']) {
    try { row[key] = (await readFile(`${current}/${key}`, 'utf8')).trim(); }
    catch (error) { if (current !== '/sys/fs/cgroup' || error.code !== 'ENOENT') throw error; }
  }
  chain.push(row);
  if (current === '/sys/fs/cgroup') break;
}
verifyCappedClientCgroup(chain);
await writeFile(`${directory}/client-ready.json`, `${JSON.stringify({ pid: process.pid, cgroup, chain })}\n`, { flag: 'wx', mode: 0o600 });
let released = false;
for (let attempt = 0; attempt < 120; attempt++) {
  try { released = await readFile(`${directory}/client-go`, 'utf8') === 'verified\n'; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (released) break;
  await delay(500);
}
assert(released, 'Controller did not verify the client limits');
delete process.env.PERMIO_M6_SLOT_RESET_DIRECTORY;
const slotReset = await readFile(`${directory}/slot-reset-enabled`, 'utf8').catch(error => {
  if (error.code !== 'ENOENT') throw error; return null;
});
if (slotReset !== null) {
  assert(mode === '--slot-state' && slotReset === 'enabled\n');
  process.env.PERMIO_M6_SLOT_RESET_DIRECTORY = directory;
}
process.argv = [process.execPath, `${root}/scripts/run-live-m6-admission.ts`, mode, '--bounded-prover'];
let code = 1;
try { await import('./run-live-m6-admission.ts'); code = Number(process.exitCode ?? 0); }
catch { console.log(JSON.stringify({ event: 'capped-client-import-or-run-failed', detailsWithheld: true })); }
assert(Number.isInteger(code) && code >= 0 && code <= 255);
await writeFile(`${directory}/client-result.json`, `${JSON.stringify({ code })}\n`, { flag: 'wx', mode: 0o600 });
// Preserve final cgroup counters until the controller has sampled the result.
for (let attempt = 0; attempt < 120; attempt++) {
  try { if (await readFile(`${directory}/client-release`, 'utf8') === 'observed\n') break; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await delay(500);
}
process.exitCode = code;
