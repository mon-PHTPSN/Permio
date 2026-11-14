import {
  type MerkleTreeDigest,
  type MerkleTreePath,
} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

import {
  pureCircuits,
  type RuntimeScopeCounts,
  type RuntimeScopeElement,
  type RuntimeScopeProgress,
  type RuntimeScopeRoots,
} from "../contracts/managed/permio-authorization/contract/index.js";
import {
  RUNTIME_SCOPE_TREE_DEPTH,
  type RuntimeScopeTree,
  type RuntimeScopeTrees,
} from "./runtime-credentials.ts";
import { sparseBytes32MerklePath } from "./credential-status.ts";

export const RUNTIME_SCOPE_DIMENSIONS = {
  actions: 1n,
  resourceSelectors: 2n,
  resources: 3n,
  purposes: 4n,
  recipientKinds: 5n,
  recipients: 6n,
  disclosurePolicyIds: 7n,
} as const;

export type RuntimeScopeDimension = keyof typeof RUNTIME_SCOPE_DIMENSIONS;

export interface RuntimeScopeStage {
  readonly progress: RuntimeScopeProgress;
  readonly nextProgress: RuntimeScopeProgress;
  readonly element: RuntimeScopeElement;
  readonly childPath: MerkleTreePath<Uint8Array>;
  readonly parentPath: MerkleTreePath<Uint8Array>;
  readonly elementIndex: bigint;
  readonly totalElementCount: bigint;
}

class SparseScopeTree {
  readonly #leaves = new Map<bigint, Uint8Array>();
  #count = 0n;

  get count(): bigint {
    return this.#count;
  }

  get root(): MerkleTreeDigest {
    return pureCircuits.runtimeCredentialStatusPathRoot(
      sparseBytes32MerklePath(this.#leaves, 0n),
    );
  }

  insert(valueHash: Uint8Array): MerkleTreePath<Uint8Array> {
    if (!(valueHash instanceof Uint8Array) || valueHash.length !== 32) {
      throw new TypeError("runtime scope value hash must be exactly 32 bytes");
    }
    const index = this.#count;
    if (index >= 2n ** BigInt(RUNTIME_SCOPE_TREE_DEPTH)) {
      throw new RangeError("runtime scope exceeds the depth-20 tree capacity");
    }
    const path = sparseBytes32MerklePath(this.#leaves, index);
    this.#leaves.set(index, pureCircuits.runtimeScopeValueCommitment(valueHash));
    this.#count += 1n;
    return path;
  }
}

function roots(trees: Readonly<Record<RuntimeScopeDimension, SparseScopeTree>>): RuntimeScopeRoots {
  return {
    actionsRoot: trees.actions.root,
    resourceSelectorsRoot: trees.resourceSelectors.root,
    resourcesRoot: trees.resources.root,
    purposesRoot: trees.purposes.root,
    recipientKindsRoot: trees.recipientKinds.root,
    recipientsRoot: trees.recipients.root,
    disclosurePolicyIdsRoot: trees.disclosurePolicyIds.root,
  };
}

function counts(trees: Readonly<Record<RuntimeScopeDimension, SparseScopeTree>>): RuntimeScopeCounts {
  return {
    actionsCount: trees.actions.count,
    resourceSelectorsCount: trees.resourceSelectors.count,
    resourcesCount: trees.resources.count,
    purposesCount: trees.purposes.count,
    recipientKindsCount: trees.recipientKinds.count,
    recipientsCount: trees.recipients.count,
    disclosurePolicyIdsCount: trees.disclosurePolicyIds.count,
  };
}

function newTrees(): Record<RuntimeScopeDimension, SparseScopeTree> {
  return {
    actions: new SparseScopeTree(),
    resourceSelectors: new SparseScopeTree(),
    resources: new SparseScopeTree(),
    purposes: new SparseScopeTree(),
    recipientKinds: new SparseScopeTree(),
    recipients: new SparseScopeTree(),
    disclosurePolicyIds: new SparseScopeTree(),
  };
}

function progress(
  trees: Readonly<Record<RuntimeScopeDimension, SparseScopeTree>>,
  lastDimension = 0n,
  lastOrderKey = new Uint8Array(32),
): RuntimeScopeProgress {
  return {
    roots: roots(trees),
    counts: counts(trees),
    lastDimension,
    lastOrderKey: lastOrderKey.slice(),
  };
}

export function createEmptyRuntimeScopeProgress(): RuntimeScopeProgress {
  return progress(newTrees());
}

export class CapabilityAttenuationPlan {
  readonly #trees = newTrees();
  readonly #elements: ReadonlyArray<{
    readonly dimension: RuntimeScopeDimension;
    readonly valueHash: Uint8Array;
    readonly parentTree?: RuntimeScopeTree;
  }>;
  #nextIndex = 0;
  #lastDimension = 0n;
  #lastOrderKey = new Uint8Array(32);

  constructor(child: RuntimeScopeTrees, parent?: RuntimeScopeTrees) {
    this.#elements = (Object.keys(RUNTIME_SCOPE_DIMENSIONS) as RuntimeScopeDimension[])
      .flatMap((dimension) => child[dimension].valueHashes.map((valueHash) => ({
        dimension,
        valueHash: valueHash.slice(),
        parentTree: parent?.[dimension],
      })));
  }

  get totalElementCount(): bigint {
    return BigInt(this.#elements.length);
  }

  get complete(): boolean {
    return this.#nextIndex === this.#elements.length;
  }

  get currentProgress(): RuntimeScopeProgress {
    return progress(this.#trees, this.#lastDimension, this.#lastOrderKey);
  }

  stageNext(): RuntimeScopeStage {
    const entry = this.#elements[this.#nextIndex];
    if (entry === undefined) {
      throw new TypeError("capability attenuation plan is already complete");
    }
    const before = this.currentProgress;
    const parentMembershipPath = entry.parentTree?.pathForHash(entry.valueHash);
    const childPath = this.#trees[entry.dimension].insert(entry.valueHash);
    const parentPath = parentMembershipPath ?? childPath;
    this.#lastDimension = RUNTIME_SCOPE_DIMENSIONS[entry.dimension];
    this.#lastOrderKey = entry.valueHash.slice();
    const stage = {
      progress: before,
      nextProgress: this.currentProgress,
      element: {
        elementVersion: 1n,
        dimension: RUNTIME_SCOPE_DIMENSIONS[entry.dimension],
        valueHash: entry.valueHash.slice(),
      },
      childPath,
      parentPath,
      elementIndex: BigInt(this.#nextIndex),
      totalElementCount: this.totalElementCount,
    } satisfies RuntimeScopeStage;
    this.#nextIndex += 1;
    return stage;
  }
}

/** Sessions always require parent membership; there is no root-session mode. */
export class SessionAttenuationPlan extends CapabilityAttenuationPlan {
  constructor(session: RuntimeScopeTrees, capability: RuntimeScopeTrees) {
    if (capability === undefined) throw new TypeError("session certification requires its parent capability scope");
    super(session, capability);
  }
}
