import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile,realpath,writeFile} from "node:fs/promises";
import path from "node:path";
import {isDeepStrictEqual} from "node:util";
import {Transaction,LedgerParameters} from "@midnight-ntwrk/midnight-js-protocol/ledger";
import {ContractState} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import {setNetworkId} from "@midnight-ntwrk/midnight-js-network-id";
import * as sdk from "@permio/midnight-authorization";
import {findM6SingleFallibleContractSegment,isDefiniteIncludedM6ActionFailure,isDefiniteNativeAuthRejection} from "./m6-native-negative-outcome.ts";
import {auditM6PublicCallReadSet} from "./m6-public-transcript-audit.ts";
import {copyM6PublicMapEntryForAudit} from "./m6-deprecated-module-admission-audit.ts";

assert(process.argv.length===3||process.argv.length===4&&process.argv[3]==="--preliminary");
const preliminary=process.argv[3]==="--preliminary",label=preliminary?"authority115-preliminary":"authority115";
const root=path.resolve(`logs/m6-remaining-preprod-20261019/downloaded-${label}-public-evidence-v1`);
const directory=await realpath(process.argv[2]!);assert.equal(directory,await realpath(root+"/public-evidence"));
const bytes=(n:string)=>readFile(directory+"/"+n),json=async(n:string)=>JSON.parse((await bytes(n)).toString());
const hash=(v:Uint8Array)=>createHash("sha256").update(v).digest("hex");
const manifest=JSON.parse(await readFile(root+"/manifest.json","utf8"));
const address="70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c",contract=`0x${address}`as const;
assert(manifest.contract===address&&manifest.nativeAttempts===115&&manifest.confirmed===112&&manifest.definiteNativeRejections===2&&manifest.publicBoundTransactions===114);
assert(manifest.sourceSnapshot===11&&manifest.unused55BytesExcluded&&manifest.allPublicBytesPrivacyScanned&&manifest.restorationStillPending===preliminary);
assert.equal(manifest.sourceManifestSha256,"34c8373fd6bed6ed3e9dcf3b5c52255583a41deda35925a9a5fc9be0fe14c121");
assert.equal(hash(await bytes("source/public-source-manifest.json")),manifest.sourceManifestSha256);
assert.equal(hash(await readFile("packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js")),manifest.contractSourceSha256);
for(const n of ["051","055"])assert(!Object.hasOwn(manifest.files,`transactions/attempt-${n}.bin`));
assert(!Object.keys(manifest.files).some(n=>n.includes("positive-controls")||n.includes("unbound")||n.includes("wallet-control")));
setNetworkId("preprod");let successful=0;const ids=new Map<number,readonly string[]>();
for(let round=1;round<=116;round++){
 if(round===51||round===55)continue;const n=String(round).padStart(3,"0"),raw=await bytes(`transactions/attempt-${n}.bin`);
 const tx=Transaction.deserialize("signature","proof","binding",raw);assert(Buffer.from(tx.serialize()).equals(raw));ids.set(round,tx.identifiers());
 if(round===87||round===116){
  const outcome=await json(`transactions/rejection-${n}.json`);assert(outcome.kind==="native-rejected"&&outcome.submittedAtMostOnce&&outcome.balancedSha256===hash(raw));
  assert.deepEqual(outcome.transactionIds,tx.identifiers());assert(outcome.negativeCase===(round===87?"independent-competing-transition":"stale-authority-root"));
  if(outcome.inclusion){assert((await bytes(`indexer/failed-contract-${n}.bin`)).equals(raw));const segment=findM6SingleFallibleContractSegment(tx,address);
   assert(isDefiniteIncludedM6ActionFailure({...outcome.inclusion,exactBoundBytesMatched:true,intendedSegmentId:segment.segmentId,
    contractCallHasGuaranteedTranscript:!!segment.call.guaranteedTranscript,contractCallHasFallibleTranscript:!!segment.call.fallibleTranscript,segmentStatusMap:new Map(outcome.inclusion.segmentStatusEntries)}));
  }else assert(isDefiniteNativeAuthRejection(outcome.validation,outcome.diagnostic));
 }else{assert((await bytes(`indexer/finalized-${n}.bin`)).equals(raw));successful++;}
}
assert.equal(successful,112);
const state=ContractState.deserialize(await bytes("chain/contract-state.bin")),view=sdk.readPermioAuthorizationLedger(state.data);
assert.equal(view.runtimeInstances.size(),4n);assert.equal(view.decisionReceipts.size(),2n);assert.equal(view.usedRuntimeActionNullifiers.size(),2n);assert.equal(view.runtimeActionSessions.size(),3n);
assert([...view.proofModules].every(([,v])=>v.lifecycleStatus===4n)&&[...view.activeTemplates].every(([,v])=>v.lifecycleStatus===1n));
assert.equal([...view.authorityRoots][0]![1].rootSequence,2n);assert.equal([...view.credentialStatusRoots][0]![1].rootSequence,10n);
const receipts=await json("receipts/decision-receipts.json")as sdk.DecisionReceipt[];assert.equal(receipts.length,2);
for(const round of [50,86]){
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
for(const version of [5,6])assert.equal((await json(`runtime-v${version}/report.json`)).exitCode,1);
const absent=await json("runtime-v3/absent-report.json.json");assert(absent.historicalArtifactAbsent&&absent.historicalReportAbsent&&absent.file==="report.json"&&!absent.failureReportPreserved);
const runtime=await json("runtime-v7/report.json");assert(runtime.exitCode===0&&runtime.temporarySwapRemoved&&runtime.originalSwapFilePreserved&&runtime.originalSwappinessRestored);
const complete=await json("reports/authority-after113-completion-v1.json");assert(complete.passed&&complete.phaseNativeAttempts===3&&complete.entireStateUnchangedByNegative&&complete.fifthInstanceNotStarted);
const causal=await json("reports/action-control-causal-audit-authority115-v1.json"),info=await json("source/contract-info.json");
const sourceManifest=await json("source/public-source-manifest.json");assert.equal(hash(await bytes("source/contract-info.json")),sourceManifest.files["packages/midnight-authorization/contracts/managed/permio-authorization/compiler/contract-info.json"]);
assert(causal.passed&&causal.cases.length===2&&causal.sameProofBytesPaired&&causal.clockHeldAtOriginalNegativeAttempt);
for(const spec of [{before:85,after:86,negative:87,field:"runtimeInstances",route:[1,7]},{before:113,after:115,negative:116,field:"authorityRoots",route:[0,1]}]){
 const report=causal.cases.find((v:any)=>v.nativeNegativeRound===spec.negative);assert(report&&/^[0-9]+$/u.test(report.clockSeconds));
 const b=String(spec.before).padStart(3,"0"),a=String(spec.after).padStart(3,"0"),n=String(spec.negative).padStart(3,"0");
 const before=ContractState.deserialize(await bytes(`historical/state-${b}.bin`)),after=ContractState.deserialize(await bytes(`historical/state-${a}.bin`));
 const old=sdk.readPermioAuthorizationLedger(before.data),next=sdk.readPermioAuthorizationLedger(after.data);
 const parameterSets=[await bytes(`historical/parameters-${b}.bin`),await bytes(`historical/parameters-${a}.bin`)];
 const negative=Transaction.deserialize("signature","proof","binding",await bytes(`transactions/attempt-${n}.bin`)),call=findM6SingleFallibleContractSegment(negative,address).call;
 assert.equal(report.nativeNegativeTransactionSha256,hash(await bytes(`transactions/attempt-${n}.bin`)));assert(ids.get(spec.before)!.includes(report.sourceBeforeTransactionId)&&ids.get(spec.after)!.includes(report.sourceAfterTransactionId));
 assert.deepEqual(info.ledger.find((v:any)=>v.name===spec.field).index,spec.route);
 assert.deepEqual([...old.credentialStatusRoots],[...next.credentialStatusRoots]);assert.deepEqual([...old.activeTemplates],[...next.activeTemplates]);assert.deepEqual([...old.proofModules],[...next.proofModules]);
 let key:Uint8Array;
 if(spec.field==="runtimeInstances"){const changed=[...old.runtimeInstances].filter(([k,v])=>!isDeepStrictEqual(v,next.runtimeInstances.lookup(k)));assert.equal(changed.length,1);key=changed[0]![0];
  assert.equal(next.runtimeInstances.lookup(key).transitionSequence,old.runtimeInstances.lookup(key).transitionSequence+1n);assert.deepEqual([...old.authorityRoots],[...next.authorityRoots]);
 }else{assert.equal(old.authorityRoots.size(),1n);key=[...old.authorityRoots][0]![0];assert.equal(old.authorityRoots.lookup(key).rootSequence,1n);assert.equal(next.authorityRoots.lookup(key).rootSequence,2n);assert.deepEqual([...old.runtimeInstances],[...next.runtimeInstances]);}
 assert(report.eachHistoricalParameterSetHeldFixed&&report.parameterAudits.length===2);
 for(const [i,parameters] of parameterSets.entries()){
 const args={call,parameters:LedgerParameters.deserialize(parameters),clockSeconds:BigInt(report.clockSeconds)};
 const baseline=auditM6PublicCallReadSet({...args,encodedState:before.data.state.encode()}),changed=auditM6PublicCallReadSet({...args,encodedState:after.data.state.encode()}),
  repaired=auditM6PublicCallReadSet({...args,encodedState:copyM6PublicMapEntryForAudit(after.data.state.encode(),before.data.state.encode(),spec.route,key)});
 assert(baseline.accepted&&!changed.accepted&&repaired.accepted);
 assert.equal(report.parameterAudits[i].parametersSha256,hash(parameters));
 assert.deepEqual(report.parameterAudits[i].baseline,baseline);assert.deepEqual(report.parameterAudits[i].changed,changed);assert.deepEqual(report.parameterAudits[i].counterfactual,repaired);
 }
}
if(!preliminary){const restored=await json("postrun/restoration/public-restore.json"),retained=await json("postrun/restoration/test-credential-retention.json");
 assert(restored.restored&&restored.allContentAndMetadataRestored&&restored.originalSwapFilePreserved&&restored.temporarySwapAbsent&&restored.offloadedPublicPaths===16&&restored.duplicatePairsRestored===23);
 assert(retained.testOnlyProvenanceVerified&&retained.privateDirectory0700&&retained.credentialFiles0600&&!retained.publicValuesOrCredentialsIncluded);
 const completed=await json("postrun/restoration/final-summary.json");assert(!completed.restorationStillPending&&completed.allPublicContentsAndRecordedMetadataRestored&&completed.nativeAttempts===115&&completed.successfulFinals===112&&!completed.milestoneComplete&&completed.independentHumanReviewStillOpen);
 assert((await bytes("render/final-public-state.html")).length>0);}
const result={passed:true,observedAtUtc:new Date().toISOString(),boundary:"offline-public-integrity-and-actual-receipt-decoder-replay",nativeAttempts:115,
 finalizedPublicBytesVerified:112,definiteNativeRejections:2,publicBoundTransactionsVerified:114,actualReceiptsDecoded:2,unused55BytesAbsent:true,unsubmittedControlsAbsent:true,
 publicVmCausalChecksReplayed:2,readOnlyPositiveControlBytesExcluded:true,newNetworkValidation:false,newNativeSubmissions:0,restorationStillPending:preliminary,milestoneComplete:false,independentHumanReviewStillOpen:true};
await writeFile(`logs/m6-remaining-preprod-20261019/${preliminary?"authority115-preliminary-protocol-verification-v1.json":"authority115-download-protocol-verification-v1.json"}`,JSON.stringify(result,null,2)+"\n",{flag:"wx"});
process.stdout.write(JSON.stringify(result)+"\n");
