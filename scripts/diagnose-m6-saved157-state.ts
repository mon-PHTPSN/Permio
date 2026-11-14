import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
const root = "/opt/permio-m6-remaining-preprod-20261019-v1", frozen = root + "/client";
const require = createRequire(frozen + "/package.json");
for (const key of ["log", "warn", "error", "info", "debug"] as const) console[key] = () => {};
let stage = "saved-state-inspection";
try {
  const ledger = await import(pathToFileURL(require.resolve("@midnight-ntwrk/ledger-v8")).href);
  const snapshot = JSON.parse(JSON.parse(await readFile(root + "/private/rolling-wallet-snapshots.json", "utf8")).dust);
  const state = ledger.DustLocalState.deserialize(Buffer.from(snapshot.state, "hex"));
  const fingerprint = (value: unknown) => createHash("sha256").update(String(value)).digest("hex");
  const candidates = [];
  for (const round of [155, 156, 157]) {
    const bytes = await readFile(root + `/private/wallet-${round}-balanced.bin`);
    const tx = ledger.Transaction.deserialize("signature", "proof", "binding", bytes);
    candidates.push({ round, candidateSha256: createHash("sha256").update(bytes).digest("hex"),
      dust: [...tx.intents.values()].filter((i: any) => i.dustActions).map((i: any) => ({
        creationTimeUtc: i.dustActions.ctime.toISOString(), spends: i.dustActions.spends.length,
        registrations: i.dustActions.registrations.length,
      })) });
  }
  process.stdout.write(JSON.stringify({ passed: true, snapshotSyncTimeUtc: state.syncTime.toISOString(),
    snapshotCommitmentRootFingerprint: fingerprint(state.commitmentTreeRoot()),
    snapshotGenerationRootFingerprint: fingerprint(state.generatingTreeRoot()), snapshotOffset: snapshot.offset,
    candidates, nativeSubmissions: 0, privateValuesLogged: false }) + "\n");
} catch (error) {
  process.stdout.write(JSON.stringify({ passed: false, stage, errorType: error instanceof Error ? error.name : "unknown", nativeSubmissions: 0 }) + "\n");
  process.exitCode = 1;
}
