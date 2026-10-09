import { keccak256, stringToHex, type Hex } from "viem";

export const PROTOCOL_VERSION = "permio.protocol.v1" as const;

export const SCHEMA_NAMES = {
  supportEligibility: "permio.support-eligibility.v1",
  reviewEligibleUnique: "permio.review-eligible-unique.v1",
  regulatoryBridge: "permio.regulatory-bridge.v1",
} as const;

export const PURPOSE_NAMES = {
  supportReplacement: "permio.support.replacement.v1",
  reviewPublication: "permio.review.publish.v1",
  regulatoryComplaintAssessment:
    "permio.regulatory.consumer-complaint-assessment.v1",
} as const;

export const RECEIPT_LIFETIMES_SECONDS = {
  supportEligibility: 900n,
  reviewEligibleUnique: 31_536_000n,
  regulatoryBridge: 604_800n,
} as const;

export const MIDNIGHT_NETWORK_LABELS = {
  local: "midnight-local-dev",
  public: "midnight-preprod",
} as const;

export const MONAD_CHAIN_IDS = {
  testnet: 10_143,
} as const;

export const COMMITMENT_DOMAINS = {
  reviewNullifier: "permio:review-nullifier:v1",
  supportNullifier: "permio:support-nullifier:v1",
  supportDecision: "permio:support-decision:v1",
  evidenceSet: "permio:evidence-set:v1",
  regulatoryBridge: "permio:regulatory-bridge:v2",
  relayNullifier: "permio:relay-nullifier:v1",
} as const;

export function hashUtf8(value: string): Hex {
  return keccak256(stringToHex(value));
}

export const SCHEMA_IDS = {
  supportEligibility: hashUtf8(SCHEMA_NAMES.supportEligibility),
  reviewEligibleUnique: hashUtf8(SCHEMA_NAMES.reviewEligibleUnique),
  regulatoryBridge: hashUtf8(SCHEMA_NAMES.regulatoryBridge),
} as const;

export const PURPOSE_HASHES = {
  supportReplacement: hashUtf8(PURPOSE_NAMES.supportReplacement),
  reviewPublication: hashUtf8(PURPOSE_NAMES.reviewPublication),
  regulatoryComplaintAssessment: hashUtf8(
    PURPOSE_NAMES.regulatoryComplaintAssessment,
  ),
} as const;

export const COMMITMENT_DOMAIN_HASHES = {
  reviewNullifier: hashUtf8(COMMITMENT_DOMAINS.reviewNullifier),
  supportNullifier: hashUtf8(COMMITMENT_DOMAINS.supportNullifier),
  supportDecision: hashUtf8(COMMITMENT_DOMAINS.supportDecision),
  evidenceSet: hashUtf8(COMMITMENT_DOMAINS.evidenceSet),
  regulatoryBridge: hashUtf8(COMMITMENT_DOMAINS.regulatoryBridge),
  relayNullifier: hashUtf8(COMMITMENT_DOMAINS.relayNullifier),
} as const;
