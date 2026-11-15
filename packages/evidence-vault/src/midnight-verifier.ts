import { isDeepStrictEqual } from "node:util";
import { readFinalizedDecisionReceipt, type DecisionReceipt, type DecisionReceiptSourceReader } from "@permio/midnight-authorization";
import { runtimeEvidenceBridgeOutputCommitment, runtimeEvidenceBridgeRecipientHash } from "@permio/midnight-authorization/evidence-bridge";
import { assertDigest, assertTime, canonical, hex, sha256, unhex, type Digest } from "./crypto.ts";
import { bridgeBindingCommitment, createEvidenceBridgeOpening, selectedRecordManifestRoot,
  type BridgeReceiptVerifier, type SelectedRecordManifest } from "./evidence.ts";
import { publicReceipt } from "./receipt.ts";

export interface EvidenceBridgeDeployment {
  readonly network: "preprod" | "undeployed";
  readonly contract: Digest;
  readonly proofModuleVersion: "1.0.0";
  readonly implementationHash: Digest;
  readonly namespaceHash: Digest;
  readonly templateIdHash: Digest;
  readonly semanticVersion: string;
  readonly templateContentHash: Digest;
  readonly actionSchemaId: Digest;
  readonly outputTypeHash: Digest;
}
export interface FinalizedEvidenceBridgeVerifierOptions {
  readonly deployment: EvidenceBridgeDeployment;
  /** Trusted host factory. Use the pinned evidence-bridge indexed reader, which
   * reconciles executeRuntimeEvidenceBridge and its exact receipt insertion.
   * Caller-supplied JSON or an ordinary-action reader is not a source adapter. */
  readonly sourceReader: (request: { readonly transactionId: string; readonly receiptId: Digest }) => DecisionReceiptSourceReader;
  /** Mandatory authenticated current-status check. Receipt v1 proves the decision
   * at execution, not that private credentials remain unrevoked at retrieval. */
  readonly assertCurrentAuthorization: (request: {
    readonly receipt: DecisionReceipt; readonly bindingCommitment: Digest;
    readonly manifest: SelectedRecordManifest; readonly now: number;
  }) => Promise<void>;
}
const digest = (value: Uint8Array): Digest => `0x${hex(value)}`;

/** Node-only concrete receipt/binding verifier. It sends neither ciphertext nor
 * plaintext to its source adapter, and supplies no permissive status default. */
export function createFinalizedEvidenceBridgeVerifier(options: FinalizedEvidenceBridgeVerifierOptions): BridgeReceiptVerifier {
  const deployment = Object.freeze(structuredClone(options.deployment));
  for (const value of [deployment.contract, deployment.implementationHash, deployment.namespaceHash, deployment.templateIdHash,
    deployment.templateContentHash, deployment.actionSchemaId, deployment.outputTypeHash]) assertDigest(value);
  if (!["preprod", "undeployed"].includes(deployment.network) || deployment.proofModuleVersion !== "1.0.0" ||
    !/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(deployment.semanticVersion) ||
    typeof options.sourceReader !== "function" || typeof options.assertCurrentAuthorization !== "function") {
    throw new TypeError("Invalid evidence bridge deployment");
  }
  const sourceReader = options.sourceReader, assertCurrentAuthorization = options.assertCurrentAuthorization;
  return { async verifyBridgeAuthorization(input) {
    const request = structuredClone(input);
    assertTime(request.now); assertDigest(request.bindingCommitment); assertDigest(request.manifestRoot);
    if (request.now >= request.manifest.expiresAt ||
      request.manifestRoot !== await selectedRecordManifestRoot(request.manifest) ||
      request.bindingCommitment !== await bridgeBindingCommitment(request.manifest)) throw Error("Evidence bridge binding mismatch");
    const expected = publicReceipt(request.receipt);
    const receipt = await readFinalizedDecisionReceipt(sourceReader({ transactionId: expected.sourceTransaction, receiptId: expected.receiptId }),
      { network: deployment.network, contract: deployment.contract, transactionId: expected.sourceTransaction, receiptId: expected.receiptId });
    if (!isDeepStrictEqual(receipt, expected)) throw Error("Evidence bridge receipt substitution");
    const opening = await createEvidenceBridgeOpening(request.manifest);
    const moduleId = await sha256(canonical("permio:proof-module-id:v1", ["cross-context-evidence-bridge"]));
    if (receipt.proofModuleId !== moduleId || receipt.proofModuleVersion !== deployment.proofModuleVersion ||
      receipt.implementationHash !== deployment.implementationHash || receipt.namespaceHash !== deployment.namespaceHash ||
      receipt.templateIdHash !== deployment.templateIdHash || receipt.semanticVersion !== deployment.semanticVersion ||
      receipt.templateContentHash !== deployment.templateContentHash || receipt.actionSchemaId !== deployment.actionSchemaId ||
      receipt.contextHash !== request.manifest.sourceContextCommitment || receipt.instanceCommitment !== request.manifest.sourceInstanceCommitment ||
      receipt.purposeHash !== digest(opening.purposeHash) || receipt.recipient !== digest(runtimeEvidenceBridgeRecipientHash(opening.recipientKeyFingerprint)) ||
      receipt.previousStateCommitment !== null || receipt.nextStateCommitment !== null || receipt.transitionSequence !== null ||
      BigInt(receipt.validAfter) > BigInt(request.now) || BigInt(receipt.validBefore) <= BigInt(request.now) ||
      BigInt(receipt.validBefore) > opening.expiresAt ||
      receipt.outputCommitment !== digest(runtimeEvidenceBridgeOutputCommitment(opening, unhex(deployment.outputTypeHash.slice(2))))) {
      throw Error("Receipt does not authorize this exact evidence bridge");
    }
    await assertCurrentAuthorization({ receipt, bindingCommitment: request.bindingCommitment, manifest: request.manifest, now: request.now });
  } };
}
