import assert from "node:assert/strict";
import {parsePreprodSubmissionFailure,type PreprodSubmissionFailure} from "../packages/midnight-authorization/src/preprod-submission-failure.ts";
import {isDefiniteNativeAuthRejection} from "./m6-native-negative-outcome.ts";

type Transaction={serialize():Uint8Array;identifiers():string[]};
export type NegativeFinal={status:string;identifiers:readonly string[];tx:{serialize():Uint8Array};
 blockHeight:number;blockHash:string;segmentStatusMap?:ReadonlyMap<number,string>};
type Input={transaction:Transaction;intendedSegmentId:number;validation:{accepted:boolean;rejection?:string;customCode?:number};
 submit():Promise<string>;readFinal(id:string):Promise<NegativeFinal>;observe(value:Readonly<Record<string,unknown>>):void;readTimeoutMs?:number};

function exactIncludedFailure(input:Input,final:NegativeFinal){
 const ids=input.transaction.identifiers();
 assert(final.status==="FailFallible"&&final.segmentStatusMap?.get(input.intendedSegmentId)==="SegmentFail",
  "Negative final must identify the intended failed contract segment");
 assert(ids.every(id=>final.identifiers.includes(id))&&Number.isSafeInteger(final.blockHeight)&&final.blockHeight>0);
 assert(Buffer.from(final.tx.serialize()).equals(Buffer.from(input.transaction.serialize())),"Negative final must contain the exact submitted bytes");
 return final;
}

/** One submission boundary; the caller independently checks unchanged state. */
export async function submitNegativeOnceAndResolve(input:Input):Promise<{
 transactionId?:string;diagnostic?:PreprodSubmissionFailure;final?:NegativeFinal;reconciledAfterSubmitError:boolean}> {
 const ids=input.transaction.identifiers();assert(ids.length>0&&ids.every(id=>/^[0-9a-f]{66}$/u.test(id))&&input.intendedSegmentId>0);
 let transactionId:string|undefined,diagnostic:PreprodSubmissionFailure|undefined,submitError=false;
 try{transactionId=await input.submit();assert(ids.includes(transactionId));}
 catch(error){transactionId=undefined;submitError=true;if(error&&typeof error==="object")diagnostic=parsePreprodSubmissionFailure(Object.getOwnPropertyDescriptor(error,"diagnostic")?.value);}
 if(transactionId===undefined&&isDefiniteNativeAuthRejection(input.validation,diagnostic)){
  return {diagnostic,reconciledAfterSubmitError:false};
 }
 const timeoutMs=input.readTimeoutMs??180000;assert(Number.isSafeInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=180000);
 if(submitError)input.observe({phase:"negative-submission-outcome-read-only-reconciliation",nativeResubmission:false});
 const reads=(transactionId?[transactionId]:ids).map(async id=>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   const final=await Promise.race([input.readFinal(id),new Promise<never>((_,reject)=>{
    timer=setTimeout(()=>reject(Error("Exact negative finality read timed out")),timeoutMs);timer.unref();
   })]);
   return exactIncludedFailure(input,final);
  }finally{if(timer)clearTimeout(timer);}
 });
 let final:NegativeFinal;
 try{final=await Promise.any(reads);}catch{throw Error("Negative submission outcome remains unconfirmed; do not resubmit");}
 const canonicalId=ids.at(-1)!;
 if(submitError)input.observe({phase:"negative-submission-reconciled-read-only",transactionId:canonicalId,ledgerSequence:final.blockHeight,nativeResubmission:false});
 return {transactionId:canonicalId,diagnostic,final,reconciledAfterSubmitError:submitError};
}
