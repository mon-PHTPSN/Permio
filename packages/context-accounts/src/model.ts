import type { TemplateTarget } from "@permio/scenario-governance";

export const ACTION_INTENT_VERSION = 1 as const;
export const ACTION_INTENT_DOMAIN = "permio:action-intent:v1" as const;
export const ACTION_INTENT_ALGORITHM = "ed25519" as const;

export type ContextPrincipalKind =
  | "human"
  | "service"
  | "contract"
  | "agent";

export interface ContextAuthorityPrincipal {
  readonly principalId: string;
  readonly kind: ContextPrincipalKind;
}

export interface ScenarioInstance extends TemplateTarget {
  readonly instanceId: string;
  readonly instantiationRequestId: string;
  readonly allocatedBy: string;
  readonly state: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly revokedAt: number | null;
  readonly capabilityIssuers: readonly ContextAuthorityPrincipal[];
}

export interface ContextAccount {
  readonly accountId: string;
  readonly instanceId: string;
  readonly contextId: string;
  readonly kind: ContextPrincipalKind;
  readonly publicKeyPem: string;
  readonly registeredAt: number;
  readonly revokedAt: number | null;
}

export interface CapabilityScope {
  readonly actions: readonly string[];
  readonly resourceSelectors: readonly string[];
  readonly resources: readonly string[];
  readonly purposes: readonly string[];
  readonly recipientKinds: readonly string[];
  readonly recipients: readonly string[];
  readonly disclosurePolicyIds: readonly string[];
}

export interface CapabilityGrant extends TemplateTarget {
  readonly grantId: string;
  readonly parentGrantId: string | null;
  readonly instanceId: string;
  readonly contextId: string;
  readonly subjectAccountId: string;
  readonly issuerRef: string;
  readonly scope: CapabilityScope;
  readonly notBefore: number;
  readonly expiresAt: number;
  readonly delegationDepth: number;
  readonly maxDelegationDepth: number;
  readonly issuedAt: number;
  readonly revokedAt: number | null;
}

export interface SessionGrant extends TemplateTarget {
  readonly sessionId: string;
  readonly capabilityGrantId: string;
  readonly instanceId: string;
  readonly contextId: string;
  readonly subjectAccountId: string;
  readonly publicKeyPem: string;
  readonly scope: CapabilityScope;
  readonly notBefore: number;
  readonly expiresAt: number;
  readonly issuedAt: number;
  readonly revokedAt: number | null;
}

export interface ActionIntentPayload extends TemplateTarget {
  readonly intentVersion: typeof ACTION_INTENT_VERSION;
  readonly sessionId: string;
  readonly instanceId: string;
  readonly contextId: string;
  readonly actionId: string;
  readonly resourceSelector: string;
  readonly resource: string;
  readonly purpose: string;
  readonly recipientKind: string;
  readonly recipient: string;
  readonly disclosurePolicyId: string;
  readonly issuedAt: number;
  readonly nonce: string;
}

export interface SignedActionIntent {
  readonly domain: typeof ACTION_INTENT_DOMAIN;
  readonly algorithm: typeof ACTION_INTENT_ALGORITHM;
  readonly payload: ActionIntentPayload;
  readonly signature: string;
}

export const ACTION_DENIAL_REASONS = [
  "UNKNOWN_SESSION",
  "INVALID_SIGNATURE",
  "TEMPLATE_MISMATCH",
  "INSTANCE_MISMATCH",
  "INSTANCE_REVOKED",
  "INSTANCE_EXPIRED",
  "CONTEXT_MISMATCH",
  "ACCOUNT_REVOKED",
  "GRANT_REVOKED",
  "SESSION_REVOKED",
  "NOT_YET_VALID",
  "EXPIRED",
  "ACTION_DENIED",
  "STATE_DENIED",
  "RESOURCE_DENIED",
  "PURPOSE_DENIED",
  "RECIPIENT_DENIED",
  "DISCLOSURE_POLICY_DENIED",
  "REPLAYED_INTENT",
] as const;

export type ActionDenialReason = (typeof ACTION_DENIAL_REASONS)[number];

export interface AuthorizedAction {
  readonly allowed: true;
  readonly instanceId: string;
  readonly accountId: string;
  readonly grantId: string;
  readonly sessionId: string;
  readonly actionId: string;
  readonly previousState: string;
  readonly nextState: string;
  readonly authorizedAt: number;
}

export interface DeniedAction {
  readonly allowed: false;
  readonly reason: ActionDenialReason;
}

export type ActionAuthorizationDecision = AuthorizedAction | DeniedAction;

export interface RootCapabilityInput {
  readonly grantId: string;
  readonly instanceId: string;
  readonly contextId: string;
  readonly subjectAccountId: string;
  readonly scope: CapabilityScope;
  readonly notBefore: number;
  readonly expiresAt: number;
  readonly maxDelegationDepth: number;
}

export interface DelegatedCapabilityInput {
  readonly grantId: string;
  readonly subjectAccountId: string;
  readonly scope: CapabilityScope;
  readonly notBefore: number;
  readonly expiresAt: number;
  readonly maxDelegationDepth: number;
}

export interface SessionGrantInput {
  readonly sessionId: string;
  readonly publicKeyPem: string;
  readonly scope: CapabilityScope;
  readonly notBefore: number;
  readonly expiresAt: number;
}
