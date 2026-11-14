import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { it } from 'node:test';
import type { WebSocket } from 'ws';
import { PreprodConnectionProfile } from '../../packages/midnight-authorization/src/preprod-profile.ts';
import { probePreprodTransports } from '../m6-preprod-transport.ts';

const secret = 'nightpreprod_synthetic_secret';
const profile = new PreprodConnectionProfile(secret);
const fakeFetch: typeof fetch = async (_url, options) => {
  assert.equal(options?.redirect, 'error');
  const body = JSON.parse(options?.body as string);
  return new Response(JSON.stringify({ result: body.method === 'chain_getBlockHash' ? `0x${'ab'.repeat(32)}` : '8.1.1' }));
};
function sockets(fail = false, rejectIndexer = false, emptySubscription = false, wrongOffset = false) {
  let terminated = 0;
  class Fake extends EventEmitter {
    constructor() { super(); queueMicrotask(() => this.emit('open')); }
    send(raw: string) {
      const request = JSON.parse(raw);
      if (fail) { queueMicrotask(() => this.emit('error', Error(`private-token=${secret}`))); return; }
      if (request.method === 'chain_subscribeNewHeads') {
        queueMicrotask(() => {
          this.emit('message', Buffer.from(JSON.stringify({ id: 11, result: 'synthetic-subscription' })));
          this.emit('message', Buffer.from(JSON.stringify({ method: 'chain_newHead', params: { subscription: 'synthetic-subscription', result: { number: '0x2a' } } })));
        });
      } else if (request.type === 'connection_init') queueMicrotask(() => this.emit('message', Buffer.from('{"type":"connection_ack"}')));
      else if (request.type === 'subscribe' && request.id === 'm6-readonly') queueMicrotask(() => this.emit('message', Buffer.from(JSON.stringify(rejectIndexer
        ? { type: 'error', payload: { message: secret } }
        : { type: 'next', id: 'm6-readonly', payload: { data: { block: { height: 42 } } } }))));
      else if (request.type === 'subscribe' && request.id === 'm6-blocks') {
        assert.match(request.payload.query, /^subscription /);
        assert.deepEqual(request.payload.variables, { offset: { height: 42 } });
        queueMicrotask(() => this.emit('message', Buffer.from(JSON.stringify(emptySubscription
          ? { type: 'complete', id: 'm6-blocks' }
          : { type: 'next', id: 'm6-blocks', payload: { data: { blocks: { height: wrongOffset ? 41 : 42 } } } }))));
      }
    }
    terminate() { terminated++; }
  }
  return { socket: (url: string, protocol?: string) => {
    const address = new URL(url); assert.equal(address.searchParams.get('project_id'), secret);
    assert(address.hostname.endsWith('midnight-preprod.blockfrost.io'));
    assert.equal(protocol, address.pathname === '/api/v0/ws' ? 'graphql-transport-ws' : undefined);
    return new Fake() as unknown as WebSocket;
  }, count: () => terminated };
}
it('requires actual node and indexer subscription data, starting the indexer at its latest queried block', async () => {
  const fake = sockets();
  const report = await probePreprodTransports(profile, { fetch: fakeFetch, socket: fake.socket });
  assert(report.http.passed && report.nodeSubscription.passed && report.indexerSubscription.passed);
  assert.equal(report.nodeSubscription.blockHeight, 42); assert.equal(report.indexerSubscriptionVerified, true);
  assert.equal(report.indexerSubscription.queryBlockHeight, 42);
  assert.equal(report.walletLoaded, false); assert.equal(report.transactionSubmitted, false); assert.equal(report.milestoneComplete, false);
  assert.equal(fake.count(), 2); assert(!JSON.stringify(report).includes(secret));
});
it('network errors and token-bearing messages produce fixed redacted categories and close owned sockets', async () => {
  const fake = sockets(true);
  const report = await probePreprodTransports(profile, { fetch: async () => { throw Error(secret); }, socket: fake.socket });
  assert.equal(report.http.passed, false); assert.equal(report.nodeSubscription.passed, false);
  assert.equal(report.indexerSubscription.passed, false); assert.equal(fake.count(), 2);
  assert(!JSON.stringify(report).includes(secret));
});
it('a failed indexer operation cannot be relabeled as a valid subscription or proof', async () => {
  const fake = sockets(false, true);
  const report = await probePreprodTransports(profile, { fetch: fakeFetch, socket: fake.socket });
  assert(report.nodeSubscription.passed); assert(!report.indexerSubscription.passed);
  assert.equal(report.proofGenerated, false); assert(!JSON.stringify(report).includes(secret));
});
it('a successful query alone and a block before the requested offset cannot pass indexer subscription readiness', async () => {
  for (const fake of [sockets(false, false, true), sockets(false, false, false, true)]) {
    const report = await probePreprodTransports(profile, { fetch: fakeFetch, socket: fake.socket });
    assert.equal(report.indexerSubscriptionVerified, false); assert.equal(fake.count(), 2);
    assert.equal(report.transactionSubmitted, false); assert(!JSON.stringify(report).includes(secret));
  }
});
