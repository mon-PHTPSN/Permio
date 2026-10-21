import {
  indexer,
  type EvmOnEventContext,
  type ReceiptProjection,
  type TimeBucketAggregate,
} from "envio";

const HOUR_SECONDS = 3_600n;

function registryId(address: string): string {
  return address.toLowerCase();
}

function entityId(registry: string, identifier: string): string {
  return `${registryId(registry)}:${identifier.toLowerCase()}`;
}

function hourBucket(timestamp: bigint): bigint {
  return timestamp - (timestamp % HOUR_SECONDS);
}

function aggregateId(
  registry: string,
  bucketStart: bigint,
  actionSchemaId: string,
): string {
  return `${registryId(registry)}:hour:${bucketStart}:${actionSchemaId.toLowerCase()}`;
}

async function updateAggregate(
  context: EvmOnEventContext,
  registry: string,
  timestamp: bigint,
  blockNumber: bigint,
  actionSchemaId: string,
  changes: Partial<
    Pick<
      TimeBucketAggregate,
      | "receiptsRegistered"
      | "executionAttempts"
      | "executionSuccesses"
      | "executionFailures"
      | "receiptsRevoked"
    >
  >,
): Promise<void> {
  const bucketStart = hourBucket(timestamp);
  const id = aggregateId(registry, bucketStart, actionSchemaId);
  const current = await context.TimeBucketAggregate.get(id);
  context.TimeBucketAggregate.set({
    id,
    registry: registryId(registry),
    bucketKind: "hour",
    bucketStart,
    actionSchemaId,
    receiptsRegistered:
      (current?.receiptsRegistered ?? 0n) + (changes.receiptsRegistered ?? 0n),
    executionAttempts:
      (current?.executionAttempts ?? 0n) + (changes.executionAttempts ?? 0n),
    executionSuccesses:
      (current?.executionSuccesses ?? 0n) + (changes.executionSuccesses ?? 0n),
    executionFailures:
      (current?.executionFailures ?? 0n) + (changes.executionFailures ?? 0n),
    receiptsRevoked:
      (current?.receiptsRevoked ?? 0n) + (changes.receiptsRevoked ?? 0n),
    updatedAt: timestamp,
    updatedBlock: blockNumber,
  });
}

indexer.onEvent(
  { contract: "ExecutionRegistry", event: "ReceiptVerifierConfigured" },
  async ({ event, context }) => {
    const registry = registryId(event.srcAddress);
    context.ReceiptVerifier.set({
      id: entityId(registry, event.params.receiptVersion),
      registry,
      receiptVersion: event.params.receiptVersion,
      verifier: event.params.verifier.toLowerCase(),
      updatedAt: BigInt(event.block.timestamp),
      updatedBlock: BigInt(event.block.number),
    });
  },
);

indexer.onEvent(
  { contract: "ExecutionRegistry", event: "SourceAuthorizationChanged" },
  async ({ event, context }) => {
    const registry = registryId(event.srcAddress);
    context.SourceAuthorization.set({
      id: entityId(registry, event.params.sourceKey),
      registry,
      sourceKey: event.params.sourceKey,
      sourceNetwork: event.params.sourceNetwork,
      sourceContract: event.params.sourceContract,
      authorized: event.params.authorized,
      updatedAt: BigInt(event.block.timestamp),
      updatedBlock: BigInt(event.block.number),
    });
  },
);

indexer.onEvent(
  { contract: "ExecutionRegistry", event: "GatewayKeyEpochRegistered" },
  async ({ event, context }) => {
    const registry = registryId(event.srcAddress);
    context.GatewayKeyEpoch.set({
      id: entityId(registry, event.params.gatewayKeyId),
      registry,
      gatewayKeyId: event.params.gatewayKeyId,
      signer: event.params.signer.toLowerCase(),
      validAfter: event.params.validAfter,
      validBefore: event.params.validBefore,
      disabled: false,
      updatedAt: BigInt(event.block.timestamp),
      updatedBlock: BigInt(event.block.number),
    });
  },
);

indexer.onEvent(
  { contract: "ExecutionRegistry", event: "GatewayKeyEpochDisabled" },
  async ({ event, context }) => {
    const registry = registryId(event.srcAddress);
    const id = entityId(registry, event.params.gatewayKeyId);
    const current = await context.GatewayKeyEpoch.getOrThrow(
      id,
      `Missing gateway key epoch ${event.params.gatewayKeyId}`,
    );
    context.GatewayKeyEpoch.set({
      ...current,
      disabled: true,
      updatedAt: BigInt(event.block.timestamp),
      updatedBlock: BigInt(event.block.number),
    });
  },
);

indexer.onEvent(
  { contract: "ExecutionRegistry", event: "AdapterRegistered" },
  async ({ event, context }) => {
    const registry = registryId(event.srcAddress);
    context.Adapter.set({
      id: entityId(registry, event.params.adapterKey),
      registry,
      adapterKey: event.params.adapterKey,
      receiptVersion: event.params.receiptVersion,
      actionSchemaId: event.params.actionSchemaId,
      address: event.params.adapter.toLowerCase(),
      enabled: true,
      updatedAt: BigInt(event.block.timestamp),
      updatedBlock: BigInt(event.block.number),
    });
  },
);

indexer.onEvent(
  { contract: "ExecutionRegistry", event: "AdapterDisabled" },
  async ({ event, context }) => {
    const registry = registryId(event.srcAddress);
    const id = entityId(registry, event.params.adapterKey);
    const current = await context.Adapter.getOrThrow(
      id,
      `Missing adapter ${event.params.adapterKey}`,
    );
    context.Adapter.set({
      ...current,
      enabled: false,
      updatedAt: BigInt(event.block.timestamp),
      updatedBlock: BigInt(event.block.number),
    });
  },
);

indexer.onEvent(
  { contract: "ExecutionRegistry", event: "ReceiptRegistered" },
  async ({ event, context }) => {
    const registry = registryId(event.srcAddress);
    const receipt: ReceiptProjection = {
      id: entityId(registry, event.params.receiptId),
      registry,
      receiptVersion: event.params.receiptVersion,
      recipient: event.params.recipient.toLowerCase(),
      actionSchemaId: event.params.actionSchemaId,
      purposeHash: event.params.purposeHash,
      validAfter: event.params.validAfter,
      validBefore: event.params.validBefore,
      scopedNullifier: event.params.scopedNullifier,
      outputCommitment: event.params.outputCommitment,
      gatewayKeyId: event.params.gatewayKeyId,
      gatewaySigner: event.params.gatewaySigner.toLowerCase(),
      gatewaySignedAt: undefined,
      registeredAt: event.params.registeredAt,
      registeredBlock: BigInt(event.block.number),
      registeredTransaction: event.transaction.hash,
      sourceNetwork: undefined,
      sourceContract: undefined,
      sourceTransaction: undefined,
      sourceLedgerSequence: undefined,
      namespaceHash: undefined,
      templateIdHash: undefined,
      templateVersion: undefined,
      templateContentHash: undefined,
      proofModuleId: undefined,
      proofModuleVersion: undefined,
      proofModuleImplementationHash: undefined,
      instanceCommitment: undefined,
      previousStateCommitment: undefined,
      nextStateCommitment: undefined,
      transitionSequence: undefined,
      contextHash: undefined,
      revoked: false,
      revokedBy: undefined,
      consumed: false,
      executionId: undefined,
    };
    context.ReceiptProjection.set(receipt);
    await updateAggregate(
      context,
      registry,
      event.params.registeredAt,
      BigInt(event.block.number),
      event.params.actionSchemaId,
      { receiptsRegistered: 1n },
    );
  },
);

indexer.onEvent(
  { contract: "ExecutionRegistry", event: "ReceiptSourceBound" },
  async ({ event, context }) => {
    const registry = registryId(event.srcAddress);
    const id = entityId(registry, event.params.receiptId);
    const current = await context.ReceiptProjection.getOrThrow(
      id,
      `Missing receipt ${event.params.receiptId}`,
    );
    context.ReceiptProjection.set({
      ...current,
      sourceNetwork: event.params.sourceNetwork,
      sourceContract: event.params.sourceContract,
      sourceTransaction: event.params.sourceTransaction,
      sourceLedgerSequence: event.params.sourceLedgerSequence,
      gatewaySignedAt: event.params.gatewaySignedAt,
    });
  },
);

indexer.onEvent(
  { contract: "ExecutionRegistry", event: "ReceiptImplementationBound" },
  async ({ event, context }) => {
    const registry = registryId(event.srcAddress);
    const id = entityId(registry, event.params.receiptId);
    const current = await context.ReceiptProjection.getOrThrow(
      id,
      `Missing receipt ${event.params.receiptId}`,
    );
    context.ReceiptProjection.set({
      ...current,
      namespaceHash: event.params.namespaceHash,
      templateIdHash: event.params.templateIdHash,
      templateVersion: event.params.templateVersion,
      templateContentHash: event.params.templateContentHash,
      proofModuleId: event.params.proofModuleId,
      proofModuleVersion: event.params.proofModuleVersion,
      proofModuleImplementationHash:
        event.params.proofModuleImplementationHash,
    });
  },
);

indexer.onEvent(
  { contract: "ExecutionRegistry", event: "ReceiptStateBound" },
  async ({ event, context }) => {
    const registry = registryId(event.srcAddress);
    const id = entityId(registry, event.params.receiptId);
    const current = await context.ReceiptProjection.getOrThrow(
      id,
      `Missing receipt ${event.params.receiptId}`,
    );
    context.ReceiptProjection.set({
      ...current,
      instanceCommitment: event.params.instanceCommitment,
      previousStateCommitment: event.params.previousStateCommitment,
      nextStateCommitment: event.params.nextStateCommitment,
      transitionSequence: event.params.transitionSequence,
      contextHash: event.params.contextHash,
    });
  },
);

indexer.onEvent(
  { contract: "ExecutionRegistry", event: "ReceiptRevoked" },
  async ({ event, context }) => {
    const registry = registryId(event.srcAddress);
    const id = entityId(registry, event.params.receiptId);
    const current = await context.ReceiptProjection.getOrThrow(
      id,
      `Missing receipt ${event.params.receiptId}`,
    );
    context.ReceiptProjection.set({
      ...current,
      revoked: true,
      revokedBy: event.params.revokedBy.toLowerCase(),
    });
    await updateAggregate(
      context,
      registry,
      BigInt(event.block.timestamp),
      BigInt(event.block.number),
      current.actionSchemaId,
      { receiptsRevoked: 1n },
    );
  },
);

indexer.onEvent(
  { contract: "ExecutionRegistry", event: "ExecutionRecorded" },
  async ({ event, context }) => {
    const registry = registryId(event.srcAddress);
    const receiptId = entityId(registry, event.params.receiptId);
    const receipt = await context.ReceiptProjection.getOrThrow(
      receiptId,
      `Missing receipt ${event.params.receiptId}`,
    );
    const executionId = entityId(registry, event.params.executionId);

    context.ExecutionProjection.set({
      id: executionId,
      registry,
      receiptId,
      adapter: event.params.adapter.toLowerCase(),
      actionSchemaId: event.params.actionSchemaId,
      relayer: event.params.relayer.toLowerCase(),
      recipient: event.params.recipient.toLowerCase(),
      success: event.params.success,
      resultCommitment: event.params.resultCommitment,
      errorHash: event.params.errorHash,
      executedAt: event.params.executedAt,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
    });
    context.ReceiptProjection.set({
      ...receipt,
      consumed: true,
      executionId,
    });
    await updateAggregate(
      context,
      registry,
      event.params.executedAt,
      BigInt(event.block.number),
      event.params.actionSchemaId,
      {
        executionAttempts: 1n,
        executionSuccesses: event.params.success ? 1n : 0n,
        executionFailures: event.params.success ? 0n : 1n,
      },
    );
  },
);
