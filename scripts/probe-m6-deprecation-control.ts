import assert from "node:assert/strict";
import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { PreprodConnectionProfile } from "../packages/midnight-authorization/src/preprod-profile.ts";
import { ledger } from "../packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js";
import { auditM6DeprecatedModuleAdmission } from "./m6-deprecated-module-admission-audit.ts";

for (const method of ["log", "error", "warn", "info", "debug"] as const) console[method] = () => {};
const root = "/opt/permio-m6-remaining-preprod-20261019-v1";
const address = "70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c";
let stage = "qualified-paused-boundary";
try {
  assert(process.platform === "linux" && process.argv.length === 2);
  const pause = JSON.parse(await readFile(root + "/pause-after45-v1.json", "utf8"));
  assert(pause.pausedAtExactFinalizedBoundary && pause.ownedClientAndProverStopped && pause.temporaryResourcesRestored);
  const path = root + "/private/inputs.json", stat = await lstat(path);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.uid === 0 && (stat.mode & 0o777) === 0o600 && await realpath(path) === path);
  const input = JSON.parse(await readFile(path, "utf8"));
  assert(input.networkId === "preprod" && input.testOnlyProvenance.includes("disposable Preprod test"));
  const profile = new PreprodConnectionProfile(input.providerCredential); setNetworkId("preprod");
  const env = profile.environmentForSdk(), data = indexerPublicDataProvider(env.indexer, env.indexerWS);
  const currentState = await data.queryContractState(address); assert(currentState);
  const view = ledger(currentState.data); assert.equal(view.proofModules.size(), 2n);
  stage = "genuine-historical-binding-program-controls";
  const cases = [];
  for (const [moduleKey, record] of view.proofModules) {
    assert.equal(record.lifecycleStatus, 4n);
    cases.push(await auditM6DeprecatedModuleAdmission({ profile, currentState, moduleKey, expectedModuleStatus: 4n }));
  }
  const report = { kind: "m6-deprecation-control-qualification", observedAtUtc: new Date().toISOString(), passed: true,
    nativeSubmissions: 0, proofsRequested: 0, historicalGenuineBindingPrograms: 2, cases };
  await writeFile(root + "/deprecation-control-qualification-v1.json", JSON.stringify(report), { flag: "wx", mode: 0o600 });
  process.stdout.write(JSON.stringify(report) + "\n");
} catch (error) {
  await writeFile(root + "/private/deprecation-control-private-error-v1.json", JSON.stringify({ stage,
    name: error instanceof Error ? error.name : "unknown", message: error instanceof Error ? error.message : "withheld",
    stack: error instanceof Error ? error.stack : "withheld" }), { flag: "wx", mode: 0o600 });
  process.stdout.write(JSON.stringify({ kind: "m6-deprecation-control-qualification", passed: false, stage,
    nativeSubmissions: 0, proofsRequested: 0, detailsWithheld: true }) + "\n"); process.exitCode = 1;
} finally { process.exit(process.exitCode ?? 0); }
