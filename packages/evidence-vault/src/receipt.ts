import type { DecisionReceipt } from "@permio/midnight-authorization";

export function publicReceipt(receipt: DecisionReceipt): DecisionReceipt {
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
