import assert from 'node:assert/strict';
import { it } from 'node:test';
import { classifyLiveM6Failure } from '../m6-live-failure.ts';

it('live failure classification exposes only a fixed HTTP status label, never URL/body/witness data', () => {
  for (const code of [400, 413, 422, 500, 503]) {
    const error = new Error(`Failed Proof Server response: url="PRIVATE-WITNESS", code="${code}", status="PRIVATE-STATUS"`);
    assert.equal(classifyLiveM6Failure(error), `local-proof-server-http-${code}`);
  }
});

it('known public protocol and resource failures remain distinct without copying error text', () => {
  for (const [message, category] of [
    ['ENOENT PRIVATE', 'missing-or-mismatched-build-assets'],
    ['Transaction would exhaust the block limits PRIVATE', 'ledger-block-limit-rejection'],
    ['Slot command substitutes or is stale against PRIVATE', 'slot-instance-state-preflight'],
    ['Slot command authority/account-status root is stale PRIVATE', 'slot-root-preflight'],
    ['Private map witness does not match PRIVATE', 'slot-private-map-preflight'],
    ['Slot account is not certified PRIVATE', 'slot-account-status-preflight'],
    ['Slot signer authority does not match PRIVATE', 'slot-rule-preflight'],
    ['Slot command is not yet effective or its proof window expired PRIVATE', 'slot-time-preflight'],
    ['Invalid governance activation signature PRIVATE', 'signature-preflight'],
  ]) assert.equal(classifyLiveM6Failure(new Error(message)), category);
  const timeout = new Error('PRIVATE-WITNESS'); timeout.name = 'TimeoutError';
  assert.equal(classifyLiveM6Failure(timeout), 'local-request-timeout-or-abort');
});

it('unknown errors, non-errors and private accessors remain redacted', () => {
  const accessor = { get message(): string { throw new Error('must not read'); } };
  for (const error of [new Error('PRIVATE-WITNESS'), 'PRIVATE-WITNESS', accessor, null, undefined]) {
    assert.equal(classifyLiveM6Failure(error), 'unclassified-private-error');
  }
});

it('native and SDK-wrapped timeout names or causes yield only the fixed timeout label', () => {
  const timeout = new DOMException('PRIVATE-WITNESS', 'TimeoutError');
  for (const error of [timeout, new Error('PRIVATE', { cause: timeout }),
    new Error('SDK failure: TimeoutError: PRIVATE'), new Error('The operation was aborted due to timeout PRIVATE')]) {
    assert.equal(classifyLiveM6Failure(error), 'local-request-timeout-or-abort');
  }
  const status = new Error('Failed Proof Server response: code="503"', { cause: timeout });
  assert.equal(classifyLiveM6Failure(status), 'local-proof-server-http-503');
});

it('error accessors, proxies, deep causes and cycles cannot leak data or recurse without a bound', () => {
  const accessor = new Error();
  Object.defineProperty(accessor, 'message', { get() { throw new Error('must not read PRIVATE'); } });
  Object.defineProperty(accessor, 'cause', { get() { throw new Error('must not read PRIVATE'); } });
  const cycle = new Error('PRIVATE', { cause: undefined }); cycle.cause = cycle;
  const proxy = new Proxy(new Error('PRIVATE'), { getOwnPropertyDescriptor() { throw new Error('PRIVATE'); } });
  let deep: Error = new DOMException('PRIVATE', 'TimeoutError');
  for (let count = 0; count < 4; count++) deep = new Error('PRIVATE', { cause: deep });
  for (const error of [accessor, cycle, proxy, deep]) assert.equal(classifyLiveM6Failure(error), 'unclassified-private-error');
});
