import assert from 'node:assert/strict';
import { readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

/** Wait for the owning controller; no Docker command or private witness crosses this boundary. */
export async function requestOwnedSlotProverReset(directory: string) {
  assert(process.platform === 'linux' && process.getuid?.() === 0, 'Owned slot reset requires the capped WSL client');
  const root = await realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const run = await realpath(directory);
  assert(path.dirname(run) === await realpath(path.join(root, 'logs')) &&
    /^m6-capped-live-[A-Za-z0-9]+$/u.test(path.basename(run)), 'Reset must use this worktree owned run directory');
  assert(await readFile(path.join(run, 'slot-reset-enabled'), 'utf8') === 'enabled\n');
  const ready = JSON.parse(await readFile(path.join(run, 'client-ready.json'), 'utf8'));
  const relative = (await readFile('/proc/self/cgroup', 'utf8')).trim().split('::')[1];
  assert(ready.pid === process.pid && /^\/system.slice\/permio-m6-capped-client-[A-Za-z0-9]+\.service$/u.test(relative!) &&
    ready.cgroup === `/sys/fs/cgroup${relative}`, 'Reset requester is not the exact owned client');
  await writeFile(path.join(run, 'slot-reset-request.json'), JSON.stringify({ kind: 'reset-before-slot',
    clientPid: process.pid, runName: path.basename(run) }), { flag: 'wx', mode: 0o600 });
  for (let attempt = 0; attempt < 240; attempt++) {
    const reply = await readFile(path.join(run, 'slot-reset-ready'), 'utf8').catch(error => {
      if (error.code !== 'ENOENT') throw error; return null;
    });
    if (reply !== null) { assert.equal(reply, 'ready\n'); return; }
    await delay(500);
  }
  throw new Error('Owned slot-prover reset handshake timed out');
}
