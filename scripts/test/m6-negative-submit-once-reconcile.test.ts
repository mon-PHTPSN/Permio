import assert from "node:assert/strict";
import test from "node:test";
import {submitNegativeOnceAndResolve,type NegativeFinal} from "../m6-negative-submit-once-reconcile.ts";

const ids=[`00${"ab".repeat(32)}`,`00${"cd".repeat(32)}`],raw=Uint8Array.of(7,8,9);
const transaction={serialize:()=>raw,identifiers:()=>ids};
const final=():NegativeFinal=>({status:"FailFallible",identifiers:ids,tx:{serialize:()=>raw},blockHeight:123,blockHash:"ef".repeat(32),
 segmentStatusMap:new Map([[0,"SegmentSuccess"],[7,"SegmentFail"]])});
const timeout=()=>Object.assign(new Error("Private SDK error details must stay hidden"),{diagnostic:{category:"finality-timeout"}});
const base={transaction,intendedSegmentId:7,validation:{accepted:true},observe:()=>{}};

test("a confirmation timeout after broadcast resolves the exact indexed failed contract segment with one submission",async()=>{
 let submits=0,reads=0;const result=await submitNegativeOnceAndResolve({...base,submit:async()=>{submits++;throw timeout();},
  readFinal:async()=>{reads++;return final();},readTimeoutMs:50});
 assert.equal(submits,1);assert(reads>=1);assert.equal(result.final!.status,"FailFallible");assert.equal(result.transactionId,ids.at(-1));
 assert.equal(result.reconciledAfterSubmitError,true);
});
test("a returned transaction id still requires the exact failed segment and bytes",async()=>{
 let submits=0;const result=await submitNegativeOnceAndResolve({...base,submit:async()=>{submits++;return ids[1]!;},readFinal:async()=>final()});
 assert.equal(submits,1);assert.equal(result.final!.segmentStatusMap!.get(7),"SegmentFail");
});
test("a conclusive native authorization RPC rejection does not need an indexed transaction",async()=>{
 let reads=0,submits=0;const result=await submitNegativeOnceAndResolve({...base,validation:{accepted:false,rejection:"invalid",customCode:171},
  submit:async()=>{submits++;throw Object.assign(new Error("withheld"),{diagnostic:{category:"transaction-invalid",rpcCode:1010,customCode:171}});},
  readFinal:async()=>{reads++;return final();}});
 assert.equal(submits,1);assert.equal(reads,0);assert.equal(result.final,undefined);
});
for(const [label,change]of [
 ["successful application",(v:NegativeFinal)=>({...v,status:"SucceedEntirely"})],
 ["different bound bytes",(v:NegativeFinal)=>({...v,tx:{serialize:()=>Uint8Array.of(8,9,10)}})],
 ["other failed segment",(v:NegativeFinal)=>({...v,segmentStatusMap:new Map([[7,"SegmentSuccess"],[8,"SegmentFail"]])})],
]as const)test(`never count ${label} as the expected negative`,async()=>{
 let submits=0,reads=0;await assert.rejects(submitNegativeOnceAndResolve({...base,submit:async()=>{submits++;throw timeout();},
  readFinal:async()=>{reads++;return change(final());},readTimeoutMs:30}));assert.equal(submits,1);assert(reads>=1);
});
test("unresolved finality stays uncertain and never causes another native submission",async()=>{
 let submits=0,reads=0;await assert.rejects(submitNegativeOnceAndResolve({...base,submit:async()=>{submits++;throw timeout();},
  readFinal:async()=>{reads++;throw Error("read unavailable");},readTimeoutMs:10}));
 assert.equal(submits,1);assert(reads>=1);
});
