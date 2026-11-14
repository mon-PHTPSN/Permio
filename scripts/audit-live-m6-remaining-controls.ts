import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import { ContractCall, LedgerParameters, Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { ContractState } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { PreprodConnectionProfile } from "../packages/midnight-authorization/src/preprod-profile.ts";
import { ledger } from "../packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js";
import { auditM6PublicCallReadSet } from "./m6-public-transcript-audit.ts";
import { copyM6PublicMapEntryForAudit } from "./m6-deprecated-module-admission-audit.ts";

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
  stage = "exact-positive-controls-and-historical-states";
  const info = JSON.parse(await readFile(root + "/client/packages/midnight-authorization/contracts/managed/permio-authorization/compiler/contract-info.json", "utf8"));
  const cases = [];
  for (const spec of [
    { before: "049", beforeEntry: "prepareRuntimeAction", after: "050", afterEntry: "executeRuntimeAction", negative: "051",
      control: "001", kind: "independent-competing-transition", field: "runtimeInstances", route: [1, 7] },
    { before: "077", beforeEntry: "prepareRuntimeAction", after: "079", afterEntry: "governAuthorization", negative: "080",
      control: "002", kind: "stale-authority-root", field: "authorityRoots", route: [0, 1] },
  ]) {
    const before = await indexed(spec.before, spec.beforeEntry), after = await indexed(spec.after, spec.afterEntry);
    assert(after.height > before.height);
    assert(Buffer.from(before.parameters.serialize()).equals(Buffer.from(after.parameters.serialize())));
    assert.deepEqual(info.ledger.find((field: any) => field.name === spec.field).index, spec.route);
    const negative = await local(spec.negative, "executeRuntimeAction");
    const outcome = JSON.parse((await privateFile(`wallet-${spec.negative}-outcome.json`)).toString());
    const reservation = JSON.parse((await privateFile(`wallet-${spec.negative}-reservation.json`)).toString());
    const controlReservation = JSON.parse((await privateFile(`wallet-control-${spec.control}-reservation.json`)).toString());
    const controlOutcome = JSON.parse((await privateFile(`wallet-control-${spec.control}-outcome.json`)).toString());
    const controlBytes = await privateFile(`wallet-control-${spec.control}-balanced.bin`);
    assert(outcome.kind === "native-rejected" && outcome.negativeCase === spec.kind && outcome.submittedAtMostOnce);
    assert(controlOutcome.kind === "positive-control-accepted" && controlOutcome.validation.accepted && controlOutcome.nativeSubmissions === 0);
    assert(reservation.unboundSha256 === controlReservation.unboundSha256 && controlOutcome.balancedSha256 === hash(controlBytes));
    exactCall(Transaction.deserialize("signature", "proof", "binding", controlBytes), "executeRuntimeAction");
    const journal = JSON.parse((await privateFile(`wallet-${spec.negative}-submission.json`)).toString());
    const clockSeconds = BigInt(Math.floor(Date.parse(journal.attemptedAtUtc) / 1000)); assert(clockSeconds > 0n);
    const oldView = ledger(before.state.data), newView = ledger(after.state.data);
    assert.deepEqual([...oldView.credentialStatusRoots], [...newView.credentialStatusRoots]);
    assert.deepEqual([...oldView.activeTemplates], [...newView.activeTemplates]);
    assert.deepEqual([...oldView.proofModules], [...newView.proofModules]);
    let key: Uint8Array;
    if (spec.field === "runtimeInstances") {
      assert.equal(oldView.runtimeInstances.size(), 1n); assert.equal(newView.runtimeInstances.size(), 1n);
      key = [...oldView.runtimeInstances][0]![0];
      assert.equal(newView.runtimeInstances.lookup(key).transitionSequence, oldView.runtimeInstances.lookup(key).transitionSequence + 1n);
      assert.notDeepEqual(newView.runtimeInstances.lookup(key).currentStateCommitment, oldView.runtimeInstances.lookup(key).currentStateCommitment);
      assert.deepEqual([...oldView.authorityRoots], [...newView.authorityRoots]);
      assert.equal(newView.decisionReceipts.size(), oldView.decisionReceipts.size() + 1n);
    } else {
      assert.equal(oldView.authorityRoots.size(), 1n); assert.equal(newView.authorityRoots.size(), 1n);
      key = [...oldView.authorityRoots][0]![0];
      assert.equal(oldView.authorityRoots.lookup(key).rootSequence, 1n); assert.equal(newView.authorityRoots.lookup(key).rootSequence, 2n);
      assert.deepEqual([...oldView.runtimeInstances], [...newView.runtimeInstances]);
      assert.deepEqual([...oldView.decisionReceipts], [...newView.decisionReceipts]);
      assert.deepEqual([...oldView.runtimeActionSessions], [...newView.runtimeActionSessions]);
    }
    const baseline = auditM6PublicCallReadSet({ call: negative.call, encodedState: before.state.data.state.encode(), parameters: before.parameters, clockSeconds });
    const changed = auditM6PublicCallReadSet({ call: negative.call, encodedState: after.state.data.state.encode(), parameters: after.parameters, clockSeconds });
    const repaired = auditM6PublicCallReadSet({ call: negative.call, encodedState: copyM6PublicMapEntryForAudit(
      after.state.data.state.encode(), before.state.data.state.encode(), spec.route, key), parameters: after.parameters, clockSeconds });
    assert(baseline.accepted && !changed.accepted && repaired.accepted);
    cases.push({ kind: spec.kind, nativeNegativeRound: Number(spec.negative), nativeNegativeTransactionSha256: hash(negative.raw),
      positiveControlRound: Number(spec.control), positiveControlBoundTransactionSha256: hash(controlBytes),
      sameUnboundProofBytesSha256: reservation.unboundSha256, nativeRejectionPreviouslyRecorded: true,
      sourceBeforeTransactionId: before.id, sourceAfterTransactionId: after.id, blockBefore: before.height, blockAfter: after.height,
      actualChangedPublicMap: spec.field, restoringOnlySelectedPublicRowMakesExactProgramPass: true,
      baseline, changed, counterfactual: repaired });
  }
  const report = { schemaVersion: 1, kind: "m6-live-action-control-causal-audit", passed: true, contract,
    observedAtUtc: new Date().toISOString(), boundary: "public-vm-readset-not-native-transaction-validation",
    nativeSubmissions: 0, proofsRequested: 0, exactIndexedBytesReconciled: true,
    positiveControlsWereNativeReadOnlyValidation: true, sameProofBytesPaired: true,
    clockHeldAtOriginalNegativeAttempt: true, cases, privateValuesLogged: false };
  await writeFile(root + "/action-control-causal-audit-v1.json", JSON.stringify(report), { flag: "wx", mode: 0o600 });
  process.stdout.write(JSON.stringify(report) + "\n");
} catch (error) {
  await writeFile(root + "/private/action-control-causal-audit-private-error.json", JSON.stringify({ stage,
    errorType: error instanceof Error ? error.name : "unknown", message: error instanceof Error ? error.message : "withheld" }),
    { flag: "wx", mode: 0o600 });
  process.stdout.write(JSON.stringify({ kind: "m6-live-action-control-causal-audit", passed: false, stage, detailsWithheld: true,
    nativeSubmissions: 0, proofsRequested: 0 }) + "\n"); process.exitCode = 1;
}
