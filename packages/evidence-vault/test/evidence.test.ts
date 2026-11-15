import assert from "node:assert/strict";
import { test } from "node:test";
import { syntheticReceipt as receipt } from "./receipt-fixture.ts";
import {
  bindBridgeActionIntent, bridgeBindingCommitment, createRecipientEncryptionKey,
  encryptSelectedRecords, verifyAndDecryptEvidence,
  type BridgeScope, type BridgeReceiptVerifier,
} from "../src/index.ts";

const digest = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as const;
const scope: BridgeScope = {
  sourceContextCommitment: digest(1), sourceInstanceCommitment: digest(2),
  destinationContextCommitment: digest(3), destinationCaseCommitment: digest(4),
  purpose: "case-review", permittedUse: "investigate-selected-records", expiresAt: 2000,
  nonce: digest(5),
};
const records = [{ recordCommitment: digest(6), mediaType: "text/plain", plaintext: new TextEncoder().encode("selected synthetic evidence") }];
const fixtureVerifier: BridgeReceiptVerifier = {
  async verifyBridgeAuthorization() { /* explicitly labeled authorization fixture */ },
};

test("selected evidence encrypts to the exact recipient and only decrypts after receipt verification", async () => {
  const key = await createRecipientEncryptionKey();
  const bundle = await encryptSelectedRecords(scope, records, key.publicKey);
  const binding = await bridgeBindingCommitment(bundle.manifest);
  assert.equal(bundle.manifest.records[0].byteLength, records[0].plaintext.length);
  assert.ok(!JSON.stringify(bundle).includes("selected synthetic evidence"));
  let verified = false;
  const result = await verifyAndDecryptEvidence(bundle, binding, key, {
    receipt, now: 1000, verifier: { async verifyBridgeAuthorization(request) {
      assert.equal(request.bindingCommitment, binding);
      assert.equal(request.receipt.receiptVersion, 1);
      assert.equal(request.manifest.recipientKeyFingerprint, key.publicKey.fingerprint);
      verified = true;
    } },
  });
  assert.equal(verified, true);
  assert.deepEqual(result[0].plaintext, records[0].plaintext);
  assert.equal(result[0].recordCommitment, digest(6));
  assert.equal(key.privateKey.extractable, false);
});

test("every explicit bridge scope field and selected record is committed", async () => {
  const key = await createRecipientEncryptionKey();
  const bundle = await encryptSelectedRecords(scope, records, key.publicKey);
  const binding = await bridgeBindingCommitment(bundle.manifest);
  const mutations = {
    sourceContextCommitment: digest(21), sourceInstanceCommitment: digest(22),
    destinationContextCommitment: digest(23), destinationCaseCommitment: digest(24),
    recipientKeyFingerprint: digest(25), purpose: "other-purpose", permittedUse: "publish",
    expiresAt: 3000, nonce: digest(26), records: [],
  };
  for (const [field, value] of Object.entries(mutations)) {
    const changed = { ...bundle, manifest: { ...bundle.manifest, [field]: value } };
    await assert.rejects(verifyAndDecryptEvidence(changed, binding, key, { receipt, now: 1000, verifier: fixtureVerifier }));
  }
  const base = { intentVersion: 1 as const, namespace: "test", templateId: "bridge",
    templateVersion: "1.0.0", templateHash: digest(30), sessionId: "scoped-session",
    instanceId: "source-instance", contextId: "source-context", actionId: "bridge-selected",
    resourceSelector: "selected-records", resource: "old", purpose: "old", recipientKind: "investigator",
    recipient: "old", disclosurePolicyId: "selected-only", issuedAt: 1000, nonce: "old" };
  const payload = await bindBridgeActionIntent(base, bundle.manifest);
  assert.equal(payload.resource, binding);
  assert.equal(payload.recipient, key.publicKey.fingerprint);
  assert.equal(payload.purpose, scope.purpose);
  assert.equal(payload.nonce, scope.nonce);
});

test("tampering, wrong recipient, expiry and current authorization denial prevent plaintext release", async () => {
  const key = await createRecipientEncryptionKey();
  const otherKey = await createRecipientEncryptionKey();
  const bundle = await encryptSelectedRecords(scope, records, key.publicKey);
  const binding = await bridgeBindingCommitment(bundle.manifest);
  const options = { receipt, now: 1000, verifier: fixtureVerifier };
  await assert.rejects(verifyAndDecryptEvidence(bundle, binding, otherKey, options), /recipient/i);
  await assert.rejects(verifyAndDecryptEvidence(bundle, binding, key, { ...options, now: 2000 }), /expired/i);
  await assert.rejects(verifyAndDecryptEvidence(bundle, binding, key, { ...options,
    verifier: { async verifyBridgeAuthorization() { throw new Error("prospectively revoked"); } } }), /revoked/);
  const originalCiphertext = bundle.ciphertexts[0].ciphertext;
  const changed = { ...bundle, ciphertexts: [{ ...bundle.ciphertexts[0],
    ciphertext: originalCiphertext.replace(/^./, originalCiphertext[0] === "0" ? "1" : "0") }] };
  await assert.rejects(verifyAndDecryptEvidence(changed, binding, key, options), /digest/i);
  await assert.rejects(verifyAndDecryptEvidence({ ...bundle, ciphertexts: [...bundle.ciphertexts, ...bundle.ciphertexts] }, binding, key, options));
});

test("authenticated encryption independently binds the purpose even if a fixture verifier accepts a changed envelope", async () => {
  const key = await createRecipientEncryptionKey();
  const bundle = await encryptSelectedRecords(scope, records, key.publicKey);
  const changed = { ...bundle, manifest: { ...bundle.manifest, purpose: "different-purpose" } };
  const changedBinding = await bridgeBindingCommitment(changed.manifest);
  await assert.rejects(verifyAndDecryptEvidence(changed, changedBinding, key, { receipt, now: 1000, verifier: fixtureVerifier }));
});
