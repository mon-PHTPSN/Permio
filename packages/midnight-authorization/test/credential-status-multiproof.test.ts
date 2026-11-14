import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCredentialStatusMultiproof,
  credentialStatusMultiproofRoot,
  CredentialStatusTree,
  verifyCredentialStatusMultiproof,
} from "../src/index.ts";

function entry(statusIndex: bigint) {
  return {
    namespace: "multiproof-tests",
    kind: "account" as const,
    credentialCommitment: new Uint8Array(32).fill(Number(statusIndex % 251n) + 1),
    revocationAuthorityAccountCredentialCommitment: new Uint8Array(32).fill(17),
    statusIndex,
  };
}

function populatedTree(indices: readonly bigint[]) {
  const tree = new CredentialStatusTree();
  for (const index of indices) tree.issue(entry(index));
  return tree;
}

describe("private current-status shared-branch witness preparation", () => {
  it("reconstructs exact Compact roots for sibling, odd, sparse, and boundary leaves", () => {
    const indices = [0n, 1n, 3n, 8n, 9n, 511n, 2n ** 20n - 1n];
    const tree = populatedTree(indices);
    for (const selected of [[0n], [1n], [3n], [0n, 1n], [9n, 8n], indices]) {
      const proof = tree.multiproofFor(selected);
      assert.equal(credentialStatusMultiproofRoot(proof).field, tree.root.field);
      assert.equal(verifyCredentialStatusMultiproof(proof, tree.root, tree.sequence), true);
      assert.deepEqual(
        proof.leaves.map(({ statusIndex }) => statusIndex),
        [...selected].sort((a, b) => a < b ? -1 : a > b ? 1 : 0),
      );
      assert.deepEqual(tree.multiproofFor([...selected].reverse()), proof);
    }
  });

  it("shares branches for 35 membership leaves without claiming to verify a delegation chain", () => {
    // Capacity shape only: 17 capabilities + 17 accounts + 1 session. These
    // fixtures do not certify parent links, time, authority, or active status.
    const indices = Array.from({ length: 35 }, (_, index) => BigInt(index));
    const tree = populatedTree(indices);
    const proof = tree.multiproofFor(indices);
    assert.equal(proof.leaves.length, 35);
    assert.equal(verifyCredentialStatusMultiproof(proof, tree.root, tree.sequence), true);
    assert(proof.siblings.length < 35 * 20);
    assert.equal(proof.siblings.length, 18);
    const dispersed = Array.from({ length: 35 }, (_, index) => BigInt(index * 29_959));
    const dispersedTree = populatedTree(dispersed);
    const dispersedProof = dispersedTree.multiproofFor(dispersed);
    assert.equal(verifyCredentialStatusMultiproof(
      dispersedProof, dispersedTree.root, dispersedTree.sequence,
    ), true);
  });

  it("rejects altered leaves, siblings, indices, order, and extra or missing siblings", () => {
    const tree = populatedTree([0n, 1n, 7n]);
    const proof = tree.multiproofFor([0n, 7n]);
    const accepts = (candidate: typeof proof) =>
      verifyCredentialStatusMultiproof(candidate, tree.root, tree.sequence);
    const alteredLeaf = proof.leaves[0]!.leaf.slice();
    alteredLeaf[0] = alteredLeaf[0]! ^ 1;
    assert.equal(accepts({
      ...proof, leaves: [{ ...proof.leaves[0]!, leaf: alteredLeaf }, proof.leaves[1]!],
    }), false);
    assert.equal(accepts({
      ...proof,
      siblings: [{ field: proof.siblings[0]!.field + 1n }, ...proof.siblings.slice(1)],
    }), false);
    assert.equal(accepts({
      ...proof, leaves: [{ ...proof.leaves[0]!, statusIndex: 1n }, proof.leaves[1]!],
    }), false);
    assert.equal(accepts({ ...proof, leaves: [...proof.leaves].reverse() }), false);
    assert.equal(accepts({ ...proof, leaves: [proof.leaves[0]!, proof.leaves[0]!] }), false);
    assert.equal(accepts({ ...proof, siblings: [...proof.siblings, { field: 0n }] }), false);
    assert.equal(accepts({ ...proof, siblings: proof.siblings.slice(1) }), false);
    assert.equal(accepts({ ...proof, leaves: [] }), false);
    assert.equal(accepts({
      ...proof, leaves: [{ statusIndex: 0n, leaf: new Uint8Array(31) }],
    }), false);
    assert.equal(accepts({ ...proof, rootSequence: -1n }), false);
  });

  it("rejects stale roots and stale sequences after prospective ancestor revocation", () => {
    const tree = populatedTree([0n, 1n, 2n]);
    const before = tree.multiproofFor([0n, 1n, 2n]);
    const oldRoot = tree.root;
    tree.revoke(entry(0n));
    assert.equal(verifyCredentialStatusMultiproof(before, tree.root, tree.sequence), false);
    assert.equal(verifyCredentialStatusMultiproof(before, oldRoot, tree.sequence), false);
    assert.equal(verifyCredentialStatusMultiproof(before, tree.root, before.rootSequence), false);
    const after = tree.multiproofFor([0n, 1n, 2n]);
    assert.equal(verifyCredentialStatusMultiproof(after, tree.root, tree.sequence), true);
    assert.notDeepEqual(after.leaves[0]!.leaf, before.leaves[0]!.leaf);
    // Membership remains possible for a revoked leaf. The eventual circuit
    // must additionally require its exact active-status commitment.
    assert.deepEqual(after.leaves[1]!.leaf, before.leaves[1]!.leaf);
  });

  it("rejects mixed snapshots, duplicate indices, wrong path positions, and invalid bounds", () => {
    const tree = populatedTree([0n, 1n]);
    const oldPath = tree.pathFor(0n);
    tree.issue(entry(7n));
    assert.throws(() => buildCredentialStatusMultiproof([
      { statusIndex: 0n, path: oldPath },
      { statusIndex: 7n, path: tree.pathFor(7n) },
    ], tree.sequence), /shared branch|exact root/);
    assert.throws(() => tree.multiproofFor([0n, 0n]), /unique/);
    assert.throws(() => tree.multiproofFor([]), /at least one/);
    assert.throws(() => tree.multiproofFor([-1n]), /outside/);
    assert.throws(() => tree.multiproofFor([2n ** 20n]), /outside/);
    assert.throws(() => buildCredentialStatusMultiproof([
      { statusIndex: 6n, path: tree.pathFor(7n) },
    ], tree.sequence), /exact status index/);
    assert.throws(() => buildCredentialStatusMultiproof([
      { statusIndex: 0n, path: tree.pathFor(0n) },
    ], 2n ** 64n), /Uint<64>/);
  });

  it("copies private inputs and proves empty membership without granting active authority", () => {
    const tree = populatedTree([0n]);
    const path = tree.pathFor(0n);
    const proof = buildCredentialStatusMultiproof([{ statusIndex: 0n, path }], tree.sequence);
    path.leaf.fill(0);
    path.path[0] = {
      ...path.path[0]!, sibling: { field: path.path[0]!.sibling.field + 1n },
    };
    assert.equal(verifyCredentialStatusMultiproof(proof, tree.root, tree.sequence), true);
    const emptyMembership = tree.multiproofFor([15n]);
    assert.deepEqual(emptyMembership.leaves[0]!.leaf, new Uint8Array(32));
    assert.equal(verifyCredentialStatusMultiproof(emptyMembership, tree.root, tree.sequence), true);
  });

  it("isolates cached leaf bytes and rejects invalid entries before changing state", () => {
    const tree = populatedTree([0n]);
    const root = tree.root;
    const sequence = tree.sequence;
    tree.pathFor(0n).leaf.fill(0);
    assert.equal(tree.root.field, root.field);
    assert.throws(() => tree.issue({ ...entry(1n), namespace: "" }), /non-empty/);
    assert.equal(tree.root.field, root.field);
    assert.equal(tree.sequence, sequence);
    tree.issue(entry(1n));
    assert.equal(tree.sequence, sequence + 1n);
    assert.equal(verifyCredentialStatusMultiproof(
      tree.multiproofFor([0n, 1n]), tree.root, tree.sequence,
    ), true);
  });
});
