# M4 Development Log — Template Governance

Date completed: 2026-10-10  
Rebased onto M3: 2026-10-11  
Branch: `feat/m4-template-governance`  
Implementation base: `38227d45c7a2f409ebeb0a0d1be0bec877cdaecc` (M3)

This log records the concrete implementation and verification work for M4. The
machine-readable exit gates remain in `acceptance.json`; this file explains
what was built, the decisions encoded in the source, and what is deliberately
not claimed.

## Files and responsibilities

- `packages/scenario-governance/src/model.ts` defines the five authority
  groups, namespace policy, exact template target, six lifecycle states,
  validation reports, signed reviewer attestations, and immutable activation,
  retirement, revocation, and instantiation records.
- `packages/scenario-governance/src/attestation.ts` implements Ed25519 signing
  and verification for reviewer decisions.
- `packages/scenario-governance/src/registry.ts` implements policy validation,
  state transitions, review thresholds, termination, and allocation.
- `packages/scenario-governance/src/errors.ts` exposes stable failure codes so
  callers and negative tests do not depend on prose messages.
- `packages/scenario-governance/test/scenario-governance.test.ts` contains 16
  tests grouped around namespace authority, lifecycle, review/activation, and
  immutable allocation history.

Before this log was added, the rebased implementation diff contained 1,924
added lines: 748 lines in the registry, 121 in the model, 96 in attestation
handling, 769 in tests, and the remaining lines in documentation, exports,
package metadata, errors, lockfile integration, and acceptance evidence.

## Governance model implemented

`NamespacePolicy` contains separate collections for authors, reviewers,
governance authorities, allocators, and emergency revokers. Policy construction
rejects a principal that appears in more than one authority collection. It also
rejects duplicate reviewer IDs, duplicate reviewer public keys, an impossible
review threshold, malformed identifiers, and empty authority collections.
There is no fallback administrator or implicit owner path.

The lifecycle implemented by `ScenarioGovernanceRegistry` is:

```text
draft -> validated -> in_review -> active -> retired
                                    |          |
                                    +-> revoked<+
```

The concrete commands are `createDraft`, `recordValidation`,
`submitForReview`, `submitReview`, `activate`, `retire`, `revoke`, and
`authorizeInstantiation`. Each command checks its required actor set and
current state. Times must be non-negative safe integers and monotonic within a
template lifecycle. Retirement and revocation cannot be backdated before an
already-issued instantiation authorization.

`createDraft` calls M2's `parseScenarioTemplate` and
`hashScenarioTemplate`; governance therefore stores the validated template and
the exact M2 SHA-256 content hash. The lineage key is namespace, template ID,
and semantic version. Reusing that version is rejected, including an attempt
to replace it with different content.

`recordValidation` always writes `grantsTrust: false` itself. A caller can
submit structural and risk findings, but cannot turn validation into approval,
activation, or allocator authority. Only the draft author can record validation
and advance the record into review.

## Exact review binding

Reviewer attestations use domain `permio:scenario-review:v1`, version 1, and
Ed25519. The signed canonical JSON binds all of these fields:

- namespace;
- template ID;
- semantic version;
- exact template hash;
- reviewer ID;
- approve/reject decision; and
- review timestamp.

The domain and JSON body are independently prefixed with four-byte big-endian
lengths before signing. Text identifiers are normalized to Unicode NFC. The
signature is encoded as base64url. Verification rejects a different domain,
algorithm, version, public key, signature, or any altered payload field.

The registry accepts at most one decision per eligible reviewer for a target.
Activation rejects duplicate decisions, ineligible reviewers, invalid
signatures, any recorded rejection, approvals below the namespace threshold,
and a governance actor who is not in the separate governance-authority set.
The activation record snapshots the sorted approving reviewer IDs and the
threshold used at activation time.

## History and prospective termination

Activation, retirement, revocation, and instantiation authorizations are kept
in separate maps and returned as structured clones. Callers cannot mutate the
registry through returned objects. An active version remains addressable by
its exact namespace, template ID, version, and hash.

Retirement changes the current lifecycle state and blocks every later
instantiation request, but leaves prior activation and allocation records
unchanged. Emergency revocation can target an active or already-retired
version, records `behavior: "prospective"`, requires a non-empty reason, and
also blocks new allocations without rewriting prior records.

`authorizeInstantiation` requires an eligible allocator, an unused request ID,
an exact target match, and the `active` state. It returns the exact target and
authorization time that M5 consumes; draft, validated, in-review, retired, and
revoked records cannot produce a new authorization.

## Negative cases implemented

The tests exercise unauthorized authors, overlapping authority sets, Agents
attempting to gain authority through authorship, same-version content
replacement, invalid transitions, validation that does not grant trust,
altered hashes and other signed fields, ineligible reviewers, duplicate
reviews, insufficient thresholds, reviewer rejection, allocator/governance
privilege collapse, allocation before activation, retired and revoked
templates, backdated termination, and attempted mutation of returned records.

## Rebase and integration work

M4 was originally implemented directly above M2 as commit
`b6ca68734fac71c13d50f1878d6d0e6900c663ab`. On 2026-10-11 it was rebased
onto M3. The rebase produced two expected conflicts:

- `package.json`: the root test command separately added M3 generator tests and
  M4 governance tests. The resolution runs both before Hardhat tests.
- `package-lock.json`: both milestones added a workspace link and package
  record. The resolution retains `@permio/scenario-generator` and
  `@permio/scenario-governance`.

No source-level governance conflict occurred. `npm install` initially failed
inside the Windows sandbox with `EPERM` while creating the local M3 workspace
symlink; the same install succeeded with the required filesystem permission,
adding one local workspace package and reporting zero vulnerabilities.

## Verification actually executed

The full command was:

```bash
npm run check
```

Observed passing results after the M3 rebase:

- generated-document freshness checks for all three generated reading files;
- TypeScript type checking;
- Hardhat Solidity build;
- 6 protocol tests;
- 15 scenario-domain tests;
- 14 scenario-generator tests;
- 16 scenario-governance tests; and
- 6 deployed-contract integration tests on Hardhat's local EVM.

The Hardhat tests deployed and exercised `RecipientBoundAttestationRegistry`,
including relayed registration, exact EIP-712 type binding, recipient
substitution rejection, scoped-entitlement replay rejection, unauthorized
verifier rejection, and verifier revocation.

## Boundaries and remaining work

M4 is an application-neutral, in-memory governance domain package. It does not
persist governance state, publish governance events on a public chain, verify a
Midnight proof, create scenario instances, or authorize runtime actions. The
Hardhat run proves that the existing Monad-facing registry still works after
M4 integration; it does not claim that M4 governance itself is on-chain.

M5 consumes the exact active allocation produced here. M6 is responsible for
the first generic Midnight proof-enforcement boundary.
