import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { beforeEach, describe, it } from "node:test";

import {
  encodeAbiParameters,
  getAddress,
  keccak256,
  parseEventLogs,
  stringToHex,
  toEventSelector,
  type Address,
  type Hex,
} from "viem";
import { network } from "hardhat";

const FIXTURE_RECEIPT_VERSION = keccak256(
  stringToHex("permio.fixture.expected-m6-decision-receipt.v0"),
);
const ZERO_HASH = `0x${"00".repeat(32)}` as const;

const EXPECTED_RECEIPT_FIELDS = [
  { name: "receiptVersion", type: "bytes32" },
  { name: "proofModuleId", type: "bytes32" },
  { name: "proofModuleVersion", type: "bytes32" },
  { name: "proofModuleImplementationHash", type: "bytes32" },
  { name: "namespaceHash", type: "bytes32" },
  { name: "templateIdHash", type: "bytes32" },
  { name: "templateVersion", type: "bytes32" },
  { name: "templateContentHash", type: "bytes32" },
  { name: "instanceCommitment", type: "bytes32" },
  { name: "previousStateCommitment", type: "bytes32" },
  { name: "nextStateCommitment", type: "bytes32" },
  { name: "transitionSequence", type: "uint64" },
  { name: "contextHash", type: "bytes32" },
  { name: "actionSchemaId", type: "bytes32" },
  { name: "purposeHash", type: "bytes32" },
  { name: "recipient", type: "address" },
  { name: "validAfter", type: "uint64" },
  { name: "validBefore", type: "uint64" },
  { name: "scopedNullifier", type: "bytes32" },
  { name: "outputCommitment", type: "bytes32" },
  { name: "sourceNetwork", type: "bytes32" },
  { name: "sourceContract", type: "bytes32" },
  { name: "sourceTransaction", type: "bytes32" },
  { name: "sourceLedgerSequence", type: "uint64" },
  { name: "gatewayKeyId", type: "bytes32" },
  { name: "gatewaySignedAt", type: "uint64" },
  { name: "targetChainId", type: "uint256" },
  { name: "targetRegistry", type: "address" },
] as const;

const EXPECTED_RECEIPT_TYPES = {
  ExpectedReceipt: EXPECTED_RECEIPT_FIELDS,
} as const;

interface ExpectedReceipt {
  readonly receiptVersion: Hex;
  readonly proofModuleId: Hex;
  readonly proofModuleVersion: Hex;
  readonly proofModuleImplementationHash: Hex;
  readonly namespaceHash: Hex;
  readonly templateIdHash: Hex;
  readonly templateVersion: Hex;
  readonly templateContentHash: Hex;
  readonly instanceCommitment: Hex;
  readonly previousStateCommitment: Hex;
  readonly nextStateCommitment: Hex;
  readonly transitionSequence: bigint;
  readonly contextHash: Hex;
  readonly actionSchemaId: Hex;
  readonly purposeHash: Hex;
  readonly recipient: Address;
  readonly validAfter: bigint;
  readonly validBefore: bigint;
  readonly scopedNullifier: Hex;
  readonly outputCommitment: Hex;
  readonly sourceNetwork: Hex;
  readonly sourceContract: Hex;
  readonly sourceTransaction: Hex;
  readonly sourceLedgerSequence: bigint;
  readonly gatewayKeyId: Hex;
  readonly gatewaySignedAt: bigint;
  readonly targetChainId: bigint;
  readonly targetRegistry: Address;
}

function hash(label: string): Hex {
  return keccak256(stringToHex(label));
}

describe("ExecutionRegistry M8 preparation", async function () {
  const { viem, networkHelpers } = await network.getOrCreate();
  const publicClient = await viem.getPublicClient();
  const [
    admin,
    receiptSchemaAdmin,
    sourceAdmin,
    gatewayKeyManager,
    adapterRegistrar,
    emergencyAuthority,
    gateway,
    relayer,
    unauthorized,
  ] = await viem.getWalletClients();

  let registry: Awaited<ReturnType<typeof viem.deployContract<"ExecutionRegistry">>>;
  let verifier: Awaited<
    ReturnType<typeof viem.deployContract<"ExpectedM6M7ReceiptVerifier">>
  >;
  let adapter: Awaited<
    ReturnType<typeof viem.deployContract<"RecordingExecutionAdapter">>
  >;
  let chainId: number;
  let sourceNetwork: Hex;
  let sourceContract: Hex;
  let actionSchemaId: Hex;
  let gatewayKeyId: Hex;

  beforeEach(async function () {
    registry = await viem.deployContract("ExecutionRegistry", [
      admin.account.address,
      receiptSchemaAdmin.account.address,
      sourceAdmin.account.address,
      gatewayKeyManager.account.address,
      adapterRegistrar.account.address,
      emergencyAuthority.account.address,
    ]);
    verifier = await viem.deployContract("ExpectedM6M7ReceiptVerifier", [
      registry.address,
    ]);
    adapter = await viem.deployContract("RecordingExecutionAdapter", [
      registry.address,
    ]);
    chainId = await publicClient.getChainId();
    sourceNetwork = hash("midnight-local-dev-fixture");
    sourceContract = hash("expected-m6-contract-fixture");
    actionSchemaId = hash("permio.fixture.action.v0");
    gatewayKeyId = hash("fixture-gateway-key-epoch-1");

    const block = await publicClient.getBlock();
    await registry.write.configureReceiptVerifier(
      [FIXTURE_RECEIPT_VERSION, verifier.address],
      { account: receiptSchemaAdmin.account },
    );
    await registry.write.setSource([sourceNetwork, sourceContract, true], {
      account: sourceAdmin.account,
    });
    await registry.write.registerGatewayKeyEpoch(
      [gatewayKeyId, gateway.account.address, block.timestamp - 1n, block.timestamp + 10_000n],
      { account: gatewayKeyManager.account },
    );
    await registry.write.registerAdapter(
      [FIXTURE_RECEIPT_VERSION, actionSchemaId, adapter.address],
      { account: adapterRegistrar.account },
    );
  });

  async function createReceipt(
    overrides: Partial<ExpectedReceipt> = {},
  ): Promise<ExpectedReceipt> {
    const block = await publicClient.getBlock();
    return {
      receiptVersion: FIXTURE_RECEIPT_VERSION,
      proofModuleId: hash("delegated-capability-action-v1"),
      proofModuleVersion: hash("1.0.0"),
      proofModuleImplementationHash: hash("fixture-proof-module-implementation"),
      namespaceHash: hash("fixture.namespace"),
      templateIdHash: hash("fixture-template"),
      templateVersion: hash("1.0.0"),
      templateContentHash: hash("fixture-template-content"),
      instanceCommitment: hash("fixture-instance"),
      previousStateCommitment: ZERO_HASH,
      nextStateCommitment: ZERO_HASH,
      transitionSequence: 0n,
      contextHash: hash("fixture-context"),
      actionSchemaId,
      purposeHash: hash("fixture-purpose"),
      recipient: adapter.address,
      validAfter: block.timestamp,
      validBefore: block.timestamp + 1_000n,
      scopedNullifier: hash("fixture-nullifier"),
      outputCommitment: hash("fixture-public-output"),
      sourceNetwork,
      sourceContract,
      sourceTransaction: hash("fixture-midnight-transaction"),
      sourceLedgerSequence: 42n,
      gatewayKeyId,
      gatewaySignedAt: block.timestamp,
      targetChainId: BigInt(chainId),
      targetRegistry: registry.address,
      ...overrides,
    };
  }

  function encodeReceipt(receipt: ExpectedReceipt): Hex {
    return encodeAbiParameters(
      [{ type: "tuple", components: EXPECTED_RECEIPT_FIELDS }],
      [receipt],
    );
  }

  async function signReceipt(receipt: ExpectedReceipt, signer = gateway) {
    return signer.signTypedData({
      account: signer.account,
      domain: {
        name: "Permio Expected M7 Fixture",
        version: "0",
        chainId,
        verifyingContract: verifier.address,
      },
      types: EXPECTED_RECEIPT_TYPES,
      primaryType: "ExpectedReceipt",
      message: receipt,
    });
  }

  async function register(
    receipt: ExpectedReceipt,
    signer = gateway,
  ): Promise<Hex> {
    const encoded = encodeReceipt(receipt);
    const signature = await signReceipt(receipt, signer);
    await registry.write.registerReceipt(
      [FIXTURE_RECEIPT_VERSION, encoded, signature],
      { account: relayer.account },
    );
    return keccak256(encoded);
  }

  it("requires six distinct initial authorities", async function () {
    await assert.rejects(
      viem.deployContract("ExecutionRegistry", [
        admin.account.address,
        admin.account.address,
        sourceAdmin.account.address,
        gatewayKeyManager.account.address,
        adapterRegistrar.account.address,
        emergencyAuthority.account.address,
      ]),
      /DuplicateInitialAuthority/,
    );
    await assert.rejects(
      viem.deployContract("ExecutionRegistry", [
        "0x0000000000000000000000000000000000000000",
        receiptSchemaAdmin.account.address,
        sourceAdmin.account.address,
        gatewayKeyManager.account.address,
        adapterRegistrar.account.address,
        emergencyAuthority.account.address,
      ]),
      /ZeroAddress/,
    );
  });

  it("accepts only deployed verifier and adapter contracts", async function () {
    await assert.rejects(
      registry.write.configureReceiptVerifier(
        [hash("fixture-version-with-eoa-verifier"), unauthorized.account.address],
        { account: receiptSchemaAdmin.account },
      ),
      /AddressHasNoCode/,
    );
    await assert.rejects(
      registry.write.registerAdapter(
        [FIXTURE_RECEIPT_VERSION, hash("fixture-action-with-eoa-adapter"), unauthorized.account.address],
        { account: adapterRegistrar.account },
      ),
      /AddressHasNoCode/,
    );
  });

  it("keeps verifier, gateway epoch, and adapter registrations immutable", async function () {
    await assert.rejects(
      registry.write.configureReceiptVerifier(
        [FIXTURE_RECEIPT_VERSION, verifier.address],
        { account: receiptSchemaAdmin.account },
      ),
      /ReceiptVersionAlreadyConfigured/,
    );
    const block = await publicClient.getBlock();
    await assert.rejects(
      registry.write.registerGatewayKeyEpoch(
        [gatewayKeyId, gateway.account.address, block.timestamp, block.timestamp + 100n],
        { account: gatewayKeyManager.account },
      ),
      /GatewayKeyAlreadyRegistered/,
    );
    await assert.rejects(
      registry.write.registerAdapter(
        [FIXTURE_RECEIPT_VERSION, actionSchemaId, adapter.address],
        { account: adapterRegistrar.account },
      ),
      /AdapterAlreadyRegistered/,
    );
  });

  it("registers an exact public fixture receipt through an unprivileged relayer", async function () {
    const receipt = await createReceipt();
    const receiptId = await register(receipt);
    const record = await registry.read.getReceipt([receiptId]);

    assert.equal(record.receiptVersion, FIXTURE_RECEIPT_VERSION);
    assert.equal(record.sourceNetwork, sourceNetwork);
    assert.equal(record.sourceContract, sourceContract);
    assert.equal(record.sourceTransaction, receipt.sourceTransaction);
    assert.equal(record.templateContentHash, receipt.templateContentHash);
    assert.equal(record.proofModuleImplementationHash, receipt.proofModuleImplementationHash);
    assert.equal(record.recipient, getAddress(adapter.address));
    assert.equal(record.gatewaySigner, getAddress(gateway.account.address));
    assert.equal(record.revoked, false);
    assert.equal(record.consumed, false);
  });

  it("emits every public field required to reconstruct the receipt", async function () {
    const receipt = await createReceipt({
      previousStateCommitment: hash("fixture-previous-state"),
      nextStateCommitment: hash("fixture-next-state"),
      transitionSequence: 7n,
    });
    const encoded = encodeReceipt(receipt);
    const signature = await signReceipt(receipt);
    const transactionHash = await registry.write.registerReceipt(
      [FIXTURE_RECEIPT_VERSION, encoded, signature],
      { account: relayer.account },
    );
    const transaction = await publicClient.waitForTransactionReceipt({
      hash: transactionHash,
    });
    const events = parseEventLogs({
      abi: registry.abi,
      logs: transaction.logs,
      strict: true,
    });

    const source = events.find(
      (event) => event.eventName === "ReceiptSourceBound",
    );
    assert(source && source.eventName === "ReceiptSourceBound");
    assert.equal(source.args.sourceTransaction, receipt.sourceTransaction);
    assert.equal(source.args.gatewaySignedAt, receipt.gatewaySignedAt);

    const implementation = events.find(
      (event) => event.eventName === "ReceiptImplementationBound",
    );
    assert(implementation && implementation.eventName === "ReceiptImplementationBound");
    assert.equal(implementation.args.namespaceHash, receipt.namespaceHash);
    assert.equal(implementation.args.templateVersion, receipt.templateVersion);
    assert.equal(implementation.args.proofModuleVersion, receipt.proofModuleVersion);

    const state = events.find(
      (event) => event.eventName === "ReceiptStateBound",
    );
    assert(state && state.eventName === "ReceiptStateBound");
    assert.equal(state.args.instanceCommitment, receipt.instanceCommitment);
    assert.equal(state.args.previousStateCommitment, receipt.previousStateCommitment);
    assert.equal(state.args.nextStateCommitment, receipt.nextStateCommitment);
    assert.equal(state.args.transitionSequence, receipt.transitionSequence);
    assert.equal(state.args.contextHash, receipt.contextHash);
  });

  it("keeps every configured HyperIndex event selector aligned with the contract ABI", function () {
    const config = readFileSync(
      new URL("../packages/execution-indexer/config.yaml", import.meta.url),
      "utf8",
    );
    const configuredSignatures = [...config.matchAll(/- event: "([^"]+)"/g)].map(
      (match) => match[1],
    );
    assert.equal(configuredSignatures.length, 12);

    const configured = configuredSignatures
      .map((signature) => ({
        name: signature.slice(0, signature.indexOf("(")),
        selector: toEventSelector(signature),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
    const configuredNames = new Set(configured.map(({ name }) => name));
    const contract = registry.abi
      .filter(
        (item): item is Extract<(typeof registry.abi)[number], { type: "event" }> =>
          item.type === "event" && configuredNames.has(item.name),
      )
      .map((event) => ({
        name: event.name,
        selector: toEventSelector(
          `${event.name}(${event.inputs.map((input) => input.type).join(",")})`,
        ),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    assert.deepEqual(configured, contract);
  });

  it("rejects every signed-field substitution", async function () {
    const receipt = await createReceipt();
    const signature = await signReceipt(receipt);
    const substitutions: ReadonlyArray<Partial<ExpectedReceipt>> = [
      { purposeHash: hash("different-purpose") },
      { recipient: unauthorized.account.address },
      { actionSchemaId: hash("different-action") },
      { sourceContract: hash("different-source") },
      { outputCommitment: hash("different-output") },
      { targetRegistry: unauthorized.account.address },
    ];

    for (const substitution of substitutions) {
      const tampered = { ...receipt, ...substitution };
      await assert.rejects(
        registry.write.registerReceipt(
          [FIXTURE_RECEIPT_VERSION, encodeReceipt(tampered), signature],
          { account: relayer.account },
        ),
        /GatewaySignerMismatch|WrongTargetRegistry|UnauthorizedSource/,
      );
    }
  });

  it("rejects an unauthorized source even when the gateway signed it", async function () {
    const receipt = await createReceipt({ sourceContract: hash("unapproved-source") });
    await assert.rejects(register(receipt), /UnauthorizedSource/);
  });

  it("fails closed after an authorized source is removed", async function () {
    await registry.write.setSource([sourceNetwork, sourceContract, false], {
      account: sourceAdmin.account,
    });
    await assert.rejects(register(await createReceipt()), /UnauthorizedSource/);
  });

  it("rejects an unauthorized signer and a signature outside its key epoch", async function () {
    const receipt = await createReceipt();
    await assert.rejects(register(receipt, unauthorized), /GatewaySignerMismatch/);

    const block = await publicClient.getBlock();
    const futureKeyId = hash("fixture-future-key");
    await registry.write.registerGatewayKeyEpoch(
      [futureKeyId, gateway.account.address, block.timestamp + 100n, block.timestamp + 1_000n],
      { account: gatewayKeyManager.account },
    );
    const futureReceipt = await createReceipt({ gatewayKeyId: futureKeyId });
    await assert.rejects(register(futureReceipt), /GatewaySignatureOutsideEpoch/);
  });

  it("fails closed for disabled, missing, and future gateway keys", async function () {
    const block = await publicClient.getBlock();
    const futureSignedReceipt = await createReceipt({
      gatewaySignedAt: block.timestamp + 20n,
    });
    await assert.rejects(register(futureSignedReceipt), /GatewaySignatureFromFuture/);

    await registry.write.disableGatewayKeyEpoch([gatewayKeyId], {
      account: gatewayKeyManager.account,
    });
    await assert.rejects(register(await createReceipt()), /GatewayKeyDisabled/);

    const missingKeyReceipt = await createReceipt({
      gatewayKeyId: hash("missing-gateway-key"),
    });
    await assert.rejects(register(missingKeyReceipt), /GatewayKeyNotFound/);
  });

  it("rejects invalid receipt windows, fields, and fixture targets", async function () {
    const block = await publicClient.getBlock();
    await assert.rejects(
      register(
        await createReceipt({
          validAfter: block.timestamp + 100n,
          validBefore: block.timestamp + 200n,
        }),
      ),
      /ReceiptNotYetValid/,
    );
    await assert.rejects(
      register(
        await createReceipt({
          validAfter: block.timestamp - 100n,
          validBefore: block.timestamp,
        }),
      ),
      /ReceiptExpired/,
    );
    await assert.rejects(
      register(
        await createReceipt({
          validAfter: block.timestamp,
          validBefore: block.timestamp,
        }),
      ),
      /InvalidTimeWindow/,
    );
    await assert.rejects(
      register(await createReceipt({ purposeHash: ZERO_HASH })),
      /InvalidReceiptField/,
    );
    await assert.rejects(
      register(await createReceipt({ targetChainId: BigInt(chainId) + 1n })),
      /WrongTargetChain/,
    );
    await assert.rejects(
      register(await createReceipt({ targetRegistry: unauthorized.account.address })),
      /WrongTargetRegistry/,
    );
  });

  it("rejects non-canonical fixture bytes and unconfigured receipt versions", async function () {
    const receipt = await createReceipt();
    const encoded = encodeReceipt(receipt);
    const signature = await signReceipt(receipt);
    const nonCanonical = `${encoded}${"00".repeat(32)}` as Hex;
    await assert.rejects(
      registry.write.registerReceipt(
        [FIXTURE_RECEIPT_VERSION, nonCanonical, signature],
        { account: relayer.account },
      ),
      /NonCanonicalFixtureEncoding/,
    );
    await assert.rejects(
      registry.write.registerReceipt([hash("unconfigured-version"), "0x", "0x"], {
        account: relayer.account,
      }),
      /ReceiptVerifierNotConfigured/,
    );
  });

  it("rejects reuse of a scoped nullifier across a second source transaction", async function () {
    const first = await createReceipt();
    await register(first);
    const replay = await createReceipt({
      sourceTransaction: hash("different-source-transaction"),
    });
    await assert.rejects(register(replay), /ScopedNullifierAlreadyUsed/);
  });

  it("rejects exact duplicate receipts before the scoped replay check", async function () {
    const receipt = await createReceipt();
    await register(receipt);
    await assert.rejects(register(receipt), /ReceiptAlreadyRegistered/);
  });

  it("routes one receipt to the exact adapter and records the relayer separately", async function () {
    const receipt = await createReceipt();
    const receiptId = await register(receipt);
    const parameters = stringToHex("public-execution-parameters");
    const sequence = await registry.read.executionSequence();
    const executionId = keccak256(
      encodeAbiParameters(
        [
          { type: "uint256" },
          { type: "address" },
          { type: "bytes32" },
          { type: "uint256" },
        ],
        [BigInt(chainId), registry.address, receiptId, sequence],
      ),
    );

    await registry.write.executeReceipt([receiptId, parameters], {
      account: relayer.account,
    });

    const execution = await registry.read.getExecution([executionId]);
    const storedReceipt = await registry.read.getReceipt([receiptId]);
    assert.equal(execution.adapter, getAddress(adapter.address));
    assert.equal(execution.relayer, getAddress(relayer.account.address));
    assert.equal(execution.success, true);
    assert.equal(storedReceipt.consumed, true);
    assert.equal(await adapter.read.lastReceiptId(), receiptId);
    assert.equal(await adapter.read.lastParametersHash(), keccak256(parameters));
  });

  it("records downstream failure without revoking or rewriting authorization", async function () {
    const receiptId = await register(await createReceipt());
    await adapter.write.setFailureMode([true, false]);
    const sequence = await registry.read.executionSequence();
    const executionId = keccak256(
      encodeAbiParameters(
        [
          { type: "uint256" },
          { type: "address" },
          { type: "bytes32" },
          { type: "uint256" },
        ],
        [BigInt(chainId), registry.address, receiptId, sequence],
      ),
    );

    await registry.write.executeReceipt([receiptId, "0x"], {
      account: relayer.account,
    });

    const execution = await registry.read.getExecution([executionId]);
    const receipt = await registry.read.getReceipt([receiptId]);
    assert.equal(execution.success, false);
    assert.equal(receipt.revoked, false);
    assert.equal(receipt.consumed, true);
    await assert.rejects(
      registry.write.executeReceipt([receiptId, "0x"], { account: relayer.account }),
      /ReceiptAlreadyConsumed/,
    );
  });

  it("captures an adapter revert rather than rolling back the receipt record", async function () {
    const receiptId = await register(await createReceipt());
    await adapter.write.setFailureMode([false, true]);
    await registry.write.executeReceipt([receiptId, "0x"], {
      account: relayer.account,
    });
    const receipt = await registry.read.getReceipt([receiptId]);
    assert.equal(receipt.consumed, true);
    assert.equal(receipt.revoked, false);
  });

  it("rejects a receipt whose named recipient is not the registered adapter", async function () {
    const receiptId = await register(
      await createReceipt({ recipient: unauthorized.account.address }),
    );
    await assert.rejects(
      registry.write.executeReceipt([receiptId, "0x"], { account: relayer.account }),
      /RecipientAdapterMismatch/,
    );
  });

  it("fails closed when the exact adapter is missing or disabled", async function () {
    const missingAction = hash("fixture-action-without-adapter");
    const missingReceiptId = await register(
      await createReceipt({
        actionSchemaId: missingAction,
        scopedNullifier: hash("fixture-missing-adapter-nullifier"),
      }),
    );
    await assert.rejects(
      registry.write.executeReceipt([missingReceiptId, "0x"], {
        account: relayer.account,
      }),
      /AdapterNotConfigured/,
    );

    const receiptId = await register(await createReceipt());
    await registry.write.disableAdapter(
      [FIXTURE_RECEIPT_VERSION, actionSchemaId],
      { account: adapterRegistrar.account },
    );
    await assert.rejects(
      registry.write.executeReceipt([receiptId, "0x"], {
        account: relayer.account,
      }),
      /AdapterNotConfigured/,
    );
  });

  it("prevents execution after revocation or expiry", async function () {
    const revokedReceiptId = await register(await createReceipt());
    await registry.write.revokeReceipt([revokedReceiptId], {
      account: emergencyAuthority.account,
    });
    await assert.rejects(
      registry.write.executeReceipt([revokedReceiptId, "0x"], {
        account: relayer.account,
      }),
      /ReceiptAlreadyRevoked/,
    );
    await assert.rejects(
      registry.write.revokeReceipt([revokedReceiptId], {
        account: emergencyAuthority.account,
      }),
      /ReceiptAlreadyRevoked/,
    );

    const expiringReceipt = await createReceipt({
      scopedNullifier: hash("fixture-expiring-nullifier"),
    });
    const expiringReceiptId = await register(expiringReceipt);
    await networkHelpers.time.increaseTo(expiringReceipt.validBefore);
    await assert.rejects(
      registry.write.executeReceipt([expiringReceiptId, "0x"], {
        account: relayer.account,
      }),
      /ReceiptExpired/,
    );
  });

  it("rejects reads, execution, and revocation for missing records", async function () {
    const missing = hash("missing-record");
    await assert.rejects(registry.read.getReceipt([missing]), /ReceiptNotFound/);
    await assert.rejects(registry.read.getExecution([missing]), /ExecutionNotFound/);
    await assert.rejects(
      registry.write.executeReceipt([missing, "0x"], { account: relayer.account }),
      /ReceiptNotFound/,
    );
    await assert.rejects(
      registry.write.revokeReceipt([missing], { account: emergencyAuthority.account }),
      /ReceiptNotFound/,
    );
  });

  it("keeps gateway signing separate from governance, adapters, and revocation", async function () {
    await assert.rejects(
      registry.write.configureReceiptVerifier(
        [hash("another-version"), verifier.address],
        { account: gateway.account },
      ),
      /AccessControlUnauthorizedAccount/,
    );
    await assert.rejects(
      registry.write.registerAdapter(
        [FIXTURE_RECEIPT_VERSION, hash("another-action"), adapter.address],
        { account: gateway.account },
      ),
      /AccessControlUnauthorizedAccount/,
    );

    const receiptId = await register(await createReceipt());
    await assert.rejects(
      registry.write.revokeReceipt([receiptId], { account: gateway.account }),
      /AccessControlUnauthorizedAccount/,
    );
    await registry.write.revokeReceipt([receiptId], {
      account: emergencyAuthority.account,
    });
    assert.equal((await registry.read.getReceipt([receiptId])).revoked, true);
  });

  it("lets only the emergency authority pause registration and execution", async function () {
    await assert.rejects(
      registry.write.pause({ account: gateway.account }),
      /AccessControlUnauthorizedAccount/,
    );
    await registry.write.pause({ account: emergencyAuthority.account });
    const receipt = await createReceipt();
    await assert.rejects(register(receipt), /EnforcedPause/);
    await registry.write.unpause({ account: emergencyAuthority.account });
    await register(receipt);
  });
});
