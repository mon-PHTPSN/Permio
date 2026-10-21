import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { ContractCall, ContractDeploy, Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { ContractState } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { ledger } from "../packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js";
import { readFinalizedDecisionReceipt, runtimeDecisionReceiptId, type DecisionReceipt } from "../packages/midnight-authorization/src/decision-receipt.ts";

// Offline consistency and decoder replay; this does not establish new consensus finality.
assert.equal(process.argv.length, 3);
const root = path.resolve("logs/m6-remaining-preprod-20261019/downloaded-first50-public-evidence-v1");
const directory = await realpath(process.argv[2]!); assert.equal(directory, await realpath(path.join(root,"public-evidence")));
const bytes = (n:string)=>readFile(path.join(directory,n));
const json = async (n:string)=>JSON.parse((await bytes(n)).toString());
const hash = (v:Uint8Array)=>createHash("sha256").update(v).digest("hex");
const manifest=JSON.parse(await readFile(path.join(root,"manifest.json"),"utf8"));
assert(manifest.allPublicBytesPrivacyScanned && manifest.nativeAttempts===50 && manifest.confirmed===50 &&
  manifest.nativeNegativeOutcomes===0 && manifest.sourceSnapshot===6 && manifest.receiptCount===1 && !manifest.milestoneComplete);
for(const [name,item] of Object.entries(manifest.files) as [string,{bytes:number;sha256:string}][]) {
  const value=await bytes(name);assert.equal(value.length,item.bytes);assert.equal(hash(value),item.sha256);
}
const scan=await json("privacy-scan.json");assert(scan.passed&&scan.findings.length===0&&scan.artifactCount===127);
for(const item of scan.files)assert.equal(hash(await bytes(item.artifact)),item.sha256);
const address="70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c",contract=`0x${address}` as const;
const sourceManifest=JSON.parse(await readFile("logs/m6-remaining-preprod-20261019/public-source-v1-manifest.json","utf8"));
const contractPath="packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js";
assert.equal(hash(await readFile(contractPath)),sourceManifest.files[contractPath]);
setNetworkId("preprod");const counts=new Map<string,number>();let winnerIds:readonly string[]=[];
for(let round=1;round<=50;round++) {
  const n=String(round).padStart(3,"0"),raw=await bytes(`transactions/attempt-${n}.bin`);
  assert(raw.equals(await bytes(`indexer/finalized-${n}.bin`)));
  const tx=Transaction.deserialize("signature","proof","binding",raw);assert(Buffer.from(tx.serialize()).equals(raw));
  const actions=[...(tx.intents?.values()??[])].flatMap(i=>i.actions);assert.equal(actions.length,1);
  const action=actions[0]!;assert(action instanceof ContractCall||action instanceof ContractDeploy);assert.equal(action.address,address);
  const entry=action instanceof ContractDeploy?"deploy":typeof action.entryPoint==="string"?action.entryPoint:Buffer.from(action.entryPoint).toString("utf8");
  assert.equal(entry==="deploy",round===1);counts.set(entry,(counts.get(entry)??0)+1);
  if(round===50){assert.equal(entry,"executeRuntimeAction");winnerIds=tx.identifiers();}
}
assert.deepEqual(Object.fromEntries([...counts].sort()),Object.fromEntries(Object.entries({deploy:1,governAuthorization:12,
  beginM4Activation:2,stageM4ActivationBinding:2,finalizeM4Activation:2,allocateRuntimeInstance:1,
  updateRuntimeCredentialStatus:19,manageRuntimeParticipantSlots:2,prepareRuntimeAction:8,executeRuntimeAction:1}).sort()));
const view=ledger(ContractState.deserialize(await bytes("chain/contract-state.bin")).data);
assert.equal(view.runtimeInstances.size(),1n);assert.equal(view.decisionReceipts.size(),1n);
assert.equal(view.usedRuntimeActionNullifiers.size(),1n);assert.equal(view.runtimeActionSessions.size(),1n);
assert.equal([...view.runtimeInstances][0]![1].transitionSequence,5n);
assert.equal([...view.authorityRoots][0]![1].rootSequence,1n);assert.equal([...view.credentialStatusRoots][0]![1].rootSequence,3n);
assert.equal(view.proofModules.size(),2n);assert([...view.proofModules].every(([,r])=>r.lifecycleStatus===4n));
assert.equal(view.activeTemplates.size(),2n);assert([...view.activeTemplates].every(([,r])=>r.lifecycleStatus===1n));
const receipts=await json("receipts/decision-receipts.json") as DecisionReceipt[];assert.equal(receipts.length,1);
const receipt=receipts[0]!;assert(winnerIds.includes(receipt.sourceTransaction));assert.equal(receipt.sourceLedgerSequence,"3045403");
const key=Uint8Array.from(Buffer.from(receipt.receiptId.slice(2),"hex")),body=view.decisionReceipts.lookup(key);
assert(body.transitioning&&view.usedRuntimeActionNullifiers.member(body.scopedNullifier));
assert.equal(runtimeDecisionReceiptId(body),receipt.receiptId);
assert.deepEqual([...view.runtimeInstances][0]![1].currentStateCommitment,body.nextStateCommitment);
const decoded=await readFinalizedDecisionReceipt({async readReceiptAtTransaction(transactionId){
  assert(winnerIds.includes(transactionId));return{network:"preprod",contract,transactionId,ledgerSequence:3045403n,
    finalized:true,transactionSucceeded:true,receiptIdFromCall:receipt.receiptId,bodyAtTransaction:body};
}},{network:"preprod",contract,transactionId:receipt.sourceTransaction,receiptId:receipt.receiptId});
assert.deepEqual(decoded,receipt);
const result={passed:true,observedAtUtc:new Date().toISOString(),boundary:"offline-artifact-integrity-and-receipt-decoder-replay",
  nativeTransactionBytesVerified:50,sourceIndexedBytePairsVerified:50,actualReceiptsDecoded:1,stateSequence:5,
  nativeNegativeOutcomes:0,privateValuesScanFindings:0,newNetworkValidation:false,newNativeSubmissions:0,
  milestoneComplete:false,firstConflictNativeTestStillOpen:true,independentHumanReviewStillOpen:true};
await writeFile("logs/m6-remaining-preprod-20261019/first50-download-protocol-verification-v1.json",JSON.stringify(result,null,2)+"\n",{flag:"wx"});
process.stdout.write(JSON.stringify(result)+"\n");
