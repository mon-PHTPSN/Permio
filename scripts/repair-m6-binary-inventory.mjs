import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { constants, createReadStream } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
assert(root.replaceAll('\\', '/').endsWith('/Permio-m6-m8-midnight-delivery') && process.argv.length === 3 && process.argv[2] === '--run');
const assets = path.join(root, 'packages/midnight-authorization/contracts/managed/permio-authorization');
const manifestPath = path.join(assets, 'keys/build-manifest.json');
async function hash(file) { const h = createHash('sha256'); for await (const chunk of createReadStream(file)) h.update(chunk); return h.digest('hex'); }
assert.equal(await hash(manifestPath), '937b8e9ccaeda5fd9e21b1cdea32ef8ea76cc5cde4e7470a3e2c4f324429c013', 'Repair only the reviewed original current inventory');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
assert(manifest.manifestVersion === 1 && manifest.mode === 'real-bounded-keys' && manifest.compilerVersion === '0.31.1' &&
  manifest.runtimeVersion === '0.16.0' && manifest.circuits.length === 11 && new Set(manifest.circuits.map(e => e.name)).size === 11);
assert.equal(await hash(path.join(assets, 'contract/index.js')), manifest.contractSha256);
assert.equal(await hash(path.join(assets, 'compiler/contract-info.json')), manifest.compilerInfoSha256);
for (const entry of manifest.circuits) {
  assert(/^[A-Za-z][A-Za-z0-9_]*$/.test(entry.name));
  assert.equal(await hash(path.join(assets, 'zkir', `${entry.name}.zkir`)), entry.programSha256);
  for (const suffix of ['prover', 'verifier']) {
    const file = path.join(assets, 'keys', `${entry.name}.${suffix}`);
    assert.equal((await stat(file)).size, entry[`${suffix}Bytes`]); assert.equal(await hash(file), entry[`${suffix}Sha256`]);
  }
}
const experimentBase = path.join(path.dirname(root), 'Permio-m6-low-memory-experiment/packages/midnight-authorization/contracts/managed/permio-authorization/zkir/manageRuntimeParticipantSlots');
assert.equal(await realpath(`${experimentBase}.bzkir`), `${experimentBase}.bzkir`);
assert.equal(await hash(`${experimentBase}.zkir`), '70ea49d8ddab0189ba95daa52d91f060e3d7ee90700e8982999353d3417f70e4');
assert.equal(await hash(`${experimentBase}.bzkir`), '9a5eb57ca747c0fd6f5abc56152168264f839ddbab15ba04467ccb54fac032e0');
assert.equal((await stat(`${experimentBase}.bzkir`)).size, 83923);
await mkdir(path.join(root, 'logs'), { recursive: true });
const directory = await mkdtemp(path.join(root, 'logs/m6-binary-inventory-'));
await copyFile(manifestPath, path.join(directory, 'original-build-manifest.json'), constants.COPYFILE_EXCL);
// Public binary output from the same successful pinned real slot-key build.
await copyFile(`${experimentBase}.bzkir`, path.join(assets, 'zkir/manageRuntimeParticipantSlots.bzkir'), constants.COPYFILE_EXCL);
for (const entry of manifest.circuits) {
  const binary = path.join(assets, 'zkir', `${entry.name}.bzkir`);
  entry.binaryProgramSha256 = await hash(binary); entry.binaryProgramBytes = (await stat(binary)).size;
  assert(entry.binaryProgramBytes > 0);
}
manifest.manifestVersion = 2; manifest.binaryInventoryVerifiedAtUtc = new Date().toISOString();
const staged = path.join(directory, 'verified-build-manifest-v2.json');
await writeFile(staged, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
// Only this exact generated metadata is replaced; the original is recoverable.
assert.equal(await hash(manifestPath), await hash(path.join(directory, 'original-build-manifest.json')));
await rename(staged, manifestPath);
const { verifyPermioAuthorizationAssets } = await import('../packages/midnight-authorization/src/compiled-assets.ts');
await verifyPermioAuthorizationAssets(assets);
const { NodeZkConfigProvider } = await import('@midnight-ntwrk/midnight-js-node-zk-config-provider');
const binary = await new NodeZkConfigProvider(assets).getZKIR('manageRuntimeParticipantSlots');
assert(binary.length === 83923);
const report = { kind: 'verified-public-binary-inventory-repair', atUtc: new Date().toISOString(),
  oldManifestSha256: await hash(path.join(directory, 'original-build-manifest.json')),
  newManifestSha256: await hash(manifestPath), manifestVersion: 2, pairsVerified: 11,
  reusedSlotBinaryBytes: 83923, reusedSlotBinarySha256: '9a5eb57ca747c0fd6f5abc56152168264f839ddbab15ba04467ccb54fac032e0',
  realProverVerifierTextProgramsAndContractBindingsUnchanged: true, sdkBinaryLoadPassed: true,
  mockKeysOrProvingUsed: false, walletOrPrivateWitnessRead: false, milestoneComplete: false };
await writeFile(path.join(directory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ ...report, report: path.relative(root, path.join(directory, 'report.json')) }));
