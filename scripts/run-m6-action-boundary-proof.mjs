import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';
import { postLoopbackProof, safeProofErrorChain } from './m6-action-proof-http.mjs';
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


// Isolated synthetic diagnostic. No wallet, chain submission or production key installation.
import { Proof, proofDataIntoSerializedPreimage, createCheckPayload, parseCheckResult, createProvingPayload } from '@midnight-ntwrk/midnight-js-protocol/ledger';
const mode = process.argv[2];
assert(process.argv.length === 3 && ['--prepare-only', '--check', '--prove'].includes(mode));
const directory = 'logs/m6-action-boundary-xFPDIN';
const generated = `${directory}/generated`;
const digest = value => createHash('sha256').update(value).digest('hex');
const expected = {
  bindings: '7b5394866b468fb8d96ba4446da4190baf65f99c60a880a370c27dde6948f7d7',
  metadata: 'a67a83664601967dbdc02817ac9a2f80329294d534da74f4d1edafd22a2997f7',
  binary: '8c15b683dfffa4139e8293340a7149c241b9abec67aa68f3693266e829b50ef6',
};
const codeFile = `${generated}/contract/index.js`, infoFile = `${generated}/compiler/contract-info.json`;
assert.equal(digest(await readFile(codeFile)), expected.bindings);
assert.equal(digest(await readFile(infoFile)), expected.metadata);
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


const circuit = 'diagnoseLedgerBoundActionAncestry';
let stage = 'synthetic-fixture';
const report = {
  kind: 'isolated-full-depth-action-proof-diagnostic', mode, inputHashes: expected,
  clientScriptSha256: digest(await readFile(new URL(import.meta.url))),
  bindingsAndMetadataHashesVerified: true, binaryHashVerified: false,
  ancestryDepth: 16, capabilities: 17, accounts: 17, sessions: 1, selectedStatusLeaves: 35,
  syntheticGenesisNotActualIssuance: true, entireEncodedLedgerStatePreserved: false,
  walletLoaded: false, transactionsSubmitted: 0, newDeployment: false,
  realConstraintCheckPassed: false, realProofGenerated: false, proofFormatValidated: false,
  proofIndependentlyVerified: false, proofArtifactPersisted: false,
  ordinaryActionAcceptance: false, endUserResourceQualification: false, milestoneComplete: false,
  privatePreimageOrWitnessPersisted: false, automaticRetries: 0,
};
async function request(endpoint, payload) {
  return postLoopbackProof(endpoint, payload);
}
async function preparePayloadInDisposableWorker(preimage, assets) {
  const worker = new Worker(new URL('./m6-action-proof-payload-worker.mjs', import.meta.url), {
    workerData: { kind: 'm6-synthetic-action-payload', preimage, assets },
    resourceLimits: { maxOldGenerationSizeMb: 3072 },
  });
  let ended = false;
  try {
    const message = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Payload preparation time bound')), 600_000);
      timeout.unref();
      worker.once('message', value => { clearTimeout(timeout); resolve(value); });
      worker.once('error', error => { clearTimeout(timeout); reject(error); });
      worker.once('exit', code => {
        if (code !== 0) { clearTimeout(timeout); reject(new Error('Payload worker exited')); }
      });
    });
    assert(!message.failed && message.keyMaterialHashesVerified && message.officialLedgerPayloadApiUsed);
    assert(message.payload instanceof Uint8Array && message.payload.length > 0);
    await worker.terminate(); ended = true;
    return message.payload;
  } finally {
    if (!ended) await worker.terminate();
  }
}
try {
  const f = fixture(17);
  const stale = structuredClone(f.args); stale[11] += 1n;
  assert.throws(() => f.run({ args: stale }), /stale against/);
  const altered = structuredClone(f.args); altered[1].m5IntentCommitment = bytes(222);
  assert.throws(() => f.run({ args: altered }), /signature/i);
  const result = f.run(), data = result.proofData;
  report.entireEncodedLedgerStatePreserved = true;
  assert(data && data.input && data.output && data.publicTranscript && data.privateTranscriptOutputs);
  const preimage = proofDataIntoSerializedPreimage(data.input, data.output, data.publicTranscript, data.privateTranscriptOutputs, circuit);
  Object.assign(report, { preimagePrepared: true, preflightNegatives: 2, preimageBytes: preimage.length });
  console.log(JSON.stringify({ event: 'synthetic-action-preimage-prepared', ...report }));
  if (mode !== '--prepare-only') {
    assert.equal(process.platform, 'linux');
    stage = 'constraint-check';
    const assets = 'logs/m6-action-keygen-ecs-v8';
    const ir = await readFile(`${assets}/${circuit}.bzkir`);
    assert.equal(digest(ir), expected.binary);
    report.binaryHashVerified = true;
    const start = performance.now();
    const checkResult = parseCheckResult(await request('/check', createCheckPayload(preimage, ir)));
    Object.assign(report, { realConstraintCheckPassed: true, constraintCheckMs: performance.now()-start, checkedCostEntries: checkResult.length });
    console.log(JSON.stringify({ event: 'action-constraint-check-passed', ...report }));
    if (mode === '--prove') {
      stage = 'key-verification';
      stage = 'payload-serialization';
      const payload = await preparePayloadInDisposableWorker(preimage, assets);
      Object.assign(report, { keyMaterialHashesVerifiedInWorker: true, temporaryPayloadWorkerTerminatedBeforeHttp: true, officialLedgerPayloadApiUsed: true });
      report.provingPayloadBytes = payload.length;
      console.log(JSON.stringify({ event: 'action-proving-payload-prepared', payloadBytes: payload.length, processMemory: process.memoryUsage() }));
      stage = 'real-proof';
      const started = performance.now();
      const proof = await request('/prove', payload);
      assert(proof.length > 0); Proof.deserialize(proof);
      await writeFile(`${directory}/isolated-action-proof.bin`, proof, { flag: 'wx', mode: 0o600 });
      Object.assign(report, { realProofGenerated: true, proofFormatValidated: true, proofArtifactPersisted: true, proofBytes: proof.length, proofSha256: digest(proof), elapsedProofMs: performance.now()-started });
    }
  }
  report.processMemoryAtEnd = process.memoryUsage();
  const output = `${directory}/isolated-action-proof-${Date.now()}.json`;
  await writeFile(output, JSON.stringify({ ...report, result: 'PASS', completedAtUtc: new Date().toISOString() }, null, 2)+'\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ event: 'action-proof-diagnostic-ended', output, result: 'PASS', ...report }));
} catch (error) {
  const output = `${directory}/isolated-action-proof-failure-${Date.now()}.json`;
  const failure = { ...report, result: 'FAIL', stage, errorType: error.name, safeErrorChain: safeProofErrorChain(error), detailsWithheld: true, completedAtUtc: new Date().toISOString() };
  await writeFile(output, JSON.stringify(failure, null, 2)+'\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ output, ...failure })); process.exitCode = 1;
}
