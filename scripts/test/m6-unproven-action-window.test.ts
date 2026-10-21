import assert from "node:assert/strict";
import { it } from "node:test";
import { Intent, Transaction, LedgerParameters } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { setUnprovenActionWindow, readM6LedgerTtlSeconds, assertM6SubmissionTimeMargin } from "../m6-unproven-action-window.ts";

it("the real ledger serializes the extended unproven intent and obeys the signed deadline", () => {
  const now = 1_790_000_000_000;
  for (const hours of [2, 4]) {
    const tx = Transaction.fromParts("preprod", undefined, undefined, Intent.new(new Date(now + 3600000)));
    const evidence = setUnprovenActionWindow(tx, BigInt(now / 1000 + hours * 3600), now);
    const restored = Transaction.deserialize("signature", "pre-proof", "pre-binding", tx.serialize());
    const expected = now + Math.min(hours, 3) * 3600000;
    assert.equal(Date.parse(evidence.expiresAtUtc), expected);
    assert([...restored.intents!.values()].every(intent => intent.ttl.getTime() === expected));
  }
});

it("a cold wallet cannot turn near expiry into a false authorization rejection or extend the proved bytes", () => {
  const now = 1_790_000_000_000;
  const tx = Transaction.fromParts("preprod", undefined, undefined, Intent.new(new Date(now + 300_000)));
  const bytes = tx.serialize();
  assertM6SubmissionTimeMargin(tx, 120_000, now);
  assert.throws(() => assertM6SubmissionTimeMargin(tx, 120_000, now + 240_000));
  assert.throws(() => assertM6SubmissionTimeMargin(tx, 60_000, now + 260_000));
  assert.throws(() => assertM6SubmissionTimeMargin({ intents: undefined }, 60_000, now));
  assert.deepEqual(tx.serialize(), bytes);
});

it("an insufficient signed window cannot be extended by the test harness", () => {
  const now = 1_790_000_000_000;
  const tx = Transaction.fromParts("preprod", undefined, undefined, Intent.new(new Date(now + 3600000)));
  const original = tx.serialize();
  assert.throws(() => setUnprovenActionWindow(tx, BigInt(now / 1000 + 3600), now));
  assert.deepEqual(tx.serialize(), original);
});

it("the TTL guard reads real ledger parameters and fails closed on an unknown representation", () => {
  assert.equal(readM6LedgerTtlSeconds(LedgerParameters.initialParameters()), 3600);
  assert.equal(readM6LedgerTtlSeconds({ toString: () => "global_ttl: Duration(\n 1209600,\n)," }), 1209600);
  assert.throws(() => readM6LedgerTtlSeconds({ toString: () => "unknown version" }));
});
