import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {lstat,mkdir,readFile,readdir,realpath,writeFile} from "node:fs/promises";
import {setTimeout as delay} from "node:timers/promises";
import {Transaction,ContractCall,ContractDeploy} from "@midnight-ntwrk/midnight-js-protocol/ledger";
import {ContractState} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import {setNetworkId} from "@midnight-ntwrk/midnight-js-network-id";
import {indexerPublicDataProvider} from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import * as sdk from "@permio/midnight-authorization";
import {collectRecovery150PrivateScanValues} from "./m6-recovery150-private-scan.ts";
import {scanM6PublicArtifacts} from "./m6-public-artifact-scan.ts";
import {sanitizeM6RuntimePublicLog} from "./m6-public-runtime-log.ts";
import {isDefiniteIncludedM6ActionFailure,isDefiniteNativeAuthRejection,findM6SingleFallibleContractSegment} from "./m6-native-negative-outcome.ts";

// Partial evidence only. Unsubmitted positive controls are never exported while
// the existing templates/modules remain active. No wallet, proof or send API.
const root="/opt/permio-m6-remaining-preprod-20261019-v1",directory=root+"/private";
const address="70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c";
assert(process.platform==="linux"&&process.argv.length===2);
for(const k of ["log","error","warn","info","debug"]as const)console[k]=()=>{};
const hash=(v:Uint8Array)=>createHash("sha256").update(v).digest("hex"),norm=(v:string)=>v.replace(/^0x/u,"");
const encode=(v:unknown)=>Buffer.from(JSON.stringify(v,(_,x)=>typeof x==="bigint"?String(x):x));
let stage="closed115-boundary";
async function privateFile(n:string){assert(/^[a-z0-9.-]+$/u.test(n));const p=directory+"/"+n,m=await lstat(p);
 assert(m.isFile()&&!m.isSymbolicLink()&&m.uid===0&&(m.mode&0o777)===0o600&&await realpath(p)===p);return readFile(p);}
try{
 for(let version=1;version<=7;version++)for(const role of ["controller","client"])
  assert(execFileSync("systemctl",["show",`permio-m6-remaining-ordinary-matrix-v${version}-${role}.service`,"-p","MainPID","--value"],{encoding:"utf8"}).trim()==="0");
 assert(execFileSync("docker",["ps","--quiet"],{encoding:"utf8"}).trim()===""&&(await readFile("/proc/swaps","utf8")).trim().split("\n").length===1);
 const names=await readdir(directory);assert(names.filter(n=>/^wallet-\d{3}-submission.json$/u.test(n)).length===115&&names.filter(n=>/^wallet-\d{3}-reservation.json$/u.test(n)).length===116);
 const completion=JSON.parse(await readFile(root+"/authority-after113-completion-v1.json","utf8"));assert(completion.passed&&completion.phaseNativeAttempts===3&&completion.fifthInstanceNotStarted);
 const causal=JSON.parse(await readFile(root+"/action-control-causal-audit-authority115-v1.json","utf8"));assert(causal.passed&&causal.cases.length===2&&causal.sameProofBytesPaired);
 const runtime=JSON.parse(await readFile(root+"/runtime-ordinary-matrix-v7/report.json","utf8"));assert(runtime.exitCode===0&&runtime.temporarySwapRemoved&&runtime.ownedClientStopped&&runtime.ownedProverStopped);
 const input=JSON.parse((await privateFile("inputs.json")).toString());assert(input.networkId==="preprod"&&input.testOnlyProvenance.includes("disposable Preprod test"));
 const profile=new sdk.PreprodConnectionProfile(input.providerCredential),env=profile.environmentForSdk();setNetworkId("preprod");
 const provider=indexerPublicDataProvider(env.indexer,env.indexerWS),current=await provider.queryContractState(address);assert(current);const view=sdk.readPermioAuthorizationLedger(current.data);
 assert(view.runtimeInstances.size()===4n&&view.decisionReceipts.size()===2n&&view.usedRuntimeActionNullifiers.size()===2n&&view.runtimeActionSessions.size()===3n);
 assert([...view.proofModules].every(([,v])=>v.lifecycleStatus===4n)&&[...view.activeTemplates].every(([,v])=>v.lifecycleStatus===1n));
 assert([...view.authorityRoots][0]![1].rootSequence===2n&&[...view.credentialStatusRoots][0]![1].rootSequence===10n);
 const artifacts=new Map<string,Uint8Array>(),journals=new Map<number,any>(),histories=new Map<number,any>(),perEntry=new Map<string,number>();let successes=0;
 const cache=root+"/authority115-indexed-public-cache-v1";await mkdir(cache,{mode:0o700,recursive:true});
 assert(await realpath(cache)===cache&&(await lstat(cache)).uid===0&&((await lstat(cache)).mode&0o777)===0o700);
 let activeRound=0,checkedPairs=0,cacheHits=0;
 async function progress(httpStatus?:number){await writeFile(root+"/authority115-export-progress-v5.json",JSON.stringify({stage,activeRound,checkedPairs,cacheHits,httpStatus,nativeSubmissions:0}),{mode:0o600});}
 stage="all-public-indexed-byte-pairs";
 async function fetchExact(id:string,expectedRaw:Uint8Array){
  assert(/^[0-9a-f]{66}$/u.test(id));const path=cache+"/"+id+".json";
  try{const stat=await lstat(path);assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.uid===0&&(stat.mode&0o777)===0o600);
   const cached=JSON.parse(await readFile(path,"utf8"));assert(cached.identifiers?.some((v:string)=>norm(v)===id)&&cached.protocolVersion===1000300&&["SUCCESS","PARTIAL_SUCCESS"].includes(cached.transactionResult?.status));
   assert(Buffer.from(norm(cached.raw),"hex").equals(Buffer.from(expectedRaw)));cacheHits++;return cached;
  }catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
  for(let attempt=0;attempt<3;attempt++){
   try{
   const response=await fetch(env.indexer,{method:"POST",headers:{"content-type":"application/json"},signal:AbortSignal.timeout(30000),
    body:JSON.stringify({query:`query T($offset:TransactionOffset!){transactions(offset:$offset){raw protocolVersion block{height hash ledgerParameters} contractActions{__typename address state ... on ContractCall{entryPoint}} ... on RegularTransaction{identifiers transactionResult{status}}}}`,variables:{offset:{identifier:id}}})});
   await progress(response.status);
   if(!response.ok){await response.body?.cancel();if([429,502,503,504].includes(response.status)&&attempt<2){await delay(15000*(attempt+1));continue;}throw Error(`Read-only indexer HTTP ${response.status}`);}
   const text=await response.text();assert(text.length<=20*1024**2);const p:any=JSON.parse(text);assert(!p.errors);
   const matches=p.data.transactions.filter((t:any)=>t.identifiers?.some((v:string)=>norm(v)===id));assert(matches.length<=1);const match=matches[0];
   if(match&&["SUCCESS","PARTIAL_SUCCESS"].includes(match.transactionResult?.status)){
    assert(match.protocolVersion===1000300&&Buffer.from(norm(match.raw),"hex").equals(Buffer.from(expectedRaw)));
    await writeFile(path,JSON.stringify(match),{flag:"wx",mode:0o600});
   }
   return match;
   }catch(error){
    const transient=error instanceof TypeError&&["fetch failed","terminated"].includes(error.message)||error instanceof DOMException&&["AbortError","TimeoutError"].includes(error.name);
    if(!transient||attempt===2)throw error;await delay(15000*(attempt+1));
   }
  }
  throw Error("Read-only indexer bounded attempts exhausted");
 }
 for(let round=1;round<=116;round++){
  if(round===51||round===55)continue;activeRound=round;await progress();const n=String(round).padStart(3,"0"),raw=await privateFile(`wallet-${n}-balanced.bin`),journal=JSON.parse((await privateFile(`wallet-${n}-submission.json`)).toString());
  const tx=Transaction.deserialize("signature","proof","binding",raw);assert.equal(hash(raw),journal.balancedSha256);assert.deepEqual(tx.identifiers(),journal.transactionIds);assert(Buffer.from(tx.serialize()).equals(raw));
  const actions=[...(tx.intents?.values()??[])].flatMap(i=>i.actions);assert(actions.length===1&&(actions[0]instanceof ContractCall||actions[0]instanceof ContractDeploy)&&actions[0].address===address);
  const action=actions[0]!,entry=action instanceof ContractDeploy?"deploy":typeof action.entryPoint==="string"?action.entryPoint:Buffer.from(action.entryPoint).toString("utf8");perEntry.set(entry,(perEntry.get(entry)??0)+1);
  const indexed=await fetchExact(tx.identifiers().at(-1)!,raw);journals.set(round,journal);artifacts.set(`transactions/attempt-${n}.bin`,raw);
  if(round===87||round===116){
   const outcome=JSON.parse((await privateFile(`wallet-${n}-outcome.json`)).toString());assert(outcome.kind==="native-rejected"&&outcome.submittedAtMostOnce&&outcome.balancedSha256===hash(raw));
   assert(outcome.negativeCase===(round===87?"independent-competing-transition":"stale-authority-root"));
   if(outcome.inclusion){assert(indexed&&indexed.transactionResult.status==="PARTIAL_SUCCESS"&&Buffer.from(norm(indexed.raw),"hex").equals(raw));
    const segment=findM6SingleFallibleContractSegment(tx,address);assert(isDefiniteIncludedM6ActionFailure({...outcome.inclusion,exactBoundBytesMatched:true,intendedSegmentId:segment.segmentId,
     contractCallHasGuaranteedTranscript:!!segment.call.guaranteedTranscript,contractCallHasFallibleTranscript:!!segment.call.fallibleTranscript,segmentStatusMap:new Map(outcome.inclusion.segmentStatusEntries)}));
    artifacts.set(`indexer/failed-contract-${n}.bin`,raw);
   }else assert(!indexed&&isDefiniteNativeAuthRejection(outcome.validation,outcome.diagnostic));
   const validation=outcome.validation?{accepted:outcome.validation.accepted,rejection:outcome.validation.rejection,customCode:outcome.validation.customCode}:undefined;
   const diagnostic=outcome.diagnostic?{category:outcome.diagnostic.category,customCode:outcome.diagnostic.customCode,rpcCode:outcome.diagnostic.rpcCode}:undefined;
   artifacts.set(`transactions/rejection-${n}.json`,encode({kind:outcome.kind,negativeCase:outcome.negativeCase,submittedAtMostOnce:true,balancedSha256:outcome.balancedSha256,
    transactionIds:outcome.transactionIds,inclusion:outcome.inclusion,validation,diagnostic}));
  }else{
   assert(indexed&&indexed.protocolVersion===1000300&&indexed.transactionResult.status==="SUCCESS"&&indexed.block.height>0&&Buffer.from(norm(indexed.raw),"hex").equals(raw));
   artifacts.set(`indexer/finalized-${n}.bin`,raw);successes++;
   if([50,85,86,113,115].includes(round)){assert(indexed.contractActions.length===1&&norm(indexed.contractActions[0].address)===address);histories.set(round,indexed);}
  }
  checkedPairs++;await progress();
 }
 assert.equal(successes,112);assert.deepEqual(Object.fromEntries([...perEntry].sort()),Object.fromEntries(Object.entries({deploy:1,governAuthorization:14,beginM4Activation:2,stageM4ActivationBinding:2,finalizeM4Activation:2,
  allocateRuntimeInstance:4,updateRuntimeCredentialStatus:59,manageRuntimeParticipantSlots:6,prepareRuntimeAction:20,executeRuntimeAction:4}).sort()));
 assert(Buffer.from(norm(histories.get(115).contractActions[0].state),"hex").equals(Buffer.from(current.serialize())));
 artifacts.set("chain/contract-state.bin",current.serialize());
 for(const round of [85,86,113,115]){const n=String(round).padStart(3,"0"),indexed=histories.get(round);
  artifacts.set(`historical/state-${n}.bin`,Buffer.from(norm(indexed.contractActions[0].state),"hex"));
  artifacts.set(`historical/parameters-${n}.bin`,Buffer.from(norm(indexed.block.ledgerParameters),"hex"));
  artifacts.set(`historical/source-${n}.json`,encode({transactionId:journals.get(round).transactionIds.at(-1),blockHeight:indexed.block.height,blockHash:norm(indexed.block.hash)}));}
 const receipts:sdk.DecisionReceipt[]=[],seen=new Set<string>();
 stage="two-actual-historical-receipt-decoders";await progress();
 for(const round of [50,86]){
  const n=String(round).padStart(3,"0"),indexed=histories.get(round),stateBytes=Buffer.from(norm(indexed.contractActions[0].state),"hex"),state=ContractState.deserialize(stateBytes),historical=sdk.readPermioAuthorizationLedger(state.data);
  const added=[...historical.decisionReceipts].filter(([id])=>!seen.has(Buffer.from(id).toString("hex")));assert.equal(added.length,1);const[id,body]=added[0]!,receiptId=`0x${Buffer.from(id).toString("hex")}`as const;
  assert.equal(sdk.runtimeDecisionReceiptId(body),receiptId);seen.add(receiptId.slice(2));
  const transactionId=journals.get(round).transactionIds.at(-1);
  const decoded=await sdk.readFinalizedDecisionReceipt(sdk.createIndexedDecisionReceiptReader({network:"preprod",profile,publicDataProvider:provider,contract:`0x${address}`,receiptId}),
   {network:"preprod",contract:`0x${address}`,transactionId,receiptId});assert(decoded.receiptVersion===1&&decoded.sourceLedgerSequence===String(indexed.block.height));receipts.push(decoded);
  artifacts.set(`historical/receipt-${n}-state.bin`,stateBytes);artifacts.set(`historical/receipt-${n}-source.json`,encode({transactionId,blockHeight:indexed.block.height,stateSha256:hash(stateBytes),receiptId}));
 }
 artifacts.set("receipts/decision-receipts.json",encode(receipts));
 const source=await readFile(root+"/client/public-source-manifest.json");assert.equal(hash(source),"34c8373fd6bed6ed3e9dcf3b5c52255583a41deda35925a9a5fc9be0fe14c121");artifacts.set("source/public-source-manifest.json",source);
 artifacts.set("source/contract-info.json",await readFile(root+"/client/packages/midnight-authorization/contracts/managed/permio-authorization/compiler/contract-info.json"));
 artifacts.set("reports/action-control-causal-audit-authority115-v1.json",encode(causal));
 for(const name of ["authority-after113-completion-v1.json","after113-recovery-verification-v1.json","after113-readonly-diagnosis-v1.json","after87-recovery-verification-v1.json","native87-readonly-inspection-v2.json"])
  artifacts.set("reports/"+name,await readFile(root+"/"+name));
 stage="sanitized-historical-runtime-evidence";await progress();
 for(let version=1;version<=7;version++)for(const name of ["report.json","resources.jsonl","client-public.jsonl"]){let data:Buffer;
  try{data=await readFile(`${root}/runtime-ordinary-matrix-v${version}/${name}`);}catch(error){
   if((error as NodeJS.ErrnoException).code!=="ENOENT"||name==="report.json"&&version!==3)throw error;
   artifacts.set(`runtime-v${version}/absent-${name}.json`,encode({historicalArtifactAbsent:true,file:name,
    historicalReportAbsent:version===3,failureReportPreserved:version!==3,
    reason:version===3?"Historical runtime3 directory/report is absent; counted native journals remain authoritative":"Historical optional public log was not created"}));continue;}
  artifacts.set(`runtime-v${version}/${name}`,name==="client-public.jsonl"?sanitizeM6RuntimePublicLog(data).bytes:data);}
 const summary={kind:"m6-partial-authority115",contract:address,sourceSnapshot:11,sourceManifestSha256:hash(source),
  contractSourceSha256:hash(await readFile(root+"/client/packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js")),
  nativeAttempts:115,successfulFinals:112,nativeNegatives:2,countedLocalPreSendFailures:1,reservations:116,publicBoundTransactions:114,applicationInstances:4,receipts:2,
  authoritySequence:2,credentialStatusSequence:10,perEntry:Object.fromEntries(perEntry),stateConflictAndAuthorityCausalChecksPassed:true,unused55BytesExcluded:true,unsubmittedControlsExcluded:true,
  templatesAndModulesStillActive:true,restorationStillPending:true,remaining172ProposalNotExecuted:true,milestoneComplete:false,independentHumanReviewStillOpen:true};
 artifacts.set("summary.json",encode(summary));const text=JSON.stringify({summary,receipts},null,2).replace(/&/gu,"&amp;").replace(/</gu,"&lt;").replace(/>/gu,"&gt;");
 artifacts.set("render/partial-public-state.html",Buffer.from("<!doctype html><meta charset=utf-8><title>M6 partial public evidence</title><pre>"+text+"</pre>"));
 stage="complete-partial-public-privacy-scan";const scan=scanM6PublicArtifacts(artifacts,await collectRecovery150PrivateScanValues());
 if(!scan.passed)await writeFile(directory+"/authority115-privacy-failure-v1.json",JSON.stringify(scan),{flag:"wx",mode:0o600});assert(scan.passed);
 const output=root+"/scanned-authority115-public-evidence-v1";await mkdir(output,{mode:0o700});
 for(const[name,data]of artifacts){const p=output+"/"+name;await mkdir(p.slice(0,p.lastIndexOf("/")),{recursive:true,mode:0o700});await writeFile(p,data,{flag:"wx",mode:0o600});}
 await writeFile(output+"/privacy-scan.json",JSON.stringify(scan),{flag:"wx",mode:0o600});
 process.stdout.write(JSON.stringify({passed:true,artifactCount:scan.artifactCount,privateValuesChecked:scan.privateValuesChecked,findings:scan.findings.length,nativeAttempts:115,successfulFinals:112,receipts:2,unsubmittedControlsExported:false,nativeSubmissions:0})+"\n");
}catch(error){await writeFile(directory+"/authority115-export-private-error-v5.json",JSON.stringify({stage,name:error instanceof Error?error.name:"unknown",message:error instanceof Error?error.message:"withheld",stack:error instanceof Error?error.stack:"withheld"}),{flag:"wx",mode:0o600});
 process.stdout.write(JSON.stringify({passed:false,stage,detailsWithheld:true,nativeSubmissions:0})+"\n");process.exitCode=1;}
