# M5 Development Log — Context Accounts and Scoped Sessions

Date completed: 2026-10-11  
Branch: `feat/m5-context-accounts`  
Implementation base: `9b76d6117cabf7211b5077c12357bdc6a3cd251e` (documented M4)

This log records the implementation work, exact authorization checks, negative
tests, rebase history, and chain-verification boundary for M5. It supplements
the binary exit gates in `acceptance.json`.

## Files and responsibilities

- `packages/context-accounts/src/model.ts` defines scenario instances,
  instance/context-bound accounts, capability scopes and grants, session
  grants, signed action intents, authorization decisions, and 19 precise
  denial reasons.
- `packages/context-accounts/src/action-intent.ts` implements the canonical
  Ed25519 payload, signing, and verification functions.
- `packages/context-accounts/src/system.ts` implements instance creation,
  account registration, root issuance, delegated attenuation, session
  issuance, action authorization, state advancement, and four revocation
  boundaries.
- `packages/context-accounts/src/errors.ts` exposes 14 stable error codes for
  command failures such as malformed input, unknown records, scope expansion,
  excessive delegation depth, invalid time, and unauthorized mutation.
- `packages/context-accounts/test/context-accounts.test.ts` contains 13 tests
  across M4 allocation/account boundaries, capability attenuation, and signed
  action authorization.

Before this log and root README update, the rebased M5 implementation diff
contained 2,469 added lines: 1,040 lines in the authorization system, 171 in
the model, 114 in action-intent cryptography, 940 in tests, and the remaining
lines in documentation, errors, exports, package metadata, lockfile
integration, and acceptance evidence.

## Instance creation consumes M4 exactly

`ContextAccountSystem` accepts only the two read methods it needs from M4:
`getInstantiationAuthorization` and `getTemplate`. `createScenarioInstance`
requires an unused M4 request ID, reloads the governed template record, and
requires that record to still be active at creation time. It reparses the M2
template, recomputes its SHA-256 hash, and compares namespace, template ID,
semantic version, and hash with the allocation.

The M4 allocation is consumed once. The instance records its allocator,
initial template state, creation/expiry times, and an explicit non-empty list
of capability issuers. Registration or login does not create a business role,
and principal kind does not imply authority. Human, service, contract, and
Agent principals all travel through the same explicit instance policy.

The test `does not consume an old allocation after template retirement`
exercises a deliberate race boundary: an allocation issued while the template
was active is insufficient if the M4 record has become retired before M5
creates the instance.

## Context accounts and key isolation

`registerContextAccount` verifies that the instance is active and the context
exists in its template. Each account is bound to one instance and one context.
Public keys are fingerprinted as SHA-256 over their SPKI DER representation.
The system rejects reuse of the same key across accounts, contexts, or session
keys, preventing one reusable key from becoming an accidental cross-context
identifier.

Account registration stores no global role and grants no action. Runtime
authority begins only when an explicitly named instance issuer calls
`issueRootCapability` for that account.

## Capability attenuation implemented

`CapabilityScope` constrains all of these dimensions:

- action IDs;
- resource selectors and concrete resources;
- purposes;
- recipient kinds and exact recipients;
- disclosure-policy IDs; and
- time and delegation depth stored beside the scope.

Scope arrays are normalized to sorted unique identifiers. Root issuance checks
the scope against the M2 template's actions, capability rules, recipients, and
disclosure policies. The grant window must fit inside the instance lifetime.
The maximum delegation depth is bounded to 16.

`delegateCapability` requires the current grant holder. Every child collection
must be a subset of its parent, and the child must be strictly narrower in at
least one scope or time dimension. It cannot start earlier, end later, increase
maximum delegation depth, or exceed the parent's remaining depth. Revocation
of any ancestor causes descendant authorization to return `GRANT_REVOKED`.

`issueSession` applies the same strict-subset rule between a capability and a
session. The session key must be a fresh Ed25519 public key, distinct from all
account and prior session keys. Its validity window must be contained by the
grant and cannot begin before issuance.

## Signed action intent

Action intents use domain `permio:action-intent:v1`, version 1, and Ed25519.
The signed, Unicode-NFC-normalized canonical JSON binds:

- namespace, template ID, semantic version, and exact template hash;
- instance, session, context, and action IDs;
- resource selector and concrete resource;
- purpose, recipient kind, and exact recipient;
- disclosure-policy ID;
- issued-at time; and
- session-scoped nonce.

As in M4, the domain and body are separately prefixed with four-byte big-endian
lengths and the signature is base64url encoded. A non-Ed25519 key is rejected.
Changing any bound field invalidates the signature or produces the precise
denial for that constrained dimension.

## Authorization pipeline and state update

`authorizeAction` evaluates checks in an explicit order and returns a typed
decision rather than throwing for ordinary denial. It verifies the session and
signature, exact template target, instance and context, instance/account/grant/
ancestor/session revocation, validity windows, session-scoped nonce replay,
action membership, current-state transition, resource, purpose, recipient,
and disclosure policy.

The 19 denial reasons are:

```text
UNKNOWN_SESSION, INVALID_SIGNATURE, TEMPLATE_MISMATCH, INSTANCE_MISMATCH,
INSTANCE_REVOKED, INSTANCE_EXPIRED, CONTEXT_MISMATCH, ACCOUNT_REVOKED,
GRANT_REVOKED, SESSION_REVOKED, NOT_YET_VALID, EXPIRED, ACTION_DENIED,
STATE_DENIED, RESOURCE_DENIED, PURPOSE_DENIED, RECIPIENT_DENIED,
DISCLOSURE_POLICY_DENIED, REPLAYED_INTENT
```

Only after all checks pass does the system update the instance to the
template-defined next state and consume the `(sessionId, nonce)` pair. The
success record includes previous and next state, the account/grant/session
chain, action, instance, and authorization time.

## Revocation boundaries

- A capability can be revoked only by its recorded issuer.
- A session can be revoked only by its context account.
- An account can revoke itself through the authenticated caller boundary.
- An instance can be revoked only by the allocator recorded from M4.

All revocations are prospective and reject timestamps before the corresponding
creation or issuance event. Stored history is retained; later authorization
reports which boundary blocked the action. Caller IDs are assumed to come from
an authenticated application boundary, but login state itself is never used as
domain authority.

## Negative cases implemented

The 13 tests cover missing or stale M4 allocation, template/hash mismatch,
retirement before instance creation, all supported principal kinds without
global roles, context/account key reuse, unauthorized capability issuance,
unbounded or expanding delegation, every individual scope expansion,
delegation-depth overflow, non-fresh or over-broad sessions, ancestor
revocation, exact success-state transition, mutation of every signed intent
field, precise single-dimension denials, validity windows, nonce replay, and
instance/account/grant/session revocation.

## Rebase and integration work

M5 was first implemented as `aae60aec27dda9f40ec179d7410bd9bfddd3a291`
above the pre-M3 M4 commit. After M4 was rebased onto M3, only that M5 commit
was replayed with `git rebase --onto`; replaying the old M4 commit was avoided.
The root `package.json` conflict was resolved by keeping generator, governance,
context-account, and Hardhat tests in dependency order. `package-lock.json`
retained all three new workspaces.

After the M4 development log was added, M5 was rebased a second time from
`c52e65807b2fbcfc8093a5d8e95911ae8e4c3251` onto the documented M4 commit
`9b76d6117cabf7211b5077c12357bdc6a3cd251e`. This second rebase applied without
conflicts because the M4 change was documentation-only.

`npm install` added the inherited M3 workspace link and reported zero
vulnerabilities. The M5 lockfile now contains links and package records for
`@permio/scenario-generator`, `@permio/scenario-governance`, and
`@permio/context-accounts`.

## Verification actually executed

The full command was:

```bash
npm run check
```

Observed passing results after integration:

- generated-document freshness checks;
- TypeScript type checking;
- Solidity 0.8.31 / Hardhat 3 build targeting `osaka`;
- 6 protocol tests;
- 15 scenario-domain tests;
- 14 scenario-generator tests;
- 16 scenario-governance tests;
- 13 context-account tests; and
- 6 deployed-contract tests on Hardhat's local EVM.

The on-chain regression suite deploys `RecipientBoundAttestationRegistry` and
tests registration, exact EIP-712 binding, substitution rejection, replay
prevention, verifier authorization, and revocation. No chain-facing M5 logic
was added, so this run establishes non-regression at the existing Monad
boundary rather than claiming context accounts are enforced on-chain.

## Boundaries and next work

M5 remains an in-memory domain component. It does not persist state, authenticate
transport callers, generate a Midnight proof, publish a decision receipt,
execute a Monad action, or hide its in-process objects with zero knowledge.
The key material used by tests is synthetic; production private keys must stay
outside this package.

M6 must move authorization evidence and witness values into the
caller-controlled Midnight proof boundary and verify the generic decision
against the exact M2/M4/M5 target without publishing private context data.
