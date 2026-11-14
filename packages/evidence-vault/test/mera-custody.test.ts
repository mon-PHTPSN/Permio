import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import type { WebAuthnClient } from "@category-labs/mera";
import {
  bridgeBindingCommitment, createMeraRecipientKeyCustodyAdapter, encryptSelectedRecords,
  verifyAndDecryptEvidence, type MeraRecipientVault,
} from "../src/index.ts";
import { syntheticReceipt } from "./receipt-fixture.ts";

// Software authenticator fixture, not hardware/cross-device acceptance.
function authenticator(secret = "synthetic-authenticator-one", wrongCredential = false): WebAuthnClient {
  return {
    async createCredential() { throw new Error("not used: existing passkey only"); },
    async getCredential(request) {
      if (request.rpId !== "evidence.example.test") throw new Error("wrong relying party");
      assert.equal(request.userVerification, "required");
      assert.deepEqual(Object.keys(request).sort(), ["allowCredential", "challenge", "prfSalt", "rpId", "userVerification"].sort());
      assert.equal(request.prfSalt.length, 32);
      return { credentialId: new Uint8Array([wrongCredential ? 2 : 1]),
        prfOutput: new Uint8Array(createHmac("sha256", secret).update(request.prfSalt).digest()) };
    },
  };
}

test("actual Mera SDK protects only an encryption key with independent salts/namespaces", async () => {
  const adapter = createMeraRecipientKeyCustodyAdapter({ rpId: "evidence.example.test", webAuthnClient: authenticator() });
  const first = await adapter.createVault({ credentialId: "AQ" });
  const second = await adapter.createVault({ credentialId: "AQ" });
  assert.equal(adapter.provider, "mera-prf-v1");
  assert.equal(first.manifest.provider, "mera-prf-v1");
  assert.notEqual(first.manifest.namespace, second.manifest.namespace);
  assert.notEqual(first.manifest.vault.prfSalt, second.manifest.vault.prfSalt);
  assert.equal(Buffer.from(first.manifest.vault.prfSalt, "base64url").length, 32);
  assert.deepEqual(Object.keys(first.manifest).sort(), ["algorithms", "namespace", "provider", "publicKeyFingerprint", "rpId", "vault", "version"].sort());
  const fieldNames: string[] = [];
  const inspect = (value: unknown) => {
    if (value && typeof value === "object") for (const [field, child] of Object.entries(value)) {
      fieldNames.push(field); inspect(child);
    }
  };
  inspect(first.manifest);
  assert.ok(fieldNames.every(field => !["privateKey", "prfOutput", "plaintext", "secret"].includes(field)));
  const digest = `0x${"ab".repeat(32)}` as const;
  const bundle = await encryptSelectedRecords({ sourceContextCommitment: digest, sourceInstanceCommitment: digest,
    destinationContextCommitment: digest, destinationCaseCommitment: digest, purpose: "referral",
    permittedUse: "selected-referral", expiresAt: 2000, nonce: digest },
    [{ recordCommitment: digest, mediaType: "text/plain", plaintext: new TextEncoder().encode("synthetic referral") }], first.publicKey);
  const binding = await bridgeBindingCommitment(bundle.manifest);
  // A new adapter is a fresh software profile with the same fixture credential.
  const fresh = createMeraRecipientKeyCustodyAdapter({ rpId: "evidence.example.test", webAuthnClient: authenticator() });
  const expectation = { publicKey: first.publicKey, namespace: first.manifest.namespace };
  await fresh.withUnlockedKey(first.manifest, expectation, async (key) => {
    assert.equal(key.publicKey.fingerprint, first.publicKey.fingerprint);
    assert.equal(key.privateKey.extractable, false);
    assert.deepEqual(key.privateKey.usages, ["deriveBits"]);
    await assert.rejects(crypto.subtle.exportKey("pkcs8", key.privateKey));
    const records = await verifyAndDecryptEvidence(bundle, binding, key, {
      receipt: syntheticReceipt, now: 1000,
      verifier: { async verifyBridgeAuthorization() { /* contract fixture only */ } },
    });
    assert.equal(new TextDecoder().decode(records[0].plaintext), "synthetic referral");
  });
});

test("wrong credential, RP, namespace, salt, ciphertext and fingerprint fail closed", async () => {
  const adapter = createMeraRecipientKeyCustodyAdapter({ rpId: "evidence.example.test", webAuthnClient: authenticator() });
  const created = await adapter.createVault({ credentialId: "AQ" });
  const expectation = { publicKey: created.publicKey, namespace: created.manifest.namespace };
  let released = false;
  const use = async () => { released = true; };
  for (const fixture of [authenticator("different-secret"), authenticator("synthetic-authenticator-one", true)]) {
    const wrong = createMeraRecipientKeyCustodyAdapter({ rpId: "evidence.example.test", webAuthnClient: fixture });
    await assert.rejects(wrong.withUnlockedKey(created.manifest, expectation, use));
  }
  const changed: MeraRecipientVault[] = [
    { ...created.manifest, rpId: "other.example.test" },
    { ...created.manifest, namespace: `permio:recipient-evidence-key:v1:${"ef".repeat(32)}` },
    { ...created.manifest, publicKeyFingerprint: `0x${"ff".repeat(32)}` },
    { ...created.manifest, vault: { ...created.manifest.vault, prfSalt: Buffer.alloc(32, 9).toString("base64url") } },
    { ...created.manifest, vault: { ...created.manifest.vault, ciphertext: Buffer.alloc(64, 7).toString("base64url") } },
  ];
  for (const manifest of changed) await assert.rejects(adapter.withUnlockedKey(manifest, expectation, use));
  // Matching an altered expected namespace must still fail against its encrypted binding.
  await assert.rejects(adapter.withUnlockedKey(changed[1], { ...expectation, namespace: changed[1].namespace }, use),
    /Encrypted recipient vault binding mismatch/);
  assert.equal(released, false);
});
