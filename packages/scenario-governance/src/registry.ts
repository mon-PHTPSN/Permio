import { createPublicKey } from "node:crypto";

import {
  hashScenarioTemplate,
  parseScenarioTemplate,
} from "@permio/scenario-domain";

import { verifyReviewerAttestation } from "./attestation.ts";
import { GovernanceError } from "./errors.ts";
import type {
  ActivationRecord,
  AuthorityPrincipal,
  InstantiationAuthorization,
  LifecycleEvent,
  NamespacePolicy,
  RetirementRecord,
  ReviewerAttestation,
  ReviewerPrincipal,
  RevocationRecord,
  TemplateLifecycleState,
  TemplateRecord,
  TemplateTarget,
  ValidationFinding,
  ValidationReport,
  ValidationReportInput,
} from "./model.ts";

const NAMESPACE_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const PRINCIPAL_PATTERN = /^[a-z][a-z0-9]*(?:[._:@/-][a-z0-9]+)*$/;
const LABEL_PATTERN = /^[a-z][a-z0-9]*(?:[._:/-][a-z0-9]+)*$/;
const TEMPLATE_HASH_PATTERN = /^0x[0-9a-f]{64}$/;

interface MutableTemplateRecord {
  readonly target: TemplateTarget;
  readonly template: ReturnType<typeof parseScenarioTemplate>;
  readonly authorId: string;
  state: TemplateLifecycleState;
  validationReport: ValidationReport | null;
  readonly reviews: Map<string, ReviewerAttestation>;
  readonly lifecycle: LifecycleEvent[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function assertIdentifier(
  value: string,
  label: string,
  pattern = PRINCIPAL_PATTERN,
): void {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new GovernanceError(
      "INVALID_POLICY",
      `${label} must be a lowercase protocol identifier`,
    );
  }
}

function assertTime(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new GovernanceError(
      "INVALID_TIME",
      `${label} must be a non-negative safe integer`,
    );
  }
}

function validateAuthorityList(
  values: readonly AuthorityPrincipal[],
  label: string,
): Set<string> {
  if (!Array.isArray(values) || values.length === 0) {
    throw new GovernanceError("INVALID_POLICY", `${label} must not be empty`);
  }
  const ids = new Set<string>();
  for (const value of values) {
    assertIdentifier(value.principalId, `${label} principalId`);
    if (
      value.kind !== "human" &&
      value.kind !== "organization" &&
      value.kind !== "agent" &&
      value.kind !== "service"
    ) {
      throw new GovernanceError(
        "INVALID_POLICY",
        `${label} '${value.principalId}' has an invalid authority kind`,
      );
    }
    if (ids.has(value.principalId)) {
      throw new GovernanceError(
        "INVALID_POLICY",
        `${label} contains duplicate principal '${value.principalId}'`,
      );
    }
    ids.add(value.principalId);
  }
  return ids;
}

function validateReviewers(
  reviewers: readonly ReviewerPrincipal[],
): Set<string> {
  const ids = validateAuthorityList(reviewers, "reviewers");
  const publicKeys = new Set<string>();
  for (const reviewer of reviewers) {
    try {
      const key = createPublicKey(reviewer.publicKeyPem);
      if (key.asymmetricKeyType !== "ed25519") {
        throw new Error("not Ed25519");
      }
      const fingerprint = key
        .export({ type: "spki", format: "der" })
        .toString("base64");
      if (publicKeys.has(fingerprint)) {
        throw new GovernanceError(
          "INVALID_POLICY",
          `reviewer '${reviewer.principalId}' reuses another reviewer's public key`,
        );
      }
      publicKeys.add(fingerprint);
    } catch (error) {
      if (error instanceof GovernanceError) {
        throw error;
      }
      throw new GovernanceError(
        "INVALID_POLICY",
        `reviewer '${reviewer.principalId}' must have a valid Ed25519 public key`,
      );
    }
  }
  return ids;
}

function validatePolicy(policy: NamespacePolicy): NamespacePolicy {
  assertIdentifier(policy.namespace, "namespace", NAMESPACE_PATTERN);
  if (policy.impact !== "standard" && policy.impact !== "high") {
    throw new GovernanceError(
      "INVALID_POLICY",
      "impact must be 'standard' or 'high'",
    );
  }
  const groups = [
    ["authors", validateAuthorityList(policy.authors, "authors")],
    ["reviewers", validateReviewers(policy.reviewers)],
    [
      "governanceAuthorities",
      validateAuthorityList(
        policy.governanceAuthorities,
        "governanceAuthorities",
      ),
    ],
    ["allocators", validateAuthorityList(policy.allocators, "allocators")],
    [
      "emergencyRevokers",
      validateAuthorityList(
        policy.emergencyRevokers,
        "emergencyRevokers",
      ),
    ],
  ] as const;
  if (
    !Number.isSafeInteger(policy.reviewThreshold) ||
    policy.reviewThreshold < 1 ||
    policy.reviewThreshold > policy.reviewers.length
  ) {
    throw new GovernanceError(
      "INVALID_POLICY",
      "reviewThreshold must be between one and the number of reviewers",
    );
  }

  const ownership = new Map<string, string>();
  for (const [group, ids] of groups) {
    for (const id of ids) {
      const previous = ownership.get(id);
      if (previous !== undefined) {
        throw new GovernanceError(
          "INVALID_POLICY",
          `principal '${id}' cannot hold both ${previous} and ${group} authority`,
        );
      }
      ownership.set(id, group);
    }
  }
  return clone(policy);
}

function lineageKey(target: Pick<TemplateTarget, "namespace" | "templateId" | "templateVersion">): string {
  return `${target.namespace}\u0000${target.templateId}\u0000${target.templateVersion}`;
}

function targetKey(target: TemplateTarget): string {
  return `${lineageKey(target)}\u0000${target.templateHash}`;
}

function toTemplateRecord(record: MutableTemplateRecord): TemplateRecord {
  return clone({
    target: record.target,
    template: record.template,
    authorId: record.authorId,
    state: record.state,
    validationReport: record.validationReport,
    reviews: [...record.reviews.values()],
    lifecycle: record.lifecycle,
  });
}

function assertTargetShape(target: TemplateTarget): void {
  if (!TEMPLATE_HASH_PATTERN.test(target.templateHash)) {
    throw new GovernanceError(
      "TARGET_MISMATCH",
      "templateHash must be a lowercase 32-byte hexadecimal digest",
    );
  }
}

function assertReport(report: ValidationReportInput): void {
  assertIdentifier(report.toolId, "toolId", LABEL_PATTERN);
  if (
    typeof report.toolVersion !== "string" ||
    report.toolVersion.length === 0 ||
    report.toolVersion.trim() !== report.toolVersion
  ) {
    throw new GovernanceError(
      "INVALID_REPORT",
      "toolVersion must be a non-empty string without edge whitespace",
    );
  }
  if (!Array.isArray(report.findings)) {
    throw new GovernanceError("INVALID_REPORT", "findings must be an array");
  }
  for (const finding of report.findings) {
    assertIdentifier(finding.code, "finding code", LABEL_PATTERN);
    if (
      finding.severity !== "info" &&
      finding.severity !== "warning" &&
      finding.severity !== "critical"
    ) {
      throw new GovernanceError(
        "INVALID_REPORT",
        `finding '${finding.code}' has an invalid severity`,
      );
    }
    if (
      typeof finding.message !== "string" ||
      finding.message.length === 0 ||
      finding.message.trim() !== finding.message
    ) {
      throw new GovernanceError(
        "INVALID_REPORT",
        `finding '${finding.code}' must have a non-empty message`,
      );
    }
  }
}

function hasPrincipal(
  principals: readonly AuthorityPrincipal[],
  principalId: string,
): boolean {
  return principals.some((principal) => principal.principalId === principalId);
}

export class ScenarioGovernanceRegistry {
  readonly #policies = new Map<string, NamespacePolicy>();
  readonly #templates = new Map<string, MutableTemplateRecord>();
  readonly #activations = new Map<string, ActivationRecord>();
  readonly #retirements = new Map<string, RetirementRecord>();
  readonly #revocations = new Map<string, RevocationRecord>();
  readonly #instantiations = new Map<string, InstantiationAuthorization>();

  constructor(policies: readonly NamespacePolicy[]) {
    if (!Array.isArray(policies) || policies.length === 0) {
      throw new GovernanceError(
        "INVALID_POLICY",
        "at least one namespace policy is required",
      );
    }
    for (const input of policies) {
      const policy = validatePolicy(input);
      if (this.#policies.has(policy.namespace)) {
        throw new GovernanceError(
          "INVALID_POLICY",
          `duplicate policy for namespace '${policy.namespace}'`,
        );
      }
      this.#policies.set(policy.namespace, policy);
    }
  }

  getNamespacePolicy(namespace: string): NamespacePolicy {
    return clone(this.#policy(namespace));
  }

  createDraft(
    authorId: string,
    templateInput: unknown,
    createdAt: number,
  ): TemplateRecord {
    assertTime(createdAt, "createdAt");
    const template = parseScenarioTemplate(templateInput);
    const policy = this.#policy(template.namespace);
    this.#authorize(policy.authors, authorId, "author");
    const hash = hashScenarioTemplate(template).value;
    const target: TemplateTarget = {
      namespace: template.namespace,
      templateId: template.templateId,
      templateVersion: template.version,
      templateHash: hash,
    };
    const key = lineageKey(target);
    const existing = this.#templates.get(key);
    if (existing !== undefined) {
      if (existing.target.templateHash !== hash) {
        throw new GovernanceError(
          "VERSION_CONFLICT",
          `version '${template.version}' is already bound to another content hash`,
        );
      }
      throw new GovernanceError(
        "VERSION_CONFLICT",
        `version '${template.version}' is already registered`,
      );
    }
    const record: MutableTemplateRecord = {
      target,
      template,
      authorId,
      state: "draft",
      validationReport: null,
      reviews: new Map(),
      lifecycle: [
        { state: "draft", actorId: authorId, occurredAt: createdAt, reason: null },
      ],
    };
    this.#templates.set(key, record);
    return toTemplateRecord(record);
  }

  recordValidation(
    authorId: string,
    target: TemplateTarget,
    reportInput: ValidationReportInput,
    reportedAt: number,
  ): TemplateRecord {
    assertTime(reportedAt, "reportedAt");
    assertReport(reportInput);
    const record = this.#record(target);
    this.#assertRecordAuthor(record, authorId);
    this.#assertState(record, "draft");
    this.#assertMonotonicTime(record, reportedAt);
    const report: ValidationReport = clone({
      ...reportInput,
      target: record.target,
      submittedBy: authorId,
      reportedAt,
      grantsTrust: false as const,
    });
    record.validationReport = report;
    this.#transition(record, "validated", authorId, reportedAt, null);
    return toTemplateRecord(record);
  }

  submitForReview(
    authorId: string,
    target: TemplateTarget,
    submittedAt: number,
  ): TemplateRecord {
    assertTime(submittedAt, "submittedAt");
    const record = this.#record(target);
    this.#assertRecordAuthor(record, authorId);
    this.#assertState(record, "validated");
    this.#assertMonotonicTime(record, submittedAt);
    this.#transition(record, "in_review", authorId, submittedAt, null);
    return toTemplateRecord(record);
  }

  submitReview(attestationInput: ReviewerAttestation): TemplateRecord {
    const attestation = clone(attestationInput);
    assertTime(attestation.payload.reviewedAt, "reviewedAt");
    const record = this.#record(attestation.payload);
    this.#assertState(record, "in_review");
    const reviewStartedAt = record.lifecycle.at(-1)!.occurredAt;
    if (attestation.payload.reviewedAt < reviewStartedAt) {
      throw new GovernanceError(
        "INVALID_TIME",
        "reviewedAt cannot precede the in-review transition",
      );
    }
    const policy = this.#policy(record.target.namespace);
    const reviewer = policy.reviewers.find(
      (candidate) => candidate.principalId === attestation.payload.reviewerId,
    );
    if (reviewer === undefined) {
      throw new GovernanceError(
        "INELIGIBLE_REVIEWER",
        `reviewer '${attestation.payload.reviewerId}' is not eligible`,
      );
    }
    if (record.reviews.has(reviewer.principalId)) {
      throw new GovernanceError(
        "DUPLICATE_REVIEW",
        `reviewer '${reviewer.principalId}' has already reviewed this version`,
      );
    }
    if (!verifyReviewerAttestation(attestation, reviewer.publicKeyPem)) {
      throw new GovernanceError(
        "INVALID_ATTESTATION",
        `reviewer '${reviewer.principalId}' supplied an invalid signature`,
      );
    }
    record.reviews.set(reviewer.principalId, attestation);
    return toTemplateRecord(record);
  }

  activate(
    governanceId: string,
    target: TemplateTarget,
    activatedAt: number,
  ): ActivationRecord {
    assertTime(activatedAt, "activatedAt");
    const record = this.#record(target);
    const policy = this.#policy(record.target.namespace);
    this.#authorize(
      policy.governanceAuthorities,
      governanceId,
      "governance",
    );
    this.#assertState(record, "in_review");
    this.#assertMonotonicTime(record, activatedAt);
    const reviews = [...record.reviews.values()];
    const rejection = reviews.find(
      (attestation) => attestation.payload.decision === "reject",
    );
    if (rejection !== undefined) {
      throw new GovernanceError(
        "REVIEW_REJECTED",
        `reviewer '${rejection.payload.reviewerId}' rejected this version`,
      );
    }
    const approvals = reviews
      .filter((attestation) => attestation.payload.decision === "approve")
      .map((attestation) => attestation.payload.reviewerId)
      .sort();
    if (approvals.length < policy.reviewThreshold) {
      throw new GovernanceError(
        "THRESHOLD_NOT_MET",
        `activation requires ${policy.reviewThreshold} unique approvals; received ${approvals.length}`,
      );
    }
    for (const review of reviews) {
      if (review.payload.reviewedAt > activatedAt) {
        throw new GovernanceError(
          "INVALID_TIME",
          "activatedAt cannot precede a submitted review",
        );
      }
    }
    const activation: ActivationRecord = clone({
      ...record.target,
      activatedBy: governanceId,
      activatedAt,
      approvalReviewerIds: approvals,
      reviewThreshold: policy.reviewThreshold,
    });
    this.#activations.set(targetKey(record.target), activation);
    this.#transition(record, "active", governanceId, activatedAt, null);
    return clone(activation);
  }

  retire(
    governanceId: string,
    target: TemplateTarget,
    retiredAt: number,
  ): RetirementRecord {
    assertTime(retiredAt, "retiredAt");
    const record = this.#record(target);
    const policy = this.#policy(record.target.namespace);
    this.#authorize(
      policy.governanceAuthorities,
      governanceId,
      "governance",
    );
    this.#assertState(record, "active");
    this.#assertMonotonicTime(record, retiredAt);
    this.#assertProspectiveTermination(record, retiredAt);
    const retirement: RetirementRecord = clone({
      ...record.target,
      retiredBy: governanceId,
      retiredAt,
    });
    this.#retirements.set(targetKey(record.target), retirement);
    this.#transition(record, "retired", governanceId, retiredAt, null);
    return clone(retirement);
  }

  revoke(
    emergencyRevokerId: string,
    target: TemplateTarget,
    reason: string,
    effectiveAt: number,
  ): RevocationRecord {
    assertTime(effectiveAt, "effectiveAt");
    if (
      typeof reason !== "string" ||
      reason.length === 0 ||
      reason.trim() !== reason
    ) {
      throw new GovernanceError(
        "INVALID_REPORT",
        "revocation reason must be a non-empty string",
      );
    }
    const record = this.#record(target);
    const policy = this.#policy(record.target.namespace);
    this.#authorize(
      policy.emergencyRevokers,
      emergencyRevokerId,
      "emergency revocation",
    );
    if (record.state !== "active" && record.state !== "retired") {
      throw new GovernanceError(
        "INVALID_TRANSITION",
        `cannot revoke a template in '${record.state}' state`,
      );
    }
    this.#assertMonotonicTime(record, effectiveAt);
    this.#assertProspectiveTermination(record, effectiveAt);
    const revocation: RevocationRecord = clone({
      ...record.target,
      revokedBy: emergencyRevokerId,
      effectiveAt,
      behavior: "prospective" as const,
      reason,
    });
    this.#revocations.set(targetKey(record.target), revocation);
    this.#transition(
      record,
      "revoked",
      emergencyRevokerId,
      effectiveAt,
      reason,
    );
    return clone(revocation);
  }

  authorizeInstantiation(
    allocatorId: string,
    target: TemplateTarget,
    requestId: string,
    authorizedAt: number,
  ): InstantiationAuthorization {
    assertTime(authorizedAt, "authorizedAt");
    assertIdentifier(requestId, "requestId", LABEL_PATTERN);
    const record = this.#record(target);
    const policy = this.#policy(record.target.namespace);
    this.#authorize(policy.allocators, allocatorId, "allocator");
    if (record.state === "retired") {
      throw new GovernanceError(
        "RETIRED",
        "retired versions cannot authorize new instances",
      );
    }
    if (record.state === "revoked") {
      throw new GovernanceError(
        "REVOKED",
        "revoked versions cannot authorize new instances",
      );
    }
    if (record.state !== "active") {
      throw new GovernanceError(
        "NOT_ACTIVE",
        `template is '${record.state}', not active`,
      );
    }
    this.#assertMonotonicTime(record, authorizedAt);
    if (this.#instantiations.has(requestId)) {
      throw new GovernanceError(
        "REQUEST_CONFLICT",
        `requestId '${requestId}' has already been authorized`,
      );
    }
    const authorization: InstantiationAuthorization = clone({
      ...record.target,
      requestId,
      allocatorId,
      authorizedAt,
    });
    this.#instantiations.set(requestId, authorization);
    return clone(authorization);
  }

  getTemplate(target: TemplateTarget): TemplateRecord {
    return toTemplateRecord(this.#record(target));
  }

  getActivationRecord(target: TemplateTarget): ActivationRecord | null {
    this.#record(target);
    return clone(this.#activations.get(targetKey(target)) ?? null);
  }

  getRetirementRecord(target: TemplateTarget): RetirementRecord | null {
    this.#record(target);
    return clone(this.#retirements.get(targetKey(target)) ?? null);
  }

  getRevocationRecord(target: TemplateTarget): RevocationRecord | null {
    this.#record(target);
    return clone(this.#revocations.get(targetKey(target)) ?? null);
  }

  getInstantiationAuthorization(
    requestId: string,
  ): InstantiationAuthorization | null {
    return clone(this.#instantiations.get(requestId) ?? null);
  }

  listActiveVersions(namespace: string): readonly ActivationRecord[] {
    this.#policy(namespace);
    return [...this.#templates.values()]
      .filter(
        (record) =>
          record.target.namespace === namespace && record.state === "active",
      )
      .map((record) => this.#activations.get(targetKey(record.target))!)
      .sort((left, right) =>
        `${left.templateId}\u0000${left.templateVersion}`.localeCompare(
          `${right.templateId}\u0000${right.templateVersion}`,
        ),
      )
      .map(clone);
  }

  #policy(namespace: string): NamespacePolicy {
    const policy = this.#policies.get(namespace);
    if (policy === undefined) {
      throw new GovernanceError(
        "UNKNOWN_NAMESPACE",
        `namespace '${namespace}' has no governance policy`,
      );
    }
    return policy;
  }

  #record(target: TemplateTarget): MutableTemplateRecord {
    assertTargetShape(target);
    const record = this.#templates.get(lineageKey(target));
    if (record === undefined) {
      throw new GovernanceError(
        "UNKNOWN_TEMPLATE",
        `template '${target.templateId}@${target.templateVersion}' is unknown`,
      );
    }
    if (record.target.templateHash !== target.templateHash) {
      throw new GovernanceError(
        "TARGET_MISMATCH",
        "template hash does not match the registered version",
      );
    }
    return record;
  }

  #authorize(
    principals: readonly AuthorityPrincipal[],
    principalId: string,
    authority: string,
  ): void {
    if (!hasPrincipal(principals, principalId)) {
      throw new GovernanceError(
        "UNAUTHORIZED",
        `principal '${principalId}' lacks ${authority} authority`,
      );
    }
  }

  #assertRecordAuthor(
    record: MutableTemplateRecord,
    principalId: string,
  ): void {
    const policy = this.#policy(record.target.namespace);
    this.#authorize(policy.authors, principalId, "author");
    if (record.authorId !== principalId) {
      throw new GovernanceError(
        "UNAUTHORIZED",
        `only draft author '${record.authorId}' may advance this draft`,
      );
    }
  }

  #assertState(
    record: MutableTemplateRecord,
    expected: TemplateLifecycleState,
  ): void {
    if (record.state !== expected) {
      throw new GovernanceError(
        "INVALID_TRANSITION",
        `expected '${expected}' state, received '${record.state}'`,
      );
    }
  }

  #assertMonotonicTime(
    record: MutableTemplateRecord,
    occurredAt: number,
  ): void {
    const previous = record.lifecycle.at(-1)!.occurredAt;
    if (occurredAt < previous) {
      throw new GovernanceError(
        "INVALID_TIME",
        `event time ${occurredAt} precedes previous event time ${previous}`,
      );
    }
  }

  #assertProspectiveTermination(
    record: MutableTemplateRecord,
    effectiveAt: number,
  ): void {
    const latestAuthorization = [...this.#instantiations.values()]
      .filter(
        (authorization) =>
          targetKey(authorization) === targetKey(record.target),
      )
      .reduce(
        (latest, authorization) =>
          Math.max(latest, authorization.authorizedAt),
        -1,
      );
    if (effectiveAt < latestAuthorization) {
      throw new GovernanceError(
        "INVALID_TIME",
        `prospective termination at ${effectiveAt} precedes an instantiation authorization at ${latestAuthorization}`,
      );
    }
  }

  #transition(
    record: MutableTemplateRecord,
    state: TemplateLifecycleState,
    actorId: string,
    occurredAt: number,
    reason: string | null,
  ): void {
    record.state = state;
    record.lifecycle.push({ state, actorId, occurredAt, reason });
  }
}
