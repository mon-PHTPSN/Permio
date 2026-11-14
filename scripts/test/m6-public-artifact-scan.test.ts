import assert from "node:assert/strict";
import { it } from "node:test";
import { scanM6PublicArtifacts } from "../m6-public-artifact-scan.ts";

it("the public-artifact scan detects raw, encoded, escaped and binary private values without disclosing them", () => {
  const text = "private-recipient-only-45ce", bytes = "a1".repeat(32), multiline = "private-line-one\nprivate-line-two";
  for (const payload of [Buffer.from(text), Buffer.from(Buffer.from(text).toString("base64")),
    Buffer.from(Buffer.from(text).toString("hex")), Buffer.from(bytes, "hex"), Buffer.from(JSON.stringify(multiline))]) {
    const result = scanM6PublicArtifacts(new Map([["chain.bin", payload]]), [text, bytes, multiline]);
    assert(!result.passed); assert.equal(result.findings.length, 1);
    assert(!JSON.stringify(result).includes(text)); assert(!JSON.stringify(result).includes(multiline));
  }
  assert(scanM6PublicArtifacts(new Map([["receipt.json", Buffer.from('{"receiptVersion":1}')]]), [text, bytes]).passed);
});
