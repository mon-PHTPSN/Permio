# M6 Development Log — Architecture Admission Boundary

Started: 2026-10-11; latest continuation: 2026-10-14<br>
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
