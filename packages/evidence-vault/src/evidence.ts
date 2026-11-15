import type { ActionIntentPayload } from "@permio/context-accounts";
import type { DecisionReceipt } from "@permio/midnight-authorization";
import { runtimeEvidenceBridgeBinding, type RuntimeEvidenceBridgeOpening } from "@permio/midnight-authorization/evidence-bridge";
import {
  assertDigest, assertText, assertTime, canonical, deriveEvidenceKey, hex, importRecipientPublicKey,
  sha256, unhex, type Digest, type RecipientEncryptionKey, type RecipientPublicKey,
} from "./crypto.ts";

export interface BridgeScope {
  readonly sourceContextCommitment: Digest;
  readonly sourceInstanceCommitment: Digest;
  readonly destinationContextCommitment: Digest;
  readonly destinationCaseCommitment: Digest;
  readonly purpose: string;
  readonly permittedUse: string;
  /** Unix seconds; validity is half open and excludes this instant. */
  readonly expiresAt: number;
  readonly nonce: Digest;
}
export interface SelectedRecord {
  readonly recordCommitment: Digest;
  readonly mediaType: string;
  readonly plaintext: Uint8Array;
}
export interface SelectedRecordManifestEntry {
  readonly recordCommitment: Digest;
  readonly mediaType: string;
  readonly byteLength: number;
  readonly ciphertextDigest: Digest;
}
export interface SelectedRecordManifest extends BridgeScope {
  readonly manifestVersion: 1;
  readonly recipientKeyFingerprint: Digest;
  readonly records: readonly SelectedRecordManifestEntry[];
}
export interface EvidenceCiphertext {
  readonly recordCommitment: Digest;
  readonly ephemeralPublicKey: string;
  readonly iv: string;
  readonly ciphertext: string;
}
export interface EncryptedEvidenceBundle {
  readonly manifest: SelectedRecordManifest;
  readonly manifestRoot: Digest;
  readonly ciphertexts: readonly EvidenceCiphertext[];
}
/** No default verifier: the deployment authenticates the finalized bridge source. */
export interface BridgeReceiptVerifier {
  /** Must authenticate the exact finalized authorization receipt v1 (and gateway transport when
   * used), approved bridge module, complete binding, and current revocation.
   * Reject by throwing. A successful local hash check is not authorization. */
  verifyBridgeAuthorization(request: {
    readonly receipt: DecisionReceipt;
    readonly bindingCommitment: Digest;
    readonly manifestRoot: Digest;
    readonly manifest: SelectedRecordManifest;
    readonly now: number;
  }): Promise<void>;
}

function scopeFields(scope: BridgeScope): string[] {
  for (const value of [scope.sourceContextCommitment, scope.sourceInstanceCommitment,
    scope.destinationContextCommitment, scope.destinationCaseCommitment, scope.nonce]) assertDigest(value);
  assertText(scope.purpose); assertText(scope.permittedUse); assertTime(scope.expiresAt);
  return [scope.sourceContextCommitment, scope.sourceInstanceCommitment, scope.destinationContextCommitment,
    scope.destinationCaseCommitment, scope.purpose, scope.permittedUse, String(scope.expiresAt), scope.nonce];
}
function entryFields(entry: Omit<SelectedRecordManifestEntry, "ciphertextDigest">): string[] {
  assertDigest(entry.recordCommitment); assertText(entry.mediaType); assertTime(entry.byteLength);
  return [entry.recordCommitment, entry.mediaType, String(entry.byteLength)];
}
function validateEntries(entries: readonly { readonly recordCommitment: Digest }[]): void {
  if (!entries.length || new Set(entries.map(entry => entry.recordCommitment)).size !== entries.length) {
    throw new TypeError("Selected records must be nonempty and unique");
  }
}
function encryptionBinding(scope: BridgeScope, fingerprint: Digest, entry: Omit<SelectedRecordManifestEntry, "ciphertextDigest">) {
  return canonical("permio:evidence-record-encryption:v1", [...scopeFields(scope), fingerprint, ...entryFields(entry)]);
}
export async function ciphertextDigest(envelope: EvidenceCiphertext): Promise<Digest> {
  return sha256(canonical("permio:evidence-ciphertext:v1", [envelope.recordCommitment,
    envelope.ephemeralPublicKey, envelope.iv, envelope.ciphertext]));
}
export async function selectedRecordManifestRoot(manifest: SelectedRecordManifest): Promise<Digest> {
  if (manifest.manifestVersion !== 1) throw new TypeError("Unsupported manifest version");
  scopeFields(manifest); assertDigest(manifest.recipientKeyFingerprint); validateEntries(manifest.records);
  const fields = manifest.records.flatMap(entry => {
    assertDigest(entry.ciphertextDigest);
    return [...entryFields(entry), entry.ciphertextDigest];
  });
  return sha256(canonical("permio:selected-record-manifest:v1", [String(manifest.records.length), ...fields]));
}
/** Fixed typed bridge header; the ordered manifest root has no record-count cap.
 * Manifest/ciphertext formats remain v1; only the bridge commitment is v2. */
export async function createEvidenceBridgeOpening(manifest: SelectedRecordManifest): Promise<RuntimeEvidenceBridgeOpening> {
  manifest = structuredClone(manifest);
  scopeFields(manifest); assertDigest(manifest.recipientKeyFingerprint);
  if (manifest.nonce === `0x${"00".repeat(32)}`) throw new TypeError("Bridge nonce must be nonzero");
  return { bindingVersion: 2n,
    sourceContextHash: unhex(manifest.sourceContextCommitment.slice(2)),
    sourceInstanceCommitment: unhex(manifest.sourceInstanceCommitment.slice(2)),
    destinationContextCommitment: unhex(manifest.destinationContextCommitment.slice(2)),
    destinationCaseCommitment: unhex(manifest.destinationCaseCommitment.slice(2)),
    purposeHash: unhex((await sha256(canonical("permio:runtime-purpose:v1", [manifest.purpose]))).slice(2)),
    permittedUseHash: unhex((await sha256(canonical("permio:evidence-permitted-use:v2", [manifest.permittedUse]))).slice(2)),
    expiresAt: BigInt(manifest.expiresAt), nonce: unhex(manifest.nonce.slice(2)),
    recipientKeyFingerprint: unhex(manifest.recipientKeyFingerprint.slice(2)),
    manifestRoot: unhex((await selectedRecordManifestRoot(manifest)).slice(2)) };
}
export async function bridgeBindingCommitment(manifest: SelectedRecordManifest): Promise<Digest> {
  return `0x${hex(runtimeEvidenceBridgeBinding(await createEvidenceBridgeOpening(manifest)))}`;
}
/** The action intent already signs resource/purpose/recipient/nonce. The resource commits to
 * every extra bridge value. This creates no new intent or receipt format. */
export async function bindBridgeActionIntent(base: ActionIntentPayload, manifest: SelectedRecordManifest): Promise<ActionIntentPayload> {
  const snapshot = structuredClone(manifest);
  return { ...structuredClone(base), resource: await bridgeBindingCommitment(snapshot),
    recipient: snapshot.recipientKeyFingerprint, purpose: snapshot.purpose, nonce: snapshot.nonce };
}
export async function encryptSelectedRecords(scope: BridgeScope, records: readonly SelectedRecord[], recipient: RecipientPublicKey): Promise<EncryptedEvidenceBundle> {
  scope = structuredClone(scope); records = structuredClone(records); recipient = structuredClone(recipient);
  scopeFields(scope); validateEntries(records);
  const publicKey = await importRecipientPublicKey(recipient);
  const entries: SelectedRecordManifestEntry[] = [];
  const ciphertexts: EvidenceCiphertext[] = [];
  for (const record of records) {
    const metadata = { recordCommitment: record.recordCommitment, mediaType: record.mediaType, byteLength: record.plaintext.length };
    const binding = encryptionBinding(scope, recipient.fingerprint, metadata);
    const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
    const key = await deriveEvidenceKey(ephemeral.privateKey, publicKey, binding);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: binding }, key, Uint8Array.from(record.plaintext));
    const envelope: EvidenceCiphertext = { recordCommitment: record.recordCommitment,
      ephemeralPublicKey: hex(new Uint8Array(await crypto.subtle.exportKey("spki", ephemeral.publicKey))),
      iv: hex(iv), ciphertext: hex(new Uint8Array(ciphertext)) };
    entries.push({ ...metadata, ciphertextDigest: await ciphertextDigest(envelope) });
    ciphertexts.push(envelope);
    record.plaintext.fill(0);
  }
  // Allowlist scope: caller objects may also contain private UI fields.
  const manifest: SelectedRecordManifest = { manifestVersion: 1,
    sourceContextCommitment: scope.sourceContextCommitment, sourceInstanceCommitment: scope.sourceInstanceCommitment,
    destinationContextCommitment: scope.destinationContextCommitment, destinationCaseCommitment: scope.destinationCaseCommitment,
    purpose: scope.purpose, permittedUse: scope.permittedUse, expiresAt: scope.expiresAt, nonce: scope.nonce,
    recipientKeyFingerprint: recipient.fingerprint, records: entries };
  return { manifest, manifestRoot: await selectedRecordManifestRoot(manifest), ciphertexts };
}
/** Local client API, never a server decryption endpoint. No enumeration or
 * retrieval API is provided; callers supply only the selected ciphertexts. */
export async function verifyAndDecryptEvidence(bundle: EncryptedEvidenceBundle, expectedBinding: Digest,
  recipient: RecipientEncryptionKey, authorization: { readonly receipt: DecisionReceipt; readonly now: number; readonly verifier: BridgeReceiptVerifier }): Promise<readonly SelectedRecord[]> {
  bundle = structuredClone(bundle);
  const publicDescriptor = structuredClone(recipient.publicKey);
  const privateKey = recipient.privateKey;
  const receipt = structuredClone(authorization.receipt);
  const now = authorization.now;
  assertTime(now); assertDigest(expectedBinding);
  if (now >= bundle.manifest.expiresAt) throw new Error("Bridge expired");
  await importRecipientPublicKey(publicDescriptor);
  if (bundle.manifest.recipientKeyFingerprint !== publicDescriptor.fingerprint) throw new Error("Wrong recipient key");
  if (bundle.manifestRoot !== await selectedRecordManifestRoot(bundle.manifest) || expectedBinding !== await bridgeBindingCommitment(bundle.manifest)) {
    throw new Error("Bridge manifest or scope binding mismatch");
  }
  if (bundle.ciphertexts.length !== bundle.manifest.records.length) throw new Error("Selected ciphertext set mismatch");
  for (let i = 0; i < bundle.ciphertexts.length; i++) {
    const envelope = bundle.ciphertexts[i]; const entry = bundle.manifest.records[i];
    if (envelope.recordCommitment !== entry.recordCommitment || await ciphertextDigest(envelope) !== entry.ciphertextDigest) {
      throw new Error("Selected ciphertext digest mismatch");
    }
  }
  if (receipt.receiptVersion !== 1) throw new Error("Expected authorization-contract decision receipt v1");
  await authorization.verifier.verifyBridgeAuthorization({ receipt, bindingCommitment: expectedBinding,
    manifestRoot: bundle.manifestRoot, manifest: structuredClone(bundle.manifest), now });
  const plaintexts: SelectedRecord[] = [];
  try {
    for (let i = 0; i < bundle.ciphertexts.length; i++) {
      const envelope = bundle.ciphertexts[i]; const entry = bundle.manifest.records[i];
      const binding = encryptionBinding(bundle.manifest, publicDescriptor.fingerprint, entry);
      const ephemeral = await crypto.subtle.importKey("spki", unhex(envelope.ephemeralPublicKey), { name: "ECDH", namedCurve: "P-256" }, false, []);
      const key = await deriveEvidenceKey(privateKey, ephemeral, binding);
      const plaintext = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unhex(envelope.iv), additionalData: binding }, key, unhex(envelope.ciphertext)));
      if (plaintext.length !== entry.byteLength) { plaintext.fill(0); throw new Error("Selected plaintext length mismatch"); }
      plaintexts.push({ recordCommitment: entry.recordCommitment, mediaType: entry.mediaType, plaintext });
    }
    return plaintexts;
  } catch (error) { plaintexts.forEach(record => record.plaintext.fill(0)); throw error; }
}
