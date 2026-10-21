import assert from "node:assert/strict";
import {lstat,mkdir,readFile,realpath,writeFile} from "node:fs/promises";
import {setTimeout as delay} from "node:timers/promises";

/** Read-only, exact-byte historical cache. Native submission is absent by design. */
export async function readApproved172IndexedTransaction(input:{url:string|URL;id:string;expectedRaw:Uint8Array}) {
  assert(/^[0-9a-f]{66}$/u.test(input.id));
  const directory="/opt/permio-m6-remaining-preprod-20261019-v1/authority115-indexed-public-cache-v1";
  await mkdir(directory,{recursive:true,mode:0o700});const stat=await lstat(directory);
  assert(await realpath(directory)===directory&&stat.uid===0&&(stat.mode&0o777)===0o700);
  const file=directory+"/"+input.id+".json";
  const check=(record:any)=>{assert(record.protocolVersion===1000300&&record.identifiers?.some((v:string)=>v.replace(/^0x/u,"")===input.id));
    assert(["SUCCESS","PARTIAL_SUCCESS"].includes(record.transactionResult?.status)&&Number.isSafeInteger(record.block?.height)&&record.block.height>0);
    assert(Buffer.from(record.raw.replace(/^0x/u,""),"hex").equals(Buffer.from(input.expectedRaw)));return record;};
  try{const m=await lstat(file);assert(m.isFile()&&!m.isSymbolicLink()&&m.uid===0&&(m.mode&0o777)===0o600);return check(JSON.parse(await readFile(file,"utf8")));}
  catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
  for(let attempt=0;attempt<3;attempt++)try{
    const response=await fetch(input.url,{method:"POST",headers:{"content-type":"application/json"},signal:AbortSignal.timeout(30_000),body:JSON.stringify({
      query:`query T($offset:TransactionOffset!){transactions(offset:$offset){raw protocolVersion block{height hash ledgerParameters} contractActions{__typename address state ... on ContractCall{entryPoint}} ... on RegularTransaction{identifiers transactionResult{status}}}}`,variables:{offset:{identifier:input.id}}})});
    if(!response.ok){await response.body?.cancel();if([429,502,503,504].includes(response.status)&&attempt<2){await delay(15000*(attempt+1));continue;}throw Error(`Read-only indexer HTTP ${response.status}`);}
    const body=await response.text();assert(body.length<=20*1024**2);const json=JSON.parse(body);assert(!json.errors&&Array.isArray(json.data?.transactions));
    const rows=json.data.transactions.filter((r:any)=>r.identifiers?.some((v:string)=>v.replace(/^0x/u,"")===input.id));assert(rows.length<=1);
    const row=rows[0];if(!row)return undefined;
    check(row);await writeFile(file,JSON.stringify(row),{flag:"wx",mode:0o600});return row;
  }catch(error){const transient=error instanceof TypeError&&["fetch failed","terminated"].includes(error.message)||error instanceof DOMException&&["AbortError","TimeoutError"].includes(error.name);
    if(!transient||attempt===2)throw error;await delay(15000*(attempt+1));}
  throw Error("Read-only historical query exhausted its bounded attempts");
}
