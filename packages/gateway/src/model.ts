import type { Address, Hex } from "viem";

export const GATEWAY_OUTBOX_KEY_DOMAIN =
  "permio:gateway-outbox-key:v1" as const;

export interface MidnightSourceEventIdentity {
  readonly networkId: string;
  readonly contractId: string;
  readonly transactionId: string;
  readonly eventIndex: number;
  readonly ledgerSequence: bigint;
}

export interface ObservedPublicReceipt {
  readonly receiptVersion: string;
  readonly scopedNullifier: Hex;
  readonly encodedReceipt: Hex;
  readonly receiptHash: Hex;
}

export interface AllowlistedGatewaySource {
  readonly networkId: string;
  readonly contractId: string;
  readonly receiptVersions: readonly string[];
}

export interface GatewayKeyEpoch {
  readonly keyId: string;
  readonly verifier: Address;
  readonly activeFrom: number;
  readonly signingCutoff: number;
  readonly verificationCutoff: number;
}
