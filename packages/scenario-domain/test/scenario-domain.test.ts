import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";

import {
  SCENARIO_TEMPLATE_HASH_DOMAIN,
  ScenarioTemplateValidationError,
  TemplateRevisionError,
  assertTemplateRevision,
  canonicalizeScenarioTemplate,
  hashScenarioTemplate,
  parseScenarioTemplate,
  validateScenarioTemplate,
} from "../src/index.ts";

function makeTemplate(): Record<string, any> {
  return {
    schemaVersion: 1,
    namespace: "org.example",
    templateId: "org.example/context-access",
    version: "1.0.0",
    displayName: "Context Access",
    description: "A neutral template for context-bound access.",
    participantSlots: [
      {
        id: "subject",
        description: "The party requesting an action.",
        assignableBy: ["@instance-creator"],
      },
      {
        id: "verifier",
        description: "The intended verifier.",
        assignableBy: ["@namespace-governance"],
      },
    ],
    contexts: [
      {
        id: "access",
        description: "A purpose-limited access context.",
        allowedSlotIds: ["subject", "verifier"],
        recordTypes: ["credential"],
        claimTypes: ["eligible"],
        recipientKinds: ["specific-recipient"],
        purposes: ["access-check"],
      },
    ],
    states: ["ready", "authorized"],
    initialState: "ready",
    actions: [
      {
        id: "authorize-access",
        description: "Authorize one context-bound access action.",
        contextId: "access",
        actorSlotId: "subject",
        inputRecordTypes: ["credential"],
        outputClaimTypes: ["eligible"],
        purpose: "access-check",
        recipientKind: "specific-recipient",
        capabilityRuleId: "access-capability",
        proofProfileId: "eligibility-proof",
        executionAdapterId: "receipt-registry",
      },
    ],
    transitions: [
      {
        id: "authorize",
        fromState: "ready",
        actionId: "authorize-access",
        toState: "authorized",
      },
    ],
    capabilityRules: [
      {
        id: "access-capability",
        description: "A short-lived, recipient-bound capability.",
        actionIds: ["authorize-access"],
        resourceSelector: "instance-resource",
        purpose: "access-check",
        recipientConstraint: "specific-recipient",
        validForSeconds: 900,
        maxDelegationDepth: 0,
        disclosurePolicyId: "minimum-eligible-claim",
        revocable: true,
      },
    ],
    proofProfiles: [
      {
        id: "eligibility-proof",
        circuitId: "generic-eligibility-v1",
        publicOutputSchemaId: "recipient-bound-result-v1",
      },
    ],
    executionAdapters: [
      {
        id: "receipt-registry",
        kind: "commitment-receipt",
        schemaId: "receipt-v1",
      },
    ],
    privacyInvariants: [
      {
        id: "no-global-subject-id",
        description: "Do not expose an identifier shared across contexts.",
      },
    ],
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function expectValidationError(
  input: unknown,
  code: ScenarioTemplateValidationError["code"],
  path?: string,
): void {
  assert.throws(
    () => parseScenarioTemplate(input),
    (error: unknown) => {
      assert.ok(error instanceof ScenarioTemplateValidationError);
      assert.equal(error.code, code);
      if (path !== undefined) assert.equal(error.path, path);
      return true;
    },
  );
}

function reorderObjectKeys(value: unknown, seed: number): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => reorderObjectKeys(item, seed + 1));
  }
  if (value === null || typeof value !== "object") return value;
  const entries = Object.entries(value).sort(([left], [right]) => {
    const leftScore = [...left].reduce((sum, char) => sum + char.charCodeAt(0), seed);
    const rightScore = [...right].reduce((sum, char) => sum + char.charCodeAt(0), seed);
    return (leftScore % 17) - (rightScore % 17) || right.localeCompare(left);
  });
  return Object.fromEntries(
    entries.map(([key, item]) => [key, reorderObjectKeys(item, seed + key.length)]),
  );
}

describe("scenario template validation", () => {
  it("parses open-ended context and action identifiers as data", () => {
    const result = validateScenarioTemplate(makeTemplate());
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.contexts[0]?.id, "access");
      assert.equal(result.value.actions[0]?.id, "authorize-access");
    }
  });

  it("rejects unknown and missing fields", () => {
    expectValidationError(
      { ...makeTemplate(), surprise: true },
      "UNKNOWN_FIELD",
      "ScenarioTemplate.surprise",
    );
    const missing = makeTemplate();
    delete missing.namespace;
    expectValidationError(
      missing,
      "MISSING_FIELD",
      "ScenarioTemplate.namespace",
    );
  });

  it("rejects duplicate identifiers", () => {
    const template = makeTemplate();
    template.states.push("ready");
    expectValidationError(template, "DUPLICATE_ID", "ScenarioTemplate.states");
  });

  it("rejects invalid and inconsistent references", () => {
    const unknown = makeTemplate();
    unknown.actions[0].proofProfileId = "missing-proof";
    expectValidationError(
      unknown,
      "UNKNOWN_REFERENCE",
      "ScenarioTemplate.actions[0].proofProfileId",
    );

    const inconsistent = makeTemplate();
    inconsistent.actions[0].purpose = "another-purpose";
    expectValidationError(
      inconsistent,
      "UNKNOWN_REFERENCE",
      "ScenarioTemplate.actions[0].purpose",
    );
  });

  it("rejects unreachable states and nondeterministic transitions", () => {
    const unreachable = makeTemplate();
    unreachable.states.push("orphaned");
    expectValidationError(
      unreachable,
      "UNREACHABLE_STATE",
      "ScenarioTemplate.states[2]",
    );

    const ambiguous = makeTemplate();
    ambiguous.transitions.push({
      id: "authorize-again",
      fromState: "ready",
      actionId: "authorize-access",
      toState: "ready",
    });
    expectValidationError(
      ambiguous,
      "AMBIGUOUS_TRANSITION",
      "ScenarioTemplate.transitions[1]",
    );
  });

  it("rejects namespace, template identity, and version violations", () => {
    const badNamespace = makeTemplate();
    badNamespace.namespace = "Example Org";
    expectValidationError(badNamespace, "INVALID_VALUE", "ScenarioTemplate.namespace");

    const badIdentity = makeTemplate();
    badIdentity.templateId = "another.namespace/context-access";
    expectValidationError(badIdentity, "INVALID_VALUE", "ScenarioTemplate.templateId");

    const badVersion = makeTemplate();
    badVersion.version = "1.0";
    expectValidationError(badVersion, "INVALID_VALUE", "ScenarioTemplate.version");

    const unsafeVersion = makeTemplate();
    unsafeVersion.version = "9007199254740992.0.0";
    expectValidationError(
      unsafeVersion,
      "INVALID_VALUE",
      "ScenarioTemplate.version",
    );
  });

  it("rejects accessors without invoking them", () => {
    const template = makeTemplate();
    let invoked = false;
    Object.defineProperty(template, "description", {
      enumerable: true,
      get() {
        invoked = true;
        return "code must not run";
      },
    });
    expectValidationError(
      template,
      "INVALID_TYPE",
      "ScenarioTemplate.description",
    );
    assert.equal(invoked, false);
  });

  it("keeps the domain package independent of application scenario modules", () => {
    const sourceDirectory = new URL("../src/", import.meta.url);
    for (const file of readdirSync(sourceDirectory)) {
      if (!file.endsWith(".ts")) continue;
      const source = readFileSync(new URL(file, sourceDirectory), "utf8");
      const specifiers = [
        ...source.matchAll(
          /^\s*(?:import\s+.+\s+from\s+|}\s+from\s+|export\s+.*\s+from\s+)["']([^"']+)["'];?\s*$/gm,
        ),
      ].map((match) => match[1]!);
      assert.deepEqual(
        specifiers.filter(
          (specifier) =>
            !specifier.startsWith("./") && !specifier.startsWith("node:"),
        ),
        [],
        `${file} imports an external or application-specific module`,
      );
    }
  });
});

describe("canonical scenario template encoding", () => {
  it("is stable across object key order and Unicode composition", () => {
    const base = makeTemplate();
    base.displayName = "Caf\u00e9 Access";
    const expectedCanonical = canonicalizeScenarioTemplate(base);
    const expectedHash = hashScenarioTemplate(base);
    assert.equal(expectedHash.domain, SCENARIO_TEMPLATE_HASH_DOMAIN);
    assert.match(expectedHash.value, /^0x[0-9a-f]{64}$/);

    for (let seed = 0; seed < 64; seed += 1) {
      const variant = reorderObjectKeys(clone(base), seed) as Record<string, any>;
      variant.displayName = "Cafe\u0301 Access";
      assert.equal(canonicalizeScenarioTemplate(variant), expectedCanonical);
      assert.deepEqual(hashScenarioTemplate(variant), expectedHash);
    }
  });

  it("preserves meaningful array order in the hash", () => {
    const base = makeTemplate();
    const reordered = clone(base);
    reordered.participantSlots.reverse();
    assert.notEqual(
      hashScenarioTemplate(base).value,
      hashScenarioTemplate(reordered).value,
    );
  });
});

describe("scenario template version compatibility", () => {
  it("allows prose-only patch revisions", () => {
    const previous = makeTemplate();
    const next = clone(previous);
    next.version = "1.0.1";
    next.description = "Improved documentation without changed behavior.";
    next.contexts[0].description = "Clearer context documentation.";
    assert.deepEqual(assertTemplateRevision(previous, next), {
      kind: "patch",
      previousVersion: "1.0.0",
      nextVersion: "1.0.1",
    });
  });

  it("requires a minor or major version for semantic changes", () => {
    const previous = makeTemplate();
    const next = clone(previous);
    next.version = "1.0.1";
    next.capabilityRules[0].validForSeconds = 1200;
    assert.throws(
      () => assertTemplateRevision(previous, next),
      (error: unknown) =>
        error instanceof TemplateRevisionError &&
        error.code === "PATCH_SEMANTICS_CHANGED",
    );
  });

  it("allows additive minor revisions but rejects changed existing definitions", () => {
    const previous = makeTemplate();
    const additive = clone(previous);
    additive.version = "1.1.0";
    additive.privacyInvariants.push({
      id: "recipient-bound-output",
      description: "Bind each disclosed output to its intended recipient.",
    });
    assert.equal(assertTemplateRevision(previous, additive).kind, "minor");

    const breaking = clone(previous);
    breaking.version = "1.1.0";
    breaking.capabilityRules[0].validForSeconds = 1200;
    assert.throws(
      () => assertTemplateRevision(previous, breaking),
      (error: unknown) =>
        error instanceof TemplateRevisionError &&
        error.code === "MINOR_BREAKING_CHANGE",
    );
  });

  it("allows valid breaking changes only under a major increment", () => {
    const previous = makeTemplate();
    const next = clone(previous);
    next.version = "2.0.0";
    next.capabilityRules[0].validForSeconds = 1200;
    assert.equal(assertTemplateRevision(previous, next).kind, "major");
  });

  it("rejects reused versions and changed template lineage", () => {
    const previous = makeTemplate();
    assert.throws(
      () => assertTemplateRevision(previous, clone(previous)),
      (error: unknown) =>
        error instanceof TemplateRevisionError &&
        error.code === "VERSION_NOT_INCREASED",
    );

    const moved = clone(previous);
    moved.version = "2.0.0";
    moved.namespace = "net.example";
    moved.templateId = "net.example/context-access";
    assert.throws(
      () => assertTemplateRevision(previous, moved),
      (error: unknown) =>
        error instanceof TemplateRevisionError &&
        error.code === "TEMPLATE_ID_CHANGED",
    );
  });
});
