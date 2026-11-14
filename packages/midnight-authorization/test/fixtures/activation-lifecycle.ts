// Crypto-valid synthetic genesis for generated-circuit tests only; no approval or native evidence.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createCircuitContext, createConstructorContext, dummyContractAddress,
  type CircuitContext } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { Contract, ledger, pureCircuits as pure, type ActivationAdmissionEnvelope,
  type GovernanceActivatorLeaf } from "../../contracts/managed/permio-authorization-v12/contract/index.js";
import { buildAuthorityRoot } from "../../src/authority-root.ts";
import { buildProofModuleBindingTree } from "../../src/binding-manifest.ts";
import { governanceActivatorPublicKey, permioAuthorizationWitnesses,
  signActivationAdmissionEnvelope } from "../../src/compact-crypto.ts";
import { emptyGeneratedMapValue, generatedInfo, seedGeneratedMap } from "./generated-genesis-v11.ts";

const bytes = (n: number) => new Uint8Array(32).fill(n);
const hex = (n: number) => `0x${Buffer.from(bytes(n)).toString("hex")}` as const;

export function activationLifecycleFixture() {
  const info = JSON.parse(readFileSync(new URL("../../contracts/managed/permio-authorization-v12/compiler/contract-info.json", import.meta.url), "utf8"));
  assert.deepEqual(info.ledger, generatedInfo.ledger, "Synthetic map helpers require exact v11/v12 ledger layout");
  const bindingTree = buildProofModuleBindingTree([{ actionIndex: 0, actionId: "act", proofProfileId: "profile",
    moduleId: "test-module", moduleVersion: "1.0.0", implementationHash: hex(8), configurationHash: hex(9), receiptSchemaHash: hex(10) }]);
  const envelope: ActivationAdmissionEnvelope = { envelopeVersion: 1n, namespaceHash: bytes(1), templateIdHash: bytes(2),
    semanticVersion: { major: 1n, minor: 0n, patch: 0n }, templateContentHash: bytes(4), governancePolicyHash: bytes(5),
    proofModuleBindingsHash: bytes(6), proofModuleBindingRoot: bindingTree.root, proofModuleBindingCount: 1n,
    proofModuleRegistrySequence: 0n, m4ActivationRecordHash: bytes(11), approvalEvidenceCommitment: bytes(12),
    authorityRootVersion: 1n, authorityRootSequence: 1n, targetNetworkHash: bytes(3), targetContractIdentity: bytes(0),
    registryProtocolVersion: 1n, admissionNonce: bytes(13), activatedAt: 900n, stagingExpiresAt: 1500n };
  const activator: GovernanceActivatorLeaf = { leafVersion: 1n, namespaceHash: envelope.namespaceHash,
    governancePolicyHash: envelope.governancePolicyHash, authorityKind: 3n,
    publicKey: governanceActivatorPublicKey(29n), validAfter: 0n, validBefore: 2000n };
  const authority = buildAuthorityRoot([activator]);
  const authorityPath = authority.pathFor(pure.governanceActivatorLeafCommitment(activator));
  const signature = signActivationAdmissionEnvelope(envelope, 29n, 53n);
  const contract = new Contract<undefined>(permioAuthorizationWitnesses);
  const initialized = contract.initialState(createConstructorContext(undefined, "00".repeat(32)),
    envelope.targetNetworkHash, envelope.namespaceHash, envelope.governancePolicyHash,
    authority.root, 1n, 1n, { field: 0n }, 2n, 2n, 2n);
  const binding = bindingTree.compactBindingAt(0);
  const identity = { moduleIdHash: binding.moduleIdHash, moduleVersion: binding.moduleVersion, implementationHash: binding.implementationHash };
  const moduleKey = pure.proofModuleRegistryKeyFromIdentity(identity);
  const state = seedGeneratedMap(initialized.currentContractState.data, "proofModules", moduleKey,
    { ...emptyGeneratedMapValue("proofModules"), identity, lifecycleStatus: 4n, receiptSchemaHash: binding.receiptSchemaHash });
  const context = createCircuitContext(dummyContractAddress(), "00".repeat(32), state, undefined, undefined, undefined, 1000);
  const call = (ctx: CircuitContext<undefined>, operation: bigint, env = envelope, sig = signature, leaf = activator) =>
    contract.circuits.manageM4Activation(ctx, operation, env, sig, leaf, authorityPath);
  const begin = () => call(context, 1n);
  const stage = (ctx: CircuitContext<undefined>, key: Uint8Array) =>
    contract.circuits.stageM4ActivationBinding(ctx, key, binding, bindingTree.pathFor(0));
  const at = (ctx: CircuitContext<undefined>, time: number) => createCircuitContext(dummyContractAddress(), "00".repeat(32),
    ctx.currentQueryContext.state, undefined, undefined, undefined, time);
  return { contract, context, envelope, signature, activator, authorityPath, binding, begin, stage, call, at,
    ledger: (ctx: CircuitContext<undefined>) => ledger(ctx.currentQueryContext.state),
    signed: (env: ActivationAdmissionEnvelope) => signActivationAdmissionEnvelope(env, 29n, 59n) };
}
