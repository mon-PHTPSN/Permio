import type { ActionIntentPayload } from "@permio/context-accounts";
import type { DecisionReceipt } from "@permio/midnight-authorization";
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
/** No default verifier: the deployment supplies actual M6/M7 source validation. */
export interface BridgeReceiptVerifier {
  /** Must authenticate the exact finalized M6 v1 receipt (and M7 transport when
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
async function ciphertextDigest(envelope: EvidenceCiphertext): Promise<Digest> {
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
export async function bridgeBindingCommitment(manifest: SelectedRecordManifest): Promise<Digest> {
  return sha256(canonical("permio:cross-context-evidence-binding:v1", [...scopeFields(manifest),
    manifest.recipientKeyFingerprint, await selectedRecordManifestRoot(manifest)]));
}
/** M5 already signs resource/purpose/recipient/nonce. The resource commits to
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
