import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";
import type { ParticipantSlotAssignment } from "@permio/context-accounts";
import { createOrdinaryUserFixture, measureOrdinaryUserAction } from "../../../scripts/m6-ordinary-user-workload.ts";
import { prepareRuntimeSlotAssignmentChain, type PrepareRuntimeSlotAssignmentChainInput } from "../src/index.ts";
import { pureCircuits } from "../contracts/managed/permio-authorization/contract/index.js";
import { hashM5ParticipantSlotAssignment } from "../src/index.ts";

const creator = { kind: "instance-creator", principalId: "benchmark-allocator" } as const;

function input(f: ReturnType<typeof createOrdinaryUserFixture>): PrepareRuntimeSlotAssignmentChainInput {
  return {
    template: f.template, assignments: f.system, governance: f.governance,
    instanceId: f.payload.instanceId, actionId: f.payload.actionId,
    subjectAccountId: f.subjectAccountId, assignmentId: f.slotAssignmentId, evaluatedAt: 150,
  };
}

function changedSource(f: ReturnType<typeof createOrdinaryUserFixture>, change: (record: ParticipantSlotAssignment) => ParticipantSlotAssignment) {
  return {
    getScenarioInstance: f.system.getScenarioInstance.bind(f.system),
    getContextAccount: f.system.getContextAccount.bind(f.system),
    getParticipantSlotAssignment: (id: string) => change(f.system.getParticipantSlotAssignment(id)),
    isParticipantSlotActive: f.system.isParticipantSlotActive.bind(f.system),
  };
}

function occupiedFixture() {
  const template = createOrdinaryUserFixture("customer-session").template;
  const first = template.participantSlots[0]!;
  const f = createOrdinaryUserFixture("delegated-session", { assignSlot: false, template: {
    ...template,
    participantSlots: [
      { ...first, assignableBy: ["manager"] },
      { id: "manager", description: "A context-bound assigning slot.", assignableBy: ["@instance-creator", "requester"] },
    ],
    contexts: [{ ...template.contexts[0]!, allowedSlotIds: ["requester", "manager"] }],
  } });
  f.system.assignParticipantSlot(creator, {
    ...f.payload, assignmentId: "assignment.manager", slotId: "manager", subjectAccountId: "benchmark-customer",
  }, 135);
  f.system.assignParticipantSlot({ kind: "occupied-slot", accountId: "benchmark-customer", assignmentId: "assignment.manager" }, {
    ...f.payload, assignmentId: f.slotAssignmentId, slotId: "requester", subjectAccountId: f.subjectAccountId,
  }, 136);
  return f;
}

// Slot provenance is NOT capability delegation. M2/M5-P1 impose no shared
// 16-hop limit: a reusable assigning slot can have arbitrarily many distinct
// holders. This synthetic fixture pins that accepted behavior without changing M5.
function longOccupiedFixture(managerCount = 33) {
  const template = createOrdinaryUserFixture("customer-session").template;
  const f = createOrdinaryUserFixture("customer-session", { assignSlot: false, template: {
    ...template,
    participantSlots: [
      { ...template.participantSlots[0]!, assignableBy: ["manager"] },
      { id: "manager", description: "A reusable context-bound assigning slot.", assignableBy: ["@instance-creator", "manager"] },
    ],
    contexts: [{ ...template.contexts[0]!, allowedSlotIds: ["requester", "manager"] }],
  } });
  const managers = Array.from({ length: managerCount }, (_, index) => ({
    accountId: `manager-account-${index}`, assignmentId: `manager-assignment-${index}`,
  }));
  // All registration precedes assignment, respecting M5-P1's mutation watermark.
  managers.forEach(({ accountId }) => f.system.registerContextAccount({
    accountId, instanceId: f.payload.instanceId, contextId: f.payload.contextId,
    kind: "human", publicKeyPem: generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" }).toString(),
  }, 131));
  managers.forEach((manager, index) => {
    const parent = managers[index - 1];
    f.system.assignParticipantSlot(parent ? { kind: "occupied-slot", ...parent } : creator, {
      ...f.payload, ...manager, slotId: "manager", subjectAccountId: manager.accountId,
    }, 135 + index);
  });
  const last = managers.at(-1)!;
  f.system.assignParticipantSlot({ kind: "occupied-slot", ...last }, {
    ...f.payload, assignmentId: f.slotAssignmentId, slotId: "requester", subjectAccountId: f.subjectAccountId,
  }, 135 + managerCount);
  return { f, managers, evaluatedAt: 136 + managerCount };
}

describe("M5-P1 to M6 private slot-rule witness preparation (not chain authorization)", () => {
  it("prepares both ordinary-user modes without mutating authorization state or granting trust", () => {
    for (const mode of ["customer-session", "delegated-session"] as const) {
      const f = createOrdinaryUserFixture(mode);
      const witness = prepareRuntimeSlotAssignmentChain(input(f));
      assert.equal(witness.kind, "private-witness-only");
      assert.equal("allowed" in witness, false);
      assert.equal(witness.entries.length, 1);
      assert.equal(witness.entries[0]!.assignment.subjectAccountId, f.subjectAccountId);
      assert.equal(witness.entries[0]!.rule.authorityKind, 1n);
      assert.equal(f.system.getScenarioInstance(f.payload.instanceId).state, "ready");
      assert(measureOrdinaryUserAction(f).totalClientActionMs >= 0);
    }
  });

  it("uses exact M4 namespace governance only when the template explicitly permits it", () => {
    const source = createOrdinaryUserFixture("customer-session").template;
    const f = createOrdinaryUserFixture("customer-session", { assignSlot: false, template: {
      ...source, participantSlots: [{ ...source.participantSlots[0]!, assignableBy: ["@namespace-governance"] }],
    } });
    f.system.assignParticipantSlot({ kind: "namespace-governance", principalId: "benchmark-governance" }, {
      ...f.payload, assignmentId: f.slotAssignmentId, slotId: "requester", subjectAccountId: f.subjectAccountId,
    }, 135);
    assert.equal(prepareRuntimeSlotAssignmentChain(input(f)).entries[0]!.rule.authorityKind, 2n);
    for (const principalId of ["benchmark-issuer", "benchmark-allocator", "administrator"]) {
      assert.throws(() => prepareRuntimeSlotAssignmentChain({ ...input(f), assignments: changedSource(f,
        (record) => ({ ...record, assignedBy: { kind: "namespace-governance", principalId } })) }), /exact namespace/);
    }
    assert.throws(() => prepareRuntimeSlotAssignmentChain({ ...input(f), governance: {
      getNamespacePolicy: () => ({ ...f.governance.getNamespacePolicy(f.payload.namespace), namespace: "other.namespace" }),
    } }), /exact namespace/);
  });

  it("retains the complete exact root-to-terminal occupied-slot provenance and rule openings", () => {
    const f = occupiedFixture();
    const witness = prepareRuntimeSlotAssignmentChain(input(f));
    assert.deepEqual(witness.entries.map((entry) => entry.assignment.assignmentId), ["assignment.manager", f.slotAssignmentId]);
    assert.deepEqual(witness.entries.map((entry) => entry.rule.authorityKind), [1n, 3n]);
    for (const entry of witness.entries) {
      assert.doesNotThrow(() => pureCircuits.assertRuntimeParticipantSlotRule(witness.policy, entry.rule,
        entry.rulePath, witness.policy.contextHash, entry.rule.slotIdHash));
    }
    assert(measureOrdinaryUserAction(f).totalClientActionMs >= 0);
  });

  it("preserves valid slot provenance longer than the separate 17-entry capability witness", () => {
    const { f, managers, evaluatedAt } = longOccupiedFixture();
    const witness = prepareRuntimeSlotAssignmentChain({ ...input(f), evaluatedAt });
    assert.equal(witness.entries.length, 34);
    assert.deepEqual(witness.entries.map((entry) => entry.assignment.assignmentId), [
      ...managers.map((manager) => manager.assignmentId), f.slotAssignmentId,
    ]);
    // The capability/session chain is still the ordinary customer's root grant.
    assert.equal(f.system.getCapabilityGrant("benchmark-root").delegationDepth, 0);
    assert.equal(f.system.getSessionGrant("benchmark-session").subjectAccountId, f.subjectAccountId);
    assert.equal(witness.entries.at(-1)!.assignment.subjectAccountId, f.subjectAccountId);
    assert.equal(f.system.isParticipantSlotActive(f.slotAssignmentId, evaluatedAt), true);
    assert.equal("allowed" in witness, false);
  });

  it("invalidates long-chain descendants when an ancestor outside the last 17 entries is revoked", () => {
    const { f, managers, evaluatedAt } = longOccupiedFixture();
    const ancestor = managers[1]!;
    assert.equal(f.system.isParticipantSlotActive(f.slotAssignmentId, evaluatedAt), true);
    f.system.revokeParticipantSlot(creator, ancestor.assignmentId, evaluatedAt + 1);
    assert.equal(f.system.isParticipantSlotActive(managers[0]!.assignmentId, evaluatedAt + 2), true);
    assert.equal(f.system.isParticipantSlotActive(f.slotAssignmentId, evaluatedAt + 2), false);
    assert.throws(() => prepareRuntimeSlotAssignmentChain({ ...input(f), evaluatedAt: evaluatedAt + 2 }), /inactive/);
    // Same holder/slot, new exact ID: old descendant edges must not be rebound.
    f.system.assignParticipantSlot(creator, {
      ...f.payload, assignmentId: "replacement-manager", slotId: "manager", subjectAccountId: ancestor.accountId,
    }, evaluatedAt + 3);
    assert.equal(f.system.isParticipantSlotActive("replacement-manager", evaluatedAt + 4), true);
    assert.equal(f.system.isParticipantSlotActive(f.slotAssignmentId, evaluatedAt + 4), false);
  });

  it("invalidates long-chain descendants when a distant ancestor account is revoked", () => {
    const { f, managers, evaluatedAt } = longOccupiedFixture();
    f.system.revokeAccount(managers[1]!.accountId, evaluatedAt + 1);
    assert.equal(f.system.isParticipantSlotActive(managers[0]!.assignmentId, evaluatedAt + 2), true);
    assert.equal(f.system.isParticipantSlotActive(f.slotAssignmentId, evaluatedAt + 2), false);
    assert.throws(() => prepareRuntimeSlotAssignmentChain({ ...input(f), evaluatedAt: evaluatedAt + 2 }), /inactive/);
  });

  it("rejects altered template, holder, slot, context, instance, version and assigning authority", () => {
    const f = createOrdinaryUserFixture("customer-session");
    const alterations: Partial<ParticipantSlotAssignment>[] = [
      { namespace: "other.namespace" }, { templateId: "bench.support/another" }, { templateVersion: "1.0.1" },
      { templateHash: `0x${"00".repeat(32)}` }, { instanceId: "instance.other" },
      { contextId: "context.other" }, { slotId: "slot.other" }, { subjectAccountId: "account.other" },
      { assignmentVersion: 2 as 1 }, { assignedAt: 151 },
      { assignedBy: { kind: "instance-creator", principalId: "benchmark-issuer" } },
      { assignedBy: { kind: "namespace-governance", principalId: "benchmark-governance" } },
    ];
    for (const alteration of alterations) {
      assert.throws(() => prepareRuntimeSlotAssignmentChain({ ...input(f), assignments: changedSource(f,
        (record) => ({ ...record, ...alteration })) }));
    }
    assert.throws(() => prepareRuntimeSlotAssignmentChain({ ...input(f), template: { ...f.template, description: "Changed." } }), /exact template/);
    assert.throws(() => prepareRuntimeSlotAssignmentChain({ ...input(f), actionId: "missing-action" }), /declared action/);
  });

  it("rejects missing, revoked, expired and account-revoked assignments", () => {
    const missing = createOrdinaryUserFixture("customer-session", { assignSlot: false });
    assert.throws(() => prepareRuntimeSlotAssignmentChain(input(missing)));
    const f = createOrdinaryUserFixture("customer-session");
    f.system.revokeParticipantSlot(creator, f.slotAssignmentId, 145);
    assert.throws(() => prepareRuntimeSlotAssignmentChain(input(f)), /inactive/);
    const account = createOrdinaryUserFixture("customer-session");
    account.system.revokeAccount(account.subjectAccountId, 145);
    assert.throws(() => prepareRuntimeSlotAssignmentChain(input(account)), /inactive/);
    const expired = createOrdinaryUserFixture("customer-session");
    assert.throws(() => prepareRuntimeSlotAssignmentChain({ ...input(expired), evaluatedAt: 1_000 }), /lifetime/);
  });

  it("rejects a revoked parent and does not revive an old child with a new parent assignment", () => {
    const f = occupiedFixture();
    f.system.revokeParticipantSlot(creator, "assignment.manager", 140);
    assert.throws(() => prepareRuntimeSlotAssignmentChain(input(f)), /inactive/);
    f.system.assignParticipantSlot(creator, {
      ...f.payload, assignmentId: "assignment.new-manager", slotId: "manager", subjectAccountId: "benchmark-customer",
    }, 150);
    assert.throws(() => prepareRuntimeSlotAssignmentChain({ ...input(f), evaluatedAt: 155 }), /inactive/);
  });

  it("rejects substituted parent holders and cyclic or incomplete provenance", () => {
    const f = occupiedFixture();
    assert.throws(() => prepareRuntimeSlotAssignmentChain({ ...input(f), assignments: changedSource(f, (record) =>
      record.assignmentId === f.slotAssignmentId ? { ...record, assignedBy: {
        kind: "occupied-slot", accountId: "wrong-holder", assignmentId: "assignment.manager",
      } } : record) }), /parent holder/);
    assert.throws(() => prepareRuntimeSlotAssignmentChain({ ...input(f), assignments: changedSource(f, (record) =>
      record.assignmentId === "assignment.manager" ? { ...record, assignedAt: 136, assignedBy: {
        kind: "occupied-slot", accountId: f.subjectAccountId, assignmentId: f.slotAssignmentId,
      } } : record) }), /cyclic/);
  });

  it("validates times and returns private defensive copies", () => {
    const f = createOrdinaryUserFixture("customer-session");
    for (const evaluatedAt of [-1, 0.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1, 134]) {
      assert.throws(() => prepareRuntimeSlotAssignmentChain({ ...input(f), evaluatedAt }));
    }
    const witness = prepareRuntimeSlotAssignmentChain(input(f));
    witness.entries[0]!.rule.contextHash.fill(0);
    (witness.entries[0]!.assignment as { slotId: string }).slotId = "changed";
    const fresh = prepareRuntimeSlotAssignmentChain(input(f));
    assert.equal(fresh.entries[0]!.assignment.slotId, "requester");
    assert.notDeepEqual(fresh.entries[0]!.rule.contextHash, new Uint8Array(32));
  });

  it("canonically commits exact M5 assignment evidence without authenticating its caller", () => {
    const f = createOrdinaryUserFixture("customer-session");
    const record = f.system.getParticipantSlotAssignment(f.slotAssignmentId);
    const reordered = Object.fromEntries(Object.entries(record).reverse()) as unknown as ParticipantSlotAssignment;
    assert.deepEqual(hashM5ParticipantSlotAssignment(record), hashM5ParticipantSlotAssignment(reordered));
    for (const alteration of [{ assignedAt: record.assignedAt + 1 }, { assignmentId: "another.assignment" },
      { assignedBy: { kind: "instance-creator", principalId: "another.creator" } as const }]) {
      assert.notDeepEqual(hashM5ParticipantSlotAssignment(record), hashM5ParticipantSlotAssignment({ ...record, ...alteration }));
    }
    assert.equal("allowed" in hashM5ParticipantSlotAssignment(record), false);
  });
});
