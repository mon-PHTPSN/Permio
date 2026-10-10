import assert from "node:assert/strict";
import { generateKeyPairSync, type KeyObject } from "node:crypto";
import { describe, it } from "node:test";

import type { ScenarioTemplate } from "@permio/scenario-domain";

import {
  GovernanceError,
  REVIEWER_ATTESTATION_VERSION,
  ScenarioGovernanceRegistry,
  createReviewerAttestation,
  verifyReviewerAttestation,
  type NamespacePolicy,
  type ReviewerAttestation,
  type ReviewerAttestationPayload,
  type TemplateTarget,
} from "../src/index.ts";

interface ReviewerKeys {
  readonly privateKey: KeyObject;
  readonly publicKeyPem: string;
}

function reviewerKeys(): ReviewerKeys {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    privateKey,
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}

function makeTemplate(version = "1.0.0"): ScenarioTemplate {
  return {
    schemaVersion: 1,
    namespace: "lab.synthetic",
    templateId: "lab.synthetic/bounded-operation",
    version,
    displayName: "Bounded Operation",
    description: "An application-neutral context-bound operation.",
    participantSlots: [
      {
        id: "requester",
        description: "The principal requesting the bounded operation.",
        assignableBy: ["@instance-creator"],
      },
      {
        id: "recipient",
        description: "The intended recipient.",
        assignableBy: ["@namespace-governance"],
      },
    ],
    contexts: [
      {
        id: "bounded-context",
        description: "A synthetic purpose-bound context.",
        allowedSlotIds: ["requester", "recipient"],
        recordTypes: ["source-record"],
        claimTypes: ["bounded-result"],
        recipientKinds: ["named-recipient"],
        purposes: ["bounded-purpose"],
      },
    ],
    states: ["ready", "completed"],
    initialState: "ready",
    actions: [
      {
        id: "perform-operation",
        description: "Perform one bounded synthetic operation.",
        contextId: "bounded-context",
        actorSlotId: "requester",
        inputRecordTypes: ["source-record"],
        outputClaimTypes: ["bounded-result"],
        purpose: "bounded-purpose",
        recipientKind: "named-recipient",
        capabilityRuleId: "bounded-capability",
        proofProfileId: "bounded-proof",
        executionAdapterId: null,
      },
    ],
    transitions: [
      {
        id: "complete-operation",
        fromState: "ready",
        actionId: "perform-operation",
        toState: "completed",
      },
    ],
    capabilityRules: [
      {
        id: "bounded-capability",
        description: "A short-lived synthetic capability.",
        actionIds: ["perform-operation"],
        resourceSelector: "selected-resource",
        purpose: "bounded-purpose",
        recipientConstraint: "named-recipient",
        validForSeconds: 300,
        maxDelegationDepth: 0,
        disclosurePolicyId: "minimal-result",
        revocable: true,
      },
    ],
    proofProfiles: [
      {
        id: "bounded-proof",
        circuitId: "generic-circuit-v1",
        publicOutputSchemaId: "bounded-result-v1",
      },
    ],
    executionAdapters: [],
    privacyInvariants: [
      {
        id: "no-global-principal-id",
        description: "No stable principal identifier crosses contexts.",
      },
    ],
  };
}

function makePolicy(
  first: ReviewerKeys,
  second: ReviewerKeys,
  overrides: Partial<NamespacePolicy> = {},
): NamespacePolicy {
  return {
    namespace: "lab.synthetic",
    impact: "high",
    reviewThreshold: 2,
    authors: [
      { principalId: "author.human", kind: "human" },
      { principalId: "author.agent", kind: "agent" },
    ],
    reviewers: [
      {
        principalId: "reviewer.alpha",
        kind: "human",
        publicKeyPem: first.publicKeyPem,
      },
      {
        principalId: "reviewer.beta",
        kind: "human",
        publicKeyPem: second.publicKeyPem,
      },
    ],
    governanceAuthorities: [
      { principalId: "governance.council", kind: "organization" },
    ],
    allocators: [
      { principalId: "allocator.service", kind: "service" },
    ],
    emergencyRevokers: [
      { principalId: "emergency.council", kind: "organization" },
    ],
    ...overrides,
  };
}

function expectGovernanceError(
  operation: () => unknown,
  code: GovernanceError["code"],
): void {
  assert.throws(
    operation,
    (error: unknown) =>
      error instanceof GovernanceError && error.code === code,
  );
}

function payload(
  target: TemplateTarget,
  reviewerId: string,
  reviewedAt: number,
  decision: "approve" | "reject" = "approve",
): ReviewerAttestationPayload {
  return {
    attestationVersion: REVIEWER_ATTESTATION_VERSION,
    ...target,
    reviewerId,
    decision,
    reviewedAt,
  };
}

function submitApproval(
  registry: ScenarioGovernanceRegistry,
  target: TemplateTarget,
  reviewerId: string,
  keys: ReviewerKeys,
  reviewedAt: number,
): ReviewerAttestation {
  const attestation = createReviewerAttestation(
    payload(target, reviewerId, reviewedAt),
    keys.privateKey,
  );
  registry.submitReview(attestation);
  return attestation;
}

function workflowToReview(
  registry: ScenarioGovernanceRegistry,
  authorId = "author.human",
): TemplateTarget {
  const draft = registry.createDraft(authorId, makeTemplate(), 100);
  registry.recordValidation(
    authorId,
    draft.target,
    {
      toolId: "synthetic-validator",
      toolVersion: "1.0.0",
      findings: [],
    },
    110,
  );
  registry.submitForReview(authorId, draft.target, 120);
  return draft.target;
}

function activeRegistry(): {
  readonly registry: ScenarioGovernanceRegistry;
  readonly target: TemplateTarget;
  readonly first: ReviewerKeys;
  readonly second: ReviewerKeys;
} {
  const first = reviewerKeys();
  const second = reviewerKeys();
  const registry = new ScenarioGovernanceRegistry([
    makePolicy(first, second),
  ]);
  const target = workflowToReview(registry);
  submitApproval(registry, target, "reviewer.alpha", first, 130);
  submitApproval(registry, target, "reviewer.beta", second, 131);
  registry.activate("governance.council", target, 140);
  return { registry, target, first, second };
}

describe("namespace governance", () => {
  it("requires separate explicit authority sets and a valid threshold", () => {
    const first = reviewerKeys();
    const second = reviewerKeys();
    const collapsed = makePolicy(first, second, {
      governanceAuthorities: [
        { principalId: "author.human", kind: "human" },
      ],
    });
    expectGovernanceError(
      () => new ScenarioGovernanceRegistry([collapsed]),
      "INVALID_POLICY",
    );
    expectGovernanceError(
      () =>
        new ScenarioGovernanceRegistry([
          makePolicy(first, second, { reviewThreshold: 3 }),
        ]),
      "INVALID_POLICY",
    );
    expectGovernanceError(
      () =>
        new ScenarioGovernanceRegistry([
          makePolicy(first, second, {
            reviewers: [
              {
                principalId: "reviewer.alpha",
                kind: "human",
                publicKeyPem: first.publicKeyPem,
              },
              {
                principalId: "reviewer.beta",
                kind: "human",
                publicKeyPem: first.publicKeyPem,
              },
            ],
          }),
        ]),
      "INVALID_POLICY",
    );
  });

  it("allows humans and Agents to draft but grants neither activation authority", () => {
    const first = reviewerKeys();
    const second = reviewerKeys();
    const humanRegistry = new ScenarioGovernanceRegistry([
      makePolicy(first, second),
    ]);
    const humanTarget = workflowToReview(humanRegistry);
    expectGovernanceError(
      () => humanRegistry.activate("author.human", humanTarget, 130),
      "UNAUTHORIZED",
    );

    const agentRegistry = new ScenarioGovernanceRegistry([
      makePolicy(first, second),
    ]);
    const agentTarget = workflowToReview(agentRegistry, "author.agent");
    assert.equal(agentRegistry.getTemplate(agentTarget).authorId, "author.agent");
    expectGovernanceError(
      () => agentRegistry.activate("author.agent", agentTarget, 130),
      "UNAUTHORIZED",
    );
  });

  it("rejects unauthorized authors and same-version content replacement", () => {
    const first = reviewerKeys();
    const second = reviewerKeys();
    const registry = new ScenarioGovernanceRegistry([
      makePolicy(first, second),
    ]);
    expectGovernanceError(
      () => registry.createDraft("outsider.actor", makeTemplate(), 100),
      "UNAUTHORIZED",
    );
    const draft = registry.createDraft("author.human", makeTemplate(), 100);
    expectGovernanceError(
      () =>
        registry.recordValidation(
          "author.agent",
          draft.target,
          { toolId: "validator", toolVersion: "1", findings: [] },
          101,
        ),
      "UNAUTHORIZED",
    );
    expectGovernanceError(
      () => registry.createDraft("reviewer.alpha", makeTemplate("1.0.1"), 101),
      "UNAUTHORIZED",
    );
    const changed = structuredClone(makeTemplate());
    (changed as { description: string }).description = "Changed content.";
    expectGovernanceError(
      () => registry.createDraft("author.human", changed, 101),
      "VERSION_CONFLICT",
    );
  });

  it("keeps author, governance, allocator, and emergency powers separate", () => {
    const first = reviewerKeys();
    const second = reviewerKeys();
    const registry = new ScenarioGovernanceRegistry([
      makePolicy(first, second),
    ]);
    const draft = registry.createDraft("author.human", makeTemplate(), 100);
    expectGovernanceError(
      () =>
        registry.recordValidation(
          "governance.council",
          draft.target,
          { toolId: "validator", toolVersion: "1", findings: [] },
          110,
        ),
      "UNAUTHORIZED",
    );
    registry.recordValidation(
      "author.human",
      draft.target,
      { toolId: "validator", toolVersion: "1", findings: [] },
      110,
    );
    expectGovernanceError(
      () =>
        registry.submitForReview(
          "emergency.council",
          draft.target,
          120,
        ),
      "UNAUTHORIZED",
    );

    const active = activeRegistry();
    expectGovernanceError(
      () =>
        active.registry.retire("allocator.service", active.target, 150),
      "UNAUTHORIZED",
    );
    expectGovernanceError(
      () =>
        active.registry.revoke(
          "governance.council",
          active.target,
          "Governance cannot exercise emergency authority.",
          150,
        ),
      "UNAUTHORIZED",
    );
  });
});

describe("lifecycle and validation boundary", () => {
  it("models every lifecycle stage and marks validation as non-trusting", () => {
    const first = reviewerKeys();
    const second = reviewerKeys();
    const registry = new ScenarioGovernanceRegistry([
      makePolicy(first, second),
    ]);
    const draft = registry.createDraft("author.human", makeTemplate(), 100);
    assert.equal(draft.state, "draft");
    const validated = registry.recordValidation(
      "author.human",
      draft.target,
      {
        toolId: "risk-analyzer",
        toolVersion: "2.0.0",
        findings: [
          {
            code: "manual-review-required",
            severity: "critical",
            message: "A reviewer must decide whether this risk is acceptable.",
          },
        ],
      },
      110,
    );
    assert.equal(validated.state, "validated");
    assert.equal(validated.validationReport?.grantsTrust, false);
    expectGovernanceError(
      () => registry.activate("governance.council", draft.target, 111),
      "INVALID_TRANSITION",
    );
    assert.equal(
      registry.submitForReview("author.human", draft.target, 120).state,
      "in_review",
    );
  });

  it("rejects invalid and out-of-order transitions", () => {
    const first = reviewerKeys();
    const second = reviewerKeys();
    const registry = new ScenarioGovernanceRegistry([
      makePolicy(first, second),
    ]);
    const draft = registry.createDraft("author.human", makeTemplate(), 100);
    expectGovernanceError(
      () => registry.submitForReview("author.human", draft.target, 110),
      "INVALID_TRANSITION",
    );
    expectGovernanceError(
      () =>
        registry.recordValidation(
          "author.human",
          draft.target,
          { toolId: "validator", toolVersion: "1", findings: [] },
          99,
        ),
      "INVALID_TIME",
    );
    expectGovernanceError(
      () => registry.retire("governance.council", draft.target, 110),
      "INVALID_TRANSITION",
    );
    expectGovernanceError(
      () => registry.revoke("emergency.council", draft.target, "risk", 110),
      "INVALID_TRANSITION",
    );
  });
});

describe("reviewer attestations and activation", () => {
  it("signs deterministically and binds namespace, ID, version, hash, and decision", () => {
    const keys = reviewerKeys();
    const target: TemplateTarget = {
      namespace: "lab.synthetic",
      templateId: "lab.synthetic/bounded-operation",
      templateVersion: "1.0.0",
      templateHash:
        "0x1111111111111111111111111111111111111111111111111111111111111111",
    };
    const original = createReviewerAttestation(
      payload(target, "reviewer.alpha", 130),
      keys.privateKey,
    );
    const repeated = createReviewerAttestation(
      payload(target, "reviewer.alpha", 130),
      keys.privateKey,
    );
    assert.equal(original.signature, repeated.signature);
    assert.equal(verifyReviewerAttestation(original, keys.publicKeyPem), true);

    for (const changedPayload of [
      { ...original.payload, namespace: "other.synthetic" },
      { ...original.payload, templateId: "lab.synthetic/other-operation" },
      { ...original.payload, templateVersion: "1.0.1" },
      {
        ...original.payload,
        templateHash:
          "0x2222222222222222222222222222222222222222222222222222222222222222" as const,
      },
      { ...original.payload, decision: "reject" as const },
    ]) {
      assert.equal(
        verifyReviewerAttestation(
          { ...original, payload: changedPayload },
          keys.publicKeyPem,
        ),
        false,
      );
    }
  });

  it("rejects altered targets, ineligible signers, and duplicate reviewers", () => {
    const first = reviewerKeys();
    const second = reviewerKeys();
    const outsider = reviewerKeys();
    const registry = new ScenarioGovernanceRegistry([
      makePolicy(first, second),
    ]);
    const target = workflowToReview(registry);
    const alteredHash = {
      ...target,
      templateHash:
        "0x2222222222222222222222222222222222222222222222222222222222222222" as const,
    };
    expectGovernanceError(
      () =>
        registry.submitReview(
          createReviewerAttestation(
            payload(alteredHash, "reviewer.alpha", 130),
            first.privateKey,
          ),
        ),
      "TARGET_MISMATCH",
    );
    expectGovernanceError(
      () =>
        registry.submitReview(
          createReviewerAttestation(
            payload(target, "reviewer.outsider", 130),
            outsider.privateKey,
          ),
        ),
      "INELIGIBLE_REVIEWER",
    );
    expectGovernanceError(
      () =>
        registry.submitReview(
          createReviewerAttestation(
            payload(target, "reviewer.alpha", 130),
            second.privateKey,
          ),
        ),
      "INVALID_ATTESTATION",
    );
    submitApproval(registry, target, "reviewer.alpha", first, 130);
    expectGovernanceError(
      () => submitApproval(registry, target, "reviewer.alpha", first, 131),
      "DUPLICATE_REVIEW",
    );
  });

  it("requires unique threshold approvals and a distinct governance actor", () => {
    const first = reviewerKeys();
    const second = reviewerKeys();
    const registry = new ScenarioGovernanceRegistry([
      makePolicy(first, second),
    ]);
    const target = workflowToReview(registry);
    submitApproval(registry, target, "reviewer.alpha", first, 130);
    expectGovernanceError(
      () => registry.activate("governance.council", target, 140),
      "THRESHOLD_NOT_MET",
    );
    submitApproval(registry, target, "reviewer.beta", second, 131);
    expectGovernanceError(
      () => registry.activate("reviewer.alpha", target, 140),
      "UNAUTHORIZED",
    );
    const activation = registry.activate("governance.council", target, 140);
    assert.deepEqual(activation.approvalReviewerIds, [
      "reviewer.alpha",
      "reviewer.beta",
    ]);
    assert.equal(registry.getTemplate(target).state, "active");
  });

  it("blocks activation after any eligible reviewer rejection", () => {
    const first = reviewerKeys();
    const second = reviewerKeys();
    const registry = new ScenarioGovernanceRegistry([
      makePolicy(first, second, { reviewThreshold: 1 }),
    ]);
    const target = workflowToReview(registry);
    submitApproval(registry, target, "reviewer.alpha", first, 130);
    registry.submitReview(
      createReviewerAttestation(
        payload(target, "reviewer.beta", 131, "reject"),
        second.privateKey,
      ),
    );
    expectGovernanceError(
      () => registry.activate("governance.council", target, 140),
      "REVIEW_REJECTED",
    );
  });
});

describe("immutable active versions and allocation", () => {
  it("allows only an allocator and only for an exact active version/hash", () => {
    const { registry, target } = activeRegistry();
    expectGovernanceError(
      () =>
        registry.authorizeInstantiation(
          "governance.council",
          target,
          "request.one",
          150,
        ),
      "UNAUTHORIZED",
    );
    const changedHash = {
      ...target,
      templateHash:
        "0x3333333333333333333333333333333333333333333333333333333333333333" as const,
    };
    expectGovernanceError(
      () =>
        registry.authorizeInstantiation(
          "allocator.service",
          changedHash,
          "request.one",
          150,
        ),
      "TARGET_MISMATCH",
    );
    const authorization = registry.authorizeInstantiation(
      "allocator.service",
      target,
      "request.one",
      150,
    );
    assert.equal(authorization.templateHash, target.templateHash);
    expectGovernanceError(
      () =>
        registry.authorizeInstantiation(
          "allocator.service",
          target,
          "request.one",
          151,
        ),
      "REQUEST_CONFLICT",
    );
  });

  it("rejects allocation before activation", () => {
    const first = reviewerKeys();
    const second = reviewerKeys();
    const registry = new ScenarioGovernanceRegistry([
      makePolicy(first, second),
    ]);
    const target = workflowToReview(registry);
    expectGovernanceError(
      () =>
        registry.authorizeInstantiation(
          "allocator.service",
          target,
          "request.before-activation",
          130,
        ),
      "NOT_ACTIVE",
    );
  });

  it("retirement blocks new instances without changing historical records", () => {
    const { registry, target } = activeRegistry();
    const historical = registry.authorizeInstantiation(
      "allocator.service",
      target,
      "request.before-retirement",
      150,
    );
    const activationBefore = registry.getActivationRecord(target);
    registry.retire("governance.council", target, 160);
    assert.equal(registry.getTemplate(target).state, "retired");
    expectGovernanceError(
      () =>
        registry.authorizeInstantiation(
          "allocator.service",
          target,
          "request.after-retirement",
          170,
        ),
      "RETIRED",
    );
    assert.deepEqual(registry.getActivationRecord(target), activationBefore);
    assert.deepEqual(
      registry.getInstantiationAuthorization("request.before-retirement"),
      historical,
    );
    assert.deepEqual(registry.listActiveVersions("lab.synthetic"), []);
  });

  it("revocation is prospective and preserves immutable activation history", () => {
    const { registry, target } = activeRegistry();
    const historical = registry.authorizeInstantiation(
      "allocator.service",
      target,
      "request.before-revocation",
      150,
    );
    const activationBefore = registry.getActivationRecord(target);
    const revocation = registry.revoke(
      "emergency.council",
      target,
      "A governance invariant may be compromised.",
      160,
    );
    assert.equal(revocation.behavior, "prospective");
    assert.equal(registry.getTemplate(target).state, "revoked");
    expectGovernanceError(
      () =>
        registry.authorizeInstantiation(
          "allocator.service",
          target,
          "request.after-revocation",
          170,
        ),
      "REVOKED",
    );
    assert.deepEqual(registry.getActivationRecord(target), activationBefore);
    assert.deepEqual(
      registry.getInstantiationAuthorization("request.before-revocation"),
      historical,
    );
  });

  it("does not permit backdated retirement or revocation", () => {
    const retired = activeRegistry();
    retired.registry.authorizeInstantiation(
      "allocator.service",
      retired.target,
      "request.future",
      200,
    );
    expectGovernanceError(
      () =>
        retired.registry.retire(
          "governance.council",
          retired.target,
          199,
        ),
      "INVALID_TIME",
    );

    const revoked = activeRegistry();
    revoked.registry.authorizeInstantiation(
      "allocator.service",
      revoked.target,
      "request.future-revocation",
      200,
    );
    expectGovernanceError(
      () =>
        revoked.registry.revoke(
          "emergency.council",
          revoked.target,
          "The termination must be prospective.",
          199,
        ),
      "INVALID_TIME",
    );
  });

  it("does not expose mutable registry records", () => {
    const { registry, target } = activeRegistry();
    const external = registry.getTemplate(target) as unknown as {
      state: string;
      reviews: unknown[];
    };
    external.state = "revoked";
    external.reviews.length = 0;
    assert.equal(registry.getTemplate(target).state, "active");
    assert.equal(registry.getTemplate(target).reviews.length, 2);
  });
});
