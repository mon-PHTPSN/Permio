// Inspect a preserved balanced candidate. Never sign, balance or submit it.
import assert from 'node:assert/strict';
import { lstat, readFile } from 'node:fs/promises';
for(const key of ['log','warn','error','info','debug'] as const)console[key]=()=>{};
const emit=(value:unknown)=>process.stdout.write(JSON.stringify(value)+'\n');
const root='/opt/permio-m6-ordinary-action-20261018-v9',directory=root+'/private';
assert(process.platform==='linux');
let phase='private-input',api:import('@polkadot/api').ApiPromise|undefined;
const deadline=setTimeout(()=>{emit({result:'FAIL',stage:phase,reason:'timeout',submitted:0});process.exit(1);},60000);
try {
 const input=JSON.parse(await readFile(directory+'/inputs.json','utf8'));
 assert(input.networkId==='preprod'&&input.testOnlyProvenance.includes('disposable Preprod test'));
 const file=directory+'/wallet-001-balanced.bin',meta=await lstat(file);
 assert(meta.isFile()&&!meta.isSymbolicLink()&&meta.uid===0&&(meta.mode&0o777)===0o600);
 const bytes=await readFile(file);
 const {ApiPromise,WsProvider}=await import('@polkadot/api');
 const {PreprodConnectionProfile,PREPROD_GENESIS_HASH}=await import('../packages/midnight-authorization/src/preprod-profile.ts');
 const profile=new PreprodConnectionProfile(input.providerCredential);
 phase='node-readiness';api=new ApiPromise({provider:new WsProvider(profile.environmentForSdk().nodeWS),throwOnConnect:false,noInitWarn:true});
 await api.isReadyOrError;assert(api.genesisHash.toHex()===PREPROD_GENESIS_HASH);
 phase='runtime-metadata';const method=api.call.taggedTransactionQueue?.validateTransaction;assert(method);
 const metadata=(method as typeof method&{meta:{params:{name:{toString():string};type:{toString():string}}[]}}).meta;
 emit({stage:phase,parameters:metadata.params.map(p=>({name:p.name.toString(),type:p.type.toString()})),submitted:0});
 phase='finalized-head';const blockHash=await api.rpc.chain.getFinalizedHead();
 phase='substrate-wrapper';const extrinsic=api.tx.midnight!.sendMnTransaction!('0x'+bytes.toString('hex'));
 emit({stage:phase,nativeBytes:bytes.length,substrateBytes:extrinsic.encodedLength,submitted:0});
 phase='runtime-validation-request';const validation=await method('External',extrinsic.toHex(),blockHash);
 phase='runtime-validation-result';
 const value=validation.toJSON() as {ok?:unknown;err?:{invalid?:unknown;unknown?:unknown}};
 const rejected=value.err?.invalid??value.err?.unknown;
 const custom=typeof rejected==='object'&&rejected!==null?(rejected as {custom?:unknown}).custom:undefined;
 emit({stage:phase,accepted:Object.hasOwn(value,'ok'),rejection:
  typeof rejected==='string'&&/^[A-Za-z]{1,40}$/.test(rejected)?rejected:undefined,
  ...(typeof custom==='number'&&Number.isInteger(custom)&&custom>=0&&custom<=255?{customCode:custom}:{}),submitted:0});
} catch(error) {
 const {classifyPreprodSubmissionFailure}=await import('../packages/midnight-authorization/src/preprod-submission-failure.ts');
 const message=error instanceof Error?error.message:'';
 const labels=[['missing-method',/not a function|not found|MethodNotFound/i],['codec',/createType|codec|decode|encode|SpRuntimeUncheckedExtrinsic/i],
  ['assertion',/AssertionError|assertion/i],['runtime-trap',/trap|Runtime error|wasm/i],['rpc-denied',/forbidden|unauthori[sz]ed|not allowed/i]] as const;
 const sanitized=message.replace(/(?:https?|wss?):\/\/[^\s"')]+/gi,'[endpoint withheld]')
  .replace(/nightpreprod[A-Za-z0-9_-]+/g,'[credential withheld]').replace(/(?:0x)?[a-fA-F0-9]{48,}/g,'[hex withheld]');
 emit({result:'FAIL',stage:phase,diagnostic:classifyPreprodSubmissionFailure(error),safeMessage:sanitized.slice(0,800),
  matchedPatterns:labels.filter(([,pattern])=>pattern.test(message)).map(([label])=>label),
  safeName:error instanceof Error&&/^[A-Za-z]+$/.test(error.name)?error.name:undefined,submitted:0,rawMessageWithheld:true});
 process.exitCode=1;
} finally {await api?.disconnect().catch(()=>{});clearTimeout(deadline);}
