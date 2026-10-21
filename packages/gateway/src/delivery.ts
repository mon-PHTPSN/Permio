import { getAddress, keccak256, type Address } from "viem";
import type { LocalAccount } from "viem/accounts";
import type { DecisionReceipt } from "../../midnight-authorization/src/decision-receipt.ts";
import { GatewayStore } from "./durable-store.ts";
import { encodeM6ReceiptV1, m6SourceIdentityHash } from "./m6-receipt-codec.ts";
import { normalizeGatewayKeyEpochs, selectGatewaySigningKey } from "./key-rotation.ts";
import type { GatewayKeyEpoch } from "./model.ts";
import { deliverGatewayTransport, signGatewayTransport, verifyGatewayTransport, type GatewayTransport } from "./transport.ts";

export interface DurableGatewayDeliveryOptions {
  readonly store: GatewayStore;
  readonly endpoint: string;
  readonly chainId: bigint;
  readonly registry: Address;
  readonly now: () => number;
  readonly keyPolicy: () => { readonly epochs: readonly GatewayKeyEpoch[]; readonly forbiddenSigners: readonly Address[] };
  readonly signerFor: (epoch: GatewayKeyEpoch) => Promise<LocalAccount>;
  readonly request?: typeof fetch;
}

/** Persist before sending; keep exact bytes through overlap and rotate only after a known verification cutoff. */
export function createDurableGatewayDelivery(options: DurableGatewayDeliveryOptions) {
  const inflight = new Map<string, { readonly encodedReceipt: string; readonly result: Promise<{ readonly idempotencyKey: string }> }>();
  async function deliver(receipt: DecisionReceipt, key: `0x${string}`): Promise<{ readonly idempotencyKey: string }> {
    const now = options.now();
    if (!Number.isSafeInteger(now) || now < 0) throw Error("INVALID_DELIVERY_TIME");
    if (BigInt(now) < BigInt(receipt.validAfter) || BigInt(now) >= BigInt(receipt.validBefore)) throw Error("RECEIPT_OUTSIDE_VALIDITY");
    const encodedReceipt = encodeM6ReceiptV1(receipt), outbox = options.store.outbox(key);
    if (!outbox || outbox.state === "rejected" || encodeM6ReceiptV1(outbox.receipt) !== encodedReceipt) throw Error("DELIVERY_SOURCE_MISMATCH");
    const policy = options.keyPolicy();
    const epochs = normalizeGatewayKeyEpochs(policy.epochs);
    const expected = { chainId: options.chainId, registry: getAddress(options.registry), outboxKey: key,
      sourceIdentityHash: m6SourceIdentityHash(receipt), receiptHash: keccak256(encodedReceipt), epochs,
      forbiddenSigners: policy.forbiddenSigners };
    const history = options.store.transports(key, String(options.chainId), options.registry);
    for (const saved of history) {
      const epoch = epochs.find(candidate => candidate.keyId === saved.keyId);
      if (!epoch) throw Error("SAVED_TRANSPORT_KEY_NOT_CONFIGURED");
      await verifyGatewayTransport(saved, { ...expected, verifiedAt: Math.min(now, epoch.verificationCutoff - 1) });
    }
    let packet: GatewayTransport | undefined = history.at(-1);
    const previousEpoch = packet && epochs.find(epoch => epoch.keyId === packet!.keyId)!;
    if (!packet || previousEpoch && now >= previousEpoch.verificationCutoff) {
      const epoch = selectGatewaySigningKey(epochs, now);
      const account = await options.signerFor(epoch);
      const signed = await signGatewayTransport({ ...expected, account, encodedReceipt, signedAt: now });
      packet = options.store.persistTransport(signed);
    }
    const current = options.keyPolicy();
    const dispatchTime = options.now();
    if (!Number.isSafeInteger(dispatchTime) || dispatchTime < 0) throw Error("INVALID_DELIVERY_TIME");
    await verifyGatewayTransport(packet, { ...expected, epochs: current.epochs, forbiddenSigners: current.forbiddenSigners, verifiedAt: dispatchTime });
    if (BigInt(dispatchTime) < BigInt(receipt.validAfter) || BigInt(dispatchTime) >= BigInt(receipt.validBefore)) throw Error("RECEIPT_OUTSIDE_VALIDITY");
    const acknowledgement = await deliverGatewayTransport(options.endpoint, packet, options.request);
    return { idempotencyKey: acknowledgement.outboxKey };
  }
  return (receipt: DecisionReceipt, key: `0x${string}`): Promise<{ readonly idempotencyKey: string }> => {
    const existing = inflight.get(key);
    if (existing) {
      try { if (encodeM6ReceiptV1(receipt) !== existing.encodedReceipt) return Promise.reject(Error("DELIVERY_SOURCE_MISMATCH")); }
      catch (error) { return Promise.reject(error); }
      return existing.result;
    }
    let encodedReceipt: string;
    try { encodedReceipt = encodeM6ReceiptV1(receipt); } catch (error) { return Promise.reject(error); }
    const pending = deliver(receipt, key).finally(() => { inflight.delete(key); });
    inflight.set(key, { encodedReceipt, result: pending });
    return pending;
  };
}
