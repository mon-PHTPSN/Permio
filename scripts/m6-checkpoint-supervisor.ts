import type { ChildProcess } from 'node:child_process';

export const OFFLINE_CHECKPOINT_TIMEOUT_MS = 60_000;
type PublicRecord = Record<string, unknown>;
type OwnedChild = Pick<ChildProcess, 'on' | 'once' | 'kill'>;

/** The caller must supply only its own freshly forked checkpoint inspector. No global process lookup. */
export async function monitorOfflineCheckpoint(child: OwnedChild, emit: (value: PublicRecord) => void,
  timeoutMs = OFFLINE_CHECKPOINT_TIMEOUT_MS): Promise<{ passed: boolean; report: PublicRecord }> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > OFFLINE_CHECKPOINT_TIMEOUT_MS) throw Error('invalid-offline-diagnostic-budget');
  let result: PublicRecord | undefined, timedOut = false, reporterFailed = false;
  child.on('message', (message: unknown) => {
    if (!message || typeof message !== 'object') return;
    const value = message as PublicRecord;
    if (value.kind === 'm6-offline-checkpoint-progress') {
      try { emit(value); } catch { reporterFailed = true; child.kill('SIGTERM'); }
    } else if (value.kind === 'm6-offline-preprod-checkpoint-inspection' || value.kind === 'm6-offline-preprod-checkpoint-inspection-failed') result = value;
  });
  const deadline = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, timeoutMs);
  const closed = await new Promise<{ code: number | null; signal: string | null }>(resolve => {
    child.once('error', () => resolve({ code: null, signal: null }));
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(deadline);
  if (!timedOut && !reporterFailed && closed.code === 0 && result?.kind === 'm6-offline-preprod-checkpoint-inspection') {
    return { passed: true, report: result };
  }
  return { passed: false, report: result?.kind === 'm6-offline-preprod-checkpoint-inspection-failed' && !timedOut && !reporterFailed ? result : {
    kind: 'm6-offline-preprod-checkpoint-inspection-failed', phase: 'owned-child-inspection',
    category: timedOut ? 'owned-process-deadline' : 'owned-process-failed', timeoutMs,
    childExitCode: closed.code, childSignal: closed.signal, detailsWithheld: true,
    checkpointFilesWritten: false, transactionSubmitted: false, milestoneComplete: false,
  } };
}
