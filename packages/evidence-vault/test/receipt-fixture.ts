import type { DecisionReceipt } from "@permio/midnight-authorization";

/** Exact M6 v1 shape, synthetic values. No source/finality/proof assertion. */
const digest = `0x${"ab".repeat(32)}` as const;
export const syntheticReceipt: DecisionReceipt = {
  receiptVersion: 1, receiptId: digest, proofModuleId: digest, proofModuleVersion: "1.0.0",
  implementationHash: digest, namespaceHash: digest, templateIdHash: digest,
  semanticVersion: "1.0.0", templateContentHash: digest, instanceCommitment: digest,
  previousStateCommitment: null, nextStateCommitment: null, transitionSequence: null,
  contextHash: digest, actionSchemaId: digest, purposeHash: digest, recipient: digest,
  validAfter: "0", validBefore: "2000", scopedNullifier: digest, outputCommitment: digest,
  sourceNetwork: "undeployed", sourceContract: digest, sourceTransaction: `00${"cd".repeat(32)}`,
  sourceLedgerSequence: "1",
};
