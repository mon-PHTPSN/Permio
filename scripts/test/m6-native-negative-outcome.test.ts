import assert from "node:assert/strict";
import { it } from "node:test";
import { canAttemptM6NegativeSubmission, isDefiniteNativeAuthRejection, isDefiniteIncludedM6ActionFailure, findM6SingleFallibleContractSegment } from "../m6-native-negative-outcome.ts";
import { FailFallible, SegmentFail, SegmentSuccess, SucceedEntirely } from "@midnight-ntwrk/midnight-js-types";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";

it("finds the real call segment in a genuine balanced transaction containing a separate fee intent", () => {
  const raw=readFileSync(new URL("./fixtures/m6-public-stateful-transaction-v1.bin",import.meta.url));
  assert.equal(createHash("sha256").update(raw).digest("hex"),"5124cd02bdeeea756bddda4e3f084153db9bbd28655e6e425b89e64cb2a1e310");
  setNetworkId("preprod");const tx=Transaction.deserialize("signature","proof","binding",raw);
  const contract="70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c";
  assert.equal(tx.intents?.size,2);
  const selected=findM6SingleFallibleContractSegment(tx,contract);
  assert.equal(selected.segmentId,18649);assert(selected.call.fallibleTranscript&&!selected.call.guaranteedTranscript);
  assert.throws(()=>findM6SingleFallibleContractSegment(tx,"00".repeat(32)));
  assert.throws(()=>findM6SingleFallibleContractSegment({intents:new Map()},contract));
  assert.throws(()=>findM6SingleFallibleContractSegment({intents:new Map([[1,{actions:[selected.call,selected.call]}]])},contract));
});

it("does not require pool rejection before the single authorized fallible-action negative submission", () => {
  assert(canAttemptM6NegativeSubmission({ accepted: true }));
  assert(canAttemptM6NegativeSubmission({ accepted: false, rejection: "custom", customCode: 132 }));
  assert(!canAttemptM6NegativeSubmission({ accepted: false, rejection: "custom", customCode: 170 }));
  assert(!canAttemptM6NegativeSubmission({ accepted: false, rejection: "payment" }));
  assert(!isDefiniteNativeAuthRejection({ accepted: true }, { category: "transaction-invalid" }));
});

it("requires exact failed segment and unchanged whole contract state for an included negative", () => {
  const failed = { status: FailFallible, exactBoundBytesMatched: true, intendedSegmentId: 1,
    segmentStatusMap: new Map([[1, SegmentFail]]), contractStateSha256Before: "a".repeat(64),
    contractStateSha256After: "a".repeat(64), contractCallHasGuaranteedTranscript: false, contractCallHasFallibleTranscript: true };
  assert(isDefiniteIncludedM6ActionFailure(failed));
  for (const status of [SucceedEntirely, "FailEntirely", "unknown", "timeout"])
    assert(!isDefiniteIncludedM6ActionFailure({ ...failed, status }));
  assert(!isDefiniteIncludedM6ActionFailure({ ...failed, exactBoundBytesMatched: false }));
  assert(!isDefiniteIncludedM6ActionFailure({ ...failed, segmentStatusMap: undefined }));
  assert(!isDefiniteIncludedM6ActionFailure({ ...failed, segmentStatusMap: new Map([[2, SegmentFail]]) }));
  assert(!isDefiniteIncludedM6ActionFailure({ ...failed, segmentStatusMap: new Map([[1, SegmentSuccess]]) }));
  assert(!isDefiniteIncludedM6ActionFailure({ ...failed, contractStateSha256After: "b".repeat(64) }));
  assert(!isDefiniteIncludedM6ActionFailure({ ...failed, contractCallHasGuaranteedTranscript: true }));
  assert(!isDefiniteIncludedM6ActionFailure({ ...failed, contractCallHasFallibleTranscript: false }));
  assert(!isDefiniteIncludedM6ActionFailure({ ...failed, contractStateSha256Before: "", contractStateSha256After: "" }));
});

it("only a definite native invalid response paired with an auth-compatible validation can complete a negative attempt", () => {
  const invalid = { category: "transaction-invalid" as const };
  assert(isDefiniteNativeAuthRejection({ accepted: false, rejection: "custom", customCode: 132 }, invalid));
  assert(isDefiniteNativeAuthRejection({ accepted: false, rejection: "custom", customCode: 132 },
    { category: "node-submission-error", rpcCode: 1010, customCode: 132 }));
  for (const category of ["unknown", "node-connection-failed", "finality-timeout", "request-timeout", "transaction-dropped"] as const)
    assert(!isDefiniteNativeAuthRejection({ accepted: false, rejection: "custom", customCode: 132 }, { category }));
  for (const rejection of ["payment", "future", "exhaustsResources", "runtime-validation-error"])
    assert(!isDefiniteNativeAuthRejection({ accepted: false, rejection }, invalid));
  assert(!isDefiniteNativeAuthRejection({ accepted: true }, invalid));
  assert(!isDefiniteNativeAuthRejection({ accepted: false, rejection: "custom", customCode: 170 }, invalid));
  assert(!isDefiniteNativeAuthRejection({ accepted: false, rejection: "custom", customCode: 132 },
    { category: "transaction-invalid", customCode: 170 }));
});
