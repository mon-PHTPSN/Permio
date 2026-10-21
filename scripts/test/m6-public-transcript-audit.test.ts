import assert from "node:assert/strict";
import { it } from "node:test";
import { ChargedState, StateValue, QueryContext, LedgerParameters, PreTranscript, partitionTranscripts } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { ordinaryActionFixture, testBytes } from "../../packages/midnight-authorization/test/fixtures/ordinary-action.ts";
import { seedGeneratedMap } from "../../packages/midnight-authorization/test/fixtures/generated-genesis.ts";
import { permioAuthorizationPureCircuits as pure, signRuntimeActionCommand, signRuntimeActionIntent,
  advanceRuntimeActionSlotProgress, advanceRuntimeActionEvidenceProgress } from "@permio/midnight-authorization";
import type { PreparedOrdinaryAction } from "../m6-ordinary-action-workflow.ts";
import { auditM6PublicCallReadSet, restoreM6StatusBranchForCounterfactualAudit } from "../m6-public-transcript-audit.ts";

it("a second genuine non-transitioning program survives the first receipt but fails after the status root changes", () => {
  const f = ordinaryActionFixture({ transitioning: false }); f.finishPreparation();
  const a = structuredClone<PreparedOrdinaryAction["arguments"]>([...f.executeArgs()]);
  a[2].nonceHash = testBytes(241); a[2].m5IntentCommitment = testBytes(242);
  a[0].intentCommitment = pure.runtimeActionIntentCommitment(a[2]);
  a[1] = signRuntimeActionCommand(a[0], 131n); a[5] = signRuntimeActionIntent(a[2], 131n);
  let progress = pure.runtimeActionInitialProgress(a[0], a[3].session);
  const prep = (op: bigint, row = f.evidence.inputs[0]!) => {
    const result = f.contract.circuits.prepareRuntimeAction(f.context(), op, a[0], a[1], a[2], a[3].session,
      a[8], a[9], a[10], a[11], a[12], progress, f.slotSteps[0]!, row.selected, row.path);
    f.current = result.context.currentQueryContext.state;
  };
  prep(1n); prep(2n);
  progress = advanceRuntimeActionSlotProgress(a[0], a[2], a[9], f.status.root, progress, f.slotSteps[0]!);
  for (const row of [...f.evidence.inputs, ...f.evidence.outputs]) {
    prep(3n, row); progress = advanceRuntimeActionEvidenceProgress(a[10], progress, row.selected);
  }
  a[13] = progress;
  const before = f.context(), encodedBefore = before.currentQueryContext.state.state.encode();
  const checked = f.contract.circuits.executeRuntimeAction(f.context(), ...a);
  const context = new QueryContext(new ChargedState(StateValue.decode(encodedBefore)), before.currentQueryContext.address);
  context.block = before.currentQueryContext.block;
  const params = LedgerParameters.initialParameters();
  const [guaranteedTranscript, fallibleTranscript] = partitionTranscripts([new PreTranscript(context, checked.proofData.publicTranscript)], params)[0]!;
  const call = { address: context.address, guaranteedTranscript, fallibleTranscript };
  const control = auditM6PublicCallReadSet({ call, encodedState: encodedBefore, parameters: params, clockSeconds: 500n });
  assert(control.accepted, "The original genuine program must pass the public VM control");
  f.execute(); // Different nonce, same instance state/sequence; one receipt inserted.
  const afterWinner = auditM6PublicCallReadSet({ call, encodedState: f.context().currentQueryContext.state.state.encode(), parameters: params, clockSeconds: 500n });
  assert(afterWinner.accepted, "The unrelated receipt/nullifier insertion cannot mask a later status-root test");
  f.current = seedGeneratedMap(f.current, "credentialStatusRoots", f.target.namespaceHash,
    { root: f.status.root, rootSequence: f.status.sequence + 1n });
  const stale = auditM6PublicCallReadSet({ call, encodedState: f.context().currentQueryContext.state.state.encode(), parameters: params, clockSeconds: 500n });
  assert(!stale.accepted);
  const counterfactual = restoreM6StatusBranchForCounterfactualAudit(f.context().currentQueryContext.state.state.encode(), encodedBefore);
  assert(auditM6PublicCallReadSet({ call, encodedState: counterfactual, parameters: params, clockSeconds: 500n }).accepted);
});
