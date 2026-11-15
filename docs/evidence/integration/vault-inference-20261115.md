# Evidence vault and private inference integration

Date: 2026-11-15. This record covers source integration and local regression
verification. It does not close the modules' remaining live acceptance gates.

## Source and compatibility

- Product mainline baseline: `09c19f689c10de646ce86845bbd006243063a280`.
- Encrypted evidence vault source: the three commits ending at
  `f5022605806aba527d20273434232f51bfd5c0f1`.
- Private inference source: the previously uncommitted implementation on
  `30f3f361b63b08492b37e9272a59ceb4151d05cd`. Its tracked source snapshot has
  SHA-256 `9c54c1e13b582f28bfa59cc92b9cce85d62e08d8676ba3d3d35f91d7692d189e`;
  its five untracked source/evidence files were copied and verified separately.
- The dashboard retains the programmable context library, template validation,
  context creation hooks, instance routes and navigation guards. Private
  inference adds its own navigation entry and retains its route after reload.
- Server conflict resolution retains both template validation errors and the
  inference workflow/provider imports. The authorization receipt reader retains
  the explicit legacy, business and activation layouts and bridge source entry.
- npm regenerated the combined workspace lockfile. Dependency pins remain
  `@category-labs/mera@0.2.0` and `@nearai/inference-sdk@0.3.0`.

## Local verification

Runtime: Node.js `24.13.1`, npm `11.8.0`, Windows.

Documentation generation checks, Solidity build, root TypeScript checking,
browser JavaScript syntax and `git diff --check` passed. Existing regression
suites cover the combined modules; eight focused regressions were added for
the timeout and asynchronous interface defects identified during review.

The first `npm run check` process completed documentation/build/type checking
and the seven package suites below, but was interrupted during authorization
testing before a whole-command result was recorded. The remaining gates were
then run to completion with durable exit-code records. Authorization used
`node --test --test-concurrency=2 test/*.test.ts` in its package directory;
concurrency changed scheduling only. All other resumed suites used their root
npm scripts.

| Suite | Passed | Skipped |
| --- | ---: | ---: |
| Diagnostic scripts | 154 | 0 |
| Protocol | 6 | 0 |
| Scenario domain | 25 | 0 |
| Scenario generator | 14 | 0 |
| Scenario governance | 16 | 0 |
| Context accounts | 51 | 0 |
| Scenario packs | 52 | 1 |
| Midnight authorization contracts | 294 | 0 |
| Encrypted evidence vault | 31 | 0 |
| Receipt gateway | 66 | 0 |
| Execution contracts | 44 | 0 |
| Dashboard and private inference | 66 | 0 |

Total: **819 passed, zero failed, one existing Windows-only skip**. The skipped
case exercises parent-directory fsync failure/retry on POSIX. It is not a live
authorization or provider acceptance test.

Browser verification used a separate loopback server, an in-memory database,
an empty provider configuration and a disposable local account. The context
library and private inference pages rendered at desktop and 390x844 mobile
sizes; the inference route survived reload, document width did not overflow,
and the browser error log was empty. The temporary tab and server were closed
and its health endpoint was independently confirmed unavailable afterward.
Existing application data was not changed.

## Review fixes

`ce-code-review` run `20261115-141128-5c501a7c` completed eight review passes
and independently confirmed three P2 findings against the captured integration
tree. All three were applied inline by the integrator and verified below;
the review did not independently rerun the fixes. No actionable finding remains
unapplied. A suggested future HTTP happy-path test across an allocated general
library template and multiple contexts remains a coverage improvement, rather
than an established defect or a live acceptance result.

- Vault authorization resolution and bridge verification now each have a
  configurable 15-second deadline. A sanitized `504 AUTHORIZATION_TIMEOUT`
  ends the HTTP wait; late success cannot write or return evidence. The
  provider's underlying read-only watch is not cancelled by this wrapper.
- Each rendered inference page has a unique lifetime, so callbacks from an
  earlier visit cannot regain access after navigating away and back.
- Disclosure preview requests and subsequent consent/revocation/run callbacks
  are bound to that preview revision. Changed input selection invalidates the
  previous preview. Delayed responses cannot enable a newer unconsented send,
  overwrite its preview or clear it with an older answer.
- All eight new regressions were observed failing against the original
  implementation before the fixes and passing afterward. The complete vault
  suite (31 tests), dashboard suite (66 tests), root typecheck, documentation
  check and browser-script syntax checks passed after the fixes.

## Remaining live boundaries

The imported private inference service still requires a real current
authorization reader, reviewed recipient/workload mapping, supported runtime,
provider configuration and live verification evidence. SDK 0.3.0 requires
Node.js `>=24.22.1`; the installed runtime is intentionally rejected for live
inference. Encrypted evidence delivery into inference, Dynamic authentication
and the distinct Midnight/Monad wallet bindings remain pending as documented
in the original implementation evidence. No live inference, ledger transaction,
new deployment, privacy downgrade or replacement receipt format was introduced
by this integration.
