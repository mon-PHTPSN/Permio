import { createHash } from "node:crypto";

type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalValue[]
  | { readonly [key: string]: CanonicalValue };

function canonicalizeValue(
  value: unknown,
  path: string,
  ancestors: ReadonlySet<object>,
): CanonicalValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return typeof value === "string" ? value.normalize("NFC") : value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new TypeError(`${path} must contain a finite JSON number other than -0`);
    }
    return value;
  }
  if (typeof value !== "object") {
    throw new TypeError(`${path} contains a value that is not canonical JSON data`);
  }
  if (ancestors.has(value)) {
    throw new TypeError(`${path} contains a circular reference`);
  }
  const nextAncestors = new Set(ancestors).add(value);
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      canonicalizeValue(item, `${path}[${index}]`, nextAncestors),
    );
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must contain only plain objects`);
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    throw new TypeError(`${path} must not contain symbol properties`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !descriptor.enumerable
    ) {
      throw new TypeError(`${path}.${key} must be inert enumerable data`);
    }
  }
  const object = value as { readonly [key: string]: unknown };
    return Object.fromEntries(
      Object.keys(object)
        .sort()
      .map((key) => [
        key.normalize("NFC"),
        canonicalizeValue(object[key], `${path}.${key}`, nextAncestors),
      ]),
    );
}

export function canonicalizeGeneratorValue(value: unknown): string {
  return JSON.stringify(canonicalizeValue(value, "$", new Set()));
}

export function serializeGeneratorValue(value: unknown): Uint8Array {
  return new TextEncoder().encode(canonicalizeGeneratorValue(value));
}

export function sha256Hex(value: Uint8Array | string): `0x${string}` {
  return `0x${createHash("sha256").update(value).digest("hex")}`;
}

export function bytesToHex(value: Uint8Array): `0x${string}` {
  return `0x${Buffer.from(value).toString("hex")}`;
}

export function hexToBytes(value: string): Uint8Array {
  if (!/^0x(?:[0-9a-f]{2})*$/.test(value)) {
    throw new TypeError("Expected lowercase, even-length hexadecimal bytes");
  }
  return Buffer.from(value.slice(2), "hex");
}

export function frame(...parts: readonly (Uint8Array | string)[]): Buffer {
  const buffers: Buffer[] = [];
  for (const part of parts) {
    const value = typeof part === "string" ? Buffer.from(part, "utf8") : Buffer.from(part);
    const prefix = Buffer.allocUnsafe(4);
    prefix.writeUInt32BE(value.byteLength);
    buffers.push(prefix, value);
  }
  return Buffer.concat(buffers);
}

export function hashDomainSeparated(
  domain: string,
  ...parts: readonly (Uint8Array | string)[]
): `0x${string}` {
  return sha256Hex(frame(domain, ...parts));
}
