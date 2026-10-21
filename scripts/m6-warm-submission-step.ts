import assert from "node:assert/strict";
import { submitOnceAndReconcile } from "./m6-submit-once-reconcile.ts";

/** One submission plus exact reads; never retains an ambiguously closed node client. */
export async function submitM6WarmStep(input: Parameters<typeof submitOnceAndReconcile>[0]) {
  let reconciled = false;
  const transactionId = await submitOnceAndReconcile({ ...input, observe(value) {
    if (value.phase === "submission-reconciled-read-only") reconciled = true;
    input.observe(value);
  } });
  const final = await input.readFinal(transactionId);
  assert(final.status === "SucceedEntirely" && final.identifiers.includes(transactionId) &&
    Buffer.from(final.tx.serialize()).equals(Buffer.from(input.transaction.serialize())) && final.blockHeight > 0);
  return { transactionId, ledgerSequence: final.blockHeight, closeWalletBeforeNextCall: reconciled,
    exactReadOnlyReconciliationUsed: reconciled };
}
