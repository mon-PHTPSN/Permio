import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { inMemoryPrivateStateProvider, type MidnightWalletProvider } from '@midnight-ntwrk/testkit-js';
import type { PrivateStateId } from '@midnight-ntwrk/midnight-js-types';
import { PreprodConnectionProfile } from './preprod-profile.ts';
import { PreprodSubmissionError, type PreprodSubmissionFailure } from './preprod-submission-failure.ts';
import { PERMIO_AUTHORIZATION_ASSETS_PATH, type PermioAuthorizationProviders } from './midnight-contract.ts';

/** Only the transport operations needed by Midnight.js, not a wallet's secret-key fields. */
export type PreprodWalletTransport = Pick<MidnightWalletProvider,
  'env' | 'getCoinPublicKey' | 'getEncryptionPublicKey' | 'balanceTx' | 'submitTx'>;

export type PreprodBalanceFailure = 'insufficient-funds' | 'ledger-block-limit' | 'ledger-dismiss-limit' | 'no-balancing-transaction' | 'empty-dust-actions' |
  'local-prover-failure' | 'request-timeout' | 'wasm-runtime-failure' | 'binding-failure' | 'unknown';
export type PreprodWalletPhase = 'wallet-submit-started' | 'wallet-submit-completed' | 'wallet-balance-started' | 'wallet-balance-completed' |
  `wallet-balance-failed-${PreprodBalanceFailure}`;

/** Inspect only bounded own data properties; return a fixed label, never private SDK text. */
export function classifyPreprodBalanceFailure(error: unknown): PreprodBalanceFailure {
  const queue: { value: unknown; depth: number }[] = [{ value: error, depth: 0 }];
  const seen = new Set<unknown>();
  let fallback: PreprodBalanceFailure = 'unknown';
  for (let index = 0; index < queue.length && index < 24; index++) {
    const { value: error, depth } = queue[index]!;
    if (error === null || typeof error !== 'object' || seen.has(error)) continue;
    seen.add(error);
    try {
      const value = (key: PropertyKey): unknown => Object.getOwnPropertyDescriptor(error, key)?.value;
      const message = typeof value('message') === 'string' ? (value('message') as string).slice(0, 8192) : '';
      const tag = value('_tag');
      if (tag === 'Wallet.InsufficientFunds' || /\b(?:Insufficient funds|InsufficientFunds|insufficient funds)\b/u.test(message)) return 'insufficient-funds';
      if (/Transaction would exhaust the block limits|exceeded block limit in transaction fee computation/u.test(message)) return 'ledger-block-limit';
      if (/exceeded the maximum time to dismiss for transaction size/u.test(message)) return 'ledger-dismiss-limit';
      if (/No balancing transaction was created/u.test(message)) return 'no-balancing-transaction';
      if (/Preprod wallet: empty DUST actions/u.test(message)) return 'empty-dust-actions';
      if (/\bunreachable\b|out of bounds memory|memory access out of bounds/iu.test(message)) return 'wasm-runtime-failure';
      if (/binding.*(?:invalid|failed|failure)|(?:invalid|inconsistent).*binding/iu.test(message)) return 'binding-failure';
      if (tag === 'Wallet.Proving' || /Failed to prove transaction|Failed Proof Server response/u.test(message)) fallback = 'local-prover-failure';
      if (['TimeoutError', 'AbortError'].includes(value('name') as string) || /\b(?:TimeoutError|AbortError)\b/u.test(message)) return 'request-timeout';
      if (depth >= 7) continue;
      const add = (next: unknown) => { if (queue.length < 24) queue.push({ value: next, depth: depth + 1 }); };
      add(value('cause')); add(value(Symbol.for('effect/Runtime/FiberFailure/Cause')));
      if (tag === 'Fail') add(value('error'));
      if (tag === 'Die') add(value('defect'));
      if (tag === 'Sequential' || tag === 'Parallel') { add(value('left')); add(value('right')); }
    } catch { /* Do not execute accessors, proxies or error serializers. */ }
  }
  return fallback;
}

/** Wiring only. The caller must separately verify assets, restore/sync the wallet and check DUST readiness. */
export function createPreprodAuthorizationProviders(wallet: PreprodWalletTransport,
  profile: PreprodConnectionProfile, observe?: (phase: PreprodWalletPhase) => void,
  observeSubmissionFailure?: (failure: PreprodSubmissionFailure) => void): PermioAuthorizationProviders {
  const assertEnvironment = () => {
    try {
      if (!(profile instanceof PreprodConnectionProfile) || getNetworkId() !== 'preprod') throw Error('network');
      const environment = profile.environmentForSdk();
      // Never silently reuse a Local Dev wallet or change the process-wide signing network.
      for (const key of ['networkId', 'walletNetworkId', 'node', 'nodeWS', 'indexer', 'indexerWS', 'proofServer', 'faucet'] as const) {
        if (wallet?.env?.[key] !== environment[key]) throw Error('wallet-profile');
      }
      return environment;
    } catch { throw new Error('Preprod providers: signing network or wallet profile mismatch, or provider initialization failed'); }
  };
  try {
    const environment = assertEnvironment();
    const guardedWallet = Object.freeze({
      getCoinPublicKey() {
        assertEnvironment();
        try { return wallet.getCoinPublicKey(); } catch { throw new Error('Preprod wallet: public-key access failed; details withheld'); }
      },
      getEncryptionPublicKey() {
        assertEnvironment();
        try { return wallet.getEncryptionPublicKey(); } catch { throw new Error('Preprod wallet: public-key access failed; details withheld'); }
      },
      async balanceTx(...args: Parameters<MidnightWalletProvider['balanceTx']>) {
        assertEnvironment();
        observe?.('wallet-balance-started');
        let result;
        try {
          result = await wallet.balanceTx(...args);
          // Inspect only section cardinality. Never log coins, keys or amounts.
          // An absent DUST section is different from a present, empty section.
          for (const intent of result.intents?.values() ?? []) {
            const dust = intent.dustActions;
            if (dust && dust.spends.length === 0 && dust.registrations.length === 0) {
              throw new Error('Preprod wallet: empty DUST actions');
            }
          }
        }
        catch (error) {
          observe?.(`wallet-balance-failed-${classifyPreprodBalanceFailure(error)}`);
          throw new Error('Preprod wallet: balancing failed; details withheld');
        }
        assertEnvironment(); observe?.('wallet-balance-completed'); return result;
      },
      async submitTx(...args: Parameters<MidnightWalletProvider['submitTx']>) {
        assertEnvironment();
        observe?.('wallet-submit-started');
        let result;
        try { result = await wallet.submitTx(...args); }
        catch (error) {
          const failure = new PreprodSubmissionError(error);
          observeSubmissionFailure?.(failure.diagnostic);
          throw failure;
        }
        observe?.('wallet-submit-completed');
        return result;
      },
    });
    const zkConfigProvider = new NodeZkConfigProvider(PERMIO_AUTHORIZATION_ASSETS_PATH);
    return {
      privateStateProvider: inMemoryPrivateStateProvider<PrivateStateId, undefined>(),
      publicDataProvider: indexerPublicDataProvider(environment.indexer, environment.indexerWS),
      zkConfigProvider,
      proofProvider: httpClientProofProvider(environment.proofServer, zkConfigProvider, { timeout: 600_000 }),
      walletProvider: guardedWallet,
      midnightProvider: guardedWallet,
    } as PermioAuthorizationProviders;
  } catch { throw new Error('Preprod providers: signing network or wallet profile mismatch, or provider initialization failed'); }
}
