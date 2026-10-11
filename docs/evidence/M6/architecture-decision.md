# M6 Architecture Decision Record

Date approved: 2026-10-11<br>
Status: approved architecture; implementation not started<br>
Applies to: M6 Midnight authorization, M7 receipt transport, and the M8 receipt consumer boundary

This record captures the decisions approved before M6 implementation. It is
not acceptance evidence and does not claim that any Compact contract, proof,
deployment, gateway, or generalized Solidity registry has been implemented.

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
