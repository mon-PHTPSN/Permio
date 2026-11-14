# M6 Architecture Decision Record

Date approved: 2026-10-11<br>
Status: v10 engineering acceptance evidence reconciled; independent human security/privacy review OPEN; M6 remains IN_PROGRESS.<br>
Applies to: M6 Midnight authorization, M7 receipt transport, and the M8 receipt consumer boundary

This record captures the decisions approved before M6 implementation. It is
not final M6 acceptance evidence. Concrete implementation and live-chain
results are recorded in `development-log.md`. Current technical acceptance and
its exact evidence-tier limits are in `acceptance-reconciliation-20261021-v1.md`;
independent human security/privacy review remains OPEN. Earlier runtime/resource
experiments below are historical records and do not override the current evidence.

本记录保留已批准的架构决定，不是M6最终验收。当前技术证据及其级别限制见新的验收核对文档，
独立人工安全／隐私审查仍未完成。下文早期运行／资源实验属于历史记录，不覆盖最新结果。

## Decision 1: admit an exact M4 activation through a Midnight envelope

Network acceptance amendment approved 2026-10-15: Preprod is the primary
deployment/end-to-end target; Local Dev is retained for targeted controlled
infrastructure-failure and reproducibility checks. See
`preprod-acceptance-plan-v1.md` for the exact evidence split and compatibility
findings. This supersedes earlier Local-Dev-exclusive acceptance wording, not
historical results, contract trust boundaries, or security/privacy requirements.
Neither network connectivity nor a documentation change establishes M6 completion.

2026-10-15批准的网络验收修订：Preprod为主要部署及端到端目标，Local Dev保留用于
定向可控基础设施故障及可复现检查。精确证据分工和兼容性发现见上述计划。此修订取代
此前仅Local Dev验收的规定，不改历史结果、合约信任边界及安全／隐私要求；网络连通
或文档变更均不代表M6完成。

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

## Decision 7: certify ancestry at issuance and share current-status paths

After the fixed depth-16 witness failed proving-key generation, the user
approved replacing repeated full-chain issuance verification with a versioned
issuance-certified ancestry representation on the existing ledger-8 baseline.
Each capability admission is intended to verify one exact parent link and bind
it into the capability's status leaf. Runtime action authorization is intended
to prove all certified ancestors active under the exact current status root
with a shared-branch Merkle multiproof rather than re-verifying every historical
issuance signature and seventeen independent paths.

Private off-chain witness preparation now shares branches for multiple
depth-20 status memberships and requires an exact caller-supplied root and
sequence. Its tests include a 35-leaf capacity fixture, stale snapshots,
altered leaves/siblings, duplicate indices, and exact Compact-root
reconstruction. This is implementation preparation, not a further architecture
decision or an on-chain ancestry check: membership alone also admits revoked
or empty leaves. Certified parent links, exact active leaf predicates, account
validity, and action-time current-root verification remain circuit work.

Implementation update on 2026-10-13: private generated-circuit predicates now
check the complete certified ancestry, exact active account/capability/session
leaves, current-root membership, validity windows, signed session and intent,
and seven-dimensional action scope. Full-depth simulator tests pass. These
helpers are not yet final runtime transaction entry points: allocation,
module/configuration admission, protocol time, nullifier/state mutation and
common receipt integration remain required. A separate membership-only
ledger diagnostic measures `k=20`, 705,943 rows; its real key generation failed
before producing keys, so it has no deployment or accepted-proof result.
No approved architecture or depth/revocation guarantee was changed. See the
concrete continuation and recovery results in `development-log.md`.

This approval does not authorize Ledger 9, a multi-contract split, a lower M5
delegation depth, terminal-only revocation checking, or trusting a delegator's
signature as proof that a child scope is attenuated.

Implementation analysis found that the current seven private scope roots do
not by themselves prove that an arbitrary child set is a strict subset of its
parent. The user separately approved staged private subset certification at
issuance and accepted observability of the total staged element count. That
decision is specified below; it does not weaken the later current-root ancestry
requirement.

## Decision 8: certify exact private scope attenuation before activation

Capability credential version 2 commits seven exact scope counts as well as
the seven existing Merkle roots. Capability activation is a bounded session
inside the existing `updateRuntimeCredentialStatus` dispatcher:

1. begin verifies the signed capability, exact parent and issuer, current
   active status, time/depth/count attenuation, and an all-empty progress
   commitment;
2. each stage privately inserts one exact child value and, for delegation,
   proves that value belongs to the corresponding parent scope root; and
3. finalize requires the reconstructed roots and counts to equal the signed
   credential and rechecks the issuer and parent under the current status root
   before writing the active status leaf.

The total staged element count is observable through the session and number of
transactions. Individual dimension counts, values, dimension choices, Merkle
paths, and ancestry depth are not public outputs. Expiry cleanup removes only
temporary session state and does not activate the credential or consume its
nonce.

All runtime scope roots use one canonical sparse `Bytes<32>` Merkle encoding.
The SDK's state-bounded helper was rejected for this boundary because its
implicit absent-leaf padding could not reconstruct Compact's canonical empty
root incrementally. This encoding correction was found by an exact-root test
and does not create a new trust role.

Compact 0.31.1 generated the unchanged nine-circuit surface. After Decision 9's
uniqueness correction, the credential-status dispatcher proving key is
169,945,774 bytes. Simulator tests
cover complete root activation, duplicate and incomplete staging, expiry,
equal-scope rejection, out-of-parent rejection, and parent revocation after
complete staging. Local Dev has now accepted complete root and delegated
staging/finalization using the corrected keys. Remaining negative delegated
live cases and Decision 7's current-root multiproof remain exit gates.

## Decision 9: strict 64-bit private ordering with explicit collision rejection

An adversarial duplicate-value test showed that exact counts also require the
staged values to be unique; otherwise repeated hidden values can inflate a
count. Strict private ordering over the full 256-bit value hash closes that gap,
but the pinned Compact 0.31.1 compiler produces a `k=20`, 567,457-row dispatcher
and local single-worker key generation does not complete. Exact first-difference
and fixed multi-transaction comparison designs were measured but remained
`k=20` after their additional committed state and selection logic were included.

On 2026-10-13, the user approved the recommended strict high-64-bit ordering
rule. The key is the little-endian `Uint<64>` represented by bytes 24 through
31 of the 32-byte hash, matching Compact's `slice<8>(valueHash, 24) as Uint<64>`.
Dimensions must be nondecreasing; within one dimension these keys must strictly
increase. The full 32-byte value still determines every scope leaf and parent
membership proof. Identical full hashes always have identical ordering keys,
so exact duplicate rejection is preserved.

Two distinct full hashes with the same ordering key cannot coexist in a single
dimension in this protocol version. The TypeScript builder rejects that case
before constructing a credential, with an explicit collision error that does
not print private hashes. It does not truncate scope commitments, merge values,
or treat a collision as equality. This is a deterministic representability
restriction, not an authorization probability or a weaker membership check.
For one million independently distributed values, the approximate probability
of at least one ordering-key collision is 2.7e-8; adversarially selected values
are not covered by that random-input estimate.

The approved comparator produces `k=19` at 517,658 rows. A full compile of all
nine circuits completed with Compact 0.31.1 and
`RAYON_NUM_THREADS=1 TOKIO_WORKER_THREADS=1`; all 18 prover/verifier files are
nonempty, and the dispatcher prover is 169,945,774 bytes. TypeScript and 22/22
package tests pass, including exact duplicates, synthetic distinct-hash key
collisions, little-endian encoding, and repeated-value substitution during
staging. Local Dev accepted eight staged values and root capability
finalization on deployment
`2afdc9f5e6e38daead69cd4faf09d7c5ea517b52b13063df7f197cfc22a12128`.
Indexed state stayed at sequence 1 through complete staging, advanced to 2 only
at finalization, and reached 3 after account revocation. Begin acceptance to
finalization took 1,080.015 seconds on the recorded local machine.

The combined run subsequently failed when the proof server was OOM-killed
(exit 137) during module-governance approval. After restarting only that service,
the explicitly scoped `--governance-only` regression passed on a fresh
deployment of the same build, including admission, replay preflight, reconnect,
root rotation, module termination, and template termination. These separate
successful phases do not establish a successful combined run. Subsequent live
tests accepted positive delegated staging/finalization, but remaining negative
delegated cases and Decision 7's action-time current-root multiproof remain
outstanding, together with the runtime families and common receipt. Detailed
partial evidence is in `scope-uniqueness-verification.json`; it is not M6
acceptance evidence and does not mark the milestone complete.

The subsequent operational mitigation uses a separate, recoverable local
proof-service profile with the same cached 8.1.0 image, one proving worker,
one queued job, four Rayon threads and a four-CPU quota. Node/indexer state,
contract code, proof constraints and ledger limits are unchanged. With this
profile, Local Dev accepted all eight parent stages, all seven child stages,
both finalizations and account revocation, reaching status-root sequence 5.
The uninterrupted retry nevertheless OOM-killed the prover at the first module
approval (exit 137, 2026-10-13T09:31:02Z). Bounded concurrency alone therefore
did not resolve the combined workload. The earlier constrained attempt was
separately interrupted by confirmed workstation sleep; it must not be confused
with this second OOM. The exact process settings, image fingerprint and result belong to the
development log and verification evidence, not a new authority or architecture
option. Verbose logging stays disabled because upstream debug logging includes
the raw private proof request. `delegation-prover-verification.json` preserves
both attempts and independent indexed-state snapshots. No memory-budget
increase, Ledger upgrade, trust relaxation, or restart-based combined pass has
been adopted.

## Approved extension: full session-scope certification (2026-10-14)

The 2026-10-14 continuation found a concrete M5/M6 gap before live runtime
integration. M5 `packages/context-accounts/src/system.ts` requires every
session scope value to belong to its parent capability and requires strictly
narrower scope or time. The new private predicate checks the selected action
against both Merkle roots, but that does not prove the whole session set.
For example, capability resources `{A}`, signed session resources `{A,B}` and
selected resource `A` pass both memberships, although M5 rejects the session.
A regression originally demonstrated exactly this boundary. The helper is not wired
to a live action entry point and grants no decision or receipt authority.

The user approved extending the issuance-time private subset
certification mechanism to sessions: bind versioned session scope counts and
roots, reconstruct the complete session scope, check every value against its
capability, and activate only at successful finalization. This preserves M5
rather than accepting the intersection as a replacement. Under one-element
staging, a session with `N` total scope values needs `N+2` setup transactions
(begin, N stages, finalize), replacing current direct issuance; the total
count becomes observable, while values and per-dimension counts remain private.
The larger dispatcher and setup latency still require measured feasibility;
the existing capability result is not proof that session certification is free.

The alternative of proving the whole subset on every action was not selected.
There is no new scope-size or delegation-depth limit. Implementation now uses
session credential v2 (signed roots **and counts**), session status leaf v2,
and status command v3. Account encoding remains v1 and capability encoding v2.
Direct account issuance and exact revocation remain operation 1; **both**
capability and session activation require operations 2/3/4 of the existing
dispatcher. No tenth transaction circuit or new contract was introduced.

Begin verifies the holder's exact session and command signatures, active
holder and parent under the current root, exact target/instance/context,
contained validity, nonempty counts, strict count-or-time narrowing, and a
session runtime key different from its holder key. Each stage reconstructs
one dimension and proves full-hash parent membership. Finalize rechecks the
current holder/parent leaves, complete signed roots/counts and empty target
status before atomically activating, advancing the root sequence, consuming
the nonce and removing temporary progress. Expired progress is lazily removed
without activation. The historical `CapabilityAttenuationSession` type/map
names are retained; the certification is v2 and pins the full v3 command
including credential kind, preventing capability/session substitution.

The shared scoped-credential view moves duplicate Schnorr checks outside
root/delegate branches. The measured dispatcher is 484,064 rows (`k=19`),
versus the previous 517,658. Eight other transaction programs are byte-identical
to the retained pre-extension build. These are compilation/cost observations,
not accepted proofs. Initial batch and sequential real-key builds stopped
with exit 1 and left empty keys. The initial live session test stopped at the
asset gate before wallet startup. A subsequent approved clean WSL/Docker
restart cleared the lingering OOM-related `init.scope` stop state. The same
program then generated all nine real key pairs and passed the full 21-runtime-
transaction Local Dev credential/session workflow, including finalization,
revocation, exact indexed roots and reconnect. See
`clean-restart-verification.json` for hashes, all transaction IDs, measured
time/memory, and the separate recoverable Docker stale-socket repair.
No memory, OOM-policy, compiler, ledger or architecture change was made.
This does not resolve the earlier different `k=20` membership diagnostic or
implement ordinary-action state/nullifier/receipt logic. Full M6 acceptance
remains incomplete.

The disposable build profile is now `permio-authorization-v2`; it is not an
upgrade of a deployed v1 verifier. Rebuild/re-sign the affected credentials
and commands and deploy a matching contract. Old session leaves cannot be
treated as certified v2 leaves. No production migration is implemented.

用户已批准在签发阶段为整个会话权限集合做私有子集认证，包括 N+2 笔配置交易及可观察的元素总数。现已实现会话凭证／状态叶 v2 和状态命令 v3，并复用原有入口；仅最终确认能激活。经另行批准的完整 WSL／Docker 恢复后，九组真实密钥已生成，21 笔真实本地链凭证／会话交易、索引根核对及重新连接全部通过；未改架构、内存或工具链。普通操作、状态／nullifier 和通用收据仍未完成，M6 保持未完成。

## Allocation implementation continuation (2026-10-14; not a replacement architecture)

This subsection records the v3 allocation checkpoint. The later v4
credential/issuer continuation below implements the previously unwired
credential predicate; ordinary-action integration remains unfinished.

The next slice implements the already prescribed private allocator assertion
and public instance commitments in the same versioned contract. The source
now contains ten transaction circuits, including `allocateRuntimeInstance`;
the disposable SDK profile is `permio-authorization-v3`. Contract-size
acceptance must be measured on the unchanged pinned node before relying on
that additional entry point. No contract split, inter-contract call, new root,
authority substitution, compiler/ledger upgrade or memory-policy change is
authorized by this implementation step.

Source verification corrected an imprecise wiki description: M4's
`InstantiationAuthorization` is an unsigned typed in-memory record. M6 hashes
the exact record and requires the existing namespace allocator to sign the
chain-specific allocation assertion, including the original M5 snapshot,
initial state commitment, explicit issuer tree, exact template, root reference,
deployment, lifetime and nonces. This is the already prescribed allocator
authority, not a governance-admission bridge or verification of an imaginary
M4 allocation signature. The namespace/template lookup and public submission
window are disclosed; the issuer tree, M4 record content, instance expiry,
state opening and nonces remain private.

New allocation requires template status active. Retirement and revocation
block it prospectively; request and instance-identity nullifiers prevent
re-signing another nonce/snapshot to reuse either identity. The public instance
record initializes state sequence zero and preserves the immutable allocation
commitment. It does not grant a capability, session, action or receipt.

The exact-issuer predicate requires both the allocated issuer-tree membership
and the current namespace authority-root membership. It is prepared but not
yet wired into the existing credential dispatcher or ordinary-action entry
points. M2 initial-state correspondence is checked by the SDK, not independently
reconstructed from template JSON inside this allocation circuit. Final action
configuration/policy integration must not treat an allocator signature as a
proof of arbitrary template semantics. Low-entropy instance/request IDs can
be guessed against stable replay nullifiers; a full privacy acceptance result
is not claimed. These are explicit unfinished gates, not weakened requirements.

Observed result: all ten real key pairs generated, and the unchanged Local Dev
node accepted the v3 deployment and the complete 17-transaction governance/
allocation workflow. The allocation, exact indexed commitments, reconnect and
prospective retirement/revocation history checks passed; all 160 local cases
passed. This resolves deployment capacity for this particular ten-circuit
slice, not for unimplemented runtime entry points. The v2 credential trace
remains historical because exact program/key hashes changed. See
`allocation-verification.json`; the above unfinished gates remain mandatory.

本轮是在既定单合约／命名空间权限 root 下实现分配断言，新增第十个交易入口，必须实测现有节点能否接受；未改架构或工具链。源代码确认 M4 分配记录不带签名，M6 使用既定分配器对精确记录及 M5 快照的链专属断言签名。链上记录不授予动作权限。实例签发者双重资格谓词尚未接入凭证／动作，M2 初始状态的最终电路策略绑定、低熵标识隐私风险及完整真实链验收仍明确保留，不能把分配器签名误称为任意模板语义的证明。

## Credential/issuer enforcement continuation (2026-10-14)

The v4 dispatcher consumes the existing immutable allocation and existing
namespace-authority root; no bridge, new administrator, extra transaction
entry point, contract split or toolchain change is introduced. This implements
the prescribed allocation boundary rather than selecting another architecture.
The original issuer must be in both the allocated list and current namespace
root. The original authority-leaf commitment is now part of capability v3,
inherited by descendants and checked for root management. M5 already restricts
root revocation to the original `issuerRef`; allowing any namespace issuer
in Compact would have contradicted that requirement.

Private allocation openings and issuer paths are not published. The selected
submission deadline is public and bounded by signed private lifetimes; it
does not grant longer-lived authority. Revocation can clean up after instance
expiry, but still requires the exact original/currently eligible authority.
Permissionless expired-staging cleanup cannot activate a credential.
The selected deadline is an intentional disclosure, not a claim of zero
information about expiry. The serial live fixture selects expiry minus one
second and therefore does not demonstrate expiry hiding. Privacy-sensitive
callers must select an independent shorter window; full inference/privacy
acceptance remains outstanding, beyond merely scanning logs for sentinels.

Implementation testing also identified a physical-position gap: matching a
Merkle root and leaf value alone did not constrain an empty issuance path to
the signed status index. The dispatcher now checks all mutated indices and
the checked active account/parent positions. Initial k20/733,347-row output
was intentionally stopped before key generation. Sharing command signature,
account/parent hashes and certification computation retained all checks and
reduced it to k19/418,047 rows; position/time checks produce 418,338 rows.
The initial deliberate stop was not an OOM result. Real key generation and
local-node results are recorded separately from simulator tests.

The live fixture is deliberately long-lived (M2 maximum 14,400 seconds,
instance two hours): full staged setup takes serial proofs. This is not a
change to application policy, a claim that 900-second grants work, or ordinary
action performance evidence. Final M2 policy/identity/action binding, common
receipt and full real-chain acceptance remain mandatory.

v4 沿用既定分配与命名空间权限 root，实现凭证签发者接入，并按 M5 已有规则固定根能力原始签发者；没有新增管理员、桥接、交易入口或升级工具链。新增 Merkle 物理位置检查，避免用另一个空槽替代签名索引。初始 k20 被主动停止，不是 OOM；共享重复计算后降至 k19，补充检查后为 418,338 行。长时效真实测试仅验证串行设置流程，不代表短时效策略或普通动作性能可行；最终 M6 验收条件未放宽。

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

## 2026-10-14 continuation — authenticated policy opening, not a new trust bridge

Profile v5 consumes the existing activation-signed configuration hash and
binding root through a typed private M2 policy projection. Allocation proves
the exact initial-state opening for that instance rather than accepting any
allocator-signed state. The namespace activator's existing M2/manifest
correspondence responsibility is explicit; Compact does not parse JSON or
re-run M4 reviews. Both existing action-ID hash domains are retained in
separately named fields. No new signer, authority root, administrator,
transaction circuit, deployment split or toolchain upgrade was adopted.

The exact layout and remaining enforcement are in runtime-policy-v1.md.
180 repository tests and all ten real key pairs passed. The unchanged node
accepted the fresh v5 deployment and 17 finalized governance/allocation
transactions; reconnect and independent public reads agreed. Only the
allocation program/prover/verifier changed from v4; the other nine triples
are identical. The successful trace is retained in
template-policy-verification.json. Wrong policy/state, including a correctly
signed arbitrary-state allocation, failed generated Compact preflight;
these are not negative node transactions. Local module governance remains a
disposable admission fixture, not approval of a production runtime module.
Ordinary actions, current exact module/schema enforcement, evidence and
identity rules, atomic action state/nullifiers and receipts remain incomplete.

v5 在既有激活签名配置哈希和绑定根之下验证私有 M2 策略及同一实例的初始状态，不再接受分配器签名的任意状态。投影与 JSON 的对应责任仍属于既定激活者；保留两种既有动作哈希域，不增加签名者、权限根、管理员、交易电路或升级工具链。180 项测试及十组真实密钥通过，新部署加 17 笔交易被未修改节点接受，重连及独立公开读取一致；只有分配程序和密钥变化。错误策略／状态在 Compact 预执行阶段拒绝，不能冒充节点负面交易；测试模块不等于生产批准。普通动作、模块／模式、身份／证据、原子状态／nullifier 及收据仍未完成。

## 2026-10-14 continuation — authenticated slot-rule data, not host-granted chain authority

M5-P1 remains the separately committed portable assignment API. Runtime policy
v2 binds the complete M2 context/slot/assigner rule tree through the existing
activation configuration. V1 is rejected rather than silently reinterpreted;
the working deployment profile is v6. The approved activator's M2/projection
correspondence responsibility and the single-deployment/ten-transaction-circuit
governance slice are unchanged. No reviewer keys, authority/root, administrator,
signing scheme or public key nullifier is added.

Private preparation consumes exact M5-P1 records and complete parent IDs and
opens each rule. It returns private-witness-only, never a receipt or a granted
authorization. The ordinary-user fixture now exercises that preparation and
M5-P1's slot guard. Host-side activity checks are NOT current ledger-status
proofs. Assignment issuance, legitimate revocation, current role-state binding
and complete relevant ancestry must still be verified cryptographically in
the actual action boundary. This slice adopts no new credential kind or slot
ancestry bound; it does not silently weaken prospective ancestor revocation.

The exact schema, migration and unfinished gates are in runtime-policy-v2.md.
Historical v4/v5 evidence stays unchanged. V6 allocation/governance results
are recorded separately and must not be represented as ordinary-action slot
proofs or production module approval. No shared milestone/HTML is edited.

M5-P1 保持独立的可移植分配接口。策略 v2 将完整 M2 上下文／槽位／分配权限规则树绑定到既有激活配置，拒绝旧布局，当前配置为 v6；不改变既定激活者责任、单部署及十交易电路治理切片，不增加审查者密钥、新权限／根、管理员、签名方案或公共密钥 nullifier。私有准备保留完整精确上级链并展开规则，只输出 witness，不授予授权或收据。宿主有效性查询不是当前账本状态证明；真实动作仍须密码学验证分配、合法撤销、当前角色状态和完整相关上级。本次不采用新凭证种类或槽位链深度限制，也不弱化上级撤销。新模式和迁移另记文档，v4／v5 历史不改称 v6，更不冒充普通动作槽位证明或生产模块批准。

### V6 verification outcome

230 repository cases and ten real key pairs pass. A fresh v6 deployment plus
17 governance/allocation transactions finalized, including policy-v2 rule-root
binding, reconnect, threshold root rotation and prospective lifecycle checks.
Independent public reads preserve allocation/state history. The first attempt
timed out at RPC observation but left an indexed replacement staging session;
its partial outcome is retained separately. The unchanged fresh retry passed.
This authenticates rule configuration, not assignment issuance/current role
status or ordinary actions. No M6 completion or production module approval is
claimed; see slot-assignment-verification.json and the detailed development log.

230 项仓库测试、十组真实密钥及 v6 新部署加 17 笔治理／分配交易通过，涵盖策略 v2 规则根绑定、重连、阈值轮换及后续生命周期限制；独立读取确认历史不变。首轮 RPC 观察超时但替换暂存已落入索引，部分结果单独保留；不改代码的新部署重跑通过。它认证的是规则配置，不是分配签发、当前角色或普通动作，不宣称 M6 完成或生产模块批准。

## 2026-10-14 03:17 UTC — slot-provenance decision boundary (not adopted)

Actual M2/M4/M5-P1 calls accepted 33 manager assignments plus a requester
assignment, while the customer's capability depth stayed zero. Three new M6
regressions verify all 34 exact parent records, distant ancestor assignment/
account revocation and non-revival after parent replacement. A 17-entry
capability witness is not a justified slot bound.

Isolated Compact 0.31.1 diagnostics rejected runtime-sized vectors and loops;
a constant-size control compiled with runtime 0.16.0. The official reference
corroborates bounded execution but targets a newer language, so the pinned
compiler output is retained as version-specific evidence. This is not a node
failure or proof that all Midnight representations are infeasible.

The existing namespace kinds 1–12 contain no participant-slot governance
profile. Rule discriminator 2 must not be misread as namespace kind 2
(reviewer), nor can an activation key implicitly gain assignment power.
The recommended bounded staging/private-instance-state representation and
narrow namespace slot-governance leaf are **proposals awaiting user approval**,
not decisions already approved. Their root/state freshness, final atomicity,
expiry, contention and metadata costs are specified in
[slot-assignment-architecture-boundary.md](slot-assignment-architecture-boundary.md).

Per the architecture-consultation instruction, production contract changes
pause here. No slot-depth cutoff, truncation, server trust bridge, separate
instance-authority root, ledger/compiler upgrade or added role is adopted.
Full repository checks pass 233 cases; no new Midnight transaction was
submitted, no production keys/bindings changed in this diagnostic continuation,
and M5-P1/shared milestone Markdown/generated HTML remain unchanged.

真实 M2/M4/M5-P1 接口接受 33 个 manager 加一个 requester 的 34 条上级链，客户能力深度仍为零。三个 M6 新回归检查完整记录、远端上级分配／账户撤销及替换不复活，不能把能力的 17 项 witness 当成槽位上限。隔离的 Compact 0.31.1 拒绝运行时长度 Vector／循环，常量对照通过 runtime 0.16.0；官方参考面向较新语言，实际固定版本输出单独保留，不冒充节点失败或 Midnight 整体不可行。既有权限 1–12 无槽位治理类型，规则编号 2 不是审查者权限 2，激活密钥也不能隐式增加分配权。分阶段验证／私有实例状态和窄槽位治理叶只是等待用户批准的建议，具体新鲜度、最终原子性、过期、竞争及元数据成本另记。按架构协商要求，在此暂停生产合约修改；不采用深度限制、截断、服务器桥接、新实例权限根、工具链升级或新增权限。完整 233 项检查通过；本轮零 Midnight 交易、未改生产绑定／密钥，M5-P1、共享 milestone 和 HTML 不变。

## 2026-10-14 continuation — staged private slot state approved and implemented in source

The user's subsequent “continue” authorizes the staged/private-instance-state
direction and explicitly scoped governance profile proposed at the preceding
decision boundary. No slot-depth cutoff, host trust bridge, independent public
instance-authority root, inter-contract split or compiler/ledger upgrade was
adopted. This is implementation approval, not human production proof-module
activation or final M6 acceptance.

V7 adds one consolidated slot-management proof entry (eleven at this slice),
private opening version 2 and narrow namespace role participantSlotGovernor
13. Slots use private authenticated indexed sorted maps behind the original
public instance state commitment; all 32 key bytes determine order and absence.
A depth-20 map contains a mandatory sentinel and up to 1,048,575 real nodes;
this is a concrete storage encoding capacity, not a 17-hop provenance limit.
Assignment IDs never delete; slot bindings key M5 account identity rather
than a changeable runtime credential commitment. No implicit powers transfer
from template author, reviewer, activator, another allocator or capability issuer.

Begin authenticates an exact signed operation but grants no role. Every parent
stage opens an admitted private record and exact current account status.
Strictly decreasing issued sequences reach a genuine creator/governance origin
without trusting claimed length or a truncated witness. Replacement additionally
checks the old binding chain inactive. Finalization rechecks signer, exact
policy, current roots/state/lifetimes, committed completion and replay, then
atomically changes the private maps/state and sequence with a fresh nonce.
An expired session can be cleaned permissionlessly; no receipt or authority
is created by staging or cleanup. A chosen deadline cannot falsely classify
a currently live account as inactive.

State version 2 includes a committed lastMutationAt watermark for slot changes.
This was added before live deployment after checking M5's no-backdating rule.
Cross-credential/ordinary-action watermark integration is still unfinished.
The fixed-label allocation authenticates exact sentinel trees, counts and
watermark; v6 bytes are not reinterpreted. Exact schema and tradeoffs:
[runtime-slot-state-v1.md](runtime-slot-state-v1.md).
Real key/deployment capacity, long occupied-slot node flows, complete
ordinary action/root/nullifier/evidence/schema enforcement, receipt privacy
and restart/production acceptance still require evidence.

用户随后 continue 批准此前分阶段私有状态及窄治理权限方向，不采用槽位深度上限、宿主桥接、独立公开实例权限根、跨合约拆分或升级工具链。该批准不是生产模块的人类激活或 M6 验收。v7 增加一个合并槽位入口（本阶段十一），状态 opening v2 及窄权限 13；完整 32 字节键的索引排序树隐藏在既有实例状态承诺中，sentinel 及最多 1,048,575 个节点是存储容量，不是 17 跳限制。ID 不删除，绑定使用 M5 账户身份而非可替换凭证，其他权限不隐式获得槽位权力。开始只认证命令，逐步展开精确记录／当前账户状态、以签发序号递减走到合法起点，替换还须证明旧链失效；最终重检签名、规则、当前根／状态／时间、完成及重放，原子更新私有状态和序号。过期可无特权清理，暂存／清理不授权或出收据，过长 deadline 不伪造失效。部署前加入 lastMutationAt 保留槽位禁止倒填，其他凭证／动作完整水位仍待接入；分配认证空树／计数／时间，v6 不重新解释。真实密钥／部署容量、长链节点验证、普通动作／证据／收据／重启／生产等仍未完成。

### Earlier v7 verification limit (before the user's Docker restart)

Final source regressions pass 250 cases, zero failures/skips. Full signatures,
SHA commitments and role/state invariants are preserved while measured slot
rows decrease from k21/1,102,647 to k20/818,608 (25.76%). The actual isolated
compiler probe was stopped by a local k19 resource guard, NOT a network/
protocol constraint. Full k20 key memory/time and deployment feasibility remain
unverified; no matching current slot pair or readiness manifest is claimed.

The slot signature now directly includes exact allocationCommitment, so the
network/deployment/original authority scope cannot be substituted by attaching
another independently valid allocation. The --slot-state live attempt exits 1
before wallet initialization on the missing real-key manifest. Docker's engine
also remains unavailable after one normal start. No new node transaction or
receipt was submitted; previous v6 chain evidence stays historical.

The prescribed architecture has NOT been declared infeasible from k alone.
No smaller chain guarantee, trusted host bridge, hash-scheme change, extra
deployment or toolchain upgrade was adopted. Further cost work and actual
resource-qualified keys/node verification remain before M6 completion.

当前源码 250 项回归通过，签名／SHA／权限及状态不变量保持，槽位电路从 k21／1102647 降到 k20／818608（25.76%）。本地 k19 资源保护主动停止真实探测，不是网络或协议限制；完整 k20 密钥内存／时间／部署未测，无匹配槽位密钥或 readiness 宣称。签名直接绑定精确分配承诺，不能附另一份有效分配替换网络／部署／原权限范围。--slot-state 因 manifest 缺失在钱包前 exit 1，Docker 单次启动后引擎也不可用，零新节点交易／收据，v6 证据仍为历史。不能仅凭 k 宣称架构不可行，未缩短链保证、信任宿主、换哈希、增部署或升级工具链；规模优化、实际密钥及节点验证仍待完成。

### Later operational evidence — no architecture decision changed

The user's restart recovered the shared Docker engine. Verified Ubuntu
integration permits the same-engine CLI; only the three existing M6 containers
were started, with no deployment/volume/resource changes. A resource-qualified
real k20 attempt then stopped by its shared-VM reserve guard after 674.337
seconds, with sampled compiler RSS/HWM 5,925,572 KiB and keys=null. All services
remained healthy; the later complete root check passes 255 cases. This is not
an OOM/ledger rejection or ordinary-action proof measurement. Full keys and
current v7 slot-node acceptance remain pending. Exact observations are in
docker-wsl-recovery-verification.json and slot-key-resource-attempt-verification.json.
No hash, trust, role-depth, signing, deployment or toolchain alternative was
adopted; the prescribed-architecture decision boundary remains in effect.

用户重启后共享 Docker 引擎恢复，已验证 Ubuntu 集成可访问同一引擎，只启动三个原
M6 容器，部署／卷／资源不改。实际允许 k20 后在 674.337 秒触及共享 VM 内存保留阈值
主动停止，采样 RSS/HWM 5925572 KiB、无密钥；服务健康，后续完整 255 项通过。
非 OOM／节点拒绝，非用户动作证明成本，完整密钥与新 v7 实链仍待完成。具体另存两份
恢复／资源 JSON，没有采用哈希、信任、链深度、签名、部署或版本替代，原架构决策边界不变。

### v8 continuation — shared credential/slot mutation ordering

On 2026-10-14 the user directed the low-memory experiment into a separate
session/project and continued M6 here. The concrete remaining defect was that
v7 credential mutations did not advance the private instance watermark or pin
the state used by staged issuance. This continuation applies the existing
single-instance commitment/sequence architecture, not an alternative:
credential-status command v4 signs allocation, previous state/sequence and
circuit-derived next state; accepted issuance/revocation atomically updates
status, nonce and instance ordering while preserving the state label and maps.
Staging and expired cleanup grant nothing and do not advance ordering.

Tradeoff: same-instance credential changes invalidate concurrent slot/credential
certifications. That is intentional stale-state rejection, not a new role or
global namespace clock. Clients retain exact private openings and restart
staging rather than rebase a certification. The disposable SDK tag changes to
v8, but M2/M4/M5/M5-P1, authority kinds, policy/state-opening versions, crypto
profiles, eleven transaction entries and the slot ZKIR hash remain unchanged.
Previous deployments are not upgraded or reinterpreted. The separate memory
experiment remains on the committed v7 baseline; it is not v8 readiness.

Exact schema, new negative vectors, expected live counters and compatibility
are in [runtime-credential-state-v1.md](runtime-credential-state-v1.md).
The actual v8 credential-node attempt stops at missing matching build assets
before wallet initialization. No new deployment, accepted proof or common
receipt is claimed. Ordinary action watermark/authorization/evidence,
nullifiers, receipts, complete privacy and restart acceptance remain open.

2026-10-14 用户要求内存实验在独立项目／会话执行，本会话继续 M6。实际缺口为 v7
凭证变更不推进私有水位，也不固定分阶段签发依赖的状态。本项沿用单实例承诺／序号
架构，不另选替代：v4 命令签署分配、旧状态／序号及电路计算的下一状态，已接受的
签发／撤销原子更新凭证根、nonce 和实例排序，保留状态标签及映射；暂存／清理不授权
或推进序号。代价是同实例变更使并发认证失效，必须保留精确 opening 并重做认证，
不偷偷 rebase、不新增角色或命名空间全局时钟。一次性 tag 改为 v8，其余 M2/M4/
M5/M5-P1、权限、策略／opening 版本、密码配置、十一入口及槽位 ZKIR 哈希不变；
不升级／重解释旧部署，独立实验的已提交 v7 不等于 v8 就绪。新真实链尝试因缺少
匹配构建资产在钱包前停止，无新部署／已接受证明／通用收据；普通动作、水位、证据、
nullifier、收据、完整隐私及重启验收仍待完成。

### 2026-10-15 operational follow-up — not an architecture replacement

Exact fingerprint verification now permits reuse of the experiment's unchanged
slot program/key pair; a bounded serial build completes all eleven current
v8 pairs. Fresh real Local Dev governance/allocation and an independent final
public-state read pass. Historical pre-build failures above are preserved,
not relabeled; they no longer describe the current asset/deployment status.

Runtime paging is measured separately using the same prover image and circuit
at a second local-only endpoint. The first 5 GiB hard-cap trial stops at the
shared-machine reserve before slot transactions and cleans its resources;
the subsequent 3.5 GiB cap is a stricter operational test, not weaker crypto,
authority, credential ancestry, circuit checks or privacy. No global memory
setting or existing service is changed. Key-build success does not establish
customer proof latency. See bounded-key-build-verification.json,
v8-allocation-verification.json and capped-runtime-proving-v1.md. Ordinary
action/module/evidence/nullifier/common-receipt and full restart/privacy gates
remain open; no prescribed architecture decision is silently replaced.

精确指纹允许复用实验中未变化的槽位程序／密钥，受限串行构建已完成当前 v8 十一组；
新本地链治理／分配及独立最终公开读取通过。上文缺资产失败保留为历史，不再代表当前
资产／部署状态。运行时换页另以同镜像／同电路在第二本地端口测量；首个 5 GiB 硬
上限在槽位前触发共享保护并清理，后续 3.5 GiB 是更严格运行配置，不削弱密码、权限、
完整祖先、电路或隐私，也不改全局内存／原服务。密钥成功不是用户证明耗时；精确结果
见独立证据。普通动作／模块／证据／nullifier／通用收据及完整重启／隐私仍未完成，
没有擅自替换规定架构。

### 2026-10-15 operational follow-up — exact binaries and worker count

The SDK requires binary ZKIR in addition to text IR and real keys. The reused
slot binary was omitted by the integration and is now restored from the
successful exact-program experiment; all eleven entries are checked by local
manifest v2 before wallet initialization. This corrects asset delivery, not
the proof/signature/authority architecture. The original redacted slot error
is not retrospectively labeled as a captured HTTP response. A corrected
four-worker run then reaches the independent swap reserve during account
issuance; no credential/slot mutation is accepted and cleanup succeeds.

The explicit subsequent one-worker profile reduces only CPU quota and Rayon
workers. It preserves 5 GiB combined client/prover hard RAM, shared 8 GiB host
swap, two-hour workflow deadline, safety reserves, actual real keys/programs,
private ancestry, state ordering and acceptance checks. This is an operational
measurement, not a guarantee of time-for-memory or permission to truncate
ancestry, outsource private witnesses, add a trusted verifier or upgrade the
toolchain. Any required architecture alternative still requires user review.

SDK 除文本 IR／真实密钥还需二进制 ZKIR。本次集成遗漏复用槽位 binary，现已从
成功的同程序实验恢复，钱包前清单 v2 核验全部十一项；这是资产交付修正，不是
证明／签名／权限架构变更，不把原脱敏槽位异常事后编为已捕获 HTTP 响应。修正后
四线程测试在账户签发期间触及独立 swap 保护，未接受凭证／槽位变更，清理成功。
后续显式单线程只减 CPU／Rayon，仍合计 RAM5 GiB、共享 swap8 GiB、全流程两小时，
保护、真实密钥／程序、完整私有祖先、状态排序及验收不变。只是运行测量，不保证
时间换内存，不授权缩短祖先、外包 witness、增加受信验证器或升级；架构替代仍须商议。

### 2026-10-15 operational follow-up — stateless prover reset boundary

F5cqeV accepts the account transaction in184.905seconds, but stops the first
slot-provider stage at the unchanged shared-swap reserve. A numeric sample
between those calls records2.74GiB prover RAM plus5.06GiB swap retained after
account acceptance. No conclusion is drawn about live objects versus allocator
arenas. The optional `--reset-before-slot` diagnostic preserves the caller's
private state and independently verifies the public state before/after one
restart of the exact controller-owned idle prover. It accepts no request for
a different container, endpoint or command, verifies unchanged image/applied
limits and zero jobs, and preserves the original safety/workflow deadlines.
This resets a stateless cryptographic backend, not a namespace authority,
private instance, ledger, transaction, nonce, signature or validity window.
No proof/transaction retry or greater paging budget is adopted. cBg1CS accepts
the account and verifies the owned restart, releasing RAM2997391360bytes/
swap5317849088bytes to RAM13496320bytes/swap0 without changing public state.
The cold slot still stops113.803seconds into the provider stage at the shared
swap reserve; independent reads confirm no slot transaction. Retention was
avoidable overhead, not the sole capacity limit. A16GiB shared-paging test
(same5GiB physical RAM, prover/client swap ceilings12/4GiB) is explicitly
requested, not enabled or guaranteed. Neither slot acceptance nor production
operation follows from the reset. The295-test root regression passes; ordinary-action,
common-receipt and complete privacy/restart gates remain required.

F5cqeV账户交易184.905秒接受，但首槽位provider阶段仍在原共享swap保护处停止。
两调用间数值采样证明器接受账户后仍2.74GiB RAM＋5.06GiB swap；不推断活对象或
allocator区域。可选`--reset-before-slot`诊断保留客户端私有状态，仅重启精确控制器
自有且闲置的证明器，前后独立核验公开状态。不能请求别的容器／端点／命令，核验同
镜像／实际限制及零任务，原保护及全流程期限不变。重置的是无状态密码后端，不是
命名空间权限、私有实例、账本、交易、nonce、签名或有效窗口。不重试证明／交易或
扩大换页预算。cBg1CS账户接受及自有重启通过，RAM2997391360／swap5317849088bytes
降至RAM13496320／swap0，公开状态不变；但冷槽位provider阶段113.803秒后仍触
共享swap保护，独立读取确认无槽位交易。残留是可避免开销，不是唯一容量限制。
已明确请求总共享swap16GiB、同RAM5GiB、证明器／客户端swap上限12／4GiB的测试，
未启用也不保证成功，不能据重启宣称槽位验收／生产通过；295项根回归
通过，普通动作、通用收据及完整隐私／重启仍是必做门槛。

### 2026-10-15 — experiment-profile verification does not change architecture

The user authorizes testing the experiment's actual prover RAM high/max of
5/6 GiB and one worker, with a separately capped 1 GiB client and unchanged
shared 8 GiB swap. The combined long-lived hard allowance is 7 GiB, not the
historical 5 GiB. BmF0kQ records 779 soft-reclaim events, no hard-limit/OOM
events and accepted allocation, then stops at the shared RAM reserve during
account proving. It never reaches the slot. This confirms reclamation is active
but not that a fixed compiler target fits the shared runtime. Any next soft
budget controller must account for caller/services/reserve within fixed caps;
none is implemented or accepted here. No trust, private witness location,
signature, ancestry, state ordering, proof program or prescribed architecture
is changed. Exact resource evidence is reclaim-runtime-verification.json;
299 regression tests pass and full M6 acceptance remains incomplete.

用户授权验证实验证明器真实RAM high／max5／6GiB及单线程，客户端另硬1GiB，共享
总swap仍8GiB，长期合计硬7GiB而非历史5GiB。BmF0kQ记录779次软回收、无硬上限／
OOM事件、分配接受，但账户证明时触整机RAM保留阈值，从未到槽位。确认回收生效，
不说明固定编译器目标适合共享运行。后续软预算控制器须在固定上限内核算客户端／
服务／保留量，此次未实现或验收。不改信任、私有witness位置、签名、祖先、状态排序、
证明程序或规定架构。精确资源证据见独立JSON，299项回归通过，M6完整验收仍未完成。
