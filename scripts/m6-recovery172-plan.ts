import assert from "node:assert/strict";
import { recovery150Step } from "./m6-recovery150-plan.ts";

/** Approved fifth instance, after the independently verified authority115 boundary. */
export function recovery172Step(round: number): { entry: string; governance?: string; negativeCase?: string } {
  assert(Number.isSafeInteger(round) && round >= 56 && round <= 158);
  if (round <= 116) return recovery150Step(round);
  if (round === 117) return { entry: "allocateRuntimeInstance" };
  if (round >= 118 && round <= 127 || round >= 130 && round <= 138 || round === 149)
    return { entry: "updateRuntimeCredentialStatus" };
  if (round === 128 || round === 129) return { entry: "manageRuntimeParticipantSlots" };
  if (round >= 139 && round <= 146) return { entry: "prepareRuntimeAction" };
  if (round === 147) return { entry: "executeRuntimeAction" };
  if (round === 148 || round === 150) return { entry: "executeRuntimeAction", negativeCase:
    round === 148 ? "scoped-action-replay-after-cold-reconnect" : "stale-credential-status-root" };
  if (round <= 154) return { entry: "terminateTemplate" };
  return { entry: "governAuthorization", governance: "governProofModule" };
}

export function recovery172WarmBatch(round: number) {
  assert(Number.isSafeInteger(round) && round >= 1 && round <= 173);
  if (round < 118 || round > 146) return undefined;
  const step = recovery172Step(round);
  assert(!step.negativeCase && !step.governance);
  return { first: 118, last: 146, entry: step.entry };
}
