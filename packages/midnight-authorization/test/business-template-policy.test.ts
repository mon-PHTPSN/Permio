import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { encodeCanonical } from "@permio/protocol";
import { hashScenarioTemplate, parseScenarioTemplate } from "@permio/scenario-domain";
import { pureCircuits as pure } from "../contracts/managed/permio-authorization-v11/contract/index.js";
import { createRuntimeTemplateActionPolicy } from "../src/template-policy.ts";
import { buildProofModuleBindingTree } from "../src/binding-manifest.ts";
import { orderProofModuleBindings } from "../src/canonical.ts";
import {
  createRuntimeBusinessTemplateActionPolicy,
  createRuntimeBusinessPolicyBindingManifest,
  createRuntimeBusinessAllocationPolicyWitness,
} from "../src/business-template-policy.ts";

function fixture() {
  const input = JSON.parse(readFileSync(new URL("../../scenario-generator/fixtures/generator-vector.v1.json", import.meta.url), "utf8")).input.template;
  input.schemaVersion = 2; input.version = "2.0.0";
  input.contexts[0].recordTypes.push("second-record"); input.contexts[0].claimTypes.push("second-result");
  input.actions[0].inputRecordTypes.push("second-record"); input.actions[0].outputClaimTypes.push("second-result");
  input.proofProfiles[0].circuitId = "private-state-transition-predicates-v1";
  input.proofProfiles[0].publicOutputSchemaId = "decision-receipt-v1";
  input.proofProfiles[0].predicates = [
    { kind: "current-record-v1", inputRecordType: "source-record", outputClaimType: "minimum-result" },
    { kind: "current-record-v1", inputRecordType: "second-record", outputClaimType: "second-result" },
  ];
  const template = parseScenarioTemplate(input);
  const actionId = template.actions[0]!.id;
  const selection = { actionId, proofProfileId: template.actions[0]!.proofProfileId,
    moduleId: "private-state-transition-predicates", moduleVersion: "1.0.0",
    implementationHash: `0x${"11".repeat(32)}` as const, receiptSchemaHash: `0x${"33".repeat(32)}` as const };
  return { input, template, actionId, selection };
}

describe("exact schema-2 business policy projection", () => {
  it("refuses to drop schema-2 predicates through either legacy proof family", () => {
    for (const circuitId of ["private-state-transition-v1", "delegated-capability-action-v1"]) {
      const f = fixture(); f.input.proofProfiles[0].circuitId = circuitId;
      assert.throws(() => createRuntimeTemplateActionPolicy(f.input, f.actionId), /UNSUPPORTED_PROOF_REQUIREMENT/);
    }
  });
  it("preserves every base policy field and restores the exact original schema-2 identity", () => {
    const f = fixture(), result = createRuntimeBusinessTemplateActionPolicy(f.template, f.actionId);
    const legacy = createRuntimeTemplateActionPolicy({ ...f.template, schemaVersion: 1,
      proofProfiles: f.template.proofProfiles.map(({ predicates: _predicates, ...p }) => ({ ...p, circuitId: "private-state-transition-v1" })) }, f.actionId);
    const { predicatesRoot: _root, predicateCount: _count, ...base } = result.policy;
    const familyHash = createHash("sha256").update(encodeCanonical("permio:proof-module-id:v1", ["private-state-transition-predicates"])).digest();
    assert.deepEqual(base, { ...legacy.policy, policyVersion: 4n,
      target: { ...legacy.policy.target, templateContentHash: Uint8Array.from(Buffer.from(hashScenarioTemplate(f.template).value.slice(2), "hex")) },
      proofFamilyHash: Uint8Array.from(familyHash) });
    assert.equal(result.moduleId, "private-state-transition-predicates");
    assert.equal(result.policy.predicateCount, 2n);
    assert.equal(result.configurationHash, `0x${Buffer.from(pure.runtimeTemplateActionPolicyCommitment(result.policy)).toString("hex")}`);
    assert.equal("active" in result, false);
    assert.deepEqual(result.transitionAt(0), legacy.transitionAt(0));
    assert.deepEqual(result.transitionPathAt(0), legacy.transitionPathAt(0));
    assert.deepEqual(result.inputRecords.at(0), legacy.inputRecords.at(0));
    assert.deepEqual(result.outputClaims.at(0), legacy.outputClaims.at(0));
    assert.deepEqual(result.slotRules.root, legacy.slotRules.root);
  });

  it("binds declaration order and predicate data to the new configuration", () => {
    const f = fixture(), first = createRuntimeBusinessTemplateActionPolicy(f.template, f.actionId);
    f.input.proofProfiles[0].predicates.reverse();
    const reordered = createRuntimeBusinessTemplateActionPolicy(f.input, f.actionId);
    assert.notEqual(reordered.configurationHash, first.configurationHash);
    assert.notDeepEqual(reordered.policy.predicatesRoot, first.policy.predicatesRoot);
    f.input.proofProfiles[0].predicates[0].inputRecordType = "source-record";
    assert.notEqual(createRuntimeBusinessTemplateActionPolicy(f.input, f.actionId).configurationHash, reordered.configurationHash);
  });

  it("returns exact ordered compiled predicate leaves and rejects unsafe tree indexes", () => {
    const f = fixture(), result = createRuntimeBusinessTemplateActionPolicy(f.template, f.actionId);
    for (const index of [0, 1]) {
      const predicate = result.predicateAt(index), path = result.predicatePathAt(index);
      assert.deepEqual(path.leaf, pure.runtimeBusinessPredicateCommitment(predicate));
      assert.equal(path.path.length, 20);
      assert.equal(predicate.inputIndex, BigInt(index));
    }
    const changed = result.predicateAt(0); changed.inputTypeHash.fill(0);
    assert.notDeepEqual(result.predicateAt(0).inputTypeHash, changed.inputTypeHash);
    for (const index of [-1, 0.5, Number.NaN, 2, 8]) {
      assert.throws(() => result.predicateAt(index), RangeError);
      assert.throws(() => result.predicatePathAt(index), RangeError);
    }
  });

  it("rejects legacy templates, unsupported families/receipts, and undeclared actions", () => {
    const f = fixture();
    const legacy = structuredClone(f.input); legacy.schemaVersion = 1; delete legacy.proofProfiles[0].predicates;
    assert.throws(() => createRuntimeBusinessTemplateActionPolicy(legacy, f.actionId), /schema 2/i);
    for (const [field, value] of [["circuitId", "private-state-transition-v1"], ["publicOutputSchemaId", "unknown-receipt"]]) {
      const unsupported = structuredClone(f.input); unsupported.proofProfiles[0][field!] = value;
      assert.throws(() => createRuntimeBusinessTemplateActionPolicy(unsupported, f.actionId), /UNSUPPORTED_PROOF_REQUIREMENT/);
    }
    assert.throws(() => createRuntimeBusinessTemplateActionPolicy(f.template, "unknown-action"), /exact declared/);
  });

  it("constructs an exact binding manifest accepted by the compiled v11 checker", () => {
    const f = fixture(), result = createRuntimeBusinessTemplateActionPolicy(f.template, f.actionId);
    const manifest = createRuntimeBusinessPolicyBindingManifest(f.template, [f.selection]);
    assert.equal(manifest.bindings[0]!.configurationHash, result.configurationHash);
    const tree = buildProofModuleBindingTree(orderProofModuleBindings(f.template, manifest));
    assert.doesNotThrow(() => pure.assertRuntimeTemplatePolicyBinding(result.policy.target, result.policy,
      tree.compactBindingAt(0), tree.pathFor(0), tree.root, 1n));
    assert.throws(() => pure.assertRuntimeTemplatePolicyBinding(result.policy.target, { ...result.policy, predicateCount: 1n },
      tree.compactBindingAt(0), tree.pathFor(0), tree.root, 1n));
  });

  it("rejects wrong module versions, extra selection fields, missing bindings, and substituted profiles", () => {
    const f = fixture();
    for (const selection of [
      { ...f.selection, moduleId: "private-state-transition" },
      { ...f.selection, moduleVersion: "1.0.1" },
      { ...f.selection, proofProfileId: "wrong-profile" },
      { ...f.selection, executable: "true" },
    ]) assert.throws(() => createRuntimeBusinessPolicyBindingManifest(f.template, [selection]), TypeError);
    assert.throws(() => createRuntimeBusinessPolicyBindingManifest(f.template, []), TypeError);
  });

  it("requires the exact new configuration and initial-state opening for allocation", () => {
    const f = fixture(), result = createRuntimeBusinessTemplateActionPolicy(f.template, f.actionId);
    const manifest = createRuntimeBusinessPolicyBindingManifest(f.template, [f.selection]);
    const initial = { stateVersion: 2n, instanceCommitment: new Uint8Array(32).fill(4), lastMutationAt: 100n,
      slotAssignmentsRoot: pure.runtimePrivateMapEmptyRoot(), slotAssignmentCount: 1n,
      slotBindingsRoot: pure.runtimePrivateMapEmptyRoot(), slotBindingCount: 1n,
      stateIdHash: result.policy.initialStateIdHash, nonce: new Uint8Array(32).fill(5) };
    const witness = createRuntimeBusinessAllocationPolicyWitness(f.template, manifest, initial);
    assert.deepEqual(witness.policy, result.policy);
    assert.deepEqual(witness.initialState, initial);
    assert.throws(() => createRuntimeBusinessAllocationPolicyWitness(f.template, { ...manifest,
      bindings: [{ ...manifest.bindings[0]!, configurationHash: `0x${"ff".repeat(32)}` }] }, initial), /exact runtime policy configuration/);
    for (const altered of [{ ...initial, stateIdHash: new Uint8Array(32) }, { ...initial, stateVersion: 1n },
      { ...initial, nonce: new Uint8Array(32) }, { ...initial, slotAssignmentCount: 2n },
      { ...initial, slotBindingCount: 2n }, { ...initial, slotAssignmentsRoot: { field: 0n } },
      { ...initial, slotBindingsRoot: { field: 0n } }]) {
      assert.throws(() => createRuntimeBusinessAllocationPolicyWitness(f.template, manifest, altered), /initial-state opening/);
    }
  });
});
