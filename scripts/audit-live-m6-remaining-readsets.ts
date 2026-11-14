import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import { ContractCall, LedgerParameters, Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { ContractState } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { PreprodConnectionProfile } from "../packages/midnight-authorization/src/preprod-profile.ts";
import { ledger } from "../packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js";
import { auditM6PublicCallReadSet, restoreM6StatusBranchForCounterfactualAudit } from "./m6-public-transcript-audit.ts";

// Separately staged, read-only audit. Never imports the submission harness,
// restores a wallet, asks for a proof, or modifies the frozen live source.
const root = "/opt/permio-m6-remaining-preprod-20261019-v1";
const contract = "70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c";
assert(process.platform === "linux" && process.argv.length === 2);
for (const method of ["log", "error", "warn", "info", "debug"] as const) console[method] = () => {};
const hash = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
let stage = "public-inputs";
async function privateFile(name: string) {
  assert(/^[a-z0-9.-]+$/u.test(name));
  const path = root + "/private/" + name, stat = await lstat(path);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.uid === 0 && (stat.mode & 0o777) === 0o600 && await realpath(path) === path);
  return readFile(path);
}
const normalize = (value: unknown) => typeof value === "string" ? value.replace(/^0x/u, "") : "";
function bytes(value: unknown) {
  const text = normalize(value); assert(/^[0-9a-f]+$/u.test(text) && text.length % 2 === 0 && text.length <= 16 * 1024 ** 2);
  return Buffer.from(text, "hex");
}
function exactCall(transaction: ReturnType<typeof Transaction.deserialize>, entry: string) {
  const actions = [...(transaction.intents?.values() ?? [])].flatMap(intent => intent.actions);
  assert(actions.length === 1 && actions[0] instanceof ContractCall);
  const call = actions[0], actualEntry = typeof call.entryPoint === "string" ? call.entryPoint : Buffer.from(call.entryPoint).toString("utf8");
  assert(call.address === contract && actualEntry === entry); return call;
}
try {
  const input = JSON.parse((await privateFile("inputs.json")).toString());
  assert(input.schemaVersion === 1 && input.networkId === "preprod" && input.testOnlyProvenance.includes("disposable Preprod test"));
  const url = new PreprodConnectionProfile(input.providerCredential).environmentForSdk().indexer;
  setNetworkId("preprod");
  async function local(round: string, entry: string) {
    const raw = await privateFile(`wallet-${round}-balanced.bin`);
    const journal = JSON.parse((await privateFile(`wallet-${round}-submission.json`)).toString());
    const transaction = Transaction.deserialize("signature", "proof", "binding", raw);
    assert(Buffer.from(transaction.serialize()).equals(raw) && hash(raw) === journal.balancedSha256);
    assert.deepEqual(transaction.identifiers(), journal.transactionIds);
    return { raw, transaction, call: exactCall(transaction, entry), id: journal.transactionIds.at(-1) as string };
  }
  async function indexed(round: string, entry: string) {
    const saved = await local(round, entry); assert(/^[0-9a-f]{66}$/u.test(saved.id));
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({ query: `query M6ReadSetSource($offset: TransactionOffset!) {
        transactions(offset: $offset) { protocolVersion raw hash block { hash height ledgerParameters }
          contractActions { __typename address state ... on ContractCall { entryPoint } }
          ... on RegularTransaction { identifiers transactionResult { status } } }
      }`, variables: { offset: { identifier: saved.id } } }) });
    assert(response.ok); const text = await response.text(); assert(text.length <= 20 * 1024 ** 2);
    const payload = JSON.parse(text); assert(!payload.errors && Array.isArray(payload.data?.transactions));
    const matches = payload.data.transactions.filter((tx: any) => tx.identifiers?.some((id: unknown) => normalize(id) === saved.id));
    assert(matches.length === 1); const tx = matches[0];
    assert(tx.protocolVersion === 1000300 && tx.transactionResult?.status === "SUCCESS" &&
      Number.isSafeInteger(tx.block?.height) && tx.block.height > 0 && tx.contractActions?.length === 1);
    assert(bytes(tx.raw).equals(saved.raw));
    const action = tx.contractActions[0];
    assert(action.__typename === "ContractCall" && normalize(action.address) === contract && action.entryPoint === entry);
    const encoded = bytes(action.state), state = ContractState.deserialize(encoded);
    return { ...saved, state, encoded, parameters: LedgerParameters.deserialize(bytes(tx.block.ledgerParameters)),
      height: tx.block.height as number, blockHash: normalize(tx.block.hash) };
  }
  stage = "exact-historical-states";
  const afterWinner = await indexed("089", "executeRuntimeAction");
  const afterRevocation = await indexed("091", "updateRuntimeCredentialStatus");
  assert(afterRevocation.height > afterWinner.height);
  assert(Buffer.from(afterWinner.parameters.serialize()).equals(Buffer.from(afterRevocation.parameters.serialize())));
  const replay = await local("090", "executeRuntimeAction"), stale = await local("092", "executeRuntimeAction");
  for (const round of ["090", "092"]) {
    const outcome = JSON.parse((await privateFile(`wallet-${round}-outcome.json`)).toString());
    assert(outcome.kind === "native-rejected" && outcome.submittedAtMostOnce);
  }
  const winnerView = ledger(afterWinner.state.data), revokedView = ledger(afterRevocation.state.data);
  assert.equal(winnerView.decisionReceipts.size(), 2n);
  const statusesBefore = [...winnerView.credentialStatusRoots], statusesAfter = [...revokedView.credentialStatusRoots];
  assert(statusesBefore.length === 1 && statusesAfter.length === 1);
  assert.deepEqual(statusesBefore[0]![0], statusesAfter[0]![0]);
  assert.equal(statusesAfter[0]![1].rootSequence, statusesBefore[0]![1].rootSequence + 1n);
  assert.notDeepEqual(statusesBefore[0]![1].root, statusesAfter[0]![1].root);
  assert.deepEqual([...winnerView.authorityRoots], [...revokedView.authorityRoots]);
  assert.deepEqual([...winnerView.activeTemplates], [...revokedView.activeTemplates]);
  assert.deepEqual([...winnerView.proofModules], [...revokedView.proofModules]);
  assert.deepEqual([...winnerView.decisionReceipts], [...revokedView.decisionReceipts]);
  assert.deepEqual([...winnerView.usedRuntimeActionNullifiers], [...revokedView.usedRuntimeActionNullifiers]);
  // Hold time within the signed receipt window. This is explicitly a public-VM
  // causal audit, not a repeat of actual native fee/crypto/time validation.
  const receipts = [...winnerView.decisionReceipts].map(([, receipt]) => receipt);
  const selected = receipts.find(receipt => !receipt.transitioning); assert(selected);
  assert.deepEqual(winnerView.runtimeInstances.lookup(selected.instanceCommitment), revokedView.runtimeInstances.lookup(selected.instanceCommitment));
  const clockSeconds = selected.validAfter + 1n; assert(clockSeconds < selected.validBefore);
  stage = "public-vm-causal-checks";
  const statusBefore = auditM6PublicCallReadSet({ call: stale.call, encodedState: afterWinner.state.data.state.encode(),
    parameters: afterWinner.parameters, clockSeconds });
  const statusAfter = auditM6PublicCallReadSet({ call: stale.call, encodedState: afterRevocation.state.data.state.encode(),
    parameters: afterRevocation.parameters, clockSeconds });
  const replayAfter = auditM6PublicCallReadSet({ call: replay.call, encodedState: afterWinner.state.data.state.encode(),
    parameters: afterWinner.parameters, clockSeconds });
  const info = JSON.parse(await readFile(root + "/client/packages/midnight-authorization/contracts/managed/permio-authorization/compiler/contract-info.json", "utf8"));
  assert.deepEqual(info.ledger.find((field: any) => field.name === "credentialStatusRoots").index, [1, 4]);
  const counterfactual = auditM6PublicCallReadSet({ call: stale.call, encodedState: restoreM6StatusBranchForCounterfactualAudit(
    afterRevocation.state.data.state.encode(), afterWinner.state.data.state.encode()), parameters: afterRevocation.parameters, clockSeconds });
  assert(statusBefore.accepted && !statusAfter.accepted && !replayAfter.accepted && counterfactual.accepted);
  const report = { schemaVersion: 1, kind: "m6-live-public-readset-causal-audit", observedAtUtc: new Date().toISOString(), contract,
    boundary: "public-vm-readset-not-native-transaction-validation", nativeSubmissions: 0, proofsRequested: 0,
    exactIndexedTransactionBytesReconciled: true, signedWindowClockHeldConstant: true,
    blockBefore: afterWinner.height, blockAfter: afterRevocation.height,
    blockHashBefore: afterWinner.blockHash, blockHashAfter: afterRevocation.blockHash,
    stateBeforeSha256: hash(afterWinner.encoded), stateAfterSha256: hash(afterRevocation.encoded),
    staleTransactionSha256: hash(stale.raw), replayTransactionSha256: hash(replay.raw),
    unrelatedReceiptInsertionDidNotInvalidateCandidate: statusBefore.accepted,
    targetInstanceAuthorityTemplateModuleReceiptsAndActionNullifiersUnchanged: true,
    restoringOnlyCredentialStatusBranchMakesExactProgramPass: counterfactual.accepted,
    staleStatusRejectedAfterRootUpdate: !statusAfter.accepted, alreadyConsumedActionRejectedWithUnchangedInstance: !replayAfter.accepted,
    statusBefore, statusAfter, replayAfter, counterfactual, privateValuesLogged: false };
  await writeFile(root + "/readset-causal-audit-v1.json", JSON.stringify(report), { flag: "wx", mode: 0o600 });
  process.stdout.write(JSON.stringify(report) + "\n");
} catch (error) {
  await writeFile(root + "/private/readset-causal-audit-private-error.json", JSON.stringify({ stage,
    errorType: error instanceof Error ? error.name : "unknown", message: error instanceof Error ? error.message : "withheld" }),
    { flag: "wx", mode: 0o600 });
  process.stdout.write(JSON.stringify({ kind: "m6-live-public-readset-causal-audit", passed: false, stage, detailsWithheld: true,
    nativeSubmissions: 0, proofsRequested: 0 }) + "\n"); process.exitCode = 1;
}
