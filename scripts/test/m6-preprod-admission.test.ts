import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { execFileSync, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { inspect } from 'node:util';
import { it } from 'node:test';
import { parsePreprodAdmissionArguments, loadPreprodAdmissionProfile, loadPreprodAdmissionWallet,
  PREPROD_ADMISSION_TIMEOUT_MS, observePreprodSubmissions } from '../m6-preprod-admission.ts';
import { monitorPreprodAdmission } from '../m6-preprod-admission-supervisor.ts';

const controls = (config = 'unused-private-config', checkpoint = 'unused-private-directory') => [
  '--preprod', '--check', '--local-config', config, '--checkpoint', checkpoint,
  '--account-index-var', 'ACCOUNT_INDEX', '--mnemonic-var', 'MNEMONIC', '--proof-server', 'http://127.0.0.1:6300'];

it('fixture checkpoint failure stops governance before opening the wallet or spending DUST', async () => {
  const { runLiveM6Admission } = await import('../run-live-m6-admission.ts');
  const { parseLiveM6Arguments } = await import('../m6-prover-memory.ts');
  let checkpoints = 0, walletScopes = 0;
  await assert.rejects(runLiveM6Admission(parseLiveM6Arguments(['--governance-only']), {
    networkId: 'preprod',
    async checkpointFixture(fixture) {
      checkpoints++;
      assert.equal(fixture.record.reviews.length, 2);
      assert.equal(fixture.bindings.bindings.length, 1);
      assert.equal(fixture.policy.impact, 'high');
      assert(!Object.hasOwn(fixture, 'registry'));
      throw new Error('local fixture persistence unavailable');
    },
    async withProviders() { walletScopes++; throw new Error('wallet must remain closed'); },
  }), /local fixture persistence unavailable/);
  assert.equal(checkpoints, 1);
  assert.equal(walletScopes, 0);
});

it('saved M4 fixture restoration verifies original reviews, policy bindings and activation without new keys', async () => {
  const { runLiveM6Admission, restoreM6GovernanceFixture } = await import('../run-live-m6-admission.ts');
  const { parseLiveM6Arguments } = await import('../m6-prover-memory.ts');
  let saved: import('../run-live-m6-admission.ts').M6PreprodGovernanceFixture | undefined;
  await assert.rejects(runLiveM6Admission(parseLiveM6Arguments(['--governance-only']), {
    networkId: 'preprod', async checkpointFixture(fixture) { saved = fixture; throw Error('captured fixture'); },
    async withProviders() { throw Error('wallet must remain closed'); },
  }), /captured fixture/);
  assert(saved);
  const restored = restoreM6GovernanceFixture(saved);
  assert.deepEqual(restored.registry.getTemplate(saved.record.target), saved.record);
  assert.deepEqual(restored.activation, saved.activation);
  const tampered = structuredClone(saved) as any;
  tampered.record.reviews[0].payload.decision = 'reject';
  assert.throws(() => restoreM6GovernanceFixture(tampered));
  const alteredBinding = structuredClone(saved) as any;
  alteredBinding.bindings.bindings[0].configurationHash = '0x' + 'ff'.repeat(32);
  assert.throws(() => restoreM6GovernanceFixture(alteredBinding));
});

it('Preprod controls require explicit network, scope and local selectors; never accept remote witness destinations or Local Dev controls', () => {
  for (const [mode, scope] of [['--check', 'check'], ['--submit-deployment', 'deployment'], ['--submit-governance', 'governance'],
    ['--submit-allocation', 'allocation'], ['--submit-credential-binding', 'credential-binding'], ['--submit-slot-state', 'slot-state']]) {
    const args = controls(); args[1] = mode!; assert.equal(parsePreprodAdmissionArguments(args).scope, scope);
  }
  for (const args of [[], controls().slice(1), [...controls(), '--bounded-prover'], [...controls(), '--submit-deployment'],
    controls().map(value => value === '--checkpoint' ? '--local-config' : value),
    controls().map(value => value === 'MNEMONIC' ? 'private seed words' : value),
    controls().map(value => value === '--check' ? '--memory-smoke' : value),
    controls().map(value => value === 'http://127.0.0.1:6300' ? 'https://remote.invalid' : value)]) {
    assert.throws(() => parsePreprodAdmissionArguments(args));
  }
});

it('private input loading requires ignored untracked regular files, redacts inspection and detects changed source snapshots', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'permio-preprod-input-test-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'ignore', timeout: 10_000 });
  try {
    git('init', '--quiet');
    await writeFile(path.join(root, '.gitignore'), '.env\nwallet/\n');
    await mkdir(path.join(root, 'wallet'));
    await writeFile(path.join(root, '.env'), 'BLOCKFROST_PROJECT_ID=nightpreprod_synthetic_test_only\nMNEMONIC=synthetic-private-input-not-a-real-seed\nACCOUNT_INDEX=0\n');
    for (const key of ['shielded', 'unshielded', 'dust']) await writeFile(path.join(root, 'wallet', `${key}.json`), JSON.stringify({ kind: key }));
    const options = parsePreprodAdmissionArguments(controls(path.join(root, '.env'), path.join(root, 'wallet')));
    assert.equal((await loadPreprodAdmissionProfile(options)).toJSON().networkId, 'preprod');
    await assert.rejects(loadPreprodAdmissionWallet(options));
    const inputs = await loadPreprodAdmissionWallet({ ...options, scope: 'deployment' });
    assert.equal(inputs.secret.accountIndex, 0); await inputs.verifyUnchanged();
    for (const value of [JSON.stringify(inputs), inspect(inputs)]) {
      assert(!value.includes('synthetic-private-input')); assert(!value.includes('nightpreprod_synthetic'));
    }
    await writeFile(path.join(root, 'wallet/dust.json'), 'changed');
    await assert.rejects(inputs.verifyUnchanged(), /details withheld/);
    await writeFile(path.join(root, 'unignored-config'), await readFile(path.join(root, '.env')));
    await assert.rejects(loadPreprodAdmissionProfile({ ...options, config: path.join(root, 'unignored-config') }));
    git('add', '--force', '.env');
    await assert.rejects(loadPreprodAdmissionProfile(options));
  } finally { await rm(root, { recursive: true }); }
});

class OwnedChild extends EventEmitter {
  signals: string[] = [];
  kill(signal: string) { this.signals.push(signal); queueMicrotask(() => this.emit('close', null, signal)); return true; }
}
const owned = (child: OwnedChild) => child as unknown as ChildProcess;
it('Preprod supervisor requires exact requested scope plus exit zero, and forwards only fixed safe phases', async () => {
  assert.equal(PREPROD_ADMISSION_TIMEOUT_MS, 3_600_000);
  for (const [scope, code] of [['deployment', 0], ['governance', 0], ['deployment', 1]] as const) {
    const child = new OwnedChild(), phases: string[] = [];
    const result = monitorPreprodAdmission(owned(child), 'deployment', phase => phases.push(phase));
    child.emit('message', { kind: 'preprod-admission-phase', phase: 'workflow', privateData: 'not-forwarded' });
    child.emit('message', { kind: 'preprod-admission-phase', phase: 'private-data-not-forwarded' });
    child.emit('message', { kind: 'preprod-admission-phase', phase: 'wallet-balance-started' });
    child.emit('message', { kind: 'preprod-admission-phase', phase: 'wallet-balance-failed-insufficient-funds', privateError: 'not-forwarded' });
    child.emit('message', { kind: 'preprod-admission-phase', phase: 'wallet-balance-failed-empty-dust-actions', privateError: 'not-forwarded' });
    child.emit('message', { kind: 'preprod-admission-phase', phase: 'wallet-balance-failed-PRIVATE' });
    child.emit('message', { kind: 'preprod-admission-preflight', assetsVerified: true, nodeRpcPassed: true,
      genesisMatches: true, nodeSubscriptionPassed: true, indexerSubscriptionPassed: true, loopbackProverHealthy: false,
      privateUrl: 'private-data-not-forwarded' });
    child.emit('message', { kind: 'preprod-admission-finished', scope, milestoneComplete: false });
    child.emit('close', code, null);
    const outcome = await result;
    assert.equal(outcome.passed, scope === 'deployment' && code === 0);
    assert.equal(outcome.preflight?.loopbackProverHealthy, false);
    assert(!JSON.stringify(outcome).includes('private-data-not-forwarded'));
    assert.deepEqual(phases, ['workflow', 'wallet-balance-started', 'wallet-balance-failed-insufficient-funds', 'wallet-balance-failed-empty-dust-actions']);
  }
});
it('deadline, spawn failure and reporter errors cannot pass or expose error text; only the owned worker is terminated', async () => {
  const child = new OwnedChild(), result = monitorPreprodAdmission(owned(child), 'check', () => undefined, 5);
  child.emit('message', { kind: 'preprod-admission-finished', scope: 'check', milestoneComplete: false });
  assert.equal((await result).category, 'owned-process-deadline'); assert.deepEqual(child.signals, ['SIGTERM']);
  const broken = new OwnedChild(), failed = monitorPreprodAdmission(owned(broken), 'check', () => undefined);
  broken.emit('error', Error('private-error-data')); assert(!(JSON.stringify(await failed)).includes('private-error-data'));
  const reporter = new OwnedChild(), stopped = monitorPreprodAdmission(owned(reporter), 'check', () => { throw Error('private-reporter'); });
  reporter.emit('message', { kind: 'preprod-admission-phase', phase: 'preflight' });
  assert.equal((await stopped).passed, false); assert.deepEqual(reporter.signals, ['SIGTERM']);
  const rejected = new OwnedChild(), rejection = monitorPreprodAdmission(owned(rejected), 'deployment', () => undefined);
  rejected.emit('message', { kind: 'preprod-admission-failed', privateError: 'not-forwarded' });
  assert.equal((await rejection).passed, false); assert.deepEqual(rejected.signals, ['SIGTERM']);
});
it('the supervisor force-terminates only its owned worker if graceful termination is ignored', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const child = new OwnedChild();
  child.kill = signal => { child.signals.push(signal); if (signal === 'SIGKILL') child.emit('close', null, signal); return true; };
  const result = monitorPreprodAdmission(owned(child), 'deployment', () => undefined, 10);
  t.mock.timers.tick(10); assert.deepEqual(child.signals, ['SIGTERM']);
  t.mock.timers.tick(5000); assert.equal((await result).passed, false);
  assert.deepEqual(child.signals, ['SIGTERM', 'SIGKILL']);
});

it('preserves revalidated submission codes and the failing phase without forwarding raw child error fields', async () => {
  const child = new OwnedChild(), phases: string[] = [];
  const result = monitorPreprodAdmission(owned(child), 'governance', phase => phases.push(phase));
  child.emit('message', { kind: 'preprod-admission-phase', phase: 'wallet-submit-started' });
  child.emit('message', { kind: 'preprod-submission-failed', submissionFailure: {
    category: 'node-submission-error', rpcCode: 1010, customCode: 168, privateError: 'PRIVATE', txData: 'PRIVATE',
  }, privateError: 'PRIVATE' });
  assert.deepEqual(child.signals, []); // Safe detail arrives before checkpoint redaction and resource disposal.
  child.emit('message', { kind: 'preprod-admission-failed', detailsWithheld: true });
  const outcome = await result;
  assert.equal(outcome.passed, false); assert.equal(outcome.lastPhase, 'wallet-submit-started');
  assert.deepEqual(outcome.submissionFailure, { category: 'node-submission-error', rpcCode: 1010, customCode: 168 });
  assert.deepEqual(phases, ['wallet-submit-started']); assert(!JSON.stringify(outcome).includes('PRIVATE'));
  assert.deepEqual(child.signals, ['SIGTERM']);
});
it('importing the shared runner never starts the CLI and Preprod rejects Local Dev controls before its provider callback', async () => {
  const { runLiveM6Admission } = await import('../run-live-m6-admission.ts');
  const { parseLiveM6Arguments } = await import('../m6-prover-memory.ts');
  let requests = 0;
  for (const args of [['private-account-not-read'], ['--profile-memory'], ['--bounded-prover'], ['--memory-smoke']]) {
    await assert.rejects(runLiveM6Admission(parseLiveM6Arguments(args), { networkId: 'preprod',
      async withProviders() { requests++; throw Error('provider-must-not-run'); } }), /cannot reuse Local Dev/);
  }
  assert.equal(requests, 0);
});
it('the shared runner constructs a real current-contract deployment bound to Preprod, stopping before proof, balancing or submission', async () => {
  const { setNetworkId } = await import('@midnight-ntwrk/midnight-js-network-id');
  const { runLiveM6Admission } = await import('../run-live-m6-admission.ts');
  const { parseLiveM6Arguments } = await import('../m6-prover-memory.ts');
  const { createPreprodAuthorizationProviders } = await import('../../packages/midnight-authorization/src/preprod-runtime.ts');
  const { PreprodConnectionProfile } = await import('../../packages/midnight-authorization/src/preprod-profile.ts');
  const { hashProtocolIdentifier } = await import('../../packages/midnight-authorization/src/canonical.ts');
  const profile = new PreprodConnectionProfile('nightpreprod_synthetic_no_submission');
  let unprovenTransactions = 0, balance = 0, submit = 0;
  setNetworkId('preprod');
  try {
    const wallet = { env: profile.environmentForSdk(), getCoinPublicKey: () => '01'.repeat(32),
      getEncryptionPublicKey: () => '02'.repeat(32), async balanceTx() { balance++; throw Error('must-not-balance'); },
      async submitTx() { submit++; throw Error('must-not-submit'); } };
    const providers = { ...createPreprodAuthorizationProviders(wallet as never, profile), proofProvider: {
      async proveTx(tx: Parameters<import('@midnight-ntwrk/midnight-js-types').ProofProvider['proveTx']>[0]) {
      const bytes = Buffer.from(tx.serialize());
      assert(bytes.includes(Buffer.from(hashProtocolIdentifier('network-id', 'preprod').slice(2), 'hex')));
      assert(!bytes.includes(Buffer.from(hashProtocolIdentifier('network-id', 'undeployed').slice(2), 'hex')));
      unprovenTransactions++; throw Error('synthetic-stop-before-proving');
    } } };
    await assert.rejects(runLiveM6Admission(parseLiveM6Arguments(['--governance-only']), {
      networkId: 'preprod', deploymentOnly: true, async withProviders(use) { return use(providers); },
    }), /synthetic-stop-before-proving/);
    assert.equal(unprovenTransactions, 1); assert.equal(balance, 0); assert.equal(submit, 0);
  } finally { setNetworkId('undeployed'); }
});
it('invalid Preprod CLI controls fail before SDK, wallet access, network or submission', () => {
  const result = spawnSync(process.execPath, ['scripts/run-live-m6-preprod.ts', '--preprod', '--submit-deployment'],
    { encoding: 'utf8', timeout: 10_000 });
  assert.equal(result.status, 1); const report = JSON.parse(result.stdout.trim());
  assert.equal(report.category, 'invalid-controls-or-supervision'); assert.equal(report.milestoneComplete, false);
});
it('records only public candidate transaction IDs before submission and never retries an uncertain result', async () => {
  let calls = 0;
  const events: unknown[] = [];
  const observer = observePreprodSubmissions({ async submitTx() { calls++; throw Error('synthetic-unknown-outcome'); } },
    (event, data) => events.push({ event, ...data }));
  const transaction = { identifiers: () => ['00' + 'ab'.repeat(32)], serialize() { throw Error('must-not-read-transaction-bytes'); },
    privatePayload: 'not-to-be-logged' };
  await assert.rejects(observer.submitTx(transaction as never), /synthetic-unknown-outcome/);
  assert.equal(calls, 1); assert.equal(events.length, 1);
  assert(!JSON.stringify(events).includes('not-to-be-logged'));
  assert.deepEqual(events[0], { event: 'preprod-transaction-submission-attempt', transactionIds: ['00' + 'ab'.repeat(32)],
    transactionBytesLogged: false, submissionOrFinalityAsserted: false });
  await assert.rejects(observer.submitTx({ identifiers: () => ['invalid-private-text'] } as never), /invalid-public-transaction-identifiers/);
  assert.equal(calls, 1);
});

it('accepts actual Ledger 8 typed transaction IDs, rejects bare hashes and unknown type bytes, and binds the returned ID', async () => {
  const { Transaction, Intent } = await import('@midnight-ntwrk/ledger-v8');
  const synthetic = Transaction.fromParts('preprod').addIntent({ tag: 'specific', value: 1 }, Intent.new(new Date('2030-01-01T00:00:00Z')));
  const ids = synthetic.identifiers();
  assert.equal(ids.length, 1); assert.equal(ids[0]!.length, 66); assert.equal(ids[0]!.slice(0, 2), '00');
  let calls = 0;
  const events: Record<string, unknown>[] = [];
  const observer = observePreprodSubmissions({ async submitTx() { calls++; return ids[0]!; } },
    (event, data) => events.push({ event, ...data }));
  assert.equal(await observer.submitTx(synthetic as never), ids[0]);
  assert.equal(calls, 1); assert.deepEqual(events[0]!.transactionIds, ids);
  assert.equal(events[1]!.transactionId, ids[0]);
  for (const invalid of ['ab'.repeat(32), '02' + 'ab'.repeat(32), '0x' + ids[0], '00' + 'ab'.repeat(33), 'PRIVATE']) {
    await assert.rejects(observer.submitTx({ identifiers: () => [invalid] } as never), /invalid-public-transaction-identifiers/);
  }
  assert.equal(calls, 1);
  let wrongCalls = 0;
  const wrong = observePreprodSubmissions({ async submitTx() { wrongCalls++; return '01' + 'ab'.repeat(32); } }, () => undefined);
  await assert.rejects(wrong.submitTx(synthetic as never), /unexpected-submission-result-reconcile-before-retry/);
  assert.equal(wrongCalls, 1);
});
