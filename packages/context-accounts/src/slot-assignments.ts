import { parseScenarioTemplate, type ScenarioTemplate } from "@permio/scenario-domain";
import type { ScenarioGovernanceRegistry, TemplateTarget } from "@permio/scenario-governance";

import { verifySignedActionIntent } from "./action-intent.ts";
import { ContextAuthorizationError } from "./errors.ts";
import type {
  ActionAuthorizationDecision,
  CapabilityGrant,
  ContextAccount,
  ScenarioInstance,
  SessionGrant,
  SignedActionIntent,
} from "./model.ts";
import { ContextAccountSystem, type CreateScenarioInstanceInput } from "./system.ts";

export const SLOT_ASSIGNMENT_VERSION = 1 as const;

/** Authenticated caller references, not credentials or proof of identity. */
export type SlotAssignmentActor =
  | { readonly kind: "instance-creator"; readonly principalId: string }
  | { readonly kind: "namespace-governance"; readonly principalId: string }
  | {
      readonly kind: "occupied-slot";
      readonly accountId: string;
      readonly assignmentId: string;
    };

export interface AssignParticipantSlotInput extends TemplateTarget {
  readonly assignmentId: string;
  readonly instanceId: string;
  readonly contextId: string;
  readonly slotId: string;
  readonly subjectAccountId: string;
}

/** Private, append-only provenance; revocations are separate records. */
export interface ParticipantSlotAssignment extends AssignParticipantSlotInput {
  readonly assignmentVersion: typeof SLOT_ASSIGNMENT_VERSION;
  readonly assignedBy: SlotAssignmentActor;
  readonly assignedAt: number;
}

export interface ParticipantSlotRevocation {
  readonly assignmentVersion: typeof SLOT_ASSIGNMENT_VERSION;
  readonly assignmentId: string;
  readonly revokedBy: SlotAssignmentActor;
  readonly revokedAt: number;
}

export type SlotBoundActionDecision = ActionAuthorizationDecision | {
  readonly allowed: false;
  readonly reason: "SLOT_NOT_ASSIGNED" | "STALE_OPERATION_TIME";
};

type GovernanceSource = Pick<ScenarioGovernanceRegistry,
  "getInstantiationAuthorization" | "getTemplate" | "getNamespacePolicy">;

function assertTime(at: number): void {
  if (!Number.isSafeInteger(at) || at < 0) {
    throw new ContextAuthorizationError("INVALID_TIME", "time must be a non-negative safe integer");
  }
}

function assertId(id: string): void {
  if (typeof id !== "string" || !/^[a-z][a-z0-9]*(?:[._:@/-][a-z0-9]+)*$/.test(id)) {
    throw new ContextAuthorizationError("INVALID_INPUT", "invalid slot assignment identifier");
  }
}

function sameTarget(left: TemplateTarget, right: TemplateTarget): boolean {
  return left.namespace === right.namespace && left.templateId === right.templateId &&
    left.templateVersion === right.templateVersion && left.templateHash === right.templateHash;
}

/**
 * Additive M5 patch. Owns its legacy engine privately: every action must pass
 * the slot guard before the legacy engine can consume its nonce or state.
 * The original ContextAccountSystem API and historical evidence are unchanged.
 */
export class SlotBoundContextAccountSystem {
  readonly #base: ContextAccountSystem;
  readonly #governance: GovernanceSource;
  readonly #templates = new Map<string, ScenarioTemplate>();
  readonly #assignments = new Map<string, ParticipantSlotAssignment>();
  readonly #revocations = new Map<string, ParticipantSlotRevocation>();
  readonly #lastMutationAt = new Map<string, number>();

  constructor(governance: GovernanceSource) {
    this.#governance = governance;
    this.#base = new ContextAccountSystem(governance);
  }

  createScenarioInstance(input: CreateScenarioInstanceInput, at: number): ScenarioInstance {
    const template = parseScenarioTemplate(input.template);
    const instance = this.#base.createScenarioInstance(input, at);
    this.#templates.set(instance.instanceId, structuredClone(template));
    this.#lastMutationAt.set(instance.instanceId, at);
    return instance;
  }

  registerContextAccount(...args: Parameters<ContextAccountSystem["registerContextAccount"]>): ContextAccount {
    return this.#mutate(args[0].instanceId, args[1], () => this.#base.registerContextAccount(...args));
  }

  issueRootCapability(...args: Parameters<ContextAccountSystem["issueRootCapability"]>): CapabilityGrant {
    return this.#mutate(args[1].instanceId, args[2], () => this.#base.issueRootCapability(...args));
  }

  delegateCapability(...args: Parameters<ContextAccountSystem["delegateCapability"]>): CapabilityGrant {
    const parent = this.#base.getCapabilityGrant(args[1]);
    return this.#mutate(parent.instanceId, args[3], () => this.#base.delegateCapability(...args));
  }

  issueSession(...args: Parameters<ContextAccountSystem["issueSession"]>): SessionGrant {
    const grant = this.#base.getCapabilityGrant(args[1]);
    return this.#mutate(grant.instanceId, args[3], () => this.#base.issueSession(...args));
  }

  revokeCapability(...args: Parameters<ContextAccountSystem["revokeCapability"]>): CapabilityGrant {
    const grant = this.#base.getCapabilityGrant(args[1]);
    return this.#mutate(grant.instanceId, args[2], () => this.#base.revokeCapability(...args));
  }

  revokeSession(...args: Parameters<ContextAccountSystem["revokeSession"]>): SessionGrant {
    const session = this.#base.getSessionGrant(args[1]);
    return this.#mutate(session.instanceId, args[2], () => this.#base.revokeSession(...args));
  }

  revokeAccount(...args: Parameters<ContextAccountSystem["revokeAccount"]>): ContextAccount {
    const account = this.#base.getContextAccount(args[0]);
    return this.#mutate(account.instanceId, args[1], () => this.#base.revokeAccount(...args));
  }

  revokeInstance(...args: Parameters<ContextAccountSystem["revokeInstance"]>): ScenarioInstance {
    return this.#mutate(args[1], args[2], () => this.#base.revokeInstance(...args));
  }

  getScenarioInstance(instanceId: string): ScenarioInstance {
    return this.#base.getScenarioInstance(instanceId);
  }

  getContextAccount(accountId: string): ContextAccount {
    return this.#base.getContextAccount(accountId);
  }

  getCapabilityGrant(grantId: string): CapabilityGrant {
    return this.#base.getCapabilityGrant(grantId);
  }

  getSessionGrant(sessionId: string): SessionGrant {
    return this.#base.getSessionGrant(sessionId);
  }

  assignParticipantSlot(
    actor: SlotAssignmentActor,
    input: AssignParticipantSlotInput,
    assignedAt: number,
  ): ParticipantSlotAssignment {
    return this.#mutate(input.instanceId, assignedAt, () => {
      assertId(input.assignmentId);
      if (this.#assignments.has(input.assignmentId)) {
        throw new ContextAuthorizationError("DUPLICATE_ID", "assignment ID already exists, including history");
      }
      const instance = this.#base.getScenarioInstance(input.instanceId);
      if (!sameTarget(instance, input)) {
        throw new ContextAuthorizationError("TARGET_MISMATCH", "assignment must name the instance's exact M4 template target");
      }
      this.#assertActiveInstance(instance, assignedAt);
      const subject = this.#base.getContextAccount(input.subjectAccountId);
      if (subject.instanceId !== input.instanceId || subject.contextId !== input.contextId) {
        throw new ContextAuthorizationError("INVALID_SCOPE", "slot subject must belong to the same instance and context");
      }
      if (!this.#accountIsActive(subject, assignedAt)) {
        throw new ContextAuthorizationError("REVOKED", "slot subject is not active");
      }
      const assignedBy = this.#eligibleActor(actor, instance, input.contextId, input.slotId, assignedAt);
      if (this.#findActiveAssignment(input, assignedAt) !== undefined) {
        throw new ContextAuthorizationError("DUPLICATE_ID", "account already occupies this slot in this context");
      }
      const record: ParticipantSlotAssignment = {
        assignmentVersion: SLOT_ASSIGNMENT_VERSION,
        assignmentId: input.assignmentId,
        namespace: instance.namespace,
        templateId: instance.templateId,
        templateVersion: instance.templateVersion,
        templateHash: instance.templateHash,
        instanceId: input.instanceId,
        contextId: input.contextId,
        slotId: input.slotId,
        subjectAccountId: input.subjectAccountId,
        assignedBy,
        assignedAt,
      };
      this.#assignments.set(record.assignmentId, record);
      return structuredClone(record);
    });
  }

  revokeParticipantSlot(
    actor: SlotAssignmentActor,
    assignmentId: string,
    revokedAt: number,
  ): ParticipantSlotRevocation {
    const record = this.#assignment(assignmentId);
    return this.#mutate(record.instanceId, revokedAt, () => {
      const instance = this.#base.getScenarioInstance(record.instanceId);
      this.#assertActiveInstance(instance, revokedAt);
      if (this.#revocations.has(assignmentId)) {
        throw new ContextAuthorizationError("REVOKED", "assignment already has an immutable revocation record");
      }
      const revokedBy = this.#eligibleActor(actor, instance, record.contextId, record.slotId, revokedAt);
      const revocation: ParticipantSlotRevocation = {
        assignmentVersion: SLOT_ASSIGNMENT_VERSION,
        assignmentId,
        revokedBy,
        revokedAt,
      };
      this.#revocations.set(assignmentId, revocation);
      return structuredClone(revocation);
    });
  }

  getParticipantSlotAssignment(assignmentId: string): ParticipantSlotAssignment {
    return structuredClone(this.#assignment(assignmentId));
  }

  getParticipantSlotRevocation(assignmentId: string): ParticipantSlotRevocation | null {
    this.#assignment(assignmentId);
    return structuredClone(this.#revocations.get(assignmentId) ?? null);
  }

  listParticipantSlotAssignments(instanceId: string, contextId: string): readonly ParticipantSlotAssignment[] {
    this.#base.getScenarioInstance(instanceId);
    return structuredClone([...this.#assignments.values()].filter(
      (record) => record.instanceId === instanceId && record.contextId === contextId,
    ));
  }

  isParticipantSlotActive(assignmentId: string, at: number): boolean {
    assertTime(at);
    return this.#assignmentIsActive(this.#assignment(assignmentId), at);
  }

  authorizeAction(intent: SignedActionIntent, authorizedAt: number): SlotBoundActionDecision {
    assertTime(authorizedAt);
    let session: SessionGrant;
    try {
      session = this.#base.getSessionGrant(intent.payload.sessionId);
    } catch (error) {
      if (!(error instanceof ContextAuthorizationError) || error.code !== "INVALID_INPUT") throw error;
      return { allowed: false, reason: "UNKNOWN_SESSION" };
    }
    // Authenticate before examining private assignment eligibility.
    if (!verifySignedActionIntent(intent, session.publicKeyPem)) {
      return { allowed: false, reason: "INVALID_SIGNATURE" };
    }
    if (!sameTarget(session, intent.payload)) return { allowed: false, reason: "TEMPLATE_MISMATCH" };
    if (session.instanceId !== intent.payload.instanceId) return { allowed: false, reason: "INSTANCE_MISMATCH" };
    if (session.contextId !== intent.payload.contextId) return { allowed: false, reason: "CONTEXT_MISMATCH" };
    if (authorizedAt < this.#lastMutationAt.get(session.instanceId)!) {
      return { allowed: false, reason: "STALE_OPERATION_TIME" };
    }
    const action = this.#templates.get(session.instanceId)!.actions.find(
      (candidate) => candidate.id === intent.payload.actionId,
    );
    if (action !== undefined && action.contextId === session.contextId && this.#findActiveAssignment({
      instanceId: session.instanceId,
      contextId: session.contextId,
      slotId: action.actorSlotId,
      subjectAccountId: session.subjectAccountId,
    }, authorizedAt) === undefined) {
      return { allowed: false, reason: "SLOT_NOT_ASSIGNED" };
    }
    // The original engine still checks capability/session scope, state, time,
    // signature, revocation and replay. Only success advances its state/nonce.
    const decision = this.#base.authorizeAction(intent, authorizedAt);
    if (decision.allowed) this.#lastMutationAt.set(session.instanceId, authorizedAt);
    return decision;
  }

  #assignment(assignmentId: string): ParticipantSlotAssignment {
    const record = this.#assignments.get(assignmentId);
    if (record === undefined) {
      throw new ContextAuthorizationError("INVALID_INPUT", "unknown participant-slot assignment");
    }
    return record;
  }

  #mutate<T>(instanceId: string, at: number, operation: () => T): T {
    assertTime(at);
    this.#base.getScenarioInstance(instanceId);
    if (at < this.#lastMutationAt.get(instanceId)!) {
      throw new ContextAuthorizationError("INVALID_TIME", "cannot backdate an operation before this instance's latest mutation");
    }
    const result = operation();
    this.#lastMutationAt.set(instanceId, at);
    return result;
  }

  #assertActiveInstance(instance: ScenarioInstance, at: number): void {
    if (instance.revokedAt !== null && instance.revokedAt <= at) {
      throw new ContextAuthorizationError("REVOKED", "instance is revoked");
    }
    if (at < instance.createdAt || at >= instance.expiresAt) {
      throw new ContextAuthorizationError("INVALID_TIME", "instance is outside its lifetime");
    }
  }

  #accountIsActive(account: ContextAccount, at: number): boolean {
    return account.registeredAt <= at && (account.revokedAt === null || account.revokedAt > at);
  }

  #eligibleActor(
    actor: SlotAssignmentActor,
    instance: ScenarioInstance,
    contextId: string,
    slotId: string,
    at: number,
  ): SlotAssignmentActor {
    const template = this.#templates.get(instance.instanceId)!;
    const context = template.contexts.find((candidate) => candidate.id === contextId);
    const slot = template.participantSlots.find((candidate) => candidate.id === slotId);
    if (slot === undefined || context === undefined || !context.allowedSlotIds.includes(slotId)) {
      throw new ContextAuthorizationError("INVALID_SCOPE", "slot is not permitted in this instance context");
    }
    switch (actor.kind) {
      case "instance-creator":
        assertId(actor.principalId);
        if (slot.assignableBy.includes("@instance-creator") && actor.principalId === instance.allocatedBy) {
          return { kind: actor.kind, principalId: actor.principalId };
        }
        break;
      case "namespace-governance": {
        assertId(actor.principalId);
        const policy = this.#governance.getNamespacePolicy(instance.namespace);
        if (policy.namespace === instance.namespace && slot.assignableBy.includes("@namespace-governance") &&
            policy.governanceAuthorities.some((principal) => principal.principalId === actor.principalId)) {
          return { kind: actor.kind, principalId: actor.principalId };
        }
        break;
      }
      case "occupied-slot": {
        assertId(actor.accountId);
        const parent = this.#assignment(actor.assignmentId);
        if (parent.subjectAccountId === actor.accountId && parent.instanceId === instance.instanceId &&
            parent.contextId === contextId && slot.assignableBy.includes(parent.slotId) &&
            this.#assignmentIsActive(parent, at)) {
          return { kind: actor.kind, accountId: actor.accountId, assignmentId: parent.assignmentId };
        }
        break;
      }
    }
    throw new ContextAuthorizationError("UNAUTHORIZED", "caller does not satisfy this slot's assignableBy rule");
  }

  #findActiveAssignment(
    scope: Pick<AssignParticipantSlotInput, "instanceId" | "contextId" | "slotId" | "subjectAccountId">,
    at: number,
  ): ParticipantSlotAssignment | undefined {
    return [...this.#assignments.values()].find((record) =>
      record.instanceId === scope.instanceId && record.contextId === scope.contextId &&
      record.slotId === scope.slotId && record.subjectAccountId === scope.subjectAccountId &&
      this.#assignmentIsActive(record, at),
    );
  }

  #assignmentIsActive(record: ParticipantSlotAssignment, at: number): boolean {
    const instance = this.#base.getScenarioInstance(record.instanceId);
    if (at < instance.createdAt || at >= instance.expiresAt ||
        (instance.revokedAt !== null && instance.revokedAt <= at)) return false;
    // Parent edges only reference already existing records, so this walk is a
    // finite, acyclic provenance chain. Ancestor revocations are prospective.
    let current: ParticipantSlotAssignment | undefined = record;
    while (current !== undefined) {
      const revokedAt = this.#revocations.get(current.assignmentId)?.revokedAt;
      if (current.assignedAt > at || (revokedAt !== undefined && revokedAt <= at) ||
          !this.#accountIsActive(this.#base.getContextAccount(current.subjectAccountId), at)) return false;
      current = current.assignedBy.kind === "occupied-slot"
        ? this.#assignment(current.assignedBy.assignmentId) : undefined;
    }
    return true;
  }
}
