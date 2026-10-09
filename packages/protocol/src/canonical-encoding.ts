import { bytesToHex, keccak256, type Hex } from "viem";

export const CANONICAL_ENCODING_VERSION = "permio:canonical:v1" as const;

const textEncoder = new TextEncoder();

export type CanonicalField = string | Uint8Array;

function asBytes(value: CanonicalField): Uint8Array {
  return typeof value === "string" ? textEncoder.encode(value) : value;
}

function encodeUint32(value: number): Uint8Array {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new RangeError("Canonical field count or length exceeds uint32");
  }

  const encoded = new Uint8Array(4);
  new DataView(encoded.buffer).setUint32(0, value, false);
  return encoded;
}

export function encodeLengthDelimited(
  fields: readonly CanonicalField[],
): Uint8Array {
  const encodedFields = fields.map(asBytes);
  const totalLength = encodedFields.reduce(
    (total, field) => total + 4 + field.byteLength,
    4,
  );
  const result = new Uint8Array(totalLength);
  let offset = 0;

  result.set(encodeUint32(encodedFields.length), offset);
  offset += 4;

  for (const field of encodedFields) {
    result.set(encodeUint32(field.byteLength), offset);
    offset += 4;
    result.set(field, offset);
    offset += field.byteLength;
  }

  return result;
}

export function encodeCanonical(
  domain: string,
  fields: readonly CanonicalField[],
): Uint8Array {
  if (domain.length === 0) {
    throw new TypeError("Canonical encoding domain must not be empty");
  }

  return encodeLengthDelimited([
    CANONICAL_ENCODING_VERSION,
    domain,
    ...fields,
  ]);
}

export function encodeCanonicalHex(
  domain: string,
  fields: readonly CanonicalField[],
): Hex {
  return bytesToHex(encodeCanonical(domain, fields));
}

export function hashCanonical(
  domain: string,
  fields: readonly CanonicalField[],
): Hex {
  return keccak256(encodeCanonicalHex(domain, fields));
}
