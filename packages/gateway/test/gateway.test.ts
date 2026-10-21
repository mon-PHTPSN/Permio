import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { keccak256, type Hex } from "viem";

import {
  GatewayError,
  assertAllowlistedGatewaySource,
  deriveGatewayOutboxKey,
  gatewayVerifierIsAccepted,
  normalizeGatewayKeyEpochs,
  parseMidnightSourceEventIdentity,
  parseObservedPublicReceipt,
  selectGatewaySigningKey,
  type GatewayKeyEpoch,
} from "../src/index.ts";

const NULLIFIER =
  "0x1111111111111111111111111111111111111111111111111111111111111111" as const;
const ENCODED_RECEIPT = "0x01020304" as const;

function source(overrides: Record<string, unknown> = {}) {
  return {
    networkId: "midnight-local-dev",
    contractId: "contract:authorization:v1",
    transactionId: "tx:0001",
    eventIndex: 7,
    ledgerSequence: 41n,
    ...overrides,
  };
}

function receipt(overrides: Record<string, unknown> = {}) {
  return {
    receiptVersion: "permio.decision-receipt.v1",
    scopedNullifier: NULLIFIER,
    encodedReceipt: ENCODED_RECEIPT,
    receiptHash: keccak256(ENCODED_RECEIPT),
    ...overrides,
  };
}

const KEY_EPOCHS: readonly GatewayKeyEpoch[] = [
  {
    keyId: "gateway-key-2026-01",
    verifier: "0x1111111111111111111111111111111111111111",
    activeFrom: 100,
    signingCutoff: 220,
    verificationCutoff: 300,
  },
  {
    keyId: "gateway-key-2026-02",
    verifier: "0x2222222222222222222222222222222222222222",
    activeFrom: 200,
    signingCutoff: 400,
    verificationCutoff: 500,
  },
];

function expectGatewayError(
  action: () => unknown,
  code: GatewayError["code"],
): void {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof GatewayError);
    assert.equal(error.code, code);
    return true;
  });
}

describe("@permio/gateway M6-independent foundation", () => {
  it("accepts only exact public source and receipt fields", () => {
    const parsedSource = parseMidnightSourceEventIdentity(source());
    const parsedReceipt = parseObservedPublicReceipt(receipt());

    assert.deepEqual(parsedSource, source());
    assert.deepEqual(parsedReceipt, receipt());
    expectGatewayError(
      () =>
        parseObservedPublicReceipt(
          receipt({ privateEvidence: "must-never-cross-the-boundary" }),
        ),
      "INVALID_INPUT",
    );
    expectGatewayError(
      () => parseMidnightSourceEventIdentity(source({ eventIndex: -1 })),
      "INVALID_INPUT",
    );
  });

  it("binds the receipt hash to the exact observed bytes", () => {
    expectGatewayError(
      () =>
        parseObservedPublicReceipt(
          receipt({
            receiptHash:
              "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
          }),
        ),
      "RECEIPT_HASH_MISMATCH",
    );
    expectGatewayError(
      () => parseObservedPublicReceipt(receipt({ encodedReceipt: "0x" })),
      "INVALID_INPUT",
    );
    expectGatewayError(
      () =>
        parseObservedPublicReceipt(
          receipt({ scopedNullifier: "0x01" }),
        ),
      "INVALID_INPUT",
    );
  });

  it("matches sources only by exact network, contract, and receipt version", () => {
    const parsedSource = parseMidnightSourceEventIdentity(source());
    const allowlist = [
      {
        networkId: "midnight-local-dev",
        contractId: "contract:authorization:v1",
        receiptVersions: ["permio.decision-receipt.v1"],
      },
    ] as const;

    assert.doesNotThrow(() =>
      assertAllowlistedGatewaySource(
        parsedSource,
        "permio.decision-receipt.v1",
        allowlist,
      ),
    );
    expectGatewayError(
      () =>
        assertAllowlistedGatewaySource(
          { ...parsedSource, contractId: "contract:other" },
          "permio.decision-receipt.v1",
          allowlist,
        ),
      "SOURCE_NOT_ALLOWLISTED",
    );
  });

  it("derives one domain-separated outbox key from every required dimension", () => {
    const parsedSource = parseMidnightSourceEventIdentity(source());
    const parsedReceipt = parseObservedPublicReceipt(receipt());
    const baseline = deriveGatewayOutboxKey(parsedSource, parsedReceipt);
    const variants: readonly [typeof parsedSource, typeof parsedReceipt][] = [
      [{ ...parsedSource, networkId: "midnight-preprod" }, parsedReceipt],
      [{ ...parsedSource, contractId: "contract:authorization:v2" }, parsedReceipt],
      [{ ...parsedSource, transactionId: "tx:0002" }, parsedReceipt],
      [{ ...parsedSource, eventIndex: 8 }, parsedReceipt],
      [parsedSource, { ...parsedReceipt, receiptVersion: "receipt.v2" }],
      [
        parsedSource,
        {
          ...parsedReceipt,
          scopedNullifier:
            "0x2222222222222222222222222222222222222222222222222222222222222222" as Hex,
        },
      ],
    ];

    assert.equal(
      baseline,
      "0x708cb819a25e72d89b591aa2adb414f92f14c99f9534d797eb2f9081617a0c3c",
    );
    assert.equal(
      new Set(variants.map(([s, r]) => deriveGatewayOutboxKey(s, r))).size,
      variants.length,
    );
    assert.ok(
      variants.every(
        ([variantSource, variantReceipt]) =>
          deriveGatewayOutboxKey(variantSource, variantReceipt) !== baseline,
      ),
    );
    assert.equal(
      deriveGatewayOutboxKey(
        { ...parsedSource, ledgerSequence: parsedSource.ledgerSequence + 1n },
        parsedReceipt,
      ),
      baseline,
      "ledger sequence is deliberately not part of the specified uniqueness key",
    );
  });

  it("selects the newest active signing key during a rotation overlap", () => {
    assert.equal(selectGatewaySigningKey(KEY_EPOCHS, 199).keyId, "gateway-key-2026-01");
    assert.equal(selectGatewaySigningKey(KEY_EPOCHS, 200).keyId, "gateway-key-2026-02");
    assert.equal(selectGatewaySigningKey(KEY_EPOCHS, 219).keyId, "gateway-key-2026-02");
    expectGatewayError(
      () => selectGatewaySigningKey(KEY_EPOCHS, 500),
      "NO_ACTIVE_SIGNING_KEY",
    );
  });

  it("accepts old signatures only inside their signing and verification windows", () => {
    const oldEpoch = KEY_EPOCHS[0]!;
    assert.equal(
      gatewayVerifierIsAccepted(oldEpoch, oldEpoch.verifier, 219, 299),
      true,
    );
    assert.equal(
      gatewayVerifierIsAccepted(oldEpoch, oldEpoch.verifier, 220, 250),
      false,
    );
    assert.equal(
      gatewayVerifierIsAccepted(oldEpoch, oldEpoch.verifier, 219, 300),
      false,
    );
    assert.equal(
      gatewayVerifierIsAccepted(
        oldEpoch,
        "0x2222222222222222222222222222222222222222",
        219,
        250,
      ),
      false,
    );
  });

  it("rejects ambiguous or invalid key epoch configurations", () => {
    expectGatewayError(
      () =>
        normalizeGatewayKeyEpochs([
          KEY_EPOCHS[0]!,
          { ...KEY_EPOCHS[1]!, activeFrom: KEY_EPOCHS[0]!.activeFrom },
        ]),
      "INVALID_KEY_EPOCH",
    );
    expectGatewayError(
      () =>
        normalizeGatewayKeyEpochs([
          {
            ...KEY_EPOCHS[0]!,
            signingCutoff: KEY_EPOCHS[0]!.activeFrom,
          },
        ]),
      "INVALID_KEY_EPOCH",
    );
  });
});
