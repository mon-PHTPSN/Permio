import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, realpath, rename, writeFile } from "node:fs/promises";
import { ContractCall, Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { withRestoredPreprodWallet, PreprodConnectionProfile, createPreprodAuthorizationProviders } from "@permio/midnight-authorization";
import { remainingWarmBatch } from "./m6-remaining-warm-batches.ts";
import { validateOrdinaryBalancedTransaction } from "./m6-ordinary-node-validation.ts";
import { submitM6WarmStep } from "./m6-warm-submission-step.ts";
import type { UnboundTransaction } from "@midnight-ntwrk/midnight-js-types";
import { assertM6SubmissionTimeMargin } from "./m6-unproven-action-window.ts";

const directory = process.argv[2]!, first = Number(process.argv[3]), last = Number(process.argv[4]);
const planVersion = Number(process.argv[5] ?? 2) as 2 | 3 | 4 | 5 | 6;
assert([2,3,4,5,6].includes(planVersion));
assert(process.send && process.platform === "linux" && directory === "/opt/permio-m6-remaining-preprod-20261019-v1/private");
const approvedBatch = remainingWarmBatch(first, planVersion);
assert(approvedBatch && first >= approvedBatch.first && first <= approvedBatch.last && approvedBatch.last === last);
let round = first, phase = "inputs", finished = false;
const hash = (v: Uint8Array) => createHash("sha256").update(v).digest("hex");
const send = (value: Readonly<Record<string, unknown>>) => process.send?.({ ...value, round: Math.min(round, last) });
const queued: { operation?: string; round?: number }[] = [], listeners = new Set<() => void>();
process.on("message", value => { queued.push(value as { operation?: string; round?: number }); for (const notify of listeners) notify(); });
async function command(operation: string) {
  const next = await new Promise<{ operation?: string; round?: number }>(resolve => {
    const take = () => { if (queued.length) { listeners.delete(take); resolve(queued.shift()!); } }; listeners.add(take); take();
  });
  assert(next.operation === operation && next.round === round, "Unexpected warm-wallet operation; no retries");
}
process.once("disconnect", () => { if (!finished) process.exit(2); });
async function privateFile(name: string) {
  assert(/^[a-z0-9.-]+$/u.test(name)); const p = directory + "/" + name, s = await lstat(p);
  assert(s.isFile() && !s.isSymbolicLink() && s.uid === 0 && (s.mode & 0o777) === 0o600 && await realpath(p) === p);
  return readFile(p);
}
async function main() {
  const input = JSON.parse((await privateFile("inputs.json")).toString());
  assert(input.networkId === "preprod" && input.testOnlyProvenance.includes("disposable Preprod test"));
  const cap=planVersion===6?172:planVersion===5?150:100;
  const approval = JSON.parse((await privateFile(planVersion===6?"run-approval-v3.json":planVersion===5?"run-approval-v2.json":"run-approval.json")).toString());
  assert(approval.userApproved && approval.nativeCap === cap && approval.noAutomaticRetries);
  if(planVersion===5)assert(approval.applicationInstances===4&&first>=57&&last<=124);
  if(planVersion===6)assert(approval.applicationInstances===5&&approval.failed55MustRemainUnused&&first>=118&&last===146);
  const snapshots = JSON.parse((await privateFile("rolling-wallet-snapshots.json")).toString());
  setNetworkId("preprod"); const profile = new PreprodConnectionProfile(input.providerCredential, "http://127.0.0.1:6300");
  let pendingFinal: Readonly<Record<string, unknown>> | undefined;
  await withRestoredPreprodWallet(profile, input.secret, snapshots, async wallet => {
    phase = "synchronize"; assert((await wallet.synchronize()).readyForTransactions); send({ phase: "warm-ready" });
    for (round = first; round <= last; round++) {
      await command("prepare-round");
      const number = String(round).padStart(3, "0"), request = JSON.parse((await privateFile(`wallet-${number}-reservation.json`)).toString());
      assert(request.nativeCeiling === cap && request.reservedMaximumAttempts === round && !request.negativeCase &&
        request.entry === remainingWarmBatch(round, planVersion)!.entry && request.contractAddress === "70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c");
      const raw = await privateFile(`wallet-${number}-unbound.bin`); assert.equal(hash(raw), request.unboundSha256);
      const unbound = Transaction.deserialize("signature", "proof", "pre-binding", raw) as UnboundTransaction;
      const actions = [...(unbound.intents?.values() ?? [])].flatMap(intent => intent.actions);
      assert(actions.length === 1 && actions[0] instanceof ContractCall && actions[0].address === request.contractAddress);
      const entry = typeof actions[0].entryPoint === "string" ? actions[0].entryPoint : Buffer.from(actions[0].entryPoint).toString("utf8");
      assert.equal(entry, request.entry);
      const providers = createPreprodAuthorizationProviders(wallet, profile, stage => send({ phase: "wallet-sdk-stage", stage }),
        diagnostic => send({ phase: "submission-diagnostic", diagnostic }));
      phase = "balance"; const balanced = await providers.walletProvider.balanceTx(unbound), bytes = Buffer.from(balanced.serialize());
      await writeFile(directory + `/wallet-${number}-balanced.bin`, bytes, { flag: "wx", mode: 0o600 });
      phase = "validate"; assertM6SubmissionTimeMargin(balanced, 120_000);
      const validation = await validateOrdinaryBalancedTransaction(profile, bytes);
      send({ phase: "read-only-node-validation", ...validation, transactionSubmitted: false }); assert(validation.accepted);
      send({ phase: "balanced", sha256: hash(bytes) });
      await command("submit-exact-balanced-once"); assert(Buffer.from(balanced.serialize()).equals(bytes));
      assertM6SubmissionTimeMargin(balanced, 60_000);
      const transactionIds = balanced.identifiers();
      await writeFile(directory + `/wallet-${number}-submission.json`, JSON.stringify({ transactionIds, balancedSha256: hash(bytes),
        attemptedAtUtc: new Date().toISOString(), submittedAtMostOnce: true, warmSession: true }), { flag: "wx", mode: 0o600 });
      send({ phase: "submission-attempt", transactionIds }); phase = "submit";
      const completed = await submitM6WarmStep({ transaction: balanced, submit: () => providers.midnightProvider.submitTx(balanced),
        readFinal: id => providers.publicDataProvider.watchForTxData(id), observe: send });
      const value = { phase: "finalized", transactionId: completed.transactionId, ledgerSequence: completed.ledgerSequence,
        walletProcessClosed: completed.closeWalletBeforeNextCall };
      if (round === last || completed.closeWalletBeforeNextCall) { pendingFinal = value; break; }
      else send(value);
    }
  }, stage => send({ phase: "wallet-checkpoint-stage", stage }), async next => {
    phase = "checkpoint"; const p = directory + "/rolling-wallet-snapshots.writing.json";
    await writeFile(p, JSON.stringify(next), { flag: "wx", mode: 0o600 }); await rename(p, directory + "/rolling-wallet-snapshots.json");
  },planVersion>=5?{confirmationTimeoutMs:15_000}:undefined);
  assert(pendingFinal); send({ phase: "warm-wallet-closed-before-main-proof", privateCheckpointSaved: true }); send(pendingFinal);
}
const timer = setTimeout(() => process.exit(2), 4 * 3600000);
try { await main(); }
catch { send({ phase: "failed", failedStage: phase, nativeRetryAllowed: false, detailsWithheld: true }); process.exitCode = 1; }
finally { clearTimeout(timer); finished = true; process.disconnect?.(); }
