import { WebSocket } from "ws";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import {
  DustSecretKey,
  LedgerParameters,
  ZswapSecretKeys,
} from "@midnight-ntwrk/midnight-js-protocol/ledger";
import type { PrivateStateId } from "@midnight-ntwrk/midnight-js-types";
import {
  FluentWalletBuilder,
  inMemoryPrivateStateProvider,
  MidnightWalletProvider,
  type DustWalletOptions,
  type EnvironmentConfiguration,
} from "@midnight-ntwrk/testkit-js";
import pino from "pino";

import {
  PERMIO_AUTHORIZATION_ASSETS_PATH,
  type PermioAuthorizationContract,
  type PermioAuthorizationProviders,
} from "./midnight-contract.ts";

export const LOCAL_MIDNIGHT_ENVIRONMENT: EnvironmentConfiguration = Object.freeze({
  walletNetworkId: "undeployed",
  networkId: "undeployed",
  indexer: "http://127.0.0.1:8088/api/v4/graphql",
  indexerWS: "ws://127.0.0.1:8088/api/v4/graphql/ws",
  node: "http://127.0.0.1:9944",
  nodeWS: "ws://127.0.0.1:9944",
  proofServer: "http://127.0.0.1:6300",
  faucet: "",
});

const LOCAL_DUST_OPTIONS: DustWalletOptions = {
  ledgerParams: LedgerParameters.initialParameters(),
  additionalFeeOverhead: 1_000n,
  feeBlocksMargin: 5,
};

/** Only a second loopback prover; never an arbitrary remote witness destination. */
export function localMidnightEnvironment(boundedProver = false): EnvironmentConfiguration {
  if (typeof boundedProver !== "boolean") throw new TypeError("bounded prover selector must be boolean");
  return { ...LOCAL_MIDNIGHT_ENVIRONMENT,
    proofServer: boundedProver ? "http://127.0.0.1:6301" : LOCAL_MIDNIGHT_ENVIRONMENT.proofServer };
}

/** A finite local transport wait, not a circuit lifetime or authority grant. */
export function localProofRequestConfig(boundedProver = false): Readonly<{ timeout: number }> {
  if (typeof boundedProver !== "boolean") throw new TypeError("bounded prover selector must be boolean");
  return Object.freeze({ timeout: boundedProver ? 600_000 : 300_000 });
}

function installWebSocket(): void {
  if (typeof globalThis.WebSocket !== "function") {
    Object.defineProperty(globalThis, "WebSocket", {
      configurable: true,
      enumerable: false,
      value: WebSocket,
      writable: true,
    });
  }
}

export async function createFundedLocalWallet(
  mnemonic: string,
  boundedProver = false,
): Promise<MidnightWalletProvider> {
  if (mnemonic.trim().length === 0) {
    throw new TypeError("local wallet mnemonic must not be empty");
  }
  installWebSocket();
  const environment = localMidnightEnvironment(boundedProver);
  setNetworkId(environment.networkId);
  const { wallet, seeds, keystore } = await FluentWalletBuilder
    .forEnvironment(environment)
    .withDustOptions(LOCAL_DUST_OPTIONS)
    .withMnemonic(mnemonic)
    .buildWithoutStarting();
  const provider = await MidnightWalletProvider.withWallet(
    pino({ level: "silent" }),
    environment,
    wallet,
    ZswapSecretKeys.fromSeed(seeds.shielded),
    DustSecretKey.fromSeed(seeds.dust),
    keystore,
  );
  await provider.start(false);
  const state = await wallet.waitForSyncedState();
  if (state.dust.availableCoins.length === 0) {
    await provider.stop();
    throw new Error("local wallet has no spendable DUST");
  }
  return provider;
}

export function createLocalAuthorizationProviders(
  wallet: MidnightWalletProvider,
  boundedProver = false,
): PermioAuthorizationProviders {
  const environment = localMidnightEnvironment(boundedProver);
  const zkConfigProvider = new NodeZkConfigProvider(
    PERMIO_AUTHORIZATION_ASSETS_PATH,
  );
  return {
    privateStateProvider: inMemoryPrivateStateProvider<PrivateStateId, undefined>(),
    publicDataProvider: indexerPublicDataProvider(
      environment.indexer,
      environment.indexerWS,
    ),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(
      environment.proofServer,
      zkConfigProvider,
      localProofRequestConfig(boundedProver),
    ),
    walletProvider: wallet,
    midnightProvider: wallet,
  } as PermioAuthorizationProviders;
}
