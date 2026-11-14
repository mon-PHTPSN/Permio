import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ecAdd, ecMul, ecMulGenerator } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { pureCircuits as pure, type RuntimeBusinessRecord } from "../contracts/managed/permio-authorization-v11/contract/index.js";
import { JUBJUB_SCALAR_ORDER, TWO_TO_248 } from "../src/compact-crypto.ts";
import { createRuntimeActionTypeTree } from "../src/template-policy.ts";
import {
  createRuntimeBusinessPredicates,
  runtimeBusinessAuditReference,
  runtimeBusinessRecordCommitment,
  signRuntimeBusinessRecord,
} from "../src/business-predicates.ts";

const bytes = (n: number) => new Uint8Array(32).fill(n);

function template(): Record<string, any> {
  return {
    schemaVersion: 2, namespace: "org.test", templateId: "org.test/action", version: "2.0.0",
    displayName: "Test action", description: "Generic signed evidence test.",
    participantSlots: [{ id: "subject", description: "Acts.", assignableBy: ["@instance-creator"] }],
    contexts: [{ id: "operation", description: "An operation.", allowedSlotIds: ["subject"],
      recordTypes: ["acknowledgment-input", "ceiling", "credential", "request"],
      claimTypes: ["bounded", "acknowledged", "current"], recipientKinds: ["recipient"], purposes: ["check"] }],
    states: ["ready", "done"], initialState: "ready",
    actions: [{ id: "act", description: "Perform an operation.", contextId: "operation", actorSlotId: "subject",
      inputRecordTypes: ["acknowledgment-input", "ceiling", "credential", "request"],
      outputClaimTypes: ["bounded", "acknowledged", "current"], purpose: "check", recipientKind: "recipient",
      capabilityRuleId: "permit", proofProfileId: "evidence", executionAdapterId: null }],
    transitions: [{ id: "complete", fromState: "ready", actionId: "act", toState: "done" }],
    capabilityRules: [{ id: "permit", description: "A permission.", actionIds: ["act"], resourceSelector: "resource",
      purpose: "check", recipientConstraint: "recipient", validForSeconds: 300, maxDelegationDepth: 0,
      disclosurePolicyId: "claims-only", revocable: true }],
    proofProfiles: [{ id: "evidence", circuitId: "private-state-transition-predicates-v1",
      publicOutputSchemaId: "decision-receipt-v1", predicates: [
        { kind: "current-record-v1", inputRecordType: "credential", outputClaimType: "current" },
        { kind: "bounded-value-v1", inputRecordType: "request", ceilingRecordType: "ceiling", outputClaimType: "bounded" },
        { kind: "audit-acknowledgment-v1", inputRecordType: "acknowledgment-input", outputClaimType: "acknowledged" },
      ] }],
    executionAdapters: [], privacyInvariants: [{ id: "private-records", description: "Keep records private." }],
  };
}

function record(): RuntimeBusinessRecord {
  return { recordVersion: 1n,
    target: { namespaceHash: bytes(1), templateIdHash: bytes(2), semanticVersion: { major: 2n, minor: 0n, patch: 0n }, templateContentHash: bytes(3) },
    instanceCommitment: bytes(4), contextHash: bytes(5), subjectAccountCredentialCommitment: bytes(6),
    rootCapabilityCommitment: bytes(7), typeHash: bytes(8), resourceHash: bytes(9), purposeHash: bytes(10), recipientHash: bytes(11),
    validAfter: 100n, validBefore: 200n, value: 50n, unitHash: bytes(12), referenceCommitment: bytes(13),
    bodyCommitment: bytes(14), issuerAuthorityCommitment: bytes(15), nonce: bytes(16) };
}

describe("business predicate SDK", () => {
  it("maps ordered declarations to exact selected input/output positions and existing type hashes", () => {
    const input = template(), mapped = createRuntimeBusinessPredicates(input, "act");
    assert.deepEqual(mapped.map(p => [p.predicateVersion, p.kind, p.inputIndex, p.ceilingIndex, p.outputIndex]),
      [[1n, 1n, 2n, 0n, 2n], [1n, 2n, 3n, 1n, 0n], [1n, 3n, 0n, 0n, 1n]]);
    const records = createRuntimeActionTypeTree(input.actions[0].inputRecordTypes, "record-type");
    const claims = createRuntimeActionTypeTree(input.actions[0].outputClaimTypes, "claim-type");
    for (const p of mapped) {
      assert.deepEqual(p.inputTypeHash, records.at(Number(p.inputIndex)).typeHash);
      assert.deepEqual(p.outputTypeHash, claims.at(Number(p.outputIndex)).typeHash);
      assert.deepEqual(p.ceilingTypeHash, p.kind === 2n ? records.at(1).typeHash : bytes(0));
    }
  });

  it("rejects schema 1 and unknown actions rather than reinterpreting legacy profiles", () => {
    const legacy = template(); legacy.schemaVersion = 1; delete legacy.proofProfiles[0].predicates;
    assert.throws(() => createRuntimeBusinessPredicates(legacy, "act"), /schema 2/i);
    assert.throws(() => createRuntimeBusinessPredicates(template(), "missing"), /action/i);
  });

  it("rejects incomplete/duplicate output coverage, invalid references, and selections beyond eight", () => {
    for (const mutation of [
      (t: Record<string, any>) => t.proofProfiles[0].predicates.pop(),
      (t: Record<string, any>) => t.proofProfiles[0].predicates.push({ ...t.proofProfiles[0].predicates[0] }),
      (t: Record<string, any>) => { t.proofProfiles[0].predicates[0].inputRecordType = "missing"; },
      (t: Record<string, any>) => { t.proofProfiles[0].predicates[1].ceilingRecordType = "missing"; },
      (t: Record<string, any>) => {
        const extra = Array.from({ length: 5 }, (_, i) => `extra-${i}`);
        t.contexts[0].recordTypes.push(...extra); t.actions[0].inputRecordTypes.push(...extra);
      },
    ]) {
      const input = template(); mutation(input);
      assert.throws(() => createRuntimeBusinessPredicates(input, "act"), TypeError);
    }
  });

  it("commits the exact signed record using the generated Compact commitment", () => {
    const value = record();
    assert.deepEqual(runtimeBusinessRecordCommitment(value), pure.runtimeBusinessRecordCommitment(value));
    const original = runtimeBusinessRecordCommitment(value);
    value.value += 1n;
    assert.notDeepEqual(runtimeBusinessRecordCommitment(value), original);
  });

  it("signs the generated Compact challenge with caller-provided nonce and rejects record substitution", () => {
    const value = record(), secret = 37n, nonce = 41n;
    const signature = signRuntimeBusinessRecord(value, secret, nonce), publicKey = ecMulGenerator(secret);
    assert.deepEqual(signature.announcement, ecMulGenerator(nonce));
    const challenge = pure.runtimeBusinessRecordSignatureChallenge(signature.announcement, publicKey, value) % TWO_TO_248;
    assert.deepEqual(ecMulGenerator(signature.response), ecAdd(signature.announcement, ecMul(publicKey, challenge)));
    value.bodyCommitment = bytes(99);
    const altered = pure.runtimeBusinessRecordSignatureChallenge(signature.announcement, publicKey, value) % TWO_TO_248;
    assert.notDeepEqual(ecMulGenerator(signature.response), ecAdd(signature.announcement, ecMul(publicKey, altered)));
  });

  it("uses fresh cryptographic nonces by default and rejects invalid signing scalars", () => {
    const value = record(), first = signRuntimeBusinessRecord(value, 37n), second = signRuntimeBusinessRecord(value, 37n);
    assert.notDeepEqual(first.announcement, second.announcement);
    for (const invalid of [0n, -1n, JUBJUB_SCALAR_ORDER]) {
      assert.throws(() => signRuntimeBusinessRecord(value, invalid, 41n), RangeError);
      assert.throws(() => signRuntimeBusinessRecord(value, 37n, invalid), RangeError);
    }
  });

  it("derives the compiled audit reference from both the exact intent and selected inputs", () => {
    const intent = bytes(21), inputs = bytes(22), actual = runtimeBusinessAuditReference(intent, inputs);
    assert.deepEqual(actual, pure.runtimeBusinessAuditReference(intent, inputs));
    assert.notDeepEqual(actual, runtimeBusinessAuditReference(bytes(23), inputs));
    assert.notDeepEqual(actual, runtimeBusinessAuditReference(intent, bytes(24)));
  });
});
