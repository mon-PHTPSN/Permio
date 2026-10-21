import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPrivateKey, createPublicKey } from "node:crypto";
import { restoreCertifiedOrdinarySetup, type AllocationCheckpoint, type CertifiedPrepared } from "./m6-restore-certified-ordinary.ts";
import type { restoreM6GovernanceFixture } from "./run-live-m6-admission.ts";
import type { PreparedOrdinaryAction, runOrdinaryActionWorkflow } from "./m6-ordinary-action-workflow.ts";
import { permioAuthorizationPureCircuits as pure } from "@permio/midnight-authorization";

const bigintFields = new Set(["stateSequence", "statusSequence", "holderSecret", "sessionSecret", "field", "x", "y", "sequence",
  ...[...readFileSync(new URL("../packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.d.ts", import.meta.url), "utf8")
    .matchAll(/\b([A-Za-z][A-Za-z0-9_]*)\s*:\s*bigint\b/gu)].map(value => value[1]!) ]);

/** Recover ABI-typed values only; the SDK's BigInt.toJSON affects old saves. */
export function reviveRemainingCheckpoint(key: string, value: unknown): unknown {
  if (typeof value === "string" && /^\d+$/u.test(value) && bigintFields.has(key)) return BigInt(value);
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>, keys = Object.keys(v);
    if (keys.length === 1 && typeof v.$bigint === "string") return BigInt(v.$bigint);
    if (keys.length === 1 && typeof v.$bytes === "string" && /^(?:[0-9a-f]{2})*$/u.test(v.$bytes))
      return Uint8Array.from(Buffer.from(v.$bytes, "hex"));
    if (keys.length === 2 && v.type === "Buffer" && Array.isArray(v.data) && v.data.every(x => Number.isInteger(x) && x >= 0 && x <= 255))
      return Uint8Array.from(v.data);
  }
  return value;
}

/** Already finalized calls are checked against chain by the caller, never sent here. */
export function restoreRemainingAfter45(m4: ReturnType<typeof restoreM6GovernanceFixture>,
  checkpoints: readonly { stage: string; value: any }[], address: string) {
  assert.equal(address, "70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c");
  const select = (stage: string) => { const matches = checkpoints.filter(value => value.stage === stage); assert(matches.length === 1); return matches[0]!.value; };
  const allocated = { ...select("remaining-instance-allocation"), contractAddress: address } as AllocationCheckpoint & { index: number; rootSequence: bigint };
  assert(allocated.index === 0 && allocated.rootSequence === 1n);
  const prepared = select("ordinary-credentials-prepared") as CertifiedPrepared;
  const finalCall = checkpoints.filter(value => value.stage === "ordinary-credential-call-prepared").at(-1)!.value;
  assert(finalCall.phase === "session-certification" && finalCall.acceptedCredentialTransactions === 18);
  finalCall.arguments[0] = BigInt(finalCall.arguments[0]);
  const restored = restoreCertifiedOrdinarySetup({ m4, allocated, prepared, finalCall: finalCall.arguments });
  const slot = select("ordinary-root-slot-prepared"), initial = select("ordinary-action-prepared"), final = select("ordinary-action-final-prepared");
  slot.arguments[0] = BigInt(slot.arguments[0]); initial.prepareArguments[0] = BigInt(initial.prepareArguments[0]);
  assert.equal(slot.arguments[0], 1n); assert.equal(initial.prepareArguments[0], 1n);
  // Session/intent signature nonces are freshly sampled by finalArguments().
  // The caller verifies the final signatures with the real generated circuit.
  for (const index of [0, 1, 2, 3, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20])
    assert.deepEqual(initial.finalArguments[index], final.arguments[index]);
  assert.deepEqual(initial.expectedNextState, final.expectedNextState);
  const cleanup = [...initial.prepareArguments]; cleanup[0] = 4n; cleanup[10] = final.arguments[13];
  assert.deepEqual(cleanup[1], final.arguments[0]); assert.deepEqual(cleanup[6], final.currentState);
  assert.equal(final.sequence, 4n); assert.equal(final.arguments[0].authorityRootSequence, 1n);
  const hex = (value: Uint8Array) => Buffer.from(value).toString("hex");
  const firstCandidate: PreparedOrdinaryAction = { arguments: final.arguments, preparationArguments: cleanup as unknown as PreparedOrdinaryAction["preparationArguments"],
    expectedNextState: final.expectedNextState, signedIntent: final.signedIntent,
    privateSentinels: [final.signedIntent.payload.nonce, hex(final.arguments[20]),
      ...initial.evidence.inputs.concat(initial.evidence.outputs).flatMap((row: any) => [hex(row.selected.nonce), hex(row.selected.payloadCommitment)])] };
  assert.deepEqual(pure.runtimeStateCommitment(firstCandidate.arguments[9]), firstCandidate.arguments[0].stateCommitment);
  const resumePrepared: NonNullable<Parameters<typeof runOrdinaryActionWorkflow>[0]["resumePrepared"]> = {
    source: slot.source, slotArguments: slot.arguments, firstCandidate };
  const privateSentinels = [hex(allocated.stateOpening.nonce), hex(allocated.allocation.allocationNonce), hex(slot.arguments[5]),
    hex(firstCandidate.arguments[9].stateIdHash), hex(firstCandidate.arguments[9].nonce),
    prepared.accountPrivateKeyPem, prepared.sessionPrivateKeyPem];
  for (const pem of [prepared.accountPrivateKeyPem, prepared.sessionPrivateKeyPem]) {
    const key = createPrivateKey(pem);
    privateSentinels.push(key.export({ type: "pkcs8", format: "der" }).toString("hex"),
      createPublicKey(key).export({ type: "spki", format: "der" }).toString("hex"));
  }
  for (const saved of checkpoints.filter(value => value.stage === "ordinary-credential-call-prepared")) {
    const binding = saved.value.arguments[17]; privateSentinels.push(hex(binding.state.nonce), hex(binding.nextStateNonce));
  }
  return { ...restored, m4, allocated, resumePrepared, privateSentinels };
}

export type RestoredRemainingAfter45 = ReturnType<typeof restoreRemainingAfter45>;
