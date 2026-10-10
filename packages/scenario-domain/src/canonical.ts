import { createHash } from "node:crypto";

import {
  SCENARIO_TEMPLATE_HASH_ALGORITHM,
  SCENARIO_TEMPLATE_HASH_DOMAIN,
  type ScenarioTemplate,
  type ScenarioTemplateHash,
} from "./model.ts";
import { parseScenarioTemplate } from "./validation.ts";

type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalValue[]
  | { readonly [key: string]: CanonicalValue };

function canonicalizeValue(value: CanonicalValue): CanonicalValue {
  if (Array.isArray(value)) {
    return value.map(canonicalizeValue);
  }
  if (value !== null && typeof value === "object") {
    const object = value as { readonly [key: string]: CanonicalValue };
    return Object.fromEntries(
      Object.keys(object)
        .sort()
        .map((key) => [key, canonicalizeValue(object[key]!)]),
    );
  }
  return typeof value === "string" ? value.normalize("NFC") : value;
}

function lengthPrefix(value: Uint8Array): Buffer {
  const prefix = Buffer.allocUnsafe(4);
  prefix.writeUInt32BE(value.byteLength);
  return prefix;
}

export function canonicalizeScenarioTemplate(input: unknown): string {
  const template = parseScenarioTemplate(input);
  return JSON.stringify(canonicalizeValue(template as unknown as CanonicalValue));
}

export function serializeScenarioTemplate(input: unknown): Uint8Array {
  return new TextEncoder().encode(canonicalizeScenarioTemplate(input));
}

export function hashScenarioTemplate(input: unknown): ScenarioTemplateHash {
  const domain = new TextEncoder().encode(SCENARIO_TEMPLATE_HASH_DOMAIN);
  const payload = serializeScenarioTemplate(input);
  const digest = createHash(SCENARIO_TEMPLATE_HASH_ALGORITHM)
    .update(lengthPrefix(domain))
    .update(domain)
    .update(lengthPrefix(payload))
    .update(payload)
    .digest("hex");

  return {
    algorithm: SCENARIO_TEMPLATE_HASH_ALGORITHM,
    domain: SCENARIO_TEMPLATE_HASH_DOMAIN,
    value: `0x${digest}`,
  };
}

export function cloneScenarioTemplate(input: unknown): ScenarioTemplate {
  return parseScenarioTemplate(input);
}
