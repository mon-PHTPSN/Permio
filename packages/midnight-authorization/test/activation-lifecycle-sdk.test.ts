import assert from "node:assert/strict";
import { it } from "node:test";
import { activationLifecycleFixture } from "./fixtures/activation-lifecycle.ts";
import * as sdk from "../src/activation-lifecycle.ts";

it("v12 SDK preserves logical activation results and generated context", async () => {
  const f = activationLifecycleFixture(), logical = sdk.activationLifecycleCircuitOperations(f.contract);
  const args = [f.envelope, f.signature, f.activator, f.authorityPath] as const;
  const begun = logical.beginM4Activation(f.context, ...args);
  assert(begun.result instanceof Uint8Array);
  const staged = f.stage(begun.context, begun.result);
  const final = logical.finalizeM4Activation(staged.context, ...args);
  assert.equal(final.result.activated, true);
  assert.deepEqual(final.result.registryKey, begun.result);
  assert.equal(f.ledger(final.context).activeTemplates.size(), 1n);
});

it("connected adapters retain transport metadata and logical checkpoint scopes", async () => {
  const f = activationLifecycleFixture();
  let context = f.context;
  const operations: string[] = [], selectors: bigint[] = [];
  // Replace only transport/proof submission; every logical result comes from
  // the real generated v12 circuit and its actual evolving state.
  const transport = { callTx: { async manageM4Activation(selector: bigint, ...args: Parameters<typeof f.call> extends [unknown, unknown, ...infer Rest] ? Rest : never) {
    selectors.push(selector);
    const evaluated = f.call(context, selector, ...args);
    context = evaluated.context;
    return { private: { result: evaluated.result, privateState: undefined, transportMarker: "retained" },
      public: { txId: String(selectors.length), status: "test-transport-only" } };
  } } } as unknown as Parameters<typeof sdk.activationLifecycleCallOperations>[0];
  const logical = sdk.activationLifecycleCallOperations(transport, async (operation, run) => { operations.push(operation); return run(); });
  const args = [f.envelope, f.signature, f.activator, f.authorityPath] as const;
  const begun = await logical.beginM4Activation(...args);
  assert(begun.private.result instanceof Uint8Array);
  assert.equal(begun.public.txId, "1");
  assert.equal((begun.private as unknown as {transportMarker:string}).transportMarker, "retained");
  context = f.stage(context, begun.private.result).context;
  const final = await logical.finalizeM4Activation(...args);
  assert.equal(final.private.result.activated, true);
  assert.deepEqual(final.private.result.registryKey, begun.private.result);
  assert.equal(final.public.txId, "2");
  assert.equal((final.private as unknown as {transportMarker:string}).transportMarker, "retained");
  assert.deepEqual(selectors, [1n, 2n]);
  assert.deepEqual(operations, ["beginM4Activation", "finalizeM4Activation"]);
});
