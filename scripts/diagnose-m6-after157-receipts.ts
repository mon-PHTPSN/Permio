import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {setNetworkId} from "@midnight-ntwrk/midnight-js-network-id";
import {indexerPublicDataProvider} from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import * as sdk from "@permio/midnight-authorization";
for(const k of ["log","warn","error","info","debug"]as const)console[k]=()=>{};
const root="/opt/permio-m6-remaining-preprod-20261019-v1";
const input=JSON.parse(await readFile(root+"/private/inputs.json","utf8"));assert(input.networkId==="preprod"&&input.testOnlyProvenance.includes("disposable Preprod test"));
const profile=new sdk.PreprodConnectionProfile(input.providerCredential);setNetworkId("preprod");const env=profile.environmentForSdk(),provider=indexerPublicDataProvider(env.indexer,env.indexerWS);
const norm=(s:any)=>typeof s==="string"?s.replace(/^0x/u,""):"";
const results=[];
for(const round of [50,86,147]){
 let stage="finality";
 try{
  const journal=JSON.parse(await readFile(root+`/private/wallet-${String(round).padStart(3,"0")}-submission.json`,"utf8")),id=journal.transactionIds.at(-1);
  const finalized=await provider.watchForTxData(id);stage="exact-receipt-query";
  const response=await fetch(env.indexer,{method:"POST",headers:{"content-type":"application/json"},signal:AbortSignal.timeout(30_000),body:JSON.stringify({query:`query DecisionReceiptSource($offset: TransactionOffset!) {transactions(offset: $offset) { protocolVersion raw hash block { hash height } contractActions { __typename address state ... on ContractCall { entryPoint } } ... on RegularTransaction { identifiers transactionResult { status } } }}`,variables:{offset:{identifier:id}}})});
  const text=await response.text();let payload:any;try{payload=JSON.parse(text);}catch{}
  const matches=payload?.data?.transactions?.filter((v:any)=>v.identifiers?.some((x:any)=>norm(x)===id));const tx=matches?.[0];
  results.push({round,stage,httpStatus:response.status,responseBytes:text.length,hasErrors:Array.isArray(payload?.errors)&&payload.errors.length>0,
   errorCodes:payload?.errors?.map((e:any)=>e.extensions?.code??null),errorNames:payload?.errors?.map((e:any)=>String(e.message??"").replace(/(?:https?|wss?):\/\/\S+/gu,"<URL>").replace(/(?:0x)?[a-fA-F0-9]{48,}/gu,"<HEX>").slice(0,180)),matches:matches?.length,
   finalizedStatus:finalized.status,protocolVersion:tx?.protocolVersion,transactionStatus:tx?.transactionResult?.status,
   transactionHashMatches:tx?norm(tx.hash)===norm(finalized.txHash):null,blockHashMatches:tx?norm(tx.block?.hash)===norm(finalized.blockHash):null,
   heightMatches:tx?tx.block?.height===finalized.blockHeight:null,actions:tx?.contractActions?.map((a:any)=>({type:a.__typename,addressMatches:norm(a.address)==="70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c",entry:a.entryPoint})),nativeSubmissions:0});
 }catch(error){results.push({round,stage,errorName:error instanceof Error?error.name:"unknown",detailsWithheld:true,nativeSubmissions:0});}
}
process.stdout.write(JSON.stringify({results,nativeSubmissions:0})+"\n");
