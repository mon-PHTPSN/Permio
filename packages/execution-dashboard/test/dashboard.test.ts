import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createUnavailableReadModel,
  fetchDashboardReadModel,
  readDashboardConfig,
  type DashboardConfig,
} from "../src/server.ts";
import { filterReceipts, receiptStatus, shortHex, summarize, formatUnix } from "../web/app.js";

const NOW = new Date("2026-10-13T04:00:30.000Z");

test("user-facing timestamps use the client Asia/Shanghai time zone", () => {
  assert.match(formatUnix(Date.UTC(2026,9,14,2,0)), /10:00/);
  assert.equal(formatUnix(null),"—");
});

function successfulGraphQlResponse() {
  return {
    data: {
      _meta: [{
        chainId: 31_337,
        isReady: true,
        progressBlock: 9,
        progressBlockTime: "1791864000",
        sourceBlock: 9,
        eventsProcessed: 5,
      }],
      ReceiptProjection: [
        {
          id: "registry:receipt-1",
          consumed: true,
          revoked: false,
          registeredBlock: "8",
        },
      ],
      ExecutionProjection: [
        { id: "registry:execution-1", receiptId: "registry:receipt-1", success: true, blockNumber: "9" },
      ],
      TimeBucketAggregate: [
        {
          id: "hour-1",
          receiptsRegistered: "1",
          executionAttempts: "1",
          executionSuccesses: "1",
          executionFailures: "0",
          updatedBlock: "9",
        },
      ],
    },
  };
}

function config(fetchImplementation: typeof fetch): DashboardConfig {
  return readDashboardConfig(
    {},
    {
      graphqlUrl: "http://127.0.0.1:8080/v1/graphql",
      graphqlAdminSecret: "test-only",
      freshnessSeconds: 90,
      now: () => NOW,
      fetchImplementation,
    },
  );
}

function mockFetch(body: unknown, status = 200): typeof fetch {
  return async () => new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("projects the real GraphQL shape and reports freshness without changing authority", async () => {
  const readModel = await fetchDashboardReadModel(config(mockFetch(successfulGraphQlResponse())));
  assert.equal(readModel.status, "available");
  assert.equal(readModel.boundary.authoritativeUpstream, false);
  assert.equal(readModel.boundary.chainId, 31_337);
  assert.equal(readModel.freshness.state, "fresh");
  assert.equal(readModel.freshness.ageSeconds, 30);
  assert.equal(readModel.freshness.lagBlocks, 0);
  assert.equal(readModel.freshness.progressBlock, 9);
  assert.equal(readModel.receipts.length, 1);
  assert.equal(readModel.executions.length, 1);
  assert.equal(readModel.aggregates.length, 1);
});

test("marks an old progress block as aging while keeping the endpoint available", async () => {
  const response = successfulGraphQlResponse();
  response.data._meta[0]!.progressBlock = 8;
  response.data._meta[0]!.sourceBlock = 9;
  const readModel = await fetchDashboardReadModel(config(mockFetch(response)));
  assert.equal(readModel.status, "available");
  assert.equal(readModel.freshness.state, "aging");
  assert.equal(readModel.freshness.lagBlocks, 1);
});

test("returns an explicit unavailable state with empty rows and no fake fallback", () => {
  const payload = createUnavailableReadModel(
    { now: () => NOW },
    new Error("connect ECONNREFUSED 127.0.0.1:8080"),
  );
  assert.equal(payload.status, "unavailable");
  assert.deepEqual(payload.receipts, []);
  assert.deepEqual(payload.executions, []);
  assert.deepEqual(payload.aggregates, []);
  assert.match(payload.message, /authority is unchanged/i);
  assert.match(payload.detail, /ECONNREFUSED/);
});

test("derives activity metrics from returned execution outcomes", () => {
  const summary = summarize({
    receipts: [{ registeredBlock: "8" }],
    executions: [{ success: true, blockNumber: "9" }],
    aggregates: [{ updatedBlock: "9" }],
  });
  assert.deepEqual(summary, {
    receipts: 1,
    attempts: 1,
    successes: 1,
    failures: 0,
    successRate: 100,
    latestBlock: 9,
  });
  assert.equal(shortHex("registry:0x1234567890abcdef", 6, 4), "0x1234…cdef");
});

test("does not infer an execution outcome from a consumed receipt", () => {
  const receipt = { id: "receipt-1", consumed: true, revoked: false, executionId: "execution-1" };
  assert.deepEqual(receiptStatus(receipt, []), { key: "unknown", label: "Result pending" });
  assert.equal(receiptStatus(receipt, [{ id: "execution-1", success: false }]).key, "failed");
  assert.equal(receiptStatus(receipt, [{ id: "execution-1", success: true }]).key, "success");
  assert.equal(receiptStatus({ ...receipt, revoked: true }, []).key, "revoked");
});

test("combines case-insensitive receipt search with execution status", () => {
  const receipts = [
    { id: "receipt-one", recipient: "0xABC", registeredTransaction: "0x111", consumed: true },
    { id: "receipt-two", recipient: "0xABC", sourceTransaction: "0x222", consumed: true },
    { id: "receipt-three", recipient: "0xDEF", consumed: false },
  ];
  const executions = [
    { id: "execution-one", receiptId: "receipt-one", success: true },
    { id: "execution-two", receiptId: "receipt-two", success: false },
  ];
  assert.deepEqual(filterReceipts(receipts, executions, " abc ", "failed"), [receipts[1]]);
  assert.deepEqual(filterReceipts(receipts, executions, "0x222", "all"), [receipts[1]]);
  assert.deepEqual(filterReceipts(receipts, executions, "", "pending"), [receipts[2]]);
  assert.deepEqual(filterReceipts(receipts, executions, "no-match", "all"), []);
});

test("requires an explicit secret for any non-loopback GraphQL endpoint", () => {
  assert.throws(
    () => readDashboardConfig({ PERMIO_ENVIO_GRAPHQL_URL: "https://example.invalid/v1/graphql" }),
    /ADMIN_SECRET is required/,
  );
});
