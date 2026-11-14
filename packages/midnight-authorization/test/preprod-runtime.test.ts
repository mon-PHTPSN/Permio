import assert from 'node:assert/strict';
import { Socket } from 'node:net';
import { it } from 'node:test';
import { getNetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { MidnightWalletProvider } from '@midnight-ntwrk/testkit-js';
import { PreprodConnectionProfile } from '../src/preprod-profile.ts';
import { classifyPreprodBalanceFailure, createPreprodAuthorizationProviders } from '../src/preprod-runtime.ts';
import { PreprodSubmissionError } from '../src/preprod-submission-failure.ts';
import { DustActions, Intent, Transaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { Effect } from 'effect';
import { WalletError } from '@midnight-ntwrk/wallet-sdk-dust-wallet/v1';

const profile = new PreprodConnectionProfile('nightpreprod_synthetic_provider_only');
// Deliberately only a wiring fixture; it has no restored wallet, funds or signing capability.
const fixture = () => ({ env: profile.environmentForSdk() }) as MidnightWalletProvider;

it('rejects an unconfigured SDK signing network before constructing any providers', () => {
  assert.throws(() => createPreprodAuthorizationProviders(fixture(), profile), /signing network or wallet profile mismatch/);
  // This file owns its test process; establish the baseline only after checking the unset case.
  setNetworkId('undeployed');
});

it('blocks the pinned SDK zero-fee empty-DUST shape before submission while allowing an absent section', async () => {
  const previous = getNetworkId(), phases: string[] = [];
  let submissions = 0;
  try {
    setNetworkId('preprod');
    const intent = Intent.new(new Date(Date.now() + 60_000));
    intent.dustActions = new DustActions('signature', 'pre-proof', new Date(), [], []);
    let balanced = Transaction.fromParts('preprod').addIntent({ tag: 'specific', value: 1 }, intent);
    const wallet = Object.assign(fixture(), {
      async balanceTx() { return balanced as never; },
      async submitTx() { submissions++; return 'must-not-submit'; },
    });
    const providers = createPreprodAuthorizationProviders(wallet, profile, phase => phases.push(phase));
    await assert.rejects(providers.walletProvider.balanceTx({} as never), /balancing failed; details withheld/);
    assert.deepEqual(phases, ['wallet-balance-started', 'wallet-balance-failed-empty-dust-actions']);
    assert.equal(submissions, 0);
    balanced = Transaction.fromParts('preprod');
    assert.strictEqual(await providers.walletProvider.balanceTx({} as never), balanced);
    assert.equal(phases.at(-1), 'wallet-balance-completed');
  } finally { setNetworkId(previous); }
});

it('wires the explicit Preprod SDK providers without network requests, wallet creation or implicit network changes', () => {
  const previous = getNetworkId(), connect = Socket.prototype.connect;
  let requests = 0;
  Socket.prototype.connect = function () { requests++; throw Error('network-forbidden'); } as typeof connect;
  try {
    setNetworkId('preprod');
    const wallet = fixture(), providers = createPreprodAuthorizationProviders(wallet, profile);
    assert.notStrictEqual(providers.walletProvider, wallet);
    assert.strictEqual(providers.walletProvider, providers.midnightProvider);
    assert(providers.zkConfigProvider && providers.proofProvider && providers.publicDataProvider && providers.privateStateProvider);
    assert.equal(getNetworkId(), 'preprod'); assert.equal(requests, 0);
  } finally { Socket.prototype.connect = connect; setNetworkId(previous); }
});
it('rechecks profile/network drift before submission and after asynchronous balancing without retrying', async () => {
  const previous = getNetworkId(); let submitted = 0;
  try {
    setNetworkId('preprod');
    const wallet = Object.assign(fixture(), {
      async balanceTx() { setNetworkId('undeployed'); return {} as never; },
      async submitTx() { submitted++; return 'synthetic-never-submitted'; },
    });
    const providers = createPreprodAuthorizationProviders(wallet, profile);
    await assert.rejects(providers.walletProvider.balanceTx({} as never), /signing network or wallet profile mismatch/);
    await assert.rejects(providers.midnightProvider.submitTx({} as never), /signing network or wallet profile mismatch/);
    setNetworkId('preprod'); Object.assign(wallet.env, { nodeWS: 'ws://synthetic-wrong-network' });
    await assert.rejects(providers.midnightProvider.submitTx({} as never), /signing network or wallet profile mismatch/);
    assert.equal(submitted, 0);
  } finally { setNetworkId(previous); }
});
it('requires the explicit Preprod signing network and never silently retargets a Local Dev process', () => {
  const previous = getNetworkId();
  try {
    setNetworkId('undeployed');
    assert.throws(() => createPreprodAuthorizationProviders(fixture(), profile), /signing network or wallet profile mismatch/);
    assert.equal(getNetworkId(), 'undeployed');
  } finally { setNetworkId(previous); }
});
it('rejects mismatched wallet network, credentials, every endpoint and proof destination', () => {
  const previous = getNetworkId();
  try {
    setNetworkId('preprod');
    for (const key of ['networkId', 'walletNetworkId', 'node', 'nodeWS', 'indexer', 'indexerWS', 'proofServer', 'faucet'] as const) {
      const wallet = fixture(); Object.assign(wallet.env, { [key]: 'synthetic-foreign-target' });
      assert.throws(() => createPreprodAuthorizationProviders(wallet, profile), /signing network or wallet profile mismatch/);
    }
    const rotated = new PreprodConnectionProfile('nightpreprod_synthetic_other_credential');
    assert.throws(() => createPreprodAuthorizationProviders(fixture(), rotated), /signing network or wallet profile mismatch/);
  } finally { setNetworkId(previous); }
});
it('redacts malformed wallet access errors rather than returning token-bearing provider exceptions', () => {
  const previous = getNetworkId();
  try {
    setNetworkId('preprod');
    const wallet = Object.create(null);
    Object.defineProperty(wallet, 'env', { get() { throw Error('private-provider-token'); } });
    assert.throws(() => createPreprodAuthorizationProviders(wallet, profile), error => error instanceof Error &&
      !error.message.includes('private-provider-token'));
    assert.throws(() => createPreprodAuthorizationProviders(fixture(), null as unknown as PreprodConnectionProfile));
  } finally { setNetworkId(previous); }
});
it('redacts underlying wallet failures and never automatically retries an uncertain submission', async () => {
  const previous = getNetworkId(); let submitted = 0;
  try {
    setNetworkId('preprod');
    for (const synchronous of [true, false]) {
      const failure = () => { if (synchronous) throw Error('private-sdk-wallet-data'); return Promise.reject(Error('private-sdk-wallet-data')); };
      const wallet = Object.assign(fixture(), {
        getCoinPublicKey() { throw Error('private-sdk-wallet-data'); },
        getEncryptionPublicKey() { throw Error('private-sdk-wallet-data'); },
        balanceTx: failure,
        submitTx() { submitted++; return failure(); },
      });
      const providers = createPreprodAuthorizationProviders(wallet, profile);
      const redacted = (error: unknown) => error instanceof Error && !error.message.includes('private-sdk-wallet-data');
      assert.throws(() => providers.walletProvider.getCoinPublicKey(), redacted);
      assert.throws(() => providers.walletProvider.getEncryptionPublicKey(), redacted);
      await assert.rejects(providers.walletProvider.balanceTx({} as never), redacted);
      await assert.rejects(providers.midnightProvider.submitTx({} as never), error => redacted(error) &&
        (error as Error).message.includes('outcome unknown; reconcile before retry'));
    }
    assert.equal(submitted, 2);
  } finally { setNetworkId(previous); }
});

it('reports only fixed balancing stages and does not submit or copy private SDK errors', async () => {
  const previous = getNetworkId(), phases: string[] = [];
  let balances = 0, submissions = 0;
  try {
    setNetworkId('preprod');
    const wallet = Object.assign(fixture(), {
      async balanceTx() { balances++; throw new Error('Transaction would exhaust the block limits PRIVATE-WITNESS'); },
      async submitTx() { submissions++; return 'must-not-submit'; },
    });
    const providers = createPreprodAuthorizationProviders(wallet, profile, event => phases.push(event));
    await assert.rejects(providers.walletProvider.balanceTx({} as never), error => error instanceof Error &&
      error.message === 'Preprod wallet: balancing failed; details withheld');
    assert.deepEqual(phases, ['wallet-balance-started', 'wallet-balance-failed-ledger-block-limit']);
    assert.equal(balances, 1); assert.equal(submissions, 0);
    Object.assign(wallet, { async balanceTx() { balances++; return {} as never; } });
    await providers.walletProvider.balanceTx({} as never);
    assert.deepEqual(phases.slice(2), ['wallet-balance-started', 'wallet-balance-completed']);
  } finally { setNetworkId(previous); }
});

it('balance failure classification is bounded and does not invoke private accessors or serialize errors', () => {
  for (const [message, expected] of [
    ['Insufficient funds PRIVATE', 'insufficient-funds'],
    ['Wallet.InsufficientFunds PRIVATE', 'insufficient-funds'],
    ['Transaction would exhaust the block limits PRIVATE', 'ledger-block-limit'],
    ['No balancing transaction was created PRIVATE', 'no-balancing-transaction'],
    ['Failed to prove transaction PRIVATE', 'local-prover-failure'],
    ['TimeoutError PRIVATE', 'request-timeout'],
  ] as const) assert.equal(classifyPreprodBalanceFailure(new Error('outer', { cause: new Error(message) })), expected);
  assert.equal(classifyPreprodBalanceFailure({ _tag: 'Wallet.InsufficientFunds' }), 'insufficient-funds');
  const accessor = Object.defineProperties({}, {
    message: { get() { throw Error('PRIVATE'); } }, cause: { get() { throw Error('PRIVATE'); } },
    toJSON: { value() { throw Error('PRIVATE'); } },
  });
  const cycle: { cause?: unknown } = {}; cycle.cause = cycle;
  const proxy = new Proxy({}, { getOwnPropertyDescriptor() { throw Error('PRIVATE'); } });
  let deep: Error = new Error('Insufficient funds PRIVATE');
  for (let index = 0; index < 30; index++) deep = new Error('outer', { cause: deep });
  for (const value of [accessor, cycle, proxy, deep, new Error('PRIVATE'), 'PRIVATE', null, undefined]) {
    assert.equal(classifyPreprodBalanceFailure(value), 'unknown');
  }
});

it('finds safe balance categories through actual pinned dust-wallet and Effect cause wrappers', async () => {
  for (const [message, expected] of [
    ['Transaction would exhaust the block limits PRIVATE', 'ledger-block-limit'],
    ['exceeded block limit in transaction fee computation PRIVATE', 'ledger-block-limit'],
    ['exceeded the maximum time to dismiss for transaction size PRIVATE', 'ledger-dismiss-limit'],
    ['unreachable PRIVATE', 'wasm-runtime-failure'],
    ['inconsistent binding PRIVATE', 'binding-failure'],
    ['Insufficient funds PRIVATE', 'insufficient-funds'],
  ] as const) {
    const sdk = new WalletError.OtherWalletError({ message: 'Dust balancing failed PRIVATE', cause: new Error(message) });
    let caught: unknown;
    try { await Effect.runPromise(Effect.fail(sdk)); } catch (error) { caught = error; }
    assert.equal(classifyPreprodBalanceFailure(caught), expected);
    assert(!classifyPreprodBalanceFailure(caught).includes('PRIVATE'));
  }
});

it('keeps safe submission diagnostics and phase labels while calling the wallet exactly once', async () => {
  const previous = getNetworkId(), phases: string[] = [];
  const observed: unknown[] = [];
  let submitted = 0;
  try {
    setNetworkId('preprod');
    const wallet = Object.assign(fixture(), { async submitTx() {
      submitted++; throw { _tag: 'SubmissionError', txData: 'PRIVATE',
        cause: Object.assign(new Error('Custom error: 168 PRIVATE'), { code: 1010 }) };
    } });
    const providers = createPreprodAuthorizationProviders(wallet, profile, phase => phases.push(phase), failure => observed.push(failure));
    await assert.rejects(providers.midnightProvider.submitTx({} as never), error => {
      assert(error instanceof PreprodSubmissionError);
      assert.deepEqual(error.diagnostic, { category: 'node-submission-error', rpcCode: 1010, customCode: 168 });
      assert(!JSON.stringify(error).includes('PRIVATE')); return true;
    });
    assert.equal(submitted, 1); assert.deepEqual(phases, ['wallet-submit-started']);
    assert.deepEqual(observed, [{ category: 'node-submission-error', rpcCode: 1010, customCode: 168 }]);
    Object.assign(wallet, { async submitTx() { submitted++; return 'synthetic-returned-id'; } });
    assert.equal(await providers.midnightProvider.submitTx({} as never), 'synthetic-returned-id');
    assert.equal(submitted, 2); assert.deepEqual(phases.slice(1), ['wallet-submit-started', 'wallet-submit-completed']);
  } finally { setNetworkId(previous); }
});
