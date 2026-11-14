// Read-only reproduction of the exact candidate rejected before native send.
import assert from "node:assert/strict";
import { readFile, lstat } from "node:fs/promises";
import { createHash } from "node:crypto";
for (const key of ["log", "warn", "error", "info", "debug"] as const) console[key] = () => {};
const root = "/opt/permio-m6-remaining-preprod-20261019-v1";
const frozen = root + "/client";
const emit = (value: unknown) => process.stdout.write(JSON.stringify(value) + "\n");
let stage = "private-input-check";
const deadline = setTimeout(() => { emit({ passed: false, stage, timedOut: true, nativeSubmissions: 0 }); process.exit(1); }, 90_000);
try {
  assert.equal(process.platform, "linux");
  const meta = await lstat(root + "/private/wallet-157-balanced.bin");
  assert(meta.isFile() && meta.uid === 0 && (meta.mode & 0o777) === 0o600);
  const input = JSON.parse(await readFile(root + "/private/inputs.json", "utf8"));
  assert(input.networkId === "preprod" && input.testOnlyProvenance.includes("disposable Preprod test"));
  const bytes = await readFile(root + "/private/wallet-157-balanced.bin");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const { PreprodConnectionProfile } = await import(frozen + "/packages/midnight-authorization/src/preprod-profile.ts");
  const { validateOrdinaryBalancedTransaction } = await import(frozen + "/scripts/m6-ordinary-node-validation.ts");
  stage = "exact-saved-byte-validation";
  const validation = await validateOrdinaryBalancedTransaction(new PreprodConnectionProfile(input.providerCredential), bytes);
  assert.equal(createHash("sha256").update(await readFile(root + "/private/wallet-157-balanced.bin")).digest("hex"), sha256);
  emit({ passed: validation.accepted, stage, candidateSha256: sha256, validation,
    exactBytesPreserved: true, walletRestored: false, proofsRequested: 0, nativeSubmissions: 0 });
  if (!validation.accepted) process.exitCode = 1;
} catch (error) {
  emit({ passed: false, stage, errorType: error instanceof Error ? error.name : "unknown", detailsWithheld: true, nativeSubmissions: 0 });
  process.exitCode = 1;
} finally { clearTimeout(deadline); }
