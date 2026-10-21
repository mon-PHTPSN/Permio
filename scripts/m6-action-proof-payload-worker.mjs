// Synthetic diagnostic only. Keep the pinned official binary proof format.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { createProvingPayload } from '@midnight-ntwrk/midnight-js-protocol/ledger';

assert(!isMainThread && parentPort && workerData.kind === 'm6-synthetic-action-payload');
assert.equal(workerData.assets, 'logs/m6-action-keygen-ecs-v8');
const digest = value => createHash('sha256').update(value).digest('hex');
try {
  const assets = workerData.assets;
  const build = JSON.parse(await readFile(`${assets}/keygen-report.json`, 'utf8'));
  assert(build.realKeyBuildCompleted && !build.mockKeysUsed && build.programUnchanged);
  assert.equal(build.programSha256, 'cfa7dd2e7b85d08e84f7d4bc7a709fd00c68547c558edfc5e7d0a80c86957d76');
  const material = {
    ir: await readFile(`${assets}/diagnoseLedgerBoundActionAncestry.bzkir`),
    proverKey: await readFile(`${assets}/output/action.prover`),
    verifierKey: await readFile(`${assets}/output/action.verifier`),
  };
  assert.equal(digest(material.ir), '8c15b683dfffa4139e8293340a7149c241b9abec67aa68f3693266e829b50ef6');
  assert.equal(digest(material.proverKey), build.keyFiles['action.prover'].sha256);
  assert.equal(digest(material.verifierKey), build.keyFiles['action.verifier'].sha256);
  let payload = createProvingPayload(workerData.preimage, undefined, material);
  assert(payload instanceof Uint8Array && payload.buffer instanceof ArrayBuffer);
  if (payload.byteOffset !== 0 || payload.byteLength !== payload.buffer.byteLength) payload = payload.slice();
  parentPort.postMessage({ payload, keyMaterialHashesVerified: true, officialLedgerPayloadApiUsed: true }, [payload.buffer]);
} catch (error) {
  parentPort.postMessage({ failed: true, errorType: error.name, detailsWithheld: true });
}
