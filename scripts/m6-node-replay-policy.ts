import assert from 'node:assert/strict';

export function parseNodeReplayArguments(args: readonly string[]) {
  assert(args.length === 2 && args[0] === '--submit-duplicate' &&
    /^logs[\\/]+m6-live-[0-9TZ.-]+\.jsonl$/u.test(args[1]!),
  'usage: --submit-duplicate logs/m6-live-<timestamp>.jsonl');
  return { logFile: args[1]! };
}

function ownValue(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

/** No transport error, timeout, arbitrary exception or raw message can pass. */
export function nodeReplayRejection(error: unknown): string | null {
  try {
    const tag = ownValue(error, '_tag');
    if (tag === 'TransactionInvalidError') return 'node-invalid-status';
    if (tag !== 'SubmissionError') return null;
    const cause = ownValue(error, 'cause');
    const code = ownValue(cause, 'code'), message = ownValue(cause, 'message');
    if (code === 1010 && typeof message === 'string' && /^1010: Invalid Transaction:/u.test(message)) {
      return 'node-invalid-transaction-1010';
    }
    if (code === 1013 && typeof message === 'string' && /^1013: Transaction Already Imported/u.test(message)) {
      return 'node-pool-duplicate-1013';
    }
  } catch { /* Proxies and accessors cannot turn diagnostics into success. */ }
  return null;
}

/** Fixed diagnostic shapes only, including when the SDK drops an RPC code. */
export function nodeReplayFailureShape(error: unknown) {
  try {
    const tag = ownValue(error, '_tag');
    const cause = ownValue(error, 'cause');
    const code = ownValue(cause, 'code'), message = ownValue(cause, 'message');
    const prefix = typeof message === 'string' ? /^([0-9]{4}):/u.exec(message)?.[1] : undefined;
    return {
      sdkTag: typeof tag === 'string' && ['SubmissionError', 'ConnectionError', 'TransactionInvalidError', 'ParseError',
        'TransactionProgressError', 'TransactionDroppedError', 'TransactionUsurpedError'].includes(tag) ? tag : 'other',
      rpcCode: [1010, 1013, -32601].includes(code as number) ? code as number : null,
      messageShape: typeof message !== 'string' ? 'absent' : /^1010: Invalid Transaction:/u.test(message) ? 'invalid-transaction-1010' :
        /^1013: Transaction Already Imported/u.test(message) ? 'already-imported-1013' : 'other',
      recognizedNumericPrefix: ['1010', '1013', '1014', '1002'].includes(prefix ?? '') ? prefix : null,
      invalidTransactionLabelPresent: typeof message === 'string' && /Invalid Transaction/iu.test(message),
      alreadyImportedLabelPresent: typeof message === 'string' && /Already Imported/iu.test(message),
      connectionLabelPresent: typeof message === 'string' && /WebSocket|disconnected|not connected|connection/iu.test(message),
      causeIsError: cause instanceof Error,
    };
  } catch { return { sdkTag: 'other', rpcCode: null, messageShape: 'absent', recognizedNumericPrefix: null,
    invalidTransactionLabelPresent: false, alreadyImportedLabelPresent: false, connectionLabelPresent: false, causeIsError: false }; }
}

export function validatedPublicTransaction(rows: unknown, transactionId: string, address: string): Uint8Array {
  // SDK TransactionId is a serialized 33-byte identifier, not a 32-byte hash.
  assert(/^[0-9a-f]{66}$/u.test(transactionId) && /^[0-9a-f]{64}$/u.test(address));
  assert(Array.isArray(rows) && rows.length > 0 && rows.length <= 16, 'Missing bounded public transaction response');
  const normalize = (value: unknown) => typeof value === 'string' ? value.replace(/^0x/u, '') : '';
  const matches = rows.filter(row => Array.isArray(row?.identifiers) &&
    row.identifiers.some((id: unknown) => normalize(id) === transactionId));
  assert(matches.length === 1, 'Expected one exact previously accepted transaction');
  const tx = matches[0];
  // Indexer network protocol 1000000 is distinct from the ledger-v8 package.
  assert(tx.protocolVersion === 1000000 && tx.transactionResult?.status === 'SUCCESS' &&
    Array.isArray(tx.contractActions) && tx.contractActions.length === 1 &&
    normalize(tx.contractActions[0]?.address) === address,
  'Transaction must be a successful exact-contract ledger-v8 call');
  const raw = normalize(tx.raw);
  assert(raw.length > 0 && raw.length <= 8 * 1024 ** 2 && raw.length % 2 === 0 && /^[0-9a-f]+$/u.test(raw),
    'Malformed or excessive public serialized transaction');
  return Uint8Array.from(Buffer.from(raw, 'hex'));
}
