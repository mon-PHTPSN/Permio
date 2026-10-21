import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath, rename, unlink, writeFile } from "node:fs/promises";
import { createServer, type Socket } from "node:net";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";
import { WarmPreparationBudget } from "./m6-warm-preparation-budget.ts";
import type { UnboundTransaction } from "@midnight-ntwrk/midnight-js-types";

const ROOT="/opt/permio-m6-governance-20261018-v10", PRIVATE=ROOT+"/private";
const UNIT="permio-m6-ordinary-warm-wallet-v3.service", SOCKET=PRIVATE+"/warm-preparations-v3.sock";
const hash=(v:Uint8Array)=>createHash("sha256").update(v).digest("hex");
async function privateFile(name:string) {
  assert(/^[a-z0-9.-]+$/.test(name));const p=PRIVATE+"/"+name,s=await lstat(p);
  assert(s.isFile()&&!s.isSymbolicLink()&&s.uid===0&&(s.mode&0o777)===0o600&&await realpath(p)===p);return readFile(p);
}
async function main() {
  assert(process.platform==="linux"&&process.cwd()===PRIVATE&&process.argv[2]==="--service");
  for(const name of ["log","error","warn","info","debug"] as const)console[name]=()=>{};
  const group="/sys/fs/cgroup/system.slice/"+UNIT;
  assert((await readFile("/proc/self/cgroup","utf8")).trim()==="0::/system.slice/"+UNIT);
  const report:Record<string,unknown>={kind:"owned-fresh-credential-preparation-wallet-session",startedAtUtc:new Date().toISOString(),
    firstRound:56,lastRound:58,existingTestWalletReused:true,newAuthority:false,newDeployments:0,automaticSubmissionRetries:false,
    oneWalletOperationAtATime:true,privateUnixSocketOnly:true,closedBeforeLargestActionProofRequired:true,finalizedRounds:[]};
  let saveChain=Promise.resolve();
  const save=()=>saveChain=saveChain.then(async()=>{
    const p=ROOT+"/warm-preparation-wallet-report-v3.writing";
    await writeFile(p,JSON.stringify(report,null,2)+"\n",{mode:0o600});await rename(p,ROOT+"/warm-preparation-wallet-report-v3.json");
  });
  let ready=false,activeSocket:Socket|undefined,stop=false,lastPolicy="",policyBusy=false;
  async function policy() {
    if(policyBusy)return;policyBusy=true;
    try {
      const numbers=(await readdir(ROOT+"/control")).filter(n=>/^reset-\d{3}\.verified\.json$/.test(n)).sort();
      const n=numbers.length,low=ready&&n%2===1,key=low?(false?"credential-proof-paged":"large-proof-paged"):"wallet-active";
      if(key!==lastPolicy) {
        await writeFile(group+"/memory.high",String(low?(false?1024**3:256*1024**2):2*1024**3)+"\n");
        await writeFile(group+"/cpu.max",low?"50000 100000\n":"200000 100000\n");
        lastPolicy=key;report.resourcePolicy=key;await save();
      }
    }finally{policyBusy=false;}
  }
  function send(socket:Socket,value:unknown){assert(!socket.destroyed);socket.write(JSON.stringify(value)+"\n");}
  let queued:{round:number;socket:Socket;lines:AsyncIterableIterator<string>}|undefined;
  let wake:(()=>void)|undefined;
  const server=createServer(socket=>{
    const lines=createInterface({input:socket,crlfDelay:Infinity})[Symbol.asyncIterator]();
    void (async()=>{
      const first=await lines.next();assert(!first.done);const hello=JSON.parse(first.value);
      assert(!activeSocket&&!queued&&hello.operation==="prepare-only"&&Number.isInteger(hello.round)&&hello.round>=56&&hello.round<=58);
      activeSocket=socket;queued={round:hello.round,socket,lines};wake?.();
    })().catch(()=>socket.destroy());
  });
  await new Promise<void>((resolve,reject)=>{server.once("error",reject);server.listen(SOCKET,resolve);});
  const {chmod}=await import("node:fs/promises");await chmod(SOCKET,0o600);
  let pendingFinal:Record<string,unknown>|undefined;
  const timer=setInterval(()=>{void policy().catch(()=>{stop=true;wake?.();});},2000);
  let result=1;
  try {
    await policy();await save();
    const inputs=JSON.parse((await privateFile("inputs.json")).toString());
    assert(inputs.networkId==="preprod"&&inputs.testOnlyProvenance.includes("disposable Preprod test"));
    const snapshots=JSON.parse((await privateFile("rolling-wallet-snapshots.json")).toString());
    await import("@midnight-ntwrk/testkit-js");
    const sdk=await import("@permio/midnight-authorization");
    const {Transaction,ContractCall}=await import("@midnight-ntwrk/midnight-js-protocol/ledger");
    const {setNetworkId}=await import("@midnight-ntwrk/midnight-js-network-id");setNetworkId("preprod");
    const profile=new sdk.PreprodConnectionProfile(inputs.providerCredential,"http://127.0.0.1:6300");
    const budget=new WarmPreparationBudget(56);
    await sdk.withRestoredPreprodWallet(profile,inputs.secret,snapshots,async wallet=>{
      assert((await wallet.synchronize()).readyForTransactions);ready=true;
      const header=JSON.parse(snapshots.shielded);
      assert(wallet.getCoinPublicKey()===header.publicKeys.coinPublicKey&&wallet.getEncryptionPublicKey()===header.publicKeys.encryptionPublicKey);
      report.stage="ready-for-fresh-credential-preparations";await policy();await save();
      for(let round=56;round<=58;round++) {
        while(!queued&&!stop)await new Promise<void>(resolve=>{wake=resolve;});assert(!stop&&queued);
        const job=queued;queued=undefined;wake=undefined;assert(job.round===round);
        const {socket,lines}=job,number=String(round).padStart(3,"0");
        assert((await readdir(ROOT+"/control")).filter(n=>/^reset-\d{3}\.verified\.json$/.test(n)).length===2*(round-55));
        assert((await readdir(PRIVATE)).filter(n=>/^wallet-\d{3}-submission\.json$/.test(n)).length===round-1);
        const bytes=await privateFile(`wallet-${number}-unbound.bin`);
        const unbound=Transaction.deserialize("signature","proof","pre-binding",bytes) as UnboundTransaction;
        assert(Buffer.from(unbound.serialize()).equals(bytes));
        const actions=[...(unbound.intents?.values()??[])].flatMap(v=>v.actions);assert(actions.length===1&&actions[0] instanceof ContractCall);
        const call=actions[0],entry=typeof call.entryPoint==="string"?call.entryPoint:Buffer.from(call.entryPoint).toString("utf8");
        budget.begin(round,call.address,entry);
        const providers=sdk.createPreprodAuthorizationProviders(wallet,profile,
          stage=>send(socket,{phase:"wallet-sdk-stage",stage}),diagnostic=>send(socket,{phase:"submission-diagnostic",diagnostic}));
        report.stage="balancing";report.activeRound=round;await save();
        const balanced=await providers.walletProvider.balanceTx(unbound),balancedBytes=Buffer.from(balanced.serialize());
        await writeFile(PRIVATE+`/wallet-${number}-balanced.bin`,balancedBytes,{flag:"wx",mode:0o600});
        const {validateOrdinaryBalancedTransaction}=await import("./m6-ordinary-node-validation.ts");
        const validation=await validateOrdinaryBalancedTransaction(profile,balancedBytes,0);
        send(socket,{phase:"read-only-node-validation",...validation,transactionSubmitted:false});assert(validation.accepted);
        const digest=hash(balancedBytes);budget.balanced(round,digest);send(socket,{phase:"balanced",sha256:digest});
        const next=await lines.next();assert(!next.done);const command=JSON.parse(next.value);
        assert(command.operation==="submit-exact-balanced-once"&&command.round===round);
        budget.submit(round,command.sha256);assert(hash(balanced.serialize())===digest);
        const transactionIds=balanced.identifiers();
        await writeFile(PRIVATE+`/wallet-${number}-submission.json`,JSON.stringify({transactionIds,attemptedAtUtc:new Date().toISOString(),
          balancedSha256:digest,submittedAtMostOnce:true,warmSession:true}),{flag:"wx",mode:0o600});
        send(socket,{phase:"submission-attempt",transactionIds});
        const {submitOnceAndReconcile}=await import("./m6-submit-once-reconcile.ts");
        const transactionId=await submitOnceAndReconcile({transaction:balanced,submit:()=>providers.midnightProvider.submitTx(balanced),
          readFinal:id=>providers.publicDataProvider.watchForTxData(id),observe:value=>send(socket,value)});assert(transactionIds.includes(transactionId));
        send(socket,{phase:"submission-returned",transactionId});
        const final=await providers.publicDataProvider.watchForTxData(transactionId);assert(final.status==="SucceedEntirely"&&final.identifiers.includes(transactionId));
        budget.finalized(round);const finalized={phase:"finalized",transactionId,ledgerSequence:final.blockHeight};
        (report.finalizedRounds as unknown[]).push({round,transactionId,ledgerSequence:final.blockHeight});await save();
        if(round<58) {send(socket,finalized);send(socket,{control:"job-complete",walletSessionRetained:true});socket.end();activeSocket=undefined;}
        else pendingFinal=finalized;
      }
    },stage=>{report.lastCheckpointStage=stage;void save();},async snapshots=>{
      const p=PRIVATE+"/rolling-wallet-snapshots.writing.json";
      await writeFile(p,JSON.stringify(snapshots),{flag:"wx",mode:0o600});await rename(p,PRIVATE+"/rolling-wallet-snapshots.json");
      report.finalPrivateCheckpointSaved=true;
    });
    assert(pendingFinal&&activeSocket);report.walletComponentsClosed=true;report.stage="closed-before-largest-proof";await save();
    send(activeSocket,pendingFinal);send(activeSocket,{control:"job-complete",walletSessionRetained:false});activeSocket.end();activeSocket=undefined;
    result=0;
  }catch(error) {
    report.errorType=error instanceof Error?error.name:"unknown";report.stage="failed-reconcile-before-continuing";
    if(activeSocket&&!activeSocket.destroyed) {send(activeSocket,{phase:"failed",failedStage:"fresh-credential-preparation-wallet-session",detailsWithheld:true});activeSocket.end();}
    await writeFile(PRIVATE+"/warm-wallet-private-error-v3.json",JSON.stringify({message:error instanceof Error?error.message:"unknown",
      stack:error instanceof Error?error.stack:undefined}),{flag:"wx",mode:0o600});
  }finally {
    clearInterval(timer);server.close();report.endedAtUtc=new Date().toISOString();report.exitCode=result;await save();
    try {const s=await lstat(SOCKET);assert(s.isSocket()&&s.uid===0&&(s.mode&0o777)===0o600);await unlink(SOCKET);}
    catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
  }
  process.exit(result);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
