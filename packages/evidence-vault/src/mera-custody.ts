import {
  createSecretVaultWithExistingPasskey, decryptSecretVaultWithPasskey, parseSecretVault,
  type PasskeyCredentialMetadata, type PasskeySecretVault, type WebAuthnClient,
} from "@category-labs/mera";
import {
  ENCRYPTION_ALGORITHM, canonical, generateRecipientKeyMaterial, hex, importRecipientPrivateKey,
  importRecipientPublicKey, type Digest, type RecipientEncryptionKey, type RecipientPublicKey,
} from "./crypto.ts";

export interface RecipientKeyCustodyAdapter<VaultManifest, CreateInput> {
  readonly provider: string;
  createVault(input: CreateInput): Promise<{ readonly publicKey: RecipientPublicKey; readonly manifest: VaultManifest }>;
  withUnlockedKey<T>(manifest: VaultManifest, expected: { readonly publicKey: RecipientPublicKey; readonly namespace: string },
    use: (key: RecipientEncryptionKey) => Promise<T>): Promise<T>;
}
export interface MeraRecipientVault {
  readonly version: 1;
  readonly provider: "mera-prf-v1";
  readonly rpId: string;
  readonly namespace: string;
  readonly publicKeyFingerprint: Digest;
  readonly algorithms: typeof VAULT_ALGORITHMS;
  /** SDK v1 salt, ciphertext, nonce and nonsecret credential-recovery metadata. */
  readonly vault: PasskeySecretVault;
}
const VAULT_ALGORITHMS = "Mera-secret-v1/HKDF-SHA-256/AES-256-GCM;P-256" as const;
const NAMESPACE_PREFIX = "permio:recipient-evidence-key:v1:";
function keyBinding(rpId: string, namespace: string, fingerprint: Digest) {
  return canonical("permio:mera-recipient-key-vault:v1", [rpId, namespace, fingerprint, VAULT_ALGORITHMS]);
}
function same(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}
function guardClient(client: WebAuthnClient | undefined): WebAuthnClient | undefined {
  if (!client) return undefined; // SDK browser client relies on WebAuthn's allowCredentials boundary.
  return { createCredential: request => client.createCredential(request), async getCredential(request) {
    const result = await client.getCredential(request);
    if (request.allowCredential && !same(request.allowCredential.credentialId, result.credentialId)) {
      result.prfOutput?.fill(0);
      throw new Error("Unexpected passkey credential");
    }
    return result;
  } };
}
/** Existing passkey only; enrolment and the RP migration/support policy are
 * deployment work. No account derivation, transaction signing or persistence. */
export function createMeraRecipientKeyCustodyAdapter(options: {
  readonly rpId: string; readonly webAuthnClient?: WebAuthnClient;
}): RecipientKeyCustodyAdapter<MeraRecipientVault, PasskeyCredentialMetadata> {
  const rpId = options.rpId;
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]+$/.test(rpId) && rpId !== "localhost") {
    throw new TypeError("Expected exact relying-party hostname");
  }
  const webAuthnClient = guardClient(options.webAuthnClient);
  return {
    provider: "mera-prf-v1",
    async createVault(credential) {
      const namespace = `${NAMESPACE_PREFIX}${hex(crypto.getRandomValues(new Uint8Array(32)))}`;
      const { publicKey, pkcs8 } = await generateRecipientKeyMaterial();
      const binding = keyBinding(rpId, namespace, publicKey.fingerprint);
      const secret = new Uint8Array(binding.length + pkcs8.length);
      secret.set(binding); secret.set(pkcs8, binding.length);
      try {
        const vault = await createSecretVaultWithExistingPasskey({ rpId, credential, secret, webAuthnClient });
        return { publicKey, manifest: { version: 1, provider: "mera-prf-v1", rpId, namespace,
          publicKeyFingerprint: publicKey.fingerprint, algorithms: VAULT_ALGORITHMS, vault: parseSecretVault(vault) } };
      } finally { secret.fill(0); pkcs8.fill(0); }
    },
    async withUnlockedKey(manifest, expected, use) {
      manifest = structuredClone(manifest); expected = structuredClone(expected);
      if (manifest.version !== 1 || manifest.provider !== "mera-prf-v1" || manifest.algorithms !== VAULT_ALGORITHMS ||
        manifest.rpId !== rpId || manifest.namespace !== expected.namespace ||
        !new RegExp(`^${NAMESPACE_PREFIX}[0-9a-f]{64}$`).test(manifest.namespace) ||
        manifest.publicKeyFingerprint !== expected.publicKey.fingerprint || expected.publicKey.algorithm !== ENCRYPTION_ALGORITHM) {
        throw new Error("Recipient vault binding mismatch");
      }
      const publicKey = await importRecipientPublicKey(expected.publicKey);
      const secret = await decryptSecretVaultWithPasskey({ rpId, vault: parseSecretVault(manifest.vault), webAuthnClient });
      try {
        const binding = keyBinding(rpId, manifest.namespace, manifest.publicKeyFingerprint);
        if (!same(secret.subarray(0, binding.length), binding)) throw new Error("Encrypted recipient vault binding mismatch");
        const privateKey = await importRecipientPrivateKey(secret.subarray(binding.length));
        // Confirm the protected private key actually belongs to this public descriptor.
        const challenge = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
        const left = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: challenge.publicKey }, privateKey, 256));
        const right = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: publicKey }, challenge.privateKey, 256));
        try { if (!same(left, right)) throw new Error("Recipient private/public key mismatch"); }
        finally { left.fill(0); right.fill(0); }
        return await use({ publicKey: expected.publicKey, privateKey });
      } finally { secret.fill(0); }
    },
  };
}
