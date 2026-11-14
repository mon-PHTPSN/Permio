import type { ScenarioTemplate } from "@permio/scenario-domain";
import type { GeneratorPolicyProfile } from "@permio/scenario-generator";

import type { ScenarioPackDefinition, ScenarioPackFlow, ScenarioPackId } from "./model.ts";

const profiles: Readonly<Record<ScenarioPackId, GeneratorPolicyProfile>> = {
  "clinical-referral-consent": {
    schemaVersion: 1,
    id: "m9-clinical-pack",
    version: "1.0.0",
    baseTimestamp: "2041-01-01T00:00:00.000Z",
    eventIntervalSeconds: 47,
    syntheticValueBytes: 24,
  },
  "professional-site-access": {
    schemaVersion: 1,
    id: "m9-professional-pack",
    version: "1.0.0",
    baseTimestamp: "2041-02-01T00:00:00.000Z",
    eventIntervalSeconds: 31,
    syntheticValueBytes: 24,
  },
  "delegated-purchasing-agent": {
    schemaVersion: 1,
    id: "m9-agent-pack",
    version: "1.0.0",
    baseTimestamp: "2041-03-01T00:00:00.000Z",
    eventIntervalSeconds: 29,
    syntheticValueBytes: 24,
  },
};

const clinicalFlows: readonly ScenarioPackFlow[] = [
  {
    id: "treatment-referral",
    contextId: "treatment",
    actionId: "authorize-treatment-referral",
    resourceSelector: "selected-referral",
    resource: "referral.primary",
    purpose: "treatment-referral",
    recipientKind: "care-provider",
    recipient: "recipient.care-provider",
    disclosurePolicyId: "treatment-minimum",
    disclosedClaims: ["referral-eligibility"],
    newlyCreatedLinkages: ["patient-to-care-provider-for-treatment"],
    remainsPrivate: ["diagnosis-details", "research-consent", "unselected-records"],
    requiredProofSemantics: ["credential-control", "selected-record-integrity"],
  },
  {
    id: "research-consent",
    contextId: "research",
    actionId: "authorize-research-consent",
    resourceSelector: "selected-study",
    resource: "study.primary",
    purpose: "research-enrollment",
    recipientKind: "research-program",
    recipient: "recipient.research-program",
    disclosurePolicyId: "research-consent-minimum",
    disclosedClaims: ["research-consent-active"],
    newlyCreatedLinkages: ["participant-to-study-for-consented-purpose"],
    remainsPrivate: ["treatment-records", "diagnosis-details", "other-study-history"],
    requiredProofSemantics: ["credential-control", "purpose-bound-consent"],
  },
  {
    id: "emergency-access",
    contextId: "emergency",
    actionId: "authorize-emergency-access",
    resourceSelector: "selected-emergency-records",
    resource: "manifest.emergency-primary",
    purpose: "emergency-treatment",
    recipientKind: "emergency-provider",
    recipient: "recipient.emergency-provider",
    disclosurePolicyId: "emergency-selected-records",
    disclosedClaims: ["emergency-access-authorized", "audit-required"],
    newlyCreatedLinkages: ["patient-to-emergency-provider-for-short-lived-access"],
    remainsPrivate: ["unselected-records", "research-consent", "complete-history"],
    requiredProofSemantics: ["selected-record-manifest", "short-validity", "audit-obligation"],
  },
];

const clinicalTemplate: ScenarioTemplate = {
  schemaVersion: 1,
  namespace: "permio.clinical",
  templateId: "permio.clinical/referral-consent",
  version: "1.0.0",
  displayName: "Clinical referral and research consent",
  description: "Purpose-separated treatment, research, and optional emergency authorization.",
  participantSlots: [
    { id: "subject", description: "The context-scoped subject.", assignableBy: ["@instance-creator"] },
    { id: "care-provider", description: "The selected treatment recipient.", assignableBy: ["@namespace-governance"] },
    { id: "research-program", description: "The selected research recipient.", assignableBy: ["@namespace-governance"] },
    { id: "emergency-provider", description: "The selected emergency recipient.", assignableBy: ["@namespace-governance"] },
  ],
  contexts: [
    { id: "treatment", description: "Purpose-bound treatment referral.", allowedSlotIds: ["subject", "care-provider"], recordTypes: ["referral-record"], claimTypes: ["referral-eligibility"], recipientKinds: ["care-provider"], purposes: ["treatment-referral"] },
    { id: "research", description: "Independent research consent.", allowedSlotIds: ["subject", "research-program"], recordTypes: ["consent-record", "study-protocol"], claimTypes: ["research-consent-active"], recipientKinds: ["research-program"], purposes: ["research-enrollment"] },
    { id: "emergency", description: "Optional short-lived selected-record access.", allowedSlotIds: ["subject", "emergency-provider"], recordTypes: ["emergency-selection-manifest"], claimTypes: ["emergency-access-authorized", "audit-required"], recipientKinds: ["emergency-provider"], purposes: ["emergency-treatment"] },
  ],
  states: ["ready", "treatment-referred", "research-consented", "emergency-audited"],
  initialState: "ready",
  actions: clinicalFlows.map((flow) => ({
    id: flow.actionId,
    description: `Authorize ${flow.id} without authorizing another clinical purpose.`,
    contextId: flow.contextId,
    actorSlotId: "subject",
    inputRecordTypes: flow.contextId === "research" ? ["consent-record", "study-protocol"] : flow.contextId === "emergency" ? ["emergency-selection-manifest"] : ["referral-record"],
    outputClaimTypes: [...flow.disclosedClaims],
    purpose: flow.purpose,
    recipientKind: flow.recipientKind,
    capabilityRuleId: `${flow.id}-capability`,
    proofProfileId: `${flow.id}-proof`,
    executionAdapterId: "clinical-disclosure-adapter-v1",
  })),
  transitions: [
    { id: "record-treatment-referral", fromState: "ready", actionId: "authorize-treatment-referral", toState: "treatment-referred" },
    { id: "record-research-consent", fromState: "ready", actionId: "authorize-research-consent", toState: "research-consented" },
    { id: "record-emergency-access", fromState: "ready", actionId: "authorize-emergency-access", toState: "emergency-audited" },
  ],
  capabilityRules: clinicalFlows.map((flow) => ({
    id: `${flow.id}-capability`,
    description: `Restrict ${flow.id} to its exact purpose and recipient.`,
    actionIds: [flow.actionId],
    resourceSelector: flow.resourceSelector,
    purpose: flow.purpose,
    recipientConstraint: flow.recipientKind,
    validForSeconds: flow.id === "emergency-access" ? 300 : 3_600,
    maxDelegationDepth: 1,
    disclosurePolicyId: flow.disclosurePolicyId,
    revocable: true,
  })),
  proofProfiles: clinicalFlows.map((flow) => ({ id: `${flow.id}-proof`, circuitId: "private-state-transition-v1", publicOutputSchemaId: `${flow.id}-output-v1` })),
  executionAdapters: [{ id: "clinical-disclosure-adapter-v1", kind: "application", schemaId: "clinical-disclosure-v1" }],
  privacyInvariants: [
    { id: "clinical-purpose-separation", description: "Treatment, research, and emergency authority are never interchangeable." },
    { id: "clinical-selected-disclosure", description: "Only the selected claim and recipient linkage become public." },
  ],
};

const professionalFlow: ScenarioPackFlow = {
  id: "qualification-site-access",
  contextId: "temporary-site-access",
  actionId: "prove-qualification-for-shift",
  resourceSelector: "site-task-shift",
  resource: "site.primary-task.primary-shift.primary",
  purpose: "temporary-site-entry",
  recipientKind: "site-controller",
  recipient: "recipient.site-controller",
  disclosurePolicyId: "current-qualification-only",
  disclosedClaims: ["qualification-current", "shift-access-eligible"],
  newlyCreatedLinkages: ["professional-to-site-for-one-task-and-shift"],
  remainsPrivate: ["full-transcript", "unrelated-credentials", "home-address", "employment-history"],
  requiredProofSemantics: ["credential-current", "site-task-shift-binding"],
};

const professionalTemplate: ScenarioTemplate = {
  schemaVersion: 1,
  namespace: "permio.professional",
  templateId: "permio.professional/temporary-site-access",
  version: "1.0.0",
  displayName: "Professional qualification and temporary site access",
  description: "Current-qualification proof for one site, task, and shift.",
  participantSlots: [
    { id: "professional", description: "The context-scoped professional.", assignableBy: ["@instance-creator"] },
    { id: "site-controller", description: "The exact temporary-access recipient.", assignableBy: ["@namespace-governance"] },
  ],
  contexts: [{ id: "temporary-site-access", description: "One site, task, and shift.", allowedSlotIds: ["professional", "site-controller"], recordTypes: ["qualification-record", "shift-assignment"], claimTypes: ["qualification-current", "shift-access-eligible"], recipientKinds: ["site-controller"], purposes: ["temporary-site-entry"] }],
  states: ["scheduled", "access-authorized"],
  initialState: "scheduled",
  actions: [{ id: professionalFlow.actionId, description: "Prove a current qualification for one scheduled shift.", contextId: professionalFlow.contextId, actorSlotId: "professional", inputRecordTypes: ["qualification-record", "shift-assignment"], outputClaimTypes: [...professionalFlow.disclosedClaims], purpose: professionalFlow.purpose, recipientKind: professionalFlow.recipientKind, capabilityRuleId: "shift-access-capability", proofProfileId: "current-qualification-proof", executionAdapterId: "temporary-site-access-adapter-v1" }],
  transitions: [{ id: "authorize-shift-access", fromState: "scheduled", actionId: professionalFlow.actionId, toState: "access-authorized" }],
  capabilityRules: [{ id: "shift-access-capability", description: "Expire access at the exact shift boundary.", actionIds: [professionalFlow.actionId], resourceSelector: professionalFlow.resourceSelector, purpose: professionalFlow.purpose, recipientConstraint: professionalFlow.recipientKind, validForSeconds: 28_800, maxDelegationDepth: 1, disclosurePolicyId: professionalFlow.disclosurePolicyId, revocable: true }],
  proofProfiles: [{ id: "current-qualification-proof", circuitId: "private-state-transition-v1", publicOutputSchemaId: "current-qualification-v1" }],
  executionAdapters: [{ id: "temporary-site-access-adapter-v1", kind: "contract", schemaId: "temporary-site-access-v1" }],
  privacyInvariants: [{ id: "qualification-minimization", description: "No transcript or unrelated history is disclosed." }, { id: "shift-and-site-isolation", description: "Access cannot cross a site or shift boundary." }],
};

const agentFlow: ScenarioPackFlow = {
  id: "bounded-purchase",
  contextId: "delegated-procurement",
  actionId: "execute-bounded-purchase",
  resourceSelector: "counterparty-item-amount-band",
  resource: "counterparty.primary-item.primary-band.approved",
  purpose: "approved-procurement",
  recipientKind: "named-counterparty",
  recipient: "recipient.counterparty",
  disclosurePolicyId: "purchase-authorization-minimum",
  disclosedClaims: ["purchase-authorized", "amount-within-ceiling"],
  newlyCreatedLinkages: ["agent-to-counterparty-for-one-approved-purchase"],
  remainsPrivate: ["principal-identity", "unrelated-purchases", "account-history", "unused-budget"],
  requiredProofSemantics: ["delegation-ancestry", "amount-ceiling", "revocation-current"],
};

const agentTemplate: ScenarioTemplate = {
  schemaVersion: 1,
  namespace: "permio.procurement",
  templateId: "permio.procurement/delegated-purchasing-agent",
  version: "1.0.0",
  displayName: "Delegated financial or purchasing Agent",
  description: "Attenuated Agent authority for one bounded counterparty operation.",
  participantSlots: [
    { id: "principal", description: "The context-scoped delegating principal.", assignableBy: ["@instance-creator"] },
    { id: "agent", description: "The attenuated purchasing Agent.", assignableBy: ["principal"] },
    { id: "counterparty", description: "The exact transaction recipient.", assignableBy: ["@namespace-governance"] },
  ],
  contexts: [{ id: "delegated-procurement", description: "One bounded procurement mandate.", allowedSlotIds: ["principal", "agent", "counterparty"], recordTypes: ["purchase-mandate", "purchase-request"], claimTypes: ["purchase-authorized", "amount-within-ceiling"], recipientKinds: ["named-counterparty"], purposes: ["approved-procurement"] }],
  states: ["mandate-active", "purchase-executed"],
  initialState: "mandate-active",
  actions: [{ id: agentFlow.actionId, description: "Execute one purchase inside the delegated mandate.", contextId: agentFlow.contextId, actorSlotId: "agent", inputRecordTypes: ["purchase-mandate", "purchase-request"], outputClaimTypes: [...agentFlow.disclosedClaims], purpose: agentFlow.purpose, recipientKind: agentFlow.recipientKind, capabilityRuleId: "bounded-purchase-capability", proofProfileId: "delegated-purchase-proof", executionAdapterId: "bounded-purchase-adapter-v1" }],
  transitions: [{ id: "record-bounded-purchase", fromState: "mandate-active", actionId: agentFlow.actionId, toState: "purchase-executed" }],
  capabilityRules: [{ id: "bounded-purchase-capability", description: "Bind counterparty, operation, amount band, purpose, lifetime, and delegation depth.", actionIds: [agentFlow.actionId], resourceSelector: agentFlow.resourceSelector, purpose: agentFlow.purpose, recipientConstraint: agentFlow.recipientKind, validForSeconds: 1_800, maxDelegationDepth: 2, disclosurePolicyId: agentFlow.disclosurePolicyId, revocable: true }],
  proofProfiles: [{ id: "delegated-purchase-proof", circuitId: "delegated-capability-action-v1", publicOutputSchemaId: "bounded-purchase-authorization-v1" }],
  executionAdapters: [{ id: "bounded-purchase-adapter-v1", kind: "contract", schemaId: "bounded-purchase-execution-v1" }],
  privacyInvariants: [{ id: "agent-attenuation", description: "Agent authority cannot exceed the exact delegated mandate." }, { id: "agent-history-isolation", description: "The Agent cannot read unrelated account or purchase history." }],
};

export const SCENARIO_PACKS: Readonly<Record<ScenarioPackId, ScenarioPackDefinition>> = {
  "clinical-referral-consent": { formatVersion: 1, id: "clinical-referral-consent", version: "1.0.0", template: clinicalTemplate, generatorPolicyProfile: profiles["clinical-referral-consent"], seeds: ["test:m9-clinical-primary-v1", "test:m9-clinical-variant-v1"], flows: clinicalFlows },
  "professional-site-access": { formatVersion: 1, id: "professional-site-access", version: "1.0.0", template: professionalTemplate, generatorPolicyProfile: profiles["professional-site-access"], seeds: ["test:m9-professional-primary-v1", "test:m9-professional-variant-v1"], flows: [professionalFlow] },
  "delegated-purchasing-agent": { formatVersion: 1, id: "delegated-purchasing-agent", version: "1.0.0", template: agentTemplate, generatorPolicyProfile: profiles["delegated-purchasing-agent"], seeds: ["test:m9-delegated-agent-primary-v1", "test:m9-delegated-agent-variant-v1"], flows: [agentFlow] },
};

export function getScenarioPack(id: ScenarioPackId): ScenarioPackDefinition {
  return structuredClone(SCENARIO_PACKS[id]);
}
