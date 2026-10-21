import type { ProofProvider } from '@midnight-ntwrk/midnight-js-types';
export function ordinaryActionProofProvider(options: {
  port?: number; beforeProof?: (transaction: Parameters<ProofProvider['proveTx']>[0]) => Promise<void>; afterProof?: () => Promise<void>;
  captureProvedTransaction?: (transaction: { serialize(): Uint8Array }) => Promise<void>;
  observe?: (value: Readonly<Record<string, unknown>>) => void;
}): ProofProvider;
