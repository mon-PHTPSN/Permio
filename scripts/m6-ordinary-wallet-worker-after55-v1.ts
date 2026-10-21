import assert from "node:assert/strict";
import { lstat, readFile, realpath, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { PreprodConnectionProfile, inspectPreprodWalletCheckpoint, withRestoredPreprodWallet,
  createPreprodAuthorizationProviders, classifyPreprodBalanceFailure } from "@permio/midnight-authorization";
import type { UnboundTransaction } from "@midnight-ntwrk/midnight-js-types";

// Only the enclosing owned process can talk to this worker. SDK stdout/stderr
// are suppressed by its parent and must never be downloaded as public logs.
const directory = path.resolve(process.argv[2]!);
const round = process.argv[3]!;
assert(process.send && process.platform === "linux" && /^identity$|^[0-9]{3}$/.test(round));
assert(directory === "/opt/permio-m6-governance-20261018-v10/private");
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
  const request = await privateFile(`wallet-${round}-unbound.bin`);
  const unbound = Transaction.deserialize("signature", "proof", "pre-binding", request) as UnboundTransaction;
  assert(Buffer.from(unbound.serialize()).equals(request));
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
    const { validateOrdinaryBalancedTransaction } = await import("./m6-ordinary-node-validation.ts");
    const validation = await validateOrdinaryBalancedTransaction(profile, bytes, round==='001'?5:0);
    process.send!({ phase: "read-only-node-validation", ...validation, transactionSubmitted: false });
    assert(validation.accepted, "Node rejected the exact balanced transaction; no submission attempted");
    assert(Buffer.from(balanced.serialize()).equals(bytes));
    process.send!({ phase: "balanced", sha256: hash(bytes) });
    phase = "awaiting-exact-submit-command";
    await new Promise<void>((resolve, reject) => {
      process.once("message", message => {
        if ((message as { operation?: string }).operation === "submit-exact-balanced-once") resolve();
        else reject(Error("Invalid owned wallet operation"));
      });
      process.once("disconnect", () => reject(Error("Owned wallet parent disconnected")));
    });
    const transactionIds = balanced.identifiers();
    await writeFile(path.join(directory, `wallet-${round}-submission.json`), JSON.stringify({ transactionIds,
      attemptedAtUtc: new Date().toISOString(), balancedSha256: hash(bytes), submittedAtMostOnce: true }), { flag: "wx", mode: 0o600 });
    process.send!({ phase: "submission-attempt", transactionIds });
    phase = "node-submission";
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
    phase = "private-checkpoint-save";
    const temporary = path.join(directory, "rolling-wallet-snapshots.writing.json");
    await writeFile(temporary, JSON.stringify(next), { flag: "wx", mode: 0o600 });
    await rename(temporary, path.join(directory, "rolling-wallet-snapshots.json"));
  });
}

const deadline = setTimeout(() => process.exit(2), 900_000);
try { await main(); }
catch (error) { process.send?.({ phase: "failed", failedStage: phase,
  category: classifyPreprodBalanceFailure(error), detailsWithheld: true }); process.exitCode = 1; }
finally { clearTimeout(deadline); process.disconnect?.(); }
