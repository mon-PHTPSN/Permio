import assert from 'node:assert/strict';
import { it } from 'node:test';
import { inspect } from 'node:util';
import type { ApiPromise } from '@polkadot/api';
import BN from 'bn.js';
import { createReadyPreprodNodeSubmissionService, waitForPreprodNodeDisconnect } from '../src/preprod-node-submission.ts';
import { PreprodConnectionProfile, PREPROD_GENESIS_HASH } from '../src/preprod-profile.ts';
import type { FinalizedTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { classifyPreprodSubmissionFailure } from '../src/preprod-submission-failure.ts';

const profile = new PreprodConnectionProfile('nightpreprod_synthetic_only');
const transaction = { serialize: () => Uint8Array.of(42) } as FinalizedTransaction;
function apiFixture(ready: Promise<unknown> = Promise.resolve(), genesis = PREPROD_GENESIS_HASH) {
  let sends = 0, disconnects = 0, unsubscribe = 0, deferClose = false;
  const api = {
    isReadyOrError: ready, isConnected: true,
    genesisHash: { toHex: () => genesis },
    async connect() { api.isConnected = true; },
    async disconnect() { disconnects++; if (!deferClose) api.isConnected = false; },
    tx: { midnight: { sendMnTransaction() { return {
      async send(callback: (result: unknown) => void) {
        sends++;
        queueMicrotask(() => callback({
          status: { isFinalized: true, asFinalized: { toString: () => `0x${'11'.repeat(32)}` } },
          blockNumber: new BN(42), txHash: { toString: () => `0x${'22'.repeat(32)}` },
        }));
        return () => { unsubscribe++; };
      },
    }; } } },
  };
  return { api, typed: api as unknown as ApiPromise,
    counts: () => ({ sends, disconnects, unsubscribe }), deferClose: () => { deferClose = true; },
    finishClose: () => { deferClose = false; api.isConnected = false; } };
}

it('waits for metadata before exposing submission and verifies the exact Preprod genesis', async () => {
  let release!: () => void, returned = false;
  const fixture = apiFixture(new Promise(resolve => { release = () => resolve(undefined); }));
  const promise = createReadyPreprodNodeSubmissionService(profile, undefined, { makeApi: () => fixture.typed })
    .then(service => { returned = true; return service; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(returned, false); assert.equal(fixture.counts().sends, 0);
  release(); const service = await promise; assert.equal(returned, true);
  assert.equal(fixture.counts().disconnects, 0, 'initial ready connection stays open');
  await service.close(); assert.equal(fixture.counts().disconnects, 1);
  const wrong = apiFixture(Promise.resolve(), `0x${'00'.repeat(32)}`);
  await assert.rejects(createReadyPreprodNodeSubmissionService(profile, undefined, { makeApi: () => wrong.typed }));
  assert.equal(wrong.counts().sends, 0); assert.equal(wrong.counts().disconnects, 1);
});

it('bounds failed metadata initialization, closes the API and withholds private SDK errors', async () => {
  for (const ready of [Promise.reject(Error('PRIVATE-URL-AND-KEY')), new Promise(() => {})]) {
    const fixture = apiFixture(ready), stages: string[] = [];
    await assert.rejects(createReadyPreprodNodeSubmissionService(profile, stage => stages.push(stage), {
      makeApi: () => fixture.typed, initializationTimeoutMs: 25, initializationAttempts: 1,
    }), error => {
      assert(!inspect(error).includes('PRIVATE')); return true;
    });
    assert.deepEqual(stages, ['node-connect-started', 'node-connect-failed']);
    assert.equal(fixture.counts().sends, 0); assert.equal(fixture.counts().disconnects, 1);
  }
});

it('retries only metadata reads after verified socket cleanup and never retries a wrong genesis', async () => {
  const failed = apiFixture(Promise.reject(Error('PRIVATE-URL'))), ready = apiFixture();
  let attempts = 0;
  const service = await createReadyPreprodNodeSubmissionService(profile, undefined, {
    makeApi: () => ++attempts === 1 ? failed.typed : ready.typed,
  });
  assert.equal(attempts, 2); assert.equal(failed.counts().disconnects, 1);
  assert.equal(failed.counts().sends, 0); assert.equal(ready.counts().sends, 0);
  await service.close();
  const wrong = apiFixture(Promise.resolve(), '0x' + '00'.repeat(32));
  attempts = 0;
  await assert.rejects(createReadyPreprodNodeSubmissionService(profile, undefined, {
    makeApi: () => { attempts++; return wrong.typed; },
  }));
  assert.equal(attempts, 1); assert.equal(wrong.counts().sends, 0);
});

it('preserves SDK Finalized results and prevents the next send until a stale disconnect flag settles', async () => {
  const fixture = apiFixture();
  const service = await createReadyPreprodNodeSubmissionService(profile, undefined, { makeApi: () => fixture.typed });
  fixture.deferClose();
  const first = await service.submitTransaction(transaction, 'Finalized');
  assert.equal(first._tag, 'Finalized'); assert.equal(first.blockHeight, 42n);
  assert.equal(fixture.counts().sends, 1); assert.equal(fixture.api.isConnected, true);
  let secondReturned = false;
  const second = service.submitTransaction(transaction, 'Finalized').then(result => { secondReturned = true; return result; });
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(fixture.counts().sends, 1); assert.equal(secondReturned, false);
  fixture.finishClose(); assert.equal((await second)._tag, 'Finalized');
  assert.equal(fixture.counts().sends, 2);
  await service.close();
  await assert.rejects(service.submitTransaction(transaction, 'Finalized'));
  assert.equal(fixture.counts().sends, 2, 'closed service never retries');
});

it('disconnect readiness has a deadline instead of accepting a stale connected flag', async () => {
  await assert.rejects(waitForPreprodNodeDisconnect({ isConnected: true }, 25));
  await waitForPreprodNodeDisconnect({ isConnected: false }, 25);
});

it('bounds a lost Finalized notification, releases the subscription and forbids another send until reconciliation', async () => {
  const fixture = apiFixture();
  let sends = 0, unsubscribed = 0;
  fixture.api.tx.midnight.sendMnTransaction = () => ({ async send(callback: (result: unknown) => void) {
    sends++;
    queueMicrotask(() => callback({ status: { isReady: true }, txHash: { toString: () => `0x${'22'.repeat(32)}` } }));
    return () => { unsubscribed++; };
  } });
  const service = await createReadyPreprodNodeSubmissionService(profile, undefined, {
    makeApi: () => fixture.typed, confirmationTimeoutMs: 25,
  });
  await assert.rejects(service.submitTransaction(transaction, 'Finalized'), error => {
    assert.deepEqual(classifyPreprodSubmissionFailure(error), { category: 'finality-timeout' });
    assert(!inspect(error).includes('txData')); return true;
  });
  assert.equal(sends, 1); assert.equal(unsubscribed, 1); assert.equal(fixture.counts().disconnects, 1);
  await assert.rejects(service.submitTransaction(transaction, 'Finalized'));
  assert.equal(sends, 1, 'an outcome that may already be on-chain is never automatically resubmitted');
  await service.close();
});
