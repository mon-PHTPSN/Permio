import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import {
  bridgeBindingCommitment, createRecipientEncryptionKey, encryptSelectedRecords,
  verifyAndDecryptEvidence, type BridgeReceiptVerifier, type CiphertextDelivery,
} from "../src/index.ts";
import { canonical, sha256 } from "../src/crypto.ts";
import {
  EvidenceVaultStore, createEvidenceVaultCredential, createEvidenceVaultServer,
} from "../src/server.ts";
import { syntheticReceipt } from "./receipt-fixture.ts";

const digest = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as const;
const plaintext = "private synthetic evidence, never stored or served as plaintext";
const privateError = "private resolver diagnostic must not cross the HTTP boundary";

async function setup(authorizationTimeoutMs?: number) {
  const directory = await mkdtemp(join(tmpdir(), "permio-evidence-service-"));
  const database = join(directory, "private.sqlite");
  const recipient = await createRecipientEncryptionKey();
  const bundle = await encryptSelectedRecords({
    sourceContextCommitment: digest(1), sourceInstanceCommitment: digest(2),
    destinationContextCommitment: digest(3), destinationCaseCommitment: digest(4),
    purpose: "case-review", permittedUse: "review-selected-records", expiresAt: 2000, nonce: digest(5),
  }, [{ recordCommitment: digest(6), mediaType: "text/plain",
    plaintext: new TextEncoder().encode(plaintext) }], recipient.publicKey);
  const bindingCommitment = await bridgeBindingCommitment(bundle.manifest);
  const deliveryId = await sha256(canonical("permio:ciphertext-delivery:v1", [bindingCommitment, bundle.manifestRoot]));
  const message: CiphertextDelivery = { deliveryId, bindingCommitment, bundle };
  const grant = { bindingCommitment, recipientKeyFingerprint: recipient.publicKey.fingerprint, expiresAt: 3000 };
  const writer = createEvidenceVaultCredential({ ...grant, operations: ["deliver"] });
  const reader = createEvidenceVaultCredential({ ...grant, operations: ["retrieve"] });
  const other = createEvidenceVaultCredential({ ...grant, bindingCommitment: digest(100), operations: ["retrieve"] });
  const expiring = createEvidenceVaultCredential({ ...grant, expiresAt: 1500, operations: ["retrieve"] });
  const receipt = { ...syntheticReceipt, recipient: recipient.publicKey.fingerprint };
  let now = 1000, revoked = false, diagnostic = false;
  let verifyGate: (() => Promise<void>) | undefined;
  let resolveGate: (() => Promise<void>) | undefined;
  // Synthetic authorization boundary only. Storage, HTTP, credentials and crypto are real.
  const verifier: BridgeReceiptVerifier = { async verifyBridgeAuthorization(request) {
    assert.equal(request.bindingCommitment, bindingCommitment);
    assert.equal(request.receipt.receiptId, receipt.receiptId);
    assert.equal(request.receipt.recipient, recipient.publicKey.fingerprint);
    if (verifyGate) await verifyGate();
    if (revoked || diagnostic) throw new Error(privateError);
  } };
  let store = new EvidenceVaultStore(database);
  const options = () => ({
    store, now: () => now, verifier,
    credentials: [writer.credential, reader.credential, other.credential, expiring.credential],
    authorization: { async resolve() { if (resolveGate) await resolveGate(); return { ...receipt, privateDiagnostic: privateError }; } },
    maxBodyBytes: 128 * 1024,
    authorizationTimeoutMs,
  });
  let server = createEvidenceVaultServer(options());
  const listen = async () => {
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  };
  let url = await listen();
  const stop = async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); };
  const request = (token: string | undefined, method = "GET", id: string = message.deliveryId, body?: unknown) => fetch(
    `${url}/v1/evidence/${id}`, {
      method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body ? { "content-type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
  return {
    directory, database, recipient, message, bindingCommitment, writer, reader, other, expiring,
    receipt, verifier, request,
    store: () => store, url: () => url,
    setNow(value: number) { now = value; }, revoke(value = true) { revoked = value; },
    failVerifier() { diagnostic = true; }, gate(value: () => Promise<void>) { verifyGate = value; },
    gateResolver(value: () => Promise<void>) { resolveGate = value; },
    async restart() { await stop(); store.close(); store = new EvidenceVaultStore(database);
      server = createEvidenceVaultServer(options()); url = await listen(); },
    async close() { await stop(); store.close(); await rm(directory, { recursive: true, force: true }); },
  };
}

test("authenticated ciphertext persists across service restart and decrypts only at the recipient", async () => {
  const f = await setup();
  try {
    const uploaded = await f.request(f.writer.token, "PUT", f.message.deliveryId, f.message);
    assert.equal(uploaded.status, 200);
    assert.deepEqual(await uploaded.json(), { deliveryId: f.message.deliveryId });
    const response = await f.request(f.reader.token);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("access-control-allow-origin"), null);
    const received = await response.json() as CiphertextDelivery;
    assert.deepEqual(received, f.message);
    const records = await verifyAndDecryptEvidence(received.bundle, f.bindingCommitment, f.recipient, {
      receipt: f.receipt, now: 1000, verifier: f.verifier,
    });
    assert.equal(new TextDecoder().decode(records[0].plaintext), plaintext);
    records.forEach(record => record.plaintext.fill(0));
    await f.restart();
    assert.deepEqual(await (await f.request(f.reader.token)).json(), f.message);
    const history = f.store().receiptHistory(f.bindingCommitment, f.recipient.publicKey.fingerprint);
    assert.deepEqual(history, [f.receipt]);
    assert.equal(history[0].sourceTransaction.length, 66);
    assert.equal(history[0].recipient.length, 66);
    const saved = await readFile(f.database);
    for (const secret of [plaintext, f.writer.token, f.reader.token, privateError]) {
      assert.equal(saved.includes(Buffer.from(secret)), false);
    }
  } finally { await f.close(); }
});

for (const stage of ["resolve", "upload verification", "retrieval verification"] as const) {
  test(`an authorization deadline bounds ${stage} and ignores late success`, async () => {
    const f = await setup(30);
    let release!: () => void, entered!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const waiting = new Promise<void>(resolve => { entered = resolve; });
    let guard: ReturnType<typeof setTimeout> | undefined;
    let response: Promise<Response> | undefined;
    try {
      const retrieving = stage === "retrieval verification";
      if (retrieving) assert.equal((await f.request(f.writer.token, "PUT", f.message.deliveryId, f.message)).status, 200);
      const wait = async () => { entered(); await gate; };
      if (stage === "resolve") f.gateResolver(wait); else f.gate(wait);
      response = f.request(retrieving ? f.reader.token : f.writer.token, retrieving ? "GET" : "PUT",
        f.message.deliveryId, retrieving ? undefined : f.message);
      await waiting;
      const result = await Promise.race([response, new Promise<never>((_, reject) => {
        guard = setTimeout(() => reject(new Error("Authorization did not return within its deadline")), 500);
      })]);
      assert.equal(result.status, 504);
      assert.deepEqual(await result.json(), { error: "AUTHORIZATION_TIMEOUT" });
      release();
      await new Promise(resolve => setTimeout(resolve, 20));
      assert.equal(f.store().receiptHistory(f.bindingCommitment, f.recipient.publicKey.fingerprint).length, retrieving ? 1 : 0);
    } finally {
      clearTimeout(guard); release();
      if (response) await response.then(result => result.arrayBuffer()).catch(() => {});
      await f.close();
    }
  });
}

test("missing credentials, wrong operation and other binding reveal no ciphertext or listing", async () => {
  const f = await setup();
  try {
    assert.equal((await f.request(undefined, "PUT", f.message.deliveryId, f.message)).status, 401);
    assert.equal((await f.request("unregistered-credential")).status, 401);
    assert.equal((await f.request(f.writer.token, "PUT", f.message.deliveryId, f.message)).status, 200);
    assert.equal((await f.request(f.writer.token)).status, 404);
    assert.equal((await f.request(f.reader.token, "PUT", f.message.deliveryId, f.message)).status, 404);
    const unrelated = await f.request(f.other.token);
    const absent = await f.request(f.other.token, "GET", digest(222));
    assert.equal(unrelated.status, 404);
    assert.equal(absent.status, 404);
    assert.equal(await unrelated.text(), await absent.text());
    const listing = await fetch(`${f.url()}/v1/evidence`, { headers: { authorization: `Bearer ${f.reader.token}` } });
    assert.equal(listing.status, 404);
    const unknownQuery = await fetch(`${f.url()}/v1/evidence/${f.message.deliveryId}?instance=other`,
      { headers: { authorization: `Bearer ${f.reader.token}` } });
    assert.equal(unknownQuery.status, 404);
    assert.equal(f.store().receiptHistory(digest(100), f.recipient.publicKey.fingerprint).length, 0);
  } finally { await f.close(); }
});

test("retry is idempotent and neither ciphertext nor receipt history can be overwritten", async () => {
  const f = await setup();
  try {
    assert.equal((await f.request(f.writer.token, "PUT", f.message.deliveryId, f.message)).status, 200);
    assert.equal((await f.request(f.writer.token, "PUT", f.message.deliveryId, f.message)).status, 200);
    const changed = { ...f.message, bundle: { ...f.message.bundle,
      ciphertexts: [{ ...f.message.bundle.ciphertexts[0], ciphertext: "00".repeat(32) }] } };
    assert.equal((await f.request(f.writer.token, "PUT", f.message.deliveryId, changed)).status, 400);
    f.receipt.sourceTransaction = `00${"ef".repeat(32)}`;
    assert.equal((await f.request(f.writer.token, "PUT", f.message.deliveryId, f.message)).status, 409);
    assert.equal(f.store().receiptHistory(f.bindingCommitment, f.recipient.publicKey.fingerprint).length, 1);
    assert.notEqual(f.store().receiptHistory(f.bindingCommitment, f.recipient.publicKey.fingerprint)[0].sourceTransaction,
      f.receipt.sourceTransaction);
  } finally { await f.close(); }
});

test("expiry, current revocation and verifier failure block retrieval without deleting immutable history", async () => {
  const f = await setup();
  try {
    assert.equal((await f.request(f.writer.token, "PUT", f.message.deliveryId, f.message)).status, 200);
    f.revoke();
    const revoked = await f.request(f.reader.token);
    assert.equal(revoked.status, 403);
    assert.equal((await revoked.text()).includes(privateError), false);
    f.revoke(false); f.setNow(1500);
    assert.equal((await f.request(f.expiring.token)).status, 401);
    assert.equal((await f.request(f.reader.token)).status, 200);
    f.setNow(2000);
    assert.equal((await f.request(f.reader.token)).status, 403);
    assert.deepEqual(f.store().receiptHistory(f.bindingCommitment, f.recipient.publicKey.fingerprint), [f.receipt]);
  } finally { await f.close(); }
});

test("expiry during asynchronous verification prevents storage and plaintext never crosses the service", async () => {
  const f = await setup();
  try {
    const leaked = { ...f.message, plaintext };
    assert.equal((await f.request(f.writer.token, "PUT", f.message.deliveryId, leaked)).status, 400);
    const nested = structuredClone(f.message) as any;
    nested.bundle.manifest.records[0].plaintext = plaintext;
    assert.equal((await f.request(f.writer.token, "PUT", f.message.deliveryId, nested)).status, 400);
    let release!: () => void, entered!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const waiting = new Promise<void>(resolve => { entered = resolve; });
    f.gate(async () => { entered(); await pending; });
    const upload = f.request(f.writer.token, "PUT", f.message.deliveryId, f.message);
    await waiting; f.setNow(2000); release();
    const response = await upload;
    assert.equal(response.status, 403);
    assert.equal((await response.text()).includes(plaintext), false);
    assert.equal(f.store().receiptHistory(f.bindingCommitment, f.recipient.publicKey.fingerprint).length, 0);
  } finally { await f.close(); }
});

test("the service bounds input and withholds internal authorization diagnostics", async () => {
  const f = await setup();
  try {
    const tooLarge = await f.request(f.writer.token, "PUT", f.message.deliveryId, { data: "x".repeat(130 * 1024) });
    assert.equal(tooLarge.status, 413);
    f.failVerifier();
    const denied = await f.request(f.writer.token, "PUT", f.message.deliveryId, f.message);
    assert.equal(denied.status, 403);
    const body = await denied.text();
    assert.equal(body.includes(privateError), false);
    assert.equal(body.includes(plaintext), false);
    assert.equal(f.store().receiptHistory(f.bindingCommitment, f.recipient.publicKey.fingerprint).length, 0);
    assert.notEqual(f.writer.token, f.reader.token);
    assert.equal(f.writer.credential.tokenHash,
      `0x${createHash("sha256").update(`permio:evidence-vault-access:v1\0${f.writer.token}`).digest("hex")}`);
  } finally { await f.close(); }
});
