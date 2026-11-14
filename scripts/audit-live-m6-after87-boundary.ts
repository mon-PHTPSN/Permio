import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {lstat,readFile,readdir,realpath,writeFile} from "node:fs/promises";
import {Transaction} from "@midnight-ntwrk/midnight-js-protocol/ledger";
import {ContractState} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import {setNetworkId} from "@midnight-ntwrk/midnight-js-network-id";
import {indexerPublicDataProvider} from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import * as sdk from "@permio/midnight-authorization";
import {reviveRemainingCheckpoint} from "./m6-restore-remaining-checkpoint.ts";
import {isDefiniteIncludedM6ActionFailure,isDefiniteNativeAuthRejection} from "./m6-native-negative-outcome.ts";

// Separate diagnostic, never part of the running source9 execution snapshot.
// Its strict closed boundary must hold before a provider is constructed.
const root="/opt/permio-m6-remaining-preprod-20261019-v1";
const address="70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c";
assert(process.platform==="linux"&&process.argv.length===2);
for(const method of ["log","error","warn","info","debug"]as const)console[method]=()=>{};
const hash=(v:Uint8Array)=>createHash("sha256").update(v).digest("hex");
const normalize=(v:string)=>v.replace(/^0x/u,"");
let stage="closed-runtime";
async function privateFile(name:string){
 assert(/^[a-z0-9.-]+$/u.test(name));const p=root+"/private/"+name,m=await lstat(p);
 assert(m.isFile()&&!m.isSymbolicLink()&&m.uid===0&&(m.mode&0o777)===0o600&&await realpath(p)===p);return readFile(p);
}
try{
 for(const version of [1,2,3,4,5])for(const role of ["controller","client"])
  assert(execFileSync("systemctl",["show",`permio-m6-remaining-ordinary-matrix-v${version}-${role}.service`,"-p","MainPID","--value"],{encoding:"utf8"}).trim()==="0");
 assert(execFileSync("docker",["ps","--quiet"],{encoding:"utf8"}).trim()==="");
 assert((await readFile("/proc/swaps","utf8")).trim().split("\n").length===1);
 assert((await readFile("/proc/sys/vm/swappiness","utf8")).trim()==="0");
 const runtime=JSON.parse(await readFile(root+"/runtime-ordinary-matrix-v5/report.json","utf8"));
 assert(runtime.exitCode===1&&runtime.ownedClientStopped&&runtime.ownedProverStopped&&runtime.temporarySwapRemoved&&
  runtime.originalSwapRestored&&runtime.originalSwapFilePreserved&&runtime.originalSwappinessRestored);
 assert(hash(await readFile(root+"/client/public-source-manifest.json"))==="d2a26830d839fb9376c3299f5a5f130e076f8cb6365c49a46f636a417ea7b756");
 const failure=JSON.parse((await privateFile("remaining-ordinary-matrix-v5-private-error.json")).toString());
 assert(failure.name==="AssertionError"&&failure.stage==="fresh-two-flow-matrix"&&
  failure.message==="Fresh stateful instance needs over three hours for the remaining real-clock controls");
 const files=await readdir(root+"/private");
 assert(files.filter(x=>/^wallet-[0-9]{3}-submission\.json$/u.test(x)).length===86&&
  files.filter(x=>/^wallet-[0-9]{3}-reservation\.json$/u.test(x)).length===87&&!files.some(x=>/^wallet-088-/u.test(x)));
 const grant=JSON.parse((await privateFile("run-approval-v2.json")).toString());
 assert(grant.userApproved&&grant.nativeCap===150&&grant.applicationInstances===4&&grant.noAutomaticRetries&&grant.failed55MustRemainUnused);
 stage="exact-indexed-state-and-recorded-negative";
 const input=JSON.parse((await privateFile("inputs.json")).toString());
 assert(input.networkId==="preprod"&&input.testOnlyProvenance.includes("disposable Preprod test"));setNetworkId("preprod");
 const env=new sdk.PreprodConnectionProfile(input.providerCredential).environmentForSdk();
 const winner=await privateFile("wallet-086-balanced.bin"),winnerTx=Transaction.deserialize("signature","proof","binding",winner);
 const journal=JSON.parse((await privateFile("wallet-086-submission.json")).toString());
 assert(hash(winner)===journal.balancedSha256&&journal.submittedAtMostOnce);assert.deepEqual(winnerTx.identifiers(),journal.transactionIds);
 const id=winnerTx.identifiers().at(-1)!;
 const response=await fetch(env.indexer,{method:"POST",headers:{"content-type":"application/json"},signal:AbortSignal.timeout(30000),
  body:JSON.stringify({query:`query M6After87($offset:TransactionOffset!){transactions(offset:$offset){raw block{height}
   contractActions{__typename address state ... on ContractCall{entryPoint}} ... on RegularTransaction{identifiers transactionResult{status}}}}`,
   variables:{offset:{identifier:id}}})});
 assert(response.ok);const data:any=await response.json();assert(!data.errors&&Array.isArray(data.data?.transactions));
 const matches=data.data.transactions.filter((x:any)=>x.identifiers?.some((v:string)=>normalize(v)===id));assert(matches.length===1);
 const indexed=matches[0];assert(indexed.transactionResult.status==="SUCCESS"&&Buffer.from(normalize(indexed.raw),"hex").equals(winner));
 assert(indexed.contractActions.length===1);const action=indexed.contractActions[0];
 assert(action.__typename==="ContractCall"&&normalize(action.address)===address&&action.entryPoint==="executeRuntimeAction");
 const encoded=Buffer.from(normalize(action.state),"hex"),state=ContractState.deserialize(encoded),view=sdk.readPermioAuthorizationLedger(state.data);
 const provider=indexerPublicDataProvider(env.indexer,env.indexerWS),current=await provider.queryContractState(address);assert(current&&Buffer.from(current.serialize()).equals(encoded));
 const negative=await privateFile("wallet-087-balanced.bin"),negativeTx=Transaction.deserialize("signature","proof","binding",negative);
 const outcome=JSON.parse((await privateFile("wallet-087-outcome.json")).toString());
 assert(outcome.kind==="native-rejected"&&outcome.negativeCase==="independent-competing-transition"&&outcome.submittedAtMostOnce&&outcome.balancedSha256===hash(negative));
 assert.deepEqual(outcome.transactionIds,negativeTx.identifiers());
 if(outcome.inclusion){
  assert(isDefiniteIncludedM6ActionFailure({...outcome.inclusion,segmentStatusMap:new Map(outcome.inclusion.segmentStatusEntries)}));
  const final=await provider.watchForTxData(negativeTx.identifiers().at(-1)!);
  assert(final.status==="FailFallible"&&Buffer.from(final.tx.serialize()).equals(negative));
 }else assert(isDefiniteNativeAuthRejection(outcome.validation,outcome.diagnostic));
 stage="preserved-old-state-and-completed-third-flow";
 const old=sdk.readPermioAuthorizationLedger(ContractState.deserialize(await readFile(root+"/scanned-failure55-public-evidence-v1/chain/contract-state.bin")).data);
 for(const [key,value]of old.runtimeInstances)assert.deepEqual(view.runtimeInstances.lookup(key),value);
 for(const [key,value]of old.decisionReceipts)assert.deepEqual(view.decisionReceipts.lookup(key),value);
 assert.deepEqual([...old.authorityRoots],[...view.authorityRoots]);assert.deepEqual([...old.activeTemplates],[...view.activeTemplates]);assert.deepEqual([...old.proofModules],[...view.proofModules]);
 assert(view.runtimeInstances.size()===3n&&view.decisionReceipts.size()===2n&&view.usedRuntimeActionNullifiers.size()===2n&&view.runtimeActionSessions.size()===2n);
 assert.deepEqual([...view.runtimeInstances].map(([,v])=>Number(v.transitionSequence)).sort((a,b)=>a-b),[1,5,5]);
 assert(view.credentialStatusRoots.size()===1n&&[...view.credentialStatusRoots][0]![1].rootSequence===7n&&[...view.authorityRoots][0]![1].rootSequence===1n);
 const completed=[];
 for(const name of files.filter(x=>/^checkpoint-v5-[0-9]+\.json$/u.test(x))){const c=JSON.parse((await privateFile(name)).toString(),reviveRemainingCheckpoint);
  if(c.stage==="remaining-ordinary-flow-completed")completed.push(c.value);}
 assert(completed.length===1&&completed[0].index===0);const flow=completed[0];
 assert(view.runtimeInstances.member(flow.allocation.instanceCommitment)&&flow.checked.receipt.transitioning&&journal.transactionIds.includes(normalize(flow.checked.receipt.sourceTransaction)));
 assert(view.runtimeInstances.lookup(flow.allocation.instanceCommitment).transitionSequence===flow.checked.sequence+1n);
 assert.deepEqual(view.runtimeInstances.lookup(flow.allocation.instanceCommitment).currentStateCommitment,
  sdk.permioAuthorizationPureCircuits.runtimeStateCommitment(flow.checked.candidates[flow.checked.selectedCandidateIndex].expectedNextState));
 const report={schemaVersion:1,kind:"m6-after87-closed-boundary-audit",passed:true,observedAtUtc:new Date().toISOString(),contract:address,
  conservativeAttempts:86,normalFinals:84,definiteNativeNegatives:1,reservations:87,applicationInstances:3,receipts:2,
  currentStateEqualsExactIndexed86:true,negative87Reconciled:true,oldTwoInstancesAndReceiptPreserved:true,completedFreshStatefulFlowVerified:true,
  onlyObservedFailure:"harness-overly-strict-future-management-expiry-forecast",sourceSnapshot:9,
  sourceManifestSha256:hash(await readFile(root+"/client/public-source-manifest.json")),nativeSubmissions:0,proofsRequested:0,privateValuesLogged:false,
  nextApprovedRound:88,remainingPlannedCalls:49,unchangedFinalBaselineAttempts:135,unchangedApprovedCeiling:150};
 await writeFile(root+"/after87-closed-boundary-audit-v1.json",JSON.stringify(report),{flag:"wx",mode:0o600});process.stdout.write(JSON.stringify(report)+"\n");
}catch(error){
 await writeFile(root+"/private/after87-boundary-private-error.json",JSON.stringify({stage,name:error instanceof Error?error.name:"unknown",
  message:error instanceof Error?error.message:"withheld"}),{flag:"wx",mode:0o600});
 process.stdout.write(JSON.stringify({passed:false,stage,nativeSubmissions:0,proofsRequested:0,detailsWithheld:true})+"\n");process.exitCode=1;
}
