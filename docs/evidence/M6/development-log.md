# M6 Development Log — Architecture Admission Boundary

Started: 2026-10-11; latest continuation: 2026-10-16<br>
Branch: `feat/m6-m8-midnight-delivery`<br>
Status: implementation in progress; staged activation admission, expiry
cleanup, proof-module governance, authority-root rotation, template and module
lifecycle, credential-status transitions, indexed-state reads, and reconnect
behavior verified on Local Dev in versioned partial traces; v3 private instance
allocation verified on Local Dev; v4 allocation-bound issuer/credential
slice verified on Local Dev with public-state restart persistence; v5 exact
policy/initial-state allocation verified in a separate 17-transaction live run.
Current-root ancestry predicates pass simulation,
but ledger-bound ordinary actions, common receipts and full M6 acceptance
remain incomplete.

This log records concrete M6 implementation work and failures as they occurred.
It is not final M6 acceptance evidence. The staged activation and proof-module
governance slices have finalized on the pinned local chain, but the full M6
registry/runtime surface is not implemented.

## Architecture and problem decision register

This register is the chronological index of material architecture questions,
implementation problems, alternatives, and user decisions encountered during
M6. The sections that follow retain the detailed commands, measurements,
transactions, and negative-test results. A checkpoint entry does not convert an
unresolved question into an approved architecture.

| Sequence | Concrete question or problem | Alternatives considered | Decision and reason | Result or current status |
|---|---|---|---|---|
| 1 | M4 and M5 use portable Ed25519 identities, but Compact 0.31.1 cannot verify that signature path. | Change M4/M5 identity cryptography; add a synchronization authority; mirror all governance on Midnight; or bind a separately profiled Midnight key to the existing records. | Preserve Ed25519 as the application-neutral identity and attestation scheme. Use `midnight-jubjub-schnorr-v1` only as an explicitly bound M6 admission/runtime credential. This avoids rewriting M4 history and does not create a universal administrator. | Implemented for M4 admission and M5-to-M6 runtime credentials. Native Ed25519 remains a future ledger-9 candidate, not an approved migration. |
| 2 | M2 action bindings are variable-length, while a Compact transaction circuit has a bounded shape. | Add an arbitrary M2 action limit; trust only an aggregate hash; or validate bindings over several transactions. | Use begin, sequential stage, and atomic finalize. Each staging transaction carries one complete action binding; an action itself is never split. Activation remains unavailable until finalization rechecks the exact signed envelope and complete count. | Implemented, simulator-tested, and live-tested. Missing, duplicate, altered, and out-of-order bindings are rejected. |
| 3 | Incomplete activation sessions can reserve temporary state and nonce use. | Require a privileged keeper; expose a general cleanup transaction; or clean only when protocol operations touch a stale session. | Use automatic touch-based cleanup in begin, stage, and finalize. Cleanup may release only an expired or registry-stale reservation and cannot erase active history or a consumed nonce. | Implemented. The standalone cleanup entry point was later removed to reduce deployment weight without changing cleanup semantics. |
| 4 | Authority-root rotation, module governance, normal retirement, and emergency revocation require different powers. | Reuse a single administrator; let an activator rotate roots; or define narrow authority leaves with threshold checks. | Keep unique eligible root governors with a threshold of at least two; keep module reviewer, module approver, module activator, deprecator, template retirer, and emergency-revocation authority distinct. Equivalent entry points may share a dispatcher, but their authority kinds and valid source transitions may not collapse. | Implemented with duplicate-approval, insufficient-threshold, unauthorized-actor, invalid-transition, and privilege-collapse rejection. |
| 5 | A fourteen-circuit single contract was rejected by the unchanged ledger-8 Local Dev node for block weight. | Raise local limits; split contracts; upgrade the ledger; or consolidate semantically equivalent transaction entry points. | Do not raise limits as acceptance evidence. Keep one physical ledger-8 contract because native cross-contract composition is unavailable on the pinned stack, and first consolidate only equivalent entry points. | Root-approval consolidation reduced fourteen circuits to thirteen but still failed. Lifecycle consolidation reduced the build to eleven circuits and restored deployment. |
| 6 | Adding the required generic credential-status transition produced a twelve-circuit contract that again exceeded deployment weight. | Abandon credential status; split contracts behind a new synchronization trust boundary; or further consolidate equivalent governance circuits and automatic cleanup. | Preserve credential-status semantics and consolidate proposal/approval/activation/termination into `governProofModule`; fold cleanup into the three admission operations. | The nine-circuit contract deployed on the unchanged stack. Governance, admission, lifecycle, and credential-status activation/revocation completed live. |
| 7 | The consolidated module dispatcher required `k=18` public parameters, and the proof server returned HTTP 400 after three failed downloads. | Redesign the circuit; predeclare `k=18` unsupported; or diagnose the official parameter endpoint and retry unchanged. | Treat it as infrastructure until evidence shows a circuit failure. The official SRS endpoint later returned the required object, so the unchanged test was rerun. | The proof server downloaded and verified the parameters, and the complete live run passed. No architecture or Local Dev limit changed. |
| 8 | A sandboxed live call could not retain its WebSocket connection to `127.0.0.1:9944`, despite healthy containers. | Alter contract/network code; repeatedly retry inside the same boundary; or verify the stack read-only and rerun through an environment allowed to access the local socket. | Do not convert a sandbox socket restriction into a protocol workaround. Verify node, indexer, and proof-server health, then run the same test with localhost access. | The unrestricted run reached deployment and later passed. The refusal was not a ledger or contract defect. |
| 9 | `StateBoundedMerkleTree.pathForLeaf` rejects a sparse index whose leaf has not yet been materialized. | Restrict allocation to sequential indexes; shrink the tree; or derive Compact-compatible empty-subtree hashes and paths. | Preserve the depth-20 sparse registry and implement the exact ordered `transientHash` path derivation for arbitrary indexes. | Implemented and simulator-tested at distant indexes, including replacement and duplicate-index rejection. |
| 10 | M5 supports delegation depth 16 and prospective ancestor revocation, but the initial M6 terminal credential commits only its immediate parent. | Check only the terminal leaf; silently reduce depth; introduce a new lineage accumulator; or provide a fixed private witness for the root plus all sixteen delegated capabilities. | Reject the terminal-only and silent-depth reductions. The user approved measuring the fixed seventeen-entry private witness against real Compact compilation and Local Dev deployment before considering a representation change. | The temporary probe preserved current-root checks, every ancestor status, exact parent bindings, attenuation, and every issuance signature. |
| 11 | Compact accepted the ten-circuit ancestry source, but proving-key generation stopped making progress after 13:45 CPU time; both probe key files remained empty after 24:57 wall time. | Keep waiting without evidence; retain an unbuildable probe; weaken checks; or restore the verified baseline and stop at the architecture boundary. | Classify this narrowly as a pinned-toolchain key-generation feasibility failure. Remove the temporary probe, regenerate the nine-circuit baseline, and do not claim deployment or full M6 acceptance. | Baseline compilation completed in about five minutes; typecheck, all 18 package tests, all 88 repository tests, and `git diff --check` passed. No probe artifact remains. |
| 12 | A different ancestry representation could certify lineage at issuance and use a current-root Merkle multiproof at action time; Ledger 9 could also provide native Ed25519, cross-contract calls, and a newer ZKIR path. | Adopt certified ancestry immediately; migrate directly to Ledger 9; keep the failed fixed witness; or first run a pinned Ledger-9 canary of the same design. | After preserving the baseline in commit `b8710a43c7b324e348d19176f0a2659421866b5c`, the user authorized the issuance-certified ancestry plus current-root multiproof direction on the existing ledger-8 baseline. This did not authorize Ledger 9, a multi-contract split, or reduced delegation semantics. | Approved in principle; schema edits stopped when implementation analysis found that lineage certification alone cannot prove M5 scope attenuation. |
| 13 | M5 requires every child scope to be a strict subset of its parent across seven private set-valued dimensions. The current capability credential commits only each set's Merkle root. | Trust the delegator's signature; check the selected action against every ancestor root; stage a private issuance-time subset proof; introduce a different set accumulator; or change M5 to fixed/caveat-based scopes. | The user approved staged private attenuation and accepted that the total number of staged elements is observable. Individual dimensions, counts, values, ancestry depth, and paths remain private. | Implemented in the existing nine-circuit dispatcher and simulator-tested. Exact child roots are reconstructed from canonical empty trees; parent membership, strict narrowing, expiry, duplicate/incomplete staging, and prospective parent revocation are enforced. |
| 14 | The SDK's `StateBoundedMerkleTree` implicit padding produced a different root from Compact's canonical absent-leaf tree, so a root built by the old helper could not be reconstructed from the on-chain empty root one private insertion at a time. | Change the circuit's empty-root constant; materialize public zero leaves; or use one canonical sparse-path algorithm for both credential construction and staged insertion. | Keep Compact's canonical empty root and replace runtime scope construction with the same sparse `Bytes<32>` path semantics already used by credential status. This is an encoding correction, not a new authority or privacy model. | Found by the new exact-root test and corrected. Planner roots now equal signed credential roots for all seven dimensions, and membership paths still verify. |
| 15 | The allocator signed a state commitment, but v4 did not prove its M2 initial-state opening. Activation and runtime action IDs also have different existing hash domains. | Retain the allocator-only assertion or consume the already activated exact configuration; preserve both action domains rather than reinterpret history. | v5 opens a typed policy under the existing activation binding root and verifies the same-instance initial state. Two explicitly named action-hash fields preserve both domains; the namespace activator still attests their M2 correspondence. | 180 repository tests and ten real key pairs passed; fresh v5 deployment accepted. Final live allocation results appear in the dated continuation. No new authority, architecture or transaction circuit. |

On 2026-10-12, after reviewing the depth-16 failure and the possible
issuance-certified ancestry and ledger-9 investigations, the user approved a
local checkpoint commit of the current implementation and evidence. The
purpose of the checkpoint is to preserve the verified nine-circuit baseline
before the next architecture decision. It is not M6 acceptance, will not be
pushed by this task, and does not select either open option.

## Approved ancestry optimization and scope-attenuation boundary — 2026-10-12

The user subsequently authorized the issuance-certified ancestry plus
current-root Merkle multiproof direction on the existing ledger-8 baseline.
The intended optimization was:

1. verify each capability's exact parent, issuer, validity, depth, signature,
   and active parent status when the capability is admitted;
2. commit that certified link into a versioned capability-status leaf;
3. at action time, avoid re-verifying all historical issuance signatures;
4. prove that the certified root-to-terminal status leaves are all active under
   the exact current credential-status root with one shared-branch multiproof;
   and
5. retain fixed private padding so the public result does not disclose the
   actual delegation depth.

Source inspection stopped the schema edit before implementation because this
plan does not yet preserve the complete M5 attenuation invariant. A delegated
capability contains seven private set-valued scope dimensions: actions,
resource selectors, resources, purposes, recipient kinds, recipients, and
disclosure-policy IDs. M5 requires the child to be a strict subset of its
parent across those sets or time. The M6 credential currently commits one
Merkle root per set. Root equality can prove that two sets are identical, but
arbitrary unequal roots do not prove that every hidden child member belongs to
the hidden parent set.

Accepting the child merely because the parent holder signed its exact
credential is insufficient: a malicious or compromised holder could sign a
child containing values outside the parent's authority. Checking only the
terminal scope at action time would then accept privilege expansion and would
contradict the M5 negative tests. This shortcut is therefore not a viable
implementation of the approved optimization.

The concrete alternatives are:

1. **Action-time inherited membership.** Prove the selected value against all
   seven scope roots for every present ancestor. This preserves the existing
   private data model, but at depth 16 requires as many as 119 additional
   depth-20 paths before the session, status, state, nullifier, and receipt
   checks. It is larger than the already failed ancestry probe and is not the
   recommended ledger-8 direction.
2. **Staged private attenuation at issuance.** Commit exact ordered scope
   values and counts, then stage hidden child values through proofs that bind
   the child commitment and prove membership under the parent root. Finalize
   the capability status only after all seven dimensions are complete and at
   least one scope count or time bound is strictly narrower. This avoids
   repeating ancestor scopes at action time, but adds a multi-transaction
   credential-issuance protocol. Values and dimensions can remain private, but
   the number of observed staging transactions necessarily exposes at least
   the total number of staged scope elements unless the protocol introduces an
   explicit padded maximum.
3. **A new subset-proof accumulator.** Replace or supplement the seven Merkle
   set roots with a commitment scheme supporting efficient private subset
   proofs. This could give the cleanest runtime proof, but Compact 0.31.1 has no
   project-approved primitive for it; selecting and auditing one is a new
   cryptographic protocol decision.
4. **A fixed or caveat-based M5 scope model.** Use template-indexed bitsets or
   append-only restrictions so attenuation is cheap to prove. This changes the
   application-neutral M5 data model and may not represent open resource and
   recipient identifiers without new bounds.

The user approved option 2 and accepted disclosure of the total staged
scope-element count through the number of staging transactions. The seven
individual counts, dimension selected by each transaction, values, Merkle
paths, and actual ancestry depth remain private witness data. No padded maximum
or new product limit was introduced.

## Staged private scope attenuation implementation — 2026-10-12

The existing `updateRuntimeCredentialStatus` public entry point remains the
ninth transaction circuit and now dispatches four operations: direct
account/session issuance or revocation, capability-attenuation begin, one
private scope-element stage, and capability finalization. No tenth public
circuit, second contract, synchronization authority, Ledger-9 dependency, or
reduced delegation limit was introduced.

Capability credential version 2 adds seven exact private counts beside the
seven scope roots. Begin verifies the signed root or delegated credential,
exact parent/issuer bindings, current active issuer and parent leaves, depth
and time attenuation, per-dimension non-increase, and at least one strict time
or count reduction. It commits a certification and an all-empty private
progress object into a bounded public session keyed by the command nonce; it
does not activate the credential or consume that nonce.

Each stage proves that one hidden value is inserted at the next empty leaf of
one hidden dimension. For delegated credentials the same value commitment
must be a member of the exact parent dimension root. The circuit increments a
private per-dimension count and a public total progress index, then replaces
only the commitment to the private progress. Reusing an earlier progress
witness is rejected, which rejects duplicate or replayed stages.

Finalization requires the public total to equal the signed total and the
reconstructed seven roots and seven counts to equal the signed capability
credential exactly. It rechecks the current namespace issuer for a root
capability, or the current active account issuer and parent capability for a
delegated capability. Only then does it insert the version-2 active status
leaf, advance the credential-status root sequence, remove the temporary
session, and consume the command nonce. An expired session is removed on touch
without activating the capability or consuming the nonce.

The first off-chain planner implementation exposed an SDK boundary that was
not visible in the prior membership-only tests. `StateBoundedMerkleTree`
materializes and pads sparse `Bytes<32>` leaves differently from the canonical
absent-leaf path used by Compact. The resulting roots verified against paths
created by the same helper but did not equal roots reconstructed from the
contract's canonical empty root. The implementation now uses one explicit
sparse-path algorithm for scope construction, membership paths, staged empty
paths, and progress roots. This changes the not-yet-finalized M6 capability
commitment encoding but does not alter M2-M5 data or any deployed accepted M4
template history.

Compact 0.31.1 accepted the updated source, types, and privacy analysis and
generated all nine circuits. The enlarged
`updateRuntimeCredentialStatus.prover` is 169,921,908 bytes; its ZKIR is
212,903 bytes and binary ZKIR is 19,196 bytes. The first generation process
was interrupted after eight keys and left zero-byte dispatcher keys, so it was
not counted as success. A clean uninterrupted rerun completed with nonzero
dispatcher keys and regenerated TypeScript bindings.

The targeted runtime suite now covers exact planner reconstruction,
out-of-parent values, equal-scope non-attenuation, root-capability begin/stage/
finalize, duplicate staging, incomplete finalization, expiry cleanup, and a
fully staged delegated child whose parent is revoked before finalization. The
last case is rejected against the updated current status root and leaves the
child nonce unconsumed. A complete repository check and fresh Local Dev proof
run are still required before this slice can be called live-accepted.

## Implemented activation-admission slice

The new application-neutral package is
`packages/midnight-authorization`. Its implemented boundary currently includes:

- a canonical adapter from an active M4 `TemplateRecord` and immutable
  `ActivationRecord` to an exact M6 admission envelope;
- independent hashes for the namespace, template ID, exact M2 template
  content, namespace policy, proof-module binding manifest, M4 activation
  record, and Ed25519 approval evidence;
- rejection of inactive M4 records, changed template content, duplicate or
  insufficient recorded approvals, mismatched approval evidence, malformed
  hashes, and incomplete or duplicate action/module bindings;
- a deterministic depth-20 namespace-authority Merkle tree whose leaves are
  ordered by commitment bytes rather than actor names or caller order;
- Jubjub/Schnorr envelope signing and verification under the selected
  `midnight-jubjub-schnorr-v1` profile;
- explicit rejection of the Jubjub identity public key while remaining on the
  approved Compact 0.31.1 / ledger-8 stack;
- a depth-20 Compact Merkle commitment to the variable-length ordered binding
  manifest, with one complete action binding submitted per transaction;
- Compact `beginM4Activation`, `stageM4ActivationBinding`, and
  `finalizeM4Activation` circuits that reserve but do not consume a nonce at
  begin, enforce sequential indexes and exact manifest membership, require an
  exact active module record, and create the public template record only during
  atomic finalization;
- constant-size staging state consisting of the signed root/count, next index,
  rolling accumulator, pinned authority/module sequences, reserved nonce, and
  signed deadline rather than an unbounded on-chain bitmap;
- protocol block-time expiry and lazy cleanup on staging/finalization or a
  later begin for the same target; cleanup releases only temporary state and
  never activation history, and no standalone cleanup authority or transaction
  circuit remains in the current contract; and
- Midnight.js deployment, reconnect, provider, local-wallet, and public-only
  live-test adapters.

Compiler-managed files are package-local under
`packages/midnight-authorization/contracts/managed/permio-authorization`.
The hand-written Compact sources are
`contracts/permio-authorization.compact` and `contracts/schnorr.compact` within
that package. No file under the managed directory was edited by hand.

The root npm integration now includes `compile:compact`,
`test:midnight-authorization`, and `test:live:m6`; the ordinary root test suite
executes the package's simulator tests. Midnight dependencies are pinned in the
root lockfile to Midnight.js 4.1.1, Compact runtime 0.16.0, wallet SDK 1.2.0,
ledger 8 through the protocol package, and on-chain runtime 3.0.0.

## Simulator and compiler results

The following checks completed before the first live deployment attempt:

1. `npm install` completed with zero reported vulnerabilities.
2. `npm run typecheck` passed against the generated Compact binding.
3. `npm run test:midnight-authorization` passed 10/10 tests. The tests cover
   deterministic envelope binding, every security-relevant envelope field,
   altered M2 content, inactive M4 state, insufficient and duplicate recorded
   approvals, mismatched review evidence, missing/duplicate module bindings,
   altered signatures and nonces, the identity public key, a successful
   staged simulator admission, missing/altered/out-of-order/duplicate binding
   leaves, finalization before completeness, lazy expiry cleanup, explicit
   permissionless cleanup, nonce release and replay, stale roots, wrong
   deployment/network, altered content hashes, wrong authority kind, and an
   ineligible key/path.
4. In Ubuntu WSL, Compact devtool 0.5.1 invoked compiler 0.31.1 and
   `npm run compile:compact` succeeded for four circuits. The generated prover
   sizes are 21,585,028 bytes for begin, 9,969,287 for one binding, 21,585,755
   for finalization, and 280,645 for cleanup. Their ZKIR sizes are 37,426,
   31,868, 46,707, and 15,397 bytes respectively.

These results establish compilation and deterministic simulator behavior. The
separate live results below establish this activation slice on Local Dev, but
they do not satisfy the full M6 exit gate for the still-unimplemented runtime
authorization surface.

After the live failure was diagnosed and this log was updated, `npm run check`
passed end to end: documentation freshness, TypeScript, Solidity compilation,
6 protocol tests, 15 scenario-domain tests, 14 scenario-generator tests, 16
   scenario-governance tests, 13 context-account tests, 10 M6 admission tests, and
6 deployed-contract Hardhat tests. Compact compilation remains the separately
recorded WSL check above because the compiler is Linux-only on this workstation.

## First Local Dev proof and deployment attempt

The pre-existing Docker services were brought up without resetting their
persistent chain state or re-funding accounts. The observed stack was:

| Component | Observed result |
| --- | --- |
| `midnight-node:1.0.0` | healthy on port 9944 and producing/finalizing blocks |
| `indexer-standalone:4.3.3` | healthy on port 8088 and caught up to the node |
| `proof-server:8.1.0` | healthy on port 6300 |
| Compact compiler | 0.31.1 via devtool 0.5.1 in WSL |

`npm run test:live:m6` synchronized the first funded disposable local account,
constructed a real M4 activation using two generated Ed25519 reviewer keys,
built the namespace authority root, and generated the deployment proof. The
proof server completed its `/prove` request in approximately 1.4 seconds. No
mnemonic, signing secret, wallet state, private template payload, or witness was
printed.

The node accepted deployment transaction
`a0799596e569fcd2dfb664f52690d99a2ecc6c20728b86f99147415119fec393`
into its mempool and repeatedly revalidated it, but every block builder ended
with `HitBlockWeightLimit`; the indexer therefore correctly returned no
finalized transaction. The client was interrupted rather than allowed to wait
indefinitely.

## Local Dev block-weight diagnosis

The failure was isolated from the new circuit by restarting only the disposable
node to clear the interrupted mempool transaction and running the previously
established `../information-flow` local live-deployment test as a control. Its
transaction
`8d4e3e8e49fecfdd2052b675638a2e94b2ff2037f3847f58af61ae0d33a920ad`
was also accepted and repeatedly revalidated but could not enter a block.

The control transaction was decoded locally without printing its content. It
was 16,886 bytes and its cost against the indexed public ledger parameters was:

```text
readTime:      3,655,000,000  (0.1827500% of block limit)
computeTime:   5,445,054,576  (0.2722527288% of block limit)
blockUsage:           16,819  (1.6819% of block limit)
bytesWritten:         16,448  (32.896% of block limit)
bytesChurned:         15,432  (0.030864% of block limit)
```

The strictest ledger dimension was therefore 32.896%, not an oversized
transaction. Node logs showed the actual outer-runtime condition: on every
block the persistent dev chain ended one consensus session, started the next,
and rotated/stored the committee before reporting `HitBlockWeightLimit`. The
chain had been stopped while wall-clock time advanced, so its mandatory session
work was catching up and exhausting the node's outer block budget before an
ordinary transaction could be selected. The control client was stopped and the
node was restarted once more to clear that exact pending transaction while
preserving funded accounts and chain state. The node remains running so the
mandatory session sequence can advance naturally; no factory reset, chain-state
deletion, account re-funding, or architectural weakening was used.

## Successful staged Local Dev activation and cleanup

After the node caught up, its block builder consistently reported
`NoMoreTransactions` rather than `HitBlockWeightLimit`. The updated
`npm run test:live:m6` flow then completed against the unchanged persistent
Local Dev network and the same funded disposable account. It deployed contract
`af3198580ba42bacdf98f6fd4855a68bb0ad60440e618b1e24e6dca4a04ecb0e`.

The live expiry drill first opened a separately signed staging session in
transaction
`009dbed3da516ec75e9ec9da106159d350e4d6afa91821277c153c13574475af52`.
After the signed deadline passed according to protocol block time, the
permissionless cleanup circuit finalized in transaction
`00e525a41e08301cc0b18b598122a26c964651ba8fb3e989878598f083b39948a6`
and released the reserved nonce without creating a template record.

The exact M4 activation then used three separately finalized transactions:

| Step | Finalized transaction |
| --- | --- |
| Open signed staging session | `0042d87d25ad29d688a6c0ba97eadcafe0676215489293179cf4cc5013d3c8666a` |
| Validate action binding index 0 | `00f1dfcda59df13f104809909913e09296ecfacd1f43916932a59af94ec83ea7d0` |
| Atomically activate template | `0058ac8ece7d3e782c37b5fd33f674f21641cbd041541e07fb324e7165af43a429` |

The finalized template content hash was
`0x5a963d28ae59d097364fd272afa0505d2529094a11ef00f550ef22fcc8f85926`
and the signed envelope hash was
`0x930c5cd7d9b26967809a9c4d72596c516634b170ae37e83aa714db3d895537f0`.
The indexer returned one active template, one consumed admission nonce,
activation sequence one, one proof-module record, proof-module-registry
sequence one, zero remaining activation sessions, and zero reserved nonces.
The script rejected a replay, reconnected by the public contract address, and
read the same active-template count and activation sequence. No mnemonic,
private signing scalar, reviewer private key, private witness, or template
payload was written to the log.

## Staged-binding decision and implementation

M2 currently accepts a scenario template with an unbounded number of actions.
M6 requires template activation to fail when any exact action/module binding is
missing, unregistered, deprecated, revoked, or otherwise not active. Compact
0.31.1 circuits, however, have fixed-size inputs. The original single-call
envelope contained only `proofModuleBindingsHash`; that aggregate committed to
the off-chain manifest but gave the admission circuit no way to enumerate an
unbounded list and check every referenced module against the public module
registry.

This is not safe to resolve implicitly:

- trusting only the M4 adapter would weaken the stated Midnight activation
  guarantee;
- choosing a fixed array size would introduce a new M2 protocol limit; and
- staging bindings through multiple transactions would introduce a new
  admission lifecycle, accumulator encoding, cleanup, and concurrency model.

The user selected staged binding validation rather than a fixed M2 action limit
or a governance-attested aggregate that Midnight could not inspect. The
implemented protocol adds the exact Merkle root, binding count,
proof-module-registry sequence, and expiry to the signed envelope. Each
`stageM4ActivationBinding` transaction submits one complete action binding at
the next M2 action index. It proves membership under the signed root, checks
the exact registered module identity and receipt schema, and advances a
constant-size rolling accumulator. A missing, duplicate, altered, or
out-of-order binding fails.

The template remains inactive throughout staging. Finalization rechecks the
current governance authority and signed envelope, requires the module-registry
sequence to remain unchanged and the next index to equal the signed count, then
consumes the nonce and writes the immutable active record atomically.

Every session has a signed Unix-time deadline checked with Compact's
protocol-enforced block-time operations. Expired sessions are removed lazily by
stage/finalize or by a later begin for the same exact template target. The
permissionless `cleanupActivationSession` circuit also removes an expired or
sequence-stale session. Cleanup deletes the one constant-size staging record
and nonce reservation; it cannot remove a used nonce, active template, or
historical activation. An optional keeper can call the circuit promptly, but
no maintenance administrator or always-online service is trusted.

## Problem found in the prior M6 draft

The draft architecture named `threshold-approval-v1` as an initial Midnight
proof module and said reviewer approvals would be verified inside an activation
proof. That was incompatible with the selected boundary:

- M4 reviewer attestations are currently Ed25519 and are verified in
  `packages/scenario-governance/src/attestation.ts`;
- M4's immutable `ActivationRecord` stores the exact template target and the
  accepted reviewer IDs but is not itself a Midnight-signed envelope; and
- the pinned Compact 0.31.1 / ledger-8 environment does not provide the new
  Compact 0.35 ledger-9 Ed25519 verification path.

Leaving `threshold-approval-v1` in M6 would either require every M4 reviewer to
maintain a second Midnight-specific key or silently imply a Compact/ledger
upgrade. Neither choice was approved.

## Decision implemented in documentation

M4 remains the authority for:

- Ed25519 reviewer-signature verification;
- exact namespace, template ID, semantic version, and content-hash binding;
- eligible unique reviewers and duplicate rejection;
- namespace threshold enforcement and rejection state; and
- author/reviewer/governance separation of duties.

M6 v1 introduces `admit-m4-activation-v1`, a registry circuit rather than a
template-selectable proof module. The namespace-scoped
`governance-activator` signs the canonical admission envelope using the
allowlisted `midnight-jubjub-schnorr-v1` profile. The envelope binds the exact
template target, governance and proof-module-binding hashes, M4 activation
record hash, approval-evidence commitment, authority-root version and
sequence, target deployment, registry protocol version, and admission nonce.

Midnight verifies current key eligibility, the exact signature and target, and
nonce freshness before creating the immutable public template record. It does
not independently re-run the M4 reviewer threshold and documentation must not
claim that it does.

The admission key is not an administrator. It grants no authoring, review,
allocation, capability issuance, proof-module activation, retirement,
emergency revocation, or historical rewrite power.

## Reference implementation boundary

The sibling `../information-flow` checkout was inspected only for reusable
Midnight integration mechanics. Concrete reference points found there include:

- `src/midnight-wallet.ts`, which waits for `waitForSyncedState()` and exposes
  a stoppable wallet capability;
- scripts for redacted wallet diagnostics and a redacted live Preprod
  commitment test;
- deployment and reconnect by public contract address;
- compiler-managed output kept outside hand-written source; and
- a local proof-server configuration at `http://127.0.0.1:6300` using
  `proof-server:8.1.0`.

Permio will not import or copy the Information Flow application model,
contract state, named workflow, database, authority layout, deployed address,
wallet secret, synchronized checkpoint, or acceptance claim. Any reused
mechanic must be re-expressed against Permio's M2-M5 interfaces and tested as
Permio behavior.

## Reusable accounts and proof infrastructure

The workspace contains three existing actor-specific checkpoint directories:

```text
../information-flow/data/preprod-wallet-state/alice
../information-flow/data/preprod-wallet-state/bob
../information-flow/data/preprod-wallet-state/clara
```

They are disposable Preprod HD-account fixtures whose full historical sync has
already been retained. The directories are ignored and privacy-sensitive even
though the mnemonic is stored separately. Permio must not read, print, copy,
or commit their secret material. An opt-in Preprod adapter may reuse the
wallet capabilities and map them to generated Permio roles so synchronization
does not have to restart from genesis.

The mandatory M6 acceptance environment remains the pinned sibling
`../midnight-local-dev` ledger-8 stack:

| Component | Endpoint | Pinned version |
| --- | --- | --- |
| Midnight node | `http://127.0.0.1:9944` | `midnight-node:1.0.0` |
| Indexer | `http://127.0.0.1:8088/api/v4/graphql` | `indexer-standalone:4.3.3` |
| Proof server | `http://127.0.0.1:6300` | `proof-server:8.1.0` |

The documentation-only inspection confirmed the configured endpoint and the
three checkpoint directory names without reading secrets. A read-only request
to the local proof-server endpoint was blocked by the current process's socket
permissions, so this turn does not claim that the service is currently healthy
or unhealthy. M6 implementation must run the documented health check before
the first live proof test and record the observed version response.

## Documentation files changed for staged admission

- `packages/midnight-authorization/README.md` documents the exact begin, stage,
  finalize, expiry, and cleanup behavior.
- `docs/evidence/M6/architecture-decision.md` records the user-approved staged
  binding and automatic-cleanup decision.
- this log records compiler artifacts, the earlier infrastructure failure, the
  recovery evidence, and the exact successful Local Dev transactions.

The shared milestone-status Markdown and generated HTML were not edited for
this implementation slice.

## Proof-module governance implementation

The Compact contract no longer bootstraps an implicitly trusted proof module.
Every exact implementation now begins with the non-trusting
`proposeProofModule` transition. Its immutable proposal binds the module ID,
semantic version, implementation hash, implementation reference, source hash,
input-schema hash, configuration-schema hash, receipt-schema hash, compiler
hash, compatibility-policy hash, namespace, policy, and authority-root version
and sequence.

The implemented lifecycle and authority separation are:

| Transition | Required authority | On-chain effect |
| --- | --- | --- |
| propose | none; proposal grants no trust | creates exact status-1 record |
| review | `proofModuleReviewer` | records one unique eligible reviewer and advances the separate review accumulator |
| approve | `proofModuleApprover` | records one unique eligible approver and advances the separate approval accumulator |
| activate | `proofModuleActivator` | moves only a threshold-approved module to active |
| deprecate | `proofModuleApprover` | prospectively blocks selection by new template activations |
| revoke | `proofModuleEmergencyRevoker` | prospectively blocks new proof use without rewriting history |

The namespace authority-root record pins two independent configurable
thresholds. This test deployment used review threshold 2 and approval threshold
2. A reviewer or approver is keyed by the commitment of the complete eligible
authority leaf, so duplicate participation by the same leaf is rejected even
when the actor changes the command nonce. Reaching the review threshold does
not approve; reaching the approval threshold does not activate. The final
approval evidence commitment is the approval accumulator, not the review
accumulator.

The generated Compact surface now contains ten circuits:
`proposeProofModule`, `reviewProofModule`, `approveProofModule`,
`activateProofModule`, `deprecateProofModule`, `revokeProofModule`, and the four
staged-admission circuits. WSL devtool 0.5.1/compiler 0.31.1 regenerated all ten
managed circuits successfully. The largest generated prover in this slice is
`approveProofModule.prover` at 21,617,016 bytes; its ZKIR is 52,959 bytes.
The complete generated `keys/` and `zkir/` directories total 171,714,349
bytes. They are reproducible from the pinned Compact source and toolchain and
are ignored rather than committed. The generated TypeScript contract binding,
source map, declarations, and compiler metadata remain repository artifacts.

The simulator suite now passes 11/11 tests. The added module-governance case
checks unique reviewers, duplicate-review rejection, review threshold,
premature approval rejection, unique approvers, duplicate-approval rejection,
approval threshold, review/approval evidence separation, wrong-activator
rejection, activation, deprecation, emergency revocation, preserved timestamps,
and the exact registry sequence.

## Successful threshold-governance Local Dev run

The corrected two-reviewer/two-approver flow was deployed to the same pinned
healthy Local Dev stack as contract
`81f7597eba13e29d5ab7cebe7615b584ac813d1228f6d82246b12a3bc5e0f031`.
The synthetic local authorities are test fixtures only; they do not constitute
production human review or production governance approval.

| Event | Finalized transaction | Observed result |
| --- | --- | --- |
| propose exact test module | `0068f3b5d3e00414cc64548229c0e6aa57791fd7b8cecdf86d8013717f057408b8` | proposal recorded; no trust granted |
| reviewer 1 | `00f292e9d36f47f82f84a5fbdc010e72b5093410db65a293f9b41cf01db9cb9149` | review count 1 |
| reviewer 2 | `006fc9a30f9d083b15e5458b8ff3982e7bf236a443d4ce691318695948fadb6105` | review count 2; status reviewed |
| approver 1 | `0041750c0c9c1fc808bbf70933176e6e2f3901f92208fa0372e06c11226934b6e6` | approval count 1; still reviewed |
| activate before approval threshold | rejected before finalization | insufficient approval count cannot activate |
| duplicate approver | rejected before finalization | same eligible leaf cannot count twice with a fresh nonce |
| approver 2 | `003de659b76dfedb7c0256e4da529a7ce733aa69acb954ddccf29b247d2e7def35` | approval count 2; status approved |
| separate activation | `000a84e2a8be7b913d86caaa91aa2e9b2ee798c959ab8c41b6d878d403639b490f` | status active |
| expiry-session begin | `0034bd86427f69a0253cfbee066179bc41e89f2a6a62759bb97fc88950251aebb2` | temporary nonce reserved |
| permissionless expiry cleanup | `006251034d67e9b00369c58baa9911075eda564c00154ad30385c52fe53f3c716f` | session removed; nonce released |
| real activation begin | `00d87e9ed10e79e4326526c5ad0daa17202173f3d926376bcf6aaba0deca093201` | exact one-binding session opened |
| stage action binding 0 | `00f0af3350ee7348556c8ef6ad77fa9bfddd0e884a4c431856d5f10523b03a588e` | exact active module verified |
| finalize M4 admission | `00ad6653d6eb6174316863e88812765f364ebdf0dda64a32a7518f69f8f8a5a062` | immutable template activated |
| deprecate module | `003207e4b8e8e87e57d57118ad07988e36636b97a0aa26a7b08b383e1cdff98406` | prospective deprecation |
| emergency revoke module | `00519a4bf0700113332c271d713932a06868ba847470e7781c0d8cd6d047e67e5d` | prospective revocation |

The admitted M2 content hash was
`0x5a963d28ae59d097364fd272afa0505d2529094a11ef00f550ef22fcc8f85926`.
The final admission-envelope hash was
`0xd68c52d5cb861fc1542f01ff2c4d1da447648eddb2eb9c8d46a6358e77c85442`.
After activation the indexer returned one active template, one used admission
nonce, zero activation sessions, zero reserved nonces, one proof module, and
proof-module registry sequence 6. Replay failed and reconnect returned the
same template state. After deprecation and revocation, the exact module record
remained queryable at lifecycle status 6 and registry sequence 8, while the
historical active-template count remained one. Attempts to use the module
activator as deprecator and the module approver as emergency revoker both failed
with authority-scope errors.

## Resolved authority and runtime-key decisions

The user approved the following concrete choices after reviewing the original
decision boundary:

1. namespace root rotation uses a new `authority-root-governor` role and a
   configurable threshold of at least two unique eligible governors;
2. normal template retirement uses a separate `template-retirer` role, while
   emergency template revocation keeps the existing emergency-revocation role;
3. M5 retains Ed25519 identities and `ActionIntent` signatures, while M6 adds a
   versioned per-principal/session Midnight Jubjub/Schnorr runtime key bound to
   the exact M5 identity, capability, session, instance, context, and validity
   chain.

The Compact implementation now stores `authorityRootUpdateThreshold` in every
namespace root record. `submitAuthorityRootApproval` binds the exact old and new policies, roots,
versions, sequences, three next thresholds, effective time, and nonce. The
first unique governor records approval without changing the root; the second
reaches the threshold and installs the new root. Duplicate participation and
use of the governance activator as root governor fail.

`terminateTemplate` accepts lifecycle `active -> retired` only under authority
kind 12, and `active|retired -> revoked` only under emergency authority kind 5.
Both branches bind the exact active-template record commitment,
current namespace root, next global template lifecycle sequence, reason,
effective time, and nonce. Activation time and sequence remain immutable;
retirement and revocation append prospective termination facts.

The simulator test `rotates authority roots by threshold and keeps template
retirement separate` exercises the complete positive path plus skipped root
sequence, wrong root authority, duplicate governor, stale root, wrong retire
authority, and wrong emergency revoker. It also proves that a module admitted
under root version 1 can be prospectively deprecated under current root version
2 without rewriting the module's historical root reference. The package suite
passes 12/12 tests.

The runtime-key decision is approved but not yet implemented. No fallback
Ed25519 verifier, off-chain trust bridge, or replacement M5 identity protocol
has been introduced.

## Expanded-contract Local Dev deployment limit

On 2026-10-12, WSL Compact devtool 0.5.1/compiler 0.31.1 successfully rebuilt
the expanded contract with fourteen transaction circuits. TypeScript typecheck
and all 12 simulator tests passed. The required live test then verified the
existing containers as healthy:

| Component | Observed image/version | Observed health |
| --- | --- | --- |
| node | `midnight-node:1.0.0` | healthy on `127.0.0.1:9944` |
| indexer | `indexer-standalone:4.3.3` | healthy on `127.0.0.1:8088` |
| proof server | `proof-server:8.1.0` | healthy on `127.0.0.1:6300` |

`npm run test:live:m6` initialized and synchronized the disposable local wallet,
but the node rejected the contract-deployment transaction before any contract
address was created:

```text
transaction bytes: 36,225
RPC code: 1010
RPC message: Invalid Transaction: Transaction would exhaust the block limits
```

The node log showed the transaction validated for the mempool while subsequent
blocks continued normally with only their baseline extrinsics; the transaction
was never included. This is therefore not a Docker-health, wallet-sync,
proof-server, indexer, socket-permission, or Codex-approval failure. It is a
deployment-weight boundary reached by the expanded single Compact contract.

The prior ten-circuit build deployed successfully on this same pinned stack.
The new build adds root rotation and template retirement/revocation before the
two runtime proof families and credential-status transitions have even been
added, so continuing to append circuits would make the known deployment problem
worse. No local limit was raised, no checks were removed, and no multi-contract
workaround was introduced.

This requires an explicit architecture choice. The narrowest option is to
consolidate transaction entry points that share verification logic—for example,
one first-or-subsequent root-approval circuit and one status-aware template
termination circuit—while preserving the single registry contract and every
authority rule. The alternative is a separately approved multi-contract split,
which must define how exact registry state is trusted across contracts and how
atomic authorization ordering is retained. Increasing only the Local Dev block
limit would not demonstrate deployability under the intended network limits.

The official Compact 0.35 release notes say that cross-contract calls were
added in the ledger-9 toolchain line and explicitly direct contracts targeting
the current Mainnet era to remain on Compact 0.31.x. Consequently, the pinned
ledger-8/0.31.1 stack cannot be assumed to solve a split with native
contract-to-contract registry reads. A split would require either a new signed
state-synchronization protocol or the separately rejected-for-now ledger-9
upgrade, so it is not an implementation-only refactor.

## Approved root-approval entry-point consolidation

The user approved combining only the two equivalent authority-root approval
entry points. `beginAuthorityRootUpdate` and `approveAuthorityRootUpdate` were
replaced by `submitAuthorityRootApproval`. On its first call for an exact update
commitment, the circuit creates progress with count one and the first approval
accumulator. On later calls it loads that same progress, verifies that its
stored threshold still matches the current root, rejects a duplicate governor,
and advances the count. Reaching the threshold installs the new root and removes
temporary progress.

This consolidation does not combine approvals or transactions. The two test
governors still produce different Schnorr signatures and submit two finalized
transactions. Old/new root binding, exact sequence increments, a minimum
threshold of two, unique eligible leaves, policy scoping, validity windows, and
governance-activator privilege rejection are unchanged.

WSL Compact devtool 0.5.1/compiler 0.31.1 regenerated the contract successfully
with thirteen provable circuits, one fewer than the rejected build. The live
deployment rerun then produced a 33,809-byte transaction, 2,416 bytes smaller
than the rejected fourteen-circuit transaction, but the node again returned RPC
1010 `Transaction would exhaust the block limits` before creating a contract.
The separate future ledger-9 investigation and its compatibility gates are
recorded in `future-ledger9-upgrade.md`; no upgrade was performed.

A read-only query of the live node's public runtime constants returned a normal
block-length maximum of 786,432 bytes and a normal maximum extrinsic reference
time of 1,299,891,843,000. The 33,809-byte deployment is far below the byte
limit, so the rejection is not caused by raw transaction length. The remaining
constraint is deployment execution weight. Removing one duplicated verifier
entry point reduced transaction encoding but did not reduce verifier-installation
weight enough to fit the normal extrinsic limit.

## Approved lifecycle-entry consolidation and successful live run

The user approved combining module deprecation/revocation and template
retirement/revocation after the single root-entry reduction remained above the
deployment-weight limit. The final public call surface uses:

- `terminateProofModule`, which requires authority kind 8 only for
  `active -> deprecated` and kind 10 only for `active|deprecated -> revoked`;
- `terminateTemplate`, which requires kind 12 only for `active -> retired` and
  kind 5 only for `active|retired -> revoked`.

The requested target status is part of the signed lifecycle command. Selecting
another branch therefore changes the signed message, and every branch verifies
its own authority kind and legal source statuses before writing state. The
existing negative tests continue to reject a module activator as deprecator, a
module approver as emergency revoker, a root governor as template retirer, and
a template retirer as emergency revoker.

Compact devtool 0.5.1/compiler 0.31.1 rebuilt the contract with eleven provable
circuits. TypeScript passed and the simulator suite passed 12/12. The same
unmodified healthy Local Dev stack then deployed contract
`9dd8d0b9fac2eada9e40597b6f5ec783e9a966bd2097c16c826f89cb172c5d0e`
and completed the full live flow:

| Event | Finalized transaction | Observed result |
| --- | --- | --- |
| propose exact test module | `00544fb2eab2be4b7c49ef59c6d0a38e2b33c6368abcbcf47f53d37f1acec72f4a` | status proposed; no trust granted |
| reviewer 1 | `00a048d67509ae318e5088c0dc4f047335feca967a24e0d75b81a9e9f165e3b218` | review count 1 |
| reviewer 2 | `0079ed93f9bdd9cbaa6bbf1b537c14043bbd2da38701c011ae845d74a1ae46ed50` | review count 2 |
| approver 1 | `0014748375df725da27105a57fc99defbd7020e1c4561f1528b43541d73bd17a81` | approval count 1; activation still rejected |
| approver 2 | `00a3bcc87a3be249a5ecf14d0f5f3aee4393d775122620f97504a021dce551f19f` | approval count 2 |
| activate module | `005ea98a17d59add652d7998767d9203c98287546c96b1996a878fe7647e8ae3c6` | module active |
| open expiring staging session | `00accd18d070e71fcc85af6b2c76d79f4edb130d7425e6164f68bfc52eb9740295` | temporary nonce reserved |
| clean expired staging session | `008faedb806a83887c4a9134bad15c39dba8e4ff4b55ecd5484c563641decbb042` | session removed and nonce released |
| open real activation | `0008c07cdb8ca118bcc14c246df68678e9bed09e0ab9a3dd52ba911cb674b54488` | one-binding session opened |
| stage action binding 0 | `0073836d6fec1814ee49cf3aca33e5fcb1b9b478fab692bf21cd41fdae0c789fc6` | exact active module verified |
| finalize template activation | `00d9b8894e14165239e070694b46ddcdc5fddcc7f91c1005f172d53821be120cd1` | immutable activation sequence 1 |
| root governor 1 | `00fc8664ebe03e8d2114a8d0e13551d17745f62e0de57657b1e34272ec4c653cd5` | approval count 1; root unchanged |
| root governor 2 | `0084d53b1f52ba22659d33fcc4ee48e03289737d3e2fa74d1359c09cb4fa1e574a` | root version/sequence changed to 2/2 |
| deprecate module | `00d42350bac6761f6d9aeaa6eed4a86f49084a4e94e6f0c48c66c88319471ea13f` | status 5, prospective |
| emergency-revoke module | `00efe2eeebe8f0370dc37c26f87f67fc1f865a9f00aab755500fb8919bce93eb18` | status 6, prospective |
| retire template | `00aeecce18a51ff300584f07ea291f50dfd3ecc678390f495ec84f588b5e4ed6a0` | status 2, activation history retained |
| emergency-revoke template | `003369bef69824d7cbdb0f6b44b9946c94c91f6bff6ae1d5d302fc68f5a5182ac8` | status 3, retirement time retained |

The live negative calls rejected premature module activation, duplicate module
approval, replayed template admission, governance-activator root rotation,
duplicate root approval, module-activator deprecation, module-approver emergency
revocation, root-governor template retirement, and template-retirer emergency
revocation. These failures occurred before finalization and produced no state
transition.

Final indexed state reported proof-module status 6 and registry sequence 8,
template status 3, activation sequence 1, template lifecycle sequence 3, two
used template-lifecycle nonces, authority-root version/sequence 2/2, two unique
root approvals, and one retained historical template record. The live command
exited successfully.

## Current verification

1. The first sandboxed `npm run check` reached Hardhat and reported HHE22
   because the sandbox path did not identify the installed package as local.
   Re-running the same command outside that boundary succeeded.
2. The earlier `npm run check` passed documentation freshness, TypeScript,
   Solidity compilation, and all 80 then-current tests. A fresh full check is
   recorded after the module-governance changes below.
3. `npm run compile:compact` passed in Ubuntu WSL using devtool 0.5.1 and
   compiler 0.31.1, producing all ten managed circuit packages.
4. `npm run test:live:m6` completed the real Local Dev deployment, protocol-time
   expiry cleanup, staged binding validation, final activation, indexed-state
   checks, replay rejection, and reconnect checks recorded above.
5. `git diff --check` passed after the implementation and documentation edits.

5. After the proof-module changes, `npm run typecheck` passed and
   `npm run test:midnight-authorization` passed 11/11 tests.
6. The second `npm run test:live:m6` completed the exact two-reviewer,
   two-approver, separately activated module lifecycle, staged template
   admission, indexed-state checks, replay rejection, reconnect, authority
   separation, deprecation, and emergency revocation recorded above.
7. The final `npm run check` first reproduced the documented sandbox-only
   Hardhat HHE22 local-installation error after documentation and type-checking
   passed. The same command run outside that sandbox boundary passed
   documentation freshness, TypeScript, Solidity compilation, and all 81
   tests: 6 protocol, 15 scenario-domain, 14 scenario-generator, 16
   scenario-governance, 13 context-account, 11 Midnight authorization, and 6
   deployed-contract Hardhat tests.
8. After the approved root/template additions, `npm run typecheck` passed and
   `npm test --workspace @permio/midnight-authorization` passed 12/12 tests.
9. The subsequent required `npm run test:live:m6` did not deploy: the healthy
   Local Dev node rejected the 36,225-byte deployment transaction with RPC 1010
   because it would exhaust the block limits. No chain-facing acceptance claim
   is made for the new transitions.
10. After the approved root-entry consolidation, Compact compilation passed
    with 13 circuits, `npm run typecheck` passed, the Midnight authorization
    suite passed 12/12, and documentation/diff checks passed. The live rerun
    reduced deployment encoding to 33,809 bytes but received the same RPC 1010
    rejection. Public runtime constants confirmed that byte length was not the
    limiting dimension.
11. After the approved module/template lifecycle consolidation, Compact
    compilation passed with 11 circuits, `npm run typecheck` passed, and the
    Midnight authorization suite passed 12/12. `npm run test:live:m6` deployed
    and completed successfully on contract
    `9dd8d0b9fac2eada9e40597b6f5ec783e9a966bd2097c16c826f89cb172c5d0e`.
    A fresh `npm run check` then passed documentation freshness, TypeScript,
    Solidity/Hardhat compilation, and all 82 tests: 6 protocol, 15
    scenario-domain, 14 scenario-generator, 16 scenario-governance, 13
    context-account, 12 Midnight authorization, and 6 deployed-contract tests.

These checks complete the staged M4-admission and proof-module-governance
slices only. M6 remains incomplete until the separately specified authority and
credential-status root transitions, runtime proof families, state/nullifier
ordering, common receipt, privacy scan, and their required live negative cases
are implemented and recorded in `docs/evidence/M6/acceptance.json`.

## Runtime credential chain and credential-status transition — 2026-10-12

The user approved the recommended chain-specific credential design rather than
changing M5 identities from Ed25519:

1. a namespace `capability-issuer` signs the initial Midnight account binding
   and root capability;
2. a parent capability holder signs a delegated capability with that holder's
   bound Jubjub/Schnorr runtime key;
3. a subject account signs its session runtime-key binding;
4. the M5 Ed25519 `ActionIntent` remains unchanged, while the session runtime
   key signs the exact M6 intent commitment used by the Midnight proof; and
5. account, capability, and session commitments each occupy one private
   current-status leaf whose public root and sequence are stored by namespace.

The Compact source now defines fixed-size account, capability, session, intent,
scope-root, status-leaf, and status-command structures. Exported pure circuits
produce the exact commitments, Schnorr messages, and challenges. The TypeScript
adapter binds those structures to canonical hashes of the full M5 instance,
account, capability, session, and signed action intent. It rejects a mismatched
target, instance, context, subject, parent grant, parent holder, delegation
depth, validity window, or altered Ed25519 intent before producing an M6
runtime object.

Private scope arrays are represented by seven separate depth-20 roots for
actions, resource selectors, resources, purposes, recipient kinds, recipients,
and disclosure-policy IDs. This preserves exact membership checks without
publishing the capability scope. The tests prove that a permitted value has a
path and that an omitted value does not.

`updateRuntimeCredentialStatus` is one additional transaction circuit rather
than three credential-specific entry points. It accepts only `empty -> active`
or `active -> revoked`, binds the exact namespace, policy, authority-root
version/sequence, credential-status-root sequence, credential kind,
credential commitment, assigned depth-20 index, revocation authority, time,
and nonce, and atomically installs the derived replacement root with sequence
`n + 1`. Account issuance requires a current namespace `capability-issuer` and
binds the account itself as its revocation authority. Root-capability updates
use the namespace issuer; delegated capabilities use the parent holder's active
account credential; sessions use the subject's active account credential.
Every account-authorized command proves that exact account credential is active
under the same current status root before its Schnorr signature is accepted.

The first client implementation attempted to use
`StateBoundedMerkleTree.pathForLeaf` for an untouched sparse index. The runtime
correctly rejected this because that helper only returns paths for materialized
leaves. The final client does not weaken the protocol to sequential leaves or a
smaller tree. It derives Compact's leaf digest and exact ordered internal-node
`transientHash([left, right])`, calculates deterministic empty-subtree digests,
and produces a standard depth-20 sparse path for any index. The simulator
confirmed identical roots for different empty indexes, independent occupied
indexes `7` and `700001`, and exact replacement behavior.

One tooling false positive was also found. In native PowerShell, the command
name `compact` resolves to `C:\Windows\System32\compact.exe`, the NTFS
compression utility. A native `npm run compile:compact` therefore exited zero
without compiling the contract. The actual compilation was rerun through the
documented Ubuntu WSL login shell with Node.js 22.23.2, npm 10.9.8, Compact
devtool 0.5.1, and compiler 0.31.1. It compiled twelve transaction circuits
successfully. Generated bindings used by the tests are from that WSL run.

After these changes, `npm run typecheck` passed and
`npm run test:midnight-authorization` passed 18/18 tests. New negative coverage
includes an altered M5 intent, altered credential content, wrong Schnorr key,
altered parent-holder binding, unauthorized account revocation, duplicate
status index, altered active leaf, replay/stale status command, and a scope
value absent from the committed scope.

The final repository-wide `npm run check` first reproduced the documented
sandbox-only Hardhat HHE22 local-installation error after documentation,
TypeScript, and all non-Hardhat suites had passed. Re-running the identical
command outside that sandbox boundary passed documentation freshness,
TypeScript, Solidity/Hardhat compilation, and all 88 tests: 6 protocol, 15
scenario-domain, 14 scenario-generator, 16 scenario-governance, 13
context-account, 18 Midnight authorization, and 6 deployed-contract Hardhat
tests. `git diff --check` also passed.

### Required live test and new decision boundary

The required `npm run test:live:m6` was run immediately against the same
unmodified healthy Local Dev node `1.0.0`, indexer `4.3.3`, and proof server
`8.1.0`. Wallet synchronization completed and the script reported the stack
ready. Deployment then failed before contract creation:

```text
1010: Invalid Transaction: Transaction would exhaust the block limits
```

The rejected deployment transaction encoding was 31,837 bytes. The contract
contained twelve transaction circuits: the previously live-accepted eleven
governance/lifecycle circuits plus `updateRuntimeCredentialStatus`. No status
transaction could be submitted because no new contract address was created.
No local node limit was changed, and this failure is not represented as a live
credential-status pass.

This is stronger evidence than the earlier fourteen- and thirteen-circuit
failures: on the pinned ledger-8 stack, the accepted single-contract deployment
has no demonstrated capacity for even one required runtime-state circuit, while
M6 still requires two runtime authorization entry points. Transaction byte
length again does not explain the failure: 31,837 bytes is smaller than both
earlier rejected deployments and the prior successful eleven-circuit
deployment transaction; the rejection remains execution-weight-related.

Implementation stops at this architecture boundary. The affected requirements
are the approved single physical M6 deployment, credential-status transitions,
the two runtime proof families, atomic state/nullifier ordering, and the live
exit gate. Viable decisions requiring user approval are:

1. remain on ledger 8 and further consolidate existing transaction entry
   points to create enough deployment-weight headroom, while preserving every
   authority and transition rule;
2. approve a multi-contract design with an explicit synchronization trust and
   loss-of-atomicity analysis, because ledger 8 has no assumed native
   cross-contract-call boundary; or
3. activate the separately documented ledger-9/Compact upgrade investigation
   and revalidate the complete toolchain and deployment model before changing
   the baseline.

Raising only the local block limit would not satisfy M6 acceptance and is not a
listed architecture choice.

## Approved second entry-point consolidation — 2026-10-12

The user approved further consolidation inside the same physical Compact
contract. The change did not combine workflow transactions or authorities:

1. `approveProofModule`, `activateProofModule`, and `terminateProofModule`
   became one `governProofModule` transaction circuit;
2. the signed `nextLifecycleStatus` selects approval, activation, deprecation,
   or emergency revocation;
3. every branch retains its original authority kind, valid source state,
   threshold, duplicate-approval protection, current-root check, signature,
   effective time, and command nonce;
4. `cleanupActivationSession` was removed as a public transaction circuit;
   begin, stage, and finalize now remove only an expired or stale session when
   they touch it; and
5. template retirement/revocation remains the separately scoped
   `terminateTemplate` dispatcher.

Compact devtool 0.5.1/compiler 0.31.1 compiled the resulting nine transaction
circuits in Ubuntu WSL. `npm run typecheck` passed and
`npm run test:midnight-authorization` passed 18/18 tests. The first sandboxed
live call could not keep a WebSocket connection to `127.0.0.1:9944`; read-only
Docker checks outside that sandbox confirmed that the unchanged node 1.0.0,
indexer 4.3.3, and proof server 8.1.0 containers were all healthy.

The first unrestricted live run deployed the nine-circuit contract at
`53fe8be1b1a996b91b13122f550a8d21fa36655ec3ab3cd7cf1fcccebba289d1`.
It completed runtime-account status activation and authorized revocation, with
an unauthorized revocation rejected between them. The first module-approval
proof then returned HTTP 400. Proof-server logs showed the actual prerequisite:
the larger consolidated dispatcher required public parameters at `k=18`; the
server had only cached the `k=17` parameters and three downloads from the
official `https://srs.midnight.network/bls_midnight_2p18` endpoint failed. A
read-only host HEAD request subsequently returned HTTP 200 and a 50,332,036
byte content length. This failure was not a circuit assertion, deployment
rejection, or evidence that `k=18` was unsupported.

The unchanged test was rerun after the official endpoint became reachable.
The proof server downloaded and cryptographically verified the missing public
parameters, then the complete run passed on contract
`131ed4886a6419a949728289de8c67e176fddfb15f7bf2d058c12812de2627d7`.
No Local Dev limit or container configuration was changed.

| Live operation | Transaction | Observed result |
|---|---|---|
| activate runtime account status | `006e559e1ec74a42fed2e6404b67e96d773b63ccfd90cae78ecfb3cdc05acfa45c` | status-root sequence 1 |
| unauthorized account revocation | none | rejected before submission |
| authorized account self-revocation | `00cca188b1dc263248f6ba05ec6d3633dbac73c5b5456199d60b482d4a97494955` | status-root sequence 2 |
| propose module | `0088bb84d589afb2e947aad5fced91bf06606f34fcdff3cd43b26503b4e494f605` | proposal recorded, no trust |
| reviewer 1 | `00958f1e8ee433011d89048963bd9c5c6c7f4eabe4ad5606e8651e1640bd7f851a` | review count 1 |
| reviewer 2 | `0007acc17c06cba168f087f333cc7b6ea1478f8547ab140241a39c219e5c90892f` | review count 2 |
| approver 1 | `00aa0a640e9aa2f8556d7348b8f08870d2075a43c2a8dc56e4c95459082d8cce91` | approval count 1; no activation |
| approver 2 | `00acd9df83e7c39f657c581313ccc1b9dec51fd34113f30b45faf75f89f2463072` | approval count 2 |
| activate module | `003a44d6a8d671410d285ee3507ef9a48c1e28ad9d04860d66a5e2226b1fbea660` | separately authorized active status |
| open expiring session | `006597a993d4500100d0cfc2bd17a982ff742a3e2fa96c5aa4985547c6c34569e5` | temporary reservation created |
| open real activation | `00d944894f2669ad4decab134aa8db5454030d58ba8c16e9feb1d108a314157e95` | expired session automatically removed |
| stage binding 0 | `002d6a101605c184ecb8398ce4ec9a7336cb6369e08accaebdb2e59ef9e8f1eac1` | exact active module verified |
| finalize activation | `007e064b99c6ab29ac7015d768c119a45763f2e8709b04d36bceb4b6f46b79722f` | immutable template activation sequence 1 |
| root governor 1 | `0064643e00dc2a1dd772b6856570f2629e7477c98110a7493fb88ce87b86a6d228` | approval count 1; root unchanged |
| root governor 2 | `0088c81495faf3d258f0e7789797614d1323eb3dda9599d60351f9878b23902dc4` | root version/sequence 2/2 |
| deprecate module | `00e6355b9f472c3a5282502ad235e2a98bc3ed9751c0da5d9d8662a6272adb4e48` | prospective status 5 |
| emergency-revoke module | `0029469b0cf3e692400527fee9c7c11189c34b841ed15ba68f8c46b3125ef7ac5f` | prospective status 6 |
| retire template | `00d2ebcc1a7d7926c000706cbaa57cfc9dde1654231db2fa4e14b012faacbac429` | prospective status 2 |
| emergency-revoke template | `0040cf7a11aa12a368a1c2f34791380b078ced9a74499f2b8db852621541d5fc80` | prospective status 3 |

The same run rejected premature module activation, a duplicate module
approver, a root-governance privilege collapse, a duplicate root governor,
module deprecation/revocation privilege collapse, template
retirement/revocation privilege collapse, and admission replay. Indexed state
and reconnect both retained one historical active-template record, activation
sequence 1, template lifecycle sequence 3, proof-module registry sequence 8,
authority root version/sequence 2/2, and credential-status-root sequence 2.

After updating the package and root documentation with these concrete results,
`npm run check` passed documentation freshness, TypeScript, Solidity/Hardhat
compilation, and all 88 tests: 6 protocol, 15 scenario-domain, 14
scenario-generator, 16 scenario-governance, 13 context-account, 18 Midnight
authorization, and 6 deployed-contract Hardhat tests.

### Capability-ancestry decision boundary

The next runtime slice exposed a representation question that the previous
deployment consolidation does not answer. M5 permits delegation through depth
16 and revoking any ancestor blocks descendants prospectively. The current M6
capability credential commits only its immediate parent. A terminal runtime
proof therefore cannot check only the terminal status leaf: that would accept
a descendant after an older ancestor was revoked.

The concrete choices are:

1. a fixed maximum-depth private witness containing every ancestor credential,
   issuance signature, and current active status proof; this preserves M5
   semantics exactly but may create a very large ledger-8 circuit and requires
   a privacy-safe padding design;
2. a new hierarchical lineage/revocation accumulator whose single terminal
   proof represents all ancestor status; this is more scalable but changes the
   approved current-status representation and requires a new issuance and
   revocation protocol; or
3. explicitly narrow M6 v1 below M5's supported depth; this is simplest but is
   a deliberate product limitation and cannot be introduced silently.

No runtime family was coded past this boundary and no weaker terminal-only
status check was introduced.

The compiled artifacts illustrate why the first option requires measurement
rather than assumption. The current single-path credential-status circuit has
a 21,623,581-byte prover key, while the branch-heavy consolidated module
dispatcher required `k=18` public parameters and has an 84,985,364-byte prover
key. These sizes do not by themselves prove that a depth-16 ancestry witness
is infeasible, but sixteen independent depth-20 paths plus multiple Schnorr
verifications cannot be treated as a small extension on the pinned ledger-8
stack.

### Approved depth-16 witness feasibility result

The user approved option 1 from the capability-ancestry decision boundary:
preserve M5's maximum delegation depth of 16 with a bounded private witness,
then treat real Compact compilation and Local Dev deployment as immediate
feasibility gates. No permission was given to reduce the supported depth,
replace the current-status tree with a lineage accumulator, weaken ancestor
revocation, or split the physical contract.

The official Compact reference confirms that vectors have compile-time-fixed
length, `for` loops are compile-time bounded, and vector elements may be
indexed by a loop variable. The release notes for toolchain 0.31 additionally
record support for generic bounded-loop limits and workarounds for failures in
untaken conditional branches. This made a fixed private vector syntactically
viable without publishing its used length. Sources consulted on 2026-10-12:
<https://docs.midnight.network/compact/reference/compact-reference> and
<https://github.com/midnightntwrk/compact/releases/tag/compactc-v0.31.0>.

A temporary `probeRuntimeCapabilityAncestry` entry point was therefore added
to the existing nine-circuit contract. It was deliberately not a standalone
toy contract: the feasibility question includes the weight and generated
artifacts of the already-required M6 deployment. The probe was non-mutating
and returned only constant `true`. Its private witness contained 17 fixed
entries: the root capability and all 16 possible delegated capabilities. It
checked:

1. the exact current authority-root version and sequence;
2. the exact current credential-status-root sequence;
3. root capability-issuer eligibility under the namespace authority root;
4. a contiguous private capability prefix with no public length;
5. every present credential's exact target, instance, context, subject account,
   validity window, delegation depth, and current active status path;
6. exact parent-capability and parent-holder account commitments;
7. non-widening time and delegation-depth bounds;
8. the root namespace-issuer Schnorr signature and every delegated issuer
   Schnorr signature;
9. the exact terminal capability commitment; and
10. the terminal subject account's validity and active current-status proof.

The first source compile identified a Compact 0.23 indexing restriction:
`entries[i - 1]` is not accepted in a loop whose range includes `i = 0`, even
when it appears only in the `else` branch of `if (i == 0)`. Root verification
was moved outside the delegated-entry loop, whose range then began at one.
That was a semantics-preserving source correction, not an architectural
workaround.

The corrected WSL command was:

```text
wsl.exe bash -lic 'cd "/mnt/c/Users/GEB/Documents/Projects/Midnight Buildathon/Permio-m6-m8-midnight-delivery" && npm run compile:compact'
```

Compact devtool 0.5.1/compiler 0.31.1 accepted the contract and printed
`Compiling 10 circuits:`. It emitted a 483,918-byte
`probeRuntimeCapabilityAncestry.zkir` and a 44,311-byte binary ZKIR. For
comparison, the largest existing dispatcher,
`governProofModule.zkir`, is 206,700 bytes.

Key generation did not complete. `zkir compile-many` initially consumed one
full CPU core and approximately 810 MB of resident memory. It accumulated 13
minutes 45 seconds of CPU time, then stopped accruing CPU time. Process
inspection showed 26 threads with the process waiting in `futex_do_wait`. Both
`probeRuntimeCapabilityAncestry.prover` and its verifier remained zero bytes.
The final snapshot after 24 minutes 57 seconds of wall time still showed 13:45
CPU time, the same wait state, and zero-byte outputs. After more than eleven
minutes of confirmed no progress, the diagnostic compile was interrupted.

This observation is classified precisely as a pinned-toolchain key-generation
feasibility failure. It is not a successful Compact compilation, a proof-server
failure, a Local Dev deployment rejection, or evidence of a particular ledger
block limit, because no complete keys or deployable contract were produced.

The temporary probe source was then removed. The same WSL compiler regenerated
the original nine transaction circuits successfully on the same machine and
toolchain. During restoration, `zkir` used multiple CPU cores productively and
completed in approximately five minutes. The managed directory again contains
only the nine baseline prover/verifier pairs; no probe source, binding, ZKIR,
or key remains.

The fixed-depth approach failed before it could reach its required Local Dev
deployment gate, and the probe did not yet include session verification,
action-intent verification, seven scope-membership proofs, allocation evidence,
nullifier/state ordering, or common receipt emission. Adding those omitted
requirements would not make the failed key-generation gate smaller.

Implementation stops at the prescribed architecture boundary. The affected
requirements are full depth-16 M5 ancestry, prospective ancestor revocation,
both runtime proof families, atomic state/nullifier ordering, common receipts,
and the M6 live exit gate. Continuing requires the user to choose among a
different ancestry/revocation representation, an explicitly smaller supported
delegation depth, or another explicitly evaluated architecture. No weaker
terminal-only check or silent fallback has been retained.

Post-restoration verification passed:

- `npm run typecheck`;
- `npm run test:midnight-authorization`, 18/18 tests; and
- `npm run check`, including documentation freshness, TypeScript, Solidity
  compilation, all 82 non-Hardhat tests, and all 6 Hardhat contract tests.

`git diff --check` passed, and a repository search confirmed that no
`probeRuntimeCapabilityAncestry` or `RuntimeCapabilityAncestry` symbol remains.
No `docs/evidence/M6/acceptance.json` was created because M6 has not satisfied
its runtime and live-chain exit gates.

## Exact scope-uniqueness optimization boundary — 2026-10-13

The staged attenuation tests exposed a soundness gap in the first implementation:
the circuit checked that each submitted child path started at an empty leaf, but
did not prevent the same hidden value hash from being placed at two different
leaf indexes. A repeated value could therefore inflate a private dimension count
and make an equal effective scope appear count-narrower. A negative simulator
case now attempts that substitution with a valid second path and requires
rejection.

The first correction committed a private canonical-order cursor consisting of
the last dimension and last 32-byte value hash. Each dimension is staged in
strict little-endian hash order, so duplicate values are rejected before their
Merkle insertion. Seven per-dimension cursors were reduced to one cursor because
dimensions themselves are monotonic and final exact counts prevent skipping a
required dimension. This preserved the approved privacy boundary: the cursor,
dimension, value, and paths remain private, while only the already accepted
total element count and transaction count are observable.

Compact 0.31.1 frontend compilation succeeded, but the exact 256-bit relational
comparison moved `updateRuntimeCredentialStatus` from the prior `k=19` class to
`k=20`. ZKIR mock compilation measured 568,629 rows for the two-limb comparator.
The `k=20` public parameter file was downloaded and verified in the WSL cache
(201,326,980 bytes), but isolated single-worker proving-key generation terminated
without producing either key. A retry on WSL's native Linux filesystem caused
the Ubuntu distro to enter `Wsl/Service/E_UNEXPECTED`; the exact distro was
terminated and restarted only after approval. No source or security check was
removed to make that run appear successful.

The following semantics-preserving probes were then measured against the same
nine-circuit source and pinned toolchain:

| Probe | ZKIR model | Result |
|---|---:|---|
| inequality-only diagnostic | `k=19`, 501,493 rows | establishes the non-comparator baseline; not retained |
| exact 256-bit comparison moved outside the operation branch | `k=20`, 567,457 rows | compiler workaround avoidance saved only 1,172 rows |
| exact one-hot first-differing-byte witness | `k=20`, 548,981 rows | exact, but still too large for the local key gate |
| one-hot witness with internally selected bytes | `k=20`, 548,734 rows | saved only 247 additional rows |
| exact eight-step 32-bit ordering state, conditional selector | `k=20`, 591,246 rows | extra pending-state and control-flow cost exceeded the comparator saving |
| exact eight-step ordering with fold selector | `k=20`, 585,646 rows | improved selector, still infeasible locally |
| flattened eight-step transition | `k=20`, 571,733 rows | removed 13,913 rows, still in the failing key class |
| strict 64-bit high-prefix order | `k=19`, 517,658 rows | locally feasible model; not adopted without approval |

The 64-bit order retains exact duplicate rejection: identical 256-bit hashes
always have identical prefixes and cannot be staged twice. It does not widen a
scope or grant authority. Its tradeoff is deterministic availability: two
distinct hashes with the same high 64 bits cannot coexist in one scope
dimension. For one million independently distributed values, the approximate
birthday-collision probability is 2.7e-8; real Permio scopes are expected to be
orders of magnitude smaller, but the representability change is still explicit
protocol behavior and cannot be adopted silently.

The unsuccessful staged-order probe was fully removed. The Compact source was
restored to the exact 256-bit comparison and `--skip-zk` regenerated matching
contract metadata and TypeScript/JavaScript bindings. The worktree therefore
does not currently contain the unapproved 64-bit rule or the failed pending
ordering state. M6 remains incomplete at this decision boundary.

## Approved 64-bit ordering implementation and verification — 2026-10-13

The user approved the recommended high-64-bit ordering rule after the exact
comparison probes above. The retained Compact helper extracts bytes 24-31 as a
little-endian `Uint<64>` and requires strict increase within each monotonically
ordered scope dimension. The cursor still commits the full preceding hash;
Merkle leaves and parent-membership proofs still use the full 32-byte value.
Identical hashes always have equal ordering keys and therefore cannot inflate
the certified count. Distinct hashes with equal keys make that dimension
unrepresentable in this credential version. The random-input collision estimate
is an availability observation, not a probabilistic authorization check.

`runtimeScopeOrderKey` and `assertRuntimeScopeHashesCanonicallyOrderable` now
provide the same encoding and collision guard to TypeScript callers. Each
scope-tree builder rejects exact duplicate inputs first, rejects a distinct-hash
ordering-key collision before creating its Merkle root, and sorts by the agreed
key. Collision errors omit the private hashes. Tests include a synthetic pair
that differs in byte zero but shares bytes 24-31, an exact duplicate, and an
endianness vector with byte 24 equal to 2 and byte 31 equal to 1, whose key must
be `0x0100000000000002`. The existing simulator attack substitutes the first
value into a valid second empty insertion path and must fail canonical order.

Frontend-only regeneration and TypeScript passed, followed by all 22 package
tests. Full key generation then succeeded with the exact command:

```text
wsl.exe -d Ubuntu-24.04 -- bash -lic "cd '/mnt/c/Users/GEB/Documents/Projects/Midnight Buildathon/Permio-m6-m8-midnight-delivery' && RAYON_NUM_THREADS=1 TOKIO_WORKER_THREADS=1 compact compile +0.31.1 packages/midnight-authorization/contracts/permio-authorization.compact packages/midnight-authorization/contracts/managed/permio-authorization"
```

The compiler exited zero with nine circuits. All 18 key files were nonempty;
`updateRuntimeCredentialStatus.prover` is 169,945,774 bytes and its verifier is
2,311 bytes. Key writes ran from 12:36:53 through 12:45:10 Asia/Shanghai. The
approved dispatcher model is `k=19`, 517,658 rows. This is complete key-generation
evidence, not evidence that a node has accepted the resulting proofs.

The live script was extended to open a capability-attenuation session, stage
two action values plus one value in each of the other six private dimensions,
and finalize the exact root capability. The eight stage transactions exercise
the same-dimension comparison as well as dimension advancement. The final
indexed root must match the local status tree, the session must be removed,
and its nonce must be consumed. The root sequence is expected to advance only
at account issuance (1), capability finalization (2), and account revocation
(3). Public milestone events are now persisted under ignored `logs/` using a
unique per-run JSONL filename, including individual stage transaction IDs and
counts without values, dimensions, hashes, credentials, or paths.

The initial live attempt failed before deployment because the node WebSocket
closed with code 1006. `docker ps --all` showed the three exact existing Local
Dev containers had exited about ten hours earlier. Running
`docker compose -f standalone.yml start` in the pinned sibling checkout
restarted them without recreation. All three reported healthy; node `/health`
returned 200 with `isSyncing:false`, proof `/version` returned 200 and `8.1.0`,
and a POST GraphQL `{ __typename }` query returned `Query`. A GET to that
GraphQL endpoint returned 405 as expected for a POST-only request path.

A subsequent run deployed
`c15c183f5d8ecc97180e0c0fa4b545b3cf0749e99b330dc4515c0b6bbebfb86d`
but was interrupted during its first runtime proof. The process was confirmed
absent; a read-only indexer query showed status-root sequence 0, no attenuation
sessions, and no active templates. No credential transaction from that run is
claimed accepted. The run with persistent evidence subsequently deployed
`33bd07e442b9eaee7f05df49ffe268f327ae76d6f4d90452e326c51ae1d519c5`;
its final result is recorded below when observed.

That run accepted account issuance at 13:23:25 Asia/Shanghai (transaction
`002f88fa891002e18736fd20554b811a8d1517c2458c7af1824e79025729d89013`)
and opening the eight-element session at 13:25:32 (transaction
`00fad6f6b2ace4784e81ed9144f3e3f6cb7df5a120226c23110d28f004f4955199`).
Proof-server operational logs measured 110.06 seconds for the first large proof
and 100.26 seconds for begin, plus transaction finality/indexing time. This
exposed an inadequate test-fixture budget: the old 1,200-second staging deadline
could expire before all eight stages and finalization completed. The client was
stopped deliberately and the synthetic fixture was extended to a 5,400-second
staging deadline, 7,200-second capability lifetime, 10,800-second account lifetime,
and 14,400-second instance lifetime. Contract expiry semantics are unchanged;
the earlier accepted account and temporary session remain on the disposable
local chain and are not counted as completed capability activation.

`npm run check` initially stopped at sandboxed Hardhat resolution with HHE22.
The same command with the required filesystem access exited zero: all three
generated-document freshness checks, TypeScript, Solidity build, all 86 package
tests, and all six Hardhat tests passed. No generated HTML or shared milestone
status file was changed. The subsequent fixture-time adjustment also passed
TypeScript; it changes only synthetic live-test lifetimes.

Review of `CapabilityAttenuationPlan.stageNext()` found a client retry bug:
child insertion happened before `parentTree.pathForHash`, so a missing parent
value could throw after partially mutating the plan. Parent membership now
resolves before insertion. The negative test snapshots progress before the
invalid value, retries the same invalid step, and requires identical progress
after both failures. The separate circuit collision test now also substitutes
a different full hash with an identical 64-bit ordering key at the second valid
insertion path and requires canonical-order rejection. The updated package
suite passes 22/22. These changes do not alter the compiled contract or keys.

### Live scope activation result on the retained build

The corrected live run deployed
`2afdc9f5e6e38daead69cd4faf09d7c5ea517b52b13063df7f197cfc22a12128`.
Account issuance reached status-root sequence 1. The capability session opened
at 13:32:44 Asia/Shanghai, and eight separate scope-element transactions were
accepted between 13:34:37 and 13:48:50. The second transaction exercised the
strict comparison between two distinct values within the same dimension.

Independent read-only indexer checks at four and eight staged elements showed
status-root sequence 1 and only one consumed credential-command nonce (the
account issuance). Thus neither partial staging nor complete staging by itself
activated the capability. Finalization at 13:50:44 succeeded in transaction
`004d9cdba11f11ff2eae02d5c68f84df7854571899927a85dd498d8bae115640e9`:
the indexed root equaled the expected local tree, its sequence became 2, the
temporary session was absent, and the capability nonce was consumed.

The accepted begin-to-finalization interval was 1,080.015 seconds (18 minutes),
including eight stages and finalization; staging averaged about 121 seconds per
element. These are observed local costs for this build, not a production
throughput claim. The stack is node 1.0.0, indexer 4.3.3, proof server 8.1.0;
the native client is Node.js 24.13.1/npm 11.8.0. Compiler metadata records
Compact compiler 0.31.1, language 0.23.0, and runtime 0.16.0.

SHA-256 fingerprints of the retained artifacts are:

- Compact source: `c073e130a3e23e1e758117e31ee5e3fb859099e4bee0b590b9babdbcdae4ebce`;
- dispatcher prover: `40d056b67a064200890a732cd9c3c43335aa7d77ec225557ae7cf6818f6a35b0`;
- dispatcher verifier: `48936bbbdddea04870a2e1ef3966847eaf5df6bbd0dd206035bf9d24d62c5682`.

The public events are preserved in ignored
`logs/m6-live-2026-10-13T05-28-31.203Z.jsonl`. This live result covers root
capability staging, the same-dimension order comparison, exact-root/count
finalization, and status-root atomicity. Delegated parent-subset and
parent-revoked-during-staging cases remain simulator evidence at this slice;
their required live acceptance is not claimed. The action-time current-root
ancestry multiproof, two runtime authorization families, state/nullifier
ordering, and common receipts remain outstanding, so M6 is incomplete.

Cleanup verified the two WSL-root diagnostic key files were zero bytes and
removed exactly those files. The two named temporary probe directories were
already absent. The full managed key set and public-parameter caches were
preserved.

### Proof-server memory failure after successful scope verification

The same run then accepted account self-revocation at 13:52:37, transaction
`00138a8da2dd389f6aa67b9fb613c58240e40edf6e4b6bf130c8c3b01ff3d390e3`,
and verified the expected status-root sequence 3. An unauthorized revocation
was rejected by the generated circuit's client preflight; it was not submitted
as a negative transaction and is not described as node rejection evidence.

Module proposal and two module-review transactions were accepted, but the
first module-governance approval failed when `/prove` stopped accepting
connections. The runner exited 1 with `ECONNREFUSED 127.0.0.1:6300`.
`docker inspect` confirmed the proof server exited 137 with `OOMKilled:true`
at 13:54:18 Asia/Shanghai. Node and indexer remained healthy. Earlier operational
samples showed the large proofs using roughly five CPU cores and 5.8-6.2 GiB
inside the 7.648-GiB Docker VM; the exact allocator/cache cause of the later
OOM was not established. The full combined run is recorded as failed, despite
the individually accepted credential transactions.

Only `midnight-proof-server` was restarted with `docker start`; no ledger,
indexer, container data, image version, or proof rule was reset or changed.
The live runner now supports a visibly labeled `--governance-only` regression
mode on a fresh deployment of the same compiled nine-circuit contract. It omits
runtime credential testing in that process and reports that scope in both
initial and final events; it cannot stand in for the separately recorded
runtime evidence or for a successful combined run. This lets the remaining
existing governance, admission, replay, lifecycle, and reconnect checks execute
after proof-server recovery without repeating the successful long scope phase.

The first invocation exposed the runner's pre-existing positional account-file
argument: the new flag was interpreted as a filename and failed with ENOENT
before wallet startup. Argument parsing was corrected to preserve one optional
account-file path and recognize `--governance-only` independently, rejecting
unknown options. The corrected command is
`npm run test:live:m6 -- --governance-only`; its observed result follows below.

The scoped regression exited zero on deployment
`24eb108bf0d185370b0bb7e538f3e6924d77f82e2afa8509e3fc2767dfca8849`.
It ran from 14:00:22 through 14:12:08 Asia/Shanghai and accepted module proposal,
two reviews, two separate approvals, activation, expired-session cleanup,
template binding/admission, two-governor authority-root rotation, module
deprecation/revocation, and template retirement/revocation. Generated-circuit
preflight rejected premature activation, duplicate approvals, replay, and
privilege-collapse attempts. Reconnect and final indexed-state assertions
passed: one historical template, template activation sequence 1 and lifecycle
sequence 3, two consumed lifecycle nonces, module lifecycle 6 and registry
sequence 8, authority root version/sequence 2/2, two root approvals, and no
pending root-update progress.

After proof-server restart, an independent query of the earlier credential
deployment still showed status-root sequence 3, zero attenuation sessions, and
three consumed credential-command nonces. The accepted credential state was
therefore preserved across that service restart. The fresh governance process
was sampled at roughly 4.37 GiB during proving; this observation does not
establish why the earlier mixed workload exhausted memory.

The final `npm run check` on the completed planner and runner changes again
exited zero: document freshness, TypeScript, Solidity, 86 package tests and
six Hardhat tests. `scope-uniqueness-verification.json` records the source/key
fingerprints, exact commands, versions, transaction IDs, indexed snapshots,
separate phase results, OOM failure, and remaining M6 gates. Its
`milestoneComplete` field is explicitly false. No M6 acceptance file, shared
milestone-status edit, generated HTML change, commit, or push was made in this
optimization slice.

## Constrained prover profile and delegated live coverage — 2026-10-13

Continuation first checked the repository views. The Permio wiki still describes
the committed M1-M5/Monad layout and omits this uncommitted M6 branch. The local
index health check points to the sibling Information Flow repository, so it was
not used as a Permio index. Exact current source and tests remain authoritative.

The original proof-server process, after the successful governance-only run,
held 5,704,444 KiB RSS while idle, with a high-water mark of 6,565,472 KiB and no
swap. The VM reported 8,019,580 KiB total and only 1,406,916 KiB available.
`/ready` reported zero processing/pending jobs. Its installed 8.1.0 help confirms
two proving workers, an unbounded queue (capacity zero), and a 600-second job
timeout by default. The exact allocator/cache reason for the previous OOM is
still unproven; these measurements justify testing bounded concurrency.

Official version-matched sources inspected were
`midnightntwrk/midnight-ledger`, ref `ledger-8.1.0`, files
`proof-server/src/main.rs`, `worker_pool.rs`, `lib.rs`, and `endpoints.rs`.
They show a shared asynchronous proving pool using blocking tasks and a
separate Actix HTTP worker pool. They also show that verbose/debug logging
formats the raw proof request as hex. The new profile deliberately omits `-v`;
private proof inputs must not enter diagnostic logs. References:
<https://github.com/midnightntwrk/midnight-ledger/blob/ledger-8.1.0/proof-server/src/main.rs>,
<https://github.com/midnightntwrk/midnight-ledger/blob/ledger-8.1.0/proof-server/src/worker_pool.rs>,
<https://github.com/midnightntwrk/midnight-ledger/blob/ledger-8.1.0/proof-server/src/endpoints.rs>,
and <https://docs.midnight.network/guides/local-proving>.

`scripts/local-midnight-proof-server.yml` uses the existing 8.1.0 image with one
proving worker, queue capacity one, `RAYON_NUM_THREADS=4`, and a four-CPU quota.
This changes local process concurrency, not proof rules, contract code, circuit
count, ledger limits, signatures, network, or dependency versions. No larger
VM budget or toolchain upgrade was introduced.

Only the public `/.cache/midnight` parameters were copied from the original
container into ignored `logs/m6-proof-server-public-cache/`. This includes
the 100,663,684-byte k=19 parameter file and public built-in DUST/zswap proving
assets; no mnemonic, wallet state, credential, or witness was copied. After
checking zero active and pending jobs, the original prover was stopped and
preserved. The new `permio-m6-proof-server` took port 6300. Node and indexer
stayed running and the pinned `midnight-local-dev` checkout remains clean.

Both old and new containers resolve to the identical cached image ID and
repository digest:
`sha256:801bbc0340e9e96f16735f77b523f23c7459e3359842f7c79c2c53f4e994d531`.
The new CPU quota is 4,000,000,000 nanocpus, versus the original's zero/unlimited.
Startup reported four HTTP workers; `/version` returned 8.1.0 and `/ready`
reported capacity one with zero jobs. Before proving, Docker reported 4.121 MiB
for the new process. This is a cold-start measurement, not proof that sustained
memory is fixed.

The default live runner now additionally issues a second account, opens a
holder-signed delegated capability with one action instead of its parent's two,
stages all seven child values with corresponding private parent-membership
paths, and finalizes only when exact roots/counts and current parent/issuer
status match. The second account and child finalization advance the status
sequence from 2 to 3 and 4; subsequent owner-account revocation reaches 5.
Only public counts and transaction references are logged. This is the existing
approved attenuation architecture exercised against the real deployment, not
a new proof family or receipt format.

TypeScript passed before starting `npm run test:live:m6` at 14:34:13
Asia/Shanghai. The public log for this attempt is
`logs/m6-live-2026-10-13T06-34-11.724Z.jsonl`. Its observed result will be appended
after the combined credential/governance workload completes.

## Private current-status multiproof preparation — 2026-10-13

While the unchanged compiled contract ran its sustained live test,
`credential-status.ts` gained an off-chain shared-branch witness builder.
Each input membership path must have depth 20, agree with its exact index,
and reconstruct the same Compact root. Output leaves are strictly increasing
by index; siblings are consumed once in ascending level/parent-index order.
The host verifier requires an external expected root and Uint<64> sequence,
reconstructs the special Bytes<32> leaf layer using the generated Compact
primitive, then hashes interior Field pairs. Missing/extra siblings, altered
leaves, duplicate/out-of-order indices, and stale snapshots reject.

The new test file explicitly separates membership from authorization: revoked
and empty leaves can have valid memberships. No parent certification, active
predicate, account expiry, intent authorization, circuit, or common receipt is
claimed by this helper. The 35-leaf fixture represents only the capacity shape
of 17 capabilities, 17 accounts, and one session, not a proven delegation chain.
For 35 contiguous leaves it consumes 18 siblings rather than the 700 siblings
of independent depth-20 paths; a dispersed-index fixture exercises less shared
structure. These counts concern private witness preparation, not a measured
on-chain circuit size or proof-time reduction.

The first test invocation exposed a mistaken test expectation (19 versus the
actual 18 shared siblings) and a TypeScript assignment to a readonly digest
field in an input-isolation test. The expectation was corrected after checking
the tree levels, and the test now replaces the path step without violating its
type. Neither issue changed the hash algorithm or contract. Subsequent checks
are recorded below when complete.

Status-tree preparation also caches exact immutable leaf commitments instead
of rehashing every credential on every path request. Returned leaf bytes are
copied to prevent callers mutating that cache. Validation and commitment
derivation happen before state mutation; a malformed namespace must leave
both root and sequence unchanged. Existing status transition tests and the new
cache-isolation/retry test cover this local optimization. No Compact source,
managed binding, key, protocol version, or running live-test input was changed
for the multiproof preparation.

The final 35-leaf test also exposed unnecessary repeated sparse-tree rebuilding:
requesting 35 paths rebuilt the same node levels 35 times. Multiproof preparation
now builds those levels once and extracts all requested paths from that snapshot.
The single-path API and exact Compact leaf/interior hashing are unchanged.

## Confirmed host-sleep interruption and scoped retry — 2026-10-13

The first constrained-profile combined run deployed
`1190277f08c250654d94c68b8c56d4774bc2b2d541b67040351e9fca2528764f`.
All eight root stages and finalization passed; the final transaction was
`000bd8869e01fe69e5e75176fb4537673c38a1cf9e09fda760c294c0d392f305cf`
at 15:00:21 Asia/Shanghai, advancing the status root to sequence 2 and deleting
the temporary session. The delegate account transaction
`0068679e001dc343377dcc578317c7bcbe0ecae9d3ffc2e31c3450026c5db30319`
advanced it to sequence 3 at 15:03:44.

The next child-begin call passed the prover's `/check`, and its contract-proof
request returned after 241.652 seconds. The subsequent wallet proof request
started at 15:08:02 and returned an internal-error result at 16:28:41 after
4,839.392 seconds. The runner exited 1 at the child-begin call; no child-begin
transaction, child activation, account revocation, or governance success is
claimed from this attempt. Independent unit tests simultaneously accumulated
approximately 80 additional wall-clock minutes.

Read-only Windows System events confirm Kernel-Power event 506 at 15:07:34
(Modern Standby, Idle Timeout), connectivity loss at 15:08:09, additional
battery-drain standby at 15:30:38, and event 507 at 16:28:20 (keyboard resume).
This establishes a workstation-suspension interruption, not an observed
contract assertion or second container OOM. The exact wallet internal-error
mechanism is not established. The prover remained running with OOMKilled=false;
its high-water mark was 7,103,640 KiB, post-resume RSS 4,596,164 KiB, and swap
549,352 KiB. The constrained-profile sustained mixed-workload result remains
unverified until an uninterrupted run completes.

A fresh default run started at 16:33:41 without restarting the prover, node,
or indexer, resetting ledger history, changing any expiry rule, or upgrading
any version. Its public log is `logs/m6-live-2026-10-13T08-33-41.073Z.jsonl`
and deployment is
`0855ad62c3bbbaac29f85d2ff00ab74dc2ff9dcd8e4cc06d41f2256948e9a7bd`.
The invoking PowerShell thread uses `SetThreadExecutionState(2147483649)`
(ES_CONTINUOUS | ES_SYSTEM_REQUIRED) only while this test runs, and clears it
with `SetThreadExecutionState(2147483648)` in `finally`. It does not change
permanent power settings, prevent display sleep, or override manual sleep/lid
closure. The user was asked to keep the laptop plugged in with its lid open.
Official behavior reference:
<https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-setthreadexecutionstate>.

An unrelated sandbox-only `npm run check` initially reported Hardhat HHE22.
The installed package was still local version 3.14.0. Targeted CLI diagnostics
showed EPERM from `fs.realpath` on its own local `package.json`; this was not a
missing dependency. Running the unchanged complete check with reviewed
escalation passed documentation freshness, TypeScript, Solidity, 93 package
tests (29 Midnight), and all six Hardhat tests. Nothing was reinstalled or
patched in Hardhat. The subsequent single-snapshot path-builder optimization
is rechecked below before handoff.

The post-optimization complete check also exited 0: 93 package tests including
all 29 Midnight tests, plus six Hardhat tests, TypeScript, Solidity, and the
three existing generated-document freshness checks. The optional checked-in
`scripts/run-live-m6-awake.ps1` reproduces the retry's scoped request, accepts
the live runner's arguments, restores the previous thread state in `finally`,
and passes PowerShell AST parsing. The current retry uses the inline equivalent;
the wrapper itself has not been used to claim another completed chain run.

A lightweight, ignored `logs/m6-multiproof-syntax.compact` diagnostic was
compiled with the pinned 0.31.1 compiler using `--skip-zk` into a separate
ignored directory. It checks zero-depth `merkleTreePathRoot` leaf digest
access and constant-slice rotation of a private 20-slot branch queue, without
any ledger or transaction circuit. This confirms available syntax only; it
does not establish a complete multiproof circuit, proving-key feasibility,
deployment weight, ancestry validation, or runtime acceptance. No active
contract file, managed binding, or key was regenerated for this diagnostic.

The generated diagnostic's zero-depth digest matched the canonical sparse
tree's leaf digest for three Bytes<32> vectors (all 0, all 1, all 255), and its
private queue rotation preserved the exact 19-tail-plus-one-new-entry result.
These are host equality/syntax checks, not a proving-key or deployment result.

A separate, read-only indexer query during the retry at 17:01:24 observed all
eight parent elements staged but status-root sequence still 1, used command
nonce count 1, the temporary session present, and the capability nonce not
consumed. Fourteen seconds later the final activation transaction
`0023e781e7cd360af92b246916ff9ec4c2abb45df3803ebbf5d2db47ecb628eac5`
advanced the root to sequence 2; the runner verified session deletion and
nonce consumption. This independently distinguishes staging completion from
activation rather than inferring activation solely from successful stage calls.

Source inspection also clarified client concurrency handling: finalization
uses fresh empty-child and active issuer/parent memberships under the latest
status root, not the begin-time membership paths. The begin sequence stays
inside the signed certification but is not compared to the latest sequence
at finalization. Authority-root version/sequence checks still apply. This
observation does not claim an additional live interleaving test.

For reproducibility, the root `compile:compact` script now explicitly selects
`+0.31.1` instead of silently using whichever compiler becomes the workstation
default. This is the same already verified compiler, language, runtime, and
ledger profile, not an upgrade. No dependency or lockfile entry changed. The
live run continues using the existing source/key fingerprints throughout.

The pinned compiler's `--version` returned 0.31.1. A smoke attempt that appended
`--help` through npm after the two positional paths was rejected with usage
exit 1 because this compiler requires flags before those paths; it did not
regenerate artifacts. The root script's actual source/output invocation is
the already verified full-build command, now with explicit version selection.
The package README records the single-thread full-build command and makes
clear that root `check` does not regenerate the ignored Compact keys.

At 17:13:55, an independent child-staging snapshot observed 2/7 elements,
status-root sequence 3, used command count 3, a present session, and the child
nonce unconsumed. At 17:25:27, another snapshot observed all 7/7 elements with
the same sequence/count and still-unconsumed nonce. Thus even complete child
staging did not itself activate the child.

Child finalization succeeded at 17:26:33 in transaction
`005915dad46ef0440f90bc1cb4598cabe210474f3f910f543e485a27536161bbe3`.
The begin transaction was
`001ce14006efc776dcd53fb91d31feec0585474303b8548a3970032709b93bd493`;
all seven intermediate stage transaction references are preserved in the
public event log and partial JSON evidence. The runner verified the exact
indexed root at sequence 4, session deletion, and child nonce consumption.
Begin-to-final duration was 1,201.340 seconds (20 minutes 1.340 seconds).
The parent begin-to-final duration was 1,325.484 seconds (22 minutes 5.484
seconds). These are observed local fixture durations, not performance targets.

The following unauthorized account-revocation assertion rejected in generated
circuit client preflight against real indexed state; no invalid transaction
was submitted to the node. Authorized revocation and the same-process
governance continuation are still running at this entry.

## Combined constrained-profile result and recovery — 2026-10-13

The authorized account revocation succeeded at 17:28:56 in transaction
`005f2964d0ba3ab1fdde391340c265d476251b7492b22cc9cbea744fe9f8473106`,
advancing the status root to sequence 5. Module proposal and two unique reviews
then succeeded. The next first-approval proof request began at 17:30:40.205;
Docker records the same prover process OOMKilled=true, exit 137, at
17:31:02.201. The runner exited 1 from ECONNREFUSED on port 6300 while submitting
that first approval, and its `finally` released the temporary sleep request.
This is a second verified OOM at the same cross-circuit boundary, not a
workstation-sleep interruption or a node rejection of a valid child proof.

The constrained service had not restarted between its 14:28:53 startup, the
sleep-interrupted attempt, and this retry. Its last sampled RSS before
governance was 6,801,524 KiB, high-water mark 7,103,640 KiB, and swap 505,596
KiB. These are sampled pre-failure counters, not a measurement of the fatal
peak. One proving worker, queue capacity one, four Rayon threads, and four
CPUs therefore did not make this combined workload fit the observed 7.648-GiB
Docker VM. Do not describe this profile as a successful memory fix or its
runtime success as complete M6 acceptance.

Read-only machine checks found 15.79 GiB physical host RAM, no user
`.wslconfig`, and 3.96 GiB free physical RAM after recovery. No WSL/Docker
memory limit, swap setting, power plan, compiler/runtime version, ledger
limit, contract rule, or trust authority was changed. Increasing the shared
VM budget or restarting all WSL would affect other workspace activity and
was not attempted.

Only `permio-m6-proof-server` was restarted at 17:33:27.585. Its version remains
8.1.0, health is healthy, and `/ready` reports zero processing/pending jobs and
capacity one. Node and indexer remained healthy and were not reset or
restarted. A separate indexed-state read at 17:37:29 confirmed root sequence 5,
five consumed status-command nonces, both parent/child nonces consumed, zero
attenuation sessions, module registry sequence 3, two reviews, zero approvals,
and zero active templates. Accepted runtime history survived; the failed
approval did not grant trust.

Version-matched official source review confirmed a global public-parameter
resolver, per-request proving-key material and clones, and worker-pool request
GC. It did not establish whether allocator retention, public-parameter caching,
key decoding, or a combination causes the excess memory. No speculative cache
eviction, allocator injection, prover-process topology, or Ledger 9 workaround
was adopted. A future bounded memory diagnostic should isolate one heavy
credential proof followed by module approval before repeating the hour-long
full staging run; it must be labeled a diagnostic, not full acceptance.

The final root check again passed all 93 package tests (29 Midnight), six
Hardhat tests, TypeScript, Solidity and generated-document freshness. A targeted
persisted-event privacy scan checked all eight synthetic scope values and
their sixteen raw/leaf digests, plus private witness/key property names; the
final scan result is recorded in `delegation-prover-verification.json`. This
does not claim a scan of every SDK stdout/stderr message or full M6 privacy
acceptance. Positive delegated issuance is live-verified; negative delegated
revocation cases, the on-chain current-root ancestry circuit, runtime families,
atomic action/nullifier state, common receipt, restart suite, and complete M6
acceptance remain unfinished. No `acceptance.json`, commit, or push was created.

## Approved bounded prover-memory optimization — 2026-10-13

The user authorized implementation after the read-only memory diagnosis. This
work preserves the nine-entry-point contract, Compact 0.31.1, Ledger 8,
proof-server 8.1.0, authority separation, signature and scope checks. It does
not authorize a Ledger upgrade, new trust authority, reduced delegation rules,
or a successful-combined-run claim obtained by recycling workers mid-test.

The repository wiki still describes M1-M5 and does not contain this local M6
work. The connected codebase index is healthy but indexes `information-flow`,
not this Permio worktree; it was not used as evidence for these changes and no
unrelated index was modified. Exact current local files are the implementation
source for this investigation.

Read-only `/proc/1/maps` inspection identified the actual prover's dynamically
loaded `glibc-2.42-51/lib/libc.so.6`. The image's shell is musl-linked, which is
not evidence that the prover itself uses musl. There is no loaded jemalloc or
mimalloc library in that snapshot; the pinned proof-server crate and main
source show no custom global allocator. The idle prover had VmRSS 10,516 KiB,
VmHWM 28,048 KiB and zero swap before the diagnostic. This does not prove what
caused the prior warm-process OOM.

Added `--memory-smoke`, an explicitly non-acceptance live mode: deploy the
unchanged contract, issue one real account credential through the k=19
dispatcher, propose a module, submit two reviews, and perform two distinct
governance approvals through the k=18 dispatcher. Existing premature-activation
and duplicate-approval preflight assertions remain. The final module is only
approved, not activated; no template is activated. Full staging is omitted
only in this labeled diagnostic, not from the default live acceptance runner.

`--profile-memory` also supports the existing full and governance-only modes.
The new sampler reads allowlisted process RSS/high-water/swap, anonymous/file
memory and cgroup counters every five seconds and at transaction boundaries.
Process memory is KiB; cgroup memory is bytes. It never logs witnesses, request
bodies, process environments, wallet keys or arbitrary command-error strings.
Reads are serialized, periodic ticks do not build a backlog, missing initial
Docker access fails before wallet/deployment, and subsequent sampling errors
are explicitly marked incomplete. Six diagnostic tests pass and the root test
sequence includes them; TypeScript passes. Sampling is not a live heap profiler
and cannot by itself distinguish a live-object leak from allocator retention.

The baseline started at 18:48:23 Asia/Shanghai against the existing idle prover
process (started 17:33:27), with one proving worker, queue capacity one, four
Rayon threads, four-CPU quota and no allocator override. Its public events are
in ignored `logs/m6-live-2026-10-13T10-48-23.067Z.jsonl`. Node/indexer were not
restarted or reset. The contract address is
`a1cee88d38b12936f9ea6da6b01c1d6735482c376da982d9a35e0b0d033a3b9b`.

A separate opt-in Compose override, `local-midnight-proof-memory.yml`, sets
glibc's arena maximum to two and fixes mmap/trim thresholds at 131,072 bytes.
The loader's `--list-tunables` accepts those values and Compose configuration
validation passes. Per the official GNU libc manual, these settings bound
allocation arenas and favor returning freed large allocations to the OS.
They are a hypothesis to test, not an established fix, and do not reduce the
compiled circuit size or guarantee a smaller single-proof peak. No allocator
library is injected and the pinned image is not rebuilt. The baseline is
measured before applying the override; results will be appended below.

Primary references:

- https://sourceware.org/glibc/manual/latest/html_node/Memory-Allocation-Tunables.html
- https://github.com/midnightntwrk/midnight-ledger/blob/ledger-8.1.0/proof-server/Cargo.toml
- https://github.com/midnightntwrk/midnight-ledger/blob/ledger-8.1.0/proof-server/src/endpoints.rs

### Short baseline and allocator-only comparison

The baseline reproduced the mixed-circuit failure in 334.846 seconds. Account
issuance was indexed at 18:51:50.743; its immediate checkpoint retained
4,668,992 KiB RSS and 367,700 KiB swap. Module proposal and two reviews then
succeeded. The first approval OOM-killed the prover at 18:53:50.918 (exit 137),
and the client exited 1. There were 66 successful samples and three missing
samples after process death. Sampled maximum RSS was 6,921,792 KiB, observed
high-water 6,951,948 KiB, sampled maximum swap 1,145,320 KiB, and the last
observed cgroup peak 7,148,195,840 bytes. These do not capture the fatal peak.

Only the crashed prover was recreated with the allocator override at
18:55:05.902, using the same image digest and public cache. The comparison's
events are `logs/m6-live-2026-10-13T10-55-18.045Z.jsonl`, contract
`f2079c97d6cd24510b1953603c802e704463c054f81ade5ba43a685e0cb252ef`.
The same account/proposal/two-review sequence succeeded, but first approval
returned HTTP 400 at 19:00:38.967; the client exited 1. The process remained
alive, OOMKilled=false and cgroup oom/oom_kill counts were both zero. Upstream
maps `versioned_ir::prove` errors to `BadInput` and intentionally displays only
`bad input`, so the precise proving error is not established. It must not be
relabeled as a verified OOM or as a node/contract rejection.

The allocator run had 63 successful samples and one unavailable sample.
High-water was 7,338,040 KiB, sampled maximum swap 1,527,788 KiB and cgroup peak
7,553,802,240 bytes. Its immediate post-credential RSS was 4,876,928 KiB and
swap 2,260 KiB: reduced swapped bytes did not yield a successful combined test
or meaningfully release the retained decoded material. The failed override
was rolled back at 19:04:20.529. The recovered official prover is healthy and
idle, at about 4.7 MiB Docker-accounted memory. Node/indexer start times remained
13:00:18.950 and 13:00:29.901 with restart counts zero throughout.

### Concrete decoded-key ownership finding and opt-in patch

A fuller version-matched source inspection found `PK_CACHE_SIZE = 5` and
`PK_CACHE: Mutex<LruCache<HashOutput, Arc<dyn Any + Send + Sync>>>` in
`transient-crypto/src/proofs.rs` (lines 249-305 at upstream commit
`d89e0b6334f83bc9477152fb5edf7eca71660237`). `ProverKey::init` gzip-decodes a
`MidnightPK`, stores a strong reference in that global cache, and can therefore
retain its large arrays independently of the HTTP request. This is a concrete
live-ownership mechanism, distinct from the previously inspected filesystem
parameter cache. It still does not quantify every component of RSS or prove a
leak. Completed worker jobs store proof results, not the original proving
closure; their ten-second GC tick and TTL are not a decoded-key eviction API.

Prepared an opt-in weak-cache patch against exactly that public revision.
Active proofs retain owning `Arc` references, while cache entries become
non-owning `Weak` references. Cache hits still require the exact serialized
key hash and exact Rust type, and upgrading a weak reference is atomic. Three
tests cover exact live reuse/hash/type isolation, release after the last owner,
and cache eviction without invalidating an active key. Key decoding, encoding,
proof constraints, verification and protocol versions are not changed. The
tradeoff is re-decoding keys on subsequent requests when no active owner remains.

This is an explicit local source-build experiment, not a silent replacement of
the official distribution. The Dockerfile pins official Rust 1.95.0/bookworm
digest `6258907abe69656e41cd992e0b705cdcfabcbbe3db374f92ed2d47121282d4a1`
and runtime digest `801bbc0340e9e96f16735f77b523f23c7459e3359842f7c79c2c53f4e994d531`.
Rust's version matches the upstream pinned Fenix stable manifest dated
2026-04-16. The builder uses one Cargo job and the unchanged upstream lockfile;
the runtime keeps the original glibc and libgcc paths. The recipe runs cache
tests and upstream proof-server tests before producing the opt-in image.
The source is Apache-2.0 licensed; no source/patch/image has been published.
No Rust or Nix toolchain was installed on Windows or WSL.

Direct native `docker manifest inspect` timed out reaching Docker Hub, but
Docker Desktop's daemon successfully pulled the pinned builder; no network
proxy setting or credential was changed. The first build stopped because the
official minimal Rust image lacks rustfmt. The recipe now installs its matching
component; formatting verification passed with upstream's existing warnings
about nightly-only rustfmt settings. The experimental binary is not yet deployed.

The first root check exposed a tooling boundary: TypeScript's default recursive
discovery included ignored upstream `.template.d.ts` files under `logs/`.
Added an explicit exclusion for `logs`, retaining the normal `node_modules`
and `dist` exclusions; actual package and test sources remain checked. The
subsequent root check passed 93 package tests, six new diagnostic tests, six
Hardhat tests, TypeScript, Solidity build and generated-doc freshness. No JS
dependency/lockfile change or Compact regeneration was needed because this
slice does not modify the contract or its keys. Experimental Rust build and
real-chain results remain separate pending gates.

### Upstream integration prerequisites, not skipped tests

The first source-build test run completed all three new cache tests and all
six upstream worker-pool tests. At 19:29:58 it started the 30 upstream HTTP
integration tests: 21 passed and nine failed, causing Cargo/build exit 101.
Eight failures originated in the missing
`MIDNIGHT_LEDGER_TEST_STATIC_DIR` prerequisite and subsequent poisoning of the
shared fixture resolver. The independent valid `/check` test attempted a cold
public-key download inside upstream's timer-disabled current-thread runtime
and returned 500 after the Tokio timer panic. `/prove` itself produced and
self-verified a valid built-in Zswap proof in this run. These outcomes do not
establish a valid Permio mixed-circuit transaction or a successful image build.

Inspected the pinned `flake.nix` recipe rather than skipping the failed tests.
Nix normally supplies `local-params` and generates test artifacts with
`zkir compile-many`; the HTTP tests use the `fallible/count` fixture. The
revised standalone builder supplies the existing 222,899,670-byte public
parameter cache as a separate explicit build context, generates that exact
fixture using the same revision's ZKIR CLI, and sets both documented environment
paths. It runs the unchanged upstream assertions serially and suppresses only
informational fixture payload logging with `RUST_LOG=error`. No source handler,
test assertion, verifier, timeout or expected status was patched.

The build now keeps compiler output in a dedicated BuildKit cache, initialized
from the checked first-stage artifacts, so further failures do not repeatedly
discard minutes of compilation. The source revision and complete tracked
source diff SHA-256 are verified before exporting the experimental binary;
the expected patch digest is
`404ae63237df57b0f775a652ca55638cf64e562ccb2b46bf0fe01ffc9d5ffc22`.
Generated test keys stay outside the source tree and are not Permio keys.
The official prover remains healthy/idle while this retry builds. The source
patch remains confined to one upstream file, and no test has been skipped to
produce an image.

The prerequisite-corrected retry passed all six worker-pool tests, all 30 HTTP
integration tests and all 58 crypto-library tests (including the three new
cache tests). The HTTP suite completed in 6.25 seconds and the crypto suite in
22.99 seconds after compilation. The default-feature production-profile binary
is being compiled separately; passing the dev-feature test binaries is not
being substituted for that build or the forthcoming real-chain diagnostic.

### Weak-cache image and real-chain diagnostic result

The default-feature release binary built successfully, and the complete source
diff checksum guard passed. `ldd` listed only libc, libm, libgcc and the loader;
the exported binary was pointed at the original pinned runtime's glibc 2.42
and libgcc, not a new allocator. The final image copies only the binary, not
the Rust toolchain, test artifacts or build parameter cache. Image manifest
digest is `82f867abc556806f3742fb165b9cba8c898045a71e99bba8a8b33b37237bb1c9`,
config digest `cd02e2363f2ff97c51323f39a8f056f3953c61d72c09b12a1ed8e978f8a582bd`.
Its offline `--help` startup check passed. The builder used CMake 3.25.1 and
patchelf 0.14.3; its Rust and Cargo both report 1.95.0.

After confirming the official service was idle, recreated only the prover
using the opt-in weak-cache override at 19:53:30.887. `/proc/1/maps` verified
that PID 1 is the actual experimental prover and still loads the pinned glibc.
No allocator tuning was enabled in this experiment. The node and indexer
retained their original 13:00 start times and restart counts zero. The original
`midnight-proof-server` container remains stopped and recoverable.

The command was:

```powershell
docker compose -f scripts/local-midnight-proof-server.yml -f scripts/local-midnight-proof-weak-cache.yml up -d --pull never
.\scripts\run-live-m6-awake.ps1 -LiveArguments @('--memory-smoke')
```

The run started at 19:53:49.194 and exited 0 at 20:03:02.261, lasting 553.067
seconds. Public events are in
`logs/m6-live-2026-10-13T11-53-48.490Z.jsonl`; the new disposable deployment is
`7f0ad5fe740fcbf23c54b71102d6205a7c1660812998d11dff5085410e2215f2`.
Account issuance, proposal, both reviews, and both unique approvals were
accepted by the real local chain in one uninterrupted prover process.
First approval transaction
`00ef37c7e7daa163d55e53c702142999c38318aad2944acac0790e41959951d6e7`
crossed the previously failing boundary. Second approval transaction
`00fea1888f247ca614e9cc41f01d77f543ef2a6d866b2468d4c10b73219549178e`
left the module approved, not activated. Premature activation and duplicate
approval were rejected in generated-circuit preflight; no invalid transaction
was submitted to the node. All 115 memory samples succeeded, with no missing
samples, OOM events or process restarts. The temporary sleep request was released.

At the matching post-credential indexed checkpoint, RSS fell from the
baseline's 4,668,992 KiB to 208,144 KiB (about 203 MiB), a 95.542% reduction.
Swap at that checkpoint was 10,052 KiB rather than 367,700 KiB. After the first
approval RSS was 299,144 KiB; after the second/final sample it was 316,496 KiB.
The observed process high-water was still 6,730,608 KiB (about 6.42 GiB), sampled
maximum swap 1,002,528 KiB, and cgroup peak 6,952,845,312 bytes. This is a
retained-memory improvement and a passing bounded sequence, not elimination
of the single-proof peak or a full sustained-memory acceptance claim.

The deployment-to-credential-indexed interval was 264.647 seconds, versus
185.975 in the baseline (42.302% longer). This includes preparation, proving,
submission and indexing, not just prover CPU time. The source rebuild and
host/cache conditions differ, so timing cannot be attributed solely to the
weak-cache policy. Re-decoding between requests is nevertheless an explicit
tradeoff; no throughput improvement is claimed. The runs use fresh randomized
M4 fixtures with the same transaction sequence and exact contract/key artifacts,
not byte-identical fixtures or a same-build strong-cache control.

An independent wallet-free indexer read at 20:05:36.053 confirmed status-root
sequence 1, one consumed status-command nonce, zero attenuation sessions,
one module, module-registry sequence 5, two reviews, two approvals, and zero
active templates. The runner separately asserted module lifecycle status 3.
At 20:04:22 the same prover container ID/start time and restart count zero were
confirmed, all three services were healthy, and `/ready` reported zero pending
and processing jobs. The opt-in prover is left running for subsequent local
verification; the base Compose file still selects the official image. No image
was pushed, no repository commit was made and no M6 acceptance file was created.

During the source build, WSL reported about 6 GiB filesystem cache and 6.3 GiB
available, distinct from active prover RSS; Windows VM allocation alone is not
the application-memory measurement used here. No global cache dropping, WSL
memory-limit change, swap tuning or Docker reset was used. The full staged
parent/child workflow and remaining M6 exit gates still require verification.

The final `npm run check` again exited 0: 93 package tests, six diagnostic
tests, six Hardhat tests, TypeScript, Solidity build and generated-document
freshness all passed. `git diff --check` passed. A three-log persisted-event
scan found no mnemonic, signing-key, serialized-preimage or private-scope
property names; this is not a claim about all SDK stdout/stderr or full M6
privacy acceptance. Added narrow LF attributes for the new patch/build recipe
so Windows checkout conversion cannot change the recorded patch checksum.
No shared milestone Markdown, generated HTML, JS dependency or npm lockfile
was changed in this optimization slice. The Compact source and both measured
proving-key hashes were rechecked unchanged. The connected index remains
scoped to the unrelated Information Flow repository, not this worktree.

## Consumer and enterprise feasibility and ordinary user workload 2026-10-13

The user requested concrete future consumer/B2B plans, a distinction between
completed and remaining proof work, hardware/time estimates, and a
representative ordinary-user workload in place of governance as a proxy for
customer performance. Added `product-delivery-feasibility.md` in this evidence
directory, with a complete Chinese translation. The documentation-writing
skill was used to keep measurements, conditional estimates and future plans
separate; it did not authorize changes to milestone or protocol definitions.

Source verification confirmed nine transaction entry points and generated
runtime credential/pure-hash bindings, but no ordinary-action authorization
entry point or common receipt. The existing staged parent/child and governance
transactions remain real partial chain evidence. The action-time current-root
ancestry/account checks, both runtime proof families, atomic state/nullifier
handling, common receipt, sustained full-run negatives and restart acceptance
remain incomplete. No fake circuit, alternative receipt, permission
relaxation or governance transaction was used to fill that gap.

The new `scripts/m6-ordinary-user-workload.ts` builds a synthetic support
scenario through the real M4/M5 APIs: two unique exact-hash reviewers,
independent activation, exact allocation, context account, bounded root grant,
and session limited to one order/recipient. A second case uses one explicitly
attenuated delegate. Each fresh fixture permits exactly one `ready -> submitted`
operation and rejects replay. Seven private M6 scope paths are constructed and
checked using generated Compact pure functions. These operations do not create
a ZK proof, certify credential-status ancestry or issue a Midnight receipt.
Fixture setup is outside the timed action; signing, scope-path preparation/root
checks and M5 authorization have separate timings.

Added `scripts/run-m6-ordinary-user-benchmark.ts`, root
`benchmark:m6:user`, and six tests discovered by the existing root diagnostic
test script. The report exposes only numeric aggregates, mode/reason labels
and explicit limitations. It does not export account keys, signatures, intent
payloads, resources, recipient values, nonces or scope paths. Invalid options
are rejected; required-chain mode emits a `not-implemented` report and exits
2 before any workload submission. Arbitrary caught error text is not printed.
This is preparatory client performance evidence, not replacement chain
acceptance. Both existing live modes and the full default live runner remain
untouched in this slice.

`npm run typecheck` and `npm run test:diagnostics` passed after implementation;
the latter passed all 12 tests, including six new tests. The benchmark command
was `node scripts/run-m6-ordinary-user-benchmark.ts --iterations 20`, exit 0,
recorded at `2026-10-13T14:02:08.503Z` (22:02:08 Asia/Shanghai), native Windows
x64 Node 24.13.1 inside the filesystem sandbox, not a target-device deployment.
Each mode had 20 serial samples plus one first action after
module loading. Ten denial cases covered altered template hash, wrong context,
recipient, purpose, out-of-session resource, invalid signer, expiry, session
revocation, account revocation and parent revocation. All 42 replay checks
passed. Rejected resource access left state and nonce available for the next
correct request.

Customer-session p50/p95 total client time was 272.001/323.315 ms; the delegated
case was 194.089/218.273 ms. Scope-path construction and root checks accounted
for most of that time: p50/p95 270.964/322.120 ms and 193.515/217.383 ms. M5
authorization alone was 0.478/0.803 ms and 0.382/0.506 ms. The fixed case order
and changing warm/host conditions prevent a causal claim that delegation is
faster. These exclude ZK proving, wallet balancing, network and chain/indexer
confirmation. Whole-process max RSS was 122,560 KiB including module loads and
fixtures, not prover memory or a browser/mobile requirement. Exact aggregates
and null chain fields are preserved in `ordinary-user-benchmark.json`.

The planning configuration is explicitly unverified: 4-8 vCPU and 16 GiB RAM
for an isolated single-job prover, derived from the measured 6.42 GiB peak with
50% headroom plus system overhead, and 32 GiB for a co-located development
evaluation machine. No resource settings or hardware purchases were applied.
A development-effort schedule was mistakenly included in the original note.
It has been withdrawn after the user clarified that the requested time estimate
concerns proof execution, not AI implementation; see the correction below.

The consumer plan preserves user-controlled proving as the privacy baseline;
ordinary hosted proving is a separate explicit trust/consent choice, not
adopted by this note. The enterprise plan uses customer-controlled workers only
for inputs the enterprise may already access. The official local-proving guide
and MPS 0004 were checked on 2026-10-13; the latter remains Proposed. Its
standard-token examples were not imported as custom-circuit performance
numbers. The next real-chain benchmark must measure proof/check, balancing,
submission and indexed confirmation independently, then repeated/concurrent
requests and device compatibility without changing existing M6 guarantees.

中文说明：本轮新增完整双语交付可行性说明，具体区分已通过的链上治理、凭证与部分委托证据，以及尚未完成的运行时操作证明、当前根祖先检查、原子状态/nullifier 和公共收据。硬件配置是有前提的估算，未修改机器资源或隐私架构。原文误加的开发工期已按用户澄清撤回，详见后续修正。

新基准使用真实 M4/M5 API 和 M6 生成纯函数驱动合成客服请求。普通会话与一层有限委托各 20 个样本、10 个拒绝用例及 42 次重放检查通过；两组 p95 客户端时间分别为 323.315 和 218.273 毫秒，不包含证明、链上提交或确认。测试不会输出私密夹具；要求链模式明确退出 2，不能用链下授权冒充链上证明。既有治理诊断、默认链上验收、确定性 milestone 及生成 HTML 均保持不变。

### Final verification for the delivery planning slice

The first `npm run check` passed generated-document freshness and TypeScript
then stopped at the previously documented sandbox-only Hardhat HHE22
local-installation check. The identical command outside that boundary exited
0: documentation freshness, TypeScript, Solidity build, 93 package tests,
12 diagnostics and six local Hardhat contract tests all passed (111 tests
total, none skipped). It was not an approval-service quota failure. No package
installation, dependency version change or bypass of Hardhat assertions was
needed. `git diff --check` and whitespace checks for all new files passed.

The Compact source SHA-256 remains
`c073e130a3e23e1e758117e31ee5e3fb859099e4bee0b590b9babdbcdae4ebce`,
and the credential prover remains
`40d056b67a064200890a732cd9c3c43335aa7d77ec225557ae7cf6818f6a35b0`.
This slice changes no Compact/generated contract code, keys, live-runner
behavior, Docker services, or persistent chain state. No new Midnight
transaction was submitted: the requested ordinary-action chain path is not
yet implemented, and the existing governance test is not substituted for it.
No shared milestone Markdown, generated HTML, dependency/lockfile, commit or
push was changed/made. Earlier dirty implementation work was preserved. The
private instruction bridge is ignored and absent from the index; the connected
codebase index still covers only the unrelated Information Flow repository,
so exact Permio source was verified directly rather than using that index.

最终验证：首次完整检查遇到已知沙箱 Hardhat HHE22，沙箱外同一命令全部通过，共 111 项测试，无跳过；不是审批额度问题。Compact 源码和凭证证明密钥哈希保持不变，没有新增 Midnight 交易、修改服务或链状态，也没有提交或推送。普通用户链上授权尚未实现，未以治理测试替代。既有未提交实现已保留，私有指令文件仍被忽略。

## Correction to proof runtime and configuration assessment 2026-10-13

The user clarified that the requested estimate is how long proofs take to run
and what hardware is needed for production feasibility, not how many human
working days remain in M6. The previous development-effort interpretation was
incorrect. Removed the English/Chinese development schedules and pilot/UI
engineering-week estimates from the active feasibility note, corrected the
README description, and withdrew the earlier schedule wording above. AI
implementation is not assigned a human workday budget by this assessment.

Read only public milestone names/timestamps and numeric metadata from the
existing weak-cache log `logs/m6-live-2026-10-13T11-53-48.490Z.jsonl` and stock
staging log `logs/m6-live-2026-10-13T08-33-41.073Z.jsonl`. Did not read proof
request bodies, regenerate keys or submit a new transaction. Derived elapsed
seconds by subtracting successive relevant event timestamps, and preserved
the separate run scopes in `proof-runtime-assessment.json`.

The weak-cache run gives 264.647 seconds for the credential operation, 29.165
for proposal, 35.400/36.123 for reviews, and 78.753/82.543 for approvals. The
first approval starts at the last review, not the first review; the second
starts after the negative preflight checks. The stock run gives eight parent
scope stages of 137.588-156.282 seconds and seven delegated stages of
142.790-156.118 seconds. From the preceding account milestone through begin,
all stages and finalization, parent provisioning took 1,488.209 seconds
(24.8 minutes) and delegated provisioning 1,356.048 seconds (22.6 minutes).
The older 1,080.015-second parent figure is a different run and begins later
in the workflow; neither timing boundary is relabeled as pure proving.

These are completed-operation event intervals including preparation, proof
work, submission and confirmation, not isolated `/prove` latency. Both pure
proof-generation and ordinary-customer proof timings remain null. The earlier
stock combined workflow still failed later with OOM; its successful staging
timings do not become a patched-prover/full-M6 pass. The existing 218/323 ms
client p95 values remain client-only and cannot be used as customer ZK latency.

The configuration assessment retains the observed four-CPU quota, four Rayon
threads and one proving worker. A 16 GiB isolated single-job worker remains
only a headroom estimate over the measured 6.42 GiB peak. Two equal peak jobs
with 50% headroom imply about 19.3 GiB before other service overhead; low
post-request RSS is not a concurrency budget. There is no measured four-to-eight
core speedup and no promise that more RAM reduces a minutes-long operation
to seconds. No resource configuration or architecture has been changed.

The documentation-writing skill kept observed operation timings, unavailable
pure-proof timings and hypothetical configuration/capacity estimates explicitly
separate. The next real action benchmark needs per-proof/check numeric timing
without body logging, independently of balancing, chain/indexer and queue
delay. This correction changes documentation and derived evidence only.

用户澄清要评估证明运行耗时和生产配置，而不是人工开发工期。已删除可行性说明中的中英文开发工期、试点及 UI 工程周估算，修正 README，并撤回本日志此前对应表述，不用人工人日限制 AI 实现。

本次只从两份已有公开事件日志提取事件名、时间戳及数值。弱缓存运行中凭证操作为 264.647 秒，提案为 29.165 秒，两次审查为 35.400/36.123 秒，两次批准为 78.753/82.543 秒。原版运行父范围单步为 137.588-156.282 秒、委托范围单步为 142.790-156.118 秒；从前一账户事件计的完整父配置为 1,488.209 秒，委托配置为 1,356.048 秒。它们包含准备、证明、提交和确认，不是独立证明生成耗时。旧的 1,080.015 秒来自另一轮及更窄边界，不混用。原版随后仍发生 OOM，不能据这些阶段声称完整通过。

独立证明耗时和普通用户证明耗时继续为 null；218/323 毫秒仍只代表客户端检查。四 CPU 配额、四 Rayon 线程及单证明工作线程是已记录配置，16 GiB 单任务工作节点只是对 6.42 GiB 峰值加余量的估算。两个同峰值任务加 50% 余量约需 19.3 GiB，不能用低空闲内存推算并发。没有测过四核至八核加速，也未保证加内存就能从分钟降至秒。本次未读取证明正文、重生成密钥、提交交易、调整资源或改变架构，仅修改文档及推导证据。

Verification for this correction: `npm run docs:check`, `git diff --check`
and JSON/assertion checks passed. The active note contains no engineering-day
or engineering-week budgets; pure/customer proof timings and unmeasured CPU
speedup remain null. No Solidity/Compact code changed, so no compile or chain
test was rerun or claimed in this documentation-only correction. No milestone
definitions or generated HTML changed, and no commit or push was made.

本次修正的文档一致性、差异空白及 JSON 断言检查通过，已确认现行说明不含工程人日或工程周预算，未知证明时间和 CPU 加速仍为空。没有修改 Solidity/Compact，不重新运行或声称重新通过合约及链上测试；未改 milestone 或生成 HTML，未提交或推送。

## Customer facing proof feasibility conclusion 2026-10-13

The user requested a practical customer explanation even while the full proof
path remains unfinished: whether observed proof cost is finite and useful,
which blockers are local configuration issues, and whether further improvement
is needed before production. Added a customer delivery statement and an
evidence-based blocker table at the beginning of the bilingual feasibility
assessment, rather than leaving the customer with only unavailable metrics.
The documentation-writing skill keeps the conclusion readable and separates
established results from conditional production planning.

The demonstrated conclusion is narrow but positive: implemented governance
and credential circuits have generated proofs accepted by the local chain on
the recorded four-CPU profile. The credential transaction's entire 264.647-second
window includes its proof work, so this accepted proof did not run indefinitely.
The observed 29-265 second operation range supports a rough 0.5-5 minute
planning envelope for comparably sized tested server-side operations, including
chain confirmation. This is an inference for preliminary risk planning, not
an isolated proof measurement, ordinary-user proof benchmark, p95/SLA or upper
bound for a larger/unimplemented circuit. The staged stock workflow's 23-25
minute provisioning phases remain separate from individual transactions and
from the later OOM failure.

Classified the blockers explicitly. The stock prover's exit-137 OOM and the
same-machine weak-cache diagnostic improvement establish a real resource and
retained-memory problem. They do not establish that every blocker is hardware.
The historical depth-16 ancestry key-generation wait and failed k=20 local key
gate have no successful larger-RAM control; do not promise that a server
upgrade resolves them. Offline proving-key generation is not an individual
customer's proof-generation latency. The approved k=19 dispatcher did generate
keys and accepted proofs, while the remaining ordinary-action checks and
receipt are unfinished implementation, not something extra RAM supplies.

The customer verdict is a technically demonstrated prototype requiring further
work before production, not an infeasible concept and not a ready-to-deploy
authorization service. Enterprise-controlled low-frequency asynchronous use
is a credible initial direction conditional on completing the required runtime
and security semantics and passing sustained/full-chain acceptance. Consumer
mobile/browser privacy and interactivity are not established. A 4-8 CPU,
16 GiB single-job worker remains an evaluation hypothesis only. Further circuit
or prover optimization may be required; no hardware-only fix, production
rollout, new trust authority, protocol change or delivery deadline is asserted.

用户要求即使证明路径未全部完成，也应给客户明确解释：成本是否有限、哪些问题与配置有关、生产交付还需要什么。已在双语可行性说明开头补充客户结论及阻碍分类，并同步机器可读评估。

正面事实是：已有治理与凭证电路确实在四 CPU 配置下生成了本地链接受的证明。凭证整笔操作 264.647 秒的窗口包含其证明工作，因此不是无限等待。已有操作约 29-265 秒，可作为相近规模服务器操作约 0.5-5 分钟的粗略风险预算，包含链上确认；不是纯证明测量、普通用户基准、p95 保证或更大电路的上限。多交易配置的 23-25 分钟及原版后续 OOM 仍分别保留。

原版 OOM 及同机弱缓存改善证明了真实内存问题，但不能据此认定所有阻碍都只需升级硬件。历史完整祖先探针及 k=20 密钥生成失败没有更大内存成功对照；离线密钥生成也不等于用户每次证明时间。已批准的 k=19 电路已能完成密钥及证明，剩余普通授权和收据则属于未完成功能。客户结论为技术已有实证、生产仍需补齐：企业低频异步方向可信但需完整安全及持续验收，C 端交互和设备端隐私性能未确定；16 GiB 单任务配置仍是评估假设，可能还要继续优化，未承诺硬件单独解决或立即投产。

Verification: documentation freshness, diff whitespace and JSON assertions
passed. Verified that production readiness and hardware-only causation remain
false, and ordinary-action/pure-proof timings remain null alongside the
explicitly conditional planning envelope. This slice changes only the
assessment, its derived JSON and this log; earlier dirty source changes were
preserved. No new chain test, resource change, milestone/HTML edit, commit or
push was performed or claimed.

验证：文档一致性、差异空白及 JSON 断言通过，生产就绪和纯硬件归因仍为 false，普通操作及纯证明耗时仍为空，粗略预算明确带条件。本轮仅修改评估、推导 JSON 和日志，保留已有未提交源码；没有新增链测试、资源调整、milestone/HTML 修改、提交或推送。

## Runtime authorization implementation resumed — 2026-10-13

The user explicitly shelved the memory/time trade-off discussion and requested
the remaining M6 implementation. Work resumed in
`feat/m6-m8-midnight-delivery`; no proof-service profile, VM memory setting,
ledger version, compiler version, architecture decision, shared milestone
Markdown, or generated HTML was changed. The Permio wiki still describes the
committed earlier milestones, while the local index serves Information Flow;
the active Permio source and tests were therefore inspected directly after
checking those derived views. Existing dirty work and parallel worktrees were
preserved.

### Implemented private status-program boundary

Added `contracts/runtime-status-multiproof.compact` and
`src/status-multiproof-program.ts`. The TypeScript builder consumes the existing
canonical shared-branch proof and produces a bounded private postorder program.
The Compact checker requires version 1, one to 35 unique ascending status
indices, exact canonical unused slots, adjacent same-level children at each
merge, complete consumption of required leaves, and a single depth-20 root at
index zero. A supplied expected root and sequence must both match; a proof for
a historical snapshot is not current authority.

The exact maximum is 588 instructions, not 735: for 35 selected depth-20
leaves, the number of marked internal nodes is bounded by
`sum(d=0..19, min(2^d,35)) = 553`, plus 35 leaf pushes. A fixture occupies all
32 prefixes at depth five and 35 at depth six, actually reaches all 588 steps,
and verifies without padding. This reduces witness overhead without reducing
the supported 17-capability/17-account/one-session shape or delegation depth 16.

Private working memory uses a domain-separated hash-linked stack. Every merge
opens the exact previous stack head for one or two consumed operands, checks
coordinates, computes its parent digest, and commits the resulting stack. A
separate ordered transcript binds every pushed index/digest to the required
leaf vector. Both are local proof computations: neither replaces the public
status root, grants trust, or introduces the rejected public lineage-accumulator
architecture. Stack/leaf transcripts, paths, indices and depth are not public
outputs. Canonical padding cannot precede the complete root or be followed by
more instructions.

Several concrete implementation errors were caught before ledger integration:

- Compact automatically adds `.compact` to includes; an explicit suffix caused
  a `.compact.compact` lookup and was removed.
- A private dynamic vector index does not reduce to a compile-time constant
  under 0.31.1. The initial bounded selector was valid but expanded poorly;
  the final ordered transcript removes that lookup entirely.
- The initial TypeScript interior-node builder used a Merkle path helper that
  hashes its argument as a new leaf. Exact-root tests failed. It now uses the
  same `transientHash<Vector<2, Field>>` interior primitive as Compact, while
  the zero-depth leaf helper retains Compact's `mdn:lh` leaf encoding.
- Compact's default Jubjub point is `(0,1)`, not `(0,0)`; a failing canonical
  ancestry-padding test corrected the SDK padding point.
- Negative `i - 1` vector indices are rejected even in the untaken root branch.
  Padded predecessor vectors now provide constant valid indices at every slot.

### Implemented active ancestry and signed exact-action predicates

Added `contracts/runtime-active-ancestry.compact` and `src/active-ancestry.ts`.
`prepareRuntimeActiveAncestry` copies the complete certified root-to-terminal
chain and its holder accounts, deduplicates repeated account status positions,
constructs the shared proof and runs generated-circuit preflight. The Compact
predicate checks exact version-2 capability commitments, version-1 account and
session commitments, every active status leaf, parent and issuer links, depth
0 through 16, non-widening time/depth bounds, all account validity windows,
exact template/instance/context boundaries, and the terminal session binding.
Root, intermediate or terminal capability revocation, any holder-account
revocation, and session revocation all fail even when membership under the new
current root is valid. Valid empty membership does not satisfy active status.

Added `contracts/runtime-action-authorization.compact` and
`src/action-scope.ts`. The private action predicate verifies the holder's
Schnorr signature over the exact session and the session's signature over the
exact runtime intent. All seven intent fields must belong to both the
certified terminal capability and signed session roots: action, resource
selector, resource, purpose, recipient kind, recipient, and disclosure policy.
Terminal key/root selection precedes signature and path checks, so the source
does not instantiate seventeen copies of those checks in a guarded loop.
Signed out-of-scope fields fail; a correct signature is not sufficient authority.

These are private predicates, not production ledger transaction entry points.
Their explicit root, sequence and `now` inputs must still be bound to actual
ledger state and protocol block-time checks by the final runtime module.
They do not allocate an instance, validate a module binding/configuration,
consume replay/nullifier state, advance an instance state, or emit a decision
receipt. Synthetic active-status fixtures test predicate logic, not historical
on-chain credential issuance. No successful M6 action proof is claimed.

The existing M5-to-runtime intent converter had a concrete off-chain binding
gap: it verified Ed25519, template, context and session ID but could silently
replace a signed payload's different `instanceId` with the runtime session's
instance commitment. `createRuntimeActionIntent` now requires a fourth
`allocatedInstance` argument, verifies that exact original M5 allocation
snapshot's canonical hash against the session and checks the signed instance
ID. It also copies instance/context bytes instead of aliasing them. Regression
vectors reject a validly signed wrong-instance intent and an altered allocation
snapshot. This is an SDK API change within the private 0.1.0 package; callers
must retain the exact allocation snapshot. No M5 identity or signing scheme changed.

### Immediate real-proof feasibility gate

The non-mutating diagnostic `contracts/diagnostics/current-status.compact`
includes the actual nine-circuit authorization contract and adds only a
current-ledger-root membership check. It cannot activate a template, authorize
an action, issue a credential, or update a status root. Its runner
`scripts/run-live-m6-status.ts` requires complete proof assets before wallet
startup and refuses to reuse any baseline key whose corresponding ZKIR differs.
It copies only generated public proving assets, not secrets. Its bootstrap
root contains synthetic membership fixtures and must not be reported as
authorized credential issuance. Negative checks are labeled client preflight,
not node rejection. Public logs exclude private witnesses and raw SDK errors.

The initial 735-step selector/fixed-stack build and the subsequent 588-step
multi-return builds accrued CPU time without emitting the transaction ZKIR.
They were stopped as superseded diagnostics, not classified as an OOM,
deadlock, chain rejection, or proof impossibility. Rewriting the same hash-stack
constraints into one returned state allowed the compiler to emit the proof
program. All nine existing transaction ZKIR files remain byte-for-byte equal
to their pre-slice diagnostic copies, so their existing key pairs still match.
The new diagnostic has separate ignored assets and does not replace the active
production contract or keys.

The pinned tools are WSL Ubuntu-24.04, Node 22.23.2/npm 10.9.8,
Compact compiler 0.31.1, language 0.23.0 and runtime 0.16.0. Its compiler reports
ledger-8.0.2; the retained Local Dev proof server is 8.1.0 and MidnightJS 4.1.1.
`zkir mock-compile -v` measured the new membership-only circuit at `k=20`,
705,943 rows, 7,933 table rows, eight advice columns and 43 fixed columns.
This cost excludes the full action predicate and is not a production latency
or memory benchmark. Real single-worker key generation was started immediately
after that measurement with `RAYON_NUM_THREADS=1 TOKIO_WORKER_THREADS=1`;
its final result and subsequent Local Dev gate must be recorded below.

Verification so far: generated Compact bindings, TypeScript, and 45/45 Midnight
package tests pass, including the exact worst-case proof capacity. An earlier
complete root `npm run check` passed all then-current tests (44 Midnight tests,
12 diagnostics, other packages and six Hardhat cases). The first sandbox run
stopped at Hardhat HHE22; the identical escalated command passed. This is not a
usage-quota or approval-service failure. Final root checks follow the completed
diagnostic result. M6 remains incomplete; no acceptance file, commit or push.

用户要求先搁置内存与时间取舍讨论，继续实现 M6。本次实际新增了 Compact 联合成员证明检查器、私有证据构建器、完整深度 16 的祖先链有效性检查，以及持有者签署会话、会话签署精确意图和七维权限范围校验。35 个叶子包括 17 个权限、17 个账户和一个会话；精确最坏容量为 588 步，测试确实达到该上限，未降低委托深度。私有哈希链接栈及有序叶子 transcript 仅是受约束的证明内部工作内存，不是新的公共 lineage root 或信任机制。

测试捕获并修复了 include 自动后缀、私有动态索引、内部 Merkle 节点被重复当叶子哈希、默认 Jubjub 点以及根分支负索引等具体问题。祖先链校验拒绝根／中间／末端权限、账户或会话被撤销后继续使用，也拒绝空成员、父级缺失、跨实例和跨上下文替换。签名正确但任意一个权限维度越界仍会失败。另修复了 M5 意图转换器未核对签名中 instanceId 的缺口：现在必须额外传入精确原始分配快照，并核对其 hash；有效签名不能掩盖实例替换。

这些新增逻辑仍是私有校验组件，尚未接入完整运行时账本交易，不能分配实例、消费 nullifier、更新状态或产生有效收据。45 项包测试通过属于生成电路模拟，不是链上普通操作验收。独立只读诊断包含原有九个真实交易电路，立即测得成员检查为 k=20、705,943 行约束，并开始单工作线程真实密钥生成。旧编译探针是因被等价实现取代而主动停止，不能误写为 OOM、死锁或架构不可行。没有调整内存、工具链、架构、milestone 或 HTML，也没有提交、推送或宣称 M6 完成。

### Real key-generation failure and recovery evidence

The real `zkir compile` attempt did not complete. Its last successful process
sample reported Ubuntu PID 292, elapsed 7:31, CPU 8:14, 3,727,924 KiB RSS,
12 threads and a main-thread `futex_do_wait`. That single wait-state sample
does not establish a deadlock. A subsequent read-only process query failed
with `Wsl/Service/0x8007274c`; `wsl --list --verbose` then showed Ubuntu-24.04
stopped while docker-desktop remained running. The key command exited 1,
without a completed key or a conclusive tool error message. Both diagnostic
key files remained zero bytes.

Starting only the stopped Ubuntu distro normally restored diagnostic access;
no `wsl --shutdown`, service reset, Docker restart, memory increase or toolchain
change was performed. Narrow kernel inspection showed a new `zkir` OOM-kill
entry: kernel PID 29148, anonymous RSS 6,266,816 KiB, total VM 8,014,376 KiB.
The kernel rendered its wall time as `2026-10-14 00:06:24`, which is not used as
an exact operation timestamp because the WSL kernel and native host clocks did
not align. PID 292 was from the Ubuntu namespace and the prior `/proc` mapping
was not retained; the latest kernel kill is strong correlated memory-exhaustion
evidence, not a fully reconstructed per-process peak or proof-server benchmark.
Earlier kernel OOM entries for other prover processes are not attributed to
this attempt. This failure concerns offline key generation, not a customer's
already-built-key proof latency.

Independent native checks at `2026-10-13T15:55:50Z` showed the retained node,
indexer and patched proof-service containers still healthy; `/ready` reported
zero processing and pending jobs and capacity one. No diagnostic deployment
was attempted without keys. The real live-runner gate exited 1 at
`2026-10-13T15:57:56.008Z`, phase `asset-preparation`, category
`missing-build-assets`, before wallet startup or any transaction. This is a
failed prerequisite, not an accepted or rejected node transaction.

The tracked diagnostic source was then rebuilt with the necessary
`--compact-path packages/midnight-authorization/contracts`. Without that path,
Compact could not resolve the included main contract's `schnorr` import; this
was an include-path error, not another environment crash. The corrected
source reproduces the exact 5,045,072-byte ZKIR and SHA-256
`6d1a58afebf6c221f560f07bc66570feba74b917e029f81e27f42777c314d8ab`.
Its measured model remains `k=20`, 705,943 rows. Reproduction used `--skip-zk`
and `mock-compile` only; the known memory-intensive key attempt was not repeated.

### Additional decision boundary: whole-session subset certification

Source review of M5 `system.ts` lines 537-557 confirmed that session issuance
requires **all** session values to fit inside the capability. Strictly shorter
time is not permission to add an out-of-parent value. The new action predicate
does not certify that complete set: it checks just the selected values against
both scope roots. Added an explicit counterexample with capability resources
`{item-one}`, a holder-signed session containing
`{item-one, item-outside-capability}`, and selected resource `item-one`.
The partial predicate accepts those memberships even though M5 would reject
the session. This is deliberately labeled a missing-certification regression,
not a successful authorization fixture. No runtime ledger entry point calls
that helper.

At this concrete semantic boundary, no substitute architecture was adopted.
The recommended extension reuses complete private subset certification for
sessions, binds versioned counts/roots and activates only at finalization.
It changes session provisioning to `N+2` transactions for N staged values and
makes the total element count observable, so it needs the user's decision.
The alternative of whole-set checking in every action also needs an approved
variable-length witness representation and real proof-cost evidence. A correct
holder signature, selected-value intersection, lower depth or new hidden
scope limit cannot replace M5's full-session guarantee. Recorded both options
and stopped before wiring a live authorization path, following the canonical
workspace instruction to consult on architectural mismatches.

真实密钥生成失败：最后可读取到约 7 分 31 秒墙钟、8 分 14 秒 CPU、3,727,924 KiB RSS，之后 WSL 查询报 0x8007274c，Ubuntu 显示停止，命令退出 1，两个密钥均为零字节。仅正常启动已停止的 Ubuntu 恢复诊断，没有重置 WSL、Docker 或内存配置。内核最新 zkir OOM 记录显示匿名 RSS 6,266,816 KiB；不同 PID 命名空间映射未保留、内核与主机时钟不一致，因此保留为强相关内存证据，不伪造精确峰值或普通用户证明时间。原有链服务保持健康；真实运行器因缺少密钥在钱包启动前拒绝执行，没有发生诊断部署或交易。

新增反例进一步确认了独立的协议缺口：M5 要求整个会话集合都属于 capability。capability 只有资源 A，会话却有 A、B，当前操作选 A 时两个成员检查都通过，但 M5 应拒绝该会话。已通过专门测试明确记录，不将局部校验当作完整授权。推荐复用完整子集分阶段认证到会话，但这会引入版本化计数、N+2 笔配置交易及可观察的元素总数，需要用户批准；在获得决定前不接入真实授权入口，也不擅自用签名或集合交集替代原有规则。

Final continuation checks passed: document freshness, TypeScript, Solidity
build, 110 package cases (including 46 Midnight cases), 14 diagnostic cases
and six Hardhat cases: 130 total, zero skipped. This includes the explicitly
labeled whole-session counterexample, not a claim that its missing guarantee
is implemented. `runtime-predicates-verification.json` records the measured
program, failed real-key gate, retained healthy stack and unresolved protocol
decision. All nine baseline ZKIR files remain unchanged. No live action,
common receipt, M6 acceptance file, architectural workaround, commit or push
was produced. The next implementation choice is explicitly pending the user.

最终检查通过：文档一致性、TypeScript、Solidity 构建、110 项包测试（其中 Midnight 46 项）、14 项诊断和 6 项 Hardhat，共 130 项，零跳过。其中会话反例是显式记录未完成保证，不代表已修复或已获链上授权。机器可读证据保留证明规模、真实密钥失败、链服务健康状态及待用户决定的协议问题；原有九个 ZKIR 未改变，未产生普通链上操作、通用收据、M6 验收文件、架构绕行、提交或推送。

## 2026-10-14 — Approved full-session issuance certification

The user's subsequent “好的” approved the proposed session extension, including
N+2 provisioning transactions and observable total staged value count. The
unselected alternative was whole-variable-set checking on every action. This
continuation implements the approved option; the preceding pending-decision
entry and `runtime-predicates-verification.json` are historical snapshots, not
the current decision status.

用户随后用“好的”批准了会话扩展，包括 N+2 笔配置交易和可观察的元素总数。本轮按该方案实现，不采用每次操作重复证明整个可变长集合的替代方案；前面的待决记录和旧 JSON 保留为历史快照，不代表当前仍待批准。

### Exact protocol and code changes

- `RuntimeSessionCredential` now signs `scopeCounts` beside seven private
  roots, and requires credential version 2. Session status leaves are v2;
  account leaves remain v1 and capability leaves v2. Status commands are v3.
  The v2 attenuation certificate binds the full command, including kind,
  session hash, holder, deadline and begin-time root sequence.
- Added the internal `RuntimeScopedCredential` view so capability and session
  issuance reuse operations 2/3/4 of `updateRuntimeCredentialStatus`. No tenth
  transaction circuit, separate synchronization authority or new contract was
  added. Historical capability-map/type names remain for this shared progress.
- Begin verifies exact holder/parent bindings and current active status,
  matching target/instance/context, contained time, positive counts,
  strict count-or-time narrowing, holder command/session Schnorr signatures,
  and a session runtime key different from its holder. It cannot activate.
- Each stage reconstructs one ordered hidden value and proves membership in
  the corresponding parent scope. Finalize requires all signed counts/roots,
  rechecks **current** holder and parent status, then atomically writes the v2
  session status, advances the root, consumes the nonce and removes progress.
  Direct session activation is now forbidden. Expiry removes progress without
  activation or nonce consumption, using the existing lazy cleanup behavior.
- `SessionAttenuationPlan` requires parent trees. SDK conversion emits v2
  sessions/counts and v3 commands. Existing callers now append the canonical
  unused session argument; `capabilitySignature` carries the holder's session
  signature for kind 3. Active ancestry requires v2 session leaves.
- The disposable compiled profile is `permio-authorization-v2`, requiring a
  new matching deployment and re-signing. It is not a deployed-v1 migration.

具体变更：会话凭证和状态叶升级为 v2，状态命令升级为 v3；共用原有入口完成 begin、逐项 stage、finalize。开始时校验签名、当前持有人／父权限、精确上下文和时间；每一步证明完整哈希对应的父集合成员资格；最终再次检查当前撤销状态，仅此时原子激活。直接会话激活已禁用，过期清理不产生权限。旧部署不会被自动升级，必须使用匹配的新部署和签名。

### Regression details and fixes discovered during verification

Added 20 generated-Compact session cases and one asset-integrity case. The
original `{A}` parent / `{A,B}` session counterexample now fails count checks
at begin. An equal-count `{A,B}` parent / `{A,C}` session uses valid witnesses
for allowed values, then deliberately supplies a forged witness for C; the
generated circuit rejects C's parent membership, not merely the SDK helper.
Positive certification checks that all seven stages still leave the status
root unchanged until finalization. Separate cases revoke the parent and holder
**through the actual simulated dispatcher**, refresh paths, and confirm that
finalization rejects both without consuming the session nonce. Other cases
cover legacy versions, changed namespace/context/instance/holder/parent/hash,
unauthorized signers, reused holder key, direct issuance, duplicate/incomplete
progress, altered kind, false counts, invalid time and expiry cleanup.

The first new test run exposed a test-fixture root-sequence error: constructor
roots always start at sequence zero, although the off-chain fixture builder
had performed two inserts. Corrected the command/assertion sequence offset;
no contract assertion was weakened. An older equal-scope capability fixture
also had `issuedAt=140` with copied `notBefore=130`; corrected issuance time
to the parent's so it tests strict attenuation rather than an invalid window.
The final old/new package suites pass. Constructor-seeded active parents in
unit tests remain explicitly synthetic; they do not establish live issuance.

新增 20 项会话电路测试及 1 项密钥资产检查测试。原始扩权反例在 begin 被拒绝；等元素数但包含 C 的扩权则用伪造见证直接测试电路成员检查。另分别通过模拟的真实入口撤销父权限和持有人，确认刷新路径后 finalize 仍拒绝且不消耗会话 nonce。测试中发现并修正了构造根序号从零开始的夹具错误，以及旧等权限测试中早于 issuedAt 的 notBefore；没有削弱合约断言。构造时预置的状态根仍明确标为合成测试数据。

### Compilation, key generation and real-chain gate

Pinned Compact 0.31.1 regenerated the four tracked binding files. The changed
dispatcher has 219,039-byte ZKIR, SHA-256
`0a5b85d2531c5612811ac55c8a4308529476607f16aadd0035d22097f922bbde`.
At `2026-10-13T16:45:23.522419Z`, `zkir mock-compile -v` measured **484,064
rows, k=19**, 7,933 table rows, nine advice and 47 fixed columns. Consolidating
the issuer-key selection and two Schnorr verifications outside duplicated
root/delegate branches reduces the prior 517,658 rows despite adding sessions.
Eight other transaction programs compare byte-identical with the retained
`logs/m6-active-ancestry-managed` snapshot. Mock costing is not a real proof.

Both the original batch key build and a sequential build exited 1. The latter
reached the changed `k=19` dispatcher and left its prover and verifier files
at zero bytes. Ubuntu was observed stopped. The later readable kernel tail
contains shutdown/unmount messages, not a fresh attributable OOM kill; the
exact cause and peak for these two attempts are **not established**. Do not
copy the earlier membership-diagnostic OOM attribution onto this attempt.
No RAM, Docker, node, compiler, ledger version or privacy limit was changed.
The sequential script is retained as bounded process concurrency, not a
claimed remedy. It now prints subprocess status/signal on observable failure.

Added `compile-compact-sequential.mjs` and a generated manifest written only
after all real keys succeed. Live tests verify exact circuit inventory,
generated bindings, IR/key hashes and nonempty sizes before wallet startup;
deploy/reconnect wrappers also check. Missing/stale/empty keys fail closed.
This is a local integrity check, not governance approval. Added public-only
`test:live:m6:session`: actual empty-root account issuance, 8 root stages plus
begin/finalize, 7 session stages plus begin/finalize, session revocation and
indexed-state/reconnect checks (21 runtime transactions plus deployment).
Its M5-shaped sources are fixtures; allocator/template eligibility is not claimed.

The real runner was executed at `2026-10-13T16:42:36.501Z` and exited 1 at
`asset-preparation`, `missing-or-mismatched-build-assets`. Wallet never started;
no deployment, submitted transaction or accepted proof occurred. A read-only
health check at `2026-10-13T16:43:47.131915906Z` found node 1.0.0, indexer 4.3.3
and proof server 8.1.0 healthy; `/ready` reported zero pending/processing jobs
and capacity one. Infrastructure health does not make missing keys usable.

固定版本编译通过，新入口为 484,064 行、k=19，比之前的 517,658 行更少；通过共用签名校验消除了重复约束。其余八个交易程序未改变。但批量和逐个真实密钥构建均退出 1，留下零字节密钥；本轮没有足够证据确定是 OOM，不套用之前的诊断结论。真实会话运行器已执行，并在钱包启动前因密钥缺失拒绝运行；节点、索引器和证明服务健康不等于本轮链上验收通过。没有更改内存或工具链配置。

### Final checks and explicit remaining work

`npm run check` passed document freshness, TypeScript, Solidity build, 131
package cases (67 Midnight, including the 20 new session cases), 14 diagnostics
and six Hardhat cases: **151 total, zero skipped**. The first restricted run
stopped at Hardhat HHE22; the identical command passed with required filesystem
access. This is not an account-usage-limit or approval-quota diagnosis.
`session-certification-verification.json` records the precise partial result.
Configured codebase-index targets sibling information-flow, not Permio, so it
was not represented as a fresh index of this worktree. Devin remains behind
the local M6 implementation.

Still unverified: real session proofs/negative chain tests and restart
acceptance. Still unimplemented: private allocator/instance issuer bindings,
remaining ledger identity/fresh-key invariants, exact active runtime-module
checks, ledger-bound authorization entrypoints, nullifier/state atomicity and
common receipts. The existing action helpers do not issue an authorization or
receipt. M6 is not complete or production-ready. No shared milestone Markdown,
generated HTML, commit or push was produced in this continuation.

完整检查通过，共 151 项测试、零跳过；首次受限环境的 Hardhat HHE22 在同命令取得所需文件访问后消失，不是账号额度诊断。仍缺真实会话证明、反向链上测试及重启验收，也尚未完成分配器绑定、运行时完整入口、状态／nullifier 原子更新和通用收据。M6 保持未完成、非生产就绪；未改共享里程碑／生成 HTML，未提交或推送。

## 2026-10-14 — One monitored retry after authorized container stops

The user authorized stopping containers unrelated to the current task and
trying again. Exact running inventory was five containers. Kept
`midnight-node` 1.0.0, `midnight-indexer` 4.3.3 and
`permio-m6-proof-server` 8.1.0 for the required M6 chain boundary. Stopped only
`envio-hasura` (`c2e6a48b05b2`, about 170.2 MiB) and `envio-postgres`
(`c8b6d501d3b7`, 44.89 MiB) with `docker stop --timeout 30`. PostgreSQL exited
0; Hasura required forced termination and exited 137, with Docker
`OOMKilled=false`. No container, image, volume or database was deleted.
The two unrelated containers remain stopped and are recoverable with
`docker start envio-postgres envio-hasura` when their owner needs them.

用户批准停止无关容器后重试。仅停止 Envio Hasura 和 PostgreSQL，保留 M6 必需的节点、索引器和证明服务。释放的运行时内存约 215 MiB；PostgreSQL 正常退出，Hasura 在停止超时后被强制结束，Docker 明确未标记为 OOM。没有删除任何容器、卷或数据库；两个无关容器保持停止，之后可恢复。

Added the Linux-only `scripts/run-compact-key-retry.mjs` monitor around the
unchanged pinned sequential real-key builder. It persists whitelisted process
names/PIDs/parents, CPU time, RSS/HWM/swap and Linux available-memory counters
every ten seconds, with public compiler output in ignored logs. It never
reads `/proc/*/cmdline`, environment or wallet files. It snapshots kernel OOM
record count to distinguish historical events from a new kill.

The single retry started **2026-10-14 01:01:55.707 Asia/Shanghai**
(`2026-10-13T17:01:55.707Z`), build PID 765, compiler PID 786, monitor PID 285.
The compiler reached the expected `k=19`, 484,064-row model. At 80.1 seconds,
compiler CPU was 1:13, RSS 291,324 KiB, observed HWM 410,896 KiB and swap zero;
Linux still reported 5,815,412 KiB available and 1,785,136 KiB free swap. This
is a sampled bound, not a guaranteed final peak. The Windows WSL invocation
then exited 1. Both keys remained zero bytes, Ubuntu was stopped, and the
monitor's final event never ran. No chain transaction was attempted.

本次唯一一次重试从北京时间 01:01:55.707 开始。80.1 秒时，编译器累计 CPU 为 1 分 13 秒，RSS 为 291,324 KiB，已观察高水位为 410,896 KiB，尚无交换使用；Linux 仍有约 5.5 GiB 可用内存。随后 WSL 命令退出 1、Ubuntu 停止，监测器连结束事件也未能写出，密钥仍为空，未尝试链上交易。这些是采样数据，不能伪称完整峰值。

### More precise failure cause found in the journal

Read-only inspection of the **exact retry window** found:

```text
Oct 14 01:03:22 systemd[1]: init.scope: Stopping timed out. Killing.
Oct 14 01:03:22 systemd[1]: init.scope: Killing process 285 (node) with signal SIGKILL.
Oct 14 01:03:22 systemd[1]: init.scope: Killing process 765 (node) with signal SIGKILL.
Oct 14 01:03:22 systemd[1]: init.scope: Killing process 786 (zkir) with signal SIGKILL.
Oct 14 01:03:22 systemd[1]: init.scope: Failed with result 'oom-kill'.
```

`systemctl show init.scope` on follow-up reports `ActiveState=deactivating`,
`SubState=stop-sigterm`, `Result=oom-kill`, `OOMPolicy=stop` and
`TimeoutStopUSec=1min 30s`. Current scope memory was only 42,201,088 bytes;
its retained peak was 6,537,875,456 bytes and `memory.events` contained
`oom_kill=1`. All **four** kernel OOM records are the same before and after
the retry, ending in old PID 29148 at monotonic time 47779.991589. Journal
startup replay timestamps reprint those old records near each new invocation;
they must not be counted as four new OOMs on every startup. The scope's
historical CPU/memory peak likewise cannot be assigned to this 80-second run.

The direct cause is now confirmed: the scope manager explicitly killed the
exact monitored processes after a stop timeout. A lingering OOM-related scope
shutdown explains the observations strongly; the upstream reason that this
state persists across Ubuntu invocations has not been fully repaired or
independently reproduced. This is a more precise diagnosis than “key generation
failed for unknown reasons”, and **not** evidence that this retry exhausted
RAM. The earlier genuine OOM remains a separate historical event.

准确时间窗的日志明确显示，systemd 的 init.scope 停止操作超时后，向本次监测器、构建进程和编译器的精确 PID 发送 SIGKILL。这是已证实的直接原因。该作用域仍处于 OOM 相关的停止状态，但内核 OOM 记录前后均为原来的四条，没有增加。启动日志重放旧事件及作用域的历史 6 GiB 峰值，不能算作本次重新 OOM。残留停止状态是有力解释，但它为何跨 Ubuntu 调用持续存在，还未完成修复或独立复现。

At `2026-10-13T17:05:23.001848338Z`, the retained M6 services were still
healthy and the proof server reported zero pending/processing jobs, capacity
one. No RAM/swap, OOM policy, compiler, contract, ledger or architecture change
was made. Did not reset/restart all WSL/Docker, because that would also stop
the retained services and requires a separate approval. The recommended next
environment recovery is a clean, coordinated WSL/Docker restart preserving
all volumes, followed by only the required M6 containers and another monitored
build. `key-generation-retry.json` records the result. No commit or push.

M6 三个服务仍健康且证明服务空闲。本轮未改内存、交换、OOM 策略、编译器、合约或架构，也未擅自全局重启 WSL／Docker。建议下一步在另行批准后协调重启 WSL／Docker，保留全部卷，仅恢复 M6 必需容器，再进行带监测的构建。结果已记录，未提交或推送。

## 2026-10-14 — Approved clean WSL/Docker recovery and key retry

The user approved the coordinated restart. Before shutdown, all three M6
containers stopped gracefully with `docker stop --timeout 45`. Envio Hasura
and PostgreSQL were already stopped, but have `Restart=always`; temporarily
set those two policies to `no` so Docker startup would not bring unrelated
services back. After recovery, restored their original `always` policies
while verifying that both remained stopped. No container was recreated or
removed. Existing container IDs and the `envio-postgres-data` volume survived.

`docker desktop stop` and `wsl.exe --shutdown` completed and both distributions
were confirmed stopped. The first `docker desktop start --timeout 60` then
hit the workstation's documented, separate AF_UNIX stale-socket bug: Secrets
Engine could not rename `engine.sock` to `engine.sock.stale` because Windows
reported that the file could not be accessed. It was a Docker startup failure,
not a Compact or proof failure. The startup/status CLI calls stalled; only
those two identified CLI processes were ended after force-stopping the failed
Desktop startup, and zero Docker/Desktop/com.docker processes were verified.

Applied the canonical narrow recovery after resolving both absolute targets
and rejecting reparse points. Renamed Docker's `run` and `docker-secrets-engine`
directories to timestamped sibling backups ending `backup-20261014-012105`,
and recreated an empty `Docker/run` before startup. Backups remain intact;
their contents were not read, copied to this repository or published. No
factory reset, disk/volume deletion or secret export occurred. The second
Desktop start completed successfully; engine remains 29.8.0. This does not
claim that the underlying Windows stale-socket bug is permanently fixed.

用户批准后，先正常停止三个 M6 容器；临时关闭 Envio 自动重启，恢复后将原策略还原且保持其停止。WSL 与 Docker 已完整关闭。Docker 第一次启动遇到这台机器已有记录的旧套接字问题，按规范确认全部 Docker 进程退出并校验精确目录后，仅将两个运行时目录重命名为带时间戳的备份，再创建空运行目录。备份保留，未读出或发布任何秘密，未恢复出厂或删除卷。之后 Docker 成功启动；这不表示底层 Windows 问题永久修复。

Restored only the **same** `midnight-node`, `midnight-indexer` and
`permio-m6-proof-server` containers. At `2026-10-13T17:23:02.508475819Z`, all
three were healthy; node `system_health` returned `isSyncing=false`, the
indexer GraphQL query returned `Query`, and `/ready` reported zero processing
or pending jobs and capacity one. This verifies service recovery, not a new
contract deployment or acceptance of previously unverified runtime behavior.

The WSL kernel boot ID changed from the old
`bb26349c-3387-4f63-b6b1-e731fb2bafab` to the build's
`7d0cea0a-27f7-45d7-bb19-1511cde29e10`. `init.scope` now reports
`ActiveState=active`, `SubState=running`, `Result=success`, with zero
`memory.events` OOM/OOM-kill counters. Its `OOMPolicy=stop` was not changed.
Node remains 22.23.2 and npm 10.9.8; Linux RAM/swap remain approximately
7.6 GiB / 2 GiB. No compiler, ledger, contract, memory or policy change was
needed to reach this healthy starting state.

Started one post-recovery monitored real-key build at **2026-10-14 01:22:47.077
Asia/Shanghai**, `2026-10-13T17:22:47.077Z`, using
`node scripts/run-compact-key-retry.mjs`. Logs are under ignored
`logs/m6-key-retry-2026-10-13T17-22-47.066Z/`; monitor/build/compiler PIDs are
916/1116/1133. Baseline kernel OOM count is zero. At 100.1 seconds the compiler
was still running beyond the prior stop-timeout cutoff and had reached
`k=19`, 484,064 rows. This checkpoint supports recovery of the shutdown issue,
but is not a completed key-generation or real-proof claim. Final outcome is
recorded below when observed.

仅恢复原来的三个 M6 容器，健康检查及节点／索引器／证明服务接口均通过。新的 WSL 启动中，init.scope 正常、OOM 计数为零，未改 OOM 策略或内存设置。北京时间 01:22:47.077 开始恢复后的带监测构建，已超过此前停止超时点并进入预期电路；这个检查点只能说明关闭问题已恢复，不能提前声称密钥或真实证明成功。

### Real key generation succeeded after recovery

The monitored build **completed with exit 0**, all nine real prover/verifier
pairs and the complete integrity manifest. The monitor's elapsed counter was
627.2 seconds; UTC start/end timestamps span 660.372 seconds because the WSL
wall clock and monotonic timer disagree. Preserve both rather than inventing
an exact customer latency. Maximum observed compiler HWM/RSS was 5,097,372 KiB
(about 4.86 GiB), zero sampled compiler swap, and zero new kernel OOM records.
The ten-second sampling interval does not guarantee an exact final peak.
The changed dispatcher produced a 169,881,374-byte prover key and 2,311-byte
verifier key. Its IR hash is unchanged:
`0a5b85d2531c5612811ac55c8a4308529476607f16aadd0035d22097f922bbde`.
Manifest SHA-256 is
`4dfe685fe11e87494a2fb05af1d4d3f787989bfa616bce6772179cc4cd9724bc`.

This clears the **actual missing-key prerequisite** without changing the
contract architecture or relaxing verification. It strongly confirms that
the immediately repeated pre-recovery failures were caused by the damaged
runtime shutdown state, not a fresh per-attempt compiler OOM. It does not
erase the earlier genuine membership-diagnostic OOM or prove that every
remaining M6 circuit fits this workstation. Those are different programs.

恢复后的构建已以退出码 0 完成，九组真实证明／验证密钥及完整清单全部生成。监测器计时为 627.2 秒，但 UTC 时间戳跨度为 660.372 秒，两种时钟存在差异，均如实保留；不作为用户交易耗时。已观察编译器最高内存约 4.86 GiB，未采到编译器交换使用，也没有新增内核 OOM。此结果解除真实密钥前置阻断，并支持此前反复中止是残留运行时关闭状态导致；不抹去更早另一电路的真实 OOM，也不保证所有后续电路都能在本机完成。

### Real Local Dev verification started immediately

Executed `npm run test:live:m6:session` after the complete key build. At
`2026-10-13T17:34:33.882Z`, the runner independently verified every current
binding/program/key hash and size. It synchronized the disposable funded
local wallet, then Local Dev accepted deployment at
`2026-10-13T17:34:56.100Z`, address
`254f0b62269f054be20c0f752e3e205edcbea8012b83680d8cf28861c0e4cc28`.
At `2026-10-13T17:38:07.906Z`, the chain accepted runtime account issuance,
transaction `00b034d5391a05701c2b20bf071a0293c100002de624190e0d865df85f1a4fffc3`.
The indexed root and sequence matched the SDK tree before proceeding to
root-capability staging. This is an actual proof/transaction, not simulation.

Read-only counters at `2026-10-13T17:38:09.059Z` showed service-lifetime process
HWM 6,878,920 KiB (about 6.56 GiB), cgroup peak 7,073,259,520 bytes, current RSS
209,124 KiB and process swap 13,736 KiB. Cgroup OOM and OOM-kill counters were
both zero. Unlike the 4.86 GiB offline compiler measurement, this peak is from
the **real proof service** since restart, including deployment/first runtime
transaction. It exceeds a strict 6 GiB RSS ceiling; do not describe it as a
proven 6 GiB-client configuration. The full staged workflow was still running
at this checkpoint and must not be labeled complete on one accepted account.

真实密钥就绪后立即执行本地链测试，完整资产哈希校验、钱包同步及部署成功；第一笔运行时账户签发交易也已真实获链接受，并核对索引根与序号后继续父 capability 分阶段认证。证明服务的实际高水位约 6.56 GiB，与离线编译器的 4.86 GiB 是不同指标；它超过严格 6 GiB RSS 上限，不能说已经验证了 6 GiB 客户端配置。此检查点尚未完成整个会话流程，不能凭账户交易就宣称会话或 M6 已验收。

### Full real credential/session workflow passed

`npm run test:live:m6:session` subsequently exited **0** with all 21 runtime
transactions accepted, plus deployment. The final verified event was
`2026-10-14 02:36:28.701 Asia/Shanghai`
(`2026-10-13T18:36:28.701Z`). No proof-server restart or memory-setting change
occurred during this uninterrupted run. It used the existing local weak-cache
image `sha256:82f867abc556806f3742fb165b9cba8c898045a71e99bba8a8b33b37237bb1c9`,
four allocated CPUs (`NanoCpus=4000000000`) and one proving job slot.

| Actual phase | Accepted runtime transactions | Verified status-root sequence after completion |
| --- | ---: | ---: |
| Account issuance | 1 | 1 |
| Root capability: begin, 8 hidden values, finalize | 10 | 2 |
| Session: begin, 7 hidden values, finalize | 9 | 3 |
| Holder-authorized exact session revocation | 1 | 4 |

Both staging sequences left the credential-status root unchanged until
finalization, as checked by the actual indexed state against the SDK tree.
After session activation and revocation the exact indexed roots matched
again, and reconnect to the same deployment passed. Independent public-only
query at `2026-10-13T18:44:18.870Z` confirmed sequence 4, zero temporary
certification sessions and four consumed command nonces. `activeTemplates=0`
also makes the fixture boundary explicit: this runtime slice does not claim
an allocated active-template instance or a completed action module.

Critical accepted public references (all 21 IDs/timestamps are preserved and
cross-checked against the raw event file in `clean-restart-verification.json`):

- Root capability finalization: `00c8f33f82a49757b032e130e0d60e481266976015f5bb082ec28827f4e7d5889e`.
- Session begin: `00f487922a795022aba5e67e7ceb084f208e524c2a64e58d8320dbbe5f21a704ac`.
- Session finalization: `00b786792bf891d972c9ba7d193189a78562c333705b52dc9ab042670be56e84db`.
- Session revocation: `000337b7609b4959807b5b6ba25a5d965bcd8e195902aa346e3efa55b7b900a7eb`.

完整真实运行以退出码 0 结束，部署及 21 笔运行时交易全部成功：账户签发 1 笔、父 capability 配置 10 笔、会话配置 9 笔、会话撤销 1 笔。索引状态根依次为 1、2、3、4；两种分阶段认证都在最终确认之前保持状态根不变。重新连接通过，另一次独立公开查询确认临时认证为零、消耗 nonce 为四。activeTemplates 为零，明确这仍是凭证／会话切片，不代表已完成分配器或普通操作模块。全部交易 ID 与原始公开日志逐条一致。

### Actual time and memory, without relabeling setup as a user action

Asset verification to final verification took **3,714.819 seconds (61m55s)**.
The event window from root capability finalization to session finalization
covers all nine session-setup transactions and took **1,607.164 seconds
(26m47s)**. The 20 successive accepted-runtime-transaction intervals range
from 150.141 to 197.531 seconds, mean 174.959 seconds. These include client
orchestration, proving, submission and indexing. No independent proof/check
timer was added and no ordinary-action proof was measured.

At completion, proof-service lifetime HWM was **7,211,336 KiB (6.88 GiB)**,
cgroup memory peak **7,436,992,512 bytes (6.93 GiB)**, and kernel-recorded
cgroup swap peak **1,477,718,016 bytes (1.38 GiB)**. These independent maxima
are not necessarily simultaneous and must not be added as an observed joint
peak. Final process RSS fell to 215,672 KiB; cgroup OOM and OOM-kill counters
remained zero. The container has no separate memory cap (`MemoryLimitBytes=0`)
and shares the measured 7.65 GiB WSL VM with 2 GiB swap and the node/indexer.
Thus this validates the recorded serial prototype profile, **not** a strict
6 GiB RSS limit, no-swap mode, stock upstream service, mobile/browser proving,
minimum hardware specification, concurrency or production capacity.

Updated the existing delivery-feasibility document with this factual addendum,
retaining the two already documented delivery directions and their private-
witness trust boundaries. Finite successful execution is demonstrated for
this credential slice, but a roughly 27-minute new-session setup is not an
interactive consumer onboarding result. No hosted-prover trust change,
architecture substitution, reduced depth or toolchain upgrade was adopted.
The different earlier `k=20` membership diagnostic remains unverified.

实际整轮耗时约 61 分 55 秒，会话九笔配置交易窗口约 26 分 47 秒，连续交易接受间隔平均约 175 秒。这些含编排、证明、提交和索引等待，不是独立证明计时，也不是普通用户操作。证明服务进程高水位约 6.88 GiB，容器组内存峰值约 6.93 GiB，交换峰值约 1.38 GiB；峰值未必同时发生，不能直接相加为已观察联合峰值。零 OOM，任务结束后 RSS 降至约 211 MiB。本次验证了既有单任务、四 CPU、7.65 GiB 共享虚拟机加 2 GiB 交换的原型配置，未证明严格 6 GiB、无交换、原版证明器、浏览器／手机或生产并发可用。已按实测更新交付评估，不擅自改变证明信任边界或架构。

### Checks and remaining boundaries

After the real run, `npm run check` passed again: documentation freshness,
TypeScript, Solidity build, 131 package cases (67 Midnight), 14 diagnostics
and six Hardhat cases — **151 total, zero failures/skips**. The 21 public
transaction records in the evidence JSON were independently compared with
the raw log and match exactly. Required services remain healthy and the
proof server is idle. Envio remains stopped, with its original restart
policies restored; recovery backups remain retained.

Still incomplete: private allocation/instance issuer bindings, remaining
runtime identity/fresh-key checks, exact active action-module configuration,
ledger-bound action authorization, atomic state/nullifier updates, common
receipts/finalized source, required negative node transactions, post-deployment
restart and full privacy/production acceptance. The pre-deployment recovery
and SDK reconnect are not substituted for that restart gate. M6 remains
incomplete, and M7/M8 may not treat this credential trace as a common receipt.
No shared milestone Markdown or generated HTML was edited; no commit or push.

真实运行后重新完成全部 151 项本地检查，零失败、零跳过；机器可读证据中的 21 条公开交易记录与原始日志逐条相符。M6 服务健康且证明服务空闲，Envio 保持停止，原重启策略及恢复备份保留。分配绑定、完整动作授权、状态／nullifier、通用收据、负面链上测试及部署后重启等仍未完成；本次部署前恢复和 SDK 重新连接不能替代该重启验收。M6 未完成，M7／M8 不能把此凭证轨迹当作通用收据。未改共享里程碑或生成 HTML，未提交或推送。

## 2026-10-14 — Resume with the private allocation slice

### Exact source findings and implementation boundary

The user asked whether M6 could continue after infrastructure recovery. Work
resumed in `feat/m6-m8-midnight-delivery`, preserving the preceding dirty
implementation and evidence. The Permio Devin wiki still presents M1–M5;
its focused answer called allocation "signed", but current
`packages/scenario-governance/src/model.ts` and `registry.ts` show that
`InstantiationAuthorization` is an unsigned in-memory record with exact target,
request ID, allocator ID and timestamp. M5 `system.ts` consumes it once,
rechecks active exact template/hash, initializes the M2 initial state, and
records a nonempty explicit capability-issuer list. The configured code index
still targets sibling `information-flow`, so it was not used as a Permio index.

Current M6 credential issuance checks namespace authority, not that explicit
instance issuer list. No runtime action entry point exists yet. This turn
first implements the private allocation record and prepares the double
issuer-membership predicate; it does **not** report the existing dispatcher as
already allocation-bound. The original M5 creation snapshot hash remains the
instance identity used by runtime credentials, not a hash of mutable later
state. No new receipt format, authority root or trust bridge was introduced.

用户确认基础设施恢复后继续 M6。保留原工作树修改，并核对 Devin 与当前源代码：M4 分配授权实际是不带签名的类型化内存记录；M5 单次消费、重查精确激活模板、初始化 M2 初始状态并明确列出签发者。现有 M6 凭证入口还只检查命名空间资格。本轮先实现分配记录和实例／命名空间双重签发者成员检查，不声称旧入口已接入。配置中的本地索引属于 information-flow，未冒用为 Permio 索引；未引入新收据、权限 root 或桥接。

### Concrete changes and privacy/authority checks

Added `contracts/runtime-instance-allocation.compact` to the existing contract.
Its `RuntimeInstanceAllocation` v1 signs the exact template target, original
M5 snapshot hash, private instance/request ID hashes, exact M4 authorization
commitment, allocator leaf commitment, explicit issuer-tree root/count,
initial-state commitment, policy/root versions, target network/deployment,
authorization/creation/expiry/submission times, and independent allocation
nonce. `RuntimeStateOpening` v1 includes the instance, private state ID hash
and a fresh nonce. `src/instance-allocation.ts` checks the active M2/M4/M5
correspondence, original state, allocator/request, lifetime, exact issuer
principal/key mappings, unique keys/IDs, nonempty issuer set and nonzero
32-byte nonces. `signRuntimeInstanceAllocation` uses the existing allowlisted
Schnorr profile with an explicit allocation domain; M4 Ed25519 remains unchanged.

The new `allocateRuntimeInstance` transaction verifies current allocator
membership (authority kind 4, never governance or capability-issuer kind),
root/policy references, an active exact template, deployment, signature and
time bounds. It atomically writes the allocation commitment and initial state
commitment with sequence zero, and consumes separate stable request and instance
identity nullifiers. A new nonce or changed snapshot cannot reuse either ID.
Retirement/revocation blocks new allocations without rewriting prior records.
Public instance records contain only four fields:
`allocationCommitment`, `currentStateCommitment`, `transitionSequence`,
`lifecycleStatus`; the map key is `instanceCommitment`. Namespace/template
lookup and the creation/submission window are observable. Private issuer-tree
root/count, M4 record content, expiry, state opening and nonces are not published.

`assertRuntimeInstanceIssuer` checks both exact allocated issuer membership and
current namespace eligibility (kind 6), plus time and namespace/policy. It
cannot promote an arbitrary namespace issuer into an instance issuer. Its
current scope is a generated private predicate, **not** an accepted runtime
credential/action proof. Exact authority leaves are pinned; rotation cannot
silently substitute another issuer or validity/policy. The SDK verifies the M2
initial state locally; independent final Compact policy/configuration binding
is still unfinished. Stable replay nullifiers also do not hide dictionary
guesses of low-entropy IDs; fixtures use fresh random private instance/request
IDs, and production privacy acceptance remains required.

The additional ledger/API requires the matching disposable
`permio-authorization-v3` build/deployment. Existing v2 credential/session live
evidence is retained as historical evidence; no deployed verifier or production
state is migrated. Credential/status versions themselves did not change. The
source has ten transaction circuits; this normal implementation addition is
being measured promptly against the unchanged Local Dev deployment-weight
limit, not assumed safe from simulator results.

Although dispatcher logic and row count are unchanged, its exact program/key
hashes changed in the new contract build (current program
`27f5d3e13db7a9f0719e2c62d6641f22bc454af7071367c6a29395331f89d108`).
The earlier 21-transaction v2 credential run is not proof acceptance for this
v3 verifier. Final matching-build credential/session regression remains required.

新增私有分配断言 v1、带随机 nonce 的初始状态 commitment、SDK 桥接校验和原 Schnorr 配置下的分配签名。链上只允许当前权限 root 中的 kind 4 分配器对激活精确模板分配，原子初始化四字段公开记录及序号零，并分别消费请求／实例标识 nullifier；换 nonce 或快照不能重复分配。公开查询及提交时间窗，隐藏签发者树、M4 内容、实例到期时间、状态标签和 nonce。kind 6 签发者必须同时属于实例名单及当前命名空间，但该谓词尚未接入旧凭证／动作入口。M2 初始状态的最终电路策略绑定及低熵标识猜测风险仍是未完成验收。新版是一次性 v3 匹配部署，凭证版本未变，旧 v2 证据保留；不迁移旧合约或生产状态。

### Commands and observed checks before the real-chain run

The first pinned `compact compile +0.31.1 --skip-zk ...` stopped with an explicit
potential-witness-disclosure error: combining a private network comparison
with `kernel.self()` using `&&` conditionally executed a ledger operation.
Separated the network/deployment assertions and the two block-time assertions;
the compiler then succeeded. No extra private field was disclosed to suppress
the diagnostic. Generated bindings were regenerated by the compiler only.

Added nine allocation cases to `test/admission-envelope.test.ts`, reusing its
real generated governance/activation simulator fixture and extending the
fixture's namespace authorities. Cases verify exact initialization/replay;
request reuse for another instance; instance reuse under a new snapshot;
wrong signatures and governance/issuer role misuse; altered private fields,
roots, exact template hash and deployment; invalid/expired/future time bounds;
retirement and revocation with unchanged prior history; the two mandatory
issuer memberships; and M4/M5/issuer/nonce adapter mismatches. Signed issuer
root/count and all four signed time fields are also mutation-tested.

`npm run test:midnight-authorization` passed 76/76; diagnostics passed 14/14.
`npm run check` then passed documentation freshness, TypeScript, Solidity
compilation, 140 package cases (76 Midnight), 14 diagnostics and six Hardhat
cases: **160 total, zero failures/skips**. All three required local containers
were healthy. `AGENTS.override.md` remains ignored; shared milestone Markdown
and generated HTML were not edited.

Real sequential key generation started at `2026-10-13T19:18:25.985Z` under the
same clean kernel boot `7d0cea0a-27f7-45d7-bb19-1511cde29e10`, with no concurrent
real proof job. Raw public resource diagnostics are in ignored
`logs/m6-key-retry-2026-10-13T19-18-25.962Z/`. The dispatcher remains
`k=19`, 484,064 rows; the allocation circuit is `k=16`, **52,704 rows**.
The live runner now has an explicit `--allocation-only` mode and root npm
command `test:live:m6:allocation`, which skips the expensive existing credential
fixture and runs allocation plus the governance lifecycle. It creates actual
M4/M5 allocations, a matching deployment and a real signed allocation, reads
indexed state, reconnects, and keeps prospective retirement/revocation history
checks. Invalid calls are explicitly labeled generated-Compact preflight,
not node-rejected proof transactions. No private errors are serialized.

首次编译发现私有比较通过短路 `&&` 条件执行账本操作，会产生潜在 witness 披露；拆开断言后编译成功，没有为绕过错误额外公开字段。新增九项分配测试，连同原回归共 160 项全部通过（含 76 项 Midnight、14 项诊断和六项 Hardhat），零失败／跳过。分配电路为 k=16、52,704 行，原 dispatcher 保持 k=19、484,064 行，正在用固定工具链逐个生成真实密钥并准备真实分配交易。测试明确区分生成电路预检查拒绝与节点拒绝交易；未改共享里程碑或生成 HTML，未提交或推送。

### Final real-key and chain results for this allocation slice

The sequential build completed with **ten nonempty real key pairs**, exit 0,
at `2026-10-13T19:30:43.232Z`. Monitor elapsed was 690 seconds; UTC event
span was 737.247 seconds. Maximum observed compiler HWM was 5,097,408 KiB
(about 4.86 GiB), sampled compiler swap zero, no new kernel OOM records.
Allocation compiler HWM was 644,276 KiB. These are build observations, not
user proof memory/latency. Allocation IR SHA-256 is
`0ed22ebe9d679ebde45f50b298e7a8617f8c64d0432495a667d58e16daf8a3ad`;
the prover is 21,616,084 bytes and verifier 2,311 bytes. Exact asset and
manifest hashes are in `allocation-verification.json`; asset guards passed.

`npm run test:live:m6:allocation` exited 0. The unchanged pinned node accepted
the ten-circuit v3 deployment at `2026-10-13T19:31:31.122Z`, address
`a40543792f814abc6bd4caf131f0c36d94c8f69ecbcb8b3353f8bd432ebbe919`.
The full trace contains **17 accepted transactions plus deployment**:
module proposal, two reviews, two approvals and activation; expired staging
and normal begin/stage/final activation; one allocation; two root approvals;
module deprecation/revocation; template retirement/revocation. Expired staging
was automatically cleaned. All 17 exact IDs/timestamps are copied directly
from the public JSONL log into `allocation-verification.json`.

Allocation finalized at `2026-10-13T19:40:08.777Z`, transaction
`003e87041e8be68003babf9c1421f83815b49e05a785328e750a0329adfd2abd2c`.
Instance commitment:
`3c01dc26bcb0c056a9497d8e3ebc0fbd08c9f9a0f5e59d42cfcc7fe90620a983`.
Allocation commitment:
`d754aa1a6685a8bbfca794084c576c1f2137f02437c08a2b1840cdff86ddd845`.
Initial/current state commitment:
`964af4f50c0756cc73d6f51722852af65d3a46ae747c02a73edfd88c5c28c102`.
Indexed commitments matched, sequence was zero, both nullifier counts one;
reconnect confirmed them at `19:40:09.823Z`.

Wrong signatures, altered state commitment, stale root, altered exact template
hash and replay were rejected in **generated Compact preflight**, not as
node-rejected proof transactions. Retirement at `19:45:32.416Z` and revocation
at `19:46:02.378Z` blocked new allocation preflights without rewriting the
existing allocation. Five private allocation sentinels (random request/instance
IDs, issuer identity and two nonces) were absent from captured public logs;
this is not a full artifact privacy scan. Final verification at `19:46:02.492Z`
confirmed module status/sequence 6/8, template status 3, original activation
sequence 1, lifecycle sequence 3 and authority-root version/sequence 2/2.

A separate public-only read at `19:47:24.754Z`, without wallet/private witness,
confirmed both exact commitments, the four public record fields, sequence
zero, both nullifier counts one, credential-status sequence zero and final
template/module/root lifecycle values. Proof-service cgroup OOM/OOM-kill
counters were zero; final process RSS was 484,816 KiB. Service-lifetime HWM
and cgroup peak include the preceding v2 credential workflow and are not
attributed to this allocation's peak.

Activation-to-allocation verification was **30.039 seconds**; stack-ready to
allocation was 535.817 seconds, and to final governance verification 889.532
seconds. The latter windows include shared governance and intentional expiry
waiting. The short interval includes SDK preparation, negative preflight,
proving, submission, indexing and replay check. It is one sample, not isolated
proof, ordinary-action latency, minimum hardware or production capacity.
Updated the delivery-feasibility document with that precise distinction.

Strengthened the role-collapse negative test to use each forbidden authority's
**correct fixture signing key**, then reran `npm run check`: all **160 cases**
passed again, including six Hardhat cases, zero failures/skips. No Compact
source changed after key generation. The prior 21-transaction credential trace
remains v2-only evidence; the final matching verifier still needs that live
regression because unchanged dispatcher logic/rows do not imply unchanged keys.

Still required: allocation/issuer enforcement in credential and action entry
points; final initial-state/template-policy proof binding; identity/fresh-key
checks; both ledger-bound runtime action families; atomic action transitions
and scoped nullifiers; common finalized DecisionReceipt; negative node
transactions, contention, deployment restart and full privacy acceptance;
ordinary-action measurements. M6 remains incomplete. No universal administrator,
architecture/toolchain/memory change, shared milestone/HTML edit, commit or
push. Unrelated Envio containers remain stopped and recovery backups retained.

十组真实密钥全部生成，exit 0；监测器计时 690 秒，UTC 跨度 737.247 秒，编译器已观察高水位约 4.86 GiB，无新增 OOM。原节点接受十电路 v3 部署，完整流程通过 17 笔交易及部署；精确 ID 和时间全部保存在 JSON。真实分配、索引 commitment、序号零、两类 nullifier 计数和重新连接均正确，模板退役／撤销后新分配预检查被拒，原记录不变；五项私有哨兵未出现在日志。无钱包／无 witness 的独立公开读取再次确认记录和最终生命周期。OOM 为零，但历史服务高水位不能算作这次分配峰值。分配单次窗口 30.039 秒，不是普通动作或独立证明耗时；完整准备含治理及过期等待。使用被禁止角色正确密钥加强测试后，全部 160 项检查再次通过。旧 21 笔凭证轨迹仅属于 v2，最终匹配验证器仍须重跑。签发者接入、初始策略绑定、完整动作、状态／nullifier、通用收据、节点负面交易及重启／隐私验收仍待完成；M6 未完成，未提交或推送。


## 2026-10-14 — exact allocation and original-issuer credential binding

Concrete gap found while connecting the v3 allocation slice: the dispatcher
accepted a namespace issuer without checking the instance's exact issuer list;
root revocation also accepted another namespace issuer, while M5's
revokeCapability requires the original issuerRef. Implemented the prescribed
boundary in the existing dispatcher and authority root, not a replacement
architecture or governance synchronization bridge.

- Added private RuntimeCredentialInstanceBinding (exact allocation opening,
  allocated issuer membership, bounded public proof-submission deadline).
  Issuance checks immutable allocation, exact template/instance, active status,
  creation time and private expiry. Revocation can clean up after instance
  expiry; expired certification cleanup remains permissionless and cannot
  activate anything.
- Capability credential/status-leaf v3 binds the original authority-leaf
  commitment. Descendants inherit it. Account v1/session v2 remain unchanged;
  SDK deployment profile is now v4, requiring a fresh disposable deployment.
- Fixed a separate physical-position bug: a valid empty-leaf path at another
  index previously matched the empty status root. Mutation/account/parent
  paths must now match their signed credential indices. Account issuance must
  not predate allocation creation.

Initial real compiler run (logs/m6-key-retry-2026-10-13T20-23-25.695Z)
measured k20/733,347 rows. Verified the exact zkir PID and parent before SIGTERM
at 20:27:12.213Z, before the high-memory phase. This was an intentional stop,
not an OOM or proof of infeasibility. Shared repeated account/parent hashing,
certification inputs and the command signature check without removing checks.
The next build (20:27:50.867Z–20:39:51.072Z) generated all ten real key pairs:
dispatcher k19/418,047 rows, observed compiler HWM 5,097,272 KiB, sampled swap
zero and no new kernel OOM. Monitor elapsed 672 seconds differs from the UTC
span because process/sampling scheduling is not a stopwatch guarantee.

Position/time checks add 291 rows (final k19/418,338). An intermediate local
source attempt used reserved Compact keyword let; compilation failed at parse
time without generating keys or causing OOM. Replaced it with the explicit
20 direction-bit weighted sum supported by the pinned compiler. Final rebuild
started 20:48:39.679Z; its result will be recorded below, not inferred from the
previous key set.

Migrated credential tests to explicit allocated genesis state. That test-only
helper is labeled simulation setup, discovers the generated map rather than
hardcoding its slot, and is not a production allocation bypass. Added eight
cases covering exact success, absent/altered/cross-template/instance allocation,
namespace-eligible but unallocated issuer, wrong physical slot, boundary
indices, lifetime/pre-creation errors, another allocated issuer's root
revocation and begin/final issuer substitution/legacy version. The initial
84-case run passed 83 and failed one expected-message regex (allocation lifetime
versus allocated instance lifetime); the contract correctly rejected the
request. Corrected the assertion and started the full root check. Fourteen
diagnostics passed. Existing parent-revocation fixture also needed its actual
parent credential, not the child placeholder; corrected without weakening the
original-issuer check.

Replaced the live unallocated credential fixture with actual M4 allocation,
M5 instance creation/account registration/root issuance/session issuance, then
21 real credential transactions: account issue; root begin+7 stages+final;
session begin+7 stages+final; session revoke; original issuer root revoke.
Two valid namespace keys are allocated; a third is current-root eligible but
not allocated. Forbidden-issuer checks use correct signatures and are labeled
generated-circuit preflight, not negative node transactions. Public request
timing explicitly includes submission/indexing, not isolated proof latency.
The historical unallocated memory-smoke now fails closed before wallet startup.

The regression's declared M2 maximum duration is 14,400 seconds and its
instance lasts two hours. This deliberately tests long-lived staged setup; it
does not demonstrate completion for 900-second grants or change an application
policy. The helper also checks its M5 grant duration against the declared M2
rule until final policy proof binding is implemented. This limitation must
remain visible in production feasibility reporting.

Only midnight-node, midnight-indexer and permio-m6-proof-server are running;
all were healthy before the new live run. Unrelated containers/data, pinned
versions, memory policy, architecture, shared milestone Markdown and generated
HTML were not changed. No commit or push. Full M6 remains incomplete: final
policy/identity/action integration, atomic action state/nullifiers, common
DecisionReceipt, node-negative/concurrency/restart/privacy acceptance and
ordinary-action performance are not replaced by this credential regression.

本轮发现并修复实例签发者名单未接入、根能力撤销未固定原签发者，以及状态 Merkle 路径未绑定物理索引的问题。沿用既定架构与权限 root；能力/状态叶 v3，账户 v1、会话 v2，部署配置 v4。初始 k20 被精确主动终止，不是 OOM；共享重复计算后十组真实密钥成功，补充索引检查后最终为 k19/418,338 行。记录了一次不支持 let 的编译语法错误和一次拒绝消息匹配错误，没有掩盖或弱化校验。真实回归改用完整 M4/M5 API，要求分配后执行 21 笔凭证交易；测试的长时效配置不能当作短时效授权或普通动作的生产性能证据。最终匹配密钥、完整检查和真实链结果将在后续条目中记录。M6 未完成，未提交或推送。


### v4 real credential trace: passed core, failed later replay assertion

Final build 20:48:39.679Z–21:02:19.940Z generated all ten real key pairs,
exit 0. Monitor elapsed 765.2 s; UTC span 820.261 s. Largest observed compiler
HWM 5,097,252 KiB, sampled swap zero, no new OOM. Dispatcher remained
k19/418,338 rows. Contract JS SHA-256:
41756988e7349637e1fd286d50e274efc37fb4bc10a326d9f3e7e4417481fb7e.

The first full v4 attempt used logs/m6-live-2026-10-13T21-03-09.941Z.jsonl
and deployment 1be3fd72e94da575bbb6e1c564432dfcc6786d3aed09cf6f80f6146bc7a2bfc0.
The original node accepted deployment plus 32 transactions, including all
21 allocated credential operations. Allocation transaction:
00d259cb5ca4704e8ea9f423af770a2a369111cc63c72d5007f892cd2e62890ef1.
Original-issuer root revocation at 22:12:50.709Z:
005d5cce3388829add75dd24443aea9d88a4fe5d1ff07d729e1a7a6b36b1008dbe.
Exact status-root reconstruction passed after every transition, ending at
sequence 5. The namespace-eligible but unallocated issuer and the correctly
signing secondary allocated issuer were rejected in generated preflight.
These are not negative node transactions. Independent public reads after all
seven root/session stages confirmed sequence 1/2 and one temporary session;
staging alone did not activate the respective credential.

Root setup: 1,552.514 seconds for nine transactions. Session setup: 1,543.463
seconds for nine. Across 21 calls, min/p50/nearest-rank p95/max were
155.538/168.820/185.806/195.355 seconds, including proving/submission/indexing.
832 memory samples, zero sampler errors and zero cgroup OOM/OOM-kill deltas.
Maximum sampled RSS 6,965,400 KiB; maximum VmSwap 1,306,512 KiB;
maximum simultaneous RSS+swap 7,963,976 KiB. The independent maxima are not
added together. Runtime paging occurred despite zero compiler swap; a 6 GiB
client budget is not demonstrated. Service HWM/peak predates this trace.
Observed i5-11300H, eight WSL CPUs, prover four-CPU quota, shared WSL
8,019,584 KiB RAM and 2,097,152 KiB swap, one proof job, no container memory
cap. Native CIM read was unavailable; WSL reported the CPU model.

At 22:12:51.790Z the harness exited 1 after indexed-state verification.
Concrete cause: the old admission envelope had a one-hour staging window,
but the test deferred its expected nonce-replay rejection until after an
hour of credential proofs. beginM4Activation checks deadline before consumed
nonce. The request was correctly rejected for expiry, so the strict
nonce-error regex failed. Reproduced guard ordering with a generated-circuit
test at a late clock. Moved that strict replay check directly after activation,
without loosening the regex or modifying Compact/keys. Also prepare a fresh,
valid M4/M5 allocation before template retirement, rather than using the
old expired allocation window for prospective lifecycle negatives.

Added verify-live-m6-public-state.ts and npm run verify:m6:public-state.
It reads only explicit worktree public logs and public indexer state, checks
real paths/options/hashes, never loads a wallet or witness, and supports
strict final fixture assertions. Two CLI safety tests pass; the real public
reader worked, and premature --final correctly exited 1. Root check previously
passed all 168 cases; the two new reader cases require the final 170-case run.
Typecheck and targeted late-replay/issuer-ancestry tests passed after changes.

A full rerun started at 22:18:42.020Z, same real verifier/key fingerprints,
public log logs/m6-live-2026-10-13T22-18-40.605Z.jsonl, new deployment
0e9960a11727dad379710a7d9b7f7105d6f044f6c2b881db42665a91fa8b2450.
Its result remains pending and is not inferred from the successful 21-call
subtrace. issuer-binding-verification.json preserves both attempts explicitly.
No architecture, compiler/ledger version, authority layout, memory/swap/OOM
policy, shared milestone or generated HTML change; no commit or push.

最终十组密钥成功、无 OOM；首轮 v4 部署加 32 笔交易被接受，其中 21 笔真实分配后的凭证操作全部通过，状态序号最终为 5。根能力和会话九笔设置各约 25.9／25.7 分钟，单调用中位数 168.820 秒。832 次采样无错误／OOM，RSS 最高 6.64 GiB、swap 最高 1.25 GiB、同时 RSS 加 swap 最高 7.60 GiB，不能宣称 6 GiB 客户端可用。随后 nonce 重放断言因激活封装一小时窗口已过而失败，合约正确触发较早的过期检查；已用生成电路复现并前移严格重放检查，没有修改合约或放宽断言。退役负面夹具也改为新鲜真实 M4/M5 分配。新增公开读取命令、两项安全测试和真实公开检查；完整重跑正在进行，首轮不能记为整套工具通过。未改架构／资源策略或共享 milestone，未提交／推送。


### Corrected complete v4 run and persistence verification

The unchanged ten-circuit v4 build passed the full rerun: exit 0, deployment
plus 38 accepted transactions, including 21 credential transactions.
Public trace: logs/m6-live-2026-10-13T22-18-40.605Z.jsonl.
Deployment: 0e9960a11727dad379710a7d9b7f7105d6f044f6c2b881db42665a91fa8b2450.
The strict nonce-replay rejection passed at 22:27:39.311Z, before admission's
deadline (1791933969 / 23:26:09Z), without relaxing the expected error.
The subsequent hour-long credential workflow therefore did not invalidate
that test's premise. The first failed attempt remains recorded separately.

Real allocation accepted at 22:28:13.668Z, transaction
0019a8173dada86cf89a7730e9bb0de90bc2a996c2c4bae5bd13ed0c351c253a8b.
Instance commitment:
73d5c990a6bce4270103f9377bdd6a480b4a77e6648c49b825077be675d26a11.
Allocation commitment:
6429aa0a3eadc1842ec2570c1674ccd7a4803c8d53cfbe16640fe00aa9fedb43.
State commitment:
e9b67a0721041d24254a7f40ffd69320c6b884e51479689a03cf5bcf5ec24623.

The correctly signed unallocated-issuer request was rejected at
22:28:14.145Z; the correctly signed secondary allocated issuer's attempt
to revoke the original issuer's root was rejected at 23:30:09.809Z.
Both were generated Compact preflight failures, not negative node
transactions. Actual M5 registerContextAccount/issueRootCapability/
issueSession/revokeSession/revokeCapability APIs supplied the domain records.
All 21 real credential transactions and exact reconstructed roots passed,
verified at 23:32:50.063Z; status sequence 5, five consumed command nonces,
zero temporary certification sessions. Reconnect at 23:32:51.626Z retained
that status and the immutable allocation.

Root certification's nine calls took 1,697.327 s (28.289 min); session's
nine took 1,678.941 s (27.982 min). Across all 21, min/p50/nearest-rank
p95/max request-to-acceptance were 157.214/180.310/216.015/220.931 s.
The complete trace ran 22:18:42.020Z–23:39:07.289Z, including governance,
intentional expiry waiting, allocation and lifecycle. These are not ordinary
actions, isolated proof latency, independent samples or a production SLA.
The final root check ran after all 21 credential calls, alongside smaller
governance proofs, not during the measured credential sequence.

961 resource samples, zero sampling errors, zero cgroup OOM/OOM-kill deltas.
Maximum sampled RSS 6,968,572 KiB (6.65 GiB), VmSwap 1,346,616 KiB (1.28
GiB), simultaneous RSS+swap 7,993,176 KiB (7.62 GiB). Do not add independent
maxima or attribute the older 7,211,336 KiB service HWM to this run.
The resource configuration was unchanged. The sampled RAM already exceeds
6 GiB; minimum hardware and consumer production feasibility are not proved.

Two root governors rotated to version/sequence 2/2. Module deprecation and
revocation, template retirement and revocation, duplicate/privilege-collapse
negatives and fresh prospective allocation denials all passed. The fresh
negative allocation was prepared through real M4/M5 APIs immediately before
retirement, with current root 2/2 and valid lifetimes, rather than relying on
an expired original deadline. Original allocation history stayed unchanged.
Final governance verified at 23:39:06.971Z: module status/sequence 6/8,
template status 3, activation sequence 1, lifecycle sequence 3, two root
approvals, one historical template, credential status sequence 5 and no
temporary credential sessions. Seventeen private sentinels were absent from
captured public logs; a separate key/witness/seed-marker scan also passed.
Expiry hiding and full artifact/inference privacy are not claimed: the
fixture deliberately selects expiry-minus-one as a public deadline.

Final npm run check passed all 170 tests, including 16 diagnostics, 84 Midnight
cases and six Hardhat cases: zero failures/skips, docs current, typecheck
passed and Solidity build clean. The compiled manifest and all ten real
key/program pairs still matched after the run; all 14 captured source hashes
were unchanged. No Compact source/key edits after generation.

Independent wallet-free/witness-free final public reads at 23:40:10.728Z
and 23:44:37.042Z matched every public field across targeted service restarts.
Only midnight-node (started 23:41:00.809Z) and midnight-indexer (started
23:43:39.817Z) restarted, retaining the same container IDs/images/data.
Proof service remained started at 17:22:00.473Z; no recycling or resource
policy change. Node header advanced from 0x976e to 0x9793, not genesis.
All three services healthy. This proves persistence of this public
allocation/credential/governance slice, not ordinary-action restart or wallet
recovery acceptance. Sleep-prevention was released and no proof job remains.

Evidence: issuer-binding-verification.json preserves exact transaction IDs,
source/program/prover/verifier hashes, both attempts, timings, samples,
commands and before/after restart reads. Historical v3 allocation evidence
only gained a continuation link; its outcomes/hashes were not rewritten.
M6 remains incomplete: final policy/identity/action entry points, atomic
action state/nullifiers, common DecisionReceipt, negative node transactions,
contention and full action/restart/privacy/performance gates remain. No
universal administrator, alternate architecture, dependency/lockfile,
toolchain/memory/swap/OOM-policy change, shared milestone/HTML edit, commit
or push. Unrelated stopped containers and recovery backups were preserved.
The configured index still targets information-flow, not this Permio worktree.

修正后的完整 v4 重跑 exit 0：部署加 38 笔真实交易，其中 21 笔凭证交易全部通过；严格 nonce 重放检查前移后于有效期内通过，没有放宽断言。真实 M4/M5 API、精确状态根、重新连接、原始签发者撤销及所有治理生命周期检查均正确。根能力九笔设置 28.289 分钟，会话九笔 27.982 分钟；21 笔端到端中位数 180.310 秒、p95 为 216.015 秒，范围 157.214–220.931 秒，不是普通动作或独立证明 SLA。961 次采样无错误／OOM，RSS 最高 6.65 GiB、swap 最高 1.28 GiB、同时合计 7.62 GiB，仍未证明 6 GiB 客户端可用。170 项完整检查全部通过。仅重启节点和索引器，容器／镜像／数据未更换；无钱包／witness 的前后公开读取完全一致，节点区块高度未回到创世，三个服务健康，证明器未重启。17 项私有哨兵和密钥／witness 标记扫描通过，但公开截止时间约定和完整推断隐私仍有限制。JSON 保留两次运行全部具体证据，未覆盖首轮失败。M6 最终策略／身份／动作、状态和 nullifier、通用收据及节点负面／并发／完整隐私等验收仍待完成；未提交／推送，未改共享 milestone、架构或资源策略。

## 2026-10-14 — Exact M2 policy projection and initial-state allocation binding (v5)

Scope: continue M6 in the existing M6–M8 worktree. No M7/M8 implementation,
new architecture, dependency/toolchain upgrade, memory/swap policy change,
commit or push was authorized or performed.

Concrete gap: v4's allocator signature bound an initial-state commitment,
but Compact did not prove that its opening was the exact M2 initial state.
The activation registry already authenticated a per-action configuration hash;
it did not open that configuration during allocation.

Implemented runtime-template-policy.compact and template-policy.ts.
The projection reparses M2 and retains the exact namespace/template/version/
content-hash target; it commits the action/profile/family, context, actor slot,
initial state, selector, purpose, recipient kind, disclosure rule, duration,
delegation depth, revocability, input/output type lists, adapter and declared
transition tree. This is data, not template execution. Unknown M2/selection
fields, proof families, module versions and receipt profiles fail closed.
The schema is documented in runtime-policy-v1.md, including its precise hash
domains and the existing namespace activator's responsibility for correspondence
between M2 JSON and the signed projection. Compact does not reparse JSON or
verify M4 Ed25519 reviewer signatures.

allocateRuntimeInstance now requires a final RuntimeAllocationPolicyWitness.
It checks the private configuration opening and complete binding path against
the active template root, then proves a nonzero-nonce v1 state opening for the
same instance whose label hash equals the activated initial state and whose
commitment equals the signed allocation. Only afterward are the instance and
allocation replay nullifiers inserted. No capability/action trust is granted.
The public RuntimeInstanceRecord layout and transaction-circuit count remain
unchanged. Contract profile advanced to permio-authorization-v5.

Implementation failures and corrections:

- Initial generated-circuit tests failed because Array.map supplied three
  callback arguments to a Compact pure function accepting exactly one.
  Replaced the direct callback with an explicit one-argument closure.
- Positive binding tests then caught distinct existing identifier domains:
  activation uses permio:action-id:v1, runtime intent uses
  permio:runtime-action-id:v1. Added bindingActionIdHash alongside runtime
  actionIdHash, derived from the same validated action. Neither historical
  domain changed. The pair's M2 correspondence is part of the signed projection.
- Stopped only the verified obsolete zkir PID 6928, parent 6907, with SIGTERM.
  Its 00:03:48.806Z–00:08:18.692Z trace exits 1 intentionally, with no new
  OOM. The first stop command failed PowerShell parsing before execution;
  a literal single-quoted shell script then verified PID/name/parent and
  terminated only that agent-started compiler.
- A hash-equality test initially compared Buffer and Uint8Array prototypes;
  normalized both to Buffer without changing the bytes or contract.
- The extra two-action test confirmed M2 rejects an action with no transition.
  It now tests an explicit same-state row and rejection outside that declared
  state. No implicit self-loop or template-schema change was introduced.
- Default sandbox WSL access returned E_ACCESSDENIED; the approved WSL call
  succeeded. Default npm run check reached Hardhat HHE22, while rerunning
  with access to installed local dependencies passed without an install or
  dependency edit. These were local execution boundaries, not account quotas.

Real key build: logs/m6-key-retry-2026-10-14T00-08-39.681Z,
00:08:39.692Z–00:25:58.509Z, exit 0, all ten real pairs verified.
Monitor elapsed 965.0 seconds differs from the UTC span 1038.817 seconds;
retain both clocks rather than call either an isolated proof benchmark.
Maximum sampled compiler RSS/HWM was 5,097,256 KiB; sampled compiler swap
and new kernel OOM records were zero. Allocation grew from k=16/52,704 rows
to k=17/97,862; the dispatcher stayed k=19/418,338.
Exact program/prover/verifier comparison against v4 confirms only allocation
changed; all nine other triples are byte-identical. Generated JS SHA-256:
40164c335cde816fa461725c00a472f78fed95c1ad8916734b30460c1e4d914c.
Allocation IR/prover/verifier hashes are retained in the verification JSON.

Final npm run check: exit 0, 180 tests, zero failures/skips: diagnostics 16,
protocol 6, M2 15, M3 14, M4 16, M5 13, Midnight 94 and Hardhat 6.
The new coverage includes all policy-field substitutions, binding/module/
profile/hash/path tampering, multi-action manifests, both configured families,
declared transitions, a correctly signed arbitrary-state allocation, wrong
instance/nonce, no nullifier mutation on failure, and the existing issuer/
privilege/lifecycle regressions. These are generated-circuit tests, not
negative transactions rejected by the node.

Live command:
.\scripts\run-live-m6-awake.ps1 -LiveArguments @('--allocation-only','--profile-memory')
Trace: logs/m6-live-2026-10-14T00-26-56.233Z.jsonl.
The unchanged node accepted fresh deployment
00045470cb55c0850cc1d5413983614f34a0b43c621fe99c35b9ce7253ba3da9
at 00:27:27.131Z. Only the same three healthy M6 containers are running;
proof-server quota remains four CPUs with no container RAM cap. Random private
state labels and their initial-state hash were added to log sentinels.
The live allocation/governance outcome is recorded in the completion entry below.

本轮继续既有 M6 工作树，实现精确 M2 策略投影及初始状态分配证明，不改架构、工具链或资源策略。v4 仅由分配器签名任意初始状态承诺；v5 通过既有激活配置哈希和绑定根，检查私有策略、同一实例的模板初始状态、非零 nonce 及签名承诺后才写入实例／消耗 nullifier。公开记录及十交易电路数量不变。投影与 M2 JSON 的对应关系仍由既定命名空间激活者负责，不宣称链上解析 JSON 或验证所有 Ed25519 审查。日志保留了 map 多参数、两个动作哈希域、Buffer 原型、无迁移动作校验，以及 sandbox／Hardhat 执行问题和修复。旧编译器经精确 PID／父进程核验后主动停止，非 OOM。最终十组真实密钥构建通过，只有分配程序及密钥变化；分配增至 k17／97,862 行，最大编译内存约 4.86 GiB，无新 OOM。两种时钟耗时分别保留。180 项完整测试通过；新的本地 v5 部署已被未修改节点接受，最终真实链结果另记于完成条目。未提交／推送。

### v5 live allocation/governance completion — 2026-10-14 00:44 UTC

The complete allocation-only harness exited 0. Fresh deployment plus all 17
transactions finalized; the captured interval was 00:26:57.761Z–00:44:16.251Z
(1038.490 seconds), not an ordinary customer latency benchmark. Activation
was accepted at 00:36:49.538Z; the allocation/indexed check at 00:37:38.546Z
followed 49.008 seconds later, including SDK preparation, eight negative
preflight checks, proving, submission and indexing. No isolated allocation
proof latency was measured.

Allocation transaction:
009b6d3a73dd4bf607102d4f11d30be4acf14f366c9088703843f97e152c73f584
Instance commitment:
6dd7b1388f7ad281261da8d9fa4cb762a81169811da9c58f2689d720c114abcf
Allocation commitment:
8c723583ef12770a1f0aaa4c664ccb51beb43f6962f91a29a6040071db87db03
Initial/current state commitment:
dae1fe2bc76540cbd74a18d1a2649d9f387691be1455f4eb6b5f14e0cd4f806e

The actual node accepted the policy-opening allocation proof. Wrong policy,
wrong opening, a correctly signed arbitrary-state allocation, altered hash,
stale root, wrong signature and replay failed generated Compact preflight.
No negative node transaction is claimed. Expired staging cleanup, both review/
approval thresholds, independent activation, two root governors, module
deprecation/revocation, template retirement/revocation and privilege boundaries
passed. New allocation after retirement or revocation was denied in preflight;
the original allocation and state history stayed unchanged.

Final fixture: authority root version/sequence 2/2; module status 6 and
registry sequence 8; template status 3, activation sequence 1 and lifecycle
sequence 3; one historical template and one allocated instance; one request
and one instance-identity nullifier. Credential root sequence and used
credential command nonces remain zero: this command intentionally did not
repeat the 21-transaction v4 credential workload. No temporary credential or
activation sessions remain.

Wallet-free reads at 00:38:35.466Z and 00:45:41.707Z matched the exact allocation,
state and instance commitments and sequence zero across the lifecycle changes.
The latter used explicit allocation-only final assertions, since the generic
reader's --final option expects the credential fixture. Both the root command
and the exact supplemental assertion command are retained in
template-policy-verification.json. No service restart was performed in this
continuation; the separate v4 restart evidence was not relabeled.

210 proof-service samples, zero sampling errors and zero new OOM/OOM-kill
events. Maximum sampled RSS 4,074,788 KiB (3.89 GiB), maximum swap 35,228 KiB,
maximum simultaneous RSS+swap 4,092,240 KiB (3.90 GiB). The historical HWM
7,211,336 KiB predates this run and did not increase. These are combined
governance/allocation samples, not an isolated allocation minimum, cold
benchmark or capped-6-GiB feasibility result. Resource settings stayed fixed.
The test-scoped sleep request was released; no proof/build job remains.

All 13 private log sentinels, including random state labels and the private
initial-state identifier hash, were absent. A separate generic key/seed/
witness-marker scan passed. Full artifact and inference privacy remains
unaccepted. Final integrity verification rehashed all 16 captured source
files and all ten real program/prover/verifier pairs: unchanged/matching.
180-test final check remained the source/test result; subsequent edits were
documentation/evidence only. No dependency/lockfile, shared milestone,
generated HTML or ignored AGENTS change, commit or push.

Next M6 gates remain: identity/fresh keys, exact active module/schema and
policy/evidence checks in actual action entry points, both ordinary action
families, atomic action state/nullifiers, common DecisionReceipt, negative
node/concurrency/replay tests, full action restart/wallet recovery/privacy and
ordinary-action production measurements. M7/M8 must not interpret these
partial credential/allocation events as final M6 receipts.

v5 完整分配／治理流程 exit 0：新部署加 17 笔交易全部确认；模板激活至分配核验 49.008 秒，含 SDK、八项负面预检查、证明、提交和索引，不是独立证明或普通动作延迟。正确签名但错误初始状态等命令在预执行阶段拒绝，没有冒充节点负面交易。治理生命周期、阈值权限根轮换及新分配限制通过，既有实例／分配／状态承诺和序号在两次无钱包独立读取中一致。最终权限根 2/2、模块状态 6／序号 8、模板状态 3／激活序号 1／生命周期序号 3、实例及两个分配 nullifier 各一；凭证序号仍零，未把 v4 的 21 笔凭证流程改称 v5。210 次采样无错误或新增 OOM，RSS 最高 3.89 GiB、同时加 swap 为 3.90 GiB；历史 HWM 不计新峰值，未证明受限 6 GiB 消费端可用。13 项私有日志哨兵及通用密钥／witness 标记扫描通过，完整隐私仍未验收。16 源文件和十组密钥／程序哈希核验通过，临时防休眠释放，无构建／证明任务遗留。具体失败、命令、交易、状态、哈希及局限保存为 JSON；M6 普通动作、身份／证据、模块／模式、原子状态、通用收据和节点负面／并发等条件仍未完成，未提交／推送。

## 2026-10-14 continuation — M5-P1 integration and authenticated slot rules (v6)

The accepted M5 milestone was not reopened. M5-P1 was committed separately as
07df341ffabc65aa5e23302fddc644498017b018. This continuation changes M6 and its
scripts/evidence only; the M5-P1 package and its acceptance record stay clean.

### Verified gap and implementation

Policy v1 bound the action's actorSlotIdHash but not the assignableBy rules.
A caller-supplied assignment rule could therefore not be authenticated against
the activated configuration. This is a missing typed policy projection, not
a new signature incompatibility or a reason to introduce a trusted bridge.

- Policy v2 adds slotAssignmentRulesRoot and slotAssignmentRuleCount after the
  actor slot hash. Its typed commitment domain is permio:runtime-policy:v2.
  V1 is rejected rather than interpreted under a changed layout. The current
  deployment tag is permio-authorization-v6; v5 evidence remains historical.
- The rule tree includes every permitted context/slot/assigner alternative in
  M2 order. Rule leaves distinguish creator, namespace governance and occupied
  slot, with canonical zero/nonzero assigning-slot hashes. Compact verifies
  rule version, exact context/slot, discriminator, leaf, physical position,
  count and root. Allocation authenticates that root through its activated
  configuration. There is still no proof that a particular account was assigned.
- A private M5-P1 adapter follows exact parent assignment IDs, rejects cycles,
  wrong holders/contexts/instances/targets and inactive ancestors, and prepares
  complete root-to-terminal rule openings. It checks the actual creator or
  exact-namespace M4 governance list, not administrator/issuer labels. Returned
  data are private defensive copies marked private-witness-only, not a chain
  credential, allowed decision, receipt or public JSON.
- Ordinary customer and delegated-session fixtures now use the real M5-P1
  assignment API. They prepare seven scope paths and the private slot chain,
  separately time slot-witness preparation, and reject missing/revoked slots.
  Negative cases increase from 10 to 12. Account revocation is caught by the
  earlier slot guard; original M5 denial ordering is unchanged.
- The benchmark still exits 2 in --require-chain mode with zero transactions,
  null proof latency and no receipt. Public reports whitelist counts/timings/
  status and exclude assignment IDs, accounts, records, paths, keys/signatures.
  Selecting the generic action profile in a fixture is not production approval.
- Review caught a potentially excessive Cartesian expansion before the rule
  tree's capacity check. The adapter now counts combinations before allocating
  or hashing them. A valid M2 fixture with over 1,048,576 rules is rejected
  without building the million-leaf tree; that regression passes.
- The live allocation harness adds rejection of legacy policy v1, altered rule
  root and altered count. Its event explicitly records
  slotAssignmentAuthorityProved=false. These are generated-Compact preflight
  checks, not transactions rejected by the node.

No M2/M4/M5 schema, Ed25519 path, reviewer-key registration, namespace authority,
administrator, public key nullifier, extra root or transaction circuit was
introduced. No maximum slot ancestry depth or new assignment credential kind
was adopted. Real chain issuance/revocation and current role-state binding
remain required before slot-authorized ordinary actions can pass.

### Failures and environment observations

The first WSL command used Ubuntu, but this workstation registers Ubuntu-24.04.
The command failed with WSL_E_DISTRO_NOT_FOUND. A read-only distribution listing
identified the existing name; the corrected command used it without installing
or changing WSL. Node 22.23.2/npm 10.9.8 and Compact 0.31.1 remained pinned.

A slot-path tampering test tried to modify a readonly goes_left field directly;
TypeScript rejected it with TS2540. Only that deliberate tampering expression
received an explicit mutable cast. Production readonly types were not weakened.

An apply_patch attempt referenced an outdated benchmark placeholder and was
rejected before edits. The exact existing line was read before the corrected
patch. A build diagnostic tried to read the readiness manifest while keys were
still compiling; it was absent, as observed. No replacement manifest was
fabricated. The v5 comparison uses the preserved historical manifest embedded
in template-policy-verification.json; the new real manifest exists only after
all ten actual pairs completed.

The first complete integration check passed 229 tests: diagnostics 16,
protocol 6, M2 15, M3 14, M4 16, M5 50, Midnight 106, Hardhat 6; zero skips.
The separately added expansion-bound test makes the policy suite 14/14.
Final checks after that addition are recorded in the completion evidence.

### Real compiler/key result and live run in progress

Command: wsl.exe -d Ubuntu-24.04 bash -lic "... node scripts/run-compact-key-retry.mjs"
Build directory: logs/m6-key-retry-2026-10-14T01-47-07.065Z.
Start/finish: 01:47:07.087Z–02:01:09.687Z, exit 0, ten real pairs.
UTC span 842.6 seconds; monitor elapsed 778.5 seconds. Preserve both clocks,
not an invented isolated proof latency. Compiler peak RSS/HWM 5,097,256 KiB;
sampled compiler swap and new kernel OOM records were zero.

Allocation remains k17 and grows from 97,862 to 100,179 rows. The unchanged
credential dispatcher remains k19/418,338. Only allocation's exact IR/prover/
verifier triple changed against v5; the other nine triples are byte-identical.
Generated JS SHA-256: c9283ced1b94df7d52ddaeecb01ad22529213a100aa9d41ccfb17de4c4a8013f.
No resource limit, container image, contract split or toolchain change occurred.

Live command:
.\scripts\run-live-m6-awake.ps1 -LiveArguments @('--allocation-only','--profile-memory')
Trace: logs/m6-live-2026-10-14T02-02-03.644Z.jsonl.
Fresh deployment was accepted at 02:02:33 UTC, address
5dddde178aac6a043d080f30bd7c21b019c8a112a5440b3673ec08f35abda667.
This is disposable local governance/allocation, not ordinary-action acceptance.
Several profiler reads failed during the run. Read-only diagnostics confirmed
all three M6 containers healthy, with the same 8.1.0-weak-cache proof server,
four-CPU quota and no container RAM cap. Gaps must stay in the final evidence;
sampled maxima are not guaranteed peaks. The transaction/proof outcome and
test-scoped sleep-request release will be recorded after the harness exits.

The wiki still reflects M1-M5 and the local index points to information-flow,
not this worktree. Current M6 behavior was verified in exact local source;
the wrong repository's index was not used or refreshed. No shared milestone
Markdown, generated HTML, private instruction bridge, dependency or lockfile
was edited. No M6 commit or push was made by this continuation.

本轮继续接入独立提交的 M5-P1，不改已验收 M5 或其证据。具体缺口是 v1 只绑定动作槽位 ID，没有认证分配规则。v2 增加规则根／数量和新的承诺域，v6 新部署拒绝旧布局，不改写 v5 历史。规则树包含上下文允许的全部槽位及权限替代项；Compact 检查版本、上下文／槽位、权限类型、位置、数量、叶与根。私有适配器保留完整精确上级链，重新检查创建者、命名空间治理或已占用槽位，拒绝错配、循环和失效；输出只是 witness，不是链上凭证、获准决定或收据。普通用户和有限委托流程使用真实 M5-P1 API，并分别测量槽位准备时间；新增缺失／撤销槽位反例，负例共 12 项。--require-chain 仍 exit 2、零交易、空证明延迟、无收据。公开报告不泄漏分配／账户／路径。容量检查前移，避免先展开超过 1,048,576 条规则的乘积；对应反例通过。本轮不增加新权限、管理员、根、凭证种类、槽位链深度限制或交易电路，真实链分配／撤销与当前角色状态仍待实现。日志保留了错误 WSL 名称、只读测试类型错误、过期补丁上下文和构建中 manifest 缺失及具体修复。首轮完整 229 项通过；新增容量测试后策略套件 14 项通过，最终检查另记。十组真实密钥通过，UTC 842.6 秒与监测 778.5 秒分别保留；编译内存最高 5,097,256 KiB，无采样 swap／新 OOM。分配仍 k17，增至 100,179 行；凭证入口仍 k19／418,338，只有分配程序／密钥变化，其余九组一致。v6 新部署已接受，治理／分配流程仍在进行，部分采样失败必须保留。三容器健康，资源和版本不变。未改共享 milestone、生成 HTML、私有指令、依赖或锁文件，未提交或推送 M6；普通动作、真实槽位权威、证据、模块／模式、原子状态及通用收据仍未完成。

### v6 first live attempt — RPC timeout with an independently observed state effect

The profiled attempt exited 1 at 02:17:46.209Z. Seven transaction IDs were
recorded after deployment; the final logged success was the expiring staging
session. Terminal output then reported submitAndWatchExtrinsic received no
RPC response for 60 seconds. The sanitized harness retained only its generic
private-error category. No contract rejection or new policy defect is inferred.

Independent wallet-free reads at 02:24:31.174Z and 02:26:23.431Z showed the
module active (status 4/registry sequence 6), one staging session, one reserved
nonce, zero used admission nonces, zero activated templates and zero instances.
The session expiry was 1791947693, not the earlier expiring session's 1791944091;
binding index was zero. Thus the replacement staging transaction DID affect
indexed state despite the client timeout. It was not blindly resubmitted or
reported as a rejected transaction. Its transaction ID was not recovered.

The captured profile interval was 941.165 seconds, with 152 successful samples
and 10 missing samples, including the final read: incomplete. Sampled RSS
maximum was 4,090,604 KiB; swap 2,264 KiB; simultaneous sum 4,092,868 KiB.
Historical HWM stayed 7,211,336 KiB. Available samples show no OOM/OOM-kill
counter increase, but gaps prohibit an exact-peak/completeness claim.

Post-failure node finalized-head RPC responded and all three containers were
healthy. No service, resource policy, image, ledger or compiler was changed.
The underlying RPC delay is unconfirmed; concurrent checks and profiling are
context, not an established cause. The failure preceded allocation, in a
governance entry whose program and keys are unchanged from v5.

The script's ephemeral private M4 fixture was not persisted, so this failed
run is not a successful resumable-wallet/action-restart test. A new disposable
deployment was started after all tests finished, without the optional profiler.
The first deployment/history is retained; no keys, private fixture or receipt
were fabricated to resume it. The first sleep-prevention request was released.

Final source check: npm run check exits 0 with 230 tests (Midnight 107), zero
failures/skips, and docs/TypeScript/Solidity build passed. The guard preventing
excessive host rule expansion was added during the first live attempt, after
that process loaded its fixture builder; it changes only rejection of oversized
inputs, not the compiled Compact program or this two-rule fixture's output.
The 20-file current-source fingerprint was captured at 02:22:51.737Z, before
the fresh retry, and is the snapshot used for that retry's integrity check.
First-attempt source fingerprints are not misrepresented as that frozen snapshot.

v6 首轮在 02:17:46.209Z exit 1，部署后记录七笔交易，最后成功日志为过期暂存。终端显示 submitAndWatchExtrinsic 在 60 秒内没有 RPC 响应，未据此认定合约拒绝或新策略有错。两次无钱包独立读取显示模块状态 4／序号 6、暂存与预留 nonce 各一、未使用登记 nonce、零激活模板和实例；新截止时间 1791947693 不同于旧值 1791944091，绑定索引仍零，证明替换暂存交易虽客户端超时却已影响索引状态。未盲目重发，也未冒充节点拒绝；未恢复该笔交易 ID。941.165 秒捕获窗口有 152 次成功采样和 10 次缺失，含最终读取，故不完整。采样 RSS 4,090,604 KiB、swap 2,264、同时合计 4,092,868；历史 HWM 未增，现有样本 OOM 计数未增，但不保证完整或精确峰值。事后 RPC 可响应、三容器健康，无版本、资源或服务变化；并行负载／采样只是背景，根因未确认。失败发生在尚未进入分配的旧治理程序，不能归咎新规则验证。私有测试夹具未持久化，不能声称钱包／动作恢复通过；保留旧部署历史，测试结束后另建临时部署、关闭可选采样重跑，不伪造密钥、夹具或收据。首轮防休眠已释放。最终 230 项完整测试通过，Midnight 107 项，无失败或跳过，文档／类型／Solidity 构建通过。宿主容量检查在首轮加载夹具后补入，只增加超大输入拒绝，不改 Compact 或当前两条规则的结果；02:22:51.737Z 的 20 源文件快照在重跑之前捕获，仅作为重跑完整性依据，不冒充首轮冻结快照。

### v6 retry completion — 2026-10-14 02:45 UTC

The fresh allocation/governance harness exited 0. Its deployment plus all 17
transactions finalized; captured window 02:27:47.685Z–02:45:33.358Z
(1065.673 seconds). Trace:
logs/m6-live-2026-10-14T02-27-43.534Z.jsonl.
Contract: 9602419ea423cbfc7485162ea0cab890b8de8468835a0f904d2610015689591b.
Allocation transaction:
006f7b0987ca310b94275d8a7b5d1e3a33454f9de68bcd4dfa71a8a4b9c5b3a483.

The unchanged node accepted the policy-v2 allocation proof. Legacy v1, altered
slot-rule root/count, arbitrary signed state, stale root, wrong signatures,
hash substitution and replay were rejected in generated-Compact preflight.
Eleven allocation negatives are recorded, not negative node transactions.
Activation-to-allocation verification was 46.503 seconds, including SDK
preparation, all negative checks, proving, submission and indexing. It is not
isolated proof latency or an ordinary-action benchmark.

Expired staging cleanup, unique threshold approvals, independent activation,
root rotation, module deprecation/revocation, template retirement/revocation,
prospective new-allocation rejection and reconnect passed. The final record
has root version/sequence 2/2, module status 6/registry sequence 8, template
status 3/activation sequence 1/lifecycle sequence 3, one historical template,
one instance and one request/instance nullifier each. Credential sequence and
command nonce count are zero, with no credential staging sessions.

Independent wallet-free reads at 02:41:50.493Z and 02:48:18.580Z preserved:
instance e250ae987134a9e1e22316639fa9076f3406da2183d7070103bffd1b84da961d;
allocation 2df9c3189175adae5c688fcdea0b2e6c56d9313bfc6e1ba4e5060d27cefbde31;
state f35b250f7ed80496fd68314d5483055dd0095ab1f16ada77b131212316982e61;
transition sequence zero. The second read explicitly asserted allocation-only
final counters; generic reader --final belongs to the credential fixture and
was not weakened. Exact reproducible commands and all public events are in
slot-assignment-verification.json.

The successful retry intentionally had no optional memory profiler. Its peak
is unmeasured: do not reuse the failed attempt's 152 samples/10 gaps as its
measurement or call it a capped-6-GiB test. Resource settings and versions
were unchanged, with no service restart. The SDK/private-wallet stop and
test-scoped automatic-sleep prevention were released. No build/proof job remains.

The harness verified 13 private log sentinels absent; a separate private-key/
mnemonic/witness-marker scan passed. Twenty captured source files and all ten
real program/prover/verifier pairs matched. Full privacy/inference acceptance
is still unclaimed. An evidence-only orchestration helper initially assumed
structuredClone existed in its isolated tool runtime; it did not. JSON-only
metadata copying repaired that ReferenceError before final evidence writing;
no production source or private witness was changed by that repair.

Final complete repository check remains 230 cases, zero failures/skips.
M5-P1, shared milestone Markdown, generated HTML, dependencies/lockfile and
private instructions remain untouched; no M6 commit/push. The remaining
cryptographic assignment/current-role checks, actual ordinary-action entry
points, policy/evidence enforcement, atomic state/nullifiers, common receipts,
real negative-node/concurrency/replay, action recovery/privacy and production
measurements remain explicit M6 gates. M7/M8 must not treat these allocation
events or host witness objects as final M6 receipts.

v6 新部署加 17 笔治理／分配交易全部确认，exit 0，捕获窗口 02:27:47.685Z–02:45:33.358Z，共 1065.673 秒。真实节点接受策略 v2 分配；旧 v1、规则根／数量篡改、错误签名、错误状态／哈希、旧根及重放等 11 项在预执行拒绝，不能冒充节点负面交易。激活至分配核验 46.503 秒包含 SDK、负例、证明、提交和索引，不是独立证明或普通动作延迟。过期暂存清理、唯一阈值审批、独立激活、权限根轮换、模块／模板生命周期及重连通过；最终根 2/2、模块 6／序号 8、模板 3／激活 1／生命周期 3，历史模板与实例各一、两个分配 nullifier 各一，凭证序号／nonce 均零、无凭证暂存。两次无钱包独立读取确认上述实例、分配、状态承诺及零迁移序号保持一致；最终读取使用明确的 allocation-only 断言，不弱化通用 reader。成功重跑未采样，内存峰值未测，不能复用失败轮的 152 样本／10 缺口或声称 6 GiB 限额验证；无版本、资源或服务重启变化。钱包和防休眠已释放，无构建／证明遗留。13 项私有哨兵、通用密钥／助记词／witness 标记及 20 源文件、十组真实程序／密钥核验通过，完整隐私仍未宣称。证据工具的 structuredClone 不可用曾触发 ReferenceError，仅以 JSON 元数据复制修正，不改生产源码或私有 witness。最终 230 项完整测试无失败／跳过；M5-P1、共享 milestone、HTML、依赖／锁文件及私有指令不变，未提交／推送 M6。真实槽位分配／当前角色、普通动作、策略／证据、原子状态／nullifier、收据、节点负面／并发／重放及恢复／隐私／生产测量仍未完成，M7/M8 不能把当前分配事件或宿主 witness 当作最终收据。

## 2026-10-14 continuation — reproduce the slot-chain architecture boundary

This continuation intentionally did not guess a new chain representation.
Navigation was rechecked: Devin Permio still lists only M1–M5; codebase-index
health points to sibling information-flow, not this worktree. Exact local
source/tests are authoritative; the wrong index was neither used nor updated.
HEAD remains 07df341ffabc65aa5e23302fddc644498017b018.

Added three M6 regression cases, without editing M5:
- create a valid reusable manager rule and 33 distinct registered managers,
  then assign the actual customer's requester slot, producing 34 exact records;
- revoke manager assignment 1 (outside the final 17), check the requester
  becomes inactive while assignment 0 remains active, then reassign the same
  manager with a new ID and confirm old descendants remain inactive;
- revoke that distant manager's context account and confirm the same
  prospective descendant invalidation.

All registration occurs at 131 before assignments at 135–168, respecting the
M5-P1 mutation watermark; evaluation is at 169. Keys are generated synthetic
Ed25519 account keys, never exported or logged. The customer's capability
remains the original root grant at depth zero. The long chain is slot
provenance, not excessive capability delegation. The private M6 adapter
retains all records and still returns private-witness-only, not authorization.

Direct command:
node --test packages/midnight-authorization/test/slot-assignments.test.ts
passed 11/11, zero failures/skips; recorded duration 45080.3654 ms is a test
runner duration, not a proof or production latency. npm run typecheck passed.

Two minimal intentionally invalid compiler inputs test a runtime-sized Vector
and runtime loop; a fixed 17-element Vector/loop is the valid control. Inputs
are tracked under test/fixtures/compiler-bounds, NOT production contracts.
scripts/diagnose-m6-slot-bounds.mjs runs only these inputs into fresh ignored
logs directories, requires the exact expected errors and verifies the valid
control's compiler/runtime and absence of ledger proof entries.

Commands ran in Ubuntu-24.04 using compact compile +0.31.1 --skip-zk. The
initial restricted WSL invocation returned Wsl/E_ACCESSDENIED; the scoped
approved invocation reached the actual compiler. Both variable-bound cases
reported invalid context for reference to variable name count. A first
reproducibility-runner attempt assumed the shell's exit code 1 also appeared
through spawnSync; the wrapper returned 255. The repaired runner requires
nonzero rejection plus the exact language diagnostic, while retaining the
actual code 255; arbitrary process/environment failures do not pass.
The constant control exits 0, compiler 0.31.1/runtime 0.16.0, proof false.
The WSL localhost-proxy warning is retained as environment context, not
misidentified as the compiler cause. No network fetch is required by the runner.

Successful diagnostic window: 03:13:58.209Z–03:14:01.990Z.
Report: logs/m6-slot-bounds-Dj106q/report.json.
Reproduce in WSL:
node scripts/diagnose-m6-slot-bounds.mjs
Its portable report/source hashes are preserved in
slot-assignment-boundary-verification.json. The official Compact reference
was checked, but it targets language 0.27.0; the actual pinned diagnostic
provides the evidence for our 0.23.0 language. No toolchain update was made.

A related authority check found no separate slot-governance authority in the
current namespace kinds 1–12. Slot rule numbers 1/2/3 cannot map numerically
to author/reviewer/activator. Creator means the original allocator identity,
not any eligible allocator. Assigning new implicit powers or truncating a
valid chain would prejudge the architecture, so neither was implemented.

The proposal awaiting user approval keeps the one-deployment design, existing
roots/signature profile and M5 semantics, versions private instance state for
slot records, verifies full provenance in bounded stages, and introduces only
an explicitly scoped governance leaf under the existing namespace root.
Only finalization could authorize; stages would not issue receipts. All pinned
state/root freshness, replay, revocation, expiry and concurrent-finalization
requirements must be tested. Long chains need more transactions; even an
unrelated change to a pinned namespace status root can force a restart.
No ordinary-action latency or production feasibility is inferred. A depth
limit would instead require an explicit semantic change and separate patch.
See slot-assignment-architecture-boundary.md; no proposal is marked adopted.

npm run check exits 0: documentation freshness, TypeScript, Solidity build,
diagnostics 16, protocol 6, M2 15, M3 14, M4 16, M5 50, Midnight 110 and
Hardhat 6 = 233 passing cases, zero failures/skips. Midnight duration was
149796.8287 ms; Hardhat reported 30959 ms. These are test durations, not
proof timing. The real asset-integrity regression passed against the existing
ten production circuit/key pairs.

No production Compact entry point/binding/key, dependency/lockfile, M5 source
or accepted evidence, shared milestone Markdown/HTML or private instruction
file changed in this continuation. Zero new Midnight transactions and zero
new key pairs; earlier live results remain historical partial evidence.
Compiler diagnostics are not ledger proofs or node rejection tests. M6
remains incomplete. No commit/push or service/resource changes were made.
Production slot implementation pauses for the requested architecture decision,
not for an account quota or infrastructure outage.

本轮先复现槽位链问题，不擅自采用新表示。Devin 仍只有 M1–M5，索引属于 information-flow，故以当前本地源码核验，不使用或更新错误索引；HEAD 不变。新增三个 M6 回归，用真实接口创建 33 个 manager 加客户 requester，共 34 条；撤销最后 17 条之外的上级分配或账户，末端失效但根上级仍有效；用新 ID 重新分配不恢复旧下级。注册在 131，分配在 135–168，169 检查，遵守时间水位；仅内存生成合成账户密钥，不输出。客户能力仍深度零根授权，所以不能用能力深度限制槽位链。私有准备保留全部记录，不授予链上权限。槽位套件 11/11、单独类型检查通过，45 秒是测试时长，不是证明延迟。

两个故意无效的 Compact fixture 检查运行时 Vector／循环，常量 17 为对照；位于 test fixture，不是生产合约。新增可复现 runner 在独立忽略日志目录编译，要求精确错误并核验对照编译器／runtime、无 ledger proof。初始受限 WSL 被拒，批准的限定调用到达真实 0.31.1 编译器；变量长度报 invalid context for reference to variable name count。runner 初版错误假设 wrapper 与 shell 都退出 1，实际 spawnSync 是 255，已修为非零且精确错误并保留真实码，任意环境失败不能通过。常量 exit 0、compiler 0.31.1／runtime 0.16.0、proof false；WSL localhost proxy 警告不冒充编译原因。成功诊断为 03:13:58.209Z–03:14:01.990Z，报告和复现命令如上，官方参考面向语言 0.27.0，当前版本以实际输出为准，未升级。

当前权限 1–12 无独立槽位治理，规则 1/2/3 不能数字映射成作者／审查者／激活者；创建者不是任意合格分配器。静默增加权力或截断会提前决定架构，故未实现。建议保留单部署、既有根／签名／M5 语义，版本化私有槽位状态，分阶段验证完整链，并在既有命名空间根中明确窄治理叶，等待用户批准。只有最终交易可授权，暂存不出收据，必须检验当前根／状态、重放、撤销、过期及并发。长链增加交易，相关根变化甚至无关账户更新可能导致重做；不据此估算生产证明延迟。限制深度则需另批语义补丁。完整 check exit 0，233 项通过：诊断 16、协议 6、M2 15、M3 14、M4 16、M5 50、Midnight 110、Hardhat 6，无失败／跳过。Midnight 149796.8287 毫秒、Hardhat 30959 毫秒仅为测试时长，既有十组真实资产完整性检查通过。本轮未改生产 Compact／绑定／密钥、依赖锁、M5／历史证据、共享 milestone／HTML 或私有指令；零新 Midnight 交易／密钥，无提交、推送或服务资源调整，历史实链证据不改称当前结果。M6 未完成，停在用户要求协商的架构决策点，不是账号额度或基础设施阻塞。

## 2026-10-14 continuation — implement approved private slot management (v7)

The user responded “continue” to the architecture approval question. This is
recorded as authorization for staged provenance/private-state implementation
and the narrow governance role, not a production module approval. M5-P1 remains
HEAD 07df341ffabc65aa5e23302fddc644498017b018 and its source/evidence is untouched.
Devin still omits dirty M6, and the index still belongs to information-flow;
current source is verified directly rather than querying/updating the wrong repo.

Added runtime-private-map.compact and the defensive RuntimePrivateMap builder.
Nodes hold full Bytes32 key/value plus nextKey/nextIndex. Sentinel index zero
is canonical; insertion authenticates a strict predecessor gap and the exact
next empty physical index AFTER predecessor update. Replace preserves keys/
links/count. Tests demonstrate arbitrary insertion order, exact absence,
duplicate/stale/forged paths, value updates, full-key distinctions sharing the
same 64-bit suffix and defensive copies. This avoids a truncated-key collision
workaround. Map capacity is explicit and distinct from ancestry depth.

RuntimeStateOpening v2 adds private assignment/binding roots and counts and
lastMutationAt. Allocation requires exact sentinel genesis/count 1, creation
watermark and template initial state. SDK tag is v7; policy v2 remains unchanged.
Old deployments/openings are not auto-migrated. Namespace authority kind 13
is participantSlotGovernor; kinds 1–12 retain their meanings. Only the original
allocator leaf can satisfy creator rules; activation/reviewer/issuer/another
allocator powers cannot collapse into slot governance.

Added one dispatcher manageRuntimeParticipantSlots with begin/parent-step/
finalization. Exact signed commands bind target, state/sequence, root references,
subject M5 account identity and runtime credential, assignment/parent/assigner,
M5 commitment, time/deadline and nonce. Current private records are admitted
through verified state transitions, not arbitrary host map roots. Parent steps
open exact record/account status; issued sequences strictly decrease toward a
creator/governance origin. No slot ancestry count cutoff is used. Duplicate
bindings cannot activate; inactive predecessor ancestry can permit a new exact
ID. Bindings use accountIdHash rather than only the runtime credential hash.
Revocation preserves original assignment fields; old parent IDs never revive.

Every step/finalization uses actual ledger roots/state/time. Only finalization
consumes the nonce, updates private maps/state commitment and advances sequence;
begin/step return zero without a role or receipt. Expired cleanup is permissionless
and changes only the staging map. Status-root/state changes invalidate old
progress. Cross-credential/ordinary-action watermark integration, actual
ordinary-action slot certification, evidence, receipt schema/nullifier logic
and full M6 acceptance remain explicit unfinished work.

Concrete failures and repairs:
1. First map compile used reserved Compact keyword witness as a parameter; it
   was renamed opening. This was a syntax error, not infrastructure failure.
2. Management compilation identified private short-circuit paths around
   targetNetworkHash/kernel.self ledger reads. Those reads were split into
   unconditional assertions; private data were not broadly disclosed.
3. Initial slot unit commands assumed authority sequence 1, but the inherited
   fixture uses sequence 7. Commands now derive actual references from the
   fixture allocation. Seven initial failures were fixture-root mismatches.
4. A descendant test reused a pre-revocation parent snapshot against the new
   authenticated map. Its early record mismatch was correct; the test now
   uses the current revoked record and checks signing ancestry rejection.
5. TypeScript rejected editing a readonly goes_left entry. The negative path
   test now constructs a changed immutable entry, preserving production types.

The first real-key attempt began 05:47:54.335Z in
logs/m6-key-retry-2026-10-14T05-47-54.315Z. Review found the missing committed
slot watermark before deployment. Only owned compiler driver PID 769 and
child PID 790 were identified by PID/PPID/name and terminated, not broad WSL
or services. The attempt ends SIGTERM at 05:49:33.034Z (monitor 96.5 seconds),
sampled compiler RSS 283,260 KiB/HWM 364,576 KiB, no sampled swap or new OOM.
It is intentionally incomplete and cannot claim eleven valid key pairs.
No production source was edited while that key job was still running.

The corrected sequential build began 05:50:18.959Z in
logs/m6-key-retry-2026-10-14T05-50-18.933Z. Pinned compiler 0.31.1/runtime 0.16.0,
unchanged WSL 7.65 GiB RAM +2 GiB swap, no new resource limits. Credential
dispatcher remains k19/418,338 rows; allocation opening v2 is k17/120,603 rows.
Further build outcomes will be appended after the owned job completes.

Eight slot-management tests and five map tests initially passed. Three further
slot checks pass: competing finalizations, account-revocation root invalidation,
and binding-key stability under credential substitution. The current slot
suite is 11/11. A first complete root check passed 246 cases (Midnight 123),
zero failures/skips, with docs/types/Solidity/Hardhat passing. That run began
before the public-reader mode/test edits; the eight targeted diagnostic/reader
checks passed afterward. A new final full check runs with the three additional
slot tests and updated reader; its result will be recorded separately, not
misrepresented as already observed.

The live runner adds explicit mutually exclusive --slot-state mode. It prepares
actual M5-P1 data and attempts a fresh v7 deployment, one active-account issue,
nine slot transactions (creator issue, governance issue, creator revoke, new-ID
replacement including inactive old-chain step), then public state/reconnect/
governance lifecycle checks. Expected instance sequence/slot nonces 4/4,
account status sequence/nonces 1/1, no pending sessions. Ordinary actions,
occupied-slot/long-chain node coverage, common receipts and production readiness
are not claimed. Three negatives are labeled generated-Compact preflight,
not node-rejected transactions. The public reader's --slot-state mode checks
exact public completion; original credential --final assertions remain intact.

Docker access unexpectedly failed: docker ps/docker version report missing
npipe:////./pipe/dockerDesktopLinuxEngine. docker desktop status said it could
not retrieve status and no Docker processes were initially present. A single
normal docker desktop start was requested; Docker Desktop/backend processes
appeared, but the engine pipe remained unavailable. Only sanitized startup
diagnostic classifications were read: latest backend-log slice contained 19
error matches, 3 socket matches, zero AF_UNIX/Only-one-usage/address-in-use/
access-denied/panic/fatal signatures. This does not establish the old stale
AF_UNIX bug as root cause. No factory reset, broad WSL stop, run-directory
rename, data deletion, image change or resource change was applied. The user
was asked asynchronously for the visible startup/error message while compiler
and safe checks continue. No new Midnight transaction has been submitted yet.

用户 continue 批准分阶段私有状态及窄权限实施方向，不是生产模块批准，M5-P1 提交及源码／证据不变，wiki 和错误仓库索引不当作当前事实。新增完整 32 字节键的私有索引排序映射，验证前驱间隙、更新后下一空位置，替换保留键／链接，明确存储容量不等于链深度。状态 v2 增加私有树根／数量／槽位变更时间水位，分配只接受空树和模板初态；SDK v7、策略 v2，旧部署不迁移。权限 13 专用于槽位治理，不把激活／审查／签发者／其他分配器混成槽位权力。新合并入口开始、逐个父步骤和最终执行，绑定精确状态／根／账户身份／记录／时间，序号递减完成全链，替换须证明旧链失效；暂存不授权或出收据，最终原子更新，过期清理不改实例，其他凭证／动作水位及普通动作／收据仍待完成。

具体修复包括 Compact 保留词 witness、私有短路表达式内账本读取的披露边界（分开断言，不公开私有数据）、fixture 实际 root 序号 7 而非 1、撤销后仍使用旧上级快照的测试错误，以及只读路径对象的负例构造。首轮真实密钥在 05:47:54.335Z 开始，发现缺时间水位后仅核实并停止任务自有 PID 769/790；05:49:33.034Z SIGTERM、监测 96.5 秒、采样 RSS 283260／HWM 364576 KiB、无 swap／新 OOM，不冒充完整密钥。进程停止后才改源码。修正构建 05:50:18.959Z 开始，固定版本／资源不变，凭证 k19／418338，分配 v2 k17／120603，后续结果另记。初始八槽位＋五映射通过，新增三个并发／账户撤销／身份绑定测试通过，当前槽位 11/11；首轮完整 246 项通过，但 reader 随后有改动，额外八项诊断通过，最终包含新增测试的完整检查还在运行，不提前声称结果。

显式 --slot-state 实链模式使用真实 M5-P1，计划 v7 新部署、一账户和九槽位交易及重连／治理，预期实例／槽位 nonce 4/4、账户状态 1/1、零会话；三负例只属预执行。已占用／长链节点、普通动作／收据／生产未宣称。Docker 意外无引擎管道，最初状态不可读且无进程，单次正常启动后应用／backend 出现但管道仍缺；只读脱敏日志分类有 19 error、3 socket，没有 AF_UNIX／地址冲突／拒绝／panic／fatal，不能归因旧 socket bug。未重置、关闭整个 WSL、移动目录、删数据、换镜像或资源；已异步请用户提供窗口提示，编译及安全检查继续，尚无新 Midnight 交易。

### Final observed source/size/check result — 2026-10-14 continuation

The second key build reached the actual unoptimized slot size k21/1,102,647
rows. It was deliberately terminated using only verified owned driver PID 761
and zkir child PID 938 at 06:06:55.794Z, not OOM-killed. Recorded UTC span is
996.835 seconds; the monitor's elapsed clock reports 929.3 seconds. Both are
retained, not conflated. Whole-attempt maximum observed compiler HWM was
5,097,304 KiB, sampled swap zero, new kernel OOM records zero. The slot child's
HWM before stopping was 1,058,220 KiB; this precedes full large-key generation
and does NOT estimate its peak or production proof cost.

Optimization keeps the same signatures, SHA commitments, sorted-map invariants,
roots and eleven-entry single-deployment design. It removes duplicate checked
insert/replace work after those exact membership/absence checks already passed,
hashes the selected changed record once, and shares actual locally computed
node/record commitments across dispatcher branches. Internal cached helpers
are not exported; no caller-supplied digest can replace the computation, and
the public witness predicates still compute and verify their actual inputs.
It does not truncate a parent chain, grant trust from the host or switch hashes.

A further audit added exact allocationCommitment to the signed slot command.
The circuit compares it to the immutable public allocation record whose
commitment includes the target network/deployment and original authority scope.
Merely presenting a separately valid allocation cannot retarget a signed slot
operation. This closes a command-signature binding gap before any deployment.
M5 evidence uses canonical private hashing under
permio:m5-participant-slot:v1, not property-order-dependent JSON; its test binds
exact record/time/actor/ID changes but never claims to authenticate the M5 caller.
Host map sorting now uses byte comparison instead of locale-dependent sorting.

The pinned zkir CLI has no size-only compile mode. New
scripts/probe-m6-slot-key.mjs therefore invokes its real compile in a fresh
ignored log directory, parses the actual row measurement, and requests SIGTERM
above a local k19 diagnostic resource guard before expensive key completion.
That guard is NOT a protocol/ancestry limit or evidence of ledger rejection.
No mock keys or replacement readiness manifest are produced.

Optimized probe: logs/m6-slot-key-probe-c10vpD/report.json.
Started 06:17:11.981Z, measured/stopped 06:20:02.212Z/06:20:02.227Z.
Actual result k20/818,608 rows: 284,039 fewer rows, 25.759739971178448% lower.
Child exit SIGTERM, keys null; outer native invocation reported exit 1.
Full k20 key memory/time and deployment feasibility are unmeasured. It still
exceeds the diagnostic guard, so further optimization or a deliberately
measured resource-qualified key run is needed; no infeasibility claim or
architecture alternative is made from k alone. All owned probe/build jobs ended.

The read-only inline Node command for zkir help first failed shell quoting.
A direct pinned CLI help command succeeded; it offered compile/mock-compile
but no size-only option. Mock compilation was not used. One documentation
patch used an outdated Chinese context and failed atomically; it was reapplied
with exact context. Neither diagnostic mishap changed private/production data.

Final npm run check exits 0 with 250 cases: diagnostics 16, protocol 6, M2 15,
M3 14, M4 16, M5 50, Midnight 127, Hardhat 6; zero failures/skips. Midnight
duration 111938.9854 ms and Hardhat 2951 ms are regression durations, not proofs.
After that check, a live-fixture reference accidentally hardcoded as v6 was
changed to the dynamic PERMIO_AUTHORIZATION_CONTRACT_TAG (v7); subsequent
typecheck, diff/docs and diagnostic checks pass. No Compact/predicate semantics
changed by that fixture-label repair. Public readers/docs identify historical
v6 results as history, not current v7 slot proof acceptance.

Required live mode was actually invoked:
node scripts/run-live-m6-admission.ts --slot-state
It exits 1 with missing-or-mismatched-build-assets at 06:24:20.742Z, trace
logs/m6-live-2026-10-14T06-24-20.735Z.jsonl. The real-key manifest is absent.
The integrity guard rejects BEFORE account-file read/wallet initialization;
no deployment, node transaction or new receipt occurred. This is a build
prerequisite failure, not a contract rejection, generic skipped test or account
usage quota. The source test does not replace required node acceptance.

Docker is separately unavailable. The one start command's default timeout is
infinite, as actual docker desktop start --help confirmed. Only its verified
owned docker.exe PID 136924 was stopped to end that wait; Desktop/backend
processes were not stopped, and no data/run directories/WSL/resources changed.
Sanitized startup signatures were cannot find (12), context canceled (1) and
context deadline exceeded (1); no stale AF_UNIX cause is inferred. The user's
visible startup/error message remains needed before narrower recovery.
No automatic retries, factory reset or speculative stale-socket repair were used.

runtime-slot-state-verification.json retains exact compiler/profile/source
hashes, both stopped builds, the isolated real-compiler probe, test scope,
actual fail-fast live event and infrastructure limits. Its 26-source fingerprint
matches the measured compiled JS/info. M5/M5-P1 source/evidence, shared
milestone Markdown/generated HTML, lockfile/dependencies and ignored private
instructions remain unchanged. Index/commits are untouched, no push.
The slot source is implemented and unit-verified; real matching keys, actual
slot-node acceptance/long chains, ordinary action proofs/common receipts,
cross-credential watermark/recovery/privacy/production acceptance are still
incomplete. Neither temporary sessions nor slot events are M6 action receipts.

第二轮真实编译测得未优化槽位 k21／1102647 行，仅核实并终止自有 PID 761/938，06:06:55.794Z SIGTERM，不是 OOM。UTC 996.835 秒、监测 929.3 秒分别保留；整轮最高 HWM 5097304 KiB、采样 swap 零、无新 OOM，槽位进程停止前 HWM 1058220，尚未完成大密钥阶段，不能推断峰值或生产成本。优化保持签名、SHA、映射不变量、根及单部署十一入口，仅移除已验证路径的重复插入／替换检查、共享实际计算的哈希并只哈希选中的新记录；内部缓存 helper 不导出、不接受宿主摘要替代，公开谓词仍完整验证，不截断链、不改信任／哈希。签名命令增加精确 allocationCommitment，绑定网络／部署及原权限范围，补上重新指定部署的缺口。M5 证据改用域 permio:m5-participant-slot:v1 的规范哈希；测试属性顺序稳定、时间／Actor／ID 改动敏感，但不冒充身份认证。映射排序使用字节比较，不依赖 locale。

真实 zkir 无 size-only 模式，新增隔离 probe 真编译、测量后在超过本地 k19 保护阈值时 SIGTERM；该阈值不是协议／链深度限制或节点拒绝。06:17:11.981Z–06:20:02.227Z 测得优化后 k20／818608，减少 284039 行、25.759739971178448%，未生成可用密钥；完整 k20 密钥内存／时间和部署尚未测，不凭 k 宣称不可行或擅换架构。所有自有构建／probe 已结束。帮助命令曾因 shell 引号失败，改直接固定 CLI 成功，未用 mock；文档补丁旧中文上下文失败后按精确内容重试，无数据损坏。最终完整 250 项通过（诊断 16、协议 6、M2 15、M3 14、M4 16、M5 50、Midnight 127、Hardhat 6），无失败／跳过。Midnight 111938.9854 毫秒、Hardhat 2951 毫秒不是证明时间。随后修正实链 fixture 硬编码 v6 为动态 v7，类型／差异／文档／诊断检查再通过，没有改变 Compact 语义。

实际调用 --slot-state 在 06:24:20.742Z 因真实密钥 manifest 缺失，钱包／账户文件读取前 exit 1，保留公开日志；零部署／交易／收据，不是合约拒绝、泛泛跳过或账号额度。另有 Docker 引擎不可用，CLI 帮助确认 start 默认无限等待，仅停止自有 docker.exe PID 136924；Desktop/backend、数据、目录、WSL、资源未改。脱敏日志仅有 cannot find、context canceled、context deadline exceeded，不能归因旧 AF_UNIX，仍等用户窗口提示，未反复启动／重置／猜测修复。JSON 记录 26 源文件及精确编译／测量／测试／失败范围；M5、M5-P1、共享 milestone／HTML、锁／依赖和私有指令不变，无暂存、提交、推送。当前槽位源码及单测通过，匹配真实密钥、节点／长链、普通动作／收据、跨凭证水位、恢复／隐私／生产仍未完成；槽位事件不是 M6 动作收据。

## 2026-10-14 12:47 UTC — user restart, WSL access and bounded real k20 attempt

The user reported restarting Docker Desktop and asked why commands had been
run from Windows. Read-only checks initially still saw the missing Windows
engine pipe, then Ubuntu `docker version` returned 29.8.0 and a fresh Windows
query succeeded too. Sanitized settings showed WslEngineEnabled=true and
Ubuntu-24.04 integration enabled. Independent engine-ID queries matched.
The canonical guide's earlier disabled-integration observation is now
historical; it is not evidence that the current integration remains disabled.
Compact compilation/key generation were already in Ubuntu. Moving the CLI
does not replace Docker Desktop's backend or diagnose the earlier crash.
No independent Ubuntu Docker installation or architecture migration was made.

After the user's subsequent continue, only exact existing midnight-node,
midnight-indexer and permio-m6-proof-server containers were inspected and
started from Ubuntu with `docker start`. All previously showed exit 255.
All now report running/healthy, restartCount=0 and OOMKilled=false; exit 255
alone is not a crash diagnosis. Existing versions/images are node 1.0.0,
indexer 4.3.3 and the already selected custom weak-cache proof-server 8.1.0.
The unrelated official midnight-proof-server remains stopped. No recreation,
volume/history reset, image pull, factory reset, global WSL restart, directory
rename or resource-limit change occurred.

At 12:47:07.6042599Z Windows checks observed node /health isSyncing=false,
proof /version=8.1.0, /ready HTTP 200, and GraphQL POST
`{ block { height hash } }` at height 42256/hash
8efdfa96edb6ae6e7d38a99253acab6863d65d825026cb7ce616951234d564b7.
Ubuntu curl checks also reached node/prover localhost; readiness reported
jobsProcessing=0, jobsPending=0 and jobCapacity=1. The WSL localhost-proxy/NAT
warning still appears, but these actual connections succeed; it is not
attributed as the crash cause. Recovery evidence is
docker-wsl-recovery-verification.json. Previous unavailable-engine evidence
is retained and explicitly labeled historical rather than erased.

Current WSL memory snapshot: 7831 MiB total, 6450 MiB available and 2048 MiB
swap with zero used. Node 22.23.2/npm 10.9.8 and Compact 0.31.1/runtime 0.16.0
stay pinned. A monitored actual k20 attempt is now permitted explicitly, not
stopped merely for exceeding the historical local k19 policy. New pure
scripts/m6-slot-key-guard.ts validates CLI bounds and parses only whitelisted
numeric /proc counters. Defaults still preserve the previous k19 behavior.
Actual command from this worktree in Ubuntu:

```bash
node scripts/probe-m6-slot-key.mjs --maximum-k=20 --maximum-rss-mib=6144 --minimum-available-mib=768 --timeout-seconds=1800
```

It invokes the same pinned real zkir with one configured Rayon/Tokio worker,
samples child RSS/HWM/swap and shared-VM memory every second, and can request
SIGTERM only of its owned compiler for RSS/HWM >=6144 MiB, available memory
<=768 MiB, timeout, k-policy or caller interruption. This is a reactive stop
guard, NOT a cgroup hard cap, exact peak guarantee, protocol limit or evidence
that a customer's proof fits 6 GiB. Native thread counts are recorded rather
than assumed equal to the configured worker count. Program/generated-JS/info
hashes are rechecked at completion; successful large keys are stream-hashed,
not read wholesale into Node memory. No production manifest is created by a
single isolated diagnostic pair; no mock keys or wallet payloads are read.

Five new guard tests passed, with typecheck and JS syntax checks. A combined
inspection command ended nonzero because an assumed diagnostic-test filename
did not exist, and another assumed local-provider filename was absent; exact
files were then located with rg. These navigation failures did not change
source semantics. Ubuntu lacks rg, so the kernel-only OOM check used grep
without installing tools; no matching kernel OOM record was printed at that
observation. A native CIM memory query was permission-denied and is not used
as measured hardware evidence.

The native root check passed docs/types then stopped at Hardhat HHE22.
Exact CLI debug showed underlying EPERM from fs.realpath of the local hardhat
package.json, NOT an absent/non-local package (npm ls confirms 3.14.0).
The WSL root retry passed docs then stopped because this current dependency
tree has only @typescript/typescript-win32-x64, not its Linux executable.
No dependency install, lockfile change, package patch, platform/compiler
upgrade or permission-check bypass was applied. Approved native execution
passed Hardhat build, then diagnostics ran 20/21: the fail-fast membership
subprocess exceeded its existing 30-second timeout, result status=null.
The same two membership tests passed alone, unchanged (6293.2657 and
4880.6502 ms); this does not establish contention as the root cause. The
failed full run is retained; a full successful rerun is still required.

The real key job reached unchanged k20/818608 and is continuing at this
entry. Neither that measurement nor recovered infrastructure is M6 slot
acceptance. Final key/memory/time and regression outcomes will be recorded
after observation; no new deployment, ordinary-action receipt, commit or push
is claimed. M5/M5-P1, architecture, shared milestone Markdown/HTML and private
instructions remain untouched.

用户重启后先出现 Windows 管道未就绪，随后 Ubuntu／Windows 都可访问 29.8.0，设置已
启用 WSL 2／Ubuntu 集成且引擎 ID 相同；旧禁用说明属于历史。Compact 密钥本就在 WSL，
换 CLI 不等于绕过 Desktop，更未安装另一引擎或迁移架构。用户 continue 后只检查并启动
三个现有 M6 容器，原退出 255、现健康／重启次数零／非 OOM；不凭退出码推断原因，未重建、
重置历史／卷、拉镜像、动无关服务、停整个 WSL 或改资源。12:47:07.6042599Z 节点不在
同步、证明器版本 8.1.0／ready=200／无任务、索引器高度 42256，Ubuntu localhost 也通过；
NAT 代理警告不妨碍这些实测连接，另存恢复 JSON，旧失败保留为历史。

WSL 7831 MiB、可用 6450、swap 2048 且未用。新增可测试的参数／数字计数解析，默认仍
k19，此次显式 k20、单配置 worker、每秒采样、6144 MiB RSS/HWM 或 768 MiB 可用保留
及 1800 秒触发时仅停止自有子进程；不是保证 6 GiB 硬限制、协议边界或用户证明成本。
固定版本／程序／生成绑定哈希，密钥流式哈希，只写隔离 logs、不宣称十一密钥／生产清单。
五项新增测试、类型／语法通过。两次猜测文件名未找到后按 rg 定位；WSL 无 rg 后用 grep
查内核 OOM，无匹配打印，未安装。CIM 权限拒绝不当硬件实测。原生 root 被 Hardhat
HHE22 阻挡，实际是 sandbox realpath EPERM，本地 3.14.0 存在；WSL root 因依赖树缺
Linux TypeScript 可执行文件停止，未装依赖／改锁／绕过检查。获批原生运行后 build 通过，
诊断 20/21，会员 fail-fast 子进程超既有 30 秒；原样单独重跑两项分别 6293／4881 毫秒
通过，不据此宣称负载根因或完整检查通过。k20／818608 正在真实生成，最终结果另记。
无新部署／动作收据／提交／推送，M5／M5-P1、架构、共享 milestone／HTML、私有指令不变。

### Observed completion of this guarded attempt and regression

Report: logs/m6-slot-key-probe-5IhjNT/report.json, raw SHA-256
4e9a7c528895330893b5de0992e1141eeb47f553ee435c088bea0e10bbba2b9c.
Started 12:45:41.745Z, actual k20/818608 at 12:48:36.732Z, completed
12:56:56.082Z; the stopped attempt's UTC duration is 674.337 seconds.
At 12:56:55.556Z the shared WSL available-memory sample reached 728,824 KiB,
below the configured 768 MiB reserve. The guard requested SIGTERM of its owned
zkir child (PID 2367, driver 2164 as independently observed). Child result is
code=null/signal=SIGTERM, spawnFailed=false; outer WSL invocation exit 1.
The elapsed timeout did not fire and no local-k guard fired. Keys=null,
no production inventory/manifest or chain submission was produced.

673 one-second samples, zero errors: maximum sampled RSS/observed HWM
5,925,572 KiB (about 5.65 GiB), compiler swap zero, final native thread count
12. Final shared SwapFree=2,091,896 KiB; other shared-VM swap use is not silently
attributed to this compiler. The reserve guard can stop below the separate
6 GiB compiler threshold, and one-second reactive sampling may overshoot a
threshold. This is not a hard memory cap, exact peak, completed-key duration,
minimum hardware requirement, or ordinary-user proof estimate. Program/JS/info
fingerprints remain identical to the earlier k20 probe and passed completion
checks. No Compact source/generated program changed in this continuation.

After the guarded stop, all three containers remain healthy, OOMKilled=false,
restartCount=0. Kernel OOM filtering observed zero records before/after; owned
zkir is absent. A command attempting to normalize grep's no-match exit status
first failed because PowerShell interpolated shell $? into True; rerunning
only the numeric count returned 0. No kernel-memory claim is derived from
that failed quoting attempt. Post-attempt WSL available memory is 6469 MiB,
shared swap use 5 MiB. Indexer advanced from height 42256 to 42394/hash
b9a266e488c7097d15bb0ea39bd9a05b56f544cebde323cc1d3282a2da7ed0df.
This is service continuity, not complete application/private-state recovery.

The subsequent unchanged approved native npm run check exits 0: 255 passed,
zero failures/skips. Counts: diagnostics 21 (five new), protocol 6, M2 15,
M3 14, M4 16, M5 50, Midnight 127, Hardhat 6. Docs/typecheck/Solidity build pass.
Midnight suite 121105.2758 ms and Hardhat 4283 ms are regression durations,
not proof timings. The first timeout and platform/sandbox failures remain
recorded; no test timeout, assertion, concurrency, package or lockfile was
changed to obtain the pass. A multi-file evidence patch first failed validation
on wrapped Chinese README context; no partial files were created, as checked
before reapplying with exact English anchors and separate patches.

slot-key-resource-attempt-verification.json records this exact source/report
fingerprint, stop reason, resources, later chain tip and complete regression.
README, slot-state documentation and delivery-feasibility assessment distinguish
recovered infrastructure from incomplete current keys, and key generation
from actual ordinary-action customer proving. Earlier failure/cost evidence is
linked rather than erased. Final diff checks pass, protected M5/M5-P1,
milestone Markdown/HTML and lockfile have no diff, ignored private bridge is
not tracked, Git index remains empty and HEAD is still 07df341. No push.
Fresh v7 slot-node acceptance and remaining M6 action/receipt/privacy/recovery
gates are incomplete. This guarded build does not justify an architecture
workaround or automatic resource escalation.

真实报告 12:45:41.745Z–12:56:56.082Z 共 674.337 秒，12:48:36.732Z 测得
k20／818608。最后可用 728824 KiB 低于 768 MiB 保留阈值，仅停止自有编译器
PID 2367（driver 2164），子进程 SIGTERM、外层 WSL exit 1，非时间／k 阈值，
无密钥／清单／交易。673 次秒级采样无错误，最高 RSS/HWM 5925572 KiB（约 5.65
GiB），编译器 swap 零、实际线程 12，共享剩余 swap 2091896 KiB 不归因该编译器。
保护可在 6 GiB RSS 以下触发且可能采样越界，不是硬上限、精确峰值、成功密钥时间、
最低硬件或用户证明成本。程序／JS／info 与旧 k20 完全一致，无本轮合约改动。三容器
仍健康／非 OOM／无重启，内核 OOM 计数前后零，自有进程已结束，WSL 可用 6469 MiB、
共享 swap 5 MiB；索引器从 42256 增至 42394，不冒充私有状态恢复。一次 shell $? 被
PowerShell 插值为 True 的计数规范化命令失败，直接数字计数后得到零，失败不作证据。

后续原样完整检查 exit 0，255 项全通过、无跳过；诊断 21、协议 6、M2 15、M3 14、
M4 16、M5 50、Midnight 127、Hardhat 6，文档／类型／Solidity 通过。没有为过检查
改断言、超时、并发、依赖／锁，首轮超时及平台／沙箱失败保留。多文件证据补丁因 README
中文换行上下文失败，经检查无部分文件，再用精确英文锚点分开应用。独立 JSON、README、
槽位文档及交付评估区分基础设施恢复、未完成真实密钥和用户动作证明；旧证据不抹去。
差异检查通过，M5／M5-P1、milestone／HTML、锁和私有指令不变，index 空、HEAD 仍
07df341，无提交／推送；新 v7 槽位实链及剩余动作／收据／隐私／恢复验收仍未完成，不擅改
架构或自动提升资源。

## 2026-10-14 — user-authorized local checkpoint and experiment reservation

The user requested committing all current M6 and M7 work, retaining the M5
patch as a separate commit, then creating a new worktree for the low-memory
experiment **without starting it**. M5-P1 already exists at
07df341ffabc65aa5e23302fddc644498017b018; its source/evidence have no current
diff and are neither amended nor duplicated. M6 remains on
feat/m6-m8-midnight-delivery; M7 remains on independent feat/m7-preparation.

M7 preparation was inactive and uncommitted. Its existing source/README/
package/lockfile/milestone-HTML preparation changes were inspected, not edited
or merged here. Fresh approved native npm run check passes all 77 tests,
including seven gateway and six Hardhat cases, zero failures/skips. Separate
M7 checkpoint bc2b93001cdb3bf90bfe0515848a44ce7da28509 preserves the opaque-byte
foundation, not a final M6 wire decoder, durable outbox or transport completion.
New M7 checkpoint/development evidence records that scope. It is not integrated
into M6, main, M8 or M9. No task messages or implementation delegation occurred.

M6's current sources/tests remain exactly those from the latest complete
255-case check. Fresh docs/typecheck/diff checks pass. Public evidence,
compiler-generated bindings/inventory, current runtime/slot predicates,
adapters, tests, live diagnostics, actual interrupted-key evidence and existing
opt-in prover recipe are being committed as a partial checkpoint, not M6
acceptance. No new memory-profile implementation, chain deployment, proof,
resource mutation or dependency installation occurs during this checkpoint.
Historical no-commit flags in timestamped evidence remain historical snapshots;
checkpoint.json is the later user-authorized commit/reservation record.

Only after this M6 branch is clean and committed may Git create
experiment/m6-low-memory-keygen at workspace sibling
Permio-m6-low-memory-experiment from that named checkpoint branch. Preparation
means checkout plus an ignored canonical-instruction bridge, not starting the
proposed RAM/swap experiment. Do not copy wallet files, private state, keys,
logs or node_modules, install dependencies, compile, change .wslconfig/cgroups,
restart Docker/WSL, or launch a prover. Existing source-tree diagnostics in
the committed baseline are historical work, not authorization to run them.
No merge, rebase, main modification or push is requested or performed.

用户要求当前 M6／M7 本地提交，M5 补丁独立保留，再开内存实验 worktree，但明确不
开始实验。M5-P1 已在 07df341 提交，源码／证据无当前差异，不 amend／重复。M7 原线程
未运行，既有准备源码及文档／依赖集成经核对，完整 77 项通过（网关 7、Hardhat 6），
以 bc2b930 独立提交，新增检查点日志记录不透明字节基础而非最终解码／持久 outbox／
传输完成；不合并到 M6、main、M8／M9，不向其他任务发消息或委派实现。

M6 当前源码／测试仍与最新完整 255 项通过一致，新跑文档／类型／差异通过，仅将公开
生成绑定／元数据、当前槽位／运行时、适配／测试／实链工具、真实中止密钥及既有证明器
配方保存为部分检查点，不宣称 M6 验收。本轮没有新内存机制／部署／证明／资源或依赖
变更，旧时间戳的“未提交”属于历史，新 checkpoint.json 记录本轮授权。只有 M6 干净
提交后才能从该命名分支创建 experiment/m6-low-memory-keygen，目录
Permio-m6-low-memory-experiment。仅检出及忽略的私有指令桥接，不复制钱包／状态／
密钥／logs／依赖，不安装／编译，不改 WSL／cgroup、不重启或运行证明器。原分支工具
只是基线，不代表实验已启动；无 merge／rebase／改 main／push。

Staging the previously untracked cache.patch exposed two trailing-space
warnings: those are unified-diff context prefixes on empty original lines,
not modified Rust source. The exact previously tested patch bytes/checksum
must remain unchanged. A path-specific .gitattributes blank-at-eol exception
was added only for that patch file, retaining its LF rule; all other staged
files retain normal whitespace checks. This is repository patch packaging,
not a new prover optimization or experiment. Staged scope contains 95 files,
zero private/ignored/M5 paths; actual keys, ZKIR, logs and dependencies remain
outside the index.

首次暂存未跟踪 cache.patch 后发现两处空行上下文前缀的尾空格警告，并非 Rust 代码
修改。为保留已测试补丁字节／校验和，仅给该文件增加 .gitattributes 的 blank-at-eol
例外，继续固定 LF；其他文件正常检查。这是补丁打包，不是新证明器优化／实验。暂存
95 文件，没有私有／忽略／M5 路径，真实 keys／ZKIR／logs／依赖仍不入 index。

### 2026-10-14 — separate experiment session; v8 credential/state ordering

The user clarified that the low-memory experiment must run in a new session
inside the already registered experiment project, not in this parent session.
That session was created against its local committed f2d8689 worktree. This
continuation edits only the original M6 delivery worktree. No experimental
swap/controller implementation, WSL/Docker restart or key generation was
performed here. M7/M8/M9 and main were not edited or synchronized.

Exact source inspection found RuntimeCredentialInstanceBinding carried only
allocation, issuer path and public deadline. Slot finalization updated private
opening v2's lastMutationAt and transitionSequence; credential mutations only
updated credentialStatusRoots and usedCredentialStatusCommandNonces. Thus
staged credentials did not pin the same private state and later revocations
did not update the cross-slot watermark. Existing source predicates, not the
wiki (which still lists only M1-M5), established the gap. The configured index
belongs to information-flow, so it was not used as a Permio index.

Implemented credential-status command v4 with signed allocationCommitment,
instanceStateCommitment/instanceStateSequence and nextInstanceStateCommitment.
The private binding supplies state opening, sequence and fresh next nonce.
Direct mutation/begin/unexpired finalization compare exact signed allocation,
opening hash, ledger state/sequence and watermark. runtimeCredentialNextState
preserves instance, template label and both private slot-map roots/counts;
only timestamp/nonce change. Direct issuance/revocation and staged final
issuance atomically update status, consumed nonce and instance commitment/
sequence. Begin/steps/expired cleanup cannot mutate those authority records.
The signed allocation also prevents network/deployment/issuer-list substitution.

This is completion of the prescribed shared-instance ordering design, not an
alternative architecture. Intentional cost: any same-instance intervening
credential/slot change invalidates old staging; no silent certification rebase.
No public global clock, new authority, host-trust check, chain-depth cutoff,
hash/signature change, extra deployment architecture or toolchain upgrade.
Disposable contract tag advances v7 -> v8; policy/state opening stay v2,
account/capability/session versions 1/3/2 and eleven transaction entries stay
unchanged. M5 and the separate M5-P1 commit are untouched.

Client helpers now require an explicit current opening/sequence and advance
private state only after accepted mutation. Synthetic generated-contract
fixtures retain those openings explicitly; seeded unit allocations are still
not real issuance. Actual live runner expectations change: the 21 credential
transactions contain five mutations, final instance sequence 5 not 0; the
slot workflow contains account issuance plus four slot mutations, sequence
5 but slot nonce count 4. Reconnect and independent public-reader assertions
were updated accordingly. Tagged v8 completion commitments are checked;
untagged historical evidence is not relabeled. New private state nonces are
included in the existing local captured-log sentinel scan, never emitted.

Eight new generated-Compact negatives cover legacy/altered allocation and
state/sequence/next hashes, substituted openings/zero or reused or unsigned
nonce, a valid changed next-state hash with the old signature, stale complete
staging after credential or slot mutation, concurrent direct commands and
backdating across both credential/slot directions. Tests check no losing nonce
consumption or state rewrite. Three public-reader diagnostics distinguish old
vs v8 sequences, require exact completion hashes and reject unknown tagged
profiles or conflated instance-sequence/slot-nonce counts.

The first unapproved WSL compiler call failed Wsl/E_ACCESSDENIED. The same
pinned --skip-zk call succeeded with approved execution: Compact 0.31.1,
runtime 0.16.0, no mock proving, keys or machine configuration change. All
managed JS/types/compiler-info/map changes were generated by that compiler,
never hand-edited. The regenerated slot ZKIR remains byte-exact SHA-256
70ea49d8ddab0189ba95daa52d91f060e3d7ee90700e8982999353d3417f70e4;
credential ZKIR now has SHA-256
5465578287bd7905a5d7e4be149cce48b754b2dccba53c9f847d7938d86b74cd.
These are program fingerprints, not newly measured row counts/key feasibility.

A sandboxed Midnight suite returned no incremental output for a prolonged
period and was interrupted through its owned execution session. Its buffered
output showed an outdated /root is stale/ expectation. A focused approved
run confirmed the circuit now rejects earlier with stale exact private state.
The fixture was repaired to retain updated openings and the old staged-command
assertion now names the actual state rejection; fresh revoked-account checks
remain. That partial/interrupted run is not a successful verification result.
The next full root check reached 135 Midnight cases: 134 passed, one failed
because deepStrictEqual distinguishes Buffer from Uint8Array although all 32
state-label hash bytes matched. The test normalizes the expected bytes to
Uint8Array and still compares every byte; no circuit condition was relaxed.
That failed check did not reach Hardhat tests. The corrected full rerun is
recorded separately below and in credential-state-verification.json.

At 2026-10-14T15:14:10.681Z, the actual
npm run test:live:m6:credential-binding attempt exits 1 with
missing-or-mismatched-build-assets. The exact keys/build-manifest.json is
absent. The runner fails closed before wallet construction, deployment or
transaction submission. This is an asset-preflight failure, not a failed
Midnight proof, ledger rejection or memory failure. No v7/experimental key
pair is relabeled as complete v8 readiness. Ordinary action watermark,
module/evidence/runtime/nullifier/receipt, full privacy and restart gates
remain incomplete; acceptance.json is not manufactured. Detailed schema and
tradeoffs are in runtime-credential-state-v1.md and architecture-decision.md.

用户澄清实验须在已注册实验项目的新会话进行；已从该项目 f2d8689 工作树启动独立
会话，本轮只改原 M6 工作树，不在此实现 swap/controller、不重启 WSL/Docker、
不生成密钥，不改 main/M7/M8/M9。源码发现 binding 只有分配／签发者路径／截止；
槽位最终执行更新私有 lastMutationAt／实例序号，凭证只改状态根和 nonce，造成
跨槽位水位及暂存固定状态缺口。wiki 未覆盖 M6，index 属另一仓库，均不冒充证据。
实现 v4 命令签署精确分配、当前状态／序号、下一状态；私有 binding 带 opening／
新 nonce；开始、直接、未过期最终执行检查精确哈希／序号／水位。下一状态只改时间
及 nonce，保留标签／映射；最终变更原子改状态根、nonce、实例，暂存／清理不授权。
代价是同实例变更让旧暂存失效、必须重做，不 rebase；不增全局时钟／权限、宿主信任、
截链、密码或多合约／工具链替代。tag v8，其余协议版本／十一入口不变，M5-P1 独立
提交不改。客户端明确保存 opening，只在接受后推进；真实凭证最终序号 5，槽位为
账户 1 加槽位 4 到序号 5、槽位 nonce 4；读取器区分旧无 tag 与 v8，新增私有 nonce
仅进入本地扫描，不输出。新增八个生成合约负例和三个读取诊断，不冒充节点证据。

首次 WSL 权限失败，批准后原样固定编译成功，Compact 0.31.1／runtime 0.16.0，
仅 --skip-zk，生成文件非手改；槽位程序哈希不变，凭证程序哈希变更，未新测规模／
密钥成本。首个 sandbox 测试长时间无增量输出，仅中断自有 session；缓冲结果及
后续定向测试证实旧 root is stale 断言应为更早的精确状态拒绝，修复 fixture 保留
当前 opening，新的已撤销账户检查仍保留。其后完整检查 135 个 Midnight 测试中
134 通过、一个因为 Buffer／Uint8Array 类型区别失败，32 字节相同；归一预期类型
后仍逐字节比对，不放松电路，失败那次未执行 Hardhat。最终重跑结果另记。
15:14:10.681Z 实际凭证链测试因缺失匹配 manifest 在钱包／部署／交易前 exit 1，
不是证明失败、节点拒绝或内存故障；不重新标注旧密钥为 v8，不制造验收。普通动作／
证据／nullifier／收据／完整隐私／重启仍未完成，细节见专门文档及 JSON。

The corrected full root check exits 0, 266 passed/0 failed/0 skipped:
diagnostics 24, protocol 6, M2 15, M3 14, M4 16, M5 including M5-P1 50,
generated Midnight execution 135, actual local Hardhat contract tests 6.
Docs/typecheck/Solidity build pass. After the final live-runner private-nonce
sentinel additions, a further unchanged complete npm run check also exits 0
with the same counts, observed complete by 2026-10-14T15:26:33Z. Its Midnight
regression duration is 134454.6025 ms and Hardhat 3126 ms, NOT proof latency.
No assertion, timeout, concurrency, dependency or chain exit gate was weakened
to obtain the passes. git diff --check passes; protected M5/milestone HTML/
Markdown/lockfile paths have zero diff, private bridge remains ignored and
untracked, index remains empty and HEAD stays f2d8689. New changes are local
and uncommitted; no merge/rebase/push. The detailed new evidence preserves
the failed checks and missing-real-assets attempt instead of overwriting the
historical v7 checkpoint or manufacturing M6 acceptance.

A closing multi-file documentation patch initially failed on an incorrectly
wrapped README context. Inspection confirmed no partial evidence/log edits;
the same evidence and log changes were reapplied with exact independent
anchors. This did not change source, compiler output or test results.

修正后完整检查 exit 0，266 全通过、无失败／跳过：诊断 24、协议 6、M2 15、
M3 14、M4 16、M5 含独立补丁 50、生成 Midnight 135、真实本地 Hardhat 合约
测试 6，文档／类型／Solidity 通过。最终加入私有 nonce 哨兵后再次原样完整检查，
15:26:33Z 已确认同样全通过，Midnight 回归 134454.6025 ms、Hardhat 3126 ms
不是证明耗时。不放松断言／超时／并发／依赖或链退出条件。diff 检查通过，M5／
共享 milestone 文档及 HTML／锁文件无差异，私有指令仍忽略且未跟踪，index 空、
HEAD f2d8689；本轮新增修改未提交，无 merge/rebase/push。保留失败及缺密钥证据，
不覆盖历史 v7 检查点或制造 M6 验收。收尾多文件文档 patch 曾因 README 换行
上下文不匹配失败；核验没有部分改动后按独立精确锚点重做，不改源码／生成文件／测试。

At handoff, the independently running experiment session reports a successful
single slot-key build on the committed v7 program with memory controls and
swap, and has saved its own evidence. This parent has not imported its runner
or key pair, reviewed its complete evidence, or assembled a current v8 manifest.
The slot ZKIR hash matches, but that alone is not complete key-inventory or
node acceptance. Experiment details remain owned by that session/worktree.

交接时独立实验会话报告已在 v7 基线、内存控制及 swap 下成功构建一组槽位密钥，并
保存其证据。本会话没有导入其 runner／密钥、完整审查其证据或组装 v8 manifest；
槽位 ZKIR 哈希一致不等于完整密钥或节点验收，实验细节留在该会话／工作树。

### 2026-10-14/15 — reviewed bounded-key integration, complete v8 inventory

The new-session experiment completed; this parent independently read its
actual report and checked the report, prover, verifier and slot ZKIR hashes.
The recorded success used real Compact 0.31.1/k20/818608, not a mock: total
controller time 1153.098 seconds, cgroup memory peak 5368971264 bytes and swap
peak 5156528128 bytes, no OOM. That is one slot-key build, not runtime proving.
The experiment's worktree, branch, source and evidence were left untouched.

The active v8 worktree had no keys directory (a read-only directory query
reported path-not-found). Only the exact slot ZKIR matches v7; credential
program/bindings differ. Implemented an opt-in bounded serial builder here,
adapting the reviewed experiment controls without merging its source/history.
The wrapper fixes 5 GiB memory.high, 6 GiB memory.max, 8 GiB swap max, one CPU,
one Rayon/Tokio worker, applied/ancestor checks, a one-hour batch budget and
explicit emergency/k20 guards. Existing services stay running; only a new
root-owned native-ext4 6 GiB temporary swap file is created exclusively.
Cleanup never removes pre-existing resources, never unlinks active swap and
retains resources on unsafe headroom/unit-stop failure. Existing keys/manifests
are refused rather than overwritten. One successful exact slot report may be
reused only after program/compiler/public-parameter and key-byte verification.

Added compile:compact:bounded without replacing the original compile command.
The asset guard now accepts real-bounded-keys plus real-sequential-keys, still
requiring complete unique current program/key/binding hashes and sizes;
unknown/mock modes fail. Six root-integrated policy tests and the existing
asset regression passed before execution. Initial typecheck found a missing
JavaScript-module declaration; matching .d.mts fixed it without changing
strict configuration. Full native npm run check then passes 272 cases, zero
failures/skips: diagnostics 30, protocol 6, M2 15, M3 14, M4 16, M5/M5-P1 50,
generated Midnight 135 and actual local Hardhat 6. Midnight regression
150883.1095 ms, Hardhat 4313 ms are not proof timings.

The approved actual bounded build started 2026-10-14T15:47:56.247Z and finished
2026-10-14T16:03:23.750Z (Asia/Shanghai crosses into October 15). Monotonic
elapsed 926.215950167 seconds, UTC span 927.503; this includes compilation,
ten real serial key jobs, exact previously built slot-pair reuse, hashing,
installation and cleanup. It does not include the original slot build's
19.22 minutes. All eleven current pairs and the new manifest independently
pass the native asset guard. The current credential is k19/462645 rows;
allocation k17/120603; exact complete per-circuit measurements are recorded
in bounded-key-build-verification.json. The old key failure remains historical.

Across ten jobs: 441 samples, zero sample errors; maximum per-job cgroup
memory peak 5332590592 bytes (credential), swap peak 413696 bytes, all final
OOM/OOM-kill counters zero. The reused slot job's 4.80 GiB swap peak is not
combined into this batch. Owned swap was disabled and unlinked, original
2 GiB preserved, after-available 6270196 KiB. Source/program/binding and public
parameter fingerprints remained exact. No settings, toolchains or containers
were restarted/changed, no secret/wallet/private instructions were copied.
Generated proving assets and the manifest remain ignored, not staged.

Two nested-shell read-only Docker counter queries failed because outer WSL
shell expansion removed their variable names; their blank output is not a
memory-limit measurement. Docker's separate inspect did confirm no configured
RAM/swap cap and a four-CPU quota. A third corrected read was not executed:
automatic approval review hit its usage limit, explicitly not an unsafe-action
determination. No equivalent calls bypassed review. The already authorized
build continued to completion. After the user's next continue and the reset
window, the new live-chain request was approved normally. This is not an
application, compiler or proof failure.

The current v8 npm run test:live:m6:allocation -- --profile-memory now passes
asset preflight and wallet synchronization against Local Dev, deploys a fresh
eleven-circuit contract at 16:25:44.824Z, and begins actual governance proofs.
The live result is being recorded separately; deployment alone is not the
allocation/credential/slot acceptance or complete M6. No action receipt,
production readiness, M7/M8/M9 integration or milestone-status edit is claimed.

独立实验已完成，本会话独立读取实际报告并核验报告／密钥／程序哈希，成功为固定
版本真实 k20／818608，耗时 1153.098 秒、内存约 5 GiB／swap 4.80 GiB，无 OOM；
仅为槽位密钥，不是运行时证明，实验工作树／源码／历史不改。当前 v8 没有 keys 目录，
只匹配槽位程序，其余不同，因此在本工作树适配显式启用的串行工具，不合并实验历史。
固定 5 GiB 软／6 GiB 硬／8 GiB swap、单 CPU／worker、实际及上级限制、一小时预算
及紧急／k20 保护，保留共享服务，只独占新建 ext4 6 GiB swap；不清旧资源、不删
仍启用 swap、不安全时保留，不覆盖旧密钥／清单。槽位复用核验程序／编译器／公开
参数及字节，只复制公开证明资产，不复制秘密。增加独立 npm 命令，新清单模式仍检查
完整唯一当前指纹，mock 拒绝。六项策略及资产测试先通过；类型检查缺 .mjs 声明，
加 .d.mts 不放松配置。完整 272 项全通过，无跳过；Midnight／Hardhat 回归耗时不作
证明耗时。

实际构建 UTC 15:47:56.247–16:03:23.750，上海时间跨入 10 月 15 日，单调计时
926.215950167 秒／墙钟 927.503 秒，含设置、十组真实生成、一组旧槽位精确复用、
校验安装清理，不含原槽位 19.22 分钟。十一组及新 manifest 独立核验通过；凭证
k19／462645，分配 k17／120603，其余见 JSON。十个任务 441 采样无错误、最高
cgroup 5332590592 bytes／swap 413696 bytes、无 OOM，不与旧槽位独立峰值混算。
自有 swap 已停用删除，原 2 GiB 保留、剩余可用 6270196 KiB，程序／源码／绑定／
参数指纹不变，不重启服务、升级或复制秘密，资产仍忽略且未暂存。两次嵌套 shell
只读查询错误展开变量，空结果不当作限制；inspect 独立证实四 CPU／无 RAM cap。
第三次正确查询因自动审批使用限额没有执行，非不安全判定，没有绕过；已授权构建
继续结束。用户后续 continue 及重置窗口后新实链请求正常批准，不是应用／证明故障。
v8 已过资产／钱包同步并于 16:25:44.824Z 新部署十一电路，开始真实治理证明；完整
结果另记，单部署不冒充分配／凭证／槽位或 M6 验收，无动作收据／生产／下游集成宣称。

### 2026-10-15 — actual v8 allocation accepted; isolated runtime paging trials

The original-prover run completes exit 0 at 2026-10-14T16:39:56.558Z UTC:
fresh v8 contract 29ffc721016f4811efd8ad35e3ad7c33c005840827bfdfa6d8a4674f65653a51,
17 accepted post-deployment transactions. The actual sequence is module
proposal, two distinct reviews, two governance approvals, module activation,
expiring activation staging, new staging with actual expired-prior cleanup,
one action binding, final template activation, initial instance allocation,
two authority-root approvals/rotation, module deprecation/revocation and
template retirement/revocation. Review alone does not grant trust. Synthetic
local threshold/key fixtures are explicitly not production human approval.

Allocation accepts at 16:34:32.840Z, 48.268 seconds after activation acceptance.
That interval includes SDK/proving/submission/indexing, not isolated proof
time or normal-user action latency. Runtime policy v2 and exact initial state
are checked. The instance remains present after prospective retirement and
revocation with sequence 0, no credential/slot changes. Reconnect succeeds.
Negative wrong-signature/hash/state/policy/root/replay/threshold/duplicate/
privilege-collapse cases are generated Compact preflight, NOT node-rejected
transactions. The captured public log checks 13 private sentinels with no
match; wire witnesses, full chain history and restart tests remain unverified.

178 original-prover samples have zero errors: highest sampled memory.current
4292292608 bytes, reported cgroup peak 4324941824, sampled swap 0, OOM and
OOM-kill 0. VmHWM 4198820 KiB can be service-lifetime history, not necessarily
a single proof. This was uncapped/four CPU/one job/original 2 GiB WSL swap,
not the later capped service. Exact public-log SHA-256, all transaction IDs,
final counters, limitations and commands are in v8-allocation-verification.json.

Added an explicit --allocation-only final public-reader mode. Previously the
final reader expected credential sequence 5 even for an allocation-only run;
the new mode expects sequence/status/credential/slot nonces 0 and rejects
conflated credential/slot completion markers. A separate no-wallet read at
16:57:23.800Z exits 0 and confirms all final governance and instance fields.
It reads the existing node/indexer; no restart is implied.

Read-only inspection verifies the original exact weak-cache image, four CPU
quota, one job and one public cache mount. The readiness response actually
uses jobsProcessing/jobsPending/jobCapacity, not guessed short field names;
the new controller was corrected before launch. A native readiness fetch
initially fails EACCES in the sandbox; the approved read succeeds. This is
not a localhost service failure and no ports/crypto are replaced to hide it.

Implemented a separate opt-in runtime controller rather than mutating the
original prover: exact same image, loopback 6301, actual Docker/cgroup limits,
read-only public cache, verified existing k20 public parameters, exclusive
root-owned ext4 swap and lock, two-hour budget and shared reserve/OOM checks.
Only this owned container may be stopped/removed, never its volumes or other
services. The SDK selector accepts only a boolean, changes only 6300/6301,
returns an isolated configuration copy and rejects arbitrary remote endpoints.
Sampling accepts only the two fixed container names. The selector fixture's
first strict typecheck correctly rejected direct readonly mutation; switched
the deliberate defensive-copy probe to Object.assign, without changing the
readonly API or compiler configuration. Fourteen focused CLI/provider/reader
checks then pass. No Compact program/key fingerprint changes in this step.

The first capped attempt hORdQj stops in preflight at 16:57:50.954Z without
creating swap/container/wallet or transactions. It incorrectly required
6 GiB available physical RAM before a paging test. Read-only /proc/meminfo
shows 5010060 KiB available, original swap total 2097152/free 2091852 KiB.
Added pure startup/stop-policy tests and counted RAM-plus-free-original-swap
instead, still requiring physical headroom and the original 2 GiB swap.
No global swappiness/memory configuration or safety reserve was changed.

Actual 5 GiB-hard/8 GiB-swap/four-CPU trial SrWwnd runs
17:03:59.229–17:10:05.570Z. Actual cgroup max/swap are checked (high=max).
It deploys 5fe926c50b44b3cd8c229a2be1c414efbb88e5b04f8a738e6e4835cad7ff9383
and accepts module proposal/two reviews. During module approval at monotonic
349.931 seconds, shared MemAvailable 367516 KiB trips the 384 MiB reserve.
No slot transaction starts, no OOM occurs. 141 controller samples; partial
prover sampled memory peak 3890470912 bytes, swap current up to 294912 bytes.
The client receives SIGTERM and the owned service is stopped/removed; own
swap is disabled/unlinked, original prover remains running on the exact image.
Controller total 365.584525171 seconds. Report SHA-256:
83f3bb799ed34353f93f0d884951924ae4e57c16e7527149714ddc11545b608e.
Partial log SHA-256 a4e2f56c5c1ac2cf43eaf54135f31cfda4846ee05f5712c9bce0d61070f5b59d.
These are stopped-attempt records, not slot/runtime acceptance.

The next approved trial lowers only the new service's RAM cap to 3.5 GiB,
retains up to 8 GiB swap/four CPU/one job/384 MiB stop, and requires at least
4.25 GiB initial physical headroom plus a 6 GiB RAM/free-original-swap budget.
The intention is earlier per-container paging before exhausting the shared
VM, not permission to ignore resource failures. This is an operational test
profile, not a replacement architecture, cryptography, authority or trust
model. It is running; actual completion and memory/latency must be recorded
separately. See capped-runtime-proving-v1.md. No ordinary action/receipt or
M6 completion is claimed.

The native complete root check first fails with Hardhat HHE22. Exact diagnosis
findDependencyPackageJson/getRealPath proves EPERM on the local hardhat
package.json, although require.resolve finds local 3.14.0. No package reinstall,
dependency change or bypass of Hardhat's guard is used. Approved same-command
npm run check then exits 0: 277 passed/0 failed/0 skipped (diagnostics 35,
protocol 6, M2 15, M3 14, M4 16, M5/M5-P1 50, generated Midnight 135, local
Hardhat 6). Midnight 183917.455 ms/Hardhat 5546 ms are regression, not proof
latencies. The lowered RAM policy's two focused tests subsequently also pass.
Protected M5, shared milestone Markdown/HTML and lockfile are not edited;
new source/docs remain uncommitted, no merge/rebase/push.

原证明器真实 v8 流程已 exit 0，新合约及部署后 17 笔交易，覆盖提案、两审查、两批准、
模块激活、过期暂存及实际清理、新暂存、动作绑定、模板激活、初始分配、两根批准／
轮换、模块弃用／撤销、模板退役／撤销；审查不授信任，合成治理不当作生产审批。
16:34:32.840Z 分配接受距激活 48.268 秒，含 SDK／证明／提交／索引，不是普通动作
或纯证明。精确策略／初始状态、历史保留和重连通过，实例序号 0；负例仅生成电路
preflight，不是节点拒绝交易；13 私有哨兵无匹配，不替代全链／wire／重启验证。
178 采样无错误、最高 current 4292292608／报告 peak 4324941824 bytes、swap／OOM
零，HWM 可为服务历史。独立 JSON 保存所有交易、指纹、命令与边界。

公开读取器新增 allocation-only，避免错误期待凭证序号 5；此模式检查序号／凭证及
槽位 nonce 为 0，拒绝混入其他完成标记。16:57:23.800Z 不建钱包的独立最终读取
exit 0，但没有重启节点。核验原镜像／CPU／任务／缓存；ready 实际字段为 jobsProcessing
等，启动前修正；native fetch 曾 sandbox EACCES，批准读取成功，不改端口架构掩盖。
新控制器只建同镜像 localhost:6301 临时服务，核验实际限制、只读公开缓存及参数、
独占 ext4 swap／锁／两小时和安全保护，不动原服务或卷。SDK 仅布尔端口选择、配置
防御副本，采样仅允许两固定容器名；测试曾直接改 readonly 字段而类型失败，改用
Object.assign 验证副本，不放松 API／配置，14 项定向检查通过，不改电路／密钥。

首次 hORdQj 在所有资源／钱包／交易前因错误要求 6 GiB 空闲物理内存失败；实测 RAM
5010060 KiB、原 swap 2097152/free2091852 后加入纯策略负例并修正换页预算，不改
全局或紧急保护。实际 5 GiB 配置 SrWwnd 完成部署及提案／两审查，在模块批准时
349.931 秒、共享可用 367516 KiB 触发 384 MiB 保护，尚无槽位交易、无 OOM；141
控制器采样，365.585 秒安全清理自有容器／swap，原证明器同镜像继续运行。报告与
部分日志精确哈希保留，不冒充通过。下次批准仅降低自有 RAM cap 至 3.5 GiB，swap／
CPU／任务／保护不变，启动物理 headroom 至少 4.25 GiB，含原空闲 swap 至少 6 GiB；
目的是更早换页，不改架构／密码／权限／信任，目前进行中，实际结果另记。

根检查先 HHE22，精确诊断是本地 Hardhat realpath 被 EPERM 拒绝，非缺包；批准原命令
重跑后完整 277 项通过，无失败／跳过，Midnight 183917.455 ms／Hardhat 5546 ms
不是证明耗时；降低 cap 后两项策略测试再通过。不改 M5／共享 milestone／HTML／
锁文件，本轮修改仍未提交，不 merge/rebase/push，不宣称普通动作、收据或 M6 完成。

### 2026-10-15 — prover-only limits are insufficient; joint caller/prover budget

The actual second runtime trial (3.5 GiB prover cap) does page successfully
and accepts eleven post-deployment transactions, including exact template
activation at 17:24:26.396Z and allocation at 17:25:56.272Z. It then starts
account issuance at 17:25:56.663Z but reaches the unchanged shared reserve
at 17:26:23.192Z: MemAvailable 355248 KiB, SwapFree 6164288 KiB, monotonic
881.893411566 seconds. This is not a timeout, OOM or an observed invalid proof.
The controller stops the client and removes its container/swap by
17:26:37.819Z, total 896.520130768 seconds. Original prover stays running.
357 controller samples, 147 prover samples: reported prover memory peak
3758100480 bytes (cgroup page granularity), sampled swap.current up to
2142744576 bytes, OOM counters zero. Exact ignored report/public-log hashes
and paths are recorded in capped-runtime-verification.json.

Do not infer no chain mutation merely because the interrupted client emitted
no completion marker. The approved independent public-only read at
17:38:32.432Z exits 0: allocated instance remains sequence 0, credential
root sequence 0, credential/slot nonces 0, no staging, authority version/
sequence 1, module active (4)/registry sequence 6, template active (1).
Thus no credential or slot mutation reached this stopped fixture. This read
does not claim final retirement/revocation checks or restart acceptance.

The earlier /proc snapshot of the known client showed RSS 799544 KiB/HWM
819196 KiB/swap 0, not its subsequent credential-phase peak. The new evidence
separates client, prover and whole-VM costs; the stopped run alone does not
prove that all remaining pressure originated in the client. It does prove
that a prover-only cap was not a complete application memory budget. The
correct in-scope operational follow-up is to bound and measure both, not
disable the shared reserve or claim customer requirements from this fixture.

Implemented the joint controller profile: prover 2.75 GiB hard RAM/four CPU/
one job; client memory.high 0.75 GiB, memory.max 1 GiB, memory.swap.max 4 GiB,
one CPU. Combined configured client/prover physical ceiling 3.75 GiB. The
prover's 8 GiB swap ceiling and client's 4 GiB ceiling are not reservations:
both share the same original 2 plus temporary 6 GiB host swap, not 12 GiB.
The same startup/384 MiB reserve/two-hour/OOM guards remain. Explicit Node
--max-old-space-size=3072 is a virtual heap allowance so V8 does not size its
whole heap from the physical cgroup cap; it does not grant 3 GiB RAM.

A new tiny client wrapper imports only filesystem/assert/timer/policy modules
before checking its exact own systemd cgroup and ancestors. It writes a
secret-free PID/cgroup readiness handshake, then waits for the controller's
independent actual reads and matching PID/cgroup/unit check. Only then does
it import the existing live runner/wallet SDK. No arbitrary endpoint or
alternative proof path is accepted. Its result handshake retains final
cgroup counters until acknowledged. The controller records whitelisted
owned-process numeric counters and client memory/current/peak/swap/events,
checks PID cgroup ownership on every sample, and handles owned-unit OOM/exit.
It stops only the exact unit with matching worktree and its own labeled
container before removing swap. If either stop cannot be verified, swap and
lock are retained. Original-service inspection failures no longer prevent
saving the controller report. No witness/private account payload is logged.

Four pure-policy cases now cover combined bounds, applied client limits,
restrictive ancestors/missing limits, V8 heap distinction, and existing
startup/emergency stops. Both wrappers pass node --check. The next complete
approved npm run check exits 0: 279 passed, zero failures/skips (diagnostics
37, protocol 6, M2 15, M3 14, M4 16, M5/M5-P1 50, generated Midnight 135,
actual local Hardhat 6). Midnight duration 182655.2244 ms, Hardhat 3322 ms
remain non-proof timings. No Compact, generated program or key bytes change
for the joint controller; current asset preflight still passes.

The approved real joint run uses logs/m6-capped-live-SiMfgB. Both applied
resource checks pass before wallet imports; the emitted combined bound is
4026531840 bytes and actual host swap total 8388604 KiB. Actual workflow,
credential/slot acceptance, complete memory/time and cleanup remain pending;
do not mark this launch as success. This is execution resource isolation,
not a new ledger/trust/signature/ancestry architecture, production approval,
or permission to send witnesses to a third party. New work remains local,
uncommitted and isolated from M5/main/M7/M8/M9/shared milestones/HTML.

第二次真实 3.5 GiB 配置确实发生换页并接受 11 笔交易，含模板激活和初始分配；账户
签发开始后，在 881.893 秒／RAM 355248 KiB／空闲 swap 6164288 KiB 再触原保护，
不是超时／OOM／无效证明。896.520 秒已清理自有容器／swap、原服务不变；357 控制器
及 147 证明器采样、证明器 peak 3758100480 bytes／swap current 最大 2142744576，
OOM 零，精确路径／哈希保存在独立 JSON。不能仅凭缺完成日志推断未上链；17:38:32.432Z
不建钱包的独立读取确认实例／凭证序号 0、两类 nonce 0、无暂存、权限 1、模块 active4
及 registry6、模板 active1，确实无凭证／槽位变更；不当作最终治理／重启验收。

先前客户端 RSS 799544／HWM819196 KiB 是一次快照，不是后来峰值；停止结果不能
证明压力全部来自客户端，但证明仅限证明器不等于完整应用预算。于是仍在既定架构内
共同计量和限制两者，不降低保护或推销客户硬件要求。新配置证明器硬 2.75 GiB／四
CPU／单任务，客户端软 0.75／硬 1 GiB／swap ceiling4 GiB／单 CPU，合计配置硬 RAM
3.75 GiB；证明器 swap ceiling8 与客户端 4 共享原总共 8 GiB，不预留 12 GiB。
Node 显式 old-space3072 MiB 只允许虚拟堆换页，不给 3 GiB RAM；全部时间／RAM／
OOM 安全保护保留。新 wrapper 在 SDK／钱包导入前验证自身精确 cgroup 及上级，通过
无秘密 PID/cgroup handshake 等控制器独立实读核对后才继续；结果握手让最终采样完成。
控制器只采自有进程白名单数字及 cgroup，逐次检查 PID 归属；清理必须证实自有单元与
容器均停止，否则保留 swap／锁，原服务检查失败仍保存报告，不记 witness／账户秘密。

四项纯策略及两个语法检查通过，完整批准检查 279 全通过、无失败／跳过：诊断 37、
协议 6、M2 15、M3 14、M4 16、M5 含补丁50、生成 Midnight135、真实 Hardhat6；
耗时 182655.2244／3322 ms 非证明耗时。不改 Compact／程序／密钥，资产仍过验证。
真实联合运行 SiMfgB 已在钱包导入前通过双方实际限制，合计 4026531840 bytes／
主机 swap8388604 KiB；流程、凭证／槽位、完整成本及清理仍待观察，不把启动当成功。
这是执行资源隔离，不是替换账本／信任／签名／祖先架构、生产审批或第三方 witness
授权；本轮仍未提交，不改 M5/main/M7–M9／共享 milestone／HTML。

### 2026-10-15 — first joint budget hits real OOM; independent paging reserve

The previous exec session handle is no longer available after continuation;
this is not used to infer workload success/failure. Its saved completed report
in logs/m6-capped-live-SiMfgB proves the actual result: prover OOMKilled=true,
stop observed at 2026-10-14T17:57:26.678Z/875.782833796 monotonic seconds,
total controller 877.346389960 seconds. During the credential issuance phase,
the 2.75 GiB physical cap was honored, but sampled prover swap.current reaches
7306457088 bytes. Client reported memory peak 805830656, swap peak 876896256
bytes, no client OOM. At the last pre-kill sample, shared swap is only
79732 KiB free while MemAvailable remains 1491512 KiB. Across 381 controller
samples minimum RAM available is 1404520 KiB. This is a real resource failure,
not a protocol rejection, a timeout, or one of the earlier proactive stops.
The final Docker OOMKilled observation takes precedence over the last
successful periodic memory.events sample (which still showed zero). The
subsequent failed sampling read is recorded as one error, never zero-filled.

Deployment plus eleven transactions, through activation and allocation, were
accepted, but account issuance emits no completion. The approved independent
public read at 18:27:48.597Z confirms actual instance/credential sequences and
credential/slot nonces all zero. No claim relies only on missing log markers.
The owned client unit was verified stopped, owned container removed, own swap
disabled/unlinked, original SwapTotal restored to 2097152 KiB. Original prover
still runs on the exact image. Report SHA-256
61bac9da0438214a7358d75aeeb8e391bea1eb03310ebda8b46cda21f8fcc705;
public log a211fe308dcdbe673d3d693ce84619c9e1268558700601ab4b57ccc42005af6b.

The concrete guard defect: shared-machine-swap-exhaustion required both low
swap and low global available RAM. A process constrained by memory.max cannot
necessarily use that other free RAM. Corrected the guard to independently
stop below 512 MiB free swap, retaining the separate 384 MiB RAM reserve.
Added to the existing guard case the exact plentiful-RAM/low-swap boundary and
512 MiB non-triggering boundary. This tightens, not relaxes, emergency handling.
No polling guard can guarantee prevention of every sudden allocation/OOM.

The next approved local operational test increases only the owned prover cap
from 2.75 to 4 GiB, keeps client 1 GiB, so combined hard RAM is 5 GiB, below
the user's discussed 6 GiB target. The same host total 8 GiB swap remains
shared; no WSL resize, global swappiness, additional swap, original-service
change, compiler, signing, crypto, trust, tree-depth or circuit alteration.
This is a test configuration, not a passed customer-memory or SLA claim.
The whole-stack node/indexer/original service overhead is outside that cap.
Both actual resource gates pass for logs/m6-capped-live-Dtx3GU. The fresh
chain workflow remains running and will be recorded separately.

Four focused policy cases pass, syntax passes, and the full approved
npm run check repeats successfully with 279 passed/0 failed/0 skipped and
the same suite counts. Midnight regression 165886.5091 ms, local Hardhat
4309 ms, not proof timings. A multi-file documentation patch first failed
on a line-wrapped context; no partial changes were applied and the patch
was reapplied with exact anchors. No new commit or push was made.

续接后旧 exec handle 已失效，不据此判断任务；保存的 SiMfgB 完整报告确认证明器
实际 OOM，875.783 秒观察到、877.346 秒控制器结束。凭证签发时物理 cap2.75 GiB
确实生效，但证明器 swap current 最大采样 7306457088 bytes；客户端内存／swap
报告峰值 805830656／876896256、无 OOM。最后 kill 前 swap 只余 79732 KiB，
RAM 仍1491512 KiB，381 采样 RAM 最低1404520。是真资源失败，不是协议／超时／
先前主动保护；最终 Docker OOMKilled 不能被最后成功采样的零 OOM 推翻，后续采样
失败记一次错误，不填零。部署及11交易到分配已接受，账户无完成；18:27:48.597Z
独立公开读取确认实例／凭证序号和两类 nonce 全零。自有客户端／容器均停、临时
swap 清理、原2097152 KiB保留、原镜像仍运行，精确哈希记录如上。

旧 swap保护要求 RAM 也低，受 memory.max 限制进程不一定能用其他空闲 RAM，因此
修为独立 swap512 MiB阈值，保留 RAM384 MiB，并加高 RAM／低 swap及边界测试，
属于收紧保护；轮询仍不保证阻止瞬时 OOM。下次只把自有证明器提至4 GiB、客户端
1 GiB，合计5 GiB，低于讨论6 GiB目标，同总swap8 GiB；不改全局／原服务／密码／
架构／电路，整机节点等不在cap内，不宣称生产SLA。Dtx3GU双方实际限制已通过，
链流程在运行。四定向及语法通过，完整279全通过，回归165886.5091／4309 ms不是
证明耗时。文档patch因换行上下文失败过一次、无部分改动，精确锚点重做；没有提交推送。

### 2026-10-15 — account proof succeeds; SDK binary-IR inventory defect found

The 5 GiB combined profile Dtx3GU completes a real v8 account issuance:
18:42:45.429–18:47:21.291Z, 275.862 seconds call-start-to-indexed-acceptance,
transaction 0029555b84c83ab0116f89493259409d659070891db2d803cadfce247d9731a84e.
The complete partial run spans 1153.430847412 seconds, twelve accepted
post-deployment transactions, no OOM or resource guard. 182 prover samples,
zero errors; reported prover memory peak 4294971392 bytes (4 GiB plus one
accounting page), sampled swap current max 6407016448; client RAM/swap peaks
805822464/687124480. Peaks may not coincide. Shared minimum available RAM
509400 KiB, free swap 683120 KiB. Physical limits do not imply only 5 GiB
total working storage. This is one administrative credential call, not
ordinary-action latency, P95/throughput, a browser proof or full M6.

The next slot begin fails in 9.259 seconds with no accepted staging. The
original runner redacts its error, so that captured failure remains
unclassified rather than retrospectively claiming a known HTTP status.
After adding an explicit --observe-only mode, an independent public-only
read at 18:50:40.278Z confirms instance sequence 1, credential-status sequence
1, one credential nonce, zero slot nonce/session and exact allocation/state.
Observation cannot be combined with --final/--slot-state/--allocation-only;
its event/scope explicitly says diagnostic-only-not-acceptance. No wallet or
private witness is initialized. The first observation attempted an incorrectly
guessed timestamped filename and failed closed; exact file discovery and the
approved correct command succeeded. No ledger rollback was inferred.

Added fixed live-failure classifications (HTTP status, known static preflight
labels, timeout and unknown fallback) and slot operation-stage diagnostics.
No URL, response body, error text, private witness or non-error accessor is
serialized. Ten focused reader/classification cases plus strict typecheck
pass. The full root suite passes 283 (41 diagnostics, other suite counts
unchanged), zero failures/skips; Midnight 177387.7368 ms/Hardhat 4453 ms are
regression, not proof timings. Static-label expansion is separately retested.

A diagnostic replay ebNkio starts on the same resources, but exact installed
SDK source reveals a concrete asset gap before it reaches the slot again:
NodeZkConfigProvider 4.1.1 loads zkir/<circuit>.bzkir. The HTTP provider's
getKeyMaterial catches loader errors and returns undefined, hiding ENOENT and
causing the built-in-key fallback. Actual current directory has binaries for
ten newly compiled entries, but none for the reused slot. The original asset
guard checked only text .zkir, real key pair and generated JS/info hashes.
Thus its original inventoryVerified is a complete key-pair check, NOT a
complete SDK readiness check. This defect belongs to this integration, not
Midnight architecture or the separate successful experiment; it must not be
papered over as another memory issue. The original captured slot exception
still has no recorded HTTP status, so source evidence is kept distinct from
retrospective runtime attribution.

Stopped the redundant replay. Ctrl+C closed the exec transport without a
controller cleanup report, leaving its transient client/container/swap.
Added narrow recover-m6-capped-live: checks this exact worktree's controller
ownership without logging process arguments; if none remains, verifies the
exact client unit/cgroup/working directory, labeled container/image, native
owned swap path/permissions/size and safe swapoff headroom. At 19:00:03.096Z
the recovery stops only those owned resources, removes the temporary
container/swap/empty lock and records recovery.json. Original services remain
unchanged, original SwapTotal 2097152 KiB and original prover running.
No global WSL/Docker reset, broad kill or deletion of chain volumes.

Pinned zkir help offers no real binary-only command. Its exact source shows
real compile serializes .bzkir beside the text input before key generation.
The successful experiment did exactly that on the matching slot program:
text SHA-256 70ea49d8ddab0189ba95daa52d91f060e3d7ee90700e8982999353d3417f70e4,
binary 83923 bytes / 9a5eb57ca747c0fd6f5abc56152168264f839ddbab15ba04467ccb54fac032e0.
Rather than regenerate expensive keys or invoke mock key generation, reused
only that public compiler output, after checking current/external text and
all eleven original key/program/binding fingerprints. No experiment source,
history, instruction, wallet or witness data is copied or changed.

Both builders now emit local manifest v2 including binaryProgramSha256/Bytes
for every entry; reuse additionally imports the matching binary. The guard
rejects v1, absent binary, altered binary, bad sizes and unknown modes before
wallet startup. Extended the existing fake-byte integrity test (still not a
proof test); eleven focused cases pass. repair-m6-binary-inventory performs
the exact one-time metadata correction: preserves original manifest at
logs/m6-binary-inventory-iNzbFZ/original-build-manifest.json, copies the missing
binary exclusively, atomically installs v2 and independently checks all
assets plus actual SDK getZKIR. All real keys, text programs and generated
contract bindings remain byte-exact. New manifest SHA-256
bc443544b187db68d855e5f7751ebe21fc75892a053b787325f367e512dec636.
Historical key report/manifests are preserved and corrected by an explicit
later note, not rewritten into evidence they never checked.

A public-binary-only /k inspection on original localhost:6300 times out at
30 seconds; no private witness was sent, no version rejection or success is
inferred and it is not retried. The corrected real workflow q17jdT starts
with v2 guard on the unchanged 5 GiB combined/8 GiB shared-swap profile.
Actual slot success is pending. Full checks are being rerun after the guard;
M6 ordinary action/receipt/privacy/recovery gates remain open. Shared
milestone Markdown/HTML, M5, lockfile and other worktrees are untouched;
new edits remain local/uncommitted, no push.

合计5 GiB配置已真实接受账户签发，端到端275.862秒，十二笔部署后交易；无OOM／
资源停止，182采样无错误，证明器物理约4 GiB、swap采样最高6407016448 bytes，
客户端峰值另记且不相加，最低RAM509400／swap683120 KiB。这是一笔管理调用，
不是总存储5 GiB、普通动作／P95／浏览器或M6验收。首个槽位begin9.259秒未知分类
失败；独立观察模式在18:50:40.278Z确认实例／凭证序号1、凭证nonce1、槽位nonce／
暂存零。观察不能与最终验收参数混合，不建钱包，事件明确只是诊断；一次猜错日志
文件名失败后按实际文件重做成功。固定错误分类及阶段诊断不泄漏原始错误／URL／
witness，十定向及283完整检查通过，耗时不是证明。

重跑ebNkio过程中源码发现SDK读.bzkir，而HTTP材料加载捕捉错误后回退undefined；
十个新生成入口有二进制，复用槽位没有。旧guard仅查文本／密钥／绑定，故旧
inventoryVerified是密钥齐备，不是SDK齐备；这是本次集成缺陷，不是架构或实验失败，
不能归咎内存。原脱敏失败仍无记录HTTP状态，不事后捏造。停止重复测试时Ctrl+C
关闭exec传输却未留下cleanup报告；窄恢复工具逐项核验自有controller／单元／容器／
swap及安全余量，19:00:03.096Z完成，只清自有资源，原2 GiB／服务保留，不重置或
广泛杀进程／删链卷。固定编译器无真实只序列化命令，但源码显示真实compile会先写
旁边.bzkir。成功实验已有同文本70ea...二进制83923 bytes／9a5e...，核验十一组
真实资产后只复用此公开输出，不改实验、不复制源码／历史／指令／秘密、不mock。

两个builder及guard现要求清单v2，每入口二进制长度／哈希，钱包前拒绝旧／缺／篡改，
已有完整性假字节测试扩展通过（非证明测试）。一次性repair备份旧manifest至独立
忽略日志，再独占补binary、原子更新v2、全资产及真实SDK读取通过；真实密钥／文本／
绑定未变，新清单bc443...，旧报告保留并明确补充不曾查的范围。只发公开binary的/k
诊断30秒超时，不据此说版本拒绝／成功、不重试；修复后的q17jdT同内存配置实链
已开始，槽位仍待结果，完整检查再跑，M6未完成，无共享文档／M5／锁文件／别的
工作树修改，未提交推送。

The corrected full root check after the binary-inventory repair also exits 0:
283 passed, zero failed/skipped, same suite counts; Midnight regression
175652.8874 ms, actual local Hardhat 4065 ms. All four new helper/build scripts
pass node --check, the ignored slot binary and private bridge remain ignored,
the index is empty and protected milestone/M5/lockfile paths remain untouched.
The native repair report confirms all eleven binary entries and SDK loading,
not slot-node acceptance; q17jdT is still in the fresh live workflow.

二进制清单修复后完整检查再次 exit0，283全通过、无失败／跳过，分类不变；
Midnight175652.8874／真实Hardhat4065 ms为回归时间。四个新helper／build脚本语法
通过，二进制与私有bridge仍忽略、index空、共享milestone／M5／锁文件不改。修复报告
证实十一项二进制及SDK读取，不是槽位验收；q17jdT实链仍在运行。

### 2026-10-15 — corrected four-worker run stopped safely; explicit serial runtime profile

On continuation the old exec handle is unavailable. The durable q17jdT report,
not the handle failure, establishes the result: started 19:04:25.300Z,
stopped at monotonic 960.214453226 seconds, cleanup complete 19:20:46.161Z /
976.888204996 seconds. Deployment and eleven post-deployment transactions
through exact allocation pass. Account issuance starts 19:18:09.541Z, but at
19:20:29.364Z free swap reaches 519652 KiB, below the independent 524288 KiB
reserve. No OOM occurs and no slot call is reached. The unfinished account
call's 139.823 seconds to the final safety sample is not a completed proof
latency, a timeout or evidence that the restored slot binary failed.

Four hundred controller samples and 154 prover samples, zero prover-sampling
errors. Whole-run prover memory.peak 4295000064 bytes and swap.current maximum
5906923520; client reported memory/swap peaks 806141952/869425152. Accounting
can exceed configured RAM by pages; individual peaks may not coincide and
are not an isolated proof working set. Minimum sampled available RAM 445784
KiB and free swap 519652 KiB. Initial original swap was already partly used
(1264796 KiB free); background/variation effects are not isolated. This run
does not negate the earlier 275.862-second account success, but neither does
that one success establish repeatable full-workflow completion in this budget.

The owned client unit/container stop, temporary swap is disabled/unlinked,
original SwapTotal returns to 2097152 KiB and the original prover stays running
on the same image. Report SHA-256
fbd18656098fbbf29c1ace6fce7c9aebad00ce87f9ed531e05ff784c89e335a3;
public log logs/m6-live-2026-10-14T19-07-19.986Z.jsonl SHA-256
e57f3cbe57c90a128349df1fe3bedda4d99383418bbd991a63684335363997ae.
An initial sandbox public read fails with redacted details; the approved
public-only command succeeds at 19:26:58.525Z. It confirms instance/status
sequence 0, credential/slot nonces 0, no staging, exact allocation and state
39bbcab8b4999d5a8652455a48b5243eb2d3f4385c02f0268222c6ed6c3ebc1b.
No wallet/private witness or transaction is used by this observation.

Added an explicit allowlisted --serial-prover option to the capped controller:
one CPU quota and RAYON_NUM_THREADS=1 instead of four CPU/workers. Default
behavior remains four. The parser rejects unknown modes/options, duplicate
serial flags and arbitrary worker counts; its returned profile is frozen.
The actual Docker CPU quota and the exact worker/job environment entries are
checked before wallet imports, without serializing the container environment.
RAM remains prover4/client1 GiB, original+temporary host swap remains 8 GiB,
single job, two-hour workflow deadline and RAM/swap reserves remain unchanged.
The purpose is to measure whether less temporary parallel storage helps; no
low-memory guarantee is inferred. No hashes, private ancestry, signatures,
state ordering, authority, network, toolchain or acceptance checks change.
Only the owned secondary prover uses this profile, not shared services.

The approved fresh run is logs/m6-capped-live-8QHrol; its applied-limit gates
pass and it is still running. Current HTTP-provider timeout is not silently
expanded. Five focused guard/profile tests, controller syntax and strict
typecheck pass. A subsequent full npm run check exits 0, 284 passed/0 failed/
0 skipped: diagnostics42, protocol6, M2 15, M3 14, M4 16, M5 including patch50,
generated Midnight135, actual local Hardhat6. Midnight149809.0292 ms and
Hardhat4293 ms are regression durations, not proof latency. A Windows rg
invocation with a literal filename wildcard fails; corrected -g filtering
locates exact source files without changing anything. The wiki still omits
current M6; index health confirms its root is information-flow, so it is not
used or updated as a Permio index. Evidence JSON parses and diff --check
passes; LF/CRLF warnings are not errors. No commit/merge/rebase/push or other
worktree/M5/shared-milestone/HTML/lockfile edit is made. M6 remains incomplete.

续接时旧 exec handle 已失效，按持久 q17jdT 报告而非 handle 判结果：UTC19:04:25.300
开始，960.214 秒独立 swap 保护停止，19:20:46.161／976.888 秒完成清理。部署加其后
十一笔交易到精确分配通过；19:18:09.541 开始账户签发，19:20:29.364 空闲 swap
519652 KiB 低于 524288，无 OOM，从未到槽位调用。未完成账户调用至最后采样
139.823 秒不是完成证明时间、超时或恢复 binary 失败。400 控制器／154 证明器采样，
证明器零采样错误；整流程证明器内存 peak4295000064、swap current最大5906923520，
客户端内存／swap峰806141952／869425152 bytes，峰不一定同时，计费可超cap若干页。
最低RAM445784／swap519652 KiB，启动原swap已部分占用，仅1264796 KiB空闲；
没有隔离后台／变异因素。保留此前275.862秒真实成功，但不能推广为该预算稳定全通过。
自有客户端／容器／swap清理，原2097152 KiB及同镜像证明器保留，报告／日志精确SHA
如上。首个sandbox公开读取脱敏失败，批准后19:26:58.525Z独立观察确认实例／状态
序号及两nonce零、无暂存、精确分配／状态，不建钱包／传witness／发交易。

新增显式白名单 --serial-prover：单CPU／Rayon1，默认仍4；拒绝未知／重复／任意线程，
返回冻结配置，钱包前核验实际CPU和精确线程／任务项，不输出环境。仍证明器4＋客户端
1 GiB RAM、同总swap8 GiB、单任务、两小时及原保护；只测并行临时存储是否可减少，
不保证省内存，不改哈希／完整祖先／签名／状态／权限／网络／版本／验收，只作用自有
第二证明器。已批准新运行8QHrol限制门通过，仍在运行，不偷偷扩大HTTP超时。五项
定向、语法、类型检查通过，完整 npm run check exit0：284全通过无失败／跳过，分类
42／6／15／14／16／50／135／6；Midnight149809.0292／Hardhat4293 ms是回归时间。
Windows一次rg字面通配路径失败，改-g定位，未改源码。wiki仍无当前M6，index实为
information-flow，不冒用或更新。JSON／diff检查通过，换行警告非错误，未提交／合并／
rebase／push，未改别的工作树、M5、共享milestone／HTML或锁文件；M6未完成。

### 2026-10-15 — independent actual-node duplicate rejection and version audit

Added an opt-in public-only node replay check and four pure diagnostic cases,
integrated through root verify:m6:node-replay and the existing diagnostic-test
glob. It selects only a known undeployed v8 fixture's allocation, queries its
public transaction, requires exact ID/contract, successful result, expected
network protocol and bounded valid bytes, then decodes the transaction with
the installed ledger library and checks its ID again. It does not initialize
a wallet, rebalance, sign, prove, load account files or accept an arbitrary
endpoint/payload. Raw public bytes stay in memory; neither bytes nor arbitrary
RPC/SDK error messages are logged. Third-party console logging is temporarily
disabled only around this dedicated diagnostic's node client and restored in
finally. Fixed stage/error-shape events remain visible. A 60-second submission
wait and 90-second whole-command deadline cannot turn timeout into success.

Two initial full invocations fail before submission on my incorrect 32-byte
transaction-ID check. A separate sanitized read-only metadata query also
finds that indexer protocolVersion is 1000000, not the ledger library major8;
its successful exact-contract allocation is 9994 bytes. The correct SDK ID is
serialized33 bytes (66 hex characters), distinct from a 32-byte hash. Both
guards are corrected and negatives retain rejection of the wrong formats.
Early SDK submission errors remain unclassified in their original captures.
Subsequent allowlisted shape diagnostics, including a WSL Node22 run, identify
SubmissionError with a connection label, no recognized RPC code. These are
failed infrastructure attempts, not passed node negatives.

Pinned wallet-sdk-node-client1.1.3 source calls api.disconnect immediately after
metadata initialization. WsProvider.disconnect resolves after initiating close,
but resets isConnected only in onclose. Thus immediate SDK ensureConnection
can observe stale connected state before the close settles. Added an explicit
1000 ms initial settling delay, not a resubmission loop, a private-field patch
or an architecture/ledger/trust change. This is a verified local diagnostic
sequencing measure, not a production connection-readiness guarantee.

The corrected native Windows command exits0 at 2026-10-14T19:48:38.779Z. The
real local node explicitly rejects the exact previously accepted allocation
transaction with RPC1010; both typed code and static invalid-transaction label
are captured without its message. Before/after SHA-256 of the entire serialized
public contract state both equal
c9132885d8c1a542a7224259270cce03ad16ad4b8945855ba8535fe2c0cf431e.
Public transaction SHA-256
3217f6a2146fe8335b01ca8241c1173f9beaceae334b169e0c954a44c30d60b4.
Exact command, contract/transaction IDs and limits are in
node-replay-verification.json. This is actual node submission, unlike SDK
Compact preflight, but does not isolate a Permio command nullifier from ledger
input/state/expiry replay checks. It does not establish new malicious-proof,
ordinary-action, concurrency, privacy or restart acceptance. No prover job
is started by the replay check; its resource use is outside the other run's
client/prover cap, so background effects are not claimed isolated.

The audit also catches stale manual evidence labeling ledger8.0.2. HEADf2d8689
package-lock, current unchanged lock, installed @midnight-ntwrk/ledger-v8 and
the midnight-js-protocol4.1.1 direct declaration all specify8.1.0; resolution
from protocol/ledger confirms that exact installed package. Corrected current
v8 allocation/capped/node-replay evidence, without installing or changing a
dependency. Root wallet-sdk remains1.2.0, node client1.1.3, Compact0.31.1,
runtime0.16.0, node1.0.0/indexer4.3.3/proofserver8.1.0. No ledger9 upgrade or
new architecture is adopted. A multi-file documentation patch fails atomically
on a Chinese line-wrap mismatch, then applies with exact anchors. Four focused
cases/typecheck pass and the complete root check is running. The serial proof
has reached real allocation and account issuance; slot acceptance is pending.
No new commit/push, other worktree, M5 or shared milestone/HTML/lockfile change.

新增显式公开 node replay 工具及四个纯诊断测试，根命令／现有测试glob接入。只从
已知undeployed v8日志选分配，索引器核验精确ID／合约、成功状态、网络协议、有限合法
字节，再账本反序列化核验ID；不建钱包、balance、签名、证明、读账户或任意端点／
payload。公开原字节只留内存，原始RPC／SDK错误不出日志；只在专用诊断的nodeclient
范围临时关闭第三方console、finally恢复，保留固定阶段／形态。提交60秒、全命令90秒
上限，超时不能通过。前两次完整调用在提交前被我错误32字节ID检查拒绝；另一次只读
脱敏元数据发现索引器protocolVersion1000000，不是账本major8；原成功分配9994bytes。
SDK ID是33字节／66hex，不是32字节哈希。两检查修正并覆盖错误格式负例。早期SDK
错误保留未知，后续native／WSL固定诊断确认带连接标签的SubmissionError、无已识别
RPC码，不能当节点拒绝通过。

固定nodeclient1.1.3源码在metadata初始化后立即disconnect，底层disconnect只发close
便返回，isConnected要等onclose才清；立刻ensureConnection可能看到旧connected。
加一次明确1000ms初始等待，不做自动重发／改私有字段／架构／账本／信任，不宣称生产
连接就绪保证。修正native命令UTC19:48:38.779 exit0，真实节点明确RPC1010拒绝原分配，
记录类型码及固定标签不记原文。整个序列化公开合约前后SHA均c913...，公开交易SHA3217...，
精确全文在上述JSON；是真node提交，不是Compact preflight，但未隔离Permio命令
nullifier和账本输入／状态／过期重放检查，不替代新恶意证明、普通动作／并发／隐私／
重启验收。该工具不调用证明器，其资源不在另一个测试的client/prover cap内，不声称
后台影响已隔离。

版本审计发现先前人工8.0.2标签过时：HEADf2d8689及当前未变lock、已安装ledger-v8、
midnight-js-protocol4.1.1直接声明均8.1.0，从protocol/ledger解析也确认。仅修正当前
v8分配／受限／重放证据，不安装／改依赖；wallet-sdk1.2.0、nodeclient1.1.3、Compact
0.31.1、runtime0.16.0、node1.0.0／indexer4.3.3／proofserver8.1.0，不升级ledger9或
换架构。文档patch因中文换行上下文失败，原子无修改后精确重做；四定向／类型通过，
完整根检查运行，单线程已到真实分配／账户签发，槽位未验收。未提交推送、改别的工作树、
M5、共享milestone／HTML或锁文件。

### 2026-10-15 — serial result, finite request budget and proof-stage observation

The first serial run 8QHrol finishes with client code1, no resource guard/OOM,
at 19:53:11.714Z / 1495.504402703 seconds. Deployment plus eleven transactions
reach allocation; account call starts19:47:38.387Z and the redacted unknown
failure event is19:52:57.579Z (319.192 seconds, incomplete-call timing).
No slot call is reached. 623 controller/253 prover samples: maximum reported
prover RAM4294971392 bytes, sampled swap5249179648, client RAM/swap peaks
806019072/741666816; minimum shared RAM/free swap602308/1217052KiB. This is
not another observed memory stop. Cleanup removes owned client/container/swap,
preserves original2GiB/prover. Public-only observation19:55:14.072Z confirms
instance/status sequences, credential/slot nonces zero, no staging, state
a5ebd12db33136d4390de0e91ae62ecc1adf707b66d8c45d26841fdbe4bbd39d.
Report SHAec76d0a49a88e4703ee1d0c30118828ca1555ddceddaac2c86c3c03b60d1f514;
public log19-31-40.595Z SHAc4915f53885d98f6e221208f3db941b97fa483a3d844e646e16f17ee1d1ca21c.

Exact installed HTTP-provider source uses AbortSignal.timeout300000 by default;
the pinned server's default job lifetime is600seconds. The original serial
capture has no preserved cause, so five-minute HTTP expiry stays a hypothesis,
not a retrospectively established failure category. The next bounded local
provider uses finite600000ms via the SDK's supported config; the original
6300 endpoint remains300000. This changes transport waiting only, not circuit/
credential validity, state ordering, signatures, private ancestry, two-hour
workflow timeout or384MiB RAM/512MiB swap reserves. The serial controller also
explicitly sets/validates one server pool worker and600second job lifetime,
alongside Rayon1/CPU1. Earlier serial report did not set/capture pool count;
source default2 is not claimed as its actual measured value. Shared services
and the exact image/programs/keys/5GiB RAM/8GiB host swap remain unchanged.

Added transparent contract-proof-provider observation: exact original arguments,
proof result and rejection pass through. No transaction/witness/result/error
text is inspected or serialized. Fixed per-provider job numbers, configured
HTTP wait and monotonic start/completion/failure durations include SDK check/
prove HTTP work; they do not prove finality or measure pure crypto, wallet work
or ordinary-customer latency. Diagnostic adapter mocks are explicitly not
valid transactions/proofs. Error classification recognizes native DOMException
and static wrapped TimeoutError/AbortError names plus up to four data-only
cause links. Accessor/proxy/cycle/deep-cause negatives fail closed without raw
data or unbounded recursion; an outer HTTP status retains precedence.

Fresh approved ld9p0T starts on this explicit profile; both actual resource gates
pass. The latest full npm run check exits0, 293passed/0failed/0skipped:
diagnostics51, protocol6, M2 15, M3 14, M4 16, M5including patch50,
generatedMidnight135, actualHardhat6. Midnight152312.1201ms/Hardhat4197ms are
regression durations. Focused observer/timeout/classifier tests, controller
syntax and strict typecheck also pass. No current slot or ordinary-action
acceptance is claimed. Documentation records the completed serial failure
separately from the new running test; original unknown errors are not relabeled.
No commit/push, source/key regeneration, dependency update or protected-path edit.

首轮单线程8QHrol以client1结束，无资源保护／OOM，UTC19:53:11.714／1495.504秒清理。
部署加十一笔交易到分配，账户19:47:38.387开始、19:52:57.579未知脱敏失败，319.192秒
是未完成调用而非成功证明；没到槽位。623／253采样，证明器RAM peak4294971392／
swap采样5249179648、客户端RAM／swap806019072／741666816bytes，最低共享RAM／
空闲swap602308／1217052KiB，非又一次内存停止。自有双方／swap清理、原2GiB／
证明器保留，19:55:14.072独立观察确认实例／状态／两nonce零、无暂存，精确状态及
报告／日志SHA如上。SDK源码HTTP默认300000ms、服务job默认600秒；原异常未保留cause，
五分钟超时只是假设，不事后分类。下次只给受限本地端点SDK受支持配置600000ms，原6300
仍300000；只改传输等待，不改电路／凭证窗口、状态／签名／祖先、全流程两小时或原保护。
串行显式核验serverpool1／job600秒、Rayon1／CPU1；旧测试未捕获pool，不能将源码默认2
说成实测。原服务、镜像／程序／密钥、RAM5GiB／总swap8GiB不变。

透明proof观察器原样传递参数／证明／异常，不检查或序列化交易／witness／结果／错误原文；
只记录固定任务号、HTTP预算和单调阶段计时，含SDKcheck/proveHTTP，不是最终性、纯密码、
钱包或普通用户耗时，adapter mock明确非真实交易／证明。分类安全处理nativeDOMException、
wrapped静态timeout名字和最多四层data cause；accessor／proxy／循环／过深不读秘密、不
无限递归，外层HTTP状态优先。新批准ld9p0T双限制门通过；最新完整check exit0：293全通过
无失败／跳过，51／6／15／14／16／50／135／6，Midnight152312.1201／Hardhat4197ms
为回归时间。定向、语法／类型通过。当前槽位／普通动作未验收，旧失败与新运行分开，未知
不改称已知。未提交推送、重生成源码／密钥、改依赖或受保护路径。
### 2026-10-15 — observed ten-minute trial stops at swap reserve; idle-prover overhead removed

The ld9p0T run starts19:59:15.842Z and ends20:24:01.761Z /
1478.771242106seconds. At20:23:48.102Z /1465.254034665seconds the shared
swap guard stops it:425300KiB free, below524288, available RAM646292KiB.
Deployment plus eleven transactions through allocation pass. Account proof
job13 starts20:17:44.689Z and has no completion/acceptance event;363.413seconds
to the final safety sample is interrupted-stage timing, not successful proof
latency or an established HTTP timeout. No slot call is reached, no OOM is
observed. The same image's command has no worker/job-timeout override; explicit
Docker environment settings apply. A first metadata-inspection command has a
copied image-ID typo and hits sandbox pipe denial before inspection; the
approved exact digest read succeeds, without dumping environment variables.

Controller/prover captured samples624/249, no captured sampling-failure events,
but forced interruption produces no final sampling-completion event. Reported
prover RAM peak4295135232bytes, sampled swap maximum5601128448; client RAM/
swap peaks806072320/731258880. Peaks may not coincide; kernel accounting may
overshoot configured RAM by pages. Minimum shared available RAM643028KiB.
Owned client/container/swap cleanly stop/remove, original SwapTotal2097152KiB
and original prover running. Report SHA
3a73bf3ab39aca472b387fa80d95aa2623df5fbe5247020488792683faefd635;
public log20-02-49.962Z SHA
cb1488e4959542db469494df18196625357ad22362e12f6996527d9fa2153b65.
Independent public observation20:28:34.171Z confirms instance/status sequences,
credential/slot nonces zero, no staging and exact state
bb25d8ad04a2ed2046523bc8a04fb7ca93c806eeb28261e1ec8f7a7c68f24411.
A preceding reader invocation guessed a wrong timestamp and fails before any
read; corrected enumerated filename passes. A6301 readiness query occurs after
owned container removal and gets ECONNREFUSED; it does not establish Docker
failure or any processing-job count. No private request/error body is read.

Measured completed proof-provider calls include reviews32.448/22.997seconds,
second module approval93.765seconds and allocation66.325seconds. These include
SDK/check/prove HTTP work, not wallet/submission/finality, pure cryptography,
ordinary-action performance or a sample distribution. Full root remains293
passed with no failures/skips; only documentation changes follow that result.

Considered a16GiB shared-swap capacity qualification with the same5GiB physical
cap, but did not enable it. The sandbox drive query reports unusable virtual
values1; an approved real read shows C57623773184bytes free, D322635673600,
WSL virtual filesystem1008445788160. Virtual availability is not host physical
disk space. Before requesting a larger budget, a scoped read of the original
prover at20:31:43.518Z finds zero processing/pending jobs but RSS911816KiB,
process swap939212KiB, cgroup RAM969383936bytes/swap961753088bytes. This is
avoidable shared overhead outside the configured client/prover cap, not proof
that all earlier pressure or a production minimum had this cause.

Under the user's earlier permission to stop unused containers, verified the
exact original M6 container ID/name/image/CPU profile and idle readiness again,
then stopped/started only this stateless prover. At20:33:58.655Z the same
container/image/configuration is ready with RSS9972KiB, process/cgroup swap0,
cgroup RAM13533184bytes. Node/indexer/databases/volumes/keys/public disk cache
are unchanged. Its in-memory parameter cache is cold; do not count this as a
node/indexer or ordinary-action restart test. This is an operational cleanup
under existing authority, not a new architecture, trusted bridge or lower
proof guarantee. No larger swap or global memory setting is adopted.

Fresh approved F5cqeV now uses the normal4CPU/Rayon4 profile, same5GiB combined
RAM/shared8GiB swap, server pool2/job capacity1/lifetime600, local HTTP600000ms
and the same two-hour/safety guards. Both resource gates pass. Initial sampled
available RAM6269880KiB/free swap7956732KiB show released headroom, not a
reservation or guaranteed completion. Result pending. Current README adds a
concrete behavior/result matrix; shared milestone Markdown/HTML remain untouched.
All changes are local/uncommitted; no push, M5 change, key regeneration or
architecture alternative. Slot, ordinary-action/evidence/receipt and full
privacy/restart gates remain incomplete.

ld9p0T从UTC19:59:15.842到20:24:01.761／1478.771秒，20:23:48.102／1465.254秒
因空闲swap425300KiB低于524288停止，RAM646292KiB。部署加十一笔到分配通过；账户
proof13在20:17:44.689开始，无完成／接受，至最后采样363.413秒仅是被中断阶段时间，
不是成功证明／已证实HTTP超时；没到槽位、无观察到OOM。image启动命令不覆盖线程／
job期限，显式环境配置生效；一次复制错imageID的诊断先遇sandbox管道拒绝，精确digest
批准后读取成功、不输出环境。624／249采样无捕获采样错误，但无强制中断后的最终完成
事件；证明器RAM peak4295135232／swap最大5601128448、客户端峰806072320／731258880，
峰不一定同时、内核可超计费若干页，最低RAM643028KiB。自有双方／swap清理，原2GiB／
证明器保留，精确报告／日志SHA如上；20:28:34.171独立观察确认序号／两nonce零、无暂存、
精确状态。一次猜错timestamp的读取在读前失败，按实际枚举文件成功。6301查询发生在容器
移除后ECONNREFUSED，不能说Docker坏了或知道job计数，不读私有请求／错误body。

已完成proof-provider审查32.448／22.997秒、第二批准93.765秒、分配66.325秒，含SDK／
check/proveHTTP，不含钱包／提交／最终性，不是纯密码／普通动作或样本分布。完整293仍
全通过，此后只改文档。考虑总swap16GiB同RAM5GiB资格测试但未开启；sandbox磁盘数值1
不可用，真实批准读取C空闲57623773184／D322635673600bytes，WSL虚拟可用1008445788160
不是主机物理空闲。请求更大预算前先审计原证明器：20:31:43.518任务／排队0，仍
RSS911816／swap939212KiB，cgroup RAM969383936／swap961753088bytes。这是cap外
可避免共享开销，不说全部旧压力由它造成或据此给生产最低配置。

按用户此前可停不用容器授权，再核验原M6精确ID／name／image／CPU／闲置，仅停启此
无状态证明器，20:33:58.655同容器／镜像／配置ready，RSS9972KiB、process及cgroup swap0、
cgroup RAM13533184bytes；节点／索引器／数据库／卷／密钥／公开磁盘cache不改，内存
参数cache变冷。不是node/indexer／普通动作重启测试，不是新架构／信任桥／弱化保证，
未扩大swap或全局设置。新批准F5cqeV用常规4CPU／Rayon4，同RAM5GiB／共享swap8GiB，
pool2／job容量1／600秒，HTTP600000ms和原全流程两小时及保护，双门通过。初采样RAM
6269880／swap7956732KiB只是释放余量，不是预留或保证。结果待定；README增加具体
行为／结果矩阵，共享milestone／HTML不改。未提交推送、改M5、重生成密钥或换架构；
槽位、普通动作／证据／收据及完整隐私／重启未完成。

### 2026-10-15 — second accepted account, retained backend storage, optional owned reset

F5cqeV completes20:51:46.869Z after1016.028024352seconds, not successfully.
Account call starts20:47:39.553Z, proof-provider job13 completes in
163373.660883ms, and transaction001215e539ded09035f01548b2f028fc0e0b5293edb1e1c0c2700a18582a28b970
is indexed20:50:44.458Z:184.905seconds end-to-end. This is the second accepted
v8 account, not an ordinary customer action. The first slot proof starts
20:50:45.569Z; at20:51:33.859Z the controller stops at free swap341100KiB
versus524288 required. It reaches the actual provider, unlike the earlier
missing-binary failure, but no slot begin or later slot transaction is accepted.
No OOM is observed.435controller/156prover samples report prover RAM peak
4295049216bytes/swap current maximum6407983104, client RAM/swap peaks
806248448/1555197952. Peaks need not coincide. Own client/container/swap
cleanly stop/remove; original2GiB and prover preserved. Report/public-log SHA
fb8c58c4669296624dbca1e2af3e6621e4542adf8cf588d7b8fe60c1a8b416df /
8ad18f5d4ac879fca139efdb5619bc1b0621cc57e4ef691ce479e09798b21127.
The log is selected by its exact deployed contract, not a guessed timestamp.
Independent wallet-free observation20:55:42.894Z confirms state/status/credential
nonce1, slot nonce/session0, exact state1c81256bce2ead8bd26c627d34da8b00596206d468b7245e2529490d18056c44.

F5cqeV在UTC20:51:46.869／1016.028秒结束，非成功。账户20:47:39.553开始，
proof-provider13耗时163373.660883ms，上述精确交易20:50:44.458索引接受，端到端
184.905秒。是第二次v8账户签发，不是普通客户动作。首槽位proof20:50:45.569开始，
20:51:33.859空闲swap341100KiB低于524288触发停止；确实到达provider，与旧缺
binary不同，但没有槽位begin或后续槽位交易接受，无观察到的OOM。435／156采样，
证明器RAM峰4295049216bytes／swap current最大6407983104，客户端RAM／swap峰
806248448／1555197952，峰未必同时。自有客户端／容器／swap清理，原2GiB／证明器
保留。报告／公开日志SHA如上，日志按精确部署合约选择、不猜timestamp。20:55:42.894
独立无钱包观察确认状态／凭证序号及凭证nonce1、槽位nonce／session0及上述精确状态。

At20:50:45.055Z, after account acceptance but before slot proof14, the own
prover still holds cgroup RAM2941095936bytes plus swap5430046720bytes. No
heap or verbose request/error logs are read; live objects versus free allocator
arenas remain unknown. Before increasing the backing-disk budget, implement an
optional one-time `--reset-before-slot` operational boundary. The slot workflow
checks public state before/after and keeps its private maps/state in the caller.
The numeric sampler finishes before requesting reset and restarts after ready.
The client verifies Linux/root, exact real worktree logs child, opt-in marker,
its PID and cgroup, then writes only kind/clientPid/runName. The controller
rejects extra/foreign fields, verifies its own container label/name/image and
zero jobs, stops/starts only that same container, checks applied RAM/swap/CPU
limits and readiness, then reapplies safety/deadline guards before release.
No new proof or transaction is retried, no signature/deadline renewed and no
protocol/private witness is weakened or moved to a new service.

20:50:45.055账户接受后、槽位proof14前，自有证明器仍cgroup RAM2941095936／swap
5430046720bytes。不读heap／详细请求或错误日志，未确定活对象或空闲allocator区域。
扩大磁盘预算前实现可选一次`--reset-before-slot`操作边界：槽位流程前后核验公开
状态，私有maps／state留在客户端；数值采样完成暂停，ready后重新开始。客户端核验
Linux／root、精确工作树logs直接子目录、启用标志、自身PID／cgroup，只写kind／
clientPid／runName。控制器拒绝多余或外来字段，核验自有容器label／name／image和
零任务，仅停启同容器，复核实际RAM／swap／CPU及ready，再通过原保护／期限才放行。
不重试证明／交易、不续签或续期、不弱化协议／私有witness或转移到新服务。

The new run is cBg1CS, same5GiB combined hard RAM/shared8GiB swap, normal
4CPU/Rayon4/server pool2/capacity1/lifetime600 and HTTP600000ms. It is still
running; the cold-slot result is not claimed. Seven focused policy tests,
script syntax and strict typecheck pass. Full `npm run check` exits0 with295
passed/no failures/skips:53/6/15/14/16/50/135/6. Midnight144031.3356ms and
Hardhat19999ms are regression durations, not proving measurements. A separate
diagnostics rerun also passes53/53. One README patch fails safely on mismatched
translation context, then applies against the exact current lines. No commit,
push, Compact/key rebuild, lockfile, M5 or shared milestone change. The larger
swap proposal remains disabled. Ordinary action/evidence/nullifier/receipt,
full slot and restart/privacy acceptance are still open.

新cBg1CS仍合计硬RAM5GiB／共享总swap8GiB、常规4CPU／Rayon4／pool2／容量1／任务
600秒及HTTP600000ms，运行中、不宣称冷槽位成功。七项策略、脚本语法／严格类型通过。
完整check退出0：295全通过，无失败跳过，53／6／15／14／16／50／135／6；Midnight
144031.3356／Hardhat19999ms是回归耗时，不是证明。另重跑diagnostics53／53通过。
一次README补丁因翻译上下文不符安全失败，再按精确当前行修正。未提交／推送、重编
Compact／密钥、改锁文件／M5／共享milestone；更大swap仍未启用，普通动作／证据／
nullifier／收据、完整槽位和重启／隐私验收仍未完成。

### 2026-10-15 — owned reset passes; cold slot still reaches the shared paging boundary

cBg1CS starts21:02:39.228Z and completes21:20:52.977Z /
1086.832068178seconds with a safety stop, observed runner exit1. Deployment
and12post-deployment transactions pass. Account call21:15:33.385Z to indexed
acceptance21:18:38.291Z takes184.906seconds; provider job13 takes
164353.796507ms. Exact tx0027f7fa9a2cf5d83e12155bbc32815ba4fa6fb69596a08df86b5323f2ebcbb16d.
The pre-reset sampler finishes154samples/error0. At21:18:40.456Z the controller
confirms its own idle prover, RAM2997391360bytes/swap5317849088bytes; the same
container/image/limits restart ready21:18:48.951Z, RAM13496320bytes/swap0.
The client resumes21:18:49.606Z with private state retained and public state
verified unchanged. No protocol nonce, signature, command or validity window
is reset, and no transaction/proof is automatically retried. This passes the
operational retention-release test, not a node/indexer/ordinary-action restart.

cBg1CS从UTC21:02:39.228到21:20:52.977／1086.832秒，安全停止，观察runner退出1。
部署及其后12笔交易通过；账户21:15:33.385至21:18:38.291接受为184.906秒，provider13
164353.796507ms，精确交易如上。重启前采样154／错误0完成。控制器21:18:40.456确认
自有闲置证明器，RAM2997391360／swap5317849088bytes；同容器／镜像／限制在
21:18:48.951重启ready，降至RAM13496320／swap0。客户端21:18:49.606恢复，私有
状态保留、公开状态前后核验不变。不重置协议nonce／签名／命令／有效窗口，不自动
重试交易／证明。这通过运行层残留释放测试，不是节点／索引器／普通动作重启验收。

The cold slot provider starts21:18:51.003Z. Its19numeric samples reach
RAM4294967296bytes and swap5936447488bytes (5.529GiB), yet no proof completes
or slot transaction is accepted. At21:20:44.806Z /1079.224523215seconds the
guard stops at shared free swap482248KiB, below524288, while RAM1409216KiB
remains available.113.803seconds is interrupted-stage timing, not successful
latency, a timeout, or exact minimum storage. No OOM is observed. Retention is
avoidable but not the sole capacity problem; waiting alone cannot provide
missing backing storage under the current hard limits. Across460controller/
173prover samples, captured sampling errors0, RAM peak4295471104bytes and
swap max6056075264; client RAM/swap peaks806281216/1871585280. These peaks
need not coincide; the forced stop has no final post-reset sampler completion
event. A first cold-epoch filter incorrectly mixes UTC DateTime values and
local parsed dates and reports0; comparing DateTimeOffset correctly finds19,
without treating the diagnostic filter error as a real missing-sample failure.

冷槽位provider21:18:51.003开始，19项数值采样达到RAM4294967296／swap5936447488
bytes（5.529GiB），但无证明完成或槽位交易接受。21:20:44.806／1079.225秒，共享
空闲swap482248KiB低于524288触保护，RAM仍1409216KiB。113.803秒只是被中断阶段
时间，不是成功延迟、超时或精确最低存储。无观察到的OOM；残留可避免，却不是唯一
容量问题，当前硬限制下仅多等不能提供缺失后备存储。460控制器／173证明器采样，
捕获错误0，证明器RAM峰4295471104bytes／swap最大6056075264，客户端峰806281216／
1871585280；峰未必同时、强停后无最终采样完成事件。首次冷阶段筛选混用UTC
DateTime和本地解析日期而误报0，改DateTimeOffset后正确19，不将诊断筛选错误说成
真实采样缺失。

Owned client/container/swap cleanly stop/remove; original SwapTotal2097152KiB
and original prover/image remain. Report SHA
7d474b19d8125ecd37ade36d99fa069ff58398f7f15bf6d445b3c4f28c3cddb6;
exact-address-selected public log21-05-36.204Z SHA
ac42afeb156a149875e137bfbd252c1a6a2a9091b3eb2bfa77886bde54e596d8.
Initial sandbox public observation fails with redacted details; approved
wallet-free observations21:20:11.855Z during proving and21:21:27.315Z after
cleanup pass, confirming exact statefb14beacaeef3656f591251503353b8c0d11550cf2333a873be50db2c41fcfdd,
instance/status/credential nonce1 and slot sessions/nonces0. The original
failure cause is not captured. Requested one bounded16GiB shared-swap trial
(14GiB owned temporary + original2GiB), same5GiB combined physical RAM,
prover/client swap ceilings12/4GiB. No user approval is inferred from a
preselected UI option; no larger swap/profile is enabled or implemented yet.
No private request/witness/heap/verbose prover log is read.295root tests remain
passed; only docs change after that source check. No commit/push, M5/lockfile,
shared milestone Markdown/HTML, managed program/key or architecture change.
Actual slot, ordinary action/evidence/nullifier/receipt and complete restart/
privacy gates remain open, with no acceptance.json completion claim.

自有客户端／容器／swap清理，原SwapTotal2097152KiB及证明器／镜像保留。报告及
按精确地址选择的21-05-36.204Z公开日志SHA如上。首次sandbox公开读取脱敏失败；
批准后的无钱包读取21:20:11.855证明期间及21:21:27.315清理后通过，确认上述精确
状态、实例／凭证序号和凭证nonce1、槽位sessions／nonces0。未捕获原读取失败原因。
请求一次总共享swap16GiB（自有临时14＋原2）、合计物理RAM仍5GiB、证明器／客户端
swap上限12／4GiB的受限测试，不将UI预选项当成用户批准，尚未启用或实现较大配置。
不读私有请求／witness／heap／详细prover日志。根295仍通过，此后只改文档；未提交
推送、改M5／锁文件／共享milestone或HTML／生成程序密钥／架构，无完成acceptance.json
声明；实际槽位、普通动作／证据／nullifier／收据及完整重启／隐私仍待验收。

Final handoff checks: every M6 JSON parses, docs freshness and Git whitespace
checks exit0, index empty, protected shared milestone/HTML/M5/lockfile paths
unchanged. Instruction bridge/runtime logs/local manifest/binary are ignored.
HEAD remains f2d8689f95d9294a92f6b2e2b8718d31121dde81. Read-only Docker/readiness
verification finds only the five original services: prover/node/indexer/Hasura
healthy, Postgres running, original prover jobs processing/pending0 and capacity1.
No temporary prover remains. Resource-budget question awaits the user's choice.

最终交接检查：M6所有JSON解析、文档新鲜度和Git空白检查退出0，暂存区空，受保护
共享milestone／HTML／M5／锁文件未变；指令桥、运行日志、本地manifest／binary忽略。
HEAD仍f2d8689f95d9294a92f6b2e2b8718d31121dde81。只读Docker／ready核验只剩五个
原服务：证明器／节点／索引器／Hasura健康，Postgres运行，原证明器运行／排队0、
容量1；没有临时证明器。资源预算问题等待用户选择。

### 2026-10-15 — verify the successful experiment profile on actual transaction proving

The user asks why the finished experiment is not being reused, then explicitly
authorizes verification. Read the experiment source/report and compare actual
current key files: both slot prover/verifier hashes match the experiment
exactly, and the ten other keys already use the bounded builder. No key rebuild
or branch merge is required. However, experimental key generation uses
memory.high5GiB/max6GiB on the compiler, whereas the previous runtime profile
used prover max4GiB plus client max1GiB. Treating them as the same configuration
would be incorrect. This verification reproduces5/6GiB on the prover with1CPU,
Rayon1/server pool1 and the same8GiB shared swap, while retaining the client's
separate1GiB hard cap. Combined long-lived hard allowance7GiB is explicitly
reported, not mislabeled as5GiB or a whole-machine cap. The previous16GiB swap
proposal is not authorized by this request and remains disabled. Namespace
authority, exact hashes/programs/keys, ancestry, privacy and protocol deadlines
remain unchanged; this is operational profile verification, not adoption of
a different architecture or a memory-adaptive cryptographic algorithm.

用户询问为何不复用已完成实验，随后明确授权开始验证。读取实验源码／报告，实际
比较当前密钥文件：槽位prover／verifier哈希与实验完全一致，其余十组已用受限builder，
无需重建密钥或合并分支。但实验密钥生成给编译器memory.high5GiB／max6GiB，此前
运行时却证明器max4GiB加客户端max1GiB，两者不能视为相同配置。现验证在证明器
复现5／6GiB、1CPU／Rayon1／serverpool1、同共享总swap8GiB，客户端仍单独硬1GiB。
长期双方合计硬7GiB明确报告，不标成5GiB或整机上限。请求不授权此前16GiB提案，
仍关闭。命名空间权限、精确哈希／程序／密钥、祖先、隐私和协议期限不变；只是运行
配置验证，不是换架构或自适应密码算法。

Verified official Linux memory.high semantics and Docker cgroup controls.
Read-only inspection finds Docker cgroupfs/v2, original prover idle, no active
bounded lock, original2GiB swap, WSL Node22.23.2/npm10.9.8. The Docker host PID
is not visible in Ubuntu and the private cgroup mount is read-only; a disposable
capability-free/network-none/read-only-root helper first confirms the exact
original high file is readable without changing it. The new helper for actual
application is narrower: only the exact labeled/identified/pinned owned prover
with6GiB hard RAM/8GiB swap/1CPU may mount its own memory.high file writable.
Parent max/swap files are read-only and checked before writing the literal
5GiB value. No privileged flag, Docker socket, arbitrary target, broad writable
mount, global swappiness/WSL change or original service restart. Helper RAM is
bounded64MiB and reported separately; it runs before wallet startup and again
before resuming after the owned idle reset. The runner verifies actual high,
max and swap from inside the prover and reapplies after restart, rather than
substituting Docker's memory reservation. Defaults remain unchanged. Recovery
recognizes allowlisted flagged slot commands so transport interruption does
not leave a controller unidentified. Numeric sampling adds only high/max event
counts to distinguish reclaim pressure from hard-limit/OOM events.

核对Linux官方memory.high语义和Docker cgroup控制。只读发现Docker cgroupfs／v2、
原证明器闲置、无受限锁、原swap2GiB、WSL Node22.23.2／npm10.9.8。Docker宿主PID在
Ubuntu不可见、私有cgroup挂载只读；一次性无capability／无网络／根只读helper先
确认精确原high文件可读、不修改。实际应用helper更窄：只有精确label／身份／固定
镜像、自有证明器硬6GiB／swap8GiB／1CPU，才能将自身memory.high文件单独可写
挂载；父级max／swap只读且写前核验，只写固定5GiB。无privileged／Docker socket／
任意目标／大范围可写挂载／全局swappiness或WSL设置／原服务重启。helper64MiB
单列，在钱包前和自有闲置重启恢复前执行；运行器从证明器内核验实际high／max／swap，
重启后重新应用，不用Docker预留替代。默认配置不变，恢复工具识别allowlist槽位带
参数命令，防止传输中断后无法识别控制器；数值采样只新增high／max计数以区别回收
压力与硬上限／OOM事件。

18focused policy/sampler cases pass; controller/policy/recovery syntax and
strict typecheck pass. New cases cover explicit selection, duplicate/conflicting
flags, unchanged shared swap/defaults, exact combined accounting, foreign image/
container/label/unbounded targets, missing/misapplied high and numeric reclaim
events. First full check passes docs/types/Solidity build but stops at56/57
diagnostics: the unchanged missing-assets test's30second child deadline yields
status null rather than expected1. An isolated unchanged rerun passes2/2 in
19480.9363ms; no timeout extension or skip. A fresh full check is running.

18项定向策略／采样通过，控制器／策略／恢复语法及严格类型通过。新增覆盖明确选择、
重复冲突标志、共享swap／默认不变、精确合计、外来image／容器／label／无限制目标、
缺失／错误high及回收计数。首轮完整检查文档／类型／Solidity构建通过，但诊断56／57：
未变缺资产测试30秒子进程期限，status null而非预期1。原样单独重跑2／2通过、总
19480.9363ms，未提高期限或跳过；新完整检查运行中。

Authorized command `node scripts/run-m6-capped-live.mjs --run --slot-state
--reset-before-slot --experiment-reclaim` starts BmF0kQ. Exact public log
logs/m6-live-2026-10-15T06-09-33.033Z.jsonl is selected by deployed contract
cc5f845c3558476b0ecbc67afadc23e042482ea90726c0c9eef0985363179797,
not a guessed timestamp. Startup and initial governance transactions pass.
Independent native Docker reads show high5368709120/max6442450944/
swap.max8589934592bytes and cpu.max100000/100000; a preceding nested WSL shell
quoting error occurs before command execution, then native quoting succeeds.
No private witness, heap, signing secret or verbose server log is read. Exact
ongoing/results evidence is reclaim-runtime-verification.json. Slot, ordinary
actions, receipts and full M6 acceptance are not claimed. No commit/push,
experiment worktree edit, M5/lockfile/shared milestone Markdown/HTML change.

获批命令启动BmF0kQ；精确公开日志06-09-33.033Z按上述部署合约选取，不猜timestamp。
启动和初始治理交易通过，原生Docker独立读取high5368709120／max6442450944／swap.max
8589934592bytes、cpu.max100000／100000；先前嵌套WSL引号错误在执行前失败，改原生
引用成功。不读私有witness／heap／签名秘密／详细server日志。过程／结果证据见
reclaim-runtime-verification.json，不宣称槽位／普通动作／收据或M6完成。未提交推送、
编辑实验工作树、改M5／锁文件／共享milestone Markdown或HTML。

The unchanged full-check rerun exits0:299passed/0failed/0skipped,
57/6/15/14/16/50/135/6 by diagnostics/protocol/M2/M3/M4/M5/Midnight/Hardhat.
Midnight209131.42ms, Hardhat24970ms are regression durations, not proof latency.
Live provider job6 completes in241280.150801ms and its module-approval
transaction is indexed06:20:57.472Z. This confirms continuing real governance
work under the profile, not slot proving or complete M6 acceptance.

完整检查原样重跑退出0：299全通过、无失败跳过，按诊断／协议／M2／M3／M4／M5／
Midnight／Hardhat为57／6／15／14／16／50／135／6。Midnight209131.42／Hardhat24970ms
为回归耗时，不是证明延迟。真实provider任务6耗时241280.150801ms完成，模块批准
交易UTC06:20:57.472索引接受；只确认该配置真实治理任务继续，不是槽位证明／M6验收。

### 2026-10-15 — reclaim-profile result: active reclamation, shared RAM reserve reached

BmF0kQ starts at 06:06:59.447 UTC and completes cleanup at 06:30:23.497 UTC
(14:06–14:30 Asia/Shanghai). Controller monotonic duration is 1342.961332105
seconds, while the UTC span is 1404.05 seconds. Preserve the 61.088667895-second
clock-source discrepancy; do not turn the interrupted account interval into a
successful proof-latency measurement. Deployment and eleven subsequent
transactions through allocation are accepted. Allocation proof-provider job 12
takes 89901.70003199996 ms; transaction
00832ea2ac070529bcb045184f03bba8eecda847efea5fb0ad0a6518407a2cd556
is indexed at 06:29:22.200 UTC. Account proof-provider job 13 begins at
06:29:22.819 UTC and does not complete. No account transaction is accepted;
the owned idle reset and first slot proof are never reached in this trial.

BmF0kQ从UTC06:06:59.447运行至06:30:23.497清理完成（上海14:06–14:30）。控制器
单调时间1342.961332105秒，UTC跨度1404.05秒，相差61.088667895秒，保留时钟差异，
不把账户中断区间称作成功证明延迟。部署及随后十一笔到分配交易接受；分配provider
任务12耗时89901.70003199996ms，上述精确交易UTC06:29:22.200索引接受。账户任务13
06:29:22.819开始但未完成，没有账户交易接受，自有闲置重启和首槽位证明都未到达。

At 06:30:09.118 UTC / 1329.950849735 monotonic seconds, shared MemAvailable is
389256 KiB, below the unchanged 393216 KiB reserve; SwapFree is still 7075780
KiB. The controller stops for `shared-machine-emergency-reserve`, not swap
exhaustion, a captured HTTP timeout or a cryptographic rejection. There are
561 controller and 233 prover samples, no captured sampling errors, but no
final sampler-completion event after forced interruption. Maximum captured
soft-reclaim events are 779, hard-limit and OOM events zero, and the container
is not OOM-killed. Prover reported memory peak is 5369212928 bytes, a small
overshoot of the 5 GiB soft target but below the verified 6 GiB hard cap;
maximum sampled prover swap is 207622144 bytes. Client reported RAM/swap peaks
are 806260736/819232768 bytes. Independent maxima need not coincide and do not
establish a proof's minimum hardware. The mechanism is genuinely active, but
its fixed 5 GiB target does not preserve enough shared-host headroom in this
run. The compiler-only experiment has no equivalent private caller overhead.

UTC06:30:09.118／单调1329.950849735秒，共享MemAvailable389256KiB低于未变保留
393216KiB，SwapFree仍7075780KiB。控制器因shared-machine-emergency-reserve停止，
不是swap耗尽、已捕获HTTP超时或密码拒绝。561控制器／233证明器采样，无捕获错误，
强停后无最终采样完成事件。最大软回收事件779，硬上限／OOM均0，容器未OOM-kill。
证明器报告RAM峰5369212928bytes，略超5GiB软目标但低于核验的6GiB硬限制；swap最大
采样207622144bytes。客户端RAM／swap峰806260736／819232768bytes，独立最大值
未必同时、不代表证明最低硬件。机制真实生效，但固定5GiB目标未给这次共享运行留下
足够余量；单编译器实验没有对应的私有调用端开销。

Owned client/container/temporary swap cleanly stop/remove, preserving original
SwapTotal 2097152 KiB and the original prover/image. Independent wallet-free
public observation at 06:31:15.959 UTC confirms exact allocation and state
a50fbcb882b06bf8f0e4ebf4ba87915f7b4d1847ff3109fd12136453dc5c35eb,
instance/status sequences zero, credential/slot nonces zero and no staging.
Report SHA-256 is 868090844b8dbfadeab5656e5a3e4ceaa418b496f64dd351fa04dcb1a8116c75;
exact-address-selected public log SHA-256 is
43e1f42ab61480843ffe226d4cfecfd894ca134879a0cbcf65979f7a54adb19e.
All five original services remain: prover/node/indexer/Hasura healthy,
Postgres running; original prover processing/pending jobs zero, capacity one.
Read-only post-cleanup Docker memory figures are prover 7.59 MiB, Postgres
33.12 MiB, Hasura 106.6 MiB, indexer 158.4 MiB, node 713.6 MiB. These are
post-cleanup container figures, not simultaneous peaks or complete swap/OS
accounting. No shared service is stopped or reconfigured for this run.

自有客户端／容器／临时swap正常清理，保留原SwapTotal2097152KiB及原证明器／镜像。
UTC06:31:15.959无钱包独立公开观察确认精确分配及上述状态，实例／凭证序号0，
凭证／槽位nonce0，无暂存。精确报告／按地址选择的公开日志SHA如上。五个原服务
仍在：证明器／节点／索引器／Hasura健康，Postgres运行；原证明器任务／排队0、容量1。
清理后只读Docker内存为证明器7.59MiB、Postgres33.12、Hasura106.6、索引器158.4、
节点713.6MiB；不是同时峰值或完整swap／OS核算，本轮未停止或重配共享服务。

Conclusion: exact experimental keys and reclamation controls can be reused,
and the controls are now verified on actual transaction proving. The complete
runtime workflow has not passed. The next operational correction is to choose
or lower the soft threshold using the client/services/reserve budget within
the existing hard and swap ceilings. That dynamic budget controller is not
implemented by this verification, and a memory-adaptive cryptographic algorithm
is not claimed. Do not automatically raise RAM/swap, weaken safety, shorten
ancestry, change proof semantics or infer production feasibility. Exact evidence
is reclaim-runtime-verification.json. Full unchanged regressions remain 299
passed, no failures/skips; first diagnostic deadline failure and isolated/full
successful retries remain recorded. Two documentation patch attempts fail on
incorrect context and make no changes; corrected exact-context patches apply.
No new commit/push, dependency/toolchain/key rebuild, experiment edit, M5 or
shared milestone Markdown/HTML change. M6 and its ordinary-action/receipt,
full slot/privacy/restart gates remain incomplete.

结论：精确实验密钥和回收控制可复用，控制已在真实交易证明中核验，但完整运行流程
没通过。下一项操作修正是在既有硬／swap上限内，按客户端／服务／保留预算选择或
降低软阈值；此次未实现动态预算控制器，也不宣称密码算法自适应。不可自动扩大RAM／
swap、弱化保护、缩短祖先、改证明语义或推断生产可行。精确证据见独立JSON。完整
原样回归仍299全通过、无失败跳过，首诊断期限失败及单独／完整成功重跑仍记录。
两次文档补丁因上下文不正确安全失败、未改文件，按精确上下文更正成功。未新增提交
推送、改依赖／工具链／重建密钥、编辑实验／M5／共享milestone Markdown或HTML；
M6及普通动作／收据、完整槽位／隐私／重启仍未完成。

### 2026-10-15 — identical retry after the user frees processes

The user reports closing some processes and explicitly requests a retry.
Read-only WSL preflight reports total RAM 7831 MiB, available 6182 MiB,
original swap 2097152 KiB with 488956 KiB used. All five original services
are healthy or running, the original prover remains on the same exact image
and four-CPU quota, and no bounded lock is active. No additional process is
killed or shared service restarted by the agent. Retry E3i5Hf uses the exact
same command, code, keys, proof programs, soft5/hard6 GiB prover, capped1 GiB
client, shared8 GiB swap, one CPU/Rayon/server worker, finite deadlines and
RAM/swap safety guards. Startup verifies a combined long-lived hard allowance
of 7516192768 bytes and total swap 8388604 KiB. The existing 299-test source
check remains applicable because no source changes are made. This is a real
fresh workflow retry, not a relabeling of the interrupted BmF0kQ result or a
claim that the freed processes guarantee completion. Exact retry evidence is
added separately in reclaim-runtime-verification.json; prior hashes/results
remain unchanged. No dynamic threshold, 16 GiB swap, architecture alternative,
new commit/push, experiment worktree, M5 or shared milestone change.

用户表示已关闭一些进程并明确要求重试。只读WSL检查总RAM7831MiB、可用6182MiB，
原swap2097152KiB、已用488956KiB；五个原服务健康或运行，原证明器同精确镜像及
四CPU额度、无受限锁。agent没有另杀进程或重启共享服务。新E3i5Hf保持同命令／源码／
密钥／证明程序：证明器软5／硬6GiB、客户端硬1GiB、共享总swap8GiB、单CPU／Rayon／
server线程、有限期限及RAM／swap保护。启动核验长期合计硬7516192768bytes、总swap
8388604KiB。未改源码，既有299项检查仍适用。这是真实新流程重试，不重标旧BmF0kQ
中断结果，也不保证关闭进程必能完成。独立retry证据加入JSON，旧哈希／结果保留。
不加入动态阈值、16GiB swap或替代架构，未新增提交推送、改实验／M5／共享milestone。

### 2026-10-15 — retry accepts the account, then cold slot reaches the swap reserve

E3i5Hf starts 07:15:42.871 UTC and completes cleanup at 07:47:33.552 UTC
(15:15–15:47 Asia/Shanghai). Controller monotonic duration is 1823.251328902
seconds versus UTC span 1910.681 seconds; preserve the 87.429671098-second
clock-source difference rather than mixing it into successful latency. The
report's pre-start available RAM is 6284428 KiB, original swap free 1608200
KiB. Its first controller sample has 6251484 KiB available versus the previous
run's 6136784 KiB, about 112 MiB more; no controlled attribution to a particular
closed process is possible. Same source, keys, hard/soft caps, one worker,
shared swap and safety checks remain in force. No additional services/processes
are stopped by the agent. No source change requires repeating the existing
299-pass root suite; only evidence and documentation change in this retry turn.

E3i5Hf从UTC07:15:42.871至07:47:33.552清理完成（上海15:15–15:47）。控制器单调
1823.251328902秒，UTC跨度1910.681秒，相差87.429671098秒，保留时钟差异、不混入
成功延迟。报告初始可用RAM6284428KiB、原空闲swap1608200KiB。首次控制器采样可用
6251484KiB，相比前轮6136784KiB约多112MiB，不能对特定关闭进程作受控因果归因。
同源码／密钥／硬软限制／单线程／共享swap／保护不变；agent未另停服务／进程。
本轮仅证据／文档变化，无源码变化需重跑既有299项全通过检查。

Deployment and twelve post-deployment transactions pass. Account provider job
13 runs for 427301.1549200001 ms and transaction
0017a9a0466244685b7431baa70c886f77bd1641e2013b1a6a8b1e5e5e5facc1b8
is indexed at 07:42:03.927 UTC. Call-to-index UTC span is 473.607 seconds,
separate from monotonic provider time, neither an ordinary-action benchmark nor
pure cryptographic time. Pre-reset sampling completes 274 samples/error zero.
At 07:42:06.331 UTC the verified owned idle prover has RAM 4189417472 bytes /
swap 3820376064 bytes. Same-container restart finishes at 07:42:14.776 UTC
with RAM 13733888 bytes/swap zero. The literal 5 GiB high threshold is reapplied
through the same narrowly scoped helper, parent limits remain max, and high/
hard/swap/CPU and public state are checked again. Private maps/state remain in
the caller; no proof/transaction is automatically retried. Client resumes at
07:42:15.456 UTC and the first cold-slot provider job 14 begins at 07:42:16.529.

部署及其后十二笔交易通过，账户provider13为427301.1549200001ms，上述精确交易
UTC07:42:03.927索引接受。调用至索引UTC跨度473.607秒与provider单调时间分开，均非
普通动作基准或纯密码运算时间。重启前274采样／错误0完成。07:42:06.331核验自有
闲置证明器RAM4189417472／swap3820376064bytes；同容器重启07:42:14.776完成，
RAM13733888／swap0。同窄范围helper重新写5GiB high，上级限制仍max，重新核验
high／硬RAM／swap／CPU及公开状态；私有maps／state在调用端，不自动重试证明／交易。
客户端07:42:15.456恢复，首冷槽位provider14在07:42:16.529开始。

At 07:47:19.186 UTC / 1808.885373124 monotonic seconds, shared SwapFree is
431008 KiB, below the unchanged 524288 KiB guard. RAM 432588 KiB is above its
393216 KiB reserve, unlike the original RAM stop. The cold slot has no proof
completion or accepted transaction; its UTC provider-to-stop span 302.657
seconds is interrupted timing, not successful latency or captured HTTP timeout.
No hard-limit/OOM event or container OOM kill is observed. There are 800 controller
and 327 prover samples (274 pre-reset, 53 cold), no captured sampling errors,
but no final post-reset sampler-completion event after the forced stop.
Pre-reset/cold soft-reclaim counts are 26763/13672. Prover RAM peak across
epochs is 5369700352 bytes, cold peak 5369487360, maximum sampled swap
5811027968. Client RAM/swap reported peaks are 806129664/1964085248. Min shared
available/free swap are 400156/431008 KiB. Peaks need not coincide, a soft
threshold can be slightly exceeded, and none of this establishes minimum
hardware, throughput, P95 or ordinary-customer proof performance.

UTC07:47:19.186／单调1808.885373124秒，共享空闲swap431008KiB低于原保护524288，
RAM432588KiB仍高于保留393216，与原RAM停止不同。冷槽位无证明完成或接受交易，
provider至停止UTC跨度302.657秒仅为中断时间，不是成功延迟或已捕获HTTP超时。
无观察到的硬上限／OOM事件或容器OOM-kill。800控制器／327证明器采样（重启前274／
冷阶段53）无捕获错误，但强停后无最终采样完成事件。前／冷软回收计数26763／13672，
跨阶段证明器RAM峰5369700352bytes、冷峰5369487360，swap最大采样5811027968；
客户端RAM／swap峰806129664／1964085248，最小共享RAM／空闲swap400156／431008KiB。
峰未必同时，软阈值可略超；不确定最低硬件、吞吐、P95或普通客户证明性能。

Own client/container/temporary swap stop/remove cleanly; original SwapTotal
2097152 KiB and original prover/image remain. All five original services are
healthy or running, original prover processing/pending jobs zero, capacity one.
Independent wallet-free public observation at 07:49:12.882 UTC confirms exact
state e558553d25454d1afb419d2e907e70ad142705e9c0dedccbf513ba6b80e79a02,
instance/status sequences 1, consumed credential nonce 1, slot nonce/session 0.
The public log is selected by exact deployed address, not guessed timestamp.
Report SHA-256: be013f9f8b35eacb2f9b19814c7d6c99992cdb51e5d4dd2b311b5cd982c025d5;
public log SHA-256: 6dcea1cf81327dea6203ea141ce2d6ebdfdac6ea189413baff941d65ba55a1d0.
Retry evidence is separate from the preserved original BmF0kQ result. This retry
gets beyond that RAM stop but still cannot finish the cold slot within finite
shared backing storage. No limit is increased or safety weakened to force a
pass. No commit/push, experiment/source/keys/toolchain/M5/lockfile/shared
milestone Markdown/HTML change. M6 and ordinary-action/receipt/full slot/privacy/
restart acceptance remain incomplete; no completed acceptance.json is created.

自有客户端／容器／临时swap正常清理，原SwapTotal2097152KiB及证明器／镜像保留。
五个原服务健康或运行，原证明器任务／排队0、容量1。UTC07:49:12.882无钱包独立
公开读取确认上述精确状态、实例／凭证序号1、凭证nonce1、槽位nonce／session0。
公开日志按精确部署地址选择、不猜timestamp；报告及日志SHA如上。重试证据与原
BmF0kQ结果分开保留。本轮越过原RAM停止，但有限共享后备存储内仍未完成冷槽位；
未扩大限制或弱化保护强行通过。未提交推送、改实验／源码／密钥／工具链／M5／锁
文件／共享milestone Markdown或HTML。M6及普通动作／收据／完整槽位／隐私／重启仍
未验收，不创建完成acceptance.json。

### 2026-10-15 — move the interrupted proof verification to isolated ECS infrastructure

The user authorizes continuing the interrupted M6 test on the configured
temporary ECS server. Read-only Workbench diagnostics verify Ubuntu 26.04,
x86_64, four CPUs, 16384 MiB configured RAM, approximately 14.6 GiB available
RAM and 34.6 GiB available disk. No swap exists initially. npm, GitHub and
public container-registry HTTPS probes time out; the existing signed Ubuntu
APT mirror over Alibaba's internal network and internal OSS endpoint respond.
No public IP, bandwidth, security-group or IAM change is made. Install only
docker.io 29.1.3-0ubuntu4.1 and its containerd/runc dependencies from that mirror;
Docker reports server 29.1.3, systemd driver and cgroup v2.

用户授权将中断的M6测试移至已配置的临时ECS。只读Workbench检查确认Ubuntu26.04、
x86_64、四CPU、配置RAM16384MiB、约14.6GiB可用RAM和34.6GiB可用磁盘，初始无swap。
npm、GitHub及公开容器仓库HTTPS超时，现有签名Ubuntu内网APT源及内网OSS可达。
未修改公网IP、带宽、安全组或IAM。仅从现有源安装docker.io29.1.3-0ubuntu4.1及其
containerd/runc依赖，Docker报告29.1.3、systemd驱动和cgroupv2。

Use the new isolated remote directory `/opt/permio-m6-20261015`, not a shared
milestone checkout. The source snapshot contains 205 allowlisted files from
baseline f2d8689f95d9294a92f6b2e2b8718d31121dde81 plus the current uncommitted
changes; store the tracked binary diff separately and inventory every file by
size/SHA-256. The server verifies all 205 files against this manifest. Private
instructions, environment files, local wallet state, logs and credentials are
excluded. Remote source archive SHA-256 is
a4094f5b58f5345bb6968e9d8fd6ce0f401f7a159493ca06c5ef2c0f2f98d28d.

使用新的隔离目录/opt/permio-m6-20261015，不共享其他里程碑工作目录。源码快照含上述
基线及当前未提交修改的205个白名单文件，另存已跟踪修改的二进制diff，并逐文件记录
大小及SHA-256；服务器全部核验通过。排除私有指令、环境文件、本地钱包状态、日志及
凭据。远程源码包SHA-256如上，不将旧HEAD冒充当前未提交源码。

The image bundle SHA-256 is
c8aeb52bb6ae81ab87ce1ba4d846d1083afa4fe9a2647a8dbaa83f6b138feab5;
it contains only node 1.0.0 (image ede01da35e982b6a4b85461ad8492ae2753ef14246fba33c8039b782aa8e39fb),
indexer 4.3.3 (03afd079b00bcd229df29a24771439c5e7695c339cd89216d0763ce40731cc4b),
and the already-tested weak-cache prover 8.1.0
(82f867abc556806f3742fb165b9cba8c898045a71e99bba8a8b33b37237bb1c9).
All are loaded after archive integrity verification; no local container volumes
or chain state are transferred. Node 22.23.2/npm 10.9.8 are installed from the
existing Linux runtime archive, not upgraded. Public k19/k20 parameter archive
SHA-256 is 5b76f6cb0ffb3cf8877f4e09bb781010ee8137f21787758e6f7d8f367dac40c0.

镜像包仅含上述精确node、indexer及已测试的weak-cache证明器，传输后核验包哈希并加载；
未传本地容器卷或链状态。Node22.23.2/npm10.9.8从既有Linux运行环境包安装，不升级。
公开k19/k20参数包哈希如上。依赖包因上轮中断不完整，检查明确失败，未上传使用；
正在另建新包，不覆盖或误标旧包成功。

Portability is limited to the test harness: allowlist Docker's cgroupfs and
systemd v2 leaf paths, retaining exact owned container ID/image/name/label,
private cgroup namespace, fixed 5/6 GiB soft/hard prover profile, one worker,
single writable memory.high file, read-only parent limit checks and all existing
RAM/swap/deadline guards. Reject unknown drivers, path injection and foreign
cgroup parents. Focused tests pass 12/12 and strict typecheck/syntax pass.
The diagnostic suite reports 58/59: the unchanged missing-assets subprocess
hits its existing 30000 ms timeout (exit status null rather than expected 1).
This is not a passing full regression; no timeout is enlarged or test skipped.
The shared generated-document freshness check passes without regenerating HTML.

兼容性改动仅限测试控制器：白名单支持cgroupfs及systemdv2目录，保留精确自有容器身份、
私有cgroup命名空间、固定证明器软5/硬6GiB及单线程、唯一可写memory.high、只读父级
限制核验和原RAM/swap/期限保护；拒绝未知驱动、路径注入及外来父级。定向12/12通过，
严格类型及语法通过。诊断58/59，原缺失产物子进程触及既有30000ms期限，返回null而非
预期1，不能宣称完整回归通过；未延长期限或跳过。文档新鲜度检查通过，未重新生成HTML。

Lifecycle permission now succeeds. The API returns minute-precision timestamps
(for example 12:21Z rather than 12:21:00Z), so compare parsed UTC instants instead
of treating string formatting as failed persistence. The latest verified saved
deadline is 2026-10-15 20:40 Asia/Shanghai. The independent renewal watchdog is
still NOT implemented. No large cloud proof has started. Account-helper upload
was blocked by approval review because its code derives the public disposable
local-node genesis mint key; request explicit user approval of that payload and
destination rather than bypassing review. Existing wallets/seeds are not uploaded.
M6 remains incomplete; infrastructure setup is not chain acceptance.

生命周期权限现已成功。API返回分钟精度时间，按解析后的UTC时刻比较，不把字符串格式
差异误判为未保存。最近核实的释放时间为上海2026-10-15 20:40；独立续期看门狗仍未实现。
尚未启动大型云端证明。充值辅助程序派生公开临时本地链的创世铸币密钥，上传被审批拦截，
已请求用户明确批准载荷和目标，未绕过审批，也未上传既有钱包或种子。M6仍未完成，
环境准备不等于链上验收。

Cloud setup follow-up: the initial internal-only Docker network prevents the
published loopback RPC from responding even though node health inside the
container passes. Attach the same owned node to a standard task-owned bridge;
the existing 127.0.0.1:9944 endpoint then passes health and returns block-one
hash f0ef216727fc955928b174c4acedcb9e56ad014709d1e3b97eb414c18aae2839.
No node restart, public binding or cloud networking change is required. Start
the pinned indexer on this bridge with only the official disposable dev defaults
and 127.0.0.1:8088 binding. The prover's first startup exits 1, OOM false,
because startup also requires public k10-k18 parameters and public dust/zswap
program artifacts, not just the contract's k19/k20. Inspect only sanitized
error-marker counts/cache paths, then inventory the existing public prover
cache. The extra WSL-root parameter archive attempt fails because k11/k12 are
absent there; do not use that incomplete archive. Package the complete existing
prover cache instead (SHA-256
eb4d36b4cae19965afbd872495129e9c6c2b15f4b0d36dd476c04629e3cea352).

云端后续：初始internal-only Docker网络使已发布的回环RPC不可达，但容器内节点健康。
将同一自有节点连接到普通任务专属bridge后，原127.0.0.1:9944健康及第一块哈希读取通过；
不需重启节点、公开端口或修改云网络。固定版本indexer按公开临时开发默认配置启动，
仅绑定127.0.0.1:8088。证明器首次启动exit1、无OOM，因为还需公开k10-k18及dust/zswap
程序产物，而非仅k19/k20。仅检查脱敏错误计数和缓存路径，再清点已有公开证明器缓存。
WSL-root补充包因缺k11/k12失败，未使用不完整包；改为打包现有完整公开证明器缓存，
哈希如上。不得将启动失败解释为证明算法或合约验证失败。

The native Compact public-artifact archive (780904972 bytes, SHA-256
d3b2cba70a7614748ce14e71416a06a2f9429eed417052b05916d08e6720b715)
passes a complete tar listing; transfer is separate from the still-blocked
account helper. The previously failing unchanged diagnostic passes 2/2 in
isolation (9711.2341/8170.6042 ms); the entire unchanged diagnostic suite then
passes 59/59, zero failures/skips, 20779.1028 ms. Preserve both the initial
timeout and successful reruns. No complete root suite or cloud proof acceptance
is claimed by these infrastructure checks.

原生Compact公开产物包780904972bytes、上述SHA，通过完整tar列表校验，独立于仍被
拦截的账户辅助程序传输。原失败诊断单独2/2通过（9711.2341/8170.6042ms），随后完整
原样诊断59/59通过、无失败跳过、20779.1028ms；同时保留初次超时与成功重跑记录。
这些环境检查不代表完整根检查或云端证明验收。

Dependency transfer initially fails approval review pending payload inspection.
Inspect all 52,530 regular files, finding public dependency-bundled SSH signing
key fixtures and generic AGENTS templates. Do not upload that archive. Exclude
121 development-only fixture/instruction/document paths, retain runtime PEM
parser code (header literals, not key bodies), reject actual embedded PEM key
bodies and inventory the remaining 52,411 files by size/SHA-256. The reviewed
157932337-byte archive has SHA-256
3dd0150245b6ebb73d6a3de753204b0ce8c6e3e05d387c5421fe85a47c1b6b28.
The reviewed upload is approved, completes and passes the server hash check.
Recreate known @permio workspace links from package manifests only. The server
then verifies every real Compact program/prover/verifier/binding hash through
verifyPermioAuthorizationAssets and passes all 12 focused resource-policy tests
(85.276757 ms, zero failures/skips). This verifies cloud runtime preparation,
not an actual systemd helper invocation or a proof. The genesis funding helper
remains unuploaded pending explicit approval. Full source and public inputs
remain available locally; no results exist solely on the disposable server.

依赖传输首次因待审查载荷被审批拒绝。检查52530个普通文件，发现公开依赖自带SSH
签名测试密钥及通用AGENTS模板，未上传原包；排除121个开发测试／指令／文档路径，
保留运行时PEM解析代码（仅头部字面量，非密钥正文），拒绝真正嵌入的PEM密钥正文，
对剩余52411文件逐个记录大小及SHA。审查后157932337bytes包哈希如上，重新审批成功、
传输完成且云端哈希通过。仅从package清单重建已知@permio链接。随后云端通过
verifyPermioAuthorizationAssets核验全部真实Compact程序／prover／verifier／绑定
哈希，资源策略测试12/12通过（85.276757ms，无失败跳过）。这只验证运行环境，不代表
实际systemd限制helper调用或证明通过。创世充值辅助程序仍未上传，等待明确批准。
源码及公开输入完整保留本地，没有结果仅存临时服务器。

### 2026-10-15 — preserve ECS and distinguish saved Preprod wallets from M6 acceptance

The user explicitly asks not to delete the server shortly before the saved
20:40 Asia/Shanghai release deadline. Cancel automatic release with
ModifyInstanceAutoReleaseTime without AutoReleaseTime; readback verifies the
field is empty and the exact instance remains Running. No files are deleted,
no server is stopped, and no subsequent automatic renewal/release is authorized
by this entry. Ongoing billing is disclosed. This supersedes the earlier
20:40 deadline observation; the independent watchdog remains unimplemented.

用户在原上海20:40释放期限前明确要求不要删除服务器。通过不传AutoReleaseTime的
ModifyInstanceAutoReleaseTime取消自动释放，读回确认字段为空且精确实例仍Running。
未删除文件或停止服务器，已说明继续计费；此条不授权随后自动续期或释放，并替代此前
20:40期限观察。独立看门狗仍未实现。

Correct the conversation's network conflation using current source and saved
metadata. Information Flow's Alice/account-0, Bob/account-1 and Clara/account-2
Blockfrost checkpoints all retain shielded.json, unshielded.json and dust.json.
Their saved progress reports all three components complete at respectively
2026-10-11 04:17:03, 01:33:17 and 01:37:24 Asia/Shanghai (rounded to seconds).
These are historical saved completion observations, not a fresh balance query,
current synchronization proof or verified cloud restore. Source
information-flow/src/midnight-wallet.ts restores all three components with the
SDK restore methods before synchronizing; source preprod-actor-wallets.ts binds
them to Preprod, the same HD account index and Blockfrost endpoint profile.
Only file metadata and whitelisted numeric/status progress fields are read;
wallet payloads, mnemonic, seeds and provider credentials are not printed or
uploaded. Preserving these compatible checkpoints can avoid a genesis rescan;
catch-up and compatibility still require actual verification.

依据当前源码及保存元数据纠正对话中的网络混淆。Information Flow的Alice/account-0、
Bob/account-1和Clara/account-2各Blockfrost目录均保留shielded、unshielded、dust
三份状态。保存进度分别在上海2026-10-11 04:17:03、01:33:17、01:37:24显示三项完成。
这只是历史保存状态，不是本轮余额查询、当前同步或云端恢复验证。现有钱包源码在同步前
通过SDK restore恢复三组件；actor配置绑定Preprod、同HD账户序号和Blockfrost配置。
仅读取文件元数据及白名单数字／状态字段，未输出或上传钱包载荷、助记词、种子或服务凭据。
兼容检查点可避免从创世重扫，但增量追赶及兼容性仍需实际核验。

The interrupted Permio M6 test is a different workload: local-runtime.ts fixes
networkId/walletNetworkId to undeployed and endpoints to localhost 9944/8088.
DETERMINISTIC_MILESTONES.md explicitly names pinned Local Dev as the mandatory
M6 acceptance target; Preprod accounts are an optional adapter reuse path, not
a substitute for this gate. The new cloud local network therefore reproduces
the actual interrupted test; it was not a requirement imposed by cloud proving.
The previous explanation suggesting an immediate switch to Preprod omitted
this project constraint. Do not silently switch networks, weaken acceptance,
reuse Local Dev transaction evidence as Preprod evidence, or upload secret
checkpoints. A Preprod adapter is separate additional scope requiring an
explicit user decision and verified toolchain/network compatibility. No
network switch or wallet migration is performed during this inspection.

中断的Permio M6测试是另一项任务：local-runtime.ts固定网络为undeployed、端点为
localhost9944/8088。DETERMINISTIC_MILESTONES明确固定Local Dev是M6强制验收目标，
Preprod账户是可选适配器复用途径，不能替代此门槛。因此云端新本地网络是在复现实际
中断测试，并非云端证明必需。此前表示可立即切换Preprod的解释遗漏项目约束。不得
擅自切换网络、降低验收、把Local Dev证据当作Preprod证据或上传私密检查点。Preprod
适配器属于独立新增范围，须明确用户决策及工具链／网络兼容性验证。本轮未迁移钱包
或切换网络。

### 2026-10-15 — approved Preprod-primary acceptance and read-only readiness audit

The user challenges the Local-Dev-exclusive milestone requirement, then
explicitly approves Preprod-primary deployment/end-to-end acceptance with
targeted Local Dev infrastructure-failure tests. Amend only M6's English and
Chinese network/artifact/acceptance/exit-gate clauses; preserve every security,
privacy, replay, conflict, state, receipt and negative-test requirement. Add a
controlled owned-node/indexer recovery gate rather than claiming authority to
restart shared Preprod infrastructure. Do not rerun every costly proof on both
networks without a named additional property. Historical Local Dev evidence
remains unchanged. The current contract and local harness are NOT already a
Preprod implementation. Exact amended plan: preprod-acceptance-plan-v1.md.

用户质疑仅Local Dev里程碑要求后，明确批准Preprod主验收及定向Local Dev基础设施故障
测试。仅修订M6中英文网络／产物／验收／退出条款，保留全部安全、隐私、重放、冲突、状态、
收据及负向要求。增加可控自有节点／indexer恢复门槛，不声称可重启共享Preprod设施。
没有明确新增待验性质不重复两网全部昂贵证明。历史Local Dev证据不改，现有合约和本地
控制器也不冒充已完成Preprod实现。精确计划见上述文件。

Official support-matrix inspection confirms compiler0.31.1/runtime0.16.0,
Midnight.js/testkit4.1.1 and WalletSDK1.2.0 match our pinned core, but lists
node1.0.400, Preprod indexer4.3.302 and proof-server8.1.3. Release overview says
ledger8.1.2. No version upgrade is made. The first web click uses an unresolved
URL reference and safely fails; repeat with the returned reference succeeds.
Read-only Workbench probes at 13:06:49 UTC resolve all four tested hostnames,
but HTTPS returns HTTP000/curl28 for both retired Midnight endpoints and both
current Blockfrost hosts. No credentials, wallet state or transaction are sent
to ECS and no public bandwidth/NAT/proxy/security/IAM setting is changed.

官方矩阵确认核心版本一致，但列node1.0.400、Preprod indexer4.3.302和证明器8.1.3，
发布概述列ledger8.1.2；未升级任何版本。首次网页click引用未解析URL安全失败，改用
返回引用后成功。UTC13:06:49 Workbench只读检查四主机DNS成功，但两个已退役Midnight
端点及两个当前Blockfrost主机HTTPS均HTTP000/curl28。未向ECS传凭据、钱包状态或交易，
未改公网带宽／NAT／代理／安全／IAM配置。

Native local RPC diagnostics reuse only the existing Blockfrost project token
with its exact intended provider; no wallet is loaded and no token/URL/error
body is logged. The first attempt cannot resolve dotenv from Information Flow's
native installation and fails before a request; resolve it from existing Permio
dependencies without installing anything, then rerun. All four authenticated
HTTP calls pass: system_version=2.1.0-00000000000, runtime spec1000300 /
transactionVersion3, midnight_ledgerVersion=8.1.1, GraphQL block2991973/errors0.
Do not equate system_version with a verified node binary or replace observed
ledger8.1.1 with docs8.1.2. No WS, restored wallet, actual proof, deployment or
receipt acceptance is established. Older weak-cache prover8.1.0 compatibility
remains unverified; no silent8.1.3 replacement or patch port is authorized.
The approved next step is blocked on ECS public egress; report that bounded
network decision instead of uploading wallets or bypassing the provider.

本机原生RPC仅向精确Blockfrost服务使用既有项目token，不加载钱包、不记录token／带凭据
URL／错误正文。首次从Information Flow原生依赖解析dotenv失败、请求未发出；改从既有
Permio依赖解析后原样重测，不安装任何内容。四项认证HTTP均通过，精确版本及区块如上。
不把system_version当作已验证节点二进制，不以文档8.1.2覆盖实测8.1.1。尚未验证WS、
钱包恢复、真实证明、部署或收据。旧weak-cache8.1.0兼容性待验，未擅自替换8.1.3或移植
补丁。下一步受ECS公网出站阻塞，应报告明确网络决策，不上传钱包或绕过服务。

### 2026-10-15 — Singapore replacement clears basic Preprod reachability

The user's updated private guide authorizes Singapore instance
i-t4nh8178mxb1ogfbqzip, ap-southeast-1. Read the current Workbench skill and
canonical instructions, then use only that exact target for read-only checks.
At 15:08:16 UTC (23:08:16 Shanghai), x86_64/four CPUs have15745388544 bytes
available RAM,37275873280 bytes available root disk and no swap. Node/npm/Docker
are absent. No source, credentials or wallets are uploaded; nothing is installed.

用户更新私有指南，授权新加坡i-t4nh8178mxb1ogfbqzip、ap-southeast-1。读取当前技能及
规范后仅对该精确目标只读检查。UTC15:08:16／上海23:08:16，x86_64四CPU，可用RAM
15745388544bytes、根盘37275873280bytes，无swap；尚无Node/npm/Docker。未上传源码、
凭据或钱包，也未安装内容。

Both Blockfrost DNS names resolve. RPC/indexer HTTPS returns403/curl0 in
1.046953/1.002613seconds; unauthenticated HTTP1.1 WebSocket-upgrade probes also
return403/curl0. Separate urllib checks report only a boolean authentication
marker (true for both), withholding raw bodies. GitHub/npm return200 and Docker
Hub/v2 returns401. This clears the basic HTTPS reachability blocker, not
authenticated RPC, WS subscription, downloads or proof acceptance. Preserve the
historical Hangzhou timeouts separately. Region and public egress changed
together; do not claim a proven geographic-filtering cause. A new fixed-target
read-only DescribeInstances helper confirms Singapore Running and an empty
AutoReleaseTime; no deadline is changed. Old Hangzhou is not contacted, released
or modified. No unattended test starts. Next readiness work remains pinned
toolchain installation and authenticated transport within secret-transfer rules.

两个Blockfrost DNS成功，RPC/indexer HTTPS分别1.046953／1.002613秒返回403／curl0；
未认证HTTP1.1 WebSocket-upgrade也403／curl0。另用urllib仅报告是否含认证标记，两者
true，不输出响应正文。GitHub/npm200，DockerHub/v2为401。基础HTTPS可达阻塞解除，
不代表认证RPC、WS订阅、下载或证明接受。杭州超时单独保留；区域及公网出站同时改变，
不宣称证实地域过滤原因。新增固定目标只读DescribeInstances确认新加坡Running且释放
时间为空，未修改期限；未联系、释放或更改杭州主机。未启动无人值守测试。下一步仍须在
秘密传输规则内准备固定工具链和认证传输。一次文档补丁因尾部上下文不匹配安全失败、未改
任何文件，读取精确尾部后重新应用成功；不把环境可达记录为M6完成。

### 2026-10-15 — Retry the simulator-only membership gap on Singapore

Identify the historical 35-leaf status-membership diagnostic separately from
the current slot workflow, whose earlier real-proof run stopped at its swap
safety guard rather than substituting a mock. Pin the historical program SHA-256
6d1a58afebf6c221f560f07bc66570feba74b917e029f81e27f42777c314d8ab:
k20,705943 rows. This diagnostic cannot establish current eleven-circuit
deployment, ordinary-action acceptance or M6 completion.

将历史35叶状态成员诊断与当前槽位流程区分：后者此前真实证明运行停于swap安全阈值，
不是用mock替代。固定历史程序SHA-256如上，k20、705943行。此诊断不能证明当前十一电路
合约部署、普通用户操作验收或M6完成。

Install pinned Ubuntu docker.io29.1.3-0ubuntu4.1 without system upgrades;
pull stock proof-server8.1.0 and verify image digest recorded in
singapore-membership-retry-verification.json. Download Node22.23.2 and verify
against its official SHASUMS256.txt; npm10.9.8 works. The initial combined
public-input archive upload exits1; do not count it as transferred. Smaller
compiler, program and harness uploads succeed and their hashes match. Download
the public k20 parameters directly on Singapore and verify SHA-256. No wallets,
secrets or private instructions are transferred; no prover container starts.

安装固定Ubuntu docker.io29.1.3-0ubuntu4.1，未升级系统；拉取原版proof-server8.1.0并
校验摘要，记录于独立JSON。下载Node22.23.2并对照官方SHASUMS256.txt校验，npm10.9.8
可运行。首次公开输入合并包上传exit1，不算传输成功；较小的编译器、程序和脚本分别上传
成功且摘要一致。服务器直接下载公开k20参数并校验。未传钱包、秘密或私有指令，未启动
证明器容器。

Run scripts/cloud-m6-membership-keygen.py --run in an owned systemd unit:
memory.high10GiB, memory.max12GiB, swap0, one Rayon worker, CPUQuota100%,
RuntimeMaxSec3600. At15:30:25–15:31:23 UTC it exits1 after58.012seconds,
memory peak757460992 bytes and zero high/max/OOM/OOM-kill events. Compiler
error: missing HOME/XDG_CACHE_HOME/MIDNIGHT_PP. This is an environment failure,
not evidence of insufficient RAM. Keep the original output directory intact.
The corrected harness explicitly sets HOME=/root and XDG_CACHE_HOME=/root/.cache,
and offers --retry-home using a separate unit and output-home directory.
This12GiB capacity diagnostic is not a successful6GiB low-memory experiment.

独立systemd服务运行上述命令：软阈值10GiB、硬上限12GiB、swap0、一个Rayon线程、
CPUQuota100%、最长3600秒。UTC15:30:25至15:31:23，58.012秒后exit1，峰值757460992
字节，high/max/OOM/OOM-kill计数均为零。编译器报HOME/XDG_CACHE_HOME/MIDNIGHT_PP
缺失，因此是环境失败，不能说内存不足。原输出目录保留；修正脚本明确设置HOME与缓存，
以--retry-home选择单独服务及output-home目录。12GiB容量诊断不是6GiB低内存成功证据。

Add scripts/run-m6-membership-proof.ts: --prepare-only validates all three
historical asset hashes, synthesizes35 leaves, rejects stale sequence and
altered leaf, then serializes63843 bytes of proof preimage without writing or
logging it. Native preparation and strict typecheck pass. --prove is Linux-only,
requires real matching keys, calls real provider check/prove and records a
proof digest. Proof.deserialize is format validation, not independent
cryptographic verification; the report leaves chain and milestone claims false.
The prove mode has NOT run. Corrected Python harness self-tests pass5/5.

新增隔离证明脚本：--prepare-only核对三个历史资产摘要，构造35叶，拒绝过期序号和被改
叶子，将证明输入序列化为63843字节但不落盘或输出内容。本机准备及严格类型检查通过。
--prove仅允许Linux，要求匹配的真实密钥，调用真实证明服务check/prove并记录证明摘要。
Proof.deserialize只是格式检查，不是独立密码学验证；链上和里程碑标记仍为false。
尚未执行prove模式；修正Python脚本自测5/5通过。

Before retry, verify the new remote destinations absent and renew Singapore's
cloud release deadline to2026-10-16 01:36 Asia/Shanghai, reading it back.
The corrected-harness upload is then NOT EXECUTED: automatic approval review
reports usage exhaustion and cannot run. This is review unavailability, not
a remote failure or safety determination; do not bypass or retry equivalent
escalations. The full remote resource log has not been downloaded; the first
report was retrieved through Workbench and its fields preserved in the new
JSON evidence. Remote retry, real proving and completion-grace rescheduling
remain pending restored approval access. No commit or push is performed.

重试前确认新路径不存在，并将新加坡云端自动释放期限延至上海时间2026-10-16 01:36，
回读验证。随后修正脚本上传未执行：自动审批报告额度耗尽，无法进行审核。这是审核不可用，
不是远程失败或安全否决；不绕过、不重复等价提权。完整远程资源日志尚未下载；首次报告已
通过Workbench读取，字段保存至新增JSON证据。远程重试、真实证明及完成后30分钟释放
期限设置仍待审批恢复。未提交、未推送。

### 2026-10-15–16 — Approval restored; real keys built; cold proof capacity measured

After the user confirms restored approval access, verify Singapore Running,
about14GiB available/no swap and34GiB free disk. Renew the finite release
deadline to2026-10-16 01:48 Shanghai and read it back. Upload the corrected
harness to its previously absent path; verify SHA-256 and five remote self-tests.
Start the separate --retry-home unit with the original10/12GiB high/max,
zero swap, one Rayon worker and3600-second runtime bound. The build runs
15:49:05.792653–15:56:54.092890 UTC, exits0 in468.300259seconds, peaks at
9577701376 bytes (8.92GiB), and records zero high/max/OOM/OOM-kill events.
The305131774-byte proving key hashes to54bddf376206b2489ea3d5024032190ba524cb9fb1737e939400b683cd5eab64;
the2119-byte verifying key hashes toc44717d12a3111088477210769666a799b18cca83e3de2313b478424623a0553.
This replaces missing-key evidence for this exact historical diagnostic only.

用户确认审批恢复后，核对新加坡Running、约14GiB可用RAM、无swap及34GiB磁盘余量。
将有限释放期限延至上海时间2026-10-16 01:48并回读。修正脚本上传新路径，校验摘要及
远程五项自测。独立--retry-home服务沿用10/12GiB软／硬上限、零swap、一个Rayon线程、
3600秒时限。UTC15:49:05.792653至15:56:54.092890，468.300259秒后exit0，峰值
9577701376字节（8.92GiB），high/max/OOM/OOM-kill均零。真实证明／验证密钥大小及
摘要如上；这仅补上该精确历史诊断缺少真实密钥的证据。

Transfer the reviewed public source/dependencies and the three explicitly
selected diagnostic client/binary/binding files; verify all archive hashes.
Extract with Python tarfile's data filter into a new client directory and
create only workspace links named by package manifests. Initial preparation
uses the wrong cwd and fails before proof work; the unchanged command from
client/ passes the35-leaf preparation and both negative cases. A sandbox WSL
packaging attempt returns E_ACCESSDENIED; native tar packages the same three
public files instead. This is packaging, not a change to cryptography or gates.

传输已审查的公开源码／依赖及明确选定的三个诊断客户端／二进制／绑定文件，核对全部
归档摘要。用Python tarfile的data过滤器解包至新client目录，仅按包清单建立工作区链接。
第一次准备命令cwd错误，证明工作尚未开始便失败；切换client目录后，不改命令逻辑即通过
35叶准备及两个反例。沙箱WSL打包曾返回E_ACCESSDENIED，改用原生tar打包同三个公开
文件；这是打包方式变化，不改变密码学或验收门槛。

Install the inspected public prover cache, verify its archive hash and start
the exact stock8.1.0 image by digest, one worker/job, Rayon1, timeout600seconds,
--no-fetch-params and loopback127.0.0.1:6300 only. HTTP readiness and real
provider /check pass. Do not equate /check with proof generation. The first
Node client has1GiB high/1.5GiB max, no swap and900-second runtime. It stalls
at6413 soft-reclaim events while preparing the305MB-key payload. Setting
high equal to its unchanged1.5GiB hard limit removes reclaim throttling, but
the client then hits that hard limit and is OOM-killed before prover work.

安装已审查的公开证明器缓存并核对摘要，按摘要启动原版8.1.0镜像：一个工作线程／任务、
Rayon1、600秒任务时限、--no-fetch-params，仅监听127.0.0.1:6300。HTTP就绪和真实
服务/check通过，但不把/check当作证明生成。首个Node客户端软阈值1GiB、硬上限1.5GiB、
无swap、最长900秒，在准备305MB密钥对应请求时出现6413次软回收并停滞。将软阈值设为
原硬上限解除节流，但客户端随后达到该硬上限被OOM终止，证明器尚未开始证明工作。

Rebalance the capacity budget to3GiB client/10GiB prover (13GiB combined,
less than the initial13.5GiB). The client peaks2335608832 bytes and delivers
the request; the prover is OOM-killed, exit137 at16:07:05.158048095 UTC.
Preserve the exited container and client report. A new isolated container
and client use11.5/2.5GiB respectively (14GiB combined), zero swap, unchanged
600/900-second bounds and exact same keys/inputs. This final stock retry
also OOM-kills the prover at16:13:35.774109001 UTC; the client exits at
00:13:41 Shanghai. The last persisted sample,32.73seconds earlier, records
12093014016-byte prover peak and1601700KiB host available. Those are not
final peak/event counters: Docker removes its cgroup on exit. Docker's final
OOMKilled=true/exit137 establishes the failure. No proof is generated.

先将容量预算重分配为客户端3GiB／证明器10GiB，合计13GiB，低于初始13.5GiB。客户端
峰值2335608832字节并成功发送请求；证明器在UTC16:07:05.158048095被OOM终止，
exit137。保留退出容器与客户端报告。最后一次原版重试使用新独立容器和客户端，分别
11.5／2.5GiB，合计14GiB，仍无swap，时限仍为600／900秒，密钥及输入完全一致。
证明器仍在UTC16:13:35.774109001被OOM终止；客户端于上海00:13:41退出。之前32.73秒
的最后落盘采样为证明器峰值12093014016字节、主机可用1601700KiB；Docker退出后删除
cgroup，因此不能伪称这些是最终峰值／事件计数。最终OOMKilled=true／exit137确认失败。
没有生成真实证明。

Inspect the already-approved weak-cache patch rather than claim it cures
this failure. The patch drops cache ownership between completed requests,
but active proofs still own their decoded key; this isolated cold request
has no earlier completed proving keys to evict. It does not establish a lower
single-proof peak. Do not transfer/retest that image on this basis, silently
increase RAM, add server swap, change circuits or weaken acceptance. A bounded
disk-backed paging experiment needs an explicit operational decision first.
These historical705943-row measurements are not performance results for
the current staged eleven-circuit M6 contract or an ordinary user action.

实际检查已批准的弱缓存补丁，不声称它能消除此失败。该补丁释放已完成请求之间的缓存
所有权，但正在证明的任务仍持有解码密钥；这个隔离冷请求没有前序已完成证明密钥可驱逐，
不能据此认定单次峰值下降。因此没有为此传输／重试弱缓存镜像，也没有擅自增加RAM、
添加服务器swap、改电路或降低验收。若进行有界磁盘换页实验，须先取得明确操作决策。
历史705943行诊断的测量不能冒充当前分阶段十一电路M6合约或普通用户操作的性能。

The302906024-byte public proving-key evidence archive download exits1 with
a mismatching partial digest; rename the local artifact .partial and never
count it as complete. Its low transfer rate prompted an optional-cache
retention question. Preserve all necessary small reports, full compiler/resource
logs, client events, harnesses and the verifying key in a17120-byte bundle:
SHA-2567b55e388cf2107e050417a08ff4af21dbf880950027d55102379e354afee4a2a.
Download succeeds; verify its digest, extract19 files locally and separately
match the verifying-key hash. The public compiler/program/SRS remain local
for regeneration; the large historical proving key is not preserved locally.

302906024字节的公开证明密钥归档下载exit1，本地残片摘要不匹配，重命名.partial，
不计为完成；因传输慢已询问是否保留这个可再生缓存。全部必要小型报告、完整编译／资源
日志、客户端事件、脚本及验证密钥汇入17120字节归档，摘要如上；下载成功并核对摘要，
本地解包19文件，另行匹配验证密钥摘要。本地仍有公开编译器／程序／SRS可重建，但未完整
保存大型历史证明密钥。

Local checks: all59 diagnostics, typecheck and docs freshness pass. The first
full root check hits misleading Hardhat HHE22: a focused filesystem diagnostic
finds EPERM resolving the locally installed package, not an absent Hardhat.
Normal approved filesystem access fixes compilation without reinstalling or
patching dependencies. That full run later encounters Windows UNKNOWN/read
while loading slot-assignments.test.ts (123 other Midnight cases pass); its
unchanged isolated rerun passes12/12, and six Hardhat tests separately pass.
The complete unchanged root rerun subsequently passes: npm run check exits0,
301 cases pass, zero fail/skip, including135 Midnight cases and six Hardhat
cases, plus docs/typecheck/Solidity build. No commit/push or private-data transfer.

本地59项诊断、类型及文档检查通过。第一次完整根检查出现误导性的Hardhat HHE22；
针对文件系统诊断发现本地包路径解析被EPERM拒绝，并非未安装Hardhat。批准正常文件
访问后编译通过，未重装或修改依赖。该次完整运行随后在加载slot-assignments.test.ts时
遇到Windows UNKNOWN/read，其余123项Midnight案例通过；该文件不改代码单独重跑12/12，
六项Hardhat测试另跑全部通过。随后完整不改代码的npm run check重跑exit0：301案例通过，
零失败／跳过，含135项Midnight及六项Hardhat，同时通过文档／类型／Solidity构建。
未提交、推送或传输私有数据。

After all cloud jobs finish, verify zero running Permio services/containers.
Apply the user's completion grace policy and read back the Singapore release
deadline2026-10-16 00:49 Asia/Shanghai for i-t4nh8178mxb1ogfbqzip.
Necessary small evidence is local and verified; the optional large historical
proving key is not. A future authorized task must extend this deadline before
starting. No swap configuration or alternative architecture has been adopted.
An evidence-update patch initially fails on out-of-order context hunks without
changing files; read the exact lines and apply the ordered patch successfully.

所有云端任务结束后，核对无运行中的Permio服务／容器。按用户完成宽限政策设置并回读
新加坡i-t4nh8178mxb1ogfbqzip释放期限：上海时间2026-10-16 00:49。必要小型证据已在
本地并校验；可选的大型历史证明密钥尚未完整保存。后续授权任务必须先延长期限再启动。
未添加swap或采用替代架构。一次证据更新补丁因上下文块顺序错误失败、未更改文件，
读取精确行后按顺序成功应用。

### 2026-10-16 — Approved paging follow-up blocked by unavailable instance

The user approves temporary bounded disk-backed swap. Before contacting the
host or changing configuration, attempt to extend the exact Singapore target's
release deadline. The helper fails its instance-presence assertion before any
mutation. Improve only the private local metadata helper to explicitly report
an empty DescribeInstances result; do not change credentials or instance target.
The read-only recheck at01:18:51.158900 Shanghai returns zero instances for
i-t4nh8178mxb1ogfbqzip in ap-southeast-1. This is after its verified00:49
automatic-release deadline and is consistent with release; no deletion-event
API was queried, so do not claim its exact deletion time. No deadline extension,
swap configuration, new proof run, host replacement or paid-resource creation
occurs. Existing small evidence/verifying key and public rebuild inputs remain
local. The305MB historical proving key was not downloaded completely and would
need regeneration on a replacement host. Ask for the replacement target or
separate authorization to create paid resources; swap approval alone does not
authorize creating an instance. No architecture or milestone exit gate changes.

用户批准临时有界磁盘换页。连接主机或改配置前，先尝试延长精确新加坡实例的释放期限；
辅助脚本在任何写操作前因实例存在性断言失败。仅改本地私有元数据脚本，使其明确报告
DescribeInstances返回空；未改凭据或实例目标。上海时间01:18:51.158900只读复查，
ap-southeast-1中的i-t4nh8178mxb1ogfbqzip返回零实例，已过此前验证的00:49自动释放
期限，与已释放一致；未查询删除事件API，不能声称精确删除时刻。没有延长期限、添加swap、
启动新证明、替换主机或创建付费资源。小型证据／验证密钥及公开重建输入仍在本地；305MB
历史证明密钥未完整下载，须在替代主机重建。需要用户提供替代目标，或另行授权创建付费
资源；仅批准swap不等于允许新建实例。未改变架构或里程碑验收门槛。

### 2026-10-16 — Recreated host prepared under preservation/stop policy

The updated guide authorizes i-t4ni11rkjyzgi0vlb68d in Singapore and replaces
deletion with one-hour-delayed economical stopping. Use only the new exact
target; never run the old deletion helpers. A new private local API helper
forbids supplying AutoReleaseTime and permits StopInstance only as
DryRun=true/ForceStop=false/StoppedMode=StopCharging. DescribeInstances verifies
Running, PostPaid, VPC,4vCPUs/16GiB and an empty deletion deadline twice.
Read-only Workbench access works. The new root filesystem is25GiB, not the
old host's40GiB; initially21GiB is free. Local systemd timers show only standard
OS timers, which cannot establish absence of cloud-side OOS schedules.

更新指南授权新加坡i-t4ni11rkjyzgi0vlb68d，并将删除政策改为完成后一小时节省停机。
仅使用该新目标，不运行旧删除脚本。新增本地私有API脚本禁止传入AutoReleaseTime，
StopInstance仅允许DryRun=true／ForceStop=false／StoppedMode=StopCharging。
DescribeInstances两次确认Running、按量付费、VPC、四vCPU／16GiB，删除期限为空。
Workbench只读连接成功。新根文件系统25GiB，而非旧主机40GiB，初始21GiB可用；本地
systemd只见标准系统定时器，但不能据此断言没有云端OOS任务。

The lifecycle gap is concrete: DescribeDisks returns Forbidden.RAM;
StopInstance with DryRun=true separately returns Forbidden.RAM;
OOS ListExecutions returns User.NoPermission. Public GetTemplate succeeds
for ACS-ECS-ScheduleToStopInstances v11, hash34da62bbf793aefadf888b4bf04dba6b5e87c976575f677ad574fd13a8317be8,
but its returned stop action does not explicitly supply StoppedMode. Do not
execute it as an unverified economical-stop fallback. No schedule is created,
no actual stop/start/delete is executed, and no IAM permission/role is broadened.
Ask the user for narrowly scoped lifecycle/OOS grants or a manual economical
stop direction. Explicitly report that automatic economical stop is NOT
configured and the running instance continues billing. Long tests do not start.

生命周期权限缺口有实测：DescribeDisks返回Forbidden.RAM，单独执行DryRun=true的
StopInstance也Forbidden.RAM，OOS ListExecutions为User.NoPermission。公开
GetTemplate可以读取ACS-ECS-ScheduleToStopInstances v11，摘要如上，但返回的停机动作
没有明确传StoppedMode，因此不将其当作已验证的节省停机替代。未创建定时任务，未实际
停机／启动／删除，未扩大IAM权限或角色。已询问用户更新精确作用域的生命周期／OOS权限，
或指示手动节省停机；明确告知自动节省停机尚未配置，运行实例继续计费。未启动长测试。

Attended bounded preparation verifies GitHub/npm/Node-checksum/SRS HTTPS200,
Docker registry401, then actually downloads the exact8.1.0 image by its
existing pinned digest and k20 SRS by hash. Install Node22.23.2 after official
SHASUMS256 verification (npm10.9.8) and Ubuntu docker.io29.1.3-0ubuntu4.1
from the existing signed mirror, without system upgrades. Docker reports
cgroupv2/systemd. No prover container is started. Three public compiler/program/
harness uploads succeed with matching hashes. The next source.tar.gz upload
exits1 and a remote read-back confirms the file absent; the transfer loop stops,
so do not claim later dependency/cache/client uploads succeeded.

有界、有人监控的准备阶段验证GitHub／npm／Node校验表／SRS的HTTPS为200，Docker
registry为401；随后实际按既有摘要下载精确8.1.0镜像，按摘要下载k20 SRS。Node22.23.2
核对官方SHASUMS256后安装，npm10.9.8；从既有签名镜像安装Ubuntu
docker.io29.1.3-0ubuntu4.1，未升级系统。Docker为cgroupv2／systemd，未启动证明器容器。
公开编译器／程序／脚本三个上传成功并匹配摘要；下一个source.tar.gz上传exit1，远程
复查文件不存在。循环停止，因此后续依赖／缓存／客户端包不能宣称已上传。

The previously approved temporary swap is created only at the verified new
/var/lib/permio-m6/swapfile:8GiB file,0600 under0700 parent,8GiB-minus4096
usable bytes. No fstab/sysctl configuration is changed. Discover original
vm.swappiness=0, so availability of swap alone is not proof of effective paging.
With no workload started and all swap free, safely swapoff that exact file
while lifecycle permissions remain unresolved; preserve it for reuse. At
19:53:41.113384 UTC record MemTotal15947092KiB, MemAvailable15200756KiB,
SwapTotal=SwapFree8388604KiB immediately before swapoff. Download the small
readiness report and verify SHA-256f7651bdadc59eaf20a1473397602bf3021d6fbec359da25f10e12963f1f18bc8.
Installed tools, public inputs, private unused swap file, instance and disks
remain intact. No keys, wallet state or private instructions are uploaded.

仅在已核对的新路径/var/lib/permio-m6/swapfile创建此前批准的临时swap：文件8GiB，
权限0600、父目录0700，可用量为8GiB减4096字节。未改fstab／sysctl，发现原始
vm.swappiness=0，因此不能仅凭存在swap声称换页有效。任务尚未启动且swap全空，权限
问题未解决时对该精确文件安全swapoff，并保留文件供复用。UTC19:53:41.113384停用前
内存及swap数值如上。小型就绪报告已下载并核对摘要。工具、公开输入、未使用的私有
swap文件、实例及磁盘均保留。未上传密钥、钱包状态或私有指南。

Prepare an explicit --prove-paging mode locally: only this historical
diagnostic's HTTP wait becomes1800000ms; normal mode stays600000ms and no
protocol deadline changes. A future successful run saves proof bytes
exclusively before its report, without mislabeling deserialization as independent
verification. Failures use the existing redacted classifier. Typecheck and
five key-harness self-tests pass. Native prepare-only subsequently exits0:
35 leaves, two negatives and63843-byte preimage, with no proof generated or
private preimage persisted. Eleven focused policy/failure-classifier tests,
documentation freshness, JSON parsing and whitespace checks pass. No full
root rerun is claimed this turn. The proof/paging mode is not executed. No
milestone/shared HTML is edited and no commit or push is performed.

本地准备显式--prove-paging模式，仅将该历史诊断HTTP等待改为1800000ms；普通模式
仍600000ms，不改协议时限。未来成功运行时以排他方式保存证明字节再写报告，不把
反序列化冒充独立验证；失败使用已有脱敏分类器。类型检查及密钥脚本五项自测通过；本机
prepare-only随后exit0，35叶、两个反例通过、输入63843字节，未生成证明或保存私有输入。
另有十一项针对策略／失败分类器测试、文档时效、JSON解析及空白检查通过；本轮不宣称
重跑完整根测试。证明／换页模式未执行。未改里程碑或共享HTML，未提交或推送。

### 2026-10-16 — Stop permission restored; disk/OOS grants still missing

After the user says done, recheck the same current instance. Deletion deadline
remains empty and economical StopInstance DryRun now returns DryRunOperation:
that permission is fixed, without an actual stop. DescribeDisks still returns
Forbidden.RAM and OOS ListExecutions still returns User.NoPermission. Inspect
only the root disk's sysfs model/serial: Alibaba Cloud Elastic Block Storage,
serial t4ni11rkjyzgi0vihyyu. Official serial mapping identifies disk
d-t4ni11rkjyzgi0vihyyu; even a DescribeDisks query restricted to that exact
DiskIds/InstanceId remains denied. Do not infer all permissions succeeded
from the restored stop permission or repeat an instance-wide listing.

用户回复done后重新核对当前实例：删除期限仍为空，节省停机DryRun现返回
DryRunOperation，说明停机权限已修复，但没有实际停机。DescribeDisks仍Forbidden.RAM，
OOS ListExecutions仍User.NoPermission。仅从sysfs读取根盘型号及序列号：Alibaba Cloud
Elastic Block Storage，t4ni11rkjyzgi0vihyyu。按官方序列号映射得到上述磁盘ID；改用
精确DiskIds及InstanceId查询仍被拒绝。不能因停机权限恢复就推断全部权限可用，也未
反复执行实例范围的磁盘列表。

Verify official action resource types: DescribeDisks uses disk ARNs, while
ListExecutions uses OOS execution ARNs, not ECS instance ARNs. This explains
why putting either grant only on an instance ARN would not work; the actual
IAM policies were not inspected, so do not claim that is the proven cause.
Read only the non-secret main account ID with STS GetCallerIdentity and
prepare a private local permission addendum for the exact disk and Singapore
executions (List/Get/Start/Cancel), not a FullAccess policy. Do not apply it,
create a role, grant PassRole broadly or upload any credentials. A trigger-based
OOS schedule requires a stable role; ask for the intended existing execution
role name. No schedule or long test starts; automatic economical stop remains
unconfigured and the instance is still running/billable. Existing prepared
tools, inputs, inactive private swap file, instance and disks are preserved.

核对官方授权资源类型：DescribeDisks使用磁盘ARN，ListExecutions使用OOS执行ARN，
不是ECS实例ARN。若仅给实例ARN授权，这两项不会生效；未读取实际IAM策略，因此不把
此条件解释说成已证实原因。仅用STS GetCallerIdentity读取非秘密的主账号ID，在本地
私有目录准备精确磁盘及新加坡执行的List／Get／Start／Cancel补充策略，不使用FullAccess。
未应用策略、创建角色、宽泛授予PassRole或上传凭据。含触发器的OOS任务需要稳定角色，
须确认用户选择的既有执行角色名。未创建定时任务或启动长测试；自动节省停机仍未配置，
实例继续运行计费。既有工具、输入、未启用的私有swap文件、实例和磁盘均保留。

References checked:
https://www.alibabacloud.com/help/en/ecs/developer-reference/api-ecs-2014-05-26-describedisks
https://help.aliyun.com/en/oos/developer-reference/api-oos-2019-06-01-listexecutions
https://help.aliyun.com/en/oos/user-guide/ramrole
https://help.aliyun.com/en/ecs/user-guide/query-the-serial-number-of-a-disk

### 2026-10-16 — Caller permissions recovered; default OOS role missing

After the next user permission update, exact-disk DescribeDisks succeeds and
reports cloud_essd for d-t4ni11rkjyzgi0vihyyu. StopInstance with
DryRun=true/ForceStop=false/StoppedMode=StopCharging returns DryRunOperation;
OOS ListExecutions succeeds with zero executions before the schedule probe.
DescribeInstances still reports Running/PostPaid/VPC and an empty automatic
deletion deadline. These are current-host observations, not reused old-host
results. No actual stop, start, release or disk deletion is performed.

用户再次更新权限后，精确磁盘DescribeDisks成功，d-t4ni11rkjyzgi0vihyyu为cloud_essd。
StopInstance以DryRun=true／ForceStop=false／StoppedMode=StopCharging返回
DryRunOperation；OOS ListExecutions成功，探测前返回零个任务。实例仍Running／按量付费／
VPC，自动删除期限为空。均为当前主机观测，非旧主机结果；未实际停机、启动、释放或删盘。

Prepare a one-time OOS probe four hours ahead, with intended immediate
cancellation, rather than stopping the active build. Its inline workflow
checks PostPaid/VPC, calls graceful StopCharging, waits for Stopped, then
checks the actual StoppedMode. The first StartExecution request incorrectly
uses Content and returns InvalidParameter. Verify the official API and fix
only the private local helper to use TemplateContent. The user then chooses
the default role, OOSServiceRole. The corrected request returns
AssumeRoleNotExist. No successful schedule is created or cancellation path
verified. Ask the user to create that role or name an existing role; do not
create roles, attach policies or grant PassRole automatically. Correct the
private unapplied permission proposal's nonexistent oos:GetExecution action
to oos:GetExecutionTemplate. No cloud IAM policy is changed.

准备四小时后的单次OOS探测，原定创建后立即取消，不停正在构建的任务。内联流程检查
按量付费／VPC、优雅StopCharging、等待Stopped，再核对实际StoppedMode。首个
StartExecution请求误用Content，返回InvalidParameter；核对官方API后，仅改本地
私有脚本为TemplateContent。用户选择默认OOSServiceRole后，正确请求返回
AssumeRoleNotExist。未成功创建定时任务，也未验证取消路径。请用户创建角色或提供
已有角色名，不自行创建角色、附加策略或授予PassRole。另将未应用的私有权限建议中
不存在的oos:GetExecution改为oos:GetExecutionTemplate，未更改云端IAM。

The attended, independently bounded real key build has already started as
permio-m6-membership-keygen.service: python3 cloud-m6-membership-keygen.py
--run, 10/12 GiB soft/hard RAM, zero swap, CPUQuota=100%, Rayon1, TasksMax128,
RuntimeMaxSec3600, Restart=no. The last read-back shows active/running and
MemoryPeak9577881600 bytes. Its final report is not retrieved; do not infer
successful completion merely from the old host's similar peak or elapsed
time. A later read-only remote inspection is not executed: automatic approval
review reports a usage limit and a retry time of05:14 Shanghai. This is a
review-service failure, not evidence that the command is unsafe or that ECS
permissions regressed. Do not retry equivalent remote commands or bypass
approval while the reported window is unresolved. No new proof job starts.

此前已启动有人监控、独立限额的真实密钥构建服务，命令与参数如上：软／硬内存10／12GiB，
零swap、单vCPU配额、Rayon1、进程数128、最长3600秒、无自动重启。最后读回为
active／running，峰值9577881600字节；尚未取得最终报告，不能因峰值或耗时接近旧主机
就推断成功。随后只读远程检查未被执行：自动审批检查提示额度限制，上海时间05:14可重试。
这是审批服务未完成检查，不等于命令不安全，也不是ECS权限再次失败。在此限制未解除时
不反复执行等价远程命令或绕过审批，未启动新证明任务。

### 2026-10-16 — Public client staged; bounded paging runner prepared locally

Retry the previously absent source upload, then transfer reviewed dependencies,
public parameter cache, the original three-file diagnostic bundle and the
updated client under a separate filename. All five transfers exit0 and remote
SHA-256 matches: source a4094f5b58f5345bb6968e9d8fd6ce0f401f7a159493ca06c5ef2c0f2f98d28d;
dependencies3dd0150245b6ebb73d6a3de753204b0ce8c6e3e05d387c5421fe85a47c1b6b28;
cache eb4d36b4cae19965afbd872495129e9c6c2b15f4b0d36dd476c04629e3cea352;
three-file bundle8092902ee582cba7bd1bd7ac2602fb881280433eedb12e3456c562ebbeaf1220;
updated client89355f2fc825cde6d3c1bf492ad604bdbaf1818025db354a7ef3afd3d4522224.
Extract source207 members, reviewed dependencies57091 members and diagnostic
bundle3 files with data filtering into a new client directory; validate paths,
types and destination absence. Recreate only @permio workspace symlinks from
package manifests. Extract the public cache separately. Preserve the original
client and copy the updated client as run-m6-membership-proof-paging.ts. The
source archive is the earlier uncommitted snapshot, not all later local docs
or the newly prepared paging controller. No private instructions, wallets,
secrets or production inputs are transferred.

重试此前不存在的源码上传，再传已审查依赖、公开参数缓存、原三个诊断文件及独立命名的
新版客户端。五次传输均exit0，远程SHA-256全部匹配上列摘要。源码207项、依赖57091项、
诊断包3文件使用data过滤器解至新client目录，检查路径、类型及目标不存在；仅按包清单
重建@permio链接，缓存另解压。保留旧客户端，新版名为run-m6-membership-proof-paging.ts。
源码包是较早未提交快照，不包含后续全部文档或新换页控制器。未传私有指南、钱包、秘密或
生产输入。

Two isolated, no-network, 256 MiB help-only container invocations reveal an
invocation mistake: bare IMAGE --help reaches bash and returns an invalid
option message, not the proof server's CLI. No proof starts. Future execution
must inspect the pinned image configuration and invoke its real binary via
an explicit entrypoint before claiming CLI flags/readiness are verified.
The last filesystem check is25 GiB total,13 GiB used,11 GiB available.

两个无网络、256MiB的独立帮助探测暴露调用错误：直接IMAGE --help进入bash并返回参数
错误，没有检查证明器CLI，也没有启动证明。后续必须核对固定镜像配置，显式入口调用真实
二进制，之后才能声称参数／就绪已验证。最后文件系统检查为总25GiB、已用13GiB、可用11GiB。

While remote approval is unavailable, implement only the prepared diagnostic
controller scripts/cloud-m6-membership-paging.py and its runbook. This is the
already approved disk-paging experiment, not an alternative application
architecture. Keep the comparison's11.5 GiB prover/2.5 GiB client hard caps,
add8 GiB prover swap and10 GiB actual memory.high; controller512 MiB/no swap.
Use the existing exact8 GiB private swap file, temporary swappiness60 with
restoration to original0, no fstab/persistent sysctl changes. Require actual
leaf/ancestor cgroup limits, empty competing swap/containers,14 GiB available
RAM and2 GiB free disk at startup. Retain2-second numeric samples and guards:
2000seconds,384 MiB host reserve,128 MiB free swap, owned container exit/OOM,
or interruption. Only the diagnostic job/HTTP wait becomes1800seconds;
normal proving and protocol deadlines are unchanged.

远程审批不可用期间，仅实现已准备的诊断控制器及运行文档。这是此前批准的磁盘换页
实验，不替换应用架构。保持证明器11.5GiB／客户端2.5GiB硬上限，增加证明器8GiB swap，
实际memory.high为10GiB；控制器512MiB、无swap。复用精确私有8GiB文件，临时
swappiness60、恢复原0，不改fstab或持久sysctl。启动需核对实际cgroup／父级上限、
没有竞争swap／容器、14GiB可用内存及2GiB空闲磁盘。每两秒采数值指标；2000秒、主机
384MiB余量、空闲swap128MiB、容器退出／OOM或中断触发停止。仅此诊断任务／HTTP
等待改为1800秒，普通证明及协议时限不改。

Cleanup is independent per owned client/prover/sysctl step, so a Docker stop
failure cannot skip swappiness restoration. Disable only the exact swap file
when memory headroom is safe and owned-job cleanup has succeeded; otherwise
report the cleanup gap, without forced swapoff. Preserve file, stopped
container, keys, sources and disks; do not export arbitrary raw prover logs.
Success requires an actual successful client report plus matching saved proof
length/hash, while independent verification/transaction/milestone flags remain
false. The first local policy test encounters sandbox TEMP access denial;
move only its synthetic temporary artifacts into ignored checkout logs and
rerun. Seven tests pass, including normal paging, all stop guards, missing or
duplicate counters, unapplied/ancestor limits and proof/hash/result mismatches.
The key-build harness's five self-tests also pass. The paging controller has
not been uploaded or run on Linux; actual cgroup enforcement, proof success
and cleanup remain unverified.

清理分别处理自有客户端／证明器／sysctl，避免Docker停止失败跳过参数恢复。仅当自有
任务清理成功、内存余量安全才停用精确swap文件，否则报告清理缺口，不强制swapoff。
保留文件、已停容器、密钥、源码及磁盘，不导出任意原始证明器日志。成功需真实客户端
成功报告及保存证明长度／摘要匹配，独立验证／交易／里程碑标志仍为false。首次本地
策略测试遇沙箱TEMP权限问题，仅把合成临时文件移至源码忽略的logs后重跑；七项通过，
涵盖正常换页、全部停止条件、缺失／重复计数、未生效／父级上限，以及证明摘要／结果不符。
密钥脚本五项自测也通过。控制器尚未上传或在Linux运行，实际资源限制、证明成功及清理
仍未验证。

### 2026-10-16 — Native checks rerun without claiming blocked Hardhat success

Native Node24.13.1/npm11.8.0: npm run check passes documentation freshness
and strict typecheck, then fails before Solidity compilation with HHE22.
Separately npm test passes295 cases: diagnostics59, protocol6, scenario
domain15, generator14, governance16, context accounts50, Midnight135; zero
assertion failures/skips in those suites. Midnight suite duration147776.461ms.
The pipeline then stops at Hardhat startup before its six contract cases.
npm run compile:solidity -- --show-stack-traces confirms the same startup
guard. Read the installed Hardhat local-install-resolution implementation;
calling its package lookup without importing project configuration gives
FileSystemAccessError caused by EPERM on node_modules/hardhat/package.json.
Synchronous realpath checks succeed, which does not override that observed
async lookup failure. This does not establish a missing Hardhat dependency.
Do not reinstall packages, disable the locality guard or relabel the previous
301-case unrestricted run as a current pass. JSON parsing, client syntax and
git diff --check pass. No milestone/shared HTML edit, commit or push occurs.

本机Node24.13.1／npm11.8.0运行npm run check，文档时效及严格类型检查通过，Solidity
编译前因HHE22停止。另跑npm test，诊断59、协议6、模板域15、生成器14、治理16、
上下文账户50、Midnight135，共295项通过，相关套件无断言失败或跳过；Midnight耗时
147776.461ms。之后在六项合约测试开始前因Hardhat启动失败停止。带完整堆栈编译检查
也为同一入口错误。读取已安装Hardhat的本地依赖判断实现，直接调用不加载项目配置的
包查找函数，得到FileSystemAccessError，其cause为node_modules/hardhat/package.json
上的EPERM。同步realpath成功并不能推翻异步查找权限错误，不能说依赖未安装。
未重装依赖或关闭本地性保护，未把此前非受限环境301项通过冒充本轮结果。JSON解析、
客户端语法及空白检查通过，未编辑里程碑／共享HTML，未提交或推送。

The wiki still describes an old NOT_STARTED/local-dev baseline; the index
health check points to information-flow rather than this Permio worktree.
Use the exact current Permio files, not those derived views, for this evidence.
Automatic economical stop is still NOT configured because the default OOS
role is missing and remote approval is unavailable. The instance's last known
state is Running and billable; preserve it and its disks. After access and
role setup recover, retrieve the current key report first, verify the image
CLI and run the bounded diagnostic, download/hash-check required results,
then schedule graceful StopCharging one hour after all server tasks finish.
No real proof, transaction, independent proof verification or M6 completion is
claimed at this checkpoint.

Wiki仍描述旧NOT_STARTED／local-dev基线，索引健康检查指向information-flow，而非此
Permio工作树，因此证据以当前精确文件为准。默认OOS角色缺失且远程审批不可用，自动
节省停机仍未配置。实例最后已知状态Running并计费，保留实例和磁盘。权限／角色恢复后，
先取当前密钥报告、核对镜像CLI，再运行有界诊断、下载并核对必要结果；全部服务器任务
完成后安排一小时后优雅StopCharging。不声称已生成真实证明、已发交易、独立证明验证
或M6完成。

References checked for the API correction and missing-role interpretation:
https://www.alibabacloud.com/help/en/oos/developer-reference/api-oos-2019-06-01-startexecution
https://www.alibabacloud.com/help/en/oos/support/faq

Final local rerun: seven paging policy self-tests, documentation freshness,
strict typecheck, both current/old-host evidence JSON parsing and whitespace
checks pass. The staging index remains empty and AGENTS.override.md remains
ignored. The documented controller stop grace is300seconds so bounded client,
Docker and safe swapoff cleanup have time to finish; this is not an extension
of the2000-second diagnostic/protocol bounds. An instruction-required
codebase-index update attempt from information-flow fails because the command
is not on native PATH. No index update is claimed; that index does not cover
this Permio worktree in any case. No remote access retry is made before the
reported approval retry time.

最终本地复查：七项换页自测、文档时效、严格类型检查、新旧主机证据JSON解析及空白检查
通过。暂存区仍为空，AGENTS.override.md仍被忽略。文档中控制器停止宽限设为300秒，
使有界客户端、Docker及安全swapoff清理有时间结束，不延长2000秒诊断或协议时限。
按指南从information-flow尝试codebase-index update，但原生PATH没有该命令，未声称
索引已更新；该索引本身也不覆盖此Permio工作树。未在审批提示的可重试时刻之前重试远程访问。

### 2026-10-16 — Afternoon recovery: real keys preserved and bounded paging starts

The user reports fixed at13:35 Shanghai. Normal approval/Workbench access
works again. Exact-instance read-back confirms Running/PostPaid/VPC and
an empty deletion deadline. OOS lists one preexisting, terminal Failed
read-only permission test, not an active stop. A new one-time probe using
OOSServiceRole reaches Waiting: exec-5228e484361649eea29c, target
i-t4ni11rkjyzgi0vlb68d,17:38 Shanghai, StopCharging/ForceStop=false. Cancel
that probe before proof work and read back Cancelled. List all executions
again: both are terminal. No actual stop or delete occurs.

上海时间13:35用户报告已修复，正常审批及Workbench恢复。精确实例仍Running／按量
付费／VPC，删除期限为空。OOS最初只有一个已终止Failed的只读权限测试，并非待执行
停机。新的OOSServiceRole单次探测到达Waiting，执行ID、目标及17:38上海时间如上，
StopCharging／ForceStop=false；证明工作前取消并读回Cancelled，再列出确认两项均终止。
没有实际停机或删除。

Optional GetExecutionTemplate for the preexisting permission test returns
User.NoPermission. Do not request broader permissions or treat that optional
read as a new blocker: create our own fixed, exact-instance, dry-run-only
workflow with the already authorized StartExecution instead. Its CheckFor
DescribeInstances succeeds, followed by StopInstance DryRun=true,
ForceStop=false, StoppedMode=StopCharging. Execution
exec-2e27a5dcc73d4475a6cd ends Failed with expected DryRunOperation, not an
authorization denial. This is how the ECS successful dry-run error response
surfaces through OOS; it does not mean an actual stop failed or occurred.
The returned description/body is not printed. No role, policy, credential or
security-group change is made by the agent.

可选GetExecutionTemplate读取既有权限测试返回User.NoPermission；不要求更宽权限，
也不把这项可选读取变成新阻碍，而用已授权StartExecution建立自有固定模板，仅对精确
实例预演。CheckFor中的DescribeInstances成功，之后StopInstance使用DryRun=true、
ForceStop=false、StoppedMode=StopCharging。上述执行以Failed结束，但内含预期
DryRunOperation，而非授权拒绝：这是ECS成功预演所用错误响应在OOS中的表现，不表示
实际停机失败或已发生。未打印原始错误／响应正文，未修改角色、策略、凭据或安全组。

The current host's key build actually completed at20:16:20.062046 UTC on
October15, starting20:08:03.749931:496.312167seconds, exit0,9577881600-byte
peak, no high/max/OOM events. Prover305131774bytes and verifier2119bytes
match hashes54bddf376206b2489ea3d5024032190ba524cb9fb1737e939400b683cd5eab64
and c44717d12a3111088477210769666a799b18cca83e3de2313b478424623a0553.
Package only five public small evidence files, download
logs/m6-recreated-keygen-small.tar.gz and verify hash
37f2fea7a87a588e8e77eb8346482c65c57443fa60bb933c2504876facb77430.
Validate the exact member list before extracting into a new directory and
verify the downloaded verifier separately. Source and necessary key evidence
are now local; the reproducible305MB proving key stays on the preserved ECS.

当前主机的密钥构建实际从10月15日UTC20:08:03.749931运行至20:16:20.062046，
耗时496.312167秒、exit0、峰值9577881600字节，high／max／OOM事件均零。
证明密钥305131774字节、验证密钥2119字节，分别匹配上列摘要。仅打包五个公开小型
证据文件，下载归档并核对摘要；核对精确成员列表后解至新目录，再单独验证验证密钥。
源码及必要密钥证据已在本地；可重建的305MB证明密钥留在保留的ECS中。

Inspect the pinned stock image entrypoint: bash -c with a single command
string. An explicit /bin/bash -c 'exec midnight-proof-server --help' in a
no-network256MiB container succeeds and confirms all planned flags, including
no-fetch-params, one worker/job and job-timeout. Upload the prepared controller
only to a verified-absent destination, exit0; its remote/local hash is
355fc19c4d2fdf98e3e21dda8085e69ec4a0c82d38ffe452a669b3e8d876022d.
Seven self-tests pass on Linux, then prepare-only passes35leaves/two negatives/
63843-byte preimage without storing the preimage or loading a wallet. Verify
the existing swap file0600/root,8589934592bytes and original swappiness0.

检查固定原版镜像入口确为bash -c加单一命令串；无网络256MiB容器中显式运行真实二进制
--help成功，确认no-fetch-params、单工作线程／任务及job-timeout等全部计划参数。
仅向已核对不存在的目标上传控制器，exit0，远程／本地匹配上列摘要。Linux七项自测通过，
prepare-only也通过35叶／两个反例／63843字节输入，未保存输入或加载钱包。既有swap
文件为0600／root、8589934592字节，原swappiness为0。

Start the documented owned systemd controller,512MiB/no swap, one35-minute
runtime bound plus300-second cleanup grace, no restart. It verifies the actual
11.5GiB prover RAM/8GiB swap/10GiB high and sibling2.5GiB/no-swap client
ceilings before proving. The real provider constraint check passes. At
133.894seconds, prover RAM10722385920bytes, swap466677760bytes; high events185,
max/OOM0. At333.967seconds it remains near10GiB RAM, swap2721275904bytes,
high1328, max/OOM0, host available2682032KiB. Thus the kernel is actually
paging under the fixed cap and the run passes the old no-swap failure time;
this is not yet a successful proof, an adaptive cryptographic algorithm,
6GiB qualification or current-contract chain acceptance. The job continues
under the unchanged2000-second diagnostic guard at this checkpoint.

按文档启动自有systemd控制器：512MiB、无swap、运行最长35分钟另清理宽限300秒、
无重启。证明前核实实际证明器RAM11.5GiB／swap8GiB／软阈值10GiB，以及同级客户端
2.5GiB／无swap。真实provider约束检查通过。133.894秒时证明器RAM10722385920字节、
swap466677760字节，high185、max／OOM0；333.967秒仍约10GiB RAM、swap2721275904
字节，high1328、max／OOM0、主机可用2682032KiB。说明内核确实在固定上限内换页，
并越过旧无swap失败时间；但尚非证明成功、密码算法自适应、6GiB资格或当前合约链上验收。
本检查点任务仍在原2000秒诊断保护下运行。

Normal-access Solidity build and six Hardhat local-chain tests now pass,
without reinstalling dependencies or bypassing the local-install guard. The
first complete root check passes docs/type/build but two existing negative
startup subprocess tests time out at the unchanged30seconds:57/59 diagnostics
pass. Both unchanged tests immediately pass in isolation in7194/6036ms;
retain the timeout record and rerun the complete check unchanged. Do not
increase test timeouts or claim the first root run passed. No milestone/shared
HTML or architecture is changed, and no commit/push is performed.

正常权限下Solidity构建及六项Hardhat本地链测试已通过，没有重装依赖或绕过本地安装
检查。首轮完整根检查通过文档／类型／构建，但两个既有负向启动子进程触及原30秒超时，
诊断57／59通过。两个测试不改代码、独立重跑分别7194／6036ms通过；保留超时记录，
继续原样重跑完整根检查，不增加测试时限或声称首轮通过。未改变里程碑／共享HTML或架构，
未提交或推送。

### 2026-10-16 — Real historical proof completes; cleanup recovery and economical stop

The exact stock historical membership proof completes. Provider stage runs
05:41:47.548–05:49:37.218 UTC,469669.849053ms; controller runs
05:41:24.775043–05:49:38.890229,494.115202seconds. The client exits0 and
saves4508bytes, SHA-256
d8b2c472d2eb99769c042573a30476a75c587e6dcc9fe5e7dcf3636865c3bc46.
Peak prover RAM10737680384bytes (10.00024GiB), swap5032136704bytes
(4.68654GiB), high2616, max/OOM/OOM-kill0. Its unchanged hard RAM ceiling
is11.5GiB, not a strict10GiB ceiling: memory.high is a reclamation threshold.
Across244samples, client peak2332811264bytes, simultaneous client/prover
RAM maximum12760096768bytes, host available minimum2518892KiB. Client and
prover peaks are not automatically simultaneous; do not add the separate
peak counters and call that a measured combined peak. All samples are numeric.

精确原版历史成员关系证明完成。provider阶段UTC05:41:47.548至05:49:37.218，
469669.849053毫秒；控制器05:41:24.775043至05:49:38.890229，494.115202秒。
客户端exit0并保存4508字节，摘要如上。证明器峰值RAM10737680384字节（10.00024GiB）、
swap5032136704字节（4.68654GiB），high2616、max／OOM／OOM-kill0。不变的硬RAM上限
是11.5GiB，不是严格10GiB；memory.high是回收阈值。244次采样中客户端峰值2332811264
字节，双方同时RAM最高12760096768字节，主机可用最低2518892KiB。两端各自峰值并不
一定同时发生，不能相加冒充实测同时峰值。资源日志全部为数值。

The original controller nevertheless exits1, for cleanup only. The successful
transient client is already garbage-collected: LoadState=not-found,
ActiveState=inactive and its cgroup absent. systemctl stop of that absent
unit is treated as an error, so the conservative swap cleanup guard retains
swap. The owned prover did stop successfully, with exit0 and OOMKilled=false,
and swappiness was already restored to0. Independently recheck those exact
terminal states and MemAvailable15147532KiB versus only1304KiB swap used,
then swapoff only /var/lib/permio-m6/swapfile. At05:51:19.523212 UTC,
separate cleanup-recovery-report.json confirms success and preserved swap
file. Do not rewrite the original report to hide its cleanup failure or
mistake its exit1 for proof failure.

原控制器仍exit1，但原因仅为清理。成功临时客户端已被回收，LoadState=not-found、
ActiveState=inactive、cgroup不存在；对缺失服务执行systemctl stop被视为错误，保守
swap清理保护因此保留swap。自有证明器已成功停止，exit0、OOMKilled=false，swappiness
也已恢复0。独立复查精确终止状态，以及MemAvailable15147532KiB而swap仅用1304KiB，
只对精确swap文件swapoff。UTC05:51:19.523212，独立恢复报告确认成功、文件保留。
不覆盖原报告来掩盖清理失败，也不把此exit1误称为证明失败。

Fix only cleanup idempotency: accept a proven inactive/collected unit without
stopping it again, but reject missing-unit/live-cgroup inconsistency. Handle
collection racing a stop by rechecking terminal state. Nine tests pass locally
and on Linux, including direct use of the actual collected-client state.
Fixed controller hash721eb0958467268043fa76107b949c725cfc906d3de356be2e0c79efdb23ddb5
is uploaded separately as cloud-m6-membership-paging-v1.1.py. The original
executed355fc19c controller remains untouched and is included in the proof
evidence. No second expensive proof run is claimed for this cleanup-only fix.

仅修复清理幂等性：对已证实inactive／已回收的服务不再重复停止，但拒绝缺失服务与
活跃cgroup并存；停止期间发生回收则重新核对终止状态。本地及Linux九项测试通过，
含直接核对真实已回收客户端。修复脚本摘要如上，独立命名v1.1上传，原355fc19c执行
脚本不变并收进证据。不声称为此仅清理改动重跑过第二次昂贵证明。

Download proof evidence21830bytes, hash
5d9b89cb620b7a7135f7d62a02484b110c423679c33736e16a5f00229bfdf1d2,
and cleanup-fix evidence hash
9a330a7c4a8d674ae211dcef7b30a7ae34a6440be8f67645a26635787d3e1633.
Verify exact8/2member lists before extraction, original/fixed script hashes,
proof hash/length and the matching reports. Locally deserialize the proof and
serialize back to4508bytes; this validates format, NOT independent cryptography.
Check the new JSON/client log for forbidden private-payload fields and all244
resource rows for numeric-only data. This is a targeted diagnostic evidence
check, not the full milestone private-fixture/receipt scan. No wallets,
credentials, preimages or private production flows were transferred. Arbitrary
raw server logs were not exported; the original client emits only public
diagnostic fields and fixed redacted categories.

下载证明证据21830字节及清理修复证据，摘要如上；解压前核对精确8／2项成员，再核对
原／修脚本摘要、证明摘要／长度及报告。本地证明反序列化并重序列化为4508字节，
仅验证格式，不是独立密码学验证。检查新JSON／客户端日志没有禁止的私有载荷字段，
244行资源数据均为数值；这是针对诊断证据的检查，不是里程碑完整私有fixture／receipt
扫描。没有传钱包、凭据、preimage或私有生产流程；没有导出任意原始服务日志，原客户端
仅输出公开诊断字段和固定脱敏类别。

The second complete, unchanged npm run check exits0:301passed,0failed,
0skipped, including135Midnight and six Hardhat cases. Initial timeout and
isolated rerun results remain recorded; no test timeout or acceptance gate is
weakened. Updated feasibility documentation states measured successful proof
latency and memory, not a minimum production machine or ordinary-action SLA.
The old no-swap comparison ran on another ECS, so no valid completed-baseline
slowdown ratio exists. This establishes fixed-cap disk paging for this exact
historical proof only.6GiB, current staged-contract proofs, real Preprod
transactions, ordinary-user acceptance and independent proof verification
remain unfinished. No architecture, shared milestone Markdown or generated
HTML is changed; no commit or push occurs.

第二轮不改代码／时限的完整npm run check退出0，301项通过、零失败／跳过，包含135项
Midnight及六项Hardhat。保留初轮超时与独立重跑记录，不降低测试时限或验收门槛。
可行性文档更新为实测完成证明的耗时和内存，不称为最低生产配置或普通动作SLA。
旧无swap对照在另一ECS执行，没有有效的已完成基线来计算减速比。本次仅证明精确历史
电路能通过固定上限磁盘换页完成；6GiB、当前分阶段合约证明、真实Preprod交易、普通
用户验收及独立证明验证仍未完成。未改架构、共享里程碑Markdown或生成HTML，未提交／推送。

After all evidence downloads verify and no task services/containers remain,
recheck cloud_essd/PostPaid/VPC and StopCharging DryRunOperation. App task
inventory shows no other active workspace task; do not message or mutate
other tasks. Create the real one-time OOS stop and read back Waiting:
exec-b6cdcd0903664f84aee8,2026-10-16 14:59 Asia/Shanghai (06:59Z),
OOSServiceRole, exact current instance, StopCharging, ForceStop=false.
Submitted fixed-template SHA-256
aa45fd90bae8c7a313779977b83ef506b9b50bad2f827d13c21536b7e7c5aeb2.
Cancellation is CancelExecution on this exact ID; it was tested on the earlier
probe. Workflow waits for Stopped and checks actual StopCharging; the future
Stopped state has not yet been observed at handoff. GetExecutionTemplate read
permission remains unavailable; submitted target/mode/hash and execution
role/deadline/status are recorded without printing a signed request. Instance,
tools, keys and disks are preserved, not released or deleted. A new task before
the deadline must cancel this exact pending stop before using the instance.

必要证据下载验证、服务／容器均无任务后，重查cloud_essd／按量付费／VPC与节省停机
DryRunOperation。应用任务列表无其他活跃工作区任务，未向其他任务发送消息或修改它们。
真正创建单次OOS停机并读回Waiting：上述执行，上海2026-10-16 14:59（06:59Z），
OOSServiceRole、精确当前实例、StopCharging、ForceStop=false，提交模板摘要如上。
取消路径为对此精确ID执行CancelExecution，已在早先探测中验证。流程含等待Stopped及
检查实际StopCharging，但交接时尚未到未来时刻，未观测最终Stopped。GetExecutionTemplate
读取权限仍不可用；记录了提交目标／模式／摘要及读回的角色／期限／状态，没有打印签名
请求。保留实例、工具、密钥及磁盘，不释放或删除。期限前新任务必须先取消精确待执行停机。

### 2026-10-16 — Explicit Preprod adapter; offline saved-wallet restore boundary

Continue from the completed historical paging diagnostic without repeating
that expensive proof or relabeling it as current M6 acceptance. Cancel the
pending14:59 Shanghai OOS stop on exec-b6cdcd0903664f84aee8 and read back
Cancelled before the new task; recheck automatic deletion deadline empty.
Authenticated Preprod probe escalation is then blocked before execution by
approval review, which reports recovery at15:17 Shanghai. Do not retry
equivalent escalations, upload credentials or work around the reviewer.
The cancellation means there is currently no verified replacement timer:
record the compute-billing risk and ask the user to schedule one-time
economical stop or report restored access. Preserve the earlier Waiting
record as history, while updating current lifecycle fields to Cancelled.

从已完成的历史换页诊断继续，不重跑昂贵证明或改称当前M6验收。新任务开始前取消上述
原计划上海14:59的OOS停机并读回Cancelled，重查自动删除期限为空。随后认证Preprod
探测在执行前被审批审查阻止，提示上海15:17恢复；不重复等价提权、不上传凭据或绕过
审查。旧任务取消意味着目前无已验证的新定时器，记录计算计费风险，请用户安排单次
节省停机或告知访问恢复。原Waiting记录保留为历史，现态字段改为Cancelled。

Implement and export `preprod-profile.ts` and `preprod-checkpoint.ts`.
The profile fixes the four current Blockfrost Preprod endpoints, hides the
project ID from JSON/inspect, rejects other-network credentials and arbitrary
proof destinations, and allows only caller-controlled loopback6300/6301.
Private sidecar helpers bind schema/network/provider/genesis/derived identities
and exact three-component hashes, without equating validation with governance
trust. Existing legacy snapshots have no verified provider-history sidecar;
do not invent one. Add two explicit root commands for read-only transport
checking and offline saved-wallet inspection, with no new dependency or
lockfile/compiler upgrade. Existing Local Dev admission runner remains
unmodified by this slice and is not a working Preprod deployment runner.

实现并导出上述两个模块：profile固定四个当前Blockfrost Preprod端点，JSON／inspect
不含项目ID，拒绝其他网络凭据或任意证明器目标，仅允许调用者控制的loopback6300／6301。
私有sidecar工具绑定schema／网络／服务／创世／派生身份及三个精确组件哈希，不把验证
等同治理信任。旧快照缺少已验证的服务历史sidecar，不虚构。根命令新增显式只读连接
探测及离线钱包检查；没有新依赖、锁文件／编译器升级。此切片未改Local Dev admission
runner，也未将它变为可用的Preprod部署runner。

Build `m6-preprod-transport.ts`: RPC verifies genesis/ledger8; node WS must
produce a matching new-head notification. The first implementation deliberately
labels its indexer operation query-over-WS, not a subscription. Extend it using
the pinned official Midnight.js4.1.1 schema: query latest height, subscribe to
blocks at that offset, require a valid subscription result, then complete.
Do not stream from genesis or let a query-only result pass. Test both real
message sequences with synthetic sockets plus provider errors, empty completion
and an earlier-height result. Keep15-second RPC and20-second WS bounds,
disable redirects, close owned sockets and redact all raw provider errors.
No live subscription is claimed while execution access remains blocked.

实现`m6-preprod-transport.ts`：RPC核对创世／ledger8，节点WS必须收到匹配的新区块
通知。初版明确把indexer操作标为WS上的query而非订阅；随后依据固定官方Midnight.js
4.1.1 schema扩展为先查最新高度、从该offset订阅blocks、收到合法订阅结果后完成。
不从创世流式重放，也不让仅query成功通过。合成socket测试真实消息顺序、服务错误、
空完成及早于指定高度的结果；保持RPC15秒／WS20秒、禁重定向、自有socket清理及原始
错误脱敏。执行访问受阻期间不声称真实订阅通过。

Offline restoration derives shielded/unshielded/Dust identities from the
locally selected account, rejects wrong-network/account headers before expensive
SDK work, then still requires all three full SDK restores and actual state
identity checks. Never call `.start()`, silently resync, create a fresh wallet,
or rewrite checkpoints. The CLI checks ignored/untracked inputs fail-closed;
Git checks have10-second bounds, component files must be regular/non-symlink
and1..32MiB. Read hashes again only on successful completion. Tests use the
official public TEST_MNEMONIC and real pinned-SDK synthetic snapshots with
socket connect disabled; no actual wallet seed appears in tests or reports.

离线恢复从本地选定账户派生shielded／unshielded／Dust身份，先拒绝错误网络／账户
header以避免昂贵SDK操作，再要求三个完整SDK恢复及实际状态身份核对。不调用`.start()`、
不暗中重新同步、不新建钱包、不覆盖检查点。CLI对已忽略／未跟踪输入进行fail-closed
检查，Git检查限10秒，组件文件须普通非符号链接且1..32MiB；仅成功后再次核对源哈希。
测试用官方公开TEST_MNEMONIC、真实固定SDK合成快照并禁用socket连接；测试／报告没有
实际钱包助记词。

An actual existing fixture-1 inspection does not complete under the initial
90-second outer guard. Instrument fixed component stages: shielded and
unshielded return, Dust restore does not before a30-second owned-process
cutoff. Header checks pass. Inspect the installed official SDK: Dust restore
does JSON/hex decoding, ledger `DustLocalState.deserialize`, core restore and
runtime construction; the internal slow substep is not yet isolated. Confirm
both applications use exactly wallet-sdk1.2.0/facade4.1.0/dust4.2.0/
shielded3.0.2/unshielded3.1.0/ledger8.1.0. Do not claim version mismatch,
corruption, OOM, indefinite hang or that synchronization must restart.

真实既有fixture-1初次检查触及90秒外部保护仍未完成。增加固定组件阶段后确认shielded／
unshielded返回，Dust在30秒自有进程截止前未返回，header核对通过。检查已安装官方SDK，
Dust恢复包含JSON／hex解码、ledger的`DustLocalState.deserialize`、core恢复及runtime
构建，尚未区分内部耗时子步骤。确认两应用上述精确SDK版本完全一致；不声称版本不匹配、
数据损坏、OOM、无限卡死或必须重做同步。

RxJS state timeouts cannot interrupt a synchronous restore, so add the owned
parent/child CLI supervisor and `m6-checkpoint-supervisor.ts`. Enforce60seconds
for the exact child,768MiB V8 heap, raw stdout/stderr withheld and public-only
IPC. This is NOT a hard total/native/WASM RAM ceiling. A success message needs
exit0; deadline/error/reporter failure cannot pass. Dispose already-created
components even if the progress reporter throws. A first typecheck rejects
`windowsHide` on the pinned Node `ForkOptions`; remove that unsupported option,
retain noninteractive ignored child stdio, and rerun strict types successfully.
No terminal toolchain or dependency change is needed.

RxJS状态超时无法中断同步恢复，因此增加自有父子进程CLI保护及上述supervisor模块：
精确子进程限60秒、V8 heap768MiB、屏蔽原始stdout／stderr、IPC仅传公开字段。这不是
总内存／原生／WASM硬上限。成功消息还需exit0，超时／错误／报告器失败均不能通过；
即使进度报告器抛错也清理已创建的组件。首轮类型检查发现固定Node ForkOptions不支持
`windowsHide`，去掉该选项，保留非交互、忽略子进程stdio，再次严格类型检查通过。
无需更换终端工具链或依赖。

Run the actual new guarded CLI against fixture-1. Derive/header/shielded/
unshielded/Dust stages begin at8/120/130/166/174ms. Dust-entry RSS442122240,
JS heap168149960bytes, not peaks. At06:37:37.999UTC, the60-second guard
closes the owned child with SIGTERM and command exit1; no successful restore
or synchronization is fabricated. Save the public failure report under ignored
logs, SHA-25654f82789c25d6b141378fbb9d099950577290ac632c12a3cf0fdb2fc4e2962c2.
No existing checkpoint write, secret transfer, transaction, fixture2/3 restore
or changed protocol is claimed.

对fixture-1实际运行新增保护CLI，derive／header／shielded／unshielded／Dust分别在
8／120／130／166／174ms开始；进入Dust时RSS442122240、JS heap168149960字节，
不是峰值。UTC06:37:37.999，60秒保护确认自有子进程SIGTERM退出，命令exit1，不伪造
恢复或同步成功。公开失败报告保存在忽略logs，摘要如上。没有覆盖原检查点、秘密传输、
交易、fixture2／3恢复或协议变更。

Final diagnostics67/67 pass, including four supervisor and four transport
cases; real SDK checkpoint4 and profile6 are included in Midnight145/145.
Other package suites pass6/15/14/16/50. Aggregate313 non-contract cases pass
across the root attempt and final diagnostic rerun, not one successful root
check. `npm run check` passes docs/types then hits Hardhat HHE22 at build;
`npm test` passes its308 initially collected cases then hits the same error
before six contract cases. The final diagnostics replace62 with67. Preserve
the previous successful301-case normal-access root run as historical only.
Do not reinstall or bypass Hardhat, weaken test timeouts, or retry blocked
escalations. The configured index is for information-flow; incremental CLI
update again fails command-not-found, so no fresh Permio index is claimed.
Update README, this log, adapter evidence and lifecycle status only; preserve
preexisting shared milestone/HTML changes. No commit or push.

最终诊断67／67通过（含supervisor四项、连接四项），真实SDK检查点四项及profile六项
包含在Midnight145／145内；其他包分别6／15／14／16／50通过。根测试尝试及最终诊断
重跑合计313项非合约测试通过，不是一次完整根检查成功。`npm run check`文档／类型
通过后在Hardhat构建遇HHE22；`npm test`最初收集的308项通过，随后同样在六项合约
测试之前失败，最终诊断由62项增至67项。既有正常权限下301项完整通过只保留为历史，
不重装／绕过Hardhat、不放宽测试时限、不重复受阻提权。配置索引属于information-flow，
增量CLI再次command-not-found，不声称Permio索引已更新。只更新README、开发日志、
适配器证据及生命周期现态，保留既有共享milestone／HTML修改；未提交或推送。

Final local integrity pass parses all four affected JSON records, recomputes
all six recorded source hashes and the actual guarded failure-report hash,
and scans78 modified/untracked text files for the locally configured secret
values without printing any marker. All pass. Canonical private-instruction
prefix matches; override remains ignored/untracked and the index empty.
`git diff --check`, docs freshness and strict types pass. This targeted secret
scan does not replace the outstanding full M6 receipt/private-fixture scan.

最终本地完整性检查解析四份相关JSON，重算六个已记录源码摘要及真实保护失败报告摘要，
并在78个已修改／未跟踪文本文件中查找本地配置的秘密值，不输出任何秘密标记，全部通过。
私有指令规范前缀一致，override仍忽略／未跟踪，暂存区为空；diff空白检查、文档新鲜度、
严格类型检查通过。这项针对性秘密扫描不代替尚未完成的完整M6收据／私有fixture扫描。

## 2026-10-16 — Access recovery, measured Dust cold start and scoped Preprod wallet

Continue without waiting for the previously reported approval retry timestamp:
actual normal-access execution works. Solidity build and six Hardhat tests
pass without dependency reinstall or a locality-guard bypass. Full root checks
pass319,325,326 cases as provider tests are added. After the final lifecycle
fix, `npm run check` passes329 cases (diagnostics67, protocol6, scenario
domain15/generator14/governance16, context accounts50, Midnight155, Hardhat6),
zero failures/skips, exit0. Midnight takes155000.9735ms; Hardhat reports3360ms.
Earlier HHE22 and cutoff failures remain historical, not present blockers.

没有等待此前审批重试时间，实际正常权限执行已恢复。Solidity构建及六项Hardhat通过，
未重装依赖或绕过安装位置保护。增加provider测试期间完整根检查分别通过319、325、
326项；最终生命周期修复后完整检查329项通过：诊断67、协议6、场景领域15／生成14／
治理16、账户50、Midnight155、Hardhat6，零失败／跳过、exit0。Midnight155000.9735ms，
Hardhat3360ms。先前HHE22及保护时限失败保留为历史，不是当前阻塞。

Authenticated transports pass at06:50:12.926UTC: genesis
`0xdf831b09a8baa92badf47762ce5ac439b7e47e3ed3d39600cfdd44fad552361b`,
ledger8.1.1, node subscription3002596 and indexer subscription3002593. Move
the initially workspace-level public report into this worktree's ignored logs;
before/after hashes match
`b916e8ebd520f00de0e20eac9ffc79939c22a64c661399e38aecf48c560d9dd4`.
Transport readiness does not establish proof, transaction or finality acceptance.

UTC06:50:12.926认证连接通过：上述创世哈希、ledger8.1.1、节点订阅3002596及indexer
订阅3002593。将起初写入工作区级logs的公开报告移入本工作树忽略logs，前后摘要相同，
如上。连接就绪不能证明证明器、交易或最终性验收。

A local wrapper passes exact bytes through the original ledger
`DustLocalState.deserialize` and restores its descriptor in `finally`; no SDK
file/tree is edited. The native30/60-second attempts stop inside that call.
WSL initially fails EROFS before wallet reading: testkit creates a default file
logger at import. Private TMPDIR/cache alone does not fix it. Preload testkit
with cwd in the owned unit's private `/run` directory, then restore cwd. Keep
source/wallet read-only, networking disabled and raw stderr withheld. These
failed import attempts do not imply wallet corruption.

本地包装器将原字节精确传给原ledger反序列化，finally还原descriptor，不改SDK文件／树。
原生30／60秒尝试均在该调用内停止。WSL起初在读取钱包前EROFS：testkit导入时创建
默认文件日志器，私有TMPDIR／cache不能解决。改为先在自有unit私有/run目录作为cwd
导入testkit，再恢复cwd，保持源码／钱包只读、禁网、屏蔽原始stderr。导入失败不等于
钱包损坏。

The300-second WSL diagnostic times out, then SIGKILL after stop grace; measured
peak594665472bytes, swap0, CPU248.743seconds. Its340-second observed wall-clock
span is not an exact monotonic duration. A new900-second diagnostic with the
same1GiB high/1.5GiB max/512MiB swap/one CPU succeeds: ledger call312111ms,
full post-import inspection313136ms, final RSS650076160bytes. All three
restored identities match. Final successful-unit peak counters were requested
after systemd garbage collection and are unknown, not zero. Public trace hash:
`84aa27771c995358cfab697a394a7259afecf93ec285228dc1e57b3c330a8f63`.
No snapshot edit, upgrade, resync-from-zero, upload, proof or transaction occurs.
Only fixture-1 is restored; fixtures2/3 are not tested by this implementation.

300秒WSL诊断超时，停止宽限后SIGKILL，实测峰值594665472字节、swap零、CPU248.743秒。
观测墙钟跨度340秒不是精确单调时钟耗时。新900秒诊断保持相同软阈值1GiB、硬上限
1.5GiB、swap512MiB、单CPU并成功：ledger调用312111ms，导入后完整检查313136ms，
结束RSS650076160字节，三个组件身份均匹配。成功unit最终峰值在systemd回收后才查询，
现为未知而非零；公开记录摘要如上。未改快照、升级、从零同步、上传、证明或交易，仅
恢复fixture-1；本实现尚未测试fixture2／3。

Add Preprod provider wiring: explicit signing network, all eight environment
fields, narrow transport, drift checks before transport and after asynchronous
balancing, redacted failures and no automatic retry after uncertain submission.
Seven provider tests pass. Share full SDK restore/identity checks through
`withRestoredPreprodWallet`: offline until explicit sync, `.start(false)` skips
faucet/DUST registration, spendable-DUST gate, closed-scope denial. Join an
accidentally unawaited initialization before disposal so it cannot complete
after workflow cleanup. Three new lifecycle cases extend four checkpoint tests.
No dependencies/lockfile, circuit, generated asset or architecture changes are
made by this slice; preexisting changes are preserved.

增加Preprod provider：显式签名网络、八字段核对、窄接口、传输前及异步平衡后漂移检查、
错误脱敏、未知提交结果不自动重试，七项测试通过。作用域API共享完整SDK恢复／身份检查，
显式同步前离线，`.start(false)`跳过faucet／DUST注册，以可花费DUST为门槛并拒绝
关闭后操作。清理前等待意外未await的初始化，防止工作流清理后才完成。在原四项检查点
测试上增三项生命周期测试。本切片未改依赖／锁文件、电路、生成产物或架构，保留既有修改。

Start an explicit read-only WSL catch-up attempt under1.5GiB RAM/512MiB swap/
one CPU/900seconds, original saved files read-only. Its node3003114/indexer
3003112 authenticated subscriptions and RPC pass. No funding/proving/balancing/
checkpoint persistence/submission is called. Loaded checkpoint source hash:
`5b3862733f153b4dec163fa0bdf026dc32f739de888fc5f682e8623d0d14efc2`;
the later cleanup-race fix does not alter its awaited sync path. Preserve the
eventual result separately; successful restoration alone is not readiness.

启动显式只读WSL追赶，RAM1.5GiB／swap512MiB／单CPU／900秒，原文件只读；其节点
3003114／indexer3003112认证订阅及RPC均通过。不充值／证明／平衡／保存检查点／提交。
加载的检查点源码摘要如上；之后清理竞态修复不改变该await同步路径。最终结果另记，
不能将恢复成功当成钱包就绪。

The first awaited catch-up completes in72008ms after restoration, strict SDK
synchronization true and a DUST coin present. Original checkpoint hashes
recheck unchanged, no file writes or transactions. Whole-process monotonic
duration461.916761seconds differs from the15:40:23–15:48:47 wall-clock span;
retain both, use monotonic duration for runtime. Cgroup peak617357312bytes,
swap0, final RSS sample698036224bytes: these are distinct accounting metrics,
not inconsistent measurements of one quantity. Process exits0. Preserve trace
SHA-256 `196861bf4a39338e427af3514f76e9b5e184d04fd4d18551ccd4da7b20bb3960`.

首次await追赶在恢复后72008ms完成，SDK严格同步为true且存在DUST coin。原文件哈希
复核不变，无写入或交易。全进程单调时钟461.916761秒，与墙钟15:40:23–15:48:47不同，
两者均保留，运行时采用单调时钟。cgroup峰值617357312字节、swap零，结束RSS采样
698036224字节是不同计量，不能当成同一数值冲突。进程exit0；记录摘要如上。

Review catches that the first revision equates any available coin entry with
spendable DUST. Tighten to both nonempty available coins and positive
`state.dust.balance(new Date())`; even this is not a sufficient-fee guarantee
for every future transaction. A new synthetic state test initially invokes
real Facade.init, which eagerly opens the node submission connection before
`.start()`. Its public synthetic token appears in SDK stderr retries; no actual
wallet is loaded. Verify and stop only owned test PID17344. Replace the facade
with an offline lifecycle fake, keep original synthetic restored components
owned/stopped, explicitly reject socket connects and assert `.start(false)`.
Fix an implicit-any type error in that test. Eight checkpoint tests then pass,
and final complete root `npm run check` passes330/330, no skips or failures,
Midnight156 in152001.2534ms and Hardhat6 in3565ms. No timeout is weakened.

检查发现首版将非空coin列表等同可花费DUST，收紧为coin非空且SDK当前余额为正，即便如此
也不能保证未来每笔费用都够。新增合成状态测试起初调用真实Facade.init，发现在.start
之前即主动连接节点提交服务；SDK stderr反复显示公开合成token，没有加载真实钱包。
核实后只停止自有测试PID17344，改用离线生命周期fake，保持原合成恢复组件归属并清理，
明确拒绝socket连接、断言.start(false)，修复测试参数隐式any。随后检查点八项通过，
最终完整根检查330／330、零跳过／失败：Midnight156项152001.2534ms、Hardhat六项
3565ms；没有放宽时限。

The first real catch-up used the pre-tightening source, so it cannot certify
positive balance retroactively. Start a second explicitly bounded read-only
run with the final source, same1.5GiB/512MiB/one CPU/900seconds; record its own
outcome. Raw SDK stderr remains suppressed by the diagnostic. The library's
redacted thrown errors alone cannot suppress third-party asynchronous URL
logging, and the state timeout excludes SDK initialization/synchronous restore;
retain the whole-process guard and document both limitations.

首次真实追赶加载收紧前源码，不能追溯认证余额为正。因此以最终源码、相同RAM1.5GiB／
swap512MiB／单CPU／900秒，再启动一次明确只读测试并另记结果。诊断继续屏蔽SDK原始
stderr；库捕获异常脱敏不能屏蔽第三方异步URL日志，且状态等待时限不包括SDK初始化／
同步恢复，因此保留全进程保护并记录这两项限制。

Recheck the exact Singapore ECS: Running/PostPaid/VPC/cloud_essd, deletion
deadline empty,14818MiB available RAM,9582MiB root free, no swap, no running
containers or M6 jobs. The old failed controller unit is historical; do not
call it a running job. Rehash all three downloaded proof/key/cleanup bundles
successfully. Other workspace server tasks are not active. After server work
finishes, create one OOS stop `exec-762fde05446b4ca7ac2e` for16:54 Shanghai,
16October, with StopCharging/ForceStop=false, OOSServiceRole, and post-action
Stopped/actual-mode checks. Initial creation readback is Waiting; an additional
read transiently fails URLError. Reconcile the same execution to Waiting,
never create a duplicate. The stopped state is future/unobserved; preserve
instance/disks/tools, no deletion timer. The earlier14:59 stop stays Cancelled.

重查精确新加坡ECS：Running／PostPaid／VPC／cloud_essd，删除期限为空，可用RAM
14818MiB、根盘空闲9582MiB、无swap、无运行容器或M6任务。旧failed控制unit只是历史，
不能当成运行任务。三份已下载证明／密钥／清理证据包重新核对通过，其他工作区服务器
任务未运行。服务器工作结束后创建单次OOS停机，如上ID，10月16日上海16:54执行
StopCharging／ForceStop=false，角色OOSServiceRole，并检查Stopped及实际模式。创建
读回Waiting，额外读取一次URLError，随后核对同一任务仍Waiting，没有重复创建。停机
状态尚未到时观测；保留实例／磁盘／工具，不设删除计时，原14:59任务仍Cancelled。

The final-source second catch-up passes: strict SDK synchronization and
positive available DUST balance, exit0. Restore reaches state at232802ms;
catch-up runs232865–307959ms (75094ms), full post-import workflow308173ms.
Whole-process monotonic duration410.397003seconds; wall clock15:50:34–15:57:54
is retained separately. Peak cgroup memory623501312bytes/swap0, final process
RSS sample713302016bytes. Different restore durations across runs are not a
controlled optimization comparison or production SLA. Original snapshot hashes
recheck unchanged. Public trace hash
`7571308b2fbc23fd41ce71db664bce9810618cb51aad68a124a8d78d4e1263e8`.
No funding, proving, balancing, submission or wallet upload. Stop the completed
owned units only after preserving metrics; keep reports and original wallet.
Current-contract prover compatibility/deployment/action/finality/receipt and
reconnect gates remain open. No commit or push.

最终源码第二次追赶通过：SDK严格同步、可用DUST余额为正、exit0。恢复至状态读取为
232802ms，追赶232865–307959ms（75094ms），导入后完整工作流308173ms；全进程
单调时钟410.397003秒，墙钟15:50:34–15:57:54另存。cgroup内存峰值623501312字节／
swap零，结束进程RSS采样713302016字节。多次恢复耗时不同不是受控优化对照或生产SLA。
原快照哈希复核不变，公开记录摘要如上。未充值、证明、平衡、提交或上传钱包。保留
指标后只停止已完成自有unit，保留报告和原钱包。当前合约证明器兼容／部署／动作／
最终性／收据和重连门槛仍未关闭。未提交或推送。

## 2026-10-16 — Explicit Preprod admission runner and private prover recovery

On continuation, cancel and read back `exec-762fde05446b4ca7ac2e` before
using ECS; the16:54 Shanghai stop is no longer active. Confirm Running and
empty deletion deadline. Use the installed Workbench skill, not public SSH.
The Permio wiki still stops at M5, while index health covers information-flow,
not this worktree. Verify the exact current source rather than treating either
derived view as M6 evidence. All current generated binding/program/binary/key
hashes pass the real bounded-key manifest guard; no compiler or key rebuild.

继续任务时先取消上述停机任务并读回Cancelled，再使用ECS；原上海16:54任务已失效。
确认Running且删除期限为空，使用已安装Workbench技能，不用公网SSH。Permio wiki仍
停在M5，索引健康检查属于information-flow而非本工作树；直接核对当前精确源码，不能
把两种派生视图当成M6证据。当前生成绑定／程序／二进制／密钥摘要全部通过真实有界
密钥manifest保护，没有重编译或重新生成密钥。

Find the actual network bug in the runner: it hardcodes `undeployed` in the
constructor hash and two M4 admission artifacts, and unconditionally reads a
Local Dev account file. Export the existing awaited workflow, retain direct
CLI behavior only when invoked as its entry script, and introduce an explicit
Preprod provider scope. Change all three network bindings together. Keep
Local Dev account, memory sampler and prover-reset controls out of Preprod.
Do not fork a second governance implementation. A deployment-only scope checks
the indexed constructor network/root and empty template registry before
returning; it does not activate a template. Every submission run still creates
a new fixture deployment; reconnect/resume across separate runs is not added.

定位runner实际网络问题：构造摘要及两份M4准入产物写死undeployed，并无条件读取
Local Dev账户文件。导出既有await工作流，仅直接作为入口脚本执行时运行CLI，增加显式
Preprod provider作用域，一起修改三处网络绑定。禁止Preprod带入Local Dev账户、内存
采样或证明器重置参数，不复制另一套治理实现。仅部署范围核对索引构造网络／权限根及
空模板注册表后返回，不激活模板。每次提交仍创建新fixture部署，没有新增跨运行恢复。

Add the explicit `test:live:m6:preprod` command and argument/private-input
helpers. Require network, one named check/submission scope, exact local paths,
variable selectors and an allowlisted loopback prover. Fail unknown/duplicate
or mixed controls. Load no wallet SDK/snapshots in check mode. Require ignored,
untracked, bounded regular non-symlink files, reuse the identity-checked scoped
wallet, and verify original source hashes after success. Keep credentials and
mnemonics in memory only. Parent suppresses raw SDK stdout/stderr, forwards
fixed phase labels and whitelisted readiness booleans, and needs exact-scope
completion plus exit0. The one-hour owned-process guard uses SIGTERM then
owned SIGKILL after5seconds; it does not extend protocol lifetimes or cap total
RAM. Explicit worker failure terminates leaked async handles, without waiting
an hour or printing private errors. Unknown submission outcome requires chain
reconciliation before manual retry; no transaction auto-retry is added.

增加显式命令及参数／私有输入工具，要求网络、唯一具名检查／提交范围、精确本地路径、
变量选择器及白名单本地证明器；拒绝未知、重复或混合参数。check不加载钱包SDK／快照。
要求已忽略、未跟踪、有大小限制的普通非符号链接文件，复用身份核对的作用域钱包，成功
后核对源哈希；凭据／助记词只留内存。父进程屏蔽SDK原始stdout／stderr，只传固定阶段
及白名单就绪布尔值，要求范围一致完成且exit0。整体一小时保护先SIGTERM，五秒后必要
时仅对自有进程SIGKILL，不延长协议期限或限制总RAM。worker明确失败时终止泄漏异步
句柄，不等一小时、不显示私密异常。提交结果未知须先核链再人工重试，不加交易自动重试。

Eight safety tests cover selector rejection, private-file Git guards and
changed hashes, redacted inspection, matching scope/exit, graceful/forced
owned termination, SDK-free invalid CLI, safe import and mixed-network controls.
One uses the actual generated contract and exact keys to serialize a deployment,
checks the Preprod hash is present and Local Dev hash absent, then throws before
any proof, balancing or submission. Synthetic Git init initially fails under
restricted filesystem access; the unchanged test passes with normal access.
A test-only incorrect hash-module import, readonly-property assignment and
implicit-any parameter are corrected; production types then pass. First full
root run337passes with seven cases; final root338/338 with eight, zero failures
or skips, Midnight156 in142723.8529ms, Hardhat6 in3276ms. No dependency,
lockfile, compiler, generated assets or architecture change for this slice.

八项安全测试覆盖选择器拒绝、私有文件Git保护及哈希变化、检查脱敏、范围／退出码、
自有进程优雅／强制终止、无SDK的无效CLI、安全导入和混合网络控制。其中一项用真实
生成合约及精确密钥序列化部署，核对Preprod摘要存在、Local Dev摘要不存在，再在证明、
平衡或提交前抛错。合成Git初始化在受限访问下失败，正常权限原样通过。修复测试中错误
hash模块路径、只读属性赋值及隐式any；生产类型通过。首轮七项测试根检查337通过，最终
八项根检查338／338、零失败／跳过，Midnight156项142723.8529ms、Hardhat六项3276ms。
本切片没有修改依赖、锁文件、编译器、生成产物或架构。

The real first check fails at08:25:58.257UTC before wallet loading. Both
loopback prover endpoints are unavailable; native Docker version/image calls
return HTTP500. Preserve its public report hash
`62b6feb20f84bbfcb1c1f3e1cd78dfc96012c0127a6d6aa392f55e4f5f8d8aa3`.
Do not reset Docker or upload wallet material. On ECS, the initial lookup uses
the retired `midnightnetwork` repository by mistake and finds no image; correct
to the actually installed pinned `midnightntwrk` digest. The image is present,
not missing. Its minimal container lacks `ls`/`ldd`, and the binary has no
`--version` flag. Use host-side extraction/file/readelf and the supported help
instead. A new stopped, networkless container exports only the public executable
and image; no task keys, wallet, credential or preimage is present.

首个真实check于UTC08:25:58.257在加载钱包前失败；两个本地证明器端点不可用，原生
Docker版本／镜像调用HTTP500，保留公开报告摘要如上。不重置Docker、不上传钱包。
ECS最初错误查找旧midnightnetwork镜像库，改用实际已装midnightntwrk固定摘要后确认
镜像存在，不是缺失。其最小容器无ls／ldd，二进制也不支持version参数，改用主机侧提取、
file／readelf和受支持help。新建停止、禁网容器只导出公开可执行文件及镜像，不含任务
密钥、钱包、凭据或preimage。

The binary is23986080bytes, hash
`0e7c638afff563a382316bb06cf31e4afe327e0ada9fd8f2e9b1ef5b73171e03`.
Its Nix interpreter names glibc2.42 but symbol requirements top out at2.34;
check actual WSL compatibility with the system loader, never assume from the
path. The first uncompressed Workbench download reaches21642592bytes then
fails `context deadline exceeded`; keep that unverified partial and never
execute it. Compress the same exact binary to7279087bytes, hash
`0365b8e1c58557cb3767b6de23f8fc4aca9c2ca92a88601c93fca89c6f6e1ce0`,
and retry to an exclusive new local file. This is public-artifact setup, not
remote private proving or a toolchain upgrade. Record final WSL startup,
network isolation, exact caps and real deployment result separately.

二进制23986080字节，摘要如上。Nix解释器路径写glibc2.42，但符号最高要求2.34，须用
系统loader实际核对WSL兼容，不能看路径推断。首轮未压缩Workbench下载至21642592字节
后超时，保留未核实副本且不执行。将同一二进制压缩至7279087字节，摘要如上，重试到
新的独占本地文件。这是公开产物准备，不是远程私密证明或工具链升级。最终WSL启动、
网络隔离、精确上限及真实部署结果另行记录。

The compressed transfer completes. Verify gzip and decompressed binary hashes
locally, run the unchanged binary's help with `/lib64/ld-linux-x86-64.so.2`,
and start only the owned WSL prover unit. Read back high2GiB/max3GiB/swap1GiB,
one CPU/worker/job, job600seconds and service1800seconds; no parameter fetching,
read-only cache/home/source and raw output discarded. The image binary exposes
no bind-address option, so apply systemd IPAddressDeny=any with localhost
allowlist. Verify effective behavior before private inputs: loopback health200,
the VM's actual non-loopback address times out after3seconds. This is a narrow
local service boundary, not public hosting, remote witnesses or a ledger upgrade.
It does not qualify this RAM budget for large proofs.

压缩传输完成，本地核对gzip及解压后二进制摘要，通过系统loader运行原二进制help，再
仅启动自有WSL证明器unit。读回high2GiB／max3GiB／swap1GiB、单CPU／线程／任务、
任务600秒及服务1800秒，禁参数下载、缓存／home／源码只读、丢弃原始输出。二进制无
bind-address参数，因此应用systemd拒绝全部IP、仅放行localhost。在私密输入前实测：
回环健康200、VM实际非回环地址三秒超时。这是局部本地服务边界，不是公开托管、远程
witness或升级账本，也不证明该RAM预算适合大型证明。

The exact WSL CLI check passes08:39:07.135UTC, all six preflight booleans
true. Preserve report SHA-256
`46709e89eb03ec3c887dab1fadcb267d50f144bde138af172a4bd93b2cc4822e`.
Add public candidate-ID observation immediately before submission so a future
unknown outcome can be reconciled without logging transaction bytes. Validate
both candidate and returned IDs, keep one underlying call, and add the ninth
safety case. Final complete `npm run check` passes339/339: diagnostics76,
protocol6, scenario15/14/16, accounts50, Midnight156 and Hardhat6, no failures
or skips. Midnight144064.9453ms, Hardhat3267ms. Source hashes are updated
after the observer change, not borrowed from the previous338-case revision.

UTC08:39:07.135精确WSL CLI check通过，六项预检布尔值均true，报告摘要如上。提交前
增加公开候选ID观察，便于未来结果未知时核对，不记录交易字节。校验候选及返回ID，底层
只调用一次，增加第九项安全测试。最终完整检查339／339：诊断76、协议6、场景15／14／
16、账户50、Midnight156、Hardhat6，零失败／跳过，Midnight144064.9453ms、Hardhat
3267ms。源码摘要在观察器修改后重算，不挪用先前338项版本。

The requested deployment-only command is denied by safety review before
execution, requiring explicit user approval to spend existing test DUST and
create permanent Preprod contract state. Verify its unit is not-found and
inactive/dead. No wallet load, fee proof or submitted transaction happens
through that command. Do not retry an equivalent/indirect submission. Ask the
user to approve exactly one deployment-only transaction, excluding template
activation and private input upload. This is an operational authorization
boundary, not another architecture change or an account-quota excuse.

请求的仅部署命令在执行前被安全审查拒绝，需要用户明确批准花费现有测试DUST及创建
永久Preprod合约状态。核实unit不存在且inactive／dead；该命令未加载钱包、生成费用
证明或提交交易。不换等价／间接入口重试。已请用户只批准一次仅部署交易，不含激活模板
或上传私密输入。这是操作授权边界，不是新的架构变更或账户额度理由。

While approval is pending, preserve the owned prover's final idle peak
7286784bytes/swap0, then stop only that unit and verify inactive/dead; binary,
parameter cache, wallet and public evidence remain. Recheck ECS has no running
jobs/containers, unchanged downloaded public hash, empty deletion deadline and
valid StopCharging dry-run. Other workspace server tasks are inactive. Install
one fresh stop `exec-894d34957b6a4d89a9c7` for17:47 Shanghai on16October,
StopCharging/ForceStop=false with OOSServiceRole; preserve instance/disks/tools.
The future stopped state is not yet observed; the old16:54 stop remains
Cancelled. No force stop or deletion. Final integrity scan parses32evidence
JSONs, verifies11current source hashes, two public executable hashes, three
downloaded server bundles and99changed/public-report text files against local
secret markers, without printing marker values. Canonical ignored private
instructions, empty index, unchanged lockfile and docs/whitespace checks pass.
The index CLI is still unavailable; no fresh Permio index is claimed. No
milestone Markdown/generated HTML edits by this slice, no commit or push.

等待批准期间保留证明器结束空闲峰值7286784字节／swap零，只停止该unit并核实inactive／
dead，保留二进制、参数缓存、钱包及公开证据。重查ECS无运行任务／容器、下载公开摘要
不变、删除期限空、StopCharging dry-run有效，其他工作区服务器任务未运行。新建上述
单次停机任务，10月16日上海17:47执行StopCharging／ForceStop=false，角色OOSServiceRole，
保留实例／磁盘／工具。未来Stopped尚未观测，旧16:54仍Cancelled。不强停或删除。最终
完整性扫描解析32份证据JSON，核对11个当前源码、两份公开可执行产物、三份下载服务器
证据包及99个已改／公开报告文本的本地秘密标记，不输出标记值。私有指令规范前缀且
忽略、暂存区空、锁文件不变、文档及空白检查通过。索引CLI仍不可用，不声称Permio索引
新鲜；本切片未改共享milestone Markdown／生成HTML，未提交或推送。

### 2026-10-16 — Explicitly approved single Preprod deployment

The user subsequently replies `approved` to exactly one deployment-only
Preprod transaction using the existing local test wallet. The scope permits
test-DUST expenditure and permanent test-network contract state, but excludes
template activation and any wallet, credential or private-proof-input upload.
This supersedes the pending operational approval above, not an architecture
decision or the outstanding M6 acceptance gates. Reuse the same public binary,
source revision and limits; no toolchain or private-input destination changes.

用户随后明确回复approved，仅批准使用既有本地测试钱包执行一次Preprod仅部署交易，
允许花费测试DUST并创建永久测试网合约状态，不含激活模板、上传钱包、凭据或私密证明
输入。这解决上述操作授权等待，不改变架构或尚未完成的M6验收。复用同一公开二进制、
源码版本及限制，不更换工具链或私密输入目标。

Restart the owned prover and verify loopback health200, non-loopback timeout,
RAM high2GiB/max3GiB/swap1GiB and CPU100%. The first approved launcher call
fails `Invalid ReadWritePaths`: systemd parses a list of paths separately from
shell argument quoting, and this workspace path contains spaces. Read back the
deployment unit as not-found/inactive/dead and verify its output file does not
exist before retrying. Quote the path inside the systemd property value; retain
the same exact logs-only write permission, with no broader writable directory.
This failed call never starts a wallet client and is not a submitted transaction.

重启自有证明器，核对回环健康200、非回环超时、RAM软阈值2GiB／硬上限3GiB／swap1GiB
及CPU100%。首个获批启动调用报Invalid ReadWritePaths：systemd路径列表的解析独立于
shell参数引号，而工作区路径含空格。重试前读回部署unit不存在且未运行，核实输出文件
不存在。在systemd属性值内部为路径加引号，仅保留精确logs目录可写，不扩大可写目录。
失败调用没有启动钱包客户端，也不是已提交交易。

The corrected deployment service starts at16:54:41 Asia/Shanghai, with
MemoryHigh1GiB, MemoryMax1536MiB, MemorySwapMax512MiB, CPU100% and a
1200-second service deadline. Keep raw worker stderr/stdout and raw prover
output suppressed. Public phases advance from preflight to restore by16:57;
all six preflight checks pass before wallet loading. Record the actual final
outcome and resource counters below rather than treating service startup or
wallet restoration as successful deployment.

修正后的部署服务于上海16:54:41启动，RAM软阈值1GiB、硬上限1536MiB、swap512MiB、
CPU100%、整体服务期限1200秒，继续屏蔽worker及证明器原始输出。至16:57公开阶段由
preflight进入restore，六项预检均在加载钱包前通过。实际最终结果及资源计数另记，不能
把服务启动或钱包恢复当成部署成功。

The first approved client exits1 at17:02:30 Shanghai. All six preflight gates,
full SDK restore, strict synchronization and positive spendable DUST pass.
The contract proof-provider boundary completes in8.916825ms, then execution
fails before the guarded submission wrapper: no submission-attempt event,
candidate ID, returned ID or contract address exists in this run. The pinned
Midnight.js4.1.1 implementation awaits `walletProvider.balanceTx` after proving
and before `midnightProvider.submitTx`; testkit's balance method only creates,
signs and finalizes a local recipe. It does not submit. Preserve this evidence
before any further attempt. The generic supervisor report conservatively asks
for reconciliation on every failed submit scope; source-path and event
inspection establish that this particular run never reaches submission.

首次获批客户端于上海17:02:30以exit1结束。六项预检、完整SDK恢复、严格同步及可花费
DUST为正均通过。合约proof-provider边界耗时8.916825ms，随后在受保护提交封装前失败；
本次没有提交尝试事件、候选ID、返回ID或合约地址。固定Midnight.js4.1.1实现依次等待
证明、walletProvider.balanceTx、midnightProvider.submitTx；testkit的balance只创建、
签署并完成本地recipe，不提交。进一步尝试前先保存证据。通用监督报告保守地要求所有
失败提交范围先核对，而本次通过源码路径及事件检查确认未到达提交。

Preserve client cgroup peak660086784bytes, swap0, CPU353508670000ns,
start/exit monotonic158294268169/158737685580microseconds:443.417411seconds.
The wall-clock span differs and is not substituted for monotonic duration.
Result is exit-code, not an observed OOM kill; prover peak is9347072bytes.
Do not call an8.9ms provider boundary a real cryptographic proof benchmark or
declare Preprod prover compatibility. The current logs deliberately suppress
the underlying exception, so fee balancing/finalization's precise failure is
not known from this revision. Neither positive DUST nor this provider return
guarantees sufficient transaction fees or successful deployment.

保存客户端cgroup峰值660086784字节、swap零、CPU353508670000ns、单调时钟起止
158294268169／158737685580微秒，即443.417411秒；墙钟跨度不同，不替代单调耗时。
结果为exit-code，未观测到OOM杀进程；证明器峰值9347072字节。不能把8.9ms provider
边界当作真实密码证明基准或据此称Preprod证明器兼容。该版本有意屏蔽底层异常，故
费用平衡／最终化的精确失败原因尚不明。DUST为正或provider返回均不保证费用足够、
部署成功。

Add optional fixed balancing phases to the provider and pass them through
the parent's explicit allowlist. Classify only bounded own data properties,
at most four cause nodes; never invoke getters/toJSON or copy raw SDK messages,
URLs, bodies, balances, transaction bytes or witnesses. Add two provider cases
for fixed labels/no submission and accessor/proxy/cycle/depth privacy; extend
the existing supervisor case to reject non-allowlisted balancing text. The
18 focused cases pass with normal filesystem access; a prior restricted run
fails synthetic `git init`, not live wallet logic. Start an exclusive v2 unit
with the same wallet, network and hard limits, leaving v1 evidence intact.
This diagnostic retry does not repeat an uncertain submitted transaction or
authorize a second on-chain deployment. No architecture/fee/funding bypass.

给provider增加可选固定平衡阶段，经父进程显式白名单转发。分类只读取自身数据属性，
最多四层cause，不调用getter／toJSON，不复制SDK原始消息、URL、响应体、余额、交易
字节或witness。新增两项provider测试覆盖固定标记／不提交以及accessor／proxy／循环／
深度隐私，扩展既有监督测试以拒绝非白名单平衡文本。正常文件权限下18项针对性测试
通过；此前受限运行失败于合成git init，不是实际钱包逻辑。用同一钱包、网络及硬上限
启动独占v2 unit，保留v1证据。该诊断重试不是重复结果未知的已提交交易，也不授权
第二次链上部署；不绕过架构、费用或资金要求。

The v2 run exits1 at17:15:43 Shanghai with the new fixed label
`wallet-balance-failed-local-prover-failure`, after restore/sync/DUST gates and
an8.761805ms contract provider return. There are still zero submission events
or IDs. Peak568778752bytes, swap0, CPU342582336000ns; monotonic span509.000228s
from158963432266 to159472432494microseconds. Prover peak9842688bytes,
swap0. Preserve all v2 report hashes in `preprod-deployment-verification.json`.
An interrupted approval-review call does not execute its requested log read;
after the user's continuation, normal approved state inspection works again.
The earlier full test process handle is no longer available, so do not infer
its final outcome. Rerun with retained public output: root341/341 passes,
Midnight158 in147129.6587ms and Hardhat6 in4249ms, zero failed/skipped.

v2于上海17:15:43以exit1结束，新增固定标记为wallet-balance-failed-local-prover-failure；
恢复／同步／DUST检查均通过，合约provider返回耗时8.761805ms，仍无提交事件或ID。
峰值568778752字节、swap零、CPU342582336000ns，单调时钟起止158963432266至
159472432494微秒，即509.000228秒；证明器峰值9842688字节、swap零。v2报告摘要均保留
于部署证据。一次审批审查中断未执行所请求的日志读取；用户继续后正常审批状态检查
恢复。此前完整测试进程句柄已不可用，不推断最终结果；保留公开输出重跑根检查，
341／341通过，Midnight158项147129.6587ms、Hardhat六项4249ms，零失败／跳过。

Inspect only public cache filenames/sizes: BLS parameters are present, but
there are no built-in DUST/Zswap artifacts, and k11/k12 are also absent.
The prior check for an existing cache directory was insufficient. Inspect
the official exact `ledger-8.1.0` source, not the moving main branch: startup
prefetches k10..15 and four built-in circuits; DUST resolution needs its prover,
verifier and binary IR. `--no-fetch-params` skips startup prefetch and the
fetch endpoint, but the request resolver still has on-demand fetch behavior.
The actual outbound deny and read-only cache prevent those missing-file
downloads during private proving. This explains a concrete local setup gap;
successful fee proving after correction is still required to confirm causality.

只检查公开缓存文件名及大小，发现有BLS参数，但没有内置DUST／Zswap产物，k11／k12也
缺失。此前仅检查缓存目录存在是不充分的。核对官方精确ledger-8.1.0源码，而非变动main：
启动预取k10至15及四个内置电路；DUST解析需要prover、verifier及二进制IR。no-fetch-params
跳过启动预取及fetch端点，但请求解析器仍有按需获取逻辑；实际出站拒绝及只读缓存阻止
私密证明期间补下载缺失文件。这解释了一个明确本地配置缺项，仍须修复后费用证明成功
才能确认因果。

Download14missing public files from `https://srs.midnight.network/` into a new
ignored directory, bounded128MiB/file and60seconds/request, verifying SHA-256
against exact official release checksums. The static artifact namespace is9
in ledger8.1.0 itself; `dust/9`/`zswap/9` is not a Ledger9 upgrade. Total key
material is modest; the DUST proving key is2175671bytes. Provision only absent
files using exclusive copies and reverify18files including existing k10/13/14/15.
No overwrite/deletion, wallet load or witness transfer. Preserve public download
report SHA21e7dcc5a6ffe38fd5cc25a39dbe47a36938352b1b6b5608a10588eda7202791.
Add this public cache check before prover/client start and explicitly select
the same cache. Restart the unchanged8.1.0 binary, reverify loopback-only access,
same memory limits and version/ready endpoints, then start exclusive v3 at
17:30:05 Shanghai under the still-unused single-submission approval.

从上述官方SRS下载14份缺失公开文件到新的忽略目录，每份最多128MiB、请求最多60秒，
按精确官方版本校验值核对SHA-256。ledger8.1.0本身的静态产物命名空间为9，dust/9及
zswap/9不代表升级Ledger9；DUST证明密钥仅2175671字节。仅以独占复制补齐不存在文件，
连同既有k10／13／14／15共复核18份，不覆盖、不删除、不加载钱包、不传witness。保留
上述下载报告摘要。证明器／客户端启动前增加公开缓存核验，并明确指定同一缓存。
重启不变8.1.0二进制，复查仅回环访问、原内存限制及version／ready端点，再于上海
17:30:05启动独占v3，仍使用尚未发生提交的单笔授权。

The cache-fixed v3 now completes wallet balancing/finalization, so the local
fee-proof failure is cleared. It exits1 at17:38:06 before the observer's
submission event. Client peak675127296bytes/swap0, CPU353236280000ns,
monotonic160267708318..160709451421microseconds:441.743103seconds. Prover
peak88612864bytes/swap0, CPU2742846000ns, demonstrating actual fee-proof
work under the existing3GiB cap, not the large ordinary-action proof.
Contract provider return7.434197ms is still not the fee-proof duration.
Do not merge unrelated measurement boundaries into one performance number.

缓存修正后v3完成钱包费用平衡／最终化，因此本地费用证明故障已排除，但于上海
17:38:06在观察器记录提交事件前exit1。客户端峰值675127296字节／swap零、CPU
353236280000ns，单调时钟160267708318至160709451421微秒，即441.743103秒；证明器
峰值88612864字节／swap零、CPU2742846000ns，说明实际费用证明在原3GiB上限内执行，
不等于大型普通动作证明。合约provider返回7.434197ms仍不是费用证明耗时，不能把
不同测量边界混成同一个性能数字。

Find a second concrete integration bug: the new public submission observer
incorrectly assumes a transaction ID is a bare32-byte/64-hex hash. A wallet-free
real Ledger8.1.0 `Transaction.fromParts(...).addIntent(...)` returns66hex
characters with type byte00. The pinned official `TransactionIdentifier`
enum has Merged/Unique variants; the public encoding is a one-byte variant
plus32bytes, not a `0x`-prefixed bare hash. Correct candidate/returned guards
to00/01plus64hex and require the returned ID to match a recorded candidate.
Add a real-SDK regression, rejecting bare hashes, type02,0x wrappers, wrong
length and private text; unknown outcomes still produce exactly one call,
never automatic resubmission. All ten focused runner cases and strict types
pass. This is public-format validation, not changing commitment/hash schemes.

发现第二个具体接线错误：新公开提交观察器误把交易ID当作32字节／64位十六进制裸
哈希。不加载钱包、调用真实Ledger8.1.0构造Transaction并添加Intent，得到带00类型
字节的66位十六进制ID。固定官方TransactionIdentifier枚举含Merged／Unique变体，公开
编码为一字节类型加32字节，不是带0x的裸哈希。把候选／返回检查改为00／01加64位
hex，并要求返回ID属于已记录候选。增加真实SDK回归，拒绝裸哈希、02类型、0x封装、
错误长度及私密文本；未知结果仍只调用一次，绝不自动重提。十项runner针对性检查及
严格类型通过。这是公开格式校验修复，不是改变承诺或哈希协议。

Start the exclusive v4 at17:41:26 Shanghai, same private input selectors,
cache/hash gate, pinned binaries,1.5GiB client/3GiB prover ceilings and no
automatic transaction retry. This is still the authorized first submitted
deployment; prior v1/v2/v3 each failed before their submit call. Keep their
public logs immutable and distinguish their source hashes from the typed-ID
fix. Final complete root check after this fix passes342/342: diagnostics77,
protocol6, scenario15/14/16, accounts50, Midnight158 in159369.5418ms and
Hardhat6 in3528ms; zero failed/skipped and exit0. Do not reuse the earlier
341-case result as verification of the newly changed observer.

独占v4于上海17:41:26启动，私密输入选择器、缓存／哈希检查、固定二进制、客户端
1.5GiB／证明器3GiB上限均不变，不加交易自动重试。它仍将是获批的首笔实际提交，
此前v1／v2／v3各自在提交调用前失败。保持其公开日志不变，区分它们的源码摘要与
修复ID后的版本。修复后完整根检查342／342通过：诊断77、协议6、场景15／14／16、
账户50、Midnight158项159369.5418ms、Hardhat六项3528ms，零失败／跳过、exit0；
不挪用此前341项结果来证明新观察器已验证。

This continuation runs private proving locally and does not use ECS for jobs,
so retain the existing17:47 economical stop rather than restart unused compute.
Using the installed Alibaba Cloud skill and exact-target sanitized lifecycle
helper, read back after the deadline: OOS execution
`exec-894d34957b6a4d89a9c7` Success, instance `i-t4ni11rkjyzgi0vlb68d`
Stopped, actual StoppedMode StopCharging, empty AutoReleaseTime. Instance,
disks and tools are preserved. No new lifecycle mutation or deletion is made;
this now verifies actual economical stop, not only a waiting schedule.

本次私密证明在本地执行，未使用ECS跑任务，因此保留既有上海17:47节省停机，不重启
无须使用的计算资源。按已安装阿里云技能，通过精确目标且输出脱敏的生命周期工具，
期限后读回上述OOS执行Success、指定实例Stopped、实际StoppedMode为StopCharging、
AutoReleaseTime为空。保留实例、磁盘及工具，本轮未新增生命周期变更或删除。这次
已验证实际节省停机，不只是等待中的计划。

The approved deployment finally succeeds. v4 emits one submission attempt at
09:51:00.336UTC, returns an ID at09:51:19.275, reports deployment09:51:21.515,
and verifies exact indexed constructor network/root with an empty template
registry09:51:33.121. Parent reports scope=deployment/PASS/exit0 at09:51:33.908.
The two candidate identifiers belong to one merged transaction, not two
deployments. Returned ID:
`006db918f4c6b90ab2dcc429370936b624dd5df5569b1b9f9f71b4ab803726e687`.
Contract address:
`7bf33bb7409fac2f85f6ad4e14a211707440b3ea36537c54085cf1157685cbdd`.
Input snapshot hashes pass the final unchanged check; private inputs remain
local and no template/module/instance activation occurs.

获批部署最终成功。v4于UTC09:51:00.336记录唯一提交尝试，09:51:19.275返回ID，
09:51:21.515报告部署，09:51:33.121核对精确索引构造网络／根及空模板注册表；父进程
09:51:33.908报告deployment范围PASS／exit0。两个候选标识属于同一合并交易，不是
两次部署。返回ID及合约地址如上，输入快照最终摘要核对未变，私密输入留在本地，
未激活任何模板、模块或实例。

A separate bounded child performs token-only public queries, without a wallet,
proof input or submission operation. At09:52:09.169UTC it independently checks
SucceedEntirely, block3004405/hash
`81e571fea6a5b6490a2a831cc7abcf67b8b8665917ccd574ebea14569690d58d`,
protocol1000300, matching candidate/returned/finalized IDs and original/latest
authority roots. Root version/sequence1, all three thresholds2; template,
module, instance, activation-session, admission-nonce and lifecycle counters
remain zero, credential status sequence0. It suppresses raw SDK outputs and
retains only this whitelisted public result. Reader report hash
`b76d11e8b989216b46dca152a0fce6e200f4a0ea230e6fe353e56552a2790677`.

另一个有时限的子进程仅凭token查询公开状态，不使用钱包、证明输入或提交操作。
UTC09:52:09.169独立核对SucceedEntirely、区块3004405／上述哈希、协议1000300、候选／
返回／最终ID一致，以及原始和最新权限根一致。根version／sequence为1，三项阈值均2；
模板、模块、实例、激活会话、准入nonce及生命周期计数均零，凭据状态序号零。屏蔽SDK
原始输出，仅保留白名单公开结果，读取报告摘要如上。

Successful client timing is monotonic160892876379..161451139438microseconds,
558.263059seconds; wall span17:41:26..17:51:33 is different. Peak677834752bytes,
swap0, CPU365328501000ns. The3272ms wall interval from contract-provider return
to submission observation includes fee balancing/proving/finalization and
observer overhead; not pure crypto or an ordinary-action benchmark. Reused
prover lifetime peak88612864bytes/swap0 and CPU5015932000ns include both v3/v4
and idle time, not isolated v4 proving. Preserve final counters before stopping
only the four owned client units and owned prover. Read back all five as
not-found/inactive/dead, port6300 absent. No source, wallet, public parameter or
evidence deletion. The earlier temporary SDK scratch is owned and private.

成功客户端单调时钟起止160892876379至161451139438微秒，即558.263059秒，墙钟
17:41:26至17:51:33不同。峰值677834752字节、swap零、CPU365328501000ns。合约provider
返回至观察提交的3272ms墙钟区间包含费用平衡／证明／最终化及观察开销，不是纯密码学
或普通动作基准。复用证明器生命周期峰值88612864字节／swap零及CPU5015932000ns
包含v3／v4与空闲时间，不是独立v4证明。保存最终计数后只停止四个自有客户端unit及
自有证明器，五个均读回不存在且未运行，6300端口无监听。不删除源码、钱包、公开参数
或证据；之前SDK临时scratch属于本次自有私密目录。

Keep the acceptance boundary explicit: exact constructor deployment and the
wallet fee-proof path are now verified on real Preprod. Current proof-module/
template governance, slot/action authorization, receipts and reconnect/restart
remain pending; M6 is not complete. No commit or push. Fixture signing keys
are deliberately ephemeral and no across-run resume is implemented, so the
next governance scope requires a fresh fixture deployment and multiple test
transactions. That needs new authorization beyond the completed one-deployment
scope, not an implicit second deployment or secret persistence/upload.

明确验收边界：真实Preprod已验证精确构造部署及钱包费用证明路径；当前证明模块／模板
治理、槽位／动作授权、收据及重连／重启仍待验收，M6未完成，未提交Git或推送。Fixture
签名私钥有意保持临时性，未实现跨运行恢复，因此下一治理范围需要新的fixture部署及
多笔测试交易，须获得超出已完成单笔部署范围的新授权，不能默认为第二次部署或保存／
上传秘密。

### 2026-10-16 — Approved Preprod governance acceptance sequence

The user replies `approve` to the explicitly described next scope: fresh test
deployment, multiple Preprod test-DUST transactions and fixture-template
activation. Review the complete existing `--submit-governance` path before
launch:17planned successful transactions, including module proposal, two
reviews/two approvals, activation, deliberately expiring staging, one exact
action binding/finalization, two authority-root approvals, module deprecation/
revocation and template retirement/revocation. Allocation, credentials, slots
and ordinary actions are not selected. Existing negatives execute generated
Compact preflight; do not describe them as node-rejected transactions.

用户明确回复approve，批准此前说明的下一范围：新的测试部署、多笔Preprod测试DUST
交易及测试模板激活。启动前核对既有submit-governance完整路径：计划17笔成功交易，
包括模块提案、两次审核／两次批准、激活、有意过期的staging、一个精确动作绑定／
最终化、两次权限根批准、模块弃用／撤销及模板退役／撤销。不选择分配、凭据、槽位
或普通动作。既有负面调用在生成Compact预检执行，不能称为节点拒绝交易。

The authoritative worktree remains branchfeat/m6-m8-midnight-delivery at
f2d8689f95d9294a92f6b2e2b8718d31121dde81 with the prior dirty implementation
preserved. Private instruction copy starts with the exact canonical guide,
is ignored/untracked, with no extra local appendix. Devin wiki still covers
throughM5 and codebase-index health belongs toinformation-flow, not Permio.
Verify all11current source hashes against prior successful deployment evidence;
root342/342 already passed for these unchanged source files. No compiler,
dependency, lockfile, generated asset, architecture or M5 change for launch.

权威工作树仍为上述分支及提交，保留此前未提交实现。私有指令副本与规范指南前缀
完全一致、已忽略且未跟踪，无额外本地附录。Devin wiki仍只覆盖至M5，索引健康状态
属于information-flow而非Permio。按此前成功部署证据核对11个当前源码摘要；同一
未变化源码已完整通过342／342。启动未改编译器、依赖、锁文件、生成产物、架构或M5。

Reverify18public cache files plus existing k16..20 BLS hashes before accepting
private input. Start exclusive owned governance prover/client units, preserving
the prior deployment units/logs. Same2/3GiB prover high/max and1GiB swap,
same1/1.5GiB client high/max and512MiB swap, one CPU/worker/job,600second
proof timeout. Retain the existing one-hour runner deadline; outer systemd
guards3660seconds allow owned termination/report cleanup for this longer
multi-transaction scope. No signed staging/lifetime deadline is extended.
Verify health200loopback and timeout000on the VM's real non-loopback address.
No raw SDK/prover output, credential transfer, fresh-wallet fallback or
automatic transaction retry. ECS remains stopped; this run is local WSL.

接收私密输入前复核18份公开缓存及既有k16至20的BLS摘要。使用独占自有治理证明器／
客户端unit，保留先前部署unit及日志。证明器软阈值2GiB／硬上限3GiB、swap1GiB，
客户端软阈值1GiB／硬上限1.5GiB、swap512MiB，单CPU／线程／任务、证明超时600秒
均不变。保留runner既有一小时期限，外层systemd保护3660秒为此次较长多交易范围
留出自有终止及报告清理，不延长签名staging／生命周期期限。实测回环健康200、VM
真实非回环地址超时000。不输出SDK／证明器原始日志、不传凭据、不新建钱包回退、
不自动重提交易。ECS保持已停机，本次在本地WSL运行。

Clarify a fixture-key caveat found while reviewing the actual path: M4
Ed25519 reviewer keys are freshly generated in memory, but the Midnight
authority scalars in this acceptance script are deterministic public test
constants. They are not secret production governance keys and must not secure
real customer state. The real funding wallet is separate and stays private
locally. The across-run integration limitation is the absence of a supported
resume workflow and persisted exact fixture openings, not a claim that every
test authority scalar is unrecoverable. Earlier wording that generalized all
fixture authority keys as ephemeral is imprecise; this source-specific record
corrects it without adding key persistence or changing the architecture.

核对实际路径时明确一个测试密钥限制：M4的Ed25519审核密钥每次在内存新生成，但该
验收脚本中的Midnight权限标量是确定性公开测试常量，不是保密的生产治理密钥，不能
用于保护真实客户状态。真实资金钱包独立且留在本地私有。跨运行集成限制是没有受支持
的恢复流程、没有持久化精确fixture opening，而不是所有测试权限标量都无法找回。
此前笼统称全部fixture权限密钥临时性并不精确，本次按源码明确纠正，不增加密钥持久化
或改变架构。

### 2026-10-16 — Governance deployment succeeds; proposal submission requires reconciliation

The approved governance client runs18:01:46..18:10:33Shanghai; monotonic
162014600353..162497559216microseconds gives482.958863seconds. All six
preflight gates, exact wallet restoration, strict SDK synchronization and
positive spendable DUST pass. The fresh contract is
`8a4bf1770424eb78831605ef7a0464668a3dc475633455719bffe4acdbcef8ad`.
Its returned transaction identifier is
`00e9957d3ff2b622d1c489a259aef8a9eb648874f7709360aa67d51cc9fd0276b4`.
Independent indexer reads confirmSUCCESS at block3004592, transaction hash
`797a390f2a06646e9e800b12fcebbdf2176931610f19fdcd32513c19e4a56d1b`.

已批准的治理客户端于上海时间18:01:46至18:10:33运行，单调时钟上述差值为
482.958863秒。六项预检、精确钱包恢复、SDK严格同步及可用DUST余额均通过。
新合约地址、返回交易标识及交易哈希如上，独立索引器读取确认区块3004592成功。

The next call,proposeProofModule, completes its contract proof provider in
13820.2025ms and wallet balancing before the observed submission attempt at
10:10:30.731UTC. The existing provider then withholds the raw exception and
the owned worker exits1at10:10:33.159UTC. Neither a returned proposal ID nor a
module-proposed event is observed. This does not establish the original node
rejection reason. Client peak733827072bytes/swap0 and prover peak517910528bytes/
swap0 are below the unchanged caps; this is not an observed OOM or memory-limit
failure. The proof-provider timing excludes wallet balancing and chain finality.
Only one of17planned governance transactions is confirmed; no module/template
activation or instance allocation is claimed.

下一调用proposeProofModule的合约证明provider耗时13820.2025ms，钱包配平也已完成，
UTC10:10:30.731观察到提交尝试。既有provider随后屏蔽原始异常，自有worker于
10:10:33.159以1退出。未观察到提案返回ID或module-proposed事件，因此不能确定
原节点拒绝原因。客户端峰值733827072字节、证明器517910528字节，swap均零，
均低于未变的上限，没有观察到OOM或内存上限失败。证明provider计时不包含钱包
配平及链上最终确认。计划17笔中仅确认1笔，不宣称模块／模板已激活或已分配实例。

Preserve both public proposal candidates before any retry:
`0076bb73b84ba99c61c40b5fc5528b4e37ef121bdbec6b4a8cb2311094e2442765`
and`00bbe3ad9b3284d5df0cf25608d1fac5b19ea0dd7872d49b7ab2d7cafaae4af000`.
At10:17:19.660UTC/indexer tip3004664, neither is indexed and the queried node
pending pool is empty. Registry modules/templates/instances and module/template
activation sequences remain zero. These observations do not prove final rejection
or establish a safe blind resubmission. The first reconciliation-reader failure
was a corrected local parser assumption: the pinned GraphQLtransactions field
returns an array, not an object. Preserve its failed report; do not attribute
that failure to network availability.

任何重试前保留上述两个公开提案候选标识。UTC10:17:19.660、索引器高度3004664时，
两者均未被索引，所查询节点的待处理池为空。登记表模块／模板／实例及相关序号仍零。
这些观察不能证明最终拒绝，也不能据此盲目重提。首份对账读取失败来自本地解析假设，
已按锁定SDK修正GraphQLtransactions返回数组而非对象；保留失败报告，不能归因网络。

Token-only capability probing at10:21:31.140UTC observes runtime spec1000300,
transaction version3. RPCmethods lists system_dryRun, but a malformed,
non-transaction probe receives-32601with an unsafe/denied label. No wallet is
loaded for this probe. The node metadata exposesTaggedTransactionQueue
validate_transaction via read-onlystate_call with source/extrinsic/blockHash
arguments. This is a diagnostic alternative, not a contract architecture change
or replacement acceptance gate. At18:22:46Shanghai start a separate owned,
bounded diagnostic: restore the same local wallet, prepare/prove/balance a
synthetic proposal against the confirmed existing address, and intercept
submission to call only runtime validity checking. The guard never calls the
underlying wallet submission method or persists serialized transactions. Its
result cannot retroactively resolve the exact earlier transaction or prove
governance finality. Private inputs and proof witnesses remain local; ECS stays
unused and stopped. No new deployment, automatic retry, compiler upgrade,
architecture substitution, commit or push.

UTC10:21:31.140仅用token的能力探测观察到runtime spec1000300、交易版本3。
RPC列表虽有system_dryRun，但非交易的畸形参数探测返回-32601及unsafe／denied
类别，此探测不加载钱包。节点metadata提供经只读state_call执行的
TaggedTransactionQueue.validate_transaction，参数为source／extrinsic／blockHash。
这只是诊断替代接口，不改变合约架构或验收门槛。上海18:22:46启动独立、有时限的
自有诊断：恢复同一本地钱包，对已确认地址准备／证明／配平合成提案，在提交入口
拦截并仅执行runtime有效性检查。保护逻辑不调用底层钱包提交，也不持久化交易字节。
其结果不能追溯确定原交易结果，亦不证明治理最终确认。私密输入及证明witness留在
本地，ECS不使用并保持停机。不新部署、不自动重试、不升级编译器、不替换架构，
不提交Git或推送。

Refresh the complete existing check suite without changing dependencies or test
guards. A first inline WSL launcher mis-interpolatesPATH; the fixed-path WSL
attempt passesdocs:check but lacks the platform-specific
`@typescript/typescript-linux-x64` optional package. Do not reinstall the shared
Windows node_modules. The native restricted attempt passestypecheck but hits
HardhatHHE22local-installation resolution. The same native command with approved
normal filesystem access then completes`npm run check` with exit0: docs,
TypeScript, Solidity build, every configured test group and all six Hardhat
tests. Midnight package158/158,0failed/skipped,184737.8517ms; Hardhat reports
4621ms. Same source as the recorded342-test suite; no guard bypass, dependency
or toolchain change. The public check-summary JSON preserves preceding failures
instead of labeling those launches as successful checks.

未更改依赖或测试保护，重新运行完整检查。首次WSL内联启动的PATH插值出错；改为
固定PATH后，WSL通过docs:check，但缺少Linux专用TypeScript可选包。不重装共享的
Windows node_modules。受限Windows运行通过typecheck，但遇到HardhatHHE22本地
安装解析失败；同一Windows命令在批准的正常文件访问权限下完整通过npm run check，
退出0：文档、TypeScript、Solidity构建、全部测试组和六项Hardhat测试均通过。
Midnight包158项全部通过、无失败／跳过，耗时184737.8517ms；Hardhat报告4621ms。
源码仍与此前342项测试版本一致，没有绕过保护或更换依赖／工具链。公开检查摘要保留
此前失败，不能把失败启动也记为检查成功。

The first non-submitting diagnostic exits beforeprepare/prove/balance, with
last observed phasesynchronize and no node-validity response. Its393.952736
monotonic seconds, peak624590848bytes/swap0 and exit1are preserved; it does not
diagnose the original failed submission. Keep its source/report immutable.
Start a second diagnostic revision with fixed per-stage labels and boolean
wallet-readiness reporting; move public-state/proposal preparation before the
costly restoration. It passes those preparation steps before restoring again.
No positive-DUST or strict-synchronization gate is bypassed. These are diagnostic
attempts, not extra on-chain transactions or governance acceptance.

首个不提交交易的诊断在prepare／prove／balance前退出，最后观察阶段为synchronize，
没有节点有效性结果。保留其单调耗时393.952736秒、峰值624590848字节／swap零及
退出1，不能据此诊断原始失败提交。保留源码及报告不变。第二版增加固定阶段标签和
钱包就绪布尔值，把公开状态／提案准备移至昂贵恢复之前；这些准备步骤已通过，再
恢复钱包。不绕过正DUST余额或严格同步门槛。这些是诊断尝试，不是额外链上交易或
治理验收。

The second diagnostic also exits after phasesynchronize, before proof/balance,
without a detailed worker report reaching the retained parent result. Do not
infer insufficient funding or a specific network problem from that absence.
Its356.399165monotonic seconds and CPU281591915000ns are retained. systemd's
post-exit MemoryPeak213561344bytes is a cached reading, not an established
whole-run maximum. This reporting limitation motivates a third diagnostic:
preserve child exit code/signal, the last fixed phase and any worker report,
and installuncaughtExceptionMonitor only to observe fixed error categories,
numeric codes and dependency-only stack frame names. It does not swallow a
fatal error or permit submission. Start at18:40:44Shanghai with the exact v2
worker and unchanged guards; an independent bounded sampler reads only the
exact owned cgroup's numeric memory/event files while alive. No raw stderr,
private error body, credential URL or wallet payload is retained.

第二版诊断也在synchronize之后、证明／配平之前退出，详细worker报告未到达保留的
parent结果。不能据此推断资金不足或某个具体网络问题。保留单调耗时356.399165秒及
CPU281591915000ns；退出后systemd的MemoryPeak213561344字节为缓存读取，不能认定
为完整运行峰值。因此第三版保留子进程退出码／信号、最后固定阶段及任何worker报告，
仅安装uncaughtExceptionMonitor观察固定错误类别、数字错误码及仅依赖包的堆栈帧名。
它不吞掉致命异常，也不允许提交。上海18:40:44启动，复用精确v2 worker及相同保护；
独立有时限采样器只读取运行中的精确自有cgroup数字内存／事件文件。不保留stderr
原始内容、私密错误正文、带凭据URL或钱包载荷。

At10:47:02.136UTC the third diagnostic capturesuncaughtException at
synchronize, child exit1/no signal, no worker report and no submission. Its
fixed classifier remainsunknown; do not invent the hidden cause.92actual
cgroup samples observe peak630743040bytes, swap0, high/max/OOM/OOM-kill0.
This is not the original proposal's rejection reason. As a diagnostic setup
test, defer the extra standalone node WebSocket until the blocked submission
hook, after the synchronous cold restoration and proof/balance. Do not change
the contract, provider profile, memory limits, checkpoint or submission behavior.

UTC10:47:02.136第三版捕获synchronize阶段uncaughtException，子进程退出1、无信号，
没有worker报告或交易提交。固定分类仍unknown，不能编造被隐藏的原因。92次实际
cgroup采样观察峰值630743040字节、swap零、high／max／OOM／OOM-kill均零。这不是
原提案拒绝原因。作为诊断设置试验，将额外独立节点WebSocket推迟至被阻断的提交入口，
即同步冷恢复及证明／配平之后，不改变合约、provider配置、内存限制、检查点或提交行为。

Fourth diagnostic starts18:49:31Shanghai and ends10:57:16.993UTC;
monotonic427.618312seconds, CPU332883235000ns. It now passes strict wallet sync,
positive spendable DUST and ready-for-transactions; connects the existing
contract, proves and balances, and reachesread-only runtime validation. The
read-only call fails without a validity response; the worker safely reports
failure and exits0, and the parent correctly marksFAIL/exit1. No fatal exception
is observed and no wallet submission is invoked. This supports the deferred
connection diagnostic setup, not a proven original rejection cause.138live
samples record peak711507968bytes, swap0, high/max/OOM/OOM-kill0. Post-exit
systemd caches only150347776bytes; use the live samples, not that cached value,
for the observed peak. Neither result is an ordinary-action benchmark.

第四版于上海18:49:31开始、UTC10:57:16.993结束，单调耗时427.618312秒，CPU
332883235000ns。现已通过严格钱包同步、正可用DUST余额及交易就绪，连接现有合约、
完成证明及配平，到达只读runtime验证。只读调用失败，未获得有效性响应；worker
安全报告失败并退出0，parent正确标记FAIL／退出1。没有观察到致命异常，也不调用
钱包提交。这支持推迟连接的诊断设置，但不能证明原拒绝原因。138次实时采样记录
峰值711507968字节、swap零、high／max／OOM／OOM-kill均零；退出后systemd仅缓存
150347776字节，观察峰值须用实时采样而非该缓存。两者都不是普通动作性能基准。

Separately at10:54:01.106UTC, token-only chain-time reading finds finalized
block3005031timestamp10:53:42UTC,19106msbehind local wall time. Finalized-block
age includes finality delay and does not establish clock skew; no clock changes.
At10:58:57.566UTC, a wallet-free probe calls the same read-only runtime validity
API with an unsigned empty system.remark, never submitting it. The call fails
with RPC4003/fixedruntime-execution category. That code is not established as
the original proposal or fourth diagnostic's exact error. Advertised methods
and metadata alone do not prove the diagnostic interface works. Keep both
failed diagnostics and successful readiness/proving steps distinctly recorded.

另于UTC10:54:01.106仅凭token读取链上时间：最终区块3005031时间为10:53:42UTC，
比本地墙钟早19106ms。最终区块年龄包含最终确认延迟，不足以证明时钟偏差，不修改
时间。UTC10:58:57.566不使用钱包的探测，将未签名空system.remark仅传入相同只读
runtime有效性API，不提交它。调用返回RPC4003／固定runtime-execution类别。
不能把该错误码当成原提案或第四版诊断的精确错误。列出方法或metadata不证明诊断
接口可工作。须分别记录诊断失败及已通过的钱包就绪／证明步骤。

Before stopping, retain exact six-unit numeric counters and actual prover
cgroup files. Prover lifetime peak519168000bytes/swap0, CPU29843541000ns,
high/max/OOM/OOM-kill0 cover both the original proposal and fourth diagnostic,
not one isolated proof. Stop only the owned governance client, prover and four
diagnostic units; all six read backnot-found/inactive/dead and port6300has no
listener. Preserve wallet inputs, source, parameters and public evidence; no
unrelated service or ECS lifecycle change. Complete native rootcheck passes;
private inputs, raw SDK errors and transaction bytes remain excluded from the
public artifacts. No template/module activation, ordinary action, receipt,
replay/restart acceptance, architecture change, commit or push is claimed.
The original proposal remains an unresolved submission; a later fresh fixture
run needs privacy-safe submission rejection reporting before another authorized
deployment, not a blind retry or fabricated success.

停止前保留精确六个unit数字计数及实际证明器cgroup文件。证明器生命周期峰值
519168000字节、swap零、CPU29843541000ns、high／max／OOM／OOM-kill均零，涵盖
原提案及第四版诊断，不是独立单个证明。只停止自有治理客户端、证明器及四个诊断
unit，六个均读回不存在／未运行，6300无监听。保留钱包输入、源码、参数和公开证据；
不影响其他服务或ECS生命周期。完整Windows根检查通过；公开产物排除私密输入、SDK
原始错误及交易字节。不宣称模块／模板激活、普通动作、收据、重放／重启验收，也
不改变架构、不提交Git或推送。原提案提交结果仍未明；后续新的fixture运行须先补
隐私安全的提交拒绝分类，再进行获授权的新部署，不能盲目重提或编造通过。

After cleanup, a final wallet-free public read at11:02:09.719UTC/indexer
tip3005113again confirms the deploymentSUCCESS at3004592, neither proposal
candidate indexed, pending count0and modules/templates/instances0. This remains
an unresolved outcome, not proof of rejection. The final integrity audit parses
34evidence JSONs, rechecks11current source hashes,13historical deployment and
27governance/diagnostic artifact hashes,14public prover artifacts and3downloaded
server bundles; scans144text files against configured secret markers without
printing markers. Private instruction copy remains canonical/ignored/untracked;
index empty, lockfile unchanged, documentation and whitespace checks pass.
Existing dirty milestone Markdown/generated HTML are preserved, not edited by
this governance run. Full M6 remains incomplete.

清理后，UTC11:02:09.719／索引器高度3005113的最终无钱包公开读取再次确认部署在
3004592成功、两个提案候选均未被索引、待处理数量零及模块／模板／实例零。结果
仍未明，不等于已拒绝。最终完整性审计解析34份证据JSON，复核11个当前源码、
13个历史部署及27个治理／诊断产物摘要、14份公开证明器产物和3份下载服务器包；
扫描144份文本中的已配置秘密标记，不输出标记。私有指令副本仍规范／忽略／未跟踪，
暂存区为空、锁文件未变，文档及空白检查通过。保留既有未提交的里程碑Markdown／
生成HTML，本次治理运行未编辑它们。完整M6仍未完成。

## 2026-10-17 — resumed Preprod governance diagnostics

The user explicitly chose the unfinished M6 governance tests. M4 remains
complete. The continuation preserves the dirty M6 worktree and its predecessor
gates. A bounded submission classifier now retains public failure categories,
numeric RPC/custom codes and the failing phase through the installed SDK's
Effect cause wrapper, without exposing credentials, witness payloads, raw
errors or transaction bytes. The checkpoint boundary still disposes wallet
resources and the supervisor cannot accept a run with a submission failure.
No automatic retry was added. The complete root check passes 348 tests
(342 Node and 6 Hardhat), including meaningful redaction and failure tests.

用户明确选择继续未完成的 M6 治理测试；M4 保持已完成。续作保留既有未提交的 M6
工作区和前置验收门槛。新的受限提交分类器通过已安装 SDK 的 Effect 原因封装，
保留公开失败类别、RPC／自定义数字错误码及失败阶段，不暴露凭据、见证载荷、
原始错误或交易字节。检查点边界仍释放钱包资源；存在提交失败时，监督进程不能
接受运行通过。没有新增自动重试。完整根检查通过 348 项测试（342 项 Node、
6 项 Hardhat），包括有实际意义的脱敏及失败测试。

The first fresh run with the existing 8.1.0 prover reaches deployment
submission and reports RPC 1010/custom 170. Public reconciliation finds no
indexed candidate and no pending extrinsics; absence alone does not prove
rejection. The official node error table maps 170 to InvalidDustSpendProof.
The next compatibility attempt uses the official proof-server 8.1.3 image,
whose digest matches its release. Only this public binary was extracted on ECS
and transferred through Workbench's OSS intermediary. Its compressed and
uncompressed hashes match locally, and all twelve circuit-metadata checksums
match the existing public cache. Wallet credentials and proof inputs stay
local; compiler, SDK, contract sources and keys are unchanged. This does not
establish that the patch caused the different outcome.

第一次新运行使用原有 8.1.0 证明器，在部署提交阶段报告 RPC 1010／自定义错误
170。公开核对未找到被索引的候选交易，待处理交易为空；仅凭缺失不能证明拒绝。
官方节点错误表把 170 映射为 InvalidDustSpendProof。下一次兼容性尝试使用官方
proof-server 8.1.3 镜像，其摘要与发布记录一致。ECS 只提取了这个公开二进制，
经 Workbench 的 OSS 中转传回本机；压缩及解压后的哈希均在本机一致，十二份
电路元数据校验和也与已有公开缓存一致。钱包凭据及证明输入留在本机，编译器、
SDK、合约源码和密钥未变。这不能证明结果变化是由该补丁导致的。

With 8.1.3, deployment is independently confirmed at block 3009273, address
`a25a52b5a465f90b82b2352c5e2f5146631729ae0a8c3fdf3f2abaf3fd911440`.
The module proposal completes proving and balancing but reports RPC
1010/custom 117, mapped to NotNormalized. No module or template is activated.
Live resource sampling records no memory high/max events, OOM kills or swap
use in either governance attempt. The old proposal's suppressed cause remains
unknown; these new codes must not be retroactively attributed to it.

使用 8.1.3 时，部署已独立确认在区块 3009273 成功，地址为上述值。模块提案完成
证明及配平，但报告 RPC 1010／自定义错误 117，映射为 NotNormalized。没有激活
模块或模板。两次治理尝试的实时资源采样都未记录内存 high／max 事件、内存不足
终止或 swap 使用。旧提案被丢弃的原始原因仍未知，不能把这些新错误码追溯归因
给旧提案。

Separate local diagnostics inspect only instruction counts. Synthetic calls
have 22 instructions and no adjacent no-ops before proving, after proving,
after binding and after actual test-wallet fee balancing. The final balanced
inspection sees one ContractCall, intercepts submission, confirms unchanged
public module/template state and verifies unchanged private input files. It
spends no DUST and is not governance acceptance. The published ledger 8.1.1
source checks adjacent no-ops for call normalization; unlike the later 8.1.3
security patch, it does not reject isolated noop 0. These observations narrow
the diagnosis without identifying the earlier transaction's defect. The failed
earlier after-proof diagnostic is retained alongside the successful follow-up.

独立的本机诊断只检查指令数量。合成调用在证明前、证明后、绑定后，以及实际测试
钱包完成手续费配平后，均为 22 条指令且没有相邻空操作。最终配平检查只看到一次
ContractCall，在提交前拦截，并确认公开模块／模板状态和私有输入文件保持不变。
它不花费 DUST，也不是治理验收。已发布的账本 8.1.1 源码检查调用中的相邻空操作；
与后续 8.1.3 安全补丁不同，它不拒绝孤立的 noop 0。这些观察缩小了诊断范围，
但尚未确定之前交易的缺陷。先前失败的证明后诊断与后续成功结果均予以保留。

An instrumented fresh governance sequence is in progress with the same
acceptance assertions, at most 17 submission attempts, final instruction-count
inspection before sending, no ordinary actions/allocation and no automatic
retry. Its outcome must be reconciled independently before acceptance.
The latest public evidence is `preprod-governance-v2-verification.json`;
historical evidence is preserved. M6 is not complete.

已启动带检查的新治理序列，保留同一套验收断言，最多尝试提交 17 次，在发送前
检查最终指令数量，不执行普通动作或分配，也不自动重试。只有独立核对结果后才能
接受验收。最新公开证据位于 `preprod-governance-v2-verification.json`，历史证据
保持不变。M6 尚未完成。

Cloud work uses the official Alibaba CLI and Workbench. Fresh CLI reads confirm
the exact instance has no automatic deletion deadline and retains only private
Workbench SSH ingress; private access works and no application containers run.
The old stop execution was cancelled before work. After cloud work finished,
one-time execution `exec-ebc483682b6d48d2b2d5` is verified Waiting for
2026-10-17 03:45 Asia/Shanghai, gracefully requesting StopCharging and checking
the eventual stopped state and mode. Instance and disks are preserved; final
stop is not yet observed. All seven private instruction copies were synchronized
and remain ignored/untracked, preserving the low-memory worktree's appendix.
The remaining governance run uses local WSL and does not need ECS.

云端操作使用官方阿里云 CLI 和 Workbench。新的 CLI 读取确认目标实例没有自动
删除期限，仍只允许私网 Workbench SSH 入站；私网连接可用，没有应用容器运行。
开工前已取消旧停机执行。云端工作完成后，已核实一次性执行
`exec-ebc483682b6d48d2b2d5` 处于 Waiting，定于上海时间 2026-10-17 03:45
温和请求 StopCharging，并检查最终停止状态和模式。保留实例及磁盘，目前尚未
观察到最终停机。七份私有指令副本均已同步，仍被忽略且未跟踪，保留低内存工作树
的附录。余下治理运行使用本机 WSL，不依赖 ECS。

The inspected second 8.1.3 run also confirms deployment (block 3009808,
`ed9f0ea0146a6f9b796e469f98a521cfcff1a3c4883dbabf6314436366b08fe9`),
then fails module proposal with 1010/117. The exact final proposal inspection
sees one ContractCall, 22 instructions and no no-ops. Both candidate proposal
IDs remain unindexed with pending count zero. The wallet closes normally and
input files are unchanged. This rules out adjacent instruction no-ops in that
observed object, without excluding other normalization checks or proving the
contents of an earlier transaction whose bytes were not retained.

The next diagnosis identifies the separate empty-DustActions check in both
published ledger 8.1.0 and 8.1.1 sources. The installed dust wallet 4.2.0 reads
live indexer block parameters and can select no inputs when a fee is zero,
yet still emit a present empty section. The upstream wallet issue 700 and
merged midnight-expert PR 197 document a positive overhead. A wallet-free
synthetic proposal at live fee block 3010035 computes fee zero; the initial
parameter estimate is 451885305345161 and is not the actual wallet fee.
A separate offline empty-transaction probe reaches NotNormalized with an
unproven empty DUST section. Mock-proven variants can fail binding checks and
are not ledger acceptance; preserve their OTHER_INVALID/BINDING_INVALID
outcomes instead of assigning a normalization code they did not report.

The explicit Preprod checkpoint configuration now adds 1000000 atomic DUST
fee units, without changing global SDK defaults. The provider blocks empty
sections after balancing and exposes only a fixed failure phase. The actual
SDK regression distinguishes absent and empty sections; the supervisor keeps
the new phase while excluding raw errors. The complete root check passes
349 tests (343 Node and 6 Hardhat), output SHA-256
`a4392a47cbf376a2a986992b54cb1a5de79bf0d47f8b2b7f7527bfc00dc8529f`.
The corrected V5 governance run is in progress, with the same 17-attempt cap,
acceptance assertions, resource limits and private input boundary. Its final
transaction inspections also count DUST spends/registrations, never coin
contents or wallet balances. No additional deployment is attempted until
the source-backed fee fix and full checks pass. Full M6 remains incomplete.

第二次带检查的 8.1.3 运行同样确认了部署成功（区块 3009808，地址见上文），随后
模块提案以 1010／117 失败。最终提案对象的检查显示一次 ContractCall、22 条指令
且没有空操作。两个提案候选 ID 均未被索引，待处理数量为零。钱包正常关闭，输入
文件未变。这排除了被观察对象中的相邻空操作，但不能排除其他规范化检查，也
不能证明未保留字节的更早交易具体内容。

下一步诊断在已发布的账本 8.1.0 和 8.1.1 源码中找到了独立的空 DustActions
检查。已安装的 DUST 钱包 4.2.0 读取索引器实时区块参数，在手续费为零时可能不
选择输入，却仍生成存在但为空的段。上游钱包问题 700 和已合并的 midnight-expert
PR 197 记录了正数附加手续费方案。不使用钱包的合成提案在实时手续费区块
3010035 上计算出手续费为零；使用初始参数得到的 451885305345161 估算不是实际
钱包手续费。独立离线空交易探测在未证明的空 DUST 段上得到 NotNormalized。
模拟证明的变体可能先因绑定检查失败，不能当作账本验收；保留其 OTHER_INVALID／
BINDING_INVALID 结果，不把未报告的规范化错误码强加给它们。

明确的 Preprod 检查点配置现在附加 1000000 个最小 DUST 手续费单位，不修改 SDK
全局默认值。Provider 在配平后阻止空段，只公开固定失败阶段。实际 SDK 回归测试
区分不存在的段和空段，监督进程保留新阶段但排除原始错误。完整根检查通过
349 项测试（343 项 Node 和 6 项 Hardhat），输出摘要见上文。修正后的 V5 治理
运行正在进行，保留最多 17 次提交、验收断言、资源限制及私有输入边界。最终交易
检查还会统计 DUST 支出／注册数量，不记录币内容或钱包余额。只有基于源码的手续费
修复及完整检查通过后才开始下一次部署。完整 M6 尚未完成。

V5 gets past the prior blocker: deployment, module proposal, both reviews and
both approvals are indexed. Each final inspected transaction has a non-empty
DUST spend section. Early activation and duplicate approval are rejected by
generated Compact preflight, not submitted as node-rejection tests. The first
lifecycle proof suffers sustained memory.high reclaim with free host RAM.
Runtime-only changes first raise client/prover soft thresholds to 1.25/2.75 GiB,
then raise the prover's hard/soft RAM limit to 4 GiB after checking 3369586688
bytes available. The client hard limit remains 1.5 GiB; swap, CPU, single-worker,
job deadlines and total runtime guards remain unchanged. The exact running
PIDs are preserved. The proof completes within its existing deadline; the
adjustment records and continuous resource samples retain paging/high events.
This one-time governance setup is not ordinary-action latency or full M6
performance acceptance. Remaining governance transitions are still running.

V5 已越过之前的阻塞点：部署、模块提案、两笔复核及两笔批准均已被索引。每笔最终
检查过的交易都包含非空 DUST 支出段。提前激活和重复批准由生成的 Compact 预检
拒绝，没有将其作为节点拒绝交易提交。首个生命周期证明在宿主机仍有空闲内存时
受到持续的 memory.high 内存回收影响。先通过仅运行时的调整将客户端／证明器软
阈值提高到 1.25／2.75 GiB，再在核实 3369586688 字节可用内存后，将证明器硬／软
内存上限提高到 4 GiB。客户端硬上限仍为 1.5 GiB，swap、CPU、单工作线程、任务
截止时间及总运行时间保护均未改变，正在运行的 PID 保持不变。证明在原截止时间
内完成；调整记录及连续资源采样保留换页和 high 事件。本次一次性治理设置不属于
普通动作延迟或完整 M6 性能验收。其余治理状态变更仍在运行。

V5 finished unsuccessfully after 10 submission attempts and 10 returns. An
independent public reader subsequently found all 20 candidate identifiers in
10 distinct SUCCESS transactions, through binding staging at block 3010378.
The proof module is active at registry sequence 6; historical template count
and template activation sequence are both zero. Final template admission
completed its contract proof, then failed in wallet balancing before any
eleventh submission. Its observed phase is wallet-balance-failed-unknown;
the original error and random activation fixture were not retained. Do not
claim template activation, full governance acceptance, or an exact replay.

The balance classifier now follows bounded own-data SDK/Effect cause trees
and reports fixed WASM/binding categories without serializing private errors.
The focused 23 tests pass. A broad check encountered a 30-second startup
timeout in an existing membership diagnostic; that diagnostic passes both
tests in isolation. A synthetic pending-finalization context is being tested
with the real restored wallet and local prover. Both submission boundaries
are guarded, the synthetic state is never sent, and this diagnostic cannot
count as governance acceptance. Its outcome is pending at this entry.

Alibaba CLI independently verified one-time execution
exec-ebc483682b6d48d2b2d5 succeeded: the exact authorized ECS instance was
Stopped with actual StopCharging mode at 2026-10-17 03:45:31 Asia/Shanghai.
Its deletion deadline is empty, and the instance and disks are preserved.
Local WSL diagnostics do not use that stopped server. The current canonical
private instructions and all seven ignored overrides include the completed
stop state and preserve their worktree appendices.

V5 在尝试提交 10 次并返回 10 次后，以失败结束。独立公开读取程序随后确认，全部
20 个候选标识对应 10 笔不同的 SUCCESS 交易，最后一笔为区块 3010378 的绑定暂存。
证明模块已激活，注册表序列为 6；历史模板数量及模板激活序列均为零。最终模板准入
完成了合约证明，但随后在钱包配平阶段失败，没有第 11 次提交。观察到的阶段为
wallet-balance-failed-unknown；未保留原始错误及随机激活测试材料。不能宣称模板
已激活、完整治理验收已通过，或能够精确重放原交易。

配平分类器现在沿受限的 SDK／Effect 自有数据原因树检查错误，只返回固定的 WASM／
绑定类别，不序列化私密错误。针对性的 23 项测试已通过。一次完整检查中，现有成员
诊断测试触发 30 秒启动超时；该诊断单独运行的两项测试均通过。正在使用真实恢复
钱包及本地证明器测试合成的待最终准入状态。两个提交边界均被拦截，合成状态不会
发送，也不能计入治理验收。本条记录时，该诊断结果尚待确认。

阿里云 CLI 独立核实，一次性执行 exec-ebc483682b6d48d2b2d5 已成功：准确的授权
ECS 实例于上海时间 2026-10-17 03:45:31 处于 Stopped，实际模式为 StopCharging。
自动删除期限为空，实例及磁盘保留。本地 WSL 诊断不使用这台已停止的服务器。
当前规范私有指令及全部七份忽略的 override 均记录已完成停机状态，并保留各自附录。

The read-only synthetic finalization subsequently proved and balanced once;
submission was intercepted, and actual contract state and wallet inputs stayed
unchanged. It is not a replay of V5. The runner now checkpoints the canonical
random M4 fixture privately before wallet access, excluding reviewer signing
private keys. Persistence failure aborts before spending DUST.

V6 stopped in preflight without wallet access. V7 saved its fixture and
balanced a deployment, then stalled in background node metadata initialization.
A paused runtime inspection found no ready SDK submission client and unavailable
metadata before the child was ended with code 75. The parent's exit and later
process checks confirm termination; the inspection helper's immediate reaping
check itself reported FAIL and is retained. Public candidate IDs remained
unindexed, with no pending pool entries; absence alone is not an RPC rejection.

Read-only metadata probes pass in Windows, WSL, and the same isolated runtime.
A separate A/B reproduces a stale connected flag after disconnect. The new
supported submission-service factory explicitly awaits node metadata/genesis
before starting wallet synchronization, bounds initialization/reconnect to
60/30 seconds, and waits for disconnect before another SDK send. It preserves
SDK signatures, proofs, Finalized events, transaction bytes and dependency pins.
The 355 root checks pass (349 Node, 6 Hardhat), output SHA-256
`a8b8e0d32b7b5ca18b0312e0fee027cf4fcf8ebb9665e8751a9e26e7d60bfdf4`.
The isolated live factory readiness/close probe also passes without a wallet
or submission. V8 has confirmed deployment, proposal and two reviews on
`47514e87fc1f22c615a9f69a90ce6e4352f6e0d78c1f7c748c8cf36ff4bca084`.
Its remaining governance transitions and independent acceptance are pending.
The original V5 balancing cause remains unresolved. Full M6 is incomplete.

只读合成最终准入随后完成了一次证明及配平；提交被拦截，实际合约状态和钱包输入
保持不变。它不是对 V5 的重放。runner 现于访问钱包前，将规范随机 M4 测试材料
保存至私有检查点，不包含复核签名私钥。保存失败会在消耗 DUST 前终止。

V6 在预检停止，没有访问钱包。V7 保存测试材料并完成部署配平，随后停滞于后台
节点元数据初始化。在以代码 75 结束子进程前，暂停运行时检查发现 SDK 提交客户端
尚未就绪，元数据不可用。父进程退出记录及之后的进程检查确认已经终止；检查辅助
脚本自身的立即回收检查报告 FAIL，该结果保留。公开候选 ID 始终未被索引，待处理
池为空；单凭未收录不能认定 RPC 拒绝。

Windows、WSL 及相同隔离运行时的只读元数据探测均通过。独立 A/B 还复现了断开
后连接标志过时的问题。新增且受 SDK 支持的提交服务工厂，在钱包同步开始前明确
等待节点元数据／创世区块，将初始化／重连限定为 60／30 秒，并在下一次 SDK 发送
前等待实际断开。保留 SDK 签名、证明、Finalized 事件、交易字节及依赖版本。
全部 355 项根检查通过（349 项 Node、6 项 Hardhat），输出摘要见上文。同隔离
实网工厂的就绪／关闭探测也通过，未使用钱包或提交交易。V8 已在上述地址确认部署、
提案及两笔复核；其余治理转换及独立验收仍待完成。V5 原配平故障原因仍未确定。
完整 M6 尚未完成。

### 2026-10-17 canonical governance closeout

The governance sequence on 47514e87fc1f22c615a9f69a90ce6e4352f6e0d78c1f7c748c8cf36ff4bca084 is independently verified: 17 successful transactions in canonical finalized blocks, all nine Compact preflight negatives, authority root version/sequence 2/2, revoked module with registry sequence 8, and historical revoked template with lifecycle sequence 3. Source evidence records 18 submission-boundary observations, 16 SDK returns, one pre-send node connection failure, and one missing final SDK callback for an independently confirmed transaction. No return, receipt or final-runner event was invented. V8's OOM, V9's connection failure, V10's controlled interruption and the reader report-construction failures remain preserved; the SDK runner is not a clean pass.

A future confirmation wait now has a 120-second deadline, interrupts/releases the SDK subscription, safely reports finality-timeout and closes the service to prevent repeating an ambiguous transaction. The actual SDK lost-notification regression passes. The complete check passes 356 tests (350 Node plus six Hardhat); output SHA-256: 5693fab04e4cf6ce76bc4778c55dd4ac56b39fc032084f6ca85e6eff487051cc. This post-run guard has not been tested with another funded transaction, and the original callback-loss and V5 balancing causes remain unresolved. Full M6 runtime, receipt, replay/restart and downstream gates are still open.

Canonical verification is in logs/m6-preprod-independent-governance-v7-1792189870807.json; captured original rows are in logs/m6-live-2026-10-16T22-26-12.856Z.jsonl. The closeout report and current source hashes are in preprod-governance-v2-verification.json. All owned local services are stopped, port 6300 has no listener, and the final Alibaba CLI read confirms the exact Singapore instance remains Stopped/StopCharging with disks preserved and no deletion deadline. Owner-only local M4 fixture caches are deliberately retained for continuing M6 diagnostics; their contents and wallet/provider credentials were not exported. The final integrity/secret-marker audit passes, private instruction copies remain ignored, the index is empty and the lockfile is unchanged.

上述合约的治理序列已通过独立核验：17 笔成功交易均位于规范链最终确认区块中，九项 Compact 预检负向检查齐全，权限根版本／序号为 2／2，模块已撤销且注册序号为 8，历史模板已撤销且生命周期序号为 3。原始证据记录了 18 次提交边界观察、16 次 SDK 返回、一次发送前节点连接失败，以及一笔已独立确认交易的最终 SDK 回调缺失。没有伪造返回、回执或 runner 最终事件。V8 的 OOM、V9 的连接故障、V10 的受控中断及读取程序生成报告时的失败均已保留；SDK runner 不能算干净通过。

后续确认等待现有 120 秒期限，超时会中断并释放 SDK 订阅，安全报告 finality-timeout，并关闭该服务以防重复一笔结果不确定的交易。使用真实 SDK 的通知丢失回归测试通过。完整检查共通过 356 项测试（350 项 Node、六项 Hardhat），输出 SHA-256 如上。这项实网运行后添加的保护未再通过消耗测试手续费的交易验证；原回调丢失及 V5 配平故障原因仍未确定。完整 M6 的运行时、回执、重放／重启及下游验收仍待完成。

规范链核验、保留的原始记录及最终报告见上述文件。所有本任务所属本地服务已停止，6300 端口无监听，阿里云 CLI 最终回读确认准确的新加坡实例仍为 Stopped／StopCharging，磁盘已保留，且无删除期限。仅属主可访问的本地 M4 测试材料为后续 M6 诊断有意保留，未导出其内容或钱包／服务商凭据。最终完整性／秘密值标记审计通过，私有指令副本仍被忽略，暂存区为空，依赖锁文件未变。

### 2026-10-17 controlled ECS runtime continuation

A fresh controlled fixture on 7d40639830890a77cfc5e7aa447610095458dfb3f8e7f5c2a70d9ce83df7f567 has two independently successful finalized transactions: deployment and module proposal. Its first review returns RPC 1010/custom 170 (InvalidDustSpendProof). Allocation, account credentials and slots were not reached. All 11 server-regenerated prover/verifier pairs match the original manifest exactly. The failed Docker internal-network preflight, recovered keygen swap-cleanup failure, and original runtime/SDK failures remain preserved. Effective NAT bridge publication is loopback only, cloud ingress remains private Workbench SSH only, and public-network/outbound capability remains available.

Private checkpoints now precede allocation/account/slot preparation. Every wallet balance waits for current synchronization and spendable DUST, with bounded cancellation and joined cleanup. All 359 root checks pass, including three new readiness regressions. A non-submitting review then completed proving/balancing and reached the interceptor, but runtime validation returned 4003. An unsigned empty remark also traps in that interface. The diagnostic's final success assertion incorrectly expected an unchanged sentinel; the pinned SDK wraps root submission errors. That failed result is preserved. The corrected bounded cause check passes three focused tests and has not been rerun live. Independent inspection confirms the latest indexed action is still the proposal in canonical finalized block 3012987, with zero reviews and no runtime instance. Error 170's cause and the full M6 runtime, receipt, privacy and restart gates remain unresolved.

Temporary remote test credentials and transport material are removed, owned client/prover jobs stopped, port 6300 closed and swap disabled. One root-only synthetic recovery fixture is deliberately retained. Required sanitized evidence is downloaded, hash-verified and scanned for configured secret values. Active ECS work now renews the real graceful economical-stop deadline two hours ahead at least every 30 minutes; a final two-hour deadline is set only after jobs end and outputs are verified. Detailed results, original reporting-field correction and acceptance limits are in preprod-runtime-ecs-v2.md and preprod-runtime-ecs-v1-verification.json. No dependencies, RAM grants or milestone gates were broadened; no commit or push was made.

上述新受控合约有两笔独立最终成功交易：部署和模块提案。首笔审核返回 RPC 1010／170（DUST 支出证明无效），尚未到达实例分配、账户凭证或槽位。服务器重新生成的全部 11 组密钥逐字节匹配原清单。Docker 内部网络预检失败、密钥生成后 swap 清理失败及恢复、原运行／SDK 失败均被保留。生效 NAT 桥接端口仅回环可用，云入站仅允许 Workbench 私有 SSH；保留公网及出站能力。

分配／账户／槽位准备前现保存私有检查点；每次钱包配平等待当前同步及可用 DUST，具有等待上限、取消和等待清理。全部 359 项根检查通过，包含三项新增就绪回归。不提交审核诊断完成证明／配平并到达拦截器，但运行时验证返回 4003，未签名空备注也在该接口触发陷阱。诊断最终断言错误地预期 sentinel 原样返回，实际 SDK 会包装根提交错误；原失败结果保留。修正的有界 cause 检查通过三项测试，未实网重跑。独立核验最新索引操作仍为最终区块 3012987 中的提案，审核数为零且无运行实例。170 根因及完整 M6 运行时、收据、隐私和重启验收仍未解决。

临时远程测试凭据及传输材料已清除，自有客户端／证明器停止，6300 无监听、swap 关闭；仅有意保留一份 root 专用合成恢复材料。所需脱敏证据已下载、核对哈希并扫描配置秘密值。活动 ECS 任务现至少每 30 分钟把真实平稳节省停机延后两小时，最终两小时期限仅在作业结束及结果核验后设置。详细结果、原报告字段修正说明及验收边界见上述文件。未扩大依赖、RAM 授权或里程碑边界，未提交或推送代码。


### 2026-10-17 error 170 controlled recovery investigation

One newly generated review on 7d40639830890a77cfc5e7aa447610095458dfb3f8e7f5c2a70d9ce83df7f567 succeeded. A non-submitting diagnostic captured its exact candidate and native DUST proof inputs privately without changing SDK arguments. The wallet was strictly synchronized; both global DUST roots matched canonical finalized history at the 01:06:18 UTC proof creation time and the 01:06:06 wallet tree time. The 12-second gap did not cause a root mismatch for this candidate. All 299 installed files from nine pinned SDK packages match official npm archives locally and on ECS; lockfile SRI values were checked. The read-only runtime validation interface also traps on an unsigned empty remark and cannot establish candidate validity.

The captured candidate was then submitted exactly once, without restoring a wallet, rebalancing, reproving or changing bytes. Its SHA-256 is d2611823f362b309a22fd14bf62e6d22d742ac52cfde4373de009a4ea9479735. Both identifiers resolve independently to SUCCESS in canonical finalized block 3013673, hash 745b3600ce9207cbef64140b9dee000f2cca2ae38c003037d6f577615bbc496e. The SDK returned Finalized; module review count is now 1 and registry sequence 2, with no active template or runtime instance. This confirms that the pinned stack can produce an accepted DUST proof. The original RPC 1010/custom 170 is not reproduced or retrospectively explained: its rejected bytes were not retained. This later submission occurred about 11.5 minutes after proving and does not establish waiting as a fix. Application code and dependency versions were unchanged in this investigation; the prior 359-test root result remains historical, not a newly rerun suite.

The public bundle and submission/cleanup outcomes are downloaded and hash-verified. Seven owner-only temporary proof/state/attempt files and the API transport directory are removed; temporary credentials are absent. Only the deliberately retained root-only synthetic recovery fixture remains. Owned jobs/provers stopped, port 6300 has no listener, and swap is disabled. The final official CLI read verifies one-time OOS exec-e066a079e10b4ea0a769 Waiting for 2026-10-17 11:21:39 Asia/Shanghai, exact instance i-t4ni11rkjyzgi0vlb68d, StopCharging and ForceStop=false, with the earlier timer cancelled and no automatic deletion deadline. The instance/disks are preserved; all recorded owners are explicitly finished and renewal has ceased. Full M6 runtime, receipt, privacy and restart acceptance remains open. Details and hashes are in preprod-error170-diagnostics-v1.json; historical failure reports remain unchanged.

上述合约新生成的一笔审核交易已成功。不提交诊断在不改变 SDK 参数的情况下，仅在私有服务器中捕获候选交易及原生 DUST 证明输入。钱包处于严格同步状态；两个全局 DUST 状态根，在 UTC 01:06:18 的证明创建时刻和 01:06:06 的钱包树时间，都与规范链最终确认历史一致。该候选交易中的 12 秒差距没有造成状态根不匹配。九个固定 SDK 包的全部 299 个文件，在本地及 ECS 上均与官方 npm 包一致，并核验了锁文件 SRI。只读运行时验证接口对未签名空备注也触发陷阱，因此不能用它判断候选交易有效性。

随后仅提交一次完全相同的候选交易，没有恢复钱包、重新配平、重新证明或修改数据。两个交易标识均独立对应规范链最终区块 3013673 的 SUCCESS，区块哈希见上文。SDK 返回 Finalized；模块审核数现为 1、注册序号为 2，没有活动模板或运行实例。这证明固定版本组件能够生成被链上接受的 DUST 证明。但此前 RPC 1010／170 的根因仍未复现或追溯证实，因为当时没有保留被拒绝的数据。本次提交约在证明生成后 11.5 分钟发生，不能据此将等待认定为修复方案。本轮未修改应用代码或依赖版本；此前 359 项测试通过属于历史证据，并非本轮重新运行。

公开证据包及提交／清理结果已下载并核验哈希。七个仅属主可访问的临时证明／状态／提交记录文件及 API 传输目录已清除，临时凭据不再存在；仅有意保留 root 专用合成恢复材料。自有作业／证明器停止，6300 无监听，swap 已关闭。阿里云 CLI 最终回读确认上述一次性 OOS 任务等待上海时间 2026-10-17 11:21:39 对准确的新加坡实例执行 StopCharging，ForceStop=false；旧定时任务已取消，无自动删除期限。实例和磁盘保留，所有活动记录均明确完成，已停止续期。完整 M6 运行时、收据、隐私和重启验收仍未完成。详细结果及哈希见上述 JSON，历史失败记录未改写。


### 2026-10-17 approved governance and slot-state continuation

The same disposable Preprod contract 7d40639830890a77cfc5e7aa447610095458dfb3f8e7f5c2a70d9ce83df7f567 completed the explicitly approved 25-submission continuation: 14 governance transactions and 11 runtime transactions (allocation, account issuance and nine slot transactions). All 25 attempts independently resolve to SUCCESS in canonical finalized blocks. The original 24 cap was an agent counting/approval budget, not an Alibaba Cloud or Midnight limit. An existing previous-assignment verification step had been omitted; the user's explicit amendment to 25 is retained separately from the original plan. No new deployment or automatic transaction retry occurred.

The final instance sequence is 5 with four slot command nonces and no staging session. Credential status sequence remains 1; namespace authority root is 2/2. The module is revoked with registry sequence 8; the historical template is revoked with lifecycle sequence 3 and zero currently active entries. Creator issuance, governance-scoped issuance, creator revocation and new-ID reassignment were checked against actual M5 records and private map openings. Begin/ancestry staging did not grant roles or emit a common DecisionReceipt. Full M6 ordinary-action, common-receipt, privacy and restart gates remain open; synthetic reviewer fixtures do not constitute human security/protocol review.

The warm prover exhausted the eight-GiB swap reserve after the first ten successes. A fresh proof-only process completed the exact first-slot application proof in 541.078 seconds without wallet initialization or submission and with unchanged public state. That proved transaction was subsequently balanced and submitted once as transaction 11. The 2.5-GiB client then OOMed while preparing finalization, before transaction 12. Both original failures and missing final outcomes remain preserved. Recovery revalidated transaction 11 canonically, reconstructed the exact signed M4/M5 fixture and continued without repeating it. The combined client/prover hard RAM ceiling stayed 14 GiB: 3.5 GiB client plus 10.5 GiB prover, shared swap eight GiB, two existing CPU cores and one proof job. Idle owned prover resets released caches; recorded live soft-threshold adjustments stayed inside the same hard cap. This is an experimental server profile, not qualification of the smaller five-GiB target.

The six focused signed-fixture/decoding tests passed. Original application sources, dependency versions, lockfile and the prior 359-test root baseline are preserved; the root suite was not rerun for this diagnostic-only continuation. Error 170 did not recur in these 25 submissions, but its original rejected bytes were not retained and its original cause remains unproven. No delay-based fix is claimed.

Public evidence is downloaded, sealed-bundle hashes checked, write-ahead submission journals reconciled and temporary native proof/state/candidate captures removed after canonical verification. Temporary wallet/API inputs are absent; only deliberate root-only synthetic recovery checkpoints remain. Owned jobs and containers stopped, port 6300 has no listener, swap is disabled and original swappiness restored. Official Alibaba Cloud CLI verification leaves the exact instance/disks preserved with no deletion deadline and a final one-time graceful StopCharging deadline of 2026-10-17T14:11:46+08:00, ForceStop=false. This task's activity is explicitly finished; renewal has ceased. Complete results and 117 artifact hashes are in preprod-continuation-v3-verification.json. No IAM grant, public-port, prescribed architecture, application-source, commit or push change was made.

同一一次性 Preprod 合约已完成明确批准的 25 笔续接交易：14 笔治理交易，以及包括分配、账户签发和九笔槽位交易在内的 11 笔运行时交易。全部 25 次提交均独立对应规范链最终区块中的 SUCCESS。原 24 笔上限是代理自行统计和申请批准的预算，并非阿里云或 Midnight 的限制；当时漏计了已有的旧分配记录核验步骤。用户明确批准总计 25 笔的修订已单独保留，原计划未改写。未新部署，也未自动重试交易。

最终实例序号为 5，四个槽位命令 nonce 已消耗，没有暂存会话。凭证状态序号仍为 1，命名空间权限根为 2／2。模块已撤销，注册序号为 8；历史模板已撤销，生命周期序号为 3，目前活动版本数为零。创建者签发、治理权限签发、创建者撤销和新 ID 重新分配，均以实际 M5 记录和私有映射开口核对。开始／祖先暂存不授予角色，也不产生通用 DecisionReceipt。完整 M6 的普通动作、通用收据、隐私和重启门槛仍未完成；合成审核 fixture 不构成人工安全／协议审核。

前十笔成功后，热证明器耗尽八 GiB 交换空间保留额度。全新、不提交的进程在 541.078 秒内完成完全相同的首个槽位应用证明，没有初始化钱包或提交交易，公开状态未变。随后只配平并提交一次该已证明交易，成为第 11 笔。之后客户端在准备最终确认时触及 2.5 GiB 上限并 OOM，第 12 笔尚未提交；两次原始失败及缺失的最终结果均保留。恢复程序重新核验第 11 笔的规范链确认，重建准确的签名 M4/M5 fixture，未重复提交它。客户端／证明器合计硬内存上限仍为 14 GiB，重新分配为 3.5／10.5 GiB，共享交换空间仍八 GiB，使用现有实例两个 CPU 核心且一次一个证明任务。自有空闲证明器重置释放缓存，记录的在线软阈值调整均未越过相同硬上限。这是实验服务器配置，不能认定较小的五 GiB 目标已合格。

六项签名 fixture／解码聚焦测试通过。原应用源码、依赖版本、锁文件及此前 359 项根测试基线保留；本次仅有诊断改动，未重新运行根测试。25 笔提交中未再出现 170 错误，但原被拒数据未保留，其根因仍未证实；不把等待认定为修复办法。

公开证据已下载并核验封存包哈希，提交前日志已核对；规范链确认后，临时原生证明／状态／候选数据已清除。临时钱包／API 输入不再存在，仅有意保留 root 专用合成恢复检查点。自有作业及容器停止，6300 无监听，交换空间关闭且原 swappiness 恢复。阿里云官方 CLI 核验准确实例和磁盘保留、无删除期限，并保留上述最后一次平稳 StopCharging 停机期限，ForceStop=false。本任务活动记录已明确结束，停止续期。完整结果及 117 项产物哈希见上述 JSON。未改变 IAM 授权、公网端口、规定架构或应用源码，也未提交或推送。

### 2026-10-17 ledger-bound action feasibility and approved Desktop recovery

An isolated twelve-entry snapshot adds a constant-true action-ancestry diagnostic
to the current eleven-circuit v8 source. It checks allocation/deployment, exact
private state and mutation watermark, current namespace roots, active module and
template/configuration, complete depth-16 ancestry and all thirty-five status
leaves, session/intent signatures, both scopes and proof deadlines. It writes
no state, grants no action and emits no receipt. Synthetic genesis fixtures are
explicitly distinct from issuance or chain acceptance. Production sources,
bindings, metadata and the key manifest remain unchanged.

The baseline passes seventeen generated-code checks. Equivalent stack-hash
factoring passes seventeen; the combined candidate also moves the session
status check after its proven terminal-account relation and passes nineteen,
including missing-session-status and terminal-account-substitution negatives.
Ten direct production/candidate status comparisons check one, seventeen and
thirty-five scattered leaves and malformed stack/side-node/padding/sequence
cases. Actual compilation reduces the full diagnostic from k22 / 2,281,576
rows to k21 / 1,713,336 rows, a 568,240-row (about 24.9%) reduction. Neither
hash domains, witness schema, ancestry depth nor current-root semantics change.

Both twelve-GiB real-key builds OOM: baseline V3 reaches the hard cap before its
twenty-minute watchdog; candidate V4 fails after 886.918 seconds with empty
keys, well before its one-hour allowance. V1's missing-cache environment,
V2's measured soft-limit reclaim stall and subsequent missing final report,
and the original compiler/harness/helper errors remain preserved. V5 is a
separate same-program fourteen-GiB RAM / two-GiB owned paging experiment on the
existing server, with memory/disk reserves and exact owned-file cleanup. Its
final outcome, successful-output verification if any and cleanup are recorded
in `action-boundary-diagnostic-v1-verification.json`; no provisional key or
ordinary-action success is inferred from a smaller circuit or a running job.
This is not qualification of the five-GiB product target or proof latency.

The final expanded verifier subsequently passes all twenty-four cases against
both baseline and combined programs, preserving the earlier results. Five new
maximum-chain negatives cover freshly proved root-account, middle-capability,
terminal-account and session revocations plus terminal-account substitution.
Both results have the same case list and verifier script hash. V5 ends with
OOM and no actual swap use because original swappiness is zero. V6 verifies
effective paging with a constrained probe, then OOMs after 993.098 seconds
while consuming essentially all three GiB of swap. Its nine public result
files are downloaded/hash-verified; the owned paging file is removed and
original swappiness zero restored. No valid key is inferred from either run.

The user approved Docker Desktop restart. Its initial stop timed out, then
Desktop was confirmed stopped and started successfully. The same three M6
containers were started and became healthy, retaining IDs, images and loopback
bindings. A wallet-free read verifies historical Local Dev v8 allocation,
sequence zero, authority root 2/2 and final revoked module/template assertions.
Envio uses its original restart policies; no separate Envio mutation, factory
reset, container/volume deletion, runtime-directory move, explicit WSL shutdown
or forced process kill occurred. This is historical fixture persistence through
the approved Desktop outage, not ordinary-action or in-flight recovery.

Only public compiler inputs were transferred. Workbench upload TLS failures
used the existing authenticated private exec fallback with exact hashes;
official Workbench file download succeeds for the public result bundles and
binary program. A transient OOS renewal EOF recovered before another long job;
the exact old timer cancellation and replacement are independently verified.
The rolling two-hour economical-stop policy remains active until owned jobs
and result downloads finish. The final report records its actual closeout.
There are zero new deployments or transactions. The prior 359 root tests are
historical and were not rerun for these diagnostic-only changes. Ordinary-action
evidence, atomic state/nullifiers, common receipts and full M6 acceptance remain
open. No commit or push is made.

The final existing-server V7 profile also ends with explicit unit `oom-kill`,
observed by 1007.992 seconds, under fourteen GiB hard RAM and four-and-a-half
GiB effective owned swap. Complete closure including verified public k22-cache
restoration takes 1080.206 seconds. All twelve public result files are local
and hash-verified; an independent environment audit passes. No resize or RAM
grant is applied. Official type metadata identifies a possible 32-GiB build
option, but price/compatibility reads are denied with `Forbidden.RAM` for
`ecs:DescribePrice` and `ecs:DescribeResourcesModification`. The proposed
minimal read policy is private workspace material, not an applied grant.
After all results are verified, this owner's activity is explicitly finished;
official CLI verification cancels the prior timer and leaves one-time execution
`exec-5255a49c81fb45e59530`, Waiting for **2026-10-17 18:52:03 Asia/Shanghai**,
exact target/mode/template checked, `StopCharging`, `ForceStop=false`, no
deletion deadline. No other active owner remains. Instance/disks are preserved
and renewal ceases. This closes the diagnostic run, not M6.

当前十一电路 v8 源码的独立十二入口快照，新增只返回 true 的动作祖先诊断，核对分配／
部署、精确私有状态及水位、当前权限根、活动模板／模块及配置、完整深度 16 和三十五个
状态叶、会话／意图签名、两组范围及证明时限；不写状态、不授权、不出收据。合成创世
材料不等于真实签发或链上验收。生产源码、绑定、元数据和密钥清单保持不变。

基线通过十七项生成代码检查；等价栈哈希合并也通过十七项。组合候选还在证明末端账户
关系后只检查一次会话状态，通过包含会话状态缺失和末端账户替换负例的十九项检查。
十项生产／候选直接对比覆盖一、十七、三十五个分散叶及栈、旁支、填充和序号篡改。
真实编译由 k22／2,281,576 行降为 k21／1,713,336 行，减少 568,240 行，约 24.9%；
哈希域、材料格式、祖先深度及当前根语义均保持。

两个十二 GiB 真实密钥构建都发生 OOM：V3 在二十分钟时限前达到硬上限，V4 于
886.918 秒失败，两份密钥为空，远未达到其一小时时限。V1 缺缓存环境、V2 软限制
回收停滞及随后最终报告缺失，以及原编译／测试框架／辅助脚本错误均已保留。V5 为
同一程序的十四 GiB 内存／二 GiB 自有交换实验，仅用现有服务器，设置保留阈值并
清理准确的自有文件。最终结果、成功输出核验（如有）和清理见配套核验 JSON；不能
由电路较小或作业仍运行推断密钥／普通动作成功，也不代表五 GiB 资源或证明时延合格。

最终扩展验证器随后对基线和组合候选各通过全部二十四项检查，保留此前结果。新增五个
最大链负例，覆盖针对当前根重新证明的根账户、中间能力、末端账户和会话撤销，以及
末端账户替换；两份结果的用例列表和脚本哈希相同。V5 因原交换倾向为零而未实际换页，
最终 OOM。V6 先用受限探针核验有效换页，再于 993.098 秒、三 GiB 交换空间接近用尽时
OOM；九个公开结果文件已下载核对哈希，自有交换文件移除、原交换倾向零恢复，两次
均未生成有效密钥。

用户批准 Docker Desktop 重启；首次停止超时后确认已停，再启动成功。原有三个 M6
容器恢复健康，ID、镜像和回环端口不变。无钱包读取核验历史本地 v8 分配、序号零、
权限根 2／2 和最终模块／模板撤销状态。Envio 使用原重启策略，未单独修改它，也未
恢复出厂、删除容器／卷、移动运行目录、明确关闭 WSL 或强杀进程。这只证明历史材料
经本次已批准 Desktop 故障后持久保留，不代替普通动作或在途恢复验收。

仅传输公开编译输入。Workbench 上传 TLS 故障使用已有认证私有 exec 备用通道并
严格核验哈希；官方文件下载成功取回公开结果包及二进制程序。一次 OOS 续期 EOF 在
下一长作业开始前恢复，并独立核验旧定时取消及新定时。作业和结果下载结束前持续滚动
两小时节省停机，最终报告记录实际收尾。本轮零部署、零交易；此前 359 项根测试属于
历史记录，本次诊断改动未重跑。普通动作证据、原子状态／nullifier、通用收据和完整
M6 验收仍未完成，未提交或推送。

现有服务器最后一次 V7 配置仍以准确单元 oom-kill 结束，1007.992 秒时已观察到，硬内存
十四 GiB、有效自有交换空间四点五 GiB。包含公共 k22 缓存核验恢复的收尾共 1080.206
秒；十二个公开结果文件均已下载核对哈希，独立环境核验通过，未变配或扩张 RAM 权限。
官方规格元数据确认可能的 32 GiB 构建选项，但价格／兼容性读取分别缺少 DescribePrice
和 DescribeResourcesModification，均为 Forbidden.RAM；拟议最小只读策略只保存在
私有工作区，不是已应用授权。结果核验完成后，本任务活动已明确结束，官方 CLI 取消
旧定时并核验上述一次性任务等待北京时间 2026-10-17 18:52:03 正常节省停机，准确目标、
模板、StopCharging、ForceStop=false 及无删除期限均已核对。无其他活动所有者，实例和
磁盘保留、停止续期。这只结束本次诊断，不是完成 M6。


## 2026-10-19 — first ordinary state transition confirmed on Preprod

The approved same-contract fresh-instance sequence finalized all 62 transactions.
The genuine ordinary-action proof completed in 29.64 minutes of provider
time; call 59 atomically changed the instance sequence 4→5 and its private-state
commitment, consumed one scoped nullifier and inserted receipt v1. Exact source
transaction: `00395e9e78276ae7525a5ab9639f8a319f006594a37b3962082c8d9f17bad594b8`. Receipt: `0x12142d2ad7897b6d7c678928d70fcd0e265119543033a368fda083a461289c08`.
The separate cold audit reconnected after template/module revocation and verified
the exact finalized transaction, receipt insertion, preserved history and final
state. Transaction 55's earlier confirmation timeout was reconciled read-only;
no native submission was retried. The failed prior main proof never submitted59.

The existing 16 GiB host used disk-backed swap and the pinned memory-patched
8.1.3 prover; no 32 GiB upgrade, new deployment, RAM grant or public developer
port was introduced by the fresh continuation. The main soft reclaim threshold
13.5 GiB prevented the earlier host-reserve interruption; hard cap14.5 GiB,
total host swap14.875 GiB and original reserve guards remained. Full root checks
398 passed before this recovery; final recovery typecheck and8 targeted checks
passed. Details, exact versions, public source/runtime manifests, timings,
privacy scans and downloaded file hashes are in ordinary-first-flow-preprod-v1.md
and logs/m6-governance-v10-assets-20261018/ordinary-first-flow-completion-v1.json.

All owned jobs stopped and all13 offloaded public paths were restored exactly;
original swap/settings were restored. Disposable test credentials remain root-only
for authorized remaining M6 tests. The owner is finished and final timer
`exec-2c7134ede4254282ada2` is Waiting for 2026-10-19T10:26:52+08:00 Asia/Shanghai,
StopCharging/ForceStop=false, no auto deletion, instance/disks preserved. Renewal
ceases. This is a first-flow result; full M6 remains IN_PROGRESS with the negative,
non-transitioning and targeted infrastructure-recovery gates still outstanding.
No Git commit or push was made.

用户批准的同合约新应用实例流程已完成全部62笔最终确认。真实普通操作的证明提供器阶段
耗时29.64分钟，第59笔原子更新私有状态承诺、把实例序号4递增到5、消耗一个限定
作用域nullifier并写入收据v1。准确交易及收据标识见上述英文记录。独立冷读在模板及模块
撤销后重新连接，核验准确最终交易、收据插入、历史保留及最终状态。此前第55笔确认超时
只读核对成功，未重试原生提交；此前失败的最大证明未提交第59笔。

继续使用现有16 GiB主机、磁盘交换空间及固定的内存修补8.1.3证明程序。新实例续跑未升级
32 GiB、未新增部署／RAM授权／公网开发端口。13.5 GiB软回收阈值避开此前主机保留空间
中断，仍保留14.5 GiB硬上限、14.875 GiB总交换空间及原保护阈值。恢复前完整根检查398项
通过，最终恢复TypeScript检查及8项针对性检查通过。完整版本、源码／运行清单、耗时、
隐私扫描及下载哈希见上述证据文档和JSON。

自有作业已全部停止，13个移出的公开路径均准确恢复，原交换文件及设置恢复。测试凭据
为后续经授权的M6测试保留且仅root可访问。所有者记录明确结束，最终定时为上述任务和
北京时间，StopCharging／ForceStop=false，无自动删除，保留实例和磁盘并停止续期。
本次只完成首条流程，完整M6仍为IN_PROGRESS，负例、无状态变更及定向故障恢复验收仍待
完成。未进行Git提交或推送。

## 2026-10-19 — owned node/indexer interruption and cold reconnect

The targeted pinned Local Dev recovery drill passed at 08:42:38 Asia/Shanghai.
The existing indexer and node were stopped gracefully and restarted individually;
their exact endpoints were unavailable while stopped, then healthy. Three fresh
SDK reader processes returned identical historical v8 contract-state and accepted
transaction hashes, while finalized height advanced 73062→73063→73065. No wallet,
proof, deployment, transaction or ECS activity was introduced. No unrelated
container lifecycle operation was invoked. See local-infrastructure-recovery-v1.md
and local-infrastructure-recovery-verification.json for exact identities and limits.
Three regression cases verify persisted-state comparisons and recovery after an
ambiguous stop, failed outage check or unsuccessful initial restart.

The initial image guard stopped before mutation because it compared historical
Compose labels with actual image identities. Independent image inspection
resolved the distinction. Normal SDK teardown resolved a Windows Node abrupt-exit
assertion in the read-only baseline. The actual interruption run passed. The wiki
still describes M6 as NOT_STARTED; current source/evidence takes precedence. The
configured index targets information-flow rather than this worktree, so source
was read directly after wiki orientation. New acceptance.json records all 13
criteria without claiming complete M6. The original 62-attempt scope is exhausted;
remaining-preprod-scope-v1.md is a concrete proposal awaiting the user's decision.

The first current root check passed docs/typecheck but failed at Hardhat HHE22
under restricted Windows path resolution. The same existing Solidity compile
passed with normal filesystem access, without changing dependencies or source.
The complete suite is rerun in that environment; its final result is recorded in
acceptance.json. No compiler, contract, memory budget or public-service boundary
was changed by this continuation.
The final root run passed 402 checks, zero failures and zero skips. Public log:
`logs/m6-local-recovery-root-check-normal-access-20261019.txt`.

北京时间 08:42:38，固定 Local Dev 的定向故障恢复测试通过。现有索引器和节点分别正常
停止并重启；确认端点中断后恢复健康。三个独立 SDK 读取进程看到相同历史 v8 合约状态及
已确认交易校验值，最终确认高度从 73062 递增到 73065。未创建钱包、证明、部署或交易，
未使用 ECS，也未调用其他容器的生命周期操作。准确标识和范围限制见上述证据。另有
三项回归，覆盖状态比对及停止结果不明、故障检查失败、首次恢复失败后的恢复处理。

最初的镜像检查因误把历史 Compose 标签当成实际镜像身份而在修改前停止，经独立读取
修正。只读基线的 Windows Node 强制退出断言改为 SDK 正常结束后解决，实际中断测试通过。
Wiki 状态过时，索引连接属于 information-flow，因此直接核对当前 Permio 源码。新增
acceptance.json 逐项记录 13 条标准，未宣称 M6 完成。原 62 次授权已用完，剩余 Preprod
有界测试提案已形成并等待用户决定，提案文档不代表已执行新提交。

首次完整检查的文档和 TypeScript 通过，但受限 Windows 路径解析导致 Hardhat HHE22。
正常文件系统权限下同一个 Solidity 编译通过，未改依赖或源码；完整套件在该环境重新
执行，最终结果记录于 acceptance.json。本次未改变编译器、合约、内存预算或公网边界。
最终完整根检查通过 402 项，零失败、零跳过，公开日志见上述路径。

## 2026-10-20 — approved 172-attempt continuation and source-bundle repair

The user approved 172 total counted attempts and five application instances on
the same existing test contract and 16 GiB Singapore server. The 42-call phase
continues after the verified authority115 boundary; its 15-attempt reserve is
not automatically enabled. Source12 passed the complete 445-check root suite,
but runtime8 stopped during restoration because its public source bundle omitted
`m6-recovery150-private-scan.ts`. No new reservation, transaction or fifth
instance was created by that failed run. Its source, private diagnostic and
successful resource cleanup are retained.

Source13 includes the missing helper and isolates runtime9, with a separate
checkpoint namespace. A nonexecuting import-closure check reproduced the missing
dependency against source12 and passed for all 98 reachable modules against
source13. Typecheck and the actual helper import on ECS passed. All 223 source
hashes were verified; manifest SHA-256 is
`483b5d5373b467cd92ca04a95ec24aa6418463f96d1e51023f535999fb23a024`.
Runtime9 launched at 15:15 UTC and is reconciling the existing history before
new calls. The separate read-only evidence/export/verifier tools do not alter
the frozen runtime source. M6 remains IN_PROGRESS and independent human review
remains OPEN; launch and local checks do not establish native test completion.

用户批准在同一现有测试合约及新加坡 16 GiB 服务器上，执行总计最多 172 次尝试、
五个应用实例。42 次调用从已核验的 authority115 边界继续，15 次预留不自动启用。
源码第 12 版通过完整 445 项根检查，但运行第 8 版在恢复阶段因源码包漏加隐私扫描
辅助文件而停止；该次失败未产生新预留、交易或第五个实例。失败源码、私有诊断及
成功的资源清理记录均已保留。

源码第 13 版加入缺失文件，并为运行第 9 版使用独立检查点空间。无需执行入口的依赖
检查在第 12 版复现缺失，在第 13 版覆盖 98 个可达模块并通过；TypeScript 检查和
ECS 上实际导入该辅助文件均通过，223 份源码哈希全部核验，清单哈希见上。运行第
9 版于 UTC 15:15 启动，先核对既有历史。独立只读证据工具不会改变已冻结运行源码。
M6 仍为 IN_PROGRESS，独立人工审查仍为 OPEN；启动和本地检查不代表链上测试完成。

The fifth allocation subsequently finalized at ledger sequence 3063421
(reservation117); the live run continues credential setup. A review of all13
acceptance criteria is recorded in acceptance-coverage-review-approved172-v1.json
without automatically promoting their statuses. The evidence exporter now also
prepares a generated-circuit lifecycle check: reuse the original private action
witness and historical prepared state, substitute only the actual final revoked
module/template row, require the precise lifecycle assertion, and restore the
original row as a positive control. This is stronger than replaying an old public
transcript but remains a read-only generated-circuit check, with no new proof or
native transaction. Two targeted regressions covering both action families pass,
as does typecheck. Actual final Preprod-row evaluation remains pending the live
run's completion. All223 frozen execution-source hashes remain unchanged.

随后，第五个实例分配在账本序号 3063421 获得确认，对应预留117，实时运行继续凭证配置。
全部13项验收标准的复核已记录在上述 JSON 中，未自动提升任何验收状态。证据导出程序新增
生成电路生命周期检查：复用原私有操作见证及历史准备状态，仅替换为实际最终撤销的模块／
模板记录，要求在准确的生命周期断言处失败，再恢复原记录作为成功对照。该检查强于重放
旧公开执行轨迹，但仍属于只读生成电路检查，不生成新证明、不新增链上交易。覆盖两种
操作家族的两项针对性回归及 TypeScript 检查通过。实际最终 Preprod 记录的核验仍需等待
实时运行完成。223份已冻结执行源码的哈希均未改变。

### 2026-10-21 — code170 fee-proof recovery and final lifecycle calls

The exact saved157 candidate reproduced `Custom(170)` in a read-only node check.
Its native submission never occurred. Following the user's instruction to
diagnose and finish, one approved reserve covers the manually selected recovery:
158 retains the same unbound contract proof and rebuilds only the DUST fee after
a fresh strict-sync/indexer-time barrier;159 completes the final module revocation.
Both pass exact node validation and finalize once, at3066343 and3066383. The tail
closes with152 successful confirmations,4 native negatives and158 conservative
attempts within172,5 instances and3 receipts. All test templates/modules are now
revoked. Wallet/prover cleanup and restoration of the original swap state pass;
public evidence export, privacy scanning, verified downloads and offloaded-file
restoration continue. The precise original DUST state/time/proving cause remains
unresolved; the contract proof worked with a new fee proof. See
[the recovery evidence](after157-dust-proof-recovery-v1.md). M6 remains incomplete.

保存的157候选交易在节点只读检查中复现170，未进行原生提交。依照用户继续排查并完成剩余
调用的指令，人工选择使用一次已批准预留：158保留同一未绑定合约证明，在重新严格同步并
追上索引器时点后重建DUST手续费；159完成最后模块撤销。两者均通过准确节点验证且只提交
一次，分别在3066343和3066383确认。恢复任务成功退出，累计152次成功、4次原生负向结果、
158次保守计数（上限172）、五个实例及三份收据。所有测试模板／模块已撤销；钱包及证明服务
清理、原交换状态恢复已通过。公开证据导出、隐私扫描、下载核验及卸载文件恢复继续进行。
原始DUST状态／时间／证明故障的具体原因仍未确定；相同合约证明配合新手续费证明已成功。
M6整体仍未完成。

## 2026-10-21 — final acceptance reconciliation and input-boundary repairs

The final downloaded evidence was freshly rechecked:156 exact public transaction
pairs,152 successful finals,4 native negatives,3 receipts,4 causal public-program
replays,2 deprecation-admission replays and public provenance for4 remote
generated lifecycle checks. All13 technical criteria now have explicit evidence
tiers in acceptance-reconciliation-20261021-v1.json. Local regressions exposed
and fixed silently normalized signature-profile/protocol metadata and truncated
hexadecimal inputs. Additional coherent generated module/authority/admission
matrices pass. The full root check passes456 tests without failure or skips;
the Compact contract and frozen contract files are unchanged. No new native
submission, proof, instance, deployment or ECS operation was needed. A narrow
independent local-agent source review found no actionable issue; independent
human security/privacy review remains OPEN and M6 remains IN_PROGRESS.

最终下载证据已重新核验：156组精确公开交易字节、152次成功、4次原生负向结果、3份收据、
4项原因重放、2项弃用准入重放，以及4项远端生成电路生命周期检查的公开来源。13条技术标准
现已在新验收记录中逐项标注证据级别。新增本地回归发现并修复签名配置／协议元数据被静默
替换及十六进制输入被截断的问题；前后一致的模块、权限根和准入字段矩阵通过。完整根检查
通过456项，无失败、无跳过，Compact及冻结合约文件未改变。未新增原生提交、证明、实例、
部署或ECS操作。限定范围的独立本地Agent源码复核没有需要处理的问题；独立人工安全／隐私
审查仍未完成，因此M6仍为IN_PROGRESS。详见新验收核对及人工审查交接文档。
