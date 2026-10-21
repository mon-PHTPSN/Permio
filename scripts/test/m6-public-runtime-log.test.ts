import assert from "node:assert/strict";
import { it } from "node:test";
import { sanitizeM6RuntimePublicLog } from "../m6-public-runtime-log.ts";
import { scanM6PublicArtifacts } from "../m6-public-artifact-scan.ts";

it("public log copies remove private allocation expiry while preserving the explicitly public signed transaction deadline", () => {
  const privateExpiry="2026-11-01T02:00:00.000Z", publicDeadline="2026-11-01T01:59:59.000Z";
  const input=Buffer.from([JSON.stringify({phase:"ordinary-instance-allocated",expiresAtUtc:privateExpiry,index:0}),
    JSON.stringify({phase:"candidate-proof-window-verified",expiresAtUtc:publicDeadline,boundedBySignedWindow:true})].join("\n")+"\n");
  const original=Buffer.from(input), result=sanitizeM6RuntimePublicLog(input);
  assert.deepEqual(input,original); assert(!result.bytes.includes(privateExpiry)); assert(result.bytes.includes(publicDeadline));
  assert.equal(result.report.removedPrivateFieldCount,1); assert(!JSON.stringify(result.report).includes(privateExpiry));
  assert(!scanM6PublicArtifacts(new Map([["raw.jsonl",input]]),[privateExpiry]).passed);
  assert(scanM6PublicArtifacts(new Map([["public.jsonl",result.bytes]]),[privateExpiry]).passed);
});
it("legacy future-credential timing fields are removed without hiding diagnostic codes or operation labels", () => {
  const result=sanitizeM6RuntimePublicLog(Buffer.from(JSON.stringify({phase:"future-capability-awaiting-real-activation-time",
    notBeforeUtc:"2026-11-01T01:00:00.000Z",expiresAtUtc:"2026-11-01T05:00:00.000Z",maximumDurationSeconds:14400,diagnosticCode:170})+"\n"));
  assert.equal(result.report.removedPrivateFieldCount,3); assert.equal(JSON.parse(result.bytes.toString()).diagnosticCode,170);
});
it("unstructured output and unclassified validity metadata fail closed instead of becoming public evidence", () => {
  for (const line of ["raw private text", "[]", JSON.stringify({phase:"unknown",expiresAtUtc:"2026-11-01T01:00:00.000Z"}),
    JSON.stringify({phase:"unknown",notBeforeUtc:"2026-11-01T01:00:00.000Z"})]) assert.throws(()=>sanitizeM6RuntimePublicLog(Buffer.from(line)));
});
