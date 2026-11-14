import assert from "node:assert/strict";
import { lstat, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { collectRecovery150PrivateScanValues } from "./m6-recovery150-private-scan.ts";
import { scanM6PublicArtifacts } from "./m6-public-artifact-scan.ts";

// Final read-only scan of the complete public artifact set after restoration.
// No wallet, provider, submission harness, proof request or private value output.
const root = "/opt/permio-m6-remaining-preprod-20261019-v1";
assert(process.platform === "linux" && process.argv.length === 2);
const directory = root + "/scanned-public-evidence-v1";
assert.equal(await realpath(directory), directory);
assert.equal((await lstat(directory)).mode & 0o777, 0o700);
const report = JSON.parse(await readFile(root + "/recovery150-public-restoration-v1.json", "utf8"));
assert(report.restored && report.allContentAndMetadataRestored && report.originalSwapFilePreserved && report.temporarySwapAbsent);
assert.equal(report.offloadedPublicPaths, 16); assert.equal(report.duplicatePairsRestored, 23);
const journal = JSON.parse(await readFile(root + "/public-space-journal-v1.json", "utf8"));
assert(journal.restored && journal.allContentAndMetadataRestored);
assert.equal(Object.keys(journal.dependencies.files).length, 52_411);
const retained = JSON.parse(await readFile(root + "/recovery150-test-credential-retention-v1.json", "utf8"));
assert(retained.testOnlyProvenanceVerified && retained.privateDirectory0700 && retained.credentialFiles0600);
assert(retained.publicValuesOrCredentialsIncluded === false && retained.continuingAuthorizedM6Use);
const artifacts = new Map<string, Uint8Array>();
async function walk(prefix: string) {
  for (const name of await readdir(directory + prefix)) {
    const relative = (prefix + "/" + name).slice(1), path = directory + "/" + relative, stat = await lstat(path);
    assert(/^[a-zA-Z0-9/_.-]+$/u.test(relative) && !relative.includes("..") && !stat.isSymbolicLink());
    assert.equal(await realpath(path), path); assert.equal(stat.uid, 0);
    if (stat.isDirectory()) await walk("/" + relative);
    else { assert(stat.isFile() && (stat.mode & 0o777) === 0o600); artifacts.set(relative, await readFile(path)); }
  }
}
await walk("");
assert(!artifacts.has("complete-privacy-scan.json"));
for (const name of ["privacy-scan.json", "postrun-privacy-scan.json"]) {
  const scan = JSON.parse(Buffer.from(artifacts.get(name)!).toString()); assert(scan.passed && scan.findings.length === 0);
}
const additions = new Map([
  ["postrun/restoration/public-restore.json", Buffer.from(JSON.stringify(report))],
  ["postrun/restoration/test-credential-retention.json", Buffer.from(JSON.stringify(retained))],
]);
for (const [name, bytes] of additions) { assert(!artifacts.has(name)); artifacts.set(name, bytes); }
const scan = scanM6PublicArtifacts(artifacts, await collectRecovery150PrivateScanValues());
if (!scan.passed) await writeFile(root + "/private/recovery150-complete-privacy-scan-failure-v1.json", JSON.stringify(scan), { flag: "wx", mode: 0o600 });
assert(scan.passed, "Complete artifact scan failed; private findings withheld");
const { mkdir } = await import("node:fs/promises");
await mkdir(directory + "/postrun/restoration", { mode: 0o700 });
for (const [name, bytes] of additions) await writeFile(directory + "/" + name, bytes, { flag: "wx", mode: 0o600 });
await writeFile(directory + "/complete-privacy-scan.json", JSON.stringify(scan), { flag: "wx", mode: 0o600 });
process.stdout.write(JSON.stringify({ passed: true, artifactCount: scan.artifactCount,
  privateValuesChecked: scan.privateValuesChecked, findings: scan.findings.length,
  allPublicFilesAndDependenciesRestored: true, nativeSubmissions: 0, proofsRequested: 0 }) + "\n");
