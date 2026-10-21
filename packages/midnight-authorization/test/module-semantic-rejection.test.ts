import assert from "node:assert/strict";
import { it } from "node:test";
import { pureCircuits as pure } from "../contracts/managed/permio-authorization/contract/index.js";
import { buildProofModuleBindingTree } from "../src/binding-manifest.ts";
import { signRuntimeActionCommand } from "../src/compact-crypto.ts";
import { ordinaryActionFixture, testBytes } from "./fixtures/ordinary-action.ts";
import { seedGeneratedMap } from "./fixtures/generated-genesis.ts";

const hex = (value: Uint8Array) => `0x${Buffer.from(value).toString("hex")}` as const;

// Synthetic generated-circuit checks. Recompute the signed command, manifest
// and registry identity so an unrelated signature/path failure cannot mask the
// unsupported-module predicate. No wallet, proof server or network is used.
function candidate(transitioning: boolean, change: string) {
  const f = ordinaryActionFixture({ transitioning });
  const raw = {
    actionIndex: 0, actionId: "perform", proofProfileId: "action-proof",
    moduleId: transitioning ? "private-state-transition" : "delegated-capability-action",
    moduleVersion: "1.0.0", implementationHash: hex(f.binding.implementationHash),
    configurationHash: hex(f.binding.configurationHash), receiptSchemaHash: hex(f.binding.receiptSchemaHash),
  };
  if (change === "module-id") raw.moduleId = "unsupported-module";
  if (change === "module-version") raw.moduleVersion = "2.0.0";
  if (change === "implementation") raw.implementationHash = hex(testBytes(240));
  if (change === "receipt-schema") raw.receiptSchemaHash = hex(testBytes(241));
  const identity = buildProofModuleBindingTree([raw]).compactBindingAt(0);
  const policy = { ...f.projection.policy, proofFamilyHash: identity.moduleIdHash,
    policyVersion: change === "policy-version" ? 2n : f.projection.policy.policyVersion };
  raw.configurationHash = hex(change === "configuration" ? testBytes(242)
    : pure.runtimeTemplateActionPolicyCommitment(policy));
  const tree = buildProofModuleBindingTree([raw]), binding = tree.compactBindingAt(0);
  const command = { ...f.command, policyCommitment: pure.runtimeTemplateActionPolicyCommitment(policy),
    bindingCommitment: pure.proofModuleBindingCommitment(binding) };
  let state = seedGeneratedMap(f.current, "activeTemplates", f.templateKey,
    { ...f.templateRecord, proofModuleBindingRoot: tree.root });
  if (change !== "implementation") {
    const moduleIdentity = { moduleIdHash: binding.moduleIdHash, moduleVersion: binding.moduleVersion,
      implementationHash: binding.implementationHash };
    state = seedGeneratedMap(state, "proofModules", pure.proofModuleRegistryKeyFromIdentity(moduleIdentity),
      { ...f.moduleRecord, identity: moduleIdentity, receiptSchemaHash: binding.receiptSchemaHash,
        implementationReferenceHash: pure.runtimeActionImplementationReference(f.allocation.targetNetworkHash,
          f.allocation.targetContractIdentity, binding.moduleIdHash) });
  }
  const args = [...f.prepareArgs(1n)];
  args[1] = command;
  args[2] = signRuntimeActionCommand(command, 131n, 155n);
  args[7] = policy;
  args[8] = binding;
  args[9] = tree.pathFor(0);
  return { state, invoke: () => f.contract.circuits.prepareRuntimeAction(f.context(state),
    ...(args as unknown as ReturnType<typeof f.prepareArgs>)) };
}

it("rejects coherently signed unsupported module selections at the intended semantic gate for both action families", () => {
  for (const transitioning of [true, false]) {
    assert.doesNotThrow(candidate(transitioning, "supported").invoke);
    for (const [change, expected] of [
      ["module-id", /UNSUPPORTED_PROOF_REQUIREMENT/],
      ["module-version", /module implementation, lifecycle, version or receipt schema is unsupported/],
      ["implementation", /Action proof module is not registered/],
      ["receipt-schema", /module implementation, lifecycle, version or receipt schema is unsupported/],
      ["policy-version", /Runtime policy does not match the exact template action binding/],
      ["configuration", /Runtime policy configuration hash does not match activation/],
    ] as const) {
      const check = candidate(transitioning, change), before = check.state.encode();
      assert.throws(check.invoke, expected, `${transitioning ? "transition" : "delegated"}:${change}`);
      assert.deepEqual(check.state.encode(), before);
      assert.doesNotThrow(candidate(transitioning, "supported").invoke);
    }
  }
});
