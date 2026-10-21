// Synthetic-genesis helpers for generated Compact tests only. Never export from
// the application package or use these to prepare a live deployment.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Bytes32Descriptor, CompactTypeBoolean, CompactTypeField, CompactTypeUnsignedInteger,
  ChargedState, StateValue } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

export const generatedInfo = JSON.parse(readFileSync(new URL(
  "../../contracts/managed/permio-authorization/compiler/contract-info.json", import.meta.url), "utf8"));
export function generatedDescriptor(type: any): any {
  if (type["type-name"] === "Bytes") { assert.equal(type.length, 32); return Bytes32Descriptor; }
  if (type["type-name"] === "Boolean") return CompactTypeBoolean;
  if (type["type-name"] === "Field") return CompactTypeField;
  if (type["type-name"] === "Uint") {
    const bits = Math.ceil(Math.log2(type.maxval + 1));
    return new CompactTypeUnsignedInteger((1n << BigInt(bits)) - 1n, Math.ceil(bits / 8));
  }
  assert.equal(type["type-name"], "Struct");
  const fields = type.elements.map((field: any) => [field.name, generatedDescriptor(field.type)]);
  return { alignment: () => fields.flatMap(([, field]: any) => field.alignment()),
    toValue: (value: any) => fields.flatMap(([name, field]: any) => field.toValue(value[name])) };
}
export function emptyGeneratedValue(type: any): any {
  if (type["type-name"] === "Bytes") return new Uint8Array(type.length);
  if (type["type-name"] === "Boolean") return false;
  if (["Uint", "Field"].includes(type["type-name"])) return 0n;
  assert.equal(type["type-name"], "Struct");
  return Object.fromEntries(type.elements.map((field: any) => [field.name, emptyGeneratedValue(field.type)]));
}
export function emptyGeneratedMapValue(name: string): any {
  return emptyGeneratedValue(generatedInfo.ledger.find((entry: any) => entry.name === name).value);
}
export function seedGeneratedMap(source: StateValue | ChargedState, name: string, key: unknown, value: unknown): StateValue {
  const schema = generatedInfo.ledger.find((entry: any) => entry.name === name);
  assert.equal(schema.storage, "Map");
  const keyType = generatedDescriptor(schema.key), valueType = generatedDescriptor(schema.value);
  const aligned = { value: keyType.toValue(key), alignment: keyType.alignment() };
  const cell = StateValue.newCell({ value: valueType.toValue(value), alignment: valueType.alignment() });
  function replace(node: StateValue, route: number[]): StateValue {
    if (!route.length) return StateValue.newMap(node.asMap()!.insert(aligned, cell));
    const array = node.asArray(); assert(array && array[route[0]!]);
    return array.reduce((result, child, index) => result.arrayPush(index === route[0]
      ? replace(child, route.slice(1)) : child), StateValue.newArray());
  }
  return replace(source instanceof ChargedState ? source.state : source, schema.index);
}
