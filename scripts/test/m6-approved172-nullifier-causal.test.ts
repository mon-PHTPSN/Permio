import assert from "node:assert/strict";
import test from "node:test";
import {ChargedState,StateValue,QueryContext,LedgerParameters,PreTranscript,partitionTranscripts} from "@midnight-ntwrk/midnight-js-protocol/ledger";
import {ordinaryActionFixture} from "../../packages/midnight-authorization/test/fixtures/ordinary-action.ts";
import {auditM6PublicCallReadSet} from "../m6-public-transcript-audit.ts";
import {copyM6PublicFieldForAudit} from "../m6-approved172-public-field-audit.ts";

test("a consumed nullifier alone rejects the original genuine program while receipt/preparation fields remain unchanged",()=>{
  const f=ordinaryActionFixture({transitioning:false});f.finishPreparation();
  const before=f.context(),encodedBefore=before.currentQueryContext.state.state.encode();
  const checked=f.contract.circuits.executeRuntimeAction(f.context(),...f.executeArgs());
  const context=new QueryContext(new ChargedState(StateValue.decode(encodedBefore)),before.currentQueryContext.address);context.block=before.currentQueryContext.block;
  const parameters=LedgerParameters.initialParameters();
  const [guaranteedTranscript,fallibleTranscript]=partitionTranscripts([new PreTranscript(context,checked.proofData.publicTranscript)],parameters)[0]!;
  const call={address:context.address,guaranteedTranscript,fallibleTranscript};
  const run=(encodedState:typeof encodedBefore)=>auditM6PublicCallReadSet({call,encodedState,parameters,clockSeconds:500n});
  assert(run(encodedBefore).accepted);
  f.execute();const encodedAfter=f.context().currentQueryContext.state.state.encode();
  assert(!run(encodedAfter).accepted);
  const projected=copyM6PublicFieldForAudit(encodedBefore,encodedAfter,[1,12]);
  assert(!run(projected).accepted,"Changing only the consumed-nullifier set must suffice");
  const a=StateValue.decode(encodedBefore).asArray()!,b=StateValue.decode(projected).asArray()!;
  assert.deepEqual(a[0]!.encode(),b[0]!.encode());
  for(let index=0;index<a[1]!.asArray()!.length;index++)if(index!==12)
    assert.deepEqual(a[1]!.asArray()![index]!.encode(),b[1]!.asArray()![index]!.encode());
  assert(run(copyM6PublicFieldForAudit(projected,encodedBefore,[1,12])).accepted);
  assert.throws(()=>copyM6PublicFieldForAudit(encodedBefore,encodedAfter,[]));
});
