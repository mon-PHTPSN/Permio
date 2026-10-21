import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CostModel, LedgerParameters } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { PreprodConnectionProfile, createPreprodAuthorizationProviders, classifyPreprodBalanceFailure } from "@permio/midnight-authorization";
import { runLiveM6Admission } from "./run-live-m6-admission.ts";
import { parseLiveM6Arguments } from "./m6-prover-memory.ts";

// Actual constructor/verifiers and unchanged ledger fee calculation. No wallet,
// proof generation, transport request, balancing, signing or submission.
const assets = path.resolve("packages/midnight-authorization/contracts/managed/permio-authorization");
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const implementationHash = `0x${hash(await readFile(path.join(assets, "zkir/executeRuntimeAction.zkir")))}` as const;
const profile = new PreprodConnectionProfile("nightpreprod_synthetic_offline_deployment_check");
const forbidden = () => { throw Error("Offline deployment preflight cannot use wallet or transport"); };
const wallet = { env: profile.environmentForSdk(), getCoinPublicKey: () => "01".repeat(32),
  getEncryptionPublicKey: () => "02".repeat(32), balanceTx: forbidden, submitTx: forbidden };
const stop = Error("owned-offline-deployment-preflight-completed");
let inspected = 0;
const report: Record<string, unknown> = { kind: "v9-ordinary-action-deployment-preflight",
  observedAtUtc: new Date().toISOString(), compilerVersion: "0.31.1", ledgerVersion: "8.1.3",
  contractVersion: 9, provableEntries: 13, walletInitialized: false, networkRequests: 0,
  transactionsSubmitted: 0, proofGenerated: false, realNodeAcceptance: false, milestoneComplete: false };
setNetworkId("preprod");
try {
  await runLiveM6Admission(parseLiveM6Arguments(["--governance-only"]), { networkId: "preprod", deploymentOnly: true,
    ordinaryAction: { implementationHash, sourceHash: implementationHash, profile },
    async withProviders(use) {
      const base = createPreprodAuthorizationProviders(wallet as never, profile);
      const publicDataProvider = new Proxy(base.publicDataProvider, { get: () => forbidden });
      return use({ ...base, publicDataProvider, proofProvider: { async proveTx(transaction) {
        inspected += 1; assert.equal(inspected, 1);
        const proved = await transaction.prove({ check: forbidden, prove: forbidden }, CostModel.initialCostModel());
        report.unbalancedDeploymentBytes = proved.serialize().length;
        report.unbalancedDeploymentSha256 = hash(proved.serialize());
        try {
          report.fee = String(proved.fees(LedgerParameters.initialParameters()));
          report.result = "PASS";
        } catch (error) {
          report.result = "BLOCKED"; report.category = classifyPreprodBalanceFailure(error);
        }
        throw stop;
      } } });
    } });
  assert.fail("Preflight must stop before wallet balancing");
} catch (error) {
  if (error !== stop) { report.result = "FAIL"; report.category = "asset-or-constructor-preflight"; }
} finally { setNetworkId("undeployed"); }
report.inspectedDeployments = inspected;
const output = path.resolve("logs", `m6-v9-deployment-preflight-${Date.now()}.json`);
await writeFile(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ ...report, output }));
if (report.result !== "PASS") process.exitCode = 1;
