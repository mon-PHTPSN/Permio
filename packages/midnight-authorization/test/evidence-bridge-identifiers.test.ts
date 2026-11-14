import assert from "node:assert/strict";
import { it } from "node:test";
import { CompactTypeBytes, persistentHash } from "@midnight-ntwrk/compact-runtime";
import { encodeCanonical } from "@permio/protocol";
import { pureCircuits as pure } from "../contracts/managed/permio-authorization/contract/index.js";
import { hashRuntimeIdentifier } from "../src/runtime-credentials.ts";

// A Bytes<N> digest must match the existing signed-string identifier profile,
// before the circuit relies on fixed canonical preimages. Every nibble is used.
const digest = Uint8Array.from({ length: 32 }, (_, i) => i * 8 + i % 8);
const expected = {
  resource: "2bf4df540bfede9cdfc6b695353d239e227cec67cb37046f53e99b0b7cf316f5",
  recipient: "a2797aa850827cfa7e60ac7b99261d024b9d1b1689688ca38efdcf77e4127383",
  "intent-nonce": "340371d4efa27331651baaf3c68123cd9921acbe3c68ae03b208aac38cea62af",
};
const hex = `0x${Array.from(digest, b => b.toString(16).padStart(2, "0")).join("")}`;
for (const [kind, size, helper] of [
  ["resource", 127, "runtimeEvidenceBridgeResourceHash"],
  ["recipient", 128, "runtimeEvidenceBridgeRecipientHash"],
  ["intent-nonce", 131, "runtimeEvidenceBridgeNonceHash"],
] as const) {
  it(`matches installed-runtime ${kind} canonical Bytes<${size}> hashing`, () => {
    const canonical = encodeCanonical(`permio:runtime-${kind}:v1`, [hex]);
    assert.equal(canonical.length, size);
    assert.deepEqual(persistentHash(new CompactTypeBytes(size), canonical), hashRuntimeIdentifier(kind, hex));
    assert.equal(Array.from(hashRuntimeIdentifier(kind, hex), byte => byte.toString(16).padStart(2, "0")).join(""), expected[kind]);
  });
  it(`derives the ${kind} signed identifier in the generated bridge circuit`, () => {
    const fn = (pure as unknown as Record<string, (value: Uint8Array) => Uint8Array>)[helper];
    assert.equal(typeof fn, "function", `compiled bridge helper ${helper} must exist`);
    assert.deepEqual(fn!(digest), hashRuntimeIdentifier(kind, hex));
  });
}
