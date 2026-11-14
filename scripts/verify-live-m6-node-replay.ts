import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { firstValueFrom, filter, timeout } from 'rxjs';
import { PolkadotNodeClient, makeConfig } from '@midnight-ntwrk/wallet-sdk/node-client';
import { Transaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { parseNodeReplayArguments, nodeReplayRejection, nodeReplayFailureShape, validatedPublicTransaction } from './m6-node-replay-policy.ts';

// Only replay an exact already public Local Dev allocation. No wallet, signing,
// balancing, private witness, new proof or arbitrary endpoint/payload input.
export async function verifyNodeReplay(args: readonly string[], phase: (stage: string) => void = () => {}) {
  const { logFile } = parseNodeReplayArguments(args);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const logRoot = await realpath(path.join(root, 'logs'));
  const file = await realpath(path.resolve(root, logFile));
  assert(file.startsWith(logRoot + path.sep));
  phase('arguments-and-local-log-checked');
  const rows = (await readFile(file, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  const ready = rows.find(row => row.event === 'local-stack-ready');
  const allocated = rows.filter(row => row.event === 'private-instance-allocation-accepted');
  assert(ready?.networkId === 'undeployed' && ready.node === 'midnight-node:1.0.0' &&
    ready.indexer === 'indexer-standalone:4.3.3' && allocated.length === 1 &&
    allocated[0].contractTag === 'permio-authorization-v8', 'Only the exact disposable v8 fixture is eligible');
  const { contractAddress, transactionId } = allocated[0];
  assert(typeof contractAddress === 'string' && /^[0-9a-f]{64}$/u.test(contractAddress) &&
    typeof transactionId === 'string' && /^[0-9a-f]{66}$/u.test(transactionId));
  phase('local-fixture-validated');
  const response = await fetch('http://127.0.0.1:8088/api/v4/graphql', {
    method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ query: `query ReplaySource($offset: TransactionOffset!) {
      transactions(offset: $offset) { protocolVersion raw contractActions { address }
        ... on RegularTransaction { identifiers transactionResult { status } } }
    }`, variables: { offset: { identifier: transactionId } } }),
  });
  assert(response.ok);
  const payload = await response.json() as { errors?: unknown; data?: { transactions?: unknown } };
  assert(!payload.errors);
  phase('public-indexer-response-received');
  const bytes = validatedPublicTransaction(payload.data?.transactions, transactionId, contractAddress);
  setNetworkId('undeployed');
  const finalized = Transaction.deserialize('signature', 'proof', 'binding', bytes);
  assert(finalized.identifiers().includes(transactionId), 'Serialized public transaction ID mismatch');
  phase('exact-public-transaction-decoded');
  const provider = indexerPublicDataProvider('http://127.0.0.1:8088/api/v4/graphql', 'ws://127.0.0.1:8088/api/v4/graphql/ws');
  const stateHash = async () => {
    const state = await provider.queryContractState(contractAddress); assert(state);
    return createHash('sha256').update(state.serialize()).digest('hex');
  };
  const before = await stateHash();
  phase('before-public-state-read');
  // Polkadot's logger otherwise prints raw RPC errors (and potentially bytes).
  // This dedicated diagnostic process emits only our fixed stages/result.
  const originalConsole = { log: console.log, error: console.error, warn: console.warn,
    info: console.info, debug: console.debug };
  for (const key of Object.keys(originalConsole) as (keyof typeof originalConsole)[]) console[key] = () => {};
  let node: PolkadotNodeClient | undefined;
  let rejection: string | null = null;
  try {
    node = await PolkadotNodeClient.init(makeConfig({ nodeURL: new URL('ws://127.0.0.1:9944') }));
    // Pinned SDK init disconnects after metadata loading, but WsProvider's
    // async disconnect returns before onclose resets isConnected. Let that
    // initial close settle before SDK ensureConnection; no submission retry.
    await delay(1000);
    phase('duplicate-submission-started');
    // Do not mistake mempool submission for finality or rejection.
    await firstValueFrom(node.sendMidnightTransaction(bytes as Parameters<PolkadotNodeClient['sendMidnightTransaction']>[0])
      .pipe(filter(event => event._tag === 'Finalized'), timeout(60000)));
  } catch (error: unknown) {
    rejection = nodeReplayRejection(error);
    process.stdout.write(`${JSON.stringify({ event: 'node-replay-result-shape', ...nodeReplayFailureShape(error),
      recognizedRejection: rejection !== null, detailsWithheld: true })}\n`);
  }
  finally {
    try { await node?.close(); }
    finally { Object.assign(console, originalConsole); }
  }
  assert(rejection, 'No explicit node rejection; infrastructure/timeout/unexpected finality is not a passed negative test');
  const after = await stateHash();
  assert.equal(after, before, 'Public contract state changed during duplicate test');
  phase('after-public-state-unchanged');
  return { event: 'independent-node-duplicate-replay-rejected', timestamp: new Date().toISOString(),
    network: 'undeployed-local-dev', contractTag: 'permio-authorization-v8', contractAddress, transactionId,
    submissionBoundary: 'actual-local-node-not-Compact-preflight', rejection,
    serializedPublicTransactionSha256: createHash('sha256').update(bytes).digest('hex'),
    beforeContractStateSha256: before, afterContractStateSha256: after,
    rawTransactionOrErrorPrinted: false, walletOrPrivateWitnessUsed: false, newProofOrSignatureCreated: false,
    scope: 'exact-previously-accepted-transaction-replay-not-new-malicious-proof-or-action-acceptance',
    milestoneComplete: false };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const deadline = setTimeout(() => {
    process.stdout.write(`${JSON.stringify({ event: 'node-replay-test-deadline', nodeRejectionVerified: false, detailsWithheld: true })}\n`);
    process.exit(2);
  }, 90000);
  try { process.stdout.write(`${JSON.stringify(await verifyNodeReplay(process.argv.slice(2), stage => {
    process.stdout.write(`${JSON.stringify({ event: 'node-replay-stage', stage, detailsWithheld: true })}\n`);
  }))}\n`); }
  catch { process.stdout.write(`${JSON.stringify({ event: 'node-replay-verification-failed', nodeRejectionVerified: false, detailsWithheld: true })}\n`); process.exitCode = 1; }
  finally { clearTimeout(deadline); }
}
