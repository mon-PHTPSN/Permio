import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomBytes } from "node:crypto";
import type { SlotBoundContextAccountSystem, ScenarioInstance, ParticipantSlotAssignment } from "@permio/context-accounts";
import type { ScenarioTemplate } from "@permio/scenario-domain";
import { encodeCanonical } from "@permio/protocol";
import {
  RuntimePrivateMap, CredentialStatusTree, createRuntimeAccountCredential,
  hashM5ParticipantSlotAssignment,
  createRuntimeCapabilityCredential, createRuntimeCredentialStatusCommand, createRuntimeCredentialInstanceBinding,
  createEmptyRuntimeScopeProgress, createEmptyRuntimeSessionCredential, createRuntimeTemplateActionPolicy,
  governanceActivatorPublicKey, signRuntimeCredentialStatusCommand, signRuntimeCapabilityCredential,
  signRuntimeSlotCommand, permioAuthorizationPureCircuits as pure, readPermioAuthorizationLedger as ledger,
  type RuntimeSlotCommand, type RuntimeSlotRecord, type RuntimeSlotAncestryStep, type RuntimeStateOpening,
  type RuntimeInstanceAllocation, type AuthorityRootBuild, type GovernanceActivatorLeaf, type Hex32,
  type ConnectedPermioAuthorizationContract, type PermioAuthorizationProviders,
} from "@permio/midnight-authorization";

// Synthetic local fixture, actual M4/M5-P1 and real contract calls. No action
// receipt or complete long-chain/restart/production acceptance is claimed.
export async function runSlotStateWorkflow(input: {
  system: SlotBoundContextAccountSystem; instance: ScenarioInstance; template: ScenarioTemplate;
  allocation: RuntimeInstanceAllocation; stateOpening: RuntimeStateOpening;
  issuers: AuthorityRootBuild; authority: AuthorityRootBuild;
  issuer: GovernanceActivatorLeaf; issuerSecret: bigint;
  allocator: GovernanceActivatorLeaf; allocatorSecret: bigint;
  slotGovernor: GovernanceActivatorLeaf; slotGovernorSecret: bigint;
  activator: GovernanceActivatorLeaf; activatorSecret: bigint;
  contract: ConnectedPermioAuthorizationContract; providers: PermioAuthorizationProviders;
  address: string; governancePolicyHash: Hex32;
  binding: import("@permio/midnight-authorization").RuntimeAllocationPolicyWitness;
  emit(event: string, fields: Readonly<Record<string, unknown>>): void;
}) {
  const { system, instance, allocation, contract } = input;
  const zero = () => new Uint8Array(32);
  const id = (kind: string) => `private-${kind}-${randomBytes(16).toString("hex")}`;
  const hashId = (kind: string, value: string) => createHash("sha256").update(encodeCanonical(`permio:${kind}:v1`, [value])).digest();
  const emit = (event: string, fields: Readonly<Record<string, unknown>>) => input.emit(event, {
    scope: "private-slot-state-regression-not-ordinary-action-acceptance", ...fields });
  const action = input.template.actions[0]!, rule = input.template.capabilityRules.find((candidate) => candidate.id === action.capabilityRuleId)!;
  const now = () => Math.floor(Date.now() / 1000) - 1;
  const sourceKey = generateKeyPairSync("ed25519"), secret = 239n;
  const source = system.registerContextAccount({ accountId: id("slot-holder"), instanceId: instance.instanceId,
    contextId: action.contextId, kind: "human", publicKeyPem: sourceKey.publicKey.export({ type: "spki", format: "pem" }).toString() }, now());
  const account = createRuntimeAccountCredential({ account: source, instance, runtimePublicKey: governanceActivatorPublicKey(secret),
    statusIndex: 7n, validBefore: instance.expiresAt - 1 });
  const accountHash = pure.runtimeAccountCredentialCommitment(account);
  // Unused scoped-credential arguments for the direct account-issuance dispatcher;
  // this M5 grant is never activated as a chain capability or used for an action.
  const grant = system.issueRootCapability(instance.capabilityIssuers[0]!.principalId, {
    grantId: id("unused-grant"), instanceId: instance.instanceId, contextId: source.contextId, subjectAccountId: source.accountId,
    scope: { actions: [action.id], resourceSelectors: [rule.resourceSelector], resources: [id("record")],
      purposes: [action.purpose], recipientKinds: [action.recipientKind], recipients: [id("recipient")],
      disclosurePolicyIds: [rule.disclosurePolicyId] }, notBefore: source.registeredAt,
    expiresAt: source.registeredAt + Math.min(600, rule.validForSeconds), maxDelegationDepth: 0 }, now());
  const cap = createRuntimeCapabilityCredential({ grant, instanceCommitment: allocation.instanceCommitment,
    subjectAccountCredential: account, statusIndex: 8n,
    namespaceIssuer: { principalId: grant.issuerRef, authority: input.issuer } });
  const status = new CredentialStatusTree();
  const cmd = createRuntimeCredentialStatusCommand({ namespace: instance.namespace, governancePolicyHash: input.governancePolicyHash,
    authorityRootVersion: Number(allocation.authorityRootVersion), authorityRootSequence: Number(allocation.authorityRootSequence),
    credentialStatusRootSequence: 0n, kind: "account", credentialCommitment: accountHash,
    subjectAccountCredentialCommitment: accountHash, revocationAuthorityAccountCredentialCommitment: accountHash,
    statusIndex: account.statusIndex, expectedStatus: "empty", nextStatus: "active", effectiveAt: source.registeredAt,
    commandNonce: `0x${randomBytes(32).toString("hex")}` });
  emit("slot-account-issuance-started", { ordinaryActionAcceptance: false });
  const accountTx = await contract.callTx.updateRuntimeCredentialStatus(1n, cmd,
    signRuntimeCredentialStatusCommand(cmd, input.issuerSecret), input.issuer,
    input.authority.pathFor(pure.governanceActivatorLeafCommitment(input.issuer)), account,
    status.pathFor(7n), status.pathFor(7n), cap.credential, signRuntimeCapabilityCredential(cap.credential, input.issuerSecret),
    cap.credential, status.pathFor(8n), createEmptyRuntimeScopeProgress(),
    { elementVersion: 1n, dimension: 1n, valueHash: zero() }, status.pathFor(7n), status.pathFor(7n),
    createEmptyRuntimeSessionCredential(), createRuntimeCredentialInstanceBinding(allocation, input.issuers, input.issuer, instance.expiresAt - 1));
  status.issue({ namespace: instance.namespace, kind: "account", credentialCommitment: accountHash,
    revocationAuthorityAccountCredentialCommitment: accountHash, statusIndex: 7n });
  emit("slot-account-issued", { transactionId: accountTx.public.txId, credentialStatusRootSequence: 1 });

  const assignments = new RuntimePrivateMap(), bindings = new RuntimePrivateMap();
  const records = new Map<string, RuntimeSlotRecord>(), sources: ParticipantSlotAssignment[] = [];
  const projection = createRuntimeTemplateActionPolicy(input.template, action.id);
  let state = structuredClone(input.stateOpening), accepted = 0, sequence = 0n;
  const hex = (value: Uint8Array) => Buffer.from(value).toString("hex");
  async function verifyState() {
    const indexed = await input.providers.publicDataProvider.queryContractState(input.address); assert(indexed);
    const view = ledger(indexed.data), current = view.runtimeInstances.lookup(allocation.instanceCommitment);
    assert.deepEqual(current.allocationCommitment, pure.runtimeInstanceAllocationCommitment(allocation));
    assert.deepEqual(current.currentStateCommitment, pure.runtimeStateCommitment(state));
    assert.equal(current.transitionSequence, sequence);
    const accountStatus = view.credentialStatusRoots.lookup(allocation.target.namespaceHash);
    assert.deepEqual(accountStatus.root, status.root); assert.equal(accountStatus.rootSequence, 1n);
    return view;
  }
  async function manage(kind: 1n | 2n, slot: string, governor: boolean, sourceRecord?: ParticipantSlotAssignment) {
    const effectiveAt = now(), authority = governor ? input.slotGovernor : input.allocator;
    const actor = governor ? { kind: "namespace-governance", principalId: "governance-one" } as const :
      { kind: "instance-creator", principalId: instance.allocatedBy } as const;
    const recordSource = sourceRecord ?? system.assignParticipantSlot(actor, {
      namespace: instance.namespace, templateId: instance.templateId, templateVersion: instance.templateVersion, templateHash: instance.templateHash,
      assignmentId: id("assignment"), instanceId: instance.instanceId, contextId: source.contextId,
      slotId: slot, subjectAccountId: source.accountId,
    }, effectiveAt);
    if (kind === 2n) system.revokeParticipantSlot(actor, recordSource.assignmentId, effectiveAt);
    else sources.push(recordSource);
    const slotRule = projection.slotRules.witnessFor(source.contextId, slot, governor ? "@namespace-governance" : "@instance-creator");
    const assignmentIdHash = hashId("slot-assignment-id", recordSource.assignmentId);
    const original = records.get(hex(assignmentIdHash));
    const command: RuntimeSlotCommand = { commandVersion: 1n, kind, target: allocation.target, instanceCommitment: allocation.instanceCommitment,
      allocationCommitment: pure.runtimeInstanceAllocationCommitment(allocation),
      stateCommitment: pure.runtimeStateCommitment(state), stateSequence: sequence, authorityRootVersion: 1n, authorityRootSequence: 1n,
      credentialStatusRootSequence: 1n, contextHash: account.contextHash, slotIdHash: slotRule.rule.slotIdHash,
      subjectAccountCredentialCommitment: accountHash, subjectAccountIdHash: account.accountIdHash, assignmentIdHash,
      parentAssignmentIdHash: zero(), assignerAccountCredentialCommitment: zero(), authorityKind: governor ? 2n : 1n,
      namespaceAuthorityCommitment: pure.governanceActivatorLeafCommitment(authority),
      m5AssignmentCommitment: original?.assignment.m5AssignmentCommitment ?? hashM5ParticipantSlotAssignment(recordSource),
      effectiveAt: BigInt(effectiveAt), validBefore: BigInt(instance.expiresAt - 1), commandNonce: randomBytes(32) };
    const record: RuntimeSlotRecord = { assignment: pure.runtimeSlotAssignmentFromCommand(command), status: 1n, revokedAt: 0n };
    const bindingKey = pure.runtimeSlotBindingKey(command), bindingOpening = bindings.witnessFor(bindingKey);
    const exists = hex(bindingOpening.node.key) === hex(bindingKey);
    const previous = exists ? records.get(hex(bindingOpening.node.value))! : undefined;
    const targetRecord = kind === 2n ? original! : previous ?? record;
    const ap = kind === 1n ? assignments.planInsert(assignmentIdHash, pure.runtimeSlotRecordCommitment(record)) : undefined;
    const assignmentOpening = ap?.predecessor ?? assignments.witnessFor(assignmentIdHash);
    const bp = kind === 1n && !exists ? bindings.planInsert(bindingKey, assignmentIdHash) : undefined;
    const previousOpening = previous ? assignments.witnessFor(previous.assignment.assignmentIdHash) : assignmentOpening;
    const nextNonce = randomBytes(32);
    let progress = pure.runtimeSlotInitialProgress(command, kind === 1n && previous ? previous.assignment.assignmentIdHash : zero(),
      kind === 1n && previous ? previous.assignment.subjectAccountCredentialCommitment : zero());
    const unusedStep: RuntimeSlotAncestryStep = { record, opening: assignmentOpening, account,
      accountStatus: 1n, accountStatusPath: status.pathFor(7n) };
    const policyOpening = { policy: projection.policy, binding: input.binding.binding, bindingPath: input.binding.bindingPath,
      rule: slotRule.rule, rulePath: slotRule.path };
    async function call(operation: bigint, step = unusedStep, alteredCommand = command, signer = governor ? input.slotGovernorSecret : input.allocatorSecret) {
      return contract.callTx.manageRuntimeParticipantSlots(operation, alteredCommand, signRuntimeSlotCommand(alteredCommand, signer), allocation,
        state, nextNonce, policyOpening, authority, input.authority.pathFor(pure.governanceActivatorLeafCommitment(authority)),
        account, status.pathFor(7n), account, status.pathFor(7n), progress, step, targetRecord,
        assignmentOpening, ap?.appendPath ?? assignmentOpening.path, bindingOpening, bp?.appendPath ?? bindingOpening.path, previousOpening);
    }
    if (accepted === 0) {
      await assert.rejects(call(1n, unusedStep, command, input.activatorSecret), /Invalid governance activation signature/u);
      await assert.rejects(call(1n, unusedStep, { ...command, authorityRootSequence: 0n }), /root is stale/u);
      await assert.rejects(call(1n, unusedStep, { ...command, stateCommitment: randomBytes(32) }), /stale against/u);
      emit("slot-preflight-negatives-rejected", { cases: 3, nodeRejectedTransactions: 0 });
    }
    emit("slot-management-started", { kind: Number(kind), namespaceGovernance: governor, stateSequence: Number(sequence) });
    const begun = await call(1n); accepted += 1;
    emit("slot-management-begun", { transactionId: begun.public.txId, grantsRole: false, stateSequence: Number(sequence) });
    await verifyState();
    while (progress.phase !== 3n) {
      const parent = records.get(hex(progress.nextAssignmentIdHash))!;
      const step: RuntimeSlotAncestryStep = { record: parent, opening: assignments.witnessFor(parent.assignment.assignmentIdHash),
        account, accountStatus: 1n, accountStatusPath: status.pathFor(7n) };
      const nextProgress = pure.runtimeSlotAdvanceProgress(progress, step, state, command, status.root);
      const staged = await call(2n, step); accepted += 1; progress = nextProgress;
      emit("slot-ancestry-step-verified", { transactionId: staged.public.txId, grantsRole: false });
    }
    const finalized = await call(3n); accepted += 1; sequence += 1n;
    if (kind === 1n) {
      assignments.insert(assignmentIdHash, pure.runtimeSlotRecordCommitment(record)); records.set(hex(assignmentIdHash), record);
      if (exists) bindings.replace(bindingKey, bindingOpening.node.value, assignmentIdHash); else bindings.insert(bindingKey, assignmentIdHash);
    } else {
      const revoked = { ...original!, status: 2n, revokedAt: command.effectiveAt };
      assignments.replace(assignmentIdHash, pure.runtimeSlotRecordCommitment(original!), pure.runtimeSlotRecordCommitment(revoked));
      records.set(hex(assignmentIdHash), revoked);
    }
    state = { ...state, slotAssignmentsRoot: assignments.root, slotAssignmentCount: assignments.count,
      lastMutationAt: command.effectiveAt,
      slotBindingsRoot: bindings.root, slotBindingCount: bindings.count, nonce: nextNonce };
    const checked = await verifyState();
    assert.equal(checked.runtimeSlotSessions.size(), 0n); assert.equal(checked.usedRuntimeSlotCommandNonces.size(), sequence);
    emit("slot-management-finalized", { transactionId: finalized.public.txId, kind: Number(kind),
      stateCommitment: hex(pure.runtimeStateCommitment(state)), stateSequence: Number(sequence),
      ordinaryActionReceiptEmitted: false });
    return recordSource;
  }
  const original = await manage(1n, action.actorSlotId, false);
  const governanceSlot = input.template.participantSlots.find((slot) => slot.assignableBy.includes("@namespace-governance"))!;
  await manage(1n, governanceSlot.id, true);
  await manage(2n, action.actorSlotId, false, original);
  await manage(1n, action.actorSlotId, false);
  assert.equal(system.isParticipantSlotActive(original.assignmentId, now()), false);
  emit("slot-state-workflow-verified", { credentialTransactions: 1, slotTransactions: accepted, stateSequence: Number(sequence),
    currentStateCommitment: hex(pure.runtimeStateCommitment(state)), consumedSlotCommandNonces: Number(sequence),
    genesisGrantCount: 0, privateMapsPublished: false, occupiedSlotChainOnNodeVerified: false,
    ordinaryActionAcceptance: false, commonReceipt: false, milestoneComplete: false });
  return { privateSentinels: [source.accountId, source.publicKeyPem, grant.grantId, ...sources.map((record) => record.assignmentId),
    ...sources.map((record) => hex(hashId("slot-assignment-id", record.assignmentId))), hex(state.nonce)] };
}
