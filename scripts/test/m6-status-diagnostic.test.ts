import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

test("membership diagnostic refuses missing proof assets before local wallet startup", () => {
  const logs = path.resolve("logs");
  mkdirSync(logs, { recursive: true });
  const temporary = mkdtempSync(path.join(logs, "m6-status-missing-assets-"));
  try {
    const result = spawnSync(process.execPath, ["scripts/run-live-m6-status.ts", temporary], {
      encoding: "utf8", timeout: 30_000,
    });
    assert.equal(result.status, 1);
    const events = result.stdout.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "failed");
    assert.equal(events[0].phase, "asset-preparation");
    assert.equal(events[0].category, "missing-build-assets");
    assert.equal(events[0].milestoneComplete, false);
    assert.equal(events[0].detailsWithheldToProtectPrivateWitness, true);
    assert(!result.stdout.includes("mnemonic"));
    assert(!result.stdout.includes("Error:"));
  } finally {
    assert.equal(path.dirname(temporary), logs);
    assert(path.basename(temporary).startsWith("m6-status-missing-assets-"));
    rmSync(temporary, { recursive: true });
  }
});

test("membership diagnostic cannot use assets outside its ignored local logs directory", () => {
  const result = spawnSync(process.execPath, ["scripts/run-live-m6-status.ts", "packages"], {
    encoding: "utf8", timeout: 30_000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /diagnostic assets must be a directory inside repository logs/);
  assert(!result.stdout.includes("starting"));
});
