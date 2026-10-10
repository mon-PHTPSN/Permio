import {
  hashScenarioTemplate,
  type ScenarioTemplate,
} from "@permio/scenario-domain";

import {
  SCENARIO_GENERATOR_VERSION,
  type ScenarioGeneratorInput,
} from "../../src/index.ts";

export function makeTemplate(): ScenarioTemplate {
  return {
    schemaVersion: 1,
    namespace: "test.synthetic",
    templateId: "test.synthetic/bounded-operation",
    version: "1.0.0",
    displayName: "Synthetic bounded operation",
    description: "A neutral generator test schema.",
    participantSlots: [
      {
        id: "requester",
        description: "Requests one bounded operation.",
        assignableBy: ["@instance-creator"],
      },
      {
        id: "recipient",
        description: "Receives one bounded result.",
        assignableBy: ["@namespace-governance"],
      },
    ],
    contexts: [
      {
        id: "bounded-context",
        description: "A generic purpose-limited context.",
        allowedSlotIds: ["requester", "recipient"],
        recordTypes: ["source-record"],
        claimTypes: ["minimum-result"],
        recipientKinds: ["named-recipient"],
        purposes: ["bounded-purpose"],
      },
    ],
    states: ["prepared", "completed"],
    initialState: "prepared",
    actions: [
      {
        id: "perform-bounded-operation",
        description: "Performs one generic operation.",
        contextId: "bounded-context",
        actorSlotId: "requester",
        inputRecordTypes: ["source-record"],
        outputClaimTypes: ["minimum-result"],
        purpose: "bounded-purpose",
        recipientKind: "named-recipient",
        capabilityRuleId: "bounded-capability",
        proofProfileId: "minimum-proof",
        executionAdapterId: null,
      },
    ],
    transitions: [
      {
        id: "complete-operation",
        fromState: "prepared",
        actionId: "perform-bounded-operation",
        toState: "completed",
      },
    ],
    capabilityRules: [
      {
        id: "bounded-capability",
        description: "Limits one operation.",
        actionIds: ["perform-bounded-operation"],
        resourceSelector: "selected-resource",
        purpose: "bounded-purpose",
        recipientConstraint: "named-recipient",
        validForSeconds: 600,
        maxDelegationDepth: 0,
        disclosurePolicyId: "minimum-disclosure",
        revocable: true,
      },
    ],
    proofProfiles: [
      {
        id: "minimum-proof",
        circuitId: "generic-claim-v1",
        publicOutputSchemaId: "bounded-result-v1",
      },
    ],
    executionAdapters: [],
    privacyInvariants: [
      {
        id: "scoped-principal",
        description: "Principal values are scoped to one generated instance and context.",
      },
    ],
  };
}

export function makeInput(seed = "test:generator-vector-01"): ScenarioGeneratorInput {
  const template = makeTemplate();
  return {
    template,
    templateHash: hashScenarioTemplate(template),
    generatorVersion: SCENARIO_GENERATOR_VERSION,
    explicitSeed: seed,
    policyProfile: {
      schemaVersion: 1,
      id: "deterministic-fixture",
      version: "1.0.0",
      baseTimestamp: "2040-01-01T00:00:00.000Z",
      eventIntervalSeconds: 37,
      syntheticValueBytes: 20,
    },
  };
}
