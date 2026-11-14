import { createHash } from "node:crypto";

import { encodeCanonical } from "@permio/protocol";
import { hashScenarioTemplate, type ScenarioTemplate } from "@permio/scenario-domain";
import type {
  ActivationRecord,
  NamespacePolicy,
  ReviewerAttestation,
  TemplateRecord,
} from "@permio/scenario-governance";

import {
  ACTIVATION_ADMISSION_DOMAIN,
  ACTIVATION_ADMISSION_ENVELOPE_VERSION,
  MIDNIGHT_GOVERNANCE_SIGNATURE_PROFILE,
  MIDNIGHT_REGISTRY_PROTOCOL_VERSION,
  type ActivationAdmissionArtifact,
  type ActivationAdmissionEnvelope,
  type ActivationAdmissionInput,
  type Hex32,
  type IndexedProofModuleBinding,
  type ProofModuleBinding,
  type ProofModuleBindingManifest,
} from "./model.ts";
import { buildProofModuleBindingTree } from "./binding-manifest.ts";

const HEX32_PATTERN = /^0x[0-9a-f]{64}$/;
const SEMANTIC_VERSION_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function sha256(bytes: Uint8Array): Hex32 {
  return `0x${createHash("sha256").update(bytes).digest("hex")}`;
}

function assertHex32(value: string, label: string): asserts value is Hex32 {
  if (!HEX32_PATTERN.test(value)) {
    throw new TypeError(`${label} must be a lowercase 32-byte hexadecimal digest`);
  }
}

function assertSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer`);
  }
}

function assertText(value: string, label: string): void {
  if (value.length === 0 || value !== value.trim() || value !== value.normalize("NFC")) {
    throw new TypeError(`${label} must be non-empty, NFC-normalized text without edge whitespace`);
  }
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Readonly<Record<string, unknown>>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  if (typeof value === "string") {
    return JSON.stringify(value.normalize("NFC"));
  }
  return JSON.stringify(value);
}

function targetFields(target: ActivationRecord): readonly string[] {
  return [
    target.namespace.normalize("NFC"),
    target.templateId.normalize("NFC"),
    target.templateVersion,
    target.templateHash,
  ];
}

export function hashProtocolIdentifier(
  kind: "namespace" | "template-id" | "network-id" | "contract-identity",
  value: string,
): Hex32 {
  assertText(value, kind);
  return sha256(encodeCanonical(`permio:${kind}:v1`, [value]));
}

export function hashM4ActivationRecord(activation: ActivationRecord): Hex32 {
  assertActivationRecord(activation);
  return sha256(
    encodeCanonical("permio:m4-activation-record:v1", [
      ...targetFields(activation),
      activation.activatedBy.normalize("NFC"),
      activation.activatedAt.toString(10),
      activation.reviewThreshold.toString(10),
      ...activation.approvalReviewerIds,
    ]),
  );
}

export function hashNamespacePolicy(policy: NamespacePolicy): Hex32 {
  return sha256(
    encodeCanonical("permio:namespace-policy:v1", [
      canonicalJson(policy),
    ]),
  );
}

export function hashApprovalEvidence(
  activation: ActivationRecord,
  attestations: readonly ReviewerAttestation[],
): Hex32 {
  assertActivationRecord(activation);
  const approvals = attestations
    .filter((attestation) => attestation.payload.decision === "approve")
    .sort((left, right) =>
      left.payload.reviewerId.localeCompare(right.payload.reviewerId),
    );
  const reviewerIds = approvals.map((attestation) => attestation.payload.reviewerId);
  if (new Set(reviewerIds).size !== reviewerIds.length) {
    throw new TypeError("approval evidence contains duplicate reviewer IDs");
  }
  if (canonicalJson(reviewerIds) !== canonicalJson(activation.approvalReviewerIds)) {
    throw new TypeError("approval evidence does not match the M4 activation record");
  }
  for (const attestation of approvals) {
    const payload = attestation.payload;
    if (
      payload.namespace !== activation.namespace ||
      payload.templateId !== activation.templateId ||
      payload.templateVersion !== activation.templateVersion ||
      payload.templateHash !== activation.templateHash
    ) {
      throw new TypeError("approval evidence targets a different template version or hash");
    }
  }
  return sha256(
    encodeCanonical("permio:m4-approval-evidence:v1", [
      hashM4ActivationRecord(activation),
      ...approvals.map((attestation) => canonicalJson(attestation)),
    ]),
  );
}

function bindingSortKey(binding: ProofModuleBinding): string {
  return `${binding.actionId}\u0000${binding.proofProfileId}`;
}

export function orderProofModuleBindings(
  template: ScenarioTemplate,
  manifest: ProofModuleBindingManifest,
): readonly IndexedProofModuleBinding[] {
  if (manifest.manifestVersion !== 1 || !Array.isArray(manifest.bindings)) {
    throw new TypeError("unsupported proof-module binding manifest");
  }
  const expected = new Map(
    template.actions.map((action) => [
      `${action.id}\u0000${action.proofProfileId}`,
      action,
    ]),
  );
  const seen = new Set<string>();
  for (const binding of manifest.bindings) {
    const key = bindingSortKey(binding);
    if (!expected.has(key)) {
      throw new TypeError(`proof-module binding '${key}' does not match a template action`);
    }
    if (seen.has(key)) {
      throw new TypeError(`duplicate proof-module binding '${key}'`);
    }
    seen.add(key);
    assertText(binding.moduleId, "moduleId");
    assertText(binding.moduleVersion, "moduleVersion");
    assertHex32(binding.implementationHash, "implementationHash");
    assertHex32(binding.configurationHash, "configurationHash");
    assertHex32(binding.receiptSchemaHash, "receiptSchemaHash");
  }
  if (seen.size !== expected.size) {
    throw new TypeError("every template action must have exactly one proof-module binding");
  }
  return template.actions.map((action, actionIndex) => {
    const binding = manifest.bindings.find(
      (candidate) =>
        bindingSortKey(candidate) ===
        `${action.id}\u0000${action.proofProfileId}`,
    );
    if (binding === undefined) {
      throw new TypeError(
        "every template action must have exactly one proof-module binding",
      );
    }
    return { ...binding, actionIndex };
  });
}

export function hashProofModuleBindingManifest(
  template: ScenarioTemplate,
  manifest: ProofModuleBindingManifest,
): Hex32 {
  const bindings = orderProofModuleBindings(template, manifest);
  return sha256(
    encodeCanonical("permio:proof-module-bindings:v1", [
      canonicalJson({
        manifestVersion: manifest.manifestVersion,
        bindings: bindings.map(
          ({ actionIndex: _actionIndex, ...binding }) => binding,
        ),
      }),
    ]),
  );
}

export function assertActivationRecord(activation: ActivationRecord): void {
  assertText(activation.namespace, "namespace");
  assertText(activation.templateId, "templateId");
  if (!SEMANTIC_VERSION_PATTERN.test(activation.templateVersion)) {
    throw new TypeError("templateVersion must be a semantic version");
  }
  assertHex32(activation.templateHash, "templateHash");
  assertText(activation.activatedBy, "activatedBy");
  assertSafeInteger(activation.activatedAt, "activatedAt");
  if (!Number.isSafeInteger(activation.reviewThreshold) || activation.reviewThreshold < 1) {
    throw new TypeError("reviewThreshold must be a positive safe integer");
  }
  const sorted = [...activation.approvalReviewerIds].sort();
  if (
    new Set(sorted).size !== sorted.length ||
    canonicalJson(sorted) !== canonicalJson(activation.approvalReviewerIds) ||
    sorted.length < activation.reviewThreshold
  ) {
    throw new TypeError("activation approvals must be sorted, unique, and meet the recorded threshold");
  }
}

export function assertM4ActivationMatchesTemplate(
  activation: ActivationRecord,
  templateRecord: TemplateRecord,
): void {
  assertActivationRecord(activation);
  if (templateRecord.state !== "active") {
    throw new TypeError("the M4 template record must be active before Midnight admission");
  }
  const actualHash = hashScenarioTemplate(templateRecord.template).value;
  if (
    activation.namespace !== templateRecord.target.namespace ||
    activation.templateId !== templateRecord.target.templateId ||
    activation.templateVersion !== templateRecord.target.templateVersion ||
    activation.templateHash !== templateRecord.target.templateHash ||
    actualHash !== activation.templateHash
  ) {
    throw new TypeError("M4 activation does not match the exact validated template content");
  }
}

export function serializeActivationAdmissionEnvelope(
  envelope: ActivationAdmissionEnvelope,
): Uint8Array {
  return encodeCanonical(ACTIVATION_ADMISSION_DOMAIN, [
    envelope.envelopeVersion.toString(10),
    envelope.signatureProfile,
    envelope.namespaceHash,
    envelope.templateIdHash,
    envelope.semanticVersion,
    envelope.templateContentHash,
    envelope.governancePolicyHash,
    envelope.proofModuleBindingsHash,
    envelope.proofModuleBindingRoot,
    envelope.proofModuleBindingCount.toString(10),
    envelope.proofModuleRegistrySequence.toString(10),
    envelope.m4ActivationRecordHash,
    envelope.approvalEvidenceCommitment,
    envelope.authorityRootVersion.toString(10),
    envelope.authorityRootSequence.toString(10),
    envelope.targetNetworkId,
    envelope.targetContractIdentity,
    envelope.registryProtocolVersion,
    envelope.admissionNonce,
    envelope.activatedAt.toString(10),
    envelope.stagingExpiresAt.toString(10),
  ]);
}

export function createActivationAdmissionArtifact(
  templateRecord: TemplateRecord,
  input: ActivationAdmissionInput,
): ActivationAdmissionArtifact {
  assertM4ActivationMatchesTemplate(input.activation, templateRecord);
  assertHex32(input.governancePolicyHash, "governancePolicyHash");
  assertHex32(input.approvalEvidenceCommitment, "approvalEvidenceCommitment");
  assertHex32(input.admissionNonce, "admissionNonce");
  assertSafeInteger(input.authorityRootVersion, "authorityRootVersion");
  assertSafeInteger(input.authorityRootSequence, "authorityRootSequence");
  assertSafeInteger(
    input.proofModuleRegistrySequence,
    "proofModuleRegistrySequence",
  );
  assertText(input.targetNetworkId, "targetNetworkId");
  assertHex32(input.targetContractIdentity, "targetContractIdentity");
  assertSafeInteger(input.stagingExpiresAt, "stagingExpiresAt");
  if (input.stagingExpiresAt <= input.activation.activatedAt) {
    throw new TypeError("stagingExpiresAt must be later than activatedAt");
  }

  const activation = input.activation;
  const bindings = orderProofModuleBindings(
    templateRecord.template,
    input.proofModuleBindings,
  );
  const bindingTree = buildProofModuleBindingTree(bindings);
  const envelope: ActivationAdmissionEnvelope = {
    envelopeVersion: ACTIVATION_ADMISSION_ENVELOPE_VERSION,
    signatureProfile: MIDNIGHT_GOVERNANCE_SIGNATURE_PROFILE,
    namespaceHash: hashProtocolIdentifier("namespace", activation.namespace),
    templateIdHash: hashProtocolIdentifier("template-id", activation.templateId),
    semanticVersion: activation.templateVersion,
    templateContentHash: activation.templateHash,
    governancePolicyHash: input.governancePolicyHash,
    proofModuleBindingsHash: hashProofModuleBindingManifest(
      templateRecord.template,
      input.proofModuleBindings,
    ),
    proofModuleBindingRoot: bindingTree.rootHex,
    proofModuleBindingCount: bindings.length,
    proofModuleRegistrySequence: input.proofModuleRegistrySequence,
    m4ActivationRecordHash: hashM4ActivationRecord(activation),
    approvalEvidenceCommitment: input.approvalEvidenceCommitment,
    authorityRootVersion: input.authorityRootVersion,
    authorityRootSequence: input.authorityRootSequence,
    targetNetworkId: input.targetNetworkId,
    targetContractIdentity: input.targetContractIdentity,
    registryProtocolVersion: MIDNIGHT_REGISTRY_PROTOCOL_VERSION,
    admissionNonce: input.admissionNonce,
    activatedAt: activation.activatedAt,
    stagingExpiresAt: input.stagingExpiresAt,
  };
  return {
    envelope,
    envelopeHash: sha256(serializeActivationAdmissionEnvelope(envelope)),
    bindings,
  };
}
