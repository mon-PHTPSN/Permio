// Actual public cost parameters for a preserved candidate. No submission.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
for(const key of ['log','warn','error','info','debug'] as const)console[key]=()=>{};
const emit=(value:unknown)=>process.stdout.write(JSON.stringify(value)+'\n');
let api:import('@polkadot/api').ApiPromise|undefined;const timer=setTimeout(()=>process.exit(2),60000);
try {
 const input=JSON.parse(await readFile('/opt/permio-m6-ordinary-action-20261018-v9/private/inputs.json','utf8'));
 const bytes=await readFile('/opt/permio-m6-ordinary-action-20261018-v9/private/wallet-001-balanced.bin');
 const {ApiPromise,WsProvider}=await import('@polkadot/api');
 const {PreprodConnectionProfile,PREPROD_GENESIS_HASH}=await import('../packages/midnight-authorization/src/preprod-profile.ts');
 const profile=new PreprodConnectionProfile(input.providerCredential);
 api=new ApiPromise({provider:new WsProvider(profile.environmentForSdk().nodeWS),throwOnConnect:false,noInitWarn:true});
 await api.isReadyOrError;assert(api.genesisHash.toHex()===PREPROD_GENESIS_HASH);
 const methods=api.call.midnightRuntimeApi!;
 for(const name of ['getLedgerVersion','getTransactionCost','getLedgerParameters']){
  try {
   const call=methods[name]!;
   const result=await (name==='getTransactionCost'?call('0x'+bytes.toString('hex')):call());
   const value=result.toJSON();
   // Parameters are public. Avoid dumping the large serialized parameter blob.
   emit({stage:name,...(name==='getLedgerParameters'?{available:true,encodedBytes:result.encodedLength}:{value}),submitted:0});
  } catch(error) {
   const text=(error instanceof Error?error.message:'').replace(/(?:https?|wss?):\/\/[^\s"')]+/gi,'[endpoint withheld]')
    .replace(/nightpreprod[A-Za-z0-9_-]+/g,'[credential withheld]').replace(/(?:0x)?[a-fA-F0-9]{48,}/g,'[hex withheld]').slice(0,600);
   emit({stage:name,available:false,safeMessage:text,submitted:0});
  }
 }
}catch{emit({stage:'failed',detailsWithheld:true,submitted:0});process.exitCode=1;}
finally{await api?.disconnect().catch(()=>{});clearTimeout(timer);}
