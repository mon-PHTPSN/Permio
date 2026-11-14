import assert from "node:assert/strict";
import { it } from "node:test";

// Explicit real-assets acceptance: validates keys, then stops at the local proof-provider hook.
// Missing assets fail this suite; no proof, wallet balancing or submission is permitted.
it('the shared runner constructs a real current-contract deployment bound to Preprod, stopping before proof, balancing or submission', async () => {
  const { setNetworkId } = await import('@midnight-ntwrk/midnight-js-network-id');
  const { runLiveM6Admission } = await import('../run-live-m6-admission.ts');
  const { parseLiveM6Arguments } = await import('../m6-prover-memory.ts');
  const { createPreprodAuthorizationProviders } = await import('../../packages/midnight-authorization/src/preprod-runtime.ts');
  const { PreprodConnectionProfile } = await import('../../packages/midnight-authorization/src/preprod-profile.ts');
  const { hashProtocolIdentifier } = await import('../../packages/midnight-authorization/src/canonical.ts');
  const profile = new PreprodConnectionProfile('nightpreprod_synthetic_no_submission');
  let unprovenTransactions = 0, balance = 0, submit = 0;
  setNetworkId('preprod');
  try {
    const wallet = { env: profile.environmentForSdk(), getCoinPublicKey: () => '01'.repeat(32),
      getEncryptionPublicKey: () => '02'.repeat(32), async balanceTx() { balance++; throw Error('must-not-balance'); },
      async submitTx() { submit++; throw Error('must-not-submit'); } };
    const providers = { ...createPreprodAuthorizationProviders(wallet as never, profile), proofProvider: {
      async proveTx(tx: Parameters<import('@midnight-ntwrk/midnight-js-types').ProofProvider['proveTx']>[0]) {
      const bytes = Buffer.from(tx.serialize());
      assert(bytes.includes(Buffer.from(hashProtocolIdentifier('network-id', 'preprod').slice(2), 'hex')));
      assert(!bytes.includes(Buffer.from(hashProtocolIdentifier('network-id', 'undeployed').slice(2), 'hex')));
      unprovenTransactions++; throw Error('synthetic-stop-before-proving');
    } } };
    await assert.rejects(runLiveM6Admission(parseLiveM6Arguments(['--governance-only']), {
      networkId: 'preprod', deploymentOnly: true, async withProviders(use) { return use(providers); },
    }), /synthetic-stop-before-proving/);
    assert.equal(unprovenTransactions, 1); assert.equal(balance, 0); assert.equal(submit, 0);
  } finally { setNetworkId('undeployed'); }
});
