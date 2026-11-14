import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hashProtocolIdentifier, readFinalizedDecisionReceipt, runtimeDecisionReceiptId,
  type RuntimeDecisionReceiptBody, type FinalizedDecisionReceiptObservation,
} from "@permio/midnight-authorization";
import { runtimeEvidenceBridgeOutputCommitment, runtimeEvidenceBridgeRecipientHash } from "@permio/midnight-authorization/evidence-bridge";
import { createFinalizedEvidenceBridgeVerifier } from "../src/midnight-verifier.ts";
import { bridgeBindingCommitment, createEvidenceBridgeOpening, createRecipientEncryptionKey,
  encryptSelectedRecords, verifyAndDecryptEvidence, type Digest } from "../src/index.ts";
import { canonical, hex, sha256, unhex } from "../src/crypto.ts";

const bytes = (n: number) => new Uint8Array(32).fill(n);
const digest = (n: number): Digest => `0x${hex(bytes(n))}`;
const asDigest = (value: Uint8Array): Digest => `0x${hex(value)}`;
/** Real typed decoder and generated bridge commitments; finality/status are explicit source fixtures. */
async function fixture() {
  const recipient = await createRecipientEncryptionKey();
  const records = [{ recordCommitment: digest(1), mediaType: "text/plain", plaintext: new TextEncoder().encode("private selected evidence") }];
  const bundle = await encryptSelectedRecords({ sourceContextCommitment: digest(2), sourceInstanceCommitment: digest(3),
    destinationContextCommitment: digest(4), destinationCaseCommitment: digest(5), purpose: "case-review",
    permittedUse: "investigate-selected-records", expiresAt: 2000, nonce: digest(6) }, records, recipient.publicKey);
  const opening = await createEvidenceBridgeOpening(bundle.manifest);
  const outputTypeHash = bytes(7);
  const version = { major: 1n, minor: 0n, patch: 0n };
  const body: RuntimeDecisionReceiptBody = {
    receiptVersion: 1n,
    moduleIdentity: { moduleIdHash: unhex((await sha256(canonical("permio:proof-module-id:v1", ["cross-context-evidence-bridge"]))).slice(2)),
      moduleVersion: version, implementationHash: bytes(8) },
    target: { namespaceHash: bytes(9), templateIdHash: bytes(10), semanticVersion: version, templateContentHash: bytes(11) },
    instanceCommitment: opening.sourceInstanceCommitment, transitioning: false,
    previousStateCommitment: bytes(0), nextStateCommitment: bytes(0), transitionSequence: 0n,
    contextHash: opening.sourceContextHash, actionSchemaId: bytes(12), purposeHash: opening.purposeHash,
    recipient: runtimeEvidenceBridgeRecipientHash(opening.recipientKeyFingerprint),
    validAfter: 900n, validBefore: 1900n, scopedNullifier: bytes(13),
    outputCommitment: runtimeEvidenceBridgeOutputCommitment(opening, outputTypeHash),
    sourceNetwork: unhex(hashProtocolIdentifier("network-id", "undeployed").slice(2)), sourceContract: bytes(14),
  };
  const transactionId = `00${"15".repeat(32)}`;
  const observation = (): FinalizedDecisionReceiptObservation => ({ network: "undeployed", contract: asDigest(body.sourceContract),
    transactionId, ledgerSequence: 123n, finalized: true, transactionSucceeded: true,
    receiptIdFromCall: runtimeDecisionReceiptId(body), bodyAtTransaction: body });
  let observedChange: Partial<FinalizedDecisionReceiptObservation> = {};
  const reader = { async readReceiptAtTransaction(id: string) { assert.equal(id, transactionId); return { ...observation(), ...observedChange }; } };
  const receipt = () => readFinalizedDecisionReceipt(reader, { network: "undeployed", contract: asDigest(body.sourceContract),
    transactionId, receiptId: runtimeDecisionReceiptId(body) });
  const deployment = { network: "undeployed" as const, contract: asDigest(body.sourceContract),
    proofModuleVersion: "1.0.0" as const, implementationHash: asDigest(body.moduleIdentity.implementationHash),
    namespaceHash: asDigest(body.target.namespaceHash), templateIdHash: asDigest(body.target.templateIdHash),
    semanticVersion: "1.0.0", templateContentHash: asDigest(body.target.templateContentHash),
    actionSchemaId: asDigest(body.actionSchemaId), outputTypeHash: asDigest(outputTypeHash) };
  let currentChecks = 0, revoked = false;
  const verifier = createFinalizedEvidenceBridgeVerifier({ deployment, sourceReader: request => {
    assert.equal(request.receiptId, runtimeDecisionReceiptId(body)); return reader;
  }, async assertCurrentAuthorization(input) {
    currentChecks++; assert.equal(input.receipt.receiptId, runtimeDecisionReceiptId(body));
    assert.equal(input.manifest.recipientKeyFingerprint, recipient.publicKey.fingerprint);
    if (revoked) throw Error("revoked");
  } });
  const request = async () => ({ receipt: await receipt(), bindingCommitment: await bridgeBindingCommitment(bundle.manifest),
    manifestRoot: bundle.manifestRoot, manifest: bundle.manifest, now: 1000 });
  return { recipient, records, bundle, body, deployment, verifier, receipt, request,
    currentChecks: () => currentChecks, revoke: () => { revoked = true; }, observe: (change: typeof observedChange) => { observedChange = change; } };
}

test("finalized bridge verifier binds exact v1 receipt, generated output and recipient before decryption", async () => {
  const f = await fixture(), request = await f.request();
  await f.verifier.verifyBridgeAuthorization(request);
  const plaintext = await verifyAndDecryptEvidence(f.bundle, request.bindingCommitment, f.recipient,
    { receipt: request.receipt, now: 1000, verifier: f.verifier });
  assert.deepEqual(plaintext, f.records);
  assert.equal(f.currentChecks(), 2);
  assert.equal(request.receipt.recipient.length, 66);
  assert.equal(request.receipt.sourceTransaction.length, 66);
  assert.notEqual(request.receipt.outputCommitment, request.bindingCommitment);
  assert.notEqual(request.receipt.recipient, f.recipient.publicKey.fingerprint);
});

test("a finalized unrelated or substituted receipt cannot authorize a manifest", async () => {
  for (const field of ["contextHash", "instanceCommitment", "purposeHash", "recipient", "outputCommitment", "actionSchemaId"] as const) {
    const f = await fixture(); f.body[field] = bytes(30);
    await assert.rejects(f.verifier.verifyBridgeAuthorization(await f.request()));
    assert.equal(f.currentChecks(), 0);
  }
  const f = await fixture(), request = await f.request();
  await assert.rejects(f.verifier.verifyBridgeAuthorization({ ...request, receipt: { ...request.receipt, sourceLedgerSequence: "124" } }));
  await assert.rejects(f.verifier.verifyBridgeAuthorization({ ...request, bindingCommitment: digest(31) }));
  await assert.rejects(f.verifier.verifyBridgeAuthorization({ ...request, manifestRoot: digest(32) }));
  for (const [field, value] of Object.entries({ destinationContextCommitment: digest(33), destinationCaseCommitment: digest(34),
    permittedUse: "publish", nonce: digest(35), expiresAt: 2100, recipientKeyFingerprint: digest(36) })) {
    const manifest = { ...request.manifest, [field]: value };
    await assert.rejects(f.verifier.verifyBridgeAuthorization({ ...request, manifest,
      bindingCommitment: await bridgeBindingCommitment(manifest) }));
  }
});

test("finality, receipt windows, disclosure expiry and current revocation are enforced independently", async () => {
  const f = await fixture(), request = await f.request();
  for (const change of [{ finalized: false }, { transactionSucceeded: false }, { transactionId: `00${"22".repeat(32)}` }]) {
    f.observe(change); await assert.rejects(f.verifier.verifyBridgeAuthorization(request));
  }
  f.observe({});
  for (const now of [899, 1900, 2000]) await assert.rejects(f.verifier.verifyBridgeAuthorization({ ...request, now }));
  f.body.validBefore = 2001n;
  await assert.rejects(f.verifier.verifyBridgeAuthorization(await f.request()));
  f.body.validBefore = 1900n;
  f.revoke(); await assert.rejects(f.verifier.verifyBridgeAuthorization(await f.request()), /revoked/);
});

test("bridge binding v2 preserves manifest v1 and uses the uncapped ordered manifest root", async () => {
  const f = await fixture(), opening = await createEvidenceBridgeOpening(f.bundle.manifest);
  assert.equal(f.bundle.manifest.manifestVersion, 1);
  assert.equal(opening.bindingVersion, 2n);
  assert.deepEqual(opening.manifestRoot, unhex(f.bundle.manifestRoot.slice(2)));
  const many = { ...f.bundle.manifest, records: Array.from({ length: 12 }, (_, i) => ({ ...f.bundle.manifest.records[0]!, recordCommitment: digest(50 + i) })) };
  const binding = await bridgeBindingCommitment(many);
  assert.notEqual(binding, await bridgeBindingCommitment({ ...many, records: [...many.records].reverse() }));
});
