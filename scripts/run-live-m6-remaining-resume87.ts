import assert from "node:assert/strict";
import {createHash,createPrivateKey,createPublicKey} from "node:crypto";
import {lstat,readFile,readdir,realpath,writeFile} from "node:fs/promises";
import {setTimeout as delay} from "node:timers/promises";
import type {createM6RemainingFixturePair} from "./run-live-m6-admission.ts";

const root="/opt/permio-m6-remaining-preprod-20261019-v1",client=root+"/client",directory=root+"/private";
assert(process.platform==="linux"&&process.argv.length===3&&process.argv[2]==="--after87"&&process.cwd()===client&&await realpath(client)===client);
for(const k of ["log","error","warn","info","debug"]as const)console[k]=()=>{};
const emit=(v:unknown)=>process.stdout.write(JSON.stringify(v)+"\n");
const hash=(v:Uint8Array)=>createHash("sha256").update(v).digest("hex"),hex=(v:Uint8Array)=>Buffer.from(v).toString("hex");
let stage="private-inputs",attempts=0,finalized=0,negatives=0,checkpoints=0,resets=0,captured=0;
async function privateFile(n:string){assert(/^[a-z0-9.-]+$/u.test(n));const p=directory+"/"+n,m=await lstat(p);
 assert(m.isFile()&&!m.isSymbolicLink()&&m.uid===0&&(m.mode&0o777)===0o600&&await realpath(p)===p);return readFile(p);}
const stringify=(v:unknown)=>JSON.stringify(v,function(k,value){const original=this[k];return typeof original==="bigint"?{$bigint:String(original)}:
 original instanceof Uint8Array?{$bytes:hex(original)}:value;});
async function checkpoint(stage:string,value:unknown){assert(++checkpoints<=500);await writeFile(directory+`/checkpoint-v6-${7000+checkpoints}.json`,stringify({stage,value}),{flag:"wx",mode:0o600});}
async function reset(main?:1){
 const profile=JSON.parse(await readFile(root+"/control-ordinary-v6/small-prover-profile.json","utf8"));assert(profile.owner==="permio-m6-remaining-preprod-20261019-v1"&&[2,3,4].includes(profile.cpuThreads));
 const cpuThreads=main??profile.cpuThreads,number=String(++resets).padStart(3,"0");assert(resets<=360);
 await writeFile(root+`/control-ordinary-v6/reset-${number}.request.json`,JSON.stringify({number,owner:profile.owner,cpuThreads}),{flag:"wx",mode:0o600});
 for(let n=0;n<240;n++){try{const v=JSON.parse(await readFile(root+`/control-ordinary-v6/reset-${number}.verified.json`,"utf8"));
   assert(v.number===number&&v.exactOwnedProverVerified&&v.loopbackOnly&&v.cpuThreads===cpuThreads&&v.ramMaxBytes===29*1024**3/2&&
    v.sharedHostSwapBytes===119*1024**3/8&&v.ramHighBytes===(cpuThreads===1?27:23)*1024**3/2);return;
  }catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}await delay(500);}throw Error("Owned v6 prover reset not verified");
}
try{
 const files=await readdir(directory);assert(files.filter(n=>/^wallet-[0-9]{3}-submission\.json$/u.test(n)).length===86&&
  files.filter(n=>/^wallet-[0-9]{3}-reservation\.json$/u.test(n)).length===87&&!files.some(n=>/^wallet-088-/u.test(n)));
 const raw=await privateFile("inputs.json"),input=JSON.parse(raw.toString());assert(input.networkId==="preprod"&&input.testOnlyProvenance.includes("disposable Preprod test"));
 const grant=JSON.parse((await privateFile("run-approval-v2.json")).toString());
 assert(grant.userApproved&&grant.nativeCap===150&&grant.applicationInstances===4&&grant.newContractDeployments===1&&grant.noAutomaticRetries&&grant.failed55MustRemainUnused);
 const evidence=JSON.parse(await readFile(root+"/failure55-public-export-v1.json","utf8"));assert(evidence.passed&&evidence.confirmed===53&&!evidence.unused55BytesExported);
 process.chdir(directory);try{await import("@midnight-ntwrk/testkit-js");}finally{process.chdir(client);}
 const sdk=await import("@permio/midnight-authorization"),{setNetworkId}=await import("@midnight-ntwrk/midnight-js-network-id");setNetworkId("preprod");
 const {restoreM6GovernanceFixture}=await import("./run-live-m6-admission.ts");
 const {restoreRemainingAfter45,reviveRemainingCheckpoint}=await import("./m6-restore-remaining-checkpoint.ts");
 const {createRemainingWalletTransport}=await import("./m6-remaining-wallet-transport.ts");
 const {runRemainingOrdinaryMatrixV2}=await import("./m6-remaining-ordinary-v2.ts");
 const {ordinaryActionProofProvider}=await import("./m6-ordinary-proof-provider.mjs");
 const {probePreprodTransports}=await import("./m6-preprod-transport.ts");
 const {PreprodConnectionProfile:TransportProfile}=await import("../packages/midnight-authorization/src/preprod-profile.ts");
 stage="pinned-assets-and-network";await sdk.verifyPermioAuthorizationAssets(sdk.PERMIO_AUTHORIZATION_ASSETS_PATH);
 const manifest=JSON.parse((await privateFile("execution-manifest.json")).toString());
 assert(manifest.fixturePairSha256===hash(await privateFile("fixture-pair.json"))&&manifest.nativeCap===100&&
  manifest.implementationHash===`0x${hash(await readFile(sdk.PERMIO_AUTHORIZATION_ASSETS_PATH+"/zkir/executeRuntimeAction.zkir"))}`&&
  manifest.sourceHash===`0x${hash(await readFile(sdk.PERMIO_AUTHORIZATION_ASSETS_PATH+"/contract/index.js"))}`);
 const fixtures=JSON.parse((await privateFile("fixture-pair.json")).toString())as ReturnType<typeof createM6RemainingFixturePair>;
 const profile=new sdk.PreprodConnectionProfile(input.providerCredential,"http://127.0.0.1:6300");
 const network=await probePreprodTransports(new TransportProfile(input.providerCredential,"http://127.0.0.1:6300"));
 assert(network.http.passed&&network.http.genesisHash===sdk.PREPROD_GENESIS_HASH&&network.nodeSubscription.passed&&network.indexerSubscription.passed);
 const version=await fetch("http://127.0.0.1:6300/version",{signal:AbortSignal.timeout(5000)});assert(version.ok&&(await version.text()).trim()==="8.1.3");
 stage="restore84-confirmed-and-exact-negative87";
 const saved=await Promise.all(files.filter(n=>/^checkpoint-[0-9]{3}\.json$/u.test(n)).sort().map(async n=>JSON.parse((await privateFile(n)).toString(),reviveRemainingCheckpoint)));
 const address="70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c";
 const resume=restoreRemainingAfter45(restoreM6GovernanceFixture(fixtures.stateful),saved,address);
 const partial=JSON.parse((await privateFile("checkpoint-v4-3002.json")).toString(),reviveRemainingCheckpoint);assert(partial.stage==="ordinary-account-and-root-prepared");
 const status=resume.setup.credentials!.status,account=partial.value.account,accountCommitment=sdk.permioAuthorizationPureCircuits.runtimeAccountCredentialCommitment(account);
 assert(account.statusIndex===10n&&status.sequence===3n);status.issue({namespace:partial.value.accountSource.namespace??resume.allocated.instance.namespace,
  kind:"account",credentialCommitment:accountCommitment,statusIndex:10n,revocationAuthorityAccountCredentialCommitment:accountCommitment});assert.equal(status.sequence,4n);
 const completedFreshStateful=JSON.parse((await privateFile("first-fresh-completed-after87-private.json")).toString(),reviveRemainingCheckpoint);
 const recovered=JSON.parse(await readFile(root+"/after87-recovery-verification-v1.json","utf8"));
 assert(recovered.passed&&recovered.posthocOutcomeRecorded&&recovered.native87NeverResubmitted&&recovered.conservativeAttempts===86&&
  recovered.actualReceiptDecoded&&completedFreshStateful.recovery.actualM4M5ApisUsed&&completedFreshStateful.recovery.tamperedEarlySlotRejected);
 const c=completedFreshStateful.first.checked.setup.credentials;assert(c&&c.account.statusIndex===13n&&c.capability.credential.statusIndex===14n&&c.session.credential.statusIndex===15n);
 const accountHash=sdk.permioAuthorizationPureCircuits.runtimeAccountCredentialCommitment(c.account);
 for(const[kind,credentialCommitment,statusIndex]of [
  ["account",accountHash,13n],["capability",sdk.permioAuthorizationPureCircuits.runtimeCapabilityCredentialCommitment(c.capability.credential),14n],
  ["session",sdk.permioAuthorizationPureCircuits.runtimeSessionCredentialCommitment(c.session.credential),15n]]as const)
  status.issue({namespace:completedFreshStateful.first.instance.namespace,kind,credentialCommitment,statusIndex,
   revocationAuthorityAccountCredentialCommitment:kind==="capability"?new Uint8Array(32):accountHash});
 assert.equal(status.sequence,7n);completedFreshStateful.first.checked.setup.credentials.status=status;
 const wallet=await createRemainingWalletTransport({profile,planVersion:5,phaseAttemptCeiling:136,observe(v){
  if(v.phase==="submission-attempt")attempts++;if(v.phase==="finalized")finalized++;if(v.phase==="native-negative-rejected")negatives++;emit(v);}});
 assert(wallet.journalState().reservedMaximumAttempts===87&&wallet.journalState().maximumNativeAttemptsReserved===86);
 const providers=sdk.createPreprodAuthorizationProviders(wallet,profile),state=await providers.publicDataProvider.queryContractState(address);assert(state);
 const priorInspection=JSON.parse(await readFile(root+"/native87-readonly-inspection-v2.json","utf8"));
 assert(hash(state.serialize())===priorInspection.observations[0].historicalStateSha256&&priorInspection.observations[1].status==="FailFallible");
 const view=sdk.readPermioAuthorizationLedger(state.data),ns=resume.allocated.allocation.target.namespaceHash;
 assert(view.runtimeInstances.size()===3n&&view.decisionReceipts.size()===2n&&view.usedRuntimeActionNullifiers.size()===2n&&
  view.credentialStatusRoots.lookup(ns).rootSequence===7n&&view.authorityRoots.lookup(ns).rootSequence===1n);
 assert.deepEqual(view.credentialStatusRoots.lookup(ns).root,status.root);
 const completedFirst=JSON.parse((await privateFile("first-completed-after50-private.json")).toString(),reviveRemainingCheckpoint);
 const privateScanValues:string[]=[...completedFirst.privateSentinels,...completedFreshStateful.privateSentinels,input.providerCredential];
 const collect=(v:unknown)=>{if(typeof v==="string"&&v.length>=8)privateScanValues.push(v);else if(v&&typeof v==="object")Object.values(v).forEach(collect);};collect(input.secret);
 const openings=(v:any)=>{if(!v||typeof v!=="object")return;for(const[k,x]of Object.entries(v)){
  if(["nonce","nextStateNonce","stateIdHash","allocationNonce"].includes(k)&&x instanceof Uint8Array)privateScanValues.push(hex(x));
  else if(/privateKeyPem$/iu.test(k)&&typeof x==="string"){privateScanValues.push(x);const key=createPrivateKey(x);
   for(const b of [key.export({format:"der",type:"pkcs8"}),createPublicKey(key).export({format:"der",type:"spki"})])privateScanValues.push(hex(b),hex(b.subarray(-32)));}
  else if(x&&typeof x==="object")openings(x);}};
 for(const n of files.filter(n=>/^checkpoint-v[45]-[0-9]+\.json$/u.test(n))){const c=JSON.parse((await privateFile(n)).toString(),reviveRemainingCheckpoint);openings(c.value);
  if(c.stage==="remaining-instance-allocation")privateScanValues.push(c.value.instance.instanceId,new Date(c.value.instance.expiresAt*1000).toISOString());}
 const v=partial.value;assert(v.holderSecret===179n);privateScanValues.push(v.accountSource.accountId,v.grant.grantId,...v.scope.resources,...v.scope.recipients,v.accountPrivateKeyPem);
 const key=createPrivateKey(v.accountPrivateKeyPem);for(const b of [key.export({format:"der",type:"pkcs8"}),createPublicKey(key).export({format:"der",type:"spki"})])privateScanValues.push(hex(b),hex(b.subarray(-32)));
 const proofProvider=ordinaryActionProofProvider({port:6300,beforeProof:async tx=>{const actions=[...(tx.intents?.values()??[])].flatMap(i=>i.actions),entry=actions[0]&&"entryPoint"in actions[0]?actions[0].entryPoint:undefined;
  await reset(entry==="executeRuntimeAction"||entry instanceof Uint8Array&&Buffer.from(entry).toString("utf8")==="executeRuntimeAction"?1:undefined);},afterProof:()=>reset(),observe:emit,captureProvedTransaction:async tx=>{
   assert(++captured<=120);await writeFile(directory+`/matrix-v6-unbound-proved-${String(captured).padStart(3,"0")}.bin`,tx.serialize(),{flag:"wx",mode:0o600});}});
 emit({phase:"fresh150-continuation-qualified",alreadyAttempted:86,alreadyConfirmed:84,failed55PreservedUnretried:true,native87ReconciledNeverResubmitted:true,
  sdkNotificationWaitMs:15000,productionDefaultNotificationWaitMs:120000,exactIndexedFinalityAcceptanceUnchanged:true,approvedNativeCap:150,
  approvedApplicationMaximum:4,additionalPlannedCalls:49,hardPhaseReservationCeiling:136,reserveNotAutomaticallyEnabled:true,newContractDeployments:0});
 stage="fresh-fourth-flow-after87";
 await runRemainingOrdinaryMatrixV2({fixtures,address,profile,resume,completedFirst,completedFreshStateful,freshRecovery150:true,providers:{...providers,proofProvider},wallet,checkpoint,emit,privateScanValues});
 assert(attempts===49&&finalized===46&&negatives===3&&wallet.journalState().reservedMaximumAttempts===136&&wallet.journalState().maximumNativeAttemptsReserved===135);
 assert(hash(await privateFile("inputs.json"))===hash(raw));
 emit({phase:"finished",attempts,finalized,nativeNegativeOutcomes:1+negatives,totalConservativeAttempts:135,totalNormalFinals:130,applicationInstances:4,
  receipts:3,reserveUsed:0,temporaryPublicRestorationStillRequired:true,independentHumanReviewStillRequired:true,milestoneComplete:false});
}catch(error){await writeFile(directory+"/remaining-ordinary-matrix-v6-private-error.json",JSON.stringify({stage,name:error instanceof Error?error.name:"unknown",
 message:error instanceof Error?error.message:"withheld",stack:error instanceof Error?error.stack:"withheld"}),{flag:"wx",mode:0o600});
 emit({phase:"failed",stage,attempts,finalized,negatives,automaticNativeRetry:false,detailsWithheld:true});process.exitCode=1;
}finally{process.exit(process.exitCode??0);}
