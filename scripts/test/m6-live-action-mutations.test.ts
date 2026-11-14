import assert from "node:assert/strict";
import { it } from "node:test";
import { ordinaryActionMutationCases } from "../m6-live-action-mutations.ts";
import { ordinaryActionFixture } from "../../packages/midnight-authorization/test/fixtures/ordinary-action.ts";
import type { PreparedOrdinaryAction } from "../m6-ordinary-action-workflow.ts";

it("the live mutation matrix produces the expected attributable errors in the actual generated contract", () => {
  const control = ordinaryActionFixture(); control.finishPreparation(); control.execute();
  const cases = ordinaryActionMutationCases();
  assert.equal(cases.length, 20);
  for (const vector of cases) {
    const f = ordinaryActionFixture(); f.finishPreparation();
    const args = structuredClone<PreparedOrdinaryAction["arguments"]>([...f.executeArgs()]); vector.mutate(args);
    assert.throws(() => f.contract.circuits.executeRuntimeAction(f.context(), ...args), vector.expected, vector.label);
    assert.equal(f.view().decisionReceipts.size(), 0n);
    assert.equal(f.view().usedRuntimeActionNullifiers.size(), 0n);
  }
});
