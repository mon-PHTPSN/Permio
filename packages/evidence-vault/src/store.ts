import { DatabaseSync } from "node:sqlite";
import type { DecisionReceipt } from "@permio/midnight-authorization";
import type { CiphertextDelivery } from "./delivery.ts";
import type { Digest } from "./crypto.ts";
import { publicReceipt } from "./receipt.ts";

export class EvidenceVaultConflictError extends Error {}

/** Private server-side storage. Callers authenticate and verify before persist;
 * this class is never a browser or public enumeration API. */
export class EvidenceVaultStore {
  readonly #database: DatabaseSync;
  constructor(path: string) {
    this.#database = new DatabaseSync(path);
    this.#database.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS evidence_receipts (
        receipt_id TEXT PRIMARY KEY, binding TEXT NOT NULL, recipient TEXT NOT NULL, receipt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS evidence_ciphertexts (
        delivery_id TEXT PRIMARY KEY, binding TEXT NOT NULL UNIQUE, recipient TEXT NOT NULL,
        packet TEXT NOT NULL, receipt_id TEXT NOT NULL REFERENCES evidence_receipts(receipt_id)
      );`);
  }
  close(): void { this.#database.close(); }
  persist(packet: CiphertextDelivery, receipt: DecisionReceipt): void {
    const encoded = JSON.stringify(packet), publicBody = JSON.stringify(publicReceipt(receipt));
    const binding = packet.bindingCommitment, recipient = packet.bundle.manifest.recipientKeyFingerprint;
    this.#database.exec("BEGIN IMMEDIATE");
    try {
      const previousReceipt = this.#database.prepare("SELECT binding, recipient, receipt FROM evidence_receipts WHERE receipt_id=?").get(receipt.receiptId);
      if (previousReceipt && (previousReceipt.binding !== binding || previousReceipt.recipient !== recipient || previousReceipt.receipt !== publicBody)) {
        throw new EvidenceVaultConflictError();
      }
      const previous = this.#database.prepare("SELECT delivery_id, binding, recipient, packet, receipt_id FROM evidence_ciphertexts WHERE delivery_id=? OR binding=?")
        .all(packet.deliveryId, binding);
      if (previous.length && (previous.length !== 1 || previous[0]!.delivery_id !== packet.deliveryId || previous[0]!.binding !== binding ||
        previous[0]!.recipient !== recipient || previous[0]!.packet !== encoded || previous[0]!.receipt_id !== receipt.receiptId)) {
        throw new EvidenceVaultConflictError();
      }
      this.#database.prepare("INSERT OR IGNORE INTO evidence_receipts VALUES (?, ?, ?, ?)").run(receipt.receiptId, binding, recipient, publicBody);
      this.#database.prepare("INSERT OR IGNORE INTO evidence_ciphertexts VALUES (?, ?, ?, ?, ?)").run(packet.deliveryId, binding, recipient, encoded, receipt.receiptId);
      this.#database.exec("COMMIT");
    } catch (error) { this.#database.exec("ROLLBACK"); throw error; }
  }
  /** Exact private grant scope is part of the SQL lookup, including on misses. */
  find(deliveryId: Digest, binding: Digest, recipient: Digest): { packet: CiphertextDelivery; receipt: DecisionReceipt } | null {
    const row = this.#database.prepare(`SELECT c.packet, r.receipt FROM evidence_ciphertexts c
      JOIN evidence_receipts r ON r.receipt_id=c.receipt_id AND r.binding=c.binding AND r.recipient=c.recipient
      WHERE c.delivery_id=? AND c.binding=? AND c.recipient=?`).get(deliveryId, binding, recipient);
    return row ? { packet: JSON.parse(row.packet as string), receipt: JSON.parse(row.receipt as string) } : null;
  }
  /** Trusted host audit only. Expiry/revocation never deletes immutable history. */
  receiptHistory(binding: Digest, recipient: Digest): readonly DecisionReceipt[] {
    return this.#database.prepare("SELECT receipt FROM evidence_receipts WHERE binding=? AND recipient=? ORDER BY rowid")
      .all(binding, recipient).map(row => publicReceipt(JSON.parse(row.receipt as string)));
  }
}
