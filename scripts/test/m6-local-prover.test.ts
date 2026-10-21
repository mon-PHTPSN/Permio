import assert from "node:assert/strict";
import { it } from "node:test";
import { localMidnightEnvironment, localProofRequestConfig, LOCAL_MIDNIGHT_ENVIRONMENT } from "../../packages/midnight-authorization/src/local-runtime.ts";

it("the capped-prover selector changes only the loopback prover port, never ledger, network or indexer", () => {
  const normal = localMidnightEnvironment(), bounded = localMidnightEnvironment(true);
  assert.deepEqual(normal, LOCAL_MIDNIGHT_ENVIRONMENT);
  assert.equal(bounded.proofServer, "http://127.0.0.1:6301");
  assert.deepEqual({ ...bounded, proofServer: normal.proofServer }, normal);
  Object.assign(normal, { proofServer: "https://remote.invalid" });
  assert.equal(localMidnightEnvironment().proofServer, "http://127.0.0.1:6300");
  assert.throws(() => localMidnightEnvironment("https://remote.invalid" as unknown as boolean), /boolean/u);
  assert(Object.isFrozen(LOCAL_MIDNIGHT_ENVIRONMENT));
});

it("only the bounded local prover gets a finite ten-minute HTTP wait without extending protocol deadlines", () => {
  assert.deepEqual(localProofRequestConfig(), { timeout: 300_000 });
  assert.deepEqual(localProofRequestConfig(true), { timeout: 600_000 });
  assert(Object.isFrozen(localProofRequestConfig(true)));
  for (const value of ["https://remote.invalid", 0, 600_000, {}, null]) {
    assert.throws(() => localProofRequestConfig(value as unknown as boolean), /boolean/u);
  }
});
