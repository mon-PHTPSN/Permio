import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RuntimePrivateMap, permioAuthorizationPureCircuits as pure } from "../src/index.ts";

const bytes = (value: number) => new Uint8Array(32).fill(value);
describe("private authenticated sorted map (witness preparation, not slot authority)", () => {
  it("matches the constant sentinel root and inserts full keys in any lexical order", () => {
    const map = new RuntimePrivateMap();
    assert.deepEqual(map.root, pure.runtimePrivateMapEmptyRoot());
    assert.equal(map.count, 1n);
    for (const key of [99, 5, 250, 100, 9]) {
      const plan = map.insert(bytes(key), bytes(key + 1));
      assert.deepEqual(plan.nextRoot, map.root);
      assert.equal(map.count, plan.previousCount + 1n);
      const witness = map.witnessFor(bytes(key));
      pure.assertRuntimePrivateMapNode(map.root, map.count, witness);
      assert.deepEqual(witness.node.key, bytes(key));
    }
    pure.assertRuntimePrivateMapAbsence(map.root, map.count, bytes(7), map.witnessFor(bytes(7)));
  });

  it("rejects duplicate keys, wrong predecessors, stale paths and wrong physical append positions", () => {
    const map = new RuntimePrivateMap(); map.insert(bytes(10), bytes(11));
    const root = map.root;
    assert.throws(() => map.insert(bytes(10), bytes(12)), /already exists/);
    const plan = map.planInsert(bytes(12), bytes(13));
    assert.deepEqual(map.root, root); assert.equal(map.count, 2n);
    assert.throws(() => pure.runtimePrivateMapInsert(root, 2n, bytes(12), bytes(13),
      map.witnessFor(bytes(1)), plan.appendPath), /already exists|predecessor/);
    const flipped = { ...plan.appendPath, path: plan.appendPath.path.map((entry, index) =>
      index === 0 ? { ...entry, goes_left: !entry.goes_left } : entry) };
    assert.throws(() => pure.runtimePrivateMapInsert(root, 2n, bytes(12), bytes(13), plan.predecessor, flipped), /next empty index/);
    map.insert(bytes(9), bytes(14));
    assert.throws(() => pure.runtimePrivateMapInsert(map.root, map.count, bytes(12), bytes(13), plan.predecessor, plan.appendPath), /current root/);
  });

  it("replaces only an exact value without changing keys, successor links or count", () => {
    const map = new RuntimePrivateMap(); map.insert(bytes(10), bytes(11)); map.insert(bytes(12), bytes(13));
    const before = map.witnessFor(bytes(10)), count = map.count, root = map.root;
    const expected = pure.runtimePrivateMapReplace(root, count, bytes(10), bytes(11), bytes(15), before);
    assert.throws(() => map.replace(bytes(10), bytes(99), bytes(15)), /exact key/);
    assert.deepEqual(map.root, root);
    map.replace(bytes(10), bytes(11), bytes(15));
    assert.deepEqual(map.root, expected); assert.equal(map.count, count);
    const after = map.witnessFor(bytes(10));
    assert.deepEqual(after.node.nextKey, before.node.nextKey); assert.equal(after.node.nextIndex, before.node.nextIndex);
    assert.throws(() => map.replace(bytes(11), bytes(15), bytes(16)), /exact key/);
  });

  it("compares all 32 bytes and does not reuse the scope's 64-bit ordering key", () => {
    const left = bytes(1), right = left.slice(); right[0] = 2;
    assert.equal(pure.runtimePrivateMapKeyLess(left, right), true);
    assert.equal(pure.runtimePrivateMapKeyLess(right, left), false);
    assert.equal(pure.runtimePrivateMapKeyLess(left, left), false);
    const map = new RuntimePrivateMap(); map.insert(left, bytes(7)); map.insert(right, bytes(8));
    assert.equal(map.count, 3n);
  });

  it("isolates inputs and returned openings and rejects empty keys or values before mutation", () => {
    const map = new RuntimePrivateMap(), key = bytes(10), value = bytes(11);
    map.insert(key, value); key.fill(0); value.fill(0);
    const root = map.root, witness = map.witnessFor(bytes(10)); witness.node.value.fill(0); witness.path.leaf.fill(0);
    assert.deepEqual(map.witnessFor(bytes(10)).node.value, bytes(11)); assert.deepEqual(map.root, root);
    for (const [k, v] of [[bytes(0), bytes(3)], [bytes(4), bytes(0)], [new Uint8Array(31), bytes(3)]]) {
      assert.throws(() => map.insert(k!, v!), /nonzero 32/);
      assert.deepEqual(map.root, root);
    }
  });
});
