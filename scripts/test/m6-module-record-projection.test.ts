import assert from "node:assert/strict";
import { it } from "node:test";
import { StateValue, StateMap } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { Bytes32Descriptor, CompactTypeUnsignedInteger } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { copyM6PublicMapEntryForAudit } from "../m6-deprecated-module-admission-audit.ts";

it("the public module-row audit changes exactly one selected entry and preserves other records, arrays and its source snapshots", () => {
  const a = new Uint8Array(32).fill(11), b = new Uint8Array(32).fill(12), uint = new CompactTypeUnsignedInteger(255n, 1);
  const key = (bytes: Uint8Array) => ({ value: Bytes32Descriptor.toValue(bytes), alignment: Bytes32Descriptor.alignment() });
  const value = (n: bigint) => StateValue.newCell({ value: uint.toValue(n), alignment: uint.alignment() });
  const tree = (status: bigint) => StateValue.newArray().arrayPush(value(99n))
    .arrayPush(StateValue.newMap(new StateMap().insert(key(a), value(status)).insert(key(b), value(7n))));
  const before = tree(4n).encode(), actual = tree(5n).encode();
  const changed = StateValue.decode(copyM6PublicMapEntryForAudit(before, actual, [1], a));
  assert.deepEqual(changed.encode(), actual);
  assert.deepEqual(StateValue.decode(before).encode(), tree(4n).encode());
  assert.deepEqual(copyM6PublicMapEntryForAudit(changed.encode(), before, [1], a), before);
  assert.throws(() => copyM6PublicMapEntryForAudit(before, actual, [0], a));
  assert.throws(() => copyM6PublicMapEntryForAudit(before, actual, [1], new Uint8Array(32).fill(13)));
});
