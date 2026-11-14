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

function makePredicateTemplate(): Record<string, any> {
  const template = makeTemplate();
  template.schemaVersion = 2;
  template.version = "2.0.0";
  template.contexts[0].recordTypes = ["credential", "request", "ceiling", "acknowledgment"];
  template.contexts[0].claimTypes = ["eligible", "bounded", "acknowledged"];
  template.actions[0].inputRecordTypes = [...template.contexts[0].recordTypes];
  template.actions[0].outputClaimTypes = [...template.contexts[0].claimTypes];
  template.proofProfiles[0].predicates = [
    { kind: "current-record-v1", inputRecordType: "credential", outputClaimType: "eligible" },
    { kind: "bounded-value-v1", inputRecordType: "request", ceilingRecordType: "ceiling", outputClaimType: "bounded" },
    { kind: "audit-acknowledgment-v1", inputRecordType: "acknowledgment", outputClaimType: "acknowledged" },
  ];
  return template;
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
  it("preserves the historical schema-1 representation and hash", () => {
    const template = makeTemplate();
    assert.deepEqual(parseScenarioTemplate(template), template);
    assert.equal(Object.hasOwn(parseScenarioTemplate(template).proofProfiles[0]!, "predicates"), false);
    assert.equal(hashScenarioTemplate(template).value,
      "0x446f18f53ca8d5bba16bc96874cc94dcf00fe150e4d49f97ea952afa181bf925");
  });
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

describe("schema-2 business predicate declarations", () => {
  it("retains all three data-only predicate kinds and their declared order", () => {
    const template = makePredicateTemplate();
    const parsed = parseScenarioTemplate(template);
    assert.equal(parsed.schemaVersion, 2);
    assert.deepEqual(parsed.proofProfiles[0]?.predicates, template.proofProfiles[0].predicates);
    const reordered = clone(template);
    reordered.proofProfiles[0].predicates.reverse();
    assert.notEqual(hashScenarioTemplate(template).value, hashScenarioTemplate(reordered).value);
    assert.equal(canonicalizeScenarioTemplate(reorderObjectKeys(template, 3)), canonicalizeScenarioTemplate(template));
  });

  it("rejects predicate fields in schema 1 and unsupported schema versions", () => {
    const legacy = makePredicateTemplate();
    legacy.schemaVersion = 1;
    expectValidationError(legacy, "UNKNOWN_FIELD", "ScenarioTemplate.proofProfiles[0].predicates");
    const unsupported = makeTemplate();
    unsupported.schemaVersion = 3;
    expectValidationError(unsupported, "INVALID_VALUE", "ScenarioTemplate.schemaVersion");
  });

  it("requires a nonempty list on every schema-2 profile and caps it at eight", () => {
    for (const value of [undefined, [], Array.from({ length: 9 }, (_, i) => ({
      kind: "current-record-v1", inputRecordType: "credential", outputClaimType: `claim-${i}`,
    }))]) {
      const template = makePredicateTemplate();
      if (value === undefined) delete template.proofProfiles[0].predicates;
      else template.proofProfiles[0].predicates = value;
      expectValidationError(template, value === undefined ? "MISSING_FIELD" : value.length === 0 ? "EMPTY_COLLECTION" : "INVALID_VALUE",
        "ScenarioTemplate.proofProfiles[0].predicates");
    }
  });

  it("rejects unknown kinds, unknown fields, and missing or extraneous ceiling references", () => {
    const cases = [
      { change: { kind: "expression-v1" }, code: "INVALID_VALUE", field: "kind" },
      { change: { expression: "value <= ceiling" }, code: "UNKNOWN_FIELD", field: "expression" },
      { change: { ceilingRecordType: "ceiling" }, code: "UNKNOWN_FIELD", field: "ceilingRecordType" },
      { change: { inputRecordType: "Invalid Type" }, code: "INVALID_VALUE", field: "inputRecordType" },
    ] as const;
    for (const { change, code, field } of cases) {
      const template = makePredicateTemplate();
      Object.assign(template.proofProfiles[0].predicates[0], change);
      expectValidationError(template, code, `ScenarioTemplate.proofProfiles[0].predicates[0].${field}`);
    }
    const missing = makePredicateTemplate();
    delete missing.proofProfiles[0].predicates[1].ceilingRecordType;
    expectValidationError(missing, "MISSING_FIELD", "ScenarioTemplate.proofProfiles[0].predicates[1].ceilingRecordType");
    const audit = makePredicateTemplate();
    audit.proofProfiles[0].predicates[2].ceilingRecordType = "ceiling";
    expectValidationError(audit, "UNKNOWN_FIELD", "ScenarioTemplate.proofProfiles[0].predicates[2].ceilingRecordType");
  });

  it("rejects malformed predicate containers and incomplete predicate declarations", () => {
    for (const value of [null, {}, "current-record-v1"]) {
      const template = makePredicateTemplate();
      template.proofProfiles[0].predicates = value;
      expectValidationError(template, "INVALID_TYPE", "ScenarioTemplate.proofProfiles[0].predicates");
    }
    for (const value of [[undefined], Array(1)]) {
      const template = makePredicateTemplate();
      template.proofProfiles[0].predicates = value;
      expectValidationError(template, "INVALID_TYPE", "ScenarioTemplate.proofProfiles[0].predicates[0]");
    }
    for (const field of ["kind", "inputRecordType", "outputClaimType"]) {
      const template = makePredicateTemplate();
      delete template.proofProfiles[0].predicates[0][field];
      expectValidationError(template, "MISSING_FIELD", `ScenarioTemplate.proofProfiles[0].predicates[0].${field}`);
    }
  });

  it("requires predicate inputs and outputs in every action selecting the profile", () => {
    for (const [index, field] of [[0, "inputRecordType"], [1, "ceilingRecordType"], [2, "outputClaimType"]] as const) {
      const template = makePredicateTemplate();
      template.proofProfiles[0].predicates[index][field] = "unselected";
      expectValidationError(template, "INCONSISTENT_REFERENCE", `ScenarioTemplate.proofProfiles[0].predicates[${index}].${field}`);
    }
    for (const field of ["inputRecordTypes", "outputClaimTypes"]) {
      const template = makePredicateTemplate();
      const other = clone(template.actions[0]);
      other.id = "authorize-other";
      other[field] = other[field].slice(1);
      template.actions.push(other);
      template.transitions.push({ id: "authorize-other", fromState: "ready", actionId: other.id, toState: "authorized" });
      template.capabilityRules[0].actionIds.push(other.id);
      expectValidationError(template, "INCONSISTENT_REFERENCE",
        `ScenarioTemplate.proofProfiles[0].predicates[0].${field === "inputRecordTypes" ? "inputRecordType" : "outputClaimType"}`);
    }
  });

  it("requires distinct predicate outputs and complete action output coverage", () => {
    const duplicate = makePredicateTemplate();
    duplicate.proofProfiles[0].predicates.push(clone(duplicate.proofProfiles[0].predicates[0]));
    expectValidationError(duplicate, "DUPLICATE_ID", "ScenarioTemplate.proofProfiles[0].predicates");
    const uncovered = makePredicateTemplate();
    uncovered.proofProfiles[0].predicates.pop();
    expectValidationError(uncovered, "INCONSISTENT_REFERENCE", "ScenarioTemplate.actions[0].outputClaimTypes");
  });

  it("requires distinct request and ceiling record types for a bounded-value predicate", () => {
    const template = makePredicateTemplate();
    template.proofProfiles[0].predicates[1].ceilingRecordType = "request";
    expectValidationError(template, "INVALID_VALUE", "ScenarioTemplate.proofProfiles[0].predicates[1].ceilingRecordType");
  });

  it("accepts eight selected inputs, outputs, and predicates but rejects a ninth", () => {
    const template = makePredicateTemplate();
    template.contexts[0].recordTypes = Array.from({ length: 9 }, (_, i) => `record-${i}`);
    template.contexts[0].claimTypes = Array.from({ length: 9 }, (_, i) => `claim-${i}`);
    template.actions[0].inputRecordTypes = template.contexts[0].recordTypes.slice(0, 8);
    template.actions[0].outputClaimTypes = template.contexts[0].claimTypes.slice(0, 8);
    template.proofProfiles[0].predicates = template.actions[0].outputClaimTypes.map((outputClaimType: string, i: number) => ({
      kind: "current-record-v1", inputRecordType: `record-${i}`, outputClaimType,
    }));
    assert.equal(parseScenarioTemplate(template).proofProfiles[0]?.predicates?.length, 8);
    for (const field of ["inputRecordTypes", "outputClaimTypes"]) {
      const oversized = clone(template);
      oversized.actions[0][field].push(field === "inputRecordTypes" ? "record-8" : "claim-8");
      expectValidationError(oversized, "INVALID_VALUE", `ScenarioTemplate.actions[0].${field}`);
    }
    const legacy = makeTemplate();
    legacy.contexts[0].recordTypes = template.contexts[0].recordTypes;
    legacy.actions[0].inputRecordTypes = [...legacy.contexts[0].recordTypes];
    assert.equal(parseScenarioTemplate(legacy).actions[0]?.inputRecordTypes.length, 9);
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
