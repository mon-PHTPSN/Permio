import type { ChildProcess } from 'node:child_process';
import { PREPROD_ADMISSION_TIMEOUT_MS, type PreprodAdmissionScope } from './m6-preprod-admission.ts';
import { parsePreprodSubmissionFailure, type PreprodSubmissionFailure } from '../packages/midnight-authorization/src/preprod-submission-failure.ts';

type OwnedChild = Pick<ChildProcess, 'on' | 'once' | 'kill'>;
const checkFields = ['assetsVerified', 'nodeRpcPassed', 'genesisMatches', 'nodeSubscriptionPassed', 'indexerSubscriptionPassed', 'loopbackProverHealthy'] as const;
type Preflight = Record<typeof checkFields[number], boolean>;
/** Only the freshly forked owned worker is accepted. Never auto-retry an uncertain submission. */
export function monitorPreprodAdmission(child: OwnedChild, scope: PreprodAdmissionScope,
  emit: (phase: string) => void, timeoutMs = PREPROD_ADMISSION_TIMEOUT_MS): Promise<{
    passed: boolean; category: string; preflight?: Preflight; submissionFailure?: PreprodSubmissionFailure; lastPhase?: string;
  }> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > PREPROD_ADMISSION_TIMEOUT_MS) throw Error('invalid-owned-preprod-budget');
  return new Promise(resolve => {
    let done = false, result = false, timedOut = false, reporterFailed = false;
    let preflight: Preflight | undefined;
    let submissionFailure: PreprodSubmissionFailure | undefined, lastPhase: string | undefined;
    let forced: ReturnType<typeof setTimeout> | undefined;
    const terminate = () => {
      child.kill('SIGTERM');
      if (!done && !forced) forced = setTimeout(() => { child.kill('SIGKILL'); }, 5000);
    };
    const timer = setTimeout(() => { timedOut = true; terminate(); }, timeoutMs);
    child.on('message', (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const value = raw as Record<string, unknown>;
      if (value.kind === 'preprod-admission-preflight' && checkFields.every(key => typeof value[key] === 'boolean')) {
        preflight = Object.fromEntries(checkFields.map(key => [key, value[key]])) as Preflight;
        return;
      }
      if (value.kind === 'preprod-admission-failed') {
        submissionFailure ??= parsePreprodSubmissionFailure(value.submissionFailure);
        result = false; terminate(); return;
      }
      if (value.kind === 'preprod-submission-failed') {
        submissionFailure ??= parsePreprodSubmissionFailure(value.submissionFailure);
        return; // Let the worker finish wallet disposal before its failure message.
      }
      if (value.kind === 'preprod-admission-phase' && ['preflight', 'restore', 'synchronize', 'workflow', 'dispose',
        'node-connect-started', 'node-connect-ready', 'node-connect-failed',
        'wallet-submit-started', 'wallet-submit-completed', 'wallet-balance-started', 'wallet-balance-completed', 'wallet-balance-failed-insufficient-funds',
        'wallet-balance-failed-ledger-block-limit', 'wallet-balance-failed-ledger-dismiss-limit', 'wallet-balance-failed-no-balancing-transaction', 'wallet-balance-failed-empty-dust-actions',
        'wallet-balance-failed-local-prover-failure', 'wallet-balance-failed-request-timeout',
        'wallet-balance-failed-wasm-runtime-failure', 'wallet-balance-failed-binding-failure',
        'wallet-balance-failed-unknown'].includes(value.phase as string)) {
        lastPhase = value.phase as string;
        try { emit(lastPhase); } catch { reporterFailed = true; terminate(); }
      }
      if (value.kind === 'preprod-admission-finished' && value.scope === scope && value.milestoneComplete === false) result = true;
    });
    const finish = (code: number | null) => {
      if (done) return;
      done = true; clearTimeout(timer); if (forced) clearTimeout(forced);
      const passed = code === 0 && result && !timedOut && !reporterFailed && !submissionFailure;
      resolve({ passed, category: passed ? 'owned-worker-completed' : timedOut ? 'owned-process-deadline' : 'owned-worker-failed',
        ...(preflight ? { preflight } : {}), ...(submissionFailure ? { submissionFailure } : {}), ...(lastPhase ? { lastPhase } : {}) });
    };
    child.once('error', () => finish(null)); child.once('close', code => finish(code));
  });
}
