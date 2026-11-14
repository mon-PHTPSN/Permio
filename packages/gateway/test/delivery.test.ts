import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { getAddress, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { hashProtocolIdentifier } from "../../midnight-authorization/src/canonical.ts";
import { readFinalizedDecisionReceipt, runtimeDecisionReceiptId, type RuntimeDecisionReceiptBody } from "../../midnight-authorization/src/decision-receipt.ts";
import { GatewayStore } from "../src/durable-store.ts";
import { createDurableGatewayDelivery } from "../src/delivery.ts";
import type { GatewayKeyEpoch } from "../src/model.ts";
import type { GatewayTransport } from "../src/transport.ts";

async function setup() {
  const bytes = (n: number) => new Uint8Array(32).fill(n);
  const hex = (n: number): Hex => `0x${Buffer.from(bytes(n)).toString("hex")}`;
  const version = { major: 1n, minor: 0n, patch: 0n };
  const body: RuntimeDecisionReceiptBody = { receiptVersion: 1n,
    moduleIdentity: { moduleIdHash: bytes(1), moduleVersion: version, implementationHash: bytes(2) },
    target: { namespaceHash: bytes(3), templateIdHash: bytes(4), semanticVersion: version, templateContentHash: bytes(5) },
    instanceCommitment: bytes(6), transitioning: false, previousStateCommitment: bytes(0), nextStateCommitment: bytes(0), transitionSequence: 0n,
    contextHash: bytes(7), actionSchemaId: bytes(8), purposeHash: bytes(9), recipient: bytes(10), validAfter: 100n, validBefore: 400n,
    scopedNullifier: bytes(11), outputCommitment: bytes(12), sourceNetwork: Uint8Array.from(Buffer.from(hashProtocolIdentifier("network-id", "preprod").slice(2), "hex")), sourceContract: bytes(13) };
  const request = { network: "preprod" as const, contract: hex(13), transactionId: "00" + "14".repeat(32), receiptId: runtimeDecisionReceiptId(body) };
  const receipt = await readFinalizedDecisionReceipt({ readReceiptAtTransaction: async () => ({ ...request, ledgerSequence: 123n,
    finalized: true, transactionSucceeded: true, receiptIdFromCall: request.receiptId, bodyAtTransaction: body }) }, request);
  const directory = mkdtempSync(join(tmpdir(), "permio-signed-delivery-"));
  const path = join(directory, "gateway.sqlite");
  let store = new GatewayStore(path, request.network, request.contract);
  store.commitObservation({ cursor: "123", sequence: "123", blockHash: hex(15) }, [{ eventIndex: 0, receipt }]);
  const key = store.rows()[0]!.key;
  const old = privateKeyToAccount(generatePrivateKey()), next = privateKeyToAccount(generatePrivateKey());
  const registry = privateKeyToAccount(generatePrivateKey()).address;
  const epochs: GatewayKeyEpoch[] = [ { keyId: "old", verifier: old.address, activeFrom: 100, signingCutoff: 160, verificationCutoff: 180 },
    { keyId: "next", verifier: next.address, activeFrom: 150, signingCutoff: 300, verificationCutoff: 350 } ];
  let now = 140, signing = 0, fail = true, forbidden: typeof old.address[] = [];
  const delivered: GatewayTransport[] = [];
  const requestFetch: typeof fetch = async (_url, init) => {
    const packet = JSON.parse(String(init!.body)) as GatewayTransport;
    assert.equal(store.transports(key, packet.targetChainId, packet.targetRegistry).at(-1)?.signature, packet.signature);
    delivered.push(packet);
    if (fail) throw Error("lost acknowledgement or outage");
    return new Response(JSON.stringify({ outboxKey: packet.outboxKey }), { status: 200 });
  };
  const delivery = (target = registry, chainId = 31337n, beforeSigner: () => Promise<void> = async () => {}) => createDurableGatewayDelivery({ store, endpoint: "http://127.0.0.1:4189/receipts", chainId, registry: target,
    now: () => now, keyPolicy: () => ({ epochs, forbiddenSigners: forbidden }), signerFor: async epoch => { signing++; await beforeSigner(); return epoch.keyId === "old" ? old : next; }, request: requestFetch });
  return { receipt, key, path, registry, old, next, epochs, delivered, delivery,
    get store() { return store; }, get signing() { return signing; },
    time: (value: number) => { now = value; }, allow: () => { fail = false; }, forbid: () => { forbidden = [old.address]; },
    reopen: () => { store.close(); store = new GatewayStore(path, request.network, request.contract); },
    close: () => { store.close(); rmSync(directory, { recursive: true, force: true }); } };
}

test("signed packet is durable before dispatch and survives outage, lost ack and restart unchanged", async () => {
  const s = await setup(); try {
    await assert.rejects(s.delivery()(s.receipt, s.key), /DELIVERY_UNAVAILABLE/);
    assert.equal(s.signing, 1); const first = s.delivered[0]!;
    s.time(145); s.reopen();
    await assert.rejects(s.delivery()(s.receipt, s.key), /DELIVERY_UNAVAILABLE/);
    assert.deepEqual(s.delivered[1], first); assert.equal(s.signing, 1);
    s.allow(); s.time(149);
    assert.deepEqual(await s.delivery()(s.receipt, s.key), { idempotencyKey: s.key });
    assert.deepEqual(s.delivered[2], first); assert.equal(s.signing, 1);
    assert.equal(s.store.rows().length, 1);
  } finally { s.close(); }
});

test("overlap reuses the old packet, verification cutoff appends a new epoch packet", async () => {
  const s = await setup(); try {
    s.allow(); await s.delivery()(s.receipt, s.key);
    s.time(165); await s.delivery()(s.receipt, s.key);
    assert.equal(s.signing, 1); assert.deepEqual(s.delivered[1], s.delivered[0]);
    s.time(180); await s.delivery()(s.receipt, s.key);
    assert.equal(s.signing, 2); assert.equal(s.delivered[2]!.keyId, "next");
    assert.equal(s.delivered[2]!.signedAt, 180);
    assert.equal(s.store.transports(s.key, "31337", s.registry).length, 2);
    assert.equal(s.store.rows().length, 1);
    s.reopen(); s.time(200); await s.delivery()(s.receipt, s.key);
    assert.deepEqual(s.delivered[3], s.delivered[2]); assert.equal(s.signing, 2);
  } finally { s.close(); }
});

test("forbidden historical signer fails closed without resigning", async () => {
  const s = await setup(); try {
    s.allow(); await s.delivery()(s.receipt, s.key); s.forbid();
    await assert.rejects(s.delivery()(s.receipt, s.key), /INVALID_TRANSPORT/);
    assert.equal(s.epochs.length, 2);
    assert.equal(s.signing, 1); assert.equal(s.delivered.length, 1);
  } finally { s.close(); }
});

test("removed historical epoch fails its missing-key guard while the signer remains allowed", async () => {
  const s = await setup(); try {
    s.allow(); await s.delivery()(s.receipt, s.key);
    s.epochs.shift(); s.time(185);
    await assert.rejects(s.delivery()(s.receipt, s.key), /SAVED_TRANSPORT_KEY_NOT_CONFIGURED/);
    assert.equal(s.signing, 1); assert.equal(s.delivered.length, 1);
  } finally { s.close(); }
});

function signerGate() {
  let entered!: () => void, release!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const pending = new Promise<void>(resolve => { release = resolve; });
  return { started, release, wait: async () => { entered(); await pending; } };
}

test("dispatch rechecks signer policy after awaiting signerFor", async () => {
  const s = await setup(), gate = signerGate(); try {
    s.allow();
    const pending = s.delivery(s.registry, 31337n, gate.wait)(s.receipt, s.key);
    await gate.started; s.forbid(); gate.release();
    await assert.rejects(pending, /INVALID_TRANSPORT/);
    assert.equal(s.signing, 1); assert.equal(s.delivered.length, 0);
  } finally { gate.release(); s.close(); }
});

test("dispatch rechecks receipt expiry after awaiting signerFor while its key remains valid", async () => {
  const s = await setup(), gate = signerGate(); try {
    s.epochs[0] = { ...s.epochs[0]!, signingCutoff: 450, verificationCutoff: 500 };
    s.allow();
    const pending = s.delivery(s.registry, 31337n, gate.wait)(s.receipt, s.key);
    await gate.started; s.time(400); gate.release();
    await assert.rejects(pending, /RECEIPT_OUTSIDE_VALIDITY/);
    assert.equal(s.signing, 1); assert.equal(s.delivered.length, 0);
  } finally { gate.release(); s.close(); }
});

test("different targets receive separately persisted domain-bound packets", async () => {
  const s = await setup(); try {
    s.allow(); await s.delivery()(s.receipt, s.key);
    const target = privateKeyToAccount(generatePrivateKey()).address;
    await s.delivery(target, 31338n)(s.receipt, s.key);
    assert.equal(s.delivered[1]!.targetRegistry, getAddress(target));
    assert.equal(s.delivered[1]!.targetChainId, "31338");
    assert.notEqual(s.delivered[1]!.signature, s.delivered[0]!.signature);
    assert.equal(s.store.transports(s.key, "31337", s.registry).length, 1);
    assert.equal(s.store.transports(s.key, "31338", target).length, 1);
  } finally { s.close(); }
});

test("modified receipt, unknown outbox identity and expired receipt never dispatch", async () => {
  const s = await setup(); try {
    s.allow();
    await assert.rejects(s.delivery()({ ...s.receipt, recipient: s.receipt.sourceContract }, s.key));
    await assert.rejects(s.delivery()(s.receipt, `0x${"fe".repeat(32)}`));
    s.time(400); await assert.rejects(s.delivery()(s.receipt, s.key), /RECEIPT_OUTSIDE_VALIDITY/);
    assert.equal(s.signing, 0); assert.equal(s.delivered.length, 0);
  } finally { s.close(); }
});

for (const rehash of [false, true]) test(`tampered persisted packet cannot be silently resigned (rehash=${rehash})`, async () => {
  const s = await setup(); try {
    s.allow(); await s.delivery()(s.receipt, s.key);
    const db = new DatabaseSync(s.path);
    const row = db.prepare("SELECT id, packet FROM gateway_transports").get()!;
    const packet = JSON.parse(String(row.packet)); packet.signature = `0x${"ab".repeat(65)}`;
    const text = JSON.stringify(packet);
    if (rehash) db.prepare("UPDATE gateway_transports SET packet = ?, packet_hash = ? WHERE id = ?").run(text, createHash("sha256").update(text).digest("hex"), row.id!);
    else db.prepare("UPDATE gateway_transports SET packet = ? WHERE id = ?").run(text, row.id!);
    db.close();
    await assert.rejects(s.delivery()(s.receipt, s.key));
    assert.equal(s.signing, 1); assert.equal(s.delivered.length, 1);
  } finally { s.close(); }
});

test("concurrent delivery shares one signing boundary and rejects a changed source for the same key", async () => {
  const s = await setup(); try {
    s.allow(); const deliver = s.delivery();
    const pending = deliver(s.receipt, s.key);
    await assert.rejects(deliver({ ...s.receipt, sourceTransaction: "01" + s.receipt.sourceTransaction.slice(2) }, s.key), /DELIVERY_SOURCE_MISMATCH/);
    await Promise.all([pending, deliver(s.receipt, s.key)]);
    assert.equal(s.signing, 1); assert.equal(s.delivered.length, 1);
  } finally { s.close(); }
});
