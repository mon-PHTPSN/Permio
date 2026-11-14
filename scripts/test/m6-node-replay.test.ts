import assert from 'node:assert/strict';
import { it } from 'node:test';
import { parseNodeReplayArguments, nodeReplayRejection, nodeReplayFailureShape, validatedPublicTransaction } from '../m6-node-replay-policy.ts';

const txId = '00' + 'ab'.repeat(32), address = 'cd'.repeat(32);
const accepted = () => ({ protocolVersion: 1000000, identifiers: [txId], raw: '000102',
  transactionResult: { status: 'SUCCESS' }, contractActions: [{ address }] });

it('node replay requires explicit submission opt-in and an exact worktree public log', () => {
  const log = 'logs/m6-live-2026-10-14T16-25-12.928Z.jsonl';
  assert.deepEqual(parseNodeReplayArguments(['--submit-duplicate', log]), { logFile: log });
  for (const args of [[], [log], ['--submit-duplicate', '../accounts.json'], ['--submit-duplicate', '/tmp/private'],
    ['--submit-duplicate', log, '--submit-duplicate'], ['--remote', log], ['--submit-duplicate', 'logs/../private']]) {
    assert.throws(() => parseNodeReplayArguments(args));
  }
});

it('only an explicit node invalid status or recognized RPC rejection passes replay diagnostics', () => {
  assert.equal(nodeReplayRejection({ _tag: 'TransactionInvalidError' }), 'node-invalid-status');
  for (const [code, prefix, label] of [[1010, 'Invalid Transaction:', 'node-invalid-transaction-1010'],
    [1013, 'Transaction Already Imported', 'node-pool-duplicate-1013']] as const) {
    assert.equal(nodeReplayRejection({ _tag: 'SubmissionError', cause: { code, message: `${code}: ${prefix} PRIVATE` } }), label);
  }
  for (const error of [null, undefined, new Error('PRIVATE'), { _tag: 'ConnectionError' },
    { _tag: 'SubmissionError', cause: { code: -32601, message: 'PRIVATE' } },
    { _tag: 'SubmissionError', cause: { code: 1010, message: 'transport failure' } },
    { get _tag(): string { throw new Error('PRIVATE'); } },
    new Proxy({}, { getOwnPropertyDescriptor() { throw new Error('PRIVATE'); } })]) {
    assert.equal(nodeReplayRejection(error), null);
  }
  assert.deepEqual(nodeReplayFailureShape({ _tag: 'SubmissionError', cause: {
    code: 1010, message: '1010: Invalid Transaction: PRIVATE' } }), {
    sdkTag: 'SubmissionError', rpcCode: 1010, messageShape: 'invalid-transaction-1010', recognizedNumericPrefix: '1010',
    invalidTransactionLabelPresent: true, alreadyImportedLabelPresent: false, connectionLabelPresent: false, causeIsError: false });
  assert.deepEqual(nodeReplayFailureShape({ _tag: 'PRIVATE', cause: { code: 123456, message: 'PRIVATE' } }),
    { sdkTag: 'other', rpcCode: null, messageShape: 'other', recognizedNumericPrefix: null,
      invalidTransactionLabelPresent: false, alreadyImportedLabelPresent: false, connectionLabelPresent: false, causeIsError: false });
});

it('replay payload must come from one successful exact public ledger-v8 call', () => {
  assert.deepEqual(validatedPublicTransaction([accepted()], txId, address), new Uint8Array([0, 1, 2]));
  assert.deepEqual(validatedPublicTransaction([{ ...accepted(), identifiers: [`0x${txId}`], raw: '0x000102',
    contractActions: [{ address: `0x${address}` }] }], txId, address), new Uint8Array([0, 1, 2]));
  for (const row of [{ ...accepted(), protocolVersion: 8 }, { ...accepted(), protocolVersion: 1000001 },
    { ...accepted(), identifiers: ['ef'.repeat(32)] },
    { ...accepted(), transactionResult: { status: 'FAILURE' } }, { ...accepted(), contractActions: [] },
    { ...accepted(), contractActions: [{ address: 'ef'.repeat(32) }] },
    { ...accepted(), contractActions: [{ address }, { address }] }]) {
    assert.throws(() => validatedPublicTransaction([row], txId, address));
  }
  assert.throws(() => validatedPublicTransaction([accepted(), accepted()], txId, address));
  assert.throws(() => validatedPublicTransaction([], txId, address));
  assert.throws(() => validatedPublicTransaction(Array(17).fill(accepted()), txId, address));
});

it('malformed, oversized and substituted public bytes fail before node submission', () => {
  for (const raw of ['', '0', 'zz', '0x', '00'.repeat(4 * 1024 ** 2 + 1)]) {
    assert.throws(() => validatedPublicTransaction([{ ...accepted(), raw }], txId, address));
  }
  assert.throws(() => validatedPublicTransaction([accepted()], 'PRIVATE', address));
  assert.throws(() => validatedPublicTransaction([accepted()], 'ab'.repeat(32), address));
  assert.throws(() => validatedPublicTransaction([accepted()], txId, '../PRIVATE'));
});
