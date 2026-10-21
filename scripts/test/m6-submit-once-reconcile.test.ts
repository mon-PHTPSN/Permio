import assert from "node:assert/strict";
import test from "node:test";
import {submitOnceAndReconcile} from "../m6-submit-once-reconcile.ts";
const id="00"+"ab".repeat(32),bytes=Buffer.from("exact submitted transaction");
const transaction={serialize:()=>bytes,identifiers:()=>[id]};
test("confirmation timeout resolves exact finalized bytes with one broadcast",async()=>{
 let broadcasts=0,reads=0;
 const result=await submitOnceAndReconcile({transaction,async submit(){broadcasts++;throw Error("confirmation timeout");},
  async readFinal(){reads++;return {status:"SucceedEntirely",identifiers:[id],tx:transaction,blockHeight:77};},observe:()=>{}});
 assert.equal(result,id);assert.equal(broadcasts,1);assert.equal(reads,1);
});
test("unknown, failed, partial, foreign or substituted observations never trigger another broadcast",async()=>{
 for(const value of [undefined,{status:"FailedEntirely"},{status:"SucceedPartially"},{identifiers:["00"+"cd".repeat(32)]},{tx:{serialize:()=>Buffer.from("substitute")}}]){
  let broadcasts=0;
  await assert.rejects(submitOnceAndReconcile({transaction,async submit(){broadcasts++;throw Error("timeout");},
   async readFinal(){if(!value)throw Error("unknown");return {status:"SucceedEntirely",identifiers:[id],tx:transaction,blockHeight:77,...value};},observe:()=>{}}),/do not resubmit/);
  assert.equal(broadcasts,1);
 }
});
test("either confirmed intent identifier resolves to the original bundle's final identifier",async()=>{
 const second="00"+"cd".repeat(32),tx={serialize:()=>bytes,identifiers:()=>[id,second]};let broadcasts=0;
 const result=await submitOnceAndReconcile({transaction:tx,async submit(){broadcasts++;throw Error("timeout");},
  async readFinal(){return {status:"SucceedEntirely",identifiers:[id,second],tx,blockHeight:77};},observe:()=>{}});
 assert.equal(result,second);assert.equal(broadcasts,1);
});
