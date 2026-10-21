import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { performance } from "node:perf_hooks";

import {
  SlotBoundContextAccountSystem,
  createSignedActionIntent,
  type SlotBoundActionDecision,
  type ActionIntentPayload,
  type CapabilityScope,
} from "@permio/context-accounts";
import type { ScenarioTemplate } from "@permio/scenario-domain";
import {
  ScenarioGovernanceRegistry,
  createReviewerAttestation,
} from "@permio/scenario-governance";
import { buildRuntimeScopeTrees } from "../packages/midnight-authorization/src/runtime-credentials.ts";
import { prepareRuntimeSlotAssignmentChain } from "../packages/midnight-authorization/src/slot-assignments.ts";
import { pureCircuits } from "../packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js";

export type OrdinaryUserMode = "customer-session" | "delegated-session";
type OrdinaryUserDenialReason = Extract<SlotBoundActionDecision, { allowed: false }>["reason"];

// Synthetic inputs only. This is a benchmark scenario, not an M9 scenario pack,
// an implemented evidence predicate, or a production receipt schema.
const TEMPLATE: ScenarioTemplate = {
  schemaVersion: 1,
  namespace: "bench.support",
  templateId: "bench.support/submit-request",
  version: "1.0.0",
  displayName: "Synthetic customer support request",
  description: "Authorize one request for one order and one support recipient.",
  participantSlots: [{ id: "requester", description: "Context-bound requester.", assignableBy: ["@instance-creator"] }],
  contexts: [{
    id: "support-context", description: "Isolated synthetic support context.",
    allowedSlotIds: ["requester"], recordTypes: ["order-reference"],
    claimTypes: ["request-authorization"], recipientKinds: ["organization"],
    purposes: ["customer-support"],
  }],
  states: ["ready", "submitted"],
  initialState: "ready",
  actions: [{
    id: "submit-support-request", description: "Submit one scoped support request.",
    contextId: "support-context", actorSlotId: "requester",
    inputRecordTypes: ["order-reference"], outputClaimTypes: ["request-authorization"],
    purpose: "customer-support", recipientKind: "organization",
    capabilityRuleId: "submit-rule", proofProfileId: "support-proof", executionAdapterId: null,
  }],
  transitions: [{ id: "submit", fromState: "ready", actionId: "submit-support-request", toState: "submitted" }],
  capabilityRules: [{
    id: "submit-rule", description: "One bounded request.",
    actionIds: ["submit-support-request"], resourceSelector: "order-id",
    purpose: "customer-support", recipientConstraint: "organization",
    validForSeconds: 900, maxDelegationDepth: 2,
    disclosurePolicyId: "request-minimum", revocable: true,
  }],
  proofProfiles: [{ id: "support-proof", circuitId: "delegated-capability-action-v1", publicOutputSchemaId: "decision-receipt-v1" }],
  executionAdapters: [],
  privacyInvariants: [{ id: "support-isolation", description: "No cross-context or recipient expansion." }],
};

function keys() {
  const pair = generateKeyPairSync("ed25519");
  return {
    privateKey: pair.privateKey,
    publicKeyPem: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}

export function createOrdinaryUserFixture(mode: OrdinaryUserMode, options: {
  assignSlot?: boolean; template?: ScenarioTemplate;
} = {}) {
  if (mode !== "customer-session" && mode !== "delegated-session") {
    throw new TypeError("unsupported ordinary-user mode");
  }
  const reviewers = [keys(), keys()];
  const template = options.template ?? TEMPLATE;
  const registry = new ScenarioGovernanceRegistry([{
    namespace: template.namespace, impact: "high", reviewThreshold: 2,
    authors: [{ principalId: "benchmark-author", kind: "human" }],
    reviewers: reviewers.map((reviewer, index) => ({
      principalId: `benchmark-reviewer-${index}`, kind: "human" as const,
      publicKeyPem: reviewer.publicKeyPem,
    })),
    governanceAuthorities: [{ principalId: "benchmark-governance", kind: "organization" }],
    allocators: [{ principalId: "benchmark-allocator", kind: "service" }],
    emergencyRevokers: [{ principalId: "benchmark-emergency", kind: "organization" }],
  }]);
  const draft = registry.createDraft("benchmark-author", template, 10);
  registry.recordValidation("benchmark-author", draft.target, { toolId: "benchmark-validator", toolVersion: "1.0.0", findings: [] }, 20);
  registry.submitForReview("benchmark-author", draft.target, 30);
  reviewers.forEach((reviewer, index) => registry.submitReview(createReviewerAttestation({
    attestationVersion: 1, ...draft.target, reviewerId: `benchmark-reviewer-${index}`,
    decision: "approve", reviewedAt: 40 + index,
  }, reviewer.privateKey)));
  registry.activate("benchmark-governance", draft.target, 50);
  registry.authorizeInstantiation("benchmark-allocator", draft.target, "benchmark-allocation", 60);
  const system = new SlotBoundContextAccountSystem(registry);
  system.createScenarioInstance({
    instanceId: "benchmark-instance", instantiationRequestId: "benchmark-allocation",
    template, expiresAt: 1_000,
    capabilityIssuers: [{ principalId: "benchmark-issuer", kind: "service" }],
  }, 70);
  const customerKeys = keys();
  system.registerContextAccount({
    accountId: "benchmark-customer", instanceId: "benchmark-instance",
    contextId: "support-context", kind: "human", publicKeyPem: customerKeys.publicKeyPem,
  }, 80);
  const scope: CapabilityScope = {
    actions: ["submit-support-request"], resourceSelectors: ["order-id"],
    resources: ["synthetic-order-a", "synthetic-order-b"], purposes: ["customer-support"],
    recipientKinds: ["organization"], recipients: ["synthetic-support-team"],
    disclosurePolicyIds: ["request-minimum"],
  };
  const sessionScope = { ...scope, resources: ["synthetic-order-a"] };
  system.issueRootCapability("benchmark-issuer", {
    grantId: "benchmark-root", instanceId: "benchmark-instance", contextId: "support-context",
    subjectAccountId: "benchmark-customer", scope,
    notBefore: 100, expiresAt: 900, maxDelegationDepth: 2,
  }, 90);
  let subjectAccountId = "benchmark-customer";
  let grantId = "benchmark-root";
  if (mode === "delegated-session") {
    subjectAccountId = "benchmark-assistant";
    grantId = "benchmark-child";
    system.registerContextAccount({
      accountId: subjectAccountId, instanceId: "benchmark-instance", contextId: "support-context",
      kind: "agent", publicKeyPem: keys().publicKeyPem,
    }, 101);
    system.delegateCapability("benchmark-customer", "benchmark-root", {
      grantId, subjectAccountId, scope: sessionScope,
      notBefore: 120, expiresAt: 800, maxDelegationDepth: 1,
    }, 110);
  }
  const sessionKeys = keys();
  system.issueSession(subjectAccountId, grantId, {
    sessionId: "benchmark-session", publicKeyPem: sessionKeys.publicKeyPem,
    scope: sessionScope, notBefore: 140, expiresAt: 700,
  }, 130);
  const slotAssignmentId = "benchmark-slot-assignment";
  if (options.assignSlot !== false) {
    system.assignParticipantSlot({ kind: "instance-creator", principalId: "benchmark-allocator" }, {
      ...draft.target, assignmentId: slotAssignmentId, instanceId: "benchmark-instance",
      contextId: "support-context", slotId: "requester", subjectAccountId,
    }, 135);
  }
  const payload: ActionIntentPayload = {
    intentVersion: 1, ...draft.target, instanceId: "benchmark-instance",
    contextId: "support-context", sessionId: "benchmark-session",
    actionId: "submit-support-request", resourceSelector: "order-id", resource: "synthetic-order-a",
    purpose: "customer-support", recipientKind: "organization", recipient: "synthetic-support-team",
    disclosurePolicyId: "request-minimum", issuedAt: 150, nonce: "synthetic-fresh-intent",
  };
  return {
    system, payload, sessionKeys, subjectAccountId, slotAssignmentId,
    template: structuredClone(template), governance: registry,
    // Scope trees are credential setup, not work repeated at every click.
    scopeTrees: buildRuntimeScopeTrees(sessionScope),
  };
}

export function measureOrdinaryUserAction(fixture: ReturnType<typeof createOrdinaryUserFixture>) {
  const started = performance.now();
  const intent = createSignedActionIntent(fixture.payload, fixture.sessionKeys.privateKey);
  const signedAt = performance.now();
  const { scopeTrees, payload } = fixture;
  const selections = [
    [scopeTrees.actions, payload.actionId],
    [scopeTrees.resourceSelectors, payload.resourceSelector],
    [scopeTrees.resources, payload.resource],
    [scopeTrees.purposes, payload.purpose],
    [scopeTrees.recipientKinds, payload.recipientKind],
    [scopeTrees.recipients, payload.recipient],
    [scopeTrees.disclosurePolicyIds, payload.disclosurePolicyId],
  ] as const;
  for (const [tree, value] of selections) {
    const witness = tree.pathFor(value);
    assert.equal(pureCircuits.runtimeCredentialStatusPathRoot(witness).field, tree.root.field);
  }
  const scopePreparedAt = performance.now();
  const slots = prepareRuntimeSlotAssignmentChain({
    template: fixture.template, assignments: fixture.system, governance: fixture.governance,
    instanceId: payload.instanceId, actionId: payload.actionId,
    subjectAccountId: fixture.subjectAccountId, assignmentId: fixture.slotAssignmentId, evaluatedAt: 160,
  });
  assert.equal(slots.kind, "private-witness-only");
  assert.equal(slots.entries.at(-1)!.assignment.subjectAccountId, fixture.subjectAccountId);
  const preparedAt = performance.now();
  const decision = fixture.system.authorizeAction(intent, 160);
  const finished = performance.now();
  assert.equal(decision.allowed, true);
  assert.equal(fixture.system.getScenarioInstance(payload.instanceId).state, "submitted");
  assert.deepEqual(fixture.system.authorizeAction(intent, 161), { allowed: false, reason: "REPLAYED_INTENT" });
  return {
    intentSigningMs: signedAt - started,
    scopeWitnessPreparationMs: scopePreparedAt - signedAt,
    slotWitnessPreparationMs: preparedAt - scopePreparedAt,
    m5AuthorizationMs: finished - preparedAt,
    totalClientActionMs: finished - started,
  };
}

export function verifyOrdinaryUserNegatives() {
  const results: { case: string; reason: OrdinaryUserDenialReason }[] = [];
  const check = (
    name: string, reason: OrdinaryUserDenialReason,
    change: (fixture: ReturnType<typeof createOrdinaryUserFixture>) => void,
    options: { mode?: OrdinaryUserMode; authorizedAt?: number; wrongSigner?: boolean; recoverable?: boolean; assignSlot?: boolean } = {},
  ) => {
    const fixture = createOrdinaryUserFixture(options.mode ?? "customer-session", { assignSlot: options.assignSlot });
    change(fixture);
    const intent = createSignedActionIntent(fixture.payload, options.wrongSigner ? keys().privateKey : fixture.sessionKeys.privateKey);
    assert.deepEqual(fixture.system.authorizeAction(intent, options.authorizedAt ?? 160), { allowed: false, reason });
    assert.equal(fixture.system.getScenarioInstance(fixture.payload.instanceId).state, "ready");
    if (options.recoverable) {
      // A denied request cannot consume this nonce or advance the state.
      fixture.payload = { ...fixture.payload, resource: "synthetic-order-a" };
      assert.equal(fixture.system.authorizeAction(createSignedActionIntent(fixture.payload, fixture.sessionKeys.privateKey), 161).allowed, true);
    }
    results.push({ case: name, reason });
  };
  check("altered-template-hash", "TEMPLATE_MISMATCH", (f) => { f.payload = { ...f.payload, templateHash: `0x${"ff".repeat(32)}` }; });
  check("wrong-context", "CONTEXT_MISMATCH", (f) => { f.payload = { ...f.payload, contextId: "other-context" }; });
  check("wrong-recipient", "RECIPIENT_DENIED", (f) => { f.payload = { ...f.payload, recipient: "other-support-team" }; });
  check("wrong-purpose", "PURPOSE_DENIED", (f) => { f.payload = { ...f.payload, purpose: "marketing" }; });
  check("out-of-session-resource", "RESOURCE_DENIED", (f) => { f.payload = { ...f.payload, resource: "synthetic-order-b" }; }, { recoverable: true });
  check("wrong-signature", "INVALID_SIGNATURE", () => {}, { wrongSigner: true });
  check("expired-session", "EXPIRED", () => {}, { authorizedAt: 700 });
  check("revoked-session", "SESSION_REVOKED", (f) => { f.system.revokeSession(f.subjectAccountId, f.payload.sessionId, 155); });
  check("revoked-account", "SLOT_NOT_ASSIGNED", (f) => { f.system.revokeAccount(f.subjectAccountId, 155); });
  check("revoked-parent", "GRANT_REVOKED", (f) => { f.system.revokeCapability("benchmark-issuer", "benchmark-root", 155); }, { mode: "delegated-session" });
  check("missing-slot", "SLOT_NOT_ASSIGNED", () => {}, { assignSlot: false });
  check("revoked-slot", "SLOT_NOT_ASSIGNED", (f) => {
    f.system.revokeParticipantSlot({ kind: "instance-creator", principalId: "benchmark-allocator" }, f.slotAssignmentId, 155);
  });
  return results;
}

export function summarizeMilliseconds(samples: readonly number[]) {
  if (samples.length === 0 || samples.some((sample) => !Number.isFinite(sample) || sample < 0)) {
    throw new TypeError("timing samples must be nonempty, finite and nonnegative");
  }
  const sorted = [...samples].sort((left, right) => left - right);
  const round = (value: number) => Number(value.toFixed(3));
  return {
    samples: sorted.length,
    p50Ms: round(sorted[Math.ceil(sorted.length * 0.5) - 1]!),
    p95Ms: round(sorted[Math.ceil(sorted.length * 0.95) - 1]!),
    maxMs: round(sorted.at(-1)!),
  };
}

export function parseOrdinaryUserArguments(args: readonly string[]) {
  let iterations = 20;
  let requireChain = false;
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index]!;
    if (seen.has(option)) throw new TypeError("duplicate benchmark option");
    seen.add(option);
    if (option === "--require-chain") requireChain = true;
    else if (option === "--iterations") {
      const value = args[++index];
      if (value === undefined || !/^[1-9][0-9]*$/u.test(value)) throw new TypeError("iterations must be an integer from 1 to 100");
      iterations = Number(value);
      if (iterations > 100) throw new TypeError("iterations must be an integer from 1 to 100");
    } else throw new TypeError("unsupported benchmark option");
  }
  return { iterations, requireChain };
}

export function runOrdinaryUserBenchmark(iterations: number) {
  parseOrdinaryUserArguments(["--iterations", String(iterations)]);
  const cases = (["customer-session", "delegated-session"] as const).map((mode) => {
    const setup = () => {
      const started = performance.now();
      const fixture = createOrdinaryUserFixture(mode);
      return { fixture, setupMs: performance.now() - started };
    };
    const first = setup();
    const firstAction = measureOrdinaryUserAction(first.fixture);
    const samples = Array.from({ length: iterations }, () => {
      const next = setup();
      return { fixtureSetupMs: next.setupMs, ...measureOrdinaryUserAction(next.fixture) };
    });
    const fields = ["fixtureSetupMs", "intentSigningMs", "scopeWitnessPreparationMs", "slotWitnessPreparationMs", "m5AuthorizationMs", "totalClientActionMs"] as const;
    return {
      mode, delegationDepth: mode === "customer-session" ? 0 : 1,
      firstActionAfterModuleImportMs: Number(firstAction.totalClientActionMs.toFixed(3)),
      timings: Object.fromEntries(fields.map((field) => [field, summarizeMilliseconds(samples.map((sample) => sample[field]))])),
    };
  });
  const negativeCases = verifyOrdinaryUserNegatives();
  return {
    evidenceVersion: 1,
    benchmark: "ordinary-user-support-request-v1",
    recordedAt: new Date().toISOString(),
    scope: "off-chain slot-aware M5 authorization and private M6 scope/slot-rule witness preparation only",
    offchainChecksPassed: true,
    milestoneComplete: false,
    productionReady: false,
    environment: { node: process.version, platform: process.platform, architecture: process.arch },
    iterationsPerCase: iterations,
    cases,
    negativeCases,
    replayChecksPassed: (iterations + 1) * cases.length,
    chain: {
      status: "not-implemented",
      transactionsSubmitted: 0,
      proofGenerationMs: null,
      submissionMs: null,
      indexedConfirmationMs: null,
      proverPeakMemoryBytes: null,
      receipt: null,
      blockedBy: ["action-time current-root ancestry verification", "cryptographically admitted participant-slot assignment and current role status", "ordinary-user authorization circuits", "atomic state/nullifier update and common receipt"],
    },
    clientProcess: { maxRssKiB: process.resourceUsage().maxRSS, includesModuleLoadingAndFixtureSetup: true },
    qualifications: [
      "Synthetic support scenario, not an M9 pack or evidence-truth proof.",
      "Setup includes off-chain M4 reviews/activation and M5 account/slot/grant/session creation; it is not chain provisioning time.",
      "Seven scope membership paths are prepared and checked with generated Compact pure functions; this is not a ZK proof.",
      "Complete private slot-assignment provenance and policy-v2 rule openings are prepared; this is not chain issuance or current-status authentication.",
      "Serial samples at delegation depth zero and one, not browser, mobile, concurrency, network, or depth-sixteen acceptance.",
      "First-action measurement excludes Node startup and module loading; percentiles are descriptive, not a production SLA.",
      "The in-memory M5 decision is not a Midnight DecisionReceipt and is never submitted to a gateway.",
    ],
  };
}
