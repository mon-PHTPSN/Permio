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
import {readApproved172IndexedTransaction} from "./m6-approved172-indexed-history.ts";
import {collectRecovery150PrivateScanValues} from "./m6-recovery150-private-scan.ts";
import {scanM6PublicArtifacts} from "./m6-public-artifact-scan.ts";
import {sanitizeM6RuntimePublicLog} from "./m6-public-runtime-log.ts";
import {isDefiniteIncludedM6ActionFailure,isDefiniteNativeAuthRejection,findM6SingleFallibleContractSegment} from "./m6-native-negative-outcome.ts";
import {auditM6GeneratedLifecycle} from "./m6-generated-lifecycle-audit.ts";
import {isDeepStrictEqual} from "node:util";
import type {PreparedOrdinaryAction} from "./m6-ordinary-action-workflow.ts";

// Partial evidence only. Unsubmitted positive controls are never exported while
// the existing templates/modules remain active. No wallet, proof or send API.
const root="/opt/permio-m6-remaining-preprod-20261019-v1",directory=root+"/private";
const address="70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c";
assert(process.platform==="linux"&&process.argv.length===2);
for(const k of ["log","error","warn","info","debug"]as const)console[k]=()=>{};
const hash=(v:Uint8Array)=>createHash("sha256").update(v).digest("hex"),norm=(v:string)=>v.replace(/^0x/u,"");
const encode=(v:unknown)=>Buffer.from(JSON.stringify(v,(_,x)=>typeof x==="bigint"?String(x):x));
let stage="closed157-boundary";
async function privateFile(n:string){assert(/^[a-z0-9.-]+$/u.test(n));const p=directory+"/"+n,m=await lstat(p);
 assert(m.isFile()&&!m.isSymbolicLink()&&m.uid===0&&(m.mode&0o777)===0o600&&await realpath(p)===p);return readFile(p);}
try{
 for(let version=1;version<=9;version++)for(const role of ["controller","client"])
  assert(execFileSync("systemctl",["show",`permio-m6-remaining-ordinary-matrix-v${version}-${role}.service`,"-p","MainPID","--value"],{encoding:"utf8"}).trim()==="0");
 assert(execFileSync("docker",["ps","--quiet"],{encoding:"utf8"}).trim()===""&&(await readFile("/proc/swaps","utf8")).trim().split("\n").length===1);
 const names=await readdir(directory);assert(names.filter(n=>/^wallet-\d{3}-submission.json$/u.test(n)).length===157&&names.filter(n=>/^wallet-\d{3}-reservation.json$/u.test(n)).length===159);
 const completion=JSON.parse(await readFile(root+"/approved172-after157-native-completion-v1.json","utf8"));assert(completion.passed&&completion.successfulTailSubmissions===2&&completion.reserveUsed===1&&completion.conservativeAttempts===158&&completion.applicationInstances===5);
 const causal=JSON.parse(await readFile(root+"/action-control-causal-audit-approved172-v1.json","utf8"));assert(causal.passed&&causal.cases.length===4&&causal.sameProofBytesPaired);
 const runtime=JSON.parse(await readFile(root+"/runtime-ordinary-matrix-v9/report.json","utf8"));assert(runtime.exitCode===1&&runtime.temporarySwapRemoved&&runtime.ownedClientStopped&&runtime.ownedProverStopped);
 const input=JSON.parse((await privateFile("inputs.json")).toString());assert(input.networkId==="preprod"&&input.testOnlyProvenance.includes("disposable Preprod test"));
 const profile=new sdk.PreprodConnectionProfile(input.providerCredential),env=profile.environmentForSdk();setNetworkId("preprod");
 const receiptReaderModule=await import(new URL("./m6-verified-receipt-reader-v2.ts",import.meta.url).href);
 const provider=indexerPublicDataProvider(env.indexer,env.indexerWS),current=await provider.queryContractState(address);assert(current);const view=sdk.readPermioAuthorizationLedger(current.data);
 assert(view.runtimeInstances.size()===5n&&view.decisionReceipts.size()===3n&&view.usedRuntimeActionNullifiers.size()===3n&&view.runtimeActionSessions.size()===4n);
 assert([...view.proofModules].every(([,v])=>v.lifecycleStatus===6n)&&[...view.activeTemplates].every(([,v])=>v.lifecycleStatus===3n));
 assert([...view.authorityRoots][0]![1].rootSequence===2n&&[...view.credentialStatusRoots][0]![1].rootSequence===14n);
 const artifacts=new Map<string,Uint8Array>(),journals=new Map<number,any>(),histories=new Map<number,any>(),perEntry=new Map<string,number>();let successes=0;
 let activeRound=0,checkedPairs=0;
 async function progress(httpStatus?:number){await writeFile(root+"/approved172-export-progress-v5.json",JSON.stringify({stage,activeRound,checkedPairs,httpStatus,nativeSubmissions:0}),{mode:0o600});}
 stage="all-public-indexed-byte-pairs";
 async function fetchExact(id:string,expectedRaw:Uint8Array){return readApproved172IndexedTransaction({url:env.indexer,id,expectedRaw});}

 for(let round=1;round<=159;round++){
  if(round===51||round===55||round===157)continue;activeRound=round;await progress();const n=String(round).padStart(3,"0"),raw=await privateFile(`wallet-${n}-balanced.bin`),journal=JSON.parse((await privateFile(`wallet-${n}-submission.json`)).toString());
  const tx=Transaction.deserialize("signature","proof","binding",raw);assert.equal(hash(raw),journal.balancedSha256);assert.deepEqual(tx.identifiers(),journal.transactionIds);assert(Buffer.from(tx.serialize()).equals(raw));
  const actions=[...(tx.intents?.values()??[])].flatMap(i=>i.actions);assert(actions.length===1&&(actions[0]instanceof ContractCall||actions[0]instanceof ContractDeploy)&&actions[0].address===address);
  const action=actions[0]!,entry=action instanceof ContractDeploy?"deploy":typeof action.entryPoint==="string"?action.entryPoint:Buffer.from(action.entryPoint).toString("utf8");perEntry.set(entry,(perEntry.get(entry)??0)+1);
  const indexed=await fetchExact(tx.identifiers().at(-1)!,raw);journals.set(round,journal);artifacts.set(`transactions/attempt-${n}.bin`,raw);
  if([87,116,148,150].includes(round)){
   const outcome=JSON.parse((await privateFile(`wallet-${n}-outcome.json`)).toString());assert(outcome.kind==="native-rejected"&&outcome.submittedAtMostOnce&&outcome.balancedSha256===hash(raw));
   assert(outcome.negativeCase===({87:"independent-competing-transition",116:"stale-authority-root",148:"scoped-action-replay-after-cold-reconnect",150:"stale-credential-status-root"}as Record<number,string>)[round]);
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
   if([8,9,17,18,50,85,86,113,115,146,147,149,155,158,159].includes(round)){assert(indexed.contractActions.length===1&&norm(indexed.contractActions[0].address)===address);histories.set(round,indexed);}
  }
  checkedPairs++;await progress();
 }
 assert.equal(successes,152);assert.deepEqual(Object.fromEntries([...perEntry].sort()),Object.fromEntries(Object.entries({deploy:1,governAuthorization:18,beginM4Activation:2,stageM4ActivationBinding:2,finalizeM4Activation:2,
  allocateRuntimeInstance:5,updateRuntimeCredentialStatus:79,manageRuntimeParticipantSlots:8,prepareRuntimeAction:28,executeRuntimeAction:7,terminateTemplate:4}).sort()));
 assert(Buffer.from(norm(histories.get(159).contractActions[0].state),"hex").equals(Buffer.from(current.serialize())));
 artifacts.set("chain/contract-state.bin",current.serialize());
 for(const round of [8,9,17,18,85,86,113,115,146,147,149,155,158,159]){const n=String(round).padStart(3,"0"),indexed=histories.get(round);
  artifacts.set(`historical/state-${n}.bin`,Buffer.from(norm(indexed.contractActions[0].state),"hex"));
  artifacts.set(`historical/parameters-${n}.bin`,Buffer.from(norm(indexed.block.ledgerParameters),"hex"));
  artifacts.set(`historical/source-${n}.json`,encode({transactionId:journals.get(round).transactionIds.at(-1),blockHeight:indexed.block.height,blockHash:norm(indexed.block.hash)}));}
 const receipts:sdk.DecisionReceipt[]=[],seen=new Set<string>();
 stage="three-actual-historical-receipt-decoders";await progress();
 for(const round of [50,86,147]){
  const n=String(round).padStart(3,"0"),indexed=histories.get(round),stateBytes=Buffer.from(norm(indexed.contractActions[0].state),"hex"),state=ContractState.deserialize(stateBytes),historical=sdk.readPermioAuthorizationLedger(state.data);
  const added=[...historical.decisionReceipts].filter(([id])=>!seen.has(Buffer.from(id).toString("hex")));assert.equal(added.length,1);const[id,body]=added[0]!,receiptId=`0x${Buffer.from(id).toString("hex")}`as const;
  assert.equal(sdk.runtimeDecisionReceiptId(body),receiptId);seen.add(receiptId.slice(2));
  const transactionId=journals.get(round).transactionIds.at(-1);
  const decoded=await sdk.readFinalizedDecisionReceipt(receiptReaderModule.createIndexedDecisionReceiptReader({network:"preprod",profile,publicDataProvider:provider,contract:`0x${address}`,receiptId}),
   {network:"preprod",contract:`0x${address}`,transactionId,receiptId});assert(decoded.receiptVersion===1&&decoded.sourceLedgerSequence===String(indexed.block.height));receipts.push(decoded);
  artifacts.set(`historical/receipt-${n}-state.bin`,stateBytes);artifacts.set(`historical/receipt-${n}-source.json`,encode({transactionId,blockHeight:indexed.block.height,stateSha256:hash(stateBytes),receiptId}));
 }
 artifacts.set("receipts/decision-receipts.json",encode(receipts));
 stage="generated-circuit-lifecycle-controls";await progress();
 // The trusted frozen restorer only revives ABI values; no wallet or submission function is called.
 const {reviveRemainingCheckpoint}=await import(root+"/client/scripts/m6-restore-remaining-checkpoint.ts");
 const third=JSON.parse((await privateFile("first-fresh-completed-after87-private.json")).toString(),reviveRemainingCheckpoint);
 const fifthPrepared=[];
 for(const name of names.filter(n=>/^checkpoint-v9-[0-9]+\.json$/u.test(n)).sort()){
  const saved=JSON.parse((await privateFile(name)).toString(),reviveRemainingCheckpoint);if(saved.stage==="ordinary-action-final-prepared")fifthPrepared.push(saved.value);
 }
 assert(fifthPrepared.length===2&&Array.isArray(third.first.checked.candidates));const generatedLifecycleCases=[];
 for(const spec of [{before:85,winner:86,args:third.first.checked.candidates[third.first.checked.selectedCandidateIndex].arguments},
  {before:146,winner:147,args:fifthPrepared[0].arguments}]as {before:number;winner:number;args:PreparedOrdinaryAction["arguments"]}[]){
  const before=ContractState.deserialize(Buffer.from(norm(histories.get(spec.before).contractActions[0].state),"hex")),old=sdk.readPermioAuthorizationLedger(before.data);
  const args=spec.args,templates=[...old.activeTemplates].filter(([,v])=>isDeepStrictEqual(v.target,args[2].target));assert.equal(templates.length,1);
  const binding=args[11],moduleKey=sdk.permioAuthorizationPureCircuits.proofModuleRegistryKeyFromIdentity({moduleIdHash:binding.moduleIdHash,moduleVersion:binding.moduleVersion,implementationHash:binding.implementationHash});
  const expectedReceipt=receipts.find(r=>r.sourceTransaction===journals.get(spec.winner).transactionIds.at(-1));assert(expectedReceipt);
  const clock=BigInt(Math.floor(Date.parse(journals.get(spec.winner).attemptedAtUtc)/1000));
  for(const registry of ["proofModules","activeTemplates"]as const){const key=registry==="proofModules"?moduleKey:templates[0]![0];
   const check=auditM6GeneratedLifecycle({contract:sdk.createPermioAuthorizationContract(),address,arguments:args,preparedState:before.data.state.encode(),lifecycleState:current.data.state.encode(),registry,key,clockSeconds:clock});
   assert.equal(check.resultReceiptId,expectedReceipt.receiptId.slice(2));generatedLifecycleCases.push({...check,beforeRound:spec.before,winningRound:spec.winner,lifecycleRound:159,
    registryKey:Buffer.from(key).toString("hex"),clockSeconds:String(clock),beforeStateSha256:hash(before.serialize()),lifecycleStateSha256:hash(current.serialize())});
  }
 }
 assert(generatedLifecycleCases.length===4);artifacts.set("reports/generated-lifecycle-audit-approved172-v1.json",encode({passed:true,cases:generatedLifecycleCases,
  boundary:"generated-circuit-with-retained-abi-inputs",proofsRequested:0,nativeSubmissions:0,privateWitnessValuesIncluded:false,doesNotClaimNewNativeTransactionValidation:true}));
 const source=await readFile(root+"/client/public-source-manifest.json");assert.equal(hash(source),"483b5d5373b467cd92ca04a95ec24aa6418463f96d1e51023f535999fb23a024");artifacts.set("source/public-source-manifest.json",source);
 artifacts.set("source/contract-info.json",await readFile(root+"/client/packages/midnight-authorization/contracts/managed/permio-authorization/compiler/contract-info.json"));
 artifacts.set("reports/action-control-causal-audit-approved172-v1.json",encode(causal));
 for(const round of [155,158]){
  const name=`deprecated-module-admission-${round}.json`,raw=await readFile(root+"/"+name),report=JSON.parse(raw.toString());
  assert([9,18].includes(report.sourceStageRound));const journal=journals.get(report.sourceStageRound);assert(journal);
  const clock=BigInt(Math.floor(Date.parse(journal.attemptedAtUtc)/1000));assert(clock>0n);
  artifacts.set("reports/"+name,encode({...report,originalReportSha256:hash(raw),originalAttemptClockSeconds:String(clock),historicalAttemptClockSource:"original-submission-journal"}));
 }
 for(const name of ["approved172-after157-native-completion-v1.json","authority-after113-completion-v1.json","after113-recovery-verification-v1.json","after113-readonly-diagnosis-v1.json","after87-recovery-verification-v1.json","native87-readonly-inspection-v2.json"])
  artifacts.set("reports/"+name,await readFile(root+"/"+name));
 stage="sanitized-historical-runtime-evidence";await progress();
 for(let version=1;version<=9;version++)for(const name of ["report.json","resources.jsonl","client-public.jsonl"]){let data:Buffer;
  try{data=await readFile(`${root}/runtime-ordinary-matrix-v${version}/${name}`);}catch(error){
   if((error as NodeJS.ErrnoException).code!=="ENOENT"||name==="report.json"&&version!==3)throw error;
   artifacts.set(`runtime-v${version}/absent-${name}.json`,encode({historicalArtifactAbsent:true,file:name,
    historicalReportAbsent:version===3,failureReportPreserved:version!==3,
    reason:version===3?"Historical runtime3 directory/report is absent; counted native journals remain authoritative":"Historical optional public log was not created"}));continue;}
  artifacts.set(`runtime-v${version}/${name}`,name==="client-public.jsonl"?sanitizeM6RuntimePublicLog(data).bytes:data);}
 for(const name of ["report.json","client-public.jsonl","resources-latest.json"]){const data=await readFile(root+"/runtime-after157-tail-v1/"+name);artifacts.set("runtime-after157/"+name,name==="client-public.jsonl"?sanitizeM6RuntimePublicLog(data).bytes:data);}
 artifacts.set("source/after157-manual-scope.json",await readFile(root+"/manual-after157-recovery-scope-v1.json"));
 artifacts.set("diagnostics/local-pre-send-failure-157.json",encode({round:157,kind:"read-only-pre-native-rejection",customCode:170,nativeSubmissions:0,balancedSha256:"d789b184cf8d5910698fd06a6033b87359643d6d1d17eb34be41aacb393f4030",replacementRound:158,countedConservatively:true,failedBytesWithheld:true}));
 const summary={kind:"m6-approved172-native-matrix",contract:address,sourceSnapshot:13,sourceManifestSha256:hash(source),
  contractSourceSha256:hash(await readFile(root+"/client/packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js")),
  nativeAttempts:158,successfulFinals:152,nativeNegatives:4,countedLocalPreSendFailures:2,actualNativeSubmissionCount:156,reserveUsed:1,reservations:159,publicBoundTransactions:156,applicationInstances:5,receipts:3,
  authoritySequence:2,credentialStatusSequence:14,perEntry:Object.fromEntries(perEntry),allFourNativeNegativeCausalChecksPassed:true,unused55BytesExcluded:true,unsubmittedControlsExcluded:true,
  templatesAndModulesStillActive:false,testTemplatesRevoked:true,testModulesRevoked:true,restorationStillPending:true,approved172RemainingPlanExecuted:true,milestoneComplete:false,independentHumanReviewStillOpen:true};
 artifacts.set("summary.json",encode(summary));const text=JSON.stringify({summary,receipts},null,2).replace(/&/gu,"&amp;").replace(/</gu,"&lt;").replace(/>/gu,"&gt;");
 artifacts.set("render/native-matrix-state.html",Buffer.from("<!doctype html><meta charset=utf-8><title>M6 native matrix evidence</title><pre>"+text+"</pre>"));
 stage="complete-native-public-privacy-scan";const scan=scanM6PublicArtifacts(artifacts,await collectRecovery150PrivateScanValues());
 if(!scan.passed)await writeFile(directory+"/approved172-privacy-failure-v1.json",JSON.stringify(scan),{flag:"wx",mode:0o600});assert(scan.passed);
 const output=root+"/scanned-approved172-public-evidence-v1";await mkdir(output,{mode:0o700});
 for(const[name,data]of artifacts){const p=output+"/"+name;await mkdir(p.slice(0,p.lastIndexOf("/")),{recursive:true,mode:0o700});await writeFile(p,data,{flag:"wx",mode:0o600});}
 await writeFile(output+"/privacy-scan.json",JSON.stringify(scan),{flag:"wx",mode:0o600});
 process.stdout.write(JSON.stringify({passed:true,artifactCount:scan.artifactCount,privateValuesChecked:scan.privateValuesChecked,findings:scan.findings.length,nativeAttempts:158,successfulFinals:152,receipts:3,unsubmittedControlsExported:false,nativeSubmissions:0})+"\n");
}catch(error){await writeFile(directory+"/approved172-export-private-error-v6.json",JSON.stringify({stage,name:error instanceof Error?error.name:"unknown",message:error instanceof Error?error.message:"withheld",stack:error instanceof Error?error.stack:"withheld"}),{flag:"wx",mode:0o600});
 process.stdout.write(JSON.stringify({passed:false,stage,detailsWithheld:true,nativeSubmissions:0})+"\n");process.exitCode=1;}
