import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { pureCircuits as baseline } from '../packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js';
import { CredentialStatusTree, createRuntimeStatusMultiproof } from '../packages/midnight-authorization/src/index.ts';

assert.equal(process.argv.length, 3);
const input = process.argv[2];
assert(/^logs\/m6-action-boundary-[A-Za-z0-9]{6}\/report\.json$/.test(input));
const hash = data => createHash('sha256').update(data).digest('hex');
const report = JSON.parse(await readFile(input, 'utf8'));
assert.equal(report.outcome.code, 0); assert(report.isolatedCandidate);
for (const [name, expected] of Object.entries(report.baseProductionHashes)) assert.equal(hash(await readFile(name)), expected);
const generated = path.join(path.dirname(input), 'generated/contract/index.js');
const { pureCircuits: candidate } = await import(pathToFileURL(path.resolve(generated)).href);
const cases = []; let stage = 'fixture';
const check = (name, body) => { stage = name; body(); cases.push({ name, result: 'PASS' }); };
function fixture(count) {
  const tree = new CredentialStatusTree(), indices = [];
  for (let i = 0; i < count; i++) {
    const index = BigInt(count === 1 ? 0 : Math.floor(i * ((2 ** 20) - 1) / (count - 1)));
    indices.push(index);
    tree.issue({ namespace: 'm6-status-factoring-synthetic', kind: 'account', statusIndex: index,
      credentialCommitment: new Uint8Array(32).fill(i + 1),
      revocationAuthorityAccountCredentialCommitment: new Uint8Array(32).fill(i + 1) });
  }
  return { tree, proof: createRuntimeStatusMultiproof(tree.multiproofFor(indices)) };
}
try {
  const fixtures = [1, 17, 35].map(fixture);
  for (const { tree, proof } of fixtures) check(`same-root-for-${proof.leafCount}-scattered-leaves`, () => {
    assert.deepEqual(baseline.runtimeStatusMultiproofRoot(proof), tree.root);
    assert.deepEqual(candidate.runtimeStatusMultiproofRoot(proof), tree.root);
  });
  const f = fixtures[0];
  function reject(name, mutate, expected) {
    check(name, () => {
      const proof = structuredClone(f.proof); mutate(proof);
      for (const implementation of [baseline, candidate]) assert.throws(() =>
        implementation.assertRuntimeStatusMultiproof(proof, f.tree.root, f.tree.sequence), expected);
    });
  }
  reject('both-reject-altered-stack-tail', proof => {
    proof.steps.find(step => step.kind === 2n).stackTail += 1n;
  }, /stack opening/);
  reject('both-reject-merge-with-no-required-child', proof => {
    const step = proof.steps.find(step => step.kind === 2n); step.leftFromStack = false; step.rightFromStack = false;
  }, /must cover a required leaf/);
  reject('both-reject-altered-unstacked-child-position', proof => {
    const step = proof.steps.find(step => step.kind === 2n && !step.rightFromStack); assert(step);
    step.right.index ^= 1n;
  }, /adjacent at the same exact level/);
  reject('both-reject-noncanonical-padding', proof => {
    proof.steps.find(step => step.kind === 0n).parentIndex = 1n;
  }, /padding is not canonical/);
  reject('both-reject-unknown-instruction', proof => { proof.steps[0].kind = 3n; }, /Unsupported.*instruction/);
  reject('both-reject-stale-root-sequence', proof => { proof.rootSequence += 1n; }, /sequence is stale/);
  reject('both-reject-substituted-current-leaf', proof => { proof.leaves[0].leaf[0] ^= 1; }, /did not consume every leaf/);
  const output = path.join(path.dirname(input), `status-factoring-tests-${Date.now()}.json`);
  const result = { kind: 'status-hash-factoring-generated-differential-checks', result: 'PASS', observedAtUtc: new Date().toISOString(),
    sourceReport: input, reportSha256: hash(await readFile(input)), generatedContractSha256: hash(await readFile(generated)),
    verifierSha256: hash(await readFile(new URL(import.meta.url))), cases, sameWitnessSchemaAndHashDomains: true,
    syntheticFixturesOnly: true, fixtureValuesExported: false, productionAdopted: false,
    transactionsSubmitted: 0, proofGenerated: false, ordinaryActionAcceptance: false, milestoneComplete: false };
  await writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ output, result: 'PASS', passed: cases.length }));
} catch (error) {
  const output = path.join(path.dirname(input), `status-factoring-failure-${Date.now()}.json`);
  const failure = { result: 'FAIL', stage, completedCases: cases, errorType: error.name, detailsWithheld: true };
  await writeFile(output, JSON.stringify(failure, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(failure)); process.exitCode = 1;
}
