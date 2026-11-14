import {
  createHash,
  createPrivateKey,
  createPublicKey,
  type KeyObject,
} from "node:crypto";

import {
  ACTION_DENIAL_REASONS,
  ACTION_INTENT_VERSION,
  ContextAccountSystem,
  createSignedActionIntent,
  type ActionAuthorizationDecision,
  type ActionIntentPayload,
  type CapabilityScope,
  type SignedActionIntent,
} from "@permio/context-accounts";
import { hashScenarioTemplate } from "@permio/scenario-domain";
import {
  SCENARIO_GENERATOR_VERSION,
  frame,
  generateScenario,
  type ScenarioGeneratorInput,
} from "@permio/scenario-generator";
import {
  REVIEWER_ATTESTATION_VERSION,
  ScenarioGovernanceRegistry,
  createReviewerAttestation,
  type NamespacePolicy,
  type TemplateTarget,
} from "@permio/scenario-governance";

import {
  SCENARIO_PACK_FORMAT_VERSION,
  UPSTREAM_EXPECTATION_FORMAT_VERSION,
  type DisclosurePreview,
  type NegativeAuthorizationVector,
  type ScenarioPackDefinition,
  type ScenarioPackFixture,
  type ScenarioPackFlow,
  type ScenarioPackId,
  type UpstreamContractExpectationV1,
} from "./model.ts";
import { getScenarioPack } from "./templates.ts";

const FIXTURE_KEY_DOMAIN = "permio:m9:test-key:v1";
const ARCHITECTURE_COMMIT = "c50959c1b71125f6dfda447423e0dbbe047a04cd";
const ED25519_PKCS8_SEED_PREFIX = Buffer.from(
  "302e020100300506032b657004220420",
  "hex",
);

interface DeterministicKeys {
  readonly privateKey: KeyObject;
  readonly publicKeyPem: string;
}

interface RuntimeFixture {
  readonly system: ContextAccountSystem;
  readonly target: TemplateTarget;
  readonly sessionKeys: DeterministicKeys;
  readonly baseTime: number;
  readonly authorizedAt: number;
  readonly instanceExpiresAt: number;
  readonly sessionNotBefore: number;
  readonly sessionExpiresAt: number;
  readonly instanceId: string;
  readonly delegatorAccountId: string;
  readonly actorAccountId: string;
  readonly childGrantId: string;
  readonly sessionId: string;
  readonly scope: CapabilityScope;
  readonly privateValues: readonly { readonly path: string; readonly value: string }[];
}

function deterministicKeys(label: string): DeterministicKeys {
  const seed = createHash("sha256")
    .update(frame(FIXTURE_KEY_DOMAIN, label))
    .digest();
  const privateKey = createPrivateKey({
    key: Buffer.concat([ED25519_PKCS8_SEED_PREFIX, seed]),
    format: "der",
    type: "pkcs8",
  });
  const publicKey = createPublicKey(privateKey);
  return {
    privateKey,
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}

function shortHash(...parts: readonly string[]): string {
  return createHash("sha256").update(frame(...parts)).digest("hex").slice(0, 16);
}

function authorityId(pack: ScenarioPackDefinition, role: string): string {
  return `${role}.${pack.id}`;
}

export function createNamespacePolicy(pack: ScenarioPackDefinition): NamespacePolicy {
  const first = deterministicKeys(`${pack.id}:reviewer:alpha`);
  const second = deterministicKeys(`${pack.id}:reviewer:beta`);
  return {
    namespace: pack.template.namespace,
    impact: "high",
    reviewThreshold: 2,
    authors: [{ principalId: authorityId(pack, "author"), kind: "human" }],
    reviewers: [
      { principalId: authorityId(pack, "reviewer.alpha"), kind: "human", publicKeyPem: first.publicKeyPem },
      { principalId: authorityId(pack, "reviewer.beta"), kind: "human", publicKeyPem: second.publicKeyPem },
    ],
    governanceAuthorities: [{ principalId: authorityId(pack, "governance"), kind: "organization" }],
    allocators: [{ principalId: authorityId(pack, "allocator"), kind: "service" }],
    emergencyRevokers: [{ principalId: authorityId(pack, "emergency"), kind: "organization" }],
  };
}

function activateTemplate(
  pack: ScenarioPackDefinition,
  baseTime: number,
  requestId: string,
): { readonly registry: ScenarioGovernanceRegistry; readonly target: TemplateTarget } {
  const policy = createNamespacePolicy(pack);
  const registry = new ScenarioGovernanceRegistry([policy]);
  const target = registry.createDraft(authorityId(pack, "author"), pack.template, baseTime).target;
  registry.recordValidation(
    authorityId(pack, "author"),
    target,
    { toolId: "m9-pack-validator", toolVersion: "1.0.0", findings: [] },
    baseTime + 1,
  );
  registry.submitForReview(authorityId(pack, "author"), target, baseTime + 2);
  for (const [index, reviewer] of policy.reviewers.entries()) {
    registry.submitReview(
      createReviewerAttestation(
        {
          attestationVersion: REVIEWER_ATTESTATION_VERSION,
          ...target,
          reviewerId: reviewer.principalId,
          decision: "approve",
          reviewedAt: baseTime + 3 + index,
        },
        deterministicKeys(`${pack.id}:reviewer:${index === 0 ? "alpha" : "beta"}`).privateKey,
      ),
    );
  }
  registry.activate(authorityId(pack, "governance"), target, baseTime + 5);
  registry.authorizeInstantiation(
    authorityId(pack, "allocator"),
    target,
    requestId,
    baseTime + 6,
  );
  return { registry, target };
}

function exactScope(flow: ScenarioPackFlow): CapabilityScope {
  return {
    actions: [flow.actionId],
    resourceSelectors: [flow.resourceSelector],
    resources: [flow.resource],
    purposes: [flow.purpose],
    recipientKinds: [flow.recipientKind],
    recipients: [flow.recipient],
    disclosurePolicyIds: [flow.disclosurePolicyId],
  };
}

function createRuntime(
  pack: ScenarioPackDefinition,
  generatedInstanceId: string,
  seed: string,
  flow: ScenarioPackFlow,
): RuntimeFixture {
  const token = shortHash(pack.id, seed, flow.id);
  const baseTime = Date.parse(pack.generatorPolicyProfile.baseTimestamp);
  const requestId = `allocation.${token}`;
  const governance = activateTemplate(pack, baseTime, requestId);
  const system = new ContextAccountSystem(governance.registry);
  const instanceId = generatedInstanceId;
  const delegatorAccountId = `account.delegator.${token}`;
  const actorAccountId = `account.actor.${token}`;
  const rootGrantId = `grant.root.${token}`;
  const childGrantId = `grant.delegated.${token}`;
  const sessionId = `session.${token}`;
  const issuerId = `issuer.${token}`;
  const instanceExpiresAt = baseTime + 900_000;
  const grantNotBefore = baseTime + 10_000;
  const grantExpiresAt = baseTime + 700_000;
  const sessionNotBefore = baseTime + 20_000;
  const sessionExpiresAt = baseTime + 600_000;
  const authorizedAt = baseTime + 30_000;
  const delegatorKeys = deterministicKeys(`${pack.id}:${seed}:${flow.id}:delegator-account`);
  const actorKeys = deterministicKeys(`${pack.id}:${seed}:${flow.id}:actor-account`);
  const sessionKeys = deterministicKeys(`${pack.id}:${seed}:${flow.id}:session`);

  system.createScenarioInstance(
    {
      instanceId,
      instantiationRequestId: requestId,
      template: pack.template,
      expiresAt: instanceExpiresAt,
      capabilityIssuers: [{ principalId: issuerId, kind: "service" }],
    },
    baseTime + 7,
  );
  system.registerContextAccount(
    { accountId: delegatorAccountId, instanceId, contextId: flow.contextId, kind: "human", publicKeyPem: delegatorKeys.publicKeyPem },
    baseTime + 8,
  );
  system.registerContextAccount(
    { accountId: actorAccountId, instanceId, contextId: flow.contextId, kind: pack.id === "delegated-purchasing-agent" ? "agent" : "human", publicKeyPem: actorKeys.publicKeyPem },
    baseTime + 9,
  );
  const scope = exactScope(flow);
  const parentScope: CapabilityScope = {
    ...scope,
    resources: [flow.resource, `${flow.resource}.alternate`],
    recipients: [flow.recipient, `${flow.recipient}.alternate`],
  };
  const rule = pack.template.capabilityRules.find((candidate) => candidate.actionIds.includes(flow.actionId))!;
  system.issueRootCapability(
    issuerId,
    { grantId: rootGrantId, instanceId, contextId: flow.contextId, subjectAccountId: delegatorAccountId, scope: parentScope, notBefore: grantNotBefore, expiresAt: grantExpiresAt, maxDelegationDepth: rule.maxDelegationDepth },
    baseTime + 9,
  );
  system.delegateCapability(
    delegatorAccountId,
    rootGrantId,
    { grantId: childGrantId, subjectAccountId: actorAccountId, scope, notBefore: grantNotBefore, expiresAt: grantExpiresAt, maxDelegationDepth: rule.maxDelegationDepth },
    baseTime + 10_000,
  );
  system.issueSession(
    actorAccountId,
    childGrantId,
    { sessionId, publicKeyPem: sessionKeys.publicKeyPem, scope, notBefore: sessionNotBefore, expiresAt: sessionExpiresAt },
    baseTime + 15_000,
  );
  return {
    system,
    target: governance.target,
    sessionKeys,
    baseTime,
    authorizedAt,
    instanceExpiresAt,
    sessionNotBefore,
    sessionExpiresAt,
    instanceId,
    delegatorAccountId,
    actorAccountId,
    childGrantId,
    sessionId,
    scope,
    privateValues: [
      { path: "$.runtime.instanceId", value: instanceId },
      { path: "$.runtime.delegatorAccountId", value: delegatorAccountId },
      { path: "$.runtime.actorAccountId", value: actorAccountId },
      { path: "$.runtime.childGrantId", value: childGrantId },
      { path: "$.runtime.sessionId", value: sessionId },
      { path: "$.runtime.delegatorPublicKey", value: delegatorKeys.publicKeyPem },
      { path: "$.runtime.actorPublicKey", value: actorKeys.publicKeyPem },
      { path: "$.runtime.sessionPublicKey", value: sessionKeys.publicKeyPem },
    ],
  };
}

function intentPayload(
  runtime: RuntimeFixture,
  flow: ScenarioPackFlow,
  overrides: Partial<ActionIntentPayload> = {},
): ActionIntentPayload {
  return {
    intentVersion: ACTION_INTENT_VERSION,
    ...runtime.target,
    sessionId: runtime.sessionId,
    instanceId: runtime.instanceId,
    contextId: flow.contextId,
    actionId: flow.actionId,
    resourceSelector: flow.resourceSelector,
    resource: flow.resource,
    purpose: flow.purpose,
    recipientKind: flow.recipientKind,
    recipient: flow.recipient,
    disclosurePolicyId: flow.disclosurePolicyId,
    issuedAt: runtime.baseTime + 25_000,
    nonce: `nonce.${shortHash(runtime.instanceId, flow.id, "positive")}`,
    ...overrides,
  };
}

function signedIntent(
  runtime: RuntimeFixture,
  flow: ScenarioPackFlow,
  overrides: Partial<ActionIntentPayload> = {},
): SignedActionIntent {
  return createSignedActionIntent(intentPayload(runtime, flow, overrides), runtime.sessionKeys.privateKey);
}

function negativeVector(
  pack: ScenarioPackDefinition,
  instanceId: string,
  seed: string,
  flow: ScenarioPackFlow,
  id: string,
  constrainedDimension: string,
  expectedReason: NegativeAuthorizationVector["expectedReason"],
  operation: (runtime: RuntimeFixture) => ActionAuthorizationDecision,
): NegativeAuthorizationVector {
  const runtime = createRuntime(pack, instanceId, seed, flow);
  return { id, constrainedDimension, expectedReason, observed: operation(runtime) };
}

function createNegativeVectors(
  pack: ScenarioPackDefinition,
  instanceId: string,
  seed: string,
  flow: ScenarioPackFlow,
): readonly NegativeAuthorizationVector[] {
  const vector = (
    id: string,
    dimension: string,
    reason: NegativeAuthorizationVector["expectedReason"],
    operation: (runtime: RuntimeFixture) => ActionAuthorizationDecision,
  ) => negativeVector(pack, instanceId, seed, flow, id, dimension, reason, operation);
  const vectors = [
    vector("unknown-session", "session", "UNKNOWN_SESSION", (runtime) => runtime.system.authorizeAction(signedIntent(runtime, flow, { sessionId: "session.missing" }), runtime.authorizedAt)),
    vector("invalid-signature", "signature", "INVALID_SIGNATURE", (runtime) => {
      const valid = signedIntent(runtime, flow);
      return runtime.system.authorizeAction({ ...valid, payload: { ...valid.payload, actionId: "altered-action" } }, runtime.authorizedAt);
    }),
    vector("wrong-template", "template", "TEMPLATE_MISMATCH", (runtime) => runtime.system.authorizeAction(signedIntent(runtime, flow, { templateVersion: "9.9.9" }), runtime.authorizedAt)),
    vector("wrong-instance", "instance", "INSTANCE_MISMATCH", (runtime) => runtime.system.authorizeAction(signedIntent(runtime, flow, { instanceId: "instance.missing" }), runtime.authorizedAt)),
    vector("revoked-instance", "instance-revocation", "INSTANCE_REVOKED", (runtime) => { runtime.system.revokeInstance(authorityId(pack, "allocator"), runtime.instanceId, runtime.authorizedAt - 1); return runtime.system.authorizeAction(signedIntent(runtime, flow), runtime.authorizedAt); }),
    vector("expired-instance", "instance-validity", "INSTANCE_EXPIRED", (runtime) => runtime.system.authorizeAction(signedIntent(runtime, flow, { issuedAt: runtime.instanceExpiresAt - 1 }), runtime.instanceExpiresAt)),
    vector("wrong-context", "context", "CONTEXT_MISMATCH", (runtime) => runtime.system.authorizeAction(signedIntent(runtime, flow, { contextId: "context.missing" }), runtime.authorizedAt)),
    vector("revoked-account", "account-revocation", "ACCOUNT_REVOKED", (runtime) => { runtime.system.revokeAccount(runtime.actorAccountId, runtime.authorizedAt - 1); return runtime.system.authorizeAction(signedIntent(runtime, flow), runtime.authorizedAt); }),
    vector("revoked-grant", "grant-revocation", "GRANT_REVOKED", (runtime) => { runtime.system.revokeCapability(runtime.delegatorAccountId, runtime.childGrantId, runtime.authorizedAt - 1); return runtime.system.authorizeAction(signedIntent(runtime, flow), runtime.authorizedAt); }),
    vector("revoked-session", "session-revocation", "SESSION_REVOKED", (runtime) => { runtime.system.revokeSession(runtime.actorAccountId, runtime.sessionId, runtime.authorizedAt - 1); return runtime.system.authorizeAction(signedIntent(runtime, flow), runtime.authorizedAt); }),
    vector("not-yet-valid", "valid-after", "NOT_YET_VALID", (runtime) => runtime.system.authorizeAction(signedIntent(runtime, flow, { issuedAt: runtime.sessionNotBefore - 1 }), runtime.sessionNotBefore - 1)),
    vector("expired", "valid-before", "EXPIRED", (runtime) => runtime.system.authorizeAction(signedIntent(runtime, flow, { issuedAt: runtime.sessionExpiresAt - 1 }), runtime.sessionExpiresAt)),
    vector("wrong-action", "action", "ACTION_DENIED", (runtime) => runtime.system.authorizeAction(signedIntent(runtime, flow, { actionId: "action.missing" }), runtime.authorizedAt)),
    vector("wrong-state", "state", "STATE_DENIED", (runtime) => { runtime.system.authorizeAction(signedIntent(runtime, flow), runtime.authorizedAt); return runtime.system.authorizeAction(signedIntent(runtime, flow, { nonce: `nonce.${shortHash(runtime.instanceId, "state")}` }), runtime.authorizedAt + 1); }),
    vector("wrong-resource-selector", "resource-selector", "RESOURCE_DENIED", (runtime) => runtime.system.authorizeAction(signedIntent(runtime, flow, { resourceSelector: "resource-selector.missing" }), runtime.authorizedAt)),
    vector("wrong-resource", "resource", "RESOURCE_DENIED", (runtime) => runtime.system.authorizeAction(signedIntent(runtime, flow, { resource: "resource.missing" }), runtime.authorizedAt)),
    vector("wrong-purpose", "purpose", "PURPOSE_DENIED", (runtime) => runtime.system.authorizeAction(signedIntent(runtime, flow, { purpose: "purpose.missing" }), runtime.authorizedAt)),
    vector("wrong-recipient-kind", "recipient-kind", "RECIPIENT_DENIED", (runtime) => runtime.system.authorizeAction(signedIntent(runtime, flow, { recipientKind: "recipient-kind.missing" }), runtime.authorizedAt)),
    vector("wrong-recipient", "recipient", "RECIPIENT_DENIED", (runtime) => runtime.system.authorizeAction(signedIntent(runtime, flow, { recipient: "recipient.missing" }), runtime.authorizedAt)),
    vector("wrong-disclosure", "disclosure-policy", "DISCLOSURE_POLICY_DENIED", (runtime) => runtime.system.authorizeAction(signedIntent(runtime, flow, { disclosurePolicyId: "disclosure.missing" }), runtime.authorizedAt)),
    vector("replayed-intent", "nonce", "REPLAYED_INTENT", (runtime) => { const intent = signedIntent(runtime, flow); runtime.system.authorizeAction(intent, runtime.authorizedAt); return runtime.system.authorizeAction(intent, runtime.authorizedAt + 1); }),
  ] as const;
  const observedReasons = new Set(vectors.map(({ observed }) => observed.allowed ? null : observed.reason));
  for (const reason of ACTION_DENIAL_REASONS) {
    if (!observedReasons.has(reason)) throw new Error(`M9 negative-vector matrix omitted ${reason}`);
  }
  return vectors;
}

function disclosurePreview(
  pack: ScenarioPackDefinition,
  flow: ScenarioPackFlow,
  runtime: RuntimeFixture,
): DisclosurePreview {
  return {
    packId: pack.id,
    flowId: flow.id,
    recipientKind: flow.recipientKind,
    recipient: flow.recipient,
    purpose: flow.purpose,
    validAfter: runtime.sessionNotBefore,
    validBefore: runtime.sessionExpiresAt,
    disclosedClaims: flow.disclosedClaims,
    newlyCreatedLinkages: flow.newlyCreatedLinkages,
    remainsPrivate: flow.remainsPrivate,
  };
}

function upstreamExpectation(
  pack: ScenarioPackDefinition,
  flow: ScenarioPackFlow,
  target: TemplateTarget,
): UpstreamContractExpectationV1 {
  const action = pack.template.actions.find((candidate) => candidate.id === flow.actionId)!;
  return {
    formatVersion: UPSTREAM_EXPECTATION_FORMAT_VERSION,
    status: "contract-fixture",
    liveEvidence: false,
    architectureCommit: ARCHITECTURE_COMMIT,
    packId: pack.id,
    flowId: flow.id,
    templateTarget: target,
    m6: {
      authoritativeCodec: "pending-m6",
      proofProfileId: action.proofProfileId,
      requiredProofSemantics: flow.requiredProofSemantics,
      unsupportedProofResult: "UNSUPPORTED_PROOF_REQUIREMENT",
      requiredReceiptBindings: ["receiptVersion", "proofModuleId", "proofModuleVersion", "implementationHash", "templateContentHash", "instanceCommitment", "contextHash", "actionSchemaId", "purposeHash", "recipient", "validAfter", "validBefore", "scopedNullifier", "outputCommitment", "sourceNetwork", "sourceContract", "sourceTransaction", "sourceLedgerSequence"],
    },
    m7: {
      authoritativeEnvelope: "pending-m7",
      requiredTransportBindings: ["unchangedM6Receipt", "sourceEventIdentity", "gatewayKeyEpoch", "destinationChain", "destinationContract"],
    },
    m8: {
      authoritativeExecutionResult: "pending-m8",
      executionAdapterId: action.executionAdapterId!,
      requiredResultBindings: ["receiptId", "adapterId", "recipient", "purpose", "executionStatus", "transactionReference"],
    },
  };
}

export function createScenarioPackFixture(
  packId: ScenarioPackId,
  seed?: string,
  flowId?: string,
): ScenarioPackFixture {
  const definition = getScenarioPack(packId);
  const explicitSeed = seed ?? definition.seeds[0];
  if (!definition.seeds.includes(explicitSeed)) {
    throw new TypeError(`seed '${explicitSeed}' is not declared by ${packId}`);
  }
  const flow = definition.flows.find((candidate) => candidate.id === (flowId ?? definition.flows[0]!.id));
  if (flow === undefined) throw new TypeError(`unknown flow '${flowId}' for ${packId}`);
  const templateHash = hashScenarioTemplate(definition.template);
  const input: ScenarioGeneratorInput = {
    template: definition.template,
    templateHash,
    generatorVersion: SCENARIO_GENERATOR_VERSION,
    explicitSeed,
    policyProfile: definition.generatorPolicyProfile,
  };
  const generated = generateScenario(input);
  const runtime = createRuntime(definition, generated.privateInstance.instanceId, explicitSeed, flow);
  const positiveIntent = signedIntent(runtime, flow);
  const positiveDecision = runtime.system.authorizeAction(positiveIntent, runtime.authorizedAt);
  const negativeVectors = createNegativeVectors(definition, generated.privateInstance.instanceId, explicitSeed, flow);
  return {
    formatVersion: SCENARIO_PACK_FORMAT_VERSION,
    definition,
    input,
    generated,
    templateHash,
    namespacePolicy: createNamespacePolicy(definition),
    target: runtime.target,
    flow,
    positiveIntent,
    positiveDecision,
    negativeVectors,
    disclosurePreview: disclosurePreview(definition, flow, runtime),
    upstreamExpectation: upstreamExpectation(definition, flow, runtime.target),
    additionalPrivateValues: [
      ...runtime.privateValues,
      { path: "$.runtime.intentSignature", value: positiveIntent.signature },
      { path: "$.runtime.intentNonce", value: positiveIntent.payload.nonce },
    ],
  };
}
