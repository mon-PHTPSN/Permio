import assert from "node:assert/strict";
import {createHash,randomBytes} from "node:crypto";
import {lstat,readFile,readdir,realpath,writeFile} from "node:fs/promises";
import {setTimeout as delay} from "node:timers/promises";
import {createUnprovenCallTx} from "@midnight-ntwrk/midnight-js-contracts";
import * as sdk from "@permio/midnight-authorization";
import {setNetworkId} from "@midnight-ntwrk/midnight-js-network-id";
import {restoreM6GovernanceFixture} from "./run-live-m6-admission.ts";
import {reviveRemainingCheckpoint} from "./m6-restore-remaining-checkpoint.ts";
import {createRemainingWalletTransport} from "./m6-remaining-wallet-transport.ts";
import {ordinaryActionProofProvider} from "./m6-ordinary-proof-provider.mjs";
import {setUnprovenActionWindow} from "./m6-unproven-action-window.ts";
import {probePreprodTransports} from "./m6-preprod-transport.ts";
import {PreprodConnectionProfile as TransportProfile} from "../packages/midnight-authorization/src/preprod-profile.ts";

// Only the three already approved calls114..116. No instance allocation.
const root="/opt/permio-m6-remaining-preprod-20261019-v1",client=root+"/client",directory=root+"/private";
assert(process.platform==="linux"&&process.argv.length===3&&process.argv[2]==="--authority-after113"&&process.cwd()===client);
for(const k of ["log","error","warn","info","debug"]as const)console[k]=()=>{};
const emit=(v:unknown)=>process.stdout.write(JSON.stringify(v)+"\n");
const hash=(v:Uint8Array)=>createHash("sha256").update(v).digest("hex"),hex=(v:Uint8Array)=>Buffer.from(v).toString("hex");
let stage="closed113-boundary",attempts=0,finalized=0,negatives=0,resets=0,captures=0;
async function privateFile(n:string){assert(/^[a-z0-9.-]+$/u.test(n));const p=directory+"/"+n,m=await lstat(p);
 assert(m.isFile()&&!m.isSymbolicLink()&&m.uid===0&&(m.mode&0o777)===0o600&&await realpath(p)===p);return readFile(p);}
const json=async(n:string)=>JSON.parse((await privateFile(n)).toString(),reviveRemainingCheckpoint);
const stringify=(v:unknown)=>JSON.stringify(v,function(k,value){const original=this[k];return typeof original==="bigint"?{$bigint:String(original)}:
 original instanceof Uint8Array?{$bytes:hex(original)}:value;});
async function reset(main?:1){const cpuThreads=main??4,number=String(++resets).padStart(3,"0");assert(resets<=20);
 await writeFile(root+`/control-ordinary-v7/reset-${number}.request.json`,JSON.stringify({number,owner:"permio-m6-remaining-preprod-20261019-v1",cpuThreads}),{flag:"wx",mode:0o600});
 for(let n=0;n<240;n++){try{const v=JSON.parse(await readFile(root+`/control-ordinary-v7/reset-${number}.verified.json`,"utf8"));
  assert(v.number===number&&v.exactOwnedProverVerified&&v.loopbackOnly&&v.cpuThreads===cpuThreads&&v.ramMaxBytes===29*1024**3/2&&
   v.sharedHostSwapBytes===119*1024**3/8&&v.ramHighBytes===(cpuThreads===1?27:23)*1024**3/2);return;
 }catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}await delay(500);}throw Error("Owned v7 prover reset not verified");}
try{
 const names=await readdir(directory);assert(names.filter(n=>/^wallet-\d{3}-submission.json$/u.test(n)).length===112&&names.filter(n=>/^wallet-\d{3}-reservation.json$/u.test(n)).length===113&&!names.some(n=>/^wallet-114-/u.test(n)));
 const input=await json("inputs.json"),approval=await json("run-approval-v2.json");assert(input.networkId==="preprod"&&input.testOnlyProvenance.includes("disposable Preprod test"));
 assert(approval.nativeCap===150&&approval.applicationInstances===4&&approval.userApproved&&approval.noAutomaticRetries&&approval.failed55MustRemainUnused);
 const recovered=JSON.parse(await readFile(root+"/after113-recovery-verification-v1.json","utf8"));
 assert(recovered.passed&&recovered.currentEntireStateEquals113&&recovered.actualM4M5ApisUsed&&recovered.originalSignedIntentAuthorized&&recovered.tamperedEarlySlotRejected);
 const saved=await json("fourth-prepared-after113-private.json"),address="70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c";
 setNetworkId("preprod");process.chdir(directory);try{await import("@midnight-ntwrk/testkit-js");}finally{process.chdir(client);}
 const profile=new sdk.PreprodConnectionProfile(input.providerCredential,"http://127.0.0.1:6300");await sdk.verifyPermioAuthorizationAssets(sdk.PERMIO_AUTHORIZATION_ASSETS_PATH);
 const network=await probePreprodTransports(new TransportProfile(input.providerCredential,"http://127.0.0.1:6300"));assert(network.http.passed&&network.http.genesisHash===sdk.PREPROD_GENESIS_HASH&&network.nodeSubscription.passed&&network.indexerSubscription.passed);
 const version=await fetch("http://127.0.0.1:6300/version");assert(version.ok&&(await version.text()).trim()==="8.1.3");
 stage="all113-prior-reservations-readonly-reconciliation";
 const wallet=await createRemainingWalletTransport({profile,planVersion:5,phaseAttemptCeiling:116,observe(v){if(v.phase==="submission-attempt")attempts++;
  if(v.phase==="finalized")finalized++;if(v.phase==="native-negative-rejected")negatives++;emit(v);}});
 assert(wallet.journalState().reservedMaximumAttempts===113&&wallet.journalState().maximumNativeAttemptsReserved===112);
 const base=sdk.createPreprodAuthorizationProviders(wallet,profile),current=await base.publicDataProvider.queryContractState(address);assert(current&&hash(current.serialize())===recovered.stateSha256);
 const pure=sdk.permioAuthorizationPureCircuits,view=sdk.readPermioAuthorizationLedger(current.data),ns=saved.allocated.allocation.target.namespaceHash;
 assert(view.runtimeInstances.size()===4n&&view.decisionReceipts.size()===2n&&view.authorityRoots.lookup(ns).rootSequence===1n&&view.credentialStatusRoots.lookup(ns).rootSequence===10n);
 // This phase needs one proof and three calls, rather than the full four-proof matrix.
 assert(Number(saved.finished.arguments[0].validBefore)>Math.floor(Date.now()/1000)+90*60,"Insufficient signed time for the isolated authority case");
 const proofProvider=ordinaryActionProofProvider({port:6300,beforeProof:async tx=>{const actions=[...(tx.intents?.values()??[])].flatMap(i=>i.actions),entry=actions[0]&&"entryPoint"in actions[0]?actions[0].entryPoint:undefined;
  await reset(entry==="executeRuntimeAction"||entry instanceof Uint8Array&&Buffer.from(entry).toString("utf8")==="executeRuntimeAction"?1:undefined);},afterProof:()=>reset(),observe:emit,
  captureProvedTransaction:async tx=>{assert(++captures<=4);await writeFile(directory+`/authority-v7-unbound-proved-${String(captures).padStart(3,"0")}.bin`,tx.serialize(),{flag:"wx",mode:0o600});}});
 const providers={...base,proofProvider};stage="genuine-once-valid-authority-proof";
 const ready=await createUnprovenCallTx(providers,{compiledContract:sdk.permioAuthorizationCompiledContract,contractAddress:address,circuitId:"executeRuntimeAction",args:saved.finished.arguments});
 setUnprovenActionWindow(ready.private.unprovenTx,saved.finished.arguments[0].validBefore);emit({phase:"authority-proof-window-qualified",wholeSecondPrecision:true,signedWindowUnchanged:true,privateDeadlineLogged:false});
 const proved=await proofProvider.proveTx(ready.private.unprovenTx);await writeFile(directory+"/authority-after113-unbound-proved.bin",proved.serialize(),{flag:"wx",mode:0o600});
 await wallet.validateCandidate(proved);
 stage="two-approved-authority-root-approvals";
 const pair=await json("fixture-pair.json"),m4=restoreM6GovernanceFixture(pair.stateful),policyHash=sdk.hashNamespacePolicy(m4.policy);
 const specs=[[3n,29n],[7n,101n],[7n,103n],[8n,107n],[8n,127n],[9n,109n],[10n,113n],[11n,149n],[11n,151n],[12n,157n],[5n,163n],[6n,173n],[4n,191n],[6n,197n],[6n,199n],[13n,211n]]as const;
 const leaves=specs.map(([authorityKind,secret])=>({leafVersion:1n,namespaceHash:ns,governancePolicyHash:Uint8Array.from(Buffer.from(policyHash.slice(2),"hex")),authorityKind,
  publicKey:sdk.governanceActivatorPublicKey(secret),validAfter:1700000000n,validBefore:2000000000n}));
 const authority=sdk.buildAuthorityRoot(leaves),rotated=sdk.buildAuthorityRoot([{...leaves[0]!,publicKey:sdk.governanceActivatorPublicKey(167n)},...leaves.slice(1)]);
 assert.deepEqual(view.authorityRoots.lookup(ns).root,authority.root);
 const command={commandVersion:1n,namespaceHash:ns,currentGovernancePolicyHash:Uint8Array.from(Buffer.from(policyHash.slice(2),"hex")),currentRoot:authority.root,currentRootVersion:1n,currentRootSequence:1n,
  nextGovernancePolicyHash:Uint8Array.from(Buffer.from(policyHash.slice(2),"hex")),nextRoot:rotated.root,nextRootVersion:2n,nextRootSequence:2n,
  nextModuleReviewThreshold:2n,nextModuleApprovalThreshold:2n,nextAuthorityRootUpdateThreshold:2n,effectiveAt:BigInt(Math.floor(Date.now()/1000)-1),updateNonce:randomBytes(32)};
 await writeFile(directory+"/checkpoint-v7-8001.json",stringify({stage:"exact-authority-rotation",value:{command,leaves}}),{flag:"wx",mode:0o600});
 const contract=await sdk.connectPermioAuthorizationContract(providers,address),operations=sdk.governanceCallOperations(contract,wallet.withGovernanceOperation);
 for(const[index,secret]of [[7,149n],[8,151n]]as const){const leaf=leaves[index]!;
  await operations.submitAuthorityRootApproval(command,sdk.signAuthorityRootUpdateCommand(command,secret),leaf,authority.pathFor(pure.governanceActivatorLeafCommitment(leaf)));}
 const before=await base.publicDataProvider.queryContractState(address);assert(before);const beforeView=sdk.readPermioAuthorizationLedger(before.data);
 assert(beforeView.authorityRoots.lookup(ns).rootSequence===2n);assert.deepEqual([...beforeView.runtimeInstances],[...view.runtimeInstances]);
 assert.deepEqual(beforeView.credentialStatusRoots.lookup(ns),view.credentialStatusRoots.lookup(ns));assert.deepEqual([...beforeView.activeTemplates],[...view.activeTemplates]);assert.deepEqual([...beforeView.proofModules],[...view.proofModules]);
 stage="single-native-stale-authority-submission";await wallet.submitNegative(proved,"stale-authority-root");
 const after=await base.publicDataProvider.queryContractState(address);assert(after&&hash(after.serialize())===hash(before.serialize()));
 assert(attempts===3&&finalized===2&&negatives===1&&wallet.journalState().reservedMaximumAttempts===116&&wallet.journalState().maximumNativeAttemptsReserved===115);
 const completion={passed:true,observedAtUtc:new Date().toISOString(),conservativeAttempts:115,successfulFinals:112,nativeNegatives:2,
  applicationInstances:4,receipts:2,authoritySequence:2,credentialStatusSequence:10,phaseNativeAttempts:3,phaseSuccesses:2,phaseNativeNegatives:1,
  exactPositiveControlVerified:true,entireStateUnchangedByNegative:true,noEarlierTransactionResubmitted:true,fifthInstanceNotStarted:true,approvedCeiling:150,milestoneComplete:false};
 await writeFile(root+"/authority-after113-completion-v1.json",JSON.stringify(completion),{flag:"wx",mode:0o600});emit({phase:"finished",...completion});
}catch(error){await writeFile(directory+"/remaining-ordinary-matrix-v7-private-error.json",JSON.stringify({stage,name:error instanceof Error?error.name:"unknown",message:error instanceof Error?error.message:"withheld",stack:error instanceof Error?error.stack:"withheld"}),{flag:"wx",mode:0o600});emit({phase:"failed",stage,attempts,finalized,negatives,detailsWithheld:true,automaticNativeRetry:false});process.exitCode=1;
}finally{process.exit(process.exitCode??0);}
