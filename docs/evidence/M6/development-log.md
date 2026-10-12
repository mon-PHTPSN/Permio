# M6 Development Log — Architecture Admission Boundary

Date: 2026-10-11<br>
Branch: `feat/m6-m8-midnight-delivery`<br>
Status: implementation in progress; staged activation admission, expiry
cleanup, proof-module governance, authority-root rotation, template and module
lifecycle, credential-status transitions, indexed-state reads, and reconnect
behavior verified on Local Dev; the depth-16 runtime-authorization design
failed its pinned-toolchain feasibility gate and the full runtime proof surface
is not yet implemented

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
| 12 | A different ancestry representation could certify lineage at issuance and use a current-root Merkle multiproof at action time; Ledger 9 could also provide native Ed25519, cross-contract calls, and a newer ZKIR path. | Adopt certified ancestry immediately; migrate directly to Ledger 9; keep the failed fixed witness; or first run a pinned Ledger-9 canary of the same design. | No replacement architecture has been approved. The present checkpoint records the options and evidence before further design. Committing it does not authorize Ledger 9, a status-leaf schema change, a multi-contract split, or reduced delegation semantics. | Unresolved. M6 remains incomplete pending an explicit user decision and a successful compile/deploy/proof feasibility gate for the selected direction. |

On 2026-10-12, after reviewing the depth-16 failure and the possible
issuance-certified ancestry and ledger-9 investigations, the user approved a
local checkpoint commit of the current implementation and evidence. The
purpose of the checkpoint is to preserve the verified nine-circuit baseline
before the next architecture decision. It is not M6 acceptance, will not be
pushed by this task, and does not select either open option.

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
