import type { ActionAuthorizationDecision, ActionDenialReason, SignedActionIntent } from "@permio/context-accounts";
import type { ScenarioTemplate, ScenarioTemplateHash } from "@permio/scenario-domain";
import type { GeneratedScenario, GeneratorPolicyProfile, ScenarioGeneratorInput } from "@permio/scenario-generator";
import type { NamespacePolicy, TemplateTarget } from "@permio/scenario-governance";

export const SCENARIO_PACK_FORMAT_VERSION = 1 as const;
export const SCENARIO_PACK_VERSION = "2.0.0" as const;
export const UPSTREAM_EXPECTATION_FORMAT_VERSION = 1 as const;

export type ScenarioPackId =
  | "clinical-referral-consent"
  | "professional-site-access"
  | "delegated-purchasing-agent";

export interface ScenarioPackFlow {
  readonly id: string;
  readonly contextId: string;
  readonly actionId: string;
  readonly resourceSelector: string;
  readonly resource: string;
  readonly purpose: string;
  readonly recipientKind: string;
  readonly recipient: string;
  readonly disclosurePolicyId: string;
  readonly disclosedClaims: readonly string[];
  readonly newlyCreatedLinkages: readonly string[];
  readonly remainsPrivate: readonly string[];
  readonly requiredProofSemantics: readonly string[];
}

export interface ScenarioPackDefinition {
  readonly formatVersion: typeof SCENARIO_PACK_FORMAT_VERSION;
  readonly id: ScenarioPackId;
  readonly version: typeof SCENARIO_PACK_VERSION;
  readonly template: ScenarioTemplate;
  readonly generatorPolicyProfile: GeneratorPolicyProfile;
  readonly seeds: readonly [string, string];
  readonly flows: readonly ScenarioPackFlow[];
}

export interface DisclosurePreview {
  readonly packId: ScenarioPackId;
  readonly flowId: string;
  readonly recipientKind: string;
  readonly recipient: string;
  readonly purpose: string;
  readonly validAfter: number;
  readonly validBefore: number;
  readonly disclosedClaims: readonly string[];
  readonly newlyCreatedLinkages: readonly string[];
  readonly remainsPrivate: readonly string[];
}

export interface NegativeAuthorizationVector {
  readonly id: string;
  readonly constrainedDimension: string;
  readonly expectedReason: ActionDenialReason;
  readonly observed: ActionAuthorizationDecision;
}

export interface UpstreamContractExpectationV1 {
  readonly formatVersion: typeof UPSTREAM_EXPECTATION_FORMAT_VERSION;
  readonly status: "contract-fixture";
  readonly liveEvidence: false;
  readonly architectureCommit: string;
  readonly packId: ScenarioPackId;
  readonly flowId: string;
  readonly templateTarget: TemplateTarget;
  readonly m6: {
    readonly authoritativeCodec: "pending-m6";
    readonly proofProfileId: string;
    readonly requiredProofSemantics: readonly string[];
    readonly unsupportedProofResult: "UNSUPPORTED_PROOF_REQUIREMENT";
    readonly requiredReceiptBindings: readonly string[];
  };
  readonly m7: {
    readonly authoritativeEnvelope: "pending-m7";
    readonly requiredTransportBindings: readonly string[];
  };
  readonly m8: {
    readonly authoritativeExecutionResult: "pending-m8";
    readonly executionAdapterId: string;
    readonly requiredResultBindings: readonly string[];
  };
}

export interface ScenarioPackFixture {
  readonly formatVersion: typeof SCENARIO_PACK_FORMAT_VERSION;
  readonly definition: ScenarioPackDefinition;
  readonly input: ScenarioGeneratorInput;
  readonly generated: GeneratedScenario;
  readonly templateHash: ScenarioTemplateHash;
  readonly namespacePolicy: NamespacePolicy;
  readonly target: TemplateTarget;
  readonly flow: ScenarioPackFlow;
  readonly positiveIntent: SignedActionIntent;
  readonly positiveDecision: ActionAuthorizationDecision;
  readonly negativeVectors: readonly NegativeAuthorizationVector[];
  readonly disclosurePreview: DisclosurePreview;
  readonly upstreamExpectation: UpstreamContractExpectationV1;
  readonly additionalPrivateValues: readonly {
    readonly path: string;
    readonly value: string;
  }[];
}
