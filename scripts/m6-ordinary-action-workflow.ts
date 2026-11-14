import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { encodeCanonical } from "@permio/protocol";
import type { Contract as CompactContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract";
import { createSignedActionIntent, type SlotBoundContextAccountSystem } from "@permio/context-accounts";
import { runBoundCredentialWorkflow } from "./m6-bound-credential-workflow.ts";
import { assertM6CheckpointValueEqual } from "./m6-checkpoint-value.ts";
import {
  RuntimePrivateMap, createRuntimeTemplateActionPolicy, hashM5ParticipantSlotAssignment,
  createRuntimeActionIntent, createRuntimeActionEvidencePlan, createRuntimeActionCommand,
  prepareRuntimeActiveAncestry, buildRuntimeActionScopePaths, signRuntimeSlotCommand,
  signRuntimeSessionCredential, signRuntimeActionIntent, signRuntimeActionCommand,
  advanceRuntimeActionSlotProgress, advanceRuntimeActionEvidenceProgress,
  createIndexedDecisionReceiptReader, readFinalizedDecisionReceipt, runtimeDecisionReceiptId,
  permioAuthorizationPureCircuits as pure, readPermioAuthorizationLedger as ledger,
  type RuntimeAllocationPolicyWitness, type GovernanceActivatorLeaf, type RuntimeSlotCommand,
  type RuntimeSlotRecord, type RuntimeSlotAncestryStep,
  type PreprodConnectionProfile,
  type PermioAuthorizationContract, type RuntimeStateOpening, type AuthorityRootBuild,
} from "@permio/midnight-authorization";

export interface PreparedOrdinaryAction {
  readonly arguments: CompactContract.CircuitParameters<PermioAuthorizationContract, "executeRuntimeAction">;
  readonly preparationArguments: CompactContract.CircuitParameters<PermioAuthorizationContract, "prepareRuntimeAction">;
  readonly expectedNextState: RuntimeStateOpening;
  readonly signedIntent: ReturnType<typeof createSignedActionIntent>;
  readonly privateSentinels: readonly string[];
}

/** Real M4/M5 setup and contract calls. This is a disposable test workflow. */
export async function runOrdinaryActionWorkflow(input: Omit<Parameters<typeof runBoundCredentialWorkflow>[0], "system"> & {
  system: SlotBoundContextAccountSystem;
  allocator: GovernanceActivatorLeaf; allocatorSecret: bigint;
  allocationPolicy: RuntimeAllocationPolicyWitness;
  network: "preprod" | "undeployed"; indexerUrl?: string; profile?: PreprodConnectionProfile;
  certifiedSetup?: Awaited<ReturnType<typeof runBoundCredentialWorkflow>>;
  rootSlotBeforeSession?: true;
  transitioning?: boolean;
  competingCandidates?: 1 | 2 | 3;
  selectedCandidate?: number;
  authorityAtAction?(): { root: AuthorityRootBuild; version: bigint; sequence: bigint };
  afterPrepared?(candidate: PreparedOrdinaryAction, index: number): Promise<void>;
  executePrepared?(candidates: readonly PreparedOrdinaryAction[]): Promise<{ transactionId: string; receiptId: Uint8Array }>;
  /** Exact already finalized test checkpoint; replays no contract calls. */
  resumePrepared?: {
    source: Parameters<SlotBoundContextAccountSystem["assignParticipantSlot"]>[1] & { assignedAt: number;
      assignedBy: Parameters<SlotBoundContextAccountSystem["assignParticipantSlot"]>[0] };
    slotArguments: CompactContract.CircuitParameters<PermioAuthorizationContract, "manageRuntimeParticipantSlots">;
    firstCandidate: PreparedOrdinaryAction;
  };
}) {
  const { allocation, instance, template, contract, providers, allocator } = input;
  const now = () => Math.floor(Date.now() / 1000) - 1;
  const zero = () => new Uint8Array(32);
  const hex = (value: Uint8Array) => Buffer.from(value).toString("hex");
  const id = (kind: string) => `private-${kind}-${randomBytes(16).toString("hex")}`;
  const hashId = (kind: string, value: string) => createHash("sha256").update(encodeCanonical(`permio:${kind}:v1`, [value])).digest();
  const action = template.actions[0]!;
  const projection = createRuntimeTemplateActionPolicy(template, action.id);
  const assignments = new RuntimePrivateMap(), bindings = new RuntimePrivateMap();
  const transitioning = input.transitioning ?? true;
  async function admitRootSlot(c: Parameters<NonNullable<Parameters<typeof runBoundCredentialWorkflow>[0]["afterRootCapabilityCertified"]>>[0]) {
  let state = c.binding.state, sequence = c.binding.stateSequence;
  // Counts include the map's sentinel node even before the first assignment.
  assert.deepEqual(state.slotAssignmentsRoot, assignments.root); assert.equal(state.slotAssignmentCount, assignments.count);
  assert.deepEqual(state.slotBindingsRoot, bindings.root); assert.equal(state.slotBindingCount, bindings.count);
  const assignedAt = input.resumePrepared?.source.assignedAt ?? now();
  const source = input.system.assignParticipantSlot({ kind: "instance-creator", principalId: instance.allocatedBy }, {
    namespace: instance.namespace, templateId: instance.templateId, templateVersion: instance.templateVersion,
    templateHash: instance.templateHash, assignmentId: id("ordinary-slot"), instanceId: instance.instanceId,
    contextId: action.contextId, slotId: action.actorSlotId, subjectAccountId: c.accountSource.accountId,
    ...(input.resumePrepared ? { assignmentId: input.resumePrepared.source.assignmentId } : {}),
  }, assignedAt);
  if (input.resumePrepared) assert.deepEqual(source, input.resumePrepared.source);
  const slotRule = projection.slotRules.witnessFor(action.contextId, action.actorSlotId, "@instance-creator");
  const command: RuntimeSlotCommand = {
    commandVersion: 1n, kind: 1n, target: allocation.target, instanceCommitment: allocation.instanceCommitment,
    allocationCommitment: pure.runtimeInstanceAllocationCommitment(allocation),
    stateCommitment: pure.runtimeStateCommitment(state), stateSequence: sequence,
    authorityRootVersion: input.authorityRootVersion ?? 1n, authorityRootSequence: input.authorityRootSequence ?? 1n, credentialStatusRootSequence: c.status.sequence,
    contextHash: c.account.contextHash, slotIdHash: slotRule.rule.slotIdHash,
    subjectAccountCredentialCommitment: pure.runtimeAccountCredentialCommitment(c.account),
    subjectAccountIdHash: c.account.accountIdHash, assignmentIdHash: hashId("slot-assignment-id", source.assignmentId),
    parentAssignmentIdHash: zero(), assignerAccountCredentialCommitment: zero(), authorityKind: 1n,
    namespaceAuthorityCommitment: pure.governanceActivatorLeafCommitment(allocator),
    m5AssignmentCommitment: hashM5ParticipantSlotAssignment(source), effectiveAt: BigInt(assignedAt),
    validBefore: BigInt(instance.expiresAt - 1), commandNonce: randomBytes(32),
  };
  if (input.resumePrepared) {
    const saved = input.resumePrepared.slotArguments[1];
    assertM6CheckpointValueEqual({ ...command, commandNonce: saved.commandNonce }, saved);
    command.commandNonce = saved.commandNonce;
  }
  const record: RuntimeSlotRecord = { assignment: pure.runtimeSlotAssignmentFromCommand(command), status: 1n, revokedAt: 0n };
  const assignmentKey = command.assignmentIdHash, bindingKey = pure.runtimeSlotBindingKey(command);
  const ap = assignments.planInsert(assignmentKey, pure.runtimeSlotRecordCommitment(record));
  const bp = bindings.planInsert(bindingKey, assignmentKey), nextNonce = input.resumePrepared?.slotArguments[5] ?? randomBytes(32);
  const progress = pure.runtimeSlotInitialProgress(command, zero(), zero());
  assert.equal(progress.phase, 3n, "Root assignment requires no fabricated ancestor");
  const step: RuntimeSlotAncestryStep = { record, opening: ap.predecessor, account: c.account,
    accountStatus: 1n, accountStatusPath: c.status.pathFor(c.account.statusIndex) };
  const policy = { policy: projection.policy, binding: input.allocationPolicy.binding,
    bindingPath: input.allocationPolicy.bindingPath, rule: slotRule.rule, rulePath: slotRule.path };
  const slotArguments = (operation: bigint) => [operation, command, input.resumePrepared?.slotArguments[2] ?? signRuntimeSlotCommand(command, input.allocatorSecret),
    allocation, state, nextNonce, policy, allocator,
    input.authority.pathFor(pure.governanceActivatorLeafCommitment(allocator)),
    c.account, c.status.pathFor(c.account.statusIndex), c.account, c.status.pathFor(c.account.statusIndex),
    progress, step, record, ap.predecessor, ap.appendPath, bp.predecessor, bp.appendPath, ap.predecessor] as const;
  if (input.resumePrepared) assertM6CheckpointValueEqual(slotArguments(1n), input.resumePrepared.slotArguments);
  else {
    await input.checkpoint?.("ordinary-root-slot-prepared", { source, record, arguments: slotArguments(1n) });
    const begun = await contract.callTx.manageRuntimeParticipantSlots(...slotArguments(1n));
    input.emit("ordinary-root-slot-begun", { transactionId: begun.public.txId, grantsRole: false });
    const assigned = await contract.callTx.manageRuntimeParticipantSlots(...slotArguments(3n));
    input.emit("ordinary-root-slot-native-finalized", { transactionId: assigned.public.txId });
  }
  assignments.insert(assignmentKey, pure.runtimeSlotRecordCommitment(record)); bindings.insert(bindingKey, assignmentKey);
  state = { ...state, lastMutationAt: command.effectiveAt, slotAssignmentsRoot: assignments.root,
    slotAssignmentCount: assignments.count, slotBindingsRoot: bindings.root, slotBindingCount: bindings.count, nonce: nextNonce };
  sequence += 1n;
  input.emit("ordinary-root-slot-admitted", { instanceStateSequence: String(sequence),
    ordinaryActionAcceptance: false, alreadyFinalizedSlotRestoredWithoutSubmission: Boolean(input.resumePrepared) });

  return { state, sequence, source, step, record, assignmentKey, nextNonce };
  }
  let earlySlot: Awaited<ReturnType<typeof admitRootSlot>> | undefined;
  assert(!(input.rootSlotBeforeSession && (input.certifiedSetup || input.resumePrepared)),
    "Early-slot ordering is only for a fresh second instance");
  const setup = input.certifiedSetup ?? await runBoundCredentialWorkflow({ ...input, retainForOrdinaryAction: true,
    ...(input.rootSlotBeforeSession ? { afterRootCapabilityCertified: async credentials => {
      earlySlot = await admitRootSlot(credentials);
      return { ...credentials.binding, state: earlySlot.state, stateSequence: earlySlot.sequence };
    } } : {}) });
  assert(setup.credentials, "Actual account, root capability and session certification is required");
  const { credentials: c } = setup;
  const initial = await providers.publicDataProvider.queryContractState(input.address); assert(initial);
  const initialView = ledger(initial.data);
  const receiptCount = initialView.decisionReceipts.size(), nullifierCount = initialView.usedRuntimeActionNullifiers.size();
  const pendingCount = initialView.runtimeActionSessions.size() - (input.resumePrepared ? 1n : 0n);
  assert(pendingCount >= 0n);
  const slot = earlySlot ?? await admitRootSlot(c);
  const { source, assignmentKey, nextNonce } = slot;
  const step: RuntimeSlotAncestryStep = { ...slot.step, accountStatusPath: c.status.pathFor(c.account.statusIndex) };
  const state = earlySlot ? c.binding.state : slot.state;
  const sequence = earlySlot ? c.binding.stateSequence : slot.sequence;
  assert.deepEqual(state.slotAssignmentsRoot, assignments.root); assert.equal(state.slotAssignmentCount, assignments.count);
  assert.deepEqual(state.slotBindingsRoot, bindings.root); assert.equal(state.slotBindingCount, bindings.count);

  const candidates: PreparedOrdinaryAction[] = [];
  const effectiveAt = now();
  for (let candidate = 0; candidate < (input.competingCandidates ?? 1); candidate++) {
  if (candidate === 0 && input.resumePrepared) {
    const saved = input.resumePrepared.firstCandidate, cmd = saved.arguments[0];
    assert.deepEqual(saved.arguments[9], state); assert.equal(cmd.stateSequence, sequence);
    assert.deepEqual(initialView.runtimeInstances.lookup(allocation.instanceCommitment).currentStateCommitment,
      pure.runtimeStateCommitment(state));
    const pending = initialView.runtimeActionSessions.lookup(pure.runtimeActionCommandCommitment(cmd));
    assert.deepEqual(pending.progressCommitment, pure.runtimeActionProgressCommitment(saved.arguments[13]));
    candidates.push(saved);
    input.emit("already-finalized-action-preparation-restored", { nativeSubmissions: 0, grantsAuthority: false });
    await input.afterPrepared?.(saved, candidate); continue;
  }
  const actionAuthority = input.authorityAtAction?.() ?? { root: input.authority,
    version: input.authorityRootVersion ?? 1n, sequence: input.authorityRootSequence ?? 1n };
  const signedIntent = createSignedActionIntent({ intentVersion: 1, namespace: instance.namespace,
    templateId: instance.templateId, templateVersion: instance.templateVersion, templateHash: instance.templateHash,
    instanceId: instance.instanceId, contextId: action.contextId, sessionId: c.sessionSource.sessionId,
    actionId: action.id, resourceSelector: c.scope.resourceSelectors[0]!, resource: c.scope.resources[0]!,
    purpose: action.purpose, recipientKind: action.recipientKind, recipient: c.scope.recipients[0]!,
    disclosurePolicyId: c.scope.disclosurePolicyIds[0]!, issuedAt: effectiveAt, nonce: id("ordinary-intent-nonce") }, c.sessionPrivateKey);
  const intent = createRuntimeActionIntent(signedIntent, c.sessionSource.publicKeyPem, c.session.credential, instance);
  // These are synthetic private application values. The proof checks integrity,
  // declared types and scope; it does not attest that an opinion is true.
  const evidence = createRuntimeActionEvidencePlan({ template, actionId: action.id, intent,
    inputs: action.inputRecordTypes.map(() => ({ payloadCommitment: randomBytes(32) })),
    outputs: action.outputClaimTypes.map(() => ({ payloadCommitment: randomBytes(32) })) });
  const transition = projection.transitionAt(0), transitionPath = projection.transitionPathAt(0);
  const prepared = createRuntimeActionCommand({ intent, session: c.session.credential, allocation, state,
    stateSequence: sequence, policy: projection.policy, binding: input.allocationPolicy.binding,
    authorityRootVersion: actionAuthority.version, authorityRootSequence: actionAuthority.sequence, statusRootSequence: c.status.sequence,
    slotAssignmentIdHash: assignmentKey, evidence, transition, transitionPath,
    nextStateIdHash: transition.toStateIdHash, transitioning, effectiveAt: BigInt(effectiveAt),
    validBefore: BigInt(Math.min(c.sessionSource.expiresAt - 1, instance.expiresAt - 1)) });
  const actionCommand = prepared.command, signature = signRuntimeActionCommand(actionCommand, c.sessionSecret);
  let actionProgress = prepared.initialProgress;
  const actionStep: RuntimeSlotAncestryStep = { ...step, opening: assignments.witnessFor(assignmentKey) };
  const prepareArguments = (operation: bigint, selected = evidence.inputs[0]!) => [operation, actionCommand,
    signature, intent, c.session.credential, allocation, state, projection.policy,
    input.allocationPolicy.binding, input.allocationPolicy.bindingPath, actionProgress, actionStep,
    selected.selected, selected.path] as const;
  const ancestry = prepareRuntimeActiveAncestry({ accounts: [c.account], capabilities: [c.capability.credential],
    session: c.session.credential, statusTree: c.status, now: BigInt(effectiveAt) });
  const scopePaths = buildRuntimeActionScopePaths(intent, c.capability.scope);
  const sessionPaths = buildRuntimeActionScopePaths(intent, c.session.scope);
  const finalArguments = () => [actionCommand, signature, intent, ancestry,
    signRuntimeSessionCredential(c.session.credential, c.holderSecret), signRuntimeActionIntent(intent, c.sessionSecret),
    scopePaths, sessionPaths, allocation, state, projection.policy, input.allocationPolicy.binding,
    input.allocationPolicy.bindingPath, actionProgress, input.issuer,
    input.issuers.pathFor(pure.governanceActivatorLeafCommitment(input.issuer)),
    actionAuthority.root.pathFor(pure.governanceActivatorLeafCommitment(input.issuer)),
    transition, transitionPath, transition.toStateIdHash, prepared.nextNonce] as const;
  await input.checkpoint?.("ordinary-action-prepared", { signedIntent, source, state, sequence, evidence,
    prepareArguments: prepareArguments(1n), finalArguments: finalArguments(), expectedNextState: prepared.nextState });
  async function verifyUnchangedPreparation() {
    const indexed = await providers.publicDataProvider.queryContractState(input.address); assert(indexed);
    const view = ledger(indexed.data), instanceRecord = view.runtimeInstances.lookup(allocation.instanceCommitment);
    assert.equal(instanceRecord.transitionSequence, sequence);
    assert.deepEqual(instanceRecord.currentStateCommitment, pure.runtimeStateCommitment(state));
    assert.equal(view.decisionReceipts.size(), receiptCount); assert.equal(view.usedRuntimeActionNullifiers.size(), nullifierCount);
  }
  const begin = await contract.callTx.prepareRuntimeAction(...prepareArguments(1n));
  input.emit("ordinary-action-preparation-begun", { transactionId: begin.public.txId, grantsAuthority: false });
  await verifyUnchangedPreparation();
  const checkedSlot = await contract.callTx.prepareRuntimeAction(...prepareArguments(2n));
  actionProgress = advanceRuntimeActionSlotProgress(actionCommand, intent, state, c.status.root, actionProgress, actionStep);
  input.emit("ordinary-action-slot-checked", { transactionId: checkedSlot.public.txId, grantsAuthority: false });
  for (const selected of [...evidence.inputs, ...evidence.outputs]) {
    const tx = await contract.callTx.prepareRuntimeAction(...prepareArguments(3n, selected));
    actionProgress = advanceRuntimeActionEvidenceProgress(projection.policy, actionProgress, selected.selected);
    input.emit("ordinary-action-evidence-checked", { transactionId: tx.public.txId, grantsAuthority: false });
  }
  await verifyUnchangedPreparation();
  await input.checkpoint?.("ordinary-action-final-prepared", { arguments: finalArguments(), expectedNextState: prepared.nextState,
    currentState: state, sequence, signedIntent });
  candidates.push({ arguments: [...finalArguments()], preparationArguments: [...prepareArguments(4n)],
    expectedNextState: prepared.nextState, signedIntent,
    privateSentinels: [signedIntent.payload.nonce, hex(prepared.nextNonce),
      ...evidence.inputs.concat(evidence.outputs).flatMap(row => [hex(row.selected.nonce), hex(row.selected.payloadCommitment)])] });
  await input.afterPrepared?.(candidates.at(-1)!, candidate);
  }
  const selected = candidates[input.selectedCandidate ?? 0]; assert(selected, "Selected prepared action is absent");
  const accepted = input.executePrepared ? await input.executePrepared(candidates) : await (async () => {
    assert.equal(candidates.length, 1, "Competing proofs require an explicit bounded executor");
    const result = await contract.callTx.executeRuntimeAction(...selected.arguments);
    return { transactionId: result.public.txId, receiptId: result.private.result };
  })();
  const receiptId = `0x${hex(accepted.receiptId)}` as const;
  const receipt = await readFinalizedDecisionReceipt(createIndexedDecisionReceiptReader({ network: input.network,
    indexerUrl: input.indexerUrl, profile: input.profile, publicDataProvider: providers.publicDataProvider,
    contract: `0x${input.address}`, receiptId }), {
    network: input.network, contract: `0x${input.address}`, transactionId: accepted.transactionId, receiptId });
  const indexed = await providers.publicDataProvider.queryContractState(input.address); assert(indexed);
  const final = ledger(indexed.data), finalInstance = final.runtimeInstances.lookup(allocation.instanceCommitment);
  const expectedSequence = sequence + (transitioning ? 1n : 0n);
  assert.equal(finalInstance.transitionSequence, expectedSequence);
  assert.deepEqual(finalInstance.currentStateCommitment, pure.runtimeStateCommitment(selected.expectedNextState));
  assert.equal(final.runtimeActionSessions.size(), pendingCount + BigInt(candidates.length - 1));
  assert.equal(final.decisionReceipts.size(), receiptCount + 1n);
  assert.equal(final.usedRuntimeActionNullifiers.size(), nullifierCount + 1n);
  const body = final.decisionReceipts.lookup(accepted.receiptId);
  assert.equal(runtimeDecisionReceiptId(body), receiptId); assert.equal(body.transitioning, transitioning);
  if (!transitioning) {
    assert.deepEqual(selected.expectedNextState, state);
    assert.equal(receipt.previousStateCommitment, null); assert.equal(receipt.nextStateCommitment, null);
    assert.equal(receipt.transitionSequence, null);
  }
  const applicationDecision = input.system.authorizeAction(selected.signedIntent, Number(selected.arguments[0].effectiveAt));
  assert(applicationDecision.allowed, "Actual M5 ordinary user must independently satisfy the action policy");
  assert.equal(applicationDecision.nextState, template.states.find(label =>
    hex(hashId("private-state-id", label)) === hex(selected.expectedNextState.stateIdHash)));
  input.emit("ordinary-action-finalized-and-receipt-verified", { transactionId: accepted.transactionId,
    contractAddress: input.address, receipt, instanceStateSequence: String(expectedSequence), transitioning,
    actualM4M5ApisUsed: true, exactIndexedCallAndInsertionVerified: true, milestoneComplete: false });
  return { receipt, setup, candidates, state, sequence, selectedCandidateIndex: input.selectedCandidate ?? 0,
    privateSentinels: [...setup.privateSentinels, source.assignmentId, hex(assignmentKey), hex(nextNonce),
      ...candidates.flatMap(candidate => candidate.privateSentinels)] };
}
