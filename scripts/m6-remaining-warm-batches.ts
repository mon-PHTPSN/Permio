import assert from "node:assert/strict";
import { recovery150WarmBatch } from "./m6-recovery150-plan.ts";
import { recovery172WarmBatch } from "./m6-recovery172-plan.ts";

/** Exact approved ordinary-plan rounds; the parent still enforces all 100 caps. */
export function remainingWarmBatch(round: number, planVersion: 2 | 3 | 4 | 5 | 6 = 2) {
  if(planVersion===6)return recovery172WarmBatch(round);
  if(planVersion===5)return recovery150WarmBatch(round);
  assert(Number.isSafeInteger(round) && round >= 1 && round <= 100);
  if (planVersion >= 3) {
    if (round >= 46 && round <= 49) return { first: 46, last: 49, entry: "prepareRuntimeAction" };
    if (round >= 53 && round <= 77) return { first: 53, last: 77,
      entry: planVersion === 4 ? round <= 62 || round >= 65 && round <= 73 ? "updateRuntimeCredentialStatus"
        : round <= 64 ? "manageRuntimeParticipantSlots" : "prepareRuntimeAction"
        : round <= 71 ? "updateRuntimeCredentialStatus" : round <= 73 ? "manageRuntimeParticipantSlots" : "prepareRuntimeAction" };
    if (round >= 81 && round <= 88) return { first: 81, last: 88, entry: "prepareRuntimeAction" };
    return undefined;
  }
  if (round >= 21 && round <= 45) return { first: 21, last: 45,
    entry: round <= 39 ? "updateRuntimeCredentialStatus" : round <= 41 ? "manageRuntimeParticipantSlots" : "prepareRuntimeAction" };
  if (round >= 49 && round <= 56) return { first: 49, last: 56, entry: "prepareRuntimeAction" };
  if (round >= 60 && round <= 88) return { first: 60, last: 88,
    entry: round <= 78 ? "updateRuntimeCredentialStatus" : round <= 80 ? "manageRuntimeParticipantSlots" : "prepareRuntimeAction" };
  return undefined;
}
