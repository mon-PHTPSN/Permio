import { createHash } from "node:crypto";
import { encodeCanonical } from "@permio/protocol";
import { hashScenarioTemplate, parseScenarioTemplate } from "@permio/scenario-domain";
import {
  Bytes32Descriptor, CompactTypeMerkleTreeDigest, CompactTypeMerkleTreePath, StateBoundedMerkleTree,
  type MerkleTreePath,
} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import {
  pureCircuits as pure, type RuntimeTemplateActionPolicy, type RuntimeBusinessPredicate,
  type RuntimeStateOpening, type RuntimeAllocationPolicyWitness,
} from "../contracts/managed/permio-authorization-v11/contract/index.js";
import { buildProofModuleBindingTree } from "./binding-manifest.ts";
import { createRuntimeBusinessPredicates } from "./business-predicates.ts";
import { orderProofModuleBindings } from "./canonical.ts";
import { decodeHex32 } from "./hex32.ts";
import type { Hex32, ProofModuleBinding, ProofModuleBindingManifest } from "./model.ts";
import { createRuntimeTemplateActionPolicy } from "./template-policy.ts";

const MODULE_ID = "private-state-transition-predicates";
const MODULE_VERSION = "1.0.0";
const FAMILY_ID = "private-state-transition-predicates-v1";
const TREE_DEPTH = 20;

function hex(value: Uint8Array): Hex32 {
  return `0x${Buffer.from(value).toString("hex")}`;
}

/** Data projection only; neither reviews nor activates the separately governed family. */
export function createRuntimeBusinessTemplateActionPolicy(templateInput: unknown, actionId: string) {
  const template = parseScenarioTemplate(templateInput);
  if (template.schemaVersion !== 2) throw new TypeError("Business policies require template schema 2");
  const action = template.actions.find(({ id }) => id === actionId);
  if (!action) throw new TypeError("runtime policy requires an exact declared template action");
  const profile = template.proofProfiles.find(({ id }) => id === action.proofProfileId)!;
  if (profile.circuitId !== FAMILY_ID || profile.publicOutputSchemaId !== "decision-receipt-v1") {
    throw new TypeError("UNSUPPORTED_PROOF_REQUIREMENT");
  }
  const schema1Projection = createRuntimeTemplateActionPolicy({ ...template, schemaVersion: 1,
    proofProfiles: template.proofProfiles.map(({ predicates: _predicates, ...p }) => ({
      ...p, circuitId: p.circuitId === FAMILY_ID ? "private-state-transition-v1" : p.circuitId,
    })),
  }, actionId);
  const predicates = createRuntimeBusinessPredicates(template, actionId);
  const commitments = predicates.map(predicate => pure.runtimeBusinessPredicateCommitment(predicate));
  const aligned = (value: Uint8Array) => ({ value: Bytes32Descriptor.toValue(value), alignment: Bytes32Descriptor.alignment() });
  let tree = new StateBoundedMerkleTree(TREE_DEPTH);
  commitments.forEach((value, index) => { tree = tree.update(BigInt(index), aligned(value)); });
  tree = tree.rehash();
  const root = tree.root();
  if (!root) throw new Error("Business predicate tree did not produce a root");
  const policy: RuntimeTemplateActionPolicy = {
    ...schema1Projection.policy, policyVersion: 4n,
    target: { ...schema1Projection.policy.target, templateContentHash: decodeHex32(hashScenarioTemplate(template).value) },
    proofFamilyHash: createHash("sha256").update(encodeCanonical("permio:proof-module-id:v1", [MODULE_ID])).digest(),
    predicatesRoot: CompactTypeMerkleTreeDigest.fromValue(root.value), predicateCount: BigInt(predicates.length),
  };
  const checkedIndex = (index: number): number => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= predicates.length) {
      throw new RangeError("Business predicate index outside the exact ordered profile");
    }
    return index;
  };
  return { ...schema1Projection, policy: structuredClone(policy), moduleId: MODULE_ID,
    configurationHash: hex(pure.runtimeTemplateActionPolicyCommitment(policy)),
    predicateAt(index: number): RuntimeBusinessPredicate {
      return structuredClone(predicates[checkedIndex(index)]!);
    },
    predicatePathAt(index: number): MerkleTreePath<Uint8Array> {
      const checked = checkedIndex(index);
      return new CompactTypeMerkleTreePath(TREE_DEPTH, Bytes32Descriptor)
        .fromValue(tree.pathForLeaf(BigInt(checked), aligned(commitments[checked]!)).value);
    },
  };
}

/** Creates exact configuration bindings without manufacturing approval evidence. */
export function createRuntimeBusinessPolicyBindingManifest(
  templateInput: unknown, selections: readonly Omit<ProofModuleBinding, "configurationHash">[],
): ProofModuleBindingManifest {
  const template = parseScenarioTemplate(templateInput);
  const manifest: ProofModuleBindingManifest = { manifestVersion: 1, bindings: selections.map(selection => {
    const fields = ["actionId", "proofProfileId", "moduleId", "moduleVersion", "implementationHash", "receiptSchemaHash"];
    if (!selection || Object.keys(selection).length !== fields.length ||
      Object.keys(selection).some(key => !fields.includes(key)) ||
      fields.some(key => typeof selection[key as keyof typeof selection] !== "string")) {
      throw new TypeError("runtime module selection contains missing or unsupported fields");
    }
    const projection = createRuntimeBusinessTemplateActionPolicy(template, selection.actionId);
    if (selection.moduleId !== MODULE_ID || selection.moduleVersion !== MODULE_VERSION) {
      throw new TypeError("UNSUPPORTED_PROOF_REQUIREMENT");
    }
    return { ...selection, configurationHash: projection.configurationHash };
  }) };
  orderProofModuleBindings(template, manifest);
  return manifest;
}

export function createRuntimeBusinessAllocationPolicyWitness(
  templateInput: unknown, manifest: ProofModuleBindingManifest, initialState: RuntimeStateOpening,
): RuntimeAllocationPolicyWitness {
  const template = parseScenarioTemplate(templateInput);
  const ordered = orderProofModuleBindings(template, manifest);
  const projections = template.actions.map(action => createRuntimeBusinessTemplateActionPolicy(template, action.id));
  ordered.forEach((binding, index) => {
    if (binding.configurationHash !== projections[index]!.configurationHash || binding.moduleId !== MODULE_ID ||
      binding.moduleVersion !== MODULE_VERSION) throw new TypeError("manifest does not contain the exact runtime policy configuration");
  });
  const policy = projections[0]!.policy;
  if (initialState.stateVersion !== 2n || hex(initialState.stateIdHash) !== hex(policy.initialStateIdHash) ||
    initialState.slotAssignmentCount !== 1n || initialState.slotBindingCount !== 1n ||
    initialState.slotAssignmentsRoot.field !== pure.runtimePrivateMapEmptyRoot().field ||
    initialState.slotBindingsRoot.field !== pure.runtimePrivateMapEmptyRoot().field ||
    initialState.nonce.length !== 32 || initialState.nonce.every(value => value === 0)) {
    throw new TypeError("runtime allocation requires the exact template initial-state opening");
  }
  const tree = buildProofModuleBindingTree(ordered);
  return { policy, binding: tree.compactBindingAt(0), bindingPath: tree.pathFor(0), initialState: structuredClone(initialState) };
}
