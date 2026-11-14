import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {lstat,readFile,readdir,realpath,writeFile} from "node:fs/promises";
import {encodeCanonical} from "@permio/protocol";
import {Transaction} from "@midnight-ntwrk/midnight-js-protocol/ledger";
import {ContractState} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import {setNetworkId} from "@midnight-ntwrk/midnight-js-network-id";
import {indexerPublicDataProvider} from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import * as sdk from "@permio/midnight-authorization";
import {restoreM6GovernanceFixture} from "./run-live-m6-admission.ts";
import {restoreRemainingAfter45,reviveRemainingCheckpoint} from "./m6-restore-remaining-checkpoint.ts";
import {restoreCertifiedOrdinarySetup} from "./m6-restore-certified-ordinary.ts";
import {findM6SingleFallibleContractSegment,isDefiniteIncludedM6ActionFailure,canAttemptM6NegativeSubmission} from "./m6-native-negative-outcome.ts";
import {parsePreprodSubmissionFailure} from "../packages/midnight-authorization/src/preprod-submission-failure.ts";
import type {M6RemainingCompletedFlow} from "./m6-remaining-ordinary-v2.ts";
import type {PreparedOrdinaryAction} from "./m6-ordinary-action-workflow.ts";

// Reconstruct only already finalized results. No wallet, proof or submit API.
const root="/opt/permio-m6-remaining-preprod-20261019-v1",directory=root+"/private";
const address="70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c";
assert(process.platform==="linux"&&process.argv.length===2);
for(const method of ["log","error","warn","info","debug"]as const)console[method]=()=>{};
const hash=(v:Uint8Array)=>createHash("sha256").update(v).digest("hex"),hex=(v:Uint8Array)=>Buffer.from(v).toString("hex");
const norm=(v:string)=>v.replace(/^0x/u,"");let stage="closed-native-boundary";
async function privateFile(name:string){
 assert(/^[a-z0-9.-]+$/u.test(name));const p=directory+"/"+name,m=await lstat(p);
 assert(m.isFile()&&!m.isSymbolicLink()&&m.uid===0&&(m.mode&0o777)===0o600&&await realpath(p)===p);return readFile(p);
}
const stringify=(v:unknown)=>JSON.stringify(v,function(k,value){const original=this[k];return typeof original==="bigint"?{$bigint:String(original)}:
 original instanceof Uint8Array?{$bytes:hex(original)}:value;});
try{
 for(const version of [1,2,3,4,5])for(const role of ["controller","client"])
  assert(execFileSync("systemctl",["show",`permio-m6-remaining-ordinary-matrix-v${version}-${role}.service`,"-p","MainPID","--value"],{encoding:"utf8"}).trim()==="0");
 assert(execFileSync("docker",["ps","--quiet"],{encoding:"utf8"}).trim()===""&&(await readFile("/proc/swaps","utf8")).trim().split("\n").length===1);
 assert((await readFile("/proc/sys/vm/swappiness","utf8")).trim()==="0");
 const runtime=JSON.parse(await readFile(root+"/runtime-ordinary-matrix-v5/report.json","utf8"));
 assert(runtime.exitCode===1&&runtime.ownedClientStopped&&runtime.ownedProverStopped&&runtime.temporarySwapRemoved&&runtime.originalSwapRestored&&runtime.originalSwapFilePreserved&&runtime.originalSwappinessRestored);
 assert(hash(await readFile(root+"/client/public-source-manifest.json"))==="d2a26830d839fb9376c3299f5a5f130e076f8cb6365c49a46f636a417ea7b756");
 const files=await readdir(directory);assert(files.filter(x=>/^wallet-[0-9]{3}-submission\.json$/u.test(x)).length===86&&
  files.filter(x=>/^wallet-[0-9]{3}-reservation\.json$/u.test(x)).length===87&&!files.some(x=>/^wallet-088-/u.test(x))&&!files.includes("wallet-087-outcome.json")&&!files.includes("first-fresh-completed-after87-private.json"));
 const grant=JSON.parse((await privateFile("run-approval-v2.json")).toString());assert(grant.userApproved&&grant.nativeCap===150&&grant.applicationInstances===4&&grant.noAutomaticRetries&&grant.failed55MustRemainUnused);
 const input=JSON.parse((await privateFile("inputs.json")).toString());assert(input.networkId==="preprod"&&input.testOnlyProvenance.includes("disposable Preprod test"));
 setNetworkId("preprod");const profile=new sdk.PreprodConnectionProfile(input.providerCredential),env=profile.environmentForSdk();
 const provider=indexerPublicDataProvider(env.indexer,env.indexerWS);
 stage="exact-existing-negative-finality";
 const raw=await privateFile("wallet-087-balanced.bin"),transaction=Transaction.deserialize("signature","proof","binding",raw);
 const journal=JSON.parse((await privateFile("wallet-087-submission.json")).toString()),reservation=JSON.parse((await privateFile("wallet-087-reservation.json")).toString());
 assert(journal.balancedSha256===hash(raw)&&journal.submittedAtMostOnce&&reservation.negativeCase==="independent-competing-transition");assert.deepEqual(transaction.identifiers(),journal.transactionIds);
 const final=await provider.watchForTxData(transaction.identifiers().at(-1)!);assert(Buffer.from(final.tx.serialize()).equals(raw));
 const response=await fetch(env.indexer,{method:"POST",headers:{"content-type":"application/json"},signal:AbortSignal.timeout(30000),
  body:JSON.stringify({query:`query M6Existing86($offset:TransactionOffset!){transactions(offset:$offset){raw block{height}
   contractActions{__typename address state ... on ContractCall{entryPoint}} ... on RegularTransaction{identifiers transactionResult{status}}}}`,
   variables:{offset:{identifier:JSON.parse((await privateFile("wallet-086-submission.json")).toString()).transactionIds.at(-1)}}})});
 assert(response.ok);const result:any=await response.json();assert(!result.errors&&Array.isArray(result.data?.transactions));
 const winnerRaw=await privateFile("wallet-086-balanced.bin"),winnerTx=Transaction.deserialize("signature","proof","binding",winnerRaw),winnerIds=winnerTx.identifiers();
 const matches=result.data.transactions.filter((x:any)=>x.identifiers?.some((id:string)=>winnerIds.includes(norm(id))));assert(matches.length===1);
 const winner=matches[0];assert(winner.transactionResult.status==="SUCCESS"&&Buffer.from(norm(winner.raw),"hex").equals(winnerRaw)&&winner.contractActions.length===1);
 const winnerAction=winner.contractActions[0];assert(winnerAction.entryPoint==="executeRuntimeAction"&&norm(winnerAction.address)===address);
 const encoded=Buffer.from(norm(winnerAction.state),"hex"),historical=ContractState.deserialize(encoded),current=await provider.queryContractState(address);assert(current&&Buffer.from(current.serialize()).equals(encoded));
 const fingerprint=(state:typeof current)=>hash(Buffer.from(JSON.stringify(state!.data.state.encode(),(_,v)=>typeof v==="bigint"?String(v):v instanceof Uint8Array?hex(v):v)));
 const segment=findM6SingleFallibleContractSegment(transaction,address),inclusion={status:final.status,exactBoundBytesMatched:true,intendedSegmentId:segment.segmentId,
  segmentStatusEntries:[...(final.segmentStatusMap??[])],contractStateSha256Before:fingerprint(historical),contractStateSha256After:fingerprint(current),
  contractCallHasGuaranteedTranscript:Boolean(segment.call.guaranteedTranscript),contractCallHasFallibleTranscript:Boolean(segment.call.fallibleTranscript),blockHeight:final.blockHeight,blockHash:final.blockHash};
 assert(isDefiniteIncludedM6ActionFailure({...inclusion,segmentStatusMap:new Map(inclusion.segmentStatusEntries)}));
 const events=(await readFile(root+"/runtime-ordinary-matrix-v5/client-public.jsonl","utf8")).trim().split("\n").map(x=>JSON.parse(x));
 const lastAttempt=events.findLastIndex(x=>x.phase==="submission-attempt");assert(lastAttempt>=0);
 const validationEvent=events.slice(0,lastAttempt).findLast(x=>x.phase==="read-only-node-validation");assert(typeof validationEvent?.accepted==="boolean");
 const validation={accepted:validationEvent.accepted,...(typeof validationEvent.rejection==="string"?{rejection:validationEvent.rejection}:{}),
  ...(Number.isSafeInteger(validationEvent.customCode)?{customCode:validationEvent.customCode}:{})};assert(canAttemptM6NegativeSubmission(validation));
 const diagnostic=parsePreprodSubmissionFailure(events.slice(lastAttempt).findLast(x=>x.phase==="submission-diagnostic")?.diagnostic);assert(diagnostic?.category==="finality-timeout");
 const outcome={kind:"native-rejected",negativeCase:reservation.negativeCase,transactionIds:transaction.identifiers(),balancedSha256:hash(raw),validation,diagnostic,inclusion,
  submittedAtMostOnce:true,walletSnapshotDiscarded:true,reconciledPostHoc:true,submissionReconciledReadOnly:true,
  walletSnapshotWillCatchUpFromPrior86:true,rejectionBoundary:"indexed-failed-contract-segment",applicationActionSucceeded:false,
  reconciliationProvenance:{kind:"closed-runtime-read-only-recovery",sourceSnapshot:9,originalWorkerDidNotRecordOutcome:true,originalRuntimeExitCode:1,nativeSubmissions:0}};
 stage="restore-actual-third-m4-m5-flow";
 const pair=JSON.parse((await privateFile("fixture-pair.json")).toString()),m4=restoreM6GovernanceFixture(pair.stateful);
 const original=await Promise.all(files.filter(x=>/^checkpoint-[0-9]{3}\.json$/u.test(x)).sort().map(async n=>JSON.parse((await privateFile(n)).toString(),reviveRemainingCheckpoint)));
 const old=restoreRemainingAfter45(m4,original,address),status=old.setup.credentials!.status;
 const partial=JSON.parse((await privateFile("checkpoint-v4-3002.json")).toString(),reviveRemainingCheckpoint).value;
 const partialHash=sdk.permioAuthorizationPureCircuits.runtimeAccountCredentialCommitment(partial.account);assert(status.sequence===3n&&partial.account.statusIndex===10n);
 status.issue({namespace:old.allocated.instance.namespace,kind:"account",credentialCommitment:partialHash,statusIndex:10n,revocationAuthorityAccountCredentialCommitment:partialHash});
 const checkpoints=await Promise.all(files.filter(x=>/^checkpoint-v5-[0-9]+\.json$/u.test(x)).sort().map(async n=>JSON.parse((await privateFile(n)).toString(),reviveRemainingCheckpoint)));
 const select=(name:string)=>{const matches=checkpoints.filter(x=>x.stage===name);assert(matches.length===1);return matches[0]!.value;};
 const allocated={...select("remaining-instance-allocation"),contractAddress:address};assert(allocated.index===0);
 const prepared=select("ordinary-credentials-prepared"),slot=select("ordinary-root-slot-prepared");
 const lastCredential=checkpoints.filter(x=>x.stage==="ordinary-credential-call-prepared").at(-1)!.value;assert(lastCredential.phase==="session-certification");
 lastCredential.arguments[0]=BigInt(lastCredential.arguments[0]);
 const earlySlot={source:slot.source,command:slot.arguments[1],record:slot.record,priorState:slot.arguments[4],nextNonce:slot.arguments[5]};
 const badNonce=Uint8Array.from(earlySlot.nextNonce as Uint8Array);badNonce[0]^=1;
 assert.throws(()=>restoreCertifiedOrdinarySetup({m4:restoreM6GovernanceFixture(pair.stateful),allocated,prepared,finalCall:lastCredential.arguments,initialStatus:status,
  rootSlotBeforeSession:{...earlySlot,nextNonce:badNonce}}));assert.equal(status.sequence,4n);
 const restored=restoreCertifiedOrdinarySetup({m4,allocated,prepared,finalCall:lastCredential.arguments,initialStatus:status,rootSlotBeforeSession:earlySlot});
 const view=sdk.readPermioAuthorizationLedger(current.data),ns=allocated.allocation.target.namespaceHash;
 assert(status.sequence===7n&&view.credentialStatusRoots.lookup(ns).rootSequence===7n);assert.deepEqual(status.root,view.credentialStatusRoots.lookup(ns).root);
 const starts=checkpoints.filter(x=>x.stage==="ordinary-action-prepared"),ends=checkpoints.filter(x=>x.stage==="ordinary-action-final-prepared");assert(starts.length===2&&ends.length===2);
 const candidates:PreparedOrdinaryAction[]=ends.map((saved,i)=>{
  const initial=starts[i]!.value,finished=saved.value;
  for(const j of [0,1,2,3,6,7,8,9,10,11,12,14,15,16,17,18,19,20])assert.deepEqual(initial.finalArguments[j],finished.arguments[j]);
  assert.deepEqual(finished.currentState,restored.setup.credentials!.binding.state);assert.equal(finished.sequence,4n);
  const cleanup=[...initial.prepareArguments];cleanup[0]=4n;cleanup[10]=finished.arguments[13];
  return{arguments:finished.arguments,preparationArguments:cleanup as unknown as PreparedOrdinaryAction["preparationArguments"],
   expectedNextState:finished.expectedNextState,signedIntent:finished.signedIntent,privateSentinels:[finished.signedIntent.payload.nonce,hex(finished.arguments[20]),
    ...initial.evidence.inputs.concat(initial.evidence.outputs).flatMap((row:any)=>[hex(row.selected.nonce),hex(row.selected.payloadCommitment)])]};
 });
 const proof=checkpoints.filter(x=>x.stage==="genuine-candidate-proof"&&x.value.label==="state-transition-winner");assert(proof.length===1);
 const receiptId=`0x${hex(proof[0]!.value.receiptId)}`as const;
 const receipt=await sdk.readFinalizedDecisionReceipt(sdk.createIndexedDecisionReceiptReader({network:"preprod",profile,publicDataProvider:provider,contract:`0x${address}`,receiptId}),
  {network:"preprod",contract:`0x${address}`,transactionId:winnerIds.at(-1)!,receiptId});
 assert(receipt.transitionSequence==="5"&&receipt.previousStateCommitment!==null&&receipt.nextStateCommitment!==null&&receipt.sourceLedgerSequence===String(winner.block.height));
 const selected=candidates[0]!;assert.equal(view.runtimeInstances.lookup(allocated.allocation.instanceCommitment).transitionSequence,5n);
 assert.deepEqual(view.runtimeInstances.lookup(allocated.allocation.instanceCommitment).currentStateCommitment,sdk.permioAuthorizationPureCircuits.runtimeStateCommitment(selected.expectedNextState));
 const decision=restored.system.authorizeAction(selected.signedIntent,Number(selected.arguments[0].effectiveAt));assert(decision.allowed);
 assert.equal(decision.nextState,m4.record.template.states.find(label=>hash(encodeCanonical("permio:private-state-id:v1",[label]))===hex(selected.expectedNextState.stateIdHash)));
 assert(view.usedRuntimeActionNullifiers.member(sdk.permioAuthorizationPureCircuits.runtimeScopedActionNullifier(allocated.allocation,selected.arguments[2])));
 assert(!view.usedRuntimeActionNullifiers.member(sdk.permioAuthorizationPureCircuits.runtimeScopedActionNullifier(allocated.allocation,candidates[1]!.arguments[2])));
 assert(!view.runtimeActionSessions.member(sdk.permioAuthorizationPureCircuits.runtimeActionCommandCommitment(selected.arguments[0])));
 assert(view.runtimeActionSessions.member(sdk.permioAuthorizationPureCircuits.runtimeActionCommandCommitment(candidates[1]!.arguments[0])));
 const privateSentinels=[...restored.setup.privateSentinels,prepared.accountPrivateKeyPem,prepared.sessionPrivateKeyPem,allocated.instance.instanceId,
  new Date(allocated.instance.expiresAt*1000).toISOString(),allocated.authorization.requestId,hex(allocated.stateOpening.nonce),hex(allocated.allocation.allocationNonce),slot.source.assignmentId,
  ...candidates.flatMap(c=>c.privateSentinels)];
 const issuers=sdk.buildAuthorityRoot([173n,197n].map(secret=>({leafVersion:1n,namespaceHash:allocated.allocation.target.namespaceHash,
  governancePolicyHash:Uint8Array.from(Buffer.from(sdk.hashNamespacePolicy(m4.policy).slice(2),"hex")),authorityKind:6n,
  publicKey:sdk.governanceActivatorPublicKey(secret),validAfter:1700000000n,validBefore:2000000000n})));
 assert.deepEqual(issuers.root,allocated.allocation.capabilityIssuersRoot);
 assert.equal(receipt.instanceCommitment,`0x${hex(allocated.allocation.instanceCommitment)}`);
 assert.equal(receipt.previousStateCommitment,`0x${hex(sdk.permioAuthorizationPureCircuits.runtimeStateCommitment(selected.arguments[9]))}`);
 assert.equal(receipt.nextStateCommitment,`0x${hex(sdk.permioAuthorizationPureCircuits.runtimeStateCommitment(selected.expectedNextState))}`);
 const first:M6RemainingCompletedFlow={allocation:allocated.allocation,instance:allocated.instance,
  prepared:{allocation:allocated.allocation,stateOpening:allocated.stateOpening,issuers},
  checked:{receipt,setup:restored.setup,candidates,state:ends[0]!.value.currentState,sequence:4n,selectedCandidateIndex:0,privateSentinels}};
 // The continuation rebuilds the exact issuer tree and shared status methods.
 const completed={first,privateSentinels,recovery:{nativeSubmissions:0,exact86ReceiptVerified:true,actualM4M5ApisUsed:true,tamperedEarlySlotRejected:true}};
 stage="save-verified-posthoc-checkpoint";
 await writeFile(directory+"/wallet-087-outcome.json",JSON.stringify(outcome),{flag:"wx",mode:0o600});
 await writeFile(directory+"/first-fresh-completed-after87-private.json",stringify(completed),{flag:"wx",mode:0o600});
 const report={schemaVersion:1,kind:"m6-posthoc87-finality-and-third-flow-recovery",passed:true,observedAtUtc:new Date().toISOString(),contract:address,
  conservativeAttempts:86,normalFinals:84,definiteNativeNegatives:1,reservations:87,applicationInstances:3,receipts:2,
  winnerBlock:winner.block.height,negativeBlock:final.blockHeight,negativeExactBytesSha256:hash(raw),negativeIntendedSegment:segment.segmentId,
  completeStateEqualsWinner:true,source9RuntimeFailurePreserved:true,originalWalletSnapshotDiscarded:true,actualM4M5ApisUsed:true,
  actualReceiptDecoded:true,tamperedEarlySlotRejected:true,rootSlotBeforeSessionState3To4Verified:true,statusSequence:7,authoritySequence:1,
  posthocOutcomeRecorded:true,native87NeverResubmitted:true,nativeSubmissions:0,proofsRequested:0,privateValuesLogged:false,
  nextApprovedRound:88,remainingPlannedCalls:49,finalPlannedAttempts:135,approvedCeiling:150,applicationMaximum:4,milestoneComplete:false};
 await writeFile(root+"/after87-recovery-verification-v1.json",JSON.stringify(report),{flag:"wx",mode:0o600});process.stdout.write(JSON.stringify(report)+"\n");
}catch(error){await writeFile(directory+"/after87-recovery-private-error-v1.json",JSON.stringify({stage,name:error instanceof Error?error.name:"unknown",message:error instanceof Error?error.message:"withheld"}),{flag:"wx",mode:0o600});
 process.stdout.write(JSON.stringify({passed:false,stage,nativeSubmissions:0,detailsWithheld:true})+"\n");process.exitCode=1;}
