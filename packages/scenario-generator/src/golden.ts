import {
  bytesToHex,
  hashDomainSeparated,
  serializeGeneratorValue,
} from "./canonical.ts";
import { generateScenario } from "./generator.ts";
import {
  GOLDEN_VECTOR_FORMAT_VERSION,
  SCENARIO_GENERATOR_DOMAINS,
  type GoldenVectorV1,
} from "./model.ts";
import { parseScenarioGeneratorInput } from "./validation.ts";

export function createGoldenVector(inputValue: unknown): GoldenVectorV1 {
  const input = parseScenarioGeneratorInput(inputValue);
  const generated = generateScenario(input);
  const canonicalOutput = serializeGeneratorValue(generated);
  return {
    formatVersion: GOLDEN_VECTOR_FORMAT_VERSION,
    classification: "private-test-artifact",
    input,
    expected: {
      canonicalOutputHex: bytesToHex(canonicalOutput),
      outputSha256: hashDomainSeparated(
        SCENARIO_GENERATOR_DOMAINS.goldenOutputHash,
        canonicalOutput,
      ),
    },
  };
}

function readObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${path} must be a plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  path: string,
): void {
  if (
    Object.keys(value).length !== expected.length ||
    expected.some((key) => !Object.hasOwn(value, key))
  ) {
    throw new TypeError(`${path} has missing or unknown fields`);
  }
}

export function parseGoldenVector(value: unknown): GoldenVectorV1 {
  const vector = readObject(value, "GoldenVector");
  assertExactKeys(
    vector,
    ["formatVersion", "classification", "input", "expected"],
    "GoldenVector",
  );
  if (vector.formatVersion !== GOLDEN_VECTOR_FORMAT_VERSION) {
    throw new TypeError(`Unsupported golden-vector format ${String(vector.formatVersion)}`);
  }
  if (vector.classification !== "private-test-artifact") {
    throw new TypeError("Golden vectors must be classified private-test-artifact");
  }
  const input = parseScenarioGeneratorInput(vector.input);
  const expected = readObject(vector.expected, "GoldenVector.expected");
  assertExactKeys(
    expected,
    ["canonicalOutputHex", "outputSha256"],
    "GoldenVector.expected",
  );
  if (
    typeof expected.canonicalOutputHex !== "string" ||
    !/^0x(?:[0-9a-f]{2})+$/.test(expected.canonicalOutputHex)
  ) {
    throw new TypeError("GoldenVector.expected.canonicalOutputHex must be lowercase bytes");
  }
  if (
    typeof expected.outputSha256 !== "string" ||
    !/^0x[0-9a-f]{64}$/.test(expected.outputSha256)
  ) {
    throw new TypeError("GoldenVector.expected.outputSha256 must be a SHA-256 digest");
  }
  return {
    formatVersion: GOLDEN_VECTOR_FORMAT_VERSION,
    classification: "private-test-artifact",
    input,
    expected: {
      canonicalOutputHex: expected.canonicalOutputHex as `0x${string}`,
      outputSha256: expected.outputSha256 as `0x${string}`,
    },
  };
}

export function verifyGoldenVector(value: unknown): boolean {
  try {
    const vector = parseGoldenVector(value);
    const generated = generateScenario(vector.input);
    const canonicalOutput = serializeGeneratorValue(generated);
    return (
      bytesToHex(canonicalOutput) === vector.expected.canonicalOutputHex &&
      hashDomainSeparated(
        SCENARIO_GENERATOR_DOMAINS.goldenOutputHash,
        canonicalOutput,
      ) === vector.expected.outputSha256
    );
  } catch {
    return false;
  }
}
