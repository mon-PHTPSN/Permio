import assert from "node:assert/strict";
import { it } from "node:test";
import { RemainingTestBudget, REMAINING_POSITIVE_BUDGET, REMAINING_GOVERNANCE_BUDGET } from "../m6-remaining-test-budget.ts";
import { remainingContinuationStep } from "../m6-remaining-continuation-plan.ts";
import { reviveRemainingCheckpoint } from "../m6-restore-remaining-checkpoint.ts";
import { assertM6CheckpointValueEqual } from "../m6-checkpoint-value.ts";

it("45 finalized calls plus the reordered continuation use exactly the same96normal+4negative and two-instance scope", () => {
  const budget = new RemainingTestBudget(), contract = "ab".repeat(32);
  const reserve = (entry: string, count: number, governance?: string) => {
    for (let i = 0; i < count; i++) budget.reserve({ entry, contract, ...(governance ? { governance } : {}) });
  };
  reserve("deploy", 1); reserve("governAuthorization", 2, "proposeProofModule"); reserve("governAuthorization", 4, "reviewProofModule");
  reserve("governAuthorization", 6, "governProofModule");
  for (const entry of ["beginM4Activation", "stageM4ActivationBinding", "finalizeM4Activation"]) reserve(entry, 2);
  reserve("allocateRuntimeInstance", 1); reserve("updateRuntimeCredentialStatus", 19);
  reserve("manageRuntimeParticipantSlots", 2); reserve("prepareRuntimeAction", 4);
  assert.equal(budget.evidence().reservedMaximumAttempts, 45);
  for (let round = 46; round <= 100; round++) assert.equal(budget.reserve({ ...remainingContinuationStep(round), contract }), round);
  assert.deepEqual(budget.evidence().perEntry, REMAINING_POSITIVE_BUDGET);
  assert.deepEqual(budget.evidence().governance, REMAINING_GOVERNANCE_BUDGET);
  assert.equal(budget.evidence().negativeCases.length, 4);
  assert.equal(budget.evidence().reservedMaximumAttempts, 100);
  assert.throws(() => remainingContinuationStep(45)); assert.throws(() => remainingContinuationStep(101));
});

it("restored slot arguments compare identical Buffer/Uint8Array bytes without accepting changed values or ABI integer types", () => {
  assertM6CheckpointValueEqual({ hash: Buffer.of(1, 2, 3), sequence: 4n }, { sequence: 4n, hash: Uint8Array.of(1, 2, 3) });
  assert.throws(() => assertM6CheckpointValueEqual({ hash: Buffer.of(1, 2, 3) }, { hash: Uint8Array.of(1, 2, 4) }));
  assert.throws(() => assertM6CheckpointValueEqual({ sequence: 4n }, { sequence: "4" }));
});

it("checkpoint recovery respects ABI integers, raw IDs and both historical byte encodings", () => {
  const saved = JSON.parse('{"stateSequence":"4","rootSequence":"1","nonce":"12345678","field":{"$bigint":"12"},"stateIdHash":{"$bytes":"00ff"},"allocationNonce":{"type":"Buffer","data":[1,2,255]}}', reviveRemainingCheckpoint);
  assert.equal(saved.stateSequence, 4n); assert.equal(saved.rootSequence, 1n); assert.equal(saved.field, 12n);
  assert.equal(saved.nonce, "12345678"); assert.deepEqual(saved.stateIdHash, Uint8Array.of(0, 255));
  assert.deepEqual(saved.allocationNonce, Uint8Array.of(1, 2, 255));
  assert.deepEqual(reviveRemainingCheckpoint("bad", { $bytes: "0z" }), { $bytes: "0z" });
  assert.deepEqual(reviveRemainingCheckpoint("bad", { type: "Buffer", data: [-1, 256] }), { type: "Buffer", data: [-1, 256] });
});
