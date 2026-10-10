import { createPublicKey } from "node:crypto";

import {
  hashScenarioTemplate,
  parseScenarioTemplate,
  type ScenarioTemplate,
} from "@permio/scenario-domain";
import type {
  InstantiationAuthorization,
  ScenarioGovernanceRegistry,
  TemplateRecord,
  TemplateTarget,
} from "@permio/scenario-governance";

import { verifySignedActionIntent } from "./action-intent.ts";
import { ContextAuthorizationError } from "./errors.ts";
import type {
  ActionAuthorizationDecision,
  CapabilityGrant,
  CapabilityScope,
  ContextAccount,
  ContextAuthorityPrincipal,
  ContextPrincipalKind,
  DelegatedCapabilityInput,
  RootCapabilityInput,
  ScenarioInstance,
  SessionGrant,
  SessionGrantInput,
  SignedActionIntent,
} from "./model.ts";

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9]*(?:[._:@/-][a-z0-9]+)*$/;
const MAX_DELEGATION_DEPTH = 16;

interface GovernanceSource {
  getInstantiationAuthorization(
    requestId: string,
  ): InstantiationAuthorization | null;
  getTemplate(target: TemplateTarget): TemplateRecord;
}

interface MutableInstance {
  readonly target: TemplateTarget;
  readonly template: ScenarioTemplate;
  readonly instanceId: string;
  readonly instantiationRequestId: string;
  readonly allocatedBy: string;
  state: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  revokedAt: number | null;
  readonly capabilityIssuers: readonly ContextAuthorityPrincipal[];
}

interface MutableAccount extends Omit<ContextAccount, "revokedAt"> {
  revokedAt: number | null;
}

interface MutableGrant extends Omit<CapabilityGrant, "revokedAt"> {
  revokedAt: number | null;
}

interface MutableSession extends Omit<SessionGrant, "revokedAt"> {
  revokedAt: number | null;
}

export interface CreateScenarioInstanceInput {
  readonly instanceId: string;
  readonly instantiationRequestId: string;
  readonly template: unknown;
  readonly expiresAt: number;
  readonly capabilityIssuers: readonly ContextAuthorityPrincipal[];
}

export interface RegisterContextAccountInput {
  readonly accountId: string;
  readonly instanceId: string;
  readonly contextId: string;
  readonly kind: ContextPrincipalKind;
  readonly publicKeyPem: string;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function assertIdentifier(value: string, label: string): void {
  if (typeof value !== "string" || !IDENTIFIER_PATTERN.test(value)) {
    throw new ContextAuthorizationError(
      "INVALID_INPUT",
      `${label} must be a lowercase protocol identifier`,
    );
  }
}

function assertTime(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ContextAuthorizationError(
      "INVALID_TIME",
      `${label} must be a non-negative safe integer`,
    );
  }
}

function assertPrincipalKind(kind: ContextPrincipalKind): void {
  if (
    kind !== "human" &&
    kind !== "service" &&
    kind !== "contract" &&
    kind !== "agent"
  ) {
    throw new ContextAuthorizationError(
      "INVALID_INPUT",
      "principal kind must be human, service, contract, or agent",
    );
  }
}

function publicKeyFingerprint(publicKeyPem: string): string {
  try {
    const key = createPublicKey(publicKeyPem);
    if (key.asymmetricKeyType !== "ed25519") {
      throw new Error("not Ed25519");
    }
    return key.export({ type: "spki", format: "der" }).toString("base64");
  } catch {
    throw new ContextAuthorizationError(
      "INVALID_INPUT",
      "context and session accounts require a valid Ed25519 public key",
    );
  }
}

function uniqueIdentifiers(
  values: readonly string[],
  label: string,
  allowEmpty = false,
): readonly string[] {
  if (!Array.isArray(values) || (!allowEmpty && values.length === 0)) {
    throw new ContextAuthorizationError(
      "INVALID_SCOPE",
      `${label} must be ${allowEmpty ? "an" : "a non-empty"} array`,
    );
  }
  const result = new Set<string>();
  for (const value of values) {
    assertIdentifier(value, label);
    if (result.has(value)) {
      throw new ContextAuthorizationError(
        "INVALID_SCOPE",
        `${label} contains duplicate '${value}'`,
      );
    }
    result.add(value);
  }
  return [...result].sort();
}

function normalizeScope(scope: CapabilityScope): CapabilityScope {
  return {
    actions: uniqueIdentifiers(scope.actions, "actions"),
    resourceSelectors: uniqueIdentifiers(
      scope.resourceSelectors,
      "resourceSelectors",
    ),
    resources: uniqueIdentifiers(scope.resources, "resources"),
    purposes: uniqueIdentifiers(scope.purposes, "purposes"),
    recipientKinds: uniqueIdentifiers(scope.recipientKinds, "recipientKinds"),
    recipients: uniqueIdentifiers(scope.recipients, "recipients"),
    disclosurePolicyIds: uniqueIdentifiers(
      scope.disclosurePolicyIds,
      "disclosurePolicyIds",
    ),
  };
}

function isSubset(child: readonly string[], parent: readonly string[]): boolean {
  const allowed = new Set(parent);
  return child.every((value) => allowed.has(value));
}

function scopeIsSubset(child: CapabilityScope, parent: CapabilityScope): boolean {
  return (
    isSubset(child.actions, parent.actions) &&
    isSubset(child.resourceSelectors, parent.resourceSelectors) &&
    isSubset(child.resources, parent.resources) &&
    isSubset(child.purposes, parent.purposes) &&
    isSubset(child.recipientKinds, parent.recipientKinds) &&
    isSubset(child.recipients, parent.recipients) &&
    isSubset(child.disclosurePolicyIds, parent.disclosurePolicyIds)
  );
}

function scopeIsStrictSubset(
  child: CapabilityScope,
  parent: CapabilityScope,
): boolean {
  return (
    scopeIsSubset(child, parent) &&
    (child.actions.length < parent.actions.length ||
      child.resourceSelectors.length < parent.resourceSelectors.length ||
      child.resources.length < parent.resources.length ||
      child.purposes.length < parent.purposes.length ||
      child.recipientKinds.length < parent.recipientKinds.length ||
      child.recipients.length < parent.recipients.length ||
      child.disclosurePolicyIds.length < parent.disclosurePolicyIds.length)
  );
}

function sameTarget(left: TemplateTarget, right: TemplateTarget): boolean {
  return (
    left.namespace === right.namespace &&
    left.templateId === right.templateId &&
    left.templateVersion === right.templateVersion &&
    left.templateHash === right.templateHash
  );
}

function publicInstance(instance: MutableInstance): ScenarioInstance {
  return clone({
    ...instance.target,
    instanceId: instance.instanceId,
    instantiationRequestId: instance.instantiationRequestId,
    allocatedBy: instance.allocatedBy,
    state: instance.state,
    createdAt: instance.createdAt,
    expiresAt: instance.expiresAt,
    revokedAt: instance.revokedAt,
    capabilityIssuers: instance.capabilityIssuers,
  });
}

export class ContextAccountSystem {
  readonly #governance: GovernanceSource;
  readonly #instances = new Map<string, MutableInstance>();
  readonly #usedInstantiationRequests = new Set<string>();
  readonly #accounts = new Map<string, MutableAccount>();
  readonly #accountKeyFingerprints = new Set<string>();
  readonly #grants = new Map<string, MutableGrant>();
  readonly #sessions = new Map<string, MutableSession>();
  readonly #sessionKeyFingerprints = new Set<string>();
  readonly #usedIntentNonces = new Set<string>();

  constructor(
    governance: Pick<
      ScenarioGovernanceRegistry,
      "getInstantiationAuthorization" | "getTemplate"
    >,
  ) {
    this.#governance = governance;
  }

  createScenarioInstance(
    input: CreateScenarioInstanceInput,
    createdAt: number,
  ): ScenarioInstance {
    assertTime(createdAt, "createdAt");
    assertTime(input.expiresAt, "expiresAt");
    assertIdentifier(input.instanceId, "instanceId");
    assertIdentifier(input.instantiationRequestId, "instantiationRequestId");
    if (this.#instances.has(input.instanceId)) {
      throw new ContextAuthorizationError(
        "DUPLICATE_ID",
        `instanceId '${input.instanceId}' already exists`,
      );
    }
    if (this.#usedInstantiationRequests.has(input.instantiationRequestId)) {
      throw new ContextAuthorizationError(
        "DUPLICATE_ID",
        `instantiation request '${input.instantiationRequestId}' was already consumed`,
      );
    }
    const authorization = this.#governance.getInstantiationAuthorization(
      input.instantiationRequestId,
    );
    if (authorization === null) {
      throw new ContextAuthorizationError(
        "UNAUTHORIZED",
        "scenario instances require an M4 instantiation authorization",
      );
    }
    const governanceRecord = this.#governance.getTemplate(authorization);
    if (governanceRecord.state !== "active") {
      throw new ContextAuthorizationError(
        "UNAUTHORIZED",
        `template is '${governanceRecord.state}', not active`,
      );
    }
    const template = parseScenarioTemplate(input.template);
    const target: TemplateTarget = {
      namespace: template.namespace,
      templateId: template.templateId,
      templateVersion: template.version,
      templateHash: hashScenarioTemplate(template).value,
    };
    if (!sameTarget(target, authorization)) {
      throw new ContextAuthorizationError(
        "TARGET_MISMATCH",
        "template does not match the exact M4-authorized version and hash",
      );
    }
    if (
      createdAt < authorization.authorizedAt ||
      input.expiresAt <= createdAt
    ) {
      throw new ContextAuthorizationError(
        "INVALID_TIME",
        "instance lifetime must begin after allocation and end after creation",
      );
    }
    if (
      !Array.isArray(input.capabilityIssuers) ||
      input.capabilityIssuers.length === 0
    ) {
      throw new ContextAuthorizationError(
        "INVALID_INPUT",
        "an instance requires at least one explicitly scoped capability issuer",
      );
    }
    const issuerIds = new Set<string>();
    for (const issuer of input.capabilityIssuers) {
      assertIdentifier(issuer.principalId, "capability issuer principalId");
      assertPrincipalKind(issuer.kind);
      if (issuerIds.has(issuer.principalId)) {
        throw new ContextAuthorizationError(
          "DUPLICATE_ID",
          `duplicate capability issuer '${issuer.principalId}'`,
        );
      }
      issuerIds.add(issuer.principalId);
    }
    const instance: MutableInstance = {
      target,
      template,
      instanceId: input.instanceId,
      instantiationRequestId: input.instantiationRequestId,
      allocatedBy: authorization.allocatorId,
      state: template.initialState,
      createdAt,
      expiresAt: input.expiresAt,
      revokedAt: null,
      capabilityIssuers: clone(input.capabilityIssuers),
    };
    this.#instances.set(instance.instanceId, instance);
    this.#usedInstantiationRequests.add(input.instantiationRequestId);
    return publicInstance(instance);
  }

  registerContextAccount(
    input: RegisterContextAccountInput,
    registeredAt: number,
  ): ContextAccount {
    assertTime(registeredAt, "registeredAt");
    assertIdentifier(input.accountId, "accountId");
    assertIdentifier(input.instanceId, "instanceId");
    assertIdentifier(input.contextId, "contextId");
    assertPrincipalKind(input.kind);
    if (this.#accounts.has(input.accountId)) {
      throw new ContextAuthorizationError(
        "DUPLICATE_ID",
        `accountId '${input.accountId}' already exists`,
      );
    }
    const instance = this.#activeInstance(input.instanceId, registeredAt);
    this.#context(instance, input.contextId);
    const fingerprint = publicKeyFingerprint(input.publicKeyPem);
    if (
      this.#accountKeyFingerprints.has(fingerprint) ||
      this.#sessionKeyFingerprints.has(fingerprint)
    ) {
      throw new ContextAuthorizationError(
        "INVALID_INPUT",
        "a context-account key cannot be reused across accounts or contexts",
      );
    }
    const account: MutableAccount = {
      ...clone(input),
      registeredAt,
      revokedAt: null,
    };
    this.#accounts.set(account.accountId, account);
    this.#accountKeyFingerprints.add(fingerprint);
    return clone(account);
  }

  issueRootCapability(
    issuerId: string,
    input: RootCapabilityInput,
    issuedAt: number,
  ): CapabilityGrant {
    assertTime(issuedAt, "issuedAt");
    assertIdentifier(issuerId, "issuerId");
    this.#assertNewGrantId(input.grantId);
    const instance = this.#activeInstance(input.instanceId, issuedAt);
    if (
      !instance.capabilityIssuers.some(
        (issuer) => issuer.principalId === issuerId,
      )
    ) {
      throw new ContextAuthorizationError(
        "UNAUTHORIZED",
        `principal '${issuerId}' is not a capability issuer for this instance`,
      );
    }
    const account = this.#activeAccount(input.subjectAccountId, issuedAt);
    this.#assertAccountScope(account, input.instanceId, input.contextId);
    this.#context(instance, input.contextId);
    const scope = normalizeScope(input.scope);
    this.#validateScopeAgainstTemplate(instance, input.contextId, scope);
    this.#assertGrantWindow(
      issuedAt,
      input.notBefore,
      input.expiresAt,
      instance.expiresAt,
    );
    this.#assertDelegationLimit(input.maxDelegationDepth);
    const grant: MutableGrant = {
      ...instance.target,
      grantId: input.grantId,
      parentGrantId: null,
      instanceId: input.instanceId,
      contextId: input.contextId,
      subjectAccountId: input.subjectAccountId,
      issuerRef: issuerId,
      scope,
      notBefore: input.notBefore,
      expiresAt: input.expiresAt,
      delegationDepth: 0,
      maxDelegationDepth: input.maxDelegationDepth,
      issuedAt,
      revokedAt: null,
    };
    this.#grants.set(grant.grantId, grant);
    return clone(grant);
  }

  delegateCapability(
    delegatorAccountId: string,
    parentGrantId: string,
    input: DelegatedCapabilityInput,
    issuedAt: number,
  ): CapabilityGrant {
    assertTime(issuedAt, "issuedAt");
    assertIdentifier(delegatorAccountId, "delegatorAccountId");
    this.#assertNewGrantId(input.grantId);
    const parent = this.#activeGrant(parentGrantId, issuedAt);
    if (parent.subjectAccountId !== delegatorAccountId) {
      throw new ContextAuthorizationError(
        "UNAUTHORIZED",
        "only the current grant holder may delegate it",
      );
    }
    if (parent.delegationDepth >= parent.maxDelegationDepth) {
      throw new ContextAuthorizationError(
        "DELEGATION_DEPTH_EXCEEDED",
        "parent capability has no remaining delegation depth",
      );
    }
    const account = this.#activeAccount(input.subjectAccountId, issuedAt);
    this.#assertAccountScope(account, parent.instanceId, parent.contextId);
    const scope = normalizeScope(input.scope);
    const timeStrictlyNarrower =
      input.notBefore > parent.notBefore || input.expiresAt < parent.expiresAt;
    if (
      !scopeIsSubset(scope, parent.scope) ||
      (!scopeIsStrictSubset(scope, parent.scope) && !timeStrictlyNarrower)
    ) {
      throw new ContextAuthorizationError(
        "ATTENUATION_VIOLATION",
        "a delegated capability must be a strict subset of its parent",
      );
    }
    if (
      input.notBefore < parent.notBefore ||
      input.expiresAt > parent.expiresAt ||
      input.notBefore < issuedAt ||
      input.expiresAt <= input.notBefore
    ) {
      throw new ContextAuthorizationError(
        "ATTENUATION_VIOLATION",
        "delegated time bounds must be contained by the parent",
      );
    }
    this.#assertDelegationLimit(input.maxDelegationDepth);
    if (input.maxDelegationDepth > parent.maxDelegationDepth) {
      throw new ContextAuthorizationError(
        "ATTENUATION_VIOLATION",
        "a child cannot increase the parent's maximum delegation depth",
      );
    }
    const grant: MutableGrant = {
      namespace: parent.namespace,
      templateId: parent.templateId,
      templateVersion: parent.templateVersion,
      templateHash: parent.templateHash,
      grantId: input.grantId,
      parentGrantId,
      instanceId: parent.instanceId,
      contextId: parent.contextId,
      subjectAccountId: input.subjectAccountId,
      issuerRef: delegatorAccountId,
      scope,
      notBefore: input.notBefore,
      expiresAt: input.expiresAt,
      delegationDepth: parent.delegationDepth + 1,
      maxDelegationDepth: input.maxDelegationDepth,
      issuedAt,
      revokedAt: null,
    };
    this.#grants.set(grant.grantId, grant);
    return clone(grant);
  }

  issueSession(
    accountId: string,
    capabilityGrantId: string,
    input: SessionGrantInput,
    issuedAt: number,
  ): SessionGrant {
    assertTime(issuedAt, "issuedAt");
    assertIdentifier(accountId, "accountId");
    assertIdentifier(input.sessionId, "sessionId");
    if (this.#sessions.has(input.sessionId)) {
      throw new ContextAuthorizationError(
        "DUPLICATE_ID",
        `sessionId '${input.sessionId}' already exists`,
      );
    }
    const grant = this.#activeGrant(capabilityGrantId, issuedAt);
    if (grant.subjectAccountId !== accountId) {
      throw new ContextAuthorizationError(
        "UNAUTHORIZED",
        "only the capability holder may issue a session key",
      );
    }
    this.#activeAccount(accountId, issuedAt);
    const scope = normalizeScope(input.scope);
    const timeStrictlyNarrower =
      input.notBefore > grant.notBefore || input.expiresAt < grant.expiresAt;
    if (
      !scopeIsSubset(scope, grant.scope) ||
      (!scopeIsStrictSubset(scope, grant.scope) && !timeStrictlyNarrower)
    ) {
      throw new ContextAuthorizationError(
        "ATTENUATION_VIOLATION",
        "a session must be a strict subset of its capability grant",
      );
    }
    if (
      input.notBefore < grant.notBefore ||
      input.expiresAt > grant.expiresAt ||
      input.notBefore < issuedAt ||
      input.expiresAt <= input.notBefore
    ) {
      throw new ContextAuthorizationError(
        "ATTENUATION_VIOLATION",
        "session time bounds must be contained by the capability grant",
      );
    }
    const fingerprint = publicKeyFingerprint(input.publicKeyPem);
    if (
      this.#sessionKeyFingerprints.has(fingerprint) ||
      this.#accountKeyFingerprints.has(fingerprint)
    ) {
      throw new ContextAuthorizationError(
        "INVALID_INPUT",
        "a session public key must be fresh and distinct from account keys",
      );
    }
    const session: MutableSession = {
      namespace: grant.namespace,
      templateId: grant.templateId,
      templateVersion: grant.templateVersion,
      templateHash: grant.templateHash,
      sessionId: input.sessionId,
      capabilityGrantId,
      instanceId: grant.instanceId,
      contextId: grant.contextId,
      subjectAccountId: accountId,
      publicKeyPem: input.publicKeyPem,
      scope,
      notBefore: input.notBefore,
      expiresAt: input.expiresAt,
      issuedAt,
      revokedAt: null,
    };
    this.#sessions.set(session.sessionId, session);
    this.#sessionKeyFingerprints.add(fingerprint);
    return clone(session);
  }

  authorizeAction(
    intent: SignedActionIntent,
    authorizedAt: number,
  ): ActionAuthorizationDecision {
    assertTime(authorizedAt, "authorizedAt");
    const session = this.#sessions.get(intent.payload.sessionId);
    if (session === undefined) {
      return { allowed: false, reason: "UNKNOWN_SESSION" };
    }
    if (!verifySignedActionIntent(intent, session.publicKeyPem)) {
      return { allowed: false, reason: "INVALID_SIGNATURE" };
    }
    if (!sameTarget(intent.payload, session)) {
      return { allowed: false, reason: "TEMPLATE_MISMATCH" };
    }
    if (intent.payload.instanceId !== session.instanceId) {
      return { allowed: false, reason: "INSTANCE_MISMATCH" };
    }
    const instance = this.#instances.get(session.instanceId)!;
    if (instance.revokedAt !== null && instance.revokedAt <= authorizedAt) {
      return { allowed: false, reason: "INSTANCE_REVOKED" };
    }
    if (authorizedAt >= instance.expiresAt) {
      return { allowed: false, reason: "INSTANCE_EXPIRED" };
    }
    if (intent.payload.contextId !== session.contextId) {
      return { allowed: false, reason: "CONTEXT_MISMATCH" };
    }
    const account = this.#accounts.get(session.subjectAccountId)!;
    if (account.revokedAt !== null && account.revokedAt <= authorizedAt) {
      return { allowed: false, reason: "ACCOUNT_REVOKED" };
    }
    const grant = this.#grants.get(session.capabilityGrantId)!;
    if (grant.revokedAt !== null && grant.revokedAt <= authorizedAt) {
      return { allowed: false, reason: "GRANT_REVOKED" };
    }
    if (this.#hasRevokedAncestor(grant, authorizedAt)) {
      return { allowed: false, reason: "GRANT_REVOKED" };
    }
    if (session.revokedAt !== null && session.revokedAt <= authorizedAt) {
      return { allowed: false, reason: "SESSION_REVOKED" };
    }
    if (
      authorizedAt < grant.notBefore ||
      authorizedAt < session.notBefore ||
      intent.payload.issuedAt < session.notBefore ||
      intent.payload.issuedAt > authorizedAt
    ) {
      return { allowed: false, reason: "NOT_YET_VALID" };
    }
    if (
      authorizedAt >= grant.expiresAt ||
      authorizedAt >= session.expiresAt ||
      intent.payload.issuedAt >= session.expiresAt
    ) {
      return { allowed: false, reason: "EXPIRED" };
    }
    const nonceKey = `${session.sessionId}\u0000${intent.payload.nonce}`;
    if (this.#usedIntentNonces.has(nonceKey)) {
      return { allowed: false, reason: "REPLAYED_INTENT" };
    }
    const action = instance.template.actions.find(
      (candidate) => candidate.id === intent.payload.actionId,
    );
    if (
      action === undefined ||
      !grant.scope.actions.includes(intent.payload.actionId) ||
      !session.scope.actions.includes(intent.payload.actionId)
    ) {
      return { allowed: false, reason: "ACTION_DENIED" };
    }
    if (action.contextId !== intent.payload.contextId) {
      return { allowed: false, reason: "CONTEXT_MISMATCH" };
    }
    const transition = instance.template.transitions.find(
      (candidate) =>
        candidate.actionId === action.id &&
        candidate.fromState === instance.state,
    );
    if (transition === undefined) {
      return { allowed: false, reason: "STATE_DENIED" };
    }
    const rule = instance.template.capabilityRules.find(
      (candidate) => candidate.id === action.capabilityRuleId,
    )!;
    if (
      intent.payload.resourceSelector !== rule.resourceSelector ||
      !grant.scope.resourceSelectors.includes(intent.payload.resourceSelector) ||
      !session.scope.resourceSelectors.includes(
        intent.payload.resourceSelector,
      ) ||
      !grant.scope.resources.includes(intent.payload.resource) ||
      !session.scope.resources.includes(intent.payload.resource)
    ) {
      return { allowed: false, reason: "RESOURCE_DENIED" };
    }
    if (
      intent.payload.purpose !== action.purpose ||
      !grant.scope.purposes.includes(intent.payload.purpose) ||
      !session.scope.purposes.includes(intent.payload.purpose)
    ) {
      return { allowed: false, reason: "PURPOSE_DENIED" };
    }
    if (
      intent.payload.recipientKind !== action.recipientKind ||
      !grant.scope.recipientKinds.includes(intent.payload.recipientKind) ||
      !session.scope.recipientKinds.includes(intent.payload.recipientKind) ||
      !grant.scope.recipients.includes(intent.payload.recipient) ||
      !session.scope.recipients.includes(intent.payload.recipient)
    ) {
      return { allowed: false, reason: "RECIPIENT_DENIED" };
    }
    if (
      intent.payload.disclosurePolicyId !== rule.disclosurePolicyId ||
      !grant.scope.disclosurePolicyIds.includes(
        intent.payload.disclosurePolicyId,
      ) ||
      !session.scope.disclosurePolicyIds.includes(
        intent.payload.disclosurePolicyId,
      )
    ) {
      return { allowed: false, reason: "DISCLOSURE_POLICY_DENIED" };
    }
    const previousState = instance.state;
    instance.state = transition.toState;
    this.#usedIntentNonces.add(nonceKey);
    return {
      allowed: true,
      instanceId: instance.instanceId,
      accountId: session.subjectAccountId,
      grantId: grant.grantId,
      sessionId: session.sessionId,
      actionId: action.id,
      previousState,
      nextState: transition.toState,
      authorizedAt,
    };
  }

  revokeCapability(
    revokerRef: string,
    grantId: string,
    revokedAt: number,
  ): CapabilityGrant {
    assertTime(revokedAt, "revokedAt");
    const grant = this.#grant(grantId);
    if (grant.issuerRef !== revokerRef) {
      throw new ContextAuthorizationError(
        "UNAUTHORIZED",
        "only the grant issuer may revoke the capability",
      );
    }
    if (grant.revokedAt !== null) {
      throw new ContextAuthorizationError("REVOKED", "capability is revoked");
    }
    if (revokedAt < grant.issuedAt) {
      throw new ContextAuthorizationError(
        "INVALID_TIME",
        "revocation cannot precede capability issuance",
      );
    }
    grant.revokedAt = revokedAt;
    return clone(grant);
  }

  revokeSession(
    accountId: string,
    sessionId: string,
    revokedAt: number,
  ): SessionGrant {
    assertTime(revokedAt, "revokedAt");
    const session = this.#session(sessionId);
    if (session.subjectAccountId !== accountId) {
      throw new ContextAuthorizationError(
        "UNAUTHORIZED",
        "only the session account may revoke its key",
      );
    }
    if (session.revokedAt !== null) {
      throw new ContextAuthorizationError("REVOKED", "session is revoked");
    }
    if (revokedAt < session.issuedAt) {
      throw new ContextAuthorizationError(
        "INVALID_TIME",
        "revocation cannot precede session issuance",
      );
    }
    session.revokedAt = revokedAt;
    return clone(session);
  }

  revokeAccount(
    accountId: string,
    revokedAt: number,
  ): ContextAccount {
    assertTime(revokedAt, "revokedAt");
    const account = this.#account(accountId);
    if (account.revokedAt !== null) {
      throw new ContextAuthorizationError("REVOKED", "account is revoked");
    }
    if (revokedAt < account.registeredAt) {
      throw new ContextAuthorizationError(
        "INVALID_TIME",
        "revocation cannot precede account registration",
      );
    }
    account.revokedAt = revokedAt;
    return clone(account);
  }

  revokeInstance(
    allocatorId: string,
    instanceId: string,
    revokedAt: number,
  ): ScenarioInstance {
    assertTime(revokedAt, "revokedAt");
    const instance = this.#instance(instanceId);
    if (instance.allocatedBy !== allocatorId) {
      throw new ContextAuthorizationError(
        "UNAUTHORIZED",
        "only the instance allocator may revoke the instance",
      );
    }
    if (instance.revokedAt !== null) {
      throw new ContextAuthorizationError("REVOKED", "instance is revoked");
    }
    if (revokedAt < instance.createdAt) {
      throw new ContextAuthorizationError(
        "INVALID_TIME",
        "revocation cannot precede instance creation",
      );
    }
    instance.revokedAt = revokedAt;
    return publicInstance(instance);
  }

  getScenarioInstance(instanceId: string): ScenarioInstance {
    return publicInstance(this.#instance(instanceId));
  }

  getContextAccount(accountId: string): ContextAccount {
    return clone(this.#account(accountId));
  }

  getCapabilityGrant(grantId: string): CapabilityGrant {
    return clone(this.#grant(grantId));
  }

  getSessionGrant(sessionId: string): SessionGrant {
    return clone(this.#session(sessionId));
  }

  #instance(instanceId: string): MutableInstance {
    const instance = this.#instances.get(instanceId);
    if (instance === undefined) {
      throw new ContextAuthorizationError(
        "UNKNOWN_INSTANCE",
        `unknown instance '${instanceId}'`,
      );
    }
    return instance;
  }

  #activeInstance(instanceId: string, at: number): MutableInstance {
    const instance = this.#instance(instanceId);
    if (instance.revokedAt !== null && instance.revokedAt <= at) {
      throw new ContextAuthorizationError("REVOKED", "instance is revoked");
    }
    if (at < instance.createdAt || at >= instance.expiresAt) {
      throw new ContextAuthorizationError(
        "INVALID_TIME",
        "instance is not active at the requested time",
      );
    }
    return instance;
  }

  #context(instance: MutableInstance, contextId: string): void {
    if (!instance.template.contexts.some((context) => context.id === contextId)) {
      throw new ContextAuthorizationError(
        "UNKNOWN_CONTEXT",
        `unknown context '${contextId}' for this instance`,
      );
    }
  }

  #account(accountId: string): MutableAccount {
    const account = this.#accounts.get(accountId);
    if (account === undefined) {
      throw new ContextAuthorizationError(
        "UNKNOWN_ACCOUNT",
        `unknown account '${accountId}'`,
      );
    }
    return account;
  }

  #activeAccount(accountId: string, at: number): MutableAccount {
    const account = this.#account(accountId);
    if (account.revokedAt !== null && account.revokedAt <= at) {
      throw new ContextAuthorizationError("REVOKED", "account is revoked");
    }
    this.#activeInstance(account.instanceId, at);
    return account;
  }

  #grant(grantId: string): MutableGrant {
    const grant = this.#grants.get(grantId);
    if (grant === undefined) {
      throw new ContextAuthorizationError(
        "UNKNOWN_GRANT",
        `unknown capability grant '${grantId}'`,
      );
    }
    return grant;
  }

  #activeGrant(grantId: string, at: number): MutableGrant {
    const grant = this.#grant(grantId);
    if (
      (grant.revokedAt !== null && grant.revokedAt <= at) ||
      this.#hasRevokedAncestor(grant, at)
    ) {
      throw new ContextAuthorizationError("REVOKED", "capability is revoked");
    }
    if (at < grant.notBefore || at >= grant.expiresAt) {
      throw new ContextAuthorizationError(
        "INVALID_TIME",
        "capability is not active at the requested time",
      );
    }
    this.#activeAccount(grant.subjectAccountId, at);
    return grant;
  }

  #hasRevokedAncestor(grant: MutableGrant, at: number): boolean {
    let parentGrantId = grant.parentGrantId;
    while (parentGrantId !== null) {
      const parent = this.#grant(parentGrantId);
      if (parent.revokedAt !== null && parent.revokedAt <= at) {
        return true;
      }
      parentGrantId = parent.parentGrantId;
    }
    return false;
  }

  #session(sessionId: string): MutableSession {
    const session = this.#sessions.get(sessionId);
    if (session === undefined) {
      throw new ContextAuthorizationError(
        "INVALID_INPUT",
        `unknown session '${sessionId}'`,
      );
    }
    return session;
  }

  #assertNewGrantId(grantId: string): void {
    assertIdentifier(grantId, "grantId");
    if (this.#grants.has(grantId)) {
      throw new ContextAuthorizationError(
        "DUPLICATE_ID",
        `grantId '${grantId}' already exists`,
      );
    }
  }

  #assertAccountScope(
    account: MutableAccount,
    instanceId: string,
    contextId: string,
  ): void {
    if (
      account.instanceId !== instanceId ||
      account.contextId !== contextId
    ) {
      throw new ContextAuthorizationError(
        "UNAUTHORIZED",
        "context accounts cannot cross instance or context boundaries",
      );
    }
  }

  #assertGrantWindow(
    issuedAt: number,
    notBefore: number,
    expiresAt: number,
    instanceExpiresAt: number,
  ): void {
    assertTime(notBefore, "notBefore");
    assertTime(expiresAt, "expiresAt");
    if (
      notBefore < issuedAt ||
      expiresAt <= notBefore ||
      expiresAt > instanceExpiresAt
    ) {
      throw new ContextAuthorizationError(
        "INVALID_TIME",
        "capability time window must be future-facing and contained by the instance",
      );
    }
  }

  #assertDelegationLimit(maxDelegationDepth: number): void {
    if (
      !Number.isSafeInteger(maxDelegationDepth) ||
      maxDelegationDepth < 0 ||
      maxDelegationDepth > MAX_DELEGATION_DEPTH
    ) {
      throw new ContextAuthorizationError(
        "INVALID_SCOPE",
        `maxDelegationDepth must be between 0 and ${MAX_DELEGATION_DEPTH}`,
      );
    }
  }

  #validateScopeAgainstTemplate(
    instance: MutableInstance,
    contextId: string,
    scope: CapabilityScope,
  ): void {
    for (const actionId of scope.actions) {
      const action = instance.template.actions.find(
        (candidate) => candidate.id === actionId,
      );
      if (action === undefined || action.contextId !== contextId) {
        throw new ContextAuthorizationError(
          "INVALID_SCOPE",
          `action '${actionId}' does not belong to context '${contextId}'`,
        );
      }
      const rule = instance.template.capabilityRules.find(
        (candidate) => candidate.id === action.capabilityRuleId,
      )!;
      if (
        !scope.resourceSelectors.includes(rule.resourceSelector) ||
        !scope.purposes.includes(action.purpose) ||
        !scope.recipientKinds.includes(action.recipientKind) ||
        !scope.disclosurePolicyIds.includes(rule.disclosurePolicyId)
      ) {
        throw new ContextAuthorizationError(
          "INVALID_SCOPE",
          `scope omits a template constraint required by action '${actionId}'`,
        );
      }
    }
  }
}
