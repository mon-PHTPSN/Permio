import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFile, copyFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  createCircuitContext,
  type CircuitContext,
  type CircuitResults,
} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { CompiledContract, type Contract as CompactContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import {
  deployContract, findDeployedContract, type ContractProviders,
} from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import {
  CredentialStatusTree, createRuntimeStatusMultiproof,
  createFundedLocalWallet, createLocalAuthorizationProviders,
  hashProtocolIdentifier, permioAuthorizationWitnesses,
  PERMIO_AUTHORIZATION_ASSETS_PATH, LOCAL_MIDNIGHT_ENVIRONMENT,
  verifyPermioAuthorizationAssets,
  type PermioAuthorizationContract, type RuntimeStatusMultiproof,
} from "@permio/midnight-authorization";

type ProbeCircuit = (context: CircuitContext<undefined>, namespace: Uint8Array,
  proof: RuntimeStatusMultiproof) => CircuitResults<undefined, []>;
interface ProbeContract extends PermioAuthorizationContract {
  circuits: PermioAuthorizationContract["circuits"] & { checkRuntimeStatusMultiproof: ProbeCircuit };
  impureCircuits: PermioAuthorizationContract["impureCircuits"] & { checkRuntimeStatusMultiproof: ProbeCircuit };
  provableCircuits: PermioAuthorizationContract["provableCircuits"] & { checkRuntimeStatusMultiproof: ProbeCircuit };
}

const baselineCircuits = [
  "beginM4Activation", "finalizeM4Activation", "governProofModule", "proposeProofModule",
  "reviewProofModule", "stageM4ActivationBinding", "submitAuthorityRootApproval",
  "terminateTemplate", "updateRuntimeCredentialStatus",
];
const assetArgument = process.argv[2] ?? "logs/m6-current-status-managed";
const assets = path.resolve(assetArgument);
const logs = path.resolve("logs");
const relative = path.relative(logs, assets);
assert(relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) &&
  !path.isAbsolute(relative), "diagnostic assets must be a directory inside repository logs");
assert(process.argv.length <= 4, "usage: node scripts/run-live-m6-status.ts [diagnostic-assets]");

const evidencePath = path.join(logs, `m6-status-live-${new Date().toISOString().replaceAll(":", "-")}.jsonl`);
let phase = "asset-preparation";
async function event(name: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), event: name,
    scope: "current-status-membership-diagnostic-not-action-acceptance", ...fields });
  await mkdir(logs, { recursive: true });
  await appendFile(evidencePath, `${line}\n`);
  process.stdout.write(`${line}\n`);
}

async function prepareAssets() {
  await verifyPermioAuthorizationAssets(PERMIO_AUTHORIZATION_ASSETS_PATH);
  // Never pair a prior prover key with changed proof constraints. Only identical
  // generated baseline programs may reuse their existing key pair.
  await mkdir(path.join(assets, "keys"), { recursive: true });
  for (const name of baselineCircuits) {
    const current = await readFile(path.join(assets, "zkir", `${name}.zkir`));
    const baseline = await readFile(path.join(PERMIO_AUTHORIZATION_ASSETS_PATH, "zkir", `${name}.zkir`));
    assert(current.equals(baseline), "diagnostic baseline proof program differs; regenerate its keys");
    for (const suffix of ["prover", "verifier"]) {
      const filename = `${name}.${suffix}`;
      const source = path.join(PERMIO_AUTHORIZATION_ASSETS_PATH, "keys", filename);
      assert((await stat(source)).size > 0, "baseline proving assets are missing");
      await copyFile(source, path.join(assets, "keys", filename));
    }
  }
  for (const suffix of ["prover", "verifier"]) {
    assert((await stat(path.join(assets, "keys", `checkRuntimeStatusMultiproof.${suffix}`))).size > 0,
      "status diagnostic key generation must complete before wallet startup");
  }
}

async function main() {
  await prepareAssets();
  const generated = await import(pathToFileURL(path.join(assets, "contract", "index.js")).href);
  const Contract = generated.Contract as new (
    witnesses: typeof permioAuthorizationWitnesses
  ) => ProbeContract;
  const compiledContract = CompiledContract.make("permio-m6-status-diagnostic-v1", Contract).pipe(
    CompiledContract.withWitnesses(permioAuthorizationWitnesses),
    CompiledContract.withCompiledFileAssets(assets),
  );
  const namespace = "org.permio.status-diagnostic";
  const namespaceHash = Uint8Array.from(Buffer.from(hashProtocolIdentifier("namespace", namespace).slice(2), "hex"));
  const tree = new CredentialStatusTree();
  // Bootstrap synthetic status membership only. These commitments do not
  // assert authorized credential issuance or a valid delegation chain.
  const indices = Array.from({ length: 35 }, (_, index) => BigInt(index * 29_959));
  for (const [index, statusIndex] of indices.entries()) tree.issue({
    namespace, kind: "account", statusIndex,
    credentialCommitment: new Uint8Array(32).fill(index + 1),
    revocationAuthorityAccountCredentialCommitment: new Uint8Array(32).fill(17),
  });
  // Constructor initializes the supplied root with ledger sequence zero.
  const proof = { ...createRuntimeStatusMultiproof(tree.multiproofFor(indices)), rootSequence: 0n };
  const accountFile = JSON.parse(
    await readFile("../midnight-local-dev/accounts.example.json", "utf8"),
  ) as { accounts: { mnemonic: string }[] };
  const mnemonic = accountFile.accounts[0]?.mnemonic;
  assert(mnemonic, "funded disposable Local Dev account is required");
  await event("starting", { network: "undeployed", compiler: "0.31.1", runtime: "0.16.0",
    midnightJs: "4.1.1", selectedLeafCount: 35, milestoneComplete: false });
  phase = "wallet-synchronization";
  const wallet = await createFundedLocalWallet(mnemonic);
  try {
    const baseProviders = createLocalAuthorizationProviders(wallet);
    const zkConfigProvider = new NodeZkConfigProvider<CompactContract.ProvableCircuitId<ProbeContract>>(assets);
    const providers: ContractProviders<ProbeContract> = {
      ...baseProviders, zkConfigProvider,
      proofProvider: httpClientProofProvider(LOCAL_MIDNIGHT_ENVIRONMENT.proofServer, zkConfigProvider),
    };
    phase = "diagnostic-deployment";
    const deployed = await deployContract(providers, { compiledContract, args: [
      new Uint8Array(32).fill(31), namespaceHash, new Uint8Array(32).fill(32),
      { field: 0n }, 1n, 1n, tree.root, 2n, 2n, 2n,
    ] });
    const address = deployed.deployTxData.public.contractAddress;
    await event("deployed", { contractAddress: address, transactionId: deployed.deployTxData.public.txId });
    const state = await providers.publicDataProvider.queryContractState(address);
    assert(state, "diagnostic deployment must be indexed");
    phase = "negative-preflight";
    const context = createCircuitContext(address, "00".repeat(32), state.data, undefined);
    const simulator = new Contract(permioAuthorizationWitnesses);
    assert.throws(() => simulator.circuits.checkRuntimeStatusMultiproof(context, namespaceHash,
      { ...proof, rootSequence: 1n }), /stale/);
    const altered = structuredClone(proof);
    altered.leaves[0]!.leaf[0]! ^= 1;
    assert.throws(() => simulator.circuits.checkRuntimeStatusMultiproof(context, namespaceHash, altered));
    await event("negative-preflight-rejected", { staleSequence: true, alteredLeaf: true,
      submittedNegativeTransactions: 0 });
    phase = "membership-proof-submission";
    const accepted = await deployed.callTx.checkRuntimeStatusMultiproof(namespaceHash, proof);
    await event("membership-proof-accepted", { contractAddress: address, transactionId: accepted.public.txId });
    phase = "reconnect-and-state-verification";
    const connected = await findDeployedContract(providers, { compiledContract, contractAddress: address });
    const finalState = await providers.publicDataProvider.queryContractState(address);
    assert(finalState, "diagnostic state must survive reconnect");
    const finalLedger = generated.ledger(finalState.data);
    assert.equal(finalLedger.credentialStatusRoots.lookup(namespaceHash).root.field, tree.root.field);
    assert.equal(finalLedger.credentialStatusRoots.lookup(namespaceHash).rootSequence, 0n);
    assert.equal(finalLedger.activeTemplates.size(), 0n);
    assert.equal(connected.deployTxData.public.contractAddress, address);
    const ir = await readFile(path.join(assets, "zkir", "checkRuntimeStatusMultiproof.zkir"));
    await event("verified", { contractAddress: address, readonly: true, statusSequence: 0,
      credentialIssuanceVerified: false, actionAuthorizationVerified: false, milestoneComplete: false,
      proofProgramSha256: createHash("sha256").update(ir).digest("hex") });
  } finally {
    await wallet.stop();
  }
}

try {
  await main();
} catch (error: unknown) {
  // SDK/type errors can contain private call arguments; never dump the error.
  const message = error instanceof Error ? error.message : "";
  const category = message.includes("exhaust the block limits") ? "ledger-block-limit"
    : /ECONNREFUSED|fetch failed/.test(message) ? "service-connection"
    : /key generation must complete|ENOENT/.test(message) ? "missing-build-assets"
    : "unclassified-private-error";
  await event("failed", { phase, category, milestoneComplete: false,
    detailsWithheldToProtectPrivateWitness: true });
  process.exitCode = 1;
}
