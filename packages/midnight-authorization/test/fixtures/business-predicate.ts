import { createCircuitContext, createConstructorContext, ecMulGenerator, sampleContractAddress } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { Contract, pureCircuits as pure, type RuntimeBusinessRecord, type RuntimeSignedBusinessRecord,
  type RuntimeBusinessPredicate, type RuntimeBusinessPredicateContext, type RuntimeSelectedActionValue } from "../../contracts/managed/permio-authorization-v11/contract/index.js";
import { pureCircuits as legacy } from "../../contracts/managed/permio-authorization/contract/index.js";
import { permioAuthorizationWitnesses, JUBJUB_SCALAR_ORDER, TWO_TO_248 } from "../../src/compact-crypto.ts";
import { buildAuthorityRoot } from "../../src/authority-root.ts";
import { ordinaryActionFixture, testBytes as bytes } from "./ordinary-action.ts";

let baseFixture: ReturnType<typeof ordinaryActionFixture> | undefined;
export function businessPredicateFixture(kind = 1n) {
  const f = baseFixture ??= ordinaryActionFixture(), root = f.ancestry.capabilities[0]!;
  const authority = buildAuthorityRoot([f.issuer]);
  const issuerCommitment = legacy.governanceActivatorLeafCommitment(f.issuer);
  const predicate: RuntimeBusinessPredicate = { predicateVersion: 1n, kind,
    inputIndex: 0n, ceilingIndex: kind === 2n ? 1n : 0n, outputIndex: 0n,
    inputTypeHash: bytes(31), ceilingTypeHash: kind === 2n ? bytes(32) : bytes(0), outputTypeHash: bytes(33) };
  const context: RuntimeBusinessPredicateContext = {
    target: structuredClone(f.target), instanceCommitment: f.intent.instanceCommitment,
    contextHash: f.intent.contextHash, subjectAccountCredentialCommitment: f.ancestry.session.subjectAccountCredentialCommitment,
    rootCapabilityCommitment: legacy.runtimeCapabilityCredentialCommitment(root), rootIssuerAuthorityCommitment: issuerCommitment,
    resourceHash: f.intent.resourceHash, purposeHash: f.intent.purposeHash, recipientHash: f.intent.recipientHash,
    effectiveAt: 500n, validBefore: 900n, intentCommitment: legacy.runtimeActionIntentCommitment(f.intent),
    selectedInputsCommitment: bytes(0), selectedOutputsCommitment: bytes(0),
    inputCount: kind === 2n ? 2n : 1n, outputCount: 1n,
    authorityRoot: structuredClone(authority.root), issuerRoot: structuredClone(authority.root), statusRoot: structuredClone(f.status.root),
    governancePolicyHash: bytes(0), issuerCount: 1n,
  };
  const record = (typeHash: Uint8Array, nonce: number): RuntimeBusinessRecord => ({
    recordVersion: 1n, target: structuredClone(context.target), instanceCommitment: context.instanceCommitment,
    contextHash: context.contextHash, subjectAccountCredentialCommitment: context.subjectAccountCredentialCommitment,
    rootCapabilityCommitment: context.rootCapabilityCommitment, resourceHash: context.resourceHash,
    purposeHash: context.purposeHash, recipientHash: context.recipientHash, typeHash,
    validAfter: 100n, validBefore: 1400n, value: 50n, unitHash: bytes(40),
    referenceCommitment: bytes(0), bodyCommitment: bytes(41), issuerAuthorityCommitment: issuerCommitment, nonce: bytes(nonce),
  });
  const signed = (value: RuntimeBusinessRecord): RuntimeSignedBusinessRecord => ({ record: value,
    signature: { announcement: ecMulGenerator(17n), response: 0n }, issuer: structuredClone(f.issuer),
    authorityPath: authority.pathFor(issuerCommitment), issuerPath: authority.pathFor(issuerCommitment) });
  const first = signed(record(kind === 3n ? predicate.outputTypeHash : predicate.inputTypeHash, 42));
  const second = signed(record(predicate.ceilingTypeHash, 43));
  const selected = (typeHash: Uint8Array, nonce: number): RuntimeSelectedActionValue => ({ valueVersion: 1n,
    typeHash, contextHash: context.contextHash, resourceHash: context.resourceHash,
    payloadCommitment: bytes(44), nonce: bytes(nonce) });
  const empty = (): RuntimeSelectedActionValue => ({ valueVersion: 0n, typeHash: bytes(0), contextHash: bytes(0),
    resourceHash: bytes(0), payloadCommitment: bytes(0), nonce: bytes(0) });
  const inputs = Array.from({length:8},empty), outputs = Array.from({length:8},empty);
  inputs[0] = selected(predicate.inputTypeHash,45);
  if(kind === 2n) inputs[1] = selected(predicate.ceilingTypeHash,46);
  outputs[0] = selected(predicate.outputTypeHash,47);
  const statusLeaf = { leafVersion: 3n, namespaceHash: context.target.namespaceHash, credentialKind: 2n,
    credentialCommitment: context.rootCapabilityCommitment,
    revocationAuthorityAccountCredentialCommitment: root.issuerAccountCredentialCommitment,
    statusIndex: root.statusIndex, status: 1n };
  const statusPath = f.status.pathFor(root.statusIndex);
  const contract = new Contract(permioAuthorizationWitnesses);
  const initial = contract.initialState(createConstructorContext(undefined,"00".repeat(32)), f.allocation.targetNetworkHash,
    f.target.namespaceHash, bytes(0), authority.root,1n,1n,f.status.root,2n,2n,2n);
  const address = sampleContractAddress();
  function signOnly() {
    for(const value of [first,second]) {
      const challenge = pure.runtimeBusinessRecordSignatureChallenge(value.signature.announcement, value.issuer.publicKey,value.record);
      value.signature.response = (17n + (challenge % TWO_TO_248) * 11n) % JUBJUB_SCALAR_ORDER;
    }
  }
  function refreshChains() {
    context.selectedInputsCommitment = inputs.slice(0,Number(context.inputCount)).reduce<Uint8Array>((prev,row,index)=>
      legacy.runtimeSelectedActionValueStep(prev,BigInt(index),row,false),bytes(0));
    context.selectedOutputsCommitment = outputs.slice(0,Number(context.outputCount)).reduce<Uint8Array>((prev,row,index)=>
      legacy.runtimeSelectedActionValueStep(prev,BigInt(index),row,true),bytes(0));
  }
  function resign() {
    if(kind !== 3n) inputs[0]!.payloadCommitment = pure.runtimeBusinessRecordCommitment(first.record);
    if(kind === 2n) inputs[1]!.payloadCommitment = pure.runtimeBusinessRecordCommitment(second.record);
    refreshChains();
    if(kind === 3n && first.record.referenceCommitment.every(v=>v===0)) {
      first.record.referenceCommitment = pure.runtimeBusinessAuditReference(context.intentCommitment,context.selectedInputsCommitment);
    }
    outputs[0]!.payloadCommitment = kind === 3n ? pure.runtimeBusinessRecordCommitment(first.record)
      : pure.runtimeBusinessClaimCommitment(predicate,pure.runtimeBusinessRecordCommitment(first.record),
        kind === 2n ? pure.runtimeBusinessRecordCommitment(second.record) : bytes(0));
    refreshChains(); signOnly();
  }
  resign();
  function verify() {
    return contract.circuits.verifyRuntimeBusinessPredicate(createCircuitContext(address,"00".repeat(32),
      initial.currentContractState.data,undefined,undefined,undefined,500),context,predicate,
      first,second,inputs,outputs,statusLeaf,statusPath);
  }
  return {context,predicate,first,second,inputs,outputs,statusLeaf,statusPath,signOnly,refreshChains,resign,verify};
}
