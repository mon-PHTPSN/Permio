import assert from "node:assert/strict";
import { it } from "node:test";
import { parsePublicStateArguments } from "../verify-live-m6-public-state.ts";

it("public state reader requires one explicit worktree public log and labels final assertions", () => {
  const logFile = "logs/m6-live-2026-10-13T21-03-09.941Z.jsonl";
  assert.deepEqual(parsePublicStateArguments([logFile]), { logFile, final: false, slotState: false });
  assert.deepEqual(parsePublicStateArguments([logFile, "--final"]), { logFile, final: true, slotState: false });
  assert.deepEqual(parsePublicStateArguments([logFile, "--slot-state", "--final"]), { logFile, final: true, slotState: true });
});

it("public state reader rejects traversal, arbitrary private files and unsupported options before IO", () => {
  const log = "logs/m6-live-2026-10-13T21-03-09.941Z.jsonl";
  for (const args of [[], ["../accounts.example.json"], ["/tmp/secret"], ["logs/../secret.json"],
    ["logs/accounts.json"], [log, log], [log, "--final", "--final"], [log, "--force"],
    [log, "--slot-state", "--slot-state"],
    ["logs/m6-live-arbitrary.jsonl"]]) {
    assert.throws(() => parsePublicStateArguments(args), /usage/);
  }
});
