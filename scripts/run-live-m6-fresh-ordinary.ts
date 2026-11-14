import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { lstat, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";

const root = "/opt/permio-m6-governance-20261018-v10", client = root + "/client", privateDirectory = root + "/private";
const mode = process.argv[2];
assert(process.platform === "linux" && process.argv.length === 3 &&
  ["--qualify-fresh-v1", "--execute-fresh-instance-v1"].includes(mode!));
for (const name of ["log", "warn", "info", "debug", "error"] as const) console[name] = () => {};
const emit = (value: Readonly<Record<string, unknown>>) => process.stdout.write(JSON.stringify({
  kind: "m6-v10-ordinary-flow", observedAtUtc: new Date().toISOString(), ...value }) + "\n");
let phase = "private-checkpoint-verification", attempts = 32, finalized = 32, resets = 0, checkpoints = 400, captured = 0;
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
  const number = String(++resets).padStart(3, "0"); assert(resets <= 60);
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
  assert(process.cwd() === client && await realpath(privateDirectory) === privateDirectory);
  const rawInputs = await privateFile("inputs.json"), inputs = JSON.parse(rawInputs.toString());
  assert(inputs.networkId === "preprod" && inputs.testOnlyProvenance.includes("disposable Preprod test"));
  const plan = JSON.parse((await privateFile("execution-plan-fresh62.json")).toString());
  assert(plan.plan === "m6-v10-fresh-instance-62-v1" && plan.transactionCap === 62 && plan.newDeployments === 0 && plan.alreadyFinalized === 32 && plan.freshApplicationInstances === 1 && plan.noAutomaticRetries);
  process.chdir(privateDirectory); try { await import("@midnight-ntwrk/testkit-js"); } finally { process.chdir(client); }
  const sdk = await import("@permio/midnight-authorization");
  const { restoreM6GovernanceFixture } = await import("./run-live-m6-admission.ts");
  const { restoreCertifiedOrdinarySetup } = await import("./m6-restore-certified-ordinary.ts");
  const { runOrdinaryActionWorkflow } = await import("./m6-ordinary-action-workflow.ts");
  await sdk.verifyPermioAuthorizationAssets(sdk.PERMIO_AUTHORIZATION_ASSETS_PATH);
  const fixture = JSON.parse((await privateFile("runtime-001.json")).toString(), revive);
  assert(fixture.stage === "governance-fixture"); const m4 = restoreM6GovernanceFixture(fixture.value);
  const saved = await Promise.all((await readdir(privateDirectory)).filter(n => /^runtime-2\d\d\.json$/.test(n)).sort()
    .map(async n => JSON.parse((await privateFile(n)).toString(), revive)));
  const select = (stage: string) => { const v = saved.filter(v => v.stage === stage).at(-1); assert(v); return v.value; };
  const a = select("instance-allocation"), c = select("ordinary-credentials-prepared"), finalCall = select("ordinary-credential-call-prepared");
  assert(finalCall.phase === "session-certification" && finalCall.acceptedCredentialTransactions === 18);
  finalCall.arguments[0] = BigInt(finalCall.arguments[0]);
  const restored = restoreCertifiedOrdinarySetup({ m4, allocated: a, prepared: c, finalCall: finalCall.arguments });
  const credentials = restored.setup.credentials!;
  const profile = new sdk.PreprodConnectionProfile(inputs.providerCredential, "http://127.0.0.1:6300");
  const { probePreprodTransports } = await import("./m6-preprod-transport.ts");
  const { PreprodConnectionProfile: ProbeProfile } = await import("../packages/midnight-authorization/src/preprod-profile.ts");
  const transportCheck=await probePreprodTransports(new ProbeProfile(inputs.providerCredential,"http://127.0.0.1:6300"));
  assert(transportCheck.http.passed&&transportCheck.nodeSubscription.passed&&transportCheck.indexerSubscription.passed);
  emit({phase:"fresh-read-only-transports-verified",http:true,nodeSubscription:true,indexerSubscription:true});
  setNetworkId("preprod"); const env = profile.environmentForSdk();
  const readOnly = indexerPublicDataProvider(env.indexer, env.indexerWS);
  phase = "thirty-two-finalized-journal-reconciliation";
  const events = (await Promise.all(["v2", "v3", "v4", "v6"].map(v => readFile(root + `/runtime-first-flow-${v}/client-public.jsonl`, "utf8"))))
    .join("\n").split("\n").flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
  const native = events.filter(e => e.kind === "m6-v10-ordinary-flow");
  const submitted = native.filter(e => e.phase === "submission-attempt"), finals = native.filter(e => e.phase === "finalized");
  assert(submitted.length === 32 && finals.length === 32);
  assert(new Set(finals.map(v=>v.transactionId)).size === 32);
  assert((await readdir(privateDirectory)).filter(n => /^wallet-\d{3}-submission\.json$/.test(n)).length === 32);
  assert(!(await readdir(privateDirectory)).some(n => /^wallet-033-/.test(n)));
  for (let i = 0; i < 32; i++) {
    const journal = JSON.parse((await privateFile(`wallet-${String(i + 1).padStart(3, "0")}-submission.json`)).toString());
    assert(JSON.stringify(journal).includes(finals[i].transactionId));
  }
  // Bounded read-only parallelism; never retry a native submission.
  for(let offset=0;offset<32;offset+=4) await Promise.all(finals.slice(offset,offset+4).map(async v=>{
    const final = await readOnly.watchForTxData(v.transactionId);
    assert.equal(final.status,"SucceedEntirely"); assert.equal(final.blockHeight,v.ledgerSequence);
  }));
  const address = "9a5b8e294e61463c5ce5948ba0120479dd69a582e0e7fc5f84c8c9c4197af3bc";
  assert(a.contractAddress === address);
  phase = "certified-chain-state-reconciliation";
  const indexed = await readOnly.queryContractState(address); assert(indexed);
  const view = sdk.readPermioAuthorizationLedger(indexed.data), record = view.runtimeInstances.lookup(a.allocation.instanceCommitment);
  assert.equal(view.runtimeInstances.size(), 1n); assert.equal(record.transitionSequence, 4n);
  assert.deepEqual(record.allocationCommitment, sdk.permioAuthorizationPureCircuits.runtimeInstanceAllocationCommitment(a.allocation));
  const originalInstanceRecord = record;
  const status = view.credentialStatusRoots.lookup(a.allocation.target.namespaceHash);
  assert.equal(status.rootSequence, 3n); assert.deepEqual(status.root, credentials.status.root);
  assert.equal(view.decisionReceipts.size(), 0n); assert.equal(view.usedRuntimeActionNullifiers.size(), 0n);
  assert.equal(view.runtimeActionSessions.size(), 0n); assert.equal(view.capabilityAttenuationSessions.size(), 0n);
  const empty = new sdk.RuntimePrivateMap();
  assert.equal(empty.count, 1n); assert.equal(credentials.binding.state.slotAssignmentCount, empty.count);
  assert.equal(credentials.binding.state.slotBindingCount, empty.count);
  assert.deepEqual(credentials.binding.state.slotAssignmentsRoot, empty.root);
  assert.deepEqual(credentials.binding.state.slotBindingsRoot, empty.root);
  const [registryKey, active] = [...view.activeTemplates][0]!; assert.equal(active.lifecycleStatus, 1n);
  const [moduleKey, moduleRecord] = [...view.proofModules][0]!; assert.equal(moduleRecord.lifecycleStatus, 4n);
  emit({ phase: "fresh-continuation-qualified", alreadyFinalized: 32, oldInstanceStateSequence: 4,
    originalEmptyMapSentinelCount: 1, credentialsRecreatedThroughActualM4M5Apis: true,
    allThirtyTwoFinalizedTransactionsRechecked: true, priorEntryReplayAllowed: false, newDeploymentAllowed: false });
  const policyHash = sdk.hashNamespacePolicy(m4.policy), bytes = (v: string) => Uint8Array.from(Buffer.from(v.slice(2), "hex"));
  const nsHash = sdk.hashProtocolIdentifier("namespace", a.instance.namespace);
  const authoritySpecs = [[3n,29n],[7n,101n],[7n,103n],[8n,107n],[8n,127n],[9n,109n],
    [10n,113n],[11n,149n],[11n,151n],[12n,157n],[5n,163n],[6n,173n],[4n,191n],[6n,197n],[6n,199n],[13n,211n]] as const;
  const leaves = authoritySpecs.map(([authorityKind,secret]) => ({ leafVersion:1n, namespaceHash:bytes(nsHash),
    governancePolicyHash:bytes(policyHash),authorityKind,publicKey:sdk.governanceActivatorPublicKey(secret),validAfter:1700000000n,validBefore:2000000000n }));
  const authority = sdk.buildAuthorityRoot(leaves);
  assert.deepEqual(authority.root, view.authorityRoots.lookup(bytes(nsHash)).root);
  const { createOrdinaryWalletTransport } = await import("./m6-ordinary-wallet-transport.ts");
  const { ordinaryActionProofProvider } = await import("./m6-ordinary-proof-provider.mjs");
  const { observeLocalProofProvider } = await import("./m6-proof-observation.ts");
  const wallet = await createOrdinaryWalletTransport({ privateDirectory, profile, submissionCap:62,
    resumeAfterThirtyTwoFinalized:{contractAddress:address},observe(v) { if(v.phase === "submission-attempt") attempts++;
      if(v.phase === "finalized") finalized++; emit(v); } });
  const providers = { ...sdk.createPreprodAuthorizationProviders(wallet,profile),
    proofProvider:observeLocalProofProvider(ordinaryActionProofProvider({port:6300,beforeProof:requestReset,afterProof:requestReset,
      observe:emit,async captureProvedTransaction(tx) {
        assert(++captured <= 30); await writeFile(privateDirectory + `/unbound-proved-fresh62-${String(captured).padStart(3,"0")}.bin`,
          tx.serialize(),{flag:"wx",mode:0o600});
      }}),(event,v)=>emit({event,...v}),3600000) };
  const contract = await sdk.connectPermioAuthorizationContract(providers,address);
  // All metadata/history/assets and fee-wallet identity checks precede the new clock.
  emit({phase:"fresh-preflight-complete",alreadyFinalized:32,remainingCap:30,clockStarted:false});
  if(mode === "--qualify-fresh-v1") {
    phase="fresh-fee-wallet-readiness";
    const snapshots=JSON.parse((await privateFile("rolling-wallet-snapshots.json")).toString());
    await sdk.withRestoredPreprodWallet(profile,inputs.secret,snapshots,async wallet=>{
      assert((await wallet.synchronize()).readyForTransactions);
    });
    emit({phase:"fresh-read-only-qualification-complete",allThirtyTwoFinalizedRechecked:true,
      feeWalletReadyAndClosed:true,clockStarted:false,nativeSubmissions:0});
    process.exit(0);
  }
  phase = "fresh-instance-allocation";
  const { SlotBoundContextAccountSystem } = await import("@permio/context-accounts");
  const createdAt=Math.floor(Date.now()/1000)-1;
  const requestId=`private-allocation-${randomBytes(16).toString("hex")}`;
  const authorization=m4.registry.authorizeInstantiation("allocator-one",m4.activation,requestId,createdAt);
  const system=new SlotBoundContextAccountSystem(m4.registry);
  const instance=system.createScenarioInstance({instanceId:`private-instance-${randomBytes(16).toString("hex")}`,
    instantiationRequestId:requestId,template:m4.record.template,expiresAt:createdAt+14400,
    capabilityIssuers:[{principalId:"fixture-capability-issuer",kind:"service"},
      {principalId:"fixture-secondary-issuer",kind:"service"}]},createdAt);
  const prepared=sdk.createRuntimeInstanceAllocation({authorization,templateRecord:m4.record,instance,
    allocatorAuthority:leaves[12]!,capabilityIssuers:[
      {principalId:"fixture-capability-issuer",kind:"service",authority:leaves[11]!},
      {principalId:"fixture-secondary-issuer",kind:"service",authority:leaves[13]!}],
    authorityRootVersion:1n,authorityRootSequence:1n,
    targetNetworkHash:bytes(sdk.hashProtocolIdentifier("network-id","preprod")),
    targetContractIdentity:Uint8Array.from(Buffer.from(address,"hex")),allocationValidBefore:createdAt+3600});
  const allocation=prepared.allocation;
  const allocationPolicy=sdk.createRuntimeAllocationPolicyWitness(m4.record.template,m4.bindings,prepared.stateOpening);
  await checkpoint("instance-allocation",{contractAddress:address,authorization,instance,allocation,stateOpening:prepared.stateOpening,policy:allocationPolicy});
  const allocated=await contract.callTx.allocateRuntimeInstance(allocation,sdk.signRuntimeInstanceAllocation(allocation,191n),
    leaves[12]!,authority.pathFor(allocation.allocatorAuthorityCommitment),allocationPolicy);
  const afterAllocation=await providers.publicDataProvider.queryContractState(address);assert(afterAllocation);
  const allocatedView=sdk.readPermioAuthorizationLedger(afterAllocation.data);
  assert.equal(allocatedView.runtimeInstances.size(),2n);
  assert.deepEqual(allocatedView.runtimeInstances.lookup(a.allocation.instanceCommitment),originalInstanceRecord);
  assert.equal(allocatedView.runtimeInstances.lookup(allocation.instanceCommitment).transitionSequence,0n);
  assert.deepEqual(allocatedView.credentialStatusRoots.lookup(a.allocation.target.namespaceHash),status);
  emit({event:"fresh-instance-allocated",transactionId:allocated.public.txId,freshInstanceStateSequence:0,
    oldInstancePreserved:true,instanceCount:2,expiresAtUtc:new Date(instance.expiresAt*1000).toISOString()});
  phase = "fresh-ordinary-action-workflow";
  const checked = await runOrdinaryActionWorkflow({ system, instance,template:m4.record.template,
    allocation,stateOpening:prepared.stateOpening,initialCredentialStatus:credentials.status,
    credentialStatusIndices:{account:10n,capability:11n,session:12n},
    issuers:prepared.issuers,authority,issuer:leaves[11]!,issuerSecret:173n,
    secondaryIssuer:leaves[13]!,secondaryIssuerSecret:197n,outsiderIssuer:leaves[14]!,outsiderIssuerSecret:199n,
    allocator:leaves[12]!,allocatorSecret:191n,allocationPolicy,contract,providers,address,
    governancePolicyHash:policyHash,network:"preprod",profile,checkpoint,emit:(event,v)=>emit({event,...v}) });
  phase = "disposable-template-module-cleanup";
  const pure = sdk.permioAuthorizationPureCircuits;
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
  const log=await readFile(root+"/runtime-first-flow-v7/client-public.jsonl","utf8");
  for(const sentinel of checked.privateSentinels)assert(!log.includes(sentinel));
  emit({event:"ordinary-action-first-flow-verified",contractAddress:address,contractTag:sdk.PERMIO_AUTHORIZATION_CONTRACT_TAG,
    exactIndexedCallAndReceiptVerified:true,privacyLogScanPassed:true,disposableTemplateAndModuleRevoked:true,fullM6Acceptance:false});
  assert(attempts===62&&finalized===62);assert((await privateFile("inputs.json")).equals(rawInputs));
  emit({phase:"first-flow-complete",attempts,finalized,commonReceiptVerified:true,fullM6Acceptance:false});
} catch(error) {
  await writeFile(privateDirectory+"/fresh62-continuation-private-error.json",JSON.stringify({phase,
    errorType:error instanceof Error?error.name:"unknown",message:error instanceof Error?error.message:"withheld",
    stack:error instanceof Error?error.stack:"withheld"}),{flag:"wx",mode:0o600});
  emit({phase:"failed",failedStage:phase,attempts,finalized,reconciliationRequired:attempts>finalized,
    automaticRetry:false,detailsPreservedPrivately:true}); process.exitCode=1;
} finally {process.exit(process.exitCode??0);}
