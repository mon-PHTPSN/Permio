import assert from "node:assert/strict";
export const FRESH_INSTANCE_CONTRACT = "9a5b8e294e61463c5ce5948ba0120479dd69a582e0e7fc5f84c8c9c4197af3bc";
/** Exact additional scope approved by the human: rounds 33 through 62. */
export function freshInstanceEntry(round: number): string {
  assert(Number.isInteger(round) && round >= 33 && round <= 62);
  if (round === 33) return "allocateRuntimeInstance";
  if (round <= 52) return "updateRuntimeCredentialStatus";
  if (round <= 54) return "manageRuntimeParticipantSlots";
  if (round <= 58) return "prepareRuntimeAction";
  if (round === 59) return "executeRuntimeAction";
  if (round <= 61) return "terminateTemplate";
  return "governAuthorization";
}
