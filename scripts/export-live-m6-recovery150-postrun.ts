import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { ContractCall, LedgerParameters, Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { ContractState } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { PreprodConnectionProfile } from "../packages/midnight-authorization/src/preprod-profile.ts";
import { ledger } from "../packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js";
import { collectRecovery150PrivateScanValues } from "./m6-recovery150-private-scan.ts";
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
  stage = "exact-finalized-135-counted-boundary";
  const files = await readdir(root + "/private");
  assert.equal(files.filter(name => /^wallet-[0-9]{3}-submission\.json$/u.test(name)).length, 135);
  assert.equal(files.filter(name => /^wallet-[0-9]{3}-reservation\.json$/u.test(name)).length, 136);
  const final = await indexed("136", "governAuthorization"), view = ledger(final.state.data);
  assert.equal(view.proofModules.size(), 2n); assert([...view.proofModules].every(([, value]) => value.lifecycleStatus === 6n));
  assert.equal(view.activeTemplates.size(), 2n); assert([...view.activeTemplates].every(([, value]) => value.lifecycleStatus === 3n));
  assert.equal(view.runtimeInstances.size(), 4n); assert.equal(view.decisionReceipts.size(), 3n);
  assert.equal(view.usedRuntimeActionNullifiers.size(), 3n); assert.equal(view.runtimeActionSessions.size(), 4n);
  assert.equal([...view.authorityRoots][0]![1].rootSequence, 2n);
  assert.equal([...view.credentialStatusRoots][0]![1].rootSequence, 11n);
  const privateValues=await collectRecovery150PrivateScanValues();
  const artifacts = new Map<string, Uint8Array>();
  const json = (value: unknown) => Buffer.from(JSON.stringify(value, (_, v) => typeof v === "bigint" ? String(v) : v));
  const originalScan = JSON.parse(await readFile(root + "/scanned-public-evidence-v1/privacy-scan.json", "utf8"));
  assert(originalScan.passed && originalScan.findings.length === 0);
  artifacts.set("postrun/historical/state-after-136.bin", final.encoded);
  const sourceManifest=await readFile(root+"/client/public-source-manifest.json");
  assert(hash(sourceManifest)==="865355cfb7f446d2dff5f230e5aed8e8c6eaeb0c9bad1b86bb939f85f10b5aa7");
  artifacts.set("postrun/source/public-source-manifest.json",sourceManifest);
  for (const round of ["050", "086", "125"]) {
    const receiptState = await indexed(round, "executeRuntimeAction");
    const stateView = ledger(receiptState.state.data); assert.equal(stateView.decisionReceipts.size(), round === "050" ? 1n : round === "086" ? 2n : 3n);
    artifacts.set(`postrun/historical/receipt-${round}-state.bin`, receiptState.encoded);
    artifacts.set(`postrun/historical/receipt-${round}-source.json`, json({ transactionId: receiptState.id,
      blockHeight: receiptState.height, blockHash: receiptState.blockHash, stateSha256: hash(receiptState.encoded),
      transactionSha256: hash(receiptState.raw), exactIndexedBytesVerified: true }));
  }
  const pairs=[];
  for(const [negative,kind]of [["087","independent-competing-transition"],["116","stale-authority-root"],
    ["126","scoped-action-replay-after-cold-reconnect"],["128","stale-credential-status-root"]]){
    const negativeReservation=JSON.parse((await privateFile(`wallet-${negative}-reservation.json`)).toString());
    const negativeOutcome=JSON.parse((await privateFile(`wallet-${negative}-outcome.json`)).toString());
    assert(negativeOutcome.kind==="native-rejected"&&negativeOutcome.negativeCase===kind&&negativeOutcome.submittedAtMostOnce);
    const matches:string[]=[];
    for(const name of files.filter(x=>/^wallet-control-[0-9]{3}-reservation\.json$/u.test(x))){
      const c=JSON.parse((await privateFile(name)).toString());if(c.unboundSha256===negativeReservation.unboundSha256)matches.push(name.slice(15,18));
    }assert.equal(matches.length,1);const control=matches[0]!;
    const reservation=JSON.parse((await privateFile(`wallet-control-${control}-reservation.json`)).toString());
    const outcome=JSON.parse((await privateFile(`wallet-control-${control}-outcome.json`)).toString());
    const raw=await privateFile(`wallet-control-${control}-balanced.bin`);
    assert(reservation.kind==="read-only-positive-control"&&reservation.nativeSubmissions===0&&outcome.kind==="positive-control-accepted"&&outcome.validation.accepted&&outcome.nativeSubmissions===0);
    assert.equal(outcome.balancedSha256,hash(raw));const tx=Transaction.deserialize("signature","proof","binding",raw);exactCall(tx,"executeRuntimeAction");
    const negativeTx=Transaction.deserialize("signature","proof","binding",await privateFile(`wallet-${negative}-balanced.bin`));
    assert.equal(exactCall(tx,"executeRuntimeAction").communicationCommitment,exactCall(negativeTx,"executeRuntimeAction").communicationCommitment);
    artifacts.set(`postrun/positive-controls/control-${control}-bound.bin`,raw);
    artifacts.set(`postrun/positive-controls/control-${control}-outcome.json`,json(outcome));
    pairs.push({control:Number(control),negativeRound:Number(negative),negativeCase:kind,sameUnboundProofBytesSha256:reservation.unboundSha256,
      boundControlSha256:hash(raw),boundNegativeSha256:negativeOutcome.balancedSha256,nativePositiveControlSubmissions:0,controlExportedAfterBothTemplatesAndModulesPermanentlyRevoked:true});
  }
  artifacts.set("postrun/positive-controls/pairing.json",json({pairs,unboundPreBindingBytesExported:false,replayControlIsIndependentFreshOuterCall:true,nativeNegativeRounds:[87,116,126,128]}));
  for (const name of ["action-control-causal-audit-recovery150-v1.json", "readset-causal-audit-recovery150-v1.json", "deprecation-control-qualification-v1.json",
    "deprecated-module-admission-133.json", "deprecated-module-admission-135.json", "pause-after45-v1.json",
    "ordinary-matrix-controller-public.jsonl", "ordinary-matrix-v2-controller-public.jsonl", "ordinary-matrix-v3-controller-public.jsonl","ordinary-matrix-v4-controller-public.jsonl","ordinary-matrix-v5-controller-public.jsonl",
    "ordinary-matrix-v6-controller-public.jsonl", "native87-readonly-inspection-v2.json", "after87-recovery-verification-v1.json", "source10-prefix-preflight-verification-v1.json"]) {
    artifacts.set("postrun/reports/" + name, await readFile(root + "/" + name));
  }
  for (const version of [1,2,3,4,5,6]) for (const name of ["report.json", "client-public.jsonl", "resources.jsonl"]) {
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
    fullyBoundReadOnlyControls: 4, exactHistoricalReceiptStates: 3, finalNativeRound: 136,
    nativeSubmissions: 0, proofsRequested: 0, unboundBytesExported: false }) + "\n");
} catch (error) {
  await writeFile(root + "/private/postrun-export-recovery150-private-error-v1.json", JSON.stringify({ stage,
    errorType: error instanceof Error ? error.name : "unknown", message: error instanceof Error ? error.message : "withheld" }),
    { flag: "wx", mode: 0o600 });
  process.stdout.write(JSON.stringify({ kind: "m6-postrun-public-evidence-export", passed: false, stage, detailsWithheld: true,
    nativeSubmissions: 0, proofsRequested: 0 }) + "\n"); process.exitCode = 1;
}
