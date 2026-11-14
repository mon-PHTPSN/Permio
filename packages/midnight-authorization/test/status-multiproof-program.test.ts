import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pureCircuits } from "../contracts/managed/permio-authorization/contract/index.js";
import {
  CredentialStatusTree,
  createRuntimeStatusMultiproof,
  RUNTIME_STATUS_MAX_STEPS,
} from "../src/index.ts";

type Mutable<T> = T extends Uint8Array ? Uint8Array
  : T extends object ? { -readonly [P in keyof T]: Mutable<T[P]> } : T;

function copy<T>(value: T): Mutable<T> {
  return structuredClone(value) as Mutable<T>;
}

function entry(statusIndex: bigint) {
  return {
    namespace: "status-program-tests",
    kind: "account" as const,
    credentialCommitment: new Uint8Array(32).fill(Number(statusIndex % 251n) + 1),
    revocationAuthorityAccountCredentialCommitment: new Uint8Array(32).fill(17),
    statusIndex,
  };
}

function fixture(indices = [0n, 1n, 7n]) {
  const tree = new CredentialStatusTree();
  for (const index of indices) tree.issue(entry(index));
  const program = createRuntimeStatusMultiproof(tree.multiproofFor(indices));
  const verify = (candidate = program) => pureCircuits.assertRuntimeStatusMultiproof(
    candidate, tree.root, tree.sequence,
  );
  return { tree, program, verify };
}

describe("Compact private shared-branch status program", () => {
  it("reconstructs canonical roots for single, odd, shared and boundary paths", () => {
    for (const indices of [[0n], [1n], [7n], [0n, 1n, 7n], [0n, 2n ** 20n - 1n]]) {
      const { tree, program, verify } = fixture(indices);
      assert.equal(pureCircuits.runtimeStatusMultiproofRoot(program).field, tree.root.field);
      assert.doesNotThrow(() => verify());
      assert.equal(program.leafCount, BigInt(indices.length));
      assert.equal(program.steps.length, RUNTIME_STATUS_MAX_STEPS);
    }
  });

  it("supports all 35 required leaves, including dispersed depth-16 capacity", () => {
    for (const multiplier of [1, 29_959]) {
      const indices = Array.from({ length: 35 }, (_, index) => BigInt(index * multiplier));
      const { program, verify } = fixture(indices);
      assert.doesNotThrow(() => verify());
      assert.equal(program.leafCount, 35n);
      assert(program.steps.filter(({ kind }) => kind !== 0n).length <= RUNTIME_STATUS_MAX_STEPS);
    }
    assert.throws(() => fixture(Array.from({ length: 36 }, (_, index) => BigInt(index))), /capacity/);
  });

  it("uses the complete 588-step worst-case bound without requiring padding", () => {
    const indices = [
      ...Array.from({ length: 32 }, (_, index) => BigInt(index) << 15n),
      1n << 14n, 3n << 14n, 5n << 14n,
    ];
    const { program, verify } = fixture(indices);
    assert.equal(RUNTIME_STATUS_MAX_STEPS, 588);
    assert.equal(program.steps.filter(({ kind }) => kind !== 0n).length, 588);
    assert.doesNotThrow(() => verify());
  });

  it("rejects altered leaves, duplicate indices, noncanonical order and padding", () => {
    const { program, verify } = fixture();
    const changedLeaf = copy(program);
    changedLeaf.leaves[0]!.leaf[0]! ^= 1;
    assert.throws(() => verify(changedLeaf), /root/);
    const duplicate = copy(program);
    duplicate.leaves[1]!.statusIndex = duplicate.leaves[0]!.statusIndex;
    assert.throws(() => verify(duplicate), /unique/);
    const reversed = { ...program, leaves: [...program.leaves] };
    [reversed.leaves[0], reversed.leaves[1]] = [program.leaves[1]!, program.leaves[0]!];
    assert.throws(() => verify(reversed), /ordered/);
    const unused = copy(program);
    unused.leaves[3]!.leaf[0] = 1;
    assert.throws(() => verify(unused), /unused leaf/);
    assert.throws(() => verify({ ...program, leafCount: 0n }), /one to 35/);
    assert.throws(() => verify({ ...program, witnessVersion: 2n }), /version/);
  });

  it("rejects side-node substitution, invalid coordinates and stack-only bypasses", () => {
    const { program, verify } = fixture();
    const mergeIndex = program.steps.findIndex(({ kind }) => kind === 2n);
    const altered = copy(program);
    const merge = altered.steps[mergeIndex]!;
    if (!merge.leftFromStack) merge.left.digest.field += 1n;
    else if (!merge.rightFromStack) merge.right.digest.field += 1n;
    else {
      const sideIndex = altered.steps.findIndex((step) => step.kind === 2n &&
        (!step.leftFromStack || !step.rightFromStack));
      const side = altered.steps[sideIndex]!;
      (side.leftFromStack ? side.right : side.left).digest.field += 1n;
    }
    assert.throws(() => verify(altered), /root|stack opening/);
    const wrongParent = copy(program);
    wrongParent.steps[mergeIndex]!.parentIndex += 1n;
    assert.throws(() => verify(wrongParent), /adjacent/);
    const unanchored = copy(program);
    unanchored.steps[mergeIndex]!.leftFromStack = false;
    unanchored.steps[mergeIndex]!.rightFromStack = false;
    assert.throws(() => verify(unanchored), /required leaf/);
    const underflow = copy(program);
    underflow.steps[0] = structuredClone(program.steps[mergeIndex]!);
    assert.throws(() => verify(underflow), /underflow/);
    const extraSide = copy(program);
    extraSide.steps[mergeIndex]!.left.digest.field = 5n;
    assert.throws(() => verify(extraSide), /stack opening/);
    const alteredTail = copy(program);
    alteredTail.steps[mergeIndex]!.stackTail += 1n;
    assert.throws(() => verify(alteredTail), /stack opening/);
  });

  it("requires every leaf, a complete depth-20 root and trailing canonical padding", () => {
    const { program, verify } = fixture();
    const premature = copy(program);
    premature.steps[1] = structuredClone(program.steps.at(-1)!);
    assert.throws(() => verify(premature), /complete root/);
    const afterPadding = copy(program);
    afterPadding.steps[RUNTIME_STATUS_MAX_STEPS - 1] = structuredClone(program.steps[0]!);
    assert.throws(() => verify(afterPadding), /resume/);
    const invalidKind = copy(program);
    invalidKind.steps[0]!.kind = 3n;
    assert.throws(() => verify(invalidKind), /Unsupported/);
    const unused = copy(program);
    unused.steps[RUNTIME_STATUS_MAX_STEPS - 1]!.parentIndex = 1n;
    assert.throws(() => verify(unused), /canonical/);
    const tooManyPushes = copy(program);
    const push = program.steps[0]!;
    tooManyPushes.steps.splice(0, 4, push, push, push, push);
    assert.throws(() => verify(tooManyPushes), /bounds/);
  });

  it("rejects stale snapshots and copies private inputs without granting active authority", () => {
    const { tree, program } = fixture();
    tree.revoke(entry(0n));
    assert.throws(() => pureCircuits.assertRuntimeStatusMultiproof(
      program, tree.root, tree.sequence,
    ), /sequence/);
    assert.throws(() => pureCircuits.assertRuntimeStatusMultiproof(
      { ...program, rootSequence: tree.sequence }, tree.root, tree.sequence,
    ), /root/);
    // A revoked leaf still has membership. Runtime authorization must separately
    // bind this program to the exact active leaves of its certified ancestors.
    const proof = tree.multiproofFor([0n, 1n, 7n]);
    const current = createRuntimeStatusMultiproof(proof);
    assert.doesNotThrow(() => pureCircuits.assertRuntimeStatusMultiproof(
      current, tree.root, tree.sequence,
    ));
    proof.leaves[0]!.leaf.fill(0);
    (proof.siblings as { field: bigint }[])[0]!.field += 1n;
    assert.doesNotThrow(() => pureCircuits.assertRuntimeStatusMultiproof(
      current, tree.root, tree.sequence,
    ));
  });
});
