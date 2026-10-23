import { readFileSync } from "node:fs";

import { network } from "hardhat";
import {
  encodeAbiParameters,
  keccak256,
  stringToHex,
  type Address,
  type Hex,
} from "viem";

const DEPLOYED_ADDRESSES_PATH = new URL(
  "../ignition/deployments/chain-31337/deployed_addresses.json",
  import.meta.url,
);
const MODULE_PREFIX = "ExecutionRegistryLocalFixture";
const FIXTURE_RECEIPT_VERSION = keccak256(
  stringToHex("permio.fixture.expected-m6-decision-receipt.v0"),
);
const ZERO_HASH = `0x${"00".repeat(32)}` as const;

const EXPECTED_RECEIPT_FIELDS = [
  { name: "receiptVersion", type: "bytes32" },
  { name: "proofModuleId", type: "bytes32" },
  { name: "proofModuleVersion", type: "string" },
  { name: "proofModuleImplementationHash", type: "bytes32" },
  { name: "namespaceHash", type: "bytes32" },
  { name: "templateIdHash", type: "bytes32" },
  { name: "templateVersion", type: "string" },
  { name: "templateContentHash", type: "bytes32" },
  { name: "instanceCommitment", type: "bytes32" },
  { name: "previousStateCommitment", type: "bytes32" },
  { name: "nextStateCommitment", type: "bytes32" },
  { name: "transitionSequence", type: "uint64" },
  { name: "contextHash", type: "bytes32" },
  { name: "actionSchemaId", type: "bytes32" },
  { name: "purposeHash", type: "bytes32" },
  { name: "recipient", type: "bytes32" },
  { name: "validAfter", type: "uint64" },
  { name: "validBefore", type: "uint64" },
  { name: "scopedNullifier", type: "bytes32" },
  { name: "outputCommitment", type: "bytes32" },
  { name: "sourceNetwork", type: "bytes32" },
  { name: "sourceNetworkName", type: "string" },
  { name: "sourceContract", type: "bytes32" },
  { name: "sourceTransaction", type: "bytes" },
  { name: "sourceLedgerSequence", type: "uint64" },
  { name: "gatewayKeyId", type: "bytes32" },
  { name: "gatewaySignedAt", type: "uint64" },
  { name: "targetChainId", type: "uint256" },
  { name: "targetRegistry", type: "address" },
] as const;

const hash = (label: string): Hex => keccak256(stringToHex(label));

interface ExpectedReceipt {
  readonly receiptVersion: Hex;
  readonly proofModuleId: Hex;
  readonly proofModuleVersion: string;
  readonly proofModuleImplementationHash: Hex;
  readonly namespaceHash: Hex;
  readonly templateIdHash: Hex;
  readonly templateVersion: string;
  readonly templateContentHash: Hex;
  readonly instanceCommitment: Hex;
  readonly previousStateCommitment: Hex;
  readonly nextStateCommitment: Hex;
  readonly transitionSequence: bigint;
  readonly contextHash: Hex;
  readonly actionSchemaId: Hex;
  readonly purposeHash: Hex;
  readonly recipient: Hex;
  readonly validAfter: bigint;
  readonly validBefore: bigint;
  readonly scopedNullifier: Hex;
  readonly outputCommitment: Hex;
  readonly sourceNetwork: Hex;
  readonly sourceNetworkName: string;
  readonly sourceContract: Hex;
  readonly sourceTransaction: Hex;
  readonly sourceLedgerSequence: bigint;
  readonly gatewayKeyId: Hex;
  readonly gatewaySignedAt: bigint;
  readonly targetChainId: bigint;
  readonly targetRegistry: Address;
}

const deployed = JSON.parse(readFileSync(DEPLOYED_ADDRESSES_PATH, "utf8")) as Record<
  string,
  Address
>;
const registryAddress = deployed[`${MODULE_PREFIX}#ExecutionRegistry`];
const verifierAddress = deployed[`${MODULE_PREFIX}#ExpectedM6M7ReceiptVerifier`];
const adapterAddress = deployed[`${MODULE_PREFIX}#RecordingExecutionAdapter`];
if (!registryAddress || !verifierAddress || !adapterAddress) {
  throw new Error(`Missing ${MODULE_PREFIX} deployment addresses`);
}

const { viem } = await network.getOrCreate();
const publicClient = await viem.getPublicClient();
const wallets = await viem.getWalletClients();
const gateway = wallets[6];
const relayer = wallets[7];
if (!gateway || !relayer) {
  throw new Error("The localhost fixture requires Hardhat accounts 6 and 7");
}

const registry = await viem.getContractAt("ExecutionRegistry", registryAddress);
const block = await publicClient.getBlock();
const chainId = await publicClient.getChainId();
const runId = `${block.number.toString()}-${block.timestamp.toString()}`;
const receipt: ExpectedReceipt = {
  receiptVersion: FIXTURE_RECEIPT_VERSION,
  proofModuleId: hash("delegated-capability-action-v1"),
  proofModuleVersion: "1.0.0",
  proofModuleImplementationHash: hash("fixture-proof-module-implementation"),
  namespaceHash: hash("fixture.namespace"),
  templateIdHash: hash("fixture-template"),
  templateVersion: "1.0.0",
  templateContentHash: hash("fixture-template-content"),
  instanceCommitment: hash(`fixture-instance-${runId}`),
  previousStateCommitment: ZERO_HASH,
  nextStateCommitment: hash(`fixture-next-state-${runId}`),
  transitionSequence: block.number,
  contextHash: hash("fixture-context"),
  actionSchemaId: hash("permio.fixture.action.v0"),
  purposeHash: hash("fixture-purpose"),
  recipient: hash("fixture-runtime-recipient"),
  validAfter: block.timestamp,
  validBefore: block.timestamp + 3_600n,
  scopedNullifier: hash(`fixture-nullifier-${runId}`),
  outputCommitment: hash(`fixture-public-output-${runId}`),
  sourceNetwork: hash("midnight-local-dev-fixture"),
  sourceNetworkName: "midnight-local-dev-fixture",
  sourceContract: hash("expected-m6-contract-fixture"),
  sourceTransaction: hash(`fixture-midnight-transaction-${runId}`),
  sourceLedgerSequence: block.number,
  gatewayKeyId: hash("fixture-gateway-key-epoch-1"),
  gatewaySignedAt: block.timestamp,
  targetChainId: BigInt(chainId),
  targetRegistry: registryAddress,
};
const encodedReceipt = encodeAbiParameters(
  [{ type: "tuple", components: EXPECTED_RECEIPT_FIELDS }],
  [receipt],
);
const gatewaySignature = await gateway.signTypedData({
  account: gateway.account,
  domain: {
    name: "Permio Expected M7 Fixture",
    version: "0",
    chainId,
    verifyingContract: verifierAddress,
  },
  types: { ExpectedReceipt: EXPECTED_RECEIPT_FIELDS },
  primaryType: "ExpectedReceipt",
  message: receipt,
});
const receiptId = keccak256(encodedReceipt);
const registrationHash = await registry.write.registerReceipt(
  [FIXTURE_RECEIPT_VERSION, encodedReceipt, gatewaySignature],
  { account: relayer.account },
);
await publicClient.waitForTransactionReceipt({ hash: registrationHash });

const executionHash = await registry.write.executeReceipt(
  [receiptId, stringToHex(`fixture-execution-${runId}`)],
  { account: relayer.account },
);
const execution = await publicClient.waitForTransactionReceipt({
  hash: executionHash,
});

console.log(
  JSON.stringify(
    {
      status: "EXPECTED_UPSTREAM_CONTRACT_FIXTURE_NOT_ACCEPTANCE_EVIDENCE",
      chainId,
      registryAddress,
      verifierAddress,
      adapterAddress,
      receiptId,
      registrationHash,
      executionHash,
      executionBlock: execution.blockNumber.toString(),
    },
    null,
    2,
  ),
);
