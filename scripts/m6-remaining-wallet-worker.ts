import assert from "node:assert/strict";
import { lstat, readFile, realpath, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { ContractCall, Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { PreprodConnectionProfile, inspectPreprodWalletCheckpoint, withRestoredPreprodWallet,
  createPreprodAuthorizationProviders, classifyPreprodBalanceFailure } from "@permio/midnight-authorization";
import type { UnboundTransaction } from "@midnight-ntwrk/midnight-js-types";
import { assertM6SubmissionTimeMargin } from "./m6-unproven-action-window.ts";

// Only the enclosing owned process can talk to this worker. SDK stdout/stderr
// are suppressed by its parent and must never be downloaded as public logs.
const directory = path.resolve(process.argv[2]!);
const round = process.argv[3]!;
const planVersion=Number(process.argv[4]??2);assert([2,3,4,5,6].includes(planVersion));
assert(process.send && process.platform === "linux" && /^identity$|^[0-9]{3}$|^control-[0-9]{3}$/.test(round));
assert(directory === "/opt/permio-m6-remaining-preprod-20261019-v1/private");
const hash = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");
let phase = "private-inputs";
async function privateFile(name: string) {
  assert(/^[a-z0-9.-]+$/.test(name));
  const file = path.join(directory, name), meta = await lstat(file);
  assert(meta.isFile() && !meta.isSymbolicLink() && meta.uid === 0 && (meta.mode & 0o777) === 0o600 &&
    await realpath(file) === file);
  return readFile(file);
}
async function main() {
  const input = JSON.parse((await privateFile("inputs.json")).toString());
  assert(input.schemaVersion === 1 && input.networkId === "preprod" &&
    typeof input.testOnlyProvenance === "string" && input.testOnlyProvenance.includes("disposable Preprod test"));
  const profile = new PreprodConnectionProfile(input.providerCredential, "http://127.0.0.1:6300");
  let snapshots = input.snapshots;
  try { snapshots = JSON.parse((await privateFile("rolling-wallet-snapshots.json")).toString()); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  setNetworkId("preprod");
  if (round === "identity") {
    phase = "offline-identity-inspection";
    await inspectPreprodWalletCheckpoint(profile, input.secret, snapshots,
      stage => process.send?.({ phase: "wallet-checkpoint-stage", stage }));
    const header = JSON.parse(snapshots.shielded);
    process.send!({ phase: "identity-verified", coinPublicKey: header.publicKeys.coinPublicKey,
      encryptionPublicKey: header.publicKeys.encryptionPublicKey });
    return;
  }
  const control = round.startsWith("control-");
  const cap=planVersion===6?172:planVersion===5?150:100;
  assert(control ? Number(round.slice(8)) >= 1 && Number(round.slice(8)) <= 20 : Number(round) >= 1 && Number(round) <= (planVersion===6?158:planVersion===5?136:100));
  const approval = JSON.parse((await privateFile(planVersion===6?"run-approval-v3.json":planVersion===5?"run-approval-v2.json":"run-approval.json")).toString());
  assert(approval.nativeCap === cap && approval.newContractDeployments === 1 && approval.userApproved === true&&approval.noAutomaticRetries);
  if(planVersion===5)assert(approval.applicationInstances===4&&Number(round)!==55);
  if(planVersion===6)assert(approval.applicationInstances===5&&approval.failed55MustRemainUnused&&Number(round)!==55);
  const reservation = JSON.parse((await privateFile(`wallet-${round}-reservation.json`)).toString());
  assert(control ? reservation.kind === "read-only-positive-control" && reservation.nativeSubmissions === 0
    : reservation.nativeCeiling === cap && reservation.reservedMaximumAttempts === Number(round));
  const negativeCase = !control && typeof reservation.negativeCase === "string" ? reservation.negativeCase as string : undefined;
  if (negativeCase) assert(reservation.entry === "executeRuntimeAction" && reservation.negativeCases.includes(negativeCase));
  const request = await privateFile(`wallet-${round}-unbound.bin`);
  assert(hash(request) === reservation.unboundSha256);
  const unbound = Transaction.deserialize("signature", "proof", "pre-binding", request) as UnboundTransaction;
  assert(Buffer.from(unbound.serialize()).equals(request));
  let includedNegative = false;
  await withRestoredPreprodWallet(profile, input.secret, snapshots, async wallet => {
    phase = "wallet-synchronization";
    assert((await wallet.synchronize()).readyForTransactions);
    const providers = createPreprodAuthorizationProviders(wallet, profile,
      stage => process.send?.({ phase: "wallet-sdk-stage", stage }),
      diagnostic => process.send?.({ phase: "submission-diagnostic", diagnostic }));
    phase = "dust-balancing";
    const balanced = await providers.walletProvider.balanceTx(unbound);
    const bytes = Buffer.from(balanced.serialize());
    await writeFile(path.join(directory, `wallet-${round}-balanced.bin`), bytes, { flag: "wx", mode: 0o600 });
    phase = "read-only-node-validation";
    assertM6SubmissionTimeMargin(balanced, 120_000);
    const { validateOrdinaryBalancedTransaction } = await import("./m6-ordinary-node-validation.ts");
    const validation = await validateOrdinaryBalancedTransaction(profile, bytes, round==='001'?5:0);
    process.send!({ phase: "read-only-node-validation", ...validation, transactionSubmitted: false });
    const { canAttemptM6NegativeSubmission } = await import("./m6-native-negative-outcome.ts");
    assert(negativeCase ? canAttemptM6NegativeSubmission(validation) : validation.accepted,
      "Exact validation differs from the explicit positive or negative test expectation");
    assert(Buffer.from(balanced.serialize()).equals(bytes));
    if (control) {
      await writeFile(path.join(directory, `wallet-${round}-outcome.json`), JSON.stringify({ kind: "positive-control-accepted",
        validation, balancedSha256: hash(bytes), nativeSubmissions: 0, walletSnapshotDiscarded: true }), { flag: "wx", mode: 0o600 });
      process.send!({ phase: "positive-control-accepted", validation, nativeSubmissions: 0, walletSnapshotDiscarded: true });
      return;
    }
    process.send!({ phase: "balanced", sha256: hash(bytes) });
    phase = "awaiting-exact-submit-command";
    await new Promise<void>((resolve, reject) => {
      process.once("message", message => {
        if ((message as { operation?: string }).operation === "submit-exact-balanced-once") resolve();
        else reject(Error("Invalid owned wallet operation"));
      });
      process.once("disconnect", () => reject(Error("Owned wallet parent disconnected")));
    });
    const { findM6SingleFallibleContractSegment } = await import("./m6-native-negative-outcome.ts");
    const contractSegment = negativeCase ? findM6SingleFallibleContractSegment(balanced, reservation.contractAddress) : undefined;
    const action = contractSegment?.call;
    const stateFingerprint = async () => {
      assert(action instanceof ContractCall && action.address === reservation.contractAddress &&
        !action.guaranteedTranscript && action.fallibleTranscript);
      const state = await providers.publicDataProvider.queryContractState(action.address); assert(state);
      const encoded = JSON.stringify(state.data.state.encode(), (_, value) => typeof value === "bigint" ? String(value)
        : value instanceof Uint8Array ? Buffer.from(value).toString("hex") : value);
      return hash(Buffer.from(encoded));
    };
    if (negativeCase) phase = "negative-contract-state-baseline";
    const beforeStateSha256 = negativeCase ? await stateFingerprint() : undefined;
    assertM6SubmissionTimeMargin(balanced, 60_000);
    const transactionIds = balanced.identifiers();
    await writeFile(path.join(directory, `wallet-${round}-submission.json`), JSON.stringify({ transactionIds,
      attemptedAtUtc: new Date().toISOString(), balancedSha256: hash(bytes), submittedAtMostOnce: true }), { flag: "wx", mode: 0o600 });
    process.send!({ phase: "submission-attempt", transactionIds });
    phase = "node-submission";
    if (negativeCase) {
      // Submit exactly once. Pool acceptance still requires a definite indexed
      // failed contract segment and an unchanged complete contract state.
      const { submitNegativeOnceAndResolve } = await import("./m6-negative-submit-once-reconcile.ts");
      const resolved = await submitNegativeOnceAndResolve({transaction:balanced,intendedSegmentId:contractSegment!.segmentId,
        validation,submit:()=>providers.midnightProvider.submitTx(balanced),readFinal:id=>providers.publicDataProvider.watchForTxData(id),
        observe:value=>process.send?.(value)});
      const {diagnostic,transactionId}=resolved;
      const { isDefiniteNativeAuthRejection, isDefiniteIncludedM6ActionFailure } = await import("./m6-native-negative-outcome.ts");
      let inclusion: { status: string; exactBoundBytesMatched: boolean; intendedSegmentId: number;
        segmentStatusEntries: [number, string][]; contractStateSha256Before: string; contractStateSha256After: string;
        contractCallHasGuaranteedTranscript: boolean; contractCallHasFallibleTranscript: boolean;
        blockHeight: number; blockHash: string } | undefined;
      if (transactionId !== undefined) {
        assert(transactionIds.includes(transactionId) && action instanceof ContractCall && beforeStateSha256);
        phase = "negative-canonical-confirmation";
        const final = resolved.final; assert(final);
        inclusion = { status: final.status, exactBoundBytesMatched: Buffer.from(final.tx.serialize()).equals(bytes),
          intendedSegmentId: contractSegment!.segmentId, segmentStatusEntries: [...(final.segmentStatusMap ?? [])],
          contractStateSha256Before: beforeStateSha256, contractStateSha256After: await stateFingerprint(),
          contractCallHasGuaranteedTranscript: Boolean(action.guaranteedTranscript),
          contractCallHasFallibleTranscript: Boolean(action.fallibleTranscript), blockHeight: final.blockHeight, blockHash: final.blockHash };
        assert(isDefiniteIncludedM6ActionFailure({ ...inclusion, segmentStatusMap: new Map(inclusion.segmentStatusEntries) }),
          "Included negative did not prove the intended failed segment and unchanged contract state");
        includedNegative = true;
      } else {
        assert(isDefiniteNativeAuthRejection(validation, diagnostic),
          "Negative submission outcome is uncertain; reconcile and never retry");
        assert.equal(await stateFingerprint(), beforeStateSha256);
      }
      const outcome = { kind: "native-rejected", negativeCase, transactionIds, balancedSha256: hash(bytes),
        validation, diagnostic, inclusion, submittedAtMostOnce: true, walletSnapshotDiscarded: !includedNegative,
        submissionReconciledReadOnly: resolved.reconciledAfterSubmitError,
        rejectionBoundary: includedNegative ? "indexed-failed-contract-segment" : "native-rpc-rejection",
        applicationActionSucceeded: false };
      await writeFile(path.join(directory, `wallet-${round}-outcome.json`), JSON.stringify(outcome), { flag: "wx", mode: 0o600 });
      process.send!({ phase: "native-negative-rejected", negativeCase, transactionIds, validation, diagnostic,
        rejectionBoundary: outcome.rejectionBoundary, nativeTransactionStatus: inclusion?.status, contractStateUnchanged: true });
      return;
    }
    const {submitOnceAndReconcile}=await import("./m6-submit-once-reconcile.ts");
    const transactionId = await submitOnceAndReconcile({transaction:balanced,submit:()=>providers.midnightProvider.submitTx(balanced),
      readFinal:id=>providers.publicDataProvider.watchForTxData(id),observe:value=>process.send?.(value)});
    assert(transactionIds.includes(transactionId));
    process.send!({ phase: "submission-returned", transactionId });
    phase = "canonical-confirmation";
    const final = await providers.publicDataProvider.watchForTxData(transactionId);
    assert(final.status === "SucceedEntirely" && final.identifiers.includes(transactionId));
    process.send!({ phase: "finalized", transactionId, ledgerSequence: final.blockHeight });
  }, stage => process.send?.({ phase: "wallet-checkpoint-stage", stage }), async next => {
    if (control || negativeCase && !includedNegative) return;
    phase = "private-checkpoint-save";
    const temporary = path.join(directory, "rolling-wallet-snapshots.writing.json");
    await writeFile(temporary, JSON.stringify(next), { flag: "wx", mode: 0o600 });
    await rename(temporary, path.join(directory, "rolling-wallet-snapshots.json"));
  },planVersion>=5?{confirmationTimeoutMs:15_000}:undefined);
}

const deadline = setTimeout(() => process.exit(2), 900_000);
try { await main(); }
catch (error) { process.send?.({ phase: "failed", failedStage: phase,
  category: classifyPreprodBalanceFailure(error), detailsWithheld: true }); process.exitCode = 1; }
finally { clearTimeout(deadline); process.disconnect?.(); }
