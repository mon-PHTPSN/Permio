import assert from "node:assert/strict";
import { it } from "node:test";
import { assertPersistedLocalState, runLocalRecoveryDrill, type LocalRecoveryOperations } from "../m6-local-recovery.ts";

const snapshot = { contractAddress: "a".repeat(64), transactionId: "00" + "b".repeat(64),
  contractStateSha256: "c".repeat(64), publicTransactionSha256: "d".repeat(64), finalizedHeight: 100 };

it("recovery requires the same exact state and transaction without finalized-chain regression", () => {
  assert.doesNotThrow(() => assertPersistedLocalState(snapshot, { ...snapshot, finalizedHeight: 101 }));
  for (const field of ["contractAddress", "transactionId", "contractStateSha256", "publicTransactionSha256"] as const) {
    assert.throws(() => assertPersistedLocalState(snapshot, { ...snapshot, [field]: "altered" }));
  }
  for (const finalizedHeight of [99, NaN, Infinity, 100.5]) {
    assert.throws(() => assertPersistedLocalState(snapshot, { ...snapshot, finalizedHeight }));
  }
});

it("an ambiguous stop or failed outage check always restarts the exact affected service", async () => {
  for (const failure of ["stop", "outage", "start"] as const) {
    const started: string[] = [];
    let starts = 0;
    const ops: LocalRecoveryOperations = { snapshot: async () => snapshot, checkpoint: async () => {},
      stop: async () => { if (failure === "stop") throw Error("ambiguous stop"); },
      assertUnavailable: async () => { if (failure === "outage") throw Error("outage not verified"); },
      startAndWait: async target => { started.push(target); if (failure === "start" && ++starts === 1) throw Error("not yet healthy"); },
    };
    await assert.rejects(runLocalRecoveryDrill(ops));
    assert.deepEqual(started, Array(failure === "start" ? 2 : 1).fill("midnight-indexer"));
  }
});

it("changed persisted state fails after restoration and never advances to the node interruption", async () => {
  let reads = 0; const stopped: string[] = [], started: string[] = [];
  await assert.rejects(runLocalRecoveryDrill({ checkpoint: async () => {},
    snapshot: async () => ++reads === 1 ? snapshot : { ...snapshot, contractStateSha256: "changed" },
    stop: async target => { stopped.push(target); }, assertUnavailable: async () => {},
    startAndWait: async target => { started.push(target); },
  }));
  assert.deepEqual(stopped, ["midnight-indexer"]); assert.deepEqual(started, stopped);
});
