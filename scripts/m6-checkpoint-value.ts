import assert from "node:assert/strict";

/** JSON recovery normalizes Buffer to Uint8Array; compare bytes, not prototypes. */
export function assertM6CheckpointValueEqual(actual: unknown, expected: unknown) {
  const normalize = (input: unknown) => JSON.parse(JSON.stringify({ value: input }, function (key, value) {
    const original = this[key];
    return typeof original === "bigint" ? { $bigint: String(original) }
      : original instanceof Uint8Array ? { $bytes: Buffer.from(original).toString("hex") } : value;
  })).value;
  assert.deepEqual(normalize(actual), normalize(expected));
}
