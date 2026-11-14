import type { MerkleTreeDigest, MerkleTreePath } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { pureCircuits as pure, type RuntimePrivateMapNode, type RuntimePrivateMapWitness } from "../contracts/managed/permio-authorization/contract/index.js";
import { sparseBytes32MerklePath } from "./credential-status.ts";

const zero = () => new Uint8Array(32);
const hex = (value: Uint8Array) => Buffer.from(value).toString("hex");
function bytes(value: Uint8Array): void {
  if (!(value instanceof Uint8Array) || value.length !== 32 || value.every((byte) => byte === 0)) {
    throw new TypeError("private map keys and values require nonzero 32-byte values");
  }
}

export interface PrivateMapInsertion {
  readonly previousRoot: MerkleTreeDigest;
  readonly previousCount: bigint;
  readonly predecessor: RuntimePrivateMapWitness;
  /** Exact empty path AFTER linking the predecessor, not a stale first-root path. */
  readonly appendPath: MerkleTreePath<Uint8Array>;
  readonly nextRoot: MerkleTreeDigest;
}

/** Private witness builder only. Its roots become authoritative only through a
 * verified ledger transition; a host mutation is not slot issuance or a receipt. */
export class RuntimePrivateMap {
  readonly #nodes = new Map<bigint, RuntimePrivateMapNode>([[0n, {
    nodeVersion: 1n, key: zero(), value: zero(), nextKey: zero(), nextIndex: 0n,
  }]]);
  readonly #raw = new Map<bigint, Uint8Array>();
  constructor() { this.#raw.set(0n, pure.runtimePrivateMapNodeCommitment(this.#nodes.get(0n)!)); }
  get count(): bigint { return BigInt(this.#nodes.size); }
  get root(): MerkleTreeDigest {
    return pure.runtimeCredentialStatusPathRoot(sparseBytes32MerklePath(this.#raw, 0n));
  }
  witnessFor(key: Uint8Array): RuntimePrivateMapWitness {
    bytes(key);
    const ordered = [...this.#nodes].sort((left, right) => Buffer.compare(left[1].key, right[1].key));
    const exact = ordered.find(([, node]) => hex(node.key) === hex(key));
    const candidate = exact ?? ordered.filter(([, node]) => hex(node.key) < hex(key)).at(-1)!;
    return structuredClone({ node: candidate[1], path: sparseBytes32MerklePath(this.#raw, candidate[0]) });
  }
  planInsert(key: Uint8Array, value: Uint8Array): PrivateMapInsertion {
    bytes(key); bytes(value);
    const predecessor = this.witnessFor(key), previousRoot = this.root, previousCount = this.count;
    pure.assertRuntimePrivateMapAbsence(previousRoot, previousCount, key, predecessor);
    if (previousCount >= 1_048_576n) throw new RangeError("private map exceeds depth-20 physical capacity");
    const intermediate = new Map(this.#raw);
    intermediate.set(pure.runtimeCredentialStatusPathIndex(predecessor.path), pure.runtimePrivateMapNodeCommitment({
      ...predecessor.node, nextKey: key.slice(), nextIndex: previousCount,
    }));
    const appendPath = sparseBytes32MerklePath(intermediate, previousCount);
    const nextRoot = pure.runtimePrivateMapInsert(previousRoot, previousCount, key, value, predecessor, appendPath);
    return structuredClone({ previousRoot, previousCount, predecessor, appendPath, nextRoot });
  }
  insert(key: Uint8Array, value: Uint8Array): PrivateMapInsertion {
    const plan = this.planInsert(key, value);
    const previous = plan.predecessor.node;
    const index = pure.runtimeCredentialStatusPathIndex(plan.predecessor.path);
    const linked = { ...previous, nextKey: key.slice(), nextIndex: this.count };
    const node = { nodeVersion: 1n, key: key.slice(), value: value.slice(), nextKey: previous.nextKey.slice(), nextIndex: previous.nextIndex };
    this.#nodes.set(index, linked); this.#raw.set(index, pure.runtimePrivateMapNodeCommitment(linked));
    this.#nodes.set(plan.previousCount, node); this.#raw.set(plan.previousCount, pure.runtimePrivateMapNodeCommitment(node));
    return plan;
  }
  replace(key: Uint8Array, oldValue: Uint8Array, nextValue: Uint8Array): RuntimePrivateMapWitness {
    bytes(key); bytes(oldValue); bytes(nextValue);
    const witness = this.witnessFor(key);
    pure.runtimePrivateMapReplace(this.root, this.count, key, oldValue, nextValue, witness);
    const index = pure.runtimeCredentialStatusPathIndex(witness.path);
    const next = { ...witness.node, value: nextValue.slice() };
    this.#nodes.set(index, next); this.#raw.set(index, pure.runtimePrivateMapNodeCommitment(next));
    return witness;
  }
}
