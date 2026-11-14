import assert from "node:assert/strict";
import { createPrivateKey, createPublicKey } from "node:crypto";
import { SlotBoundContextAccountSystem } from "@permio/context-accounts";
import { CredentialStatusTree, advanceRuntimeCredentialInstanceBinding,
  buildRuntimeScopeTrees, RuntimePrivateMap, hashM5ParticipantSlotAssignment,
  permioAuthorizationPureCircuits as pure, type RuntimeCredentialStatusCommand,
  type RuntimeSlotCommand, type RuntimeSlotRecord, type RuntimeStateOpening } from "@permio/midnight-authorization";
import type { CapabilityScope } from "@permio/context-accounts";
import type { restoreM6GovernanceFixture, M6PreprodAdmissionRuntime } from "./run-live-m6-admission.ts";
import type { runBoundCredentialWorkflow } from "./m6-bound-credential-workflow.ts";

type Setup = Awaited<ReturnType<typeof runBoundCredentialWorkflow>>;
type Credentials = NonNullable<Setup["credentials"]>;
export type CertifiedPrepared = Omit<Credentials, "status" | "sessionPrivateKey"> & {
  statusSequence: bigint; accountPrivateKeyPem: string; sessionPrivateKeyPem: string;
};
export type AllocationCheckpoint = Parameters<NonNullable<M6PreprodAdmissionRuntime["checkpointAllocation"]>>[0];
type CredentialCall = readonly [bigint, RuntimeCredentialStatusCommand, ...unknown[]];

/** Checkpoints preserve data, not the Merkle-tree methods used by action paths. */
export function restoreCertifiedScope(scope: CapabilityScope, expected: ReturnType<typeof buildRuntimeScopeTrees>["roots"]) {
  const trees=buildRuntimeScopeTrees(scope);assert.deepEqual(trees.roots,expected);return trees;
}

/** Replay only the actual M4/M5 APIs; no network, wallet or transaction code. */
export function restoreCertifiedOrdinarySetup(input: {
  m4: ReturnType<typeof restoreM6GovernanceFixture>; allocated: AllocationCheckpoint;
  prepared: CertifiedPrepared; finalCall: CredentialCall; initialStatus?: CredentialStatusTree;
  rootSlotBeforeSession?: {source:ReturnType<SlotBoundContextAccountSystem["assignParticipantSlot"]>;
    command:RuntimeSlotCommand;record:RuntimeSlotRecord;priorState:RuntimeStateOpening;nextNonce:Uint8Array};
}) {
  const { m4, allocated: a, prepared: c, finalCall: call } = input;
  const auth = m4.registry.authorizeInstantiation(a.authorization.allocatorId, m4.activation,
    a.authorization.requestId, a.authorization.authorizedAt);
  assert.deepEqual(auth, a.authorization);
  const system = new SlotBoundContextAccountSystem(m4.registry);
  assert.deepEqual(system.createScenarioInstance({ instanceId: a.instance.instanceId,
    instantiationRequestId: a.instance.instantiationRequestId, template: m4.record.template,
    expiresAt: a.instance.expiresAt, capabilityIssuers: a.instance.capabilityIssuers }, a.instance.createdAt), a.instance);
  assert.deepEqual(system.registerContextAccount(c.accountSource, c.accountSource.registeredAt), c.accountSource);
  assert.deepEqual(system.issueRootCapability(c.grant.issuerRef, c.grant, c.grant.issuedAt), c.grant);
  if(input.rootSlotBeforeSession){
    const slot=input.rootSlotBeforeSession,{assignedBy,assignedAt,...assignment}=slot.source;
    assert.deepEqual(system.assignParticipantSlot(assignedBy,assignment,assignedAt),slot.source);
    const command=slot.command,assignments=new RuntimePrivateMap(),bindings=new RuntimePrivateMap();
    assert.equal(command.kind,1n);assert.equal(command.authorityKind,1n);assert.equal(command.stateSequence,2n);
    assert.deepEqual(command.target,a.allocation.target);assert.deepEqual(command.instanceCommitment,a.allocation.instanceCommitment);
    assert.deepEqual(command.allocationCommitment,pure.runtimeInstanceAllocationCommitment(a.allocation));
    assert.deepEqual(command.stateCommitment,pure.runtimeStateCommitment(slot.priorState));
    assert.deepEqual(command.subjectAccountCredentialCommitment,pure.runtimeAccountCredentialCommitment(c.account));
    assert.deepEqual(command.m5AssignmentCommitment,hashM5ParticipantSlotAssignment(slot.source));
    assert.equal(command.effectiveAt,BigInt(assignedAt));assert.equal(slot.record.status,1n);
    assert.deepEqual(slot.record.assignment,pure.runtimeSlotAssignmentFromCommand(command));
    assert.deepEqual(slot.priorState.slotAssignmentsRoot,assignments.root);assert.equal(slot.priorState.slotAssignmentCount,assignments.count);
    assert.deepEqual(slot.priorState.slotBindingsRoot,bindings.root);assert.equal(slot.priorState.slotBindingCount,bindings.count);
    assignments.insert(command.assignmentIdHash,pure.runtimeSlotRecordCommitment(slot.record));
    bindings.insert(pure.runtimeSlotBindingKey(command),command.assignmentIdHash);
    assert.notDeepEqual(slot.nextNonce,slot.priorState.nonce);
    assert.deepEqual(c.binding.state,{...slot.priorState,lastMutationAt:command.effectiveAt,slotAssignmentsRoot:assignments.root,
      slotAssignmentCount:assignments.count,slotBindingsRoot:bindings.root,slotBindingCount:bindings.count,nonce:slot.nextNonce});
  }
  assert.deepEqual(system.issueSession(c.accountSource.accountId, c.grant.grantId, c.sessionSource,
    c.sessionSource.issuedAt), c.sessionSource);
  const initialSequence=input.initialStatus?.sequence??0n;
  const credentialSequence=input.rootSlotBeforeSession?3n:2n;
  assert.equal(c.statusSequence, initialSequence+2n); assert.equal(c.binding.stateSequence, credentialSequence);
  assert.equal(call[0], 4n); assert.equal(call[1].credentialKind, 3n);
  assert.equal(call[1].credentialStatusRootSequence, initialSequence+2n);
  assert.deepEqual(call[16], c.session.credential); assert.deepEqual(call[17], c.binding);
  assert.deepEqual(call[1].credentialCommitment, pure.runtimeSessionCredentialCommitment(c.session.credential));
  const binding = advanceRuntimeCredentialInstanceBinding(c.binding, call[1]);
  assert.equal(binding.stateSequence, credentialSequence+1n);
  const status = input.initialStatus??new CredentialStatusTree();
  const accountHash = pure.runtimeAccountCredentialCommitment(c.account);
  for (const [kind, credentialCommitment, index] of [
    ["account", accountHash, c.account.statusIndex],
    ["capability", pure.runtimeCapabilityCredentialCommitment(c.capability.credential), c.capability.credential.statusIndex],
    ["session", pure.runtimeSessionCredentialCommitment(c.session.credential), c.session.credential.statusIndex],
  ] as const) status.issue({ namespace: a.instance.namespace, kind, credentialCommitment, statusIndex: index,
    revocationAuthorityAccountCredentialCommitment: kind === "capability" ? new Uint8Array(32) : accountHash });
  assert.equal(status.sequence, initialSequence+3n);
  const sessionPrivateKey = createPrivateKey(c.sessionPrivateKeyPem);
  assert.equal(createPublicKey(sessionPrivateKey).export({ type: "spki", format: "pem" }).toString(), c.sessionSource.publicKeyPem);
  const { accountPrivateKeyPem: _accountKey, sessionPrivateKeyPem: _sessionKey, statusSequence: _seq, ...saved } = c;
  const setup: Setup = { privateSentinels: [c.accountSource.accountId, c.grant.grantId, c.sessionSource.sessionId,
    ...c.scope.resources, ...c.scope.recipients, c.accountSource.publicKeyPem, c.sessionSource.publicKeyPem],
    credentials: { ...saved, binding, status, sessionPrivateKey,
      capability:{...saved.capability,scope:restoreCertifiedScope(saved.grant.scope,saved.capability.credential.scopeRoots)},
      session:{...saved.session,scope:restoreCertifiedScope(saved.sessionSource.scope,saved.session.credential.scopeRoots)} } };
  return { system, setup };
}
