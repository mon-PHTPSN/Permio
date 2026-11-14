// Manually selected recovery of two authorized lifecycle operations. No retry loop.
import assert from "node:assert/strict";
import { readFile, writeFile, readdir, lstat } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { firstValueFrom, filter, timeout } from "rxjs";
import { WalletFacade } from "@midnight-ntwrk/wallet-sdk";
import { Transaction, ContractCall } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import * as sdk from "@permio/midnight-authorization";
const root="/opt/permio-m6-remaining-preprod-20261019-v1", frozen=root+"/client", dir=root+"/private";
const address="70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c";
for(const k of ["log","warn","error","info","debug"]as const)console[k]=()=>{};
const emit=(v:unknown)=>process.stdout.write(JSON.stringify(v)+"\n");
const hash=(v:Uint8Array)=>createHash("sha256").update(v).digest("hex");
const hex=(v:string)=>Uint8Array.from(Buffer.from(v.replace(/^0x/u,""),"hex"));
const json=(v:unknown)=>JSON.stringify(v,function(k,x){const y=this[k];return typeof y==="bigint"?{$bigint:String(y)}:y instanceof Uint8Array?{$bytes:Buffer.from(y).toString("hex")}:x;});
let stage="closed-boundary", submitted=0, confirmed=0, balanceRound=158, facade:any, subscription:any;
async function privateFile(n:string){assert(/^[a-z0-9.-]+$/u.test(n));const p=dir+"/"+n,m=await lstat(p);assert(m.isFile()&&!m.isSymbolicLink()&&m.uid===0&&(m.mode&0o777)===0o600);return readFile(p);}
async function save(n:string,v:Uint8Array|string){await writeFile(dir+"/"+n,v,{flag:"wx",mode:0o600});}
const originalInit=WalletFacade.init;
const sdkDustModule=await import(frozen+"/node_modules/@midnight-ntwrk/wallet-sdk-dust-wallet/dist/v1/Transacting.js");
const Transacting=sdkDustModule.TransactingCapabilityImplementation, originalBalance=Transacting.prototype.balanceTransactions;
const deadline=setTimeout(()=>{emit({passed:false,stage,timedOut:true,submitted,confirmed,nativeRetries:0});process.exit(1);},1800_000);
try{
 assert(process.platform==="linux"&&process.cwd()===frozen);
 const names=await readdir(dir);assert(names.filter(n=>/^wallet-\d{3}-submission\.json$/u.test(n)).length===155);
 assert(names.filter(n=>/^wallet-\d{3}-reservation\.json$/u.test(n)).length===157&&!names.some(n=>/^wallet-15[89]-/u.test(n)));
 const grant=JSON.parse((await privateFile("run-approval-v3.json")).toString());assert(grant.userApproved&&grant.nativeCap===172&&grant.applicationInstances===5&&grant.noAutomaticRetries);
 const manual=JSON.parse(await readFile(root+"/manual-after157-recovery-scope-v1.json","utf8"));
 assert(manual.userDirectedContinuation&&manual.reserveUsed===1&&manual.earlier157NeverSubmitted&&manual.maximumNewSubmissions===2&&manual.conservativeTotalAfterCompletion===158);
 const input=JSON.parse((await privateFile("inputs.json")).toString());assert(input.networkId==="preprod"&&input.testOnlyProvenance.includes("disposable Preprod test"));
 const prior=await privateFile("wallet-157-balanced.bin");assert.equal(hash(prior),"d789b184cf8d5910698fd06a6033b87359643d6d1d17eb34be41aacb393f4030");
 const oldUnbound=await privateFile("wallet-157-unbound.bin"),oldReservation=JSON.parse((await privateFile("wallet-157-reservation.json")).toString());assert.equal(hash(oldUnbound),oldReservation.unboundSha256);
 const profile=new sdk.PreprodConnectionProfile(input.providerCredential,"http://127.0.0.1:6300");setNetworkId("preprod");
 const {validateOrdinaryBalancedTransaction}=await import(frozen+"/scripts/m6-ordinary-node-validation.ts");
 const {assertM6SubmissionTimeMargin}=await import(frozen+"/scripts/m6-unproven-action-window.ts");
 const {submitOnceAndReconcile}=await import(frozen+"/scripts/m6-submit-once-reconcile.ts");
 const {auditM6PublicCallReadSet}=await import(frozen+"/scripts/m6-public-transcript-audit.ts");
 const {auditM6DeprecatedModuleAdmission}=await import(frozen+"/scripts/m6-deprecated-module-admission-audit.ts");
 const {restoreM6GovernanceFixture}=await import(frozen+"/scripts/run-live-m6-admission.ts");
 let latest:any;
 WalletFacade.init=async function(...args:any[]){const value=await originalInit.apply(this,args as any);facade=value;subscription=value.state().subscribe(v=>{latest=v;});return value;};
 Transacting.prototype.balanceTransactions=function(secret:any,state:any,transactions:any,ttl:any,ctime:any,params:any){
  emit({phase:"dust-fee-state-observed",round:balanceRound,treeSyncTimeUtc:state.state.syncTime.toISOString(),proofCreationTimeUtc:ctime.toISOString(),
   creationTimeMinusTreeSyncSeconds:(ctime.getTime()-state.state.syncTime.getTime())/1000,strictSync:state.progress.isStrictlyComplete(),
   facadeSynced:latest?.isSynced===true,dustParametersMatch:Buffer.from(state.state.params.serialize()).equals(Buffer.from(params.dust.serialize())),
   commitmentRootFingerprint:hash(Buffer.from(String(state.state.commitmentTreeRoot()))),generationRootFingerprint:hash(Buffer.from(String(state.state.generatingTreeRoot()))),privateValuesLogged:false});
  assert(state.progress.isStrictlyComplete()&&latest?.isSynced===true);
  return originalBalance.call(this,secret,state,transactions,ttl,ctime,params);
 };
 stage="fresh-wallet-restoration";
 const snapshots=JSON.parse((await privateFile("rolling-wallet-snapshots.json")).toString());
 await sdk.withRestoredPreprodWallet(profile,input.secret,snapshots,async wallet=>{
  assert((await wallet.synchronize()).readyForTransactions);
  const real=sdk.createPreprodAuthorizationProviders(wallet,profile,v=>emit({phase:v}),d=>emit({phase:"submission-diagnostic",diagnostic:d}));
  const stateBefore=await real.publicDataProvider.queryContractState(address);assert(stateBefore);const before=sdk.readPermioAuthorizationLedger(stateBefore.data);
  assert(before.runtimeInstances.size()===5n&&before.decisionReceipts.size()===3n&&before.usedRuntimeActionNullifiers.size()===3n&&before.runtimeActionSessions.size()===4n);
  assert([...before.activeTemplates].every(([,r])=>r.lifecycleStatus===3n));
  const active=[...before.proofModules].filter(([,r])=>r.lifecycleStatus===4n),revoked=[...before.proofModules].filter(([,r])=>r.lifecycleStatus===6n);
  assert(active.length===1&&revoked.length===1);const [moduleKey]=active[0]!;
  async function barrier(){
   const env=profile.environmentForSdk();const response=await fetch(env.indexer,{method:"POST",headers:{"content-type":"application/json"},signal:AbortSignal.timeout(30_000),body:JSON.stringify({query:"{ block { height timestamp } }"})});assert(response.ok);
   const payload=await response.json() as any;assert(!payload.errors&&Number.isSafeInteger(payload.data.block.timestamp));const target=payload.data.block;
   const state:any=await firstValueFrom(facade.state().pipe(filter((s:any)=>s.isSynced&&s.dust.state.state.syncTime.getTime()>=target.timestamp),timeout(120_000)));
   emit({phase:"fresh-dust-sync-barrier",round:balanceRound,indexedHeight:target.height,indexedTimestampUtc:new Date(target.timestamp).toISOString(),walletTreeSyncTimeUtc:state.dust.state.state.syncTime.toISOString(),strictSync:true});
  }
  async function balance(tx:any){
   assert(balanceRound===158||balanceRound===159);const round=balanceRound;
   const actions=[...(tx.intents?.values()??[])].flatMap((i:any)=>i.actions);assert(actions.length===1&&actions[0] instanceof ContractCall&&actions[0].address===address);
   assert.equal(typeof actions[0].entryPoint==="string"?actions[0].entryPoint:Buffer.from(actions[0].entryPoint).toString("utf8"),"governAuthorization");
   assertM6SubmissionTimeMargin(tx,120_000);
   const raw=Buffer.from(tx.serialize());await save(`wallet-${round}-unbound.bin`,raw);
   await save(`wallet-${round}-reservation.json`,JSON.stringify({...oldReservation,reservedMaximumAttempts:round,maximumNativeAttemptsReserved:round-1,
    manualRecoveryOfUnsubmitted157:true,logicalPlanRound:round===158?157:158,unboundSha256:hash(raw),reserveUsed:1,automaticSubmissionRetries:false}));
   await barrier();const result=await real.walletProvider.balanceTx(tx);const bytes=Buffer.from(result.serialize());await save(`wallet-${round}-balanced.bin`,bytes);
   const validation=await validateOrdinaryBalancedTransaction(profile,bytes);emit({phase:"read-only-node-validation",round,...validation,transactionSubmitted:false});
   await save(`wallet-${round}-preflight.json`,JSON.stringify(validation));assert(validation.accepted,"New exact fee proof did not pass validation; stop without sending");return result;
  }
  async function submit(tx:any){
   const round=balanceRound;assert(submitted<2&&round===158+submitted);const bytes=Buffer.from(tx.serialize());assert(bytes.equals(await privateFile(`wallet-${round}-balanced.bin`)));
   const validation=await validateOrdinaryBalancedTransaction(profile,bytes);assert(validation.accepted);assertM6SubmissionTimeMargin(tx,60_000);
   const ids=tx.identifiers();await save(`wallet-${round}-submission.json`,JSON.stringify({transactionIds:ids,attemptedAtUtc:new Date().toISOString(),balancedSha256:hash(bytes),submittedAtMostOnce:true,logicalPlanRound:round===158?157:158,manualRecovery:true}));
   submitted++;emit({phase:"submission-attempt",round,transactionIds:ids});
   const id=await submitOnceAndReconcile({transaction:tx,submit:()=>real.midnightProvider.submitTx(tx),readFinal:(x:string)=>real.publicDataProvider.watchForTxData(x),observe:emit});
   const final=await real.publicDataProvider.watchForTxData(id);assert(final.status==="SucceedEntirely"&&Buffer.from(final.tx.serialize()).equals(bytes));confirmed++;
   await save(`wallet-${round}-outcome-confirmed.json`,JSON.stringify({kind:"successful-finalized",transactionId:id,ledgerSequence:final.blockHeight,balancedSha256:hash(bytes),submittedAtMostOnce:true}));
   emit({phase:"finalized",round,transactionId:id,ledgerSequence:final.blockHeight});return id;
  }
  stage="manual-recovery-deprecation";
  const tx=Transaction.deserialize("signature","proof","pre-binding",oldUnbound);assert(Buffer.from(tx.serialize()).equals(oldUnbound));
  const actions=[...tx.intents!.values()].flatMap(i=>i.actions);assert(actions.length===1&&actions[0] instanceof ContractCall);
  // Native exact validation below remains authoritative; the contract proof bytes are retained.
  const balanced=await balance(tx);await submit(balanced);
  const deprecated=await real.publicDataProvider.queryContractState(address);assert(deprecated);assert.equal(sdk.readPermioAuthorizationLedger(deprecated.data).proofModules.lookup(moduleKey).lifecycleStatus,5n);
  const audit=await auditM6DeprecatedModuleAdmission({profile,currentState:deprecated,moduleKey,expectedModuleStatus:5n});assert(audit.historicalControlAccepted&&!audit.actualModuleRecordProjectionAccepted&&audit.restoringOnlyModuleRecordAcceptsAgain);
  await writeFile(root+"/deprecated-module-admission-158.json",JSON.stringify(audit),{flag:"wx",mode:0o600});emit({phase:"deprecated-module-admission-rejection-verified",round:158,nativeSubmissionForThisCheck:false});
  stage="remaining-module-revocation";balanceRound=159;
  const pair=JSON.parse((await privateFile("fixture-pair.json")).toString()),m4=restoreM6GovernanceFixture(pair.stateful),pure=sdk.permioAuthorizationPureCircuits;
  const policyHash=sdk.hashNamespacePolicy(m4.policy),namespaceHash=hex(sdk.hashProtocolIdentifier("namespace",m4.activation.namespace));
  const specs=[[3n,167n],[7n,101n],[7n,103n],[8n,107n],[8n,127n],[9n,109n],[10n,113n],[11n,149n],[11n,151n],[12n,157n],[5n,163n],[6n,173n],[4n,191n],[6n,197n],[6n,199n],[13n,211n]]as const;
  const leaves=specs.map(([authorityKind,secret])=>({leafVersion:1n,namespaceHash,governancePolicyHash:hex(policyHash),authorityKind,publicKey:sdk.governanceActivatorPublicKey(secret),validAfter:1700000000n,validBefore:2000000000n}));
  const authority=sdk.buildAuthorityRoot(leaves);assert.deepEqual(sdk.readPermioAuthorizationLedger(deprecated.data).authorityRoots.lookup(namespaceHash).root,authority.root);
  const record=sdk.readPermioAuthorizationLedger(deprecated.data).proofModules.lookup(moduleKey);
  const command={commandVersion:1n,moduleKey,recordCommitment:pure.proofModuleRecordCommitment(record),governanceNamespaceHash:namespaceHash,governancePolicyHash:hex(policyHash),authorityRootVersion:2n,authorityRootSequence:2n,expectedLifecycleStatus:5n,nextLifecycleStatus:6n,effectiveAt:BigInt(Math.floor(Date.now()/1000)-1),reasonHash:randomBytes(32),commandNonce:randomBytes(32)};
  await save("after157-revocation-command-private.json",json(command));
  const providers={...real,walletProvider:{getCoinPublicKey:()=>wallet.getCoinPublicKey(),getEncryptionPublicKey:()=>wallet.getEncryptionPublicKey(),balanceTx:balance},midnightProvider:{submitTx:submit}};
  const contract=await sdk.connectPermioAuthorizationContract(providers as any,address);
  await sdk.governanceCallOperations(contract).governProofModule(command,sdk.signProofModuleLifecycleCommand(command,113n),leaves[6]!,authority.pathFor(pure.governanceActivatorLeafCommitment(leaves[6]!)));
  const afterState=await real.publicDataProvider.queryContractState(address);assert(afterState);const after=sdk.readPermioAuthorizationLedger(afterState.data);
  assert([...after.proofModules].every(([,r])=>r.lifecycleStatus===6n));assert([...after.activeTemplates].every(([,r])=>r.lifecycleStatus===3n));
  for(const field of ["runtimeInstances","decisionReceipts","usedRuntimeActionNullifiers","runtimeActionSessions"]as const)assert(isDeepStrictEqual([...before[field]],[...after[field]]));
  assert(confirmed===2&&submitted===2&&hash(await privateFile("wallet-157-balanced.bin"))===hash(prior));
 },s=>emit({phase:"wallet-checkpoint-stage",stage:s}),async snapshots=>{
  const temp=dir+"/after157-wallet-snapshots.json";await writeFile(temp,JSON.stringify(snapshots),{flag:"wx",mode:0o600});
 },{confirmationTimeoutMs:15_000});
 const result={passed:true,observedAtUtc:new Date().toISOString(),conservativeAttempts:158,submissionJournalCount:157,reservationCount:159,successfulFinals:152,nativeNegatives:4,applicationInstances:5,receipts:3,pendingPreparations:4,
  approvedNativeCap:172,reserveUsed:1,failed157NeverSubmitted:true,replacedOnlyUnsubmittedFeePayment:true,successfulTailSubmissions:2,automaticNativeRetries:false,earlier55Preserved:true,sourceSnapshot:13,tailSourceVersion:1,milestoneComplete:false};
 await writeFile(root+"/approved172-after157-native-completion-v1.json",JSON.stringify(result),{flag:"wx",mode:0o600});emit({phase:"finished",...result});
}catch(error){await save("after157-recovery-private-error-v1.json",JSON.stringify({stage,name:error instanceof Error?error.name:"unknown",message:error instanceof Error?error.message:"withheld",stack:error instanceof Error?error.stack:"withheld"}));emit({passed:false,phase:"failed",stage,submitted,confirmed,nativeRetries:0,detailsWithheld:true});process.exitCode=1;}
finally{subscription?.unsubscribe();WalletFacade.init=originalInit;Transacting.prototype.balanceTransactions=originalBalance;clearTimeout(deadline);}
