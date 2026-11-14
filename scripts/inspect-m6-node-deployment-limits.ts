import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
for(const key of ['log','warn','error','info','debug'] as const)console[key]=()=>{};
const emit=(value:unknown)=>process.stdout.write(JSON.stringify(value)+'\n');
let api:import('@polkadot/api').ApiPromise|undefined;
const timer=setTimeout(()=>process.exit(2),90000);
try {
 const input=JSON.parse(await readFile('/opt/permio-m6-ordinary-action-20261018-v9/private/inputs.json','utf8'));
 const bytes=await readFile('/opt/permio-m6-ordinary-action-20261018-v9/private/wallet-001-balanced.bin');
 const {ApiPromise,WsProvider}=await import('@polkadot/api');
 const {PreprodConnectionProfile,PREPROD_GENESIS_HASH}=await import('../packages/midnight-authorization/src/preprod-profile.ts');
 const profile=new PreprodConnectionProfile(input.providerCredential);
 api=new ApiPromise({provider:new WsProvider(profile.environmentForSdk().nodeWS),throwOnConnect:false,noInitWarn:true});
 await api.isReadyOrError;assert(api.genesisHash.toHex()===PREPROD_GENESIS_HASH);
 const methods=(await api.rpc.rpc.methods()).methods.map(v=>v.toString());
 emit({stage:'block-limits',blockWeights:api.consts.system!.blockWeights!.toJSON(),blockLength:api.consts.system!.blockLength!.toJSON(),submitted:0});
 const extrinsic=api.tx.midnight!.sendMnTransaction!('0x'+bytes.toString('hex'));
 emit({stage:'available-cost-apis',paymentQueryInfo:methods.includes('payment_queryInfo'),
  midnightRuntimeMethods:Object.keys(api.call).filter(key=>/midnight/i.test(key)).map(key=>({key,methods:Object.keys(api!.call[key]!)})),submitted:0});
 if(methods.includes('payment_queryInfo')) {
  try {emit({stage:'dispatch-info',info:(await api.rpc.payment.queryInfo(extrinsic.toHex())).toJSON(),submitted:0});}
  catch {emit({stage:'dispatch-info',available:false,detailsWithheld:true,submitted:0});}
 }
 if(methods.includes('system_dryRun')) {
  try {emit({stage:'system-dry-run',result:(await api.rpc.system.dryRun(extrinsic.toHex())).toJSON(),submitted:0});}
  catch {emit({stage:'system-dry-run',available:false,detailsWithheld:true,submitted:0});}
 }
} catch {emit({stage:'limit-inspection-failed',detailsWithheld:true,submitted:0});process.exitCode=1;}
finally {await api?.disconnect().catch(()=>{});clearTimeout(timer);}
