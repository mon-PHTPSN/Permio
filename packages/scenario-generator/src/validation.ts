import {
  hashScenarioTemplate,
  parseScenarioTemplate,
  type ScenarioTemplateHash,
} from "@permio/scenario-domain";

import {
  POLICY_PROFILE_SCHEMA_VERSION,
  SCENARIO_GENERATOR_VERSION,
  type GeneratorPolicyProfile,
  type ScenarioGeneratorInput,
} from "./model.ts";

export const SCENARIO_GENERATOR_ERROR_CODES = [
  "INVALID_INPUT",
  "UNSUPPORTED_GENERATOR_VERSION",
  "TEMPLATE_HASH_MISMATCH",
  "INVALID_TEST_SEED",
  "INVALID_POLICY_PROFILE",
] as const;

export type ScenarioGeneratorErrorCode =
  (typeof SCENARIO_GENERATOR_ERROR_CODES)[number];

export class ScenarioGeneratorError extends TypeError {
  readonly code: ScenarioGeneratorErrorCode;
  readonly path: string;

  constructor(code: ScenarioGeneratorErrorCode, path: string, message: string) {
    super(`${code} at ${path}: ${message}`);
    this.name = "ScenarioGeneratorError";
    this.code = code;
    this.path = path;
  }
}

type UnknownObject = Record<string, unknown>;

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const SEMANTIC_VERSION_PATTERN =
  /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

function fail(
  code: ScenarioGeneratorErrorCode,
  path: string,
  message: string,
): never {
  throw new ScenarioGeneratorError(code, path, message);
}

function readObject(value: unknown, path: string): UnknownObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail("INVALID_INPUT", path, "expected a plain object");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return fail("INVALID_INPUT", path, "expected a plain object");
  }
  for (const [key, descriptor] of Object.entries(
    Object.getOwnPropertyDescriptors(value),
  )) {
    if (
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !descriptor.enumerable
    ) {
      return fail("INVALID_INPUT", `${path}.${key}`, "expected inert JSON data");
    }
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    return fail("INVALID_INPUT", path, "symbol properties are not JSON data");
  }
  return value as UnknownObject;
}

function exactKeys(
  object: UnknownObject,
  expected: readonly string[],
  path: string,
): void {
  for (const key of expected) {
    if (!Object.hasOwn(object, key)) {
      fail("INVALID_INPUT", `${path}.${key}`, "required field is missing");
    }
  }
  for (const key of Object.keys(object)) {
    if (!expected.includes(key)) {
      fail("INVALID_INPUT", `${path}.${key}`, "unknown field");
    }
  }
}

function readString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    return fail("INVALID_INPUT", path, "expected a string");
  }
  const normalized = value.normalize("NFC");
  if (normalized.length === 0 || normalized.trim() !== normalized) {
    return fail("INVALID_INPUT", path, "expected a non-empty normalized string");
  }
  return normalized;
}

function readInteger(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isSafeInteger(value)) {
    return fail("INVALID_INPUT", path, "expected a safe integer");
  }
  const number = value as number;
  if (number < minimum || number > maximum) {
    return fail("INVALID_INPUT", path, `expected ${minimum} through ${maximum}`);
  }
  return number;
}

function readTemplateHash(value: unknown): ScenarioTemplateHash {
  const path = "ScenarioGeneratorInput.templateHash";
  const object = readObject(value, path);
  exactKeys(object, ["algorithm", "domain", "value"], path);
  if (object.algorithm !== "sha256") {
    return fail("INVALID_INPUT", `${path}.algorithm`, "expected sha256");
  }
  if (object.domain !== "permio:scenario-template:v1") {
    return fail("INVALID_INPUT", `${path}.domain`, "unexpected hash domain");
  }
  if (
    typeof object.value !== "string" ||
    !/^0x[0-9a-f]{64}$/.test(object.value)
  ) {
    return fail("INVALID_INPUT", `${path}.value`, "expected a lowercase SHA-256 hex value");
  }
  return object as unknown as ScenarioTemplateHash;
}

export function parseGeneratorPolicyProfile(
  value: unknown,
): GeneratorPolicyProfile {
  const path = "GeneratorPolicyProfile";
  const object = readObject(value, path);
  exactKeys(
    object,
    [
      "schemaVersion",
      "id",
      "version",
      "baseTimestamp",
      "eventIntervalSeconds",
      "syntheticValueBytes",
    ],
    path,
  );
  if (object.schemaVersion !== POLICY_PROFILE_SCHEMA_VERSION) {
    fail(
      "INVALID_POLICY_PROFILE",
      `${path}.schemaVersion`,
      `expected ${POLICY_PROFILE_SCHEMA_VERSION}`,
    );
  }
  const id = readString(object.id, `${path}.id`);
  if (!IDENTIFIER_PATTERN.test(id)) {
    fail("INVALID_POLICY_PROFILE", `${path}.id`, "expected a lowercase identifier");
  }
  const version = readString(object.version, `${path}.version`);
  if (!SEMANTIC_VERSION_PATTERN.test(version)) {
    fail("INVALID_POLICY_PROFILE", `${path}.version`, "expected MAJOR.MINOR.PATCH");
  }
  const baseTimestamp = readString(
    object.baseTimestamp,
    `${path}.baseTimestamp`,
  );
  const parsedTimestamp = Date.parse(baseTimestamp);
  if (
    !Number.isSafeInteger(parsedTimestamp) ||
    new Date(parsedTimestamp).toISOString() !== baseTimestamp
  ) {
    fail(
      "INVALID_POLICY_PROFILE",
      `${path}.baseTimestamp`,
      "expected a canonical UTC ISO-8601 timestamp",
    );
  }
  return {
    schemaVersion: POLICY_PROFILE_SCHEMA_VERSION,
    id,
    version,
    baseTimestamp,
    eventIntervalSeconds: readInteger(
      object.eventIntervalSeconds,
      `${path}.eventIntervalSeconds`,
      1,
      86_400,
    ),
    syntheticValueBytes: readInteger(
      object.syntheticValueBytes,
      `${path}.syntheticValueBytes`,
      16,
      32,
    ),
  };
}

export function parseScenarioGeneratorInput(
  value: unknown,
): ScenarioGeneratorInput {
  const path = "ScenarioGeneratorInput";
  const object = readObject(value, path);
  exactKeys(
    object,
    [
      "template",
      "templateHash",
      "generatorVersion",
      "explicitSeed",
      "policyProfile",
    ],
    path,
  );
  if (object.generatorVersion !== SCENARIO_GENERATOR_VERSION) {
    fail(
      "UNSUPPORTED_GENERATOR_VERSION",
      `${path}.generatorVersion`,
      `expected ${SCENARIO_GENERATOR_VERSION}`,
    );
  }
  const explicitSeed = readString(object.explicitSeed, `${path}.explicitSeed`);
  if (!/^test:[\x21-\x7e]{1,250}$/.test(explicitSeed)) {
    fail(
      "INVALID_TEST_SEED",
      `${path}.explicitSeed`,
      "deterministic fixture seeds must start with 'test:' and contain printable ASCII",
    );
  }
  const template = parseScenarioTemplate(object.template);
  const templateHash = readTemplateHash(object.templateHash);
  const actualHash = hashScenarioTemplate(template);
  if (actualHash.value !== templateHash.value) {
    fail(
      "TEMPLATE_HASH_MISMATCH",
      `${path}.templateHash.value`,
      `expected ${actualHash.value}`,
    );
  }
  return {
    template,
    templateHash: actualHash,
    generatorVersion: SCENARIO_GENERATOR_VERSION,
    explicitSeed,
    policyProfile: parseGeneratorPolicyProfile(object.policyProfile),
  };
}
