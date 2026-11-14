import assert from "node:assert/strict";
type Transaction = {serialize(): Uint8Array; identifiers(): string[]};
type Final = {status: string; identifiers: readonly string[]; tx: {serialize(): Uint8Array}; blockHeight: number};
/** A confirmation error can follow a successful broadcast. Never broadcast twice. */
export async function submitOnceAndReconcile(input: {
 transaction:Transaction; submit():Promise<string>; readFinal(id:string):Promise<Final>;
 observe(value:Readonly<Record<string,unknown>>):void; readTimeoutMs?:number;
}):Promise<string> {
 const bytes=Buffer.from(input.transaction.serialize()),ids=input.transaction.identifiers();
 assert(ids.length>0&&ids.every(id=>/^[0-9a-f]{66}$/.test(id)));
 try {const id=await input.submit();assert(ids.includes(id));return id;}
 catch {
  input.observe({phase:"submission-outcome-read-only-reconciliation",nativeResubmission:false});
  const reads=ids.map(async id=>{
   let timer:ReturnType<typeof setTimeout>|undefined;
   try {
    const final=await Promise.race([input.readFinal(id),new Promise<never>((_,reject)=>{
     timer=setTimeout(()=>reject(Error("Exact finality read timed out")),input.readTimeoutMs??180000);timer.unref();
    })]);
    assert(final.status==="SucceedEntirely"&&ids.every(value=>final.identifiers.includes(value))&&Number.isSafeInteger(final.blockHeight)&&final.blockHeight>0);
    assert(Buffer.from(final.tx.serialize()).equals(bytes),"Indexer must return the exact submitted bytes");
    return {id:ids.at(-1)!,blockHeight:final.blockHeight};
   }finally{if(timer)clearTimeout(timer);}
  });
  try {
   const result=await Promise.any(reads);
   input.observe({phase:"submission-reconciled-read-only",transactionId:result.id,ledgerSequence:result.blockHeight,nativeResubmission:false});
   return result.id;
  }catch{throw Error("Submission outcome remains unconfirmed; do not resubmit");}
 }
}
