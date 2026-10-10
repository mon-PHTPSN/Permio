import type {
  ScenarioTemplate,
  ScenarioTemplateHash,
} from "@permio/scenario-domain";

export const SCENARIO_GENERATOR_VERSION = "1.0.0" as const;
export const SCENARIO_GENERATOR_SCHEMA_VERSION = 1 as const;
export const POLICY_PROFILE_SCHEMA_VERSION = 1 as const;
export const CLASSIFICATION_MANIFEST_VERSION = 1 as const;
export const GOLDEN_VECTOR_FORMAT_VERSION = 1 as const;
export const SCENARIO_GENERATOR_DOMAINS = {
  master: "permio:scenario-generator:master:v1",
  policyProfileHash: "permio:scenario-generator:policy-profile-hash:v1",
  instanceId: "permio:scenario-generator:instance-id:v1",
  principalId: "permio:scenario-generator:principal-id:v1",
  recordId: "permio:scenario-generator:record-id:v1",
  recordValue: "permio:scenario-generator:record-value:v1",
  credentialId: "permio:scenario-generator:credential-id:v1",
  credentialClaim: "permio:scenario-generator:credential-claim:v1",
  eventId: "permio:scenario-generator:event-id:v1",
  goldenOutputHash: "permio:scenario-generator:golden-output-hash:v1",
} as const;

export type ScenarioGeneratorDerivationDomain =
  (typeof SCENARIO_GENERATOR_DOMAINS)[keyof typeof SCENARIO_GENERATOR_DOMAINS];

export interface GeneratorPolicyProfile {
  readonly schemaVersion: typeof POLICY_PROFILE_SCHEMA_VERSION;
  readonly id: string;
  readonly version: string;
  readonly baseTimestamp: string;
  readonly eventIntervalSeconds: number;
  readonly syntheticValueBytes: number;
}

export interface ScenarioGeneratorInput {
  readonly template: ScenarioTemplate;
  readonly templateHash: ScenarioTemplateHash;
  readonly generatorVersion: typeof SCENARIO_GENERATOR_VERSION;
  readonly explicitSeed: string;
  readonly policyProfile: GeneratorPolicyProfile;
}

export interface SyntheticPrincipal {
  readonly id: string;
  readonly contextId: string;
  readonly slotId: string;
}

export interface SyntheticRecord {
  readonly id: string;
  readonly contextId: string;
  readonly recordType: string;
  readonly ownerPrincipalId: string;
  readonly value: string;
}

export interface SyntheticCredential {
  readonly id: string;
  readonly contextId: string;
  readonly actionId: string;
  readonly subjectPrincipalId: string;
  readonly proofProfileId: string;
  readonly claims: Readonly<Record<string, string>>;
}

export interface SyntheticEvent {
  readonly id: string;
  readonly actionId: string;
  readonly contextId: string;
  readonly actorPrincipalId: string;
  readonly fromState: string;
  readonly toState: string;
  readonly timestamp: string;
}

export interface SyntheticScenarioInstance {
  readonly schemaVersion: typeof SCENARIO_GENERATOR_SCHEMA_VERSION;
  readonly instanceId: string;
  readonly generatedTimestamp: string;
  readonly principals: readonly SyntheticPrincipal[];
  readonly records: readonly SyntheticRecord[];
  readonly credentials: readonly SyntheticCredential[];
  readonly events: readonly SyntheticEvent[];
}

export interface PublicScenarioSchema {
  readonly principalSchemas: readonly {
    readonly contextId: string;
    readonly slotId: string;
  }[];
  readonly recordSchemas: readonly {
    readonly contextId: string;
    readonly recordType: string;
  }[];
  readonly credentialSchemas: readonly {
    readonly contextId: string;
    readonly actionId: string;
    readonly claimTypes: readonly string[];
    readonly proofProfileId: string;
  }[];
  readonly eventSchemas: readonly {
    readonly actionId: string;
    readonly contextId: string;
    readonly fromState: string;
    readonly toState: string;
  }[];
}

export interface PublicScenarioSummary {
  readonly schemaVersion: typeof SCENARIO_GENERATOR_SCHEMA_VERSION;
  readonly generatorVersion: typeof SCENARIO_GENERATOR_VERSION;
  readonly templateHash: ScenarioTemplateHash;
  readonly policyProfileHash: `0x${string}`;
  readonly schema: PublicScenarioSchema;
}

export type DataClassification = "private" | "public";

export interface ClassificationEntry {
  readonly path: string;
  readonly classification: DataClassification;
  readonly rationale: string;
}

export interface ClassificationManifest {
  readonly version: typeof CLASSIFICATION_MANIFEST_VERSION;
  readonly defaultClassification: "private";
  readonly entries: readonly ClassificationEntry[];
}

export interface GeneratedScenario {
  readonly generatorVersion: typeof SCENARIO_GENERATOR_VERSION;
  readonly templateHash: ScenarioTemplateHash;
  readonly policyProfileHash: `0x${string}`;
  readonly privateInstance: SyntheticScenarioInstance;
  readonly publicSummary: PublicScenarioSummary;
  readonly classificationManifest: ClassificationManifest;
}

export interface GoldenVectorV1 {
  readonly formatVersion: typeof GOLDEN_VECTOR_FORMAT_VERSION;
  readonly classification: "private-test-artifact";
  readonly input: ScenarioGeneratorInput;
  readonly expected: {
    readonly canonicalOutputHex: `0x${string}`;
    readonly outputSha256: `0x${string}`;
  };
}
