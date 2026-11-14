import assert from "node:assert/strict";
import test from "node:test";
import { WarmPreparationBudget, WARM_PREPARATION_ADDRESS as address } from "../m6-warm-preparation-budget.ts";
import { freshInstanceEntry } from "../m6-fresh-instance-budget.ts";
const digest="ab".repeat(32);
test("warm session permits only 25 ordered credential/slot/preparation calls and one exact submission each",()=>{
  const b=new WarmPreparationBudget();
  for(let round=34;round<=58;round++) {
    b.begin(round,address,freshInstanceEntry(round));
    assert.throws(()=>b.begin(round,address,freshInstanceEntry(round)));
    assert.throws(()=>b.submit(round,digest));
    b.balanced(round,digest);assert.throws(()=>b.balanced(round,digest));
    assert.throws(()=>b.submit(round,"cd".repeat(32)));assert.throws(()=>b.finalized(round));
    b.submit(round,digest);assert.throws(()=>b.submit(round,digest));b.finalized(round);
    assert.throws(()=>b.begin(round,address,freshInstanceEntry(round)));
  }
  assert.equal(b.next,59);assert.throws(()=>b.begin(59,address,"executeRuntimeAction"));
});
test("warm session cannot deploy, execute the action, substitute a contract or skip a round",()=>{
  for(const [round,target,entry] of [[34,address,"allocateRuntimeInstance"],[35,address,"updateRuntimeCredentialStatus"],[34,address,"prepareRuntimeAction"],
    [34,"a".repeat(64),"prepareRuntimeAction"],[34,address,"executeRuntimeAction"],[34,address,"governAuthorization"]] as const) {
    const b=new WarmPreparationBudget();assert.throws(()=>b.begin(round,target,entry));assert.equal(b.active,undefined);
  }
});


test("reconciled55 recovery permits only the remaining three preparations",()=>{
 const b=new WarmPreparationBudget(56);
 for(let round=56;round<=58;round++){b.begin(round,address,freshInstanceEntry(round));b.balanced(round,digest);b.submit(round,digest);b.finalized(round);}
 assert.equal(b.next,59);assert.throws(()=>b.begin(55,address,"prepareRuntimeAction"));assert.throws(()=>new WarmPreparationBudget(55));
});
