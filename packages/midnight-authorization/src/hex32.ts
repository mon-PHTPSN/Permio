import type { Hex32 } from "./model.ts";

export function decodeHex32(value: Hex32): Uint8Array {
  if (typeof value !== "string" || !/^0x[0-9a-f]{64}$/u.test(value)) {
    throw new TypeError("Expected a lowercase 32-byte hexadecimal digest");
  }
  return Uint8Array.from(Buffer.from(value.slice(2), "hex"));
}
