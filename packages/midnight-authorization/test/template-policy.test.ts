import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { hashScenarioTemplate, parseScenarioTemplate } from "@permio/scenario-domain";
import {
  createRuntimeTemplateActionPolicy, createRuntimePolicyBindingManifest,
  createRuntimeAllocationPolicyWitness, orderProofModuleBindings, buildProofModuleBindingTree,
  RUNTIME_TEMPLATE_POLICY_VERSION, createRuntimeParticipantSlotRules,
  type RuntimeActionIntent,
} from "../src/index.ts";
import { pureCircuits as pure } from "../contracts/managed/permio-authorization/contract/index.js";

function fixture() {
  const value = JSON.parse(readFileSync(new URL("../../scenario-generator/fixtures/generator-vector.v1.json", import.meta.url), "utf8")).input.template;
  value.proofProfiles[0].circuitId = "delegated-capability-action-v1";
  value.proofProfiles[0].publicOutputSchemaId = "decision-receipt-v1";
  const template = parseScenarioTemplate(value);
  const selection = { actionId: template.actions[0]!.id, proofProfileId: template.actions[0]!.proofProfileId,
    moduleId: "delegated-capability-action", moduleVersion: "1.0.0",
    implementationHash: `0x${"11".repeat(32)}` as const, receiptSchemaHash: `0x${"33".repeat(32)}` as const };
  const projection = createRuntimeTemplateActionPolicy(template, selection.actionId);
  const manifest = createRuntimePolicyBindingManifest(template, [selection]);
  const tree = buildProofModuleBindingTree(orderProofModuleBindings(template, manifest));
  const verify = (policy = projection.policy, binding = tree.compactBindingAt(0), path = tree.pathFor(0)) =>
    pure.assertRuntimeTemplatePolicyBinding(projection.policy.target, policy, binding, path, tree.root, 1n);
  return { template, selection, projection, manifest, tree, verify };
}

describe("exact M2 runtime policy projection", () => {
  it("derives deterministic configuration and exact M2 target without granting trust", () => {
    const f = fixture();
    assert.deepEqual(createRuntimeTemplateActionPolicy(f.template, f.selection.actionId).policy, f.projection.policy);
    assert.equal(`0x${Buffer.from(f.projection.policy.target.templateContentHash).toString("hex")}`, hashScenarioTemplate(f.template).value);
    assert.equal(f.manifest.bindings[0]!.configurationHash, f.projection.configurationHash);
    assert.deepEqual(Buffer.from(f.projection.policy.bindingActionIdHash), Buffer.from(f.tree.compactBindingAt(0).actionIdHash));
    assert.notDeepEqual(f.projection.policy.actionIdHash, f.projection.policy.bindingActionIdHash);
    assert.doesNotThrow(() => f.verify());
    assert.equal("active" in f.projection, false);
  });

  it("rejects unsupported families, receipt profiles, versions and action substitutions", () => {
    const f = fixture();
    for (const circuitId of ["unknown-proof-v1", "delegated-capability-action-v2"]) {
      assert.throws(() => createRuntimeTemplateActionPolicy({ ...f.template,
        proofProfiles: [{ ...f.template.proofProfiles[0]!, circuitId }] }, f.selection.actionId), /UNSUPPORTED_PROOF_REQUIREMENT/);
    }
    assert.throws(() => createRuntimeTemplateActionPolicy({ ...f.template,
      proofProfiles: [{ ...f.template.proofProfiles[0]!, publicOutputSchemaId: "unknown-receipt" }] }, f.selection.actionId), /UNSUPPORTED_PROOF_REQUIREMENT/);
    assert.throws(() => createRuntimeTemplateActionPolicy(f.template, "unknown-action"), /exact declared/);
    for (const selection of [{ ...f.selection, moduleId: "other-module" }, { ...f.selection, moduleVersion: "latest" },
      { ...f.selection, moduleVersion: "1.0.1" }]) {
      assert.throws(() => createRuntimePolicyBindingManifest(f.template, [selection]), /UNSUPPORTED_PROOF_REQUIREMENT/);
    }
    assert.throws(() => createRuntimePolicyBindingManifest(f.template,
      [{ ...f.selection, executable: "true" } as typeof f.selection]), /unsupported fields/);
  });

  it("rejects unknown M2 fields and ambiguous transitions before projection", () => {
    const f = fixture();
    assert.throws(() => createRuntimeTemplateActionPolicy({ ...f.template, executable: "true" }, f.selection.actionId), /UNKNOWN_FIELD/);
    const row = f.template.transitions[0]!;
    assert.throws(() => createRuntimeTemplateActionPolicy({ ...f.template, transitions: [...f.template.transitions,
      { ...row, id: "ambiguous-row", toState: row.fromState }] }, f.selection.actionId), /AMBIGUOUS_TRANSITION/);
  });

  it("authenticates every field, including data reserved for later action enforcement", () => {
    const f = fixture();
    for (const [field, value] of Object.entries(f.projection.policy)) {
      const altered = value instanceof Uint8Array ? new Uint8Array(32).fill(127)
        : typeof value === "bigint" ? value + 1n : typeof value === "boolean" ? !value
        : typeof value === "object" && "field" in value ? { field: (value as { field: bigint }).field + 1n }
        : { ...f.projection.policy.target, templateContentHash: new Uint8Array(32).fill(127) };
      assert.throws(() => f.verify({ ...f.projection.policy, [field]: altered }),
        /exact template action binding|configuration hash/, field);
    }
  });

  it("binds slot rules and selected evidence types into policy v3 rather than accepting legacy policy", () => {
    const f = fixture(), p = f.projection.policy;
    assert.equal(RUNTIME_TEMPLATE_POLICY_VERSION, 3);
    assert.equal(p.policyVersion, 3n);
    assert.equal(p.slotAssignmentRulesRoot.field, f.projection.slotRules.root.field);
    assert.equal(p.slotAssignmentRuleCount, f.projection.slotRules.count);
    assert.throws(() => f.verify({ ...p, policyVersion: 1n }), /exact template action binding/);
    const first = f.template.participantSlots[0]!;
    const changed = createRuntimeTemplateActionPolicy({ ...f.template, participantSlots: [
      { ...first, assignableBy: ["@namespace-governance"] }, ...f.template.participantSlots.slice(1),
    ] }, f.selection.actionId);
    assert.notEqual(changed.configurationHash, f.projection.configurationHash);
    assert.notEqual(changed.policy.slotAssignmentRulesRoot.field, p.slotAssignmentRulesRoot.field);
    assert.throws(() => f.verify({ ...p, slotAssignmentRulesRoot: changed.policy.slotAssignmentRulesRoot }), /configuration hash/);
  });

  it("opens all three assigner kinds only in their exact template-permitted context and slot", () => {
    const f = fixture(), first = f.template.participantSlots[0]!, context = f.template.contexts[0]!;
    const template = parseScenarioTemplate({ ...f.template,
      participantSlots: [
        { ...first, assignableBy: ["@instance-creator", "@namespace-governance", "manager"] },
        ...f.template.participantSlots.slice(1),
        { id: "manager", description: "Creator-appointed manager.", assignableBy: ["@instance-creator"] },
      ],
      contexts: [
        { ...context, allowedSlotIds: [...context.allowedSlotIds, "manager"] },
        ...f.template.contexts.slice(1),
        { ...context, id: "isolated-slot-context", allowedSlotIds: ["manager"] },
      ],
    });
    const projection = createRuntimeTemplateActionPolicy(template, f.selection.actionId);
    for (const [index, assignableBy] of ["@instance-creator", "@namespace-governance", "manager"].entries()) {
      const witness = projection.slotRules.witnessFor(context.id, first.id, assignableBy);
      assert.equal(witness.rule.authorityKind, BigInt(index + 1));
      assert.doesNotThrow(() => pure.assertRuntimeParticipantSlotRule(projection.policy,
        witness.rule, witness.path, projection.policy.contextHash, projection.policy.actorSlotIdHash));
    }
    assert.throws(() => projection.slotRules.witnessFor("isolated-slot-context", first.id, "@instance-creator"), /not allowed/);
    assert.throws(() => projection.slotRules.witnessFor(context.id, first.id, "administrator"), /not allowed/);
  });

  it("rejects altered slot rule fields, paths, contexts, slots, versions and counts", () => {
    const f = fixture(), p = f.projection.policy, slot = f.template.participantSlots[0]!, context = f.template.contexts[0]!;
    const w = f.projection.slotRules.witnessFor(context.id, slot.id, slot.assignableBy[0]!);
    const verify = (rule = w.rule, path = w.path, policy = p, contextHash = p.contextHash, slotIdHash = p.actorSlotIdHash) =>
      pure.assertRuntimeParticipantSlotRule(policy, rule, path, contextHash, slotIdHash);
    assert.doesNotThrow(() => verify());
    for (const rule of [{ ...w.rule, ruleVersion: 2n }, { ...w.rule, authorityKind: 0n },
      { ...w.rule, authorityKind: 4n }, { ...w.rule, contextHash: new Uint8Array(32) },
      { ...w.rule, slotIdHash: new Uint8Array(32) }, { ...w.rule, authoritySlotIdHash: new Uint8Array(32).fill(1) }]) {
      assert.throws(() => verify(rule));
    }
    assert.throws(() => verify({ ...w.rule, authorityKind: 3n, authoritySlotIdHash: new Uint8Array(32) }), /canonical/);
    assert.throws(() => verify(w.rule, { ...w.path, leaf: new Uint8Array(32) }), /absent/);
    const changedPath = structuredClone(w.path);
    (changedPath.path[0]! as { goes_left: boolean }).goes_left = !changedPath.path[0]!.goes_left;
    assert.throws(() => verify(w.rule, changedPath));
    assert.throws(() => verify(w.rule, w.path, p, new Uint8Array(32)), /exact context/);
    assert.throws(() => verify(w.rule, w.path, p, p.contextHash, new Uint8Array(32)), /exact context/);
    for (const slotAssignmentRuleCount of [0n, 1_048_577n]) {
      assert.throws(() => verify(w.rule, w.path, { ...p, slotAssignmentRuleCount }));
    }
    assert.throws(() => verify(w.rule, w.path, { ...p, policyVersion: 1n }));
  });

  it("keeps slot rule openings deterministic and isolates private copies", () => {
    const f = fixture(), slot = f.template.participantSlots[0]!, context = f.template.contexts[0]!;
    const again = createRuntimeParticipantSlotRules(f.template);
    assert.deepEqual(again.root, f.projection.slotRules.root);
    assert.equal(again.count, f.projection.slotRules.count);
    const original = again.ruleAt(0);
    const altered = again.ruleAt(0);
    altered.slotIdHash[0] = altered.slotIdHash[0]! ^ 255;
    assert.deepEqual(again.ruleAt(0), original);
    const witness = again.witnessFor(context.id, slot.id, slot.assignableBy[0]!);
    witness.path.leaf[0] = witness.path.leaf[0]! ^ 255;
    assert.doesNotThrow(() => {
      const fresh = again.witnessFor(context.id, slot.id, slot.assignableBy[0]!);
      pure.assertRuntimeParticipantSlotRule(f.projection.policy, fresh.rule, fresh.path,
        f.projection.policy.contextHash, f.projection.policy.actorSlotIdHash);
    });
    for (const index of [-1, 0.5, Number.NaN, Number(again.count)]) {
      assert.throws(() => again.ruleAt(index), /outside/);
    }
  });

  it("rejects excessive rule expansion before building a million-leaf tree", () => {
    const f = fixture();
    const participantSlots = [
      ...f.template.participantSlots.map((slot) => ({ ...slot, assignableBy: ["@instance-creator", "@namespace-governance"] })),
      ...Array.from({ length: 2048 }, (_, index) => ({ id: `capacity-slot-${index}`,
        description: "Synthetic capacity boundary.", assignableBy: ["@instance-creator", "@namespace-governance"] })),
    ];
    const context = { ...f.template.contexts[0]!, allowedSlotIds: participantSlots.map((slot) => slot.id) };
    assert.throws(() => createRuntimeParticipantSlotRules({ ...f.template, participantSlots,
      contexts: [{ ...context }, ...Array.from({ length: 256 }, (_, index) => ({ ...context, id: `capacity-context-${index}` }))],
    }), /depth-20 capacity/);
  });

  it("rejects binding hash, module, profile, version, count and Merkle substitutions", () => {
    const f = fixture(), binding = f.tree.compactBindingAt(0);
    for (const altered of [
      { ...binding, actionIndex: 1n }, { ...binding, bindingVersion: 2n },
      { ...binding, moduleIdHash: new Uint8Array(32).fill(8) },
      { ...binding, proofProfileIdHash: new Uint8Array(32).fill(9) },
      { ...binding, configurationHash: new Uint8Array(32).fill(10) },
      { ...binding, receiptSchemaHash: new Uint8Array(32).fill(11) },
      { ...binding, implementationHash: new Uint8Array(32).fill(12) },
      { ...binding, moduleVersion: { major: 2n, minor: 0n, patch: 0n } },
    ]) assert.throws(() => f.verify(f.projection.policy, altered));
    assert.throws(() => f.verify(f.projection.policy, binding, { ...f.tree.pathFor(0), leaf: new Uint8Array(32) }), /absent/);
    assert.throws(() => pure.assertRuntimeTemplatePolicyBinding(f.projection.policy.target, f.projection.policy,
      binding, f.tree.pathFor(0), f.tree.root, 0n), /exact template action binding/);
  });

  it("requires the activated configuration and exact initial-state opening in the adapter", () => {
    const f = fixture();
    const initialState = { stateVersion: 2n, instanceCommitment: new Uint8Array(32).fill(4),
      lastMutationAt: 100n,
      slotAssignmentsRoot: pure.runtimePrivateMapEmptyRoot(), slotAssignmentCount: 1n,
      slotBindingsRoot: pure.runtimePrivateMapEmptyRoot(), slotBindingCount: 1n,
      stateIdHash: f.projection.policy.initialStateIdHash, nonce: new Uint8Array(32).fill(5) };
    assert.doesNotThrow(() => createRuntimeAllocationPolicyWitness(f.template, f.manifest, initialState));
    assert.throws(() => createRuntimeAllocationPolicyWitness(f.template, { ...f.manifest,
      bindings: [{ ...f.manifest.bindings[0]!, configurationHash: `0x${"ff".repeat(32)}` }] }, initialState), /exact runtime policy configuration/);
    for (const altered of [{ ...initialState, stateIdHash: new Uint8Array(32) },
      { ...initialState, stateVersion: 1n }, { ...initialState, nonce: new Uint8Array(32) },
      { ...initialState, slotAssignmentCount: 2n }, { ...initialState, slotBindingCount: 2n },
      { ...initialState, slotAssignmentsRoot: { field: 0n } }, { ...initialState, slotBindingsRoot: { field: 0n } }]) {
      assert.throws(() => createRuntimeAllocationPolicyWitness(f.template, f.manifest, altered), /initial-state opening/);
    }
  });

  it("does not invent transitions and rejects wrong state pairs or actions", () => {
    const f = fixture(), row = f.projection.transitionAt(0), path = f.projection.transitionPathAt(0);
    assert.doesNotThrow(() => pure.assertRuntimeTemplateTransition(f.projection.policy, row, path, row.fromStateIdHash, row.toStateIdHash));
    assert.throws(() => pure.assertRuntimeTemplateTransition(f.projection.policy, row, path, row.toStateIdHash, row.fromStateIdHash), /exact template-declared/);
    for (const altered of [{ ...row, transitionVersion: 2n }, { ...row, actionIdHash: new Uint8Array(32) },
      { ...row, toStateIdHash: row.fromStateIdHash }]) {
      assert.throws(() => pure.assertRuntimeTemplateTransition(f.projection.policy, altered, path, row.fromStateIdHash, row.toStateIdHash), /exact template-declared/);
    }
    assert.throws(() => f.projection.transitionAt(-1), /outside/);
    assert.throws(() => f.projection.transitionPathAt(1), /outside/);
  });

  it("matches template intent dimensions without treating this predicate as authorization", () => {
    const f = fixture(), p = f.projection.policy;
    const intent: RuntimeActionIntent = { intentVersion: 1n, target: p.target,
      instanceCommitment: new Uint8Array(32).fill(1), contextHash: p.contextHash,
      sessionCredentialCommitment: new Uint8Array(32).fill(2), actionIdHash: p.actionIdHash,
      resourceSelectorHash: p.resourceSelectorHash, resourceHash: new Uint8Array(32).fill(3),
      purposeHash: p.purposeHash, recipientKindHash: p.recipientKindHash,
      recipientHash: new Uint8Array(32).fill(4), disclosurePolicyIdHash: p.disclosurePolicyIdHash,
      m5IntentCommitment: new Uint8Array(32).fill(5), issuedAt: 1n, nonceHash: new Uint8Array(32).fill(6) };
    assert.doesNotThrow(() => pure.assertRuntimeTemplateActionIntent(p, intent));
    for (const field of ["contextHash", "actionIdHash", "resourceSelectorHash", "purposeHash", "recipientKindHash", "disclosurePolicyIdHash"] as const) {
      assert.throws(() => pure.assertRuntimeTemplateActionIntent(p, { ...intent, [field]: new Uint8Array(32).fill(127) }), /exact template policy/);
    }
  });

  it("supports variable action lists, both family configurations and explicit same-state rows", () => {
    const f = fixture(), original = f.template.actions[0]!;
    const template = parseScenarioTemplate({ ...f.template,
      actions: [...f.template.actions, { ...original, id: "z-second-action", proofProfileId: "second-proof" }],
      capabilityRules: [{ ...f.template.capabilityRules[0]!, actionIds: [original.id, "z-second-action"] }],
      proofProfiles: [...f.template.proofProfiles, { id: "second-proof", circuitId: "private-state-transition-v1", publicOutputSchemaId: "decision-receipt-v1" }],
      transitions: [...f.template.transitions, { id: "second-row", actionId: "z-second-action",
        fromState: f.template.transitions[0]!.toState, toState: f.template.transitions[0]!.toState }],
    });
    const manifest = createRuntimePolicyBindingManifest(template, [f.selection,
      { ...f.selection, actionId: "z-second-action", proofProfileId: "second-proof", moduleId: "private-state-transition" }]);
    const second = createRuntimeTemplateActionPolicy(template, "z-second-action");
    const tree = buildProofModuleBindingTree(orderProofModuleBindings(template, manifest));
    assert.equal(manifest.bindings.length, 2);
    assert.equal(second.policy.actionIndex, 1n);
    assert.equal(second.policy.transitionCount, 1n);
    assert.doesNotThrow(() => pure.assertRuntimeTemplatePolicyBinding(second.policy.target, second.policy,
      tree.compactBindingAt(1), tree.pathFor(1), tree.root, 2n));
    const sameState = second.transitionAt(0);
    assert.deepEqual(sameState.fromStateIdHash, sameState.toStateIdHash);
    assert.doesNotThrow(() => pure.assertRuntimeTemplateTransition(second.policy, sameState,
      second.transitionPathAt(0), sameState.fromStateIdHash, sameState.toStateIdHash));
    assert.throws(() => pure.assertRuntimeTemplateTransition(second.policy, sameState,
      second.transitionPathAt(0), second.policy.initialStateIdHash, sameState.toStateIdHash), /exact template-declared/);
    assert.throws(() => createRuntimeTemplateActionPolicy({ ...template, transitions: f.template.transitions },
      "z-second-action"), /has no state transition/);
    const row = f.projection.transitionAt(0);
    assert.throws(() => pure.assertRuntimeTemplateTransition(second.policy, row, f.projection.transitionPathAt(0),
      row.fromStateIdHash, row.toStateIdHash), /exact template-declared/);
    const initial = { stateVersion: 2n, instanceCommitment: new Uint8Array(32).fill(4),
      lastMutationAt: 100n,
      slotAssignmentsRoot: pure.runtimePrivateMapEmptyRoot(), slotAssignmentCount: 1n,
      slotBindingsRoot: pure.runtimePrivateMapEmptyRoot(), slotBindingCount: 1n,
      stateIdHash: second.policy.initialStateIdHash, nonce: new Uint8Array(32).fill(5) };
    assert.doesNotThrow(() => createRuntimeAllocationPolicyWitness(template, manifest, initial));
    assert.throws(() => createRuntimeAllocationPolicyWitness(template, { ...manifest,
      bindings: [manifest.bindings[0]!, { ...manifest.bindings[1]!, configurationHash: `0x${"ff".repeat(32)}` }] }, initial), /exact runtime policy configuration/);
  });
});
