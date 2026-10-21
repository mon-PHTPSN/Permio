import { randomBytes } from "node:crypto";

import {
  ecAdd,
  ecMul,
  ecMulGenerator,
  type JubjubPoint,
} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import {
  Contract,
  pureCircuits,
  type ActivationAdmissionEnvelope as CompactActivationAdmissionEnvelope,
  type AuthorityRootUpdateCommand,
  type ProofModuleLifecycleCommand,
  type ProofModuleReview,
  type RuntimeAccountCredential,
  type RuntimeActionIntent,
  type RuntimeCapabilityCredential,
  type RuntimeSessionCredential,
  type RuntimeCredentialStatusCommand,
  type RuntimeInstanceAllocation,
  type RuntimeSlotCommand,
  type RuntimeActionCommand,
  type TemplateLifecycleCommand,
  type Witnesses,
} from "../contracts/managed/permio-authorization/contract/index.js";
import { parseSemanticVersion } from "@permio/scenario-domain";

import { hashProtocolIdentifier } from "./canonical.ts";
import { merkleDigestFromHex } from "./binding-manifest.ts";
import { decodeHex32 as hex32Bytes } from "./hex32.ts";
import {
  MIDNIGHT_GOVERNANCE_SIGNATURE_PROFILE,
  MIDNIGHT_REGISTRY_PROTOCOL_VERSION,
  type ActivationAdmissionEnvelope,
  type Hex32,
} from "./model.ts";

export const JUBJUB_SCALAR_ORDER =
  6554484396890773809930967563523245729705921265872317281365359162392183254199n;
export const TWO_TO_248 =
  452312848583266388373324160190187140051835877600158453279131187530910662656n;

export interface GovernanceActivationSignature {
  readonly announcement: JubjubPoint;
  readonly response: bigint;
}
export const MIDNIGHT_AUTHORITY_KINDS = {
  author: 1n,
  reviewer: 2n,
  governanceActivator: 3n,
  allocator: 4n,
  emergencyRevoker: 5n,
  capabilityIssuer: 6n,
  proofModuleReviewer: 7n,
  proofModuleApprover: 8n,
  proofModuleActivator: 9n,
  proofModuleEmergencyRevoker: 10n,
  authorityRootGovernor: 11n,
  templateRetirer: 12n,
  participantSlotGovernor: 13n,
} as const;

export const permioAuthorizationWitnesses: Witnesses<undefined> = {
  getSchnorrReduction(context, challengeHash) {
    return [
      context.privateState,
      [challengeHash / TWO_TO_248, challengeHash % TWO_TO_248],
    ];
  },
};

export function createPermioAuthorizationContract(): Contract<undefined> {
  return new Contract<undefined>(permioAuthorizationWitnesses);
}

function compactIdentifierHash(
  kind: "network-id" | "contract-identity",
  value: string,
): Uint8Array {
  return hex32Bytes(hashProtocolIdentifier(kind, value));
}

export function toCompactActivationAdmissionEnvelope(
  envelope: ActivationAdmissionEnvelope,
): CompactActivationAdmissionEnvelope {
  if (envelope.signatureProfile !== MIDNIGHT_GOVERNANCE_SIGNATURE_PROFILE) {
    throw new TypeError("Unsupported governance signature profile");
  }
  if (envelope.registryProtocolVersion !== MIDNIGHT_REGISTRY_PROTOCOL_VERSION) {
    throw new TypeError("Unsupported registry protocol version");
  }
  const semanticVersion = parseSemanticVersion(envelope.semanticVersion);
  return {
    envelopeVersion: BigInt(envelope.envelopeVersion),
    namespaceHash: hex32Bytes(envelope.namespaceHash),
    templateIdHash: hex32Bytes(envelope.templateIdHash),
    semanticVersion: {
      major: BigInt(semanticVersion.major),
      minor: BigInt(semanticVersion.minor),
      patch: BigInt(semanticVersion.patch),
    },
    templateContentHash: hex32Bytes(envelope.templateContentHash),
    governancePolicyHash: hex32Bytes(envelope.governancePolicyHash),
    proofModuleBindingsHash: hex32Bytes(envelope.proofModuleBindingsHash),
    proofModuleBindingRoot: merkleDigestFromHex(
      envelope.proofModuleBindingRoot,
    ),
    proofModuleBindingCount: BigInt(envelope.proofModuleBindingCount),
    proofModuleRegistrySequence: BigInt(
      envelope.proofModuleRegistrySequence,
    ),
    m4ActivationRecordHash: hex32Bytes(envelope.m4ActivationRecordHash),
    approvalEvidenceCommitment: hex32Bytes(
      envelope.approvalEvidenceCommitment,
    ),
    authorityRootVersion: BigInt(envelope.authorityRootVersion),
    authorityRootSequence: BigInt(envelope.authorityRootSequence),
    targetNetworkHash: compactIdentifierHash(
      "network-id",
      envelope.targetNetworkId,
    ),
    targetContractIdentity: hex32Bytes(envelope.targetContractIdentity),
    registryProtocolVersion: 1n,
    admissionNonce: hex32Bytes(envelope.admissionNonce),
    activatedAt: BigInt(envelope.activatedAt),
    stagingExpiresAt: BigInt(envelope.stagingExpiresAt),
  };
}

function assertScalar(value: bigint, label: string): void {
  if (value <= 0n || value >= JUBJUB_SCALAR_ORDER) {
    throw new RangeError(`${label} must be a non-zero Jubjub scalar`);
  }
}

function randomScalar(): bigint {
  let value = 0n;
  while (value === 0n) {
    value = BigInt(`0x${randomBytes(32).toString("hex")}`) % JUBJUB_SCALAR_ORDER;
  }
  return value;
}

export function governanceActivatorPublicKey(secret: bigint): JubjubPoint {
  assertScalar(secret, "governance activator secret");
  return ecMulGenerator(secret);
}

export function signActivationAdmissionEnvelope(
  envelope: CompactActivationAdmissionEnvelope,
  secret: bigint,
  nonce = randomScalar(),
): GovernanceActivationSignature {
  assertScalar(secret, "governance activator secret");
  assertScalar(nonce, "signature nonce");
  const publicKey = governanceActivatorPublicKey(secret);
  const announcement = ecMulGenerator(nonce);
  const fullChallenge = pureCircuits.governanceActivationSignatureChallenge(
    announcement,
    publicKey,
    envelope,
  );
  const challenge = fullChallenge % TWO_TO_248;
  return {
    announcement,
    response: (nonce + challenge * secret) % JUBJUB_SCALAR_ORDER,
  };
}

export function signProofModuleReview(
  review: ProofModuleReview,
  secret: bigint,
  nonce = randomScalar(),
): GovernanceActivationSignature {
  assertScalar(secret, "proof-module reviewer secret");
  assertScalar(nonce, "signature nonce");
  const publicKey = governanceActivatorPublicKey(secret);
  const announcement = ecMulGenerator(nonce);
  const fullChallenge = pureCircuits.proofModuleReviewSignatureChallenge(
    announcement,
    publicKey,
    review,
  );
  const challenge = fullChallenge % TWO_TO_248;
  return {
    announcement,
    response: (nonce + challenge * secret) % JUBJUB_SCALAR_ORDER,
  };
}

export function signProofModuleLifecycleCommand(
  command: ProofModuleLifecycleCommand,
  secret: bigint,
  nonce = randomScalar(),
): GovernanceActivationSignature {
  assertScalar(secret, "proof-module governance secret");
  assertScalar(nonce, "signature nonce");
  const publicKey = governanceActivatorPublicKey(secret);
  const announcement = ecMulGenerator(nonce);
  const fullChallenge = pureCircuits.proofModuleLifecycleSignatureChallenge(
    announcement,
    publicKey,
    command,
  );
  const challenge = fullChallenge % TWO_TO_248;
  return {
    announcement,
    response: (nonce + challenge * secret) % JUBJUB_SCALAR_ORDER,
  };
}

export function signAuthorityRootUpdateCommand(
  command: AuthorityRootUpdateCommand,
  secret: bigint,
  nonce = randomScalar(),
): GovernanceActivationSignature {
  assertScalar(secret, "authority-root governor secret");
  assertScalar(nonce, "signature nonce");
  const publicKey = governanceActivatorPublicKey(secret);
  const announcement = ecMulGenerator(nonce);
  const fullChallenge = pureCircuits.authorityRootUpdateSignatureChallenge(
    announcement,
    publicKey,
    command,
  );
  const challenge = fullChallenge % TWO_TO_248;
  return {
    announcement,
    response: (nonce + challenge * secret) % JUBJUB_SCALAR_ORDER,
  };
}

export function signTemplateLifecycleCommand(
  command: TemplateLifecycleCommand,
  secret: bigint,
  nonce = randomScalar(),
): GovernanceActivationSignature {
  assertScalar(secret, "template lifecycle authority secret");
  assertScalar(nonce, "signature nonce");
  const publicKey = governanceActivatorPublicKey(secret);
  const announcement = ecMulGenerator(nonce);
  const fullChallenge = pureCircuits.templateLifecycleSignatureChallenge(
    announcement,
    publicKey,
    command,
  );
  const challenge = fullChallenge % TWO_TO_248;
  return {
    announcement,
    response: (nonce + challenge * secret) % JUBJUB_SCALAR_ORDER,
  };
}

type RuntimeSignedValue =
  | { readonly kind: "action-command"; readonly value: RuntimeActionCommand }
  | { readonly kind: "slot-command"; readonly value: RuntimeSlotCommand }
  | { readonly kind: "allocation"; readonly value: RuntimeInstanceAllocation }
  | { readonly kind: "account"; readonly value: RuntimeAccountCredential }
  | { readonly kind: "capability"; readonly value: RuntimeCapabilityCredential }
  | { readonly kind: "session"; readonly value: RuntimeSessionCredential }
  | { readonly kind: "intent"; readonly value: RuntimeActionIntent };

function runtimeSignatureChallenge(
  signed: RuntimeSignedValue,
  announcement: JubjubPoint,
  publicKey: JubjubPoint,
): bigint {
  switch (signed.kind) {
    case "action-command":
      return pureCircuits.runtimeActionCommandSignatureChallenge(announcement, publicKey, signed.value);
    case "slot-command":
      return pureCircuits.runtimeSlotCommandSignatureChallenge(announcement, publicKey, signed.value);
    case "allocation":
      return pureCircuits.runtimeInstanceAllocationSignatureChallenge(announcement, publicKey, signed.value);
    case "account":
      return pureCircuits.runtimeAccountCredentialSignatureChallenge(
        announcement,
        publicKey,
        signed.value,
      );
    case "capability":
      return pureCircuits.runtimeCapabilityCredentialSignatureChallenge(
        announcement,
        publicKey,
        signed.value,
      );
    case "session":
      return pureCircuits.runtimeSessionCredentialSignatureChallenge(
        announcement,
        publicKey,
        signed.value,
      );
    case "intent":
      return pureCircuits.runtimeActionIntentSignatureChallenge(
        announcement,
        publicKey,
        signed.value,
      );
  }
}

function signRuntimeValue(
  signed: RuntimeSignedValue,
  secret: bigint,
  nonce = randomScalar(),
): GovernanceActivationSignature {
  assertScalar(secret, "runtime credential secret");
  assertScalar(nonce, "signature nonce");
  const publicKey = governanceActivatorPublicKey(secret);
  const announcement = ecMulGenerator(nonce);
  const challenge = runtimeSignatureChallenge(
    signed,
    announcement,
    publicKey,
  ) % TWO_TO_248;
  return {
    announcement,
    response: (nonce + challenge * secret) % JUBJUB_SCALAR_ORDER,
  };
}

export function signRuntimeSlotCommand(command: RuntimeSlotCommand, secret: bigint, nonce = randomScalar()): GovernanceActivationSignature {
  return signRuntimeValue({ kind: "slot-command", value: command }, secret, nonce);
}

export function signRuntimeActionCommand(command: RuntimeActionCommand, secret: bigint, nonce = randomScalar()): GovernanceActivationSignature {
  return signRuntimeValue({ kind: "action-command", value: command }, secret, nonce);
}

export function signRuntimeInstanceAllocation(
  allocation: RuntimeInstanceAllocation,
  allocatorSecret: bigint,
  nonce?: bigint,
): GovernanceActivationSignature {
  return signRuntimeValue({ kind: "allocation", value: allocation }, allocatorSecret, nonce);
}

export function signRuntimeAccountCredential(
  credential: RuntimeAccountCredential,
  issuerSecret: bigint,
  nonce?: bigint,
): GovernanceActivationSignature {
  return signRuntimeValue(
    { kind: "account", value: credential },
    issuerSecret,
    nonce,
  );
}

export function signRuntimeCapabilityCredential(
  credential: RuntimeCapabilityCredential,
  issuerSecret: bigint,
  nonce?: bigint,
): GovernanceActivationSignature {
  return signRuntimeValue(
    { kind: "capability", value: credential },
    issuerSecret,
    nonce,
  );
}

export function signRuntimeSessionCredential(
  credential: RuntimeSessionCredential,
  accountSecret: bigint,
  nonce?: bigint,
): GovernanceActivationSignature {
  return signRuntimeValue(
    { kind: "session", value: credential },
    accountSecret,
    nonce,
  );
}

export function signRuntimeActionIntent(
  intent: RuntimeActionIntent,
  sessionSecret: bigint,
  nonce?: bigint,
): GovernanceActivationSignature {
  return signRuntimeValue(
    { kind: "intent", value: intent },
    sessionSecret,
    nonce,
  );
}

export function signRuntimeCredentialStatusCommand(
  command: RuntimeCredentialStatusCommand,
  authoritySecret: bigint,
  nonce = randomScalar(),
): GovernanceActivationSignature {
  assertScalar(authoritySecret, "credential-status authority secret");
  assertScalar(nonce, "signature nonce");
  const publicKey = governanceActivatorPublicKey(authoritySecret);
  const announcement = ecMulGenerator(nonce);
  const challenge = pureCircuits.runtimeCredentialStatusSignatureChallenge(
    announcement,
    publicKey,
    command,
  ) % TWO_TO_248;
  return {
    announcement,
    response: (nonce + challenge * authoritySecret) % JUBJUB_SCALAR_ORDER,
  };
}

export function verifyRuntimeSignature(
  signed: RuntimeSignedValue,
  signature: GovernanceActivationSignature,
  publicKey: JubjubPoint,
): boolean {
  if (
    signature.response < 0n ||
    signature.response >= JUBJUB_SCALAR_ORDER
  ) {
    return false;
  }
  const challenge = runtimeSignatureChallenge(
    signed,
    signature.announcement,
    publicKey,
  ) % TWO_TO_248;
  const expected = ecAdd(
    signature.announcement,
    ecMul(publicKey, challenge),
  );
  const actual = ecMulGenerator(signature.response);
  return actual.x === expected.x && actual.y === expected.y;
}
