import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  createOrdinaryUserFixture, measureOrdinaryUserAction, parseOrdinaryUserArguments,
  runOrdinaryUserBenchmark, summarizeMilliseconds, verifyOrdinaryUserNegatives,
} from "../m6-ordinary-user-workload.ts";

test("ordinary users and bounded delegates use actual M4/M5 APIs and seven M6 scope paths", () => {
  for (const mode of ["customer-session", "delegated-session"] as const) {
    const sample = measureOrdinaryUserAction(createOrdinaryUserFixture(mode));
    assert(sample.totalClientActionMs >= sample.intentSigningMs);
    assert(sample.scopeWitnessPreparationMs >= 0);
    assert(sample.slotWitnessPreparationMs >= 0);
    assert(sample.m5AuthorizationMs >= 0);
  }
});

test("representative negatives deny before mutation and retain prospective ancestor revocation", () => {
  const cases = verifyOrdinaryUserNegatives();
  assert.equal(cases.length, 12);
  assert.equal(new Set(cases.map((entry) => entry.case)).size, 12);
  assert.equal(cases.find((entry) => entry.case === "revoked-parent")!.reason, "GRANT_REVOKED");
  assert.equal(cases.find((entry) => entry.case === "missing-slot")!.reason, "SLOT_NOT_ASSIGNED");
  assert.equal(cases.find((entry) => entry.case === "revoked-slot")!.reason, "SLOT_NOT_ASSIGNED");
});

test("percentiles are nearest rank and reject invalid input", () => {
  assert.deepEqual(summarizeMilliseconds([4, 1, 3, 2]), { samples: 4, p50Ms: 2, p95Ms: 4, maxMs: 4 });
  for (const samples of [[], [-1], [NaN], [Infinity]]) assert.throws(() => summarizeMilliseconds(samples));
});

test("benchmark CLI rejects unsupported, duplicate and unbounded options", () => {
  assert.deepEqual(parseOrdinaryUserArguments([]), { iterations: 20, requireChain: false });
  assert.deepEqual(parseOrdinaryUserArguments(["--require-chain", "--iterations", "3"]), { iterations: 3, requireChain: true });
  for (const args of [["--iterations"], ["--iterations", "0"], ["--iterations", "101"], ["--iterations", "1.5"], ["--iterations", "1e1"], ["--require-chain", "--require-chain"], ["--typo"]]) {
    assert.throws(() => parseOrdinaryUserArguments(args));
  }
});

test("public report never mislabels client timings as proofs or exports fixture secrets", () => {
  const report = runOrdinaryUserBenchmark(1);
  assert.equal(report.offchainChecksPassed, true);
  assert.equal(report.productionReady, false);
  assert.equal(report.milestoneComplete, false);
  assert.equal(report.chain.transactionsSubmitted, 0);
  assert.equal(report.chain.proofGenerationMs, null);
  assert.equal(report.chain.receipt, null);
  assert.equal(report.replayChecksPassed, 4);
  const serialized = JSON.stringify(report);
  for (const privateValue of ["synthetic-order-a", "synthetic-support-team", "synthetic-fresh-intent", "PRIVATE KEY", "publicKeyPem", '"payload"', '"signature"', '"scopeTrees"', "benchmark-slot-assignment", "benchmark-customer", '"entries"', '"rulePath"']) {
    assert.equal(serialized.includes(privateValue), false);
  }
});

test("required-chain mode cannot pass with only an off-chain benchmark", () => {
  const result = spawnSync(process.execPath, ["scripts/run-m6-ordinary-user-benchmark.ts", "--require-chain"], { encoding: "utf8" });
  assert.equal(result.status, 2);
  const evidence = JSON.parse(result.stdout);
  assert.equal(evidence.status, "not-implemented");
  assert.equal(evidence.transactionsSubmitted, 0);
  assert.equal(evidence.proofGenerationMs, null);
  assert.equal(evidence.milestoneComplete, false);
  assert.equal(result.stderr, "");
});
