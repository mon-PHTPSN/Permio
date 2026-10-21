import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

/** Bounded retries of one immutable GraphQL read. This cannot send a transaction. */
export async function readIndexedReceiptPayload(url: URL, transactionId: string,
  request: typeof fetch = fetch, pause: (ms: number) => Promise<unknown> = delay) {
  assert(/^[0-9a-f]{66}$/u.test(transactionId));
  const body = JSON.stringify({
    query: `query DecisionReceiptSource($offset: TransactionOffset!) {
      transactions(offset: $offset) { protocolVersion raw hash block { hash height }
        contractActions { __typename address state ... on ContractCall { entryPoint } }
        ... on RegularTransaction { identifiers transactionResult { status } }
      }
    }`, variables: { offset: { identifier: transactionId } },
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await request(url, { method: "POST", headers: { "content-type": "application/json" },
        signal: AbortSignal.timeout(30_000), body });
      if ([429, 502, 503, 504].includes(response.status) && attempt < 2) {
        await response.body?.cancel(); await pause(1000 * (attempt + 1)); continue;
      }
      assert(response.ok, "Receipt indexer read returned a terminal HTTP response");
      const text = await response.text(); assert(text.length <= 16 * 1024 ** 2, "Excessive indexer receipt response");
      const payload = JSON.parse(text);
      assert(!payload.errors && Array.isArray(payload.data?.transactions), "Invalid receipt indexer response");
      return payload;
    } catch (error) {
      const transient = error instanceof TypeError && ["fetch failed", "terminated"].includes(error.message) ||
        error instanceof DOMException && ["AbortError", "TimeoutError"].includes(error.name);
      if (!transient || attempt === 2) throw error;
      await pause(1000 * (attempt + 1));
    }
  }
  throw Error("Receipt indexer read exhausted its bounded attempts");
}
