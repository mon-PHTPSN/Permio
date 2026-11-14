import assert from "node:assert/strict";
import { it } from "node:test";
import { businessActionFixture } from "./fixtures/business-action.ts";
import { pureCircuits as pure } from "../contracts/managed/permio-authorization-v11/contract/index.js";
import { seedGeneratedMap } from "./fixtures/generated-genesis-v11.ts";
import { testBytes as bytes } from "./fixtures/ordinary-action.ts";
import { runtimeDecisionReceiptId } from "../src/decision-receipt.ts";

it("cannot create an authorization receipt after only typed evidence preparation", () => {
  const f = businessActionFixture();
  f.finishPreparation();
  assert.throws(() => f.execute(), /business|predicate/i);
  assert.equal(f.view().decisionReceipts.size(), 0n);
});

it("issues one unchanged receipt only after business verification, without granting authority during preparation", () => {
  const f = businessActionFixture();
  f.finishPreparation(); f.proveBusiness();
  assert.equal(f.view().decisionReceipts.size(), 0n);
  assert.equal(f.view().usedRuntimeActionNullifiers.size(), 0n);
  assert.deepEqual(f.view().runtimeInstances.lookup(f.intent.instanceCommitment), f.instanceRecord);
  const accepted = f.execute(), view = f.view();
  assert.equal(view.decisionReceipts.size(), 1n);
  assert.equal(view.usedRuntimeActionNullifiers.size(), 1n);
  assert.equal(view.runtimeActionSessions.size(), 0n);
  assert.equal(view.runtimeBusinessActionSessions.size(), 0n);
  const receipt = view.decisionReceipts.lookup(accepted.result);
  assert.deepEqual(receipt.outputCommitment, f.evidence.selectedOutputsCommitment);
  assert.deepEqual(receipt.moduleIdentity.moduleIdHash, Uint8Array.from(f.binding.moduleIdHash));
  assert.equal(runtimeDecisionReceiptId(receipt), `0x${Buffer.from(accepted.result).toString("hex")}`);
  assert.equal("businessRecord" in receipt, false);
  assert.equal("subjectAccountCredentialCommitment" in receipt, false);
  assert.throws(() => f.execute(), /stale|consumed/);
});

it("rejects skipped predicates, forged completion and another predicate opening", () => {
  const f = businessActionFixture();
  assert.throws(() => f.proveBusiness(), /preparation/);
  f.finishPreparation();
  const args = [...f.businessArgs()] as any[];
  args[11] = { ...args[11], kind: 3n };
  assert.throws(() => f.contract.circuits.prepareRuntimeBusinessPredicate(f.context(),
    ...(args as unknown as ReturnType<typeof f.businessArgs>)), /next exact/);
  f.businessProgress = { ...f.businessProgress, nextPredicateIndex: 1n, outputCoverage: Array(8).fill(true) };
  assert.throws(() => f.execute(), /predicate preparation is absent/);
  assert.throws(() => f.proveBusiness(), /outside/);
  f.businessProgress = pure.runtimeBusinessActionInitialProgress();
  f.proveBusiness();
  const completed = structuredClone(f.businessProgress);
  f.businessProgress.rootCapabilityCommitment = bytes(244);
  assert.throws(() => f.execute(), /Business predicate completion/);
  f.businessProgress = completed;
  assert.doesNotThrow(() => f.execute());
});

it("rechecks revocation, roots, module lifecycle and current state after business preparation", () => {
  const f = businessActionFixture(); f.finishPreparation(); f.proveBusiness();
  const ready = f.current;
  const changes = [
    ["credentialStatusRoots", f.target.namespaceHash, { root: f.status.root, rootSequence: f.status.sequence + 1n }],
    ["authorityRoots", f.target.namespaceHash, { ...f.view().authorityRoots.lookup(f.target.namespaceHash), rootSequence: 2n }],
    ["proofModules", f.moduleKey, { ...f.moduleRecord, lifecycleStatus: 6n }],
    ["activeTemplates", f.templateKey, { ...f.templateRecord, lifecycleStatus: 3n }],
    ["runtimeInstances", f.intent.instanceCommitment, { ...f.instanceRecord, currentStateCommitment: bytes(248) }],
  ] as const;
  for (const [name, key, value] of changes) {
    f.current = seedGeneratedMap(ready, name, key, value);
    assert.throws(() => f.execute(), /stale|unsupported|Revoked/);
    assert.equal(f.view().decisionReceipts.size(), 0n);
    assert.equal(f.view().usedRuntimeActionNullifiers.size(), 0n);
  }
  f.current = ready;
  const changed = [...f.executeArgs()] as any[];
  changed[3] = structuredClone(changed[3]);
  changed[3].capabilities[0].grantIdHash = bytes(249);
  assert.throws(() => f.contract.circuits.executeRuntimeAction(f.context(),
    ...(changed as unknown as ReturnType<typeof f.executeArgs>)), /Business predicate completion/);
  assert.throws(() => f.contract.circuits.executeRuntimeAction(f.context(f.current, 901), ...f.executeArgs()), /window is not current/);
});

it("expired cleanup removes both preparation records without issuing a receipt", () => {
  const f = businessActionFixture(); f.finishPreparation(); f.proveBusiness();
  const result = f.contract.circuits.prepareRuntimeAction(f.context(f.current, 901), ...f.prepareArgs(4n));
  f.current = result.context.currentQueryContext.state;
  assert.equal(f.view().runtimeActionSessions.size(), 0n);
  assert.equal(f.view().runtimeBusinessActionSessions.size(), 0n);
  assert.equal(f.view().decisionReceipts.size(), 0n);
  assert.equal(f.view().usedRuntimeActionNullifiers.size(), 0n);
  assert.deepEqual(f.view().runtimeInstances.lookup(f.intent.instanceCommitment), f.instanceRecord);
});

it("requires all current, bounded-value and audit predicates in their exact configured order", () => {
  const f = businessActionFixture({ predicateKinds: [1, 2, 3] });
  f.finishPreparation(); f.proveBusiness();
  assert.throws(() => f.execute(), /Business predicate completion/);
  f.proveBusiness();
  assert.throws(() => f.execute(), /Business predicate completion/);
  f.proveBusiness();
  assert.equal(f.businessProgress.nextPredicateIndex, 3n);
  assert.deepEqual(f.businessProgress.outputCoverage, [true, true, true, false, false, false, false, false]);
  assert.doesNotThrow(() => f.execute());
  assert.equal(f.view().decisionReceipts.size(), 1n);
});
