import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";

import { hashScenarioTemplate } from "@permio/scenario-domain";

import {
  ArtifactPrivacyError,
  ClassificationManifestError,
  ScenarioGeneratorError,
  assertClassificationManifest,
  assertPublicArtifactsSafe,
  canonicalizeGeneratorValue,
  createGoldenVector,
  generateScenario,
  parseGoldenVector,
  scanPublicArtifacts,
  serializeGeneratedScenario,
  verifyGoldenVector,
  type GeneratedScenario,
} from "../src/index.ts";
import { makeInput } from "./support/generator-input.ts";

function loadGoldenVector(): unknown {
  return JSON.parse(
    readFileSync(new URL("../fixtures/generator-vector.v1.json", import.meta.url), "utf8"),
  );
}

function privatePaths(generated: GeneratedScenario): ReadonlySet<string> {
  return new Set(
    generated.classificationManifest.entries
      .filter(({ classification }) => classification === "private")
      .map(({ path }) => path),
  );
}

describe("deterministic scenario generation", () => {
  it("produces byte-identical output for the same complete input", () => {
    const first = generateScenario(makeInput());
    const second = generateScenario(structuredClone(makeInput()));
    assert.deepEqual(serializeGeneratedScenario(first), serializeGeneratedScenario(second));
    assert.equal(canonicalizeGeneratorValue(first), canonicalizeGeneratorValue(second));
  });

  it("separates seeds while preserving generated schemas", () => {
    const first = generateScenario(makeInput("test:seed-a"));
    const second = generateScenario(makeInput("test:seed-b"));
    assert.notEqual(first.privateInstance.instanceId, second.privateInstance.instanceId);
    assert.notDeepEqual(first.privateInstance.principals, second.privateInstance.principals);
    assert.deepEqual(first.publicSummary, second.publicSummary);
  });

  it("separates a property-style sequence of explicit test seeds", () => {
    const instanceIds = new Set<string>();
    for (let index = 0; index < 64; index += 1) {
      const generated = generateScenario(makeInput(`test:permutation-${index}`));
      instanceIds.add(generated.privateInstance.instanceId);
    }
    assert.equal(instanceIds.size, 64);
  });

  it("derives different principal identifiers for the same slot in different contexts", () => {
    const input = structuredClone(makeInput()) as Record<string, any>;
    input.template.contexts.push({
      id: "secondary-context",
      description: "A second neutral context.",
      allowedSlotIds: ["requester"],
      recordTypes: ["secondary-record"],
      claimTypes: ["secondary-result"],
      recipientKinds: ["named-recipient"],
      purposes: ["secondary-purpose"],
    });
    input.template.states.push("archived");
    input.template.actions.push({
      id: "perform-secondary-operation",
      description: "Performs another generic operation.",
      contextId: "secondary-context",
      actorSlotId: "requester",
      inputRecordTypes: ["secondary-record"],
      outputClaimTypes: ["secondary-result"],
      purpose: "secondary-purpose",
      recipientKind: "named-recipient",
      capabilityRuleId: "secondary-capability",
      proofProfileId: "minimum-proof",
      executionAdapterId: null,
    });
    input.template.transitions.push({
      id: "archive-operation",
      fromState: "completed",
      actionId: "perform-secondary-operation",
      toState: "archived",
    });
    input.template.capabilityRules.push({
      id: "secondary-capability",
      description: "Limits the second operation.",
      actionIds: ["perform-secondary-operation"],
      resourceSelector: "selected-secondary-resource",
      purpose: "secondary-purpose",
      recipientConstraint: "named-recipient",
      validForSeconds: 600,
      maxDelegationDepth: 0,
      disclosurePolicyId: "secondary-disclosure",
      revocable: true,
    });
    input.templateHash = hashScenarioTemplate(input.template);

    const principals = generateScenario(input).privateInstance.principals.filter(
      ({ slotId }) => slotId === "requester",
    );
    assert.equal(principals.length, 2);
    assert.equal(new Set(principals.map(({ contextId }) => contextId)).size, 2);
    assert.equal(new Set(principals.map(({ id }) => id)).size, 2);
  });

  it("generates only visibly synthetic instance values and explicit timestamps", () => {
    const generated = generateScenario(makeInput());
    const values = [
      generated.privateInstance.instanceId,
      ...generated.privateInstance.principals.map(({ id }) => id),
      ...generated.privateInstance.records.flatMap(({ id, ownerPrincipalId, value }) => [
        id,
        ownerPrincipalId,
        value,
      ]),
      ...generated.privateInstance.credentials.flatMap(
        ({ id, subjectPrincipalId, claims }) => [
          id,
          subjectPrincipalId,
          ...Object.values(claims),
        ],
      ),
      ...generated.privateInstance.events.flatMap(({ id, actorPrincipalId }) => [
        id,
        actorPrincipalId,
      ]),
    ];
    assert.ok(values.every((value) => value.startsWith("syn_")));
    assert.equal(
      generated.privateInstance.generatedTimestamp,
      makeInput().policyProfile.baseTimestamp,
    );
    assert.ok(
      generated.privateInstance.events.every(({ timestamp }) =>
        timestamp.endsWith("Z"),
      ),
    );
  });

  it("classifies every generated sensitive field as private by default", () => {
    const generated = generateScenario(makeInput());
    const paths = privatePaths(generated);
    assert.equal(generated.classificationManifest.defaultClassification, "private");
    assert.ok(paths.has("$.privateInstance.instanceId"));
    assert.ok(paths.has("$.privateInstance.records[0].value"));
    assert.ok(
      paths.has(
        '$.privateInstance.credentials[0].claims["minimum-result"]',
      ),
    );
    assert.ok(paths.has("$.privateInstance.events[0].timestamp"));
    assertClassificationManifest(generated);
    const publicPaths = new Set(
      generated.classificationManifest.entries
        .filter(({ classification }) => classification === "public")
        .map(({ path }) => path),
    );
    assert.ok(publicPaths.has("$.publicSummary"));
    assert.ok(publicPaths.has("$.privateInstance.records[0].recordType"));
    assert.ok(publicPaths.has("$.privateInstance.events[0].actionId"));
  });

  it("matches and verifies the committed versioned private golden vector", () => {
    const vector = parseGoldenVector(loadGoldenVector());
    assert.equal(vector.formatVersion, 1);
    assert.equal(vector.classification, "private-test-artifact");
    assert.deepEqual(createGoldenVector(makeInput()), vector);
    assert.match(vector.expected.canonicalOutputHex, /^0x[0-9a-f]+$/);
    assert.match(vector.expected.outputSha256, /^0x[0-9a-f]{64}$/);
    assert.equal(verifyGoldenVector(vector), true);
    const changed = structuredClone(vector) as any;
    changed.expected.canonicalOutputHex = `${changed.expected.canonicalOutputHex.slice(0, -2)}00`;
    assert.equal(verifyGoldenVector(changed), false);
  });

  it("rejects incomplete identities, wrong hashes, production-like seeds, and clock ambiguity", () => {
    const wrongHash = structuredClone(makeInput()) as Record<string, any>;
    wrongHash.templateHash.value = `0x${"0".repeat(64)}`;
    assert.throws(
      () => generateScenario(wrongHash),
      (error: unknown) =>
        error instanceof ScenarioGeneratorError &&
        error.code === "TEMPLATE_HASH_MISMATCH",
    );

    const productionSeed = structuredClone(makeInput()) as Record<string, any>;
    productionSeed.explicitSeed = "production-seed";
    assert.throws(
      () => generateScenario(productionSeed),
      (error: unknown) =>
        error instanceof ScenarioGeneratorError &&
        error.code === "INVALID_TEST_SEED",
    );

    const ambiguousTime = structuredClone(makeInput()) as Record<string, any>;
    ambiguousTime.policyProfile.baseTimestamp = "2040-01-01";
    assert.throws(
      () => generateScenario(ambiguousTime),
      (error: unknown) =>
        error instanceof ScenarioGeneratorError &&
        error.code === "INVALID_POLICY_PROFILE",
    );
  });

  it("does not read random, current-time, environment, or application modules", () => {
    const sourceDirectory = new URL("../src/", import.meta.url);
    for (const file of readdirSync(sourceDirectory)) {
      if (!file.endsWith(".ts")) continue;
      const source = readFileSync(new URL(file, sourceDirectory), "utf8");
      assert.doesNotMatch(source, /Math\.random|Date\.now|new Date\(\)|process\.env/);
      const specifiers = [
        ...source.matchAll(/(?:from\s+|export\s+\*\s+from\s+)["']([^"']+)["']/g),
      ].map((match) => match[1]!);
      assert.deepEqual(
        specifiers.filter(
          (specifier) =>
            !specifier.startsWith("./") &&
            !specifier.startsWith("node:") &&
            specifier !== "@permio/scenario-domain",
        ),
        [],
      );
    }
  });
});

describe("public artifact privacy scanner", () => {
  it("accepts the allowlisted public summary", () => {
    const generated = generateScenario(makeInput());
    assert.deepEqual(
      scanPublicArtifacts(generated, [
        {
          name: "public-summary.json",
          kind: "receipt",
          content: JSON.stringify(generated.publicSummary),
        },
      ]),
      [],
    );
  });

  it("finds raw private values in every supported public artifact class", () => {
    const generated = generateScenario(makeInput());
    const leaked = generated.privateInstance.instanceId;
    const kinds = ["receipt", "ledger-dump", "log", "generated-html"] as const;
    const findings = scanPublicArtifacts(
      generated,
      kinds.map((kind) => ({ name: `${kind}.txt`, kind, content: `leak=${leaked}` })),
    );
    assert.deepEqual(new Set(findings.map(({ artifactKind }) => artifactKind)), new Set(kinds));
    assert.ok(findings.every(({ privatePath }) => privatePath === "$.privateInstance.instanceId"));
  });

  it("finds escaped and encoded private values with locations", () => {
    const generated = generateScenario(makeInput());
    const value = generated.privateInstance.events[0]!.timestamp;
    const artifacts = [
      { name: "url.log", kind: "log" as const, content: encodeURIComponent(value) },
      {
        name: "percent.log",
        kind: "log" as const,
        content: [...Buffer.from(value)]
          .map((byte) => `%${byte.toString(16).padStart(2, "0").toUpperCase()}`)
          .join(""),
      },
      {
        name: "hex.ledger",
        kind: "ledger-dump" as const,
        content: Buffer.from(value).toString("hex"),
      },
      {
        name: "upper-hex.ledger",
        kind: "ledger-dump" as const,
        content: Buffer.from(value).toString("hex").toUpperCase(),
      },
      {
        name: "base64.receipt",
        kind: "receipt" as const,
        content: Buffer.from(value).toString("base64"),
      },
      {
        name: "entities.html",
        kind: "generated-html" as const,
        content: [...value].map((character) => `&#${character.codePointAt(0)};`).join(""),
      },
      {
        name: "hex-entities.html",
        kind: "generated-html" as const,
        content: [...value]
          .map((character) => `&#x${character.codePointAt(0)!.toString(16)};`)
          .join(""),
      },
      {
        name: "unicode.receipt",
        kind: "receipt" as const,
        content: [...value]
          .map((character) => `\\u${character.codePointAt(0)!.toString(16).padStart(4, "0")}`)
          .join(""),
      },
    ];
    const findings = scanPublicArtifacts(generated, artifacts);
    assert.deepEqual(
      findings.map(({ artifactName, encoding, offset }) => ({ artifactName, encoding, offset })),
      [
        { artifactName: "url.log", encoding: "url-encoded", offset: 0 },
        { artifactName: "percent.log", encoding: "percent-encoded", offset: 0 },
        { artifactName: "hex.ledger", encoding: "hex", offset: 0 },
        { artifactName: "upper-hex.ledger", encoding: "hex-uppercase", offset: 0 },
        { artifactName: "base64.receipt", encoding: "base64", offset: 0 },
        { artifactName: "entities.html", encoding: "html-numeric", offset: 0 },
        { artifactName: "hex-entities.html", encoding: "html-hex", offset: 0 },
        { artifactName: "unicode.receipt", encoding: "json-unicode", offset: 0 },
      ],
    );
  });

  it("throws a structured error instead of exposing private values in its message", () => {
    const generated = generateScenario(makeInput());
    const leaked = generated.privateInstance.records[0]!.value;
    assert.throws(
      () =>
        assertPublicArtifactsSafe(generated, [
          { name: "runtime.log", kind: "log", content: `prefix:${leaked}` },
        ]),
      (error: unknown) => {
        assert.ok(error instanceof ArtifactPrivacyError);
        assert.equal(error.findings[0]?.artifactName, "runtime.log");
        assert.equal(error.findings[0]?.privatePath, "$.privateInstance.records[0].value");
        assert.equal(error.findings[0]?.offset, 7);
        assert.doesNotMatch(error.message, new RegExp(leaked));
        return true;
      },
    );
  });

  it("rejects a weakened or incomplete classification manifest before scanning", () => {
    const generated = structuredClone(generateScenario(makeInput())) as any;
    generated.classificationManifest.entries =
      generated.classificationManifest.entries.filter(
        ({ path }: { readonly path: string }) =>
          path !== "$.privateInstance.records[0].value",
      );
    assert.throws(
      () => scanPublicArtifacts(generated, []),
      (error: unknown) => error instanceof ClassificationManifestError,
    );

    const extended = structuredClone(generateScenario(makeInput())) as any;
    extended.privateInstance.records[0].unexpectedPrivateField =
      "syn_val_unclassified";
    assert.throws(
      () => scanPublicArtifacts(extended, []),
      (error: unknown) => error instanceof ClassificationManifestError,
    );
  });
});
