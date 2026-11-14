import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  Bytes32Descriptor, CompactTypeBoolean, CompactTypeField, CompactTypeUnsignedInteger,
  CompactTypeMerkleTreeDigest, CompactTypeMerkleTreePath, StateBoundedMerkleTree,
  StateValue, ChargedState, createCircuitContext, createConstructorContext, dummyContractAddress,
  persistentHash,
} from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  CredentialStatusTree, buildRuntimeScopeTrees, buildRuntimeActionScopePaths,
  governanceActivatorPublicKey, hashProtocolIdentifier, hashRuntimeIdentifier,
  permioAuthorizationWitnesses, prepareRuntimeActiveAncestry,
  signRuntimeActionIntent, signRuntimeSessionCredential, createRuntimeStatusMultiproof,
} from '../packages/midnight-authorization/src/index.ts';
import { unitInstanceBinding, unitNamespaceIssuer } from '../packages/midnight-authorization/test/fixtures/instance-binding.ts';

assert.equal(process.argv.length, 3);
const input = process.argv[2];
assert(/^logs\/m6-action-boundary-[A-Za-z0-9]{6}\/report\.json$/.test(input));
const directory = path.dirname(input), generated = `${directory}/generated`;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const report = JSON.parse(await readFile(input, 'utf8'));
assert.equal(report.outcome.code, 0);
for (const [file, hash] of Object.entries(report.baseProductionHashes)) assert.equal(digest(await readFile(file)), hash);
const codeFile = `${generated}/contract/index.js`, infoFile = `${generated}/compiler/contract-info.json`;
const info = JSON.parse(await readFile(infoFile, 'utf8'));
assert.equal(info['compiler-version'], '0.31.1');
assert.equal(info['runtime-version'], '0.16.0');
const { Contract, pureCircuits: pure, ledger } = await import(pathToFileURL(path.resolve(codeFile)).href);
const bytes = value => new Uint8Array(32).fill(value);

// Synthetic genesis fixtures only. No M4 review, issuance or live-chain result
// is inferred from directly seeded simulator records.
function descriptor(type) {
  if (type['type-name'] === 'Bytes') { assert.equal(type.length, 32); return Bytes32Descriptor; }
  if (type['type-name'] === 'Uint') {
    const bits = Math.ceil(Math.log2(type.maxval + 1));
    return new CompactTypeUnsignedInteger((1n << BigInt(bits)) - 1n, Math.ceil(bits / 8));
  }
  if (type['type-name'] === 'Field') return CompactTypeField;
  if (type['type-name'] === 'Boolean') return CompactTypeBoolean;
  assert.equal(type['type-name'], 'Struct');
  const fields = type.elements.map(field => [field.name, descriptor(field.type)]);
  return {
    alignment: () => fields.flatMap(([, type]) => type.alignment()),
    toValue: value => fields.flatMap(([name, type]) => type.toValue(value[name])),
  };
}
function empty(type) {
  if (type['type-name'] === 'Bytes') return bytes(0);
  if (type['type-name'] === 'Uint' || type['type-name'] === 'Field') return 0n;
  if (type['type-name'] === 'Boolean') return false;
  assert.equal(type['type-name'], 'Struct');
  return Object.fromEntries(type.elements.map(field => [field.name, empty(field.type)]));
}
function typeFor(name) {
  const found = info.circuits.flatMap(entry => entry.arguments).find(argument =>
    argument.type['type-name'] === 'Struct' && argument.type.name === name);
  assert(found, `Missing generated type: ${name}`); return found.type;
}
function seedMap(state, name, key, value) {
  if (state instanceof ChargedState) state = state.state;
  const schema = info.ledger.find(entry => entry.name === name);
  assert.equal(schema.storage, 'Map');
  const keyType = descriptor(schema.key), valueType = descriptor(schema.value);
  const alignedKey = { value: keyType.toValue(key), alignment: keyType.alignment() };
  const cell = StateValue.newCell({ value: valueType.toValue(value), alignment: valueType.alignment() });
  function replace(node, route) {
    if (route.length === 0) {
      const map = node.asMap(); assert(map); return StateValue.newMap(map.insert(alignedKey, cell));
    }
    const array = node.asArray(); assert(array && array[route[0]]);
    return array.reduce((result, child, index) => result.arrayPush(index === route[0]
      ? replace(child, route.slice(1)) : child), StateValue.newArray());
  }
  const next = replace(state, schema.index);
  assert.deepEqual(ledger(next)[name].lookup(key), value);
  return next;
}

let fixtureStage = 'start';
function fixture(count = 2) {
  const namespace = 'm6-action-boundary-unit';
  const target = { namespaceHash: new Uint8Array(Buffer.from(hashProtocolIdentifier('namespace', namespace).slice(2), 'hex')),
    templateIdHash: bytes(1), semanticVersion: { major: 1n, minor: 0n, patch: 0n }, templateContentHash: bytes(2) };
  const common = { target, instanceCommitment: bytes(3), contextHash: bytes(4) };
  const scope = buildRuntimeScopeTrees({ actions: ['authorize'], resourceSelectors: ['item-id'], resources: ['item-one'],
    purposes: ['support'], recipientKinds: ['organization'], recipients: ['recipient-one'], disclosurePolicyIds: ['minimum'] });
  const position = index => BigInt(Math.floor(index * (2 ** 20) / (2 * count + 1)));
  const accounts = Array.from({ length: count }, (_, index) => ({ ...common, credentialVersion: 1n,
    accountIdHash: bytes(index + 5), principalKind: 1n, m5AccountCommitment: bytes(index + 30),
    runtimePublicKey: governanceActivatorPublicKey(BigInt(index + 31)), statusIndex: position(index * 2),
    issuedAt: 100n, validBefore: 3_000n }));
  fixtureStage = 'account-commitments';
  const accountHashes = accounts.map(account => pure.runtimeAccountCredentialCommitment(account)), capabilities = [];
  for (let index = 0; index < count; index++) capabilities.push({ ...common, credentialVersion: 3n,
    namespaceIssuerAuthorityCommitment: bytes(150), grantIdHash: bytes(index + 60), m5GrantCommitment: bytes(index + 90),
    subjectAccountCredentialCommitment: accountHashes[index],
    parentCapabilityCredentialCommitment: index ? pure.runtimeCapabilityCredentialCommitment(capabilities[index - 1]) : bytes(0),
    issuerAccountCredentialCommitment: index ? accountHashes[index - 1] : bytes(0),
    scopeRoots: scope.roots, scopeCounts: { actionsCount: 1n, resourceSelectorsCount: 1n, resourcesCount: 1n,
      purposesCount: 1n, recipientKindsCount: 1n, recipientsCount: 1n, disclosurePolicyIdsCount: 1n },
    notBefore: BigInt(100 + index), expiresAt: BigInt(2_000 - index), delegationDepth: BigInt(index),
    maxDelegationDepth: 16n, statusIndex: position(index * 2 + 1), issuedAt: BigInt(100 + index) });
  const session = { ...common, credentialVersion: 2n, sessionIdHash: bytes(120), m5SessionCommitment: bytes(121),
    subjectAccountCredentialCommitment: accountHashes[count - 1],
    capabilityCredentialCommitment: pure.runtimeCapabilityCredentialCommitment(capabilities[count - 1]),
    scopeRoots: scope.roots, scopeCounts: capabilities[count - 1].scopeCounts,
    runtimePublicKey: governanceActivatorPublicKey(131n), notBefore: 200n, expiresAt: 1_000n,
    statusIndex: position(count * 2), issuedAt: 200n };
  fixtureStage = 'status-tree';
  const statusTree = new CredentialStatusTree();
  accounts.forEach((account, index) => statusTree.issue({ namespace, kind: 'account', statusIndex: account.statusIndex,
    credentialCommitment: accountHashes[index], revocationAuthorityAccountCredentialCommitment: accountHashes[index] }));
  capabilities.forEach(capability => statusTree.issue({ namespace, kind: 'capability', statusIndex: capability.statusIndex,
    credentialCommitment: pure.runtimeCapabilityCredentialCommitment(capability),
    revocationAuthorityAccountCredentialCommitment: capability.issuerAccountCredentialCommitment }));
  statusTree.issue({ namespace, kind: 'session', statusIndex: session.statusIndex,
    credentialCommitment: pure.runtimeSessionCredentialCommitment(session), revocationAuthorityAccountCredentialCommitment: accountHashes[count - 1] });
  fixtureStage = 'active-ancestry';
  const ancestry = prepareRuntimeActiveAncestry({ accounts, capabilities, session, statusTree, now: 500n });
  const intent = { ...common, intentVersion: 1n, sessionCredentialCommitment: pure.runtimeSessionCredentialCommitment(session),
    ...Object.fromEntries([['actionIdHash', 'action-id', 'authorize'], ['resourceSelectorHash', 'resource-selector', 'item-id'],
      ['resourceHash', 'resource', 'item-one'], ['purposeHash', 'purpose', 'support'], ['recipientKindHash', 'recipient-kind', 'organization'],
      ['recipientHash', 'recipient', 'recipient-one'], ['disclosurePolicyIdHash', 'disclosure-policy-id', 'minimum'],
      ['nonceHash', 'intent-nonce', 'intent-one']].map(([field, domain, value]) => [field, hashRuntimeIdentifier(domain, value)])),
    m5IntentCommitment: bytes(141), issuedAt: 400n };
  fixtureStage = 'policy';
  const policy = { ...empty(typeFor('RuntimeTemplateActionPolicy')), policyVersion: 2n, target,
    bindingActionIdHash: bytes(160), actionIdHash: intent.actionIdHash, proofProfileIdHash: bytes(161), proofFamilyHash: bytes(162),
    contextHash: common.contextHash, resourceSelectorHash: intent.resourceSelectorHash, purposeHash: intent.purposeHash,
    recipientKindHash: intent.recipientKindHash, disclosurePolicyIdHash: intent.disclosurePolicyIdHash,
    maxCapabilityDuration: 1_000n, maxDelegationDepth: 16n, slotAssignmentRuleCount: 1n };
  const binding = { bindingVersion: 1n, actionIndex: 0n, actionIdHash: policy.bindingActionIdHash,
    proofProfileIdHash: policy.proofProfileIdHash, moduleIdHash: policy.proofFamilyHash,
    moduleVersion: { major: 1n, minor: 0n, patch: 0n }, implementationHash: bytes(163),
    configurationHash: pure.runtimeTemplateActionPolicyCommitment(policy), receiptSchemaHash: bytes(164) };
  const aligned = { value: Bytes32Descriptor.toValue(pure.proofModuleBindingCommitment(binding)), alignment: Bytes32Descriptor.alignment() };
  const bindingTree = new StateBoundedMerkleTree(20).update(0n, aligned).rehash();
  const bindingRoot = CompactTypeMerkleTreeDigest.fromValue(bindingTree.root().value);
  const bindingPath = new CompactTypeMerkleTreePath(20, Bytes32Descriptor).fromValue(bindingTree.pathForLeaf(0n, aligned).value);
  const template = { ...empty(typeFor('ActiveTemplateRecord')), target, lifecycleStatus: 1n,
    proofModuleBindingRoot: bindingRoot, proofModuleBindingCount: 1n };
  const identity = { moduleIdHash: binding.moduleIdHash, moduleVersion: binding.moduleVersion, implementationHash: binding.implementationHash };
  const module = { ...empty(typeFor('ProofModuleRecord')), identity, lifecycleStatus: 4n, receiptSchemaHash: binding.receiptSchemaHash };
  fixtureStage = 'allocation';
  const address = dummyContractAddress(), contract = new Contract(permioAuthorizationWitnesses);
  const allocationWitness = unitInstanceBinding(unitNamespaceIssuer(namespace), accounts[0]);
  const state = { ...allocationWitness.state, lastMutationAt: 500n };
  const allocation = { ...allocationWitness.allocation, targetContractIdentity: new Uint8Array(Buffer.from(address, 'hex')) };
  const initial = contract.initialState(createConstructorContext(undefined, '00'.repeat(32)), allocation.targetNetworkHash,
    target.namespaceHash, bytes(0), { field: 0n }, 1n, 1n, statusTree.root, 2n, 2n, 2n);
  const templateKey = persistentHash(descriptor(typeFor('TemplateRegistryTarget')), target);
  const moduleKey = pure.proofModuleRegistryKeyFromIdentity(identity);
  fixtureStage = 'seed-ledger';
  let seeded = initial.currentContractState.data;
  for (const [name, key, value] of [
    ['credentialStatusRoots', target.namespaceHash, { root: statusTree.root, rootSequence: statusTree.sequence }],
    ['runtimeInstances', common.instanceCommitment, { allocationCommitment: pure.runtimeInstanceAllocationCommitment(allocation),
      currentStateCommitment: pure.runtimeStateCommitment(state), transitionSequence: 5n, lifecycleStatus: 1n }],
    ['activeTemplates', templateKey, template], ['proofModules', moduleKey, module],
  ]) seeded = seedMap(seeded, name, key, value);
  const args = [ancestry, intent, signRuntimeSessionCredential(session, BigInt(30 + count), 151n),
    signRuntimeActionIntent(intent, 131n, 157n), buildRuntimeActionScopePaths(intent, scope), buildRuntimeActionScopePaths(intent, scope),
    allocation, state, 5n, 1n, 1n, statusTree.sequence, policy, binding, bindingPath, 500n, 900n];
  function run(overrides = {}) {
    const source = overrides.seeded ?? seeded;
    const context = createCircuitContext(address, '00'.repeat(32), source, undefined, undefined, undefined, overrides.time ?? 500);
    const result = contract.circuits.diagnoseLedgerBoundActionAncestry(context, ...(overrides.args ?? args));
    assert.equal(result.result, true);
    const after = result.context.currentQueryContext.state;
    assert.deepEqual((after instanceof ChargedState ? after.state : after).encode(),
      (source instanceof ChargedState ? source.state : source).encode());
    return result;
  }
  return { args, run, seeded, template, templateKey, module, moduleKey, target, statusTree, accountHashes };
}

const cases = []; let stage = 'fixtures';
function check(name, body) { stage = name; body(); cases.push({ name, result: 'PASS' }); }
try {
  const f = fixture();
  check('positive-current-ledger-boundary-leaves-state-unchanged', () => f.run());
  check('full-depth16-and-35-current-memberships', () => fixture(17).run());
  for (const [name, offset] of [['state-sequence', 8], ['authority-version', 9], ['authority-sequence', 10], ['status-sequence', 11]]) {
    check(`reject-stale-${name}`, () => {
      const args = structuredClone(f.args); args[offset] += 1n;
      assert.throws(() => f.run({ args }), /stale against/);
    });
  }
  check('reject-revoked-template', () => assert.throws(() => f.run({ seeded: seedMap(f.seeded, 'activeTemplates', f.templateKey,
    { ...f.template, lifecycleStatus: 3n }) }), /active-template baseline/));
  check('reject-revoked-module', () => assert.throws(() => f.run({ seeded: seedMap(f.seeded, 'proofModules', f.moduleKey,
    { ...f.module, lifecycleStatus: 6n }) }), /active-module baseline/));
  check('reject-altered-signed-intent', () => {
    const args = structuredClone(f.args); args[1].m5IntentCommitment = bytes(222);
    assert.throws(() => f.run({ args }), /signature/i);
  });
  check('reject-unauthorized-session-key', () => {
    const args = structuredClone(f.args); args[3] = signRuntimeActionIntent(args[1], 999n, 167n);
    assert.throws(() => f.run({ args }), /signature/i);
  });
  check('reject-altered-scope-path', () => {
    const args = structuredClone(f.args); args[4].resources.leaf = bytes(223);
    assert.throws(() => f.run({ args }), /scope/);
  });
  check('reject-altered-private-state', () => {
    const args = structuredClone(f.args); args[7].nonce = bytes(224);
    assert.throws(() => f.run({ args }), /stale against.*state/);
  });
  check('reject-backdated-operation', () => {
    const args = structuredClone(f.args); args[15] = 499n;
    assert.throws(() => f.run({ args }), /stale against.*state/);
  });
  check('reject-expired-proof-window', () => assert.throws(() => f.run({ time: 901 }), /proof window/));
  check('reject-deadline-beyond-signed-session', () => {
    const args = structuredClone(f.args); args[16] = 1_001n;
    assert.throws(() => f.run({ args }), /deadline exceeds.*session/);
  });
  check('reject-missing-exact-session-status-membership', () => {
    const args = structuredClone(f.args);
    const index = Number(args[0].statusProof.leafCount) - 1;
    assert.equal(args[0].statusProof.leaves[index].statusIndex, args[0].session.statusIndex);
    args[0].statusProof.leaves[index].leaf = bytes(249);
    assert.throws(() => f.run({ args }), /exact active credential/);
  });
  check('reject-session-terminal-account-substitution', () => {
    const args = structuredClone(f.args); args[0].session.subjectAccountCredentialCommitment = bytes(248);
    assert.throws(() => f.run({ args }), /exact terminal capability and account/);
  });
  check('reject-witness-for-another-current-status-root', () => {
    const seeded = seedMap(f.seeded, 'credentialStatusRoots', f.target.namespaceHash,
      { root: { field: 0n }, rootSequence: f.statusTree.sequence });
    assert.throws(() => f.run({ seeded }), /root/i);
  });
  check('reject-revoked-root-ancestor-with-a-fresh-membership-proof', () => {
    const args = structuredClone(f.args), root = args[0].capabilities[0];
    f.statusTree.revoke({ namespace: 'm6-action-boundary-unit', kind: 'capability', statusIndex: root.statusIndex,
      credentialCommitment: pure.runtimeCapabilityCredentialCommitment(root),
      revocationAuthorityAccountCredentialCommitment: root.issuerAccountCredentialCommitment });
    const indices = args[0].statusProof.leaves.slice(0, Number(args[0].statusProof.leafCount)).map(leaf => leaf.statusIndex);
    args[0].statusProof = createRuntimeStatusMultiproof(f.statusTree.multiproofFor(indices));
    args[11] = f.statusTree.sequence;
    const seeded = seedMap(f.seeded, 'credentialStatusRoots', f.target.namespaceHash,
      { root: f.statusTree.root, rootSequence: f.statusTree.sequence });
    assert.throws(() => f.run({ args, seeded }), /exact active credential/);
  });
  for (const [name, kind, index] of [
    ['root-account', 'account', 0], ['middle-capability', 'capability', 8],
    ['terminal-account', 'account', 16], ['session', 'session', 0],
  ]) {
    check(`full-depth16-reject-revoked-${name}-with-fresh-membership`, () => {
      const full = fixture(17), args = structuredClone(full.args), ancestry = args[0];
      const credential = kind === 'session' ? ancestry.session
        : kind === 'account' ? ancestry.accounts[index] : ancestry.capabilities[index];
      const commitment = kind === 'session' ? pure.runtimeSessionCredentialCommitment(credential)
        : kind === 'account' ? pure.runtimeAccountCredentialCommitment(credential)
        : pure.runtimeCapabilityCredentialCommitment(credential);
      const authority = kind === 'session' ? full.accountHashes[16]
        : kind === 'account' ? full.accountHashes[index] : credential.issuerAccountCredentialCommitment;
      full.statusTree.revoke({ namespace: 'm6-action-boundary-unit', kind,
        statusIndex: credential.statusIndex, credentialCommitment: commitment,
        revocationAuthorityAccountCredentialCommitment: authority });
      const indices = ancestry.statusProof.leaves.slice(0, Number(ancestry.statusProof.leafCount))
        .map(leaf => leaf.statusIndex);
      ancestry.statusProof = createRuntimeStatusMultiproof(full.statusTree.multiproofFor(indices));
      args[11] = full.statusTree.sequence;
      const seeded = seedMap(full.seeded, 'credentialStatusRoots', full.target.namespaceHash,
        { root: full.statusTree.root, rootSequence: full.statusTree.sequence });
      assert.throws(() => full.run({ args, seeded }), /exact active credential/);
    });
  }
  check('full-depth16-reject-session-terminal-account-substitution', () => {
    const full = fixture(17), args = structuredClone(full.args);
    args[0].session.subjectAccountCredentialCommitment = full.accountHashes[0];
    assert.throws(() => full.run({ args }), /exact terminal capability and account/);
  });
  const output = `${directory}/generated-tests-${Date.now()}.json`;
  const result = { kind: 'generated-ledger-bound-action-diagnostic-simulation', result: 'PASS', observedAtUtc: new Date().toISOString(),
    cases, sourceReport: input, verifierScriptSha256: digest(await readFile(new URL(import.meta.url))),
    inputHashes: { [input]: digest(await readFile(input)), [codeFile]: digest(await readFile(codeFile)),
      [infoFile]: digest(await readFile(infoFile)) }, syntheticGenesisNotActualIssuance: true,
    allPositiveCasesPreserveEntireEncodedLedgerState: true, fixturesOrWitnessValuesExported: false,
    transactionsSubmitted: 0, ordinaryActionAcceptance: false, milestoneComplete: false };
  await writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ output, result: 'PASS', passed: cases.length, transactionsSubmitted: 0, ordinaryActionAcceptance: false }));
} catch (error) {
  const failure = { kind: 'generated-ledger-bound-action-diagnostic-simulation', result: 'FAIL', stage, fixtureStage, errorType: error.name,
    errorFrames: String(error.stack).split('\n').filter(line => /^\s+at /.test(line)).slice(0,5).map(line => line.replaceAll(process.cwd(), '<repo>')),
    completedCases: cases, detailsWithheld: true, transactionsSubmitted: 0 };
  await writeFile(`${directory}/generated-tests-failure-${Date.now()}.json`, JSON.stringify(failure, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(failure)); process.exitCode = 1;
}
