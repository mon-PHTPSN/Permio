# Confirmed encrypted evidence delivery

Date: 2026-11-15. Branch: `feat/m10-encrypted-evidence`.
Committed baseline: `30f3f361b63b08492b37e9272a59ceb4151d05cd`.
User-approved sequence: preview/confirm -> local encryption -> signing ->
Midnight authorization receipt verification -> unchanged ciphertext delivery ->
recipient verification/decryption.

## Scope and ownership

Continue the prior agent-owned evidence-vault work already authorized in this
chat. Keep its uncommitted package/lockfile and approved bilingual specification
edits. Preserve other checkouts and the product-workflow branch. New behavior
lives in `src/delivery.ts`, its public export and `test/delivery.test.ts` within
`packages/evidence-vault`. Add the package test command to the root npm suite.
No ECS operations, live transactions, template activation, deployments, private
instruction publication or remote Git writes are part of this task.

## Implementation and proof

- An immutable local selection/scope/key snapshot produces the complete preview.
- Confirmation precedes actual encryption; returned previews and caller mutation
  cannot alter the snapshot.
- Real WebCrypto encryption and existing context-account signature generation
  bind the exact ciphertext manifest. A substituted signed payload is rejected.
- Mandatory authoritative receipt verification gates both channels and runs
  again immediately before each send. No receipt format or authorization rule
  is replaced.
- Receipt and ciphertext channels have separate stable IDs and acknowledgements.
  Retries preserve ciphertext bytes, do not repeat an acknowledged channel and
  do not repeat signing/admission.
- Withdrawal and expiry win after asynchronous preflight. Already transmitted
  data cannot be recalled; late acknowledgements remain observable.
- Public boundaries allowlist fields and sanitize adapter error details.

Proof-first evidence: new delivery tests were written before production code.
`node --test packages/evidence-vault/test/delivery.test.ts` failed seven tests
with the explicit assertion `evidence delivery workflow is not implemented`.
After implementation those seven passed. An additional diagnostics-leak test
failed because unfiltered signer extras reached the authorization adapter;
projecting the four signed-intent fields fixed it. Additional async/HTTP tests
characterize the real workflow boundaries. A subsequent proof-adapter test
failed because the authorization request omitted the private manifest opening;
providing an isolated metadata copy fixed it without sending evidence bytes.

Final focused result: all 18 package tests passed, zero failed or skipped.
Tests execute real WebCrypto, real context-account Ed25519 signatures, the real
Mera SDK with a software authenticator, and two separate loopback HTTP paths.
The HTTP receiver records a ciphertext, returns an error, receives byte-identical
retry data with the same identifier, and its received bundle decrypts locally.
External bridge authorization/finality and current-revocation results are
explicit fixtures, never live contract acceptance.

## Verification

- Focused package: 18/18 tests passed.
- Full root suite: 603 Node tests plus 44 Solidity/EVM tests, 647 passed in total,
  zero failures or skipped tests.
- Focused and project-wide TypeScript checks passed.
- Documentation generation check and Git whitespace checks passed.
- Independent full local code review completed: seven review lenses, zero
  actionable findings, verdict `Ready to merge` for this local library slice.
  Receipt run: `20261115-014058-a5e3ee8c`. No external peer service was used.

The verification JSON records the exact boundary distinctions. No linter is
configured. A sandbox denial of localhost connections was reproduced and the
HTTP tests were rerun with approved local network access; all passed.
The independent test review identified a namespace negative vector that failed
the format guard before reaching the encrypted binding. It now substitutes a
different valid namespace in both manifest and expectation and asserts the
encrypted-binding rejection. The final 18-test focused suite and scoped
typecheck were rerun successfully after this test-only refinement.

## Integration limits

The library exposes required signer, bridge-admission, current receipt-verifier
and independent channel adapters. It does not include a deployed bridge module,
an authenticated production evidence server, a browser disclosure UI or durable
outbox/restart recovery. The approved bridge policy, finalized source reader and
current credential/revocation integration must be configured before live use.
Recipient decryption continues to require the existing mandatory verifier.

Repository navigation: no Devin tools are exposed. The available index reports
the original checkout, stale since 2026-10-14, rather than this isolated branch;
exact current local source/tests were read. No current indexed analysis or
other checkout/index update is claimed.

Review retained one nonblocking coverage observation: independent negative tests
for receipt validity windows (future start, exact/elapsed end, malformed decimals
and expiry during verifier await). Existing guards were inspected; no defect was
established. This observation does not close any live integration gate.
