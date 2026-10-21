import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile,realpath,writeFile} from "node:fs/promises";
import path from "node:path";
import {isDeepStrictEqual} from "node:util";
import {ContractCall,Transaction,LedgerParameters} from "@midnight-ntwrk/midnight-js-protocol/ledger";
import {ContractState} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import {setNetworkId} from "@midnight-ntwrk/midnight-js-network-id";
import * as sdk from "@permio/midnight-authorization";
import {findM6SingleFallibleContractSegment,isDefiniteIncludedM6ActionFailure,isDefiniteNativeAuthRejection} from "./m6-native-negative-outcome.ts";
import {auditM6PublicCallReadSet} from "./m6-public-transcript-audit.ts";
import {copyM6PublicFieldForAudit} from "./m6-approved172-public-field-audit.ts";
import {copyM6PublicMapEntryForAudit} from "./m6-deprecated-module-admission-audit.ts";

assert(process.argv.length===3||process.argv.length===4&&process.argv[3]==="--preliminary");
const preliminary=process.argv[3]==="--preliminary",label=preliminary?"approved172-preliminary":"approved172";
const root=path.resolve(`logs/m6-remaining-preprod-20261019/downloaded-${label}-public-evidence-v1`);
const directory=await realpath(process.argv[2]!);assert.equal(directory,await realpath(root+"/public-evidence"));
const bytes=(n:string)=>readFile(directory+"/"+n),json=async(n:string)=>JSON.parse((await bytes(n)).toString());
const hash=(v:Uint8Array)=>createHash("sha256").update(v).digest("hex");
const manifest=JSON.parse(await readFile(root+"/manifest.json","utf8"));
const address="70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c",contract=`0x${address}`as const;
assert(manifest.contract===address&&manifest.nativeAttempts===158&&manifest.confirmed===152&&manifest.definiteNativeRejections===4&&manifest.publicBoundTransactions===156);
assert(manifest.sourceSnapshot===13&&manifest.unused55BytesExcluded&&manifest.allPublicBytesPrivacyScanned&&manifest.restorationStillPending===preliminary);
assert.equal(manifest.sourceManifestSha256,"483b5d5373b467cd92ca04a95ec24aa6418463f96d1e51023f535999fb23a024");
assert.equal(hash(await bytes("source/public-source-manifest.json")),manifest.sourceManifestSha256);
assert.equal(hash(await readFile("packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js")),manifest.contractSourceSha256);
for(const n of ["051","055"])assert(!Object.hasOwn(manifest.files,`transactions/attempt-${n}.bin`));
assert(!Object.keys(manifest.files).some(n=>n.includes("positive-controls")||n.includes("unbound")||n.includes("wallet-control")));
for(const[name,expected]of Object.entries(manifest.files)as [string,any][]){assert(/^[a-zA-Z0-9/_.-]+$/u.test(name)&&!name.split("/").some(p=>p===".."||p===""));const raw=await bytes(name);assert.equal(hash(raw),typeof expected==="string"?expected:expected.sha256);if(typeof expected!=="string"&&expected.bytes!==undefined)assert.equal(raw.length,expected.bytes);}
setNetworkId("preprod");let successful=0;const ids=new Map<number,readonly string[]>();
for(let round=1;round<=159;round++){
 if(round===51||round===55||round===157)continue;const n=String(round).padStart(3,"0"),raw=await bytes(`transactions/attempt-${n}.bin`);
 const tx=Transaction.deserialize("signature","proof","binding",raw);assert(Buffer.from(tx.serialize()).equals(raw));ids.set(round,tx.identifiers());
 if([87,116,148,150].includes(round)){
  const outcome=await json(`transactions/rejection-${n}.json`);assert(outcome.kind==="native-rejected"&&outcome.submittedAtMostOnce&&outcome.balancedSha256===hash(raw));
  assert.deepEqual(outcome.transactionIds,tx.identifiers());assert(outcome.negativeCase===({87:"independent-competing-transition",116:"stale-authority-root",148:"scoped-action-replay-after-cold-reconnect",150:"stale-credential-status-root"}as Record<number,string>)[round]);
  if(outcome.inclusion){assert((await bytes(`indexer/failed-contract-${n}.bin`)).equals(raw));const segment=findM6SingleFallibleContractSegment(tx,address);
   assert(isDefiniteIncludedM6ActionFailure({...outcome.inclusion,exactBoundBytesMatched:true,intendedSegmentId:segment.segmentId,
    contractCallHasGuaranteedTranscript:!!segment.call.guaranteedTranscript,contractCallHasFallibleTranscript:!!segment.call.fallibleTranscript,segmentStatusMap:new Map(outcome.inclusion.segmentStatusEntries)}));
  }else assert(isDefiniteNativeAuthRejection(outcome.validation,outcome.diagnostic));
 }else{assert((await bytes(`indexer/finalized-${n}.bin`)).equals(raw));successful++;}
}
assert.equal(successful,152);
const state=ContractState.deserialize(await bytes("chain/contract-state.bin")),view=sdk.readPermioAuthorizationLedger(state.data);
assert.equal(view.runtimeInstances.size(),5n);assert.equal(view.decisionReceipts.size(),3n);assert.equal(view.usedRuntimeActionNullifiers.size(),3n);assert.equal(view.runtimeActionSessions.size(),4n);
assert([...view.proofModules].every(([,v])=>v.lifecycleStatus===6n)&&[...view.activeTemplates].every(([,v])=>v.lifecycleStatus===3n));
assert.equal([...view.authorityRoots][0]![1].rootSequence,2n);assert.equal([...view.credentialStatusRoots][0]![1].rootSequence,14n);
const receipts=await json("receipts/decision-receipts.json")as sdk.DecisionReceipt[];assert.equal(receipts.length,3);
for(const round of [50,86,147]){
 const n=String(round).padStart(3,"0"),source=await json(`historical/receipt-${n}-source.json`),raw=await bytes(`historical/receipt-${n}-state.bin`);assert.equal(hash(raw),source.stateSha256);
 const historical=sdk.readPermioAuthorizationLedger(ContractState.deserialize(raw).data),receipt=receipts.find(r=>ids.get(round)!.includes(r.sourceTransaction));assert(receipt);
 assert(ids.get(round)!.includes(source.transactionId)&&receipt.sourceLedgerSequence===String(source.blockHeight)&&receipt.receiptId===source.receiptId);
 const key=Uint8Array.from(Buffer.from(receipt.receiptId.slice(2),"hex")),body=historical.decisionReceipts.lookup(key);assert.equal(sdk.runtimeDecisionReceiptId(body),receipt.receiptId);
 assert.deepEqual(body,view.decisionReceipts.lookup(key));assert(view.usedRuntimeActionNullifiers.member(body.scopedNullifier));
 const decoded=await sdk.readFinalizedDecisionReceipt({async readReceiptAtTransaction(transactionId){assert(ids.get(round)!.includes(transactionId));return{network:"preprod",contract,transactionId,
  ledgerSequence:BigInt(source.blockHeight),finalized:true,transactionSucceeded:true,receiptIdFromCall:receipt.receiptId,bodyAtTransaction:body};}},
  {network:"preprod",contract,transactionId:receipt.sourceTransaction,receiptId:receipt.receiptId});assert.deepEqual(decoded,receipt);
}
for(const name of ["privacy-scan.json",...(preliminary?[]:["complete-privacy-scan.json"])]){const scan=await json(name);assert(scan.passed&&scan.findings.length===0);
 for(const file of scan.files)assert.equal(hash(await bytes(file.artifact)),file.sha256);}
for(const version of [5,6,8,9])assert.equal((await json(`runtime-v${version}/report.json`)).exitCode,1);
const absent=await json("runtime-v3/absent-report.json.json");assert(absent.historicalArtifactAbsent&&absent.historicalReportAbsent&&absent.file==="report.json"&&!absent.failureReportPreserved);
const runtime=await json("runtime-v9/report.json");assert(runtime.exitCode===1&&runtime.temporarySwapRemoved&&runtime.originalSwapFilePreserved&&runtime.originalSwappinessRestored);
const complete=await json("reports/approved172-after157-native-completion-v1.json");assert(complete.passed&&complete.successfulTailSubmissions===2&&complete.reserveUsed===1&&complete.failed157NeverSubmitted&&complete.conservativeAttempts===158&&complete.applicationInstances===5&&!complete.milestoneComplete);
const tail=await json("runtime-after157/report.json");assert(tail.exitCode===0&&tail.originalSwapRestored&&tail.originalSwapFilePreserved&&tail.originalSwappinessRestored);
const failed157=await json("diagnostics/local-pre-send-failure-157.json");assert(failed157.round===157&&failed157.customCode===170&&failed157.nativeSubmissions===0&&failed157.replacementRound===158&&failed157.countedConservatively&&!manifest.files["transactions/attempt-157.bin"]);
const causal=await json("reports/action-control-causal-audit-approved172-v1.json"),info=await json("source/contract-info.json");
const sourceManifest=await json("source/public-source-manifest.json");assert.equal(hash(await bytes("source/contract-info.json")),sourceManifest.files["packages/midnight-authorization/contracts/managed/permio-authorization/compiler/contract-info.json"]);
assert(causal.passed&&causal.cases.length===4&&causal.sameProofBytesPaired&&causal.clockHeldAtOriginalNegativeAttempt);
for(const spec of [{before:85,after:86,negative:87,field:"runtimeInstances",route:[1,7]},{before:113,after:115,negative:116,field:"authorityRoots",route:[0,1]},
 {before:146,after:147,negative:148,field:"usedRuntimeActionNullifiers",route:[1,12]},{before:147,after:149,negative:150,field:"credentialStatusRoots",route:[1,4]}]){
 const report=causal.cases.find((v:any)=>v.nativeNegativeRound===spec.negative);assert(report&&/^[0-9]+$/u.test(report.clockSeconds));
 const b=String(spec.before).padStart(3,"0"),a=String(spec.after).padStart(3,"0"),n=String(spec.negative).padStart(3,"0");
 const before=ContractState.deserialize(await bytes(`historical/state-${b}.bin`)),after=ContractState.deserialize(await bytes(`historical/state-${a}.bin`));
 const old=sdk.readPermioAuthorizationLedger(before.data),next=sdk.readPermioAuthorizationLedger(after.data);
 const parameterSets=[await bytes(`historical/parameters-${b}.bin`),await bytes(`historical/parameters-${a}.bin`)];
 const negative=Transaction.deserialize("signature","proof","binding",await bytes(`transactions/attempt-${n}.bin`)),call=findM6SingleFallibleContractSegment(negative,address).call;
 assert.equal(report.nativeNegativeTransactionSha256,hash(await bytes(`transactions/attempt-${n}.bin`)));assert(ids.get(spec.before)!.includes(report.sourceBeforeTransactionId)&&ids.get(spec.after)!.includes(report.sourceAfterTransactionId));
 assert.deepEqual(info.ledger.find((v:any)=>v.name===spec.field).index,spec.route);
 if(spec.field!=="credentialStatusRoots")assert.deepEqual([...old.credentialStatusRoots],[...next.credentialStatusRoots]);assert.deepEqual([...old.activeTemplates],[...next.activeTemplates]);assert.deepEqual([...old.proofModules],[...next.proofModules]);
 let key:Uint8Array;
 if(spec.field==="runtimeInstances"){const changed=[...old.runtimeInstances].filter(([k,v])=>!isDeepStrictEqual(v,next.runtimeInstances.lookup(k)));assert.equal(changed.length,1);key=changed[0]![0];
  assert.equal(next.runtimeInstances.lookup(key).transitionSequence,old.runtimeInstances.lookup(key).transitionSequence+1n);assert.deepEqual([...old.authorityRoots],[...next.authorityRoots]);
 }else if(spec.field==="authorityRoots"){assert.equal(old.authorityRoots.size(),1n);key=[...old.authorityRoots][0]![0];assert.equal(old.authorityRoots.lookup(key).rootSequence,1n);assert.equal(next.authorityRoots.lookup(key).rootSequence,2n);assert.deepEqual([...old.runtimeInstances],[...next.runtimeInstances]);}
 else if(spec.field==="credentialStatusRoots"){key=[...old.credentialStatusRoots][0]![0];assert.equal(old.credentialStatusRoots.lookup(key).rootSequence,13n);assert.equal(next.credentialStatusRoots.lookup(key).rootSequence,14n);assert.deepEqual([...old.authorityRoots],[...next.authorityRoots]);assert.deepEqual([...old.decisionReceipts],[...next.decisionReceipts]);assert.deepEqual([...old.runtimeActionSessions],[...next.runtimeActionSessions]);}
 else{const added=[...next.usedRuntimeActionNullifiers].filter(k=>!old.usedRuntimeActionNullifiers.member(k));assert.equal(added.length,1);key=added[0]!;assert.equal(old.usedRuntimeActionNullifiers.size(),2n);assert.equal(next.usedRuntimeActionNullifiers.size(),3n);assert([...old.usedRuntimeActionNullifiers].every(k=>next.usedRuntimeActionNullifiers.member(k)));assert.deepEqual([...old.runtimeInstances],[...next.runtimeInstances]);assert.equal(next.decisionReceipts.size(),old.decisionReceipts.size()+1n);assert.equal(next.runtimeActionSessions.size(),old.runtimeActionSessions.size()-1n);}
 assert(report.eachHistoricalParameterSetHeldFixed&&report.parameterAudits.length===2);
 for(const [i,parameters] of parameterSets.entries()){
 const args={call,parameters:LedgerParameters.deserialize(parameters),clockSeconds:BigInt(report.clockSeconds)};
 const baseline=auditM6PublicCallReadSet({...args,encodedState:before.data.state.encode()}),changed=auditM6PublicCallReadSet({...args,encodedState:after.data.state.encode()});
 const projectedState=spec.field==="usedRuntimeActionNullifiers"?copyM6PublicFieldForAudit(before.data.state.encode(),after.data.state.encode(),spec.route):undefined;
 const projected=projectedState&&auditM6PublicCallReadSet({...args,encodedState:projectedState});
 const repaired=auditM6PublicCallReadSet({...args,encodedState:projectedState?copyM6PublicFieldForAudit(projectedState,before.data.state.encode(),spec.route):copyM6PublicMapEntryForAudit(after.data.state.encode(),before.data.state.encode(),spec.route,key)});
 assert(baseline.accepted&&!changed.accepted&&repaired.accepted);
 if(projected){assert(!projected.accepted&&report.onlyConsumedNullifierProjectedIntoOriginalPreparedState);assert.deepEqual(report.parameterAudits[i].projectedOnlyConsumedNullifier,projected);}
 assert.equal(report.parameterAudits[i].parametersSha256,hash(parameters));
 assert.deepEqual(report.parameterAudits[i].baseline,baseline);assert.deepEqual(report.parameterAudits[i].changed,changed);assert.deepEqual(report.parameterAudits[i].counterfactual,repaired);
 }
}
// Replay deprecation admission against genuine historical binding programs.
// These held-clock public-VM checks are not additional native submissions.
let deprecatedAdmissionChecks=0;
for(const round of [155,158]){
 const report=await json(`reports/deprecated-module-admission-${round}.json`);assert(report.actualIndexedModuleStatus===5&&report.historicalControlAccepted&&!report.actualModuleRecordProjectionAccepted&&report.restoringOnlyModuleRecordAcceptsAgain&&report.nativeSubmissions===0);
 assert([9,18].includes(report.sourceStageRound)&&report.boundary==="public-vm-readset-not-native-transaction-validation");
 const proofRound=report.sourceStageRound as number,beforeRound=proofRound-1,n=(v:number)=>String(v).padStart(3,"0");
 const original=ContractState.deserialize(await bytes(`historical/state-${n(beforeRound)}.bin`)),deprecated=ContractState.deserialize(await bytes(`historical/state-${n(round)}.bin`));
 assert.equal(hash(deprecated.serialize()),report.currentStateSha256);assert(ids.get(proofRound)!.includes(report.sourceStageTransactionId));
 const tx=Transaction.deserialize("signature","proof","binding",await bytes(`transactions/attempt-${n(proofRound)}.bin`)),actions=[...(tx.intents?.values()??[])].flatMap(i=>i.actions);
 assert(actions.length===1&&actions[0]instanceof ContractCall&&actions[0].address===address);const call=actions[0];assert((typeof call.entryPoint==="string"?call.entryPoint:Buffer.from(call.entryPoint).toString("utf8"))==="stageM4ActivationBinding");
 const key=Uint8Array.from(Buffer.from(report.moduleKey,"hex"));assert.equal(sdk.readPermioAuthorizationLedger(deprecated.data).proofModules.lookup(key).lifecycleStatus,5n);
 const projection=copyM6PublicMapEntryForAudit(original.data.state.encode(),deprecated.data.state.encode(),[0,4],key);
 assert(/^[0-9]+$/u.test(report.originalAttemptClockSeconds)&&report.historicalAttemptClockSource==="original-submission-journal");
 const args={call,parameters:LedgerParameters.deserialize(await bytes(`historical/parameters-${n(beforeRound)}.bin`)),clockSeconds:BigInt(report.originalAttemptClockSeconds)};
 assert([...tx.intents!.values()].every(i=>i.ttl.getTime()>Number(args.clockSeconds)*1000));
 assert(auditM6PublicCallReadSet({...args,encodedState:original.data.state.encode()}).accepted);
 assert(!auditM6PublicCallReadSet({...args,encodedState:projection}).accepted);
 assert(auditM6PublicCallReadSet({...args,encodedState:copyM6PublicMapEntryForAudit(projection,original.data.state.encode(),[0,4],key)}).accepted);deprecatedAdmissionChecks++;
}
const generatedLifecycle=await json("reports/generated-lifecycle-audit-approved172-v1.json");
assert(generatedLifecycle.passed&&generatedLifecycle.cases.length===4&&generatedLifecycle.nativeSubmissions===0&&generatedLifecycle.proofsRequested===0&&!generatedLifecycle.privateWitnessValuesIncluded);
const coveredLifecycleRows=new Set<string>();
for(const check of generatedLifecycle.cases){
 assert(check.passed&&check.baselineAccepted&&check.actualLifecycleRowRejectedAtExpectedCheck&&check.restoringOnlyRegistryRowAccepted&&check.immutableRegistryFieldsUnchanged);
 assert(check.boundary==="generated-circuit-with-retained-abi-inputs"&&check.doesNotClaimNewNativeTransactionValidation&&check.lifecycleRound===159&&/^[0-9a-f]{64}$/u.test(check.registryKey));
 assert(check.beforeRound===(check.winningRound===86?85:146)&&[86,147].includes(check.winningRound)&&/^[0-9]+$/u.test(check.clockSeconds));
 const n=String(check.beforeRound).padStart(3,"0"),beforeBytes=await bytes(`historical/state-${n}.bin`);assert.equal(hash(beforeBytes),check.beforeStateSha256);assert.equal(hash(await bytes("chain/contract-state.bin")),check.lifecycleStateSha256);
 const before=sdk.readPermioAuthorizationLedger(ContractState.deserialize(beforeBytes).data),key=Uint8Array.from(Buffer.from(check.registryKey,"hex"));
 assert(check.registry==="proofModules"||check.registry==="activeTemplates");const registry=check.registry as "proofModules"|"activeTemplates";
 const old=before[registry].lookup(key),next=view[registry].lookup(key);assert.equal(old.lifecycleStatus,registry==="proofModules"?4n:1n);assert.equal(next.lifecycleStatus,registry==="proofModules"?6n:3n);
 const mutable=registry==="proofModules"?["lifecycleStatus","deprecatedAt","revokedAt"]:["lifecycleStatus","terminationEffectiveSequence","terminationReasonHash","retiredAt","revokedAt"];
 const immutable=(row:object)=>Object.fromEntries(Object.entries(row).filter(([name])=>!mutable.includes(name)));assert.deepEqual(immutable(old),immutable(next));
 const receipt=receipts.find(v=>ids.get(check.winningRound)!.includes(v.sourceTransaction));assert(receipt&&receipt.receiptId===`0x${check.resultReceiptId}`);coveredLifecycleRows.add(registry+":"+check.registryKey);
}
assert.equal(coveredLifecycleRows.size,4);
if(!preliminary){const restored=await json("postrun/restoration/public-restore.json"),retained=await json("postrun/restoration/test-credential-retention.json");
 assert(restored.restored&&restored.allContentAndMetadataRestored&&restored.originalSwapFilePreserved&&restored.temporarySwapAbsent&&restored.offloadedPublicPaths===16&&restored.duplicatePairsRestored===23);
 assert(retained.testOnlyProvenanceVerified&&retained.privateDirectory0700&&retained.credentialFiles0600&&!retained.publicValuesOrCredentialsIncluded);
 const completed=await json("postrun/restoration/final-summary.json");assert(!completed.restorationStillPending&&completed.allPublicContentsAndRecordedMetadataRestored&&completed.nativeAttempts===158&&completed.successfulFinals===152&&!completed.milestoneComplete&&completed.independentHumanReviewStillOpen);
 assert((await bytes("render/final-public-state.html")).length>0);}
const result={passed:true,observedAtUtc:new Date().toISOString(),boundary:"offline-public-integrity-and-actual-receipt-decoder-replay",nativeAttempts:158,
 finalizedPublicBytesVerified:152,definiteNativeRejections:4,publicBoundTransactionsVerified:156,actualReceiptsDecoded:3,unused55BytesAbsent:true,unsubmittedControlsAbsent:true,
 publicVmCausalChecksReplayed:4,deprecatedAdmissionPublicVmChecksReplayed:deprecatedAdmissionChecks,generatedLifecycleChecksPublicProvenanceVerified:4,
 privateWitnessCircuitChecksReplayedOffline:false,readOnlyPositiveControlBytesExcluded:true,newNetworkValidation:false,newNativeSubmissions:0,restorationStillPending:preliminary,milestoneComplete:false,independentHumanReviewStillOpen:true};
await writeFile(`logs/m6-remaining-preprod-20261019/${preliminary?"approved172-preliminary-protocol-verification-v1.json":"approved172-download-protocol-verification-v1.json"}`,JSON.stringify(result,null,2)+"\n",{flag:"wx"});
process.stdout.write(JSON.stringify(result)+"\n");
