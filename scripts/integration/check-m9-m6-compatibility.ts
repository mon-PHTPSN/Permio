import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { SCENARIO_PACKS } from "../../packages/scenario-packs/src/index.ts";
import { createRuntimeTemplateActionPolicy } from "../../packages/midnight-authorization/src/template-policy.ts";

const [reportPath] = process.argv.slice(2);
assert(reportPath && process.argv.length === 3,
  "Usage: node scripts/integration/check-m9-m6-compatibility.ts <public-report.json>");

// Exercise the unchanged M9 templates against the authoritative M6 policy gate.
// This performs no proof requests, template activation, or network submissions.
const cases = Object.values(SCENARIO_PACKS).flatMap(pack => pack.seeds.flatMap(seed =>
  pack.flows.map(flow => {
    const action = pack.template.actions.find(row => row.id === flow.actionId)!;
    const profile = pack.template.proofProfiles.find(row => row.id === action.proofProfileId)!;
    try {
      createRuntimeTemplateActionPolicy(pack.template, action.id);
      return { packId: pack.id, seed, flowId: flow.id, publicOutputSchemaId: profile.publicOutputSchemaId,
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
  tier: "M9_TEMPLATE_TO_AUTHORITATIVE_M6_POLICY_GATE",
  status: rejected === 0 ? "COMPATIBLE" : "BLOCKED_UNSUPPORTED_PROOF_REQUIREMENT",
  total: cases.length, accepted: cases.length - rejected, rejected, cases,
  sourceSha256: {
    m9Templates: fingerprint("../../packages/scenario-packs/src/templates.ts"),
    m6Policy: fingerprint("../../packages/midnight-authorization/src/template-policy.ts"),
  },
  liveEndToEnd: false, newMidnightSubmissions: 0, newProofRequests: 0,
};
writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ status: report.status, total: cases.length, rejected, reportPath }));
process.exitCode = rejected === 0 ? 0 : 1;
