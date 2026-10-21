import { setTimeout as delay } from "node:timers/promises";
import { readFinalizedDecisionReceipt, type DecisionReceipt, type DecisionReceiptSourceReader } from "../../midnight-authorization/src/decision-receipt.ts";
import type { Hex32 } from "../../midnight-authorization/src/model.ts";
import { IndexedReceiptUnavailableError } from "../../midnight-authorization/src/indexed-receipt-read.ts";
import { GatewayStore, type GatewayCheckpoint } from "./durable-store.ts";

/** Complete finalized block, including every receipt-producing call in that block. Never split one block across cursors. */
export interface FinalizedReceiptBatch {
  readonly checkpoint: GatewayCheckpoint;
  readonly events: readonly { readonly transactionId: string; readonly receiptId: Hex32; readonly eventIndex: number }[];
}
export type AllowedGatewayReceipt = Pick<DecisionReceipt, "namespaceHash" | "templateIdHash" | "semanticVersion" |
  "templateContentHash" | "proofModuleId" | "proofModuleVersion" | "implementationHash">;

export interface GatewayObserverDependencies {
  readonly network: "preprod" | "undeployed";
  readonly contract: Hex32;
  readonly allowedReceipts: readonly AllowedGatewayReceipt[];
  /** Trusted authenticated finality adapter, never a client-provided event list. Each scan returns ALL receipt calls in ONE complete finalized block (or an empty finalized block), and cursor denotes its block boundary. Sequences strictly increase; exact duplicate batches are allowed. */
  readonly discovery: {
    scan(after: GatewayCheckpoint | null): Promise<FinalizedReceiptBatch | null>;
    verifyCheckpoint(checkpoint: GatewayCheckpoint): Promise<boolean>;
  };
  readonly receiptReader: DecisionReceiptSourceReader;
  /** Reads the two registries in the same M6 deployment at the exact receipt source sequence, not their current status. */
  readonly historicalStatus: { read(receipt: DecisionReceipt): Promise<{
    readonly sourceLedgerSequence: string;
    readonly templateRegistry: Hex32;
    readonly proofModuleRegistry: Hex32;
    readonly templateActive: boolean;
    readonly moduleActive: boolean;
  }> };
  /** Authenticated idempotent consumer. It must acknowledge only after its durable acceptance. */
  readonly deliver: (receipt: DecisionReceipt, idempotencyKey: `0x${string}`) => Promise<{ readonly idempotencyKey: string }>;
  readonly now: () => number;
  readonly retrySeconds: number;
}

/** A single long-running observer with durable at-least-once delivery. Private authorization is exclusively M6's responsibility. */
export class GatewayObserver {
  private delivering = false;
  private readonly store: GatewayStore;
  private readonly dependencies: GatewayObserverDependencies;
  constructor(store: GatewayStore, dependencies: GatewayObserverDependencies) {
    this.store = store;
    if (store.network !== dependencies.network || store.contract !== dependencies.contract ||
      !Array.isArray(dependencies.allowedReceipts) || dependencies.allowedReceipts.length === 0 || !Number.isSafeInteger(dependencies.retrySeconds) || dependencies.retrySeconds <= 0) throw Error("INVALID_OBSERVER_CONFIGURATION");
    this.dependencies = Object.freeze({ ...dependencies, allowedReceipts: Object.freeze(
      dependencies.allowedReceipts.map(candidate => Object.freeze({ ...candidate }))) });
  }
  private isAllowlisted(receipt: DecisionReceipt): boolean {
    return this.dependencies.allowedReceipts.some(candidate =>
      candidate.namespaceHash === receipt.namespaceHash && candidate.templateIdHash === receipt.templateIdHash &&
      candidate.semanticVersion === receipt.semanticVersion && candidate.templateContentHash === receipt.templateContentHash &&
      candidate.proofModuleId === receipt.proofModuleId && candidate.proofModuleVersion === receipt.proofModuleVersion &&
      candidate.implementationHash === receipt.implementationHash);
  }
  private now(): number {
    const now = this.dependencies.now();
    if (!Number.isSafeInteger(now) || now < 0) throw Error("INVALID_OBSERVER_TIME");
    return now;
  }
  private async verifyCheckpoint(): Promise<void> {
    this.store.assertRunning();
    const checkpoint = this.store.checkpoint();
    if (checkpoint !== null) {
      let intact: boolean;
      try { intact = await this.dependencies.discovery.verifyCheckpoint(checkpoint); }
      catch { throw Error("SOURCE_UNAVAILABLE"); }
      if (!intact) this.store.stopForIntegrity();
    }
  }
  async observeOnce(): Promise<number> {
    await this.verifyCheckpoint();
    let batch: FinalizedReceiptBatch | null;
    try { batch = await this.dependencies.discovery.scan(this.store.checkpoint()); }
    catch { throw Error("SOURCE_UNAVAILABLE"); }
    if (batch === null) { this.store.recordSourceError(null); return 0; }
    let finalized: boolean;
    try { finalized = await this.dependencies.discovery.verifyCheckpoint(batch.checkpoint); }
    catch { throw Error("SOURCE_UNAVAILABLE"); }
    if (!finalized) this.store.stopForIntegrity();
    const observed = [];
    for (const event of batch.events) {
      // M6 v1 reconciliation permits exactly one ordinary-action call and one receipt insertion.
      if (event.eventIndex !== 0) throw Error("INVALID_SOURCE_EVENT_INDEX");
      let receipt: DecisionReceipt;
      try {
        receipt = await readFinalizedDecisionReceipt(this.dependencies.receiptReader, {
          network: this.dependencies.network, contract: this.dependencies.contract,
          transactionId: event.transactionId, receiptId: event.receiptId,
        });
      } catch (error) {
        if (error instanceof IndexedReceiptUnavailableError) throw Error("SOURCE_UNAVAILABLE");
        throw Error("SOURCE_RECEIPT_REJECTED");
      }
      if (receipt.sourceLedgerSequence !== batch.checkpoint.sequence) throw Error("INCOMPLETE_FINALIZED_BLOCK");
      if (!this.isAllowlisted(receipt)) throw Error("RECEIPT_NOT_ALLOWLISTED");
      let status;
      try { status = await this.dependencies.historicalStatus.read(receipt); }
      catch { throw Error("SOURCE_STATUS_UNAVAILABLE"); }
      if (status.sourceLedgerSequence !== receipt.sourceLedgerSequence || status.templateRegistry !== this.dependencies.contract ||
        status.proofModuleRegistry !== this.dependencies.contract || status.templateActive !== true || status.moduleActive !== true) {
        throw Error("SOURCE_STATUS_REJECTED");
      }
      const now = BigInt(this.now());
      if (now < BigInt(receipt.validAfter)) throw Error("RECEIPT_OUTSIDE_VALIDITY");
      observed.push({ eventIndex: event.eventIndex, receipt, expired: now >= BigInt(receipt.validBefore) });
    }
    this.store.commitObservation(batch.checkpoint, observed);
    this.store.recordSourceError(null);
    return observed.length;
  }
  async deliverOnce(): Promise<boolean> {
    if (this.delivering) return false;
    this.delivering = true;
    try {
      await this.verifyCheckpoint();
      const now = this.now(), row = this.store.claimDue(now);
      if (row === null) return false;
      if (!this.isAllowlisted(row.receipt)) { this.store.rejectNotAllowlisted(row.key); return true; }
      if (BigInt(now) >= BigInt(row.receipt.validBefore)) { this.store.rejectExpired(row.key); return true; }
      try {
        if (BigInt(now) < BigInt(row.receipt.validAfter)) throw Error("RECEIPT_OUTSIDE_VALIDITY");
        const acknowledgement = await this.dependencies.deliver(row.receipt, row.key);
        if (acknowledgement.idempotencyKey !== row.key) throw Error("ACKNOWLEDGEMENT_MISMATCH");
        this.store.acknowledge(row.key);
      } catch { this.store.retry(row.key, now + this.dependencies.retrySeconds); }
      return true;
    } finally { this.delivering = false; }
  }
  async run(signal: AbortSignal, pollMilliseconds = 1000): Promise<void> {
    if (!Number.isSafeInteger(pollMilliseconds) || pollMilliseconds <= 0) throw Error("INVALID_POLL_INTERVAL");
    while (!signal.aborted) {
      try {
        await this.observeOnce();
        while (!signal.aborted && await this.deliverOnce()) { /* Drain due public outbox records. */ }
      } catch (error) {
        const category = error instanceof Error ? error.message : "OBSERVER_FAILED";
        if (category !== "SOURCE_UNAVAILABLE" && category !== "SOURCE_STATUS_UNAVAILABLE") throw error;
        this.store.recordSourceError(category);
      }
      try { await delay(pollMilliseconds, undefined, { signal }); }
      catch { if (!signal.aborted) throw Error("OBSERVER_WAIT_FAILED"); }
    }
  }
}
