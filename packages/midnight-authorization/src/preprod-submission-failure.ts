export const PREPROD_SUBMISSION_CATEGORIES = [
  'unknown', 'node-submission-error', 'node-connection-failed', 'finality-timeout',
  'transaction-usurped', 'transaction-dropped', 'transaction-invalid', 'node-response-invalid', 'request-timeout',
] as const;
export interface PreprodSubmissionFailure {
  readonly category: typeof PREPROD_SUBMISSION_CATEGORIES[number];
  readonly rpcCode?: number;
  readonly customCode?: number;
  readonly httpStatus?: number;
}
const categories: Readonly<Record<string, PreprodSubmissionFailure['category']>> = {
  SubmissionError: 'node-submission-error', ConnectionError: 'node-connection-failed',
  TransactionProgressError: 'finality-timeout', TransactionUsurpedError: 'transaction-usurped',
  PreprodConfirmationTimeout: 'finality-timeout',
  TransactionDroppedError: 'transaction-dropped', TransactionInvalidError: 'transaction-invalid',
  ParseError: 'node-response-invalid', TimeoutError: 'request-timeout', AbortError: 'request-timeout',
};
const own = (value: object, key: PropertyKey): unknown => Object.getOwnPropertyDescriptor(value, key)?.value;
const integer = (value: unknown, minimum: number, maximum: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;

/** Bounded SDK/Effect cause inspection. Never serialize errors, txData, URLs, bodies or stacks. */
export function classifyPreprodSubmissionFailure(error: unknown): PreprodSubmissionFailure {
  let category: PreprodSubmissionFailure['category'] = 'unknown';
  let rpcCode: number | undefined, customCode: number | undefined, httpStatus: number | undefined;
  const queue: { value: unknown; depth: number }[] = [{ value: error, depth: 0 }];
  const seen = new Set<unknown>();
  for (let index = 0; index < queue.length && index < 24; index++) {
    const { value, depth } = queue[index]!;
    if (value === null || typeof value !== 'object' || seen.has(value)) continue;
    seen.add(value);
    try {
      const tag = own(value, '_tag'), name = own(value, 'name');
      const key = typeof tag === 'string' ? tag : typeof name === 'string' ? name : '';
      const label = Object.hasOwn(categories, key) ? categories[key] : undefined;
      if (label && (category === 'unknown' || category === 'node-submission-error')) category = label;
      const code = own(value, 'code'), status = own(value, 'status');
      if (rpcCode === undefined && integer(code, -32768, 32767)) rpcCode = code;
      if (httpStatus === undefined && integer(status, 100, 599)) httpStatus = status;
      const message = own(value, 'message');
      if (typeof message === 'string') {
        const match = /\bCustom error: ([0-9]{1,3})\b/u.exec(message.slice(0, 8192));
        if (customCode === undefined && match && integer(Number(match[1]), 0, 255)) customCode = Number(match[1]);
      }
      if (depth >= 7) continue;
      const add = (next: unknown) => { if (queue.length < 24) queue.push({ value: next, depth: depth + 1 }); };
      add(own(value, 'cause'));
      // Effect.runPromise wraps typed SDK failures in this public runtime cause symbol.
      add(own(value, Symbol.for('effect/Runtime/FiberFailure/Cause')));
      if (tag === 'Fail') add(own(value, 'error'));
      if (tag === 'Die') add(own(value, 'defect'));
      if (tag === 'Sequential' || tag === 'Parallel') { add(own(value, 'left')); add(own(value, 'right')); }
    } catch { /* Uninspectable proxies remain unknown; do not call accessors or toJSON. */ }
  }
  return Object.freeze({ category, ...(rpcCode === undefined ? {} : { rpcCode }),
    ...(customCode === undefined ? {} : { customCode }), ...(httpStatus === undefined ? {} : { httpStatus }) });
}

/** Copy only validated public fields across the worker boundary. */
export function parsePreprodSubmissionFailure(value: unknown): PreprodSubmissionFailure | undefined {
  if (!value || typeof value !== 'object') return undefined;
  try {
    const category = own(value, 'category');
    if (typeof category !== 'string' || !PREPROD_SUBMISSION_CATEGORIES.includes(category as never)) return undefined;
    const rpcCode = own(value, 'rpcCode'), customCode = own(value, 'customCode'), httpStatus = own(value, 'httpStatus');
    if ((rpcCode !== undefined && !integer(rpcCode, -32768, 32767)) ||
        (customCode !== undefined && !integer(customCode, 0, 255)) ||
        (httpStatus !== undefined && !integer(httpStatus, 100, 599))) return undefined;
    return Object.freeze({ category: category as PreprodSubmissionFailure['category'],
      ...(rpcCode === undefined ? {} : { rpcCode: rpcCode as number }),
      ...(customCode === undefined ? {} : { customCode: customCode as number }),
      ...(httpStatus === undefined ? {} : { httpStatus: httpStatus as number }) });
  } catch { return undefined; }
}

export class PreprodSubmissionError extends Error {
  readonly diagnostic: PreprodSubmissionFailure;
  constructor(error: unknown) {
    super('Preprod wallet: submission failed or outcome unknown; reconcile before retry; details withheld');
    this.diagnostic = classifyPreprodSubmissionFailure(error);
  }
}
