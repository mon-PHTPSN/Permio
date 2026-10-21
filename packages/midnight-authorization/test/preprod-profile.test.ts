import assert from 'node:assert/strict';
import { inspect } from 'node:util';
import { it } from 'node:test';
import { PreprodConnectionProfile, assertPreprodRestoredIdentity, createPreprodCheckpointBinding,
  assertPreprodCheckpointBinding } from '../src/preprod-profile.ts';

const token = 'nightpreprod_synthetic_unit_token';
const profile = new PreprodConnectionProfile(token);
const identity = { shielded: 'synthetic-shielded', unshielded: 'synthetic-unshielded', dust: 'synthetic-dust' };
const snapshots = { shielded: 'synthetic-shielded-state', unshielded: 'synthetic-unshielded-state', dust: 'synthetic-dust-state' };
const binding = createPreprodCheckpointBinding(profile, identity, `0x${'ab'.repeat(32)}`, snapshots);
it('fixes all RPC/indexer endpoints to Preprod while keeping the prover caller-controlled', () => {
  const environment = profile.environmentForSdk();
  assert.equal(environment.networkId, 'preprod'); assert.equal(environment.walletNetworkId, 'preprod');
  for (const key of ['node', 'nodeWS', 'indexer', 'indexerWS'] as const) {
    const url = new URL(environment[key]); assert.equal(url.searchParams.get('project_id'), token);
    assert(url.hostname.endsWith('midnight-preprod.blockfrost.io'));
  }
  assert.equal(environment.proofServer, 'http://127.0.0.1:6300');
  assert.equal(new PreprodConnectionProfile(token, 'http://127.0.0.1:6301').environmentForSdk().proofServer, 'http://127.0.0.1:6301');
});
it('does not expose credentials through JSON or ordinary object inspection or mutate another profile', () => {
  for (const output of [JSON.stringify(profile), inspect(profile)]) assert(!output.includes(token));
  const environment = profile.environmentForSdk(); Object.assign(environment, { networkId: 'undeployed' });
  assert.equal(profile.environmentForSdk().networkId, 'preprod');
});
it('rejects other network tokens and arbitrary prover destinations with fixed redacted errors', () => {
  for (const value of ['', 'nightmainnet_synthetic', `${token}&private`, ` ${token}`, undefined]) {
    assert.throws(() => new PreprodConnectionProfile(value as string), error => error instanceof Error && !error.message.includes('synthetic'));
  }
  for (const url of ['https://remote.invalid:6300', 'http://127.0.0.1:1', 'http://127.0.0.1:6300/private',
    'http://user:secret@localhost:6300', 'http://localhost:6300?project_id=secret', 'file:///private', 'malformed']) {
    assert.throws(() => new PreprodConnectionProfile(token, url), /invalid configuration or checkpoint binding/);
  }
});
it('requires every restored SDK component to match Preprod and the derived wallet identity', () => {
  const observed = Object.fromEntries(Object.entries(identity).map(([key, address]) => [key, { networkId: 'preprod', address }])) as
    Record<keyof typeof identity, { networkId: string; address: string }>;
  assertPreprodRestoredIdentity(identity, observed);
  for (const key of Object.keys(identity) as (keyof typeof identity)[]) {
    assert.throws(() => assertPreprodRestoredIdentity(identity, { ...observed, [key]: { ...observed[key], address: 'other' } }));
    assert.throws(() => assertPreprodRestoredIdentity(identity, { ...observed, [key]: { ...observed[key], networkId: 'undeployed' } }));
  }
});
it('binds schema, network, provider, chain genesis, account and every exact component hash', () => {
  assertPreprodCheckpointBinding(JSON.parse(JSON.stringify(binding)), binding);
  for (const [key, value] of Object.entries({ schemaVersion: 2, networkId: 'undeployed', providerId: 'other',
    providerFingerprint: 'cd'.repeat(32), walletFingerprint: 'ef'.repeat(32), genesisHash: `0x${'00'.repeat(32)}` })) {
    assert.throws(() => assertPreprodCheckpointBinding({ ...binding, [key]: value }, binding));
  }
  for (const key of Object.keys(snapshots) as (keyof typeof snapshots)[]) {
    const altered = createPreprodCheckpointBinding(profile, identity, binding.genesisHash, { ...snapshots, [key]: 'changed' });
    assert.throws(() => assertPreprodCheckpointBinding(binding, altered));
  }
  assertPreprodCheckpointBinding(binding, createPreprodCheckpointBinding(new PreprodConnectionProfile('nightpreprod_rotated_token'), identity, binding.genesisHash, snapshots));
});
it('rejects partial, extra, accessor and malformed checkpoint metadata without invoking getters', () => {
  let calls = 0;
  const accessor = { ...binding }; Object.defineProperty(accessor, 'walletFingerprint', { get() { calls++; throw Error('private'); }, enumerable: true });
  for (const value of [null, [], {}, { ...binding, extra: 'private' }, { ...binding, componentHashes: {} }, accessor]) {
    assert.throws(() => assertPreprodCheckpointBinding(value, binding));
  }
  assert.equal(calls, 0);
  assert.throws(() => createPreprodCheckpointBinding(profile, identity, 'not-genesis', snapshots));
  const proxy = new Proxy(binding, { get() { throw Error('private-error'); } });
  assertPreprodCheckpointBinding(proxy, binding);
  const descriptorTrap = new Proxy(binding, { ownKeys() { throw Error('private-error'); } });
  assert.throws(() => assertPreprodCheckpointBinding(descriptorTrap, binding), error => error instanceof Error && !error.message.includes('private-error'));
});
