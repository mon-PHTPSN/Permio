import assert from "node:assert/strict";
import test from "node:test";
import {RemainingTestBudget,REMAINING_RECOVERY172_POSITIVE_BUDGET} from "../m6-remaining-test-budget.ts";
import {remainingContinuationStep} from "../m6-remaining-continuation-plan.ts";
import {recovery150Step} from "../m6-recovery150-plan.ts";
import {recovery172Step,recovery172WarmBatch} from "../m6-recovery172-plan.ts";

test("approved172 preserves all115 historical attempts and limits the remaining phase to42 calls/five instances",()=>{
  const budget=new RemainingTestBudget("approved172"),contract="ab".repeat(32);
  const add=(entry:string,count:number,governance?:string)=>{for(let i=0;i<count;i++)budget.reserve({entry,contract,...(governance?{governance}:{})});};
  add("deploy",1);add("governAuthorization",2,"proposeProofModule");add("governAuthorization",4,"reviewProofModule");add("governAuthorization",6,"governProofModule");
  for(const entry of ["beginM4Activation","stageM4ActivationBinding","finalizeM4Activation"])add(entry,2);
  add("allocateRuntimeInstance",1);add("updateRuntimeCredentialStatus",19);add("manageRuntimeParticipantSlots",2);add("prepareRuntimeAction",4);
  for(let round=46;round<=51;round++)budget.reserve({...remainingContinuationStep(round),contract});
  budget.abandonUnsubmittedReservation({reservationId:51,negativeCase:"independent-competing-transition",neverSubmittedVerified:true,originalExpiryPassed:true});
  add("allocateRuntimeInstance",1);add("updateRuntimeCredentialStatus",3);
  for(let round=56;round<=116;round++){
    assert.deepEqual(recovery172Step(round),recovery150Step(round));
    assert.equal(budget.reserve({...recovery172Step(round),contract}),round);
  }
  assert.equal(budget.evidence().maximumNativeAttemptsReserved,115);
  assert.equal(budget.evidence().perEntry.allocateRuntimeInstance,4);
  for(let round=117;round<=158;round++)assert.equal(budget.reserve({...recovery172Step(round),contract}),round);
  assert.equal(budget.evidence().maximumNativeAttemptsReserved,157);
  assert.equal(budget.evidence().nativeCeiling,172);
  assert.deepEqual(budget.evidence().perEntry,REMAINING_RECOVERY172_POSITIVE_BUDGET);
  assert.equal(budget.evidence().negativeCases.length,4);
  for(const entry of ["allocateRuntimeInstance","updateRuntimeCredentialStatus","prepareRuntimeAction","executeRuntimeAction","terminateTemplate","deploy"])
    assert.throws(()=>budget.reserve({entry,contract}),"The reserve must not automatically permit extra operations or instances");
  assert.throws(()=>recovery172Step(159));assert.throws(()=>recovery172Step(55));
});

test("the fresh wallet batch ends before every large action proof and native negative",()=>{
  for(let round=117;round<=158;round++){
    const batch=recovery172WarmBatch(round),step=recovery172Step(round);
    if(batch){assert.equal(batch.first,118);assert.equal(batch.last,146);assert.equal(batch.entry,step.entry);assert(!step.negativeCase&&!step.governance);}
    if(step.entry==="executeRuntimeAction"||step.governance||round===117)assert.equal(batch,undefined);
  }
  assert.equal(recovery172WarmBatch(146)!.last,146);
  assert.equal(recovery172WarmBatch(147),undefined);
});
