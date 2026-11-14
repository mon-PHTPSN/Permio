import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  Bytes32Descriptor, CompactTypeBoolean, CompactTypeField, CompactTypeUnsignedInteger,
  ChargedState, StateValue, createCircuitContext, createConstructorContext, sampleContractAddress,
} from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { permioAuthorizationWitnesses } from '../packages/midnight-authorization/src/compact-crypto.ts';
import { hashProtocolIdentifier } from '../packages/midnight-authorization/src/canonical.ts';
import { runtimeDecisionReceiptId, readFinalizedDecisionReceipt } from '../packages/midnight-authorization/src/decision-receipt.ts';

assert.equal(process.argv.length, 3);
const reportPath = process.argv[2];
assert(/^logs\/m6-action-outcome-core-[A-Za-z0-9]{6}\/report\.json$/.test(reportPath));
const directory = path.dirname(reportPath), generated = `${directory}/generated`;
const report = JSON.parse(await readFile(reportPath, 'utf8'));
assert.equal(report.outcome.code, 0);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
for (const [file, expected] of Object.entries(report.inputHashes)) assert.equal(hash(await readFile(file)), expected);
for (const [file, expected] of Object.entries(report.generatedHashes)) assert.equal(hash(await readFile(`${generated}/${file}`)), expected);
const { Contract, pureCircuits: pure, ledger } = await import(pathToFileURL(path.resolve(`${generated}/contract/index.js`)).href);
const info = JSON.parse(await readFile(`${generated}/compiler/contract-info.json`, 'utf8'));
const bytes = value => new Uint8Array(32).fill(value);
const hex = value => `0x${Buffer.from(value).toString('hex')}`;
function descriptor(type) {
  if (type['type-name'] === 'Bytes') { assert.equal(type.length, 32); return Bytes32Descriptor; }
  if (type['type-name'] === 'Boolean') return CompactTypeBoolean;
  if (type['type-name'] === 'Field') return CompactTypeField;
  if (type['type-name'] === 'Uint') {
    const bits = Math.ceil(Math.log2(type.maxval + 1));
    return new CompactTypeUnsignedInteger((1n << BigInt(bits)) - 1n, Math.ceil(bits / 8));
  }
  assert.equal(type['type-name'], 'Struct');
  const fields = type.elements.map(field => [field.name, descriptor(field.type)]);
  return { alignment: () => fields.flatMap(([, field]) => field.alignment()),
    toValue: value => fields.flatMap(([name, field]) => field.toValue(value[name])) };
}
function plain(value) { return value instanceof ChargedState ? value.state : value; }
function seedMap(source, name, key, value) {
  const schema = info.ledger.find(entry => entry.name === name);
  assert.equal(schema.storage, 'Map');
  const keyType = descriptor(schema.key), valueType = descriptor(schema.value);
  const alignedKey = { value: keyType.toValue(key), alignment: keyType.alignment() };
  const cell = StateValue.newCell({ value: valueType.toValue(value), alignment: valueType.alignment() });
  function replace(node, route) {
    if (!route.length) return StateValue.newMap(node.asMap().insert(alignedKey, cell));
    const array = node.asArray(); assert(array && array[route[0]]);
    return array.reduce((result, child, index) => result.arrayPush(index === route[0]
      ? replace(child, route.slice(1)) : child), StateValue.newArray());
  }
  return replace(plain(source), schema.index);
}
function fixture() {
  const address = sampleContractAddress(), contract = new Contract(permioAuthorizationWitnesses);
  const target = { namespaceHash: bytes(1), templateIdHash: bytes(2),
    semanticVersion: { major: 1n, minor: 0n, patch: 0n }, templateContentHash: bytes(3) };
  const state = { stateVersion: 2n, instanceCommitment: bytes(4), stateIdHash: bytes(57), lastMutationAt: 400n,
    slotAssignmentsRoot: pure.runtimePrivateMapEmptyRoot(), slotAssignmentCount: 1n,
    slotBindingsRoot: pure.runtimePrivateMapEmptyRoot(), slotBindingCount: 1n, nonce: bytes(55) };
  const network = Uint8Array.from(Buffer.from(hashProtocolIdentifier('network-id', 'undeployed').slice(2), 'hex'));
  const allocation = { allocationVersion: 1n, target, instanceCommitment: state.instanceCommitment,
    instanceIdHash: bytes(51), allocationRequestIdHash: bytes(52), m4AuthorizationCommitment: bytes(53),
    allocatorAuthorityCommitment: bytes(54), capabilityIssuersRoot: { field: 0n }, capabilityIssuerCount: 1n,
    initialStateCommitment: pure.runtimeStateCommitment(state), governancePolicyHash: bytes(18),
    authorityRootVersion: 1n, authorityRootSequence: 1n, targetNetworkHash: network,
    targetContractIdentity: Uint8Array.from(Buffer.from(address, 'hex')), authorizedAt: 0n, createdAt: 0n,
    expiresAt: 2000n, allocationValidBefore: 1000n, allocationNonce: bytes(56) };
  const intent = { intentVersion: 1n, target, instanceCommitment: state.instanceCommitment,
    contextHash: bytes(5), sessionCredentialCommitment: bytes(6), actionIdHash: bytes(7),
    resourceSelectorHash: bytes(8), resourceHash: bytes(9), purposeHash: bytes(10),
    recipientKindHash: bytes(11), recipientHash: bytes(12), disclosurePolicyIdHash: bytes(13),
    m5IntentCommitment: bytes(14), issuedAt: 450n, nonceHash: bytes(15) };
  const module = { moduleIdHash: bytes(16), moduleVersion: target.semanticVersion, implementationHash: bytes(17) };
  const initial = contract.initialState(createConstructorContext(undefined, '00'.repeat(32)),
    network, target.namespaceHash, bytes(18), { field: 0n }, 1n, 1n, { field: 0n }, 2n, 2n, 2n);
  const instance = { allocationCommitment: pure.runtimeInstanceAllocationCommitment(allocation),
    currentStateCommitment: pure.runtimeStateCommitment(state), transitionSequence: 3n, lifecycleStatus: 1n };
  const seeded = seedMap(initial.currentContractState.data, 'runtimeInstances', intent.instanceCommitment, instance);
  const args = [allocation, intent, state, 3n, bytes(19), bytes(20), 500n, 900n, true, module, bytes(21)];
  function run(options = {}) {
    const source = options.source ?? seeded;
    const before = plain(source).encode();
    const context = createCircuitContext(address, '00'.repeat(32), source, undefined, undefined, undefined, options.time ?? 500);
    const result = contract.circuits.testOnlyActionOutcome(context, ...(options.args ?? args));
    assert.deepEqual(plain(source).encode(), before, 'Generated-code evaluation must not rewrite the supplied immutable genesis');
    return { id: result.result, source: plain(result.context.currentQueryContext.state),
      view: ledger(result.context.currentQueryContext.state) };
  }
  return { address, args, state, intent, allocation, instance, seeded, run };
}
const cases = [];
async function check(name, body) {
  stage = name;
  console.log(JSON.stringify({ stage: name, kind: 'action-outcome-test-progress' }));
  await body(); cases.push({ name, result: 'PASS' });
}
let stage = 'start';
try {
  await check('state-update-nullifier-receipt-and-compact-sdk-hash-agree', async () => {
    const f = fixture(), result = f.run(), body = result.view.decisionReceipts.lookup(result.id);
    const next = pure.runtimeActionNextState(f.state, f.args[4], f.args[5], 500n, true);
    assert.deepEqual(result.view.runtimeInstances.lookup(f.intent.instanceCommitment), {
      ...f.instance, currentStateCommitment: pure.runtimeStateCommitment(next), transitionSequence: 4n });
    assert(result.view.usedRuntimeActionNullifiers.member(body.scopedNullifier));
    assert.deepEqual(pure.runtimeDecisionReceiptId(body), result.id);
    assert.equal(runtimeDecisionReceiptId(body), hex(result.id));
    const receipt = await readFinalizedDecisionReceipt({ readReceiptAtTransaction: async transactionId => ({
      network: 'undeployed', contract: hex(f.allocation.targetContractIdentity), transactionId,
      ledgerSequence: 10n, finalized: true, transactionSucceeded: true, receiptIdFromCall: hex(result.id),
      bodyAtTransaction: body,
    }) }, { network: 'undeployed', contract: hex(f.allocation.targetContractIdentity),
      transactionId: '00' + '21'.repeat(32), receiptId: hex(result.id) });
    assert.equal(receipt.transitionSequence, '4');
    assert.equal('nonce' in receipt, false);
    assert.equal('stateIdHash' in receipt, false);
    assert.equal(Object.keys(body).length, 18);
    assert.deepEqual(next.slotAssignmentsRoot, f.state.slotAssignmentsRoot);
    assert.deepEqual(next.slotBindingsRoot, f.state.slotBindingsRoot);
  });
  await check('non-transition-preserves-entire-instance-and-canonical-absent-receipt-state', () => {
    const f = fixture(), args = structuredClone(f.args);
    args[4] = f.state.stateIdHash; args[5] = f.state.nonce; args[8] = false;
    const result = f.run({ args }), body = result.view.decisionReceipts.lookup(result.id);
    assert.deepEqual(result.view.runtimeInstances.lookup(f.intent.instanceCommitment), f.instance);
    assert.equal(body.transitionSequence, 0n);
    assert.deepEqual(body.previousStateCommitment, bytes(0)); assert.deepEqual(body.nextStateCommitment, bytes(0));
    assert(result.view.usedRuntimeActionNullifiers.member(body.scopedNullifier));
    assert.equal(runtimeDecisionReceiptId(body), hex(result.id));
  });
  await check('conflicting-action-cannot-use-the-same-state-and-sequence', () => {
    const f = fixture(), first = f.run(), other = structuredClone(f.args);
    other[1].nonceHash = bytes(22);
    assert.throws(() => f.run({ source: first.source, args: other }), /stale against/);
  });
  await check('reused-nullifier-rejected-with-refreshed-state-witness', () => {
    const f = fixture(), first = f.run(), args = structuredClone(f.args);
    args[2] = pure.runtimeActionNextState(f.state, args[4], args[5], 500n, true);
    args[3] = 4n; args[5] = bytes(23); args[6] = 501n;
    assert.throws(() => f.run({ source: first.source, args, time: 501 }), /nullifier already consumed/);
  });
  await check('nullifier-stable-across-action-resource-deadline-state-changes', () => {
    const f = fixture(), original = pure.runtimeScopedActionNullifier(f.allocation, f.intent);
    for (const field of ['actionIdHash', 'resourceHash', 'm5IntentCommitment']) {
      assert.deepEqual(pure.runtimeScopedActionNullifier(f.allocation, { ...f.intent, [field]: bytes(24) }), original);
    }
    for (const field of ['contextHash', 'sessionCredentialCommitment', 'nonceHash']) {
      assert.notDeepEqual(pure.runtimeScopedActionNullifier(f.allocation, { ...f.intent, [field]: bytes(24) }), original);
    }
  });
  for (const [name, change] of [
    ['allocation-target', args => { args[0].target.templateContentHash = bytes(25); }],
    ['foreign-network', args => { args[0].targetNetworkHash = bytes(25); }],
    ['foreign-contract', args => { args[0].targetContractIdentity = bytes(25); }],
    ['altered-allocation', args => { args[0].allocationNonce = bytes(25); }],
    ['altered-opening', args => { args[2].nonce = bytes(25); }],
    ['stale-sequence', args => { args[3] = 2n; }],
    ['backdated-mutation', args => { args[6] = 399n; }],
    ['future-intent', args => { args[1].issuedAt = 501n; }],
    ['empty-intent-nonce', args => { args[1].nonceHash = bytes(0); }],
    ['reused-state-nonce', args => { args[5] = args[2].nonce; }],
    ['empty-output', args => { args[10] = bytes(0); }],
    ['invalid-window', args => { args[7] = 500n; }],
    ['non-transition-hidden-mutation', args => { args[8] = false; }],
  ]) await check(`reject-${name}`, () => {
    const f = fixture(), args = structuredClone(f.args); change(args); assert.throws(() => f.run({ args }));
  });
  await check('reject-expired-block-window', () => assert.throws(() => fixture().run({ time: 900 }), /proof window/));
  await check('reject-uint64-sequence-overflow', () => {
    const f = fixture(), sequence = 2n ** 64n - 1n;
    const source = seedMap(f.seeded, 'runtimeInstances', f.intent.instanceCommitment, { ...f.instance, transitionSequence: sequence });
    const args = structuredClone(f.args); args[3] = sequence;
    assert.throws(() => f.run({ args, source }), /overflow/);
  });
  await check('reject-inactive-instance', () => {
    const f = fixture(), source = seedMap(f.seeded, 'runtimeInstances', f.intent.instanceCommitment,
      { ...f.instance, lifecycleStatus: 2n });
    assert.throws(() => f.run({ source }), /stale against/);
  });
  stage = 'write-public-results';
  const result = { kind: 'test-only-action-outcome-core-generated-code-tests', observedAtUtc: new Date().toISOString(),
    sourceReport: reportPath, result: 'PASS', cases, compilerVersion: '0.31.1', runtimeVersion: '0.16.0',
    scriptSha256: hash(await readFile(new URL(import.meta.url))),
    sdkSha256: hash(await readFile('packages/midnight-authorization/src/decision-receipt.ts')),
    testOnlyEntryOmitsAuthorization: true, syntheticGenesis: true, realNodeOrFinalityTest: false,
    walletLoaded: false, transactionsSubmitted: 0, proofGenerated: false,
    ordinaryActionAcceptance: false, milestoneComplete: false };
  const output = `${directory}/verification-${Date.now()}.json`;
  await writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ result: 'PASS', passed: cases.length, output,
    testOnlyEntryOmitsAuthorization: true, ordinaryActionAcceptance: false, transactionsSubmitted: 0 }));
} catch (error) {
  const result = { result: 'FAIL', stage, errorType: error.name, detailsWithheld: true,
    frames: String(error.stack).split('\n').filter(line => /^\s+at /.test(line)).slice(0, 5)
      .map(line => line.replaceAll(process.cwd(), '<repo>')),
    cases, transactionsSubmitted: 0, ordinaryActionAcceptance: false };
  await writeFile(`${directory}/verification-failure-${Date.now()}.json`, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(result)); process.exitCode = 1;
}
