import assert from 'node:assert/strict';
import {it} from 'node:test';
import {TypeRegistry} from '@polkadot/types/create';
import {encodeOrdinaryValidationArguments,summarizeOrdinaryValidation} from '../m6-ordinary-node-validation.ts';

it('runtime arguments retain the original extrinsic length prefix exactly once',()=>{
 const registry=new TypeRegistry();
 registry.register({TestSource:{_enum:['InBlock','Local','External']}});
 // Captured unsigned-remark control shape: SCALE length + version + call + data.
 const raw=Uint8Array.from([20,4,0,0,4,0]);
 const meta={params:[{name:'source',type:'TestSource'},{name:'tx',type:'Bytes'},
  {name:'block_hash',type:'H256'}],type:'Bytes'};
 const hash='0x'+'ab'.repeat(32);
 const encoded=encodeOrdinaryValidationArguments(registry,meta,{toU8a:()=>raw},hash);
 assert.equal(encoded.length,1+raw.length+32);
 assert.deepEqual(encoded.subarray(1,1+raw.length),Buffer.from(raw));
 assert.notDeepEqual(registry.createType('Bytes','0x'+Buffer.from(raw).toString('hex')).toU8a(),raw);
 assert.equal(encoded[0],2);
 assert.throws(()=>encodeOrdinaryValidationArguments(registry,{...meta,params:meta.params.slice(1)},
  {toU8a:()=>raw},hash));
});

it('captured resource rejection and control rejection remain distinct without exposing metadata',()=>{
 assert.deepEqual(summarizeOrdinaryValidation({err:{invalid:{exhaustsResources:null}}}),
  {accepted:false,rejection:'exhaustsResources'});
 assert.deepEqual(summarizeOrdinaryValidation({err:{invalid:{call:null}}}),{accepted:false,rejection:'call'});
 assert.deepEqual(summarizeOrdinaryValidation({err:{invalid:{custom:170}}}),
  {accepted:false,rejection:'custom',customCode:170});
 assert.deepEqual(summarizeOrdinaryValidation({ok:{provides:['PRIVATE'],requires:['PRIVATE']}}),{accepted:true});
});

it('malformed, conflicting and unrecognized validation responses fail closed',()=>{
 for(const value of [{},{ok:{},err:{invalid:'PRIVATE'}},{err:{invalid:{PRIVATE:'SECRET'}}},
  {err:{invalid:{custom:256}}},{err:{invalid:{custom:-1}}}]){
  const result=summarizeOrdinaryValidation(value);
  assert.equal(result.accepted,false);assert(!JSON.stringify(result).includes('PRIVATE'));
  assert(!('customCode' in result));
 }
 assert.throws(()=>summarizeOrdinaryValidation(null));
});
