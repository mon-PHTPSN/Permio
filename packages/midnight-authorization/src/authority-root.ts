import {
  Bytes32Descriptor,
  CompactTypeMerkleTreeDigest,
  CompactTypeMerkleTreePath,
  StateBoundedMerkleTree,
  type MerkleTreeDigest,
  type MerkleTreePath,
} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import {
  pureCircuits,
  type GovernanceActivatorLeaf,
} from "../contracts/managed/permio-authorization/contract/index.js";

export const AUTHORITY_TREE_DEPTH = 20;

function toHex(value: Uint8Array): string {
  return Buffer.from(value).toString("hex");
}

function alignedBytes32(value: Uint8Array) {
  return {
    value: Bytes32Descriptor.toValue(value),
    alignment: Bytes32Descriptor.alignment(),
  };
}

export interface AuthorityRootBuild {
  readonly root: MerkleTreeDigest;
  readonly commitments: readonly Uint8Array[];
  pathFor(commitment: Uint8Array): MerkleTreePath<Uint8Array>;
}

/**
 * Builds the deterministic v1 namespace-authority tree used by the Compact
 * admission circuit. Leaves are sorted by their Compact commitment bytes so
 * actor names and input ordering never affect the public root.
 */
export function buildAuthorityRoot(
  leaves: readonly GovernanceActivatorLeaf[],
): AuthorityRootBuild {
  if (leaves.length === 0) {
    throw new TypeError("authority root requires at least one leaf");
  }
  if (leaves.length > 2 ** AUTHORITY_TREE_DEPTH) {
    throw new RangeError("authority root exceeds the v1 tree capacity");
  }
  const commitments = leaves
    .map((leaf) => pureCircuits.governanceActivatorLeafCommitment(leaf))
    .sort((left, right) => toHex(left).localeCompare(toHex(right)));
  if (new Set(commitments.map(toHex)).size !== commitments.length) {
    throw new TypeError("authority root contains duplicate leaves");
  }

  let tree = new StateBoundedMerkleTree(AUTHORITY_TREE_DEPTH);
  commitments.forEach((commitment, index) => {
    tree = tree.update(BigInt(index), alignedBytes32(commitment));
  });
  tree = tree.rehash();
  const rootValue = tree.root();
  if (rootValue === undefined) {
    throw new Error("authority tree did not produce a root");
  }
  const root = CompactTypeMerkleTreeDigest.fromValue(rootValue.value);
  const pathType = new CompactTypeMerkleTreePath(
    AUTHORITY_TREE_DEPTH,
    Bytes32Descriptor,
  );

  return {
    root,
    commitments: commitments.map((value) => value.slice()),
    pathFor(commitment) {
      const index = commitments.findIndex(
        (candidate) => toHex(candidate) === toHex(commitment),
      );
      if (index < 0) {
        throw new TypeError("authority commitment is not present in this root");
      }
      return pathType.fromValue(
        tree.pathForLeaf(BigInt(index), alignedBytes32(commitment)).value,
      );
    },
  };
}
