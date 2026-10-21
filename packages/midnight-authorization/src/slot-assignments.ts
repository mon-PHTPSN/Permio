import type { ContextAccount, ParticipantSlotAssignment, SlotBoundContextAccountSystem } from "@permio/context-accounts";
import { hashScenarioTemplate, parseScenarioTemplate } from "@permio/scenario-domain";
import type { ScenarioGovernanceRegistry, TemplateTarget } from "@permio/scenario-governance";
import type { MerkleTreePath } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { pureCircuits, type RuntimeParticipantSlotRule, type RuntimeTemplateActionPolicy } from "../contracts/managed/permio-authorization/contract/index.js";
import { createRuntimeTemplateActionPolicy } from "./template-policy.ts";

type AssignmentSource = Pick<SlotBoundContextAccountSystem,
  "getScenarioInstance" | "getContextAccount" | "getParticipantSlotAssignment" | "isParticipantSlotActive">;

export interface PrepareRuntimeSlotAssignmentChainInput {
  readonly template: unknown;
  readonly assignments: AssignmentSource;
  readonly governance: Pick<ScenarioGovernanceRegistry, "getNamespacePolicy">;
  readonly instanceId: string;
  readonly actionId: string;
  readonly subjectAccountId: string;
  readonly assignmentId: string;
  readonly evaluatedAt: number;
}

export interface PrivateRuntimeSlotAssignmentEntry {
  readonly assignment: ParticipantSlotAssignment;
  readonly account: ContextAccount;
  readonly rule: RuntimeParticipantSlotRule;
  readonly rulePath: MerkleTreePath<Uint8Array>;
}

/** Private witness preparation, NEVER a chain credential, receipt or authorization decision. */
export interface PrivateRuntimeSlotAssignmentChain {
  readonly witnessVersion: 1;
  readonly kind: "private-witness-only";
  readonly evaluatedAt: bigint;
  readonly policy: RuntimeTemplateActionPolicy;
  /** Exact root-to-terminal M5 provenance; no ancestor may be omitted. */
  readonly entries: readonly PrivateRuntimeSlotAssignmentEntry[];
}

function sameTarget(left: TemplateTarget, right: TemplateTarget): boolean {
  return left.namespace === right.namespace && left.templateId === right.templateId &&
    left.templateVersion === right.templateVersion && left.templateHash === right.templateHash;
}

/**
 * Reads an authenticated application-owned M5 source and builds complete private
 * openings against the current versioned policy. The ledger entry MUST independently verify
 * assignment issuance signatures/current status and use the actual activated
 * configuration and current ledger root/time. None of those are granted here.
 */
export function prepareRuntimeSlotAssignmentChain(
  input: PrepareRuntimeSlotAssignmentChainInput,
): PrivateRuntimeSlotAssignmentChain {
  if (!Number.isSafeInteger(input.evaluatedAt) || input.evaluatedAt < 0) {
    throw new TypeError("slot witness evaluation time must be a non-negative safe integer");
  }
  const template = parseScenarioTemplate(input.template);
  const expected: TemplateTarget = {
    namespace: template.namespace, templateId: template.templateId,
    templateVersion: template.version, templateHash: hashScenarioTemplate(template).value,
  };
  const instance = input.assignments.getScenarioInstance(input.instanceId);
  if (!sameTarget(instance, expected) || instance.createdAt > input.evaluatedAt ||
      instance.expiresAt <= input.evaluatedAt ||
      (instance.revokedAt !== null && instance.revokedAt <= input.evaluatedAt)) {
    throw new TypeError("slot witness requires the active instance's exact template and lifetime");
  }
  const action = template.actions.find((candidate) => candidate.id === input.actionId);
  if (!action) throw new TypeError("slot witness requires an exact declared action");
  const projection = createRuntimeTemplateActionPolicy(template, action.id);
  const policy = projection.policy;
  const entries: PrivateRuntimeSlotAssignmentEntry[] = [];
  const seen = new Set<string>();
  let assignmentId = input.assignmentId;
  let expectedAccountId = input.subjectAccountId;
  let expectedSlotId: string | undefined = action.actorSlotId;
  while (true) {
    if (seen.has(assignmentId)) throw new TypeError("cyclic slot-assignment provenance");
    seen.add(assignmentId);
    const assignment = input.assignments.getParticipantSlotAssignment(assignmentId);
    if (assignment.assignmentVersion !== 1 || assignment.assignmentId !== assignmentId ||
        !sameTarget(assignment, expected) || assignment.instanceId !== input.instanceId ||
        assignment.contextId !== action.contextId || assignment.subjectAccountId !== expectedAccountId ||
        (expectedSlotId !== undefined && assignment.slotId !== expectedSlotId) ||
        !Number.isSafeInteger(assignment.assignedAt) || assignment.assignedAt < instance.createdAt ||
        assignment.assignedAt > input.evaluatedAt ||
        !input.assignments.isParticipantSlotActive(assignmentId, input.evaluatedAt)) {
      throw new TypeError("slot assignment is inactive or substitutes its exact template, instance, context, slot or holder");
    }
    const account = input.assignments.getContextAccount(assignment.subjectAccountId);
    if (account.accountId !== expectedAccountId || account.instanceId !== input.instanceId ||
        account.contextId !== action.contextId || account.registeredAt > assignment.assignedAt ||
        (account.revokedAt !== null && account.revokedAt <= input.evaluatedAt)) {
      throw new TypeError("slot assignment holder is not the exact active context account");
    }
    const actor = assignment.assignedBy;
    let assignableBy: string;
    let parent: ParticipantSlotAssignment | undefined;
    switch (actor.kind) {
      case "instance-creator":
        if (actor.principalId !== instance.allocatedBy) throw new TypeError("slot assigner is not this instance's creator");
        assignableBy = "@instance-creator";
        break;
      case "namespace-governance": {
        const namespacePolicy = input.governance.getNamespacePolicy(expected.namespace);
        if (namespacePolicy.namespace !== expected.namespace || !namespacePolicy.governanceAuthorities.some(
          (authority) => authority.principalId === actor.principalId,
        )) throw new TypeError("slot assigner is not governance for the exact namespace");
        assignableBy = "@namespace-governance";
        break;
      }
      case "occupied-slot":
        parent = input.assignments.getParticipantSlotAssignment(actor.assignmentId);
        if (parent.assignmentId !== actor.assignmentId || parent.subjectAccountId !== actor.accountId ||
            parent.assignedAt > assignment.assignedAt) {
          throw new TypeError("slot assignment substitutes its parent holder or predates its parent");
        }
        assignableBy = parent.slotId;
        break;
      default:
        throw new TypeError("unsupported slot assignment authority kind");
    }
    const witness = projection.slotRules.witnessFor(action.contextId, assignment.slotId, assignableBy);
    pureCircuits.assertRuntimeParticipantSlotRule(policy, witness.rule, witness.path,
      policy.contextHash, witness.rule.slotIdHash);
    entries.push({ assignment, account, rule: witness.rule, rulePath: witness.path });
    if (!parent) break;
    assignmentId = parent.assignmentId;
    expectedAccountId = parent.subjectAccountId;
    expectedSlotId = parent.slotId;
  }
  return structuredClone({
    witnessVersion: 1, kind: "private-witness-only", evaluatedAt: BigInt(input.evaluatedAt),
    policy, entries: entries.reverse(),
  });
}
