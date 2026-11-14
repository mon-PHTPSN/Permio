import assert from "node:assert/strict";
import { it } from "node:test";
import { Intent, Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { setUnprovenActionWindow } from "../m6-unproven-action-window.ts";

for (const milliseconds of [1, 123, 999]) {
  it(`round-trips the three-hour window with a ${milliseconds} ms clock fraction`, () => {
    const now = 1_790_000_000_000 + milliseconds;
    const signedBefore = BigInt(Math.floor(now / 1000) + 4 * 3600);
    const tx = Transaction.fromParts("preprod", undefined, undefined, Intent.new(new Date(now + 3600000)));
    const result = setUnprovenActionWindow(tx, signedBefore, now);
    const expected = Math.floor((now + 3 * 3600000) / 1000) * 1000;
    const restored = Transaction.deserialize("signature", "pre-proof", "pre-binding", tx.serialize());
    assert.equal(Date.parse(result.expiresAtUtc), expected);
    assert([...restored.intents!.values()].every(intent => intent.ttl.getTime() === expected));
    assert(expected <= now + 3 * 3600000 && BigInt(expected / 1000) <= signedBefore);
  });
}
