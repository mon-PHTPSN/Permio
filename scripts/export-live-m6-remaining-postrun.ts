import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { ContractCall, LedgerParameters, Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { ContractState } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { PreprodConnectionProfile } from "../packages/midnight-authorization/src/preprod-profile.ts";
import { ledger } from "../packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js";
import { scanM6PublicArtifacts } from "./m6-public-artifact-scan.ts";
import { sanitizeM6RuntimePublicLog } from "./m6-public-runtime-log.ts";

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
  stage = "exact-finalized-100-boundary";
  const files = await readdir(root + "/private");
  assert.equal(files.filter(name => /^wallet-[0-9]{3}-submission\.json$/u.test(name)).length, 100);
  assert.equal(files.filter(name => /^wallet-[0-9]{3}-reservation\.json$/u.test(name)).length, 100);
  const final = await indexed("100", "governAuthorization"), view = ledger(final.state.data);
  assert.equal(view.proofModules.size(), 2n); assert([...view.proofModules].every(([, value]) => value.lifecycleStatus === 6n));
  assert.equal(view.activeTemplates.size(), 2n); assert([...view.activeTemplates].every(([, value]) => value.lifecycleStatus === 3n));
  assert.equal(view.runtimeInstances.size(), 2n); assert.equal(view.decisionReceipts.size(), 2n);
  assert.equal(view.usedRuntimeActionNullifiers.size(), 2n); assert.equal(view.runtimeActionSessions.size(), 3n);
  assert.equal([...view.authorityRoots][0]![1].rootSequence, 2n);
  assert.equal([...view.credentialStatusRoots][0]![1].rootSequence, 7n);
  const privateValues: string[] = [input.providerCredential];
  const collect = (value: unknown) => {
    if (typeof value === "string" && value.length >= 8) privateValues.push(value);
    else if (value && typeof value === "object") Object.values(value).forEach(collect);
  }; collect(input.secret);
  const saves = await Promise.all(files.filter(name => /^checkpoint-v3-[0-9]+\.json$/u.test(name))
    .map(async name => JSON.parse((await privateFile(name)).toString())));
  const completion = saves.filter(value => value.stage === "two-ordinary-flows-completed"); assert.equal(completion.length, 1);
  assert(Array.isArray(completion[0]!.value.privateSentinels)); privateValues.push(...completion[0]!.value.privateSentinels);
  const pair = JSON.parse((await privateFile("fixture-pair.json")).toString());
  for (const fixture of [pair.stateful, pair.nonTransitioning]) {
    privateValues.push(...fixture.record.template.states);
    const privateFixture = (value: unknown) => {
      if (typeof value === "string" && value.startsWith("private-")) privateValues.push(value);
      else if (value && typeof value === "object") Object.values(value).forEach(privateFixture);
    }; privateFixture(fixture.record.template);
    for (const reviewer of fixture.policy.reviewers) privateValues.push(reviewer.principalId, reviewer.publicKeyPem);
  }
  const artifacts = new Map<string, Uint8Array>();
  const json = (value: unknown) => Buffer.from(JSON.stringify(value, (_, v) => typeof v === "bigint" ? String(v) : v));
  const originalScan = JSON.parse(await readFile(root + "/scanned-public-evidence-v1/privacy-scan.json", "utf8"));
  assert(originalScan.passed && originalScan.findings.length === 0);
  artifacts.set("postrun/historical/state-after-100.bin", final.encoded);
  for (const round of ["050", "089"]) {
    const receiptState = await indexed(round, "executeRuntimeAction");
    const stateView = ledger(receiptState.state.data); assert.equal(stateView.decisionReceipts.size(), round === "050" ? 1n : 2n);
    artifacts.set(`postrun/historical/receipt-${round}-state.bin`, receiptState.encoded);
    artifacts.set(`postrun/historical/receipt-${round}-source.json`, json({ transactionId: receiptState.id,
      blockHeight: receiptState.height, blockHash: receiptState.blockHash, stateSha256: hash(receiptState.encoded),
      transactionSha256: hash(receiptState.raw), exactIndexedBytesVerified: true }));
  }
  const pairs = [];
  for (const [control, negative, kind] of [["001", "051", "independent-competing-transition"],
    ["002", "080", "stale-authority-root"], ["003", "092", "stale-credential-status-root"]]) {
    const reservation = JSON.parse((await privateFile(`wallet-control-${control}-reservation.json`)).toString());
    const outcome = JSON.parse((await privateFile(`wallet-control-${control}-outcome.json`)).toString());
    const negativeReservation = JSON.parse((await privateFile(`wallet-${negative}-reservation.json`)).toString());
    const negativeOutcome = JSON.parse((await privateFile(`wallet-${negative}-outcome.json`)).toString());
    const bytes = await privateFile(`wallet-control-${control}-balanced.bin`);
    assert(reservation.kind === "read-only-positive-control" && reservation.nativeSubmissions === 0);
    assert(outcome.kind === "positive-control-accepted" && outcome.nativeSubmissions === 0 && outcome.validation.accepted);
    assert(negativeOutcome.kind === "native-rejected" && negativeOutcome.negativeCase === kind && negativeOutcome.submittedAtMostOnce);
    assert(reservation.unboundSha256 === negativeReservation.unboundSha256 && outcome.balancedSha256 === hash(bytes));
    const transaction = Transaction.deserialize("signature", "proof", "binding", bytes); exactCall(transaction, "executeRuntimeAction");
    artifacts.set(`postrun/positive-controls/control-${control}-bound.bin`, bytes);
    artifacts.set(`postrun/positive-controls/control-${control}-outcome.json`, json(outcome));
    pairs.push({ control: Number(control), negativeRound: Number(negative), negativeCase: kind,
      sameUnboundProofBytesSha256: reservation.unboundSha256, boundControlSha256: hash(bytes),
      boundNegativeSha256: negativeOutcome.balancedSha256, nativePositiveControlSubmissions: 0,
      controlExportedAfterBothTemplatesAndModulesPermanentlyRevoked: true });
  }
  artifacts.set("postrun/positive-controls/pairing.json", json({ pairs, unboundPreBindingBytesExported: false,
    replayControlIsFinalizedNativeRound89: true, nativeNegativeRounds: [51,80,90,92] }));
  for (const name of ["action-control-causal-audit-v1.json", "readset-causal-audit-v1.json", "deprecation-control-qualification-v1.json",
    "deprecated-module-admission-97.json", "deprecated-module-admission-99.json", "pause-after45-v1.json",
    "ordinary-matrix-controller-public.jsonl", "ordinary-matrix-v2-controller-public.jsonl", "ordinary-matrix-v3-controller-public.jsonl"]) {
    artifacts.set("postrun/reports/" + name, await readFile(root + "/" + name));
  }
  for (const version of [1,2,3]) for (const name of ["report.json", "client-public.jsonl", "resources.jsonl"]) {
    const data=await readFile(`${root}/runtime-ordinary-matrix-v${version}/${name}`);
    if (name === "client-public.jsonl") {
      const sanitized=sanitizeM6RuntimePublicLog(data);
      artifacts.set(`postrun/final-runtime-v${version}/${name}`,sanitized.bytes);
      artifacts.set(`postrun/final-runtime-v${version}/public-log-filter.json`,json(sanitized.report));
    } else artifacts.set(`postrun/final-runtime-v${version}/${name}`,data);
  }
  stage = "all-public-bytes-privacy-scan";
  const report = scanM6PublicArtifacts(artifacts, privateValues);
  if (!report.passed) await writeFile(root + "/private/postrun-privacy-scan-failure-v1.json", JSON.stringify(report), { flag: "wx", mode: 0o600 });
  assert(report.passed, "Public supplement scan failed; findings withheld");
  const output = root + "/scanned-public-evidence-v1";
  for (const [name, bytes] of artifacts) {
    const file = output + "/" + name;
    await mkdir(file.slice(0,file.lastIndexOf("/")), { recursive: true, mode: 0o700 });
    await writeFile(file, bytes, { flag: "wx", mode: 0o600 });
  }
  await writeFile(output + "/postrun-privacy-scan.json", JSON.stringify(report), { flag: "wx", mode: 0o600 });
  process.stdout.write(JSON.stringify({ kind: "m6-postrun-public-evidence-export", passed: true,
    artifactCount: report.artifactCount, findings: report.findings.length, privateValuesChecked: report.privateValuesChecked,
    fullyBoundReadOnlyControls: 3, exactHistoricalReceiptStates: 2, finalNativeRound: 100,
    nativeSubmissions: 0, proofsRequested: 0, unboundBytesExported: false }) + "\n");
} catch (error) {
  await writeFile(root + "/private/postrun-export-private-error-v1.json", JSON.stringify({ stage,
    errorType: error instanceof Error ? error.name : "unknown", message: error instanceof Error ? error.message : "withheld" }),
    { flag: "wx", mode: 0o600 });
  process.stdout.write(JSON.stringify({ kind: "m6-postrun-public-evidence-export", passed: false, stage, detailsWithheld: true,
    nativeSubmissions: 0, proofsRequested: 0 }) + "\n"); process.exitCode = 1;
}
