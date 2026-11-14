export const cappedLiveLimits: Readonly<{ memory: number; swap: number; cpus: number;
  timeoutSeconds: number; reserveKiB: number }>;
export const cappedClientLimits: Readonly<{ high: number; max: number; swap: number; oldSpaceMiB: number }>;
export function parseCappedLiveArguments(args: readonly string[]): Readonly<{
  mode: '--slot-state' | '--credential-binding' | '--allocation-only';
  resetBeforeSlot: boolean;
  prover: Readonly<{ profile: 'one-worker' | 'four-worker' | 'experiment-reclaim'; cpus: number; rayonThreads: number;
    memoryHigh: number | 'max'; memoryMax: number;
    serverWorkers: number; serverJobTimeoutSeconds: number }>;
}>;
export function proverCgroupPaths(expectedId: string, driver?: 'cgroupfs' | 'systemd'): Readonly<{ parent: string; leaf: string }>;
export function proverSoftLimitHelperArguments(container: unknown, expectedId: string, expectedImage: string, driver?: 'cgroupfs' | 'systemd'): string[];
export function verifyProverCgroupLimits(applied: Record<string, string>, profile: { memoryMax: number; memoryHigh: number | 'max' }): void;
export function verifySlotResetRequest(request: unknown, expectedPid: number, expectedRunName: string): void;
export function verifyCappedClientCgroup(chain: readonly Record<string, string | undefined>[]): void;
export function verifyCappedLiveInitialMemory(memory: Record<string, number>): void;
export function cappedLiveStopReason(memory: Record<string, number>, state: { running: boolean; oomKilled: boolean },
  elapsedSeconds: number, interrupted?: boolean): string | null;
