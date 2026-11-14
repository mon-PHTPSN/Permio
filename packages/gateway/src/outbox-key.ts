import { hexToBytes, type Hex } from "viem";

import { hashCanonical } from "@permio/protocol";

import { GATEWAY_OUTBOX_KEY_DOMAIN } from "./model.ts";
import type {
  MidnightSourceEventIdentity,
  ObservedPublicReceipt,
} from "./model.ts";

export function deriveGatewayOutboxKey(
  source: MidnightSourceEventIdentity,
  receipt: Pick<ObservedPublicReceipt, "receiptVersion" | "scopedNullifier">,
): Hex {
  return hashCanonical(GATEWAY_OUTBOX_KEY_DOMAIN, [
    source.networkId,
    source.contractId,
    source.transactionId,
    source.eventIndex.toString(10),
    receipt.receiptVersion,
    hexToBytes(receipt.scopedNullifier),
  ]);
}
