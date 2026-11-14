import assert from "node:assert/strict";
import { it } from "node:test";
import { RemainingTestBudget, REMAINING_POSITIVE_BUDGET, REMAINING_GOVERNANCE_BUDGET } from "../m6-remaining-test-budget.ts";

const contract = "ab".repeat(32);
it("the isolated-case manifest totals 96 and negative reserve totals 4, preserving the approved 100 ceiling", () => {
  assert.equal(Object.values(REMAINING_POSITIVE_BUDGET).reduce((a, b) => a + b, 0), 96);
  assert.equal(Object.values(REMAINING_GOVERNANCE_BUDGET).reduce((a, b) => a + b, 0), 18);
  const b = new RemainingTestBudget();
  assert.throws(() => b.reserve({ entry: "executeRuntimeAction", contract }));
  b.reserve({ entry: "deploy", contract });
  for (const [entry, maximum] of Object.entries(REMAINING_POSITIVE_BUDGET)) {
    if (entry === "deploy" || entry === "governAuthorization") continue;
    for (let i = 0; i < maximum; i++) b.reserve({ entry, contract });
    assert.throws(() => b.reserve({ entry, contract }));
  }
  for (const [governance, maximum] of Object.entries(REMAINING_GOVERNANCE_BUDGET)) {
    for (let i = 0; i < maximum; i++) b.reserve({ entry: "governAuthorization", governance, contract });
    assert.throws(() => b.reserve({ entry: "governAuthorization", governance, contract }));
  }
  for (let i = 0; i < 4; i++) b.reserve({ entry: "executeRuntimeAction", contract, negativeCase: `negative-${i}` });
  assert.equal(b.evidence().reservedMaximumAttempts, 100);
  assert.throws(() => b.reserve({ entry: "executeRuntimeAction", contract, negativeCase: "extra-negative" }));
});

it("retains the abandoned round identifier while preserving the actual100-attempt ceiling and case budget", () => {
  const b = new RemainingTestBudget();
  const calls = [{entry:"deploy",contract}, ...Object.entries(REMAINING_POSITIVE_BUDGET)
    .filter(([entry])=>entry!=="deploy"&&entry!=="governAuthorization")
    .flatMap(([entry,n])=>Array.from({length:n},()=>({entry,contract}))),
    ...Object.entries(REMAINING_GOVERNANCE_BUDGET).flatMap(([governance,n])=>
      Array.from({length:n},()=>({entry:"governAuthorization",governance,contract})))];
  for(const c of calls.slice(0,50))b.reserve(c);
  const marker={reservationId:51 as const,negativeCase:"independent-competing-transition" as const,
    neverSubmittedVerified:true as const,originalExpiryPassed:true as const};
  assert.throws(()=>b.abandonUnsubmittedReservation(marker));
  assert.equal(b.reserve({entry:"executeRuntimeAction",contract,negativeCase:marker.negativeCase}),51);
  b.abandonUnsubmittedReservation(marker);
  assert.equal(b.evidence().maximumNativeAttemptsReserved,50);
  assert.equal(b.evidence().reservedMaximumAttempts,51);
  assert.deepEqual(b.evidence().abandonedReservationIds,[51]);
  assert.throws(()=>b.abandonUnsubmittedReservation(marker));
  for(const c of calls.slice(50))b.reserve(c);
  for(const negativeCase of [marker.negativeCase,"stale-authority-root","scoped-action-replay-after-cold-reconnect","stale-credential-status-root"])
    b.reserve({entry:"executeRuntimeAction",contract,negativeCase});
  assert.equal(b.evidence().maximumNativeAttemptsReserved,100);
  assert.equal(b.evidence().reservedMaximumAttempts,101);
  assert.throws(()=>b.reserve({entry:"executeRuntimeAction",contract,negativeCase:"extra"}));
});

it("a second deployment, different contract, old deployment and repeated negative case cannot spend scope", () => {
  const b = new RemainingTestBudget(); b.reserve({ entry: "deploy", contract });
  for (const input of [{ entry: "deploy", contract }, { entry: "allocateRuntimeInstance", contract: "cd".repeat(32) },
    { entry: "governAuthorization", contract }, { entry: "unknown", contract },
    { entry: "executeRuntimeAction", contract, governance: "proposeProofModule" }]) assert.throws(() => b.reserve(input));
  b.reserve({ entry: "executeRuntimeAction", contract, negativeCase: "action-replay" });
  assert.throws(() => b.reserve({ entry: "executeRuntimeAction", contract, negativeCase: "action-replay" }));
  assert.throws(() => new RemainingTestBudget().reserve({ entry: "deploy",
    contract: "9a5b8e294e61463c5ce5948ba0120479dd69a582e0e7fc5f84c8c9c4197af3bc" }));
});
