import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  ATTESTATION_FIELDS,
  ATTESTATION_PRIMARY_TYPE,
  ATTESTATION_TYPE_STRING,
  ATTESTATION_TYPEHASH,
  CANONICAL_ENCODING_VERSION,
  COMMITMENT_DOMAINS,
  COMMITMENT_DOMAIN_HASHES,
  PURPOSE_HASHES,
  PURPOSE_NAMES,
  SCHEMA_IDS,
  SCHEMA_NAMES,
  encodeCanonicalHex,
  hashCanonical,
} from "../src/index.ts";

interface HashVectors {
  readonly vectorVersion: string;
  readonly schemas: typeof SCHEMA_IDS;
  readonly purposes: typeof PURPOSE_HASHES;
  readonly commitmentDomains: typeof COMMITMENT_DOMAIN_HASHES;
  readonly eip712: {
    readonly primaryType: string;
    readonly fields: ReadonlyArray<{ readonly name: string; readonly type: string }>;
    readonly typeString: string;
    readonly typeHash: string;
  };
  readonly canonicalEncoding: {
    readonly version: string;
    readonly domain: string;
    readonly sequenceAbC: CanonicalVector;
    readonly sequenceABc: CanonicalVector;
    readonly emptyThenX: CanonicalVector;
  };
}

interface CanonicalVector {
  readonly fields: readonly string[];
  readonly encodedHex: string;
  readonly keccak256: string;
}

interface ScenarioFixture {
  readonly warning: string;
  readonly actors: {
    readonly bob: {
      readonly holderSecret: {
        readonly value: string;
        readonly classification: string;
      };
    };
  };
}

function loadJson<T>(relativePath: string): T {
  return JSON.parse(
    readFileSync(new URL(relativePath, import.meta.url), "utf8"),
  ) as T;
}

const vectors = loadJson<HashVectors>("../fixtures/hash-vectors.v1.json");
const scenario = loadJson<ScenarioFixture>(
  "../fixtures/alice-bob-clara.v1.json",
);

describe("@permio/protocol", () => {
  it("matches the committed schema and purpose hash vectors", () => {
    assert.equal(vectors.vectorVersion, "permio.hash-vectors.v1");
    assert.deepEqual(SCHEMA_IDS, vectors.schemas);
    assert.deepEqual(PURPOSE_HASHES, vectors.purposes);
    assert.deepEqual(SCHEMA_NAMES, {
      supportEligibility: "permio.support-eligibility.v1",
      reviewEligibleUnique: "permio.review-eligible-unique.v1",
      regulatoryBridge: "permio.regulatory-bridge.v1",
    });
    assert.deepEqual(PURPOSE_NAMES, {
      supportReplacement: "permio.support.replacement.v1",
      reviewPublication: "permio.review.publish.v1",
      regulatoryComplaintAssessment:
        "permio.regulatory.consumer-complaint-assessment.v1",
    });
  });

  it("locks the EIP-712 field names, ordering, and type hash", () => {
    assert.equal(ATTESTATION_PRIMARY_TYPE, vectors.eip712.primaryType);
    assert.deepEqual(ATTESTATION_FIELDS, vectors.eip712.fields);
    assert.equal(ATTESTATION_TYPE_STRING, vectors.eip712.typeString);
    assert.equal(ATTESTATION_TYPEHASH, vectors.eip712.typeHash);
  });

  it("matches fixed length-delimited encoding vectors", () => {
    assert.equal(
      CANONICAL_ENCODING_VERSION,
      vectors.canonicalEncoding.version,
    );

    for (const vector of [
      vectors.canonicalEncoding.sequenceAbC,
      vectors.canonicalEncoding.sequenceABc,
      vectors.canonicalEncoding.emptyThenX,
    ]) {
      assert.equal(
        encodeCanonicalHex(vectors.canonicalEncoding.domain, vector.fields),
        vector.encodedHex,
      );
      assert.equal(
        hashCanonical(vectors.canonicalEncoding.domain, vector.fields),
        vector.keccak256,
      );
    }
  });

  it("distinguishes ambiguous concatenations and empty fields", () => {
    const { domain, sequenceAbC, sequenceABc, emptyThenX } =
      vectors.canonicalEncoding;
    assert.notEqual(
      encodeCanonicalHex(domain, sequenceAbC.fields),
      encodeCanonicalHex(domain, sequenceABc.fields),
    );
    assert.notEqual(
      encodeCanonicalHex(domain, emptyThenX.fields),
      encodeCanonicalHex(domain, ["x"]),
    );
    assert.throws(() => encodeCanonicalHex("", ["field"]), /must not be empty/);
  });

  it("keeps all commitment and nullifier domains pairwise distinct", () => {
    assert.equal(
      new Set(Object.values(COMMITMENT_DOMAINS)).size,
      Object.keys(COMMITMENT_DOMAINS).length,
    );
    assert.equal(
      new Set(Object.values(COMMITMENT_DOMAIN_HASHES)).size,
      Object.keys(COMMITMENT_DOMAIN_HASHES).length,
    );
    assert.deepEqual(COMMITMENT_DOMAIN_HASHES, vectors.commitmentDomains);
  });

  it("labels the deterministic holder secret as non-production test data", () => {
    const { holderSecret } = scenario.actors.bob;
    assert.match(scenario.warning, /TEST DATA ONLY/);
    assert.equal(holderSecret.classification, "TEST_ONLY_PRIVATE_NON_PRODUCTION");
    assert.match(holderSecret.value, /^0x[0-9a-f]{64}$/);
    assert.equal(holderSecret.value.includes(" "), false);
  });
});
