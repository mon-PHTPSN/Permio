export function shortHex(value: unknown, start?: number, end?: number): string;

export function formatUnix(value: unknown): string;

export function summarize(readModel: {
  readonly receipts: readonly { readonly registeredBlock?: string | number }[];
  readonly executions: readonly { readonly success?: boolean; readonly blockNumber?: string | number }[];
  readonly aggregates: readonly { readonly updatedBlock?: string | number }[];
}): {
  readonly receipts: number;
  readonly attempts: number;
  readonly successes: number;
  readonly failures: number;
  readonly successRate: number | null;
  readonly latestBlock: number;
};

export function receiptStatus(
  receipt: Record<string, unknown>,
  executions: readonly Record<string, unknown>[],
): { readonly key: string; readonly label: string };

export function filterReceipts<T extends Record<string, unknown>>(
  receipts: readonly T[],
  executions: readonly Record<string, unknown>[],
  query: string,
  status: string,
): T[];

export function loadDashboard(fetchImplementation?: typeof fetch): Promise<unknown>;
