import { createHash, randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { DecisionReceipt } from "@permio/midnight-authorization";
import {
  assertDigest, assertTime, canonical, sha256, unhex, type Digest,
} from "./crypto.ts";
import {
  bridgeBindingCommitment, ciphertextDigest, selectedRecordManifestRoot,
  type BridgeReceiptVerifier, type SelectedRecordManifest,
} from "./evidence.ts";
import type { CiphertextDelivery } from "./delivery.ts";
import { publicReceipt } from "./receipt.ts";
import { EvidenceVaultConflictError, EvidenceVaultStore } from "./store.ts";

export { EvidenceVaultStore } from "./store.ts";
type Operation = "deliver" | "retrieve";
export interface EvidenceVaultGrant {
  readonly bindingCommitment: Digest;
  readonly recipientKeyFingerprint: Digest;
  readonly operations: readonly Operation[];
  readonly expiresAt: number;
}
export interface EvidenceVaultCredential extends EvidenceVaultGrant { readonly tokenHash: Digest }
export interface EvidenceVaultServerOptions {
  readonly store: EvidenceVaultStore;
  readonly credentials: readonly EvidenceVaultCredential[];
  readonly authorization: { resolve(input: {
    readonly bindingCommitment: Digest; readonly manifestRoot: Digest;
    readonly manifest: SelectedRecordManifest; readonly now: number;
  }): Promise<DecisionReceipt> };
  readonly verifier: BridgeReceiptVerifier;
  readonly now?: () => number;
  readonly maxBodyBytes?: number;
}
const tokenHash = (token: string): Digest =>
  `0x${createHash("sha256").update(`permio:evidence-vault-access:v1\0${token}`).digest("hex")}`;

function validateGrant(grant: EvidenceVaultGrant): void {
  assertDigest(grant.bindingCommitment); assertDigest(grant.recipientKeyFingerprint); assertTime(grant.expiresAt);
  if (!Array.isArray(grant.operations) || !grant.operations.length || new Set(grant.operations).size !== grant.operations.length ||
    grant.operations.some(operation => operation !== "deliver" && operation !== "retrieve")) throw new TypeError("Invalid vault grant");
}
/** Trusted host provisioning only; no HTTP issuance API. Persist only credential,
 * and give token privately to its intended caller. It grants no chain authority. */
export function createEvidenceVaultCredential(grant: EvidenceVaultGrant): { token: string; credential: EvidenceVaultCredential } {
  validateGrant(grant);
  const token = randomBytes(32).toString("base64url");
  return { token, credential: { ...structuredClone(grant), tokenHash: tokenHash(token) } };
}
class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) { super(code); this.status = status; this.code = code; }
}
function exact(value: unknown, keys: readonly string[]): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) {
    throw new HttpError(400, "INVALID_EVIDENCE");
  }
  return Object.fromEntries(keys.map(key => [key, (value as Record<string, unknown>)[key]]));
}
const MANIFEST_FIELDS = ["sourceContextCommitment", "sourceInstanceCommitment", "destinationContextCommitment",
  "destinationCaseCommitment", "purpose", "permittedUse", "expiresAt", "nonce",
  "manifestVersion", "recipientKeyFingerprint", "records"];
function parsePacket(value: unknown): CiphertextDelivery {
  const packet = exact(value, ["deliveryId", "bindingCommitment", "bundle"]);
  const bundle = exact(packet.bundle, ["manifest", "manifestRoot", "ciphertexts"]);
  const manifest = exact(bundle.manifest, MANIFEST_FIELDS);
  if (!Array.isArray(manifest.records) || !Array.isArray(bundle.ciphertexts)) throw new HttpError(400, "INVALID_EVIDENCE");
  manifest.records = manifest.records.map((entry: unknown) => exact(entry,
    ["recordCommitment", "mediaType", "byteLength", "ciphertextDigest"]));
  bundle.manifest = manifest;
  bundle.ciphertexts = bundle.ciphertexts.map((entry: unknown) => exact(entry,
    ["recordCommitment", "ephemeralPublicKey", "iv", "ciphertext"]));
  return { ...packet, bundle } as CiphertextDelivery;
}
async function checkPacket(packet: CiphertextDelivery): Promise<void> {
  try {
    assertDigest(packet.deliveryId); assertDigest(packet.bindingCommitment); assertDigest(packet.bundle.manifestRoot);
    const { bundle } = packet;
    if (bundle.manifestRoot !== await selectedRecordManifestRoot(bundle.manifest) ||
      packet.bindingCommitment !== await bridgeBindingCommitment(bundle.manifest) ||
      packet.deliveryId !== await sha256(canonical("permio:ciphertext-delivery:v1", [packet.bindingCommitment, bundle.manifestRoot])) ||
      bundle.ciphertexts.length !== bundle.manifest.records.length) throw Error();
    for (let index = 0; index < bundle.ciphertexts.length; index++) {
      const ciphertext = bundle.ciphertexts[index]!, entry = bundle.manifest.records[index]!;
      if (ciphertext.recordCommitment !== entry.recordCommitment || unhex(ciphertext.iv).length !== 12 ||
        unhex(ciphertext.ephemeralPublicKey).length === 0 || unhex(ciphertext.ciphertext).length !== entry.byteLength + 16 ||
        await ciphertextDigest(ciphertext) !== entry.ciphertextDigest) throw Error();
    }
  } catch { throw new HttpError(400, "INVALID_EVIDENCE"); }
}
async function readPacket(request: IncomingMessage, maximum: number): Promise<CiphertextDelivery> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const bytes = Buffer.from(chunk);
    length += bytes.length;
    if (length > maximum) throw new HttpError(413, "BODY_TOO_LARGE");
    chunks.push(bytes);
  }
  try { return parsePacket(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
  catch { throw new HttpError(400, "INVALID_EVIDENCE"); }
}
function checkReceiptWindow(receipt: DecisionReceipt, now: number): void {
  if (receipt.receiptVersion !== 1 || !/^(0|[1-9][0-9]*)$/.test(receipt.validAfter) ||
    !/^(0|[1-9][0-9]*)$/.test(receipt.validBefore) ||
    BigInt(receipt.validAfter) > BigInt(now) || BigInt(receipt.validBefore) <= BigInt(now) ||
    BigInt(receipt.validBefore) >= 2n ** 64n) throw new HttpError(403, "AUTHORIZATION_DENIED");
}

/** Node-only service; the host binds loopback and supplies the HTTPS entry point.
 * Credentials are private per-binding access grants, not public receipt fields.
 * Resolver/verifier are mandatory and must use the approved finalized bridge. */
export function createEvidenceVaultServer(options: EvidenceVaultServerOptions): Server {
  const credentials = new Map<Digest, EvidenceVaultCredential>();
  for (const credential of options.credentials) {
    validateGrant(credential); assertDigest(credential.tokenHash);
    if (credentials.has(credential.tokenHash)) throw new TypeError("Duplicate vault credential");
    credentials.set(credential.tokenHash, structuredClone(credential));
  }
  const clock = options.now ?? (() => Math.floor(Date.now() / 1000));
  const maximum = options.maxBodyBytes ?? 8 * 1024 ** 2;
  if (!Number.isSafeInteger(maximum) || maximum < 1) throw new TypeError("Invalid body limit");
  const currentTime = () => { const now = clock(); assertTime(now); return now; };
  function grantWindow(grant: EvidenceVaultGrant): number {
    const now = currentTime();
    if (now >= grant.expiresAt) throw new HttpError(401, "UNAUTHENTICATED");
    return now;
  }
  function evidenceWindow(packet: CiphertextDelivery, now: number): void {
    if (now >= packet.bundle.manifest.expiresAt) throw new HttpError(403, "AUTHORIZATION_DENIED");
  }
  async function verify(packet: CiphertextDelivery, receipt: DecisionReceipt, grant: EvidenceVaultGrant): Promise<void> {
    const now = grantWindow(grant); evidenceWindow(packet, now); checkReceiptWindow(receipt, now);
    try {
      await options.verifier.verifyBridgeAuthorization({ receipt: structuredClone(receipt),
        bindingCommitment: packet.bindingCommitment, manifestRoot: packet.bundle.manifestRoot,
        manifest: structuredClone(packet.bundle.manifest), now });
    } catch { throw new HttpError(403, "AUTHORIZATION_DENIED"); }
    const after = grantWindow(grant); evidenceWindow(packet, after); checkReceiptWindow(receipt, after);
  }
  return createServer({ requestTimeout: 15_000, headersTimeout: 10_000 }, async (request, response) => {
    response.setHeader("cache-control", "no-store");
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.setHeader("x-content-type-options", "nosniff");
    const send = (status: number, value: unknown) => { response.writeHead(status); response.end(JSON.stringify(value)); };
    try {
      const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.authorization ?? "");
      const grant = match ? credentials.get(tokenHash(match[1]!)) : undefined;
      if (!grant) throw new HttpError(401, "UNAUTHENTICATED");
      grantWindow(grant);
      const route = /^\/v1\/evidence\/(0x[0-9a-f]{64})$/.exec(request.url ?? "");
      const operation = request.method === "PUT" ? "deliver" : request.method === "GET" ? "retrieve" : null;
      if (!route || !operation || !grant.operations.includes(operation)) throw new HttpError(404, "NOT_FOUND");
      const deliveryId = route[1] as Digest;
      if (operation === "deliver") {
        if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers["content-type"] ?? "")) {
          throw new HttpError(400, "INVALID_EVIDENCE");
        }
        const packet = await readPacket(request, maximum);
        if (packet.deliveryId !== deliveryId || packet.bindingCommitment !== grant.bindingCommitment ||
          packet.bundle.manifest.recipientKeyFingerprint !== grant.recipientKeyFingerprint) throw new HttpError(404, "NOT_FOUND");
        await checkPacket(packet);
        const now = grantWindow(grant); evidenceWindow(packet, now);
        let receipt: DecisionReceipt;
        try {
          receipt = publicReceipt(await options.authorization.resolve({ bindingCommitment: packet.bindingCommitment,
            manifestRoot: packet.bundle.manifestRoot, manifest: structuredClone(packet.bundle.manifest), now }));
        } catch { throw new HttpError(403, "AUTHORIZATION_DENIED"); }
        await verify(packet, receipt, grant);
        options.store.persist(packet, receipt);
        send(200, { deliveryId });
      } else {
        const stored = options.store.find(deliveryId, grant.bindingCommitment, grant.recipientKeyFingerprint);
        if (!stored) throw new HttpError(404, "NOT_FOUND");
        const packet = parsePacket(stored.packet);
        if (packet.deliveryId !== deliveryId || packet.bindingCommitment !== grant.bindingCommitment ||
          packet.bundle.manifest.recipientKeyFingerprint !== grant.recipientKeyFingerprint) throw new HttpError(500, "UNAVAILABLE");
        await checkPacket(packet);
        await verify(packet, publicReceipt(stored.receipt), grant);
        send(200, packet);
      }
    } catch (error) {
      request.resume();
      if (error instanceof HttpError) send(error.status, { error: error.code });
      else if (error instanceof EvidenceVaultConflictError) send(409, { error: "CONFLICT" });
      else send(500, { error: "UNAVAILABLE" });
    }
  });
}
export { createFinalizedEvidenceBridgeVerifier, type EvidenceBridgeDeployment, type FinalizedEvidenceBridgeVerifierOptions } from "./midnight-verifier.ts";
