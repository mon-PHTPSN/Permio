export const GiB: number;
export const boundedKeyLimits: Readonly<{ high: number; max: number; swap: number; timeoutSeconds: number;
  reserveKiB: number; maximumK: number }>;
export function parseBoundedKeyArguments(args: readonly string[]): { reuseSlot: string | undefined };
export function readNumericCounters(text: string): Record<string, number>;
export function verifyBoundedKeyCgroup(chain: readonly Readonly<Record<string, string | undefined>>[]): void;
export function boundedKeyStopReason(memory: Readonly<Record<string, number>>, events: Readonly<Record<string, number>>,
  elapsedSeconds: number): string | null;
export function verifyReusableSlotReport(report: unknown, expected: Readonly<{ programSha256: string;
  zkirSha256: string; publicParametersSha256: string }>): Record<'prover' | 'verifier', { bytes: number; sha256: string }>;
