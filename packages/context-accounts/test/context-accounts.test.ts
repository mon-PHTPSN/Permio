import assert from "node:assert/strict";
import { generateKeyPairSync, type KeyObject } from "node:crypto";
import { describe, it } from "node:test";

import type { ScenarioTemplate } from "@permio/scenario-domain";
import {
  REVIEWER_ATTESTATION_VERSION,
  ScenarioGovernanceRegistry,
  createReviewerAttestation,
  type NamespacePolicy,
  type TemplateTarget,
} from "@permio/scenario-governance";

import {
  ACTION_INTENT_VERSION,
  ContextAccountSystem,
  ContextAuthorizationError,
  createSignedActionIntent,
  type ActionDenialReason,
  type ActionIntentPayload,
  type CapabilityScope,
  type ContextPrincipalKind,
  type SignedActionIntent,
} from "../src/index.ts";

interface Keys {
  readonly privateKey: KeyObject;
  readonly publicKeyPem: string;
}

interface Fixture {
  readonly system: ContextAccountSystem;
  readonly target: TemplateTarget;
  readonly sessionKeys: Keys;
  readonly accountKeys: Keys;
  readonly scope: CapabilityScope;
}

function keys(): Keys {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    privateKey,
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}

function template(): ScenarioTemplate {
  return {
    schemaVersion: 1,
    namespace: "lab.synthetic",
    templateId: "lab.synthetic/scoped-operation",
    version: "1.0.0",
    displayName: "Scoped Operation",
    description: "An application-neutral context-account test template.",
    participantSlots: [
      {
        id: "operator",
        description: "The context-bound operator.",
        assignableBy: ["@instance-creator"],
      },
    ],
    contexts: [
      {
        id: "operation-context",
        description: "One isolated operational context.",
        allowedSlotIds: ["operator"],
        recordTypes: ["source-record"],
        claimTypes: ["operation-result"],
        recipientKinds: ["named-recipient"],
        purposes: ["bounded-purpose"],
      },
    ],
    states: ["ready", "completed"],
    initialState: "ready",
    actions: [
      {
        id: "perform-operation",
        description: "Perform one scoped operation.",
        contextId: "operation-context",
        actorSlotId: "operator",
        inputRecordTypes: ["source-record"],
        outputClaimTypes: ["operation-result"],
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
        description: "A bounded context capability.",
        actionIds: ["perform-operation"],
        resourceSelector: "selected-resource",
        purpose: "bounded-purpose",
        recipientConstraint: "named-recipient",
        validForSeconds: 900,
        maxDelegationDepth: 2,
        disclosurePolicyId: "minimal-result",
        revocable: true,
      },
    ],
    proofProfiles: [
      {
        id: "bounded-proof",
        circuitId: "generic-circuit-v1",
        publicOutputSchemaId: "operation-result-v1",
      },
    ],
    executionAdapters: [],
    privacyInvariants: [
      {
        id: "context-account-isolation",
        description: "Accounts and keys cannot cross context boundaries.",
      },
    ],
  };
}

function policy(first: Keys, second: Keys): NamespacePolicy {
  return {
    namespace: "lab.synthetic",
    impact: "high",
    reviewThreshold: 2,
    authors: [{ principalId: "author.human", kind: "human" }],
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
  };
}

function activeGovernance(): {
  readonly registry: ScenarioGovernanceRegistry;
  readonly target: TemplateTarget;
} {
  const first = keys();
  const second = keys();
  const registry = new ScenarioGovernanceRegistry([policy(first, second)]);
  const draft = registry.createDraft("author.human", template(), 10);
  registry.recordValidation(
    "author.human",
    draft.target,
    { toolId: "validator", toolVersion: "1.0.0", findings: [] },
    20,
  );
  registry.submitForReview("author.human", draft.target, 30);
  registry.submitReview(
    createReviewerAttestation(
      {
        attestationVersion: REVIEWER_ATTESTATION_VERSION,
        ...draft.target,
        reviewerId: "reviewer.alpha",
        decision: "approve",
        reviewedAt: 40,
      },
      first.privateKey,
    ),
  );
  registry.submitReview(
    createReviewerAttestation(
      {
        attestationVersion: REVIEWER_ATTESTATION_VERSION,
        ...draft.target,
        reviewerId: "reviewer.beta",
        decision: "approve",
        reviewedAt: 41,
      },
      second.privateKey,
    ),
  );
  registry.activate("governance.council", draft.target, 50);
  registry.authorizeInstantiation(
    "allocator.service",
    draft.target,
    "allocation.one",
    60,
  );
  return { registry, target: draft.target };
}

function fullScope(): CapabilityScope {
  return {
    actions: ["perform-operation"],
    resourceSelectors: ["selected-resource"],
    resources: ["resource.one", "resource.two"],
    purposes: ["bounded-purpose"],
    recipientKinds: ["named-recipient"],
    recipients: ["recipient.alpha", "recipient.beta"],
    disclosurePolicyIds: ["minimal-result"],
  };
}

function sessionScope(): CapabilityScope {
  return {
    ...fullScope(),
    resources: ["resource.one"],
    recipients: ["recipient.alpha"],
  };
}

function setup(options: {
  accountKind?: ContextPrincipalKind;
  issueSession?: boolean;
} = {}): Fixture {
  const governance = activeGovernance();
  const system = new ContextAccountSystem(governance.registry);
  system.createScenarioInstance(
    {
      instanceId: "instance.one",
      instantiationRequestId: "allocation.one",
      template: template(),
      expiresAt: 1_000,
      capabilityIssuers: [
        { principalId: "issuer.service", kind: "service" },
      ],
    },
    70,
  );
  const accountKeys = keys();
  system.registerContextAccount(
    {
      accountId: "account.one",
      instanceId: "instance.one",
      contextId: "operation-context",
      kind: options.accountKind ?? "human",
      publicKeyPem: accountKeys.publicKeyPem,
    },
    80,
  );
  const scope = fullScope();
  system.issueRootCapability(
    "issuer.service",
    {
      grantId: "grant.root",
      instanceId: "instance.one",
      contextId: "operation-context",
      subjectAccountId: "account.one",
      scope,
      notBefore: 100,
      expiresAt: 900,
      maxDelegationDepth: 2,
    },
    90,
  );
  const sessionKeys = keys();
  if (options.issueSession !== false) {
    system.issueSession(
      "account.one",
      "grant.root",
      {
        sessionId: "session.one",
        publicKeyPem: sessionKeys.publicKeyPem,
        scope: sessionScope(),
        notBefore: 120,
        expiresAt: 800,
      },
      110,
    );
  }
  return {
    system,
    target: governance.target,
    sessionKeys,
    accountKeys,
    scope,
  };
}

function intentPayload(
  target: TemplateTarget,
  overrides: Partial<ActionIntentPayload> = {},
): ActionIntentPayload {
  return {
    intentVersion: ACTION_INTENT_VERSION,
    ...target,
    sessionId: "session.one",
    instanceId: "instance.one",
    contextId: "operation-context",
    actionId: "perform-operation",
    resourceSelector: "selected-resource",
    resource: "resource.one",
    purpose: "bounded-purpose",
    recipientKind: "named-recipient",
    recipient: "recipient.alpha",
    disclosurePolicyId: "minimal-result",
    issuedAt: 125,
    nonce: "nonce.one",
    ...overrides,
  };
}

function signedIntent(
  fixture: Fixture,
  overrides: Partial<ActionIntentPayload> = {},
): SignedActionIntent {
  return createSignedActionIntent(
    intentPayload(fixture.target, overrides),
    fixture.sessionKeys.privateKey,
  );
}

function expectError(
  operation: () => unknown,
  code: ContextAuthorizationError["code"],
): void {
  assert.throws(
    operation,
    (error: unknown) =>
      error instanceof ContextAuthorizationError && error.code === code,
  );
}

function expectDenied(
  decision: ReturnType<ContextAccountSystem["authorizeAction"]>,
  reason: ActionDenialReason,
): void {
  assert.deepEqual(decision, { allowed: false, reason });
}

describe("M4 allocation and context-account boundaries", () => {
  it("creates an instance only from an active exact M4 allocation", () => {
    const governance = activeGovernance();
    const system = new ContextAccountSystem(governance.registry);
    expectError(
      () =>
        system.createScenarioInstance(
          {
            instanceId: "instance.unallocated",
            instantiationRequestId: "allocation.missing",
            template: template(),
            expiresAt: 1_000,
            capabilityIssuers: [
              { principalId: "issuer.service", kind: "service" },
            ],
          },
          70,
        ),
      "UNAUTHORIZED",
    );
    const altered = structuredClone(template());
    (altered as { description: string }).description = "Altered content.";
    expectError(
      () =>
        system.createScenarioInstance(
          {
            instanceId: "instance.bad",
            instantiationRequestId: "allocation.one",
            template: altered,
            expiresAt: 1_000,
            capabilityIssuers: [
              { principalId: "issuer.service", kind: "service" },
            ],
          },
          70,
        ),
      "TARGET_MISMATCH",
    );
    const instance = system.createScenarioInstance(
      {
        instanceId: "instance.one",
        instantiationRequestId: "allocation.one",
        template: template(),
        expiresAt: 1_000,
        capabilityIssuers: [
          { principalId: "issuer.service", kind: "service" },
        ],
      },
      70,
    );
    assert.equal(instance.templateHash, governance.target.templateHash);
    assert.equal(instance.state, "ready");
    expectError(
      () =>
        system.createScenarioInstance(
          {
            instanceId: "instance.two",
            instantiationRequestId: "allocation.one",
            template: template(),
            expiresAt: 1_000,
            capabilityIssuers: [
              { principalId: "issuer.service", kind: "service" },
            ],
          },
          71,
        ),
      "DUPLICATE_ID",
    );
  });

  it("does not consume an old allocation after template retirement", () => {
    const governance = activeGovernance();
    governance.registry.retire(
      "governance.council",
      governance.target,
      65,
    );
    const system = new ContextAccountSystem(governance.registry);
    expectError(
      () =>
        system.createScenarioInstance(
          {
            instanceId: "instance.retired",
            instantiationRequestId: "allocation.one",
            template: template(),
            expiresAt: 1_000,
            capabilityIssuers: [
              { principalId: "issuer.service", kind: "service" },
            ],
          },
          70,
        ),
      "UNAUTHORIZED",
    );
  });

  it("supports all principal kinds without assigning a global business role", () => {
    const governance = activeGovernance();
    const system = new ContextAccountSystem(governance.registry);
    system.createScenarioInstance(
      {
        instanceId: "instance.one",
        instantiationRequestId: "allocation.one",
        template: template(),
        expiresAt: 1_000,
        capabilityIssuers: [
          { principalId: "issuer.service", kind: "service" },
        ],
      },
      70,
    );
    const kinds: readonly ContextPrincipalKind[] = [
      "human",
      "service",
      "contract",
      "agent",
    ];
    for (const [index, kind] of kinds.entries()) {
      const account = system.registerContextAccount(
        {
          accountId: `account.${kind}`,
          instanceId: "instance.one",
          contextId: "operation-context",
          kind,
          publicKeyPem: keys().publicKeyPem,
        },
        80 + index,
      );
      assert.equal(account.kind, kind);
    }
    expectDenied(
      system.authorizeAction(
        createSignedActionIntent(
          intentPayload(governance.target, { sessionId: "session.missing" }),
          keys().privateKey,
        ),
        130,
      ),
      "UNKNOWN_SESSION",
    );
  });

  it("prevents context-account key reuse", () => {
    const fixture = setup();
    expectError(
      () =>
        fixture.system.registerContextAccount(
          {
            accountId: "account.two",
            instanceId: "instance.one",
            contextId: "operation-context",
            kind: "agent",
            publicKeyPem: fixture.accountKeys.publicKeyPem,
          },
          81,
        ),
      "INVALID_INPUT",
    );
  });
});

describe("capability attenuation and authority", () => {
  it("requires an explicit instance issuer and rejects unbounded delegation", () => {
    const fixture = setup({ accountKind: "agent", issueSession: false });
    expectError(
      () =>
        fixture.system.issueRootCapability(
          "account.one",
          {
            grantId: "grant.unauthorized",
            instanceId: "instance.one",
            contextId: "operation-context",
            subjectAccountId: "account.one",
            scope: fixture.scope,
            notBefore: 120,
            expiresAt: 800,
            maxDelegationDepth: 1,
          },
          110,
        ),
      "UNAUTHORIZED",
    );
    expectError(
      () =>
        fixture.system.issueRootCapability(
          "issuer.service",
          {
            grantId: "grant.unbounded",
            instanceId: "instance.one",
            contextId: "operation-context",
            subjectAccountId: "account.one",
            scope: fixture.scope,
            notBefore: 120,
            expiresAt: 800,
            maxDelegationDepth: Number.MAX_SAFE_INTEGER,
          },
          110,
        ),
      "INVALID_SCOPE",
    );
  });

  it("permits strict child attenuation and rejects every expansion", () => {
    const fixture = setup({ issueSession: false });
    const childKeys = keys();
    fixture.system.registerContextAccount(
      {
        accountId: "account.child",
        instanceId: "instance.one",
        contextId: "operation-context",
        kind: "agent",
        publicKeyPem: childKeys.publicKeyPem,
      },
      105,
    );
    const child = fixture.system.delegateCapability(
      "account.one",
      "grant.root",
      {
        grantId: "grant.child",
        subjectAccountId: "account.child",
        scope: sessionScope(),
        notBefore: 120,
        expiresAt: 700,
        maxDelegationDepth: 1,
      },
      110,
    );
    assert.equal(child.delegationDepth, 1);
    assert.deepEqual(child.scope.resources, ["resource.one"]);

    for (const [grantId, scope] of [
      ["grant.bad-resource", { ...sessionScope(), resources: ["resource.three"] }],
      [
        "grant.bad-selector",
        { ...sessionScope(), resourceSelectors: ["other-selector"] },
      ],
      ["grant.bad-purpose", { ...sessionScope(), purposes: ["other-purpose"] }],
      [
        "grant.bad-recipient-kind",
        { ...sessionScope(), recipientKinds: ["other-recipient-kind"] },
      ],
      ["grant.bad-recipient", { ...sessionScope(), recipients: ["recipient.other"] }],
      ["grant.bad-action", { ...sessionScope(), actions: ["other-action"] }],
      [
        "grant.bad-disclosure",
        { ...sessionScope(), disclosurePolicyIds: ["other-policy"] },
      ],
    ] as const) {
      expectError(
        () =>
          fixture.system.delegateCapability(
            "account.one",
            "grant.root",
            {
              grantId,
              subjectAccountId: "account.child",
              scope,
              notBefore: 120,
              expiresAt: 700,
              maxDelegationDepth: 1,
            },
            110,
          ),
        "ATTENUATION_VIOLATION",
      );
    }
    expectError(
      () =>
        fixture.system.delegateCapability(
          "account.one",
          "grant.root",
          {
            grantId: "grant.bad-time",
            subjectAccountId: "account.child",
            scope: sessionScope(),
            notBefore: 99,
            expiresAt: 901,
            maxDelegationDepth: 1,
          },
          110,
        ),
      "ATTENUATION_VIOLATION",
    );
    expectError(
      () =>
        fixture.system.delegateCapability(
          "account.one",
          "grant.root",
          {
            grantId: "grant.bad-depth",
            subjectAccountId: "account.child",
            scope: sessionScope(),
            notBefore: 120,
            expiresAt: 700,
            maxDelegationDepth: 3,
          },
          110,
        ),
      "ATTENUATION_VIOLATION",
    );
  });

  it("requires each session to be a fresh, strict subset of its grant", () => {
    const fixture = setup({ issueSession: false });
    expectError(
      () =>
        fixture.system.issueSession(
          "account.one",
          "grant.root",
          {
            sessionId: "session.account-key",
            publicKeyPem: fixture.accountKeys.publicKeyPem,
            scope: sessionScope(),
            notBefore: 120,
            expiresAt: 700,
          },
          110,
        ),
      "INVALID_INPUT",
    );
    expectError(
      () =>
        fixture.system.issueSession(
          "account.one",
          "grant.root",
          {
            sessionId: "session.expanded",
            publicKeyPem: keys().publicKeyPem,
            scope: { ...sessionScope(), resources: ["resource.other"] },
            notBefore: 120,
            expiresAt: 700,
          },
          110,
        ),
      "ATTENUATION_VIOLATION",
    );
    const session = fixture.system.issueSession(
      "account.one",
      "grant.root",
      {
        sessionId: "session.valid",
        publicKeyPem: fixture.sessionKeys.publicKeyPem,
        scope: sessionScope(),
        notBefore: 120,
        expiresAt: 700,
      },
      110,
    );
    assert.deepEqual(session.scope.resources, ["resource.one"]);
    assert.equal(session.expiresAt, 700);
  });

  it("enforces delegation depth and propagates ancestor revocation", () => {
    const fixture = setup({ issueSession: false });
    fixture.system.registerContextAccount(
      {
        accountId: "account.child",
        instanceId: "instance.one",
        contextId: "operation-context",
        kind: "agent",
        publicKeyPem: keys().publicKeyPem,
      },
      105,
    );
    fixture.system.delegateCapability(
      "account.one",
      "grant.root",
      {
        grantId: "grant.child",
        subjectAccountId: "account.child",
        scope: sessionScope(),
        notBefore: 120,
        expiresAt: 700,
        maxDelegationDepth: 1,
      },
      110,
    );
    expectError(
      () =>
        fixture.system.delegateCapability(
          "account.child",
          "grant.child",
          {
            grantId: "grant.grandchild",
            subjectAccountId: "account.one",
            scope: sessionScope(),
            notBefore: 130,
            expiresAt: 600,
            maxDelegationDepth: 1,
          },
          120,
        ),
      "DELEGATION_DEPTH_EXCEEDED",
    );
    const childSession = keys();
    fixture.system.issueSession(
      "account.child",
      "grant.child",
      {
        sessionId: "session.child",
        publicKeyPem: childSession.publicKeyPem,
        scope: sessionScope(),
        notBefore: 130,
        expiresAt: 600,
      },
      120,
    );
    fixture.system.revokeCapability("issuer.service", "grant.root", 140);
    expectError(
      () =>
        fixture.system.issueSession(
          "account.child",
          "grant.child",
          {
            sessionId: "session.after-revocation",
            publicKeyPem: keys().publicKeyPem,
            scope: sessionScope(),
            notBefore: 150,
            expiresAt: 500,
          },
          145,
        ),
      "REVOKED",
    );
    const childIntent = createSignedActionIntent(
      intentPayload(fixture.target, {
        sessionId: "session.child",
        issuedAt: 145,
      }),
      childSession.privateKey,
    );
    expectDenied(
      fixture.system.authorizeAction(childIntent, 150),
      "GRANT_REVOKED",
    );
  });
});

describe("signed action authorization", () => {
  it("authorizes the exact declared subset and advances instance state", () => {
    const fixture = setup();
    const decision = fixture.system.authorizeAction(signedIntent(fixture), 130);
    assert.deepEqual(decision, {
      allowed: true,
      instanceId: "instance.one",
      accountId: "account.one",
      grantId: "grant.root",
      sessionId: "session.one",
      actionId: "perform-operation",
      previousState: "ready",
      nextState: "completed",
      authorizedAt: 130,
    });
    assert.equal(fixture.system.getScenarioInstance("instance.one").state, "completed");
  });

  it("binds signatures to every action-intent field", () => {
    const fixture = setup();
    const original = signedIntent(fixture);
    const altered = {
      ...original,
      payload: { ...original.payload, purpose: "other-purpose" },
    };
    expectDenied(
      fixture.system.authorizeAction(altered, 130),
      "INVALID_SIGNATURE",
    );
  });

  it("returns a precise denial when one constrained dimension changes", () => {
    const cases: readonly [
      Partial<ActionIntentPayload>,
      ActionDenialReason,
    ][] = [
      [
        {
          templateHash:
            "0x1111111111111111111111111111111111111111111111111111111111111111",
        },
        "TEMPLATE_MISMATCH",
      ],
      [{ instanceId: "instance.other" }, "INSTANCE_MISMATCH"],
      [{ contextId: "other-context" }, "CONTEXT_MISMATCH"],
      [{ actionId: "other-action" }, "ACTION_DENIED"],
      [{ resourceSelector: "other-selector" }, "RESOURCE_DENIED"],
      [{ resource: "resource.two" }, "RESOURCE_DENIED"],
      [{ purpose: "other-purpose" }, "PURPOSE_DENIED"],
      [{ recipientKind: "other-recipient-kind" }, "RECIPIENT_DENIED"],
      [{ recipient: "recipient.beta" }, "RECIPIENT_DENIED"],
      [
        { disclosurePolicyId: "other-disclosure-policy" },
        "DISCLOSURE_POLICY_DENIED",
      ],
    ];
    for (const [overrides, expected] of cases) {
      const fixture = setup();
      expectDenied(
        fixture.system.authorizeAction(
          signedIntent(fixture, overrides),
          130,
        ),
        expected,
      );
    }
  });

  it("checks session time, current state, and per-session replay", () => {
    const early = setup();
    expectDenied(
      early.system.authorizeAction(
        signedIntent(early, { issuedAt: 115 }),
        119,
      ),
      "NOT_YET_VALID",
    );
    const expired = setup();
    expectDenied(
      expired.system.authorizeAction(
        signedIntent(expired, { issuedAt: 799 }),
        800,
      ),
      "EXPIRED",
    );
    const instanceExpired = setup();
    expectDenied(
      instanceExpired.system.authorizeAction(
        signedIntent(instanceExpired, { issuedAt: 999 }),
        1_000,
      ),
      "INSTANCE_EXPIRED",
    );
    const replay = setup();
    const first = signedIntent(replay);
    assert.equal(replay.system.authorizeAction(first, 130).allowed, true);
    expectDenied(
      replay.system.authorizeAction(first, 131),
      "REPLAYED_INTENT",
    );
    expectDenied(
      replay.system.authorizeAction(
        signedIntent(replay, { nonce: "nonce.two", issuedAt: 131 }),
        131,
      ),
      "STATE_DENIED",
    );
  });

  it("reports each revocation boundary without rewriting history", () => {
    const account = setup();
    account.system.revokeAccount("account.one", 130);
    expectDenied(
      account.system.authorizeAction(
        signedIntent(account, { issuedAt: 131 }),
        131,
      ),
      "ACCOUNT_REVOKED",
    );

    const grant = setup();
    grant.system.revokeCapability("issuer.service", "grant.root", 130);
    expectDenied(
      grant.system.authorizeAction(
        signedIntent(grant, { issuedAt: 131 }),
        131,
      ),
      "GRANT_REVOKED",
    );

    const session = setup();
    session.system.revokeSession("account.one", "session.one", 130);
    expectDenied(
      session.system.authorizeAction(
        signedIntent(session, { issuedAt: 131 }),
        131,
      ),
      "SESSION_REVOKED",
    );

    const instance = setup();
    instance.system.revokeInstance("allocator.service", "instance.one", 130);
    expectDenied(
      instance.system.authorizeAction(
        signedIntent(instance, { issuedAt: 131 }),
        131,
      ),
      "INSTANCE_REVOKED",
    );
    assert.equal(
      instance.system.getSessionGrant("session.one").revokedAt,
      null,
    );
  });
});
