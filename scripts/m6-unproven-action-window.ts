import assert from "node:assert/strict";
import type { UnprovenTransaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";

/** Recheck after cold wallet startup; expiry must not mask a native auth test. */
export function assertM6SubmissionTimeMargin(transaction: { readonly intents: ReadonlyMap<number, { readonly ttl: Date }> | undefined },
  minimumMs: number, now = Date.now()) {
  assert(Number.isSafeInteger(now) && now >= 0 && Number.isSafeInteger(minimumMs) && minimumMs >= 60_000);
  const intents = [...(transaction.intents?.values() ?? [])];
  assert(intents.length > 0 && intents.every(intent => Number.isSafeInteger(intent.ttl.getTime()) && intent.ttl.getTime() > now + minimumMs),
    "Proved transaction expiry is too close for an attributable submission");
}

/** The pinned ledger renders this public parameter but exposes no TS getter. */
export function readM6LedgerTtlSeconds(parameters: { toString(compact?: boolean): string }) {
  const match = /\bglobal_ttl:\s*Duration\(\s*([0-9]+),?\s*\)/u.exec(parameters.toString(false));
  assert(match, "Current ledger transaction-lifetime parameter must be readable");
  const seconds = Number(match[1]); assert(Number.isSafeInteger(seconds) && seconds > 0);
  return seconds;
}

/** Change only an unproven intent. Proofs and bindings commit to this window. */
export function setUnprovenActionWindow(transaction: UnprovenTransaction,
  signedValidBefore: bigint, now = Date.now()) {
  assert(Number.isSafeInteger(now) && now >= 0);
  assert(signedValidBefore > BigInt(Math.floor(now / 1000)) && signedValidBefore < BigInt(Math.floor(Number.MAX_SAFE_INTEGER / 1000)));
  // The ledger stores time at whole-second precision. Round down before
  // assigning so its detached intent getter returns the exact chosen deadline.
  const expires = Math.floor(Math.min(Number(signedValidBefore) * 1000, now + 3 * 60 * 60 * 1000) / 1000) * 1000;
  assert(expires > now + 60 * 60 * 1000, "Competing proofs require more than one hour of signed validity");
  const intents = transaction.intents;
  assert(intents && intents.size === 1, "Only the exact single-action transaction is supported");
  for (const intent of intents.values()) intent.ttl = new Date(expires);
  // The ledger getter returns detached objects; persist the changed intent.
  transaction.intents = intents;
  assert([...transaction.intents!.values()].every(intent => intent.ttl.getTime() === expires));
  return { expiresAtUtc: new Date(expires).toISOString(), boundedBySignedWindow: true as const,
    changedBeforeProof: true as const };
}
