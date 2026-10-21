import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { getNetworkId, setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { ChargedState, ContractState } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { ledger } from "../../midnight-authorization/contracts/managed/permio-authorization/contract/index.js";
import { readFinalizedDecisionReceipt } from "../../midnight-authorization/src/decision-receipt.ts";
import { PreprodConnectionProfile } from "../../midnight-authorization/src/preprod-profile.ts";
import { seedGeneratedMap } from "../../midnight-authorization/test/fixtures/generated-genesis.ts";
import { IndexedReceiptUnavailableError } from "../../midnight-authorization/src/indexed-receipt-read.ts";
import { createIndexedGatewaySource, INDEXED_GATEWAY_FINALITY_POLICY } from "../src/indexed-source.ts";
import { GatewayStore } from "../src/durable-store.ts";
import { GatewayObserver } from "../src/observer.ts";

// Recorded public ContractState only: no private witness, wallet, payload or proof keys.
const recorded = readFileSync(new URL("./fixtures/recorded-preprod-receipt-050-state.bin", import.meta.url));
const source = JSON.parse(readFileSync(new URL("./fixtures/recorded-preprod-receipt-050-source.json", import.meta.url), "utf8"));
assert.equal(createHash("sha256").update(recorded).digest("hex"), source.stateSha256);
const publicState = () => ContractState.deserialize(recorded);
const body = [...ledger(publicState().data).decisionReceipts][0]![1];
const contract = `0x${Buffer.from(body.sourceContract).toString("hex")}` as const;
const hash = (n: string) => `0x${n.repeat(64)}`;
const profile = new PreprodConnectionProfile("nightpreprod_synthetic_read_only_test");
const config = () => ({ network: "preprod" as const, contract, startBlock: source.blockHeight,
  finalityPolicy: INDEXED_GATEWAY_FINALITY_POLICY, profile,
  publicDataProvider: { async watchForTxData() { throw Error("Synthetic tests do not assert SDK finality"); } } as any });
async function receipt() {
  return readFinalizedDecisionReceipt({ readReceiptAtTransaction: async () => ({ network: "preprod", contract,
    transactionId: source.transactionId, ledgerSequence: BigInt(source.blockHeight), finalized: true, transactionSucceeded: true,
    receiptIdFromCall: source.receiptId, bodyAtTransaction: body }) },
  { network: "preprod", contract, transactionId: source.transactionId, receiptId: source.receiptId });
}
async function withFetch(run: (requests: Record<string, any>[]) => Promise<void>, response: (body: any) => Response) {
  const original = globalThis.fetch, requests: Record<string, any>[] = [];
  try { globalThis.fetch = async (_url, request) => { const body = JSON.parse(String(request?.body)); requests.push(body); return response(body); }; await run(requests); }
  finally { globalThis.fetch = original; }
}
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { "content-type": "application/json" } });
const block = (height: number, transactions: unknown[] = [], parent = hash("a")) => ({ height, hash: hash("b"), protocolVersion: 1000300, parent: { height: height - 1, hash: parent }, transactions });
const historical = (state = publicState(), height = source.blockHeight, id = source.transactionId) => ({ data: { transactions: [{ identifiers: [id], hash: hash("c"), protocolVersion: 1000300, transactionResult: { status: "SUCCESS" },
  block: { height, hash: hash("b") }, contractActions: [{ __typename: "ContractCall", address: contract.slice(2), entryPoint: "executeRuntimeAction", state: Buffer.from(state.serialize()).toString("hex") }] }] } });

const recordedTransaction = readFileSync(new URL("./fixtures/recorded-preprod-receipt-050-transaction.bin", import.meta.url));
async function withKnownSource(state: ContractState, run: (context: { adapter: ReturnType<typeof createIndexedGatewaySource>; known: Awaited<ReturnType<typeof receipt>> }) => Promise<void>, options: { verify?: boolean; sdkBlockHash?: string; lookup?: () => Promise<any>; transactionLookupTimeoutMilliseconds?: number } = {}) {
  const tx = Transaction.deserialize("signature", "proof", "binding", recordedTransaction), txHash = tx.transactionHash();
  const transaction = { __typename: "RegularTransaction", hash: txHash, protocolVersion: 1000300, raw: Buffer.from(recordedTransaction).toString("hex"), identifiers: tx.identifiers(), transactionResult: { status: "SUCCESS" }, block: { height: source.blockHeight, hash: hash("b") }, contractActions: [{ __typename: "ContractCall", address: contract.slice(2), entryPoint: "executeRuntimeAction", state: Buffer.from(state.serialize()).toString("hex") }] };
  const previous = (() => { try { return getNetworkId(); } catch { return "undeployed"; } })();
  try {
    setNetworkId("preprod");
    const adapter = createIndexedGatewaySource({ ...config(), transactionLookupTimeoutMilliseconds: options.transactionLookupTimeoutMilliseconds, publicDataProvider: { async watchForTxData() {
      if (options.lookup) return options.lookup();
      return { status: "SucceedEntirely", identifiers: tx.identifiers(), tx, blockHeight: source.blockHeight, txHash, blockHash: options.sdkBlockHash ?? hash("b") };
    } } as any });
    await withFetch(async () => {
      assert(await adapter.discovery.scan(null));
      const known = await receipt();
      if (options.verify !== false) await readFinalizedDecisionReceipt(adapter.receiptReader, { network: "preprod", contract, transactionId: source.transactionId, receiptId: source.receiptId });
      await run({ adapter, known });
    }, request => request.query.includes("GatewayFinalizedBlock") ? json({ data: { block: block(source.blockHeight, [transaction]) } }) : json({ data: { transactions: [transaction] } }));
  } finally { setNetworkId(previous); }
}
test("consecutive complete empty finalized blocks preserve exact cursor, parent and checkpoint hash", async () => {
  const adapter = createIndexedGatewaySource(config());
  await withFetch(async requests => {
    const first = await adapter.discovery.scan(null); assert(first); assert.deepEqual(first.events, []);
    assert.equal(first.checkpoint.sequence, String(source.blockHeight));
    assert.equal(await adapter.discovery.verifyCheckpoint(first.checkpoint), true);
    const second = await adapter.discovery.scan(first.checkpoint); assert(second);
    assert.equal(second.checkpoint.sequence, String(source.blockHeight + 1));
    assert.equal(requests[0]!.variables.offset.height, source.blockHeight);
    assert.equal(requests.at(-1)!.variables.offset.height, source.blockHeight + 1);
  }, request => json({ data: { block: block(request.variables.offset.height, [], request.variables.offset.height === source.blockHeight ? hash("a") : hash("b")) } }));
});
test("unknown source blocks return no work and changed persisted hashes are rejected", async () => {
  const adapter = createIndexedGatewaySource(config());
  await withFetch(async () => assert.equal(await adapter.discovery.scan(null), null), () => json({ data: { block: null } }));
  await withFetch(async () => assert.equal(await adapter.discovery.verifyCheckpoint({ cursor: `midnight-block:${source.blockHeight}`, sequence: String(source.blockHeight), blockHash: hash("a") }), false), () => json({ data: { block: block(source.blockHeight) } }));
});
test("discovery rejects malformed, unknown-protocol, split-call and invalid serialized receipt sources", async () => {
  const adapter = createIndexedGatewaySource(config());
  const transaction = { __typename: "RegularTransaction", hash: hash("c"), protocolVersion: 1000300, raw: "00", identifiers: [source.transactionId], transactionResult: { status: "SUCCESS" }, contractActions: [{ __typename: "ContractCall", address: contract.slice(2), entryPoint: "executeRuntimeAction", state: Buffer.from(recorded).toString("hex") }] };
  for (const bad of [{ ...block(source.blockHeight), transactions: null }, { ...block(source.blockHeight), protocolVersion: 999 }, block(source.blockHeight, [{ ...transaction, contractActions: [...transaction.contractActions, ...transaction.contractActions] }]), block(source.blockHeight, [transaction]), block(source.blockHeight, [{ ...transaction, contractActions: [{ ...transaction.contractActions[0], entryPoint: undefined }] }])]) {
    await withFetch(async () => assert.rejects(adapter.discovery.scan(null), /SOURCE_REJECTED/), () => json({ data: { block: bad } }));
  }
  await withFetch(async () => assert.rejects(adapter.discovery.scan({ cursor: `midnight-block:${source.blockHeight - 1}`, sequence: String(source.blockHeight - 1), blockHash: hash("c") }), /SOURCE_INTEGRITY/), () => json({ data: { block: block(source.blockHeight) } }));
});
test("known failed or partial ordinary transactions never become receipt events", async () => {
  for (const status of ["FAILURE", "PARTIAL_SUCCESS"]) await withFetch(async () => {
    const batch = await createIndexedGatewaySource(config()).discovery.scan(null); assert(batch); assert.deepEqual(batch.events, []);
  }, () => json({ data: { block: block(source.blockHeight, [{ __typename: "RegularTransaction", hash: hash("c"), protocolVersion: 1000300, transactionResult: { status }, contractActions: [{ __typename: "ContractCall", address: contract.slice(2), entryPoint: "executeRuntimeAction" }] }]) } }));
});
test("historical eligibility reads the recorded exact receipt-call state, including retired templates", async () => {
  for (const lifecycleStatus of [1n, 2n, 3n]) {
    const state = publicState(), view = ledger(state.data);
    const [key, record] = [...view.activeTemplates].find(([, item]) => Buffer.from(item.target.templateContentHash).equals(Buffer.from(body.target.templateContentHash)))!;
    state.data = new ChargedState(seedGeneratedMap(state.data, "activeTemplates", key, { ...record, lifecycleStatus }));
    await withKnownSource(state, async ({ adapter, known }) => {
      const status = await adapter.historicalStatus.read(known);
      assert.equal(status.sourceLedgerSequence, String(source.blockHeight));
      assert.equal(status.templateRegistry, contract); assert.equal(status.proofModuleRegistry, contract);
      assert.equal(status.templateActive, lifecycleStatus === 1n || lifecycleStatus === 2n); assert.equal(status.moduleActive, true);
    });
  }
});
test("historical eligibility rejects an unknown or unverified exact source and inactive module", async () => {
  const state = publicState(), view = ledger(state.data);
  const [key, record] = [...view.proofModules].find(([, item]) => Buffer.from(item.identity.implementationHash).equals(Buffer.from(body.moduleIdentity.implementationHash)))!;
  state.data = new ChargedState(seedGeneratedMap(state.data, "proofModules", key, { ...record, lifecycleStatus: 5n }));
  await withKnownSource(state, async ({ adapter, known }) => assert.equal((await adapter.historicalStatus.read(known)).moduleActive, false));
  await withKnownSource(publicState(), async ({ adapter, known }) => {
    await assert.rejects(adapter.historicalStatus.read(known), /SOURCE_REJECTED/);
    await readFinalizedDecisionReceipt(adapter.receiptReader, { network: "preprod", contract, transactionId: source.transactionId, receiptId: source.receiptId });
    for (const changed of [{ ...known, sourceLedgerSequence: String(source.blockHeight + 1) }, { ...known, sourceTransaction: "00" + "ab".repeat(32) }]) {
      await assert.rejects(adapter.historicalStatus.read(changed), /SOURCE_REJECTED/);
    }
  }, { verify: false });
});
test("SDK finality at the same height with a different block hash is an integrity failure", async () => {
  await withKnownSource(publicState(), async ({ adapter, known }) => {
    await assert.rejects(adapter.receiptReader.readReceiptAtTransaction(source.transactionId), /SOURCE_INTEGRITY/);
    await assert.rejects(adapter.historicalStatus.read(known), /SOURCE_REJECTED/);
  }, { verify: false, sdkBlockHash: hash("d") });
});
test("later substituted historical state cannot rewrite cached exact-call eligibility", async () => {
  await withKnownSource(publicState(), async ({ adapter, known }) => {
    const later = publicState(), view = ledger(later.data);
    const [key, record] = [...view.activeTemplates].find(([, item]) => Buffer.from(item.target.templateContentHash).equals(Buffer.from(body.target.templateContentHash)))!;
    later.data = new ChargedState(seedGeneratedMap(later.data, "activeTemplates", key, { ...record, lifecycleStatus: 3n }));
    let requests = 0;
    globalThis.fetch = async () => { requests++; return json(historical(later)); };
    const status = await adapter.historicalStatus.read(known);
    assert.equal(status.templateActive, true); assert.equal(requests, 0);
  });
});test("terminal and transient source failures remain sanitized and distinct", async () => {
  const adapter = createIndexedGatewaySource(config());
  await withFetch(async () => assert.rejects(adapter.discovery.scan(null), /SOURCE_REJECTED/), () => new Response("private-url-never-forward", { status: 401 }));
  const original = globalThis.fetch;
  try { globalThis.fetch = async () => { throw new TypeError("fetch failed"); }; await assert.rejects(adapter.discovery.scan(null), error => error instanceof IndexedReceiptUnavailableError && !error.message.includes("private")); }
  finally { globalThis.fetch = original; }
});

test("recorded real receipt survives complete-block discovery, exact SDK reconciliation and historical eligibility", async () => {
  const raw = readFileSync(new URL("./fixtures/recorded-preprod-receipt-050-transaction.bin", import.meta.url));
  assert.equal(createHash("sha256").update(raw).digest("hex"), "5124cd02bdeeea756bddda4e3f084153db9bbd28655e6e425b89e64cb2a1e310");
  const tx = Transaction.deserialize("signature", "proof", "binding", raw);
  const txHash = tx.transactionHash();
  const transaction = { __typename: "RegularTransaction", hash: txHash, protocolVersion: 1000300, raw: Buffer.from(raw).toString("hex"), identifiers: tx.identifiers(), transactionResult: { status: "SUCCESS" }, block: { height: source.blockHeight, hash: hash("b") }, contractActions: [{ __typename: "ContractCall", address: contract.slice(2), entryPoint: "executeRuntimeAction", state: Buffer.from(recorded).toString("hex") }] };
  const previous = (() => { try { return getNetworkId(); } catch { return "undeployed"; } })();
  let sdkCalls = 0;
  try {
    setNetworkId("preprod");
    // SDK finality/context is injected; transaction and exact call state are recorded public Preprod bytes.
    const adapter = createIndexedGatewaySource({ ...config(), publicDataProvider: { async watchForTxData(id: string) {
      sdkCalls++; assert.equal(id, source.transactionId);
      return { status: "SucceedEntirely", identifiers: tx.identifiers(), tx, blockHeight: source.blockHeight, txHash, blockHash: hash("b") };
    } } as any });
    await withFetch(async () => {
      const batch = await adapter.discovery.scan(null); assert(batch);
      assert.deepEqual(batch.events, [{ transactionId: source.transactionId, receiptId: source.receiptId, eventIndex: 0 }]);
      const receipt = await readFinalizedDecisionReceipt(adapter.receiptReader, { network: "preprod", contract, transactionId: source.transactionId, receiptId: source.receiptId });
      assert.equal(receipt.sourceTransaction, source.transactionId);
      assert.equal(receipt.receiptId, source.receiptId);
      assert.equal(Object.keys(receipt).length, 25);
      assert.equal(sdkCalls, 1);
      assert.equal((await adapter.historicalStatus.read(receipt)).templateActive, true);
    }, request => request.query.includes("GatewayFinalizedBlock") ? json({ data: { block: block(source.blockHeight, [transaction]) } }) : json({ data: { transactions: [transaction] } }));
  } finally { setNetworkId(previous); }
});


test("checkpoint verification uses validated metadata without refetching transaction bytes or states", async () => {
  const adapter = createIndexedGatewaySource(config());
  const checkpoint = { cursor: `midnight-block:${source.blockHeight}`, sequence: String(source.blockHeight), blockHash: hash("b") };
  const { transactions: _, ...metadata } = block(source.blockHeight);
  const known = await receipt(), store = new GatewayStore(":memory:", "preprod", contract);
  let now = Number(known.validAfter) + 1, deliveries = 0;
  try {
    store.commitObservation(checkpoint, [{ eventIndex: 0, receipt: known }]);
    const observer = new GatewayObserver(store, { ...adapter, network: "preprod", contract, allowedReceipts: [known],
      now: () => now, retrySeconds: 5, deliver: async () => { deliveries++; throw Error("Synthetic retryable delivery failure"); } });
    await withFetch(async requests => {
      for (let attempt = 0; attempt < 3; attempt++) { assert.equal(await observer.deliverOnce(), true); now += 5; }
      assert.equal(deliveries, 3); assert.equal(store.rows()[0]!.attempts, 3);
      assert.equal(requests.length, 3);
      for (const request of requests) assert.doesNotMatch(request.query, /transactions|contractActions|\braw\b|\bstate\b/);
    }, () => json({ data: { block: metadata } }));
  } finally { store.close(); }
  for (const bad of [{ ...metadata, height: source.blockHeight + 1 }, { ...metadata, protocolVersion: 999 },
      { ...metadata, hash: "malformed" }, { ...metadata, parent: { height: source.blockHeight - 2, hash: hash("a") } },
      { ...metadata, parent: { height: source.blockHeight - 1, hash: "malformed" } }]) {
    await withFetch(async () => assert.rejects(adapter.discovery.verifyCheckpoint(checkpoint), /SOURCE_REJECTED/), () => json({ data: { block: bad } }));
  }
});

test("reopened durable outbox recovers after a temporarily missing checkpoint block", async () => {
  const directory = mkdtempSync(join(tmpdir(), "permio-source-checkpoint-")), path = join(directory, "gateway.sqlite");
  const adapter = createIndexedGatewaySource(config()), known = await receipt();
  const checkpoint = { cursor: `midnight-block:${source.blockHeight}`, sequence: String(source.blockHeight), blockHash: hash("b") };
  let store = new GatewayStore(path, "preprod", contract), available = false, deliveries = 0;
  try {
    store.commitObservation(checkpoint, [{ eventIndex: 0, receipt: known }]);
    store.close(); store = new GatewayStore(path, "preprod", contract);
    const observer = new GatewayObserver(store, { ...adapter, network: "preprod", contract, allowedReceipts: [known],
      now: () => Number(known.validAfter) + 1, retrySeconds: 5, deliver: async (_receipt, key) => { deliveries++; return { idempotencyKey: key }; } });
    const { transactions: _, ...metadata } = block(source.blockHeight);
    await withFetch(async () => {
      await assert.rejects(observer.deliverOnce(), /SOURCE_UNAVAILABLE/);
      assert.equal(store.integrityError(), null); assert.equal(store.rows()[0]!.state, "pending"); assert.equal(deliveries, 0);
      available = true;
      assert.equal(await observer.deliverOnce(), true);
      assert.equal(store.integrityError(), null); assert.equal(store.rows()[0]!.state, "delivered"); assert.equal(deliveries, 1);
    }, () => json({ data: { block: available ? metadata : null } }));
  } finally {
    store.close();
    for (const suffix of ["", "-wal", "-shm"]) rmSync(path + suffix, { force: true });
    rmdirSync(directory);
  }
});

for (const sdkBlockHash of [hash("b"), hash("d")]) test(`SDK lookup wait is bounded and reuses its pending watch before late reconciliation (${sdkBlockHash.slice(0, 6)})`, async () => {
  let fulfill!: (value: any) => void, sdkCalls = 0;
  const pending = new Promise<any>(resolve => { fulfill = resolve; });
  const tx = Transaction.deserialize("signature", "proof", "binding", recordedTransaction);
  await withKnownSource(publicState(), async ({ adapter, known }) => {
    async function expectBoundedWait() {
      let watchdog: ReturnType<typeof setTimeout> | undefined;
      try {
        await assert.rejects(Promise.race([adapter.receiptReader.readReceiptAtTransaction(source.transactionId),
          new Promise<never>((_resolve, reject) => { watchdog = setTimeout(() => reject(Error("APPLICATION_LOOKUP_STALLED")), 500); })]),
          error => error instanceof IndexedReceiptUnavailableError);
      } finally { clearTimeout(watchdog); }
    }
    await expectBoundedWait(); await expectBoundedWait();
    assert.equal(sdkCalls, 1);
    await assert.rejects(adapter.historicalStatus.read(known), /SOURCE_REJECTED/);
    fulfill({ status: "SucceedEntirely", identifiers: tx.identifiers(), tx, blockHeight: source.blockHeight, txHash: tx.transactionHash(), blockHash: sdkBlockHash });
    if (sdkBlockHash === hash("b")) {
      const observed = await readFinalizedDecisionReceipt(adapter.receiptReader, { network: "preprod", contract, transactionId: source.transactionId, receiptId: source.receiptId });
      assert.equal(observed.receiptId, known.receiptId);
      assert.equal((await adapter.historicalStatus.read(observed)).templateActive, true);
    } else {
      await assert.rejects(adapter.receiptReader.readReceiptAtTransaction(source.transactionId), /SOURCE_INTEGRITY/);
      await assert.rejects(adapter.historicalStatus.read(known), /SOURCE_REJECTED/);
    }
    assert.equal(sdkCalls, 1);
  }, { verify: false, transactionLookupTimeoutMilliseconds: 10, lookup: () => { sdkCalls++; return pending; } });
});


test("a rejected SDK lookup is cleared so a transient provider failure can recover", async () => {
  let sdkCalls = 0;
  const tx = Transaction.deserialize("signature", "proof", "binding", recordedTransaction);
  await withKnownSource(publicState(), async ({ adapter, known }) => {
    await assert.rejects(adapter.receiptReader.readReceiptAtTransaction(source.transactionId), error => error instanceof IndexedReceiptUnavailableError);
    await assert.rejects(adapter.historicalStatus.read(known), /SOURCE_REJECTED/);
    const observed = await readFinalizedDecisionReceipt(adapter.receiptReader, { network: "preprod", contract, transactionId: source.transactionId, receiptId: source.receiptId });
    assert.equal(observed.receiptId, known.receiptId); assert.equal(sdkCalls, 2);
    assert.equal((await adapter.historicalStatus.read(observed)).templateActive, true);
  }, { verify: false, lookup: async () => {
    sdkCalls++;
    if (sdkCalls === 1) throw new TypeError("fetch failed");
    return { status: "SucceedEntirely", identifiers: tx.identifiers(), tx, blockHeight: source.blockHeight, txHash: tx.transactionHash(), blockHash: hash("b") };
  } });
});

test("application transaction lookup timeout requires a positive supported timer duration", () => {
  for (const timeout of [0, -1, 1.5, NaN, Infinity, 2 ** 31]) {
    assert.throws(() => createIndexedGatewaySource({ ...config(), transactionLookupTimeoutMilliseconds: timeout }), /SOURCE_REJECTED/);
  }
});
