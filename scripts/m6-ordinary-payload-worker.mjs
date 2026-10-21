// Public pinned key material plus a private preimage. Never log either payload.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { createCheckPayload, createProvingPayload } from '@midnight-ntwrk/midnight-js-protocol/ledger';

assert(!isMainThread && parentPort && workerData.kind === 'm6-v10-private-proof-payload');
const hash = data => createHash('sha256').update(data).digest('hex');
try {
  const assets = path.resolve('packages/midnight-authorization/contracts/managed/permio-authorization');
  assert.equal(await realpath(assets), assets);
  const manifest = JSON.parse(await readFile(path.join(assets, 'keys/build-manifest.json'), 'utf8'));
  assert(manifest.manifestVersion === 2 && manifest.compilerVersion === '0.31.1' &&
    manifest.runtimeVersion === '0.16.0' && manifest.circuits.length === 10);
  const name = workerData.keyLocation;
  assert(typeof name === 'string' && /^[A-Za-z][A-Za-z0-9_]*$/.test(name));
  const entry = manifest.circuits.find(entry => entry.name === name); assert(entry);
  const ir = await readFile(path.join(assets, 'zkir', name + '.bzkir'));
  assert.equal(hash(ir), entry.binaryProgramSha256);
  let payload;
  if (workerData.mode === 'check') payload = createCheckPayload(workerData.preimage, ir);
  else {
    assert.equal(workerData.mode, 'prove');
    const proverKey = await readFile(path.join(assets, 'keys', name + '.prover'));
    const verifierKey = await readFile(path.join(assets, 'keys', name + '.verifier'));
    assert.equal(hash(proverKey), entry.proverSha256); assert.equal(hash(verifierKey), entry.verifierSha256);
    payload = createProvingPayload(workerData.preimage, workerData.overwriteBindingInput, { ir, proverKey, verifierKey });
  }
  if (payload.byteOffset || payload.byteLength !== payload.buffer.byteLength) payload = payload.slice();
  parentPort.postMessage({ payload, publicKeysVerified: true }, [payload.buffer]);
} catch {
  parentPort.postMessage({ failed: true, detailsWithheld: true });
}
