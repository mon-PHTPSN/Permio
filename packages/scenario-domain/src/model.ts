export const SCENARIO_TEMPLATE_SCHEMA_VERSION = 1 as const;
export const SCENARIO_TEMPLATE_HASH_DOMAIN =
  "permio:scenario-template:v1" as const;
export const SCENARIO_TEMPLATE_HASH_ALGORITHM = "sha256" as const;

export interface ParticipantSlot {
  readonly id: string;
  readonly description: string;
  readonly assignableBy: readonly string[];
}

export interface ContextDefinition {
  readonly id: string;
  readonly description: string;
  readonly allowedSlotIds: readonly string[];
  readonly recordTypes: readonly string[];
  readonly claimTypes: readonly string[];
  readonly recipientKinds: readonly string[];
  readonly purposes: readonly string[];
}

export interface ActionDefinition {
  readonly id: string;
  readonly description: string;
  readonly contextId: string;
  readonly actorSlotId: string;
  readonly inputRecordTypes: readonly string[];
  readonly outputClaimTypes: readonly string[];
  readonly purpose: string;
  readonly recipientKind: string;
  readonly capabilityRuleId: string;
  readonly proofProfileId: string;
  readonly executionAdapterId: string | null;
}

export interface StateTransition {
  readonly id: string;
  readonly fromState: string;
  readonly actionId: string;
  readonly toState: string;
}

export interface CapabilityRule {
  readonly id: string;
  readonly description: string;
  readonly actionIds: readonly string[];
  readonly resourceSelector: string;
  readonly purpose: string;
  readonly recipientConstraint: string;
  readonly validForSeconds: number;
  readonly maxDelegationDepth: number;
  readonly disclosurePolicyId: string;
  readonly revocable: boolean;
}

export interface ProofProfile {
  readonly id: string;
  readonly circuitId: string;
  readonly publicOutputSchemaId: string;
}

export interface ExecutionAdapter {
  readonly id: string;
  readonly kind: string;
  readonly schemaId: string;
}

export interface PrivacyInvariant {
  readonly id: string;
  readonly description: string;
}

export interface ScenarioTemplate {
  readonly schemaVersion: typeof SCENARIO_TEMPLATE_SCHEMA_VERSION;
  readonly namespace: string;
  readonly templateId: string;
  readonly version: string;
  readonly displayName: string;
  readonly description: string;
  readonly participantSlots: readonly ParticipantSlot[];
  readonly contexts: readonly ContextDefinition[];
  readonly states: readonly string[];
  readonly initialState: string;
  readonly actions: readonly ActionDefinition[];
  readonly transitions: readonly StateTransition[];
  readonly capabilityRules: readonly CapabilityRule[];
  readonly proofProfiles: readonly ProofProfile[];
  readonly executionAdapters: readonly ExecutionAdapter[];
  readonly privacyInvariants: readonly PrivacyInvariant[];
}

export interface ScenarioTemplateHash {
  readonly algorithm: typeof SCENARIO_TEMPLATE_HASH_ALGORITHM;
  readonly domain: typeof SCENARIO_TEMPLATE_HASH_DOMAIN;
  readonly value: `0x${string}`;
}

export interface SemanticVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

export type TemplateRevisionKind = "patch" | "minor" | "major";

export interface TemplateRevision {
  readonly kind: TemplateRevisionKind;
  readonly previousVersion: string;
  readonly nextVersion: string;
}
