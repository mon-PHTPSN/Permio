import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";

import type { ScenarioTemplate } from "@permio/scenario-domain";
import {
  ScenarioGovernanceRegistry,
  createReviewerAttestation,
  type NamespacePolicy,
  type TemplateTarget,
} from "@permio/scenario-governance";
import {
  ContextAuthorizationError,
  SLOT_ASSIGNMENT_VERSION,
  SlotBoundContextAccountSystem,
  createSignedActionIntent,
  type ActionIntentPayload,
  type AssignParticipantSlotInput,
  type CapabilityScope,
  type SlotAssignmentActor,
} from "../src/index.ts";

const creator = { kind: "instance-creator", principalId: "allocator.service" } as const;
const council = { kind: "namespace-governance", principalId: "governance.council" } as const;

function keys() {
  const pair = generateKeyPairSync("ed25519");
  return { privateKey: pair.privateKey, publicKeyPem: pair.publicKey.export({ type: "spki", format: "pem" }).toString() };
}

function template(): ScenarioTemplate {
  const commonAction = {
    description: "Perform a scoped operation.", contextId: "operation-context",
    inputRecordTypes: ["source-record"], outputClaimTypes: ["operation-result"],
    purpose: "bounded-purpose", recipientKind: "named-recipient",
    capabilityRuleId: "bounded-capability", proofProfileId: "bounded-proof", executionAdapterId: null,
  };
  const commonContext = {
    description: "An isolated context.", recordTypes: ["source-record"], claimTypes: ["operation-result"],
    recipientKinds: ["named-recipient"], purposes: ["bounded-purpose"],
  };
  return {
    schemaVersion: 1, namespace: "lab.synthetic", templateId: "lab.synthetic/slot-operation", version: "1.0.0",
    displayName: "Slot Operation", description: "Portable slot-assignment patch fixture.",
    participantSlots: [
      { id: "operator", description: "Creator-assigned operator.", assignableBy: ["@instance-creator"] },
      { id: "manager", description: "Governance-assigned manager.", assignableBy: ["@namespace-governance"] },
      { id: "helper", description: "Operator-assigned helper.", assignableBy: ["operator"] },
    ],
    contexts: [
      { ...commonContext, id: "operation-context", allowedSlotIds: ["operator", "manager", "helper"] },
      { ...commonContext, id: "isolated-context", allowedSlotIds: ["operator"] },
    ],
    states: ["ready", "completed"], initialState: "ready",
    actions: [
      { ...commonAction, id: "perform-operation", actorSlotId: "operator" },
      { ...commonAction, id: "assist-operation", actorSlotId: "helper" },
    ],
    transitions: [
      { id: "complete-operation", fromState: "ready", actionId: "perform-operation", toState: "completed" },
      { id: "complete-assistance", fromState: "ready", actionId: "assist-operation", toState: "completed" },
    ],
    capabilityRules: [{
      id: "bounded-capability", description: "A bounded capability.",
      actionIds: ["perform-operation", "assist-operation"], resourceSelector: "selected-resource",
      purpose: "bounded-purpose", recipientConstraint: "named-recipient", validForSeconds: 900,
      maxDelegationDepth: 2, disclosurePolicyId: "minimal-result", revocable: true,
    }],
    proofProfiles: [{ id: "bounded-proof", circuitId: "generic-circuit-v1", publicOutputSchemaId: "operation-result-v1" }],
    executionAdapters: [],
    privacyInvariants: [{ id: "context-isolation", description: "Membership is context-bound and private." }],
  };
}

function setup(actionId = "perform-operation") {
  const first = keys();
  const second = keys();
  const policy: NamespacePolicy = {
    namespace: "lab.synthetic", impact: "high", reviewThreshold: 2,
    authors: [{ principalId: "author.human", kind: "human" }],
    reviewers: [
      { principalId: "reviewer.alpha", kind: "human", publicKeyPem: first.publicKeyPem },
      { principalId: "reviewer.beta", kind: "human", publicKeyPem: second.publicKeyPem },
    ],
    governanceAuthorities: [{ principalId: "governance.council", kind: "organization" }],
    allocators: [{ principalId: "allocator.service", kind: "service" }],
    emergencyRevokers: [{ principalId: "emergency.council", kind: "organization" }],
  };
  const otherPolicy: NamespacePolicy = {
    ...policy, namespace: "lab.other",
    governanceAuthorities: [{ principalId: "governance.other", kind: "organization" }],
  };
  const governance = new ScenarioGovernanceRegistry([policy, otherPolicy]);
  const source = template();
  const draft = governance.createDraft("author.human", source, 10);
  governance.recordValidation("author.human", draft.target, { toolId: "validator", toolVersion: "1.0.0", findings: [] }, 20);
  governance.submitForReview("author.human", draft.target, 30);
  for (const [index, pair] of [first, second].entries()) {
    governance.submitReview(createReviewerAttestation({
      attestationVersion: 1, ...draft.target, reviewerId: index === 0 ? "reviewer.alpha" : "reviewer.beta",
      decision: "approve", reviewedAt: 40 + index,
    }, pair.privateKey));
  }
  governance.activate("governance.council", draft.target, 50);
  const system = new SlotBoundContextAccountSystem(governance);
  for (const suffix of ["one", "two"]) {
    governance.authorizeInstantiation("allocator.service", draft.target, `allocation.${suffix}`, 60);
    system.createScenarioInstance({
      instanceId: `instance.${suffix}`, instantiationRequestId: `allocation.${suffix}`, template: source,
      expiresAt: 1_000, capabilityIssuers: [{ principalId: "issuer.service", kind: "service" }],
    }, 70);
  }
  function register(accountId: string, instanceId = "instance.one", contextId = "operation-context", at = 80) {
    const pair = keys();
    system.registerContextAccount({ accountId, instanceId, contextId, kind: "human", publicKeyPem: pair.publicKeyPem }, at);
    return pair;
  }
  const accountKeys = register("account.one");
  register("account.two");
  register("account.isolated", "instance.one", "isolated-context");
  register("account.other-instance", "instance.two");
  const scope: CapabilityScope = {
    actions: [actionId], resourceSelectors: ["selected-resource"], resources: ["resource.one", "resource.two"],
    purposes: ["bounded-purpose"], recipientKinds: ["named-recipient"], recipients: ["recipient.one"],
    disclosurePolicyIds: ["minimal-result"],
  };
  system.issueRootCapability("issuer.service", {
    grantId: "grant.root", instanceId: "instance.one", contextId: "operation-context", subjectAccountId: "account.one",
    scope, notBefore: 100, expiresAt: 900, maxDelegationDepth: 2,
  }, 90);
  const sessionKeys = keys();
  system.issueSession("account.one", "grant.root", {
    sessionId: "session.one", publicKeyPem: sessionKeys.publicKeyPem, scope: { ...scope, resources: ["resource.one"] },
    notBefore: 110, expiresAt: 800,
  }, 100);
  const target = draft.target;
  const assignment = (overrides: Partial<AssignParticipantSlotInput> = {}): AssignParticipantSlotInput => ({
    ...target, assignmentId: "assignment.one", instanceId: "instance.one", contextId: "operation-context",
    slotId: "operator", subjectAccountId: "account.one", ...overrides,
  });
  const intent = (overrides: Partial<ActionIntentPayload> = {}) => createSignedActionIntent({
    intentVersion: 1, ...target, sessionId: "session.one", instanceId: "instance.one", contextId: "operation-context",
    actionId, resourceSelector: "selected-resource", resource: "resource.one", purpose: "bounded-purpose",
    recipientKind: "named-recipient", recipient: "recipient.one", disclosurePolicyId: "minimal-result",
    issuedAt: 125, nonce: "nonce.one", ...overrides,
  }, sessionKeys.privateKey);
  return { system, governance, source, target, assignment, intent, register, accountKeys, sessionKeys, scope };
}

function expectError(operation: () => unknown, code: ContextAuthorizationError["code"]): void {
  assert.throws(operation, (error: unknown) => error instanceof ContextAuthorizationError && error.code === code);
}

function occupied(accountId: string, assignmentId: string): SlotAssignmentActor {
  return { kind: "occupied-slot", accountId, assignmentId };
}

describe("M5 follow-up: template-governed participant slots", () => {
  it("allows creator slot setup before a future grant starts but rejects session issuance until the real parent window", () => {
    const f = setup();
    f.system.issueRootCapability("issuer.service", { grantId: "grant.future", instanceId: "instance.one",
      contextId: "operation-context", subjectAccountId: "account.one", scope: f.scope,
      notBefore: 300, expiresAt: 900, maxDelegationDepth: 0 }, 120);
    assert.equal(f.system.assignParticipantSlot(creator, f.assignment(), 130).assignedAt, 130);
    const session = { sessionId: "session.future", publicKeyPem: keys().publicKeyPem,
      scope: { ...f.scope, resources: ["resource.one"] }, notBefore: 300, expiresAt: 800 };
    expectError(() => f.system.issueSession("account.one", "grant.future", session, 299), "INVALID_TIME");
    assert.equal(f.system.issueSession("account.one", "grant.future", session, 300).issuedAt, 300);
    assert.equal(f.system.getCapabilityGrant("grant.future").expiresAt, 900);
  });

  it("requires a slot as well as a capability, without consuming denied intent state or nonce", () => {
    const f = setup();
    const intent = f.intent();
    assert.deepEqual(f.system.authorizeAction(intent, 130), { allowed: false, reason: "SLOT_NOT_ASSIGNED" });
    assert.equal(f.system.getScenarioInstance("instance.one").state, "ready");
    const record = f.system.assignParticipantSlot(creator, f.assignment(), 135);
    assert.equal(record.assignmentVersion, SLOT_ASSIGNMENT_VERSION);
    assert.equal(f.system.authorizeAction(intent, 140).allowed, true);
    assert.equal(f.system.getScenarioInstance("instance.one").state, "completed");
    assert.deepEqual(f.system.authorizeAction(intent, 141), { allowed: false, reason: "REPLAYED_INTENT" });
  });

  it("uses only the actual instance creator, not an arbitrary allocator reference", () => {
    const f = setup();
    expectError(() => f.system.assignParticipantSlot({ ...creator, principalId: "allocator.other" }, f.assignment(), 110), "UNAUTHORIZED");
    assert.equal(f.system.assignParticipantSlot(creator, f.assignment(), 110).assignedBy.kind, "instance-creator");
  });

  it("resolves namespace governance from M4 policy and only where the slot permits it", () => {
    const f = setup();
    expectError(() => f.system.assignParticipantSlot(council, f.assignment(), 110), "UNAUTHORIZED");
    const record = f.system.assignParticipantSlot(council, f.assignment({ slotId: "manager" }), 110);
    assert.equal(record.slotId, "manager");
    assert.deepEqual(f.system.authorizeAction(f.intent(), 130), { allowed: false, reason: "SLOT_NOT_ASSIGNED" });
  });

  for (const principalId of ["author.human", "reviewer.alpha", "allocator.service", "issuer.service", "emergency.council", "governance.other", "administrator"]) {
    it(`does not collapse ${principalId} into namespace slot governance`, () => {
      const f = setup();
      expectError(() => f.system.assignParticipantSlot({ kind: "namespace-governance", principalId }, f.assignment({ slotId: "manager" }), 110), "UNAUTHORIZED");
    });
  }

  it("allows occupied-slot assignment only from a live same-context parent", () => {
    const f = setup("assist-operation");
    f.system.assignParticipantSlot(creator, f.assignment({ assignmentId: "assignment.parent", subjectAccountId: "account.two" }), 110);
    const actor = occupied("account.two", "assignment.parent");
    const child = f.system.assignParticipantSlot(actor, f.assignment({ slotId: "helper" }), 120);
    assert.deepEqual(child.assignedBy, actor);
    assert.equal(f.system.authorizeAction(f.intent(), 130).allowed, true);
  });

  it("rejects unoccupied and impersonated slot authorities", () => {
    const f = setup();
    expectError(() => f.system.assignParticipantSlot(occupied("account.two", "assignment.missing"), f.assignment({ slotId: "helper" }), 110), "INVALID_INPUT");
    f.system.assignParticipantSlot(creator, f.assignment({ assignmentId: "assignment.parent", subjectAccountId: "account.two" }), 110);
    expectError(() => f.system.assignParticipantSlot(occupied("account.one", "assignment.parent"), f.assignment({ slotId: "helper" }), 120), "UNAUTHORIZED");
  });

  it("rejects a parent slot not named by assignableBy", () => {
    const f = setup();
    f.system.assignParticipantSlot(council, f.assignment({ assignmentId: "assignment.parent", slotId: "manager", subjectAccountId: "account.two" }), 110);
    expectError(() => f.system.assignParticipantSlot(occupied("account.two", "assignment.parent"), f.assignment({ slotId: "helper" }), 120), "UNAUTHORIZED");
  });

  it("rejects cross-context and cross-instance subjects and assignment authorities", () => {
    const f = setup();
    for (const subjectAccountId of ["account.isolated", "account.other-instance"]) {
      expectError(() => f.system.assignParticipantSlot(creator, f.assignment({ subjectAccountId }), 110), "INVALID_SCOPE");
    }
    f.system.assignParticipantSlot(creator, f.assignment({ assignmentId: "assignment.isolated", subjectAccountId: "account.isolated", contextId: "isolated-context" }), 110);
    f.system.assignParticipantSlot(creator, f.assignment({ assignmentId: "assignment.other-instance", instanceId: "instance.two", subjectAccountId: "account.other-instance" }), 110);
    for (const [account, assignment] of [["account.isolated", "assignment.isolated"], ["account.other-instance", "assignment.other-instance"]]) {
      expectError(() => f.system.assignParticipantSlot(occupied(account!, assignment!), f.assignment({ slotId: "helper" }), 120), "UNAUTHORIZED");
    }
  });

  it("does not share slot membership with another account in the same context", () => {
    const f = setup();
    f.system.assignParticipantSlot(creator, f.assignment({ subjectAccountId: "account.two" }), 110);
    assert.deepEqual(f.system.authorizeAction(f.intent(), 130), { allowed: false, reason: "SLOT_NOT_ASSIGNED" });
  });

  it("rejects unknown slots and slots excluded from a context", () => {
    const f = setup();
    expectError(() => f.system.assignParticipantSlot(creator, f.assignment({ slotId: "missing" }), 110), "INVALID_SCOPE");
    expectError(() => f.system.assignParticipantSlot(council, f.assignment({ slotId: "manager", contextId: "isolated-context", subjectAccountId: "account.isolated" }), 110), "INVALID_SCOPE");
  });

  for (const alteration of [
    { namespace: "lab.other" }, { templateId: "lab.synthetic/another" }, { templateVersion: "1.0.1" },
    { templateHash: `0x${"00".repeat(32)}` as TemplateTarget["templateHash"] },
  ]) {
    it(`rejects altered assignment target ${Object.keys(alteration)[0]}`, () => {
      const f = setup();
      expectError(() => f.system.assignParticipantSlot(creator, f.assignment(alteration), 110), "TARGET_MISMATCH");
      assert.equal(f.system.listParticipantSlotAssignments("instance.one", "operation-context").length, 0);
    });
  }

  it("rejects duplicate IDs and duplicate active bindings without imposing singleton slots", () => {
    const f = setup();
    f.system.assignParticipantSlot(creator, f.assignment(), 110);
    expectError(() => f.system.assignParticipantSlot(creator, f.assignment({ subjectAccountId: "account.two" }), 120), "DUPLICATE_ID");
    expectError(() => f.system.assignParticipantSlot(creator, f.assignment({ assignmentId: "assignment.duplicate" }), 120), "DUPLICATE_ID");
    f.system.assignParticipantSlot(creator, f.assignment({ assignmentId: "assignment.two", subjectAccountId: "account.two" }), 120);
    assert.equal(f.system.isParticipantSlotActive("assignment.one", 130), true);
    assert.equal(f.system.isParticipantSlotActive("assignment.two", 130), true);
  });

  it("keeps immutable assignment and revocation history; replacement requires a new ID", () => {
    const f = setup();
    const original = f.system.assignParticipantSlot(creator, f.assignment(), 110);
    const revocation = f.system.revokeParticipantSlot(creator, original.assignmentId, 140);
    assert.deepEqual(f.system.getParticipantSlotAssignment(original.assignmentId), original);
    assert.deepEqual(f.system.getParticipantSlotRevocation(original.assignmentId), revocation);
    assert.equal(f.system.isParticipantSlotActive(original.assignmentId, 139), true);
    assert.equal(f.system.isParticipantSlotActive(original.assignmentId, 140), false);
    expectError(() => f.system.revokeParticipantSlot(creator, original.assignmentId, 150), "REVOKED");
    expectError(() => f.system.assignParticipantSlot(creator, f.assignment(), 150), "DUPLICATE_ID");
    f.system.assignParticipantSlot(creator, f.assignment({ assignmentId: "assignment.replacement" }), 150);
    assert.equal(f.system.isParticipantSlotActive(original.assignmentId, 160), false);
    assert.equal(f.system.isParticipantSlotActive("assignment.replacement", 160), true);
  });

  it("permits revocation only by an authority allowed to assign that slot now", () => {
    const f = setup();
    f.system.assignParticipantSlot(creator, f.assignment(), 110);
    expectError(() => f.system.revokeParticipantSlot(council, "assignment.one", 120), "UNAUTHORIZED");
    expectError(() => f.system.revokeParticipantSlot({ ...creator, principalId: "issuer.service" }, "assignment.one", 120), "UNAUTHORIZED");
    assert.equal(f.system.getParticipantSlotRevocation("assignment.one"), null);
    assert.equal(f.system.isParticipantSlotActive("assignment.one", 130), true);
  });

  it("invalidates descendants prospectively and never revives them by reassigning their parent", () => {
    const f = setup("assist-operation");
    f.system.assignParticipantSlot(creator, f.assignment({ assignmentId: "assignment.parent", subjectAccountId: "account.two" }), 110);
    const actor = occupied("account.two", "assignment.parent");
    f.system.assignParticipantSlot(actor, f.assignment({ slotId: "helper" }), 120);
    f.system.revokeParticipantSlot(creator, "assignment.parent", 140);
    assert.equal(f.system.isParticipantSlotActive("assignment.one", 139), true);
    assert.equal(f.system.isParticipantSlotActive("assignment.one", 140), false);
    assert.deepEqual(f.system.authorizeAction(f.intent(), 145), { allowed: false, reason: "SLOT_NOT_ASSIGNED" });
    expectError(() => f.system.assignParticipantSlot(actor, f.assignment({ assignmentId: "assignment.bad", slotId: "helper" }), 150), "UNAUTHORIZED");
    f.system.assignParticipantSlot(creator, f.assignment({ assignmentId: "assignment.new-parent", subjectAccountId: "account.two" }), 150);
    assert.equal(f.system.isParticipantSlotActive("assignment.one", 151), false);
    f.system.assignParticipantSlot(occupied("account.two", "assignment.new-parent"), f.assignment({ assignmentId: "assignment.new-child", slotId: "helper" }), 160);
    assert.equal(f.system.authorizeAction(f.intent(), 170).allowed, true);
  });

  it("invalidates a subject and its assignment descendants on account revocation", () => {
    const f = setup("assist-operation");
    f.system.assignParticipantSlot(creator, f.assignment({ assignmentId: "assignment.parent", subjectAccountId: "account.two" }), 110);
    f.system.assignParticipantSlot(occupied("account.two", "assignment.parent"), f.assignment({ slotId: "helper" }), 120);
    f.system.revokeAccount("account.two", 140);
    assert.equal(f.system.isParticipantSlotActive("assignment.one", 139), true);
    assert.equal(f.system.isParticipantSlotActive("assignment.one", 140), false);
    expectError(() => f.system.assignParticipantSlot(creator, f.assignment({ assignmentId: "assignment.bad", subjectAccountId: "account.two" }), 150), "REVOKED");
    assert.deepEqual(f.system.authorizeAction(f.intent(), 150), { allowed: false, reason: "SLOT_NOT_ASSIGNED" });
  });

  it("invalidates membership at instance expiry or revocation", () => {
    for (const revoke of [false, true]) {
      const f = setup();
      f.system.assignParticipantSlot(creator, f.assignment(), 110);
      if (revoke) f.system.revokeInstance("allocator.service", "instance.one", 140);
      const at = revoke ? 140 : 1_000;
      assert.equal(f.system.isParticipantSlotActive("assignment.one", at), false);
      expectError(() => f.system.assignParticipantSlot(creator, f.assignment({ assignmentId: "assignment.bad", subjectAccountId: "account.two" }), at), revoke ? "REVOKED" : "INVALID_TIME");
      assert.equal(f.system.authorizeAction(f.intent(), at).allowed, false);
    }
  });

  it("rejects invalid and backdated times and prevents authorization before a later revocation", () => {
    const f = setup();
    for (const at of [-1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1, 99]) {
      expectError(() => f.system.assignParticipantSlot(creator, f.assignment(), at), "INVALID_TIME");
    }
    f.system.assignParticipantSlot(creator, f.assignment(), 110);
    f.system.revokeParticipantSlot(creator, "assignment.one", 140);
    assert.deepEqual(f.system.authorizeAction(f.intent(), 130), { allowed: false, reason: "STALE_OPERATION_TIME" });
    expectError(() => f.system.registerContextAccount({ accountId: "account.backdated", instanceId: "instance.one", contextId: "operation-context", kind: "human", publicKeyPem: keys().publicKeyPem }, 139), "INVALID_TIME");
    expectError(() => f.system.revokeCapability("issuer.service", "grant.root", 139), "INVALID_TIME");
    expectError(() => f.system.revokeSession("account.one", "session.one", 139), "INVALID_TIME");
    expectError(() => f.system.revokeAccount("account.one", 139), "INVALID_TIME");
    expectError(() => f.system.revokeInstance("allocator.service", "instance.one", 139), "INVALID_TIME");
    assert.equal(f.system.getScenarioInstance("instance.one").state, "ready");
  });

  it("does not move the mutation watermark on a denied action or failed assignment", () => {
    const f = setup();
    assert.equal(f.system.authorizeAction(f.intent(), 900).allowed, false);
    expectError(() => f.system.assignParticipantSlot(council, f.assignment(), 950), "UNAUTHORIZED");
    f.system.assignParticipantSlot(creator, f.assignment(), 110);
    assert.equal(f.system.authorizeAction(f.intent(), 130).allowed, true);
    expectError(() => f.system.revokeParticipantSlot(creator, "assignment.one", 129), "INVALID_TIME");
  });

  it("authenticates signatures and exact intent routing before checking slots", () => {
    const f = setup();
    const intent = f.intent();
    (intent.payload as { resource: string }).resource = "resource.two";
    assert.deepEqual(f.system.authorizeAction(intent, 130), { allowed: false, reason: "INVALID_SIGNATURE" });
    assert.deepEqual(f.system.authorizeAction(f.intent({ sessionId: "session.unknown" }), 130), { allowed: false, reason: "UNKNOWN_SESSION" });
    assert.deepEqual(f.system.authorizeAction(f.intent({ templateHash: `0x${"00".repeat(32)}` }), 130), { allowed: false, reason: "TEMPLATE_MISMATCH" });
    assert.deepEqual(f.system.authorizeAction(f.intent({ instanceId: "instance.two" }), 130), { allowed: false, reason: "INSTANCE_MISMATCH" });
    assert.deepEqual(f.system.authorizeAction(f.intent({ contextId: "isolated-context" }), 130), { allowed: false, reason: "CONTEXT_MISMATCH" });
    assert.equal(f.system.getScenarioInstance("instance.one").state, "ready");
  });

  it("does not let a slot override capability scope, session revocation or fresh-key checks", () => {
    const f = setup();
    f.system.assignParticipantSlot(creator, f.assignment(), 110);
    assert.deepEqual(f.system.authorizeAction(f.intent({ resource: "resource.two" }), 130), { allowed: false, reason: "RESOURCE_DENIED" });
    assert.deepEqual(f.system.authorizeAction(f.intent({ actionId: "assist-operation" }), 130), { allowed: false, reason: "SLOT_NOT_ASSIGNED" });
    expectError(() => f.system.issueSession("account.one", "grant.root", {
      sessionId: "session.reused", publicKeyPem: f.accountKeys.publicKeyPem, scope: f.scope,
      notBefore: 120, expiresAt: 800,
    }, 110), "INVALID_INPUT");
    f.system.revokeSession("account.one", "session.one", 140);
    assert.deepEqual(f.system.authorizeAction(f.intent(), 150), { allowed: false, reason: "SESSION_REVOKED" });
  });

  it("keeps capability issuance separate from all slot assignment authorities", () => {
    const f = setup();
    f.system.assignParticipantSlot(creator, f.assignment(), 110);
    for (const issuer of ["allocator.service", "governance.council", "account.one", "emergency.council"]) {
      expectError(() => f.system.issueRootCapability(issuer, {
        grantId: "grant.unauthorized", instanceId: "instance.one", contextId: "operation-context",
        subjectAccountId: "account.two", scope: f.scope, notBefore: 120, expiresAt: 800, maxDelegationDepth: 1,
      }, 120), "UNAUTHORIZED");
    }
    expectError(() => f.system.delegateCapability("account.two", "grant.root", {
      grantId: "grant.unauthorized", subjectAccountId: "account.two", scope: f.scope,
      notBefore: 120, expiresAt: 800, maxDelegationDepth: 1,
    }, 120), "UNAUTHORIZED");
  });

  it("retains exact M4 allocation validation without leaving a partially created instance", () => {
    const f = setup();
    f.governance.authorizeInstantiation("allocator.service", f.target, "allocation.three", 60);
    const input = {
      instanceId: "instance.three", instantiationRequestId: "allocation.three", template: f.source,
      expiresAt: 1_000, capabilityIssuers: [{ principalId: "issuer.service", kind: "service" as const }],
    };
    expectError(() => f.system.createScenarioInstance({
      ...input, template: { ...f.source, description: "Altered after approval." },
    }, 70), "TARGET_MISMATCH");
    expectError(() => f.system.getScenarioInstance("instance.three"), "UNKNOWN_INSTANCE");
    assert.equal(f.system.createScenarioInstance(input, 70).templateHash, f.target.templateHash);
  });

  it("supports every neutral principal kind without deriving slots from registration", () => {
    const f = setup();
    for (const kind of ["human", "agent", "service", "contract"] as const) {
      const accountId = `account.kind-${kind}`;
      f.system.registerContextAccount({
        accountId, instanceId: "instance.one", contextId: "operation-context", kind, publicKeyPem: keys().publicKeyPem,
      }, 110);
      assert.equal(f.system.listParticipantSlotAssignments("instance.one", "operation-context").length, 0);
    }
    for (const kind of ["human", "agent", "service", "contract"] as const) {
      const assignmentId = `assignment.kind-${kind}`;
      f.system.assignParticipantSlot(creator, f.assignment({ assignmentId, subjectAccountId: `account.kind-${kind}` }), 120);
      assert.equal(f.system.isParticipantSlotActive(assignmentId, 130), true);
    }
  });

  it("preserves delegated-capability and session enforcement through the guarded API", () => {
    const f = setup();
    const scope = { ...f.scope, resources: ["resource.one"] };
    f.system.delegateCapability("account.one", "grant.root", {
      grantId: "grant.child", subjectAccountId: "account.two", scope,
      notBefore: 120, expiresAt: 850, maxDelegationDepth: 2,
    }, 110);
    const sessionKeys = keys();
    f.system.issueSession("account.two", "grant.child", {
      sessionId: "session.child", publicKeyPem: sessionKeys.publicKeyPem, scope, notBefore: 130, expiresAt: 800,
    }, 120);
    f.system.assignParticipantSlot(creator, f.assignment({ subjectAccountId: "account.two" }), 130);
    const intent = createSignedActionIntent({
      ...f.intent().payload, sessionId: "session.child", issuedAt: 140,
    }, sessionKeys.privateKey);
    assert.equal(f.system.authorizeAction(intent, 150).allowed, true);
    f.system.revokeCapability("issuer.service", "grant.root", 160);
    assert.deepEqual(f.system.authorizeAction(createSignedActionIntent({
      ...intent.payload, nonce: "nonce.two", issuedAt: 170,
    }, sessionKeys.privateKey), 170), { allowed: false, reason: "GRANT_REVOKED" });
    assert.equal(f.system.getCapabilityGrant("grant.child").revokedAt, null);
  });

  it("does not allow backdated root, delegated or session grants through forwarding methods", () => {
    const f = setup();
    f.system.assignParticipantSlot(creator, f.assignment(), 140);
    expectError(() => f.system.issueRootCapability("issuer.service", {
      grantId: "grant.backdated", instanceId: "instance.one", contextId: "operation-context",
      subjectAccountId: "account.two", scope: f.scope, notBefore: 150, expiresAt: 800, maxDelegationDepth: 1,
    }, 139), "INVALID_TIME");
    expectError(() => f.system.delegateCapability("account.one", "grant.root", {
      grantId: "grant.backdated", subjectAccountId: "account.two", scope: f.scope,
      notBefore: 150, expiresAt: 800, maxDelegationDepth: 1,
    }, 139), "INVALID_TIME");
    expectError(() => f.system.issueSession("account.one", "grant.root", {
      sessionId: "session.backdated", publicKeyPem: keys().publicKeyPem, scope: f.scope, notBefore: 150, expiresAt: 800,
    }, 139), "INVALID_TIME");
  });

  it("takes a private template snapshot and cannot be changed by later caller mutation", () => {
    const f = setup();
    (f.source.participantSlots[0]!.assignableBy as string[]).push("@namespace-governance");
    expectError(() => f.system.assignParticipantSlot(council, f.assignment(), 110), "UNAUTHORIZED");
    f.system.assignParticipantSlot(creator, f.assignment(), 110);
    assert.equal(f.system.authorizeAction(f.intent(), 130).allowed, true);
  });

  it("returns defensive copies and does not store extra input properties", () => {
    const f = setup();
    const actor: SlotAssignmentActor = { kind: "instance-creator", principalId: creator.principalId };
    const input = { ...f.assignment(), secret: "must-not-be-stored" };
    const original = f.system.assignParticipantSlot(actor, input, 110);
    (actor as { principalId: string }).principalId = "allocator.changed";
    input.subjectAccountId = "account.two";
    const changed = original as unknown as { subjectAccountId: string; assignedBy: { principalId: string } };
    changed.subjectAccountId = "account.two";
    changed.assignedBy.principalId = "allocator.changed";
    const listed = f.system.listParticipantSlotAssignments("instance.one", "operation-context");
    (listed[0] as unknown as { slotId: string }).slotId = "manager";
    const stored = f.system.getParticipantSlotAssignment("assignment.one");
    assert.equal(stored.subjectAccountId, "account.one");
    assert.equal(stored.slotId, "operator");
    assert.deepEqual(stored.assignedBy, creator);
    assert.equal("secret" in stored, false);
    const revocation = f.system.revokeParticipantSlot(creator, "assignment.one", 140);
    (revocation as unknown as { revokedAt: number }).revokedAt = 1;
    assert.equal(f.system.getParticipantSlotRevocation("assignment.one")!.revokedAt, 140);
  });
});
