import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

assert.equal(process.platform, 'linux', 'Use the pinned WSL/Linux compiler');
assert.equal(process.argv.length, 2);
const root = process.cwd();
const contracts = 'packages/midnight-authorization/contracts';
const hash = value => createHash('sha256').update(value).digest('hex');
const names = (await readdir(contracts)).filter(name => name.endsWith('.compact')).sort();
await mkdir('logs', { recursive: true });
const directory = await mkdtemp('logs/m6-action-outcome-core-');
const source = path.join(directory, 'source');
await mkdir(source);
const inputHashes = {};
for (const name of names) {
  const file = `${contracts}/${name}`, bytes = await readFile(file);
  inputHashes[file] = hash(bytes);
  await writeFile(path.join(source, name), bytes, { flag: 'wx' });
}
const fixture = 'packages/midnight-authorization/test/fixtures/compiler-bounds/action-outcome-core.compact';
const originalAddon = await readFile(fixture);
inputHashes[fixture] = hash(originalAddon);
const main = path.join(source, 'permio-authorization.compact');
const originalMain = await readFile(main);
const addon = originalMain.toString().includes('include "runtime-action-outcome";')
  ? Buffer.from(originalAddon.toString().replace('include "runtime-action-outcome";', '')) : originalAddon;
await writeFile(main, Buffer.concat([originalMain, Buffer.from('\n'), addon]));
const generated = path.join(directory, 'generated');
const started = performance.now();
const child = spawn('compact', ['compile', '+0.31.1', '--skip-zk', main, generated], {
  env: { ...process.env, RAYON_NUM_THREADS: '1', TOKIO_WORKER_THREADS: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '', timedOut = false;
child.stdout.on('data', chunk => { output += chunk; });
child.stderr.on('data', chunk => { output += chunk; });
const timeout = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, 300_000);
const outcome = await new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('exit', (code, signal) => resolve({ code, signal }));
}).finally(() => clearTimeout(timeout));
await writeFile(path.join(directory, 'compiler.txt'), output, { flag: 'wx' });
for (const [file, digest] of Object.entries(inputHashes)) assert.equal(hash(await readFile(file)), digest);
const report = { kind: 'isolated-test-only-action-outcome-core-compilation',
  observedAtUtc: new Date().toISOString(), compilerVersion: '0.31.1', runtimeVersion: '0.16.0',
  directory, outcome, timedOut, elapsedSeconds: (performance.now() - started) / 1000,
  inputHashes, testOnlyNoAuthorization: true, productionBindingsAndKeysUnchanged: true,
  keyGeneration: false, walletLoaded: false, transactionsSubmitted: 0,
  ordinaryActionAcceptance: false, milestoneComplete: false };
if (outcome.code === 0) {
  const info = JSON.parse(await readFile(path.join(generated, 'compiler/contract-info.json'), 'utf8'));
  assert.equal(info['compiler-version'], '0.31.1');
  assert.equal(info['runtime-version'], '0.16.0');
  assert(info.circuits.some(entry => entry.name === 'testOnlyActionOutcome' && entry.proof));
  report.generatedHashes = Object.fromEntries(await Promise.all(['contract/index.js', 'compiler/contract-info.json']
    .map(async file => [file, hash(await readFile(path.join(generated, file)))])));
}
await writeFile(path.join(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ report: `${directory}/report.json`, outcome, timedOut,
  elapsedSeconds: report.elapsedSeconds, testOnlyNoAuthorization: true, transactionsSubmitted: 0 }));
if (outcome.code !== 0) process.exitCode = 1;
