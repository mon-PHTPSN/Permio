import type { PreprodSubmissionFailure } from "../packages/midnight-authorization/src/preprod-submission-failure.ts";
import assert from "node:assert/strict";
import { ContractCall } from "@midnight-ntwrk/midnight-js-protocol/ledger";

/** Balancing adds a fee intent; locate the actual call rather than assuming one intent. */
export function findM6SingleFallibleContractSegment(transaction: {
  intents?: ReadonlyMap<number, { actions: readonly unknown[] }>;
}, expectedContract: string) {
  const actions = [...(transaction.intents ?? [])].flatMap(([segmentId, intent]) =>
    intent.actions.map(action => ({ segmentId, action })));
  assert(actions.length === 1 && actions[0]!.action instanceof ContractCall);
  const { segmentId, action: call } = actions[0]!;
  assert(call instanceof ContractCall && call.address === expectedContract && !call.guaranteedTranscript && call.fallibleTranscript);
  return { segmentId, call };
}

/** Timeouts, fee failures and the earlier weight error cannot pass an auth test. */
export function isAuthCompatibleValidationRejection(validation: {
  accepted: boolean; rejection?: string; customCode?: number;
}): boolean {
  if (validation.accepted || !validation.rejection || ["payment", "exhaustsResources", "future",
    "ancientBirthBlock", "insufficient-weight-headroom", "runtime-validation-error"].includes(validation.rejection) ||
    validation.customCode === 170) return false;
  return true;
}

/** Pool preflight is distinct from the eventual contract-segment outcome. */
export function canAttemptM6NegativeSubmission(validation: Parameters<typeof isAuthCompatibleValidationRejection>[0]): boolean {
  return validation.accepted || isAuthCompatibleValidationRejection(validation);
}

/** An included negative is a failed application, never a successful action. */
export function isDefiniteIncludedM6ActionFailure(input: {
  status: string; exactBoundBytesMatched: boolean; intendedSegmentId: number;
  segmentStatusMap?: ReadonlyMap<number, string>;
  contractStateSha256Before: string; contractStateSha256After: string;
  contractCallHasGuaranteedTranscript: boolean; contractCallHasFallibleTranscript: boolean;
}): boolean {
  return input.status === "FailFallible" && input.exactBoundBytesMatched &&
    Number.isSafeInteger(input.intendedSegmentId) && input.intendedSegmentId > 0 &&
    input.segmentStatusMap?.get(input.intendedSegmentId) === "SegmentFail" &&
    !input.contractCallHasGuaranteedTranscript && input.contractCallHasFallibleTranscript &&
    /^[0-9a-f]{64}$/u.test(input.contractStateSha256Before) &&
    input.contractStateSha256Before === input.contractStateSha256After;
}

export function isDefiniteNativeAuthRejection(validation: Parameters<typeof isAuthCompatibleValidationRejection>[0],
  diagnostic: PreprodSubmissionFailure | undefined): boolean {
  if (!isAuthCompatibleValidationRejection(validation) || !diagnostic || diagnostic.customCode === 170) return false;
  return diagnostic.category === "transaction-invalid" || diagnostic.rpcCode === 1010 && diagnostic.customCode !== undefined;
}
