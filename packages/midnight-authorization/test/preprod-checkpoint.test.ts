import assert from 'node:assert/strict';
import { Socket } from 'node:net';
import { it } from 'node:test';
import { inspect } from 'node:util';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { TEST_MNEMONIC, WalletSeeds, MidnightWalletProvider } from '@midnight-ntwrk/testkit-js';
import { BehaviorSubject, of } from 'rxjs';
import { HDWallet, Roles, ShieldedWallet, UnshieldedWallet, DustWallet, PublicKey, createKeystore, WalletFacade } from '@midnight-ntwrk/wallet-sdk';
import { LedgerParameters } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { PreprodConnectionProfile } from '../src/preprod-profile.ts';
import { inspectPreprodWalletCheckpoint, preprodCheckpointSdkConfiguration, privateCheckpointContentHashes,
  withRestoredPreprodWallet, type PreprodScopedWallet, type PreprodCheckpointSnapshots } from '../src/preprod-checkpoint.ts';

const profile = new PreprodConnectionProfile('nightpreprod_synthetic_test_only');
const secret = { kind: 'mnemonic' as const, value: TEST_MNEMONIC, accountIndex: 0 };
async function syntheticSnapshots(index = 0, networkId = 'preprod'): Promise<PreprodCheckpointSnapshots> {
  const root = WalletSeeds.fromMnemonic(TEST_MNEMONIC);
  const hd = HDWallet.fromSeed(Buffer.from(root.masterSeed, 'hex'));
  assert.equal(hd.type, 'seedOk'); if (hd.type !== 'seedOk') throw Error('synthetic-derivation');
  const derived = hd.hdWallet.selectAccount(index).selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust] as const).deriveKeysAt(0);
  hd.hdWallet.clear();
  if (derived.type !== 'keysDerived') throw Error('synthetic-derivation');
  const config = { ...preprodCheckpointSdkConfiguration(profile), networkId };
  const shielded = ShieldedWallet(config).startWithSeed(derived.keys[Roles.Zswap]);
  const unshielded = UnshieldedWallet(config).startWithPublicKey(PublicKey.fromKeyStore(createKeystore(derived.keys[Roles.NightExternal], networkId)));
  const dust = DustWallet(config).startWithSeed(derived.keys[Roles.Dust], LedgerParameters.initialParameters().dust);
  try {
    const [s, u, d] = await Promise.all([shielded.serializeState(), unshielded.serializeState(), dust.serializeState()]);
    return { shielded: s, unshielded: u, dust: d };
  } finally {
    await Promise.all([shielded.stop(), unshielded.stop(), dust.stop()]);
    for (const seed of Object.values(derived.keys)) seed.fill(0);
  }
}

it('restores three actual pinned-SDK snapshots offline and does not fabricate synchronization or provider history', async () => {
  const before = Socket.prototype.connect;
  let requests = 0;
  Socket.prototype.connect = function () { requests++; throw Error('network-forbidden-in-offline-test'); } as typeof before;
  try {
    const snapshots = await syntheticSnapshots();
    const original = privateCheckpointContentHashes(snapshots);
    const stages: string[] = [];
    const report = await inspectPreprodWalletCheckpoint(profile, secret, snapshots, stage => stages.push(stage));
    assert.deepEqual(stages, ['derive-identity', 'check-snapshot-headers', 'restore-shielded', 'restore-unshielded', 'restore-dust',
      'read-component-state', 'validate-identities', 'dispose-components', 'disposed']);
    assert.equal(report.allDerivedComponentIdentitiesMatch, true);
    assert.equal(report.originalSnapshotProviderHistoryVerified, false);
    assert.equal(report.legacyProviderBindingMissing, true);
    assert.equal(report.currentNetworkSynchronizationVerified, false);
    assert.equal(report.synchronizationStarted, false);
    assert.equal(report.checkpointFilesWritten, false);
    assert.equal(report.transactionSubmitted, false);
    assert.equal(report.milestoneComplete, false);
    assert.equal(requests, 0);
    assert.deepEqual(privateCheckpointContentHashes(snapshots), original);
    assert(!JSON.stringify(report).includes(TEST_MNEMONIC));
    assert(!JSON.stringify(report).includes('nightpreprod_synthetic_test_only'));
  } finally { Socket.prototype.connect = before; }
});
it('a failing progress observer cannot skip disposal or reveal the underlying error', async () => {
  const snapshots = await syntheticSnapshots();
  const stages: string[] = [];
  await assert.rejects(inspectPreprodWalletCheckpoint(profile, secret, snapshots, stage => {
    stages.push(stage);
    if (stage === 'restore-unshielded' || stage === 'dispose-components') throw Error('private-observer-error');
  }), error => error instanceof Error && error.message === 'Preprod checkpoint: invalid or mismatched saved wallet');
  assert.deepEqual(stages, ['derive-identity', 'check-snapshot-headers', 'restore-shielded', 'restore-unshielded', 'dispose-components', 'disposed']);
});
it('rejects wrong-account, mixed-account and wrong-network snapshots before any synchronization', async () => {
  const original = await syntheticSnapshots(), other = await syntheticSnapshots(1), local = await syntheticSnapshots(0, 'undeployed');
  for (const value of [other, local, ...(['shielded', 'unshielded', 'dust'] as const).map(key => ({ ...original, [key]: other[key] }))]) {
    const stages: string[] = [];
    await assert.rejects(inspectPreprodWalletCheckpoint(profile, secret, value, stage => stages.push(stage)), /invalid or mismatched saved wallet/);
    assert(!stages.some(stage => stage.startsWith('restore-')), 'wrong identity must fail before expensive SDK restoration');
  }
});
it('missing or corrupt snapshots and invalid derivation inputs fail closed without a fresh-wallet fallback', async () => {
  const snapshots = await syntheticSnapshots();
  for (const value of [{ ...snapshots, shielded: '' }, { ...snapshots, dust: 'synthetic-private-garbage' }]) {
    await assert.rejects(inspectPreprodWalletCheckpoint(profile, secret, value), error => error instanceof Error &&
      error.message === 'Preprod checkpoint: invalid or mismatched saved wallet');
  }
  for (const accountIndex of [-1, 0.5, 0x80000000, Number.NaN]) {
    await assert.rejects(inspectPreprodWalletCheckpoint(profile, { ...secret, accountIndex }, snapshots));
  }
});
it('a restored scoped wallet is not a synchronized or funded wallet and closes after the awaited workflow', async () => {
  setNetworkId('preprod');
  const connect = Socket.prototype.connect; let requests = 0, captured: PreprodScopedWallet | undefined;
  Socket.prototype.connect = function () { requests++; throw Error('offline-network-forbidden'); } as typeof connect;
  try {
    const snapshots = await syntheticSnapshots();
    const result = await withRestoredPreprodWallet(profile, secret, snapshots, async wallet => {
      captured = wallet;
      assert.equal(wallet.status().phase, 'restored'); assert.equal(wallet.status().readyForTransactions, false);
      assert.throws(() => wallet.getCoinPublicKey(), /not synchronized, unfunded or closed/);
      assert.throws(() => wallet.submitTx({} as never), /not synchronized, unfunded or closed/);
      await assert.rejects(wallet.synchronize(0), /invalid synchronization request/);
      for (const output of [JSON.stringify(wallet), inspect(wallet)]) {
        assert(!output.includes(TEST_MNEMONIC)); assert(!output.includes('nightpreprod_synthetic_test_only'));
      }
      return 'public-only-result';
    });
    assert.equal(result, 'public-only-result'); assert.equal(captured!.status().phase, 'closed');
    assert.equal(captured!.status().readyForTransactions, false);
    assert.throws(() => captured!.getCoinPublicKey(), /not synchronized, unfunded or closed/);
    await assert.rejects(captured!.synchronize(), /invalid synchronization request/);
    assert.equal(requests, 0);
  } finally { Socket.prototype.connect = connect; setNetworkId('undeployed'); }
});
it('a failing scoped workflow is redacted and cannot leave its captured wallet usable', async () => {
  setNetworkId('preprod'); let captured: PreprodScopedWallet | undefined;
  try {
    await assert.rejects(withRestoredPreprodWallet(profile, secret, await syntheticSnapshots(), async wallet => {
      captured = wallet; throw Error('private-workflow-data');
    }), error => error instanceof Error && error.message === 'Preprod checkpoint: scoped workflow failed; details withheld');
    assert.equal(captured!.status().phase, 'closed');
    assert.throws(() => captured!.balanceTx({} as never), /not synchronized, unfunded or closed/);
  } finally { setNetworkId('undeployed'); }
});
it('never persists an unsynchronized private rolling checkpoint and closes the wallet on rejection', async () => {
  setNetworkId('preprod'); let captures = 0, captured: PreprodScopedWallet | undefined;
  try {
    await assert.rejects(withRestoredPreprodWallet(profile, secret, await syntheticSnapshots(), async wallet => {
      captured = wallet;
    }, undefined, async () => { captures++; }), /scoped workflow failed; details withheld/);
    assert.equal(captures, 0); assert.equal(captured!.status().phase, 'closed');
  } finally { setNetworkId('undeployed'); }
});
it('captures only a ready wallet checkpoint privately and still disposes it if persistence fails', async t => {
  setNetworkId('preprod'); let stops = 0, captured: PreprodScopedWallet | undefined;
  const connect = Socket.prototype.connect;
  Socket.prototype.connect = function () { throw Error('offline-network-forbidden'); } as typeof connect;
  t.mock.method(WalletFacade, 'init', async (...args: Parameters<typeof WalletFacade.init>) => {
    const init = args[0];
    const components = await Promise.all([init.shielded(init.configuration), init.unshielded(init.configuration), init.dust(init.configuration)]);
    return { state: () => of({ isSynced: true, dust: { availableCoins: [{}], balance: () => 1n } }),
      stop: async () => { stops++; await Promise.all(components.map(component => component.stop())); } } as never;
  });
  t.mock.method(MidnightWalletProvider.prototype, 'start', async () => {});
  try {
    const snapshots = await syntheticSnapshots();
    for (const failPersistence of [false, true]) {
      let captures = 0;
      const work = withRestoredPreprodWallet(profile, secret, snapshots, async wallet => {
        captured = wallet; assert((await wallet.synchronize(1000)).readyForTransactions);
        return 'public-result';
      }, undefined, async next => {
        captures++; assert(captured!.status().readyForTransactions);
        assert.deepEqual(Object.keys(next).sort(), ['dust', 'shielded', 'unshielded']);
        assert(Object.values(next).every(value => typeof value === 'string' && value.length > 0));
        assert(!JSON.stringify(next).includes(TEST_MNEMONIC));
        if (failPersistence) throw Error('private-storage-error');
      });
      if (failPersistence) await assert.rejects(work, /scoped workflow failed; details withheld/);
      else assert.equal(await work, 'public-result');
      assert.equal(captures, 1); assert.equal(captured!.status().phase, 'closed');
    }
    assert.equal(stops, 2);
  } finally { Socket.prototype.connect = connect; setNetworkId('undeployed'); }
});
it('joins an unawaited initialization before cleanup and never starts a wallet after its workflow has closed', async t => {
  setNetworkId('preprod'); let captured: PreprodScopedWallet | undefined, stops = 0;
  const snapshots = await syntheticSnapshots();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  t.mock.method(WalletFacade, 'init', async () => {
    await gate;
    return { stop: async () => { stops++; } } as never;
  });
  try {
    const workflow = withRestoredPreprodWallet(profile, secret, snapshots, async wallet => {
      captured = wallet;
      void wallet.synchronize();
      setImmediate(release);
    });
    await workflow;
    assert.equal(stops, 1); assert.equal(captured!.status().phase, 'closed');
    assert.equal(captured!.status().readyForTransactions, false);
  } finally { release(); setNetworkId('undeployed'); }
});
it('refuses checkpoint capture during an unawaited balance and joins it before disposal', async t => {
  setNetworkId('preprod'); let captures = 0, balanceFinished = false, stops = 0;
  const connect = Socket.prototype.connect;
  Socket.prototype.connect = function () { throw Error('offline-network-forbidden'); } as typeof connect;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  t.mock.method(WalletFacade, 'init', async (...args: Parameters<typeof WalletFacade.init>) => {
    const init = args[0];
    const components = await Promise.all([init.shielded(init.configuration), init.unshielded(init.configuration), init.dust(init.configuration)]);
    return { state: () => of({ isSynced: true, dust: { availableCoins: [{}], balance: () => 1n } }),
      stop: async () => { assert(balanceFinished); stops++; await Promise.all(components.map(component => component.stop())); } } as never;
  });
  t.mock.method(MidnightWalletProvider.prototype, 'start', async () => {});
  t.mock.method(MidnightWalletProvider.prototype, 'balanceTx', async () => { await gate; balanceFinished = true; return {} as never; });
  try {
    await assert.rejects(withRestoredPreprodWallet(profile, secret, await syntheticSnapshots(), async wallet => {
      assert((await wallet.synchronize(1000)).readyForTransactions);
      void wallet.balanceTx({} as never).catch(() => { balanceFinished = true; });
      setImmediate(release);
    }, undefined, async () => { captures++; }), /scoped workflow failed; details withheld/);
    assert.equal(captures, 0); assert(balanceFinished); assert.equal(stops, 1);
  } finally { release(); Socket.prototype.connect = connect; setNetworkId('undeployed'); }
});
it('requires positive available DUST rather than a coin count, and starts only with automatic funding disabled', { timeout: 10_000 }, async t => {
  setNetworkId('preprod'); let amount = 0n, starts = 0;
  const connect = Socket.prototype.connect; let requests = 0;
  Socket.prototype.connect = function () { requests++; throw Error('offline-network-forbidden'); } as typeof connect;
  t.mock.method(WalletFacade, 'init', async (...args: Parameters<typeof WalletFacade.init>) => {
    const init = args[0];
    const components = await Promise.all([init.shielded(init.configuration), init.unshielded(init.configuration), init.dust(init.configuration)]);
    return { state: () => of({ isSynced: true, dust: { availableCoins: [{}], balance: () => amount } }),
      stop: async () => { await Promise.all(components.map(component => component.stop())); } } as never;
  });
  t.mock.method(MidnightWalletProvider.prototype, 'start', async (waitForFunds?: boolean) => {
    assert.equal(waitForFunds, false); starts++;
  });
  try {
    const snapshots = await syntheticSnapshots();
    for (amount of [0n, 1n]) {
      await withRestoredPreprodWallet(profile, secret, snapshots, async wallet => {
        const status = await wallet.synchronize(1000);
        assert.equal(status.synchronized, true);
        assert.equal(status.spendableDustAvailable, amount > 0n);
        assert.equal(status.readyForTransactions, amount > 0n);
        if (amount === 0n) assert.throws(() => wallet.getCoinPublicKey(), /not synchronized, unfunded or closed/);
        else assert.equal(typeof wallet.getCoinPublicKey(), 'string');
      });
    }
    assert.equal(starts, 2); assert.equal(requests, 0);
  } finally { Socket.prototype.connect = connect; setNetworkId('undeployed'); }
});

for (const scenario of ['wait-for-current-sync', 'spent-dust', 'close-while-waiting'] as const) {
  it(`rechecks transaction readiness: ${scenario}`, { timeout: 10_000 }, async t => {
    setNetworkId('preprod');
    const state = new BehaviorSubject({ isSynced: true, dust: { availableCoins: [{}], balance: (): bigint => 1n } });
    let balances = 0, stops = 0;
    const connect = Socket.prototype.connect;
    Socket.prototype.connect = function () { throw Error('offline-network-forbidden'); } as typeof connect;
    t.mock.method(WalletFacade, 'init', async (...args: Parameters<typeof WalletFacade.init>) => {
      const init = args[0];
      const components = await Promise.all([init.shielded(init.configuration), init.unshielded(init.configuration), init.dust(init.configuration)]);
      return { state: () => state.asObservable(), stop: async () => {
        stops++; await Promise.all(components.map(component => component.stop()));
      } } as never;
    });
    t.mock.method(MidnightWalletProvider.prototype, 'start', async (waitForFunds?: boolean) => {
      assert.equal(waitForFunds, false);
    });
    const sdkError = Error('synthetic-sdk-balancing-error');
    t.mock.method(MidnightWalletProvider.prototype, 'balanceTx', async () => { balances++; throw sdkError; });
    let pending: Promise<unknown> | undefined;
    try {
      await withRestoredPreprodWallet(profile, secret, await syntheticSnapshots(), async wallet => {
        assert.equal((await wallet.synchronize(1000)).readyForTransactions, true);
        state.next({ isSynced: scenario === 'spent-dust', dust: { availableCoins: [{}], balance: () => scenario === 'spent-dust' ? 0n : 1n } });
        pending = wallet.balanceTx({} as never);
        // Attach a handler now, including the intentionally unawaited close case.
        void pending.catch(() => undefined);
        await new Promise<void>(resolve => setImmediate(resolve));
        assert.equal(balances, 0, 'stale startup readiness must never reach SDK balancing');
        assert.equal(wallet.status().readyForTransactions, false);
        if (scenario === 'spent-dust') {
          await assert.rejects(pending, /transaction readiness failed; details withheld/);
        } else if (scenario === 'wait-for-current-sync') {
          state.next({ isSynced: true, dust: { availableCoins: [{}], balance: () => 1n } });
          await assert.rejects(pending, error => error === sdkError, 'SDK errors must retain their identity inside the scope');
          assert.equal(wallet.status().readyForTransactions, true);
          assert.equal(balances, 1);
        }
      });
      if (scenario === 'close-while-waiting') {
        await assert.rejects(pending!, /transaction readiness failed; details withheld/);
        assert.equal(balances, 0);
      }
      assert.equal(stops, 1);
    } finally { state.complete(); Socket.prototype.connect = connect; setNetworkId('undeployed'); }
  });
}
