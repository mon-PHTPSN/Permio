import assert from 'node:assert/strict';
import type { ProofProvider } from '@midnight-ntwrk/midnight-js-types';
import { classifyLiveM6Failure } from './m6-live-failure.ts';

/** Pass through proofs/errors unchanged; never inspect/serialize transaction arguments. */
export function observeLocalProofProvider(
  provider: ProofProvider,
  emit: (event: string, fields: Readonly<Record<string, unknown>>) => void,
  requestTimeoutMs: number,
): ProofProvider {
  // The measured k=21 action uses the explicit one-hour local HTTP profile.
  // This observer does not extend signed transaction or credential lifetimes.
  assert([300_000, 600_000, 3_600_000].includes(requestTimeoutMs));
  let sequence = 0;
  return {
    async proveTx(...args: Parameters<ProofProvider['proveTx']>) {
      const proofProviderJob = ++sequence, start = performance.now();
      const fields = { proofProviderJob, requestTimeoutMs,
        measurementBoundary: 'contract-proof-provider-including-check-prove-http-not-pure-crypto-or-ordinary-action-latency',
        privateArgumentsInspectedOrLogged: false };
      emit('contract-proof-started', fields);
      try {
        const result = await provider.proveTx(...args);
        emit('contract-proof-completed', { ...fields, elapsedMs: performance.now() - start,
          transactionSubmissionOrFinalityAsserted: false });
        return result;
      } catch (error: unknown) {
        emit('contract-proof-failed', { ...fields, elapsedMs: performance.now() - start,
          category: classifyLiveM6Failure(error), detailsWithheldToProtectPrivateWitness: true });
        throw error;
      }
    },
  };
}
