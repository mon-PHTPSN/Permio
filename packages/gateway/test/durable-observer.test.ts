import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { hashProtocolIdentifier } from "../../midnight-authorization/src/canonical.ts";
import { runtimeDecisionReceiptId, type RuntimeDecisionReceiptBody } from "../../midnight-authorization/src/decision-receipt.ts";
import { GatewayStore } from "../src/durable-store.ts";
import { GatewayObserver, type FinalizedReceiptBatch, type GatewayObserverDependencies } from "../src/observer.ts";

const bytes = (n: number) => new Uint8Array(32).fill(n);
const hex = (n: number): `0x${string}` => `0x${Buffer.from(bytes(n)).toString("hex")}`;
function setup() {
  const directory = mkdtempSync(join(tmpdir(), "permio-gateway-"));
  const path = join(directory, "gateway.sqlite");
  const version = { major: 1n, minor: 0n, patch: 0n };
  const body: RuntimeDecisionReceiptBody = {
    receiptVersion: 1n, moduleIdentity: { moduleIdHash: bytes(1), moduleVersion: version, implementationHash: bytes(2) },
    target: { namespaceHash: bytes(3), templateIdHash: bytes(4), semanticVersion: version, templateContentHash: bytes(5) },
    instanceCommitment: bytes(6), transitioning: false, previousStateCommitment: bytes(0), nextStateCommitment: bytes(0),
    transitionSequence: 0n, contextHash: bytes(7), actionSchemaId: bytes(8), purposeHash: bytes(9), recipient: bytes(10),
    validAfter: 100n, validBefore: 200n, scopedNullifier: bytes(11), outputCommitment: bytes(12),
    sourceNetwork: Uint8Array.from(Buffer.from(hashProtocolIdentifier("network-id", "preprod").slice(2), "hex")), sourceContract: bytes(13),
  };
  const request = { transactionId: "00" + "14".repeat(32), receiptId: runtimeDecisionReceiptId(body), eventIndex: 0 };
  let batch: FinalizedReceiptBatch = { checkpoint: { cursor: "finalized-123", sequence: "123", blockHash: hex(15) }, events: [request] };
  let intact = true, active = true, finalized = true, now = 150, calls = 0;
  const delivered = new Set<string>();
  const dependencies: GatewayObserverDependencies = {
    network: "preprod", contract: hex(13),
    allowedReceipts: [{ namespaceHash: hex(3), templateIdHash: hex(4), semanticVersion: "1.0.0",
      templateContentHash: hex(5), proofModuleId: hex(1), proofModuleVersion: "1.0.0", implementationHash: hex(2) }],
    discovery: { scan: async () => batch, verifyCheckpoint: async () => intact },
    receiptReader: { readReceiptAtTransaction: async transactionId => ({ network: "preprod", contract: hex(13), transactionId,
      ledgerSequence: 123n, finalized, transactionSucceeded: true, receiptIdFromCall: request.receiptId, bodyAtTransaction: body }) },
    historicalStatus: { read: async receipt => ({ sourceLedgerSequence: receipt.sourceLedgerSequence,
      templateRegistry: hex(13), proofModuleRegistry: hex(13), templateActive: active, moduleActive: active }) },
    deliver: async (receipt, key) => { assert.equal(receipt.recipient, hex(10)); assert.equal(receipt.sourceTransaction.length, 66);
      calls++; delivered.add(key); return { idempotencyKey: key }; },
    now: () => now, retrySeconds: 5,
  };
  return { path, request, body, dependencies, delivered, calls: () => calls,
    setBatch: (value: FinalizedReceiptBatch) => { batch = value; },
    setIntact: (value: boolean) => { intact = value; }, setActive: (value: boolean) => { active = value; },
    setFinalized: (value: boolean) => { finalized = value; }, setNow: (value: number) => { now = value; },
    cleanup: () => rmSync(directory, { recursive: true, force: true }) };
}

test("finalized checkpoint and one unchanged receipt survive restart and duplicate discovery", async () => {
  const f = setup(); let store = new GatewayStore(f.path, "preprod", hex(13));
  try {
    const observer = new GatewayObserver(store, f.dependencies);
    await observer.observeOnce(); await observer.observeOnce();
    assert.equal(store.rows().length, 1); assert.equal(store.checkpoint()?.sequence, "123");
    store.close(); store = new GatewayStore(f.path, "preprod", hex(13));
    await new GatewayObserver(store, f.dependencies).deliverOnce();
    assert.equal(store.rows()[0]?.state, "delivered"); assert.equal(f.delivered.size, 1);
    assert.equal(store.rows()[0]?.attempts, 1);
  } finally { store.close(); f.cleanup(); }
});

test("downstream failure persists a fixed retry category and retries only after due time", async () => {
  const f = setup(); let store = new GatewayStore(f.path, "preprod", hex(13));
  try {
    let fail = true; const deliver = f.dependencies.deliver;
    const deps = { ...f.dependencies, deliver: async (...args: Parameters<typeof deliver>) => {
      if (fail) throw Error("secret-credential-must-not-be-stored"); return deliver(...args);
    } };
    await new GatewayObserver(store, deps).observeOnce(); await new GatewayObserver(store, deps).deliverOnce();
    assert.equal(store.rows()[0]?.lastError, "DELIVERY_FAILED"); assert.equal(store.rows()[0]?.nextRetryAt, 155);
    assert(!JSON.stringify(store.rows()).includes("secret-credential"));
    store.close(); store = new GatewayStore(f.path, "preprod", hex(13)); fail = false;
    assert.equal(await new GatewayObserver(store, deps).deliverOnce(), false);
    f.setNow(155); assert.equal(await new GatewayObserver(store, deps).deliverOnce(), true);
    assert.equal(store.rows()[0]?.attempts, 2);
  } finally { store.close(); f.cleanup(); }
});

test("delivery crash after endpoint acceptance resumes with the same idempotency key", async () => {
  const f = setup(); let store = new GatewayStore(f.path, "preprod", hex(13));
  try {
    await new GatewayObserver(store, f.dependencies).observeOnce();
    const row = store.claimDue(150)!; await f.dependencies.deliver(row.receipt, row.key);
    store.close(); store = new GatewayStore(f.path, "preprod", hex(13));
    await new GatewayObserver(store, f.dependencies).deliverOnce();
    assert.equal(f.calls(), 2); assert.equal(f.delivered.size, 1); assert.equal(store.rows()[0]?.state, "delivered");
  } finally { store.close(); f.cleanup(); }
});

test("finalized checkpoint inconsistency is durable and prevents observation and delivery", async () => {
  const f = setup(); let store = new GatewayStore(f.path, "preprod", hex(13));
  try {
    const observer = new GatewayObserver(store, f.dependencies); await observer.observeOnce(); f.setIntact(false);
    await assert.rejects(observer.observeOnce(), /FINALITY_INTEGRITY/);
    store.close(); store = new GatewayStore(f.path, "preprod", hex(13));
    assert.equal(store.integrityError(), "FINALITY_INTEGRITY");
    await assert.rejects(new GatewayObserver(store, f.dependencies).deliverOnce(), /FINALITY_INTEGRITY/);
    assert.equal(f.delivered.size, 0);
  } finally { store.close(); f.cleanup(); }
});

test("pending sources, inactive historical registry entries and source failures never enter outbox", async () => {
  for (const mode of ["pending", "inactive", "unavailable"] as const) {
    const f = setup(); const store = new GatewayStore(f.path, "preprod", hex(13));
    try {
      if (mode === "pending") f.setFinalized(false);
      if (mode === "inactive") f.setActive(false);
      const deps = mode === "unavailable" ? { ...f.dependencies, receiptReader: { readReceiptAtTransaction: async () => { throw Error("credential"); } } } : f.dependencies;
      await assert.rejects(new GatewayObserver(store, deps).observeOnce());
      assert.equal(store.rows().length, 0); assert.equal(store.checkpoint(), null);
    } finally { store.close(); f.cleanup(); }
  }
});

test("atomic observation rolls back all rows on conflicting finalized identity", async () => {
  const f = setup(); const store = new GatewayStore(f.path, "preprod", hex(13));
  try {
    const observer = new GatewayObserver(store, f.dependencies); await observer.observeOnce();
    const first = store.rows()[0]!;
    assert.throws(() => store.commitObservation({ cursor: "later", sequence: "124", blockHash: hex(16) },
      [{ eventIndex: 0, receipt: { ...first.receipt, sourceTransaction: "00" + "23".repeat(32), sourceLedgerSequence: "124" } },
       { eventIndex: 0, receipt: { ...first.receipt, sourceLedgerSequence: "124", outputCommitment: hex(30) } }]), /FINALITY_INTEGRITY/);
    assert.equal(store.rows().length, 1); assert.equal(store.checkpoint()?.sequence, "123");
    assert.equal(store.integrityError(), "FINALITY_INTEGRITY");
  } finally { store.close(); f.cleanup(); }
});

test("exact template and module allowlist is required and binds every version and identity", async () => {
  const f = setup(); const store = new GatewayStore(f.path, "preprod", hex(13));
  try {
    assert.throws(() => new GatewayObserver(store, { ...f.dependencies, allowedReceipts: [] }), /INVALID_OBSERVER_CONFIGURATION/);
    const original = f.dependencies.allowedReceipts[0]!;
    for (const field of ["namespaceHash", "templateIdHash", "semanticVersion", "templateContentHash",
      "proofModuleId", "proofModuleVersion", "implementationHash"] as const) {
      const changed = { ...original, [field]: field.includes("Version") ? "2.0.0" : hex(31) };
      await assert.rejects(new GatewayObserver(store, { ...f.dependencies, allowedReceipts: [changed] }).observeOnce(), /RECEIPT_NOT_ALLOWLISTED/);
    }
    assert.equal(store.rows().length, 0); assert.equal(store.checkpoint(), null);
  } finally { store.close(); f.cleanup(); }
});

test("a scan cannot inject a previously unseen event behind the durable finalized cursor", async () => {
  const f = setup(); const store = new GatewayStore(f.path, "preprod", hex(13));
  try {
    store.commitObservation({ cursor: "finalized-124", sequence: "124", blockHash: hex(15) }, []);
    await assert.rejects(new GatewayObserver(store, f.dependencies).observeOnce(), /FINALITY_INTEGRITY/);
    assert.equal(store.rows().length, 0); assert.equal(store.checkpoint()?.sequence, "124");
    assert.equal(store.integrityError(), "FINALITY_INTEGRITY");
  } finally { store.close(); f.cleanup(); }
});

test("a long-running observer retries classified source outages and then resumes", async () => {
  const f = setup(); const store = new GatewayStore(f.path, "preprod", hex(13));
  const controller = new AbortController(); let scans = 0;
  try {
    const deps = { ...f.dependencies, discovery: { ...f.dependencies.discovery, scan: async () => {
      scans++;
      if (scans === 1) throw Error("must-not-persist-provider-credential");
      assert.equal(store.sourceError(), "SOURCE_UNAVAILABLE");
      controller.abort(); return f.dependencies.discovery.scan(null);
    } } };
    await new GatewayObserver(store, deps).run(controller.signal, 1);
    assert.equal(scans, 2); assert.equal(store.sourceError(), null); assert.equal(store.rows().length, 1);
  } finally { store.close(); f.cleanup(); }
});

test("expiry after durable capture is terminal and a mismatched acknowledgement is retried", async () => {
  const f = setup(); const store = new GatewayStore(f.path, "preprod", hex(13));
  try {
    const observer = new GatewayObserver(store, { ...f.dependencies, deliver: async () => ({ idempotencyKey: hex(25) }) });
    await observer.observeOnce(); await observer.deliverOnce();
    assert.equal(store.rows()[0]?.state, "retry");
    f.setNow(200); await observer.deliverOnce();
    assert.equal(store.rows()[0]?.state, "rejected"); assert.equal(store.rows()[0]?.lastError, "RECEIPT_EXPIRED");
    assert.equal(await observer.deliverOnce(), false); assert.equal(f.delivered.size, 0);
  } finally { store.close(); f.cleanup(); }
});

test("restart after delivery claim and after acknowledgement preserves a single logical record", async () => {
  const f = setup(); let store = new GatewayStore(f.path, "preprod", hex(13));
  try {
    await new GatewayObserver(store, f.dependencies).observeOnce();
    assert.notEqual(store.claimDue(150), null);
    store.close(); store = new GatewayStore(f.path, "preprod", hex(13));
    await new GatewayObserver(store, f.dependencies).deliverOnce();
    store.close(); store = new GatewayStore(f.path, "preprod", hex(13));
    assert.equal(await new GatewayObserver(store, f.dependencies).deliverOnce(), false);
    assert.equal(store.rows().length, 1); assert.equal(store.rows()[0]?.attempts, 2);
    assert.equal(f.calls(), 1);
  } finally { store.close(); f.cleanup(); }
});

test("all receipts from distinct transactions in one finalized block commit atomically", async () => {
  const f = setup(); const store = new GatewayStore(f.path, "preprod", hex(13));
  try {
    const secondBody = { ...f.body, scopedNullifier: bytes(29) };
    const second = { transactionId: "00" + "28".repeat(32), receiptId: runtimeDecisionReceiptId(secondBody), eventIndex: 0 };
    f.setBatch({ checkpoint: { cursor: "finalized-123", sequence: "123", blockHash: hex(15) }, events: [f.request, second] });
    const deps = { ...f.dependencies, receiptReader: { readReceiptAtTransaction: async (transactionId: string) => ({
      ...await f.dependencies.receiptReader.readReceiptAtTransaction(transactionId),
      receiptIdFromCall: transactionId === second.transactionId ? second.receiptId : f.request.receiptId,
      bodyAtTransaction: transactionId === second.transactionId ? secondBody : f.body,
    }) } };
    assert.equal(await new GatewayObserver(store, deps).observeOnce(), 2);
    assert.equal(store.rows().length, 2); assert.equal(store.checkpoint()?.sequence, "123");
    assert.equal(await new GatewayObserver(store, deps).observeOnce(), 2); assert.equal(store.rows().length, 2);
  } finally { store.close(); f.cleanup(); }
});

test("a block boundary cannot include a receipt from another block or a fabricated event index", async () => {
  for (const mode of ["sequence", "index"] as const) {
    const f = setup(); const store = new GatewayStore(f.path, "preprod", hex(13));
    try {
      f.setBatch({ checkpoint: { cursor: "finalized-124", sequence: mode === "sequence" ? "124" : "123", blockHash: hex(15) },
        events: [{ ...f.request, eventIndex: mode === "index" ? 1 : 0 }] });
      await assert.rejects(new GatewayObserver(store, f.dependencies).observeOnce(),
        mode === "sequence" ? /INCOMPLETE_FINALIZED_BLOCK/ : /INVALID_SOURCE_EVENT_INDEX/);
      assert.equal(store.rows().length, 0); assert.equal(store.checkpoint(), null);
    } finally { store.close(); f.cleanup(); }
  }
});
test("an expired exact replay after restart preserves the delivered receipt and can advance", async () => {
  const f = setup(); let store = new GatewayStore(f.path, "preprod", hex(13));
  try {
    let observer = new GatewayObserver(store, f.dependencies);
    await observer.observeOnce(); await observer.deliverOnce();
    store.close(); store = new GatewayStore(f.path, "preprod", hex(13)); f.setNow(200);
    observer = new GatewayObserver(store, f.dependencies);
    assert.equal(await observer.observeOnce(), 1);
    assert.equal(store.rows()[0]?.state, "delivered"); assert.equal(f.calls(), 1);
    f.setBatch({ checkpoint: { cursor: "finalized-124", sequence: "124", blockHash: hex(16) }, events: [] });
    await observer.observeOnce(); assert.equal(store.checkpoint()?.sequence, "124");
  } finally { store.close(); f.cleanup(); }
});

test("catch-up records expired receipts without blocking valid receipts in the same block", async () => {
  const f = setup(); const store = new GatewayStore(f.path, "preprod", hex(13));
  try {
    f.setNow(200);
    const secondBody = { ...f.body, validBefore: 300n, scopedNullifier: bytes(29) };
    const second = { transactionId: "00" + "28".repeat(32), receiptId: runtimeDecisionReceiptId(secondBody), eventIndex: 0 };
    f.setBatch({ checkpoint: { cursor: "finalized-123", sequence: "123", blockHash: hex(15) }, events: [f.request, second] });
    const deps = { ...f.dependencies, receiptReader: { readReceiptAtTransaction: async (transactionId: string) => ({
      ...await f.dependencies.receiptReader.readReceiptAtTransaction(transactionId),
      receiptIdFromCall: transactionId === second.transactionId ? second.receiptId : f.request.receiptId,
      bodyAtTransaction: transactionId === second.transactionId ? secondBody : f.body,
    }) } };
    const observer = new GatewayObserver(store, deps);
    await observer.observeOnce();
    assert.equal(store.rows()[0]?.state, "rejected"); assert.equal(store.rows()[0]?.lastError, "RECEIPT_EXPIRED");
    assert.equal(store.rows()[1]?.state, "pending"); assert.equal(store.checkpoint()?.sequence, "123");
    await observer.deliverOnce(); assert.equal(store.rows()[1]?.state, "delivered"); assert.equal(f.calls(), 1);
  } finally { store.close(); f.cleanup(); }
});

test("checkpoint object key order cannot change finalized source identity", async () => {
  const f = setup(); const store = new GatewayStore(f.path, "preprod", hex(13));
  try {
    await new GatewayObserver(store, f.dependencies).observeOnce();
    f.setBatch({ checkpoint: { blockHash: hex(15), sequence: "123", cursor: "finalized-123" }, events: [f.request] });
    await new GatewayObserver(store, f.dependencies).observeOnce();
    assert.equal(store.integrityError(), null); assert.equal(store.rows().length, 1);
  } finally { store.close(); f.cleanup(); }
});

test("a restarted observer never dispatches a queued receipt removed from its exact allowlist", async () => {
  const f = setup(); let store = new GatewayStore(f.path, "preprod", hex(13));
  try {
    await new GatewayObserver(store, f.dependencies).observeOnce();
    store.close(); store = new GatewayStore(f.path, "preprod", hex(13));
    const observer = new GatewayObserver(store, { ...f.dependencies, allowedReceipts: [
      { ...f.dependencies.allowedReceipts[0]!, implementationHash: hex(31) },
    ] });
    await observer.deliverOnce();
    assert.equal(f.calls(), 0); assert.equal(store.rows()[0]?.state, "rejected");
    assert.equal(store.rows()[0]?.lastError, "RECEIPT_NOT_ALLOWLISTED");
  } finally { store.close(); f.cleanup(); }
});

test("typed transient receipt-read outages retry in the same long-running observer", async () => {
  const f = setup(); const store = new GatewayStore(f.path, "preprod", hex(13));
  const controller = new AbortController(); let reads = 0;
  try {
    const sourceModule = await import("../../midnight-authorization/src/indexed-receipt-read.ts");
    const deps = { ...f.dependencies, receiptReader: { readReceiptAtTransaction: async (transactionId: string) => {
      if (++reads === 1) throw new sourceModule.IndexedReceiptUnavailableError();
      assert.equal(store.sourceError(), "SOURCE_UNAVAILABLE"); controller.abort();
      return f.dependencies.receiptReader.readReceiptAtTransaction(transactionId);
    } } };
    await new GatewayObserver(store, deps).run(controller.signal, 1);
    assert.equal(reads, 2); assert.equal(store.rows().length, 1); assert.equal(store.sourceError(), null);
  } finally { store.close(); f.cleanup(); }
});

test("a source integrity error halts the store instead of becoming a retryable outage", async () => {
  const { GatewaySourceError } = await import("../src/errors.ts");
  const f = setup(), store = new GatewayStore(f.path, "preprod", hex(13));
  try {
    const observer = new GatewayObserver(store, { ...f.dependencies, discovery: { ...f.dependencies.discovery, scan: async () => { throw new GatewaySourceError("INTEGRITY"); } } });
    await assert.rejects(observer.observeOnce(), /FINALITY_INTEGRITY/);
    assert.equal(store.integrityError(), "FINALITY_INTEGRITY"); assert.equal(store.checkpoint(), null);
  } finally { store.close(); f.cleanup(); }
});

test("historical semantic rejection is terminal and does not become a status outage", async () => {
  const { GatewaySourceError } = await import("../src/errors.ts");
  const f = setup(), store = new GatewayStore(f.path, "preprod", hex(13));
  try {
    const observer = new GatewayObserver(store, { ...f.dependencies, historicalStatus: { read: async () => { throw new GatewaySourceError("REJECTED"); } } });
    await assert.rejects(observer.observeOnce(), /SOURCE_STATUS_REJECTED/);
    assert.equal(store.checkpoint(), null); assert.equal(store.rows().length, 0);
  } finally { store.close(); f.cleanup(); }
});
