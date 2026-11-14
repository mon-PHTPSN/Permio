import assert from "node:assert/strict";
import { it } from "node:test";
import { permioAuthorizationWitnesses } from "../src/compact-crypto.ts";
import { activationLifecycleFixture } from "./fixtures/activation-lifecycle.ts";
import { seedGeneratedMap } from "./fixtures/generated-genesis-v11.ts";
import { createCircuitContext, dummyContractAddress } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

it("v12 exposes one activation lifecycle proof entry instead of two", async () => {
  const generated = await import(new URL("../contracts/managed/permio-authorization-v12/contract/index.js", import.meta.url).href)
    .catch((error: NodeJS.ErrnoException) => { if (error.code === "ERR_MODULE_NOT_FOUND") return undefined; throw error; });
  const contract = generated && new generated.Contract(permioAuthorizationWitnesses);
  assert.equal(typeof contract?.circuits.manageM4Activation, "function", "v12 activation lifecycle entry is missing");
  assert.equal("beginM4Activation" in contract.circuits, false);
  assert.equal("finalizeM4Activation" in contract.circuits, false);
  assert.equal(typeof contract.circuits.stageM4ActivationBinding, "function");
  assert.equal(Object.keys(contract.provableCircuits).length, 10);
});

it("begins inertly, stages separately and finalizes exactly once", () => {
  const f = activationLifecycleFixture(), begun = f.begin();
  assert.equal(begun.result.activated, false);
  const opened = f.ledger(begun.context);
  assert.equal(opened.activeTemplates.size(), 0n);
  assert.equal(opened.activationSessions.size(), 1n);
  assert.equal(opened.reservedAdmissionNonces.size(), 1n);
  assert.equal(opened.usedAdmissionNonces.size(), 0n);
  assert.throws(() => f.call(begun.context, 2n), /Not every action binding/);
  const staged = f.stage(begun.context, begun.result.registryKey);
  assert.equal(staged.result, true);
  assert.throws(() => f.stage(staged.context, begun.result.registryKey), /canonical order/);
  const finalized = f.call(staged.context, 2n);
  assert.equal(finalized.result.activated, true);
  assert.deepEqual(finalized.result.registryKey, begun.result.registryKey);
  const final = f.ledger(finalized.context);
  assert.equal(final.activeTemplates.size(), 1n);
  assert.equal(final.activationSessions.size(), 0n);
  assert.equal(final.reservedAdmissionNonces.size(), 0n);
  assert.equal(final.usedAdmissionNonces.size(), 1n);
  assert.equal(final.templateLifecycleSequence, 1n);
  assert.equal(final.templateActivationSequence, 1n);
  assert.equal(final.decisionReceipts.size(), 0n);
  assert.throws(() => f.call(finalized.context, 1n), /Admission nonce already used/);
  assert.throws(() => f.call(finalized.context, 2n), /Activation session does not exist/);
});

it("rejects every unsupported operation before expired-session cleanup", () => {
  for (const operation of [0n, 3n, 255n]) {
    const f = activationLifecycleFixture(), begun = f.begin(), expired = f.at(begun.context, 1500);
    const before = f.ledger(expired).activationSessions.lookup(begun.result.registryKey);
    const encoded = expired.currentQueryContext.state.state.encode();
    assert.throws(() => f.call(expired, operation), /Unsupported activation lifecycle operation/);
    assert.equal(f.ledger(expired).activationSessions.size(), 1n);
    assert.equal(f.ledger(expired).reservedAdmissionNonces.size(), 1n);
    assert.deepEqual(f.ledger(expired).activationSessions.lookup(begun.result.registryKey), before);
    assert.deepEqual(expired.currentQueryContext.state.state.encode(), encoded);
    assert.equal(f.ledger(expired).usedAdmissionNonces.size(), 0n);
    assert.equal(f.ledger(expired).activeTemplates.size(), 0n);
    assert.equal(f.ledger(expired).templateLifecycleSequence, 0n);
  }
});

it("a newly authorized begin replaces stale staging and releases its old nonce", () => {
  const f = activationLifecycleFixture(), begun = f.begin();
  const root = f.ledger(begun.context).authorityRoots.lookup(f.envelope.namespaceHash);
  const state = seedGeneratedMap(begun.context.currentQueryContext.state, "authorityRoots", f.envelope.namespaceHash,
    { ...root, rootSequence: 2n });
  const ctx = createCircuitContext(dummyContractAddress(), "00".repeat(32), state, undefined, undefined, undefined, 1000);
  const envelope = { ...f.envelope, authorityRootSequence: 2n, admissionNonce: new Uint8Array(32).fill(14) };
  const reopened = f.call(ctx, 1n, envelope, f.signed(envelope));
  assert.equal(reopened.result.activated, false);
  assert.deepEqual(reopened.result.registryKey, begun.result.registryKey);
  const actual = f.ledger(reopened.context);
  assert.equal(actual.activationSessions.size(), 1n);
  assert.equal(actual.reservedAdmissionNonces.size(), 1n);
  assert.equal(actual.reservedAdmissionNonces.member(f.envelope.admissionNonce), false);
  assert.equal(actual.reservedAdmissionNonces.member(envelope.admissionNonce), true);
  assert.equal(actual.usedAdmissionNonces.size(), 0n);
});

it("begin verifies authority before cleaning a stale session", () => {
  const f = activationLifecycleFixture(), begun = f.begin();
  const root = f.ledger(begun.context).authorityRoots.lookup(f.envelope.namespaceHash);
  const state = seedGeneratedMap(begun.context.currentQueryContext.state, "authorityRoots", f.envelope.namespaceHash,
    { ...root, rootSequence: 2n });
  const ctx = createCircuitContext(dummyContractAddress(), "00".repeat(32), state, undefined, undefined, undefined, 1000);
  assert.throws(() => f.call(ctx, 1n), /authority root reference is stale/);
  assert.equal(f.ledger(ctx).activationSessions.size(), 1n);
  assert.equal(f.ledger(ctx).reservedAdmissionNonces.size(), 1n);
});

it("finalize cleans expired or stale sessions before verifying invalid authority inputs", () => {
  for (const cause of ["expired", "root", "registry"] as const) {
    const f = activationLifecycleFixture(), begun = f.begin();
    let ctx = begun.context;
    if (cause === "expired") ctx = f.at(ctx, 1500);
    else if (cause === "root") {
      const root = f.ledger(ctx).authorityRoots.lookup(f.envelope.namespaceHash);
      const state = seedGeneratedMap(ctx.currentQueryContext.state, "authorityRoots", f.envelope.namespaceHash,
        { ...root, rootSequence: 2n });
      ctx = createCircuitContext(dummyContractAddress(), "00".repeat(32), state, undefined, undefined, undefined, 1000);
    } else {
      // A different signed registry version is not itself stale state. Seed the
      // session's captured sequence to exercise the actual freshness comparison.
      const session = f.ledger(ctx).activationSessions.lookup(begun.result.registryKey);
      const state = seedGeneratedMap(ctx.currentQueryContext.state, "activationSessions", begun.result.registryKey,
        { ...session, proofModuleRegistrySequence: 1n });
      ctx = createCircuitContext(dummyContractAddress(), "00".repeat(32), state, undefined, undefined, undefined, 1000);
    }
    const cleaned = f.call(ctx, 2n, f.envelope, { ...f.signature, response: f.signature.response + 1n },
      { ...f.activator, authorityKind: 4n });
    assert.equal(cleaned.result.activated, false);
    const state = f.ledger(cleaned.context);
    assert.equal(state.activationSessions.size(), 0n);
    assert.equal(state.reservedAdmissionNonces.size(), 0n);
    assert.equal(state.usedAdmissionNonces.size(), 0n);
    assert.equal(state.activeTemplates.size(), 0n);
    assert.equal(state.templateActivationSequence, 0n);
    assert.equal(state.templateLifecycleSequence, 0n);
  }
});

it("rejects validly re-signed envelope substitution and invalid live authority", () => {
  const f = activationLifecycleFixture(), begun = f.begin(), staged = f.stage(begun.context, begun.result.registryKey);
  const altered = { ...f.envelope, approvalEvidenceCommitment: new Uint8Array(32).fill(99) };
  assert.throws(() => f.call(staged.context, 2n, altered, f.signed(altered)), /does not match the staged session/);
  assert.throws(() => f.call(staged.context, 2n, f.envelope, { ...f.signature, response: f.signature.response + 1n }), /signature/i);
  assert.equal(f.ledger(staged.context).activeTemplates.size(), 0n);
  assert.equal(f.ledger(staged.context).usedAdmissionNonces.size(), 0n);
  assert.equal(f.ledger(staged.context).activationSessions.size(), 1n);
});
