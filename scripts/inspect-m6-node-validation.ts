// Read-only runtime metadata. No wallet, transaction or token-bearing output.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
for (const key of ['log','warn','error','info','debug'] as const) console[key]=()=>{};
const emit=(value:unknown)=>process.stdout.write(JSON.stringify(value)+'\n');
const deadline=setTimeout(()=>{emit({result:'FAIL',stage:'metadata-timeout'});process.exit(1);},60000);
let api:import('@polkadot/api').ApiPromise|undefined;
try {
 const {parse}=await import('dotenv');
 const config=parse(await readFile(path.resolve('../information-flow/.env'),'utf8'));
 const {PreprodConnectionProfile,PREPROD_GENESIS_HASH}=await import('../packages/midnight-authorization/src/preprod-profile.ts');
 const {ApiPromise,WsProvider}=await import('@polkadot/api');
 const profile=new PreprodConnectionProfile(config.BLOCKFROST_PROJECT_ID!);
 api=new ApiPromise({provider:new WsProvider(profile.environmentForSdk().nodeWS),throwOnConnect:false,noInitWarn:true});
 await api.isReadyOrError;assert(api.genesisHash.toHex()===PREPROD_GENESIS_HASH);
 const method=api.call.taggedTransactionQueue?.validateTransaction;
 assert(method);
 const meta=(method as typeof method & {meta:{params:{name:{toString():string};type:{toString():string}}[];type:{toString():string}}}).meta;
 emit({result:'PASS',genesisVerified:true,validationMethodAvailable:true,
  parameters:meta.params.map(p=>({name:p.name.toString(),type:p.type.toString()})),
  returnType:meta.type.toString(),walletInitialized:false,transactionsSubmitted:0});
} catch {emit({result:'FAIL',stage:'runtime-metadata',detailsWithheld:true});process.exitCode=1;}
finally {await api?.disconnect().catch(()=>{});clearTimeout(deadline);}
