import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { createTestIndexer } from "envio";
import "../src/handlers/execution-registry.ts";

const registry = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
const recipient = "0x0000000000000000000000000000000000000002";
const relayer = "0x0000000000000000000000000000000000000003";
const signer = "0x0000000000000000000000000000000000000004";

const receiptId = `0x${"11".repeat(32)}`;
const receiptVersion = `0x${"12".repeat(32)}`;
const actionSchemaId = `0x${"13".repeat(32)}`;
const purposeHash = `0x${"14".repeat(32)}`;
const scopedNullifier = `0x${"15".repeat(32)}`;
const outputCommitment = `0x${"16".repeat(32)}`;
const gatewayKeyId = `0x${"17".repeat(32)}`;
const sourceNetwork = `0x${"18".repeat(32)}`;
const sourceContract = `0x${"19".repeat(32)}`;
const sourceTransaction = `0x${"1a".repeat(32)}`;
const templateIdHash = `0x${"1b".repeat(32)}`;
const templateContentHash = `0x${"1c".repeat(32)}`;
const proofModuleId = `0x${"1d".repeat(32)}`;
const proofModuleImplementationHash = `0x${"1e".repeat(32)}`;
const namespaceHash = `0x${"61".repeat(32)}`;
const templateVersion = `0x${"62".repeat(32)}`;
const proofModuleVersion = `0x${"63".repeat(32)}`;
const instanceCommitment = `0x${"64".repeat(32)}`;
const previousStateCommitment = `0x${"65".repeat(32)}`;
const nextStateCommitment = `0x${"66".repeat(32)}`;
const contextHash = `0x${"67".repeat(32)}`;
const executionId = `0x${"21".repeat(32)}`;
const resultCommitment = `0x${"22".repeat(32)}`;
const zeroHash = `0x${"00".repeat(32)}`;
const transactionHash = `0x${"31".repeat(32)}`;

function id(value: string): string {
  return `${registry}:${value}`.toLowerCase();
}

describe("ExecutionRegistry public read model", () => {
  it("projects a receipt lifecycle and deterministic hourly aggregates", async () => {
    const testIndexer = createTestIndexer();

    await testIndexer.process({
      chains: {
        31337: {
          simulate: [
            {
              contract: "ExecutionRegistry",
              event: "ReceiptRegistered",
              srcAddress: registry,
              block: { number: 10, timestamp: 7_205 },
              transaction: { hash: transactionHash },
              params: {
                receiptId,
                receiptVersion,
                recipient,
                actionSchemaId,
                purposeHash,
                validAfter: 7_000n,
                validBefore: 10_000n,
                scopedNullifier,
                outputCommitment,
                gatewayKeyId,
                gatewaySigner: signer,
                registeredAt: 7_205n,
              },
            },
            {
              contract: "ExecutionRegistry",
              event: "ReceiptSourceBound",
              srcAddress: registry,
              block: { number: 10, timestamp: 7_205 },
              params: {
                receiptId,
                sourceNetwork,
                sourceContract,
                sourceTransaction,
                sourceLedgerSequence: 44n,
                gatewaySignedAt: 7_100n,
              },
            },
            {
              contract: "ExecutionRegistry",
              event: "ReceiptImplementationBound",
              srcAddress: registry,
              block: { number: 10, timestamp: 7_205 },
              params: {
                receiptId,
                namespaceHash,
                templateIdHash,
                templateVersion,
                templateContentHash,
                proofModuleId,
                proofModuleVersion,
                proofModuleImplementationHash,
              },
            },
            {
              contract: "ExecutionRegistry",
              event: "ReceiptStateBound",
              srcAddress: registry,
              block: { number: 10, timestamp: 7_205 },
              params: {
                receiptId,
                instanceCommitment,
                previousStateCommitment,
                nextStateCommitment,
                transitionSequence: 9n,
                contextHash,
              },
            },
            {
              contract: "ExecutionRegistry",
              event: "ExecutionRecorded",
              srcAddress: registry,
              block: { number: 11, timestamp: 7_260 },
              transaction: { hash: `0x${"32".repeat(32)}` },
              params: {
                executionId,
                receiptId,
                adapter: recipient,
                actionSchemaId,
                relayer,
                recipient,
                success: true,
                resultCommitment,
                errorHash: zeroHash,
                executedAt: 7_260n,
              },
            },
          ],
        },
      },
    });

    const receipt = await testIndexer.ReceiptProjection.getOrThrow(id(receiptId));
    assert.equal(receipt.chainId, 31337);
    assert.equal(receipt.sourceNetwork, sourceNetwork);
    assert.equal(receipt.sourceContract, sourceContract);
    assert.equal(receipt.gatewaySignedAt, 7_100n);
    assert.equal(receipt.namespaceHash, namespaceHash);
    assert.equal(receipt.templateIdHash, templateIdHash);
    assert.equal(receipt.templateVersion, templateVersion);
    assert.equal(receipt.proofModuleVersion, proofModuleVersion);
    assert.equal(receipt.proofModuleImplementationHash, proofModuleImplementationHash);
    assert.equal(receipt.instanceCommitment, instanceCommitment);
    assert.equal(receipt.previousStateCommitment, previousStateCommitment);
    assert.equal(receipt.nextStateCommitment, nextStateCommitment);
    assert.equal(receipt.transitionSequence, 9n);
    assert.equal(receipt.contextHash, contextHash);
    assert.equal(receipt.consumed, true);
    assert.equal(receipt.executionId, id(executionId));

    const execution = await testIndexer.ExecutionProjection.getOrThrow(id(executionId));
    assert.equal(execution.success, true);
    assert.equal(execution.relayer, relayer);
    assert.equal(execution.resultCommitment, resultCommitment);

    const bucket = await testIndexer.TimeBucketAggregate.getOrThrow(
      `${registry}:hour:7200:${actionSchemaId}`.toLowerCase(),
    );
    assert.equal(bucket.receiptsRegistered, 1n);
    assert.equal(bucket.executionAttempts, 1n);
    assert.equal(bucket.executionSuccesses, 1n);
    assert.equal(bucket.executionFailures, 0n);
    assert.equal(bucket.receiptsRevoked, 0n);
  });

  it("projects governance changes without private receipt material", async () => {
    const testIndexer = createTestIndexer();
    const verifier = "0x0000000000000000000000000000000000000005";
    const sourceKey = `0x${"41".repeat(32)}`;
    const adapterKey = `0x${"42".repeat(32)}`;

    await testIndexer.process({
      chains: {
        31337: {
          simulate: [
            {
              contract: "ExecutionRegistry",
              event: "ReceiptVerifierConfigured",
              srcAddress: registry,
              block: { number: 20, timestamp: 8_000 },
              params: { receiptVersion, verifier },
            },
            {
              contract: "ExecutionRegistry",
              event: "SourceAuthorizationChanged",
              srcAddress: registry,
              block: { number: 21, timestamp: 8_001 },
              params: {
                sourceKey,
                sourceNetwork,
                sourceContract,
                authorized: true,
              },
            },
            {
              contract: "ExecutionRegistry",
              event: "GatewayKeyEpochRegistered",
              srcAddress: registry,
              block: { number: 22, timestamp: 8_002 },
              params: {
                gatewayKeyId,
                signer,
                validAfter: 7_000n,
                validBefore: 9_000n,
              },
            },
            {
              contract: "ExecutionRegistry",
              event: "GatewayKeyEpochDisabled",
              srcAddress: registry,
              block: { number: 23, timestamp: 8_003 },
              params: { gatewayKeyId, signer },
            },
            {
              contract: "ExecutionRegistry",
              event: "AdapterRegistered",
              srcAddress: registry,
              block: { number: 24, timestamp: 8_004 },
              params: {
                adapterKey,
                receiptVersion,
                actionSchemaId,
                adapter: recipient,
              },
            },
            {
              contract: "ExecutionRegistry",
              event: "AdapterDisabled",
              srcAddress: registry,
              block: { number: 25, timestamp: 8_005 },
              params: {
                adapterKey,
                receiptVersion,
                actionSchemaId,
                adapter: recipient,
              },
            },
          ],
        },
      },
    });

    const projectedVerifier = await testIndexer.ReceiptVerifier.getOrThrow(
      id(receiptVersion),
    );
    assert.equal(projectedVerifier.verifier, verifier);

    const source = await testIndexer.SourceAuthorization.getOrThrow(id(sourceKey));
    assert.equal(source.authorized, true);

    const epoch = await testIndexer.GatewayKeyEpoch.getOrThrow(id(gatewayKeyId));
    assert.equal(epoch.disabled, true);

    const adapter = await testIndexer.Adapter.getOrThrow(id(adapterKey));
    assert.equal(adapter.enabled, false);
  });

  it("records failed execution and revocation without rewriting authorization", async () => {
    const testIndexer = createTestIndexer();
    const failedExecutionId = `0x${"51".repeat(32)}`;
    const errorHash = `0x${"52".repeat(32)}`;

    await testIndexer.process({
      chains: {
        31337: {
          simulate: [
            {
              contract: "ExecutionRegistry",
              event: "ReceiptRegistered",
              srcAddress: registry,
              block: { number: 30, timestamp: 10_805 },
              transaction: { hash: transactionHash },
              params: {
                receiptId,
                receiptVersion,
                recipient,
                actionSchemaId,
                purposeHash,
                validAfter: 10_000n,
                validBefore: 12_000n,
                scopedNullifier,
                outputCommitment,
                gatewayKeyId,
                gatewaySigner: signer,
                registeredAt: 10_805n,
              },
            },
            {
              contract: "ExecutionRegistry",
              event: "ExecutionRecorded",
              srcAddress: registry,
              block: { number: 31, timestamp: 10_820 },
              transaction: { hash: `0x${"53".repeat(32)}` },
              params: {
                executionId: failedExecutionId,
                receiptId,
                adapter: recipient,
                actionSchemaId,
                relayer,
                recipient,
                success: false,
                resultCommitment: zeroHash,
                errorHash,
                executedAt: 10_820n,
              },
            },
            {
              contract: "ExecutionRegistry",
              event: "ReceiptRevoked",
              srcAddress: registry,
              block: { number: 32, timestamp: 10_830 },
              params: { receiptId, revokedBy: signer },
            },
          ],
        },
      },
    });

    const receipt = await testIndexer.ReceiptProjection.getOrThrow(id(receiptId));
    assert.equal(receipt.outputCommitment, outputCommitment);
    assert.equal(receipt.purposeHash, purposeHash);
    assert.equal(receipt.consumed, true);
    assert.equal(receipt.revoked, true);
    assert.equal(receipt.revokedBy, signer);

    const execution = await testIndexer.ExecutionProjection.getOrThrow(
      id(failedExecutionId),
    );
    assert.equal(execution.success, false);
    assert.equal(execution.errorHash, errorHash);

    const bucket = await testIndexer.TimeBucketAggregate.getOrThrow(
      `${registry}:hour:10800:${actionSchemaId}`.toLowerCase(),
    );
    assert.equal(bucket.receiptsRegistered, 1n);
    assert.equal(bucket.executionAttempts, 1n);
    assert.equal(bucket.executionSuccesses, 0n);
    assert.equal(bucket.executionFailures, 1n);
    assert.equal(bucket.receiptsRevoked, 1n);
  });

  it("keeps private and cross-context identity fields out of the schema", () => {
    const schema = readFileSync(
      new URL("../schema.graphql", import.meta.url),
      "utf8",
    );
    const forbiddenFieldNames = [
      "subjectId",
      "credentialId",
      "privateValue",
      "ciphertext",
      "dynamicSessionId",
      "meraVault",
    ];

    for (const fieldName of forbiddenFieldNames) {
      assert.doesNotMatch(schema, new RegExp(`\\b${fieldName}\\b`, "i"));
    }
  });
});
