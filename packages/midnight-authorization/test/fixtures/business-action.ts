import { createCircuitContext, createConstructorContext, sampleContractAddress, persistentHash,
  ChargedState, type StateValue } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { Contract, ledger, pureCircuits as pure, type RuntimeAccountCredential,
  type RuntimeCapabilityCredential, type RuntimeSessionCredential, type RuntimeActionIntent,
  type RuntimeSlotRecord, type RuntimeSlotAncestryStep, type RuntimeBusinessRecord } from "../../contracts/managed/permio-authorization-v11/contract/index.js";
import { signRuntimeBusinessRecord } from "../../src/business-predicates.ts";
import { permioAuthorizationWitnesses, governanceActivatorPublicKey, signRuntimeSessionCredential,
  signRuntimeActionIntent, signRuntimeActionCommand } from "../../src/compact-crypto.ts";
import { createRuntimeBusinessTemplateActionPolicy, createRuntimeBusinessPolicyBindingManifest } from "../../src/business-template-policy.ts";
import { buildProofModuleBindingTree } from "../../src/binding-manifest.ts";
import { hashProtocolIdentifier, orderProofModuleBindings } from "../../src/canonical.ts";
import { CredentialStatusTree } from "../../src/credential-status.ts";
import { buildRuntimeScopeTrees, hashRuntimeIdentifier } from "../../src/runtime-credentials.ts";
import { buildAuthorityRoot } from "../../src/authority-root.ts";
import { RuntimePrivateMap } from "../../src/private-map.ts";
import { prepareRuntimeActiveAncestry } from "../../src/active-ancestry.ts";
import { buildRuntimeActionScopePaths } from "../../src/action-scope.ts";
import { createRuntimeBusinessActionCommand, createRuntimeActionEvidencePlan,
  advanceRuntimeActionSlotProgress, advanceRuntimeActionEvidenceProgress } from "../../src/business-action-execution.ts";
import { parseScenarioTemplate } from "@permio/scenario-domain";
import { emptyGeneratedMapValue, emptyGeneratedValue, generatedDescriptor, generatedInfo, seedGeneratedMap } from "./generated-genesis-v11.ts";

export const testBytes = (value: number) => new Uint8Array(32).fill(value);
const hex = (value: Uint8Array) => `0x${Buffer.from(value).toString("hex")}` as const;

/** Crypto-valid synthetic genesis; no M4 review, chain issuance or finality claim. */
export function businessActionFixture(options: { slots?: number; capabilities?: number;
  revokedSlot?: number; transitioning?: boolean; preservedStatusLeaves?: boolean;
  predicateKinds?: readonly (1 | 2 | 3)[]; differentRootOnSecondPredicate?: boolean } = {}) {
  const slotCount = options.slots ?? 1, capabilityCount = options.capabilities ?? 1;
  const transitioning = options.transitioning ?? true;
  const statusOffset=options.preservedStatusLeaves ? 10 : 0;
  const kinds = options.predicateKinds ?? [1];
  if (options.differentRootOnSecondPredicate && (kinds.length !== 2 || kinds.some(kind => kind !== 1))) {
    throw new TypeError("Different-root fixture requires exactly two current-record predicates");
  }
  const inputTypes = kinds.includes(2) || options.differentRootOnSecondPredicate ? ["record-one", "record-two"] : ["record-one"];
  const outputTypes = kinds.map((_, index) => index === 0 ? "claim-one" : `claim-${index + 1}`);
  const template = parseScenarioTemplate({ schemaVersion: 2, namespace: "test.ordinary", templateId: "test.ordinary/action",
    version: "1.0.0", displayName: "Synthetic action", description: "Generated-code authorization fixture.",
    participantSlots: [{ id: "requester", description: "Required actor", assignableBy: ["@instance-creator", "requester"] }],
    contexts: [{ id: "context-one", description: "Isolated context", allowedSlotIds: ["requester"],
      recordTypes: inputTypes, claimTypes: outputTypes, recipientKinds: ["organization"], purposes: ["purpose-one"] }],
    states: transitioning ? ["ready", "done"] : ["ready"], initialState: "ready",
    actions: [{ id: "perform", description: "One ordinary action", contextId: "context-one", actorSlotId: "requester",
      inputRecordTypes: inputTypes, outputClaimTypes: outputTypes, purpose: "purpose-one",
      recipientKind: "organization", capabilityRuleId: "perform-rule", proofProfileId: "action-proof", executionAdapterId: null }],
    transitions: [{ id: "perform-transition", actionId: "perform", fromState: "ready", toState: transitioning ? "done" : "ready" }],
    capabilityRules: [{ id: "perform-rule", description: "Scoped action", actionIds: ["perform"],
      resourceSelector: "item-id", purpose: "purpose-one", recipientConstraint: "organization", validForSeconds: 2000,
      maxDelegationDepth: 16, disclosurePolicyId: "minimal", revocable: true }],
    proofProfiles: [{ id: "action-proof", circuitId: "private-state-transition-predicates-v1",
      publicOutputSchemaId: "decision-receipt-v1", predicates: kinds.map((kind, index) => ({
        kind: kind === 1 ? "current-record-v1" : kind === 2 ? "bounded-value-v1" : "audit-acknowledgment-v1",
        inputRecordType: options.differentRootOnSecondPredicate ? inputTypes[index]! : "record-one", outputClaimType: outputTypes[index]!,
        ...(kind === 2 ? { ceilingRecordType: "record-two" } : {}),
      })) }], executionAdapters: [],
    privacyInvariants: [{ id: "private-witness", description: "No private payload appears in the receipt." }],
  });
  const projection = createRuntimeBusinessTemplateActionPolicy(template, "perform"), target = projection.policy.target;
  const common = { target, instanceCommitment: testBytes(30), contextHash: projection.policy.contextHash };
  const issuer = { leafVersion: 1n, namespaceHash: target.namespaceHash, governancePolicyHash: testBytes(0), authorityKind: 6n,
    publicKey: governanceActivatorPublicKey(11n), validAfter: 0n, validBefore: 2000n };
  const authority = buildAuthorityRoot([issuer]);
  const scope = buildRuntimeScopeTrees({ actions: ["perform"], resourceSelectors: ["item-id"], resources: ["item-one"],
    purposes: ["purpose-one"], recipientKinds: ["organization"], recipients: ["recipient-one"], disclosurePolicyIds: ["minimal"] });
  const accounts: RuntimeAccountCredential[] = Array.from({ length: capabilityCount }, (_, index) => ({
    ...common, credentialVersion: 1n, accountIdHash: testBytes(40 + index), principalKind: 1n,
    m5AccountCommitment: testBytes(60 + index), runtimePublicKey: governanceActivatorPublicKey(BigInt(31 + index)),
    statusIndex: BigInt(statusOffset + index * 2), issuedAt: 100n, validBefore: 1800n,
  }));
  const accountHashes = accounts.map(account => pure.runtimeAccountCredentialCommitment(account));
  const capabilities: RuntimeCapabilityCredential[] = [];
  const counts = { actionsCount: 1n, resourceSelectorsCount: 1n, resourcesCount: 1n, purposesCount: 1n,
    recipientKindsCount: 1n, recipientsCount: 1n, disclosurePolicyIdsCount: 1n };
  for (let index = 0; index < capabilityCount; index++) capabilities.push({ ...common, credentialVersion: 3n,
    grantIdHash: testBytes(80 + index), m5GrantCommitment: testBytes(100 + index),
    subjectAccountCredentialCommitment: accountHashes[index]!,
    parentCapabilityCredentialCommitment: index ? pure.runtimeCapabilityCredentialCommitment(capabilities[index - 1]!) : testBytes(0),
    issuerAccountCredentialCommitment: index ? accountHashes[index - 1]! : testBytes(0),
    namespaceIssuerAuthorityCommitment: pure.governanceActivatorLeafCommitment(issuer), scopeRoots: scope.roots,
    scopeCounts: counts, notBefore: BigInt(110 + index), expiresAt: BigInt(1600 - index),
    delegationDepth: BigInt(index), maxDelegationDepth: 16n, statusIndex: BigInt(statusOffset + index * 2 + 1), issuedAt: BigInt(110 + index) });
  const alternateBusinessRoot = options.differentRootOnSecondPredicate ? {
    ...capabilities[0]!, grantIdHash: testBytes(239), m5GrantCommitment: testBytes(240), statusIndex: 100n,
  } : undefined;
  const terminal = accounts.at(-1)!;
  const session: RuntimeSessionCredential = { ...common, credentialVersion: 2n, sessionIdHash: testBytes(130), m5SessionCommitment: testBytes(131),
    subjectAccountCredentialCommitment: accountHashes.at(-1)!, capabilityCredentialCommitment: pure.runtimeCapabilityCredentialCommitment(capabilities.at(-1)!),
    scopeRoots: scope.roots, scopeCounts: counts, runtimePublicKey: governanceActivatorPublicKey(131n),
    notBefore: 200n, expiresAt: 1400n, statusIndex: BigInt(statusOffset + capabilityCount * 2), issuedAt: 200n };
  const status = new CredentialStatusTree();
  if(options.preservedStatusLeaves) for(let i=0;i<3;i++) status.issue({namespace:template.namespace,kind:(["account","capability","session"] as const)[i]!,
    statusIndex:BigInt(7+i),credentialCommitment:testBytes(230+i),revocationAuthorityAccountCredentialCommitment:testBytes(231+i)});
  accounts.forEach((account, index) => status.issue({ namespace: template.namespace, kind: "account", statusIndex: account.statusIndex,
    credentialCommitment: accountHashes[index]!, revocationAuthorityAccountCredentialCommitment: accountHashes[index]! }));
  capabilities.forEach(capability => status.issue({ namespace: template.namespace, kind: "capability", statusIndex: capability.statusIndex,
    credentialCommitment: pure.runtimeCapabilityCredentialCommitment(capability),
    revocationAuthorityAccountCredentialCommitment: capability.issuerAccountCredentialCommitment }));
  if (alternateBusinessRoot) status.issue({ namespace: template.namespace, kind: "capability", statusIndex: alternateBusinessRoot.statusIndex,
    credentialCommitment: pure.runtimeCapabilityCredentialCommitment(alternateBusinessRoot),
    revocationAuthorityAccountCredentialCommitment: alternateBusinessRoot.issuerAccountCredentialCommitment });
  status.issue({ namespace: template.namespace, kind: "session", statusIndex: session.statusIndex,
    credentialCommitment: pure.runtimeSessionCredentialCommitment(session), revocationAuthorityAccountCredentialCommitment: accountHashes.at(-1)! });
  const assignments = new RuntimePrivateMap(), bindings = new RuntimePrivateMap();
  const slotHolders: RuntimeAccountCredential[] = Array.from({ length: slotCount }, (_, index) => index === slotCount - 1
    ? terminal : { ...terminal, accountIdHash: testBytes(220 + index), m5AccountCommitment: testBytes(20 + index),
      runtimePublicKey: governanceActivatorPublicKey(BigInt(200 + index)), statusIndex: BigInt(statusOffset + capabilityCount * 2 + 1 + index) });
  slotHolders.slice(0, -1).forEach(account => {
    const commitment = pure.runtimeAccountCredentialCommitment(account);
    status.issue({ namespace: template.namespace, kind: "account", statusIndex: account.statusIndex,
      credentialCommitment: commitment, revocationAuthorityAccountCredentialCommitment: commitment });
  });
  const slotCommandType = generatedInfo.circuits.flatMap((entry: any) => entry.arguments)
    .find((arg: any) => arg.type.name === "RuntimeSlotCommand").type;
  const records: RuntimeSlotRecord[] = [];
  for (let index = 0; index < slotCount; index++) {
    const record: RuntimeSlotRecord = { assignment: { assignmentVersion: 1n, ...common,
      slotIdHash: projection.policy.actorSlotIdHash, subjectAccountCredentialCommitment: pure.runtimeAccountCredentialCommitment(slotHolders[index]!),
      subjectAccountIdHash: slotHolders[index]!.accountIdHash, assignmentIdHash: testBytes(140 + index),
      parentAssignmentIdHash: index ? records[index - 1]!.assignment.assignmentIdHash : testBytes(0),
      assignerAccountCredentialCommitment: index ? pure.runtimeAccountCredentialCommitment(slotHolders[index - 1]!) : testBytes(0), authorityKind: index ? 3n : 1n,
      namespaceAuthorityCommitment: index ? testBytes(0) : testBytes(180), m5AssignmentCommitment: testBytes(181 + index),
      assignedAt: BigInt(250 + index), issuedSequence: BigInt(index + 1) },
      status: options.revokedSlot === index ? 2n : 1n, revokedAt: options.revokedSlot === index ? 400n : 0n };
    assignments.insert(record.assignment.assignmentIdHash, pure.runtimeSlotRecordCommitment(record)); records.push(record);
    const bindingKey = pure.runtimeSlotBindingKey({ ...emptyGeneratedValue(slotCommandType),
      contextHash: common.contextHash, slotIdHash: projection.policy.actorSlotIdHash,
      subjectAccountIdHash: slotHolders[index]!.accountIdHash });
    bindings.insert(bindingKey, record.assignment.assignmentIdHash);
  }
  const state = { stateVersion: 2n, instanceCommitment: common.instanceCommitment,
    stateIdHash: projection.policy.initialStateIdHash, lastMutationAt: 400n,
    slotAssignmentsRoot: assignments.root, slotAssignmentCount: assignments.count,
    slotBindingsRoot: bindings.root, slotBindingCount: bindings.count, nonce: testBytes(182) };
  const address = sampleContractAddress(), network = Uint8Array.from(Buffer.from(hashProtocolIdentifier("network-id", "undeployed").slice(2), "hex"));
  const allocation = { allocationVersion: 1n, target, instanceCommitment: common.instanceCommitment,
    instanceIdHash: testBytes(183), allocationRequestIdHash: testBytes(184), m4AuthorizationCommitment: testBytes(185),
    allocatorAuthorityCommitment: testBytes(180), capabilityIssuersRoot: authority.root, capabilityIssuerCount: 1n,
    initialStateCommitment: pure.runtimeStateCommitment(state), governancePolicyHash: testBytes(0),
    authorityRootVersion: 1n, authorityRootSequence: 1n, targetNetworkHash: network,
    targetContractIdentity: Uint8Array.from(Buffer.from(address, "hex")), authorizedAt: 100n, createdAt: 100n,
    expiresAt: 1900n, allocationValidBefore: 1800n, allocationNonce: testBytes(186) };
  const intent: RuntimeActionIntent = { ...common, intentVersion: 1n, sessionCredentialCommitment: pure.runtimeSessionCredentialCommitment(session),
    actionIdHash: hashRuntimeIdentifier("action-id", "perform"), resourceSelectorHash: hashRuntimeIdentifier("resource-selector", "item-id"),
    resourceHash: hashRuntimeIdentifier("resource", "item-one"), purposeHash: hashRuntimeIdentifier("purpose", "purpose-one"),
    recipientKindHash: hashRuntimeIdentifier("recipient-kind", "organization"), recipientHash: hashRuntimeIdentifier("recipient", "recipient-one"),
    disclosurePolicyIdHash: hashRuntimeIdentifier("disclosure-policy-id", "minimal"), m5IntentCommitment: testBytes(187),
    issuedAt: 450n, nonceHash: testBytes(188) };
  const manifest = createRuntimeBusinessPolicyBindingManifest(template, [{ actionId: "perform", proofProfileId: "action-proof",
    moduleId: "private-state-transition-predicates", moduleVersion: "1.0.0",
    implementationHash: hex(testBytes(189)), receiptSchemaHash: hex(pure.runtimeActionReceiptSchemaHash()) }]);
  const tree = buildProofModuleBindingTree(orderProofModuleBindings(template, manifest)), binding = tree.compactBindingAt(0);
  const businessRecord: RuntimeBusinessRecord = {
    recordVersion: 1n, target, instanceCommitment: common.instanceCommitment, contextHash: common.contextHash,
    subjectAccountCredentialCommitment: accountHashes.at(-1)!,
    rootCapabilityCommitment: pure.runtimeCapabilityCredentialCommitment(capabilities[0]!),
    typeHash: projection.inputRecords.at(0).typeHash, resourceHash: intent.resourceHash,
    purposeHash: intent.purposeHash, recipientHash: intent.recipientHash,
    validAfter: 100n, validBefore: 1400n, value: 50n, unitHash: testBytes(40),
    referenceCommitment: testBytes(0), bodyCommitment: testBytes(41),
    issuerAuthorityCommitment: pure.governanceActivatorLeafCommitment(issuer), nonce: testBytes(42),
  };
  const signBusiness = (record: RuntimeBusinessRecord, signingNonce: bigint) => ({ record,
    signature: signRuntimeBusinessRecord(record, 11n, signingNonce), issuer,
    authorityPath: authority.pathFor(pure.governanceActivatorLeafCommitment(issuer)),
    issuerPath: authority.pathFor(pure.governanceActivatorLeafCommitment(issuer)) });
  const signedBusinessRecord = signBusiness(businessRecord, 171n);
  const selectedInputs = inputTypes.map((_, index) => {
    const record = index === 0 ? businessRecord : { ...businessRecord,
      typeHash: projection.inputRecords.at(index).typeHash, nonce: testBytes(43 + index),
      rootCapabilityCommitment: alternateBusinessRoot && index === 1
        ? pure.runtimeCapabilityCredentialCommitment(alternateBusinessRoot) : businessRecord.rootCapabilityCommitment };
    return { signed: index === 0 ? signedBusinessRecord : signBusiness(record, 172n + BigInt(index)),
      payloadCommitment: pure.runtimeBusinessRecordCommitment(record), nonce: testBytes(191 + index) };
  });
  const provisional = createRuntimeActionEvidencePlan({ template, actionId: "perform", intent,
    inputs: selectedInputs, outputs: outputTypes.map((_, index) => ({ payloadCommitment: testBytes(195 + index), nonce: testBytes(205 + index) })) });
  const businessWitnesses = kinds.map((kind, index) => {
    const predicate = projection.predicateAt(index);
    const first = kind === 3 ? signBusiness({ ...businessRecord, typeHash: predicate.outputTypeHash,
      referenceCommitment: pure.runtimeBusinessAuditReference(pure.runtimeActionIntentCommitment(intent), provisional.selectedInputsCommitment),
      nonce: testBytes(220 + index) }, 180n + BigInt(index)) : selectedInputs[Number(predicate.inputIndex)]!.signed;
    const second = kind === 2 ? selectedInputs[Number(predicate.ceilingIndex)]!.signed : first;
    return { first, second, payloadCommitment: kind === 3 ? pure.runtimeBusinessRecordCommitment(first.record)
      : pure.runtimeBusinessClaimCommitment(predicate, pure.runtimeBusinessRecordCommitment(first.record),
        kind === 2 ? pure.runtimeBusinessRecordCommitment(second.record) : testBytes(0)), nonce: testBytes(205 + index) };
  });
  const evidence = createRuntimeActionEvidencePlan({ template, actionId: "perform", intent,
    inputs: selectedInputs, outputs: businessWitnesses });
  const prepared = createRuntimeBusinessActionCommand({ intent, session, allocation, state, stateSequence: options.preservedStatusLeaves ? 4n : BigInt(slotCount + 1),
    policy: projection.policy, binding, authorityRootVersion: 1n, authorityRootSequence: 1n, statusRootSequence: status.sequence,
    slotAssignmentIdHash: records.at(-1)!.assignment.assignmentIdHash, evidence,
    transition: projection.transitionAt(0), transitionPath: projection.transitionPathAt(0),
    nextStateIdHash: projection.transitionAt(0).toStateIdHash, nextNonce: testBytes(194), transitioning,
    effectiveAt: 500n, validBefore: 900n });
  const command = prepared.command, signature = signRuntimeActionCommand(command, 131n, 151n);
  const ancestry = prepareRuntimeActiveAncestry({ accounts, capabilities, session, statusTree: status, now: 500n });
  const contract = new Contract(permioAuthorizationWitnesses);
  const initial = contract.initialState(createConstructorContext(undefined, "00".repeat(32)), network,
    target.namespaceHash, testBytes(0), authority.root, 1n, 1n, status.root, 2n, 2n, 2n);
  const targetSchema = generatedInfo.ledger.find((entry: any) => entry.name === "activeTemplates").value.elements
    .find((field: any) => field.name === "target").type;
  const templateKey = persistentHash(generatedDescriptor(targetSchema), target);
  const moduleIdentity = { moduleIdHash: binding.moduleIdHash, moduleVersion: binding.moduleVersion, implementationHash: binding.implementationHash };
  const moduleKey = pure.proofModuleRegistryKeyFromIdentity(moduleIdentity);
  const moduleRecord = { ...emptyGeneratedMapValue("proofModules"), identity: moduleIdentity, lifecycleStatus: 4n,
    implementationReferenceHash: pure.runtimeActionImplementationReference(network, allocation.targetContractIdentity, binding.moduleIdHash),
    inputSchemaHash: pure.runtimeActionInputSchemaHash(), configurationSchemaHash: pure.runtimeActionConfigurationSchemaHash(),
    receiptSchemaHash: pure.runtimeActionReceiptSchemaHash(), compilerVersionHash: pure.runtimeActionCompilerProfileHash(),
    compatibilityPolicyHash: pure.runtimeActionCompatibilityPolicyHash() };
  const instanceRecord = { allocationCommitment: pure.runtimeInstanceAllocationCommitment(allocation),
    currentStateCommitment: pure.runtimeStateCommitment(state), transitionSequence: command.stateSequence, lifecycleStatus: 1n };
  const templateRecord = { ...emptyGeneratedMapValue("activeTemplates"), target, lifecycleStatus: 1n,
    proofModuleBindingRoot: tree.root, proofModuleBindingCount: 1n };
  let current: StateValue | ChargedState = initial.currentContractState.data;
  for (const [name, key, value] of [
    ["runtimeInstances", common.instanceCommitment, instanceRecord],
    ["activeTemplates", templateKey, templateRecord], ["proofModules", moduleKey, moduleRecord],
    ["credentialStatusRoots", target.namespaceHash, { root: status.root, rootSequence: status.sequence }],
  ] as const) current = seedGeneratedMap(current, name, key, value);
  let progress = prepared.initialProgress;
  let businessProgress = pure.runtimeBusinessActionInitialProgress();
  const slotSteps: RuntimeSlotAncestryStep[] = records.map((record, index) => ({ record,
    opening: assignments.witnessFor(record.assignment.assignmentIdHash), account: slotHolders[index]!,
    accountStatus: 1n, accountStatusPath: status.pathFor(slotHolders[index]!.statusIndex) })).toReversed();
  function context(source = current, time = 500) {
    return createCircuitContext(address, "00".repeat(32), source, undefined, undefined, undefined, time);
  }
  function prepareArgs(op: bigint, slot = slotSteps[0]!, selected = evidence.inputs[0]!) {
    return [op, command, signature, intent, session, allocation, state, projection.policy, binding, tree.pathFor(0),
      progress, slot, selected.selected, selected.path] as const;
  }
  function prep(op: bigint, slot?: RuntimeSlotAncestryStep, selected?: typeof evidence.inputs[number]) {
    const result = contract.circuits.prepareRuntimeAction(context(), ...prepareArgs(op, slot, selected));
    current = result.context.currentQueryContext.state;
    return result;
  }
  function finishPreparation() {
    prep(1n);
    for (const step of slotSteps) {
      prep(2n, step);
      progress = advanceRuntimeActionSlotProgress(command, intent, state, status.root, progress, step);
    }
    for (const selected of [...evidence.inputs, ...evidence.outputs]) {
      prep(3n, undefined, selected);
      progress = advanceRuntimeActionEvidenceProgress(projection.policy, progress, selected.selected);
    }
  }
  const sessionSignature = signRuntimeSessionCredential(session, BigInt(30 + capabilityCount), 152n);
  const intentSignature = signRuntimeActionIntent(intent, 131n, 153n);
  const emptySelected = () => ({ valueVersion: 0n, typeHash: testBytes(0), contextHash: testBytes(0),
    resourceHash: testBytes(0), payloadCommitment: testBytes(0), nonce: testBytes(0) });
  const selectedVector = (rows: typeof evidence.inputs) =>
    Array.from({ length: 8 }, (_, index) => rows[index]?.selected ?? emptySelected());
  const rootStatusLeaf = { leafVersion: 3n, namespaceHash: target.namespaceHash, credentialKind: 2n,
    credentialCommitment: businessRecord.rootCapabilityCommitment,
    revocationAuthorityAccountCredentialCommitment: capabilities[0]!.issuerAccountCredentialCommitment,
    statusIndex: capabilities[0]!.statusIndex, status: 1n };
  function businessArgs() {
    const index = Number(businessProgress.nextPredicateIndex);
    const witness = businessWitnesses[index]!;
    const root = alternateBusinessRoot && index === 1 ? alternateBusinessRoot : capabilities[0]!;
    const selectedRootStatus = root === capabilities[0] ? rootStatusLeaf : { ...rootStatusLeaf,
      credentialCommitment: pure.runtimeCapabilityCredentialCommitment(root), statusIndex: root.statusIndex };
    return [command, signature, intent, session, allocation, state, projection.policy, binding, tree.pathFor(0),
      progress, businessProgress, projection.predicateAt(index), projection.predicatePathAt(index),
      witness.first, witness.second, selectedVector(evidence.inputs), selectedVector(evidence.outputs),
      selectedRootStatus, status.pathFor(root.statusIndex)] as const;
  }
  function proveBusiness() {
    const predicate = projection.predicateAt(Number(businessProgress.nextPredicateIndex));
    const result = contract.circuits.prepareRuntimeBusinessPredicate(context(), ...businessArgs());
    current = result.context.currentQueryContext.state;
    businessProgress = pure.runtimeBusinessActionAdvanceProgress(businessProgress, predicate,
      businessWitnesses[Number(businessProgress.nextPredicateIndex)]!.first.record);
    return result;
  }
  function executeArgs() {
    return [command, signature, intent, ancestry, sessionSignature, intentSignature,
      buildRuntimeActionScopePaths(intent, scope), buildRuntimeActionScopePaths(intent, scope),
      allocation, state, projection.policy, binding, tree.pathFor(0), progress, businessProgress, issuer,
      authority.pathFor(pure.governanceActivatorLeafCommitment(issuer)), authority.pathFor(pure.governanceActivatorLeafCommitment(issuer)),
      projection.transitionAt(0), projection.transitionPathAt(0), projection.transitionAt(0).toStateIdHash, prepared.nextNonce] as const;
  }
  function execute() {
    const result = contract.circuits.executeRuntimeAction(context(), ...executeArgs());
    current = result.context.currentQueryContext.state;
    return result;
  }
  return { template, target, projection, binding, tree, moduleKey, moduleRecord, templateKey, templateRecord,
    instanceRecord, state, allocation, command, intent, ancestry, status, issuer, evidence, prepared, slotSteps,
    businessRecord, signedBusinessRecord, businessArgs, proveBusiness, rootStatusLeaf, alternateBusinessRoot,
    contract, context, prep, prepareArgs, finishPreparation, executeArgs, execute,
    get current(): StateValue | ChargedState { return current; },
    set current(value: StateValue | ChargedState) { current = value; },
    get progress() { return progress; }, set progress(value) { progress = value; },
    get businessProgress() { return businessProgress; }, set businessProgress(value) { businessProgress = value; },
    view: () => ledger(current) };
}
