import assert from "node:assert/strict";
import test from "node:test";
import { freshInstanceEntry } from "../m6-fresh-instance-budget.ts";
test("approved fresh-instance schedule has exactly 30 additional calls and closes warm session before main",()=>{
  const schedule=Array.from({length:30},(_,i)=>freshInstanceEntry(33+i));
  assert.deepEqual(Object.fromEntries([...new Set(schedule)].map(entry=>[entry,schedule.filter(x=>x===entry).length])),{
    allocateRuntimeInstance:1,updateRuntimeCredentialStatus:19,manageRuntimeParticipantSlots:2,
    prepareRuntimeAction:4,executeRuntimeAction:1,terminateTemplate:2,governAuthorization:1});
  assert.equal(freshInstanceEntry(58),"prepareRuntimeAction");
  assert.equal(freshInstanceEntry(59),"executeRuntimeAction");
  for(const round of [0,32,63,34.5,NaN])assert.throws(()=>freshInstanceEntry(round));
});
