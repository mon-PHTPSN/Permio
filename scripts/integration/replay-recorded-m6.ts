import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { network } from "hardhat";
import { keccak256, stringToHex, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { DecisionReceipt } from "../../packages/midnight-authorization/src/decision-receipt.ts";
import { hashProtocolIdentifier } from "../../packages/midnight-authorization/src/canonical.ts";
import { M6_RECEIPT_V1, encodeM6ReceiptV1, decodeM6ReceiptV1, m6SourceIdentityHash, encodeM6GatewaySignature } from "../../packages/gateway/src/m6-receipt-codec.ts";
import { GatewayStore } from "../../packages/gateway/src/durable-store.ts";
import { createDurableGatewayDelivery } from "../../packages/gateway/src/delivery.ts";
import { verifyGatewayTransport, type GatewayTransport } from "../../packages/gateway/src/transport.ts";

// Explicit recorded-public-data acceptance only. Hard-coded simulated EVM; never a Midnight provider or transaction submitter.
const [inputPath, reportPath] = process.argv.slice(2);
assert(inputPath && reportPath && process.argv.length === 4, "Usage: node scripts/integration/replay-recorded-m6.ts <public-receipts.json> <report.json>");
const input = readFileSync(inputPath);
const receipts: unknown = JSON.parse(input.toString("utf8"));
assert(Array.isArray(receipts) && receipts.length > 0 && receipts.length <= 100, "Expected a bounded array of public M6 receipts");
const results: Record<string, unknown>[] = [];
for (const value of receipts) {
  const encoded = encodeM6ReceiptV1(value as DecisionReceipt), receipt = decodeM6ReceiptV1(encoded);
  const start = BigInt(receipt.validAfter) + 60n, end = BigInt(receipt.validBefore);
  assert(start + 60n < end && start < BigInt(Number.MAX_SAFE_INTEGER), "Recorded receipt requires an adequate historical replay window");
  const connection = await network.create({ network: "hardhat", override: { chainId: 31337, initialDate: new Date(Number(start) * 1000) } });
  assert.equal(connection.networkConfig.type, "edr-simulated");
  let store: GatewayStore | undefined;
  let server: ReturnType<typeof createServer> | undefined;
  try {
    const { viem } = connection;
    const client = await viem.getPublicClient(), wallets = await viem.getWalletClients();
    const [admin, schema, source, keys, registrar, emergency, relayer] = wallets;
    const registry = await viem.deployContract("ExecutionRegistry", [admin.account.address, schema.account.address, source.account.address, keys.account.address, registrar.account.address, emergency.account.address]);
    const verifier = await viem.deployContract("M6V1ReceiptVerifier", [registry.address]);
    const adapter = await viem.deployContract("RecordingExecutionAdapter", [registry.address]);
    const signer = privateKeyToAccount(generatePrivateKey()), keyId = "recorded-public-replay-ephemeral";
    const epoch = { keyId, verifier: signer.address, activeFrom: Number(start), signingCutoff: Number(end - 1n), verificationCutoff: Number(end) };
    await registry.write.configureReceiptVerifier([M6_RECEIPT_V1, verifier.address], { account: schema.account });
    await registry.write.setSource([hashProtocolIdentifier("network-id", receipt.sourceNetwork), receipt.sourceContract, true], { account: source.account });
    await registry.write.registerGatewayKeyEpoch([keccak256(stringToHex(keyId)), signer.address, start, end - 1n, end], { account: keys.account });
    await registry.write.registerAdapter([M6_RECEIPT_V1, receipt.actionSchemaId, adapter.address], { account: registrar.account });
    await registry.write.bindRecipientAdapter([M6_RECEIPT_V1, receipt.actionSchemaId, receipt.recipient, adapter.address], { account: registrar.account });
    const path = join(mkdtempSync(join(tmpdir(), "permio-recorded-public-replay-")), "gateway.sqlite");
    store = new GatewayStore(path, receipt.sourceNetwork, receipt.sourceContract);
    // Recorded single-receipt fixture, not evidence that all calls in its historical source block were discovered.
    store.commitObservation({ cursor: receipt.sourceLedgerSequence, sequence: receipt.sourceLedgerSequence, blockHash: receipt.receiptId }, [{ eventIndex: 0, receipt }]);
    const key = store.rows()[0]!.key, received: GatewayTransport[] = [];
    let registrations = 0, executions = 0;
    const clock = () => Number(start);
    server = createServer(async (request, response) => {
      try {
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of request) { size += chunk.length; if (size > 1024 * 1024) throw Error("REPLAY_PACKET_TOO_LARGE"); chunks.push(Buffer.from(chunk)); }
        const packet = JSON.parse(Buffer.concat(chunks).toString("utf8")) as GatewayTransport;
        await verifyGatewayTransport(packet, { chainId: 31337n, registry: registry.address, outboxKey: key, sourceIdentityHash: m6SourceIdentityHash(receipt), receiptHash: keccak256(encoded), epochs: [epoch], forbiddenSigners: wallets.slice(0,7).map(wallet => wallet.account.address), verifiedAt: clock() });
        assert.deepEqual(decodeM6ReceiptV1(packet.encodedReceipt), receipt);
        received.push(packet);
        let registered = false;
        try { await registry.read.getReceipt([receipt.receiptId]); registered = true; } catch { /* New recorded receipt in this isolated EVM. */ }
        if (!registered) {
          const tx = await registry.write.registerReceipt([M6_RECEIPT_V1, packet.encodedReceipt, encodeM6GatewaySignature(packet)], { account: relayer.account });
          assert.equal((await client.waitForTransactionReceipt({ hash: tx })).status, "success"); registrations++;
        }
        if (!(await registry.read.getReceipt([receipt.receiptId])).consumed) {
          const tx = await registry.write.executeReceipt([receipt.receiptId, "0x"], { account: relayer.account });
          assert.equal((await client.waitForTransactionReceipt({ hash: tx })).status, "success"); executions++;
        }
        if (received.length === 1) { response.destroy(); return; } // Acceptance committed, acknowledgement deliberately lost.
        response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ outboxKey: key }));
      } catch { response.writeHead(400).end("RECORDED_REPLAY_REJECTED"); }
    });
    await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address(); assert(address && typeof address !== "string");
    const delivery = () => createDurableGatewayDelivery({ store: store!, endpoint: `http://127.0.0.1:${address.port}/receipts`, chainId: 31337n, registry: registry.address, now: clock, keyPolicy: () => ({ epochs: [epoch], forbiddenSigners: wallets.slice(0,7).map(wallet => wallet.account.address) }), signerFor: async () => signer });
    store.claimDue(clock());
    await assert.rejects(delivery()(receipt, key), /DELIVERY_UNAVAILABLE/);
    store.close(); store = new GatewayStore(path, receipt.sourceNetwork, receipt.sourceContract);
    store.claimDue(clock());
    assert.deepEqual(await delivery()(receipt, key), { idempotencyKey: key }); store.acknowledge(key);
    assert.equal(received.length, 2); assert.deepEqual(received[0], received[1]);
    assert.equal(registrations, 1); assert.equal(executions, 1); assert.equal(await registry.read.executionSequence(), 1n);
    const record = await registry.read.getReceipt([receipt.receiptId]);
    assert.equal(record.recipient, receipt.recipient); assert.equal(record.sourceTransaction, `0x${receipt.sourceTransaction}`);
    assert.equal(record.proofModuleVersion, receipt.proofModuleVersion); assert.equal(record.templateVersion, receipt.semanticVersion);
    assert.equal(record.sourceNetworkName, receipt.sourceNetwork); assert.equal(record.consumed, true);
    assert.equal(await adapter.read.lastReceiptId(), receipt.receiptId);
    assert.equal(store.rows()[0]!.state, "delivered"); assert.equal(store.transports(key, "31337", registry.address).length, 1);
    results.push({ receiptId: receipt.receiptId, originalFieldsPreserved: true, localRegistrations: registrations, localExecutions: executions, deliveryAttempts: received.length, signedPacketReusedAfterRestart: true });
  } finally {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    store?.close(); await connection.close();
  }
}
const report = { tier: "RECORDED_PREPROD_PUBLIC_RECEIPTS_TO_SIMULATED_EVM", sourceSha256: createHash("sha256").update(input).digest("hex"), receipts: results, sourceDiscoveryVerified: false, liveEndToEnd: false, newMidnightSubmissions: 0, newRemoteProofRequests: 0 };
writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n"); console.log(JSON.stringify(report));
