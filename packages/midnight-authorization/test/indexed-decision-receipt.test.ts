import assert from "node:assert/strict";
import { it } from "node:test";
import { getNetworkId, setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import type { PublicDataProvider } from "@midnight-ntwrk/midnight-js-types";
import { createIndexedDecisionReceiptReader } from "../src/indexed-decision-receipt.ts";
import { PreprodConnectionProfile } from "../src/preprod-profile.ts";

it("survives a transient receipt HTTP failure while retaining serialized-call verification", async () => {
  const module = process.env.PERMIO_TEST_RECEIPT_READER
    ? await import(process.env.PERMIO_TEST_RECEIPT_READER) : { createIndexedDecisionReceiptReader };
  const originalFetch = globalThis.fetch, originalNetwork = (() => { try { return getNetworkId(); } catch { return "undeployed"; } })();
  const id = "00" + "17".repeat(32), address = "16".repeat(32), txHash = "22".repeat(32), blockHash = "33".repeat(32);
  const provider = { async watchForTxData() { return { status: "SucceedEntirely", identifiers: [id],
    tx: { identifiers: () => [id] }, blockHeight: 123, txHash, blockHash }; } } as unknown as PublicDataProvider;
  let calls = 0;
  try {
    setNetworkId("preprod");
    globalThis.fetch = async () => {
      if (++calls === 1) return new Response("", { status: 503 });
      return new Response(JSON.stringify({ data: { transactions: [{ protocolVersion: 1000300, raw: "00", hash: txHash,
        block: { hash: blockHash, height: 123 }, identifiers: [id], transactionResult: { status: "SUCCESS" },
        contractActions: [{ __typename: "ContractCall", address, state: "00", entryPoint: "executeRuntimeAction" }] }] } }));
    };
    const reader = module.createIndexedDecisionReceiptReader({ network: "preprod", publicDataProvider: provider,
      contract: `0x${address}`, receiptId: `0x${"44".repeat(32)}`, profile: new PreprodConnectionProfile("nightpreprod_synthetic_only") });
    await assert.rejects(reader.readReceiptAtTransaction(id), /at serialized-call-and-state/);
    assert.equal(calls, 2);
  } finally { globalThis.fetch = originalFetch; setNetworkId(originalNetwork); }
});

it("pins the observed Preprod indexer protocol while retaining finality/identity gates and rejecting unknown versions", async () => {
  const originalFetch = globalThis.fetch, originalNetwork = (() => { try { return getNetworkId(); } catch { return "undeployed"; } })();
  const id = "00" + "17".repeat(32), address = "16".repeat(32), txHash = "22".repeat(32), blockHash = "33".repeat(32);
  const provider = { async watchForTxData() { return { status: "SucceedEntirely", identifiers: [id],
    tx: { identifiers: () => [id] }, blockHeight: 123, txHash, blockHash }; } } as unknown as PublicDataProvider;
  try {
    for (const [network, protocolVersion, passesVersionBoundary] of [
      ["preprod", 1000300, true], ["preprod", 1000000, false], ["preprod", 1000400, false],
      ["undeployed", 1000000, true], ["undeployed", 1000300, false],
    ] as const) {
      setNetworkId(network);
      globalThis.fetch = async () => new Response(JSON.stringify({ data: { transactions: [{
        protocolVersion, raw: "00", hash: txHash, block: { hash: blockHash, height: 123 },
        identifiers: [id], transactionResult: { status: "SUCCESS" },
        contractActions: [{ __typename: "ContractCall", address, state: "00", entryPoint: "executeRuntimeAction" }],
      }] } }), { headers: { "content-type": "application/json" } });
      const reader = createIndexedDecisionReceiptReader({ network, publicDataProvider: provider,
        contract: `0x${address}`, receiptId: `0x${"44".repeat(32)}`,
        ...(network === "preprod" ? { profile: new PreprodConnectionProfile("nightpreprod_synthetic_only") }
          : { indexerUrl: "http://127.0.0.1:8088/api/v4/graphql" }),
      });
      // Deliberately invalid raw bytes must still fail. Supported metadata only
      // reaches the decoder; it cannot establish a receipt or bypass provenance.
      await assert.rejects(reader.readReceiptAtTransaction(id), passesVersionBoundary
        ? /at serialized-call-and-state/ : /at exact-indexer-transaction/);
    }
  } finally { globalThis.fetch = originalFetch; setNetworkId(originalNetwork); }
});
