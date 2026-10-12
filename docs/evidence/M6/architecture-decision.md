# M6 Architecture Decision Record

Date approved: 2026-10-11<br>
Status: approved architecture; governance, admission, credential-status, and lifecycle slices implemented and live-tested; the approved depth-16 ancestry witness failed its pinned-toolchain feasibility gate and requires a new user decision<br>
Applies to: M6 Midnight authorization, M7 receipt transport, and the M8 receipt consumer boundary

This record captures the decisions approved before M6 implementation. It is
not final M6 acceptance evidence. Concrete implementation and live-chain
results are recorded in `development-log.md`; runtime authorization,
credential-status roots, common receipts, and privacy scanning remain
incomplete.

## Decision 1: admit an exact M4 activation through a Midnight envelope

M4 remains the authority that validates Ed25519 reviewer attestations,
eligible unique reviewers, namespace thresholds, rejection state, and
separation of duties. M6 does not repeat those checks with a second reviewer
key system and does not claim that Midnight independently verified each M4
review signature.

After M4 creates an immutable activation record, an adapter canonicalizes an
admission envelope containing:

```text
envelopeVersion
namespaceHash + templateIdHash + semanticVersion + templateContentHash
governancePolicyHash + proofModuleBindingsHash
proofModuleBindingRoot + proofModuleBindingCount
proofModuleRegistrySequence + stagingExpiresAt
m4ActivationRecordHash + approvalEvidenceCommitment
authorityRootVersion + authorityRootSequence
targetNetworkId + targetContractIdentity + registryProtocolVersion
admissionNonce
```

The existing namespace-scoped `governance-activator` authority signs that
exact envelope with the allowlisted `midnight-jubjub-schnorr-v1` profile. The
Midnight admission circuit proves that the signing key is currently eligible
under the exact namespace-authority root, verifies the signature, consumes the
nonce, and writes only the exact template version and hash carried by the
envelope. Altering any bound field, using an ineligible key, changing the
signature profile, or replaying the nonce fails.

This key is an admission credential for the already-separated M4 governance
boundary. It is not a universal administrator and cannot create reviewer
approvals, lower thresholds, allocate instances, issue capabilities, retire or
revoke templates, activate proof modules, or rewrite an existing registry
record. Retirement and emergency revocation continue through their own
separately scoped authorities.

M4 reviewer attestations remain `ed25519` in the first implementation. The M4
payload and envelope schemas identify exact versioned, allowlisted signature
profiles so a future chain adapter can use a different admission profile
without invalidating historical M4 attestations. Direct on-chain verification
of every Ed25519 reviewer signature is not part of M6 v1; adding it requires a
separately approved Compact/ledger upgrade and protocol revision.

## Decision 2: use a hybrid state representation

M6 will not publish all M4/M5 data and will not hide unrelated facts behind one
global root.

- Exact template identity, content hash, governance-policy hash, lifecycle,
  proof-module bindings, activation sequence, and prospective retirement or
  revocation are direct public Midnight records.
- Namespace authority keys are represented by a versioned Merkle root whose
  leaves bind one namespace, policy version, authority kind, key hash, and
  validity window.
- M4 reviewer decisions remain in the off-chain governance evidence committed
  by the activation envelope. Instance allocations, capability grants,
  sessions, and action intents are private signed assertions verified inside
  runtime proofs.
- Context-account, capability, and session status uses a keyed current-status
  Merkle tree. Every credential commitment has exactly one current `active` or
  `revoked` leaf. M6 proves membership of `active` under the exact current root
  and sequence; it does not attempt an unspecified non-membership proof.
- The baseline has no separate instance-authority root. Allocator and
  capability-issuer eligibility is checked against the namespace authority
  root and committed into private instance state.
- Private instance state is represented publicly by an instance commitment,
  current state commitment, and transition sequence. Scoped nullifiers record
  one-use action consumption.

Root updates are verified transitions, not trusted snapshots. An authority-root
update binds the old and new roots, policy version, effective sequence, and
separately authorized governance decision. A credential-status update proves
the old leaf and path, verifies the issuer or revoker, computes the replacement
leaf, and derives the new root before the ledger advances its root sequence.

This split keeps shared governance facts auditable while preventing personal
permissions, private state labels, records, claims, and evidence from becoming
publicly enumerable.

## Decision 3: use extensible, allowlisted proof modules

A template is data. It may pin and configure one exact active proof-module
version and implementation hash, but it cannot define executable proof logic,
select `latest`, substitute an implementation, or deploy an unapproved circuit.

The initial reusable runtime module families are:

- `delegated-capability-action-v1`; and
- `private-state-transition-v1`.

Template admission is handled by the separate versioned
`admit-m4-activation-v1` registry circuit described in Decision 1. It is not a
template-selectable proof module, and it does not reinterpret M4 review
evidence.

The initial physical deployment is one versioned Compact authorization contract
containing the registries, root/state ledgers, common receipt logic, the
activation-admission circuit, and the two initial runtime module entry points.
`implementationReference` binds the exact
contract address, contract version, circuit entry-point name, and implementation
hash. Future proof families use a new versioned contract deployment and module
record; no template code is dynamically loaded, and existing bindings do not
move.

The module validates configuration against its approved configuration schema.
Unknown fields, unsupported values, and missing proof semantics fail closed.
When no active module implements a required claim, template activation returns
`UNSUPPORTED_PROOF_REQUIREMENT`.

Adding a proof family is a protocol upgrade. It requires a frozen protocol
specification, exact source and compiled hashes, schema and toolchain hashes,
negative tests, real local-chain tests, independent human security/privacy
review, high-threshold protocol-governance approval, separate activation, and
prospective emergency revocation. Agents may implement and test modules but do
not count toward the human approval threshold and cannot activate them.

Module lifecycle is:

```text
proposed -> reviewed -> approved -> active -> deprecated
                                      |
                                      +-> revoked
```

Deprecation follows the compatibility policy approved with the exact module.
Revocation rejects new proofs prospectively. Neither rewrites history, and a
new module version never silently migrates an active template.

## Decision 4: M6 owns authorization-state ordering

For a template-declared state transition, a single Midnight transaction will:

1. verify the exact active template and module;
2. verify current authority and credential-status root sequences;
3. verify the private allocation, capability chain, session, action intent, and
   selected evidence;
4. match the current public state commitment and transition sequence;
5. prove the deterministic next authorization state;
6. reject an already-used scoped nullifier; and
7. atomically consume the nullifier, install the next-state commitment,
   increment the sequence, and emit the common receipt.

Only one transaction can consume a given commitment and sequence. Preventing
wasted competing proof computation is not an initial correctness requirement;
proof time and contention will be measured during real-chain tests before any
coordination mechanism is proposed.

For an action with no declared state transition, M6 performs the same private
authorization checks, consumes a nullifier only when the action is single-use,
and emits a receipt without changing the state commitment or sequence.

M6 owns the ordering of privacy-authorization state. M8 or the target
application separately owns downstream execution success or failure. A failed
Monad execution does not rewrite a valid Midnight authorization result.

## Decision 5: stage variable-length action bindings before atomic activation

M2 templates retain a variable-length action list. M6 does not impose a fixed
maximum action count merely to fit one Compact circuit invocation, and it does
not trust an aggregate binding hash without validating its leaves.

The governance-signed activation envelope therefore commits both the canonical
SHA-256 binding-manifest hash and a depth-20 Compact Merkle root, together with
the exact binding count, proof-module-registry sequence, and staging deadline.
The admission lifecycle is:

```text
begin exact signed session
  -> stage complete binding at index 0
  -> stage complete binding at index 1
  -> ...
  -> atomically finalize the whole template
```

An action is never split. Each staging transaction verifies one complete
indexed binding and its Merkle path, requires the exact registered module to be
active, and advances a sequential next-index counter. Sequential staging
rejects missing, duplicate, and out-of-order indexes without an unbounded
bitmap. The session stores a constant-size rolling accumulator; the active
record retains the signed root, count, manifest hash, module-registry sequence,
and final accumulator.

Beginning or staging never makes a template allocatable. Finalization rechecks
the exact envelope, current governance authority, registry sequence, unused
nonce, and complete binding count, then creates the active record in one state
transition. Any module-registry sequence change invalidates the pending
session, including a prospective module revocation before finalization.

The signed deadline uses protocol-enforced block time. Expired or stale
sessions are removed automatically when touched by begin, stage, or finalize.
Cleanup releases temporary nonce reservation but cannot erase a consumed
nonce, active template, lifecycle history, or receipt. Protocol correctness
does not depend on a keeper or privileged maintenance actor.

## Decision 6: add narrow root, retirement, and Midnight runtime-key roles

The namespace authority root is changed only by a threshold of unique eligible
`authority-root-governor` leaves. The threshold is itself stored in the current
root record, must be at least two, and is carried into the signed old-root to
new-root command together with both root versions and sequences. Neither the
governance activator nor any single governor can rotate the root.

Normal template retirement uses a separate `template-retirer` leaf. Emergency
template revocation continues to use the existing emergency-revocation role.
Retirement blocks new allocations prospectively; revocation blocks new use
prospectively. Both retain the original activation record, sequence, timestamp,
and exact content hash. Root governance, template retirement, and emergency
revocation are not interchangeable privileges.

M5 Ed25519 identities and `ActionIntent` signatures remain unchanged. Each M6
principal or session instead receives a separately profiled
`midnight-jubjub-schnorr-v1` runtime key binding that commits to the exact M5
identity/capability/session chain, instance, context, validity window, and key.
The M6 proof must verify the existing M5 chain and current credential status
before accepting the runtime Schnorr signature. The additional key is a
chain-specific authorization credential, not a replacement identity and not a
universal administrator. This preserves application-neutral M5 portability if
a later deployment uses a chain other than Midnight.

## Implementation boundary found on 2026-10-12

After adding the accepted authority-root and template lifecycle circuits, the
pre-consolidation single-contract build contained fourteen exported transaction
circuits. The pinned Local Dev node rejected the resulting 36,225-byte deployment transaction
before contract creation with `1010: Invalid Transaction: Transaction would
exhaust the block limits`. The node, indexer, and proof server were all healthy,
and the same stack had previously deployed the ten-circuit contract.

This conflicts with Decision 3's initial single-contract physical deployment,
and the remaining runtime modules would enlarge that deployment further. No
architecture has been changed in response. The viable directions are to
consolidate transaction circuits while preserving one contract and the same
authority model, or to approve a multi-contract boundary with an explicit
cross-contract trust and atomicity design. Official Compact 0.35 release notes
state that cross-contract calls arrived with the ledger-9 toolchain line, while
current Mainnet contracts should remain on 0.31.x; the pinned ledger-8/0.31.1
stack therefore cannot be assumed to provide the native composition needed by
that split. Raising only the local node limit is not acceptance evidence for a
deployment intended to respect network limits.

The reasons, migration decisions, compatibility gates, and required real-chain
tests for a later ledger-9 evaluation are recorded in
`future-ledger9-upgrade.md`. That record is a future candidate, not authority to
upgrade the current M6 baseline.

The first approved mitigation combines first and subsequent root approvals into
one `submitAuthorityRootApproval` circuit. Compact 0.31.1 recompiles that source
as thirteen provable circuits. The two governors still sign and submit separate
transactions; only the duplicated verifier entry point is removed. The new
deployment transaction fell from 36,225 to 33,809 bytes but was still rejected
with the same block-limit error. Public node constants allow normal extrinsics
up to 786,432 bytes, so transaction length is not the limiting dimension; the
remaining failure was execution weight. This mitigation alone was insufficient.

The user then approved consolidating the two remaining equivalent lifecycle
pairs. `terminateProofModule` selects deprecation authority kind 8 only for
`active -> deprecated`, and emergency authority kind 10 only for
`active|deprecated -> revoked`. `terminateTemplate` similarly selects retirer
kind 12 only for `active -> retired`, and emergency kind 5 only for
`active|retired -> revoked`. The signed target status determines the branch;
each branch retains its original source-status and authority checks.

That build contains eleven provable circuits and deployed successfully on the
same unmodified ledger-8 Local Dev stack. The complete live run finalized both
root approvals, module deprecation/revocation, template retirement/revocation,
and all associated privilege-collapse rejections. The deployment-weight
boundary is resolved for the implemented governance slice, but remaining
runtime circuits must still be measured promptly as they are added.

The required measurement was repeated as soon as the generic
`updateRuntimeCredentialStatus` circuit was added. Compact 0.31.1 compiled the
twelve-circuit contract and all simulator tests passed, but the same unmodified
Local Dev node rejected its 31,837-byte deployment transaction with RPC 1010
before contract creation. This means the current single-contract ledger-8
architecture has not demonstrated capacity for one required runtime-state
circuit, before either of the two required runtime proof entry points is added.
No alternative architecture has been adopted. Further entry-point
consolidation, a multi-contract boundary, or activation of the documented
ledger-9 investigation requires a user decision.

The user approved further same-contract consolidation. Module approval,
activation, deprecation, and emergency revocation now share one
`governProofModule` dispatcher. The signed target state selects the branch;
each branch retains its original authority kind, source-state rules, threshold,
unique-approval check, and nonce protection. The standalone staging cleanup
circuit was removed because the existing begin, stage, and finalize entries
now remove only expired or stale sessions automatically. The resulting nine
transaction circuits compiled with Compact 0.31.1 and deployed on the unchanged
ledger-8 stack at
`131ed4886a6419a949728289de8c67e176fddfb15f7bf2d058c12812de2627d7`.
The live run completed credential-status activation and revocation plus the
full governance/admission regression. No local limit or trust rule changed.

Implementation then reached a different runtime representation boundary. M5
permits capability chains through depth 16. The current runtime capability
credential binds its immediate parent, but a terminal-action proof must also
establish that every ancestor remains active under the exact current
credential-status root. Checking only the terminal leaf would fail prospective
ancestor revocation; silently reducing M5's supported depth would change the
product contract. The choice between a fixed maximum-depth witness, a new
revocation-accumulator/epoch representation, or an explicitly narrower first
protocol version therefore required user approval before runtime-circuit code
continued.

The user approved the first option: preserve M5's complete depth-16 semantics
with a fixed-size private witness and use real compilation plus Local Dev
deployment as the immediate feasibility gate. A temporary, non-mutating probe
was added to the existing nine-circuit contract rather than compiled as an
isolated toy. It carried 17 fixed entries (one root plus 16 delegated
credentials), contiguous private presence markers, exact parent and issuer
bindings, one Schnorr issuance signature and depth-20 current-status proof per
present capability, exact time/depth attenuation, the current authority and
credential-status root sequences, and an active terminal-account proof. It
returned only a constant `true` and wrote no ledger state, so the private chain
length was not a public output.

Compact 0.31.1 accepted the source, type rules, bounded vector iteration, and
privacy analysis and announced ten transaction circuits. The generated probe
intermediate was 483,918 bytes of ZKIR and 44,311 bytes of binary ZKIR, compared
with 206,700 bytes of ZKIR for the existing `governProofModule` dispatcher.
During proving-key generation, `zkir compile-many` accumulated 13 minutes 45
seconds of CPU time, then stopped accruing CPU time for more than eleven
additional wall-clock minutes. The process had 26 threads and its main thread
reported `futex_do_wait`. Both probe key files remained at zero bytes. A final
snapshot at 24 minutes 57 seconds showed the same CPU time, wait state, and
empty files. The process was interrupted only after that stable no-progress
interval.

This was not recorded as a successful compile, deployment failure, or ledger
limit result. The temporary probe source was removed and the original
nine-circuit contract was recompiled successfully on the same machine and
toolchain; that restoration used multiple cores productively and completed in
about five minutes. The baseline generated bindings and keys are therefore
known-good again, and no probe artifact remains.

The exact approved option has failed its first feasibility gate before Local
Dev deployment and before adding session and intent signatures, seven scope
membership checks, allocation evidence, action nullifier/state ordering, or
the common receipt. Continuing by adopting a lineage accumulator, lowering the
delegation depth, raising local limits, omitting ancestor checks, or splitting
the contract would change an approved architecture or product guarantee.
Those alternatives require a new user decision; M6 remains incomplete.

## Common receipt and gateway consequence

Every module emits the same versioned `DecisionReceipt` envelope containing the
exact module and template references, instance and optional state-transition
commitments, action and purpose hashes, exact recipient, validity window,
scoped nullifier, output commitment, and source reference. Module-specific
output is represented only by `outputCommitment`.

M7 is therefore a finalized-source observer and byte-exact transport signer.
It verifies source, allowlists, versions, field encoding, and finality. It does
not re-evaluate private policy, interpret module-specific output, or widen a
receipt.

## Development reference and reusable Midnight resources

The sibling `../information-flow` checkout is a reference implementation for
Midnight integration mechanics only. M6 may study and deliberately adapt its
Compact compilation workflow, compiler-managed artifact handling, resumable
wallet synchronization, `waitForSyncedState()` lifecycle, deployment and
public-address reconnect flow, proof-server configuration, public-only test
evidence, and secret-redaction boundary.

`information-flow` is not a Permio package dependency, protocol source, or
scenario template. M6 must not copy its application model, actor workflow,
contract state schema, authority layout, database, deployed addresses, private
wallet state, named fixtures, or acceptance claims. Permio's Compact contract,
canonical encodings, registry state, circuits, tests, and evidence are derived
from this decision record and Permio's own M2-M5 interfaces.

The workspace already contains three resumable, synchronized disposable
Preprod HD-account checkpoints for the `information-flow` test fixtures named
Alice, Bob, and Clara under the ignored
`../information-flow/data/preprod-wallet-state/` directory. Their secrets stay
in that repository's ignored environment file. Permio may reuse those wallet
capabilities for opt-in Preprod smoke tests through an explicit adapter so the
expensive historical synchronization is not repeated. It must not copy the
mnemonic, private wallet state, or actor names into tracked Permio artifacts;
Permio tests map them to generated roles.

The sibling `../midnight-local-dev` checkout provides the pinned local ledger-8
stack, including the local proof server at `http://127.0.0.1:6300`
(`proof-server:8.1.0`), node at `http://127.0.0.1:9944`, and indexer at
`http://127.0.0.1:8088/api/v4/graphql`. Local Dev remains the mandatory M6
acceptance target. The synchronized Preprod accounts are a reusable secondary
fixture, not a substitute for the required local deployment, proof,
transaction, indexed-state, restart, and reconnect tests.

## Documentation changed with this decision

- `README.md` summarizes the approved M6 boundary.
- `docs/PERMIO_FROM_NEED_TO_DESIGN.md` explains the design in user-facing
  language.
- `docs/PROGRAMMABLE_CONTEXT_ARCHITECTURE.md` is the authoritative architecture
  contract for state placement, module governance, stateful transitions, and
  the common receipt.
- `docs/DETERMINISTIC_MILESTONES.md` specifies concrete M6-M12 artifacts,
  workflows, negative cases, real-chain tests, evidence, and exit gates.

If implementation reveals that Compact cannot support this architecture as
specified, work must stop at that decision boundary. The implementation record
must identify the exact incompatibility, affected requirement, evidence, and
viable options before the architecture is changed.
