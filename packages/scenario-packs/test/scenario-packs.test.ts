import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { ACTION_DENIAL_REASONS } from "@permio/context-accounts";
import { assertTemplateRevision, hashScenarioTemplate, parseScenarioTemplate } from "@permio/scenario-domain";
import { ArtifactPrivacyError, serializeGeneratedScenario } from "@permio/scenario-generator";
import {
  buildProofModuleBindingTree, createRuntimePolicyBindingManifest,
  createRuntimeTemplateActionPolicy, orderProofModuleBindings,
} from "@permio/midnight-authorization";
import { pureCircuits as pure } from "../../midnight-authorization/contracts/managed/permio-authorization/contract/index.js";

import {
  SCENARIO_PACKS,
  assertScenarioPackPublicArtifactsSafe,
  createNamespacePolicy,
  createScenarioPackFixture,
  getScenarioPack,
  scanScenarioPackPublicArtifacts,
  type ScenarioPackId,
} from "../src/index.ts";

const packIds = Object.keys(SCENARIO_PACKS) as ScenarioPackId[];

const legacyProfiles = {
  "clinical-referral-consent": {
    hash: "0x6d09c96c4b594d2353106d664b6732a964c2c627f6cbdb3c3d3d972587b63d40",
    outputs: ["treatment-referral-output-v1", "research-consent-output-v1", "emergency-access-output-v1"],
  },
  "professional-site-access": {
    hash: "0x520a462caa4ccb48b8857176c752479726880004ffd04fa3fecf81cb6edf9cb9",
    outputs: ["current-qualification-v1"],
  },
  "delegated-purchasing-agent": {
    hash: "0xf607177a5323742a55fbad07d124d66034bee68a85765434ea9867e9f7610e8a",
    outputs: ["bounded-purchase-authorization-v1"],
  },
};

describe("M9 profiles against the authoritative M6 policy", () => {
  for (const packId of packIds) {
    it(`${packId} uses the common receipt without replacing its application claims`, () => {
      const pack = getScenarioPack(packId);
      for (const flow of pack.flows) {
        const action = pack.template.actions.find(row => row.id === flow.actionId)!;
        const profile = pack.template.proofProfiles.find(row => row.id === action.proofProfileId)!;
        assert.equal(profile.publicOutputSchemaId, "decision-receipt-v1");
        assert.deepEqual(action.outputClaimTypes, flow.disclosedClaims);
        const projection = createRuntimeTemplateActionPolicy(pack.template, action.id);
        assert.equal(projection.policy.outputClaimTypeCount, BigInt(flow.disclosedClaims.length));
        assert.equal(`0x${Buffer.from(projection.policy.target.templateContentHash).toString("hex")}`,
          hashScenarioTemplate(pack.template).value);
      }
    });

    it(`${packId} versions the receipt correction without rewriting its v1 identity`, () => {
      const pack = getScenarioPack(packId);
      const legacy = structuredClone(pack.template);
      const previous = legacyProfiles[packId];
      const oldTemplate = { ...legacy, version: "1.0.0", proofProfiles: legacy.proofProfiles.map((profile, index) => ({
        ...profile, publicOutputSchemaId: previous.outputs[index]!,
        circuitId: packId === "delegated-purchasing-agent" ? "delegated-capability-action-v1" : profile.circuitId,
      })) };
      assert.equal(hashScenarioTemplate(oldTemplate).value, previous.hash);
      assert.equal(pack.version, "2.0.0");
      assert.equal(pack.template.version, pack.version);
      assert.equal(assertTemplateRevision(oldTemplate, pack.template).kind, "major");
      assert.notEqual(hashScenarioTemplate(pack.template).value, previous.hash);
    });
  }

  it("selects a module that permits every declared state transition", () => {
    for (const packId of packIds) {
      const pack = getScenarioPack(packId);
      for (const flow of pack.flows) {
        const projection = createRuntimeTemplateActionPolicy(pack.template, flow.actionId);
        const transition = projection.transitionAt(0);
        const state = {
          stateVersion: 2n, instanceCommitment: new Uint8Array(32).fill(1), lastMutationAt: 100n,
          slotAssignmentsRoot: pure.runtimePrivateMapEmptyRoot(), slotAssignmentCount: 1n,
          slotBindingsRoot: pure.runtimePrivateMapEmptyRoot(), slotBindingCount: 1n,
          stateIdHash: transition.fromStateIdHash, nonce: new Uint8Array(32).fill(2),
        };
        pure.assertRuntimeTemplateTransition(projection.policy, transition, projection.transitionPathAt(0),
          transition.fromStateIdHash, transition.toStateIdHash);
        const next = pure.runtimeActionNextState(state, transition.toStateIdHash,
          new Uint8Array(32).fill(3), 101n, projection.moduleId === "private-state-transition");
        assert.deepEqual(next.stateIdHash, transition.toStateIdHash);
      }
    }
  });

  it("binds every pack action to its exact M6 configuration and version", () => {
    for (const packId of packIds) {
      const pack = getScenarioPack(packId);
      // Synthetic module identities exercise the binding contract, not live activation.
      const manifest = createRuntimePolicyBindingManifest(pack.template, pack.template.actions.map(action => ({
        actionId: action.id, proofProfileId: action.proofProfileId,
        moduleId: "private-state-transition", moduleVersion: "1.0.0",
        implementationHash: `0x${"11".repeat(32)}`,
        receiptSchemaHash: `0x${"33".repeat(32)}`,
      })));
      const ordered = orderProofModuleBindings(pack.template, manifest);
      const tree = buildProofModuleBindingTree(ordered);
      for (const [index, binding] of ordered.entries()) {
        const projection = createRuntimeTemplateActionPolicy(pack.template, binding.actionId);
        pure.assertRuntimeTemplatePolicyBinding(projection.policy.target, projection.policy,
          tree.compactBindingAt(index), tree.pathFor(index), tree.root, BigInt(ordered.length));
        assert.equal(binding.configurationHash, projection.configurationHash);
      }
    }
  });
});

describe("M9 scenario-pack definitions", () => {
  it("defines exactly the three required application-neutral families", () => {
    assert.deepEqual(packIds.sort(), [
      "clinical-referral-consent",
      "delegated-purchasing-agent",
      "professional-site-access",
    ]);
    for (const packId of packIds) {
      const pack = getScenarioPack(packId);
      const parsed = parseScenarioTemplate(pack.template);
      assert.deepEqual(parsed, pack.template);
      assert.equal(hashScenarioTemplate(parsed).value.length, 66);
      assert.equal(pack.seeds.length, 2);
      assert.ok(pack.seeds.every((seed) => seed.startsWith("test:")));
      assert.ok(pack.flows.length > 0);
    }
  });

  it("keeps governance authority sets disjoint for every namespace", () => {
    for (const packId of packIds) {
      const policy = createNamespacePolicy(getScenarioPack(packId));
      const groups = [
        policy.authors,
        policy.reviewers,
        policy.governanceAuthorities,
        policy.allocators,
        policy.emergencyRevokers,
      ];
      const ids = groups.flatMap((group) => group.map(({ principalId }) => principalId));
      assert.equal(new Set(ids).size, ids.length);
      assert.equal(policy.reviewThreshold, 2);
    }
  });

  it("keeps domain literals out of the M2-M5 core implementations", () => {
    const coreFiles = [
      ["scenario-domain/src/model.ts", new URL("../../scenario-domain/src/model.ts", import.meta.url)],
      ["scenario-domain/src/validation.ts", new URL("../../scenario-domain/src/validation.ts", import.meta.url)],
      ["scenario-generator/src/generator.ts", new URL("../../scenario-generator/src/generator.ts", import.meta.url)],
      ["scenario-governance/src/registry.ts", new URL("../../scenario-governance/src/registry.ts", import.meta.url)],
      ["context-accounts/src/system.ts", new URL("../../context-accounts/src/system.ts", import.meta.url)],
    ];
    const forbidden = [
      "clinical-referral-consent",
      "temporary-site-access",
      "delegated-purchasing-agent",
      "authorize-treatment-referral",
      "prove-qualification-for-shift",
      "execute-bounded-purchase",
    ];
    for (const [label, url] of coreFiles) {
      const source = readFileSync(url, "utf8");
      for (const literal of forbidden) assert.equal(source.includes(literal), false, `${label} contains ${literal}`);
    }
  });
});

describe("deterministic generation and M5 authorization", () => {
  for (const packId of packIds) {
    it(`${packId} changes private values across declared seeds while preserving schema`, () => {
      const pack = getScenarioPack(packId);
      const first = createScenarioPackFixture(packId, pack.seeds[0]);
      const repeat = createScenarioPackFixture(packId, pack.seeds[0]);
      const second = createScenarioPackFixture(packId, pack.seeds[1]);
      assert.deepEqual(first, repeat);
      assert.notEqual(first.generated.privateInstance.instanceId, second.generated.privateInstance.instanceId);
      assert.deepEqual(first.generated.publicSummary.schema, second.generated.publicSummary.schema);
      assert.equal(first.templateHash.value, second.templateHash.value);
      assert.notDeepEqual(
        serializeGeneratedScenario(first.generated),
        serializeGeneratedScenario(second.generated),
      );
    });
  }

  for (const packId of packIds) {
    const pack = getScenarioPack(packId);
    for (const flow of pack.flows) {
      it(`${packId}/${flow.id} authorizes one exact flow and executes every M5 denial`, () => {
        const fixture = createScenarioPackFixture(packId, pack.seeds[0], flow.id);
        assert.equal(fixture.positiveDecision.allowed, true);
        for (const vector of fixture.negativeVectors) {
          assert.deepEqual(
            vector.observed,
            { allowed: false, reason: vector.expectedReason },
            vector.id,
          );
        }
        const observed = new Set(
          fixture.negativeVectors.flatMap(({ observed }) =>
            observed.allowed ? [] : [observed.reason],
          ),
        );
        assert.deepEqual([...observed].sort(), [...ACTION_DENIAL_REASONS].sort());
      });
    }
  }
});

describe("pack-specific privacy transformations", () => {
  it("separates clinical treatment, research, and emergency authority", () => {
    const pack = getScenarioPack("clinical-referral-consent");
    assert.deepEqual(pack.template.contexts.map(({ id }) => id), ["treatment", "research", "emergency"]);
    assert.equal(new Set(pack.flows.map(({ purpose }) => purpose)).size, 3);
    assert.equal(new Set(pack.flows.map(({ recipient }) => recipient)).size, 3);
    const emergency = pack.flows.find(({ id }) => id === "emergency-access")!;
    assert.ok(emergency.requiredProofSemantics.includes("selected-record-manifest"));
    assert.ok(emergency.requiredProofSemantics.includes("audit-obligation"));
  });

  it("discloses current qualification without unrelated professional history", () => {
    const fixture = createScenarioPackFixture("professional-site-access");
    assert.deepEqual(fixture.disclosurePreview.disclosedClaims, ["qualification-current", "shift-access-eligible"]);
    for (const privateField of ["full-transcript", "unrelated-credentials", "home-address", "employment-history"]) {
      assert.ok(fixture.disclosurePreview.remainsPrivate.includes(privateField));
    }
    assert.equal(fixture.definition.template.capabilityRules[0]!.validForSeconds, 28_800);
  });

  it("binds the Agent to counterparty, amount band, expiry, depth, and revocation", () => {
    const fixture = createScenarioPackFixture("delegated-purchasing-agent");
    assert.equal(fixture.positiveIntent.payload.recipient, "recipient.counterparty");
    assert.equal(fixture.positiveIntent.payload.resourceSelector, "counterparty-item-amount-band");
    assert.ok(fixture.flow.requiredProofSemantics.includes("amount-ceiling"));
    assert.equal(fixture.definition.template.capabilityRules[0]!.maxDelegationDepth, 2);
    for (const dimension of ["grant-revocation", "recipient", "resource", "nonce"]) {
      assert.ok(fixture.negativeVectors.some((vector) => vector.constrainedDimension === dimension));
    }
  });
});

describe("disclosure, upstream-fixture, and privacy evidence boundaries", () => {
  it("creates complete human previews without claiming they are receipts", () => {
    for (const packId of packIds) {
      const fixture = createScenarioPackFixture(packId);
      const preview = fixture.disclosurePreview;
      assert.equal(preview.recipient, fixture.flow.recipient);
      assert.equal(preview.purpose, fixture.flow.purpose);
      assert.ok(preview.validBefore > preview.validAfter);
      assert.ok(preview.disclosedClaims.length > 0);
      assert.ok(preview.newlyCreatedLinkages.length > 0);
      assert.ok(preview.remainsPrivate.length > 0);
    }
  });

  it("keeps every generated authorization window within its template duration", () => {
    for (const packId of packIds) {
      const pack = getScenarioPack(packId);
      for (const flow of pack.flows) {
        const fixture = createScenarioPackFixture(packId, pack.seeds[0], flow.id);
        const rule = pack.template.capabilityRules.find(row => row.actionIds.includes(flow.actionId))!;
        assert.ok(fixture.disclosurePreview.validBefore - fixture.disclosurePreview.validAfter <=
          rule.validForSeconds * 1000, `${packId}/${flow.id} exceeds the activated duration`);
      }
    }
  });

  it("marks every M6-M8 expectation as non-live and pending authoritative codecs", () => {
    for (const packId of packIds) {
      const fixture = createScenarioPackFixture(packId);
      const expected = fixture.upstreamExpectation;
      assert.equal(expected.status, "contract-fixture");
      assert.equal(expected.liveEvidence, false);
      assert.equal(expected.m6.authoritativeCodec, "pending-m6");
      assert.equal(expected.m6.unsupportedProofResult, "UNSUPPORTED_PROOF_REQUIREMENT");
      assert.equal(expected.m7.authoritativeEnvelope, "pending-m7");
      assert.equal(expected.m8.authoritativeExecutionResult, "pending-m8");
      assert.equal(Object.hasOwn(expected.m6, "receipt"), false);
      assert.equal(Object.hasOwn(expected.m7, "signature"), false);
      assert.equal(Object.hasOwn(expected.m8, "transactionHash"), false);
    }
  });

  it("scans receipts, indexer captures, gateway logs, EVM events, and documents", () => {
    const fixture = createScenarioPackFixture("delegated-purchasing-agent");
    const safeArtifacts = [
      { name: "receipt.json", kind: "receipt" as const, content: JSON.stringify(fixture.upstreamExpectation) },
      { name: "indexer.json", kind: "indexer-dump" as const, content: "public projection unavailable pending M8" },
      { name: "gateway.log", kind: "gateway-log" as const, content: "transport unavailable pending M7" },
      { name: "execution.json", kind: "evm-event" as const, content: "execution unavailable pending M8" },
      { name: "preview.md", kind: "generated-document" as const, content: JSON.stringify(fixture.disclosurePreview) },
    ];
    assertScenarioPackPublicArtifactsSafe(fixture, safeArtifacts);
    assert.equal(scanScenarioPackPublicArtifacts(fixture, safeArtifacts).length, 0);

    const leaked = fixture.additionalPrivateValues.find(({ path }) => path.endsWith("actorAccountId"))!;
    assert.throws(
      () => assertScenarioPackPublicArtifactsSafe(fixture, [{ name: "leaked.log", kind: "gateway-log", content: Buffer.from(leaked.value).toString("base64") }]),
      (error: unknown) => error instanceof ArtifactPrivacyError && error.findings.some(({ privatePath, encoding }) => privatePath === leaked.path && encoding === "base64"),
    );
  });
});
