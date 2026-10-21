import assert from "node:assert/strict";
import test from "node:test";
import { buildRuntimeScopeTrees, buildRuntimeActionScopePaths } from "@permio/midnight-authorization";
import { restoreCertifiedScope } from "../m6-restore-certified-ordinary.ts";
import { ordinaryActionFixture } from "../../packages/midnight-authorization/test/fixtures/ordinary-action.ts";
const scope={actions:["perform"],resourceSelectors:["item-id"],resources:["item-one"],purposes:["purpose-one"],
  recipientKinds:["organization"],recipients:["recipient-one"],disclosurePolicyIds:["minimal"]};
test("checkpoint recovery restores all seven scope-tree methods and builds actual action paths",()=>{
  const original=buildRuntimeScopeTrees(scope);
  const checkpoint=JSON.parse(JSON.stringify(original,(_key,v)=>typeof v==="bigint"?String(v):v));
  assert.equal(typeof checkpoint.actions.pathForHash,"undefined");
  const rebuilt=restoreCertifiedScope(scope,original.roots);
  const fixture=ordinaryActionFixture();
  assert.deepEqual(buildRuntimeActionScopePaths(fixture.intent,rebuilt),buildRuntimeActionScopePaths(fixture.intent,original));
});
test("checkpoint recovery rejects scope values that do not reproduce the certified roots",()=>{
  const original=buildRuntimeScopeTrees(scope);
  assert.throws(()=>restoreCertifiedScope({...scope,recipients:["another-recipient"]},original.roots));
});
