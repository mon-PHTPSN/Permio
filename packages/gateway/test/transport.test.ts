import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { keccak256, stringToHex } from "viem";
import { signGatewayTransport, verifyGatewayTransport, deliverGatewayTransport, GATEWAY_TRANSPORT_TYPES } from "../src/transport.ts";

const old = privateKeyToAccount(generatePrivateKey());
const next = privateKeyToAccount(generatePrivateKey());
const registry = privateKeyToAccount(generatePrivateKey()).address;
const outboxKey = keccak256(stringToHex("public-outbox-id"));
const sourceIdentityHash = keccak256(stringToHex("public-finalized-source-id"));
const encodedReceipt = "0x01020304" as const;
const receiptHash = keccak256(encodedReceipt);
const epochs = [
  { keyId: "old", verifier: old.address, activeFrom: 100, signingCutoff: 200, verificationCutoff: 250 },
  { keyId: "next", verifier: next.address, activeFrom: 180, signingCutoff: 300, verificationCutoff: 350 },
];
const target = { chainId: 31337n, registry };
const expected = { ...target, outboxKey, sourceIdentityHash, receiptHash, epochs, forbiddenSigners: [] };
const sign = (signedAt = 150, account = old) => signGatewayTransport({
  ...target, outboxKey, sourceIdentityHash, encodedReceipt, signedAt, epochs, account, forbiddenSigners: [],
});

describe("authenticated gateway transport over unchanged public receipt bytes", () => {
  it("round trips exact bytes, source and deterministic retry identity", async () => {
    const packet = await sign();
    assert.deepEqual(await sign(), packet);
    const result = await verifyGatewayTransport(packet, { ...expected, verifiedAt: 151 });
    assert.equal(result.encodedReceipt, encodedReceipt);
    assert.equal(result.outboxKey, outboxKey);
    assert.equal(result.signer, old.address);
    assert(Object.isFrozen(result));
  });
  it("rejects payload, source, outbox, key and target substitution", async () => {
    const packet = await sign();
    for (const change of [
      { encodedReceipt: "0x0506" }, { sourceIdentityHash: keccak256(stringToHex("other-source")) },
      { outboxKey: keccak256(stringToHex("other-outbox")) }, { keyId: "next" },
      { targetChainId: "31338" }, { targetRegistry: old.address }, { receiptHash: keccak256("0x0506") },
      { signedAt: 151 }, { privateWitness: "must-never-be-accepted" }, { version: 2 },
    ]) await assert.rejects(verifyGatewayTransport({ ...packet, ...change }, { ...expected, verifiedAt: 152 }), /INVALID_TRANSPORT/);
    await assert.rejects(verifyGatewayTransport(packet, { ...expected, chainId: 31338n, verifiedAt: 152 }), /INVALID_TRANSPORT/);
  });
  it("uses newest active key, retains overlap and enforces both cutoffs", async () => {
    const packet = await sign();
    await verifyGatewayTransport(packet, { ...expected, verifiedAt: 249 });
    await assert.rejects(verifyGatewayTransport(packet, { ...expected, verifiedAt: 250 }), /INVALID_TRANSPORT/);
    await assert.rejects(verifyGatewayTransport(packet, { ...expected, verifiedAt: 149 }), /INVALID_TRANSPORT/);
    await assert.rejects(sign(180), /INVALID_TRANSPORT/);
    const rotated = await sign(180, next);
    assert.equal(rotated.keyId, "next");
    await verifyGatewayTransport(rotated, { ...expected, verifiedAt: 181 });
    await assert.rejects(sign(99), /INVALID_TRANSPORT/);
    await assert.rejects(sign(300, next), /INVALID_TRANSPORT/);
    const late = { ...packet, signedAt: 200 };
    const signature = await old.signTypedData({
      domain: { name: "Permio Gateway Transport", version: "1", chainId: target.chainId, verifyingContract: registry },
      types: GATEWAY_TRANSPORT_TYPES, primaryType: "GatewayTransport",
      message: { outboxKey, sourceIdentityHash, receiptHash, keyId: "old", signedAt: 200n,
        targetChainId: target.chainId, targetRegistry: registry },
    });
    await assert.rejects(verifyGatewayTransport({ ...late, signature }, { ...expected, verifiedAt: 201 }), /INVALID_TRANSPORT/);
  });
  it("refuses a signer assigned to governance, issuer, relayer or registry ownership", async () => {
    await assert.rejects(signGatewayTransport({ ...target, outboxKey, sourceIdentityHash, encodedReceipt,
      signedAt: 150, epochs, account: old, forbiddenSigners: [old.address] }), /INVALID_TRANSPORT/);
    const packet = await sign();
    await assert.rejects(verifyGatewayTransport(packet, { ...expected, forbiddenSigners: [old.address], verifiedAt: 151 }), /INVALID_TRANSPORT/);
  });
  it("requires an exact acknowledgement and emits only fixed delivery categories", async () => {
    const packet = await sign();
    const ack = await deliverGatewayTransport("https://recipient.example/receipts", packet, async (_url, init) => {
      assert.deepEqual(JSON.parse(String(init?.body)), packet);
      return new Response(JSON.stringify({ outboxKey }), { status: 200 });
    });
    assert.equal(ack.outboxKey, outboxKey);
    await assert.rejects(deliverGatewayTransport("https://recipient.example/receipts", packet, async () => {
      throw Error("credential-bearing-url-and-private-canary");
    }), error => String(error) === "GatewayTransportError: DELIVERY_UNAVAILABLE");
    await assert.rejects(deliverGatewayTransport("https://recipient.example/receipts", packet,
      async () => new Response("private-server-error", { status: 403 })), /DELIVERY_REJECTED/);
    await assert.rejects(deliverGatewayTransport("https://recipient.example/receipts", packet,
      async () => new Response(JSON.stringify({ outboxKey: sourceIdentityHash }))), /DELIVERY_REJECTED/);
  });
  it("does not send authentication to insecure or credential-bearing endpoints", async () => {
    const packet = await sign(); let requests = 0;
    for (const url of ["http://external.example/", "https://user:secret@example.com/", "https://example.com/?token=secret"]) {
      await assert.rejects(deliverGatewayTransport(url, packet, async () => { requests++; return new Response(); }), /DELIVERY_REJECTED/);
    }
    assert.equal(requests, 0);
  });
});
