import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { getAddress, isAddress, keccak256 } from "viem";
import { encodeM6ReceiptV1, m6SourceIdentityHash } from "./m6-receipt-codec.ts";
import type { GatewayTransport } from "./transport.ts";
import type { DecisionReceipt } from "../../midnight-authorization/src/decision-receipt.ts";
import { deriveGatewayOutboxKey } from "./outbox-key.ts";

export interface GatewayCheckpoint {
  readonly cursor: string;
  readonly sequence: string;
  readonly blockHash: string;
}
export interface GatewayObservedReceipt { readonly eventIndex: number; readonly receipt: DecisionReceipt; readonly expired?: boolean }
export interface GatewayOutboxRow {
  readonly key: `0x${string}`;
  readonly receipt: DecisionReceipt;
  readonly eventIndex: number;
  readonly state: "pending" | "delivering" | "retry" | "delivered" | "rejected";
  readonly attempts: number;
  readonly lastError: string | null;
  readonly nextRetryAt: number;
}
const PUBLIC_FIELDS = ["receiptVersion", "receiptId", "proofModuleId", "proofModuleVersion", "implementationHash",
  "namespaceHash", "templateIdHash", "semanticVersion", "templateContentHash", "instanceCommitment",
  "previousStateCommitment", "nextStateCommitment", "transitionSequence", "contextHash", "actionSchemaId", "purposeHash",
  "recipient", "validAfter", "validBefore", "scopedNullifier", "outputCommitment", "sourceNetwork", "sourceContract",
  "sourceTransaction", "sourceLedgerSequence"] as const;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
function canonicalReceipt(receipt: DecisionReceipt): string {
  if (Object.keys(receipt).length !== PUBLIC_FIELDS.length || PUBLIC_FIELDS.some(field => !(field in receipt)) ||
      receipt.receiptVersion !== 1 || !/^[0-9a-f]{66}$/.test(receipt.sourceTransaction) ||
      !/^0x[0-9a-f]{64}$/.test(receipt.recipient)) throw Error("INVALID_PUBLIC_RECEIPT");
  return JSON.stringify(Object.fromEntries(PUBLIC_FIELDS.map(field => [field, receipt[field]])));
}
function unsigned(value: string): bigint {
  if (!/^(0|[1-9][0-9]*)$/.test(value) || BigInt(value) >= 2n ** 64n) throw Error("INVALID_SOURCE_SEQUENCE");
  return BigInt(value);
}

const TRANSPORT_FIELDS = ["version", "outboxKey", "sourceIdentityHash", "receiptHash", "keyId", "signedAt", "targetChainId", "targetRegistry", "encodedReceipt", "signature"] as const;
function canonicalTransport(packet: GatewayTransport): string {
  if (!packet || Object.keys(packet).length !== TRANSPORT_FIELDS.length || TRANSPORT_FIELDS.some(field => !(field in packet)) ||
      packet.version !== 1 || !Number.isSafeInteger(packet.signedAt) || packet.signedAt < 0 ||
      typeof packet.keyId !== "string" || !/^[\x21-\x7e]{1,256}$/.test(packet.keyId) ||
      typeof packet.targetChainId !== "string" || !/^[1-9][0-9]*$/.test(packet.targetChainId) || BigInt(packet.targetChainId) >= 2n ** 256n ||
      !isAddress(packet.targetRegistry, { strict: true }) || getAddress(packet.targetRegistry) !== packet.targetRegistry || /^0x0{40}$/i.test(packet.targetRegistry) ||
      ![packet.outboxKey, packet.sourceIdentityHash, packet.receiptHash].every(value => typeof value === "string" && /^0x[0-9a-f]{64}$/.test(value)) ||
      typeof packet.signature !== "string" || !/^0x[0-9a-f]{130}$/.test(packet.signature) ||
      typeof packet.encodedReceipt !== "string" || !/^0x(?:[0-9a-f]{2})+$/.test(packet.encodedReceipt) || packet.encodedReceipt.length > 2 * 1024 ** 2 + 2) {
    throw Error("INVALID_SAVED_TRANSPORT");
  }
  return JSON.stringify(Object.fromEntries(TRANSPORT_FIELDS.map(field => [field, packet[field]])));
}
/** Single observer's public-only durable outbox. Delivery is at least once; consumers must persist the supplied idempotency key. */
export class GatewayStore {
  private readonly database: DatabaseSync;
  readonly network: string;
  readonly contract: `0x${string}`;
  constructor(path: string, network: string, contract: `0x${string}`) {
    this.network = network; this.contract = contract;
    this.database = new DatabaseSync(path);
    this.database.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS gateway_meta (name TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS gateway_outbox (
        key TEXT PRIMARY KEY, identity TEXT NOT NULL UNIQUE, receipt TEXT NOT NULL, receipt_hash TEXT NOT NULL,
        event_index INTEGER NOT NULL, state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT, next_retry_at INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS gateway_transports (
        id INTEGER PRIMARY KEY, outbox_key TEXT NOT NULL, target_chain TEXT NOT NULL, target_registry TEXT NOT NULL,
        key_id TEXT NOT NULL, packet TEXT NOT NULL, packet_hash TEXT NOT NULL,
        UNIQUE(outbox_key, target_chain, target_registry, key_id)
      );`);
    const identity = JSON.stringify([network, contract, "decision-receipt-v1"]);
    this.database.prepare("INSERT OR IGNORE INTO gateway_meta VALUES ('source', ?)").run(identity);
    if (this.meta("source") !== identity) { this.database.close(); throw Error("SOURCE_STORE_MISMATCH"); }
  }
  close(): void { this.database.close(); }
  private meta(name: string): string | null {
    return (this.database.prepare("SELECT value FROM gateway_meta WHERE name = ?").get(name)?.value as string | undefined) ?? null;
  }
  checkpoint(): GatewayCheckpoint | null {
    const value = this.meta("checkpoint"); return value === null ? null : JSON.parse(value) as GatewayCheckpoint;
  }
  sourceError(): string | null { return this.meta("source-error"); }
  recordSourceError(category: "SOURCE_UNAVAILABLE" | "SOURCE_STATUS_UNAVAILABLE" | null): void {
    if (category === null) this.database.prepare("DELETE FROM gateway_meta WHERE name = 'source-error'").run();
    else this.database.prepare("INSERT OR REPLACE INTO gateway_meta VALUES ('source-error', ?)").run(category);
  }
  integrityError(): string | null { return this.meta("integrity-error"); }
  stopForIntegrity(): never {
    this.database.prepare("INSERT OR REPLACE INTO gateway_meta VALUES ('integrity-error', 'FINALITY_INTEGRITY')").run();
    throw Error("FINALITY_INTEGRITY");
  }
  assertRunning(): void { if (this.integrityError() !== null) throw Error("FINALITY_INTEGRITY"); }
  commitObservation(checkpoint: GatewayCheckpoint, observed: readonly GatewayObservedReceipt[]): void {
    this.assertRunning();
    const sequence = unsigned(checkpoint.sequence);
    if (!checkpoint.cursor || !/^0x[0-9a-f]{64}$/.test(checkpoint.blockHash)) throw Error("INVALID_CHECKPOINT");
    this.database.exec("BEGIN IMMEDIATE");
    let integrityFailure = false;
    try {
      const previous = this.checkpoint();
      if (previous && (sequence < unsigned(previous.sequence) ||
        sequence === unsigned(previous.sequence) && (previous.cursor !== checkpoint.cursor || previous.blockHash !== checkpoint.blockHash))) {
        integrityFailure = true; throw Error("FINALITY_INTEGRITY");
      }
      for (const { eventIndex, receipt, expired = false } of observed) {
        if (eventIndex !== 0 ||
          receipt.sourceNetwork !== this.network || receipt.sourceContract !== this.contract ||
          unsigned(receipt.sourceLedgerSequence) !== sequence) throw Error("INVALID_SOURCE_EVENT");
        const encoded = canonicalReceipt(receipt), hash = digest(encoded);
        const identity = JSON.stringify([this.network, this.contract, receipt.sourceTransaction, eventIndex]);
        const key = deriveGatewayOutboxKey({ networkId: this.network, contractId: this.contract,
          transactionId: receipt.sourceTransaction, eventIndex, ledgerSequence: BigInt(receipt.sourceLedgerSequence) },
          { receiptVersion: "1", scopedNullifier: receipt.scopedNullifier });
        const existing = this.database.prepare("SELECT key, receipt_hash, receipt FROM gateway_outbox WHERE identity = ? OR key = ?").all(identity, key);
        if (existing.length > 0) {
          if (existing.length !== 1 || existing[0]!.key !== key || existing[0]!.receipt_hash !== hash || existing[0]!.receipt !== encoded) {
            integrityFailure = true; throw Error("FINALITY_INTEGRITY");
          }
        } else {
          if (previous && unsigned(receipt.sourceLedgerSequence) <= unsigned(previous.sequence)) {
            integrityFailure = true; throw Error("FINALITY_INTEGRITY");
          }
          this.database.prepare("INSERT INTO gateway_outbox (key, identity, receipt, receipt_hash, event_index, state, last_error) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .run(key, identity, encoded, hash, eventIndex, expired ? "rejected" : "pending", expired ? "RECEIPT_EXPIRED" : null);
        }
      }
      this.database.prepare("INSERT OR REPLACE INTO gateway_meta VALUES ('checkpoint', ?)").run(JSON.stringify({ cursor: checkpoint.cursor, sequence: checkpoint.sequence, blockHash: checkpoint.blockHash }));
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      if (integrityFailure) this.stopForIntegrity();
      throw error;
    }
  }
  private decode(row: Record<string, unknown>): GatewayOutboxRow {
    const encoded = row.receipt as string;
    if (digest(encoded) !== row.receipt_hash) this.stopForIntegrity();
    const receipt = JSON.parse(encoded) as DecisionReceipt;
    if (canonicalReceipt(receipt) !== encoded) this.stopForIntegrity();
    return { key: row.key as `0x${string}`, receipt: Object.freeze(receipt), eventIndex: row.event_index as number,
      state: row.state as GatewayOutboxRow["state"], attempts: row.attempts as number,
      lastError: row.last_error as string | null, nextRetryAt: row.next_retry_at as number };
  }
  rows(): readonly GatewayOutboxRow[] {
    return this.database.prepare("SELECT * FROM gateway_outbox ORDER BY rowid").all().map(row => this.decode(row));
  }
  outbox(key: string): GatewayOutboxRow | null {
    this.assertRunning();
    const row = this.database.prepare("SELECT * FROM gateway_outbox WHERE key = ?").get(key);
    return row ? this.decode(row) : null;
  }
  private transport(row: Record<string, unknown>): GatewayTransport {
    try {
      const encoded = row.packet as string;
      if (digest(encoded) !== row.packet_hash) throw Error();
      const packet = JSON.parse(encoded) as GatewayTransport;
      if (canonicalTransport(packet) !== encoded || packet.outboxKey !== row.outbox_key ||
          packet.targetChainId !== row.target_chain || packet.targetRegistry !== row.target_registry || packet.keyId !== row.key_id) throw Error();
      const outbox = this.outbox(packet.outboxKey);
      if (!outbox || packet.encodedReceipt !== encodeM6ReceiptV1(outbox.receipt) ||
          packet.sourceIdentityHash !== m6SourceIdentityHash(outbox.receipt) || packet.receiptHash !== keccak256(packet.encodedReceipt)) throw Error();
      return Object.freeze(packet);
    } catch { return this.stopForIntegrity(); }
  }
  /** Append-only public envelope history, independently keyed by destination and key epoch. */
  transports(key: string, targetChainId: string, targetRegistry: string): readonly GatewayTransport[] {
    this.assertRunning();
    return this.database.prepare("SELECT * FROM gateway_transports WHERE outbox_key = ? AND target_chain = ? AND target_registry = ? ORDER BY id")
      .all(key, targetChainId, getAddress(targetRegistry)).map(row => this.transport(row));
  }
  persistTransport(packet: GatewayTransport): GatewayTransport {
    this.assertRunning();
    const encoded = canonicalTransport(packet), outbox = this.outbox(packet.outboxKey);
    if (!outbox || packet.encodedReceipt !== encodeM6ReceiptV1(outbox.receipt) ||
        packet.sourceIdentityHash !== m6SourceIdentityHash(outbox.receipt) || packet.receiptHash !== keccak256(packet.encodedReceipt)) throw Error("INVALID_SAVED_TRANSPORT");
    this.database.prepare("INSERT OR IGNORE INTO gateway_transports (outbox_key, target_chain, target_registry, key_id, packet, packet_hash) VALUES (?, ?, ?, ?, ?, ?)")
      .run(packet.outboxKey, packet.targetChainId, packet.targetRegistry, packet.keyId, encoded, digest(encoded));
    const saved = this.database.prepare("SELECT * FROM gateway_transports WHERE outbox_key = ? AND target_chain = ? AND target_registry = ? AND key_id = ?")
      .get(packet.outboxKey, packet.targetChainId, packet.targetRegistry, packet.keyId)!;
    return this.transport(saved);
  }
  claimDue(now: number): GatewayOutboxRow | null {
    this.assertRunning();
    let claimed: Record<string, unknown> | undefined;
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const row = this.database.prepare("SELECT * FROM gateway_outbox WHERE state IN ('pending', 'retry', 'delivering') AND next_retry_at <= ? ORDER BY rowid LIMIT 1").get(now);
      if (!row) { this.database.exec("COMMIT"); return null; }
      this.database.prepare("UPDATE gateway_outbox SET state = 'delivering', attempts = attempts + 1, last_error = NULL WHERE key = ?").run(row.key!);
      claimed = this.database.prepare("SELECT * FROM gateway_outbox WHERE key = ?").get(row.key!)!;
      this.database.exec("COMMIT");
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
    return this.decode(claimed!);
  }
  acknowledge(key: string): void {
    this.assertRunning();
    const result = this.database.prepare("UPDATE gateway_outbox SET state = 'delivered', last_error = NULL, next_retry_at = 0 WHERE key = ? AND state = 'delivering'").run(key);
    if (result.changes !== 1) throw Error("INVALID_DELIVERY_STATE");
  }
  rejectNotAllowlisted(key: string): void {
    this.assertRunning();
    this.database.prepare("UPDATE gateway_outbox SET state = 'rejected', last_error = 'RECEIPT_NOT_ALLOWLISTED', next_retry_at = 0 WHERE key = ? AND state = 'delivering'").run(key);
  }
  rejectExpired(key: string): void {
    this.assertRunning();
    this.database.prepare("UPDATE gateway_outbox SET state = 'rejected', last_error = 'RECEIPT_EXPIRED', next_retry_at = 0 WHERE key = ? AND state = 'delivering'").run(key);
  }
  retry(key: string, nextRetryAt: number): void {
    this.assertRunning();
    this.database.prepare("UPDATE gateway_outbox SET state = 'retry', last_error = 'DELIVERY_FAILED', next_retry_at = ? WHERE key = ? AND state = 'delivering'").run(nextRetryAt, key);
  }
}
