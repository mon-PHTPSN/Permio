import assert from "node:assert/strict";
import { it } from "node:test";
import { pureCircuits as pure } from "../contracts/managed/permio-authorization/contract/index.js";
import { assertV9DecisionReceiptInsertion } from "../src/indexed-decision-receipt.ts";
import { seedGeneratedMap } from "./fixtures/generated-genesis.ts";
import { ordinaryActionFixture, testBytes as bytes } from "./fixtures/ordinary-action.ts";

// Generated real Compact program and ledger, crypto-valid synthetic genesis.
// This establishes circuit behavior, not actual ZK proofs or chain acceptance.
it("binds a bridge manifest to an exact nontransitioning DecisionReceipt v1", () => {
  const f = ordinaryActionFixture({ evidenceBridge: {} });
  const before = f.view().runtimeInstances.lookup(f.intent.instanceCommitment);
  f.finishPreparation();
  const accepted = f.execute(), view = f.view(), receipt = view.decisionReceipts.lookup(accepted.result);
  assert.deepEqual(view.runtimeInstances.lookup(f.intent.instanceCommitment), before);
  assert.equal(receipt.receiptVersion, 1n);
  assert.equal(receipt.transitioning, false);
  assert.deepEqual(receipt.outputCommitment, f.evidence.selectedOutputsCommitment);
  assert.notDeepEqual(receipt.outputCommitment, f.bridgeBinding);
  assert.deepEqual(receipt.outputCommitment, pure.runtimeEvidenceBridgeOutputCommitment(f.opening!, f.projection.outputClaims.at(0).typeHash));
  assert.equal(view.usedRuntimeActionNullifiers.size(), 1n);
  assert.equal(view.runtimeActionSessions.size(), 0n);
  assert.doesNotThrow(() => assertV9DecisionReceiptInsertion(accepted.proofData.publicTranscript, receipt));
  assert.throws(() => f.execute(), /nullifier already consumed/);
});

it("rejects ordinary-entry bypass of bridge semantics and bridge-entry use for ordinary actions", () => {
  const bridge = ordinaryActionFixture({ evidenceBridge: {} }); bridge.finishPreparation();
  assert.throws(() => bridge.contract.circuits.executeRuntimeAction(bridge.context(), ...bridge.executeArgs()), /bridge.*dedicated entry/i);
  const ordinary = ordinaryActionFixture({ transitioning: false }); ordinary.finishPreparation();
  assert.throws(() => ordinary.contract.circuits.executeRuntimeEvidenceBridge(ordinary.context(), ...ordinary.executeArgs(),
    bridge.opening!, ordinary.projection.outputClaims.at(0).typeHash), /bridge.*module/i);
});

it("rejects every opening substitution, selected type substitution and no receipt is created", () => {
  const f = ordinaryActionFixture({ evidenceBridge: {} }); f.finishPreparation();
  for (const [field, value] of Object.entries(f.opening!)) {
    const altered = typeof value === "bigint" ? value + 1n : bytes(244);
    assert.throws(() => f.contract.circuits.executeRuntimeEvidenceBridge(f.context(), ...f.executeArgs(),
      { ...f.opening!, [field]: altered }, f.projection.outputClaims.at(0).typeHash), /bridge/i, field);
  }
  assert.throws(() => f.contract.circuits.executeRuntimeEvidenceBridge(f.context(), ...f.executeArgs(), f.opening!, bytes(243)), /bridge.*output/i);
  assert.equal(f.view().decisionReceipts.size(), 0n);
  assert.equal(f.view().usedRuntimeActionNullifiers.size(), 0n);
});

it("rejects coherently signed invalid bridge headers and selected aggregate outputs", () => {
  for (const evidenceBridge of [
    { opening: { bindingVersion: 1n } }, { opening: { nonce: bytes(0) }, outputNonce: bytes(237) },
    { opening: { sourceContextHash: bytes(240) } }, { opening: { sourceInstanceCommitment: bytes(240) } },
    { opening: { purposeHash: bytes(240) } }, { opening: { expiresAt: 899n } },
    { outputPayload: bytes(239) }, { outputNonce: bytes(238) },
    { outputClaimTypes: ["claim-one", "claim-two"] },
  ]) {
    const f = ordinaryActionFixture({ evidenceBridge }); f.finishPreparation();
    assert.throws(() => f.execute(), /bridge/i);
    assert.equal(f.view().decisionReceipts.size(), 0n);
    assert.equal(f.view().usedRuntimeActionNullifiers.size(), 0n);
  }
});

it("requires the freshly prepared binding resource in both capability and session exact scopes", () => {
  for (const evidenceBridge of [{ capabilityResource: "item-one" }, { sessionResource: "item-one" }]) {
    const f = ordinaryActionFixture({ evidenceBridge }); f.finishPreparation();
    assert.doesNotThrow(() => f.executeArgs(), "negative scope witness must reach the real circuit");
    assert.throws(() => f.execute(), /resource|scope/i);
    assert.equal(f.view().decisionReceipts.size(), 0n);
  }
});

it("retains inherited bridge validity, module and slot revocation boundaries", () => {
  const expired = ordinaryActionFixture({ evidenceBridge: {} }); expired.finishPreparation();
  assert.throws(() => expired.contract.circuits.executeRuntimeEvidenceBridge(expired.context(expired.current, 901),
    ...expired.executeArgs(), expired.opening!, expired.projection.outputClaims.at(0).typeHash), /window.*current/);
  const module = ordinaryActionFixture({ evidenceBridge: {} }); module.finishPreparation();
  module.current = seedGeneratedMap(module.current, "proofModules", module.moduleKey,
    { ...module.moduleRecord, lifecycleStatus: 6n });
  assert.throws(() => module.execute(), /module implementation.*unsupported/);
  const revoked = ordinaryActionFixture({ evidenceBridge: {}, revokedSlot: 0 });
  assert.throws(() => revoked.finishPreparation(), /revoked or expired/);
});

it("rejects freshly witnessed revoked bridge capability and session status at final execution", () => {
  for (const revokedCredential of ["capability", "session"] as const) {
    const f = ordinaryActionFixture({ evidenceBridge: { revokedCredential } }); f.finishPreparation();
    assert.doesNotThrow(() => f.executeArgs());
    assert.throws(() => f.execute(), /exact active credential/);
    assert.equal(f.view().decisionReceipts.size(), 0n);
    assert.equal(f.view().usedRuntimeActionNullifiers.size(), 0n);
  }
});
