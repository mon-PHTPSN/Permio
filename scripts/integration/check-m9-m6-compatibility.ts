import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { SCENARIO_PACKS, createScenarioPackFixture } from "../../packages/scenario-packs/src/index.ts";
import { createRuntimeTemplateActionPolicy } from "../../packages/midnight-authorization/src/template-policy.ts";
import { pureCircuits as pure } from "../../packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js";

const [reportPath] = process.argv.slice(2);
assert(reportPath && process.argv.length === 3,
  "Usage: node scripts/integration/check-m9-m6-compatibility.ts <public-report.json>");

// Exercise generated M5 authorization and the authoritative M6 policy/state predicates.
// This performs no proof requests, template activation, or network submissions.
const cases = Object.values(SCENARIO_PACKS).flatMap(pack => pack.seeds.flatMap(seed =>
  pack.flows.map(flow => {
    const action = pack.template.actions.find(row => row.id === flow.actionId)!;
    const profile = pack.template.proofProfiles.find(row => row.id === action.proofProfileId)!;
    try {
      const fixture = createScenarioPackFixture(pack.id, seed, flow.id);
      assert.equal(fixture.positiveDecision.allowed, true);
      const projection = createRuntimeTemplateActionPolicy(fixture.definition.template, action.id);
      const transition = projection.transitionAt(0);
      const state = {
        stateVersion: 2n, instanceCommitment: new Uint8Array(32).fill(1), lastMutationAt: 100n,
        slotAssignmentsRoot: pure.runtimePrivateMapEmptyRoot(), slotAssignmentCount: 1n,
        slotBindingsRoot: pure.runtimePrivateMapEmptyRoot(), slotBindingCount: 1n,
        stateIdHash: transition.fromStateIdHash, nonce: new Uint8Array(32).fill(2),
      };
      pure.assertRuntimeTemplateTransition(projection.policy, transition, projection.transitionPathAt(0),
        transition.fromStateIdHash, transition.toStateIdHash);
      pure.runtimeActionNextState(state, transition.toStateIdHash, new Uint8Array(32).fill(3),
        101n, projection.moduleId === "private-state-transition");
      const rule = pack.template.capabilityRules.find(row => row.actionIds.includes(action.id))!;
      assert(fixture.disclosurePreview.validBefore - fixture.disclosurePreview.validAfter <= rule.validForSeconds * 1000);
      return { packId: pack.id, seed, flowId: flow.id, templateVersion: pack.template.version,
        publicOutputSchemaId: profile.publicOutputSchemaId, moduleId: projection.moduleId,
        configurationHash: projection.configurationHash, m5Allowed: true, statePredicateChecked: true,
        accepted: true, error: null };
    } catch (error) {
      if (!(error instanceof TypeError) || error.message !== "UNSUPPORTED_PROOF_REQUIREMENT") throw error;
      return { packId: pack.id, seed, flowId: flow.id, publicOutputSchemaId: profile.publicOutputSchemaId,
        accepted: false, error: error.message };
    }
  })));

const rejected = cases.filter(row => !row.accepted).length;
const fingerprint = (relative: string) => createHash("sha256")
  .update(readFileSync(new URL(relative, import.meta.url))).digest("hex");
const report = {
  schemaVersion: 1,
  tier: "M9_GENERATED_M5_TO_M6_POLICY_AND_TRANSITION",
  status: rejected === 0 ? "POLICY_COMPATIBLE_LIVE_NOT_VERIFIED" : "BLOCKED_UNSUPPORTED_PROOF_REQUIREMENT",
  total: cases.length, accepted: cases.length - rejected, rejected, cases,
  sourceSha256: {
    m9Templates: fingerprint("../../packages/scenario-packs/src/templates.ts"),
    m6Policy: fingerprint("../../packages/midnight-authorization/src/template-policy.ts"),
  },
  proofSemanticsVerified: false, liveEndToEnd: false, newMidnightSubmissions: 0, newProofRequests: 0,
};
writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ status: report.status, total: cases.length, rejected, reportPath }));
process.exitCode = rejected === 0 ? 0 : 1;
