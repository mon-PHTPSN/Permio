import assert from "node:assert/strict";
import { createPrivateKey, createPublicKey } from "node:crypto";
import { lstat, readFile, readdir, writeFile } from "node:fs/promises";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import * as sdk from "@permio/midnight-authorization";
import { reviveRemainingCheckpoint } from "./m6-restore-remaining-checkpoint.ts";
import { captureRemainingPublicEvidence } from "./m6-remaining-public-evidence.ts";

// Read only. No wallet, signing, proof generation, allocation or native submission.
const root="/opt/permio-m6-remaining-preprod-20261019-v1",p=root+"/private/";
const address="70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c";
assert(process.platform==="linux"&&process.argv.length===2);
for(const k of ["log","warn","error","info","debug"] as const)console[k]=()=>{};
const timeout=setTimeout(()=>process.exit(2),900_000);
let stage="closed-native-boundary";
async function readPrivate(n:string){assert(/^[a-z0-9.-]+$/u.test(n));const meta=await lstat(p+n);
  assert(meta.isFile()&&!meta.isSymbolicLink()&&meta.uid===0&&(meta.mode&0o777)===0o600);
  return JSON.parse(await readFile(p+n,"utf8"),reviveRemainingCheckpoint);}
try{
  const names=await readdir(p);assert.equal(names.filter(n=>/^wallet-[0-9]{3}-submission\.json$/u.test(n)).length,54);
  assert(!names.includes("wallet-051-submission.json")&&!names.includes("wallet-056-submission.json"));
  const reconciliation=JSON.parse(await readFile(root+"/failure55-reconciliation-v1.json","utf8"));
  assert(reconciliation.passed&&reconciliation.conservativeSubmissionAttempts===54&&reconciliation.normalFinalizedCalls===53&&
    reconciliation.actual55IndexedMatches===0&&reconciliation.currentEntireContractStateEquals54&&reconciliation.call55RemainsUnretried);
  const input=await readPrivate("inputs.json");assert(input.networkId==="preprod"&&input.testOnlyProvenance.includes("disposable Preprod test"));
  setNetworkId("preprod");const profile=new sdk.PreprodConnectionProfile(input.providerCredential),env=profile.environmentForSdk();
  const publicData=indexerPublicDataProvider(env.indexer,env.indexerWS);
  const index=async(id:string)=>{const response=await fetch(env.indexer,{method:"POST",headers:{"content-type":"application/json"},signal:AbortSignal.timeout(30000),
    body:JSON.stringify({query:"query T($offset:TransactionOffset!){transactions(offset:$offset){raw contractActions{state} ... on RegularTransaction{identifiers}}}",variables:{offset:{identifier:id}}})});
    assert(response.ok);const v:any=await response.json();assert(!v.errors&&Array.isArray(v.data?.transactions));
    return v.data.transactions.filter((t:any)=>t.identifiers?.some((x:string)=>x.replace(/^0x/u,"")===id));};
  const j55=await readPrivate("wallet-055-submission.json");for(const id of j55.transactionIds)assert.equal((await index(id)).length,0);
  const j54=await readPrivate("wallet-054-submission.json"),final54=await publicData.watchForTxData(j54.transactionIds.at(-1));
  assert(final54.status==="SucceedEntirely"&&Buffer.from(final54.tx.serialize()).equals(await readFile(p+"wallet-054-balanced.bin")));
  const state=await publicData.queryContractState(address);assert(state);
  const records54=await index(j54.transactionIds.at(-1));assert.equal(records54.length,1);assert.equal(records54[0].contractActions.length,1);
  assert(Buffer.from(state.serialize()).equals(Buffer.from(records54[0].contractActions[0].state.replace(/^0x/u,""),"hex")));
  const view=sdk.readPermioAuthorizationLedger(state.data);
  assert.equal(view.runtimeInstances.size(),2n);assert.equal(view.decisionReceipts.size(),1n);assert.equal(view.usedRuntimeActionNullifiers.size(),1n);
  assert.deepEqual([...view.runtimeInstances].map(([,v])=>String(v.transitionSequence)).sort(),["1","5"]);
  const first=await readPrivate("first-completed-after50-private.json"),privateValues:string[]=[...first.privateSentinels,input.providerCredential];
  const collect=(v:unknown)=>{if(typeof v==="string"&&v.length>=8)privateValues.push(v);else if(v&&typeof v==="object")Object.values(v).forEach(collect);};collect(input.secret);
  const hex=(v:Uint8Array)=>Buffer.from(v).toString("hex");
  const openings=(v:any)=>{if(!v||typeof v!=="object")return;for(const[k,x]of Object.entries(v)){
    if(["nonce","nextStateNonce","stateIdHash","allocationNonce"].includes(k)&&x instanceof Uint8Array)privateValues.push(hex(x));
    else if(x&&typeof x==="object")openings(x);}};
  for(const n of names.filter(n=>/^checkpoint-v4-[0-9]+\.json$/u.test(n))){const c=await readPrivate(n),v=c.value;openings(v);
    if(c.stage==="remaining-instance-allocation"){privateValues.push(v.instance.instanceId,new Date(v.instance.expiresAt*1000).toISOString());}
    if(c.stage==="ordinary-account-and-root-prepared"){
      // The test-only runtime scalar is a fixed public-source fixture, not a private
      // scan needle. Its padded integer already occurs in the unrelated call8.
      assert.equal(v.holderSecret,179n);
      privateValues.push(v.accountSource.accountId,v.grant.grantId,...v.scope.resources,...v.scope.recipients,v.accountPrivateKeyPem);
      const key=createPrivateKey(v.accountPrivateKeyPem),pub=createPublicKey(key);
      for(const b of [key.export({format:"der",type:"pkcs8"}),pub.export({format:"der",type:"spki"})])privateValues.push(hex(b),hex(b.subarray(-32)));
    }}
  const fixtures=await readPrivate("fixture-pair.json");for(const f of [fixtures.stateful,fixtures.nonTransitioning]){
    const labels=(v:unknown)=>{if(typeof v==="string"&&v.startsWith("private-"))privateValues.push(v);else if(v&&typeof v==="object")Object.values(v).forEach(labels);};labels(f.record.template);
    privateValues.push(...f.record.template.states);for(const reviewer of f.policy.reviewers)privateValues.push(reviewer.principalId,reviewer.publicKeyPem);
  }
  stage="partial-public-evidence-scan";
  const scan=await captureRemainingPublicEvidence({providers:{publicDataProvider:publicData} as sdk.PermioAuthorizationProviders,address,
    receipts:[first.first.checked.receipt],privateValues,outputName:"scanned-failure55-public-evidence-v1",localFailure55:reconciliation});
  const report={passed:true,kind:"m6-failure55-readonly-public-export",nativeAttempts:54,confirmed:53,reservations:55,
    nativeNegativeOutcomes:0,instanceCount:2,instanceSequences:["1","5"],receiptCount:1,nullifierCount:1,
    original55BytesPreservedPrivately:true,unused55BytesExported:false,failed55Retried:false,wholeStateMatches54:true,
    incompleteRootCapabilityCertificationRetained:true,scan,newNativeSubmissions:0,milestoneComplete:false};
  await writeFile(root+"/failure55-public-export-v1.json",JSON.stringify(report),{flag:"wx",mode:0o600});process.stdout.write(JSON.stringify(report)+"\n");
}catch(error){await writeFile(p+"failure55-export-private-error-v3.json",JSON.stringify({stage,name:error instanceof Error?error.name:"unknown",
  message:error instanceof Error?error.message:"withheld",stack:error instanceof Error?error.stack:"withheld"}),{flag:"wx",mode:0o600});
  process.stdout.write(JSON.stringify({passed:false,stage,detailsWithheld:true,newNativeSubmissions:0})+"\n");process.exitCode=1;
}finally{clearTimeout(timeout);process.exit(process.exitCode??0);}
