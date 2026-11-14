import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {lstat,readFile,readdir,realpath,writeFile} from "node:fs/promises";
import {Transaction} from "@midnight-ntwrk/midnight-js-protocol/ledger";
import {ContractState} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import {setNetworkId} from "@midnight-ntwrk/midnight-js-network-id";
import {indexerPublicDataProvider} from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import * as sdk from "@permio/midnight-authorization";
import {restoreM6GovernanceFixture} from "./run-live-m6-admission.ts";
import {restoreRemainingAfter45,reviveRemainingCheckpoint} from "./m6-restore-remaining-checkpoint.ts";
import {restoreCertifiedOrdinarySetup} from "./m6-restore-certified-ordinary.ts";

// Closed-run recovery only: no wallet, proof request or submission method.
const root="/opt/permio-m6-remaining-preprod-20261019-v1",directory=root+"/private";
const address="70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c";
assert(process.platform==="linux"&&process.argv.length===2);
for(const method of ["log","error","warn","info","debug"]as const)console[method]=()=>{};
const hash=(v:Uint8Array)=>createHash("sha256").update(v).digest("hex"),hex=(v:Uint8Array)=>Buffer.from(v).toString("hex");
const stringify=(v:unknown)=>JSON.stringify(v,function(k,value){const original=this[k];return typeof original==="bigint"?{$bigint:String(original)}:
 original instanceof Uint8Array?{$bytes:hex(original)}:value;});
let stage="closed-runtime";
async function privateFile(n:string){assert(/^[a-z0-9.-]+$/u.test(n));const p=directory+"/"+n,m=await lstat(p);
 assert(m.isFile()&&!m.isSymbolicLink()&&m.uid===0&&(m.mode&0o777)===0o600&&await realpath(p)===p);return readFile(p);}
async function json(n:string){return JSON.parse((await privateFile(n)).toString(),reviveRemainingCheckpoint);}
try{
 for(const role of ["controller","client"])assert(execFileSync("systemctl",["show",`permio-m6-remaining-ordinary-matrix-v6-${role}.service`,"-p","MainPID","--value"],{encoding:"utf8"}).trim()==="0");
 assert(execFileSync("docker",["ps","--quiet"],{encoding:"utf8"}).trim()==="");
 assert((await readFile("/proc/swaps","utf8")).trim().split("\n").length===1);
 const files=await readdir(directory);assert(files.filter(n=>/^wallet-\d{3}-submission.json$/u.test(n)).length===112);
 assert(files.filter(n=>/^wallet-\d{3}-reservation.json$/u.test(n)).length===113&&!files.some(n=>/^wallet-114-/u.test(n)));
 const input=await json("inputs.json");assert(input.networkId==="preprod"&&input.testOnlyProvenance.includes("disposable Preprod test"));
 const profile=new sdk.PreprodConnectionProfile(input.providerCredential),env=profile.environmentForSdk();setNetworkId("preprod");
 const provider=indexerPublicDataProvider(env.indexer,env.indexerWS);
 const raw=await privateFile("wallet-113-balanced.bin"),journal=await json("wallet-113-submission.json");
 const tx=Transaction.deserialize("signature","proof","binding",raw);assert.equal(hash(raw),journal.balancedSha256);assert.deepEqual(tx.identifiers(),journal.transactionIds);
 stage="exact-indexed-113";
 const response=await fetch(env.indexer,{method:"POST",headers:{"content-type":"application/json"},signal:AbortSignal.timeout(30000),
  body:JSON.stringify({query:`query T($offset:TransactionOffset!){transactions(offset:$offset){raw protocolVersion block{height} contractActions{__typename address state ... on ContractCall{entryPoint}} ... on RegularTransaction{identifiers transactionResult{status}}}}`,variables:{offset:{identifier:tx.identifiers().at(-1)}}})});
 assert(response.ok);const payload:any=await response.json();assert(!payload.errors);
 const matches=payload.data.transactions.filter((v:any)=>v.identifiers?.some((id:string)=>id.replace(/^0x/u,"")===tx.identifiers().at(-1)));assert.equal(matches.length,1);
 const indexed=matches[0];assert(indexed.protocolVersion===1000300&&indexed.transactionResult.status==="SUCCESS"&&indexed.block.height>0&&indexed.contractActions.length===1);
 assert(Buffer.from(indexed.raw.replace(/^0x/u,""),"hex").equals(raw));const action=indexed.contractActions[0];
 assert(action.__typename==="ContractCall"&&action.address.replace(/^0x/u,"")===address&&action.entryPoint==="prepareRuntimeAction");
 const historical=ContractState.deserialize(Buffer.from(action.state.replace(/^0x/u,""),"hex"));
 const current=await provider.queryContractState(address);assert(current&&Buffer.from(current.serialize()).equals(Buffer.from(historical.serialize())));
 stage="actual-m4-m5-checkpoint-reconstruction";
 const pair=await json("fixture-pair.json"),m4=restoreM6GovernanceFixture(pair.nonTransitioning);
 const original=await Promise.all(files.filter(n=>/^checkpoint-\d{3}.json$/u.test(n)).sort().map(json));
 const old=restoreRemainingAfter45(restoreM6GovernanceFixture(pair.stateful),original,address),status=old.setup.credentials!.status;
 const partial=(await json("checkpoint-v4-3002.json")).value,partialHash=sdk.permioAuthorizationPureCircuits.runtimeAccountCredentialCommitment(partial.account);
 status.issue({namespace:old.allocated.instance.namespace,kind:"account",credentialCommitment:partialHash,statusIndex:10n,revocationAuthorityAccountCredentialCommitment:partialHash});
 const third=await json("first-fresh-completed-after87-private.json"),credentials=third.first.checked.setup.credentials;
 for(const[kind,commitment,index]of [["account",sdk.permioAuthorizationPureCircuits.runtimeAccountCredentialCommitment(credentials.account),13n],
  ["capability",sdk.permioAuthorizationPureCircuits.runtimeCapabilityCredentialCommitment(credentials.capability.credential),14n],
  ["session",sdk.permioAuthorizationPureCircuits.runtimeSessionCredentialCommitment(credentials.session.credential),15n]]as const)
  status.issue({namespace:old.allocated.instance.namespace,kind,credentialCommitment:commitment,statusIndex:index,
   revocationAuthorityAccountCredentialCommitment:kind==="capability"?new Uint8Array(32):sdk.permioAuthorizationPureCircuits.runtimeAccountCredentialCommitment(credentials.account)});
 assert.equal(status.sequence,7n);
 const checkpoints=await Promise.all(files.filter(n=>/^checkpoint-v6-\d+.json$/u.test(n)).sort().map(json));
 const select=(name:string)=>{const a=checkpoints.filter(c=>c.stage===name);assert.equal(a.length,1);return a[0]!.value;};
 const allocated={...select("remaining-instance-allocation"),contractAddress:address};assert.equal(allocated.index,1);
 const prepared=select("ordinary-credentials-prepared"),slot=select("ordinary-root-slot-prepared");
 const last=checkpoints.filter(c=>c.stage==="ordinary-credential-call-prepared").at(-1)!.value;assert(last.phase==="session-certification");last.arguments[0]=BigInt(last.arguments[0]);
 const early={source:slot.source,command:slot.arguments[1],record:slot.record,priorState:slot.arguments[4],nextNonce:slot.arguments[5]};
 const bad=Uint8Array.from(early.nextNonce as Uint8Array);bad[0]^=1;
 assert.throws(()=>restoreCertifiedOrdinarySetup({m4:restoreM6GovernanceFixture(pair.nonTransitioning),allocated,prepared,finalCall:last.arguments,initialStatus:status,rootSlotBeforeSession:{...early,nextNonce:bad}}));
 assert.equal(status.sequence,7n);
 const restored=restoreCertifiedOrdinarySetup({m4,allocated,prepared,finalCall:last.arguments,initialStatus:status,rootSlotBeforeSession:early});
 const initial=select("ordinary-action-prepared"),finished=select("ordinary-action-final-prepared"),view=sdk.readPermioAuthorizationLedger(current.data),pure=sdk.permioAuthorizationPureCircuits;
 assert.equal(view.runtimeInstances.size(),4n);assert.equal(view.decisionReceipts.size(),2n);assert.equal(view.usedRuntimeActionNullifiers.size(),2n);
 assert.equal(view.authorityRoots.lookup(allocated.allocation.target.namespaceHash).rootSequence,1n);
 assert.equal(view.credentialStatusRoots.lookup(allocated.allocation.target.namespaceHash).rootSequence,10n);assert.deepEqual(status.root,view.credentialStatusRoots.lookup(allocated.allocation.target.namespaceHash).root);
 assert.deepEqual(finished.currentState,restored.setup.credentials!.binding.state);assert.equal(finished.sequence,4n);
 for(const j of [0,1,2,3,6,7,8,9,10,11,12,14,15,16,17,18,19,20])assert.deepEqual(initial.finalArguments[j],finished.arguments[j]);
 assert.deepEqual(view.runtimeInstances.lookup(allocated.allocation.instanceCommitment).currentStateCommitment,pure.runtimeStateCommitment(finished.currentState));
 assert.deepEqual(view.runtimeActionSessions.lookup(pure.runtimeActionCommandCommitment(finished.arguments[0])).progressCommitment,pure.runtimeActionProgressCommitment(finished.arguments[13]));
 assert(restored.system.authorizeAction(finished.signedIntent,Number(finished.arguments[0].effectiveAt)).allowed);
 const privateSentinels=[...restored.setup.privateSentinels,allocated.instance.instanceId,new Date(allocated.instance.expiresAt*1000).toISOString(),
  prepared.accountPrivateKeyPem,prepared.sessionPrivateKeyPem,finished.signedIntent.payload.nonce,hex(finished.arguments[20]),
  ...initial.evidence.inputs.concat(initial.evidence.outputs).flatMap((v:any)=>[hex(v.selected.nonce),hex(v.selected.payloadCommitment)])];
 await writeFile(directory+"/fourth-prepared-after113-private.json",stringify({allocated,prepared,slot,lastCredential:last,finished,initial,privateSentinels}),{flag:"wx",mode:0o600});
 const result={passed:true,observedAtUtc:new Date().toISOString(),conservativeAttempts:112,successfulFinals:110,nativeNegatives:1,
  applicationInstances:4,receipts:2,pendingPreparations:Number(view.runtimeActionSessions.size()),exactIndexed113BytesVerified:true,
  currentEntireStateEquals113:true,stateSha256:hash(current.serialize()),sourceTransactionIds:tx.identifiers(),blockHeight:indexed.block.height,
  actualM4M5ApisUsed:true,originalSignedIntentAuthorized:true,tamperedEarlySlotRejected:true,checkpointRestoredWithoutSubmission:true,nativeSubmissions:0,proofsRequested:0};
 await writeFile(root+"/after113-recovery-verification-v1.json",JSON.stringify(result),{flag:"wx",mode:0o600});process.stdout.write(JSON.stringify(result)+"\n");
}catch(error){await writeFile(directory+"/after113-recovery-private-error-v1.json",JSON.stringify({stage,name:error instanceof Error?error.name:"unknown",message:error instanceof Error?error.message:"withheld",stack:error instanceof Error?error.stack:"withheld"}),{flag:"wx",mode:0o600});
 process.stdout.write(JSON.stringify({passed:false,stage,detailsWithheld:true,nativeSubmissions:0,proofsRequested:0})+"\n");process.exitCode=1;}
