import {
  Bytes32Descriptor,
  CompactTypeField,
  CompactTypeMerkleTreePath,
  CompactTypeVector,
  StateBoundedMerkleTree,
  transientHash,
  type MerkleTreeDigest,
  type MerkleTreePath,
} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

import {
  pureCircuits,
  type RuntimeCredentialStatusCommand,
  type RuntimeCredentialStatusLeaf,
} from "../contracts/managed/permio-authorization/contract/index.js";
import { hashProtocolIdentifier } from "./canonical.ts";
import type { Hex32 } from "./model.ts";

export const CREDENTIAL_STATUS_TREE_DEPTH = 20;
export const RUNTIME_CREDENTIAL_KINDS = {
  account: 1n,
  capability: 2n,
  session: 3n,
} as const;
export const RUNTIME_CREDENTIAL_STATUSES = {
  empty: 0n,
  active: 1n,
  revoked: 2n,
} as const;

export type RuntimeCredentialKind = keyof typeof RUNTIME_CREDENTIAL_KINDS;
export type RuntimeCredentialStatus = "active" | "revoked";

export interface CredentialStatusEntry {
  readonly namespace: string;
  readonly kind: RuntimeCredentialKind;
  readonly credentialCommitment: Uint8Array;
  readonly revocationAuthorityAccountCredentialCommitment: Uint8Array;
  readonly statusIndex: bigint;
  readonly status: RuntimeCredentialStatus;
}

export interface CredentialStatusTransition {
  readonly previousRoot: MerkleTreeDigest;
  readonly nextRoot: MerkleTreeDigest;
  readonly path: MerkleTreePath<Uint8Array>;
  readonly previousSequence: bigint;
  readonly nextSequence: bigint;
}

/** Private witness preparation only; this is not an authorization or receipt. */
export interface CredentialStatusMultiproof {
  readonly witnessVersion: 1;
  readonly rootSequence: bigint;
  readonly leaves: readonly {
    readonly statusIndex: bigint;
    readonly leaf: Uint8Array;
  }[];
  /** Missing siblings in ascending (level, parent-index) order. */
  readonly siblings: readonly MerkleTreeDigest[];
}

export interface CredentialStatusMembershipPath {
  readonly statusIndex: bigint;
  readonly path: MerkleTreePath<Uint8Array>;
}

export interface CreateCredentialStatusCommandInput {
  readonly namespace: string;
  readonly governancePolicyHash: Hex32;
  readonly authorityRootVersion: number;
  readonly authorityRootSequence: number;
  readonly credentialStatusRootSequence: bigint;
  readonly kind: RuntimeCredentialKind;
  readonly credentialCommitment: Uint8Array;
  readonly revocationAuthorityAccountCredentialCommitment: Uint8Array;
  readonly statusIndex: bigint;
  readonly expectedStatus: "empty" | "active";
  readonly nextStatus: RuntimeCredentialStatus;
  readonly effectiveAt: number;
  readonly stagingExpiresAt?: number;
  readonly commandNonce: Hex32;
  readonly subjectAccountCredentialCommitment?: Uint8Array;
}

function bytes(hex: Hex32): Uint8Array {
  return Uint8Array.from(Buffer.from(hex.slice(2), "hex"));
}

function assertBytes32(value: Uint8Array, label: string): void {
  if (!(value instanceof Uint8Array) || value.length !== 32) {
    throw new TypeError(`${label} must be exactly 32 bytes`);
  }
}

function assertIndex(index: bigint): void {
  if (index < 0n || index >= 2n ** BigInt(CREDENTIAL_STATUS_TREE_DEPTH)) {
    throw new RangeError("credential status index is outside the depth-20 tree");
  }
}

function alignedBytes32(value: Uint8Array) {
  return {
    value: Bytes32Descriptor.toValue(value),
    alignment: Bytes32Descriptor.alignment(),
  };
}

function leafDigest(value: Uint8Array): MerkleTreeDigest {
  let tree = new StateBoundedMerkleTree(1);
  tree = tree.update(0n, alignedBytes32(value));
  tree = tree.update(1n, alignedBytes32(value)).rehash();
  const pathType = new CompactTypeMerkleTreePath(1, Bytes32Descriptor);
  const path = pathType.fromValue(
    tree.pathForLeaf(0n, alignedBytes32(value)).value,
  );
  return path.path[0]!.sibling;
}

const MERKLE_NODE_TYPE = new CompactTypeVector(2, CompactTypeField);

function nodeDigest(
  left: MerkleTreeDigest,
  right: MerkleTreeDigest,
): MerkleTreeDigest {
  return { field: transientHash(MERKLE_NODE_TYPE, [left.field, right.field]) };
}

function assertRootSequence(sequence: bigint): void {
  if (typeof sequence !== "bigint" || sequence < 0n || sequence >= 2n ** 64n) {
    throw new RangeError("credential status root sequence must fit Uint<64>");
  }
}

/** Reconstructs membership only; callers must separately check exact active leaves. */
export function credentialStatusMultiproofRoot(
  proof: CredentialStatusMultiproof,
): MerkleTreeDigest {
  if (proof.witnessVersion !== 1 || proof.leaves.length === 0) {
    throw new TypeError("credential status multiproof must contain v1 membership leaves");
  }
  assertRootSequence(proof.rootSequence);
  let previousIndex = -1n;
  let frontier = proof.leaves.map(({ statusIndex, leaf }) => {
    assertIndex(statusIndex);
    assertBytes32(leaf, "multiproof leaf");
    if (statusIndex <= previousIndex) {
      throw new TypeError("multiproof indices must be unique and strictly increasing");
    }
    previousIndex = statusIndex;
    return { index: statusIndex, digest: leafDigest(leaf), leaf };
  });
  let siblingOffset = 0;
  for (let level = 0; level < CREDENTIAL_STATUS_TREE_DEPTH; level += 1) {
    const parents: typeof frontier = [];
    for (let offset = 0; offset < frontier.length; offset += 1) {
      const current = frontier[offset]!;
      const goesLeft = (current.index & 1n) === 0n;
      const next = frontier[offset + 1];
      let sibling: MerkleTreeDigest;
      if (goesLeft && next?.index === current.index + 1n) {
        sibling = next.digest;
        offset += 1;
      } else {
        const supplied = proof.siblings[siblingOffset];
        if (supplied === undefined) {
          throw new TypeError("credential status multiproof is missing a sibling");
        }
        sibling = supplied;
        siblingOffset += 1;
      }
      // Bytes<32> leaves and interior Field nodes have different Compact
      // alignment. Use the generated leaf primitive at level zero exactly.
      const digest = level === 0
        ? pureCircuits.runtimeCredentialStatusLeafParent({
          leaf: current.leaf,
          path: [{ sibling, goes_left: goesLeft }],
        })
        : nodeDigest(
          goesLeft ? current.digest : sibling,
          goesLeft ? sibling : current.digest,
        );
      parents.push({ index: current.index >> 1n, digest, leaf: current.leaf });
    }
    frontier = parents;
  }
  if (siblingOffset !== proof.siblings.length || frontier.length !== 1) {
    throw new TypeError("credential status multiproof contains unused siblings or roots");
  }
  return frontier[0]!.digest;
}

export function verifyCredentialStatusMultiproof(
  proof: CredentialStatusMultiproof,
  expectedRoot: MerkleTreeDigest,
  expectedSequence: bigint,
): boolean {
  try {
    assertRootSequence(expectedSequence);
    return proof.rootSequence === expectedSequence &&
      credentialStatusMultiproofRoot(proof).field === expectedRoot.field;
  } catch {
    // Malformed private witnesses are rejection, never a trust grant.
    return false;
  }
}

export function buildCredentialStatusMultiproof(
  memberships: readonly CredentialStatusMembershipPath[],
  rootSequence: bigint,
): CredentialStatusMultiproof {
  assertRootSequence(rootSequence);
  if (memberships.length === 0) {
    throw new TypeError("credential status multiproof requires at least one leaf");
  }
  const sorted = [...memberships].sort((left, right) =>
    left.statusIndex < right.statusIndex ? -1 : left.statusIndex > right.statusIndex ? 1 : 0,
  );
  const firstRoot = pureCircuits.runtimeCredentialStatusPathRoot(sorted[0]!.path);
  const availableSiblings = new Map<string, MerkleTreeDigest>();
  let previousIndex = -1n;
  for (const { statusIndex, path } of sorted) {
    assertIndex(statusIndex);
    assertBytes32(path.leaf, "multiproof leaf");
    if (statusIndex <= previousIndex) {
      throw new TypeError("multiproof indices must be unique");
    }
    previousIndex = statusIndex;
    if (path.path.length !== CREDENTIAL_STATUS_TREE_DEPTH) {
      throw new TypeError("multiproof membership path must have depth 20");
    }
    let index = statusIndex;
    for (let level = 0; level < CREDENTIAL_STATUS_TREE_DEPTH; level += 1) {
      const step = path.path[level]!;
      if (step.goes_left !== ((index & 1n) === 0n)) {
        throw new TypeError("multiproof path does not match its exact status index");
      }
      const key = `${level}:${index ^ 1n}`;
      const existing = availableSiblings.get(key);
      if (existing !== undefined && existing.field !== step.sibling.field) {
        throw new TypeError("multiproof membership paths disagree on a shared branch");
      }
      availableSiblings.set(key, { field: step.sibling.field });
      index >>= 1n;
    }
    if (pureCircuits.runtimeCredentialStatusPathRoot(path).field !== firstRoot.field) {
      throw new TypeError("multiproof membership paths must share one exact root");
    }
  }
  let frontier = sorted.map(({ statusIndex }) => statusIndex);
  const siblings: MerkleTreeDigest[] = [];
  for (let level = 0; level < CREDENTIAL_STATUS_TREE_DEPTH; level += 1) {
    const parents: bigint[] = [];
    for (let offset = 0; offset < frontier.length; offset += 1) {
      const index = frontier[offset]!;
      if ((index & 1n) === 0n && frontier[offset + 1] === index + 1n) {
        offset += 1;
      } else {
        siblings.push(availableSiblings.get(`${level}:${index ^ 1n}`)!);
      }
      parents.push(index >> 1n);
    }
    frontier = parents;
  }
  const proof: CredentialStatusMultiproof = {
    witnessVersion: 1,
    rootSequence,
    leaves: sorted.map(({ statusIndex, path }) => ({
      statusIndex,
      leaf: path.leaf.slice(),
    })),
    siblings,
  };
  if (!verifyCredentialStatusMultiproof(proof, firstRoot, rootSequence)) {
    throw new TypeError("credential status multiproof does not reconstruct its source root");
  }
  return proof;
}

function statusCode(status: "empty" | RuntimeCredentialStatus): bigint {
  return RUNTIME_CREDENTIAL_STATUSES[status];
}

function toLeaf(entry: CredentialStatusEntry): RuntimeCredentialStatusLeaf {
  return {
    leafVersion: entry.kind === "account" ? 1n : entry.kind === "capability" ? 3n : 2n,
    namespaceHash: bytes(hashProtocolIdentifier("namespace", entry.namespace)),
    credentialKind: RUNTIME_CREDENTIAL_KINDS[entry.kind],
    credentialCommitment: entry.credentialCommitment,
    revocationAuthorityAccountCredentialCommitment:
      entry.revocationAuthorityAccountCredentialCommitment,
    statusIndex: entry.statusIndex,
    status: statusCode(entry.status),
  };
}

export function createRuntimeCredentialStatusCommand(
  input: CreateCredentialStatusCommandInput,
): RuntimeCredentialStatusCommand {
  assertIndex(input.statusIndex);
  assertRootSequence(input.credentialStatusRootSequence);
  assertBytes32(input.credentialCommitment, "credentialCommitment");
  assertBytes32(
    input.revocationAuthorityAccountCredentialCommitment,
    "revocationAuthorityAccountCredentialCommitment",
  );
  const stagingExpiresAt = input.stagingExpiresAt ?? 0;
  if (
    !Number.isSafeInteger(input.authorityRootVersion) ||
    !Number.isSafeInteger(input.authorityRootSequence) ||
    !Number.isSafeInteger(input.effectiveAt) ||
    !Number.isSafeInteger(stagingExpiresAt) ||
    input.authorityRootVersion < 0 ||
    input.authorityRootSequence < 0 ||
    input.effectiveAt < 0 ||
    stagingExpiresAt < 0
  ) {
    throw new TypeError("credential-status versions, sequences, and time must be non-negative safe integers");
  }
  if (
    (input.expectedStatus === "empty" && input.nextStatus !== "active") ||
    (input.expectedStatus === "active" && input.nextStatus !== "revoked")
  ) {
    throw new TypeError("credential status must transition empty-to-active or active-to-revoked");
  }
  const subject = input.subjectAccountCredentialCommitment ?? new Uint8Array(32);
  assertBytes32(subject, "subjectAccountCredentialCommitment");
  return {
    commandVersion: 3n,
    namespaceHash: bytes(hashProtocolIdentifier("namespace", input.namespace)),
    governancePolicyHash: bytes(input.governancePolicyHash),
    authorityRootVersion: BigInt(input.authorityRootVersion),
    authorityRootSequence: BigInt(input.authorityRootSequence),
    credentialStatusRootSequence: input.credentialStatusRootSequence,
    credentialKind: RUNTIME_CREDENTIAL_KINDS[input.kind],
    credentialCommitment: input.credentialCommitment.slice(),
    subjectAccountCredentialCommitment: subject.slice(),
    revocationAuthorityAccountCredentialCommitment:
      input.revocationAuthorityAccountCredentialCommitment.slice(),
    statusIndex: input.statusIndex,
    expectedStatus: statusCode(input.expectedStatus),
    nextStatus: statusCode(input.nextStatus),
    effectiveAt: BigInt(input.effectiveAt),
    stagingExpiresAt: BigInt(stagingExpiresAt),
    commandNonce: bytes(input.commandNonce),
  };
}

function sparseBytes32MerklePaths(
  rawLeaves: ReadonlyMap<bigint, Uint8Array>,
  statusIndexes: readonly bigint[],
): readonly MerkleTreePath<Uint8Array>[] {
  for (const statusIndex of statusIndexes) assertIndex(statusIndex);
  const emptyLeaf = new Uint8Array(32);
  const emptyDigests: MerkleTreeDigest[] = [leafDigest(emptyLeaf)];
  emptyDigests.push(
    pureCircuits.runtimeCredentialStatusLeafParent({
      leaf: emptyLeaf,
      path: [{ sibling: emptyDigests[0]!, goes_left: true }],
    }),
  );
  for (let level = 2; level <= CREDENTIAL_STATUS_TREE_DEPTH; level += 1) {
    const child = emptyDigests[level - 1]!;
    emptyDigests.push(nodeDigest(child, child));
  }

  const nodeLevels: Array<Map<bigint, MerkleTreeDigest>> = [new Map()];
  for (const [index, leaf] of rawLeaves) {
    assertIndex(index);
    assertBytes32(leaf, "sparse Merkle leaf");
    nodeLevels[0]!.set(index, leafDigest(leaf));
  }
  const leafParentIndexes = new Set(
    [...rawLeaves.keys()].map((index) => index >> 1n),
  );
  const firstParents = new Map<bigint, MerkleTreeDigest>();
  for (const parentIndex of leafParentIndexes) {
    const leftIndex = parentIndex << 1n;
    const left = rawLeaves.get(leftIndex) ?? emptyLeaf;
    const right = nodeLevels[0]!.get(leftIndex + 1n) ?? emptyDigests[0]!;
    firstParents.set(
      parentIndex,
      pureCircuits.runtimeCredentialStatusLeafParent({
        leaf: left,
        path: [{ sibling: right, goes_left: true }],
      }),
    );
  }
  nodeLevels.push(firstParents);
  for (let level = 1; level < CREDENTIAL_STATUS_TREE_DEPTH; level += 1) {
    const current = nodeLevels[level]!;
    const parentIndexes = new Set(
      [...current.keys()].map((index) => index >> 1n),
    );
    const parents = new Map<bigint, MerkleTreeDigest>();
    for (const parentIndex of parentIndexes) {
      const leftIndex = parentIndex << 1n;
      const left = current.get(leftIndex) ?? emptyDigests[level]!;
      const right = current.get(leftIndex + 1n) ?? emptyDigests[level]!;
      parents.set(parentIndex, nodeDigest(left, right));
    }
    nodeLevels.push(parents);
  }

  return statusIndexes.map((statusIndex) => {
    const leaf = (rawLeaves.get(statusIndex) ?? emptyLeaf).slice();
    const path = [] as MerkleTreePath<Uint8Array>["path"];
    let index = statusIndex;
    for (let level = 0; level < CREDENTIAL_STATUS_TREE_DEPTH; level += 1) {
      const siblingIndex = index ^ 1n;
      path.push({
        sibling: nodeLevels[level]!.get(siblingIndex) ?? emptyDigests[level]!,
        goes_left: (index & 1n) === 0n,
      });
      index >>= 1n;
    }
    return { leaf, path };
  });
}

export function sparseBytes32MerklePath(
  rawLeaves: ReadonlyMap<bigint, Uint8Array>,
  statusIndex: bigint,
): MerkleTreePath<Uint8Array> {
  return sparseBytes32MerklePaths(rawLeaves, [statusIndex])[0]!;
}

export class CredentialStatusTree {
  #entries = new Map<bigint, CredentialStatusEntry>();
  #rawLeaves = new Map<bigint, Uint8Array>();
  #sequence = 0n;

  get root(): MerkleTreeDigest {
    const path = this.pathFor(0n);
    return pureCircuits.runtimeCredentialStatusPathRoot(path);
  }

  get sequence(): bigint {
    return this.#sequence;
  }

  pathFor(statusIndex: bigint): MerkleTreePath<Uint8Array> {
    return sparseBytes32MerklePath(this.#rawLeaves, statusIndex);
  }

  /** Private membership preparation, including revoked/empty leaves if requested. */
  multiproofFor(statusIndexes: readonly bigint[]): CredentialStatusMultiproof {
    const paths = sparseBytes32MerklePaths(this.#rawLeaves, statusIndexes);
    return buildCredentialStatusMultiproof(
      statusIndexes.map((statusIndex, offset) => ({
        statusIndex,
        path: paths[offset]!,
      })),
      this.#sequence,
    );
  }

  issue(entry: Omit<CredentialStatusEntry, "status">): CredentialStatusTransition {
    assertIndex(entry.statusIndex);
    if (this.#entries.has(entry.statusIndex)) {
      throw new TypeError("credential status index is already occupied");
    }
    assertBytes32(entry.credentialCommitment, "credentialCommitment");
    assertBytes32(
      entry.revocationAuthorityAccountCredentialCommitment,
      "revocationAuthorityAccountCredentialCommitment",
    );
    return this.#replace({ ...entry, status: "active" });
  }

  revoke(entry: Omit<CredentialStatusEntry, "status">): CredentialStatusTransition {
    const current = this.#entries.get(entry.statusIndex);
    if (
      current === undefined ||
      current.status !== "active" ||
      Buffer.compare(Buffer.from(current.credentialCommitment), Buffer.from(entry.credentialCommitment)) !== 0 ||
      Buffer.compare(
        Buffer.from(current.revocationAuthorityAccountCredentialCommitment),
        Buffer.from(entry.revocationAuthorityAccountCredentialCommitment),
      ) !== 0 ||
      current.namespace !== entry.namespace ||
      current.kind !== entry.kind
    ) {
      throw new TypeError("credential revocation does not match the exact active status leaf");
    }
    return this.#replace({ ...entry, status: "revoked" });
  }

  #replace(next: CredentialStatusEntry): CredentialStatusTransition {
    const copied = {
      ...next,
      credentialCommitment: next.credentialCommitment.slice(),
      revocationAuthorityAccountCredentialCommitment:
        next.revocationAuthorityAccountCredentialCommitment.slice(),
    };
    // Validate/hash before mutating. Exact immutable leaf bytes can then be
    // reused across shared-path preparation instead of rehashing every entry.
    const leaf = pureCircuits.runtimeCredentialStatusLeafCommitment(toLeaf(copied));
    const previousRoot = this.root;
    const path = this.pathFor(next.statusIndex);
    this.#entries.set(next.statusIndex, copied);
    this.#rawLeaves.set(next.statusIndex, leaf);
    const previousSequence = this.#sequence;
    this.#sequence += 1n;
    return {
      previousRoot,
      nextRoot: this.root,
      path,
      previousSequence,
      nextSequence: this.#sequence,
    };
  }
}
