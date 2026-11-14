import assert from "node:assert/strict";
import {encodeCanonical} from "@permio/protocol";
import { createHash, randomBytes } from "node:crypto";
import { lstat, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";

const root = "/opt/permio-m6-governance-20261018-v10", client = root + "/client", privateDirectory = root + "/private";
const mode = process.argv[2];
assert(process.platform === "linux" && process.argv.length === 3 &&
  ["--qualify-after55-v1", "--resume-after-preparation-begin-v1"].includes(mode!));
for (const name of ["log", "warn", "info", "debug", "error"] as const) console[name] = () => {};
const emit = (value: Readonly<Record<string, unknown>>) => process.stdout.write(JSON.stringify({
  kind: "m6-v10-ordinary-flow", observedAtUtc: new Date().toISOString(), ...value }) + "\n");
let phase = "private-checkpoint-verification", attempts = 55, finalized = 55, resets = 0, checkpoints = 500, captured = 0;
// The SDK installs BigInt.toJSON; older checkpoints therefore contain decimal
// strings. Recover only fields declared bigint by the exact generated ABI.
const bigintFields = new Set(["stateSequence", "statusSequence", "holderSecret", "sessionSecret", "field", "x", "y",
  ...[...(await readFile(client + "/packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.d.ts", "utf8"))
    .matchAll(/\b([A-Za-z][A-Za-z0-9_]*)\s*:\s*bigint\b/g)].map(v => v[1]!) ]);
function revive(_key: string, value: unknown): unknown {
  if (typeof value === "string" && /^\d+$/.test(value) && bigintFields.has(_key)) return BigInt(value);
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>, keys = Object.keys(v);
    if (keys.length === 1 && typeof v.$bigint === "string") return BigInt(v.$bigint);
    if (keys.length === 1 && typeof v.$bytes === "string") return Uint8Array.from(Buffer.from(v.$bytes, "hex"));
    if (keys.length === 2 && v.type === "Buffer" && Array.isArray(v.data) &&
      v.data.every(x => Number.isInteger(x) && x >= 0 && x <= 255)) return Uint8Array.from(v.data);
  }
  return value;
}
async function privateFile(name: string) {
  assert(/^[a-z0-9.-]+$/.test(name)); const p = path.join(privateDirectory, name), s = await lstat(p);
  assert(s.isFile() && !s.isSymbolicLink() && s.uid === 0 && (s.mode & 0o777) === 0o600 && await realpath(p) === p);
  return readFile(p);
}
async function checkpoint(stage: string, value: unknown) {
  await writeFile(path.join(privateDirectory, `runtime-${++checkpoints}.json`), JSON.stringify({ stage, value },
    function (key, value) { const original = this[key]; return typeof original === "bigint" ? { $bigint: String(original) } : original instanceof Uint8Array ? { $bytes: Buffer.from(original).toString("hex") } : value; }),
    { flag: "wx", mode: 0o600 });
  emit({ phase: "private-test-checkpoint-saved", stage, contentsLogged: false });
}
async function requestReset() {
  const number = String(++resets).padStart(3, "0"); assert(resets <= 14);
  await writeFile(root + `/control/reset-${number}.request.json`, JSON.stringify({ number,
    owner: "permio-m6-ordinary-action-v9-20261018" }), { flag: "wx", mode: 0o600 });
  for (let n = 0; n < 240; n++) {
    try {
      const v = JSON.parse(await readFile(root + `/control/reset-${number}.verified.json`, "utf8"));
      assert(v.number === number && v.exactOwnedProverVerified && v.loopbackOnly); return;
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
    await delay(500);
  }
  throw Error("Owned prover reset was not verified");
}
try {
  assert(process.cwd()===client&&await realpath(privateDirectory)===privateDirectory);
  const rawInputs=await privateFile("inputs.json"),inputs=JSON.parse(rawInputs.toString());
  assert(inputs.networkId==="preprod"&&inputs.testOnlyProvenance.includes("disposable Preprod test"));
  const plan=JSON.parse((await privateFile("execution-plan-fresh62.json")).toString());
  assert(plan.transactionCap===62&&plan.newDeployments===0&&plan.freshApplicationInstances===1&&plan.noAutomaticRetries);
  process.chdir(privateDirectory);try{await import("@midnight-ntwrk/testkit-js");}finally{process.chdir(client);}
  const sdk=await import("@permio/midnight-authorization");
  const {restoreM6GovernanceFixture}=await import("./run-live-m6-admission.ts");
  const {restoreCertifiedOrdinarySetup}=await import("./m6-restore-certified-ordinary.ts");
  await sdk.verifyPermioAuthorizationAssets(sdk.PERMIO_AUTHORIZATION_ASSETS_PATH);
  const m4=restoreM6GovernanceFixture(JSON.parse((await privateFile("runtime-001.json")).toString(),revive).value);
  const saved=await Promise.all((await readdir(privateDirectory)).filter(n=>/^runtime-[24]\d\d\.json$/.test(n)).sort().map(async n=>({name:n,...JSON.parse((await privateFile(n)).toString(),revive)})));
  const select=(range:string,stage:string)=>{const e=saved.filter(e=>e.name.startsWith("runtime-"+range)&&e.stage===stage).at(-1);assert(e);return e.value;};
  const a=select("2","instance-allocation"),oldPrepared=select("2","ordinary-credentials-prepared"),oldFinal=select("2","ordinary-credential-call-prepared");
  oldFinal.arguments[0]=BigInt(oldFinal.arguments[0]);
  const oldSetup=restoreCertifiedOrdinarySetup({m4,allocated:a,prepared:oldPrepared,finalCall:oldFinal.arguments});
  const fresh=select("4","instance-allocation"),c=select("4","ordinary-credentials-prepared"),call=select("4","ordinary-credential-call-prepared");
  assert(call.phase==="session-certification"&&call.acceptedCredentialTransactions===18);
  const restored=restoreCertifiedOrdinarySetup({m4,allocated:fresh,prepared:c,finalCall:call.arguments,initialStatus:oldSetup.setup.credentials!.status});
  const credentials=restored.setup.credentials!,system=restored.system;
  const slot=select("4","ordinary-root-slot-prepared"),source=slot.source;
  const assigned=system.assignParticipantSlot(source.assignedBy,{namespace:source.namespace,templateId:source.templateId,
    templateVersion:source.templateVersion,templateHash:source.templateHash,assignmentId:source.assignmentId,instanceId:source.instanceId,
    contextId:source.contextId,slotId:source.slotId,subjectAccountId:source.subjectAccountId},source.assignedAt);
  assert.deepEqual(assigned,source);
  const prepared=select("4","ordinary-action-prepared");
  const profile=new sdk.PreprodConnectionProfile(inputs.providerCredential,"http://127.0.0.1:6300");setNetworkId("preprod");
  const env=profile.environmentForSdk(),readOnly=indexerPublicDataProvider(env.indexer,env.indexerWS);
  const address="9a5b8e294e61463c5ce5948ba0120479dd69a582e0e7fc5f84c8c9c4197af3bc";
  phase="exact-fifty-five-finality-and-current-state";
  assert((await readdir(privateDirectory)).filter(n=>/^wallet-\d{3}-submission\.json$/.test(n)).length===55);
  assert(!(await readdir(privateDirectory)).some(n=>/^wallet-056-/.test(n)));
  const journal55=JSON.parse((await privateFile("wallet-055-submission.json")).toString());
  const final55=await Promise.race([readOnly.watchForTxData(journal55.transactionIds.at(-1)),delay(90000).then(()=>{throw Error("Exact finality read timeout");})]);
  assert.equal(final55.status,"SucceedEntirely");assert((await privateFile("wallet-055-balanced.bin")).equals(Buffer.from(final55.tx.serialize())));
  const events=(await Promise.all(["v2","v3","v4","v6","v7"].map(v=>readFile(root+`/runtime-first-flow-${v}/client-public.jsonl`,"utf8")))).join("\n").split("\n").flatMap(s=>{try{return [JSON.parse(s)];}catch{return [];}}).filter(e=>e.kind==="m6-v10-ordinary-flow");
  const submitted=events.filter(e=>e.phase==="submission-attempt"),confirmed=events.filter(e=>e.phase==="finalized");
  assert.equal(submitted.length,55);assert.equal(confirmed.length,54);
  for(let i=0;i<54;i++){const j=JSON.parse((await privateFile(`wallet-${String(i+1).padStart(3,"0")}-submission.json`)).toString());assert(j.transactionIds.includes(confirmed[i].transactionId));}
  const indexed=await readOnly.queryContractState(address);assert(indexed);const view=sdk.readPermioAuthorizationLedger(indexed.data),pure=sdk.permioAuthorizationPureCircuits;
  const allocation=fresh.allocation,originalInstanceRecord=view.runtimeInstances.lookup(a.allocation.instanceCommitment);
  assert.equal(view.runtimeInstances.size(),2n);assert.equal(originalInstanceRecord.transitionSequence,4n);
  const record=view.runtimeInstances.lookup(allocation.instanceCommitment);assert.equal(record.transitionSequence,4n);
  assert.deepEqual(record.currentStateCommitment,pure.runtimeStateCommitment(prepared.state));
  assert.equal(credentials.status.sequence,6n);assert.deepEqual(view.credentialStatusRoots.lookup(allocation.target.namespaceHash).root,credentials.status.root);
  assert.equal(view.decisionReceipts.size(),0n);assert.equal(view.usedRuntimeActionNullifiers.size(),0n);assert.equal(view.runtimeActionSessions.size(),1n);
  const initial=prepared.prepareArguments,finalArgs=prepared.finalArguments;
  const command=initial[1],intent=initial[3],state=initial[6];let progress=initial[10];
  const pending=view.runtimeActionSessions.lookup(pure.runtimeActionCommandCommitment(command));
  assert.deepEqual(pending.progressCommitment,pure.runtimeActionProgressCommitment(progress));
  assert.deepEqual(sdk.buildRuntimeActionScopePaths(intent,credentials.capability.scope),finalArgs[6]);
  assert.deepEqual(sdk.buildRuntimeActionScopePaths(intent,credentials.session.scope),finalArgs[7]);
  pure.assertRuntimeActiveAncestry(finalArgs[3],credentials.status.root,6n,command.effectiveAt);
  assert(prepared.evidence.inputs.length===1&&prepared.evidence.outputs.length===1);
  assert(Number(command.validBefore)>Math.floor(Date.now()/1000)+4500,"Need75min remaining for the measured remaining sequence");
  const [registryKey,templateRecord]=[...view.activeTemplates][0]!;assert.equal(templateRecord.lifecycleStatus,1n);
  const [moduleKey,moduleRecord]=[...view.proofModules][0]!;assert.equal(moduleRecord.lifecycleStatus,4n);
  const policyHash=sdk.hashNamespacePolicy(m4.policy),bytes=(v:string)=>Uint8Array.from(Buffer.from(v.slice(2),"hex"));
  const nsHash=sdk.hashProtocolIdentifier("namespace",fresh.instance.namespace);
  const authoritySpecs=[[3n,29n],[7n,101n],[7n,103n],[8n,107n],[8n,127n],[9n,109n],[10n,113n],[11n,149n],[11n,151n],[12n,157n],[5n,163n],[6n,173n],[4n,191n],[6n,197n],[6n,199n],[13n,211n]] as const;
  const leaves=authoritySpecs.map(([authorityKind,secret])=>({leafVersion:1n,namespaceHash:bytes(nsHash),governancePolicyHash:bytes(policyHash),authorityKind,publicKey:sdk.governanceActivatorPublicKey(secret),validAfter:1700000000n,validBefore:2000000000n}));
  const authority=sdk.buildAuthorityRoot(leaves);assert.deepEqual(authority.root,view.authorityRoots.lookup(bytes(nsHash)).root);
  emit({phase:"prepared-action-continuation-qualified",alreadyFinalized:55,slotStateSequence:4,statusRootSequence:6,actionPreparationPresent:true,newSubmissions:0});
  if(mode==="--qualify-after55-v1"){
    phase="fee-wallet-read-only-catch-up";
    const snapshotBytes=await privateFile("rolling-wallet-snapshots.json"),snapshots=JSON.parse(snapshotBytes.toString());
    await sdk.withRestoredPreprodWallet(profile,inputs.secret,snapshots,async w=>{assert((await w.synchronize()).readyForTransactions);},undefined,async next=>{
      await writeFile(privateDirectory+"/rolling-wallet-before-after55-v1.json",snapshotBytes,{flag:"wx",mode:0o600});
      const {rename}=await import("node:fs/promises");const p=privateDirectory+"/rolling-wallet-after55-writing.json";
      await writeFile(p,JSON.stringify(next),{flag:"wx",mode:0o600});await rename(p,privateDirectory+"/rolling-wallet-snapshots.json");
    });
    emit({phase:"prepared-action-read-only-qualification-complete",alreadyFinalized:55,feeWalletReadyAndCheckpointRefreshed:true,walletClosed:true,nativeSubmissions:0});process.exit(0);
  }
  // Record late finality once in the continuation; the original failure log is immutable.
  emit({phase:"finalized",transactionId:journal55.transactionIds.at(-1),ledgerSequence:final55.blockHeight,previousSubmissionReadOnlyReconciled:true,nativeResubmission:false});
  const {createOrdinaryWalletTransport}=await import("./m6-ordinary-wallet-transport.ts");
  const {ordinaryActionProofProvider}=await import("./m6-ordinary-proof-provider.mjs");
  const {observeLocalProofProvider}=await import("./m6-proof-observation.ts");
  const wallet=await createOrdinaryWalletTransport({privateDirectory,profile,submissionCap:62,resumeAfterFiftyFiveFinalized:{contractAddress:address},observe(v){if(v.phase==="submission-attempt")attempts++;if(v.phase==="finalized")finalized++;emit(v);}});
  const providers={...sdk.createPreprodAuthorizationProviders(wallet,profile),proofProvider:observeLocalProofProvider(ordinaryActionProofProvider({port:6300,beforeProof:requestReset,afterProof:requestReset,observe:emit,async captureProvedTransaction(tx){assert(++captured<=7);await writeFile(privateDirectory+`/unbound-proved-after55-${String(captured).padStart(3,"0")}.bin`,tx.serialize(),{flag:"wx",mode:0o600});}}),(event,v)=>emit({event,...v}),3600000)};
  const contract=await sdk.connectPermioAuthorizationContract(providers,address);
  type Tail<T extends unknown[]>=T extends [unknown,...infer R]?R:never;
  type Prepare=Tail<Parameters<typeof contract.callTx.prepareRuntimeAction>>;type Final=Tail<Parameters<typeof contract.callTx.executeRuntimeAction>>;
  const base:Prepare=initial,main:Final=finalArgs;
  async function prepare(operation:bigint,selected=prepared.evidence.inputs[0]){
    const args:Prepare=[operation,base[1],base[2],base[3],base[4],base[5],base[6],base[7],base[8],base[9],progress,base[11],selected.selected,selected.path];
    await checkpoint("resumed-action-prepare",{arguments:args});const tx=await contract.callTx.prepareRuntimeAction(...args);
    emit({event:"ordinary-action-resumed-preparation-accepted",operation:Number(operation),transactionId:tx.public.txId,grantsAuthority:false});
  }
  phase="remaining-ordinary-action-preparation";
  await prepare(2n);progress=sdk.advanceRuntimeActionSlotProgress(command,intent,state,credentials.status.root,progress,base[11]);
  for(const selected of [...prepared.evidence.inputs,...prepared.evidence.outputs]){await prepare(3n,selected);progress=sdk.advanceRuntimeActionEvidenceProgress(base[7],progress,selected.selected);}
  const beforeMain=await providers.publicDataProvider.queryContractState(address);assert(beforeMain);const unchanged=sdk.readPermioAuthorizationLedger(beforeMain.data);
  assert.equal(unchanged.runtimeInstances.lookup(allocation.instanceCommitment).transitionSequence,4n);assert.deepEqual(unchanged.runtimeInstances.lookup(allocation.instanceCommitment).currentStateCommitment,record.currentStateCommitment);
  assert.equal(unchanged.decisionReceipts.size(),0n);assert.equal(unchanged.usedRuntimeActionNullifiers.size(),0n);
  phase="ordinary-action-atomic-finalization";
  const args:Final=[main[0],main[1],main[2],main[3],main[4],main[5],main[6],main[7],main[8],main[9],main[10],main[11],main[12],progress,main[14],main[15],main[16],main[17],main[18],main[19],main[20]];
  await checkpoint("resumed-action-final-prepared",{arguments:args,expectedNextState:prepared.expectedNextState});
  const accepted=await contract.callTx.executeRuntimeAction(...args),receiptId=`0x${Buffer.from(accepted.private.result).toString("hex")}` as const;
  const receipt=await sdk.readFinalizedDecisionReceipt(sdk.createIndexedDecisionReceiptReader({network:"preprod",profile,publicDataProvider:providers.publicDataProvider,contract:`0x${address}`,receiptId}),{network:"preprod",contract:`0x${address}`,transactionId:accepted.public.txId,receiptId});
  const afterMain=await providers.publicDataProvider.queryContractState(address);assert(afterMain);const actual=sdk.readPermioAuthorizationLedger(afterMain.data);
  assert.equal(actual.runtimeInstances.lookup(allocation.instanceCommitment).transitionSequence,5n);assert.deepEqual(actual.runtimeInstances.lookup(allocation.instanceCommitment).currentStateCommitment,pure.runtimeStateCommitment(prepared.expectedNextState));
  assert.equal(actual.usedRuntimeActionNullifiers.size(),1n);assert.equal(actual.decisionReceipts.size(),1n);assert.equal(actual.runtimeActionSessions.size(),0n);
  const decision=system.authorizeAction(prepared.signedIntent,Number(command.effectiveAt));assert(decision.allowed);
  assert.equal(decision.nextState,m4.record.template.states.find(label=>createHash("sha256").update(encodeCanonical("permio:private-state-id:v1",[label])).digest().equals(Buffer.from(prepared.expectedNextState.stateIdHash))));
  emit({event:"ordinary-action-finalized-and-receipt-verified",transactionId:accepted.public.txId,contractAddress:address,receipt,instanceStateSequence:"5",actualM4M5ApisUsed:true,exactIndexedCallAndInsertionVerified:true,milestoneComplete:false});
  const privateSentinels=[...restored.setup.privateSentinels,source.assignmentId,prepared.signedIntent.payload.nonce,Buffer.from(main[20]).toString("hex")];
  phase = "disposable-template-module-cleanup";
  for(const nextLifecycleStatus of [2n,3n]) {
    const indexed=await providers.publicDataProvider.queryContractState(address);assert(indexed);
    const v=sdk.readPermioAuthorizationLedger(indexed.data),current=v.activeTemplates.lookup(registryKey);
    const cmd={commandVersion:1n,registryKey,recordCommitment:pure.activeTemplateRecordCommitment(current),
      namespaceHash:bytes(nsHash),governancePolicyHash:bytes(policyHash),authorityRootVersion:1n,authorityRootSequence:1n,
      expectedLifecycleStatus:current.lifecycleStatus,nextLifecycleStatus,effectiveAt:BigInt(Math.floor(Date.now()/1000)-1),
      effectiveSequence:v.templateLifecycleSequence+1n,reasonHash:randomBytes(32),commandNonce:randomBytes(32)};
    const leaf=nextLifecycleStatus===2n?leaves[9]!:leaves[10]!,secret=nextLifecycleStatus===2n?157n:163n;
    const tx=await contract.callTx.terminateTemplate(cmd,sdk.signTemplateLifecycleCommand(cmd,secret),leaf,
      authority.pathFor(pure.governanceActivatorLeafCommitment(leaf)));
    emit({event:"ordinary-test-template-cleaned",transactionId:tx.public.txId,lifecycleStatus:Number(nextLifecycleStatus)});
  }
  const before=await providers.publicDataProvider.queryContractState(address);assert(before);
  const mod=sdk.readPermioAuthorizationLedger(before.data).proofModules.lookup(moduleKey);
  const cmd={commandVersion:1n,moduleKey,recordCommitment:pure.proofModuleRecordCommitment(mod),governanceNamespaceHash:bytes(nsHash),
    governancePolicyHash:bytes(policyHash),authorityRootVersion:1n,authorityRootSequence:1n,expectedLifecycleStatus:4n,nextLifecycleStatus:6n,
    effectiveAt:BigInt(Math.floor(Date.now()/1000)-1),reasonHash:randomBytes(32),commandNonce:randomBytes(32)};
  const cleaned=await sdk.governanceCallOperations(contract,wallet.withGovernanceOperation).governProofModule(cmd,
    sdk.signProofModuleLifecycleCommand(cmd,113n),leaves[6]!,authority.pathFor(pure.governanceActivatorLeafCommitment(leaves[6]!)));
  emit({event:"ordinary-test-module-revoked",transactionId:cleaned.public.txId,lifecycleStatus:6});
  const after=await providers.publicDataProvider.queryContractState(address);assert(after);const final=sdk.readPermioAuthorizationLedger(after.data);
  assert.equal(final.runtimeInstances.size(),2n);
  assert.deepEqual(final.runtimeInstances.lookup(a.allocation.instanceCommitment),originalInstanceRecord);
  assert.equal(final.runtimeInstances.lookup(allocation.instanceCommitment).transitionSequence,5n);
  assert.equal(final.credentialStatusRoots.lookup(allocation.target.namespaceHash).rootSequence,6n);
  assert.equal(final.usedRuntimeActionNullifiers.size(),1n);
  assert.equal(final.runtimeActionSessions.size(),0n);
  assert.equal(final.capabilityAttenuationSessions.size(),0n);
  assert.equal(final.decisionReceipts.size(),1n);assert.equal(final.activeTemplates.lookup(registryKey).lifecycleStatus,3n);
  assert.equal(final.proofModules.lookup(moduleKey).lifecycleStatus,6n);
  const log=await readFile(root+"/runtime-first-flow-v8/client-public.jsonl","utf8");
  for(const sentinel of privateSentinels)assert(!log.includes(sentinel));
  emit({event:"ordinary-action-first-flow-verified",contractAddress:address,contractTag:sdk.PERMIO_AUTHORIZATION_CONTRACT_TAG,
    exactIndexedCallAndReceiptVerified:true,privacyLogScanPassed:true,disposableTemplateAndModuleRevoked:true,fullM6Acceptance:false});
  assert(attempts===62&&finalized===62);assert((await privateFile("inputs.json")).equals(rawInputs));
  emit({phase:"first-flow-complete",attempts,finalized,commonReceiptVerified:true,fullM6Acceptance:false});
} catch(error) {
  await writeFile(privateDirectory+"/prepared-action-continuation-private-error-v1.json",JSON.stringify({phase,
    errorType:error instanceof Error?error.name:"unknown",message:error instanceof Error?error.message:"withheld",
    stack:error instanceof Error?error.stack:"withheld"}),{flag:"wx",mode:0o600});
  emit({phase:"failed",failedStage:phase,attempts,finalized,reconciliationRequired:attempts>finalized,
    automaticRetry:false,detailsPreservedPrivately:true}); process.exitCode=1;
} finally {process.exit(process.exitCode??0);}
