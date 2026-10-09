import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  ATTESTATION_PRIMARY_TYPE,
  ATTESTATION_TYPES,
  ATTESTATION_TYPEHASH,
  PURPOSE_HASHES,
  RECEIPT_LIFETIMES_SECONDS,
  SCHEMA_IDS,
  hashUtf8,
  recipientBoundAttestationDomain,
  type RecipientBoundAttestation,
} from "@permio/protocol";
import { network } from "hardhat";

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

  async function createAttestation(
    overrides: Partial<RecipientBoundAttestation> = {},
  ) {
    const block = await publicClient.getBlock();
    return {
      schemaId: SCHEMA_IDS.supportEligibility,
      midnightNetworkIdHash: hashUtf8("midnight-undeployed"),
      midnightContractIdHash: hashUtf8("information-flow-contract"),
      midnightTransactionIdHash: hashUtf8("midnight-transaction-1"),
      actionCommitment: hashUtf8("support-action-commitment-1"),
      scopedNullifier: hashUtf8("support-nullifier-1"),
      purposeHash: PURPOSE_HASHES.supportReplacement,
      recipient: recipient.account.address,
      issuedAt: block.timestamp,
      expiresAt:
        block.timestamp + RECEIPT_LIFETIMES_SECONDS.supportEligibility,
      ...overrides,
    } satisfies RecipientBoundAttestation;
  }

  async function signAttestation(
    attestation: Awaited<ReturnType<typeof createAttestation>>,
    signer = verifier,
  ) {
    return signer.signTypedData({
      account: signer.account,
      domain: recipientBoundAttestationDomain(
        await publicClient.getChainId(),
        registry.address,
      ),
      types: ATTESTATION_TYPES,
      primaryType: ATTESTATION_PRIMARY_TYPE,
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

  it("uses the exact protocol package EIP-712 type hash", async function () {
    assert.equal(await registry.read.ATTESTATION_TYPEHASH(), ATTESTATION_TYPEHASH);
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
      midnightTransactionIdHash: hashUtf8("midnight-transaction-2"),
      actionCommitment: hashUtf8("support-action-commitment-2"),
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
