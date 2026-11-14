import assert from "node:assert/strict";
import test from "node:test";
import {RemainingTestBudget,REMAINING_RECOVERY_POSITIVE_BUDGET} from "../m6-remaining-test-budget.ts";
import {remainingContinuationStep} from "../m6-remaining-continuation-plan.ts";
import {recovery150Step,recovery150WarmBatch} from "../m6-recovery150-plan.ts";
test("approved150 preserves failed55 in135 baseline, exactly four instances and four distinct native negatives",()=>{
 const b=new RemainingTestBudget("approved150"),contract="ab".repeat(32);
 const reserve=(entry:string,n:number,governance?:string)=>{for(let i=0;i<n;i++)b.reserve({entry,contract,...(governance?{governance}:{})});};
 reserve("deploy",1);reserve("governAuthorization",2,"proposeProofModule");reserve("governAuthorization",4,"reviewProofModule");reserve("governAuthorization",6,"governProofModule");
 for(const e of ["beginM4Activation","stageM4ActivationBinding","finalizeM4Activation"])reserve(e,2);
 reserve("allocateRuntimeInstance",1);reserve("updateRuntimeCredentialStatus",19);reserve("manageRuntimeParticipantSlots",2);reserve("prepareRuntimeAction",4);
 for(let n=46;n<=51;n++)b.reserve({...remainingContinuationStep(n),contract});
 b.abandonUnsubmittedReservation({reservationId:51,negativeCase:"independent-competing-transition",neverSubmittedVerified:true,originalExpiryPassed:true});
 reserve("allocateRuntimeInstance",1);reserve("updateRuntimeCredentialStatus",3); //53/54 plus counted failed55
 for(let n=56;n<=136;n++)assert.equal(b.reserve({...recovery150Step(n),contract}),n);
 assert.equal(b.evidence().maximumNativeAttemptsReserved,135);assert.equal(b.evidence().nativeCeiling,150);
 assert.deepEqual(b.evidence().perEntry,REMAINING_RECOVERY_POSITIVE_BUDGET);assert.equal(b.evidence().negativeCases.length,4);
 assert.throws(()=>b.reserve({entry:"allocateRuntimeInstance",contract}));assert.throws(()=>b.reserve({entry:"deploy",contract}));
 assert.throws(()=>recovery150Step(55));assert.throws(()=>recovery150Step(137));
});
test("warm recovery ranges close before all six main action proofs and never include a native negative",()=>{
 for(let n=56;n<=136;n++){const b=recovery150WarmBatch(n),s=recovery150Step(n);
  if(s.entry==="executeRuntimeAction")assert.equal(b,undefined);
  if(b){assert.equal(b.entry,s.entry);assert(!s.negativeCase&&!s.governance);}}
 assert.equal(recovery150WarmBatch(85)!.last,85);assert.equal(recovery150WarmBatch(113)!.last,113);assert.equal(recovery150WarmBatch(124)!.last,124);
});
