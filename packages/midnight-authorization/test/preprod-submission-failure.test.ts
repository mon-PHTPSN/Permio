import assert from 'node:assert/strict';
import { it } from 'node:test';
import { Effect } from 'effect';
import { NodeClientError } from '@midnight-ntwrk/wallet-sdk-node-client/effect';
import { classifyPreprodSubmissionFailure, parsePreprodSubmissionFailure, PreprodSubmissionError }
  from '../src/preprod-submission-failure.ts';

it('retains public codes through the actual pinned SDK and Effect wrappers without copying transaction data', async () => {
  const cause = Object.assign(new Error('1010: Invalid Transaction: Custom error: 168 PRIVATE-TOKEN'), { code: 1010 });
  const sdk = new NodeClientError.SubmissionError({ message: 'Transaction submission failed',
    txData: new Uint8Array([1, 2, 3]) as never, cause });
  let caught: unknown;
  try { await Effect.runPromise(Effect.fail(sdk)); } catch (error) { caught = error; }
  const diagnostic = classifyPreprodSubmissionFailure(caught);
  assert.deepEqual(diagnostic, { category: 'node-submission-error', rpcCode: 1010, customCode: 168 });
  const safe = new PreprodSubmissionError(caught);
  assert.deepEqual(safe.diagnostic, diagnostic);
  assert(!safe.message.includes('PRIVATE')); assert(!JSON.stringify(safe).includes('PRIVATE'));
  assert(!JSON.stringify(safe).includes('txData')); assert.equal(Object.hasOwn(safe, 'cause'), false);
  assert(Object.isFrozen(safe.diagnostic));
});

it('distinguishes node rejection, dropped/replaced transactions, transport failures and finality timeouts', () => {
  for (const [tag, category] of [
    ['ConnectionError', 'node-connection-failed'], ['TransactionProgressError', 'finality-timeout'],
    ['TransactionUsurpedError', 'transaction-usurped'], ['TransactionDroppedError', 'transaction-dropped'],
    ['TransactionInvalidError', 'transaction-invalid'], ['ParseError', 'node-response-invalid'],
  ] as const) {
    assert.equal(classifyPreprodSubmissionFailure({ _tag: 'SubmissionError', cause: { _tag: tag, txData: 'PRIVATE' } }).category, category);
  }
  assert.deepEqual(classifyPreprodSubmissionFailure({ name: 'TimeoutError', status: 503, cause: { code: 4003 } }),
    { category: 'request-timeout', rpcCode: 4003, httpStatus: 503 });
  assert.equal(classifyPreprodSubmissionFailure({ _tag: '__proto__' }).category, 'unknown');
});

it('does not execute accessors, serialize errors, inspect payloads, or traverse unbounded/cyclic causes', () => {
  let calls = 0;
  const getter = () => { calls++; throw Error('PRIVATE'); };
  const accessor = Object.defineProperties({}, Object.fromEntries(['message', '_tag', 'name', 'cause', 'code', 'status', 'txData', 'toJSON']
    .map(key => [key, { get: getter }])));
  assert.deepEqual(classifyPreprodSubmissionFailure(accessor), { category: 'unknown' });
  assert.equal(calls, 0);
  const cyclic: { cause?: unknown } = {}; cyclic.cause = cyclic;
  const proxy = new Proxy({}, { getOwnPropertyDescriptor: getter });
  assert.deepEqual(classifyPreprodSubmissionFailure(cyclic), { category: 'unknown' });
  assert.deepEqual(classifyPreprodSubmissionFailure(proxy), { category: 'unknown' });
  let deep: unknown = { code: 1010, _tag: 'TransactionInvalidError' };
  for (let index = 0; index < 30; index++) deep = { cause: deep };
  assert.deepEqual(classifyPreprodSubmissionFailure(deep), { category: 'unknown' });
  for (const value of [undefined, null, 'PRIVATE', { code: Infinity, status: 'PRIVATE' }, { code: 0.5 },
    { message: 'Custom error: 999 PRIVATE' }]) assert.deepEqual(classifyPreprodSubmissionFailure(value), { category: 'unknown' });
});

it('revalidates IPC diagnostics and copies only the public category and bounded numeric fields', () => {
  assert.deepEqual(parsePreprodSubmissionFailure({ category: 'transaction-invalid', rpcCode: 1010, customCode: 168,
    privateUrl: 'PRIVATE', txData: 'PRIVATE', message: 'PRIVATE' }),
    { category: 'transaction-invalid', rpcCode: 1010, customCode: 168 });
  for (const value of [null, { category: 'PRIVATE' }, { category: 'unknown', rpcCode: 'PRIVATE' },
    { category: 'unknown', customCode: 256 }, { category: 'unknown', httpStatus: 600 },
    Object.defineProperty({}, 'category', { get() { throw Error('PRIVATE'); } })]) {
    assert.equal(parsePreprodSubmissionFailure(value), undefined);
  }
});
