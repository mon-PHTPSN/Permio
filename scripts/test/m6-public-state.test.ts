import assert from "node:assert/strict";
import { it } from "node:test";
import { parsePublicStateArguments, expectedInstanceStateEvidence } from "../verify-live-m6-public-state.ts";

it("public state reader requires one explicit worktree public log and labels final assertions", () => {
  const logFile = "logs/m6-live-2026-10-13T21-03-09.941Z.jsonl";
  assert.deepEqual(parsePublicStateArguments([logFile]), { logFile, final: false, slotState: false, allocationOnly: false, observeOnly: false });
  assert.deepEqual(parsePublicStateArguments([logFile, "--final"]), { logFile, final: true, slotState: false, allocationOnly: false, observeOnly: false });
  assert.deepEqual(parsePublicStateArguments([logFile, "--slot-state", "--final"]), { logFile, final: true, slotState: true, allocationOnly: false, observeOnly: false });
  assert.deepEqual(parsePublicStateArguments([logFile, "--allocation-only", "--final"]),
    { logFile, final: true, slotState: false, allocationOnly: true, observeOnly: false });
});

it("partial observation is explicit and cannot disable final or complete-workflow assertions", () => {
  const logFile = 'logs/m6-live-2026-10-15T00-00-00.000Z.jsonl';
  assert.deepEqual(parsePublicStateArguments([logFile, '--observe-only']),
    { logFile, final: false, slotState: false, allocationOnly: false, observeOnly: true });
  for (const option of ['--final', '--slot-state', '--allocation-only', '--observe-only']) {
    assert.throws(() => parsePublicStateArguments([logFile, '--observe-only', option]), /usage/);
  }
});

it("public state reader rejects traversal, arbitrary private files and unsupported options before IO", () => {
  const log = "logs/m6-live-2026-10-13T21-03-09.941Z.jsonl";
  for (const args of [[], ["../accounts.example.json"], ["/tmp/secret"], ["logs/../secret.json"],
    ["logs/accounts.json"], [log, log], [log, "--final", "--final"], [log, "--force"],
    [log, "--slot-state", "--slot-state"], [log, "--slot-state", "--allocation-only"],
    ["logs/m6-live-arbitrary.jsonl"]]) {
    assert.throws(() => parsePublicStateArguments(args), /usage/);
  }
});

it("v8 public expectations count credential mutations without relabeling old slot evidence", () => {
  const currentStateCommitment = "ab".repeat(32);
  const old = { event: "slot-state-workflow-verified", stateSequence: 4, consumedSlotCommandNonces: 4, currentStateCommitment };
  const current = { ...old, stateSequence: 5 };
  assert.deepEqual(expectedInstanceStateEvidence([old], {}, true, true), { sequence: 4n, commitment: currentStateCommitment });
  assert.deepEqual(expectedInstanceStateEvidence([current], { contractTag: "permio-authorization-v8" }, true, true),
    { sequence: 5n, commitment: currentStateCommitment });
  assert.throws(() => expectedInstanceStateEvidence([old], { contractTag: "permio-authorization-v8" }, true, true), /completion event/);
  assert.throws(() => expectedInstanceStateEvidence([current], {}, true, true), /completion event/);
});

it("v8 credential-state completion requires exact count and commitment without fabricating an allocation-only result", () => {
  const tag = { contractTag: "permio-authorization-v8" };
  const currentStateCommitment = "cd".repeat(32);
  const event = { event: "allocated-credential-and-session-regression-verified", instanceStateSequence: 5, currentStateCommitment };
  assert.deepEqual(expectedInstanceStateEvidence([], tag, false, false), { sequence: 0n });
  assert.deepEqual(expectedInstanceStateEvidence([event], tag, false, true), { sequence: 5n, commitment: currentStateCommitment });
  assert.deepEqual(expectedInstanceStateEvidence([event], {}, false, true), { sequence: 0n });
  for (const rows of [[], [{ ...event, instanceStateSequence: 0 }], [{ ...event, currentStateCommitment: "private payload" }]]) {
    assert.throws(() => expectedInstanceStateEvidence(rows, tag, false, true), /completion event/);
  }
});

it("public-state expectation parsing rejects unknown tagged profiles and conflated slot nonce counts", () => {
  assert.throws(() => expectedInstanceStateEvidence([], { contractTag: "unknown" }, false, false), /Unsupported/);
  const event = { event: "slot-state-workflow-verified", stateSequence: 5, consumedSlotCommandNonces: 5,
    currentStateCommitment: "ef".repeat(32) };
  assert.throws(() => expectedInstanceStateEvidence([event], { contractTag: "permio-authorization-v8" }, true, true), /completion event/);
});

it("allocation-only final evidence does not require or falsely claim credential-state completion", () => {
  const tag = { contractTag: "permio-authorization-v8" };
  assert.deepEqual(expectedInstanceStateEvidence([], tag, false, true, true), { sequence: 0n });
  assert.throws(() => expectedInstanceStateEvidence([], tag, true, true, true), /allocation-only/);
  for (const event of ["slot-state-workflow-verified", "allocated-credential-and-session-regression-verified"]) {
    assert.throws(() => expectedInstanceStateEvidence([{ event }], tag, false, true, true), /allocation-only/);
  }
});
