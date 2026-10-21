import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createCircuitContext, createConstructorContext, dummyContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { Proof, proofDataIntoSerializedPreimage } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { httpClientProvingProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { CredentialStatusTree, createRuntimeStatusMultiproof, hashProtocolIdentifier, permioAuthorizationWitnesses } from '@permio/midnight-authorization';
import { classifyLiveM6Failure } from './m6-live-failure.ts';

const expected = {
  program: '6d1a58afebf6c221f560f07bc66570feba74b917e029f81e27f42777c314d8ab',
  binary: 'bd7b8b6f52aaf8517fb3d7d93b0a5a8f83d2b3ffedb2fdeea69355074abcc1a8',
  bindings: 'f62da868d8c87e674ed6c1750ac868b16c24b882151a6b80d736b27f89fbf783',
};
const circuit = 'checkRuntimeStatusMultiproof';
async function hash(file: string) { return createHash('sha256').update(await readFile(file)).digest('hex'); }

async function main() {
  const mode = process.argv[2];
  assert(process.argv.length === 3 && ['--prepare-only', '--prove', '--prove-paging'].includes(mode!), 'Explicit diagnostic mode required');
  // Paging changes only this isolated diagnostic's HTTP wait, never protocol deadlines.
  const timeout = mode === '--prove-paging' ? 1_800_000 : 600_000;
  const assets = path.resolve('logs/m6-current-status-managed');
  assert(await hash(`${assets}/zkir/${circuit}.zkir`) === expected.program);
  assert(await hash(`${assets}/zkir/${circuit}.bzkir`) === expected.binary);
  assert(await hash(`${assets}/contract/index.js`) === expected.bindings);
  const { Contract } = await import(pathToFileURL(`${assets}/contract/index.js`).href);
  const namespace = 'org.permio.status-diagnostic';
  const namespaceHash = Uint8Array.from(Buffer.from(hashProtocolIdentifier('namespace', namespace).slice(2), 'hex'));
  const tree = new CredentialStatusTree();
  const indices = Array.from({ length: 35 }, (_, index) => BigInt(index * 29_959));
  for (const [index, statusIndex] of indices.entries()) tree.issue({ namespace, kind: 'account', statusIndex,
    credentialCommitment: new Uint8Array(32).fill(index + 1),
    revocationAuthorityAccountCredentialCommitment: new Uint8Array(32).fill(17) });
  const proof = { ...createRuntimeStatusMultiproof(tree.multiproofFor(indices)), rootSequence: 0n };
  const contract = new Contract(permioAuthorizationWitnesses);
  const state = contract.initialState(createConstructorContext(undefined, '00'.repeat(32)),
    new Uint8Array(32).fill(31), namespaceHash, new Uint8Array(32).fill(32), { field: 0n }, 1n, 1n, tree.root, 2n, 2n, 2n);
  const context = createCircuitContext(dummyContractAddress(), '00'.repeat(32), state.currentContractState, undefined);
  assert.throws(() => contract.circuits[circuit](context, namespaceHash, { ...proof, rootSequence: 1n }));
  const altered = structuredClone(proof); altered.leaves[0]!.leaf[0]! ^= 1;
  assert.throws(() => contract.circuits[circuit](context, namespaceHash, altered));
  const result = contract.circuits[circuit](context, namespaceHash, proof);
  const data = result.proofData;
  const preimage = proofDataIntoSerializedPreimage(data.input, data.output, data.publicTranscript, data.privateTranscriptOutputs, circuit);
  const report = { kind: 'historical-membership-isolated-proof-not-chain-acceptance', selectedLeaves: 35,
    inputHashes: expected, preimagePrepared: true, preflightNegatives: 2, preimageBytes: preimage.length,
    walletLoaded: false, realProofGenerated: false, proofFormatValidated: false, proofArtifactPersisted: false,
    proofIndependentlyVerified: false, transactionSubmitted: false, ordinaryActionAcceptance: false, milestoneComplete: false };
  console.log(JSON.stringify({ ...report, mode }));
  if (mode === '--prepare-only') return;
  assert(process.platform === 'linux', 'Run proving only on the configured cloud Linux host');
  const build = JSON.parse(await readFile(`${assets}/key-build-report.json`, 'utf8'));
  assert(build.realKeyBuildCompleted === true && build.mockKeysUsed === false && build.inputHashes[circuit + '.zkir'] === expected.program);
  for (const suffix of ['prover', 'verifier']) {
    assert(await hash(`${assets}/keys/${circuit}.${suffix}`) === build.keys[`membership.${suffix}`].sha256);
  }
  const provider = httpClientProvingProvider('http://127.0.0.1:6300', new NodeZkConfigProvider(assets), { timeout });
  await provider.check(preimage, circuit);
  console.log(JSON.stringify({ event: 'real-prover-constraint-check-passed', walletLoaded: false }));
  const started = performance.now();
  const startedAtUtc = new Date().toISOString();
  const bytes = await provider.prove(preimage, circuit);
  assert(bytes.length > 0);
  Proof.deserialize(bytes);
  await writeFile(`${assets}/isolated-proof.bin`, bytes, { flag: 'wx', mode: 0o600 });
  Object.assign(report, { realProofGenerated: true, proofFormatValidated: true, proofArtifactPersisted: true });
  await writeFile(`${assets}/isolated-proof-report.json`, JSON.stringify({ ...report,
    mode, httpTimeoutMs: timeout, startedAtUtc, completedAtUtc: new Date().toISOString(),
    elapsedProofProviderMs: performance.now() - started, proofBytes: bytes.length,
    proofSha256: createHash('sha256').update(bytes).digest('hex') }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ event: 'isolated-real-proof-generated', ...report }));
}

main().catch((error: unknown) => {
  console.log(JSON.stringify({ event: 'membership-proof-diagnostic-failed', category: classifyLiveM6Failure(error), detailsWithheld: true, milestoneComplete: false }));
  process.exitCode = 1;
});
