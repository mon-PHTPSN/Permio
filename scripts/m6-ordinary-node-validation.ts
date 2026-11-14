import assert from 'node:assert/strict';
import { ApiPromise, WsProvider } from '@polkadot/api';
import type { PreprodConnectionProfile } from '@permio/midnight-authorization';
import { PREPROD_GENESIS_HASH } from '../packages/midnight-authorization/src/preprod-profile.ts';

type ValidationMetadata = {params:{name:{toString():string};type:{toString():string}}[];type:{toString():string}};

/** The runtime consumes an UncheckedExtrinsic directly. Metadata's Vec<u8>
 * codec would add a second length prefix and trap before validation runs. */
export function encodeOrdinaryValidationArguments(registry: Pick<ApiPromise['registry'],'createType'>,
 metadata: ValidationMetadata, extrinsic: {toU8a():Uint8Array}, blockHash: unknown) {
 assert.deepEqual(metadata.params.map(p=>p.name.toString()),['source','tx','block_hash']);
 return Buffer.concat([
  registry.createType(metadata.params[0]!.type.toString(),'External').toU8a(),
  extrinsic.toU8a(),
  registry.createType(metadata.params[2]!.type.toString(),blockHash).toU8a()
 ]);
}

/** Never publish transaction-pool provides/requires data or arbitrary error text. */
export function summarizeOrdinaryValidation(value: unknown) {
 if(typeof value!=='object'||value===null)throw Error('Unexpected runtime validation result');
 const result=value as {ok?:unknown;err?:{invalid?:unknown;unknown?:unknown}};
 if(Object.hasOwn(result,'ok')&&!Object.hasOwn(result,'err'))return {accepted:true as const};
 const error=result.err?.invalid??result.err?.unknown;
 const known=new Set(['call','payment','future','stale','badProof','ancientBirthBlock',
  'exhaustsResources','custom','badMandatory','mandatoryValidation','badSigner',
  'cannotLookup','noUnsignedValidator']);
 const variant=typeof error==='string'?error:
  typeof error==='object'&&error!==null&&Object.keys(error).length===1?Object.keys(error)[0]:undefined;
 const custom=typeof error==='object'&&error!==null?(error as {custom?:unknown}).custom:undefined;
 return {accepted:false as const,rejection:variant&&known.has(variant)?variant:'runtime-validation-error',
  ...(variant==='custom'&&typeof custom==='number'&&Number.isInteger(custom)&&custom>=0&&custom<=255?{customCode:custom}:{})};
}

/** Read-only validation of the exact unsigned Substrate wrapper used by the pinned SDK. */
export async function validateOrdinaryBalancedTransaction(profile: PreprodConnectionProfile, bytes: Uint8Array, minimumHeadroomPercent=0) {
 assert(Number.isInteger(minimumHeadroomPercent)&&minimumHeadroomPercent>=0&&minimumHeadroomPercent<=100);
 let api:ApiPromise|undefined, timer:ReturnType<typeof setTimeout>|undefined;
 try {
  api=new ApiPromise({provider:new WsProvider(profile.environmentForSdk().nodeWS),throwOnConnect:false,noInitWarn:true});
  const result=await Promise.race([(async()=>{
   await api!.isReadyOrError;assert(api!.genesisHash.toHex()===PREPROD_GENESIS_HASH);
   const method=api!.call.taggedTransactionQueue?.validateTransaction as
    ((...args:unknown[])=>Promise<{toJSON():unknown}>) & {meta:ValidationMetadata};
   assert(method);
   const blockHash=await api!.rpc.chain.getFinalizedHead();
   const extrinsic=api!.tx.midnight!.sendMnTransaction!('0x'+Buffer.from(bytes).toString('hex'));
   const payload=encodeOrdinaryValidationArguments(api!.registry,method.meta,extrinsic,blockHash);
   const answer=await api!.rpc.state.call('TaggedTransactionQueue_validate_transaction','0x'+payload.toString('hex'));
   const value=api!.registry.createType(method.meta.type.toString(),answer.toHex()).toJSON();
   const validation=summarizeOrdinaryValidation(value);
   const provenance={blockHash:blockHash.toHex(),substrateExtrinsicBytes:extrinsic.encodedLength};
   if(validation.accepted&&minimumHeadroomPercent>0) {
    const cost=(await api!.call.midnightRuntimeApi!.getTransactionCost!('0x'+Buffer.from(bytes).toString('hex'))).toJSON() as {ok?:number|string};
    const queries=api!.query.midnight as unknown as Record<string,()=>Promise<{toJSON():unknown}>>;
    const overhead=(await queries.configurableTransactionSizeWeight!()).toJSON() as {refTime:number|string};
    const weights=api!.consts.system!.blockWeights!.toJSON() as {perClass:{normal:{maxExtrinsic:{refTime:number|string}}}};
    assert(cost.ok!==undefined);
    const weight=BigInt(cost.ok)+BigInt(overhead.refTime),limit=BigInt(weights.perClass.normal.maxExtrinsic.refTime);
    const costEvidence={dispatchWeight:String(weight),normalMaxExtrinsicRefTime:String(limit),minimumHeadroomPercent};
    if(weight*100n>limit*BigInt(100-minimumHeadroomPercent))return {accepted:false as const,
     rejection:'insufficient-weight-headroom',...provenance,...costEvidence};
    return {...validation,...provenance,...costEvidence};
   }
   return {...validation,...provenance};
  })(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Read-only node validation timed out')),60000);})]);
  return result;
 } catch {throw Error('Exact balanced transaction node validation unavailable; no submission attempted');}
 finally {if(timer)clearTimeout(timer);await api?.disconnect().catch(()=>{});}
}
