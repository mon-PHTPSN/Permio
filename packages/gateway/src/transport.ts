import { getAddress, hashTypedData, isAddress, keccak256, recoverTypedDataAddress, type Address, type Hex } from "viem";
import type { LocalAccount } from "viem/accounts";
import { gatewayVerifierIsAccepted, normalizeGatewayKeyEpochs, selectGatewaySigningKey } from "./key-rotation.ts";
import type { GatewayKeyEpoch } from "./model.ts";

/** Authentication of public bytes only. The observer must establish M6 authorization and finality first. */
export const GATEWAY_TRANSPORT_TYPES = { GatewayTransport: [
  { name: "outboxKey", type: "bytes32" }, { name: "sourceIdentityHash", type: "bytes32" },
  { name: "receiptHash", type: "bytes32" }, { name: "keyId", type: "string" },
  { name: "signedAt", type: "uint64" }, { name: "targetChainId", type: "uint256" },
  { name: "targetRegistry", type: "address" },
] } as const;
const KEYS = ["version", "outboxKey", "sourceIdentityHash", "receiptHash", "keyId", "signedAt", "targetChainId", "targetRegistry", "encodedReceipt", "signature"];
export interface GatewayTransport {
  readonly version: 1;
  readonly outboxKey: Hex;
  readonly sourceIdentityHash: Hex;
  readonly receiptHash: Hex;
  readonly keyId: string;
  readonly signedAt: number;
  readonly targetChainId: string;
  readonly targetRegistry: Address;
  readonly encodedReceipt: Hex;
  readonly signature: Hex;
}
interface Target { readonly chainId: bigint; readonly registry: Address; }
interface KeyPolicy { readonly epochs: readonly GatewayKeyEpoch[]; readonly forbiddenSigners: readonly Address[]; }
export class GatewayTransportError extends Error {
  readonly code: "INVALID_TRANSPORT" | "DELIVERY_UNAVAILABLE" | "DELIVERY_REJECTED";
  constructor(code: "INVALID_TRANSPORT" | "DELIVERY_UNAVAILABLE" | "DELIVERY_REJECTED") {
    super(code); this.name = "GatewayTransportError"; this.code = code;
  }
}
const invalid = (): never => { throw new GatewayTransportError("INVALID_TRANSPORT"); };
function bytes32(value: unknown): asserts value is Hex {
  if (typeof value !== "string" || !/^0x[0-9a-f]{64}$/u.test(value)) invalid();
}
function exactBytes(value: unknown): asserts value is Hex {
  if (typeof value !== "string" || !/^0x(?:[0-9a-f]{2})+$/u.test(value) || value.length > 2 * 1024 ** 2 + 2) invalid();
}
function timestamp(value: unknown): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) invalid();
}
function target(value: Target): void {
  if (typeof value.chainId !== "bigint" || value.chainId <= 0n || value.chainId >= 2n ** 256n ||
      !isAddress(value.registry, { strict: true }) || /^0x0{40}$/iu.test(value.registry)) invalid();
}
function separate(address: Address, policy: KeyPolicy) {
  if (policy.forbiddenSigners.some(forbidden => getAddress(forbidden) === getAddress(address))) invalid();
}
function typed(packet: Omit<GatewayTransport, "signature">) {
  return {
    domain: { name: "Permio Gateway Transport", version: "1", chainId: BigInt(packet.targetChainId), verifyingContract: packet.targetRegistry },
    types: GATEWAY_TRANSPORT_TYPES, primaryType: "GatewayTransport" as const,
    message: { outboxKey: packet.outboxKey, sourceIdentityHash: packet.sourceIdentityHash,
      receiptHash: packet.receiptHash, keyId: packet.keyId, signedAt: BigInt(packet.signedAt),
      targetChainId: BigInt(packet.targetChainId), targetRegistry: packet.targetRegistry },
  };
}

export async function signGatewayTransport(input: Target & KeyPolicy & {
  readonly account: LocalAccount; readonly outboxKey: Hex; readonly sourceIdentityHash: Hex;
  readonly encodedReceipt: Hex; readonly signedAt: number;
}): Promise<GatewayTransport> {
  try {
    target(input); bytes32(input.outboxKey); bytes32(input.sourceIdentityHash);
    exactBytes(input.encodedReceipt); timestamp(input.signedAt);
    const epoch = selectGatewaySigningKey(input.epochs, input.signedAt);
    if (getAddress(input.account.address) !== epoch.verifier) invalid();
    separate(input.account.address, input);
    const packet = Object.freeze({ version: 1 as const, outboxKey: input.outboxKey,
      sourceIdentityHash: input.sourceIdentityHash, receiptHash: keccak256(input.encodedReceipt),
      keyId: epoch.keyId, signedAt: input.signedAt, targetChainId: String(input.chainId),
      targetRegistry: getAddress(input.registry), encodedReceipt: input.encodedReceipt });
    const signature = await input.account.signTypedData(typed(packet));
    return Object.freeze({ ...packet, signature });
  } catch { throw new GatewayTransportError("INVALID_TRANSPORT"); }
}

/** Verifies against receiver-owned expectations. Replay acknowledgement belongs to the durable outbox/receiver. */
export async function verifyGatewayTransport(value: unknown, expected: Target & KeyPolicy & {
  readonly outboxKey: Hex; readonly sourceIdentityHash: Hex; readonly receiptHash: Hex; readonly verifiedAt: number;
}): Promise<{ readonly encodedReceipt: Hex; readonly outboxKey: Hex; readonly signer: Address; readonly transportId: Hex }> {
  try {
    target(expected); timestamp(expected.verifiedAt);
    bytes32(expected.outboxKey); bytes32(expected.sourceIdentityHash); bytes32(expected.receiptHash);
    if (value === null || typeof value !== "object" || Array.isArray(value)) invalid();
    const input = value as Record<string, unknown>;
    if (Object.keys(input).length !== KEYS.length || Object.keys(input).some(key => !KEYS.includes(key))) invalid();
    if (input.version !== 1 || input.targetChainId !== String(expected.chainId) ||
        input.targetRegistry !== getAddress(expected.registry) || input.outboxKey !== expected.outboxKey ||
        input.sourceIdentityHash !== expected.sourceIdentityHash || input.receiptHash !== expected.receiptHash) invalid();
    exactBytes(input.encodedReceipt); timestamp(input.signedAt);
    if (keccak256(input.encodedReceipt) !== expected.receiptHash || typeof input.keyId !== "string" ||
        typeof input.signature !== "string" || !/^0x[0-9a-f]{130}$/u.test(input.signature)) invalid();
    const packet = Object.freeze({ ...input }) as unknown as GatewayTransport;
    const epoch = normalizeGatewayKeyEpochs(expected.epochs).find(candidate => candidate.keyId === packet.keyId) ?? invalid();
    const signer = await recoverTypedDataAddress({ ...typed(packet), signature: packet.signature });
    separate(signer, expected);
    if (!gatewayVerifierIsAccepted(epoch, signer, packet.signedAt, expected.verifiedAt)) invalid();
    return Object.freeze({ encodedReceipt: packet.encodedReceipt, outboxKey: packet.outboxKey,
      signer: getAddress(signer), transportId: hashTypedData(typed(packet)) });
  } catch { throw new GatewayTransportError("INVALID_TRANSPORT"); }
}

/** One bounded attempt, with signed authentication in the body. Retry scheduling is owned by the durable outbox. */
export async function deliverGatewayTransport(endpoint: string, packet: GatewayTransport,
  request: typeof fetch = fetch): Promise<{ readonly outboxKey: Hex }> {
  let url: URL;
  try {
    url = new URL(endpoint);
    const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash ||
        !(url.protocol === "https:" || url.protocol === "http:" && local)) throw Error();
  } catch { throw new GatewayTransportError("DELIVERY_REJECTED"); }
  let response: Response;
  try {
    response = await request(url, { method: "POST", headers: { "content-type": "application/json" },
      redirect: "error", signal: AbortSignal.timeout(10_000), body: JSON.stringify(packet) });
  } catch { throw new GatewayTransportError("DELIVERY_UNAVAILABLE"); }
  try {
    if (!response.ok) { await response.body?.cancel(); throw Error(); }
    // Stop after a bounded acknowledgement rather than buffering an arbitrary endpoint response.
    const reader = response.body?.getReader(); if (!reader) throw Error();
    let text = ""; const decoder = new TextDecoder();
    try {
      for (;;) { const chunk = await reader.read(); if (chunk.done) break;
        text += decoder.decode(chunk.value, { stream: true }); if (text.length > 1024) throw Error(); }
      text += decoder.decode();
    } finally { await reader.cancel(); reader.releaseLock(); }
    const ack = JSON.parse(text);
    if (!ack || Object.keys(ack).length !== 1 || ack.outboxKey !== packet.outboxKey) throw Error();
    return Object.freeze({ outboxKey: packet.outboxKey });
  } catch { throw new GatewayTransportError("DELIVERY_REJECTED"); }
}
