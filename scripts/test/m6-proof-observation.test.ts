import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { ProofProvider } from '@midnight-ntwrk/midnight-js-types';
import { observeLocalProofProvider } from '../m6-proof-observation.ts';

// Adapter-only mocks: these objects are deliberately NOT valid proofs/transactions.
it('proof observation passes exact private arguments/results without inspecting or publishing them', async () => {
  const calls: unknown[][] = [], events: unknown[] = [];
  const privateInput = { get witness() { throw new Error('must not read PRIVATE'); } };
  const result = { privateMarker: 'PRIVATE-RESULT' };
  const base = { async proveTx(...args: unknown[]) { calls.push(args); return result; } } as unknown as ProofProvider;
  const observed = observeLocalProofProvider(base, (event, fields) => events.push({ event, ...fields }), 600_000);
  const input = [privateInput, { privateMarker: 'PRIVATE-CONFIG' }] as unknown as Parameters<ProofProvider['proveTx']>;
  assert.equal(await observed.proveTx(...input), result);
  assert.equal(calls[0]![0], privateInput); assert.equal(calls[0]![1], input[1]);
  assert.equal(JSON.stringify(events).includes('PRIVATE'), false);
  const rows = events as Record<string, unknown>[];
  assert.equal(rows[0]!.event, 'contract-proof-started'); assert.equal(rows[1]!.event, 'contract-proof-completed');
  assert.equal(rows[1]!.transactionSubmissionOrFinalityAsserted, false);
  assert.equal(rows[0]!.requestTimeoutMs, 600_000); assert.equal(rows[1]!.proofProviderJob, 1);
  assert(typeof rows[1]!.elapsedMs === 'number' && rows[1]!.elapsedMs >= 0);
});

it('failed proofs preserve the original rejection and emit no accepted result or secret error text', async () => {
  const failure = new Error('PRIVATE', { cause: new DOMException('PRIVATE', 'TimeoutError') });
  const events: Record<string, unknown>[] = [];
  const base = { async proveTx() { throw failure; } } as unknown as ProofProvider;
  const observed = observeLocalProofProvider(base, (event, fields) => events.push({ event, ...fields }), 300_000);
  await assert.rejects(observed.proveTx(...([] as unknown as Parameters<ProofProvider['proveTx']>)), error => error === failure);
  assert.deepEqual(events.map(row => row.event), ['contract-proof-started', 'contract-proof-failed']);
  assert.equal(events[1]!.category, 'local-request-timeout-or-abort');
  assert(!JSON.stringify(events).includes('PRIVATE'));
  assert.throws(() => observeLocalProofProvider(base, () => {}, Infinity));
  assert.throws(() => observeLocalProofProvider(base, () => {}, 0));
});
