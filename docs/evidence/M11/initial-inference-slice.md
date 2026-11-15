# M11 initial authorized-inference slice

Baseline: `fa826b561c370b7ecc74af8602f2a9514dfb7204`.
Branch: `feat/m11-product-workflow`. Evidence date: 2026-11-14.
This is local implementation evidence, not M11/NI-01–NI-06 live acceptance.
No ledger transaction, ECS operation or real inference request was performed.

## Implemented boundary

The existing dashboard, account sessions, governance, allocations and Envio
history remain in place. A new Private inference page lists only the account's
allocated runs. Each context's candidate input identifiers come from a mandatory
server-owned `InferenceAuthorizationReader.readCurrent` integration. Browser
permissions, client `authorized` booleans and receipt JSON cannot provide it.
The integration is absent by default, so transmission is blocked.

The integration contract must check current M5 capability/session scope and the
applicable real M6 authorization, including exact context, recipient, purpose,
model/workload binding, selected source records, expiry and revocation. This
slice introduces no replacement receipt format or authorization protocol.
Reviewed mapping of the M6 recipient bytes to the NEAR workload is still pending.

The server selects input values; the browser submits identifiers only. A
session-bound, expiring preview shows the run, context, recipient, purpose,
model, selected values, linkage, plaintext path and retention. Consent, use and
withdrawal are distinct operations. Each invocation checks current authority
again, including after provider preflight, immediately before transmission.
Expired/revoked product sessions also block transmission. One preview permits
one invocation. There is no automatic conversation history, retrieval or tool
execution. AI answers confer no action authority.

Previews retain only selected plaintext plus an authority fingerprint in memory.
Used/revoked previews are removed. Expired previews are removed on access or
when another preview is prepared; idle expired entries may remain until then or
restart. No JavaScript-string zeroization is claimed. Prompts and answers are
not written to the application database or diagnostic logs. Provider errors are
sanitized rather than returning their request/response content.

## Provider and plaintext path

Pinned dependency: `@nearai/inference-sdk@0.3.0`, MIT, Node.js `>=24.22.1`.
Installed test runtime: Node.js `24.13.1`, npm `11.8.0`.
The provider import is lazy: ordinary dashboard use still works on that runtime;
configured inference on it reports `unsupported_runtime` and cannot send.
Server-only configuration names: `NEARAI_API_KEY`, `PERMIO_NEARAI_MODEL`.
Neither was configured in the isolated worktree; only configuration presence and
names were inspected, never credential values.

The concrete provider uses the official Node entry point and fixed Gateway
`https://cloud-api.near.ai/v1`, `e2ee: true`, TLS SPKI binding, and `UpToDate`
TCB policy for both gateway and model evidence. A fresh SDK client is created
for each invocation. `verify(model)` must return verified model evidence before
`beforeSend` rechecks authority and before Chat is sent. Incognito or missing
model evidence cannot substitute for this path. Response bytes are withheld
until `verifyResponse(id)` succeeds for the same completion. The exact
`gateway` versus `provider_tee` response signer is exposed: verified model
**deployment** evidence is distinct from a **model-signed response**. A gateway
signature is never labelled a model-response signature. Captured SDK response
records are cleared in `finally`.

Plaintext components: the user's browser and this ordinary Permio server process
the selected view. SDK-supported Chat fields are encrypted to the verified
model key; the ordinary application relay is outside the model's TEE guarantee.
TEE means hardware-isolated computation. No provider no-retention, factual
correctness, or trusted application-relay claim is made.

## Verification

Red before production changes: `node --test
packages/execution-dashboard/test/inference.test.ts` failed with authenticated
`GET /api/inference` returning **404 instead of 200**.

Final local commands on the baseline plus uncommitted M11 changes:

```text
npm run dashboard:typecheck                 PASS
npm run dashboard:test                      PASS: 50/50 (10 new M11 tests)
node --check packages/execution-dashboard/web/inference-ui.js  PASS
node --check packages/execution-dashboard/web/site.js          PASS
git diff --check                            PASS
npm ci --ignore-scripts --dry-run            PASS; expected SDK engine warning
```

Existing tests inspected/used unchanged: `application.test.ts`,
`context-client.test.ts`, `dashboard.test.ts`, `workspace.test.ts`.
New tests prove selected-input minimization, account/session isolation, explicit
consent, single use, current-authority changes, recipient/purpose/context
mismatch, expiry/revocation, withdrawal during preflight, current product-session
revocation during preflight, M10 pending denial, and forged client authorization
with zero provider calls. Failed/absent/unsupported required checks withhold the
answer. The pinned SDK's actual Ed25519 byte verifier accepts a synthetic signed
response and rejects altered bytes, missing/invalid signatures and a wrong
signer. This synthetic key test does not verify real hardware attestation.

Browser: isolated in-memory server on `127.0.0.1:4182`, two independently created
local test accounts with logout between them. Desktop 1265×720 and mobile
390×844 showed the provider, M5/M6, Dynamic, separate Midnight 1AM, separate
Monad EVM and M10 pending states. No horizontal overflow was observed. Reload
preserved the second account; the final browser error-log query was empty.
Screenshots were inspected through the browser tool. No browser live-inference
journey or authorized-send journey is claimed. Viewport was reset. The owned
server was stopped; its health endpoint was independently unreachable afterward.

Devin tools were unavailable. The local index MCP pointed to the original
worktree and reported stale; current assigned-worktree source/tests were read
directly. No other checkout/index was modified.

## Remaining gates and considered work not built

- A real current M5/M6 authorization reader and reviewed exact recipient/workload
  mapping: default denial is intentional, never a synthetic approval.
- Real NEAR account/key, explicit compatible Confidential TEE model, supported
  runtime, actual gateway/model/TLS/response verification and model feature
  evidence. A real model call was not possible with current configuration.
- Dynamic sandbox authentication, token lifecycle and server verification plus
  distinct tested 1AM Midnight and Monad EVM bindings. Existing local login is
  explicitly labelled local demo; it is not Dynamic completion.
- M10 bridge preview/delivery: scopes requiring evidence delivery fail pending.
  No competing vault cryptography or fabricated bridge receipt was built.
- Action execution, retrieval, tools and later turns: they require independent
  scoped permission and ordinary M5/M6/execution integration. Model text cannot
  invoke governance or grant capabilities in this slice.
- Generated positive/negative coverage and real inference/browser/authorization
  journeys for every required scenario family, including subsequent revocation
  denial, remain NI-06/M11/M12 acceptance work. All NI live gates remain open.

## Official provider/capability sources checked

- https://docs.near.ai/cloud/inference-sdk/javascript
- https://docs.near.ai/cloud/verification
- https://docs.near.ai/cloud/models
- https://github.com/nearai/inference-sdk (installed npm 0.3.0 source/types)
- https://www.dynamic.xyz/docs/auth/tokens.md
- https://www.dynamic.xyz/docs/react/wallets/using-wallets/midnight/using-midnight-wallets.md

Dynamic's official page documents `@dynamic-labs/midnight`,
`MidnightWalletConnectors`, 1am as an external wallet, its distinct unshielded,
shielded and DUST surfaces, and 1am ownership of custody/proving/signing through
the official Midnight DApp Connector API. Token documentation requires server
RS256/JWKS verification, environment issuer/expiry checks and `user:basic`
scope. These capabilities were verified in documentation only; exact installed
Dynamic SDK/connector/network versions and sandbox behavior are not established.

## Coordinator validation after latest baseline update

The worktree was created from `fa826b5` and then fast-forwarded to
`30f3f361b63b08492b37e9272a59ceb4151d05cd` after the concurrent M9
compatibility fix was committed. The local M11 implementation was preserved.
On 2026-11-14 the coordinator independently reran `npm run dashboard:test`
(50/50, zero skipped), `npm run dashboard:typecheck` and `git diff --check`;
all passed on the updated head. Changes remain uncommitted in
`feat/m11-product-workflow`.

The two isolated worktrees are attached to the current Codex chat. Separate
sidebar project registration could not be completed because the available app
tools provide project listing/organization but no local-project creation API.

## Approved sequence and concrete module names

On 2026-11-15 the user approved disclosure preview, local encryption, signing,
Midnight authorization, then ciphertext delivery. The shared bilingual workflow
specification records this order. The encrypted evidence vault's approved
sequence is tracked on its implementation branch; full delivery remains pending.

Private-inference UI labels and errors now name context permissions, Midnight
authorization and encrypted evidence delivery. Internal milestone/status IDs
remain implementation tracking only. No authorization or live-acceptance gate
was weakened by these wording changes.

Follow-up verification: dashboard tests pass 50/50 with zero skips; dashboard
type checking, JavaScript syntax, bilingual documentation checks and whitespace
checks pass. Two assertions were updated to expect the concrete module names.
