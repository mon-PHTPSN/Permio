import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pureCircuits as pure } from "../contracts/managed/permio-authorization/contract/index.js";
import { runtimeDecisionReceiptId } from "../src/decision-receipt.ts";
import { assertV9DecisionReceiptInsertion } from "../src/indexed-decision-receipt.ts";
import { advanceRuntimeActionSlotProgress, advanceRuntimeActionEvidenceProgress } from "../src/action-execution.ts";
import { ordinaryActionFixture, testBytes as bytes } from "./fixtures/ordinary-action.ts";
import { seedGeneratedMap } from "./fixtures/generated-genesis.ts";

// Generated-code/synthetic-genesis tests. Actual issuance, proof generation,
// finalized node transactions and indexer observations are separate live gates.
describe("staged ordinary action authorization and atomic outcome", () => {
  it("preparation grants nothing; final execution changes state, consumes one nullifier and creates one exact receipt", () => {
    const f = ordinaryActionFixture();
    const before = f.view().runtimeInstances.lookup(f.intent.instanceCommitment);
    f.finishPreparation();
    assert.deepEqual(f.view().runtimeInstances.lookup(f.intent.instanceCommitment), before);
    assert.equal(f.view().decisionReceipts.size(), 0n);
    assert.equal(f.view().usedRuntimeActionNullifiers.size(), 0n);
    const accepted = f.execute(), view = f.view();
    assert.deepEqual(view.runtimeInstances.lookup(f.intent.instanceCommitment), { ...before,
      currentStateCommitment: pure.runtimeStateCommitment(f.prepared.nextState),
      transitionSequence: before.transitionSequence + 1n });
    assert.equal(view.runtimeActionSessions.size(), 0n);
    assert.equal(view.usedRuntimeActionNullifiers.size(), 1n);
    assert.equal(view.decisionReceipts.size(), 1n);
    const receipt = view.decisionReceipts.lookup(accepted.result);
    assert.deepEqual(receipt.outputCommitment, f.evidence.selectedOutputsCommitment);
    assert.deepEqual(receipt.previousStateCommitment, before.currentStateCommitment);
    assert.equal(runtimeDecisionReceiptId(receipt), `0x${Buffer.from(accepted.result).toString("hex")}`);
    assert.doesNotThrow(() => assertV9DecisionReceiptInsertion(accepted.proofData.publicTranscript, receipt));
    assert.throws(() => assertV9DecisionReceiptInsertion([], receipt), /did not prove absence/);
    assert.throws(() => assertV9DecisionReceiptInsertion(accepted.proofData.publicTranscript,
      { ...receipt, outputCommitment: bytes(251) }), /did not prove absence/);
    assert.throws(() => assertV9DecisionReceiptInsertion(
      [...accepted.proofData.publicTranscript, ...accepted.proofData.publicTranscript], receipt), /did not prove absence/);
    assert.equal("stateIdHash" in receipt, false);
    assert.equal("sessionCredentialCommitment" in receipt, false);
  });
  it("preserves the entire instance for a non-transitioning action while consuming the intent once", () => {
    const f = ordinaryActionFixture({ transitioning: false });
    const before = f.view().runtimeInstances.lookup(f.intent.instanceCommitment);
    f.finishPreparation();
    const accepted = f.execute(), receipt = f.view().decisionReceipts.lookup(accepted.result);
    assert.deepEqual(f.view().runtimeInstances.lookup(f.intent.instanceCommitment), before);
    assert.equal(receipt.transitionSequence, 0n);
    assert.deepEqual(receipt.previousStateCommitment, bytes(0));
    assert.deepEqual(receipt.nextStateCommitment, bytes(0));
    assert.equal(f.view().usedRuntimeActionNullifiers.size(), 1n);
    assert.throws(() => f.execute(), /nullifier already consumed/);
  });
  it("verifies the complete depth-16 capability chain rather than just the terminal credential", () => {
    const f = ordinaryActionFixture({ capabilities: 17 });
    assert.equal(f.ancestry.capabilityCount, 17n);
    assert.equal(f.ancestry.statusProof.leafCount, 35n);
    f.finishPreparation(); assert.doesNotThrow(() => f.execute());
  });
  it("walks 34 slot ancestors independently of the capability depth", () => {
    const f = ordinaryActionFixture({ slots: 34 });
    assert.equal(f.ancestry.capabilityCount, 1n);
    f.finishPreparation();
    assert.equal(f.progress.slot.steps, 34n);
    assert.equal(f.progress.slot.phase, 3n);
    assert.doesNotThrow(() => f.execute());
  });
  it("rejects a freshly witnessed revoked distant slot ancestor outside the last 17 records", () => {
    const f = ordinaryActionFixture({ slots: 34, revokedSlot: 1 });
    assert.throws(() => f.finishPreparation(), /revoked or expired/);
    assert.equal(f.view().decisionReceipts.size(), 0n);
    assert.equal(f.view().usedRuntimeActionNullifiers.size(), 0n);
  });
  it("rejects missing preparation, missing ancestors, incomplete evidence and forged completion", () => {
    const f = ordinaryActionFixture({ slots: 2 });
    assert.throws(() => f.execute(), /preparation is absent/);
    f.prep(1n);
    assert.throws(() => f.execute(), /incomplete/);
    const original = structuredClone(f.progress);
    f.progress = { ...f.progress, slot: { ...f.progress.slot, phase: 3n, steps: 2n },
      nextInputIndex: 1n, nextOutputIndex: 1n, inputsAccumulator: f.command.selectedInputsCommitment,
      outputsAccumulator: f.command.selectedOutputsCommitment };
    assert.throws(() => f.execute(), /incomplete|substituted|stale/);
    f.progress = original;
    assert.throws(() => f.prep(3n), /slot ancestry is incomplete/);
  });
  it("rejects a skipped or substituted slot parent and the wrong required actor slot", () => {
    const f = ordinaryActionFixture({ slots: 3 }); f.prep(1n);
    assert.throws(() => f.prep(2n, f.slotSteps[1]), /exact required slot/);
    const wrong = structuredClone(f.slotSteps[0]!); wrong.record.assignment.slotIdHash = bytes(250);
    assert.throws(() => f.prep(2n, wrong), /exact required slot/);
    f.prep(2n, f.slotSteps[0]);
    f.progress = advanceRuntimeActionSlotProgress(f.command, f.intent, f.state, f.status.root, f.progress, f.slotSteps[0]!);
    assert.throws(() => f.prep(2n, f.slotSteps[2]), /omits|substitutes|reorders/);
  });
  it("rejects context, resource, type, order and path substitutions in selected evidence", () => {
    const f = ordinaryActionFixture(); f.prep(1n); f.prep(2n);
    f.progress = advanceRuntimeActionSlotProgress(f.command, f.intent, f.state, f.status.root, f.progress, f.slotSteps[0]!);
    for (const field of ["contextHash", "resourceHash", "typeHash", "nonce", "payloadCommitment"] as const) {
      const row = structuredClone(f.evidence.inputs[0]!);
      row.selected[field] = field === "nonce" || field === "payloadCommitment" ? bytes(0) : bytes(250);
      assert.throws(() => f.prep(3n, undefined, row), /evidence/);
    }
    assert.throws(() => f.prep(3n, undefined, f.evidence.outputs[0]), /evidence type/);
    const badPath = { ...structuredClone(f.evidence.inputs[0]!),
      path: { ...f.evidence.inputs[0]!.path, leaf: bytes(249) } };
    assert.throws(() => f.prep(3n, undefined, badPath), /evidence type/);
  });
  it("binds selected payloads to the session-signed command, not just their type", () => {
    const f = ordinaryActionFixture(); f.prep(1n); f.prep(2n);
    f.progress = advanceRuntimeActionSlotProgress(f.command, f.intent, f.state, f.status.root, f.progress, f.slotSteps[0]!);
    const substituted = structuredClone(f.evidence.inputs[0]!); substituted.selected.payloadCommitment = bytes(249);
    f.prep(3n, undefined, substituted);
    f.progress = advanceRuntimeActionEvidenceProgress(f.projection.policy, f.progress, substituted.selected);
    f.prep(3n, undefined, f.evidence.outputs[0]);
    f.progress = advanceRuntimeActionEvidenceProgress(f.projection.policy, f.progress, f.evidence.outputs[0]!.selected);
    assert.throws(() => f.execute(), /incomplete|substituted|stale/);
  });
  it("rejects current state changes, root changes and competing transitions after preparation", () => {
    for (const change of ["state", "status-root", "authority-root"] as const) {
      const f = ordinaryActionFixture(); f.finishPreparation();
      if (change === "state") f.current = seedGeneratedMap(f.current, "runtimeInstances", f.intent.instanceCommitment,
        { ...f.instanceRecord, currentStateCommitment: bytes(248), transitionSequence: f.command.stateSequence + 1n });
      if (change === "status-root") f.current = seedGeneratedMap(f.current, "credentialStatusRoots", f.target.namespaceHash,
        { root: f.status.root, rootSequence: f.status.sequence + 1n });
      if (change === "authority-root") f.current = seedGeneratedMap(f.current, "authorityRoots", f.target.namespaceHash,
        { ...f.view().authorityRoots.lookup(f.target.namespaceHash), rootSequence: 2n });
      assert.throws(() => f.execute(), /stale/);
      assert.equal(f.view().decisionReceipts.size(), 0n);
    }
    const f = ordinaryActionFixture(); f.finishPreparation(); f.execute();
    assert.throws(() => f.execute(), /state or allocation is stale/);
  });
  it("rejects module revocation, unsupported schema/implementation references and revoked templates", () => {
    for (const change of [ { lifecycleStatus: 6n }, { receiptSchemaHash: bytes(247) },
      { inputSchemaHash: bytes(247) }, { configurationSchemaHash: bytes(247) },
      { compilerVersionHash: bytes(247) }, { compatibilityPolicyHash: bytes(247) },
      { implementationReferenceHash: bytes(247) } ]) {
      const f = ordinaryActionFixture(); f.finishPreparation();
      f.current = seedGeneratedMap(f.current, "proofModules", f.moduleKey, { ...f.moduleRecord, ...change });
      assert.throws(() => f.execute(), /module implementation.*unsupported/);
    }
    const f = ordinaryActionFixture(); f.finishPreparation();
    f.current = seedGeneratedMap(f.current, "activeTemplates", f.templateKey, { ...f.templateRecord, lifecycleStatus: 3n });
    assert.throws(() => f.execute(), /Revoked template/);
  });
  it("rejects altered command, intent, next-state opening and session signatures", () => {
    const f = ordinaryActionFixture(); f.finishPreparation();
    const call = (args: any) => f.contract.circuits.executeRuntimeAction(f.context(), ...(args as ReturnType<typeof f.executeArgs>));
    const alteredCommand = structuredClone(f.executeArgs()); alteredCommand[0].selectedOutputsCommitment = bytes(246);
    assert.throws(() => call(alteredCommand), /signature/);
    const alteredIntent = structuredClone(f.executeArgs()); alteredIntent[2].recipientHash = bytes(246);
    assert.throws(() => call(alteredIntent), /signed inputs/);
    const alteredState = structuredClone([...f.executeArgs()]); alteredState[20] = bytes(246);
    assert.throws(() => call(alteredState), /exact next private state/);
    const alteredSessionSignature: any[] = structuredClone([...f.executeArgs()]);
    alteredSessionSignature[4] = { ...alteredSessionSignature[4], response: alteredSessionSignature[4].response + 1n };
    assert.throws(() => call(alteredSessionSignature), /signature/i);
  });
  it("expired-session cleanup cannot grant authorization, consume a nonce or change state", () => {
    const f = ordinaryActionFixture(); f.prep(1n);
    const result = f.contract.circuits.prepareRuntimeAction(f.context(f.current, 901), ...f.prepareArgs(4n));
    f.current = result.context.currentQueryContext.state;
    assert.equal(f.view().runtimeActionSessions.size(), 0n);
    assert.equal(f.view().decisionReceipts.size(), 0n);
    assert.equal(f.view().usedRuntimeActionNullifiers.size(), 0n);
    assert.deepEqual(f.view().runtimeInstances.lookup(f.intent.instanceCommitment), f.instanceRecord);
    assert.throws(() => f.contract.circuits.prepareRuntimeAction(f.context(), ...f.prepareArgs(4n)), /Only an expired/);
  });
});
