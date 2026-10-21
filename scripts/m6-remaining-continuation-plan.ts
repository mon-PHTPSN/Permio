import assert from "node:assert/strict";

/** Exact continuation schedule. The aggregate budget independently checks caps. */
export function remainingContinuationStep(round: number): { entry: string; governance?: string; negativeCase?: string } {
  assert(Number.isSafeInteger(round) && round >= 46 && round <= 100);
  if (round <= 49 || round >= 74 && round <= 77 || round >= 81 && round <= 88)
    return { entry: "prepareRuntimeAction" };
  if (round === 50 || round === 89) return { entry: "executeRuntimeAction" };
  if (round === 52) return { entry: "allocateRuntimeInstance" };
  if (round >= 53 && round <= 62 || round >= 65 && round <= 73 || round === 91) return { entry: "updateRuntimeCredentialStatus" };
  if (round === 63 || round === 64) return { entry: "manageRuntimeParticipantSlots" };
  if (round === 78 || round === 79) return { entry: "governAuthorization", governance: "submitAuthorityRootApproval" };
  if (round >= 93 && round <= 96) return { entry: "terminateTemplate" };
  if (round >= 97) return { entry: "governAuthorization", governance: "governProofModule" };
  const negativeCase = ({ 51: "independent-competing-transition", 80: "stale-authority-root",
    90: "scoped-action-replay-after-cold-reconnect", 92: "stale-credential-status-root" } as Record<number, string>)[round];
  assert(negativeCase); return { entry: "executeRuntimeAction", negativeCase };
}
