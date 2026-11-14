import assert from "node:assert/strict";
import { fork, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { ContractCall, ContractDeploy, Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import type { PreprodConnectionProfile, PreprodWalletTransport, GovernanceOperation, GovernanceOperationScope } from "@permio/midnight-authorization";
import { RemainingTestBudget, REMAINING_ROOT } from "./m6-remaining-test-budget.ts";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { isDefiniteNativeAuthRejection, isDefiniteIncludedM6ActionFailure, findM6SingleFallibleContractSegment } from "./m6-native-negative-outcome.ts";
import { remainingWarmBatch } from "./m6-remaining-warm-batches.ts";
import { remainingContinuationStep } from "./m6-remaining-continuation-plan.ts";
import { recovery150Step } from "./m6-recovery150-plan.ts";
import { recovery172Step } from "./m6-recovery172-plan.ts";

type Message = { phase: string; [key: string]: unknown };
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

export async function createRemainingWalletTransport(input: {
  profile: PreprodConnectionProfile;
  observe(value: Readonly<Record<string, unknown>>): void;
  planVersion?: 2 | 3 | 4 | 5 | 6;
  phaseAttemptCeiling?: 51 | 92 | 100 | 116 | 136 | 158;
}): Promise<PreprodWalletTransport & { withGovernanceOperation: GovernanceOperationScope;
  journalState(): ReturnType<RemainingTestBudget["evidence"]>;
  validateCandidate(transaction: Parameters<PreprodWalletTransport["balanceTx"]>[0]): Promise<Message>;
  submitNegative(transaction: Parameters<PreprodWalletTransport["balanceTx"]>[0], negativeCase: string): Promise<Message>;
}> {
  const directory = REMAINING_ROOT + "/private", meta = await lstat(directory);
  assert(process.platform === "linux" && await realpath(directory) === directory &&
    meta.uid === 0 && (meta.mode & 0o777) === 0o700);
  const recovery172=input.planVersion===6,expanded=recovery172||input.planVersion===5,cap=recovery172?172:expanded?150:100;
  const approval = JSON.parse(await readFile(directory + (recovery172?"/run-approval-v3.json":expanded?"/run-approval-v2.json":"/run-approval.json"), "utf8"));
  assert(approval.nativeCap === cap && approval.newContractDeployments === 1 && approval.userApproved === true && approval.noAutomaticRetries);
  if(expanded)assert(approval.applicationInstances===(recovery172?5:4)&&approval.failed55MustRemainUnused===true);
  const budget = new RemainingTestBudget(recovery172?"approved172":expanded?"approved150":"original100");
  const phaseAttemptCeiling = input.phaseAttemptCeiling ?? 100;
  assert((recovery172?[158]:expanded?[116,136]:[51,92,100]).includes(phaseAttemptCeiling));
  let scope: { operation: GovernanceOperation; balanced: boolean } | undefined;
  let active: { child: ChildProcess; next(phase: string, round?: number): Promise<Message>; closed: Promise<void>;
    bytes: Buffer; round: number; warm?: { first: number; last: number } } | undefined;
  let warm: ReturnType<typeof spawn> & { first: number; last: number } | undefined;
  let attempts = 0;
  let controls = (await readdir(directory)).filter(n => /^wallet-control-[0-9]{3}-reservation\.json$/u.test(n)).length;
  let negativeScope: string | undefined;
  function currentActive() { return active; }

  async function privateFile(name: string) {
    assert(/^[a-z0-9.-]+$/u.test(name)); const file = directory + "/" + name, meta = await lstat(file);
    assert(meta.isFile() && !meta.isSymbolicLink() && meta.uid === 0 && (meta.mode & 0o777) === 0o600 && await realpath(file) === file);
    return readFile(file);
  }
  // Reconnect only after exact successful public bytes are read for every prior
  // reservation. An unbalanced, rejected or uncertain reservation cannot vanish.
  const prior = (await readdir(directory)).filter(n => /^wallet-[0-9]{3}-reservation\.json$/u.test(n)).sort();
  if (prior.length) {
    const env = input.profile.environmentForSdk(), publicData = indexerPublicDataProvider(env.indexer, env.indexerWS);
    for (const name of prior) {
      const record = JSON.parse((await privateFile(name)).toString()), number = name.slice(7, 10);
      assert(record.reservedMaximumAttempts === budget.evidence().reservedMaximumAttempts + 1 && Number(number) === record.reservedMaximumAttempts);
      const unbound = await privateFile(`wallet-${number}-unbound.bin`);
      assert.equal(hash(unbound), record.unboundSha256);
      const before = budget.evidence();
      const operations = Object.entries(record.governance as Record<string, number>).filter(([key, value]) =>
        value !== (before.governance[key] ?? 0));
      assert(operations.length === (record.entry === "governAuthorization" ? 1 : 0));
      const round = budget.reserve({ entry: record.entry, contract: record.contractAddress,
        ...(record.negativeCase ? { negativeCase: record.negativeCase } : {}),
        ...(operations.length ? { governance: operations[0]![0] } : {}) });
      assert(round === record.reservedMaximumAttempts);
      assert.deepEqual(budget.evidence().perEntry, record.perEntry);
      assert.deepEqual(budget.evidence().governance, record.governance);
      assert.deepEqual(budget.evidence().negativeCases, record.negativeCases);
      const balanced = await privateFile(`wallet-${number}-balanced.bin`);
      if (number === "051" && (await readdir(directory)).includes("wallet-051-abandoned.json")) {
        const abandoned = JSON.parse((await privateFile("wallet-051-abandoned.json")).toString());
        assert(abandoned.reservationId === 51 && abandoned.negativeCase === record.negativeCase &&
          abandoned.neverSubmittedVerified && abandoned.originalExpiryPassed && abandoned.balancedSha256 === hash(balanced) &&
          abandoned.unboundSha256 === hash(unbound) && !(await readdir(directory)).includes("wallet-051-submission.json"));
        const transaction = Transaction.deserialize("signature", "proof", "binding", balanced);
        const segment = findM6SingleFallibleContractSegment(transaction, record.contractAddress);
        assert(transaction.intents!.get(segment.segmentId)!.ttl.getTime() <= Date.now());
        budget.abandonUnsubmittedReservation(abandoned);
        input.observe({ phase: "prior-unsubmitted-reservation-explicitly-abandoned", reservationId: 51,
          nativeSubmissions: 0, expiredBytesWillNotBeSubmitted: true });
        continue;
      }
      const journal = JSON.parse((await privateFile(`wallet-${number}-submission.json`)).toString());
      assert(journal.balancedSha256 === hash(balanced) && journal.submittedAtMostOnce === true);
      const transaction = Transaction.deserialize("signature", "proof", "binding", balanced);
      assert.deepEqual(transaction.identifiers(), journal.transactionIds);
      if(expanded&&number==="055"){
        const failure=JSON.parse(await readFile(REMAINING_ROOT+"/failure55-reconciliation-v1.json","utf8"));
        assert(failure.passed&&failure.conservativeSubmissionAttempts===54&&failure.normalFinalizedCalls===53&&
          failure.actual55IndexedMatches===0&&failure.currentEntireContractStateEquals54&&failure.call55RemainsUnretried&&!record.negativeCase);
        const segment=findM6SingleFallibleContractSegment(transaction,record.contractAddress);
        assert(transaction.intents!.get(segment.segmentId)!.ttl.getTime()<=Date.now(),"Old55 must be expired and remain unused");
        for(const id of transaction.identifiers()){
          const response=await fetch(env.indexer,{method:"POST",headers:{"content-type":"application/json"},signal:AbortSignal.timeout(30000),
            body:JSON.stringify({query:"query T($offset:TransactionOffset!){transactions(offset:$offset){... on RegularTransaction{identifiers}}}",variables:{offset:{identifier:id}}})});
          assert(response.ok);const value:any=await response.json();assert(!value.errors&&Array.isArray(value.data?.transactions));
          assert(!value.data.transactions.some((t:any)=>t.identifiers?.some((x:string)=>x.replace(/^0x/u,"")===id)));
        }
        if(prior.length===55){
          const current=await publicData.queryContractState(record.contractAddress);assert(current);
          assert(Buffer.from(current.serialize()).equals(await readFile(REMAINING_ROOT+"/scanned-failure55-public-evidence-v1/chain/contract-state.bin")));
        }
        input.observe({phase:"prior-local55-failure-preserved-unretried",round:55,conservativelyCounted:true,nativeResubmission:false});
        attempts++;continue;
      }
      if (record.negativeCase) {
        const outcome = JSON.parse((await privateFile(`wallet-${number}-outcome.json`)).toString());
        assert(outcome.kind === "native-rejected" && outcome.negativeCase === record.negativeCase &&
          outcome.balancedSha256 === hash(balanced) && outcome.submittedAtMostOnce === true);
        assert.deepEqual(outcome.transactionIds, transaction.identifiers());
        if (outcome.inclusion) {
          assert(isDefiniteIncludedM6ActionFailure({ ...outcome.inclusion,
            segmentStatusMap: new Map(outcome.inclusion.segmentStatusEntries) }));
          const final = await publicData.watchForTxData(transaction.identifiers().at(-1)!);
          assert(final.status === "FailFallible" && Buffer.from(final.tx.serialize()).equals(balanced));
          assert(isDefiniteIncludedM6ActionFailure({ ...outcome.inclusion, status: final.status, segmentStatusMap: final.segmentStatusMap }));
        } else assert(isDefiniteNativeAuthRejection(outcome.validation, outcome.diagnostic));
        input.observe({ phase: "prior-native-rejection-reconciled", round, negativeCase: record.negativeCase, nativeResubmission: false });
        attempts++; continue;
      }
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const final = await Promise.race([publicData.watchForTxData(transaction.identifiers().at(-1)!),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error("Prior finality read timed out")), 180000); })]);
        assert(final.status === "SucceedEntirely" && final.blockHeight > 0 &&
          Buffer.from(final.tx.serialize()).equals(balanced));
        input.observe({ phase: "prior-submission-reconciled-read-only", round,
          transactionId: transaction.identifiers().at(-1), ledgerSequence: final.blockHeight, nativeResubmission: false });
      } finally { if (timer) clearTimeout(timer); }
      attempts++;
    }
  }

  function spawn(round: string) {
    const batch = /^warm-([0-9]{3})-([0-9]{3})$/u.exec(round);
    const child = fork(new URL(batch ? "./m6-remaining-warm-wallet-worker.ts" : "./m6-remaining-wallet-worker.ts", import.meta.url),
      batch ? [directory, batch[1]!, batch[2]!, String(input.planVersion ?? 2)] : [directory, round,String(input.planVersion??2)],
      { cwd: directory, execArgv: ["--max-old-space-size=2048"], stdio: ["ignore", "ignore", "ignore", "ipc"] });
    const messages: Message[] = [], listeners = new Set<() => void>();
    let failure: Error | undefined, exited = false;
    const wake = () => { for (const notify of listeners) notify(); };
    child.on("message", message => {
      const value = message as Message; messages.push(value);
      if (value.phase === "failed") failure = Error("Owned acceptance wallet failed; reconcile before proceeding");
      if (["submission-attempt", "submission-returned", "finalized", "submission-diagnostic", "wallet-sdk-stage",
        "wallet-checkpoint-stage", "read-only-node-validation", "submission-outcome-read-only-reconciliation",
        "submission-reconciled-read-only", "negative-submission-outcome-read-only-reconciliation", "negative-submission-reconciled-read-only",
        "positive-control-accepted", "native-negative-rejected", "warm-wallet-closed-before-main-proof", "failed"].includes(value.phase)) input.observe(value);
      wake();
    });
    const closed = new Promise<void>((resolve, reject) => {
      child.once("error", () => { failure = Error("Owned wallet worker failed"); wake(); reject(failure); });
      child.once("exit", code => {
        exited = true;
        if (code !== 0) { failure = Error("Owned wallet worker stopped; reconcile before proceeding"); wake(); reject(failure); }
        else { wake(); resolve(); }
      });
    });
    void closed.catch(() => {});
    return { child, closed, next(phase: string, round?: number): Promise<Message> {
      return new Promise((resolve, reject) => {
        const check = () => {
          const found = messages.find(message => message.phase === phase && (round === undefined || message.round === round));
          if (found) { listeners.delete(check); resolve(found); }
          else if (failure || exited) { listeners.delete(check); reject(failure ?? Error("Required wallet phase missing")); }
        };
        listeners.add(check); check();
      });
    } };
  }
  const worker = spawn("identity"), identity = await worker.next("identity-verified"); await worker.closed;
  assert(typeof identity.coinPublicKey === "string" && typeof identity.encryptionPublicKey === "string");
  const transport: PreprodWalletTransport & { withGovernanceOperation: GovernanceOperationScope;
    journalState(): ReturnType<RemainingTestBudget["evidence"]>;
    validateCandidate(transaction: Parameters<PreprodWalletTransport["balanceTx"]>[0]): Promise<Message>;
    submitNegative(transaction: Parameters<PreprodWalletTransport["balanceTx"]>[0], negativeCase: string): Promise<Message>;
  } = {
    journalState: () => budget.evidence(),
    env: input.profile.environmentForSdk(),
    getCoinPublicKey: () => identity.coinPublicKey as string,
    getEncryptionPublicKey: () => identity.encryptionPublicKey as string,
    async validateCandidate(transaction) {
      assert(!active && !warm && !scope && !negativeScope && controls < 20);
      const actions = [...(transaction.intents?.values() ?? [])].flatMap(intent => intent.actions);
      assert(actions.length === 1 && actions[0] instanceof ContractCall && actions[0].address === budget.evidence().contractAddress);
      const name = `control-${String(++controls).padStart(3, "0")}`;
      await writeFile(directory + `/wallet-${name}-reservation.json`, JSON.stringify({ kind: "read-only-positive-control",
        nativeSubmissions: 0, unboundSha256: hash(transaction.serialize()) }), { flag: "wx", mode: 0o600 });
      await writeFile(directory + `/wallet-${name}-unbound.bin`, transaction.serialize(), { flag: "wx", mode: 0o600 });
      const worker = spawn(name), result = await worker.next("positive-control-accepted"); await worker.closed;
      return result;
    },
    async submitNegative(transaction, negativeCase) {
      assert(!active && !warm && !scope && !negativeScope); negativeScope = negativeCase;
      try {
        const balanced = await transport.balanceTx(transaction);
        const owned = currentActive(); assert(owned && Buffer.from(balanced.serialize()).equals(owned.bytes)); attempts++;
        owned.child.send({ operation: "submit-exact-balanced-once" });
        const result = await owned.next("native-negative-rejected"); await owned.closed; active = undefined;
        return result;
      } finally { negativeScope = undefined; }
    },
    async withGovernanceOperation(operation, run) {
      assert(!scope && !active); const current = { operation, balanced: false }; scope = current;
      try { return await run(); } finally { assert(scope === current); scope = undefined; }
    },
    async balanceTx(transaction, ttl) {
      assert(ttl === undefined && !active && budget.evidence().reservedMaximumAttempts < phaseAttemptCeiling && attempts < cap);
      assert([...(transaction.intents?.values() ?? [])].every(intent => intent.ttl.getTime() > Date.now() + 120000),
        "Already proved transaction needs at least two minutes remaining");
      const actions = [...(transaction.intents?.values() ?? [])].flatMap(intent => intent.actions);
      assert(actions.length === 1);
      const action = actions[0]!;
      assert(action instanceof ContractCall || action instanceof ContractDeploy);
      const entry = action instanceof ContractDeploy ? "deploy" : typeof action.entryPoint === "string"
        ? action.entryPoint : Buffer.from(action.entryPoint).toString("utf8");
      if (entry === "governAuthorization") assert(scope && !scope.balanced);
      else assert(!scope);
      if (negativeScope) assert(entry === "executeRuntimeAction" && !scope);
      if ((input.planVersion ?? 2) >= 3) assert.deepEqual({ entry,
        ...(scope ? { governance: scope.operation } : {}), ...(negativeScope ? { negativeCase: negativeScope } : {}) },
        recovery172?recovery172Step(budget.evidence().reservedMaximumAttempts+1):expanded?recovery150Step(budget.evidence().reservedMaximumAttempts+1):remainingContinuationStep(budget.evidence().reservedMaximumAttempts + 1), "The exact checkpoint continuation order changed");
      const round = budget.reserve({ entry, contract: action.address, ...(scope ? { governance: scope.operation } : {}),
        ...(negativeScope ? { negativeCase: negativeScope } : {}) });
      if (scope) scope.balanced = true;
      const name = String(round).padStart(3, "0");
      await writeFile(directory + `/wallet-${name}-reservation.json`, JSON.stringify({ ...budget.evidence(), entry,
        ...(negativeScope ? { negativeCase: negativeScope } : {}),
        unboundSha256: hash(transaction.serialize()) }), { flag: "wx", mode: 0o600 });
      await writeFile(directory + `/wallet-${name}-unbound.bin`, transaction.serialize(), { flag: "wx", mode: 0o600 });
      const batch = !negativeScope ? remainingWarmBatch(round, input.planVersion) : undefined;
      if (batch) {
        assert.equal(entry, batch.entry);
        if (!warm) {
          assert(round >= batch.first && round <= batch.last);
          warm = { ...spawn(`warm-${String(round).padStart(3, "0")}-${String(batch.last).padStart(3, "0")}`), ...batch, first: round };
          await warm.next("warm-ready", round);
        }
        assert(warm.first >= batch.first && warm.first <= round && warm.last === batch.last);
        warm.child.send({ operation: "prepare-round", round });
      } else assert(!warm);
      const worker = batch ? warm! : spawn(name), balanced = await worker.next("balanced", batch ? round : undefined);
      const file = directory + `/wallet-${name}-balanced.bin`, metadata = await lstat(file);
      assert(metadata.isFile() && !metadata.isSymbolicLink() && metadata.uid === 0 &&
        (metadata.mode & 0o777) === 0o600 && await realpath(file) === file);
      const bytes = await readFile(file); assert.equal(hash(bytes), balanced.sha256);
      active = { ...worker, bytes, round, ...(batch ? { warm: batch } : {}) };
      return Transaction.deserialize("signature", "proof", "binding", bytes);
    },
    async submitTx(transaction) {
      assert(active && !negativeScope && attempts < phaseAttemptCeiling && Buffer.from(transaction.serialize()).equals(active.bytes));
      const owned = active; attempts++;
      owned.child.send({ operation: "submit-exact-balanced-once", round: owned.round });
      const result = await owned.next("finalized", owned.warm ? owned.round : undefined);
      const retained = owned.warm && owned.round < owned.warm.last && result.walletProcessClosed !== true;
      if (!retained) { await owned.closed; if (owned.warm) warm = undefined; }
      active = undefined;
      assert(typeof result.transactionId === "string" && transaction.identifiers().includes(result.transactionId));
      input.observe({ phase: retained ? "warm-wallet-session-retained" : "wallet-process-disposed", round: owned.round, attempts,
        checkpointUpdatedPrivately: !retained, nativeCap: cap });
      return result.transactionId;
    },
  };
  return transport;
}
