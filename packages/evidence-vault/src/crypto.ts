// Browser WebCrypto only: this module has no storage, logging or network API.
// Resolve the platform's key type without requiring lib.dom in Node consumers.
type CryptoKey = Awaited<ReturnType<typeof crypto.subtle.importKey>>;
export type Digest = `0x${string}`;
export const ENCRYPTION_ALGORITHM = "P-256/HKDF-SHA-256/AES-256-GCM" as const;
export interface RecipientPublicKey {
  readonly algorithm: typeof ENCRYPTION_ALGORITHM;
  readonly spki: string;
  readonly fingerprint: Digest;
}
export interface RecipientEncryptionKey {
  readonly publicKey: RecipientPublicKey;
  readonly privateKey: CryptoKey;
}
export const utf8 = new TextEncoder();
export function hex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}
export function unhex(value: string): Uint8Array<ArrayBuffer> {
  if (typeof value !== "string" || !/^(?:[0-9a-f]{2})*$/.test(value)) throw new TypeError("Invalid hexadecimal bytes");
  return Uint8Array.from(value.match(/../g) ?? [], byte => Number.parseInt(byte, 16));
}
export function assertDigest(value: string): asserts value is Digest {
  if (!/^0x[0-9a-f]{64}$/.test(value)) throw new TypeError("Expected lowercase 32-byte digest");
}
export function assertText(value: string): void {
  if (typeof value !== "string" || !value || value !== value.trim() || value !== value.normalize("NFC")) {
    throw new TypeError("Expected nonempty canonical text");
  }
}
export function assertTime(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError("Expected nonnegative integer seconds");
}
export function canonical(domain: string, fields: readonly string[]): Uint8Array<ArrayBuffer> {
  const items = ["permio:canonical:v1", domain, ...fields].map(field => utf8.encode(field));
  const result = new Uint8Array(4 + items.reduce((size, item) => size + 4 + item.length, 0));
  const view = new DataView(result.buffer);
  view.setUint32(0, items.length);
  let offset = 4;
  for (const item of items) {
    view.setUint32(offset, item.length); offset += 4;
    result.set(item, offset); offset += item.length;
  }
  return result;
}
export async function sha256(bytes: Uint8Array): Promise<Digest> {
  return `0x${hex(new Uint8Array(await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes))))}`;
}
export async function importRecipientPublicKey(key: RecipientPublicKey): Promise<CryptoKey> {
  if (key.algorithm !== ENCRYPTION_ALGORITHM || key.fingerprint !== await sha256(unhex(key.spki))) {
    throw new TypeError("Invalid recipient public key fingerprint or algorithm");
  }
  return crypto.subtle.importKey("spki", unhex(key.spki), { name: "ECDH", namedCurve: "P-256" }, true, []);
}
/** Internal extractable material exists only while protecting a new key. */
export async function generateRecipientKeyMaterial() {
  const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const publicKey: RecipientPublicKey = { algorithm: ENCRYPTION_ALGORITHM, spki: hex(spki), fingerprint: await sha256(spki) };
  return { publicKey, pkcs8 };
}
export async function importRecipientPrivateKey(pkcs8: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("pkcs8", Uint8Array.from(pkcs8), { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
}
export async function createRecipientEncryptionKey(): Promise<RecipientEncryptionKey> {
  const { publicKey, pkcs8 } = await generateRecipientKeyMaterial();
  try { return { publicKey, privateKey: await importRecipientPrivateKey(pkcs8) }; }
  finally { pkcs8.fill(0); }
}
export async function deriveEvidenceKey(privateKey: CryptoKey, publicKey: CryptoKey, binding: Uint8Array) {
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256));
  try {
    const material = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
    return await crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: Uint8Array.from(binding) },
      material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  } finally { shared.fill(0); }
}
