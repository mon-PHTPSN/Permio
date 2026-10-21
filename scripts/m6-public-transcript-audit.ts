import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { createHash } from "node:crypto";
import { ChargedState, StateValue, QueryContext, type ContractCall, type LedgerParameters } from "@midnight-ntwrk/midnight-js-protocol/ledger";

/** In-memory counterfactual only; never serializes or submits a transaction. */
export function restoreM6StatusBranchForCounterfactualAudit(
  current: Parameters<typeof StateValue.decode>[0], previous: Parameters<typeof StateValue.decode>[0],
) {
  const source = StateValue.decode(previous).asArray()?.[1]?.asArray()?.[4];
  assert(source && source.asMap());
  const replace = (node: StateValue, route: readonly number[]): StateValue => {
    if (!route.length) return source;
    const array = node.asArray(); assert(array?.[route[0]!]);
    return array.reduce((result, child, index) => result.arrayPush(index === route[0]
      ? replace(child, route.slice(1)) : child), StateValue.newArray());
  };
  return replace(StateValue.decode(current), [1, 4]).encode();
}

/** Same public VM execution boundary as ledger apply_actions; excludes fee/proof validation. */
export function auditM6PublicCallReadSet(input: {
  call: Pick<ContractCall<never>, "address" | "guaranteedTranscript" | "fallibleTranscript">;
  encodedState: Parameters<typeof StateValue.decode>[0]; parameters: LedgerParameters; clockSeconds: bigint;
}) {
  assert(/^[0-9a-f]{64}$/u.test(input.call.address) && input.clockSeconds > 0n);
  let state = new ChargedState(StateValue.decode(input.encodedState));
  let partitions = 0;
  try {
    for (const transcript of [input.call.guaranteedTranscript, input.call.fallibleTranscript]) {
      if (!transcript) continue;
      // These M6 entries do not move coins or rely on caller balances.
      assert.equal(transcript.effects.unshieldedInputs.size, 0);
      assert.equal(transcript.effects.unshieldedOutputs.size, 0);
      const context = new QueryContext(state, input.call.address);
      context.block = { ...context.block, secondsSinceEpoch: input.clockSeconds,
        secondsSinceEpochErr: 0, lastBlockTime: input.clockSeconds - 1n };
      const result = context.runTranscript(transcript, input.parameters.transactionCostModel.runtimeCostModel);
      assert(isDeepStrictEqual(result.effects, transcript.effects), "Public transcript effects differ");
      state = result.state; partitions++;
    }
    assert(partitions > 0);
    const encoded = JSON.stringify(state.state.encode(), (_, value) => typeof value === "bigint" ? String(value)
      : value instanceof Uint8Array ? Buffer.from(value).toString("hex") : value);
    return { accepted: true as const, partitions, outputStateObservationSha256: createHash("sha256").update(encoded).digest("hex"),
      boundary: "public-vm-readset-not-native-transaction-validation" as const, clockHeldInsideSignedWindow: true };
  } catch (error) {
    return { accepted: false as const, completedPartitions: partitions,
      errorType: error instanceof Error ? error.name : "unknown",
      boundary: "public-vm-readset-not-native-transaction-validation" as const,
      privateValuesLogged: false };
  }
}
