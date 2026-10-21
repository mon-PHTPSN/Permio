// Read-only actual-node cost of the real constructor and genuine verifier inventory.
// No wallet initialization, DUST proof, signing, balance or submission.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
for(const key of ['log','warn','error','info','debug'] as const)console[key]=()=>{};
const root='/opt/permio-m6-governance-20261018-v10',client=root+'/client';
assert(process.platform==='linux'&&process.cwd()===client);
let api:import('@polkadot/api').ApiPromise|undefined;
const timer=setTimeout(()=>process.exit(2),90000),stop=Error('owned-read-only-cost-completed');
const emit=(value:unknown)=>process.stdout.write(JSON.stringify(value)+'\n');
try {
 const input=JSON.parse(await readFile(root+'/private/inputs.json','utf8'));
 process.chdir(root+'/private');try {await import('@midnight-ntwrk/testkit-js');}finally{process.chdir(client);}
 const sdk=await import('@permio/midnight-authorization');
 const {ApiPromise,WsProvider}=await import('@polkadot/api');
 const {CostModel}=await import('@midnight-ntwrk/midnight-js-protocol/ledger');
 const {setNetworkId}=await import('@midnight-ntwrk/midnight-js-network-id');
 const {runLiveM6Admission}=await import('./run-live-m6-admission.ts');
 const {parseLiveM6Arguments}=await import('./m6-prover-memory.ts');
 const profile=new sdk.PreprodConnectionProfile(input.providerCredential);
 api=new ApiPromise({provider:new WsProvider(profile.environmentForSdk().nodeWS),throwOnConnect:false,noInitWarn:true});
 await api.isReadyOrError;assert(api.genesisHash.toHex()===sdk.PREPROD_GENESIS_HASH);
 const forbidden=()=>{throw Error('Read-only constructor-cost check cannot use a wallet or indexer');};
 const wallet={env:profile.environmentForSdk(),getCoinPublicKey:()=>'01'.repeat(32),getEncryptionPublicKey:()=>'02'.repeat(32),balanceTx:forbidden,submitTx:forbidden};
 const implementationHash=`0x${createHash('sha256').update(await readFile(path.join(sdk.PERMIO_AUTHORIZATION_ASSETS_PATH,'zkir/executeRuntimeAction.zkir'))).digest('hex')}` as const;
 setNetworkId('preprod');let inspected=0;
 try {
  await runLiveM6Admission(parseLiveM6Arguments(['--governance-only']),{networkId:'preprod',deploymentOnly:true,
   ordinaryAction:{implementationHash,sourceHash:implementationHash,profile},async withProviders(use){
    const base=sdk.createPreprodAuthorizationProviders(wallet as never,profile);
    return use({...base,publicDataProvider:new Proxy(base.publicDataProvider,{get:()=>forbidden}),
     proofProvider:{async proveTx(transaction){
      assert(++inspected===1);
      const bound=(await transaction.prove({check:forbidden,prove:forbidden},CostModel.initialCostModel())).bind();
      const bytes=bound.serialize();
      const costResult=await api!.call.midnightRuntimeApi!.getTransactionCost!('0x'+Buffer.from(bytes).toString('hex'));
      const costJson=costResult.toJSON() as {ok?:number|string};assert(costJson.ok!==undefined);
      const weights=api!.consts.system!.blockWeights!.toJSON() as {perClass:{normal:{maxExtrinsic:{refTime:number|string}}}};
      const normalMax=BigInt(weights.perClass.normal.maxExtrinsic.refTime);
      const queries=api!.query.midnight as unknown as Record<string,()=>Promise<{toJSON():unknown}>>;
      const overheadQuery=queries.configurableTransactionSizeWeight;assert(overheadQuery);
      const overheadJson=(await overheadQuery()).toJSON() as {refTime:number|string};
      const cost=BigInt(costJson.ok),overhead=BigInt(overheadJson.refTime),weight=cost+overhead;
      // Same-wallet v9 evidence measured 8.96 billion extra units for DUST
      // balancing. Reserve over twice that; validate the final exact bytes too.
      const balancingReserve=18_000_000_000n;
      const report={kind:'v10-real-constructor-actual-node-cost',observedAtUtc:new Date().toISOString(),
       contractAbiVersion:10,actionImplementationProfileVersion:9,provableEntries:10,
       nativeBytes:bytes.length,ledgerCost:String(cost),nodeOverhead:String(overhead),estimatedDispatchWeight:String(weight),
       normalMaxExtrinsicRefTime:String(normalMax),headroomPercent:Number((normalMax-weight)*10000n/normalMax)/100,
       walletBalancingCostReserve:String(balancingReserve),minimumFinalHeadroomPercent:5,
       weightWithinLimit:weight<normalMax,practicalHeadroomPassed:(weight+balancingReserve)*100n<=normalMax*95n,
       genuineKeysVerified:true,walletInitialized:false,applicationProofGenerated:false,
       candidateBalanced:false,exactBalancedValidationRequired:true,transactionsSubmitted:0,milestoneComplete:false};
      await writeFile(root+'/node-constructor-cost-v2.json',JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});emit(report);
      assert(report.practicalHeadroomPassed,'Deployment must retain five percent headroom after the measured balancing reserve');throw stop;
     }}});
   }});
 }catch(error){if(error!==stop)throw error;}
 assert(inspected===1);
}catch{emit({kind:'v10-node-constructor-cost-failed',detailsWithheld:true,transactionsSubmitted:0});process.exitCode=1;}
finally{await api?.disconnect().catch(()=>{});clearTimeout(timer);}
