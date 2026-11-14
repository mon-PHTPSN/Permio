import assert from "node:assert/strict";
import { it } from "node:test";
import { createM6RemainingFixturePair, restoreM6GovernanceFixture } from "../run-live-m6-admission.ts";
import { hashNamespacePolicy, PreprodConnectionProfile } from "@permio/midnight-authorization";

it("both remaining templates pass actual independent M4 reviews under one exact namespace policy", () => {
  const fixtures = createM6RemainingFixturePair({ implementationHash: `0x${"ab".repeat(32)}`,
    sourceHash: `0x${"cd".repeat(32)}`, profile: new PreprodConnectionProfile("nightpreprod_synthetic_validation_only") });
  const a = restoreM6GovernanceFixture(fixtures.stateful), b = restoreM6GovernanceFixture(fixtures.nonTransitioning);
  assert.equal(hashNamespacePolicy(a.policy), hashNamespacePolicy(b.policy));
  assert.notEqual(a.record.target.templateId, b.record.target.templateId);
  for (const f of [a, b]) {
    assert.equal(f.record.state, "active"); assert.equal(f.record.reviews.length, 2);
    assert.equal(f.record.template.actions[0]!.inputRecordTypes.length, 1);
    assert.equal(f.record.template.actions[0]!.outputClaimTypes.length, 1);
  }
  assert.equal(a.record.template.transitions.length, 1);
  assert.equal(a.bindings.bindings.length, 1);
  assert.equal(b.bindings.bindings.length, 1);
  assert.equal(b.record.template.transitions.length, 1);
  assert.equal(b.record.template.transitions[0]!.fromState, b.record.template.transitions[0]!.toState);
  assert.equal(a.bindings.bindings[0]!.moduleId, "private-state-transition");
  assert.equal(b.bindings.bindings[0]!.moduleId, "delegated-capability-action");
});
