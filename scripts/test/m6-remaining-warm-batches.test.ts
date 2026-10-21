import assert from "node:assert/strict";
import { it } from "node:test";
import { remainingWarmBatch } from "../m6-remaining-warm-batches.ts";

it("warm sessions are limited to exact small preparation rounds and end before every large proof or negative case", () => {
  const lengths = new Map<number, number>();
  for (let round = 1; round <= 100; round++) {
    const batch = remainingWarmBatch(round);
    if (!batch) continue;
    assert(["updateRuntimeCredentialStatus", "manageRuntimeParticipantSlots", "prepareRuntimeAction"].includes(batch.entry));
    assert(round >= batch.first && round <= batch.last);
    lengths.set(batch.first, (lengths.get(batch.first) ?? 0) + 1);
  }
  assert.deepEqual([...lengths], [[21, 25], [49, 8], [60, 29]]);
  for (const round of [1, 19, 20, 46, 47, 48, 57, 58, 59, 89, 90, 91, 92, 93, 98, 99, 100])
    assert.equal(remainingWarmBatch(round), undefined);
  assert.throws(() => remainingWarmBatch(0)); assert.throws(() => remainingWarmBatch(101));
});

it("checkpoint continuation moves authority testing to the second instance and closes wallets before all five main proofs", () => {
  const groups = new Map<number, number>();
  for (let round = 46; round <= 100; round++) {
    const batch = remainingWarmBatch(round, 3);
    if (batch) groups.set(batch.first, (groups.get(batch.first) ?? 0) + 1);
  }
  assert.deepEqual([...groups], [[46, 4], [53, 25], [81, 8]]);
  for (const round of [45, 50, 51, 52, 78, 79, 80, 89, 90, 91, 92, 99, 100])
    assert.equal(remainingWarmBatch(round, 3), undefined);
  assert.equal(remainingWarmBatch(71, 3)?.entry, "updateRuntimeCredentialStatus");
  assert.equal(remainingWarmBatch(72, 3)?.entry, "manageRuntimeParticipantSlots");
  assert.equal(remainingWarmBatch(74, 3)?.entry, "prepareRuntimeAction");
});

it("fresh second-instance setup can admit its root slot before issuing the session without keeping a wallet across a main proof", () => {
  for (let round = 53; round <= 77; round++) {
    const batch = remainingWarmBatch(round, 4); assert(batch);
    assert.equal(batch.first, 53); assert.equal(batch.last, 77);
    assert.equal(batch.entry, round <= 62 || round >= 65 && round <= 73 ? "updateRuntimeCredentialStatus"
      : round <= 64 ? "manageRuntimeParticipantSlots" : "prepareRuntimeAction");
  }
  for (const round of [50,51,52,78,79,80,89,90,91,92,97,98,99,100]) assert.equal(remainingWarmBatch(round, 4), undefined);
});
