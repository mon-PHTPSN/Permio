import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { businessPredicateFixture } from "./fixtures/business-predicate.ts";
import { ecMulGenerator } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { buildAuthorityRoot } from "../src/authority-root.ts";
import { signRuntimeBusinessRecord } from "../src/business-predicates.ts";
import { pureCircuits as pure } from "../contracts/managed/permio-authorization-v11/contract/index.js";

// Generated Compact evaluation. This does not activate a protocol module or
// establish a finalized native transaction; those require their own evidence.
describe("reusable private business predicates", () => {
  for (const kind of [1n, 2n, 3n]) {
    it(`proves an exact current signed predicate (kind ${kind})`, () => {
      const f = businessPredicateFixture(kind);
      assert.doesNotThrow(() => f.verify());
    });
  }
  for (const field of ["instanceCommitment", "contextHash", "subjectAccountCredentialCommitment",
    "rootCapabilityCommitment", "resourceHash", "purposeHash", "recipientHash",
    "typeHash", "issuerAuthorityCommitment"] as const) {
    it(`rejects a correctly re-signed record with a substituted ${field}`, () => {
      const f = businessPredicateFixture();
      f.first.record[field] = new Uint8Array(32).fill(241);
      f.resign();
      assert.throws(() => f.verify());
    });
  }
  it("rejects a substituted template version even after re-signing the record", () => {
    const f = businessPredicateFixture();
    f.first.record.target.semanticVersion.major += 1n; f.resign();
    assert.throws(() => f.verify());
  });
  it("rejects an altered signature and a different otherwise eligible issuer", () => {
    const f = businessPredicateFixture();
    f.first.signature.response += 1n;
    assert.throws(() => f.verify());
    const other = businessPredicateFixture();
    other.first.issuer.authorityKind = 3n;
    assert.throws(() => other.verify());
  });
  it("rejects another correctly signing kind-6 issuer that is eligible in both current roots", () => {
    const f = businessPredicateFixture();
    const other = { ...structuredClone(f.first.issuer), publicKey: ecMulGenerator(12n) };
    const originalCommitment = pure.governanceActivatorLeafCommitment(f.first.issuer);
    const otherCommitment = pure.governanceActivatorLeafCommitment(other);
    const authority = buildAuthorityRoot([f.first.issuer, other]);
    f.context.authorityRoot = authority.root; f.context.issuerRoot = authority.root; f.context.issuerCount = 2n;
    f.first.issuer = other; f.first.authorityPath = authority.pathFor(otherCommitment);
    f.first.issuerPath = authority.pathFor(otherCommitment);
    f.first.record.issuerAuthorityCommitment = otherCommitment;
    f.resign(); f.first.signature = signRuntimeBusinessRecord(f.first.record, 12n, 19n);
    assert.deepEqual(f.context.rootIssuerAuthorityCommitment, originalCommitment);
    assert.throws(() => f.verify(), /original root-capability issuer/);
  });
  it("handles the Uint64 ceiling boundary without overflow and rejects unrepresentable values", () => {
    const f = businessPredicateFixture(2n);
    f.first.record.value = 2n ** 64n - 1n; f.second.record.value = f.first.record.value; f.resign();
    assert.doesNotThrow(() => f.verify());
    f.second.record.value -= 1n; f.resign();
    assert.throws(() => f.verify(), /ceiling/);
    f.first.record.value += 1n;
    assert.throws(() => f.resign());
  });
  for (const [start, end, deadline] of [[501n, 1400n, 900n], [100n, 500n, 900n], [100n, 899n, 900n]]) {
    it(`rejects record validity [${start},${end}) for the complete action window`, () => {
      const f = businessPredicateFixture();
      f.first.record.validAfter = start; f.first.record.validBefore = end;
      f.context.validBefore = deadline; f.resign();
      assert.throws(() => f.verify());
    });
  }
  it("accepts equality at the amount ceiling and rejects one above it", () => {
    const f = businessPredicateFixture(2n);
    assert.doesNotThrow(() => f.verify());
    f.first.record.value += 1n; f.resign();
    assert.throws(() => f.verify(), /ceiling/i);
  });
  it("rejects mixed or empty numeric units", () => {
    const f = businessPredicateFixture(2n);
    f.second.record.unitHash = new Uint8Array(32).fill(242); f.resign();
    assert.throws(() => f.verify(), /unit/i);
    f.first.record.unitHash = new Uint8Array(32); f.resign();
    assert.throws(() => f.verify(), /unit/i);
  });
  it("rejects unsigned payload substitution inside the holder's selected inputs", () => {
    const f = businessPredicateFixture();
    f.inputs[0]!.payloadCommitment = new Uint8Array(32).fill(243);
    assert.throws(() => f.verify(), /selected|commitment/i);
  });
  it("rejects a same-type signed record that was not in the selected input chain", () => {
    const f = businessPredicateFixture();
    f.first.record.value += 1n; f.signOnly();
    assert.throws(() => f.verify(), /selected|commitment/i);
  });
  it("rejects an arbitrary output payload even when its type and input are correct", () => {
    const f = businessPredicateFixture();
    f.outputs[0]!.payloadCommitment = new Uint8Array(32).fill(244);
    f.refreshChains();
    assert.throws(() => f.verify(), /claim|output/i);
  });
  it("rejects a missing or different root-capability status under the current root", () => {
    const f = businessPredicateFixture();
    f.statusLeaf.status = 2n;
    assert.throws(() => f.verify(), /active|status/i);
    const stale = businessPredicateFixture();
    stale.context.statusRoot.field += 1n;
    assert.throws(() => stale.verify(), /status|root/i);
  });
  it("binds the audit acknowledgment to the intent and selected inputs without self-reference", () => {
    const f = businessPredicateFixture(3n);
    assert.doesNotThrow(() => f.verify());
    f.context.intentCommitment = new Uint8Array(32).fill(245);
    assert.throws(() => f.verify(), /audit|reference/i);
    const other = businessPredicateFixture(3n);
    other.first.record.referenceCommitment = new Uint8Array(32).fill(246); other.resign();
    assert.throws(() => other.verify(), /audit|reference/i);
  });
  it("rejects unknown predicate kinds, oversized selections and invalid indices", () => {
    const f = businessPredicateFixture(); f.predicate.kind = 4n;
    assert.throws(() => f.verify(), /predicate|kind/i);
    const oversized = businessPredicateFixture(); oversized.context.inputCount = 9n;
    assert.throws(() => oversized.verify(), /selection|count|bound/i);
    const index = businessPredicateFixture(); index.predicate.inputIndex = 1n;
    assert.throws(() => index.verify(), /index|selection/i);
  });
});
