import { createHash } from 'node:crypto';
import { inspect } from 'node:util';
import type { EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';

export const PREPROD_PROVIDER_ID = 'blockfrost-midnight-preprod-v1' as const;
export const PREPROD_GENESIS_HASH = '0xdf831b09a8baa92badf47762ce5ac439b7e47e3ed3d39600cfdd44fad552361b';
const endpoints = Object.freeze({
  node: 'https://rpc.midnight-preprod.blockfrost.io/',
  nodeWS: 'wss://rpc.midnight-preprod.blockfrost.io/',
  indexer: 'https://midnight-preprod.blockfrost.io/api/v0',
  indexerWS: 'wss://midnight-preprod.blockfrost.io/api/v0/ws',
});
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const fail = (): never => { throw new Error('Preprod adapter: invalid configuration or checkpoint binding'); };

/** A token-bearing SDK environment is created only at the explicit adapter boundary. */
export class PreprodConnectionProfile {
  readonly #environment: EnvironmentConfiguration;
  readonly providerFingerprint: string = hash(JSON.stringify(endpoints));
  constructor(projectId: string, proofServer = 'http://127.0.0.1:6300') {
    if (typeof projectId !== 'string' || !/^nightpreprod[A-Za-z0-9_-]{1,128}$/.test(projectId)) fail();
    if (typeof proofServer !== 'string') fail();
    const proof = (() => { try { return new URL(proofServer); } catch { return fail(); } })();
    if (proof.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(proof.hostname) ||
      !['6300', '6301'].includes(proof.port) || proof.pathname !== '/' ||
      proof.username || proof.password || proof.search || proof.hash) fail();
    const authenticated = (url: string) => { const value = new URL(url); value.searchParams.set('project_id', projectId); return value.href; };
    this.#environment = Object.freeze({ networkId: 'preprod', walletNetworkId: 'preprod',
      node: authenticated(endpoints.node), nodeWS: authenticated(endpoints.nodeWS),
      indexer: authenticated(endpoints.indexer), indexerWS: authenticated(endpoints.indexerWS),
      proofServer: proof.href.replace(/\/$/, ''), faucet: '' });
    Object.freeze(this);
  }
  /** Private input to the SDK only. Never log or serialize its returned URLs. */
  environmentForSdk(): EnvironmentConfiguration { return { ...this.#environment }; }
  toJSON() { return { networkId: 'preprod', providerId: PREPROD_PROVIDER_ID, credentialConfigured: true,
    proofDestination: 'caller-controlled-loopback', endpoints }; }
  [inspect.custom]() { return this.toJSON(); }
}

export interface PreprodWalletIdentity {
  readonly shielded: string;
  readonly unshielded: string;
  readonly dust: string;
}
export interface RestoredComponentIdentity { readonly networkId: string; readonly address: string }
const components = ['shielded', 'unshielded', 'dust'] as const;

/** Compare values read from the restored SDK states to independently derived keys. No trust is granted. */
export function assertPreprodRestoredIdentity(expected: PreprodWalletIdentity,
  observed: Readonly<Record<typeof components[number], RestoredComponentIdentity>>): void {
  for (const component of components) {
    if (typeof expected[component] !== 'string' || expected[component].length === 0 ||
      observed[component]?.networkId !== 'preprod' || observed[component]?.address !== expected[component]) fail();
  }
}

/** Private local checkpoint sidecar, never a public actor ID or governance attestation. */
export interface PreprodCheckpointBinding {
  readonly schemaVersion: 1;
  readonly networkId: 'preprod';
  readonly providerId: typeof PREPROD_PROVIDER_ID;
  readonly providerFingerprint: string;
  readonly walletFingerprint: string;
  readonly genesisHash: string;
  readonly componentHashes: Readonly<Record<typeof components[number], string>>;
}

export function createPreprodCheckpointBinding(profile: PreprodConnectionProfile, identity: PreprodWalletIdentity,
  genesisHash: string, snapshots: Readonly<Record<typeof components[number], string>>): PreprodCheckpointBinding {
  if (!(profile instanceof PreprodConnectionProfile) || !/^0x[0-9a-f]{64}$/.test(genesisHash) ||
    components.some(key => typeof identity[key] !== 'string' || !identity[key] || typeof snapshots[key] !== 'string' || !snapshots[key])) fail();
  return Object.freeze({ schemaVersion: 1, networkId: 'preprod', providerId: PREPROD_PROVIDER_ID,
    providerFingerprint: profile.providerFingerprint,
    walletFingerprint: hash(JSON.stringify(components.map(key => identity[key]))), genesisHash,
    componentHashes: Object.freeze({ shielded: hash(snapshots.shielded), unshielded: hash(snapshots.unshielded), dust: hash(snapshots.dust) }) });
}

export function assertPreprodCheckpointBinding(actual: unknown, expected: PreprodCheckpointBinding): void {
  const data = (value: unknown, keys: string[]): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
    try {
      const descriptors = Object.getOwnPropertyDescriptors(value);
      if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string') ||
        Object.keys(descriptors).sort().join() !== keys.sort().join() ||
        Object.values(descriptors).some(descriptor => !('value' in descriptor))) fail();
      return Object.fromEntries(Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]));
    } catch { return fail(); }
  };
  const record = data(actual, Object.keys(expected));
  for (const key of ['schemaVersion', 'networkId', 'providerId', 'providerFingerprint', 'walletFingerprint', 'genesisHash'] as const) {
    if (record[key] !== expected[key]) fail();
  }
  const hashes = data(record.componentHashes, [...components]);
  for (const key of components) if (hashes[key] !== expected.componentHashes[key]) fail();
}
