import assert from "node:assert/strict";

/** Human-approved 19 October scope. Earlier 62 calls belong to a different run. */
export const REMAINING_NATIVE_CAP = 100;
export const REMAINING_ROOT = "/opt/permio-m6-remaining-preprod-20261019-v1";
export const REMAINING_POSITIVE_BUDGET = Object.freeze({
  deploy: 1,
  governAuthorization: 18,
  beginM4Activation: 2,
  stageM4ActivationBinding: 2,
  finalizeM4Activation: 2,
  allocateRuntimeInstance: 2,
  updateRuntimeCredentialStatus: 39,
  manageRuntimeParticipantSlots: 4,
  prepareRuntimeAction: 20,
  executeRuntimeAction: 2,
  terminateTemplate: 4,
});
export const REMAINING_GOVERNANCE_BUDGET = Object.freeze({
  proposeProofModule: 2, reviewProofModule: 4, governProofModule: 10, submitAuthorityRootApproval: 2,
});
/** Latest explicit approval:150 attempts/four instances. Baseline135 includes failed55. */
export const REMAINING_RECOVERY_POSITIVE_BUDGET = Object.freeze({ ...REMAINING_POSITIVE_BUDGET,
  allocateRuntimeInstance:4, updateRuntimeCredentialStatus:61, manageRuntimeParticipantSlots:6,
  prepareRuntimeAction:28, executeRuntimeAction:3 });
/** Approved172: 157 planned attempts; the15 reserve requires separate reconciliation. */
export const REMAINING_RECOVERY172_POSITIVE_BUDGET = Object.freeze({ ...REMAINING_RECOVERY_POSITIVE_BUDGET,
  allocateRuntimeInstance:5, updateRuntimeCredentialStatus:80, manageRuntimeParticipantSlots:8 });

export class RemainingTestBudget {
  private readonly approvedScope: "original100" | "approved150" | "approved172";
  constructor(approvedScope: "original100" | "approved150" | "approved172" = "original100") { this.approvedScope=approvedScope; }
  private readonly used = new Map<string, number>();
  private readonly governanceUsed = new Map<string, number>();
  private readonly negatives = new Set<string>();
  private contract: string | undefined;
  private reservations = 0;
  private readonly abandoned = new Set<number>();

  /** Only the explicit, expired round51 that stopped before native send may be released. */
  abandonUnsubmittedReservation(input: { reservationId: 51; negativeCase: "independent-competing-transition";
    neverSubmittedVerified: true; originalExpiryPassed: true }): void {
    assert(input.reservationId === 51 && this.reservations === 51 && this.abandoned.size === 0 &&
      input.neverSubmittedVerified === true && input.originalExpiryPassed === true &&
      input.negativeCase === "independent-competing-transition" && this.negatives.has(input.negativeCase),
      "Only the explicitly reconciled unsubmitted expired reservation may be abandoned");
    this.abandoned.add(input.reservationId); this.negatives.delete(input.negativeCase);
  }

  reserve(input: { entry: string; contract: string; governance?: string; negativeCase?: string }): number {
    const nativeCap=this.approvedScope==="approved172"?172:this.approvedScope==="approved150"?150:REMAINING_NATIVE_CAP;
    const positive=this.approvedScope==="approved172"?REMAINING_RECOVERY172_POSITIVE_BUDGET:this.approvedScope==="approved150"?REMAINING_RECOVERY_POSITIVE_BUDGET:REMAINING_POSITIVE_BUDGET;
    assert(this.reservations - this.abandoned.size < nativeCap, "Approved attempt ceiling exhausted");
    assert(/^[0-9a-f]{64}$/u.test(input.contract), "Exact test contract address required");
    assert(input.contract !== "9a5b8e294e61463c5ce5948ba0120479dd69a582e0e7fc5f84c8c9c4197af3bc",
      "Historical 62-call deployment is outside this fresh-deployment scope");
    if (!this.contract) assert(input.entry === "deploy" && !input.negativeCase && !input.governance);
    else assert(input.contract === this.contract && input.entry !== "deploy", "Only the one fresh contract is authorized");
    if (input.negativeCase) {
      assert(/^[a-z][a-z0-9-]{2,63}$/u.test(input.negativeCase) && !this.negatives.has(input.negativeCase) &&
        this.negatives.size < 4 && Object.hasOwn(REMAINING_POSITIVE_BUDGET, input.entry) && input.entry !== "deploy");
      this.negatives.add(input.negativeCase);
    } else {
      const maximum = positive[input.entry as keyof typeof positive];
      assert(maximum && (this.used.get(input.entry) ?? 0) < maximum, "Unapproved or exhausted entry");
      if (input.entry === "governAuthorization") {
        const maximum = REMAINING_GOVERNANCE_BUDGET[input.governance as keyof typeof REMAINING_GOVERNANCE_BUDGET];
        assert(maximum && (this.governanceUsed.get(input.governance!) ?? 0) < maximum,
          "Logical governance operation is unapproved or exhausted");
        this.governanceUsed.set(input.governance!, (this.governanceUsed.get(input.governance!) ?? 0) + 1);
      } else assert(input.governance === undefined);
      this.used.set(input.entry, (this.used.get(input.entry) ?? 0) + 1);
    }
    this.contract ??= input.contract;
    return ++this.reservations;
  }

  evidence() {
    return { nativeCeiling: this.approvedScope==="approved172"?172:this.approvedScope==="approved150"?150:REMAINING_NATIVE_CAP, reservedMaximumAttempts: this.reservations,
      maximumNativeAttemptsReserved: this.reservations - this.abandoned.size, abandonedReservationIds: [...this.abandoned],
      contractAddress: this.contract, perEntry: Object.fromEntries(this.used),
      governance: Object.fromEntries(this.governanceUsed), negativeCases: [...this.negatives], automaticSubmissionRetries: false };
  }
}
