import { createHash } from "node:crypto";

import { encodeCanonical } from "@permio/protocol";
import { parseSemanticVersion } from "@permio/scenario-domain";
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
  type ProofModuleBinding as CompactProofModuleBinding,
  type ProofModuleProposal as CompactProofModuleProposal,
} from "../contracts/managed/permio-authorization/contract/index.js";
import type {
  Hex32,
  IndexedProofModuleBinding,
  ProofModuleProposalInput,
} from "./model.ts";

export const PROOF_MODULE_BINDING_TREE_DEPTH = 20;

function identifierHash(kind: string, value: string): Uint8Array {
  return createHash("sha256")
    .update(encodeCanonical(`permio:${kind}:v1`, [value]))
    .digest();
}

function hexBytes(value: Hex32): Uint8Array {
  return Uint8Array.from(Buffer.from(value.slice(2), "hex"));
}

function alignedBytes32(value: Uint8Array) {
  return {
    value: Bytes32Descriptor.toValue(value),
    alignment: Bytes32Descriptor.alignment(),
  };
}

function digestHex(digest: MerkleTreeDigest): Hex32 {
  return `0x${digest.field.toString(16).padStart(64, "0")}`;
}

export function merkleDigestFromHex(value: Hex32): MerkleTreeDigest {
  return { field: BigInt(value) };
}

export function toCompactProofModuleBinding(
  binding: IndexedProofModuleBinding,
): CompactProofModuleBinding {
  const version = parseSemanticVersion(binding.moduleVersion);
  return {
    bindingVersion: 1n,
    actionIndex: BigInt(binding.actionIndex),
    actionIdHash: identifierHash("action-id", binding.actionId),
    proofProfileIdHash: identifierHash(
      "proof-profile-id",
      binding.proofProfileId,
    ),
    moduleIdHash: identifierHash("proof-module-id", binding.moduleId),
    moduleVersion: {
      major: BigInt(version.major),
      minor: BigInt(version.minor),
      patch: BigInt(version.patch),
    },
    implementationHash: hexBytes(binding.implementationHash),
    configurationHash: hexBytes(binding.configurationHash),
    receiptSchemaHash: hexBytes(binding.receiptSchemaHash),
  };
}

export function toCompactProofModuleProposal(
  module: ProofModuleProposalInput,
): CompactProofModuleProposal {
  const version = parseSemanticVersion(module.moduleVersion);
  return {
    proposalVersion: 1n,
    identity: {
      moduleIdHash: identifierHash("proof-module-id", module.moduleId),
      moduleVersion: {
        major: BigInt(version.major),
        minor: BigInt(version.minor),
        patch: BigInt(version.patch),
      },
      implementationHash: hexBytes(module.implementationHash),
    },
    governanceNamespaceHash: hexBytes(module.governanceNamespaceHash),
    governancePolicyHash: hexBytes(module.governancePolicyHash),
    authorityRootVersion: BigInt(module.authorityRootVersion),
    authorityRootSequence: BigInt(module.authorityRootSequence),
    implementationReferenceHash: hexBytes(module.implementationReferenceHash),
    sourceHash: hexBytes(module.sourceHash),
    inputSchemaHash: hexBytes(module.inputSchemaHash),
    configurationSchemaHash: hexBytes(module.configurationSchemaHash),
    receiptSchemaHash: hexBytes(module.receiptSchemaHash),
    compilerVersionHash: hexBytes(module.compilerVersionHash),
    compatibilityPolicyHash: hexBytes(module.compatibilityPolicyHash),
    proposedAt: BigInt(module.proposedAt),
  };
}

export interface ProofModuleBindingTree {
  readonly root: MerkleTreeDigest;
  readonly rootHex: Hex32;
  readonly commitments: readonly Uint8Array[];
  compactBindingAt(index: number): CompactProofModuleBinding;
  pathFor(index: number): MerkleTreePath<Uint8Array>;
}

export function buildProofModuleBindingTree(
  bindings: readonly IndexedProofModuleBinding[],
): ProofModuleBindingTree {
  if (bindings.length === 0) {
    throw new TypeError("proof-module binding tree requires at least one binding");
  }
  if (bindings.length > 2 ** PROOF_MODULE_BINDING_TREE_DEPTH) {
    throw new RangeError("proof-module binding tree exceeds the v1 capacity");
  }
  bindings.forEach((binding, index) => {
    if (binding.actionIndex !== index) {
      throw new TypeError(
        "proof-module bindings must use contiguous canonical action indexes",
      );
    }
  });
  const compactBindings = bindings.map(toCompactProofModuleBinding);
  const commitments = compactBindings.map((binding) =>
    pureCircuits.proofModuleBindingCommitment(binding),
  );
  let tree = new StateBoundedMerkleTree(PROOF_MODULE_BINDING_TREE_DEPTH);
  commitments.forEach((commitment, index) => {
    tree = tree.update(BigInt(index), alignedBytes32(commitment));
  });
  tree = tree.rehash();
  const rootValue = tree.root();
  if (rootValue === undefined) {
    throw new Error("proof-module binding tree did not produce a root");
  }
  const root = CompactTypeMerkleTreeDigest.fromValue(rootValue.value);
  const pathType = new CompactTypeMerkleTreePath(
    PROOF_MODULE_BINDING_TREE_DEPTH,
    Bytes32Descriptor,
  );
  return {
    root,
    rootHex: digestHex(root),
    commitments: commitments.map((value) => value.slice()),
    compactBindingAt(index) {
      const binding = compactBindings[index];
      if (binding === undefined) {
        throw new RangeError(
          "proof-module binding index is outside the manifest",
        );
      }
      return binding;
    },
    pathFor(index) {
      const commitment = commitments[index];
      if (commitment === undefined) {
        throw new RangeError(
          "proof-module binding index is outside the manifest",
        );
      }
      return pathType.fromValue(
        tree.pathForLeaf(BigInt(index), alignedBytes32(commitment)).value,
      );
    },
  };
}
