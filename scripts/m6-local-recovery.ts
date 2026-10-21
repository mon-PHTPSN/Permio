import assert from "node:assert/strict";

export type RecoveryTarget = "midnight-indexer" | "midnight-node";
export interface LocalRecoverySnapshot {
  readonly contractAddress: string;
  readonly transactionId: string;
  readonly contractStateSha256: string;
  readonly publicTransactionSha256: string;
  readonly finalizedHeight: number;
}

export function assertPersistedLocalState(before: LocalRecoverySnapshot, after: LocalRecoverySnapshot): void {
  for (const field of ["contractAddress", "transactionId", "contractStateSha256", "publicTransactionSha256"] as const) {
    assert.equal(after[field], before[field], `Local recovery changed ${field}`);
  }
  assert(Number.isSafeInteger(after.finalizedHeight) && after.finalizedHeight >= before.finalizedHeight,
    "Local finalized chain regressed");
}

export interface LocalRecoveryOperations {
  snapshot(): Promise<LocalRecoverySnapshot>;
  stop(target: RecoveryTarget): Promise<void>;
  assertUnavailable(target: RecoveryTarget): Promise<void>;
  startAndWait(target: RecoveryTarget): Promise<void>;
  checkpoint(stage: string, target: RecoveryTarget): Promise<void>;
}

/** A failed stop acknowledgement can still mean the stop applied. Recover in finally. */
export async function runLocalRecoveryDrill(ops: LocalRecoveryOperations) {
  const before = await ops.snapshot();
  const observations: { target: RecoveryTarget; snapshot: LocalRecoverySnapshot }[] = [];
  for (const target of ["midnight-indexer", "midnight-node"] as const) {
    await ops.checkpoint("before-stop", target);
    let needsRecovery = true;
    try {
      await ops.stop(target);
      await ops.assertUnavailable(target);
      await ops.checkpoint("outage-verified", target);
      await ops.startAndWait(target);
      needsRecovery = false;
      const snapshot = await ops.snapshot();
      assertPersistedLocalState(before, snapshot);
      observations.push({ target, snapshot });
      await ops.checkpoint("reconnected-and-state-verified", target);
    } finally {
      if (needsRecovery) await ops.startAndWait(target);
    }
  }
  return { before, observations };
}
