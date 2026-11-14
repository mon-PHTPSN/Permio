import type { ScenarioTemplate } from "@permio/scenario-domain";

export function libraryTemplate(): ScenarioTemplate {
  return {
    schemaVersion: 1, namespace: "fixture.library", templateId: "fixture.library/access", version: "2.1.0",
    displayName: "Temporary access and renewal", description: "Synthetic multi-context library definition.",
    participantSlots: [{ id: "visitor", description: "Context-bound visitor", assignableBy: ["@instance-creator"] }],
    contexts: ["entrance", "renewal"].map((id) => ({ id, description: `${id} context`, allowedSlotIds: ["visitor"],
      recordTypes: ["eligibility"], claimTypes: ["authorization"], recipientKinds: ["operator"], purposes: [id] })),
    states: ["ready", "entered", "renewed"], initialState: "ready",
    actions: ["entrance", "renewal"].map((id) => ({ id: `request-${id}`, description: `Request ${id}`, contextId: id,
      actorSlotId: "visitor", inputRecordTypes: ["eligibility"], outputClaimTypes: ["authorization"], purpose: id,
      recipientKind: "operator", capabilityRuleId: `rule-${id}`, proofProfileId: "scoped-proof", executionAdapterId: null })),
    transitions: [{ id: "enter", fromState: "ready", actionId: "request-entrance", toState: "entered" },
      { id: "renew", fromState: "entered", actionId: "request-renewal", toState: "renewed" }],
    capabilityRules: ["entrance", "renewal"].map((id) => ({ id: `rule-${id}`, description: `Bounded ${id}`,
      actionIds: [`request-${id}`], resourceSelector: "site", purpose: id, recipientConstraint: "operator",
      validForSeconds: 900, maxDelegationDepth: 0, disclosurePolicyId: `minimum-${id}`, revocable: true })),
    proofProfiles: [{ id: "scoped-proof", circuitId: "delegated-capability-action-v1", publicOutputSchemaId: "decision-receipt-v1" }],
    executionAdapters: [], privacyInvariants: [{ id: "scoped-identity", description: "No cross-context identity disclosure." }],
  };
}
