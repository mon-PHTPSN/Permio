import { createHash } from "node:crypto";
import { encodeCanonical } from "@permio/protocol";
import { hashScenarioTemplate, parseScenarioTemplate, parseSemanticVersion } from "@permio/scenario-domain";
import {
  Bytes32Descriptor, CompactTypeMerkleTreeDigest, CompactTypeMerkleTreePath,
  StateBoundedMerkleTree, type MerkleTreePath,
} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import {
  pureCircuits as pure, type RuntimeTemplateActionPolicy, type RuntimeTemplateTransition,
  type RuntimeStateOpening, type RuntimeAllocationPolicyWitness, type RuntimeParticipantSlotRule,
} from "../contracts/managed/permio-authorization/contract/index.js";
import { hashProtocolIdentifier, orderProofModuleBindings } from "./canonical.ts";
import { hashRuntimeIdentifier } from "./runtime-credentials.ts";
import { buildProofModuleBindingTree } from "./binding-manifest.ts";
import type { Hex32, ProofModuleBinding, ProofModuleBindingManifest } from "./model.ts";

export const RUNTIME_TEMPLATE_POLICY_VERSION = 2 as const;
const FAMILIES = new Map([
  ["delegated-capability-action-v1", "delegated-capability-action"],
  ["private-state-transition-v1", "private-state-transition"],
]);

function hash(kind: string, values: readonly string[]): Uint8Array {
  return createHash("sha256").update(encodeCanonical(`permio:${kind}:v1`, values)).digest();
}
function bytes(value: Hex32): Uint8Array {
  return Uint8Array.from(Buffer.from(value.slice(2), "hex"));
}
function hex(value: Uint8Array): Hex32 {
  return `0x${Buffer.from(value).toString("hex")}`;
}

/** Complete private rule tree, including allowed contexts and every assigner alternative. */
export function createRuntimeParticipantSlotRules(templateInput: unknown) {
  const template = parseScenarioTemplate(templateInput);
  const slots = new Map(template.participantSlots.map((slot) => [slot.id, slot]));
  // Bound the Cartesian expansion before allocating or hashing rule leaves.
  let count = 0;
  for (const context of template.contexts) {
    for (const slotId of context.allowedSlotIds) {
      count += slots.get(slotId)!.assignableBy.length;
      if (count > 2 ** 20) throw new RangeError("runtime slot rule tree exceeds depth-20 capacity");
    }
  }
  const entries = template.contexts.flatMap((context) => context.allowedSlotIds.flatMap((slotId) =>
    slots.get(slotId)!.assignableBy.map((assignableBy) => ({
      contextId: context.id, slotId, assignableBy,
      rule: {
        ruleVersion: 1n,
        contextHash: hashRuntimeIdentifier("context-id", context.id),
        slotIdHash: hash("participant-slot-id", [slotId]),
        authorityKind: assignableBy === "@instance-creator" ? 1n : assignableBy === "@namespace-governance" ? 2n : 3n,
        authoritySlotIdHash: assignableBy.startsWith("@") ? new Uint8Array(32) : hash("participant-slot-id", [assignableBy]),
      } satisfies RuntimeParticipantSlotRule,
    })),
  ));
  if (entries.length === 0 || entries.length > 2 ** 20) {
    throw new RangeError("runtime slot rule tree requires one through depth-20 capacity rules");
  }
  const commitments = entries.map((entry) => pure.runtimeParticipantSlotRuleCommitment(entry.rule));
  const aligned = (value: Uint8Array) => ({ value: Bytes32Descriptor.toValue(value), alignment: Bytes32Descriptor.alignment() });
  let tree = new StateBoundedMerkleTree(20);
  commitments.forEach((value, index) => { tree = tree.update(BigInt(index), aligned(value)); });
  tree = tree.rehash();
  const root = tree.root();
  if (!root) throw new Error("runtime slot rule tree did not produce a root");
  return {
    root: CompactTypeMerkleTreeDigest.fromValue(root.value), count: BigInt(entries.length),
    ruleAt(index: number): RuntimeParticipantSlotRule {
      const entry = entries[index];
      if (!Number.isSafeInteger(index) || !entry) throw new RangeError("slot rule index outside template policy");
      return structuredClone(entry.rule);
    },
    witnessFor(contextId: string, slotId: string, assignableBy: string) {
      const index = entries.findIndex((entry) => entry.contextId === contextId &&
        entry.slotId === slotId && entry.assignableBy === assignableBy);
      if (index < 0) throw new TypeError("slot assigner is not allowed in the exact template context");
      return {
        rule: structuredClone(entries[index]!.rule),
        path: new CompactTypeMerkleTreePath(20, Bytes32Descriptor)
          .fromValue(tree.pathForLeaf(BigInt(index), aligned(commitments[index]!)).value),
      };
    },
  };
}

/** Data projection only: does not validate evidence, review, approve or activate a module. */
export function createRuntimeTemplateActionPolicy(templateInput: unknown, actionId: string) {
  const template = parseScenarioTemplate(templateInput);
  const actionIndex = template.actions.findIndex((action) => action.id === actionId);
  const action = template.actions[actionIndex];
  if (!action) throw new TypeError("runtime policy requires an exact declared template action");
  const profile = template.proofProfiles.find((candidate) => candidate.id === action.proofProfileId)!;
  const moduleId = FAMILIES.get(profile.circuitId);
  if (!moduleId || profile.publicOutputSchemaId !== "decision-receipt-v1") {
    throw new TypeError("UNSUPPORTED_PROOF_REQUIREMENT");
  }
  const rule = template.capabilityRules.find((candidate) => candidate.id === action.capabilityRuleId)!;
  const slotRules = createRuntimeParticipantSlotRules(template);
  const version = parseSemanticVersion(template.version);
  const transitions: RuntimeTemplateTransition[] = template.transitions
    .filter((row) => row.actionId === actionId)
    .map((row) => ({ transitionVersion: 1n,
      actionIdHash: hashRuntimeIdentifier("action-id", actionId),
      fromStateIdHash: hash("private-state-id", [row.fromState]),
      toStateIdHash: hash("private-state-id", [row.toState]) }));
  if (transitions.length > 2 ** 20) throw new RangeError("runtime transition tree exceeds depth-20 capacity");
  const commitments = transitions.map((row) => pure.runtimeTemplateTransitionCommitment(row));
  const aligned = (value: Uint8Array) => ({ value: Bytes32Descriptor.toValue(value), alignment: Bytes32Descriptor.alignment() });
  let tree = new StateBoundedMerkleTree(20);
  commitments.forEach((value, index) => { tree = tree.update(BigInt(index), aligned(value)); });
  tree = tree.rehash();
  const root = tree.root();
  if (!root) throw new Error("runtime transition tree did not produce a root");
  const adapter = template.executionAdapters.find((candidate) => candidate.id === action.executionAdapterId);
  const policy: RuntimeTemplateActionPolicy = {
    policyVersion: BigInt(RUNTIME_TEMPLATE_POLICY_VERSION),
    target: { namespaceHash: bytes(hashProtocolIdentifier("namespace", template.namespace)),
      templateIdHash: bytes(hashProtocolIdentifier("template-id", template.templateId)),
      semanticVersion: { major: BigInt(version.major), minor: BigInt(version.minor), patch: BigInt(version.patch) },
      templateContentHash: bytes(hashScenarioTemplate(template).value) },
    actionIndex: BigInt(actionIndex), bindingActionIdHash: hash("action-id", [action.id]),
    actionIdHash: hashRuntimeIdentifier("action-id", action.id),
    proofProfileIdHash: hash("proof-profile-id", [action.proofProfileId]),
    proofFamilyHash: hash("proof-module-id", [moduleId]),
    contextHash: hashRuntimeIdentifier("context-id", action.contextId),
    actorSlotIdHash: hash("participant-slot-id", [action.actorSlotId]),
    slotAssignmentRulesRoot: slotRules.root, slotAssignmentRuleCount: slotRules.count,
    initialStateIdHash: hash("private-state-id", [template.initialState]),
    resourceSelectorHash: hashRuntimeIdentifier("resource-selector", rule.resourceSelector),
    purposeHash: hashRuntimeIdentifier("purpose", action.purpose),
    recipientKindHash: hashRuntimeIdentifier("recipient-kind", action.recipientKind),
    disclosurePolicyIdHash: hashRuntimeIdentifier("disclosure-policy-id", rule.disclosurePolicyId),
    capabilityRuleIdHash: hash("capability-rule-id", [rule.id]),
    maxCapabilityDuration: BigInt(rule.validForSeconds), maxDelegationDepth: BigInt(rule.maxDelegationDepth),
    revocable: rule.revocable,
    inputRecordTypesHash: hash("input-record-types", action.inputRecordTypes),
    outputClaimTypesHash: hash("output-claim-types", action.outputClaimTypes),
    executionAdapterHash: hash("execution-adapter", adapter ? ["present", adapter.id, adapter.kind, adapter.schemaId] : ["absent"]),
    transitionRoot: CompactTypeMerkleTreeDigest.fromValue(root.value), transitionCount: BigInt(transitions.length),
  };
  return { policy: structuredClone(policy), moduleId, slotRules,
    configurationHash: hex(pure.runtimeTemplateActionPolicyCommitment(policy)),
    transitionAt(index: number): RuntimeTemplateTransition {
      const row = transitions[index];
      if (!Number.isSafeInteger(index) || !row) throw new RangeError("transition index outside template policy");
      return structuredClone(row);
    },
    transitionPathAt(index: number): MerkleTreePath<Uint8Array> {
      const commitment = commitments[index];
      if (!Number.isSafeInteger(index) || !commitment) throw new RangeError("transition index outside template policy");
      return new CompactTypeMerkleTreePath(20, Bytes32Descriptor)
        .fromValue(tree.pathForLeaf(BigInt(index), aligned(commitment)).value);
    },
  };
}

/** Explicitly constructs configuration hashes; never silently repairs a supplied manifest. */
export function createRuntimePolicyBindingManifest(
  templateInput: unknown,
  selections: readonly Omit<ProofModuleBinding, "configurationHash">[],
): ProofModuleBindingManifest {
  const template = parseScenarioTemplate(templateInput);
  const manifest: ProofModuleBindingManifest = { manifestVersion: 1, bindings: selections.map((selection) => {
    const fields = ["actionId", "proofProfileId", "moduleId", "moduleVersion", "implementationHash", "receiptSchemaHash"];
    if (!selection || Object.keys(selection).length !== fields.length ||
        Object.keys(selection).some((key) => !fields.includes(key)) ||
        fields.some((key) => typeof selection[key as keyof typeof selection] !== "string")) {
      throw new TypeError("runtime module selection contains missing or unsupported fields");
    }
    const projection = createRuntimeTemplateActionPolicy(template, selection.actionId);
    if (selection.moduleId !== projection.moduleId || selection.moduleVersion !== "1.0.0") {
      throw new TypeError("UNSUPPORTED_PROOF_REQUIREMENT");
    }
    return { ...selection, configurationHash: projection.configurationHash };
  }) };
  orderProofModuleBindings(template, manifest);
  return manifest;
}

export function createRuntimeAllocationPolicyWitness(
  templateInput: unknown, manifest: ProofModuleBindingManifest, initialState: RuntimeStateOpening,
): RuntimeAllocationPolicyWitness {
  const template = parseScenarioTemplate(templateInput);
  const ordered = orderProofModuleBindings(template, manifest);
  const projections = template.actions.map((action) => createRuntimeTemplateActionPolicy(template, action.id));
  ordered.forEach((binding, index) => {
    const projection = projections[index]!;
    if (binding.configurationHash !== projection.configurationHash || binding.moduleId !== projection.moduleId ||
        binding.moduleVersion !== "1.0.0") throw new TypeError("activated manifest does not contain the exact runtime policy configuration");
  });
  const policy = projections[0]!.policy;
  if (initialState.stateVersion !== 2n || hex(initialState.stateIdHash) !== hex(policy.initialStateIdHash) ||
      initialState.slotAssignmentCount !== 1n || initialState.slotBindingCount !== 1n ||
      initialState.slotAssignmentsRoot.field !== pure.runtimePrivateMapEmptyRoot().field ||
      initialState.slotBindingsRoot.field !== pure.runtimePrivateMapEmptyRoot().field ||
      initialState.nonce.length !== 32 || initialState.nonce.every((value) => value === 0)) {
    throw new TypeError("runtime allocation requires the exact template initial-state opening");
  }
  const tree = buildProofModuleBindingTree(ordered);
  return { policy, binding: tree.compactBindingAt(0), bindingPath: tree.pathFor(0), initialState: structuredClone(initialState) };
}
