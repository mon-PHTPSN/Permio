import assert from "node:assert/strict";
import test from "node:test";
import { submitM6WarmStep } from "../m6-warm-submission-step.ts";
const id="00"+"ab".repeat(32),bytes=Buffer.from("exact submitted transaction");
const transaction={serialize:()=>bytes,identifiers:()=>[id]};
const final={status:"SucceedEntirely",identifiers:[id],tx:transaction,blockHeight:77};

test("a timeout followed by exact successful reconciliation closes the warm wallet before another call",async()=>{
  let submissions=0;const events:unknown[]=[];
  const result=await submitM6WarmStep({transaction,async submit(){submissions++;throw Error("confirmation timeout");},
    async readFinal(){return final;},observe:v=>events.push(v)});
  assert.equal(submissions,1);assert(result.exactReadOnlyReconciliationUsed);
  assert(result.closeWalletBeforeNextCall,"The SDK node capability is closed after a confirmation timeout");
  assert.equal(result.transactionId,id);assert.equal(events.length,2);
});

test("normal exact finality can retain the warm wallet and never causes an extra submission",async()=>{
  let submissions=0;
  const result=await submitM6WarmStep({transaction,async submit(){submissions++;return id;},async readFinal(){return final;},observe:()=>{}});
  assert.equal(submissions,1);assert(!result.closeWalletBeforeNextCall&&!result.exactReadOnlyReconciliationUsed);
});

test("unknown or substituted reconciliation stops the batch with one submission",async()=>{
  for(const observation of [undefined,{...final,tx:{serialize:()=>Buffer.from("different bytes")}}]){
    let submissions=0;
    await assert.rejects(submitM6WarmStep({transaction,async submit(){submissions++;throw Error("timeout");},
      async readFinal(){if(!observation)throw Error("unknown");return observation;},observe:()=>{}}));
    assert.equal(submissions,1);
  }
});
