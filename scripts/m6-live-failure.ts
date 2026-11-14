/** Return only fixed labels / a three-digit HTTP status, never error text or witnesses. */
function classifyFailureNode(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  // Do not invoke arbitrary accessors. Native DOMException fields are branded
  // built-in getters; SDK/wasm wrappers can instead include their static names.
  const ownMessage = Object.getOwnPropertyDescriptor(error, 'message');
  const ownName = Object.getOwnPropertyDescriptor(error, 'name');
  let message = typeof ownMessage?.value === 'string' ? ownMessage.value : '';
  let name = typeof ownName?.value === 'string' ? ownName.value : '';
  if (error instanceof DOMException) {
    message = Object.getOwnPropertyDescriptor(DOMException.prototype, 'message')!.get!.call(error);
    name = Object.getOwnPropertyDescriptor(DOMException.prototype, 'name')!.get!.call(error);
  }
  const status = /Failed Proof Server response:[^\n]*code="([45][0-9]{2})"/u.exec(message);
  if (status) return `local-proof-server-http-${status[1]}`;
  if (/ENOENT|Compact asset|Compact prov|Compact key|Compact generated|real-key/u.test(message)) return 'missing-or-mismatched-build-assets';
  if (/Transaction would exhaust the block limits/u.test(message)) return 'ledger-block-limit-rejection';
  if (/Slot namespace signer is not currently eligible/u.test(message)) return 'slot-authority-window-preflight';
  if (/Slot subject is not the exact active context account/u.test(message)) return 'slot-subject-preflight';
  if (/Private map (witness|sentinel|successor|key|append|replacement|mutation)/u.test(message)) return 'slot-private-map-preflight';
  if (/Slot account (substitutes|is not certified)/u.test(message)) return 'slot-account-status-preflight';
  if (/Slot signer authority does not match/u.test(message)) return 'slot-rule-preflight';
  if (/Slot record (does not match|authority\/parent)/u.test(message)) return 'slot-record-preflight';
  if (/Slot command substitutes or is stale against/u.test(message)) return 'slot-instance-state-preflight';
  if (/Slot command authority\/account-status root is stale/u.test(message)) return 'slot-root-preflight';
  if (/Slot command is not yet effective or its proof window expired/u.test(message)) return 'slot-time-preflight';
  if (/Invalid governance activation signature/u.test(message)) return 'signature-preflight';
  if (['AbortError', 'TimeoutError'].includes(name) ||
    /\b(?:TimeoutError|AbortError)\b|The operation was aborted due to timeout/u.test(message)) return 'local-request-timeout-or-abort';
  return undefined;
}

export function classifyLiveM6Failure(error: unknown): string {
  const visited = new Set<unknown>();
  for (let depth = 0; depth < 4 && !visited.has(error); depth++) {
    visited.add(error);
    try {
      const result = classifyFailureNode(error);
      if (result) return result;
      if (!(error instanceof Error)) break;
      const cause = Object.getOwnPropertyDescriptor(error, 'cause');
      if (!cause || !('value' in cause)) break;
      error = cause.value;
    } catch { break; }
  }
  return 'unclassified-private-error';
}
