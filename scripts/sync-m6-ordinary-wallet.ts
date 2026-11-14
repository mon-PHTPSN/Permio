// Read-only wallet readiness and private checkpoint. No balancing, proof or submission.
import assert from 'node:assert/strict';
import { lstat, readFile, realpath, writeFile } from 'node:fs/promises';
const root='/opt/permio-m6-governance-20261018-v10',directory=root+'/private';
assert(process.platform==='linux'&&await realpath(directory)===directory);
for(const key of ['log','warn','error','info','debug'] as const)console[key]=()=>{};
const emit=(value:Readonly<Record<string,unknown>>)=>process.stdout.write(JSON.stringify({kind:'m6-v10-wallet-readiness',...value})+'\n');
let phase='private-input';const deadline=setTimeout(()=>process.exit(2),1200000);
try {
 const file=directory+'/inputs.json',meta=await lstat(file);
 assert(meta.uid===0&&(meta.mode&0o777)===0o600&&meta.isFile()&&!meta.isSymbolicLink());
 const input=JSON.parse(await readFile(file,'utf8'));
 assert(input.schemaVersion===1&&input.networkId==='preprod'&&input.testOnlyProvenance.includes('disposable Preprod test'));
 process.chdir(directory);await import('@midnight-ntwrk/testkit-js');
 const {PreprodConnectionProfile,withRestoredPreprodWallet}=await import('@permio/midnight-authorization');
 const {setNetworkId}=await import('@midnight-ntwrk/midnight-js-network-id');setNetworkId('preprod');
 const profile=new PreprodConnectionProfile(input.providerCredential);
 phase='restore-and-synchronize';
 await withRestoredPreprodWallet(profile,input.secret,input.snapshots,async wallet=>{
  const status=await wallet.synchronize();assert(status.readyForTransactions);
  emit({phase:'wallet-ready',transactionSubmitted:false,proofRequested:false});
 },stage=>{assert(/^[a-z-]+$/.test(stage));emit({phase:'checkpoint-stage',stage});},async snapshots=>{
  phase='save-private-checkpoint';
  await writeFile(directory+'/synchronized-wallet-snapshots.json',JSON.stringify(snapshots),{flag:'wx',mode:0o600});
  emit({phase:'synchronized-checkpoint-saved',contentsLogged:false,transactionSubmitted:false});
 });
 emit({phase:'finished',walletResourcesDisposed:true,transactionsSubmitted:0});
} catch {emit({phase:'failed',failedStage:phase,detailsWithheld:true,transactionsSubmitted:0});process.exitCode=1;}
finally {clearTimeout(deadline);}
