import { ApiPromise, WsProvider } from '@polkadot/api';
import { Duration, Effect } from 'effect';
import { NodeClient, NodeClientError, PolkadotNodeClient, makeConfig } from '@midnight-ntwrk/wallet-sdk-node-client/effect';
import { SerializedTransaction, type Capabilities } from '@midnight-ntwrk/wallet-sdk';
import type { FinalizedTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { PreprodConnectionProfile, PREPROD_GENESIS_HASH } from './preprod-profile.ts';

export type PreprodNodeStage = 'node-connect-started' | 'node-connect-ready' | 'node-connect-failed';
interface Dependencies {
  readonly makeApi?: (url: string) => ApiPromise;
  readonly initializationTimeoutMs?: number;
  readonly initializationAttempts?: number;
  readonly confirmationTimeoutMs?: number;
}
const connectionError = () => new NodeClientError.ConnectionError({ message: 'Preprod node: connection is unavailable or not ready' });

/** A missing notification does not establish rejection; reconcile before another submission. */
export class PreprodConfirmationTimeout extends Error {
  readonly _tag = 'PreprodConfirmationTimeout';
  constructor() { super('Preprod node: confirmation deadline expired; transaction outcome must be independently reconciled'); }
}

/** disconnect() resolves before the socket closes; never trust its stale connected flag. */
export async function waitForPreprodNodeDisconnect(api: Pick<ApiPromise, 'isConnected'>, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (api.isConnected) {
    if (Date.now() >= deadline) throw connectionError();
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

/** Explicit, awaited SDK node readiness; signatures, proofs and finality still use the pinned SDK. */
export async function createReadyPreprodNodeSubmissionService(profile: PreprodConnectionProfile,
  observe?: (stage: PreprodNodeStage) => void, dependencies: Dependencies = {}): Promise<Capabilities.SubmissionService<FinalizedTransaction>> {
  const timeoutMs = dependencies.initializationTimeoutMs ?? 60_000;
  const initializationAttempts = dependencies.initializationAttempts ?? 3;
  const confirmationTimeoutMs = dependencies.confirmationTimeoutMs ?? 120_000;
  if (!(profile instanceof PreprodConnectionProfile) || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000 ||
    !Number.isSafeInteger(initializationAttempts) || initializationAttempts < 1 || initializationAttempts > 3 ||
    !Number.isSafeInteger(confirmationTimeoutMs) || confirmationTimeoutMs < 1 || confirmationTimeoutMs > 120_000) throw connectionError();
  const nodeURL = new URL(profile.environmentForSdk().nodeWS);
  let api: ApiPromise | undefined, timer: ReturnType<typeof setTimeout> | undefined;
  for (let attempt = 0; attempt < initializationAttempts; attempt++) {
  let wrongGenesis = false;
  observe?.('node-connect-started');
  try {
    api = dependencies.makeApi?.(nodeURL.toString()) ?? new ApiPromise({
      provider: new WsProvider(nodeURL.toString()), throwOnConnect: false, noInitWarn: true,
    });
    await Promise.race([api.isReadyOrError, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(connectionError()), timeoutMs);
    })]);
    if (!api.isConnected) throw connectionError();
    if (api.genesisHash.toHex() !== PREPROD_GENESIS_HASH) { wrongGenesis = true; throw connectionError(); }
    break;
  } catch {
    // Retry only read-only metadata initialization, never a submission. Close
    // and verify the previous socket before creating another one.
    let cleanupFailed = false;
    try { if (api) { await api.disconnect(); await waitForPreprodNodeDisconnect(api); } }
    catch { cleanupFailed = true; }
    api = undefined;
    if (wrongGenesis || cleanupFailed || attempt + 1 === initializationAttempts) {
      observe?.('node-connect-failed'); throw connectionError();
    }
  } finally { if (timer) clearTimeout(timer); }
  }
  if (!api) throw connectionError();
  const readyApi = api;
  const client = new PolkadotNodeClient(makeConfig({ nodeURL, reconnectionTimeout: Duration.seconds(30) }), readyApi);
  let closed = false, disconnectBarrier: Promise<void> = Promise.resolve();
  observe?.('node-connect-ready');
  const submitTransaction = (async (transaction: FinalizedTransaction, stage: 'Submitted' | 'InBlock' | 'Finalized' = 'InBlock') => {
    if (closed || !['Submitted', 'InBlock', 'Finalized'].includes(stage)) throw connectionError();
    await disconnectBarrier;
    if (closed) throw connectionError();
    // Exactly one SDK submission. Preserve its original error for bounded classification.
    const result = await Effect.runPromise(NodeClient.sendMidnightTransactionAndWait(
      SerializedTransaction.from(transaction), stage as 'Submitted' | 'InBlock' | 'Finalized',
    ).pipe(Effect.timeoutFail({ duration: Duration.millis(confirmationTimeoutMs), onTimeout: () => {
      closed = true; // Ambiguous submission must never be repeated by this service.
      return new PreprodConfirmationTimeout();
    } }), Effect.provideService(NodeClient.NodeClient, client)));
    disconnectBarrier = waitForPreprodNodeDisconnect(readyApi);
    void disconnectBarrier.catch(() => undefined);
    return result;
  }) as Capabilities.SubmitTransactionMethod<FinalizedTransaction>;
  return {
    submitTransaction,
    async close() {
      closed = true;
      await readyApi.disconnect();
      await waitForPreprodNodeDisconnect(readyApi);
    },
  };
}
