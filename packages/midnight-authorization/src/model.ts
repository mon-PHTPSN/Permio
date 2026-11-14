import type { ActivationRecord } from "@permio/scenario-governance";

export const ACTIVATION_ADMISSION_ENVELOPE_VERSION = 1 as const;
export const ACTIVATION_ADMISSION_DOMAIN =
  "permio:m4-activation-admission:v1" as const;
export const ACTIVATION_ADMISSION_HASH_ALGORITHM = "sha256" as const;
export const MIDNIGHT_GOVERNANCE_SIGNATURE_PROFILE =
  "midnight-jubjub-schnorr-v1" as const;
export const MIDNIGHT_REGISTRY_PROTOCOL_VERSION =
  "permio-midnight-authorization-v1" as const;

export type Hex32 = `0x${string}`;

export interface ProofModuleBinding {
  readonly actionId: string;
  readonly proofProfileId: string;
  readonly moduleId: string;
  readonly moduleVersion: string;
  readonly implementationHash: Hex32;
  readonly configurationHash: Hex32;
  readonly receiptSchemaHash: Hex32;
}

export interface IndexedProofModuleBinding extends ProofModuleBinding {
  readonly actionIndex: number;
}

export interface ProofModuleBindingManifest {
  readonly manifestVersion: 1;
  readonly bindings: readonly ProofModuleBinding[];
}

export interface ProofModuleProposalInput {
  readonly moduleId: string;
  readonly moduleVersion: string;
  readonly implementationHash: Hex32;
  readonly governanceNamespaceHash: Hex32;
  readonly governancePolicyHash: Hex32;
  readonly authorityRootVersion: number;
  readonly authorityRootSequence: number;
  readonly implementationReferenceHash: Hex32;
  readonly sourceHash: Hex32;
  readonly inputSchemaHash: Hex32;
  readonly configurationSchemaHash: Hex32;
  readonly receiptSchemaHash: Hex32;
  readonly compilerVersionHash: Hex32;
  readonly compatibilityPolicyHash: Hex32;
  readonly proposedAt: number;
}

export interface ActivationAdmissionEnvelope {
  readonly envelopeVersion: typeof ACTIVATION_ADMISSION_ENVELOPE_VERSION;
  readonly signatureProfile: typeof MIDNIGHT_GOVERNANCE_SIGNATURE_PROFILE;
  readonly namespaceHash: Hex32;
  readonly templateIdHash: Hex32;
  readonly semanticVersion: string;
  readonly templateContentHash: Hex32;
  readonly governancePolicyHash: Hex32;
  readonly proofModuleBindingsHash: Hex32;
  readonly proofModuleBindingRoot: Hex32;
  readonly proofModuleBindingCount: number;
  readonly proofModuleRegistrySequence: number;
  readonly m4ActivationRecordHash: Hex32;
  readonly approvalEvidenceCommitment: Hex32;
  readonly authorityRootVersion: number;
  readonly authorityRootSequence: number;
  readonly targetNetworkId: string;
  readonly targetContractIdentity: Hex32;
  readonly registryProtocolVersion: typeof MIDNIGHT_REGISTRY_PROTOCOL_VERSION;
  readonly admissionNonce: Hex32;
  readonly activatedAt: number;
  readonly stagingExpiresAt: number;
}

export interface ActivationAdmissionInput {
  readonly activation: ActivationRecord;
  readonly governancePolicyHash: Hex32;
  readonly proofModuleBindings: ProofModuleBindingManifest;
  readonly proofModuleRegistrySequence: number;
  readonly approvalEvidenceCommitment: Hex32;
  readonly authorityRootVersion: number;
  readonly authorityRootSequence: number;
  readonly targetNetworkId: string;
  readonly targetContractIdentity: Hex32;
  readonly admissionNonce: Hex32;
  readonly stagingExpiresAt: number;
}

export interface ActivationAdmissionArtifact {
  readonly envelope: ActivationAdmissionEnvelope;
  readonly envelopeHash: Hex32;
  readonly bindings: readonly IndexedProofModuleBinding[];
}
