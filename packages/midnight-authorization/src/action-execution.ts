import { randomBytes } from "node:crypto";
import {
  pureCircuits as pure,
  type RuntimeActionCommand, type RuntimeActionIntent, type RuntimeActionProgress,
  type RuntimeInstanceAllocation, type RuntimeStateOpening, type RuntimeSessionCredential,
  type RuntimeTemplateActionPolicy, type RuntimeTemplateTransition, type ProofModuleBinding,
  type RuntimeSelectedActionValue, type RuntimeSlotAncestryStep,
} from "../contracts/managed/permio-authorization/contract/index.js";
import type { MerkleTreeDigest, MerkleTreePath } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { createRuntimeActionTypeTree } from "./template-policy.ts";
import type { ScenarioTemplate } from "@permio/scenario-domain";

function equal(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}
function nonzero(value: Uint8Array, name: string): Uint8Array {
  if (!(value instanceof Uint8Array) || value.length !== 32 || value.every(byte => byte === 0)) {
    throw new TypeError(`${name} requires 32 nonzero bytes`);
  }
  return value.slice();
}

export interface SelectedActionPayload {
  /** Digest of an application-canonical private record/group, not an attestation of truth. */
  readonly payloadCommitment: Uint8Array;
  readonly nonce?: Uint8Array;
}

/** Exact ordered typed selection. Contents remain caller-controlled and private. */
export function createRuntimeActionEvidencePlan(input: {
  readonly template: ScenarioTemplate; readonly actionId: string; readonly intent: RuntimeActionIntent;
  readonly inputs: readonly SelectedActionPayload[]; readonly outputs: readonly SelectedActionPayload[];
}) {
  const action = input.template.actions.find(candidate => candidate.id === input.actionId);
  if (!action || input.inputs.length !== action.inputRecordTypes.length ||
      input.outputs.length !== action.outputClaimTypes.length) {
    throw new TypeError("action evidence must cover every exact declared input/output type once");
  }
  const inputs = createRuntimeActionTypeTree(action.inputRecordTypes, "record-type");
  const outputs = createRuntimeActionTypeTree(action.outputClaimTypes, "claim-type");
  const values = (payloads: readonly SelectedActionPayload[], tree: typeof inputs) => payloads.map((payload, index) => {
    const witness = tree.at(index);
    const selected: RuntimeSelectedActionValue = {
      valueVersion: 1n, typeHash: witness.typeHash, contextHash: input.intent.contextHash.slice(),
      resourceHash: input.intent.resourceHash.slice(), payloadCommitment: nonzero(payload.payloadCommitment, "selected payload"),
      nonce: nonzero(payload.nonce ?? randomBytes(32), "selected payload nonce"),
    };
    return { selected, path: witness.path };
  });
  const inputValues = values(input.inputs, inputs), outputValues = values(input.outputs, outputs);
  const accumulate = (rows: typeof inputValues, output: boolean) => rows.reduce<Uint8Array>((previous, row, index) =>
    pure.runtimeSelectedActionValueStep(previous, BigInt(index), row.selected, output), new Uint8Array(32));
  return { inputs: inputValues, outputs: outputValues,
    inputRoot: inputs.root, outputRoot: outputs.root,
    selectedInputsCommitment: accumulate(inputValues, false),
    selectedOutputsCommitment: accumulate(outputValues, true) };
}

/** Command preparation only. Authority comes from the final verified transaction. */
export function createRuntimeActionCommand(input: {
  readonly intent: RuntimeActionIntent; readonly session: RuntimeSessionCredential;
  readonly allocation: RuntimeInstanceAllocation; readonly state: RuntimeStateOpening; readonly stateSequence: bigint;
  readonly policy: RuntimeTemplateActionPolicy; readonly binding: ProofModuleBinding;
  readonly authorityRootVersion: bigint; readonly authorityRootSequence: bigint; readonly statusRootSequence: bigint;
  readonly slotAssignmentIdHash: Uint8Array;
  readonly evidence: ReturnType<typeof createRuntimeActionEvidencePlan>;
  readonly transition: RuntimeTemplateTransition; readonly transitionPath: MerkleTreePath<Uint8Array>;
  readonly nextStateIdHash: Uint8Array; readonly nextNonce?: Uint8Array;
  readonly transitioning: boolean; readonly effectiveAt: bigint; readonly validBefore: bigint;
}) {
  const { intent, session, state, policy, evidence } = input;
  if (policy.policyVersion !== 3n || input.stateSequence < 0n || input.stateSequence >= 2n ** 64n - 1n ||
      !equal(pure.runtimeSessionCredentialCommitment(session), intent.sessionCredentialCommitment) ||
      !equal(intent.instanceCommitment, state.instanceCommitment) ||
      !equal(intent.instanceCommitment, input.allocation.instanceCommitment) ||
      evidence.inputs.length !== Number(policy.inputRecordTypeCount) ||
      evidence.outputs.length !== Number(policy.outputClaimTypeCount) ||
      evidence.inputRoot.field !== policy.inputRecordTypesRoot.field ||
      evidence.outputRoot.field !== policy.outputClaimTypesRoot.field ||
      input.effectiveAt < intent.issuedAt || input.validBefore <= input.effectiveAt ||
      input.validBefore > session.expiresAt || input.validBefore > input.allocation.expiresAt) {
    throw new TypeError("action preparation substitutes its exact instance, session, evidence schema, sequence or window");
  }
  pure.assertRuntimeTemplateActionIntent(policy, intent);
  if (!equal(pure.runtimeTemplateActionPolicyCommitment(policy), input.binding.configurationHash)) {
    throw new TypeError("action preparation requires the exact activation-authenticated configuration");
  }
  pure.assertRuntimeTemplateTransition(policy, input.transition, input.transitionPath, state.stateIdHash, input.nextStateIdHash);
  const nextNonce = input.transitioning ? nonzero(input.nextNonce ?? randomBytes(32), "next state nonce") : state.nonce.slice();
  const nextState = pure.runtimeActionNextState(state, input.nextStateIdHash, nextNonce, input.effectiveAt, input.transitioning);
  const command: RuntimeActionCommand = {
    commandVersion: 1n, intentCommitment: pure.runtimeActionIntentCommitment(intent),
    allocationCommitment: pure.runtimeInstanceAllocationCommitment(input.allocation),
    stateCommitment: pure.runtimeStateCommitment(state), stateSequence: input.stateSequence,
    authorityRootVersion: input.authorityRootVersion, authorityRootSequence: input.authorityRootSequence,
    statusRootSequence: input.statusRootSequence, policyCommitment: pure.runtimeTemplateActionPolicyCommitment(policy),
    bindingCommitment: pure.proofModuleBindingCommitment(input.binding),
    slotAssignmentIdHash: nonzero(input.slotAssignmentIdHash, "action slot assignment"),
    selectedInputsCommitment: evidence.selectedInputsCommitment.slice(),
    selectedOutputsCommitment: evidence.selectedOutputsCommitment.slice(),
    nextStateCommitment: pure.runtimeStateCommitment(nextState), transitioning: input.transitioning,
    effectiveAt: input.effectiveAt, validBefore: input.validBefore,
  };
  return { command, nextState, nextNonce, initialProgress: pure.runtimeActionInitialProgress(command, session) };
}

/** Advance locally only after the corresponding preparation transaction succeeds. */
export function advanceRuntimeActionSlotProgress(
  command: RuntimeActionCommand, intent: RuntimeActionIntent, state: RuntimeStateOpening,
  statusRoot: MerkleTreeDigest, progress: RuntimeActionProgress, step: RuntimeSlotAncestryStep,
): RuntimeActionProgress {
  return { ...structuredClone(progress), slot: pure.runtimeSlotAdvanceProgress(progress.slot, step, state,
    pure.runtimeActionSlotContext(intent, command), statusRoot) };
}

/** Mirror the private input/output phase; callers cannot choose a different phase. */
export function advanceRuntimeActionEvidenceProgress(
  policy: RuntimeTemplateActionPolicy, progress: RuntimeActionProgress, selected: RuntimeSelectedActionValue,
): RuntimeActionProgress {
  if (progress.slot.phase !== 3n || progress.slot.inactive) throw new TypeError("action slot ancestry is incomplete");
  const output = progress.nextInputIndex === policy.inputRecordTypeCount;
  const index = output ? progress.nextOutputIndex : progress.nextInputIndex;
  if (index >= (output ? policy.outputClaimTypeCount : policy.inputRecordTypeCount)) {
    throw new RangeError("action evidence is already complete");
  }
  const next = pure.runtimeSelectedActionValueStep(output ? progress.outputsAccumulator : progress.inputsAccumulator,
    index, selected, output);
  return { ...structuredClone(progress), nextInputIndex: output ? progress.nextInputIndex : index + 1n,
    nextOutputIndex: output ? index + 1n : progress.nextOutputIndex,
    inputsAccumulator: output ? progress.inputsAccumulator.slice() : next,
    outputsAccumulator: output ? next : progress.outputsAccumulator.slice() };
}
