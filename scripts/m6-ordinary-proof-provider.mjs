import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { CostModel, parseCheckResult } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { postLoopbackProof, safeProofErrorChain } from './m6-action-proof-http-memory.mjs';

/** Official payload/transaction APIs, with temporary key ownership in a worker. */
export function ordinaryActionProofProvider({ port = 6300, beforeProof, afterProof, captureProvedTransaction, observe = () => {} }) {
  assert([6300, 6301].includes(port));
  let active = false;
  async function payload(mode, preimage, keyLocation, overwriteBindingInput) {
    const worker = new Worker(new URL('./m6-ordinary-payload-worker.mjs', import.meta.url), {
      workerData: { kind: 'm6-v10-private-proof-payload', mode, preimage, keyLocation, overwriteBindingInput },
      stdout: true, stderr: true,
    });
    worker.stdout.resume(); worker.stderr.resume();
    let timer;
    try {
      return await new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(Error('Private payload preparation timed out')), 180_000);
        worker.once('message', message => message.publicKeysVerified && message.payload instanceof Uint8Array
          ? resolve(message.payload) : reject(Error('Private payload worker failed; details withheld')));
        worker.once('error', () => reject(Error('Private payload worker failed; details withheld')));
        worker.once('exit', code => { if (code !== 0) reject(Error('Private payload worker stopped')); });
      });
    } finally { clearTimeout(timer); await worker.terminate(); }
  }
  const base = {
    async check(preimage, keyLocation) {
      let bytes = await payload('check', preimage, keyLocation);
      const result = postLoopbackProof('/check', bytes, { port, timeoutMs: 3_600_000 });
      bytes = undefined;
      return parseCheckResult(await result);
    },
    async prove(preimage, keyLocation, overwriteBindingInput) {
      let bytes = await payload('prove', preimage, keyLocation, overwriteBindingInput);
      observe({ event: 'ordinary-proof-payload-prepared', circuit: keyLocation,
        payloadBytes: bytes.length, temporaryKeyWorkerReleased: true, privatePayloadLogged: false });
      const result = postLoopbackProof('/prove', bytes, { port, timeoutMs: 3_600_000,
        onBodySent: () => global.gc?.() });
      bytes = undefined;
      return result;
    },
  };
  return { async proveTx(transaction) {
    assert(!active, 'Only one application proof may use this owned prover'); active = true;
    let completed = false;
    try {
      await beforeProof?.(transaction);
      const proved = await transaction.prove(base, CostModel.initialCostModel());
      await captureProvedTransaction?.(proved);
      completed = true; return proved;
    } catch (error) {
      observe({ event: 'ordinary-application-proof-failed', safeErrorChain: safeProofErrorChain(error), detailsWithheld: true });
      throw error;
    } finally {
      active = false;
      if (completed) await afterProof?.();
    }
  } };
}
