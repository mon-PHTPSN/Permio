import {
  createPrivateKey,
  createPublicKey,
  KeyObject,
  sign,
  verify,
} from "node:crypto";

import {
  REVIEWER_ATTESTATION_ALGORITHM,
  REVIEWER_ATTESTATION_DOMAIN,
  REVIEWER_ATTESTATION_VERSION,
  type ReviewerAttestation,
  type ReviewerAttestationPayload,
} from "./model.ts";

type SigningKey = KeyObject | string | Buffer;

function assertSafeTime(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("reviewedAt must be a non-negative safe integer");
  }
}

export function serializeReviewerAttestationPayload(
  payload: ReviewerAttestationPayload,
): Uint8Array {
  assertSafeTime(payload.reviewedAt);
  const canonicalPayload = JSON.stringify({
    attestationVersion: payload.attestationVersion,
    decision: payload.decision,
    namespace: payload.namespace.normalize("NFC"),
    reviewedAt: payload.reviewedAt,
    reviewerId: payload.reviewerId.normalize("NFC"),
    templateHash: payload.templateHash,
    templateId: payload.templateId.normalize("NFC"),
    templateVersion: payload.templateVersion,
  });
  const domain = Buffer.from(REVIEWER_ATTESTATION_DOMAIN, "utf8");
  const body = Buffer.from(canonicalPayload, "utf8");
  const domainLength = Buffer.alloc(4);
  const bodyLength = Buffer.alloc(4);
  domainLength.writeUInt32BE(domain.byteLength);
  bodyLength.writeUInt32BE(body.byteLength);
  return Buffer.concat([domainLength, domain, bodyLength, body]);
}

export function createReviewerAttestation(
  payload: ReviewerAttestationPayload,
  privateKey: SigningKey,
): ReviewerAttestation {
  if (payload.attestationVersion !== REVIEWER_ATTESTATION_VERSION) {
    throw new TypeError("unsupported reviewer attestation version");
  }
  if (payload.decision !== "approve" && payload.decision !== "reject") {
    throw new TypeError("decision must be 'approve' or 'reject'");
  }
  const key =
    privateKey instanceof KeyObject ? privateKey : createPrivateKey(privateKey);
  const signature = sign(
    null,
    serializeReviewerAttestationPayload(payload),
    key,
  ).toString("base64url");
  return {
    domain: REVIEWER_ATTESTATION_DOMAIN,
    algorithm: REVIEWER_ATTESTATION_ALGORITHM,
    payload: structuredClone(payload),
    signature,
  };
}

export function verifyReviewerAttestation(
  attestation: ReviewerAttestation,
  publicKey: SigningKey,
): boolean {
  if (
    attestation.domain !== REVIEWER_ATTESTATION_DOMAIN ||
    attestation.algorithm !== REVIEWER_ATTESTATION_ALGORITHM ||
    attestation.payload.attestationVersion !== REVIEWER_ATTESTATION_VERSION
  ) {
    return false;
  }
  try {
    const key =
      publicKey instanceof KeyObject ? publicKey : createPublicKey(publicKey);
    return verify(
      null,
      serializeReviewerAttestationPayload(attestation.payload),
      key,
      Buffer.from(attestation.signature, "base64url"),
    );
  } catch {
    return false;
  }
}
