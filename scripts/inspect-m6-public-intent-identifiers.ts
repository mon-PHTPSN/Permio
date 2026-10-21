import assert from "node:assert/strict";
import {readFile,writeFile} from "node:fs/promises";
import {Transaction} from "@midnight-ntwrk/midnight-js-protocol/ledger";
import {setNetworkId} from "@midnight-ntwrk/midnight-js-network-id";
setNetworkId("preprod");
const raw=await readFile("scripts/test/fixtures/m6-public-stateful-transaction-v1.bin"),tx=Transaction.deserialize("signature","proof","binding",raw);
const erased=tx.eraseProofs(),old=tx.identifiers(),withoutProof=erased.identifiers();
const intents=erased.intents!;assert(intents.size===2);const segment=[...intents].find(([,v])=>v.actions.length===1)![0];
const before=intents.get(segment)!.intentHash(segment),i=intents.get(segment)!;i.ttl=new Date(i.ttl.getTime()-1000);intents.set(segment,i);erased.intents=intents;
const after=erased.intents!.get(segment)!.intentHash(segment);
const report={publicFixtureOnly:true,noNetwork:true,noNativeSubmissions:true,identifiersUnchangedByErasingProofs:JSON.stringify(old)===JSON.stringify(withoutProof),
 contractIntentHashChangesWithShorterUnprovenTtl:before!==after,oneIdentifierChangesWithShorterTtl:JSON.stringify(withoutProof)!==JSON.stringify(erased.identifiers())};
await writeFile("logs/m6-remaining-preprod-20261019/public-intent-identifier-diagnostic-v1.json",JSON.stringify(report,null,2)+"\n",{flag:"wx"});
process.stdout.write(JSON.stringify(report)+"\n");
