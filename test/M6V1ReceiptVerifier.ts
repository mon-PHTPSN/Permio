import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { network } from "hardhat";
import { encodeAbiParameters, keccak256, stringToHex, getAddress, hexToBytes, type Hex } from "viem";

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { runtimeDecisionReceiptId, readFinalizedDecisionReceipt, type RuntimeDecisionReceiptBody } from "../packages/midnight-authorization/src/decision-receipt.ts";
import { encodeM6ReceiptV1, decodeM6ReceiptV1, encodeM6GatewaySignature, m6SourceIdentityHash } from "../packages/gateway/src/m6-receipt-codec.ts";
import { signGatewayTransport } from "../packages/gateway/src/transport.ts";

const fields = [
  {name:"receiptId",type:"bytes32"},{name:"receiptVersion",type:"bytes32"},
  {name:"proofModuleId",type:"bytes32"},{name:"proofModuleVersion",type:"string"},
  {name:"proofModuleImplementationHash",type:"bytes32"},{name:"namespaceHash",type:"bytes32"},
  {name:"templateIdHash",type:"bytes32"},{name:"templateVersion",type:"string"},
  {name:"templateContentHash",type:"bytes32"},{name:"instanceCommitment",type:"bytes32"},
  {name:"previousStateCommitment",type:"bytes32"},{name:"nextStateCommitment",type:"bytes32"},
  {name:"transitionSequence",type:"uint64"},{name:"contextHash",type:"bytes32"},
  {name:"actionSchemaId",type:"bytes32"},{name:"purposeHash",type:"bytes32"},
  {name:"recipient",type:"bytes32"},{name:"validAfter",type:"uint64"},{name:"validBefore",type:"uint64"},
  {name:"scopedNullifier",type:"bytes32"},{name:"outputCommitment",type:"bytes32"},
  {name:"sourceNetwork",type:"bytes32"},{name:"sourceNetworkName",type:"string"},
  {name:"sourceContract",type:"bytes32"},{name:"sourceTransaction",type:"bytes"},
  {name:"sourceLedgerSequence",type:"uint64"},
] as const;
const signatureFields = [
  {name:"outboxKey",type:"bytes32"},{name:"sourceIdentityHash",type:"bytes32"},
  {name:"keyId",type:"string"},{name:"signedAt",type:"uint64"},{name:"signature",type:"bytes"},
] as const;
const types = {GatewayTransport:[
  {name:"outboxKey",type:"bytes32"},{name:"sourceIdentityHash",type:"bytes32"},
  {name:"receiptHash",type:"bytes32"},{name:"keyId",type:"string"},{name:"signedAt",type:"uint64"},
  {name:"targetChainId",type:"uint256"},{name:"targetRegistry",type:"address"},
]} as const;
const hash = (s:string) => keccak256(stringToHex(s));
const zero = `0x${"00".repeat(32)}` as Hex;
const version = `0x${"00".repeat(31)}01` as Hex;
const networkHash = "0xa124031379c05df6c1eee3d208855b7dfdc747fef10404d8dbb7d5be56da8522" as const;

describe("M6 v1 lossless authenticated transport", async function () {
  const {viem} = await network.getOrCreate();
  const client = await viem.getPublicClient();
  const wallets = await viem.getWalletClients();
  const [admin,schema,source,keyManager,registrar,emergency,gateway,relayer] = wallets;
  let registry: Awaited<ReturnType<typeof viem.deployContract<"ExecutionRegistry">>>;
  let verifier: Awaited<ReturnType<typeof viem.deployContract<"M6V1ReceiptVerifier">>>;
  let adapter: Awaited<ReturnType<typeof viem.deployContract<"RecordingExecutionAdapter">>>;
  let now: bigint;
  let chainId: bigint;
  const recipient = hash("runtime recipient unrelated to EVM addresses");
  const action = hash("public-action");
  const sourceContract = hash("M6 registry contract");
  const keyId = "gateway-epoch-v1";
  beforeEach(async function () {
    registry = await viem.deployContract("ExecutionRegistry",wallets.slice(0,6).map(w=>w.account.address) as [typeof admin.account.address,typeof admin.account.address,typeof admin.account.address,typeof admin.account.address,typeof admin.account.address,typeof admin.account.address]);
    verifier = await viem.deployContract("M6V1ReceiptVerifier",[registry.address]);
    adapter = await viem.deployContract("RecordingExecutionAdapter",[registry.address]);
    now = (await client.getBlock()).timestamp;
    chainId = BigInt(await client.getChainId());
    await registry.write.configureReceiptVerifier([version,verifier.address],{account:schema.account});
    await registry.write.setSource([networkHash,sourceContract,true],{account:source.account});
    await registry.write.registerGatewayKeyEpoch([hash(keyId),gateway.account.address,now-1n,now+10000n,now+20000n],{account:keyManager.account});
    await registry.write.registerAdapter([version,action,adapter.address],{account:registrar.account});
    await registry.write.bindRecipientAdapter([version,action,recipient,adapter.address],{account:registrar.account});
  });
  function receipt() {
    // Synthetic signed public fields exercise the EVM boundary, not M6 finality.
    return {receiptId:hash("original Compact receipt ID supplied by trusted M7"),receiptVersion:version,
      proofModuleId:hash("module"),proofModuleVersion:"18446744073709551615.0.1",
      proofModuleImplementationHash:hash("implementation"),namespaceHash:hash("namespace"),
      templateIdHash:hash("template"),templateVersion:"2.3.18446744073709551615",
      templateContentHash:hash("content"),instanceCommitment:hash("instance"),previousStateCommitment:zero,
      nextStateCommitment:zero,transitionSequence:0n,contextHash:hash("context"),actionSchemaId:action,
      purposeHash:hash("purpose"),recipient,validAfter:now,validBefore:now+1000n,
      scopedNullifier:hash("scope"),outputCommitment:hash("output"),sourceNetwork:networkHash,
      sourceNetworkName:"preprod",sourceContract,sourceTransaction:`0x${"ab".repeat(32)}cd` as Hex,sourceLedgerSequence:42n};
  }
  const encode = (r:ReturnType<typeof receipt>) => encodeAbiParameters([{type:"tuple",components:fields}],[r]);
  async function packet(r:ReturnType<typeof receipt>,domainRegistry=registry.address,domainChain=chainId) {
    const encoded=encode(r);
    const sourceIdentityHash=keccak256(encodeAbiParameters(
      [{type:"string"},{type:"bytes32"},{type:"bytes"},{type:"uint32"},{type:"uint64"}],
      [r.sourceNetworkName,r.sourceContract,r.sourceTransaction,0,r.sourceLedgerSequence]));
    const message={outboxKey:hash("durable-outbox-key"),sourceIdentityHash,receiptHash:keccak256(encoded),keyId,signedAt:now,targetChainId:domainChain,targetRegistry:domainRegistry};
    const signature=await gateway.signTypedData({account:gateway.account,domain:{name:"Permio Gateway Transport",version:"1",chainId:domainChain,verifyingContract:domainRegistry},types,primaryType:"GatewayTransport",message});
    const metadata=encodeAbiParameters(signatureFields,[message.outboxKey,sourceIdentityHash,keyId,now,signature]);
    return {encoded,metadata};
  }
  it("accepts the real SDK-decoded M6 commitment through the shared TypeScript codec and transport signer", async function () {
    const bytes=(label:string)=>hexToBytes(hash(label));
    const body:RuntimeDecisionReceiptBody={receiptVersion:1n,
      moduleIdentity:{moduleIdHash:bytes("module"),moduleVersion:{major:18446744073709551615n,minor:2n,patch:3n},implementationHash:bytes("implementation")},
      target:{namespaceHash:bytes("namespace"),templateIdHash:bytes("template"),semanticVersion:{major:4n,minor:5n,patch:6n},templateContentHash:bytes("content")},
      instanceCommitment:bytes("instance"),transitioning:true,previousStateCommitment:bytes("previous"),nextStateCommitment:bytes("next"),transitionSequence:9007199254740993n,
      contextHash:bytes("context"),actionSchemaId:hexToBytes(action),purposeHash:bytes("purpose"),recipient:hexToBytes(recipient),
      validAfter:now,validBefore:now+1000n,scopedNullifier:bytes("real-codec-nullifier"),outputCommitment:bytes("output"),sourceNetwork:hexToBytes(networkHash),sourceContract:hexToBytes(sourceContract)};
    const request={network:"preprod" as const,contract:sourceContract,transactionId:"01"+"ef".repeat(32),receiptId:runtimeDecisionReceiptId(body)};
    const original=await readFinalizedDecisionReceipt({readReceiptAtTransaction:async()=>({network:request.network,contract:sourceContract,transactionId:request.transactionId,ledgerSequence:9007199254740993n,finalized:true,transactionSucceeded:true,receiptIdFromCall:request.receiptId,bodyAtTransaction:body})},request);
    const encoded=encodeM6ReceiptV1(original);
    assert.deepEqual(decodeM6ReceiptV1(encoded),original);
    const account=privateKeyToAccount(generatePrivateKey()), sdkKeyId=keyId+"-sdk";
    await registry.write.registerGatewayKeyEpoch([hash(sdkKeyId),account.address,now-1n,now+10000n,now+20000n],{account:keyManager.account});
    const transport=await signGatewayTransport({account,chainId,registry:registry.address,outboxKey:hash("real-codec-outbox"),sourceIdentityHash:m6SourceIdentityHash(original),encodedReceipt:encoded,signedAt:Number(now),epochs:[{keyId:sdkKeyId,verifier:account.address,activeFrom:Number(now)-1,signingCutoff:Number(now)+10000,verificationCutoff:Number(now)+10000}],forbiddenSigners:wallets.map(w=>w.account.address)});
    await registry.write.registerReceipt([version,encoded,encodeM6GatewaySignature(transport)],{account:relayer.account});
    const stored=await registry.read.getReceipt([original.receiptId]);
    assert.equal(stored.gatewaySigner,getAddress(account.address));
    assert.equal(stored.sourceTransaction,`0x${original.sourceTransaction}`);
    assert.equal(stored.recipient,original.recipient);assert.equal(stored.proofModuleVersion,original.proofModuleVersion);
    assert.equal(stored.templateVersion,original.semanticVersion);assert.equal(stored.transitionSequence,9007199254740993n);
    assert.equal(stored.sourceLedgerSequence,9007199254740993n);
    await registry.write.executeReceipt([original.receiptId,"0x"],{account:relayer.account});
    assert.equal(await adapter.read.lastReceiptId(),original.receiptId);
  });
  it("stores the original ID, complete recipient, transaction and version strings and executes once",async function () {
    const r=receipt();const p=await packet(r);
    assert.notEqual(r.receiptId,keccak256(p.encoded));
    await registry.write.registerReceipt([version,p.encoded,p.metadata],{account:relayer.account});
    const stored=await registry.read.getReceipt([r.receiptId]);
    assert.equal(stored.recipient,r.recipient);assert.equal(stored.sourceTransaction,r.sourceTransaction);
    assert.equal(stored.sourceNetworkName,"preprod");assert.equal(stored.proofModuleVersion,r.proofModuleVersion);
    assert.equal(stored.templateVersion,r.templateVersion);assert.equal(stored.gatewaySigner,getAddress(gateway.account.address));
    await registry.write.executeReceipt([r.receiptId,"0x"],{account:relayer.account});
    assert.equal(await adapter.read.lastReceiptId(),r.receiptId);
    await assert.rejects(registry.write.executeReceipt([r.receiptId,"0x"],{account:relayer.account}),/ReceiptAlreadyConsumed/);
  });
  it("rejects wrong registry and chain signature domains",async function () {
    const r=receipt();
    for(const p of [await packet(r,adapter.address),await packet(r,registry.address,chainId+1n)]) {
      await assert.rejects(registry.write.registerReceipt([version,p.encoded,p.metadata],{account:relayer.account}),/GatewaySignerMismatch/);
    }
  });
  it("rejects signed fields changed after signing",async function () {
    const r=receipt();const p=await packet(r);
    const changed=encode({...r,recipient:hash("another runtime recipient")});
    await assert.rejects(registry.write.registerReceipt([version,changed,p.metadata],{account:relayer.account}),/GatewaySignerMismatch/);
  });
  it("rejects truncated/extended source transactions and network substitutions even if signed",async function () {
    const r=receipt();
    for(const sourceTransaction of [hash("truncated tx"),`${r.sourceTransaction}ab` as Hex]) {
      const p=await packet({...r,sourceTransaction});
      await assert.rejects(registry.write.registerReceipt([version,p.encoded,p.metadata],{account:relayer.account}),/InvalidM6Receipt/);
    }
    const p=await packet({...r,sourceNetworkName:"undeployed"});
    await assert.rejects(registry.write.registerReceipt([version,p.encoded,p.metadata],{account:relayer.account}),/InvalidM6Receipt/);
  });
  it("rejects noncanonical ABI receipt and signature envelopes",async function () {
    const p=await packet(receipt());
    await assert.rejects(verifier.read.verify([`${p.encoded}${"00".repeat(32)}`,p.metadata]),/NonCanonicalM6Encoding/);
    await assert.rejects(verifier.read.verify([p.encoded,`${p.metadata}${"00".repeat(32)}`]),/NonCanonicalM6Encoding/);
  });
  it("rejects semantic version aliases and uint64 overflow",async function () {
    for(const proofModuleVersion of ["01.0.0","1.0","1.0.0+alias","18446744073709551616.0.0"]) {
      const p=await packet({...receipt(),proofModuleVersion});
      await assert.rejects(verifier.read.verify([p.encoded,p.metadata]),/InvalidM6Receipt/);
    }
  });
});
