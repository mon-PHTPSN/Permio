import { fork } from 'node:child_process';
import { lstat, mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePreprodAdmissionArguments, loadPreprodAdmissionProfile, loadPreprodAdmissionWallet,
  PREPROD_GENESIS_HASH, PREPROD_ADMISSION_TIMEOUT_MS } from './m6-preprod-admission.ts';
import { monitorPreprodAdmission } from './m6-preprod-admission-supervisor.ts';
import { probePreprodTransports } from './m6-preprod-transport.ts';
import { PreprodSubmissionError } from '../packages/midnight-authorization/src/preprod-submission-failure.ts';

const phase = (value: string) => process.send?.({ kind: 'preprod-admission-phase', phase: value });
async function worker() {
  const options = parsePreprodAdmissionArguments(process.argv.slice(2));
  phase('preflight');
  const profile = await loadPreprodAdmissionProfile(options);
  const { verifyPermioAuthorizationAssets } = await import('../packages/midnight-authorization/src/compiled-assets.ts');
  await verifyPermioAuthorizationAssets(path.resolve('packages/midnight-authorization/contracts/managed/permio-authorization'));
  const transport = await probePreprodTransports(profile);
  let loopbackProverHealthy = false;
  try { loopbackProverHealthy = (await fetch(`${profile.environmentForSdk().proofServer}/health`,
    { signal: AbortSignal.timeout(5000), redirect: 'error' })).status === 200; } catch { /* fixed public readiness field only */ }
  const preflight = { assetsVerified: true, nodeRpcPassed: transport.http.passed,
    genesisMatches: transport.http.genesisHash === PREPROD_GENESIS_HASH, nodeSubscriptionPassed: transport.nodeSubscription.passed,
    indexerSubscriptionPassed: transport.indexerSubscription.passed, loopbackProverHealthy };
  process.send?.({ kind: 'preprod-admission-preflight', ...preflight });
  if (!Object.values(preflight).every(Boolean)) throw Error('preflight-failed');
  if (options.scope !== 'check') {
    const inputs = await loadPreprodAdmissionWallet(options);
    const scratch = await mkdtemp(path.join(tmpdir(), 'permio-m6-preprod-sdk-'));
    const previousDirectory = process.cwd();
    try {
      // The pinned SDK constructs a file logger at import. Keep that side effect private.
      try { process.chdir(scratch); await import('@midnight-ntwrk/testkit-js'); }
      finally { process.chdir(previousDirectory); }
      const { setNetworkId } = await import('@midnight-ntwrk/midnight-js-network-id');
      const { withRestoredPreprodWallet } = await import('../packages/midnight-authorization/src/preprod-checkpoint.ts');
      const { createPreprodAuthorizationProviders } = await import('../packages/midnight-authorization/src/preprod-runtime.ts');
      const { runLiveM6Admission } = await import('./run-live-m6-admission.ts');
      const { parseLiveM6Arguments } = await import('./m6-prover-memory.ts');
      setNetworkId('preprod');
      const scopes = { deployment: '--governance-only', governance: '--governance-only', allocation: '--allocation-only',
        'credential-binding': '--credential-binding', 'slot-state': '--slot-state' } as const;
      await runLiveM6Admission(parseLiveM6Arguments([scopes[options.scope]]), {
        networkId: 'preprod', deploymentOnly: options.scope === 'deployment',
        async withProviders(use) {
          phase('restore');
          return withRestoredPreprodWallet(profile, inputs.secret, inputs.snapshots, async wallet => {
            phase('synchronize'); const status = await wallet.synchronize();
            if (!status.readyForTransactions) throw Error('wallet-not-ready');
            phase('workflow'); return use(createPreprodAuthorizationProviders(wallet, profile, phase,
              submissionFailure => process.send?.({ kind: 'preprod-submission-failed', submissionFailure })));
          }, stage => { if (stage.startsWith('node-connect-')) phase(stage); });
        },
      });
      phase('dispose'); await inputs.verifyUnchanged();
    } finally {
      process.chdir(previousDirectory);
      // Remove only this call's own, validated temporary SDK-log directory, never inputs.
      const resolved = await realpath(scratch), meta = await lstat(scratch);
      if (resolved !== scratch || !meta.isDirectory() || meta.isSymbolicLink() ||
        !path.basename(scratch).startsWith('permio-m6-preprod-sdk-') || path.dirname(scratch) !== path.resolve(tmpdir())) throw Error('scratch-cleanup-rejected');
      await rm(scratch, { recursive: true });
    }
  }
  process.send?.({ kind: 'preprod-admission-finished', scope: options.scope, milestoneComplete: false });
}

async function parent() {
  const options = parsePreprodAdmissionArguments(process.argv.slice(2));
  const child = fork(fileURLToPath(import.meta.url), process.argv.slice(2), {
    execArgv: ['--max-old-space-size=768'], stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
  const outcome = await monitorPreprodAdmission(child, options.scope,
    value => console.log(JSON.stringify({ kind: 'm6-preprod-admission-progress', phase: value })));
  const report = { kind: 'm6-preprod-admission-run', ...outcome, scope: options.scope,
    observedAtUtc: new Date().toISOString(), wholeOwnedProcessTimeoutMs: PREPROD_ADMISSION_TIMEOUT_MS,
    v8HeapMiB: 768, notHardTotalProcessRamLimit: true, rawSdkOutputWithheld: true,
    submissionOutcomeReconciliationRequired: !outcome.passed && options.scope !== 'check',
    automaticSubmissionRetry: false, checkpointPersistence: false,
    checkModeDoesNotVerifyProofOrLedgerTransactionCompatibility: true, milestoneComplete: false };
  await mkdir('logs', { recursive: true });
  await writeFile(path.join('logs', `m6-preprod-admission-${Date.now()}.json`), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify(report)); if (!outcome.passed) process.exitCode = 1;
}
if (process.send) worker().catch(error => {
  process.exitCode = 1;
  process.send?.({ kind: 'preprod-admission-failed', detailsWithheld: true,
    ...(error instanceof PreprodSubmissionError ? { submissionFailure: error.diagnostic } : {}) });
}).finally(() => process.disconnect?.());
else parent().catch(() => {
  console.log(JSON.stringify({ kind: 'm6-preprod-admission-run', passed: false, category: 'invalid-controls-or-supervision',
    detailsWithheld: true, milestoneComplete: false })); process.exitCode = 1;
});
