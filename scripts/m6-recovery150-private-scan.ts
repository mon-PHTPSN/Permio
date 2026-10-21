import assert from "node:assert/strict";
import {createPrivateKey,createPublicKey} from "node:crypto";
import {lstat,readFile,readdir,realpath} from "node:fs/promises";

/** In-process needles only. Never log or export the returned private strings. */
export async function collectRecovery150PrivateScanValues(){
 const directory="/opt/permio-m6-remaining-preprod-20261019-v1/private",values:string[]=[];
 async function load(n:string){assert(/^[a-z0-9.-]+$/u.test(n));const p=directory+"/"+n,s=await lstat(p);
  assert(s.isFile()&&!s.isSymbolicLink()&&s.uid===0&&(s.mode&0o777)===0o600&&await realpath(p)===p);return JSON.parse(await readFile(p,"utf8"));}
 const add=(x:unknown)=>{if(typeof x==="string"&&x.length>=8)values.push(x);};
 const input=await load("inputs.json");assert(input.networkId==="preprod"&&input.testOnlyProvenance.includes("disposable Preprod test"));add(input.providerCredential);
 const secret=(v:unknown)=>{if(typeof v==="string")add(v);else if(v&&typeof v==="object")Object.values(v).forEach(secret);};secret(input.secret);
 function walk(v:any,key=""){
  if(key==="privateSentinels"){assert(Array.isArray(v));v.forEach(add);return;}
  if(typeof v==="string"){
   if(v.startsWith("private-")||key==="nonce")add(v);
   if(/privateKeyPem$/iu.test(key)){
    add(v);const privateKey=createPrivateKey(v),publicKey=createPublicKey(privateKey);
    for(const b of [privateKey.export({type:"pkcs8",format:"der"}),publicKey.export({type:"spki",format:"der"})]){add(b.toString("hex"));add(b.subarray(-32).toString("hex"));}
   }return;
  }
  if(!v||typeof v!=="object")return;
  if(["nonce","nextStateNonce","stateIdHash","allocationNonce","payloadCommitment"].includes(key)){
   // Empty ABI placeholders are public defaults; real private nonces are nonzero.
   if(typeof v.$bytes==="string"){assert(/^(?:[0-9a-f]{2}){16,}$/u.test(v.$bytes));if(!/^0+$/u.test(v.$bytes))add(v.$bytes);}
   else if(v.type==="Buffer"&&Array.isArray(v.data)){const h=Buffer.from(v.data).toString("hex");if(!/^0+$/u.test(h))add(h);}
  }
  for(const[k,x]of Object.entries(v))walk(x,k);
 }
 const first=await load("first-completed-after50-private.json");walk(first);
 walk(await load("first-fresh-completed-after87-private.json"));
 const names=await readdir(directory);
 for(const name of ["fourth-prepared-after113-private.json","fifth-completed-recovery172-private.json"])
  if(names.includes(name))walk(await load(name));
 for(const n of names.filter(n=>/^checkpoint(?:-v[2456789])?-[0-9]+\.json$/u.test(n))){
  const c=await load(n);walk(c.value);
  if(c.stage==="remaining-instance-allocation"){assert(Number.isSafeInteger(c.value.instance.expiresAt));add(new Date(c.value.instance.expiresAt*1000).toISOString());}
 }
 const pair=await load("fixture-pair.json");for(const f of [pair.stateful,pair.nonTransitioning]){
  walk(f.record.template);for(const state of f.record.template.states){assert(state.length>=8);add(state);}
  for(const reviewer of f.policy.reviewers){add(reviewer.principalId);add(reviewer.publicKeyPem);}
 }
 assert(values.length>0);return [...new Set(values)];
}
