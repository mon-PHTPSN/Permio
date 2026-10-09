import { keccak256, stringToHex, type Address, type Hex } from "viem";

export const EIP712_DOMAIN_NAME =
  "Permio Recipient-Bound Attestation Registry" as const;
export const EIP712_DOMAIN_VERSION = "1" as const;
export const ATTESTATION_PRIMARY_TYPE = "Attestation" as const;

export const ATTESTATION_FIELDS = [
  { name: "schemaId", type: "bytes32" },
  { name: "midnightNetworkIdHash", type: "bytes32" },
  { name: "midnightContractIdHash", type: "bytes32" },
  { name: "midnightTransactionIdHash", type: "bytes32" },
  { name: "actionCommitment", type: "bytes32" },
  { name: "scopedNullifier", type: "bytes32" },
  { name: "purposeHash", type: "bytes32" },
  { name: "recipient", type: "address" },
  { name: "issuedAt", type: "uint64" },
  { name: "expiresAt", type: "uint64" },
] as const;

export const ATTESTATION_TYPES = {
  Attestation: ATTESTATION_FIELDS,
} as const;

export const ATTESTATION_TYPE_STRING =
  "Attestation(bytes32 schemaId,bytes32 midnightNetworkIdHash,bytes32 midnightContractIdHash,bytes32 midnightTransactionIdHash,bytes32 actionCommitment,bytes32 scopedNullifier,bytes32 purposeHash,address recipient,uint64 issuedAt,uint64 expiresAt)" as const;

export const ATTESTATION_TYPEHASH = keccak256(
  stringToHex(ATTESTATION_TYPE_STRING),
);

export interface RecipientBoundAttestation {
  readonly schemaId: Hex;
  readonly midnightNetworkIdHash: Hex;
  readonly midnightContractIdHash: Hex;
  readonly midnightTransactionIdHash: Hex;
  readonly actionCommitment: Hex;
  readonly scopedNullifier: Hex;
  readonly purposeHash: Hex;
  readonly recipient: Address;
  readonly issuedAt: bigint;
  readonly expiresAt: bigint;
}

export function recipientBoundAttestationDomain(
  chainId: number,
  verifyingContract: Address,
) {
  return {
    name: EIP712_DOMAIN_NAME,
    version: EIP712_DOMAIN_VERSION,
    chainId,
    verifyingContract,
  } as const;
}
