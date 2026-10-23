import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { keccak256 } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { hashProtocolIdentifier } from "../../midnight-authorization/src/canonical.ts";
import { readFinalizedDecisionReceipt, runtimeDecisionReceiptId,
  type RuntimeDecisionReceiptBody } from "../../midnight-authorization/src/decision-receipt.ts";
import { encodeM6ReceiptV1, decodeM6ReceiptV1, m6SourceIdentityHash } from "../src/m6-receipt-codec.ts";
import { GatewayStore } from "../src/durable-store.ts";
import { GatewayObserver, type GatewayObserverDependencies } from "../src/observer.ts";
import { deriveGatewayOutboxKey } from "../src/outbox-key.ts";
import { deliverGatewayTransport, signGatewayTransport, verifyGatewayTransport } from "../src/transport.ts";

// Explicit synthetic source through the real M6 v1 decoder. JSON is opaque TEST payload encoding,
// not an M8 wire format, an authenticated chain adapter, or live M6/M7/M8 acceptance evidence.
test("fixture decoder -> durable observer -> signed loopback HTTP survives outage, lost ack and restart", async () => {
  const bytes = (n: number) => new Uint8Array(32).fill(n);
  const hex = (n: number): `0x${string}` => `0x${Buffer.from(bytes(n)).toString("hex")}`;
  const version = { major: 1n, minor: 0n, patch: 0n };
  const body: RuntimeDecisionReceiptBody = {
    receiptVersion: 1n, moduleIdentity: { moduleIdHash: bytes(1), moduleVersion: version, implementationHash: bytes(2) },
    target: { namespaceHash: bytes(3), templateIdHash: bytes(4), semanticVersion: version, templateContentHash: bytes(5) },
    instanceCommitment: bytes(6), transitioning: false, previousStateCommitment: bytes(0), nextStateCommitment: bytes(0),
    transitionSequence: 0n, contextHash: bytes(7), actionSchemaId: bytes(8), purposeHash: bytes(9), recipient: bytes(10),
    validAfter: 100n, validBefore: 200n, scopedNullifier: bytes(11), outputCommitment: bytes(12),
    sourceNetwork: Uint8Array.from(Buffer.from(hashProtocolIdentifier("network-id", "preprod").slice(2), "hex")),
    sourceContract: bytes(13),
  };
  const source = { network: "preprod" as const, contract: hex(13),
    transactionId: "00" + "14".repeat(32), receiptId: runtimeDecisionReceiptId(body) };
  const receiptReader = { readReceiptAtTransaction: async (transactionId: string) => ({
    network: source.network, contract: source.contract, transactionId, ledgerSequence: 123n,
    finalized: true, transactionSucceeded: true, receiptIdFromCall: source.receiptId, bodyAtTransaction: body,
  }) };
  // Receiver-owned expected values come from the known test source, never packet-supplied hashes.
  const knownReceipt = await readFinalizedDecisionReceipt(receiptReader, source);
  const knownEncoded = encodeM6ReceiptV1(knownReceipt);
  assert.deepEqual(decodeM6ReceiptV1(knownEncoded), knownReceipt);
  const receiptHash = keccak256(knownEncoded);
  const sourceIdentityHash = m6SourceIdentityHash(knownReceipt);
  const outboxKey = deriveGatewayOutboxKey({ networkId: source.network, contractId: source.contract,
    transactionId: source.transactionId, eventIndex: 0, ledgerSequence: 123n },
    { receiptVersion: "1", scopedNullifier: knownReceipt.scopedNullifier });
  const account = privateKeyToAccount(generatePrivateKey());
  const attacker = privateKeyToAccount(generatePrivateKey());
  const registry = privateKeyToAccount(generatePrivateKey()).address;
  const epochs = [{ keyId: "fixture-gateway-key-v1", verifier: account.address,
    activeFrom: 100, signingCutoff: 200, verificationCutoff: 250 }];
  const target = { chainId: 31337n, registry };
  let now = 150;
  const accepted = new Set<string>(), deliveredKeys: string[] = [];
  let authorizedRequests = 0;
  const server = createServer(async (request, response) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const packet: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      let verified;
      try {
        verified = await verifyGatewayTransport(packet, { ...target, outboxKey, sourceIdentityHash,
          receiptHash, epochs, forbiddenSigners: [], verifiedAt: now });
      } catch { response.writeHead(401).end("AUTHENTICATION_REJECTED"); return; }
      assert.equal(verified.encodedReceipt, knownEncoded);
      authorizedRequests++;
      if (authorizedRequests === 1) { response.writeHead(503).end("TEMPORARY_UNAVAILABLE"); return; }
      accepted.add(verified.outboxKey);
      deliveredKeys.push(verified.outboxKey);
      if (authorizedRequests === 2) {
        // Logical consumer acceptance happened, but its acknowledgement never reaches the gateway.
        response.destroy(); return;
      }
      response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ outboxKey: verified.outboxKey }));
    } catch { response.writeHead(400).end("REQUEST_REJECTED"); }
  });
  await new Promise<void>((done, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", done); });
  const address = server.address(); assert(address !== null && typeof address !== "string");
  const endpoint = `http://127.0.0.1:${address.port}/receipts`;
  const directory = mkdtempSync(join(tmpdir(), "permio-transport-observer-"));
  const path = join(directory, "gateway.sqlite");
  let store: GatewayStore | undefined;
  try {
    const packet = await signGatewayTransport({ ...target, outboxKey, sourceIdentityHash,
      encodedReceipt: knownEncoded, signedAt: now, epochs, account, forbiddenSigners: [] });
    const forged = await signGatewayTransport({ ...target, outboxKey, sourceIdentityHash,
      encodedReceipt: knownEncoded, signedAt: now, account: attacker,
      epochs: [{ ...epochs[0]!, verifier: attacker.address }], forbiddenSigners: [] });
    for (const denied of [{ ...packet, encodedReceipt: "0x0102" }, forged,
      { ...packet, sourceIdentityHash: hex(20) }]) {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(denied) });
      assert.equal(response.status, 401); await response.body?.cancel();
    }
    assert.equal(accepted.size, 0); assert.equal(authorizedRequests, 0);
    const dependencies: GatewayObserverDependencies = {
      network: source.network, contract: source.contract,
      allowedReceipts: [{ namespaceHash: knownReceipt.namespaceHash, templateIdHash: knownReceipt.templateIdHash,
        semanticVersion: knownReceipt.semanticVersion, templateContentHash: knownReceipt.templateContentHash,
        proofModuleId: knownReceipt.proofModuleId, proofModuleVersion: knownReceipt.proofModuleVersion,
        implementationHash: knownReceipt.implementationHash }],
      discovery: { scan: async () => ({ checkpoint: { cursor: "fixture-finalized-block-123", sequence: "123", blockHash: hex(15) },
        events: [{ transactionId: source.transactionId, receiptId: source.receiptId, eventIndex: 0 }] }),
        verifyCheckpoint: async checkpoint => checkpoint.sequence === "123" && checkpoint.blockHash === hex(15) },
      receiptReader,
      historicalStatus: { read: async receipt => ({ sourceLedgerSequence: receipt.sourceLedgerSequence,
        templateRegistry: source.contract, proofModuleRegistry: source.contract, templateActive: true, moduleActive: true }) },
      deliver: async (receipt, key) => {
        assert.deepEqual(receipt, knownReceipt);
        const signed = await signGatewayTransport({ ...target, outboxKey: key, sourceIdentityHash,
          encodedReceipt: encodeM6ReceiptV1(receipt), signedAt: now, epochs, account, forbiddenSigners: [] });
        const ack = await deliverGatewayTransport(endpoint, signed);
        return { idempotencyKey: ack.outboxKey };
      }, now: () => now, retrySeconds: 5,
    };
    store = new GatewayStore(path, source.network, source.contract);
    let observer = new GatewayObserver(store, dependencies);
    await observer.observeOnce();
    await observer.deliverOnce();
    assert.equal(store.rows()[0]?.state, "retry");
    assert.equal(store.rows()[0]?.lastError, "DELIVERY_FAILED");
    assert.equal(store.rows()[0]?.nextRetryAt, 155);
    assert.equal(accepted.size, 0);
    store.close(); store = new GatewayStore(path, source.network, source.contract);
    observer = new GatewayObserver(store, dependencies);
    assert.equal(await observer.deliverOnce(), false);
    now = 155;
    await observer.deliverOnce();
    assert.equal(store.rows()[0]?.state, "retry");
    assert.equal(store.rows()[0]?.attempts, 2);
    assert.equal(store.rows()[0]?.nextRetryAt, 160);
    assert.equal(accepted.size, 1);
    store.close(); store = new GatewayStore(path, source.network, source.contract);
    observer = new GatewayObserver(store, dependencies);
    now = 160;
    await observer.observeOnce(); // Restart and duplicate discovery cannot add another logical row.
    await observer.deliverOnce();
    assert.equal(store.rows().length, 1);
    assert.equal(store.rows()[0]?.key, outboxKey);
    assert.equal(store.rows()[0]?.state, "delivered");
    assert.equal(store.rows()[0]?.attempts, 3);
    assert.equal(accepted.size, 1);
    assert.deepEqual(deliveredKeys, [outboxKey, outboxKey]);
    assert.equal(await observer.deliverOnce(), false);
    assert.equal(authorizedRequests, 3);
  } finally {
    store?.close();
    server.closeAllConnections();
    await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()));
    const resolved = resolve(directory);
    assert.equal(dirname(resolved), resolve(tmpdir()));
    assert(basename(resolved).startsWith("permio-transport-observer-"));
    rmSync(resolved, { recursive: true, force: true });
  }
});
