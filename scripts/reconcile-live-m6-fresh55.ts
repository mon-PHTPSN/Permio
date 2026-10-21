import assert from "node:assert/strict";
import {lstat,readFile,writeFile} from "node:fs/promises";
import {indexerPublicDataProvider} from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import {setNetworkId} from "@midnight-ntwrk/midnight-js-network-id";
import {PreprodConnectionProfile} from "../packages/midnight-authorization/src/preprod-profile.ts";
import {ledger} from "../packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js";
const root="/opt/permio-m6-governance-20261018-v10",privateDirectory=root+"/private";
for(const key of ["log","warn","info","error","debug"] as const)console[key]=()=>{};
const report:Record<string,unknown>={kind:"m6-fresh55-read-only-reconciliation",observedAtUtc:new Date().toISOString(),nativeSubmissions:0};
const timeout=<T>(p:Promise<T>,ms=45000)=>Promise.race([p,new Promise<never>((_,reject)=>setTimeout(()=>reject(Error("read-timeout")),ms).unref())]);
try {
 assert(process.platform==="linux"&&process.cwd()===root+"/client");
 const p=privateDirectory+"/inputs.json",s=await lstat(p);assert(s.uid===0&&(s.mode&0o777)===0o600&&!s.isSymbolicLink());
 const input=JSON.parse(await readFile(p,"utf8"));assert(input.networkId==="preprod"&&input.testOnlyProvenance.includes("disposable Preprod test"));
 const env=new PreprodConnectionProfile(input.providerCredential).environmentForSdk();setNetworkId("preprod");
 const provider=indexerPublicDataProvider(env.indexer,env.indexerWS);
 const journal=JSON.parse(await readFile(privateDirectory+"/wallet-055-submission.json","utf8"));
 const txs=[];
 for(const id of journal.transactionIds as string[]) {
  assert(/^[0-9a-f]{66}$/.test(id));
  const response=await fetch(env.indexer,{method:"POST",headers:{"content-type":"application/json"},signal:AbortSignal.timeout(30000),
   body:JSON.stringify({query:`query Reconcile($offset: TransactionOffset!) { transactions(offset:$offset) { protocolVersion hash block {hash height} contractActions {__typename address ... on ContractCall {entryPoint}} ... on RegularTransaction {identifiers transactionResult {status}} } }`,variables:{offset:{identifier:id}}})});
  const result=await response.json() as any;
  const matches=(result.data?.transactions??[]).filter((v:any)=>v.identifiers?.some((x:string)=>x.replace(/^0x/,"")===id));
  txs.push({identifier:id,httpStatus:response.status,graphErrors:result.errors?.length??0,matches:matches.map((v:any)=>({protocolVersion:v.protocolVersion,
   hash:v.hash,identifiers:v.identifiers,result:v.transactionResult?.status,block:v.block,
   calls:v.contractActions?.map((a:any)=>({kind:a.__typename,address:a.address,entryPoint:a.entryPoint}))}))});
 }
 report.exactIdentifierQueries=txs;
 const state=await timeout(provider.queryContractState("9a5b8e294e61463c5ce5948ba0120479dd69a582e0e7fc5f84c8c9c4197af3bc"));assert(state);
 const v=ledger(state.data);
 report.currentLedger={instances:Number(v.runtimeInstances.size()),instanceSequences:[...v.runtimeInstances].map(([,r])=>String(r.transitionSequence)),
  credentialRootSequences:[...v.credentialStatusRoots].map(([,r])=>String(r.rootSequence)),actionSessions:Number(v.runtimeActionSessions.size()),
  receiptCount:Number(v.decisionReceipts.size()),nullifierCount:Number(v.usedRuntimeActionNullifiers.size())};
 const request=await fetch(env.node,{method:"POST",headers:{"content-type":"application/json"},signal:AbortSignal.timeout(20000),
  body:JSON.stringify({jsonrpc:"2.0",id:1,method:"author_pendingExtrinsics",params:[]})});
 const pending=await request.json() as any;
 report.nodePool={httpStatus:request.status,rpcErrorCode:pending.error?.code,pendingCount:Array.isArray(pending.result)?pending.result.length:null};
 report.readsCompleted=true;
}catch(error){report.readsCompleted=false;report.errorType=error instanceof Error?error.name:"unknown";}
await writeFile(root+"/fresh55-read-only-reconciliation-v1.json",JSON.stringify(report,null,2)+"\n",{flag:"wx",mode:0o600});
process.stdout.write(JSON.stringify(report)+"\n");process.exit(report.readsCompleted?0:1);
