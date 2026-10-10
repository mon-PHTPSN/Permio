import type { ScenarioTemplate } from "@permio/scenario-domain";

export const REVIEWER_ATTESTATION_VERSION = 1 as const;
export const REVIEWER_ATTESTATION_DOMAIN =
  "permio:reviewer-attestation:v1" as const;
export const REVIEWER_ATTESTATION_ALGORITHM = "ed25519" as const;

export type AuthorityKind = "human" | "organization" | "agent" | "service";
export type NamespaceImpact = "standard" | "high";

export interface AuthorityPrincipal {
  readonly principalId: string;
  readonly kind: AuthorityKind;
}

export interface ReviewerPrincipal extends AuthorityPrincipal {
  readonly publicKeyPem: string;
}

export interface NamespacePolicy {
  readonly namespace: string;
  readonly impact: NamespaceImpact;
  readonly reviewThreshold: number;
  readonly authors: readonly AuthorityPrincipal[];
  readonly reviewers: readonly ReviewerPrincipal[];
  readonly governanceAuthorities: readonly AuthorityPrincipal[];
  readonly allocators: readonly AuthorityPrincipal[];
  readonly emergencyRevokers: readonly AuthorityPrincipal[];
}

export interface TemplateTarget {
  readonly namespace: string;
  readonly templateId: string;
  readonly templateVersion: string;
  readonly templateHash: `0x${string}`;
}

export type TemplateLifecycleState =
  | "draft"
  | "validated"
  | "in_review"
  | "active"
  | "retired"
  | "revoked";

export interface ValidationFinding {
  readonly code: string;
  readonly severity: "info" | "warning" | "critical";
  readonly message: string;
}

export interface ValidationReportInput {
  readonly toolId: string;
  readonly toolVersion: string;
  readonly findings: readonly ValidationFinding[];
}

export interface ValidationReport extends ValidationReportInput {
  readonly target: TemplateTarget;
  readonly submittedBy: string;
  readonly reportedAt: number;
  readonly grantsTrust: false;
}

export type ReviewDecision = "approve" | "reject";

export interface ReviewerAttestationPayload extends TemplateTarget {
  readonly attestationVersion: typeof REVIEWER_ATTESTATION_VERSION;
  readonly reviewerId: string;
  readonly decision: ReviewDecision;
  readonly reviewedAt: number;
}

export interface ReviewerAttestation {
  readonly domain: typeof REVIEWER_ATTESTATION_DOMAIN;
  readonly algorithm: typeof REVIEWER_ATTESTATION_ALGORITHM;
  readonly payload: ReviewerAttestationPayload;
  readonly signature: string;
}

export interface LifecycleEvent {
  readonly state: TemplateLifecycleState;
  readonly actorId: string;
  readonly occurredAt: number;
  readonly reason: string | null;
}

export interface TemplateRecord {
  readonly target: TemplateTarget;
  readonly template: ScenarioTemplate;
  readonly authorId: string;
  readonly state: TemplateLifecycleState;
  readonly validationReport: ValidationReport | null;
  readonly reviews: readonly ReviewerAttestation[];
  readonly lifecycle: readonly LifecycleEvent[];
}

export interface ActivationRecord extends TemplateTarget {
  readonly activatedBy: string;
  readonly activatedAt: number;
  readonly approvalReviewerIds: readonly string[];
  readonly reviewThreshold: number;
}

export interface RetirementRecord extends TemplateTarget {
  readonly retiredBy: string;
  readonly retiredAt: number;
}

export interface RevocationRecord extends TemplateTarget {
  readonly revokedBy: string;
  readonly effectiveAt: number;
  readonly behavior: "prospective";
  readonly reason: string;
}

export interface InstantiationAuthorization extends TemplateTarget {
  readonly requestId: string;
  readonly allocatorId: string;
  readonly authorizedAt: number;
}
