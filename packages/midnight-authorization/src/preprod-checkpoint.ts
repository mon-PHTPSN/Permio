import { createHash } from 'node:crypto';
import { inspect } from 'node:util';
import { firstValueFrom, filter, timeout, ReplaySubject, takeUntil } from 'rxjs';
import { WalletSeeds, MidnightWalletProvider } from '@midnight-ntwrk/testkit-js';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import pino from 'pino';
import { DustSecretKey, ZswapSecretKeys, LedgerParameters } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { HDWallet, Roles, createKeystore, ShieldedWallet, UnshieldedWallet, DustWallet,
  InMemoryTransactionHistoryStorage, WalletEntrySchema, mergeWalletEntries, WalletFacade } from '@midnight-ntwrk/wallet-sdk';
import { PreprodConnectionProfile, assertPreprodRestoredIdentity, type PreprodWalletIdentity } from './preprod-profile.ts';
import type { PreprodWalletTransport } from './preprod-runtime.ts';
import { createReadyPreprodNodeSubmissionService } from './preprod-node-submission.ts';

export interface PreprodCheckpointSecret {
  readonly kind: 'mnemonic' | 'seed';
  readonly value: string;
  readonly accountIndex: number;
}
export type PreprodCheckpointSnapshots = Readonly<Record<'shielded' | 'unshielded' | 'dust', string>>;
/** Public stage names only: observers never receive keys, snapshots, addresses or errors. */
export type PreprodCheckpointStage = 'derive-identity' | 'restore-shielded' | 'restore-unshielded' | 'restore-dust' |
  'check-snapshot-headers' | 'read-component-state' | 'validate-identities' | 'dispose-components' | 'disposed' |
  'node-connect-started' | 'node-connect-ready' | 'node-connect-failed';
const fail = (): never => { throw new Error('Preprod checkpoint: invalid or mismatched saved wallet'); };
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

/** Exact pinned SDK configuration, with a caller-controlled prover and no fresh-wallet fallback. */
export function preprodCheckpointSdkConfiguration(profile: PreprodConnectionProfile) {
  const env = profile.environmentForSdk();
  return { networkId: 'preprod', indexerClientConnection: { indexerHttpUrl: env.indexer, indexerWsUrl: env.indexerWS },
    provingServerUrl: new URL(env.proofServer), relayURL: new URL(env.nodeWS),
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
    // A zero fee makes the pinned dust wallet emit empty DustActions, rejected
    // by the ledger as NotNormalized (117). Keep the overhead local to this
    // explicit test profile rather than mutating the SDK's global defaults.
    costParameters: { ledgerParams: LedgerParameters.initialParameters(), additionalFeeOverhead: 1_000_000n, feeBlocksMargin: 5 } };
}

function derive(secret: PreprodCheckpointSecret) {
  if (!secret || !['mnemonic', 'seed'].includes(secret.kind) || typeof secret.value !== 'string' || !secret.value.trim() ||
    !Number.isSafeInteger(secret.accountIndex) || secret.accountIndex < 0 || secret.accountIndex > 0x7fffffff) fail();
  const root = secret.kind === 'mnemonic' ? WalletSeeds.fromMnemonic(secret.value) : WalletSeeds.fromMasterSeed(secret.value);
  const result = HDWallet.fromSeed(Buffer.from(root.masterSeed, 'hex'));
  if (result.type !== 'seedOk') return fail();
  try {
    const keys = result.hdWallet.selectAccount(secret.accountIndex).selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust] as const).deriveKeysAt(0);
    if (keys.type !== 'keysDerived') return fail();
    return { shielded: keys.keys[Roles.Zswap], unshielded: keys.keys[Roles.NightExternal], dust: keys.keys[Roles.Dust] };
  } finally { result.hdWallet.clear(); }
}

/** Read current serialized progress without assuming that old completion means present network readiness. */
function progress(value: unknown): { appliedIndex: string; highestKnownIndex: string } {
  const entry = value as Record<string, unknown>;
  const number = (input: unknown) => {
    if ((typeof input !== 'number' || !Number.isSafeInteger(input)) && typeof input !== 'bigint') return fail();
    if (BigInt(input as bigint) < 0n) return fail();
    return String(input);
  };
  return { appliedIndex: number(entry.appliedIndex ?? entry.appliedId),
    highestKnownIndex: number(entry.highestRelevantIndex ?? entry.highestTransactionId ?? entry.highestIndex) };
}

interface PrivateRestoredComponents {
  shielded: ReturnType<ReturnType<typeof ShieldedWallet>['restore']>;
  unshielded: ReturnType<ReturnType<typeof UnshieldedWallet>['restore']>;
  dust: ReturnType<ReturnType<typeof DustWallet>['restore']>;
  configuration: ReturnType<typeof preprodCheckpointSdkConfiguration>;
  shieldedKeys: ZswapSecretKeys;
  dustKey: DustSecretKey;
  keystore: ReturnType<typeof createKeystore>;
  replaceCleanup(wallet: { stop(): Promise<void> }): void;
}

/** Internal ownership scope: no private component or signing key escapes this module. */
async function withRestoredComponents<T>(profile: PreprodConnectionProfile, secret: PreprodCheckpointSecret,
  snapshots: PreprodCheckpointSnapshots, consume: (components: PrivateRestoredComponents,
    report: PreprodOfflineInspectionReport) => Promise<T>, observe?: (stage: PreprodCheckpointStage) => void): Promise<T> {
  const owned: { stop(): Promise<void> }[] = [];
  let seeds: ReturnType<typeof derive> | undefined;
  let consuming = false;
  try {
    for (const key of ['shielded', 'unshielded', 'dust'] as const) {
      if (typeof snapshots?.[key] !== 'string' || !snapshots[key] || Buffer.byteLength(snapshots[key]) > 32 * 1024 ** 2) fail();
    }
    observe?.('derive-identity');
    seeds = derive(secret);
    const shieldedKeys = ZswapSecretKeys.fromSeed(seeds.shielded);
    const dustKey = DustSecretKey.fromSeed(seeds.dust);
    const keystore = createKeystore(seeds.unshielded, 'preprod');
    const expected: PreprodWalletIdentity = { shielded: `${shieldedKeys.coinPublicKey}:${shieldedKeys.encryptionPublicKey}`,
      unshielded: keystore.getAddress(), dust: dustKey.publicKey.toString() };
    // Cheap early rejection only. This does not replace the pinned SDK's full restoration below.
    observe?.('check-snapshot-headers');
    const headers = { shielded: JSON.parse(snapshots.shielded), unshielded: JSON.parse(snapshots.unshielded), dust: JSON.parse(snapshots.dust) };
    assertPreprodRestoredIdentity(expected, {
      shielded: { networkId: headers.shielded?.networkId,
        address: `${headers.shielded?.publicKeys?.coinPublicKey}:${headers.shielded?.publicKeys?.encryptionPublicKey}` },
      unshielded: { networkId: headers.unshielded?.networkId, address: headers.unshielded?.publicKey?.addressHex },
      dust: { networkId: headers.dust?.networkId, address: headers.dust?.publicKey?.publicKey },
    });
    const configuration = preprodCheckpointSdkConfiguration(profile);
    observe?.('restore-shielded');
    const shielded = ShieldedWallet(configuration).restore(snapshots.shielded); owned.push(shielded);
    observe?.('restore-unshielded');
    const unshielded = UnshieldedWallet(configuration).restore(snapshots.unshielded); owned.push(unshielded);
    observe?.('restore-dust');
    const dust = DustWallet(configuration).restore(snapshots.dust); owned.push(dust);
    observe?.('read-component-state');
    const [s, u, d] = await Promise.all([
      firstValueFrom(shielded.state.pipe(timeout(10_000))), firstValueFrom(unshielded.state.pipe(timeout(10_000))),
      firstValueFrom(dust.state.pipe(timeout(10_000))),
    ]);
    observe?.('validate-identities');
    assertPreprodRestoredIdentity(expected, {
      shielded: { networkId: s.state.networkId, address: `${s.state.publicKeys.coinPublicKey}:${s.state.publicKeys.encryptionPublicKey}` },
      unshielded: { networkId: u.state.networkId, address: u.state.publicKey.addressHex },
      dust: { networkId: d.state.networkId, address: d.state.publicKey.publicKey.toString() },
    });
    const report = { kind: 'm6-offline-preprod-checkpoint-inspection', networkId: 'preprod',
      componentCount: 3, allDerivedComponentIdentitiesMatch: true,
      storedProgress: { shielded: progress(s.progress), unshielded: progress(u.progress), dust: progress(d.progress) },
      // Private local binding material is deliberately omitted from this public report.
      originalSnapshotProviderHistoryVerified: false, legacyProviderBindingMissing: true,
      currentNetworkSynchronizationVerified: false, synchronizationStarted: false, networkRequestsIssued: false,
      checkpointFilesWritten: false, walletSecretsReturnedOrLogged: false,
      transactionSubmitted: false, milestoneComplete: false } as const;
    consuming = true;
    return await consume({ shielded, unshielded, dust, configuration, shieldedKeys, dustKey, keystore,
      replaceCleanup(wallet) { owned.splice(0, owned.length, wallet); } }, report);
  } catch { throw new Error(consuming ? 'Preprod checkpoint: scoped workflow failed; details withheld' :
    'Preprod checkpoint: invalid or mismatched saved wallet'); }
  finally {
    if (seeds) for (const seed of Object.values(seeds)) seed.fill(0);
    // Observation must not prevent disposal if a caller's reporter fails.
    try { observe?.('dispose-components'); } catch { /* cleanup still runs */ }
    const results = await Promise.allSettled(owned.map(wallet => wallet.stop()));
    if (results.some(result => result.status === 'rejected')) throw new Error('Preprod checkpoint: offline resource cleanup failed');
    try { observe?.('disposed'); } catch { /* cleanup already completed */ }
  }
}

export interface PreprodOfflineInspectionReport {
  readonly kind: 'm6-offline-preprod-checkpoint-inspection'; readonly networkId: 'preprod';
  readonly componentCount: 3; readonly allDerivedComponentIdentitiesMatch: true;
  readonly storedProgress: Readonly<Record<keyof PreprodCheckpointSnapshots, { appliedIndex: string; highestKnownIndex: string }>>;
  readonly originalSnapshotProviderHistoryVerified: false; readonly legacyProviderBindingMissing: true;
  readonly currentNetworkSynchronizationVerified: false; readonly synchronizationStarted: false; readonly networkRequestsIssued: false;
  readonly checkpointFilesWritten: false; readonly walletSecretsReturnedOrLogged: false;
  readonly transactionSubmitted: false; readonly milestoneComplete: false;
}

/** No .start(), WalletFacade, submission or writes: deserialize only, validate identity, then dispose. */
export function inspectPreprodWalletCheckpoint(profile: PreprodConnectionProfile, secret: PreprodCheckpointSecret,
  snapshots: PreprodCheckpointSnapshots, observe?: (stage: PreprodCheckpointStage) => void): Promise<PreprodOfflineInspectionReport> {
  return withRestoredComponents(profile, secret, snapshots, async (_components, report) => report, observe);
}

export interface PreprodScopedWallet extends PreprodWalletTransport {
  /** Explicit network opt-in. No faucet, DUST registration, proving or transaction submission. */
  synchronize(timeoutMs?: number): Promise<ReturnType<PreprodScopedWallet['status']>>;
  status(): { networkId: 'preprod'; phase: string; synchronized: boolean; spendableDustAvailable: boolean; readyForTransactions: boolean; milestoneComplete: false };
}

/** Reuse one exact restoration throughout an awaited workflow, then always close its wallet resources. */
// A shorter notification wait may be selected by controlled tests. The normal
// 120s default and all SDK submission/identity checks remain in the node service;
// an expired wait still means unknown delivery and never authorizes a retry.
export function withRestoredPreprodWallet<T>(profile: PreprodConnectionProfile, secret: PreprodCheckpointSecret,
  snapshots: PreprodCheckpointSnapshots, use: (wallet: PreprodScopedWallet) => Promise<T>,
  observe?: (stage: PreprodCheckpointStage) => void,
  capturePrivateCheckpoint?: (snapshots: PreprodCheckpointSnapshots) => Promise<void>,
  submissionOptions?: {readonly confirmationTimeoutMs?:number}): Promise<T> {
  return withRestoredComponents(profile, secret, snapshots, async components => {
    let phase = 'restored', synchronized = false, spendableDustAvailable = false;
    let provider: MidnightWalletProvider | undefined;
    let facade: WalletFacade | undefined;
    let pendingSynchronization: Promise<ReturnType<PreprodScopedWallet['status']>> | undefined;
    const pendingBalances = new Set<Promise<unknown>>();
    const closed = new ReplaySubject<void>(1);
    const status: PreprodScopedWallet['status'] = () => ({ networkId: 'preprod', phase, synchronized,
      spendableDustAvailable, readyForTransactions: phase === 'ready' && synchronized && spendableDustAvailable, milestoneComplete: false });
    const network = () => {
      if (getNetworkId() !== 'preprod') throw Error('Preprod wallet: signing network mismatch');
    };
    const ready = () => {
      network();
      if (phase !== 'ready' || !provider) throw Error('Preprod wallet: not synchronized, unfunded or closed');
      return provider;
    };
    const wallet: PreprodScopedWallet = Object.freeze({
      get env() { return profile.environmentForSdk(); }, status,
      synchronize(timeoutMs = 300_000) {
        try {
          network();
          if (phase !== 'restored' || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 600_000) throw Error('Preprod wallet: invalid synchronization request');
        } catch (error) { return Promise.reject(error); }
        phase = 'synchronizing';
        pendingSynchronization = (async () => { try {
          facade = await WalletFacade.init({ configuration: components.configuration,
            submissionService: () => createReadyPreprodNodeSubmissionService(profile, observe,submissionOptions),
            shielded: () => components.shielded, unshielded: () => components.unshielded, dust: () => components.dust });
          if (phase === 'closed') { await facade.stop(); throw Error('closed'); }
          components.replaceCleanup(facade);
          provider = await MidnightWalletProvider.withWallet(pino({ level: 'silent' }), profile.environmentForSdk(),
            facade, components.shieldedKeys, components.dustKey, components.keystore);
          if (phase === 'closed') throw Error('closed');
          network(); await provider.start(false);
          const state = await firstValueFrom(facade.state().pipe(filter(value => value.isSynced), takeUntil(closed), timeout(timeoutMs)));
          if (phase === 'closed') throw Error('closed');
          network(); synchronized = true;
          spendableDustAvailable = state.dust.availableCoins.length > 0 && state.dust.balance(new Date()) > 0n;
          phase = spendableDustAvailable ? 'ready' : 'synchronized-without-spendable-dust';
          return status();
        } catch {
          if (phase !== 'closed') phase = 'synchronization-failed';
          throw Error('Preprod wallet: synchronization failed; details withheld');
        } })();
        // Attach a handler even if the callback accidentally fails to await its own request.
        void pendingSynchronization.catch(() => undefined);
        return pendingSynchronization;
      },
      getCoinPublicKey() { return ready().getCoinPublicKey(); },
      getEncryptionPublicKey() { return ready().getEncryptionPublicKey(); },
      balanceTx(...args: Parameters<MidnightWalletProvider['balanceTx']>) {
        // Keep closed/uninitialized calls synchronous, then check the current
        // SDK state rather than reusing readiness from the initial restoration.
        const active = ready();
        const activeFacade = facade!;
        synchronized = false; spendableDustAvailable = false;
        const operation = (async () => {
          try {
            const state = await firstValueFrom(activeFacade.state().pipe(
              filter(value => value.isSynced), takeUntil(closed), timeout(60_000)));
            ready();
            synchronized = true;
            spendableDustAvailable = state.dust.availableCoins.length > 0 && state.dust.balance(new Date()) > 0n;
            if (!spendableDustAvailable) throw Error('no-spendable-dust');
          } catch {
            throw Error('Preprod wallet: transaction readiness failed; details withheld');
          }
          // Preserve SDK balancing errors for the caller's sanitized classifier.
          return active.balanceTx(...args);
        })();
        pendingBalances.add(operation);
        void operation.then(() => pendingBalances.delete(operation), () => pendingBalances.delete(operation));
        return operation;
      },
      submitTx(...args: Parameters<MidnightWalletProvider['submitTx']>) { return ready().submitTx(...args); },
      toJSON: status, [inspect.custom]: status,
    });
    try {
      const result = await use(wallet);
      if (capturePrivateCheckpoint) {
        ready();
        if (pendingBalances.size !== 0 || !status().readyForTransactions) {
          throw Error('Preprod wallet: cannot checkpoint an unfinished transaction');
        }
        const [shielded, unshielded, dust] = await Promise.all([
          components.shielded.serializeState(), components.unshielded.serializeState(), components.dust.serializeState(),
        ]);
        await capturePrivateCheckpoint({ shielded, unshielded, dust });
      }
      return result;
    }
    finally {
      phase = 'closed'; closed.next(); closed.complete();
      // Initialization may still be in flight. Join it before disposing its components.
      await pendingSynchronization?.catch(() => undefined);
      await Promise.allSettled([...pendingBalances]);
    }
  }, observe);
}

/** Private caller utility for detecting changes to source checkpoints; hashes must not become actor identifiers. */
export function privateCheckpointContentHashes(snapshots: PreprodCheckpointSnapshots) {
  return { shielded: hash(snapshots.shielded), unshielded: hash(snapshots.unshielded), dust: hash(snapshots.dust) };
}
