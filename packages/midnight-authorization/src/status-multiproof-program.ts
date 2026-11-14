import {
  CompactTypeField,
  CompactTypeVector,
  transientHash,
  type MerkleTreeDigest,
} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

import { pureCircuits } from "../contracts/managed/permio-authorization/contract/index.js";
import {
  credentialStatusMultiproofRoot,
  type CredentialStatusMultiproof,
} from "./credential-status.ts";

export const RUNTIME_STATUS_MAX_LEAVES = 35;
export const RUNTIME_STATUS_MAX_STEPS = RUNTIME_STATUS_MAX_LEAVES +
  Array.from({ length: 20 }, (_, depth) => Math.min(2 ** depth, RUNTIME_STATUS_MAX_LEAVES))
    .reduce((total, nodes) => total + nodes, 0);
const NODE_PAIR_TYPE = new CompactTypeVector(2, CompactTypeField);

export interface RuntimeStatusProofNode {
  readonly level: bigint;
  readonly index: bigint;
  readonly digest: MerkleTreeDigest;
}

export interface RuntimeStatusProofStep {
  readonly kind: bigint;
  readonly leftFromStack: boolean;
  readonly rightFromStack: boolean;
  readonly left: RuntimeStatusProofNode;
  readonly right: RuntimeStatusProofNode;
  readonly parentIndex: bigint;
  readonly stackTail: bigint;
}

export interface RuntimeStatusMultiproof {
  readonly witnessVersion: bigint;
  readonly rootSequence: bigint;
  readonly leafCount: bigint;
  readonly leaves: { readonly statusIndex: bigint; readonly leaf: Uint8Array }[];
  readonly steps: RuntimeStatusProofStep[];
}

interface ProofTree {
  readonly node: RuntimeStatusProofNode;
  readonly kind: "required" | "side" | "parent";
  readonly left?: ProofTree;
  readonly right?: ProofTree;
}

function emptyNode(): RuntimeStatusProofNode {
  return { level: 0n, index: 0n, digest: { field: 0n } };
}

function emptyStep(): RuntimeStatusProofStep {
  return {
    kind: 0n, leftFromStack: false, rightFromStack: false,
    left: emptyNode(), right: emptyNode(), parentIndex: 0n, stackTail: 0n,
  };
}

/**
 * Encodes the existing canonical shared-branch membership proof as a private
 * bounded stack program. No status, signature, or ancestry authority is granted.
 */
export function createRuntimeStatusMultiproof(
  proof: CredentialStatusMultiproof,
): RuntimeStatusMultiproof {
  // Reject malformed, duplicate, mixed-snapshot, unused or missing siblings
  // through the existing exact Compact-aligned root reconstruction first.
  const expectedRoot = credentialStatusMultiproofRoot(proof);
  if (proof.leaves.length > RUNTIME_STATUS_MAX_LEAVES) {
    throw new RangeError("runtime status witness exceeds the depth-16 credential capacity");
  }
  let frontier: ProofTree[] = proof.leaves.map(({ statusIndex, leaf }) => ({
    node: {
      level: 0n, index: statusIndex,
      digest: pureCircuits.runtimeStatusMembershipLeafDigest(leaf),
    },
    kind: "required",
  }));
  let siblingOffset = 0;
  for (let level = 0; level < 20; level += 1) {
    const parents: ProofTree[] = [];
    for (let offset = 0; offset < frontier.length; offset += 1) {
      const current = frontier[offset]!;
      const goesLeft = (current.node.index & 1n) === 0n;
      let sibling: ProofTree;
      if (goesLeft && frontier[offset + 1]?.node.index === current.node.index + 1n) {
        sibling = frontier[++offset]!;
      } else {
        sibling = {
          node: {
            level: BigInt(level), index: current.node.index ^ 1n,
            digest: { field: proof.siblings[siblingOffset++]!.field },
          },
          kind: "side",
        };
      }
      const left = goesLeft ? current : sibling;
      const right = goesLeft ? sibling : current;
      parents.push({
        kind: "parent", left, right,
        node: {
          level: BigInt(level + 1), index: current.node.index >> 1n,
          // Interior nodes are already digests. merkleTreePathRoot would hash
          // its input again as a new leaf, so use the exact interior primitive.
          digest: { field: transientHash(NODE_PAIR_TYPE, [
            left.node.digest.field, right.node.digest.field,
          ]) },
        },
      });
    }
    frontier = parents;
  }
  if (siblingOffset !== proof.siblings.length || frontier.length !== 1 ||
      frontier[0]!.node.digest.field !== expectedRoot.field) {
    throw new TypeError("runtime status program does not match its canonical membership root");
  }
  const steps: RuntimeStatusProofStep[] = [];
  const stack: bigint[] = [0n];
  const visit = (tree: ProofTree): void => {
    if (tree.kind === "side") return;
    if (tree.kind === "required") {
      steps.push({ ...emptyStep(), kind: 1n, left: tree.node });
      stack.push(pureCircuits.runtimeStatusStackPush(stack.at(-1)!, tree.node));
      return;
    }
    const left = tree.left!;
    const right = tree.right!;
    visit(left);
    visit(right);
    const popped = Number(left.kind !== "side") + Number(right.kind !== "side");
    stack.splice(stack.length - popped, popped);
    const stackTail = stack.at(-1)!;
    steps.push({
      kind: 2n,
      leftFromStack: left.kind !== "side",
      rightFromStack: right.kind !== "side",
      left: left.node,
      right: right.node,
      parentIndex: tree.node.index,
      stackTail,
    });
    stack.push(pureCircuits.runtimeStatusStackPush(stackTail, tree.node));
  };
  visit(frontier[0]!);
  if (steps.length > RUNTIME_STATUS_MAX_STEPS) {
    throw new RangeError("runtime status program exceeds its proven depth-20 bound");
  }
  return {
    witnessVersion: 1n,
    rootSequence: proof.rootSequence,
    leafCount: BigInt(proof.leaves.length),
    leaves: Array.from({ length: RUNTIME_STATUS_MAX_LEAVES }, (_, index) => {
      const leaf = proof.leaves[index];
      return leaf === undefined
        ? { statusIndex: 0n, leaf: new Uint8Array(32) }
        : { statusIndex: leaf.statusIndex, leaf: leaf.leaf.slice() };
    }),
    steps: [...steps, ...Array.from({ length: RUNTIME_STATUS_MAX_STEPS - steps.length }, emptyStep)],
  };
}
