import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import * as sdk from "@permio/midnight-authorization";
import { REMAINING_ROOT } from "./m6-remaining-test-budget.ts";
import { scanM6PublicArtifacts } from "./m6-public-artifact-scan.ts";
import { sanitizeM6RuntimePublicLog } from "./m6-public-runtime-log.ts";
import { isDefiniteIncludedM6ActionFailure } from "./m6-native-negative-outcome.ts";

/** Caller supplies private scan needles. Only successfully scanned public bytes leave this function. */
export async function captureRemainingPublicEvidence(input: {
  providers: sdk.PermioAuthorizationProviders; address: string; receipts: readonly sdk.DecisionReceipt[];
  privateValues: readonly string[];
  outputName?: "scanned-first50-public-evidence-v1" | "scanned-failure55-public-evidence-v1";
  /** Only the separately reconciled local client failure; never publish its unused bytes. */
  localFailure55?: { passed: true; actual55IndexedMatches: 0; currentEntireContractStateEquals54: true;
    conservativeSubmissionAttempts: 54; normalFinalizedCalls: 53; call55RemainsUnretried: true };
}) {
  const artifacts = new Map<string, Uint8Array>();
  const stringify = (value: unknown) => Buffer.from(JSON.stringify(value, (_, v) => typeof v === "bigint" ? String(v)
    : v instanceof Uint8Array ? Buffer.from(v).toString("hex") : v));
  const privateDirectory = REMAINING_ROOT + "/private";
  const indexed = await input.providers.publicDataProvider.queryContractState(input.address); assert(indexed);
  artifacts.set("chain/contract-state.bin", indexed.serialize());
  const view = sdk.readPermioAuthorizationLedger(indexed.data);
  artifacts.set("indexer/ledger-summary.json", stringify({ contractAddress: input.address,
    authorityRoots: [...view.authorityRoots], credentialStatusRoots: [...view.credentialStatusRoots],
    proofModules: [...view.proofModules], activeTemplates: [...view.activeTemplates], instances: [...view.runtimeInstances],
    decisionReceipts: [...view.decisionReceipts], usedActionNullifiers: [...view.usedRuntimeActionNullifiers],
    pendingActionPreparations: [...view.runtimeActionSessions] }));
  artifacts.set("receipts/decision-receipts.json", stringify(input.receipts));
  const escaped = stringify(input.receipts).toString().replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  artifacts.set("html/decision-receipts.html", Buffer.from('<!doctype html><html lang="en"><meta charset="utf-8"><title>M6 verified receipts</title><pre>' + escaped + "</pre></html>"));
  for (const journalName of (await readdir(privateDirectory)).filter(n => /^wallet-[0-9]{3}-submission\.json$/u.test(n)).sort()) {
    const number = journalName.slice(7, 10);
    if (number === "055" && input.localFailure55) {
      assert(input.outputName !== "scanned-first50-public-evidence-v1");
      const f = input.localFailure55;
      assert(f.passed && f.actual55IndexedMatches === 0 && f.currentEntireContractStateEquals54 &&
        f.conservativeSubmissionAttempts === 54 && f.normalFinalizedCalls === 53 && f.call55RemainsUnretried);
      artifacts.set("diagnostics/local-client-failure-055.json", stringify(f));
      continue;
    }
    const path = privateDirectory + `/wallet-${number}-balanced.bin`, stat = await lstat(path);
    assert(stat.isFile() && !stat.isSymbolicLink() && stat.uid === 0 && (stat.mode & 0o777) === 0o600);
    const journal = JSON.parse(await readFile(privateDirectory + "/" + journalName, "utf8"));
    const bytes = await readFile(path);
    artifacts.set(`transactions/attempt-${number}.bin`, bytes);
    if (input.localFailure55 && Number(number) <= 50) {
      // These finalized byte pairs were already queried, scanned and downloaded.
      // Keep that provenance; the caller separately verifies current state after54.
      const previous = REMAINING_ROOT + "/scanned-first50-public-evidence-v1";
      const scan = JSON.parse(await readFile(previous + "/privacy-scan.json", "utf8"));
      assert(scan.passed && scan.findings.length === 0);
      const name = `indexer/finalized-${number}.bin`, cached = await readFile(previous + "/" + name);
      const recorded = scan.files.find((item: {artifact:string}) => item.artifact === name);
      assert(recorded && createHash("sha256").update(cached).digest("hex") === recorded.sha256 && cached.equals(bytes));
      artifacts.set(name, cached);
      continue;
    }
    // Negative attempts have a definite rejection record rather than a chain insertion.
    try {
      const outcome = JSON.parse(await readFile(privateDirectory + `/wallet-${number}-outcome.json`, "utf8"));
      assert.equal(outcome.kind, "native-rejected");
      artifacts.set(`transactions/rejection-${number}.json`, stringify(outcome));
      if (outcome.inclusion) {
        const final = await input.providers.publicDataProvider.watchForTxData(journal.transactionIds.at(-1));
        assert(final.status === "FailFallible" && Buffer.from(final.tx.serialize()).equals(bytes));
        assert(isDefiniteIncludedM6ActionFailure({ ...outcome.inclusion, status: final.status, segmentStatusMap: final.segmentStatusMap }));
        artifacts.set(`indexer/failed-contract-${number}.bin`, final.tx.serialize());
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const final = await input.providers.publicDataProvider.watchForTxData(journal.transactionIds.at(-1));
      assert(final.status === "SucceedEntirely" && Buffer.from(final.tx.serialize()).equals(bytes));
      artifacts.set(`indexer/finalized-${number}.bin`, final.tx.serialize());
    }
  }
  for (const directory of (await readdir(REMAINING_ROOT)).filter(n => /^runtime-[a-z-]+-v[123456]$/u.test(n))) {
    for (const file of ["client-public.jsonl", "report.json", "resources.jsonl"]) {
      try {
        const data=await readFile(`${REMAINING_ROOT}/${directory}/${file}`);
        if (file === "client-public.jsonl") {
          const sanitized=sanitizeM6RuntimePublicLog(data);
          artifacts.set(`logs/${directory}/${file}`,sanitized.bytes);
          artifacts.set(`logs/${directory}/public-log-filter.json`,stringify(sanitized.report));
        } else artifacts.set(`logs/${directory}/${file}`,data);
      }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    }
  }
  for (const name of ["pause-after45-v1.json", "pause-after45-public.jsonl", "ordinary-matrix-controller-public.jsonl",
    "ordinary-matrix-v2-controller-public.jsonl", "ordinary-matrix-v3-controller-public.jsonl", "ordinary-matrix-v4-controller-public.jsonl", "ordinary-matrix-v5-controller-public.jsonl", "ordinary-matrix-v6-controller-public.jsonl",
    "native87-readonly-inspection-v2.json", "after87-recovery-verification-v1.json", "after87-recovery-public-v1.jsonl", "readset-causal-audit-v1.json", "deprecation-control-qualification-v1.json",
    "deprecated-module-admission-97.json", "deprecated-module-admission-99.json", "deprecated-module-admission-133.json", "deprecated-module-admission-135.json"]) {
    try { artifacts.set(`logs/${name}`, await readFile(REMAINING_ROOT + "/" + name)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  const admissionLogs = REMAINING_ROOT + "/client/logs";
  for (const file of (await readdir(admissionLogs)).filter(n => /^m6-live-[0-9TZ.-]+\.jsonl$/u.test(n)))
    artifacts.set(`logs/admission/${file}`, await readFile(admissionLogs + "/" + file));
  const report = scanM6PublicArtifacts(artifacts, input.privateValues);
  if (!report.passed) await writeFile(privateDirectory + `/privacy-scan-failure-${Date.now()}.json`, JSON.stringify(report), { flag: "wx", mode: 0o600 });
  assert(report.passed, "Public-artifact privacy scan failed; findings withheld from publication");
  const output = REMAINING_ROOT + "/" + (input.outputName ?? "scanned-public-evidence-v1");
  await mkdir(output, { mode: 0o700 });
  for (const [name, bytes] of artifacts) {
    const file = output + "/" + name, parent = file.slice(0, file.lastIndexOf("/"));
    await mkdir(parent, { mode: 0o700, recursive: true });
    await writeFile(file, bytes, { flag: "wx", mode: 0o600 });
  }
  await writeFile(output + "/privacy-scan.json", JSON.stringify(report), { flag: "wx", mode: 0o600 });
  return { passed: report.passed, artifactCount: report.artifactCount, privateValuesChecked: report.privateValuesChecked,
    findings: report.findings.length, chainIndexerReceiptLogAndHtmlCaptured: true };
}
