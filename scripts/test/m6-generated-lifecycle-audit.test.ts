import assert from "node:assert/strict";
import test from "node:test";
import {ordinaryActionFixture} from "../../packages/midnight-authorization/test/fixtures/ordinary-action.ts";
import {seedGeneratedMap} from "../../packages/midnight-authorization/test/fixtures/generated-genesis.ts";
import {auditM6GeneratedLifecycle} from "../m6-generated-lifecycle-audit.ts";

for(const transitioning of [false,true])test(`generated ${transitioning?"state-changing":"non-transitioning"} witness rejects revoked module/template rows at their lifecycle checks`,()=>{
 const f=ordinaryActionFixture({transitioning});f.finishPreparation();const before=f.context(),preparedState=before.currentQueryContext.state.state.encode();
 for(const registry of ["proofModules","activeTemplates"]as const){
  const key=registry==="proofModules"?f.moduleKey:f.templateKey;
  const record=registry==="proofModules"?{...f.moduleRecord,lifecycleStatus:6n,revokedAt:600n}:{...f.templateRecord,lifecycleStatus:3n,revokedAt:600n};
  const after=seedGeneratedMap(before.currentQueryContext.state,registry,key,record);
  const result=auditM6GeneratedLifecycle({contract:f.contract,address:before.currentQueryContext.address,arguments:f.executeArgs(),
   preparedState,lifecycleState:f.context(after).currentQueryContext.state.state.encode(),registry,key,clockSeconds:500n});
  assert(result.passed&&result.actualLifecycleRowRejectedAtExpectedCheck&&result.restoringOnlyRegistryRowAccepted&&result.nativeSubmissions===0);
 }
 // A different failure must not masquerade as lifecycle rejection.
 const stale=f.context().currentQueryContext.state;f.execute();
 assert.throws(()=>auditM6GeneratedLifecycle({contract:f.contract,address:before.currentQueryContext.address,arguments:f.executeArgs(),
  preparedState:f.context().currentQueryContext.state.state.encode(),lifecycleState:f.context(stale).currentQueryContext.state.state.encode(),registry:"proofModules",key:f.moduleKey,clockSeconds:500n}));
});
