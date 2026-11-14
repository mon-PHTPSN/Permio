import type { ActionIntentPayload, SignedActionIntent } from "@permio/context-accounts";
import type { DecisionReceipt } from "@permio/midnight-authorization";
import {
  assertDigest, assertText, assertTime, canonical, importRecipientPublicKey, sha256,
  type Digest, type RecipientPublicKey,
} from "./crypto.ts";
import {
  bindBridgeActionIntent, bridgeBindingCommitment, encryptSelectedRecords,
  type BridgeReceiptVerifier, type BridgeScope, type EncryptedEvidenceBundle,
  type SelectedRecord, type SelectedRecordManifest,
} from "./evidence.ts";

export interface EvidenceDeliveryInput {
  readonly scope: BridgeScope;
  readonly records: readonly SelectedRecord[];
  readonly recipient: RecipientPublicKey;
  readonly intent: ActionIntentPayload;
}
export interface EvidenceDisclosurePreview extends BridgeScope {
  readonly previewId: string;
  readonly recipientKeyFingerprint: Digest;
  readonly records: readonly {
    readonly recordCommitment: Digest;
    readonly mediaType: string;
    readonly byteLength: number;
  }[];
  readonly linkage: "Selected records link the named source context and instance to the destination context and case.";
}
export interface ReceiptDelivery {
  readonly deliveryId: Digest;
  readonly receipt: DecisionReceipt;
}
export interface CiphertextDelivery {
  readonly deliveryId: Digest;
  readonly bindingCommitment: Digest;
  readonly bundle: EncryptedEvidenceBundle;
}
/** These are local client adapters, not permissions supplied by browser JSON.
 * The authorization adapter must use the approved bridge proof module. The
 * verifier authenticates its exact finalized receipt and current revocation.
 * Neither adapter receives ciphertext or plaintext records. */
export interface EvidenceDeliveryAdapters {
  readonly now: () => number;
  readonly signer: {
    sign(payload: ActionIntentPayload): Promise<SignedActionIntent>;
    verify(intent: SignedActionIntent): Promise<boolean>;
  };
  readonly authorization: {
    request(input: {
      readonly intent: SignedActionIntent;
      readonly bindingCommitment: Digest;
      readonly manifestRoot: Digest;
      readonly manifest: SelectedRecordManifest;
    }): Promise<DecisionReceipt>;
  };
  readonly verifier: BridgeReceiptVerifier;
  /** Independent channels. Receivers must deduplicate by deliveryId and enforce
   * authorization themselves; this client workflow is not a server boundary. */
  readonly receiptChannel: { deliver(message: ReceiptDelivery): Promise<void> };
  readonly ciphertextChannel: { deliver(message: CiphertextDelivery): Promise<void> };
}
export type DeliveryChannel = "receipt" | "ciphertext";
type ChannelState = "pending" | "sending" | "delivered" | "failed";
type WorkflowState = "awaiting-confirmation" | "confirmed" | "preparing" | "authorizing"
  | "authorized" | "authorization-blocked" | "delivered" | "withdrawn" | "expired" | "failed";
export interface EvidenceDeliveryStatus {
  readonly state: WorkflowState;
  readonly channels: Readonly<Record<DeliveryChannel, ChannelState>>;
  readonly receiptId: Digest | null;
}
export class EvidenceDeliveryError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "EvidenceDeliveryError";
    this.code = code;
  }
}

function intentPayload(input: ActionIntentPayload): ActionIntentPayload {
  return {
    intentVersion: input.intentVersion, namespace: input.namespace, templateId: input.templateId,
    templateVersion: input.templateVersion, templateHash: input.templateHash, sessionId: input.sessionId,
    instanceId: input.instanceId, contextId: input.contextId, actionId: input.actionId,
    resourceSelector: input.resourceSelector, resource: input.resource, purpose: input.purpose,
    recipientKind: input.recipientKind, recipient: input.recipient,
    disclosurePolicyId: input.disclosurePolicyId, issuedAt: input.issuedAt, nonce: input.nonce,
  };
}
function samePayload(actual: ActionIntentPayload, expected: ActionIntentPayload): boolean {
  const keys = Object.keys(expected) as (keyof ActionIntentPayload)[];
  return actual != null && Object.keys(actual).length === keys.length
    && keys.every(key => actual[key] === expected[key]);
}
function publicReceipt(receipt: DecisionReceipt): DecisionReceipt {
  return structuredClone({
    receiptVersion: receipt.receiptVersion, receiptId: receipt.receiptId,
    proofModuleId: receipt.proofModuleId, proofModuleVersion: receipt.proofModuleVersion,
    implementationHash: receipt.implementationHash, namespaceHash: receipt.namespaceHash,
    templateIdHash: receipt.templateIdHash, semanticVersion: receipt.semanticVersion,
    templateContentHash: receipt.templateContentHash, instanceCommitment: receipt.instanceCommitment,
    previousStateCommitment: receipt.previousStateCommitment, nextStateCommitment: receipt.nextStateCommitment,
    transitionSequence: receipt.transitionSequence, contextHash: receipt.contextHash,
    actionSchemaId: receipt.actionSchemaId, purposeHash: receipt.purposeHash,
    recipient: receipt.recipient, validAfter: receipt.validAfter, validBefore: receipt.validBefore,
    scopedNullifier: receipt.scopedNullifier, outputCommitment: receipt.outputCommitment,
    sourceNetwork: receipt.sourceNetwork, sourceContract: receipt.sourceContract,
    sourceTransaction: receipt.sourceTransaction, sourceLedgerSequence: receipt.sourceLedgerSequence,
  });
}
function assertReceiptWindow(receipt: DecisionReceipt, now: number): void {
  if (receipt.receiptVersion !== 1 || !/^(0|[1-9][0-9]*)$/.test(receipt.validAfter)
    || !/^(0|[1-9][0-9]*)$/.test(receipt.validBefore)
    || BigInt(receipt.validAfter) > BigInt(now) || BigInt(receipt.validBefore) <= BigInt(now)) {
    throw new EvidenceDeliveryError("AUTHORIZATION_FAILED", "Authorization receipt is absent, invalid, not yet valid or expired.");
  }
  assertDigest(receipt.receiptId);
}

class EvidenceDelivery {
  readonly #input: EvidenceDeliveryInput;
  readonly #adapters: EvidenceDeliveryAdapters;
  readonly #preview: EvidenceDisclosurePreview;
  #state: WorkflowState = "awaiting-confirmation";
  readonly #channels: Record<DeliveryChannel, ChannelState> = { receipt: "pending", ciphertext: "pending" };
  #bundle: EncryptedEvidenceBundle | undefined;
  #binding: Digest | undefined;
  #receipt: DecisionReceipt | undefined;
  #receiptDeliveryId: Digest | undefined;
  #ciphertextDeliveryId: Digest | undefined;

  constructor(input: EvidenceDeliveryInput, adapters: EvidenceDeliveryAdapters) {
    this.#input = input;
    this.#adapters = adapters;
    this.#preview = {
      ...input.scope, previewId: crypto.randomUUID(), recipientKeyFingerprint: input.recipient.fingerprint,
      records: input.records.map(record => ({ recordCommitment: record.recordCommitment,
        mediaType: record.mediaType, byteLength: record.plaintext.byteLength })),
      linkage: "Selected records link the named source context and instance to the destination context and case.",
    };
  }
  #clearPlaintext(): void {
    this.#input.records.forEach(record => record.plaintext.fill(0));
  }
  #assertActive(): number {
    if (this.#state === "withdrawn") throw new EvidenceDeliveryError("WITHDRAWN", "Disclosure consent was withdrawn.");
    const now = this.#adapters.now();
    assertTime(now);
    if (this.#state === "expired" || now >= this.#input.scope.expiresAt) {
      this.#state = "expired";
      this.#clearPlaintext(); this.#bundle = undefined;
      throw new EvidenceDeliveryError("EXPIRED", "Disclosure consent expired.");
    }
    if (this.#state === "failed") throw new EvidenceDeliveryError("WORKFLOW_FAILED", "This workflow failed. Review a new disclosure preview.");
    return now;
  }
  preview(): EvidenceDisclosurePreview {
    this.#assertActive();
    return structuredClone(this.#preview);
  }
  status(): EvidenceDeliveryStatus {
    if (!["withdrawn", "failed", "expired"].includes(this.#state)
      && this.#adapters.now() >= this.#input.scope.expiresAt) {
      this.#state = "expired"; this.#clearPlaintext(); this.#bundle = undefined;
    }
    return { state: this.#state, channels: { ...this.#channels }, receiptId: this.#receipt?.receiptId ?? null };
  }
  confirm(previewId: string): void {
    this.#assertActive();
    if (previewId !== this.#preview.previewId) throw new EvidenceDeliveryError("PREVIEW_MISMATCH", "Confirm the exact current disclosure preview.");
    if (this.#state !== "awaiting-confirmation") throw new EvidenceDeliveryError("INVALID_STATE", "This disclosure was already confirmed.");
    this.#state = "confirmed";
  }
  withdraw(): void {
    this.#state = "withdrawn";
    this.#clearPlaintext(); this.#bundle = undefined;
  }
  async #verify(receipt: DecisionReceipt, bundle: EncryptedEvidenceBundle, binding: Digest): Promise<void> {
    const now = this.#assertActive();
    assertReceiptWindow(receipt, now);
    try {
      await this.#adapters.verifier.verifyBridgeAuthorization({
        receipt: structuredClone(receipt), manifest: structuredClone(bundle.manifest),
        manifestRoot: bundle.manifestRoot, bindingCommitment: binding, now,
      });
    } catch {
      this.#assertActive();
      throw new EvidenceDeliveryError("AUTHORIZATION_FAILED", "Current bridge authorization could not be verified.");
    }
    assertReceiptWindow(receipt, this.#assertActive());
  }
  async authorize(): Promise<EvidenceDeliveryStatus> {
    this.#assertActive();
    if (this.#state !== "confirmed") {
      throw new EvidenceDeliveryError("INVALID_STATE", this.#state === "awaiting-confirmation"
        ? "Review and confirm the disclosure before encryption and authorization."
        : "Authorization is already in progress or this workflow state cannot be authorized again.");
    }
    this.#state = "preparing";
    let stage = "encryption";
    try {
      const bundle = await encryptSelectedRecords(this.#input.scope, this.#input.records, this.#input.recipient);
      this.#clearPlaintext(); this.#assertActive();
      const payload = await bindBridgeActionIntent(this.#input.intent, bundle.manifest);
      const binding = await bridgeBindingCommitment(bundle.manifest);
      this.#assertActive(); stage = "signature";
      const returned = await this.#adapters.signer.sign(structuredClone(payload));
      const signed: SignedActionIntent = {
        domain: returned.domain, algorithm: returned.algorithm,
        payload: structuredClone(returned.payload), signature: returned.signature,
      };
      this.#assertActive();
      if (!samePayload(signed.payload, payload) || !await this.#adapters.signer.verify(structuredClone(signed))) {
        throw new EvidenceDeliveryError("SIGNATURE_FAILED", "The signer did not sign the exact confirmed disclosure and ciphertext binding.");
      }
      this.#assertActive(); stage = "authorization"; this.#state = "authorizing";
      const receipt = publicReceipt(await this.#adapters.authorization.request({
        intent: structuredClone(signed), bindingCommitment: binding, manifestRoot: bundle.manifestRoot,
        manifest: structuredClone(bundle.manifest),
      }));
      this.#assertActive();
      await this.#verify(receipt, bundle, binding);
      const [receiptId, ciphertextId] = await Promise.all([
        sha256(canonical("permio:receipt-delivery:v1", [binding, receipt.receiptId])),
        sha256(canonical("permio:ciphertext-delivery:v1", [binding, bundle.manifestRoot])),
      ]);
      this.#assertActive();
      this.#bundle = bundle; this.#binding = binding; this.#receipt = receipt;
      this.#receiptDeliveryId = receiptId; this.#ciphertextDeliveryId = ciphertextId;
      this.#state = "authorized";
      return this.status();
    } catch (error) {
      this.#clearPlaintext(); this.#bundle = undefined;
      if (!["withdrawn", "expired"].includes(this.#state)) this.#state = "failed";
      if (error instanceof EvidenceDeliveryError) throw error;
      throw new EvidenceDeliveryError(stage === "signature" ? "SIGNATURE_FAILED" : stage === "authorization" ? "AUTHORIZATION_FAILED" : "ENCRYPTION_FAILED",
        stage === "signature" ? "Disclosure signature failed." : stage === "authorization" ? "Bridge authorization failed." : "Local evidence encryption failed.");
    }
  }
  async deliver(channel: DeliveryChannel): Promise<EvidenceDeliveryStatus> {
    this.#assertActive();
    if (channel !== "receipt" && channel !== "ciphertext") throw new TypeError("Unknown delivery channel");
    if (!this.#bundle || !this.#binding || !this.#receipt || !this.#receiptDeliveryId || !this.#ciphertextDeliveryId
      || !["authorized", "authorization-blocked", "delivered"].includes(this.#state)) {
      throw new EvidenceDeliveryError("AUTHORIZATION_REQUIRED", "Verified bridge authorization is required before delivery.");
    }
    if (this.#channels[channel] === "delivered") return this.status();
    if (this.#channels[channel] === "sending") throw new EvidenceDeliveryError("DELIVERY_IN_PROGRESS", "This channel delivery is already in progress.");
    this.#channels[channel] = "sending";
    const bundle = this.#bundle, binding = this.#binding, receipt = this.#receipt;
    try {
      try { await this.#verify(receipt, bundle, binding); }
      catch (error) {
        if (!["withdrawn", "expired"].includes(this.#state)) this.#state = "authorization-blocked";
        throw error;
      }
      this.#assertActive();
      if (channel === "receipt") {
        await this.#adapters.receiptChannel.deliver({ deliveryId: this.#receiptDeliveryId, receipt: structuredClone(receipt) });
      } else {
        await this.#adapters.ciphertextChannel.deliver({ deliveryId: this.#ciphertextDeliveryId,
          bindingCommitment: binding, bundle: structuredClone(bundle) });
      }
      this.#channels[channel] = "delivered";
      if (!["withdrawn", "expired"].includes(this.#state)) {
        this.#state = this.#channels.receipt === "delivered" && this.#channels.ciphertext === "delivered" ? "delivered" : "authorized";
      }
      return this.status();
    } catch (error) {
      this.#channels[channel] = "failed";
      if (error instanceof EvidenceDeliveryError) throw error;
      throw new EvidenceDeliveryError("DELIVERY_FAILED", "Channel delivery was not acknowledged. Retry uses the same ciphertext and delivery identifier.");
    }
  }
}
export type { EvidenceDelivery };

/** Creates only a local disclosure snapshot; no encryption/signing/network send
 * happens until the caller confirms this exact preview and calls authorize(). */
export async function createEvidenceDelivery(input: EvidenceDeliveryInput, adapters: EvidenceDeliveryAdapters): Promise<EvidenceDelivery> {
  const scope: BridgeScope = {
    sourceContextCommitment: input.scope.sourceContextCommitment, sourceInstanceCommitment: input.scope.sourceInstanceCommitment,
    destinationContextCommitment: input.scope.destinationContextCommitment, destinationCaseCommitment: input.scope.destinationCaseCommitment,
    purpose: input.scope.purpose, permittedUse: input.scope.permittedUse, expiresAt: input.scope.expiresAt, nonce: input.scope.nonce,
  };
  for (const value of [scope.sourceContextCommitment, scope.sourceInstanceCommitment,
    scope.destinationContextCommitment, scope.destinationCaseCommitment, scope.nonce]) assertDigest(value);
  assertText(scope.purpose); assertText(scope.permittedUse); assertTime(scope.expiresAt);
  assertTime(adapters.now());
  if (scope.expiresAt <= adapters.now()) throw new EvidenceDeliveryError("EXPIRED", "Disclosure consent expired.");
  if (!input.records.length || new Set(input.records.map(record => record.recordCommitment)).size !== input.records.length) {
    throw new TypeError("Selected records must be nonempty and unique");
  }
  const records = input.records.map(record => {
    assertDigest(record.recordCommitment); assertText(record.mediaType);
    if (!(record.plaintext instanceof Uint8Array)) throw new TypeError("Selected plaintext must be bytes");
    return { recordCommitment: record.recordCommitment, mediaType: record.mediaType, plaintext: Uint8Array.from(record.plaintext) };
  });
  const recipient: RecipientPublicKey = { algorithm: input.recipient.algorithm, spki: input.recipient.spki, fingerprint: input.recipient.fingerprint };
  try {
    await importRecipientPublicKey(recipient);
    return new EvidenceDelivery({ scope, records, recipient, intent: intentPayload(input.intent) }, adapters);
  } catch (error) {
    records.forEach(record => record.plaintext.fill(0));
    throw error;
  }
}
