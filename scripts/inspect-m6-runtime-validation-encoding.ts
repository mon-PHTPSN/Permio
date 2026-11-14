// Read-only controls for the preserved candidate; no signing/proving/submission.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
for(const key of ['log','warn','error','info','debug'] as const)console[key]=()=>{};
const emit=(value:unknown)=>process.stdout.write(JSON.stringify(value)+'\n');
const root='/opt/permio-m6-ordinary-action-20261018-v9';
let api:import('@polkadot/api').ApiPromise|undefined;
const timer=setTimeout(()=>process.exit(2),90000);
const safe=(message:string)=>message.replace(/(?:https?|wss?):\/\/[^\s"')]+/gi,'[endpoint withheld]')
 .replace(/nightpreprod[A-Za-z0-9_-]+/g,'[credential withheld]').replace(/(?:0x)?[a-fA-F0-9]{48,}/g,'[hex withheld]').slice(0,650);
try {
 const input=JSON.parse(await readFile(root+'/private/inputs.json','utf8'));
 const bytes=await readFile(root+'/private/wallet-001-balanced.bin');
 const {ApiPromise,WsProvider}=await import('@polkadot/api');
 const {PreprodConnectionProfile,PREPROD_GENESIS_HASH}=await import('../packages/midnight-authorization/src/preprod-profile.ts');
 const profile=new PreprodConnectionProfile(input.providerCredential);
 api=new ApiPromise({provider:new WsProvider(profile.environmentForSdk().nodeWS),throwOnConnect:false,noInitWarn:true});
 await api.isReadyOrError;assert(api.genesisHash.toHex()===PREPROD_GENESIS_HASH);
 emit({stage:'runtime-version',specVersion:api.runtimeVersion.specVersion.toString(),transactionVersion:api.runtimeVersion.transactionVersion.toString(),submitted:0});
 const methods=await api.rpc.rpc.methods();
 emit({stage:'supported-rpc',methods:methods.methods.map(x=>x.toString()).filter(x=>/midnight|dryrun|valid/i.test(x)),submitted:0});
 const method=api.call.taggedTransactionQueue!.validateTransaction!;
 const meta=(method as typeof method&{meta:{params:{type:{toString():string}}[];type:{toString():string}}}).meta;
 const hash=await api.rpc.chain.getFinalizedHead();
 for(const [label,extrinsic] of [['midnight-candidate',api.tx.midnight!.sendMnTransaction!('0x'+bytes.toString('hex'))],
  ['unsigned-remark-control',api.tx.system!.remark!('0x00')]] as const){
  const source=api.registry.createType(meta.params[0]!.type.toString(),'External').toU8a();
  const raw=extrinsic.toU8a(),encoded=api.registry.createType(meta.params[1]!.type.toString(),extrinsic.toHex()).toU8a();
  const blockHash=api.registry.createType(meta.params[2]!.type.toString(),hash).toU8a();
  emit({stage:'argument-encoding',label,rawExtrinsicBytes:raw.length,metadataEncodedBytes:encoded.length,
   metadataMatchesRaw:Buffer.from(raw).equals(Buffer.from(encoded)),sourceBytes:source.length,blockHashBytes:blockHash.length,submitted:0});
  const payload=Buffer.concat([source,raw,blockHash]);
  try {
   const answer=await api.rpc.state.call('TaggedTransactionQueue_validate_transaction','0x'+payload.toString('hex'));
   const decoded=api.registry.createType(meta.type.toString(),answer.toHex()).toJSON() as {ok?:unknown;err?:unknown};
   emit({stage:'raw-scale-validation',label,accepted:Object.hasOwn(decoded,'ok'),error:decoded.err,submitted:0});
  }catch(error){emit({stage:'raw-scale-validation',label,failed:true,safeMessage:safe(error instanceof Error?error.message:''),submitted:0});}
 }
} catch(error){emit({stage:'control-failed',safeMessage:safe(error instanceof Error?error.message:''),submitted:0});process.exitCode=1;}
finally {await api?.disconnect().catch(()=>{});clearTimeout(timer);}
