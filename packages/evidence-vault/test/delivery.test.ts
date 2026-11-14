import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import {
  createSignedActionIntent, verifySignedActionIntent,
  type ActionIntentPayload,
} from "@permio/context-accounts";
import * as vault from "../src/index.ts";
import { syntheticReceipt } from "./receipt-fixture.ts";
import type { DecisionReceipt } from "@permio/midnight-authorization";
import type { EvidenceDeliveryAdapters, EvidenceDeliveryInput } from "../src/delivery.ts";

const digest = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as const;
const plaintext = "selected synthetic record for delivery";
const baseIntent: ActionIntentPayload = {
  intentVersion: 1, namespace: "test", templateId: "bridge", templateVersion: "1.0.0",
  templateHash: digest(30), sessionId: "scoped-session", instanceId: "source-instance",
  contextId: "source-context", actionId: "bridge-selected", resourceSelector: "selected-records",
  resource: "unbound", purpose: "unbound", recipientKind: "investigator", recipient: "unbound",
  disclosurePolicyId: "selected-only", issuedAt: 1000, nonce: "unbound",
};

async function setup() {
  assert.equal(typeof vault.createEvidenceDelivery, "function", "evidence delivery workflow is not implemented");
  const recipient = await vault.createRecipientEncryptionKey();
  const keys = generateKeyPairSync("ed25519");
  const input: EvidenceDeliveryInput = {
    scope: {
      sourceContextCommitment: digest(1), sourceInstanceCommitment: digest(2),
      destinationContextCommitment: digest(3), destinationCaseCommitment: digest(4),
      purpose: "case-review", permittedUse: "investigate-selected-records", expiresAt: 2000,
      nonce: digest(5),
    },
    records: [{ recordCommitment: digest(6), mediaType: "text/plain", plaintext: new TextEncoder().encode(plaintext) }],
    recipient: recipient.publicKey, intent: baseIntent,
  };
  let now = 1000, revoked = false, signCount = 0, admissionCount = 0;
  const receiptMessages: Parameters<EvidenceDeliveryAdapters["receiptChannel"]["deliver"]>[0][] = [];
  const ciphertextMessages: Parameters<EvidenceDeliveryAdapters["ciphertextChannel"]["deliver"]>[0][] = [];
  const admittedBindings = new Map<string, string>();
  // Synthetic external authorization only. Real WebCrypto and real context-account
  // signatures run below; this is not live contract/module/finality evidence.
  const adapters: EvidenceDeliveryAdapters = {
    now: () => now,
    signer: {
      async sign(payload) { signCount++; return createSignedActionIntent(payload, keys.privateKey); },
      async verify(intent) { return verifySignedActionIntent(intent, keys.publicKey); },
    },
    authorization: { async request(request) {
      admissionCount++;
      assert.equal(verifySignedActionIntent(request.intent, keys.publicKey), true);
      assert.equal(request.intent.payload.resource, request.bindingCommitment);
      assert.equal(request.intent.payload.recipient, recipient.publicKey.fingerprint);
      assert.equal(request.intent.payload.purpose, "case-review");
      assert.equal(request.intent.payload.nonce, digest(5));
      assert.equal(JSON.stringify(request).includes(plaintext), false);
      assert.equal("ciphertexts" in request, false);
      admittedBindings.set(syntheticReceipt.receiptId, request.bindingCommitment);
      return structuredClone(syntheticReceipt);
    } },
    verifier: { async verifyBridgeAuthorization(request) {
      if (revoked) throw new Error("fixture authorization revoked");
      assert.equal(admittedBindings.get(request.receipt.receiptId), request.bindingCommitment);
    } },
    receiptChannel: { async deliver(message) { receiptMessages.push(structuredClone(message)); } },
    ciphertextChannel: { async deliver(message) { ciphertextMessages.push(structuredClone(message)); } },
  };
  const delivery = await vault.createEvidenceDelivery(input, adapters);
  return {
    delivery, input, recipient, adapters, receiptMessages, ciphertextMessages,
    setNow(value: number) { now = value; }, revoke() { revoked = true; },
    get signCount() { return signCount; }, get admissionCount() { return admissionCount; },
  };
}

test("confirmed disclosure produces one signed ciphertext bundle and recipient-decryptable delivery", async () => {
  const f = await setup();
  const preview = f.delivery.preview();
  assert.deepEqual(preview.records, [{ recordCommitment: digest(6), mediaType: "text/plain", byteLength: new TextEncoder().encode(plaintext).length }]);
  assert.equal(preview.recipientKeyFingerprint, f.recipient.publicKey.fingerprint);
  assert.equal(preview.destinationCaseCommitment, digest(4));
  assert.equal(preview.permittedUse, "investigate-selected-records");
  assert.equal(JSON.stringify(preview).includes(plaintext), false);
  await assert.rejects(f.delivery.authorize(), /confirm/i);
  assert.equal(f.signCount, 0);
  assert.equal(f.admissionCount, 0);
  await assert.rejects(f.delivery.deliver("ciphertext"), /authorization/i);
  f.delivery.confirm(preview.previewId);
  await f.delivery.authorize();
  await f.delivery.deliver("receipt");
  await f.delivery.deliver("ciphertext");
  assert.equal(f.delivery.status().state, "delivered");
  assert.equal(f.signCount, 1);
  assert.equal(f.admissionCount, 1);
  assert.equal(f.receiptMessages.length, 1);
  assert.equal(f.ciphertextMessages.length, 1);
  const publicMessage = f.receiptMessages[0];
  const encryptedMessage = f.ciphertextMessages[0];
  assert.deepEqual(Object.keys(publicMessage).sort(), ["deliveryId", "receipt"]);
  assert.equal(JSON.stringify(publicMessage).includes("recordCommitment"), false);
  assert.equal(JSON.stringify(publicMessage).includes(plaintext), false);
  assert.notEqual(publicMessage.deliveryId, encryptedMessage.deliveryId);
  assert.equal(JSON.stringify(encryptedMessage).includes(plaintext), false);
  const decoded = await vault.verifyAndDecryptEvidence(
    encryptedMessage.bundle, encryptedMessage.bindingCommitment, f.recipient,
    { receipt: publicMessage.receipt, now: 1000, verifier: f.adapters.verifier },
  );
  assert.equal(new TextDecoder().decode(decoded[0].plaintext), plaintext);
});

test("preview precedes encryption and caller mutations cannot change the confirmed disclosure", async () => {
  const originalEncrypt = crypto.subtle.encrypt;
  let encryptions = 0;
  crypto.subtle.encrypt = function (this: typeof crypto.subtle, ...args: Parameters<typeof crypto.subtle.encrypt>) {
    encryptions++;
    return originalEncrypt.apply(this, args);
  } as typeof crypto.subtle.encrypt;
  try {
    const f = await setup();
    assert.equal(encryptions, 0);
    const preview = f.delivery.preview();
    await assert.rejects(f.delivery.authorize(), /confirm/i);
    assert.equal(encryptions, 0);
    assert.throws(() => f.delivery.confirm(digest(90)), /preview/i);
    f.input.records[0].plaintext.fill(0);
    (f.input.scope as { purpose: string }).purpose = "changed-after-preview";
    (preview as { purpose: string }).purpose = "also-changed";
    f.delivery.confirm(f.delivery.preview().previewId);
    await f.delivery.authorize();
    assert.equal(encryptions, 1);
    await f.delivery.deliver("ciphertext");
    assert.equal(f.ciphertextMessages[0].bundle.manifest.purpose, "case-review");
    const decoded = await vault.verifyAndDecryptEvidence(
      f.ciphertextMessages[0].bundle, f.ciphertextMessages[0].bindingCommitment, f.recipient,
      { receipt: syntheticReceipt, now: 1000, verifier: f.adapters.verifier },
    );
    assert.equal(new TextDecoder().decode(decoded[0].plaintext), plaintext);
  } finally { crypto.subtle.encrypt = originalEncrypt; }
});

test("independent channel retries preserve ciphertext bytes and delivery identifiers without reauthorization", async () => {
  const f = await setup();
  const attempts: Parameters<EvidenceDeliveryAdapters["ciphertextChannel"]["deliver"]>[0][] = [];
  f.adapters.ciphertextChannel.deliver = async message => {
    attempts.push(structuredClone(message));
    if (attempts.length === 1) {
      (message.bundle.ciphertexts[0] as { ciphertext: string }).ciphertext = "00";
      throw new Error("test endpoint response containing private diagnostics");
    }
  };
  f.delivery.confirm(f.delivery.preview().previewId);
  await f.delivery.authorize();
  await f.delivery.deliver("receipt");
  await assert.rejects(f.delivery.deliver("ciphertext"), error => {
    assert.equal(String(error).includes("private diagnostics"), false);
    return true;
  });
  assert.equal(f.delivery.status().channels.receipt, "delivered");
  await f.delivery.deliver("ciphertext");
  await f.delivery.deliver("receipt");
  assert.deepEqual(attempts[1], attempts[0]);
  assert.equal(f.receiptMessages.length, 1);
  assert.equal(f.signCount, 1);
  assert.equal(f.admissionCount, 1);
});

test("withdrawal and expiry block authorization or new channel delivery", async () => {
  for (const boundary of ["before-confirmation", "after-authorization", "expired"] as const) {
    const f = await setup();
    if (boundary !== "before-confirmation") {
      f.delivery.confirm(f.delivery.preview().previewId);
      await f.delivery.authorize();
    }
    if (boundary === "expired") f.setNow(2000);
    else f.delivery.withdraw();
    await assert.rejects(f.delivery.deliver("ciphertext"), /withdrawn|expired/i);
    assert.deepEqual(f.ciphertextMessages, []);
    if (boundary === "before-confirmation") {
      await assert.rejects(f.delivery.authorize(), /withdrawn/i);
      assert.equal(f.signCount, 0);
    }
  }
});

test("current authorization is checked again before each channel and a revoked receipt never delivers", async () => {
  const f = await setup();
  f.delivery.confirm(f.delivery.preview().previewId);
  await f.delivery.authorize();
  await f.delivery.deliver("receipt");
  f.revoke();
  await assert.rejects(f.delivery.deliver("ciphertext"), /authorization/i);
  assert.equal(f.receiptMessages.length, 1);
  assert.deepEqual(f.ciphertextMessages, []);
});

test("substituted signed payloads or denied receipt verification cannot cross either delivery boundary", async () => {
  const f = await setup();
  const realSign = f.adapters.signer.sign;
  f.adapters.signer.sign = async payload => realSign({ ...payload, purpose: "substituted-purpose" });
  f.delivery.confirm(f.delivery.preview().previewId);
  await assert.rejects(f.delivery.authorize(), /signature|signer/i);
  assert.equal(f.admissionCount, 0);
  assert.deepEqual(f.receiptMessages, []);
  assert.deepEqual(f.ciphertextMessages, []);
  const denied = await setup();
  denied.adapters.verifier.verifyBridgeAuthorization = async () => { throw new Error("untrusted fixture receipt"); };
  denied.delivery.confirm(denied.delivery.preview().previewId);
  await assert.rejects(denied.delivery.authorize(), /authorization/i);
  await assert.rejects(denied.delivery.deliver("receipt"));
  assert.deepEqual(denied.receiptMessages, []);
  assert.deepEqual(denied.ciphertextMessages, []);
});

test("withdrawal while the authorization request is in flight blocks late receipt delivery", async () => {
  const f = await setup();
  let started!: () => void, release!: () => void;
  const start = new Promise<void>(resolve => { started = resolve; });
  const resume = new Promise<void>(resolve => { release = resolve; });
  const originalRequest = f.adapters.authorization.request;
  f.adapters.authorization.request = async request => { started(); await resume; return originalRequest(request); };
  f.delivery.confirm(f.delivery.preview().previewId);
  const pending = f.delivery.authorize();
  await start;
  await assert.rejects(f.delivery.authorize(), /progress|state/i);
  f.delivery.withdraw(); release();
  await assert.rejects(pending, /withdrawn/i);
  await assert.rejects(f.delivery.deliver("ciphertext"), /withdrawn/i);
  assert.deepEqual(f.ciphertextMessages, []);
});

test("private adapter diagnostics are excluded from signed-request and public-receipt channels", async () => {
  const f = await setup();
  const sign = f.adapters.signer.sign;
  f.adapters.signer.sign = async payload => ({ ...await sign(payload), privateDiagnostics: plaintext });
  const request = f.adapters.authorization.request;
  f.adapters.authorization.request = async input => ({ ...await request(input), privateDiagnostics: plaintext });
  f.delivery.confirm(f.delivery.preview().previewId);
  await f.delivery.authorize();
  await f.delivery.deliver("receipt");
  assert.equal(JSON.stringify(f.receiptMessages[0]).includes(plaintext), false);
  assert.deepEqual(f.receiptMessages[0].receipt, syntheticReceipt);
});

test("withdrawal during channel preflight wins and concurrent sends do not duplicate a channel", async () => {
  const f = await setup();
  f.delivery.confirm(f.delivery.preview().previewId);
  await f.delivery.authorize();
  let started!: () => void, release!: () => void;
  const start = new Promise<void>(resolve => { started = resolve; });
  const resume = new Promise<void>(resolve => { release = resolve; });
  const verify = f.adapters.verifier.verifyBridgeAuthorization;
  f.adapters.verifier.verifyBridgeAuthorization = async request => { started(); await resume; await verify(request); };
  const pending = f.delivery.deliver("ciphertext");
  await start;
  await assert.rejects(f.delivery.deliver("ciphertext"), /progress/i);
  f.delivery.withdraw(); release();
  await assert.rejects(pending, /withdrawn/i);
  assert.deepEqual(f.ciphertextMessages, []);
});

test("a channel acknowledgement after withdrawal remains visible without allowing further disclosure", async () => {
  const f = await setup();
  f.delivery.confirm(f.delivery.preview().previewId);
  await f.delivery.authorize();
  let started!: () => void, release!: () => void;
  const start = new Promise<void>(resolve => { started = resolve; });
  const resume = new Promise<void>(resolve => { release = resolve; });
  f.adapters.ciphertextChannel.deliver = async message => { f.ciphertextMessages.push(structuredClone(message)); started(); await resume; };
  const pending = f.delivery.deliver("ciphertext");
  await start;
  f.delivery.withdraw(); release();
  await pending;
  assert.equal(f.delivery.status().state, "withdrawn");
  assert.equal(f.delivery.status().channels.ciphertext, "delivered");
  await assert.rejects(f.delivery.deliver("receipt"), /withdrawn/i);
  assert.deepEqual(f.receiptMessages, []);
});

test("separate loopback HTTP channels retry identical wire bytes and recipient decrypts the received bundle", async () => {
  const { createServer } = await import("node:http");
  const f = await setup();
  const receipts: unknown[] = [], attempts: string[] = [];
  const stored = new Map<string, unknown>();
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    const parsed = JSON.parse(body);
    if (request.url === "/receipt") {
      receipts.push(parsed); response.writeHead(204).end(); return;
    }
    attempts.push(body); stored.set(parsed.deliveryId, parsed);
    // First reply is lost after storage: a retry must be idempotent and byte-stable.
    response.writeHead(attempts.length === 1 ? 503 : 204).end();
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const send = async (path: string, message: unknown) => {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(message),
    });
    if (!response.ok) throw new Error("fixture delivery not acknowledged");
  };
  f.adapters.receiptChannel.deliver = message => send("/receipt", message);
  f.adapters.ciphertextChannel.deliver = message => send("/ciphertext", message);
  try {
    f.delivery.confirm(f.delivery.preview().previewId);
    await f.delivery.authorize();
    await f.delivery.deliver("receipt");
    await assert.rejects(f.delivery.deliver("ciphertext"), /acknowledged/i);
    await f.delivery.deliver("ciphertext");
    assert.equal(attempts.length, 2);
    assert.equal(attempts[0], attempts[1]);
    assert.equal(stored.size, 1);
    assert.equal(receipts.length, 1);
    assert.equal(JSON.stringify(receipts).includes("recordCommitment"), false);
    assert.equal(JSON.stringify(receipts).includes(plaintext), false);
    assert.equal(attempts[0].includes(plaintext), false);
    const received = [...stored.values()][0] as vault.CiphertextDelivery;
    const decoded = await vault.verifyAndDecryptEvidence(received.bundle, received.bindingCommitment, f.recipient,
      { receipt: (receipts[0] as vault.ReceiptDelivery).receipt, now: 1000, verifier: f.adapters.verifier });
    assert.equal(new TextDecoder().decode(decoded[0].plaintext), plaintext);
    assert.equal(f.signCount, 1); assert.equal(f.admissionCount, 1);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test("the local bridge proof adapter receives the exact private manifest opening without evidence bytes", async () => {
  const f = await setup();
  const request = f.adapters.authorization.request;
  let opening: vault.SelectedRecordManifest | undefined;
  f.adapters.authorization.request = async input => {
    assert.ok(input.manifest, "local proof adapter is missing the manifest opening");
    opening = structuredClone(input.manifest);
    assert.equal(opening.destinationCaseCommitment, digest(4));
    assert.equal(opening.permittedUse, "investigate-selected-records");
    assert.equal(opening.records[0].recordCommitment, digest(6));
    assert.match(opening.records[0].ciphertextDigest, /^0x[0-9a-f]{64}$/);
    assert.equal(JSON.stringify(input).includes(plaintext), false);
    assert.equal("ciphertexts" in input, false);
    const result = await request(input);
    (input.manifest as { purpose: string }).purpose = "adapter-mutation";
    return result;
  };
  f.delivery.confirm(f.delivery.preview().previewId);
  await f.delivery.authorize();
  await f.delivery.deliver("ciphertext");
  assert.deepEqual(opening, f.ciphertextMessages[0].bundle.manifest);
});
