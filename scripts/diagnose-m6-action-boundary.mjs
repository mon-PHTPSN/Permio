import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

assert.equal(process.platform, 'linux', 'Run the pinned compiler diagnostic in WSL/Linux');
assert(process.argv.length === 2 || (process.argv.length === 3 &&
  ['--factor-status-stack', '--factor-action-checks'].includes(process.argv[2])),
  'Only the isolated factoring candidates are supported');
const factorActionChecks = process.argv[2] === '--factor-action-checks';
const factorStatusStack = process.argv[2] === '--factor-status-stack' || factorActionChecks;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contracts = 'packages/midnight-authorization/contracts';
const fixture = `${contracts}/../test/fixtures/compiler-bounds/ledger-bound-action.compact`;
const circuit = 'diagnoseLedgerBoundActionAncestry';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = name => readFile(path.join(root, name));
const existingNames = (await readdir(path.join(root, contracts))).filter(name => name.endsWith('.compact')).sort();
assert(existingNames.includes('permio-authorization.compact'));
const baseline = Object.fromEntries(await Promise.all(existingNames.map(async name =>
  [`${contracts}/${name}`, hash(await read(`${contracts}/${name}`))])));
for (const name of ['contract/index.js', 'contract/index.d.ts', 'compiler/contract-info.json', 'keys/build-manifest.json']) {
  const relative = `${contracts}/managed/permio-authorization/${name}`;
  baseline[relative] = hash(await read(relative));
}
const productionInfo = JSON.parse((await read(`${contracts}/managed/permio-authorization/compiler/contract-info.json`)).toString());
const oldProofs = productionInfo.circuits.filter(entry => entry.proof).map(entry => entry.name).sort();
assert.equal(oldProofs.length, 11, 'Probe review must be renewed for another contract inventory');
await mkdir(path.join(root, 'logs'), { recursive: true });
const output = await mkdtemp(path.join(root, 'logs/m6-action-boundary-'));
const snapshot = path.join(output, 'source');
await mkdir(snapshot);
for (const name of existingNames) await writeFile(path.join(snapshot, name), await read(`${contracts}/${name}`), { flag: 'wx' });
let candidate = null;
if (factorStatusStack) {
  const file = `${contracts}/../test/fixtures/compiler-bounds/status-stack-factored.compact`;
  const replacement = await read(file);
  const target = path.join(snapshot, 'runtime-status-multiproof.compact');
  const original = await readFile(target, 'utf8');
  const start = original.indexOf('pure circuit runtimeStatusMultiproofStep(');
  const end = original.indexOf('export pure circuit runtimeStatusMultiproofRoot(', start);
  assert(start > 0 && end > start && original.indexOf('pure circuit runtimeStatusMultiproofStep(', start + 1) === -1);
  await writeFile(target, original.slice(0, start) + replacement.toString() + '\n\n' + original.slice(end));
  candidate = { kind: 'equivalent-status-stack-hash-factoring', file, sha256: hash(replacement), productionAdopted: false };
}
if (factorActionChecks) {
  const file = path.join(snapshot, 'runtime-active-ancestry.compact');
  const original = await readFile(file, 'utf8');
  const repeated = `                assertRuntimeActiveStatus(ancestry.statusProof, RuntimeCredentialStatusLeaf{
                    leafVersion: 2, namespaceHash: session.target.namespaceHash,
                    credentialKind: 3, credentialCommitment: runtimeSessionCredentialCommitment(session),
                    revocationAuthorityAccountCredentialCommitment: accountCommitments[i],
                    statusIndex: session.statusIndex, status: 1
                });`;
  const anchor = '    assertRuntimeStatusMultiproof(ancestry.statusProof, expectedRoot, expectedSequence);';
  assert.equal(original.split(repeated).length, 2);
  assert.equal(original.split(anchor).length, 2);
  const once = `    // The loop above proves that this exact subject is the terminal account.
    // Check its session status once, after the terminal relation is established.
    assertRuntimeActiveStatus(ancestry.statusProof, RuntimeCredentialStatusLeaf{
        leafVersion: 2, namespaceHash: session.target.namespaceHash,
        credentialKind: 3, credentialCommitment: runtimeSessionCredentialCommitment(session),
        revocationAuthorityAccountCredentialCommitment: session.subjectAccountCredentialCommitment,
        statusIndex: session.statusIndex, status: 1
    });
`;
  await writeFile(file, original.replace(repeated, '').replace(anchor, once + anchor));
  candidate = { ...candidate, kind: 'equivalent-stack-and-session-status-factoring',
    terminalSessionStatusCheckedOnce: true, terminalSubjectEqualityAndAllAncestorChecksRetained: true };
}
const main = path.join(snapshot, 'permio-authorization.compact');
const original = await readFile(main);
const addon = await read(fixture);
await writeFile(main, Buffer.concat([original, Buffer.from('\n'), addon]));
const sourceSha256 = Object.fromEntries(await Promise.all(existingNames.map(async name =>
  [name, hash(await readFile(path.join(snapshot, name)))])));
const generated = path.join(output, 'generated');
const args = ['compile', '+0.31.1', '--skip-zk', main, generated];
const startedAtUtc = new Date().toISOString();
let log = '', timedOut = false;
const started = performance.now();
const child = spawn('compact', args, { cwd: root, env: { ...process.env, RAYON_NUM_THREADS: '1', TOKIO_WORKER_THREADS: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.on('data', chunk => { log += chunk; });
child.stderr.on('data', chunk => { log += chunk; });
const timeout = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, 900_000);
const outcome = await new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('exit', (code, signal) => resolve({ code, signal }));
}).finally(() => clearTimeout(timeout));
await writeFile(path.join(output, 'compiler.txt'), log, { flag: 'wx' });
for (const [name, expected] of Object.entries(baseline)) assert.equal(hash(await read(name)), expected, `Production input changed: ${name}`);
let entry = null, programs = null;
if (outcome.code === 0) {
  const info = JSON.parse(await readFile(path.join(generated, 'compiler/contract-info.json'), 'utf8'));
  assert.equal(info['compiler-version'], '0.31.1');
  assert.equal(info['runtime-version'], '0.16.0');
  const proofs = info.circuits.filter(item => item.proof).map(item => item.name).sort();
  assert.deepEqual(proofs, [...oldProofs, circuit].sort());
  entry = info.circuits.find(item => item.name === circuit);
  programs = {};
  for (const extension of ['zkir', 'bzkir']) {
    const file = path.join(generated, 'zkir', `${circuit}.${extension}`);
    if (extension === 'bzkir' && !(await stat(file).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    }))) {
      programs.bzkir = { generated: false, reason: '--skip-zk emits text ZKIR; binary program is produced by the later zkir build' };
      continue;
    }
    const bytes = await readFile(file);
    programs[extension] = { bytes: bytes.length, sha256: hash(bytes) };
  }
}
const report = {
  reportVersion: 1, kind: 'ledger-bound-full-action-ancestry-compile-diagnostic', startedAtUtc,
  completedAtUtc: new Date().toISOString(), elapsedSeconds: (performance.now() - started) / 1000,
  compilerVersion: '0.31.1', runtimeVersion: '0.16.0', outcome, timedOut,
  command: ['compact', ...args.map(value => path.isAbsolute(value) ? path.relative(root, value) : value)],
  baseProductionHashes: baseline, snapshotHashes: sourceSha256, fixtureSha256: hash(addon),
  existingProofEntries: oldProofs.length, diagnosticEntry: entry, diagnosticPrograms: programs, isolatedCandidate: candidate,
  productionSourcesAndAssetsUnchanged: true, fixedDepth16AndCurrentRootChecksPreserved: true,
  callerControlledProofBoundaryUnchanged: true, walletLoaded: false, newDeployment: false,
  transactionsSubmitted: 0, realKeyPairsGenerated: 0, proofGenerated: false,
  ordinaryActionAcceptance: false, milestoneComplete: false,
  excludedAcceptance: ['participant-slot provenance', 'selected evidence', 'issuer-policy revalidation', 'state transition', 'nullifier', 'common receipt', 'live-chain acceptance'],
};
await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ report: path.relative(root, path.join(output, 'report.json')),
  outcome, timedOut, elapsedSeconds: report.elapsedSeconds,
  diagnosticEntry: entry ? { name: entry.name, proof: entry.proof } : null,
  diagnosticPrograms: programs, productionSourcesAndAssetsUnchanged: true,
  transactionsSubmitted: 0, realKeyPairsGenerated: 0, ordinaryActionAcceptance: false }));
if (outcome.code !== 0) process.exitCode = 1;
