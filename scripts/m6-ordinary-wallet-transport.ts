import assert from "node:assert/strict";
import { fork, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { ContractCall, ContractDeploy, Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import type { PreprodWalletTransport, PreprodConnectionProfile, GovernanceOperation, GovernanceOperationScope } from "@permio/midnight-authorization";
import { freshInstanceEntry, FRESH_INSTANCE_CONTRACT } from "./m6-fresh-instance-budget.ts";

type Message = { phase: string; [key: string]: unknown };
interface OwnedWorker { child: ChildProcess; messages: Message[]; closed: Promise<void>;
  next(phase: string): Promise<Message> }

/** Exact one-shot submissions; the approved warm session closes before main proof. */
export async function createOrdinaryWalletTransport(input: {
  privateDirectory: string; profile: PreprodConnectionProfile; submissionCap: number;
  resumeAfterEightFinalized?: { contractAddress: string };
  resumeAfterAdmissionFinalized?: { contractAddress: string };
  resumeAfterThirtyFinalized?: { contractAddress: string };
  resumeAfterThirtyTwoFinalized?: { contractAddress: string };
  resumeAfterFiftyFiveFinalized?: { contractAddress: string };
  resumeAfterFiftyEightFinalized?: { contractAddress: string };
  observe(value: Readonly<Record<string, unknown>>): void;
}): Promise<PreprodWalletTransport & {withGovernanceOperation:GovernanceOperationScope}> {
  const directory = path.resolve(input.privateDirectory);
  assert(process.platform === "linux" && directory === "/opt/permio-m6-governance-20261018-v10/private");
  assert(await realpath(directory) === directory);
  const metadata = await lstat(directory); assert(metadata.uid === 0 && (metadata.mode & 0o777) === 0o700);
  assert(Number.isInteger(input.submissionCap) && input.submissionCap > 0 &&
    ((input.resumeAfterThirtyTwoFinalized || input.resumeAfterFiftyFiveFinalized || input.resumeAfterFiftyEightFinalized) ? input.submissionCap === 62 : input.submissionCap <= 40));
  let round = 0, attempts = 0, active: { worker: OwnedWorker; bytes: Buffer; name: string } | undefined;
  let deployment: string | undefined;
  let governanceScope:{operation:GovernanceOperation;balanced:boolean}|undefined;
  const perGovernanceOperation=new Map<GovernanceOperation,number>([['proposeProofModule',1],['reviewProofModule',2],['governProofModule',4],['submitAuthorityRootApproval',0]]);
  const perEntry = new Map<string, number>([["governAuthorization", 7], ["beginM4Activation", 1], ["stageM4ActivationBinding", 1],
    ["finalizeM4Activation", 1], ["allocateRuntimeInstance", 1], ["updateRuntimeCredentialStatus", 19],
    ["manageRuntimeParticipantSlots", 2], ["prepareRuntimeAction", 4], ["executeRuntimeAction", 1], ["terminateTemplate", 2]]);
  const resumed = input.resumeAfterEightFinalized ?? input.resumeAfterAdmissionFinalized ?? input.resumeAfterThirtyFinalized ?? input.resumeAfterThirtyTwoFinalized ?? input.resumeAfterFiftyFiveFinalized ?? input.resumeAfterFiftyEightFinalized;
  assert([input.resumeAfterEightFinalized, input.resumeAfterAdmissionFinalized, input.resumeAfterThirtyFinalized,input.resumeAfterThirtyTwoFinalized,input.resumeAfterFiftyFiveFinalized,input.resumeAfterFiftyEightFinalized].filter(Boolean).length <= 1);
  if (resumed) {
    assert(input.submissionCap === ((input.resumeAfterThirtyTwoFinalized || input.resumeAfterFiftyFiveFinalized || input.resumeAfterFiftyEightFinalized) ? 62 : 40) && resumed.contractAddress ===
      "9a5b8e294e61463c5ce5948ba0120479dd69a582e0e7fc5f84c8c9c4197af3bc");
    // Caller independently reconciles all original journals and finality.
    // No deployment or previously accepted entry can be called on this path.
    round = attempts = input.resumeAfterFiftyEightFinalized ? 58 : input.resumeAfterFiftyFiveFinalized ? 55 : (input.resumeAfterThirtyTwoFinalized || input.resumeAfterFiftyFiveFinalized || input.resumeAfterFiftyEightFinalized) ? 32 : input.resumeAfterThirtyFinalized ? 30 : input.resumeAfterAdmissionFinalized ? 10 : 8; deployment = resumed.contractAddress;
    perEntry.set("governAuthorization", 1); perEntry.set("beginM4Activation", 0);
    perGovernanceOperation.set("proposeProofModule", 0); perGovernanceOperation.set("reviewProofModule", 0);
    perGovernanceOperation.set("governProofModule", 1);
    if (input.resumeAfterAdmissionFinalized || input.resumeAfterThirtyFinalized || input.resumeAfterThirtyTwoFinalized || input.resumeAfterFiftyFiveFinalized || input.resumeAfterFiftyEightFinalized) { perEntry.set("stageM4ActivationBinding", 0); perEntry.set("finalizeM4Activation", 0); }
    if (input.resumeAfterThirtyFinalized) { perEntry.set("allocateRuntimeInstance", 0); perEntry.set("updateRuntimeCredentialStatus", 0); }
  }
  if(input.resumeAfterFiftyFiveFinalized){
    perEntry.set("allocateRuntimeInstance",0);perEntry.set("updateRuntimeCredentialStatus",0);
    perEntry.set("manageRuntimeParticipantSlots",0);perEntry.set("prepareRuntimeAction",3);
  }
  if(input.resumeAfterFiftyEightFinalized){
    perEntry.set("allocateRuntimeInstance",0);perEntry.set("updateRuntimeCredentialStatus",0);
    perEntry.set("manageRuntimeParticipantSlots",0);perEntry.set("prepareRuntimeAction",0);
  }
  function spawn(name: string): OwnedWorker {
    const child = fork(new URL("./m6-ordinary-wallet-worker.ts", import.meta.url), [directory, name], {
      cwd: directory, execArgv: ["--max-old-space-size=2048"], stdio: ["ignore", "ignore", "ignore", "ipc"],
    });
    const messages: Message[] = [], listeners = new Set<() => void>();
    let failure: Error | undefined, exited = false;
    const wake = () => { for (const notify of listeners) notify(); };
    child.on("message", message => {
      const value = message as Message; messages.push(value);
      if (value.phase === "failed") failure = Error("Owned wallet operation failed; reconcile before retry");
      if (["submission-attempt", "submission-returned", "finalized", "submission-diagnostic", "wallet-sdk-stage", "wallet-checkpoint-stage", "read-only-node-validation", "submission-outcome-read-only-reconciliation", "submission-reconciled-read-only", "warm-wallet-session-retained", "warm-wallet-closed-before-main-proof", "failed"].includes(value.phase)) input.observe(value);
      wake();
    });
    const closed = new Promise<void>((resolve, reject) => {
      child.once("error", () => { failure = Error("Owned wallet worker failed"); wake(); reject(failure); });
      child.once("exit", code => {
        exited = true;
        if (code !== 0) { failure = Error("Owned wallet worker stopped; reconcile before retry"); wake(); reject(failure); }
        else { wake(); resolve(); }
      });
    });
    void closed.catch(() => undefined);
    return { child, messages, closed, next(phase) {
      return new Promise((resolve, reject) => {
        const check = () => {
          const value = messages.find(message => message.phase === phase);
          if (value) { listeners.delete(check); resolve(value); }
          else if (failure) { listeners.delete(check); reject(failure); }
          else if (exited) { listeners.delete(check); reject(Error("Owned wallet worker closed without the required phase")); }
        };
        listeners.add(check); check();
      });
    } };
  }
  const identityWorker = spawn("identity");
  const identity = await identityWorker.next("identity-verified"); await identityWorker.closed;
  assert(typeof identity.coinPublicKey === "string" && typeof identity.encryptionPublicKey === "string");
  return {
    async withGovernanceOperation(operation,run) {
      assert(!governanceScope&&!active,'No concurrent governance or wallet operation');
      const scope={operation,balanced:false};governanceScope=scope;
      try {return await run();} finally {assert(governanceScope===scope);governanceScope=undefined;}
    },
    env: input.profile.environmentForSdk(),
    getCoinPublicKey: () => identity.coinPublicKey as string,
    getEncryptionPublicKey: () => identity.encryptionPublicKey as string,
    async balanceTx(transaction, ttl) {
      assert(ttl === undefined, "This bounded transport must preserve the already proved transaction TTL");
      assert(!active && attempts < input.submissionCap, "No concurrent or unbounded wallet operation");
      assert([...(transaction.intents?.values() ?? [])].every(intent => intent.ttl.getTime() > Date.now() + 120_000),
        "The already proved transaction needs at least two minutes remaining; do not mutate its TTL or auto retry");
      const actions = [...(transaction.intents?.values() ?? [])].flatMap(intent => intent.actions);
      assert(actions.length === 1, "Only one approved test-contract action per transaction");
      const action = actions[0]!;
      if (deployment === undefined) {
        assert(round === 0 && action instanceof ContractDeploy, "Only one initial deployment is allowed");
        deployment = action.address;
      } else {
        assert(action instanceof ContractCall && action.address === deployment, "Do not submit to another deployment");
        const entry = typeof action.entryPoint === "string" ? action.entryPoint : Buffer.from(action.entryPoint).toString("utf8");
        if(input.resumeAfterThirtyTwoFinalized || input.resumeAfterFiftyFiveFinalized || input.resumeAfterFiftyEightFinalized) {
          assert(action.address === FRESH_INSTANCE_CONTRACT && entry === freshInstanceEntry(round + 1),
            "Fresh-instance calls must follow the exact approved 33–62 schedule");
        }
        const remaining = perEntry.get(entry); assert(remaining && remaining > 0, "Unapproved or exhausted test entry");
        if(entry==='governAuthorization') {
          assert(governanceScope&&!governanceScope.balanced,'Governance call requires one exact logical-operation scope');
          const budget=perGovernanceOperation.get(governanceScope.operation);
          assert(budget&&budget>0,'Unapproved or exhausted logical governance operation');
          perGovernanceOperation.set(governanceScope.operation,budget-1);governanceScope.balanced=true;
        } else assert(!governanceScope,'Governance scope cannot authorize another entry');
        perEntry.set(entry, remaining - 1);
      }
      const name = String(++round).padStart(3, "0");
      assert(round <= input.submissionCap);
      await writeFile(path.join(directory, `wallet-${name}-unbound.bin`), transaction.serialize(), { flag: "wx", mode: 0o600 });
      const worker = spawn(name), balanced = await worker.next("balanced");
      const file = path.join(directory, `wallet-${name}-balanced.bin`), meta = await lstat(file);
      assert(meta.isFile() && !meta.isSymbolicLink() && meta.uid === 0 && (meta.mode & 0o777) === 0o600);
      const bytes = await readFile(file);
      assert(createHash("sha256").update(bytes).digest("hex") === balanced.sha256);
      active = { worker, bytes, name };
      return Transaction.deserialize("signature", "proof", "binding", bytes);
    },
    async submitTx(transaction) {
      assert(active && attempts < input.submissionCap);
      assert(Buffer.from(transaction.serialize()).equals(active.bytes), "Submit only this exact balanced transaction");
      const owned = active; attempts += 1;
      owned.worker.child.send({ operation: "submit-exact-balanced-once" });
      const result = await owned.worker.next("finalized");
      await owned.worker.closed; active = undefined;
      assert(typeof result.transactionId === "string" && transaction.identifiers().includes(result.transactionId));
      input.observe({ phase: (input.resumeAfterThirtyTwoFinalized || input.resumeAfterFiftyFiveFinalized || input.resumeAfterFiftyEightFinalized) && round>=34 && round<58 ? "wallet-bridge-disposed" : "wallet-process-disposed",
        round, attempts, checkpointUpdatedPrivately: !((input.resumeAfterThirtyTwoFinalized || input.resumeAfterFiftyFiveFinalized || input.resumeAfterFiftyEightFinalized) && round>=34 && round<58) });
      return result.transactionId;
    },
  };
}
