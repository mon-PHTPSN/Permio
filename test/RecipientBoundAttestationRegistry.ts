import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { network } from "hardhat";
import { keccak256, stringToHex, type Address, type Hex } from "viem";

const SIGNING_DOMAIN = "Permio Recipient-Bound Attestation Registry";
const SIGNATURE_VERSION = "1";

const attestationTypes = {
  Attestation: [
    { name: "schemaId", type: "bytes32" },
    { name: "midnightNetworkIdHash", type: "bytes32" },
    { name: "midnightContractIdHash", type: "bytes32" },
    { name: "midnightTransactionIdHash", type: "bytes32" },
    { name: "actionCommitment", type: "bytes32" },
    { name: "scopedNullifier", type: "bytes32" },
    { name: "purposeHash", type: "bytes32" },
    { name: "recipient", type: "address" },
    { name: "issuedAt", type: "uint64" },
    { name: "expiresAt", type: "uint64" },
  ],
} as const;

const hash = (value: string): Hex => keccak256(stringToHex(value));

describe("RecipientBoundAttestationRegistry", async function () {
  const { viem } = await network.getOrCreate();
  const publicClient = await viem.getPublicClient();
  const [owner, verifier, recipient, relayer, unauthorized] =
    await viem.getWalletClients();

  let registry: Awaited<
    ReturnType<typeof viem.deployContract<"RecipientBoundAttestationRegistry">>
  >;

  beforeEach(async function () {
    registry = await viem.deployContract("RecipientBoundAttestationRegistry", [
      owner.account.address,
      verifier.account.address,
    ]);
  });

  async function createAttestation(overrides: Partial<{
    schemaId: Hex;
    midnightNetworkIdHash: Hex;
    midnightContractIdHash: Hex;
    midnightTransactionIdHash: Hex;
    actionCommitment: Hex;
    scopedNullifier: Hex;
    purposeHash: Hex;
    recipient: Address;
    issuedAt: bigint;
    expiresAt: bigint;
  }> = {}) {
    const block = await publicClient.getBlock();
    return {
      schemaId: hash("permio.support-eligibility.v1"),
      midnightNetworkIdHash: hash("midnight-undeployed"),
      midnightContractIdHash: hash("information-flow-contract"),
      midnightTransactionIdHash: hash("midnight-transaction-1"),
      actionCommitment: hash("support-action-commitment-1"),
      scopedNullifier: hash("support-nullifier-1"),
      purposeHash: hash("replacement-support"),
      recipient: recipient.account.address,
      issuedAt: block.timestamp,
      expiresAt: block.timestamp + 3_600n,
      ...overrides,
    };
  }

  async function signAttestation(
    attestation: Awaited<ReturnType<typeof createAttestation>>,
    signer = verifier,
  ) {
    return signer.signTypedData({
      account: signer.account,
      domain: {
        name: SIGNING_DOMAIN,
        version: SIGNATURE_VERSION,
        chainId: await publicClient.getChainId(),
        verifyingContract: registry.address,
      },
      types: attestationTypes,
      primaryType: "Attestation",
      message: attestation,
    });
  }

  it("registers a valid recipient-bound attestation through a relayer", async function () {
    const attestation = await createAttestation();
    const signature = await signAttestation(attestation);
    const attestationId = await registry.read.attestationDigest([attestation]);

    await registry.write.registerAttestation([attestation, signature], {
      account: relayer.account,
    });

    assert.equal(await registry.read.isValid([attestationId]), true);
    assert.equal(
      await registry.read.isValidFor([
        attestationId,
        attestation.schemaId,
        attestation.purposeHash,
        attestation.recipient,
      ]),
      true,
    );
  });

  it("rejects a recipient substitution after signing", async function () {
    const attestation = await createAttestation();
    const signature = await signAttestation(attestation);
    const tampered = { ...attestation, recipient: unauthorized.account.address };

    await assert.rejects(
      registry.write.registerAttestation([tampered, signature], {
        account: relayer.account,
      }),
      /InvalidVerifier/,
    );
  });

  it("rejects a second attestation that reuses the same scoped entitlement", async function () {
    const first = await createAttestation();
    await registry.write.registerAttestation([first, await signAttestation(first)]);

    const replay = await createAttestation({
      midnightTransactionIdHash: hash("midnight-transaction-2"),
      actionCommitment: hash("support-action-commitment-2"),
    });

    await assert.rejects(
      registry.write.registerAttestation([replay, await signAttestation(replay)]),
      /ScopeAlreadyUsed/,
    );
  });

  it("rejects signatures from an unauthorized verifier", async function () {
    const attestation = await createAttestation();

    await assert.rejects(
      registry.write.registerAttestation([
        attestation,
        await signAttestation(attestation, unauthorized),
      ]),
      /InvalidVerifier/,
    );
  });

  it("lets the original verifier revoke a registered attestation", async function () {
    const attestation = await createAttestation();
    const attestationId = await registry.read.attestationDigest([attestation]);
    await registry.write.registerAttestation([attestation, await signAttestation(attestation)]);

    await registry.write.revoke([attestationId], { account: verifier.account });

    assert.equal(await registry.read.isValid([attestationId]), false);
  });
});
