import assert from "node:assert/strict";
import { it } from "node:test";
import { readIndexedReceiptPayload } from "../src/indexed-receipt-read.ts";
const id = "00" + "17".repeat(32), url = new URL("http://127.0.0.1/receipt-test");
const payload = { data: { transactions: [] } };
const success = () => new Response(JSON.stringify(payload));

it("repeats the exact immutable receipt query after transient HTTP or fetch failures", async () => {
  for (const failure of [429, 502, 503, 504, "network"] as const) {
    let calls = 0; const bodies: unknown[] = [], waits: number[] = [];
    const request: typeof fetch = async (_url, options) => {
      bodies.push(options?.body); calls++;
      if (calls === 1) { if (failure === "network") throw new TypeError("fetch failed"); return new Response("", { status: failure }); }
      return success();
    };
    assert.deepEqual(await readIndexedReceiptPayload(url, id, request, async ms => { waits.push(ms); }), payload);
    assert.equal(calls, 2); assert.equal(bodies[0], bodies[1]); assert.deepEqual(waits, [1000]);
    const body = JSON.parse(bodies[0] as string); assert(body.query.startsWith("query DecisionReceiptSource"));
    assert.deepEqual(body.variables, { offset: { identifier: id } });
  }
});

it("bounds transient failures and never retries terminal HTTP, invalid JSON or GraphQL errors", async () => {
  for (const kind of ["transient", "forbidden", "invalid-json", "graphql"] as const) {
    let calls = 0; const request: typeof fetch = async () => {
      calls++;
      return kind === "transient" ? new Response("", { status: 503 }) : kind === "forbidden" ? new Response("", { status: 403 }) :
        kind === "invalid-json" ? new Response("invalid") : new Response(JSON.stringify({ errors: [{ message: "query rejected" }] }));
    };
    await assert.rejects(readIndexedReceiptPayload(url, id, request, async () => {}));
    assert.equal(calls, kind === "transient" ? 3 : 1);
  }
});
it("exhausted transient reads expose only a fixed typed retry category", async () => {
  for (const failure of ["http", "network"] as const) {
    let calls = 0;
    await assert.rejects(readIndexedReceiptPayload(url, id, async () => {
      calls++; if (failure === "network") throw new TypeError("fetch failed");
      return new Response("credential-must-not-escape", { status: 503 });
    }, async () => {}), error => error instanceof Error && error.name === "IndexedReceiptUnavailableError" &&
      error.message === "INDEXED_RECEIPT_UNAVAILABLE");
    assert.equal(calls, 3);
  }
});
