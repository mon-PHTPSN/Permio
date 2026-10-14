# `@permio/midnight-authorization`

This application-neutral package defines the first M6 boundary between an
immutable M4 activation and the Midnight authorization registry. It validates
that an M4 activation still names the exact active M2 template content,
canonicalizes the admission envelope, commits the exact M4 activation and
review evidence, and binds every template action to one exact proof-module
implementation and receipt schema.

The current working profile is `permio-authorization-v7`, with runtime policy
v2 and private instance-state opening v2. Its new consolidated slot-management
entry point implements signed begin, bounded parent verification and atomic
finalization against current roots/state. It adds a narrow slot-governance
authority (kind 13), not implicit activation/reviewer privileges. Fresh real
keys and a new deployment are required; the live slot acceptance is pending.

当前工作配置为 v7，策略 v2 和私有实例状态 opening v2。新增合并的槽位管理入口，在当前根／状态下执行签名开始、逐个验证上级和原子最终执行；增加窄槽位治理权限 13，不隐式赋予激活者／审查者权力。需要新真实密钥及新部署，当前槽位实链验收仍待完成。

Current v7 results: 250 regression cases pass. The real compiler measures
818,608 slot rows (k20), down 25.76% from k21, but the isolated resource-guarded
key probe stopped and no complete current real-key inventory exists. The live
--slot-state command fails before wallet startup on the missing build manifest;
Docker is separately unavailable. See
[`runtime-slot-state-v1.md`](../../docs/evidence/M6/runtime-slot-state-v1.md) and
[`runtime-slot-state-verification.json`](../../docs/evidence/M6/runtime-slot-state-verification.json).
No new node slot proof, ordinary action or DecisionReceipt is claimed.

当前 v7 的 250 项回归通过；真实编译器测得槽位 818608 行／k20，比 k21 减少 25.76%，但受保护探测停止，尚无完整匹配真实密钥。实链 --slot-state 在缺少 manifest 的钱包启动前失败，Docker 也单独不可用。证据见上述文件，不声称新节点槽位证明、普通动作或收据通过。

The preceding v6 profile added an activation-authenticated root of M2 slot-assignment rules and
private witness preparation against the separately committed M5-P1 patch.
The root commits assignment rules, not proof that an account occupies a slot
or that its assignment remains active on chain. See
[`runtime-policy-v2.md`](../../docs/evidence/M6/runtime-policy-v2.md) for the
exact migration and outstanding ledger authorization. v6 needs a fresh
deployment and matching real keys; v4/v5 evidence is not relabeled as v6.

前一阶段 v6 使用运行时策略 v2，新增由激活配置认证的 M2 槽位分配规则根，以及接入独立 M5-P1 补丁的私有 witness 准备。规则根不等于已证明账户占据槽位或分配在链上仍有效。策略文档保留该阶段迁移和待实现链上授权。v6 当时使用新部署和匹配真实密钥；历史证据不改称当前 v7。

This v6 slice passes 230 repository tests and ten real key pairs. A fresh local
deployment plus all 17 governance/allocation transactions finalized, including
policy-v2 allocation, prospective lifecycle checks and reconnect. Independent
reads preserved the exact allocation/state history. The first attempt's RPC
timeout and confirmed indexed staging effect are retained separately; the
fresh retry passed without optional profiling or concurrent tests. Assignment
issuance/current-role proofs and ordinary actions are still not implemented.
See [`slot-assignment-verification.json`](../../docs/evidence/M6/slot-assignment-verification.json).

v6 本切片通过 230 项仓库测试和十组真实密钥，新本地部署加 17 笔治理／分配交易全部确认，包括策略 v2 分配、后续生命周期限制及重连；独立读取确认分配／状态历史不变。首轮 RPC 超时及暂存实际落链的证据独立保留，新部署在关闭可选采样、无并行测试时重跑通过。分配签发／当前角色证明及普通动作仍未实现，不能据此声明 M6 完成。

The preceding slot-chain diagnostic continuation passed 233 repository cases.
It reproduces valid 34-record slot provenance with a depth-zero capability,
including distant ancestor revocation. Pinned Compact rejects runtime-sized
vectors/loops; a fixed-size control compiles. No production contract/key or
Midnight state changed. Staged complete-slot verification and a narrow
namespace slot-governance profile were subsequently approved by the user's continuation; no depth cutoff,
implicit privilege or host-trust fallback was adopted. See
[`slot-assignment-architecture-boundary.md`](../../docs/evidence/M6/slot-assignment-architecture-boundary.md).

前一阶段槽位链诊断通过 233 项回归，复现能力深度为零但槽位上级链含 34 条记录及远端撤销。固定版本 Compact 拒绝运行时长度向量／循环，常量对照通过。当时未改生产合约／密钥或 Midnight 状态；用户随后批准完整槽位链分阶段验证及窄命名空间槽位治理方向，未采用深度上限、隐式权力或宿主信任替代。

The historical v5 slice passed 180 repository tests, ten real key pairs, and a fresh
Local Dev deployment plus 17 finalized transactions. Exact policy/initial
state, allocation history, reconnect, lifecycle and independent public reads
passed; wrong-state/configuration negatives are preflight, not node-rejected
transactions. See
[`template-policy-verification.json`](../../docs/evidence/M6/template-policy-verification.json).
Neither ordinary runtime actions nor the common DecisionReceipt are complete.

本轮 v5 已通过 180 项测试、十组真实密钥、新的本地部署及 17 笔最终确认交易；精确策略／初始状态、分配历史、重连、生命周期和独立公开读取通过。错误状态／配置的负面检查属于预执行拒绝，不是节点拒绝交易。具体证据见 JSON；普通运行时动作及通用 DecisionReceipt 尚未完成。

The package does not grant trust or replace M4 review. Template admission is a
staged on-chain protocol:

1. `beginM4Activation` verifies the exact governance envelope and reserves its
   nonce without activating the template.
2. `stageM4ActivationBinding` accepts one complete action binding at the next
   canonical index, verifies its depth-20 manifest path, and requires the exact
   proof-module ID, version, implementation hash, and receipt schema to match
   an active public module record.
3. `finalizeM4Activation` rechecks the current admission authority and writes
   the immutable active-template record only after every index was staged.

Actions are not divided internally. A variable-length action list is processed
one whole binding per transaction, in M2 action order. The session stores only
a next index and rolling accumulator, so temporary on-chain state is constant
size regardless of the number of actions.

Every session has a governance-signed Unix-time deadline enforced with
Compact's protocol block-time comparisons. An expired or stale session is
removed automatically when a begin, staging, or finalization call touches it.
Cleanup releases the reserved nonce but cannot delete active templates, used
nonces, or activation history. There is no privileged maintenance actor and no
separate cleanup transaction circuit.

Proof modules have their own public governance lifecycle. A proposal records
the exact module ID, semantic version, implementation hash, implementation
reference, source hash, input/configuration/receipt schema hashes, compiler
hash, compatibility-policy hash, and the current namespace authority-root
reference. Proposing is non-trusting: it creates status `proposed` only.

`reviewProofModule` requires unique eligible `protocol-reviewer` authorities
until the configured review threshold is met. `governProofModule` dispatches
the signed requested lifecycle transition. Its approval branch requires a
separately configured threshold of unique eligible `module-approver`
authorities. Review and approval use separate evidence accumulators, so one
cannot be presented as the other. Reaching either threshold does not activate
the module. Only the dispatcher branch requiring an eligible
`module-activator` can move an approved module to `active`.

The implemented public lifecycle is:

```text
proposed -> reviewed -> approved -> active -> deprecated -> revoked
```

An eligible module approver may apply the already-pinned compatibility policy
by deprecating an active module. Only a `module-emergency-revoker` may revoke
an active or deprecated module. Both transitions are prospective: they block
new template admission or proof use without deleting the module record,
historical template activations, or receipts. Agents may build and test module
code, but the package does not treat an agent as a production human reviewer,
approver, or activator.

Namespace authority roots are themselves threshold-governed. The current root
record stores an `authorityRootUpdateThreshold` of at least two. A signed update
binds the exact old and new policy, root, version, sequence, all three next
thresholds, effective time, and nonce. One `authority-root-governor` cannot
rotate the root, duplicate approval by the same eligible leaf is rejected, and
the governance activator has no root-rotation privilege.

Template lifecycle is separate from module lifecycle and root governance.
`terminateTemplate` selects the required authority from the requested target
state: a dedicated `template-retirer` may change only `active -> retired`, while
an emergency revoker may change `active|retired -> revoked`. Both are
prospective and preserve the exact
activation sequence, activation time, content hash, and admission evidence;
they append a reason, effective time, and template-lifecycle sequence instead
of rewriting history.

The pre-consolidation fourteen-circuit single-contract build was not
live-accepted. On the pinned Local Dev stack, the node rejected its 36,225-byte
deployment transaction with RPC 1010 because it would exhaust the block limits.
Consolidating equivalent entry points reduced the final build to eleven
circuits, which deployed and completed the live governance/lifecycle flow on
the same unmodified stack. No local limit was raised and no verification was
removed.

The first size-preserving refactor replaces separate first/subsequent root
approval entry points with `submitAuthorityRootApproval`. Each governor still
submits an independent signature and transaction; the circuit determines from
public progress whether it is recording approval one or a later unique
approval. This changes neither the threshold nor the authority model.

That consolidation reduced the generated deployment transaction from 36,225
to 33,809 bytes, but Local Dev still rejected it with the same RPC 1010 block
limit error. The node's normal-class byte limit is 786,432 bytes, confirming
that execution weight—not raw transaction length—was the limiting dimension.

The next approved size reduction combines module approval, activation,
deprecation, and revocation into `governProofModule`, and removes the standalone
cleanup circuit in favor of automatic bounded cleanup in the existing staging
entries. Each signed module branch retains its original authority kind, legal
source statuses, duplicate protection, threshold, and nonce checks. Template
retirement and revocation remain consolidated in `terminateTemplate`. The
approver/retirer paths cannot exercise their corresponding activation or
emergency-revocation paths.

The next implemented slice adds canonical M5-to-Midnight account, capability,
session, and action-intent bindings, separately profiled Jubjub/Schnorr
signatures, seven private scope-membership roots, and one verified depth-20
credential-status transition circuit. Issuance proves the assigned leaf is
empty; revocation proves the exact active leaf; both derive the replacement
root and advance a namespace sequence. The leaf permanently binds its proper
prospective revocation authority, so a caller cannot substitute another active
account key.

This refactor reduced the source from twelve to nine transaction circuits.
Compact 0.31.1 compiled it, all 18 package tests passed, and the unchanged
ledger-8 Local Dev stack deployed contract
`131ed4886a6419a949728289de8c67e176fddfb15f7bf2d058c12812de2627d7`.
The live run activated and revoked a runtime account status, rejected an
unauthorized revocation, and completed the full governance, admission,
lifecycle, indexed-state, replay, and reconnect regression. Credential-status
deployment is therefore live-accepted; the two runtime authorization proof
families and common receipt remain incomplete.

The subsequently approved fixed-size private witness for the complete M5
depth-16 capability ancestry passed Compact source, type, bounded-loop, and
privacy analysis but did not complete proving-key generation on the pinned
0.31.1 toolchain. A combined ten-circuit feasibility build entered a stable
26-thread synchronization wait after 13 minutes 45 seconds of CPU time; after
24 minutes 57 seconds of wall time both probe key files were still empty. The
probe was removed and the nine-circuit baseline was recompiled successfully.
No smaller-depth, terminal-only, accumulator, multi-contract, or raised-limit
fallback has been adopted; selecting one would change an approved architecture
or M5 guarantee.

The user subsequently approved an issuance-certified ancestry and current-root
multiproof direction on ledger 8, followed by staged private scope attenuation
at capability issuance. Exact counts beside all seven private roots were
introduced in capability v2 and retained in current v3. Begin verifies the signed capability, exact
parent/issuer, current status, and strict time-or-count narrowing. Each stage
reconstructs one hidden child dimension from its canonical empty root and, for
delegation, proves the hidden value belongs to the matching parent root.
Finalize activates only when all reconstructed roots and counts equal the
signed credential and the issuer and parent remain active under the current
status root.

The existing `updateRuntimeCredentialStatus` entry point takes these operations:

| Operation | Behavior | Changes the credential-status root? |
|---|---|---|
| `1` | Direct account issuance or exact active-to-revoked transition; direct capability **and session** issuance are rejected. | Yes, after authorization. |
| `2` | Open signed capability or session certification from seven empty private scope trees. | No. |
| `3` | Stage one hidden, uniquely ordered value; delegated capabilities and all sessions must prove parent membership. | No. |
| `4` | Finalize exact reconstructed roots/counts and current issuer/parent status, or remove an expired temporary session. | Only successful finalization. |

`CapabilityAttenuationPlan(child.scope, parent.scope)` produces each private
stage's input progress, value, insertion path, parent membership path, and next
progress. Omit the parent only for a root capability. A missing parent value
throws before changing the plan, so retrying that invalid step is deterministic.
For a transient transaction failure, retain and retry the same returned stage;
call `stageNext()` again only after the preceding transaction has finalized.

`SessionAttenuationPlan(session.scope, capability.scope)` uses the same stage
format but always requires a parent. Session v2 signs exact counts beside all
seven roots. A session with N total values needs N+2 setup transactions; no
selected-value intersection may replace complete certification. Begin checks
exact active holder/parent, the holder's two signatures, contained validity,
strict scope-or-time narrowing and a runtime key different from the holder's.
Finalization rechecks current holder/parent status. The historical capability
map/type names are shared by both kinds; the v2 certificate binds the exact
v3 command including kind. `capabilitySignature` is the session signature for
kind 3. The final dispatcher argument is `sessionCredential`; pass
`createEmptyRuntimeSessionCredential()` when unused. This zero placeholder
is never an eligible credential.

Refresh the empty child-status path and active issuer/parent paths from the
latest status tree before finalization. The begin-time status sequence is
bound into the certification, but finalization checks those paths against the
current ledger root rather than trusting the old snapshot. A governance
authority-root rotation is different: the command's authority version and
sequence must still match the current authority record.

The total number of staged elements is observable; individual counts,
dimensions, values, paths, and ancestry depth remain private. Each dimension's
values use strictly increasing 64-bit ordering keys, extracted as a
little-endian integer from bytes 24-31 of the full hash. Leaves and membership
proofs still bind all 32 bytes. The builder rejects exact duplicates and any
two distinct hashes with the same ordering key within one dimension before
constructing a credential. Such a collision makes that scope unrepresentable
in this version; it cannot widen authority or silently merge values. Duplicate,
incomplete, expired, equal-scope, expanded-scope, and parent-revoked flows are
rejected by simulator tests. Compact 0.31.1 generated the unchanged
nine-circuit contract, with all 18 nonempty proving and verification keys;
the corrected credential-status prover key is 169,945,774 bytes (`k=19`,
517,658 rows). Local Dev accepted all eight root-capability stages,
finalization, and account revocation. The combined run then failed from proof
server OOM during module governance. A separate governance-only regression
passed after restarting that service. A subsequent constrained-prover retry
also accepted seven delegated stages, child activation, and revocation at
status-root sequence 5, but OOM-killed the prover at the first module approval.
The combined workflow's memory issue, remaining negative delegated live cases,
action-time current-root ancestry multiproof,
runtime authorization families, and common receipts remain before M6 completion.
See `docs/evidence/M6/scope-uniqueness-verification.json` and
`docs/evidence/M6/delegation-prover-verification.json` for partial results.

The current runtime capability **and session** credentials/status leaves are
version 2. Every credential-status command is now version 3 (direct account or
revocation commands set `stagingExpiresAt` to zero). Accounts retain version 1.
The session-only build used `permio-authorization-v2`; the allocation extension
uses the matching `permio-authorization-v3` deployment profile. Old
session v1 leaves lack full-scope certification and are rejected by active
ancestry. A changed encoding/hash requires new signatures, keys and a matching
deployment; this does not upgrade old deployed verifiers. No production
migration is implemented or implied. The live results above describe the
earlier capability-only build, **not** this session extension's verification.

### Private instance allocation continuation (2026-10-14)

`createRuntimeInstanceAllocation` consumes the actual M4
`InstantiationAuthorization`, an active validated M2 template record and the
original M5 creation snapshot. M4's authorization is a typed in-memory record,
**not an Ed25519-signed allocation**. A separate namespace `allocator` signs
the exact chain-specific assertion under the existing Schnorr profile. No M4
reviewer key or new instance-authority root is introduced.

The adapter checks the exact template/version/hash, allocation request and
allocator, original initial state, lifetime, and every explicit M5 issuer's
profiled key. Duplicate principal IDs, duplicated keys, omitted/extra issuers,
and nonces of zero are rejected. The private signed assertion binds those
facts, current authority-root references, target network/deployment, a
transaction deadline, and independent allocation/state nonces. The original
M5 snapshot hash remains the credential `instanceCommitment`; a later state
snapshot must not be substituted for it.

`allocateRuntimeInstance` requires a directly registered **active exact**
template and an eligible current namespace allocator. It verifies the exact
signature and time bounds, consumes deployment/namespace-scoped request and
instance-identity nullifiers, and initializes an immutable allocation binding,
current state commitment and sequence zero atomically. Retirement/revocation
blocks new allocations without rewriting an existing record. The public map
contains only `allocationCommitment`, `currentStateCommitment`,
`transitionSequence` and `lifecycleStatus`; its key is `instanceCommitment`.
The namespace/template lookup, creation time and transaction deadline are also
observable. Issuer identities, issuer-tree root/count, M4 request content,
private instance expiry, state label/opening and nonces are not disclosed.
Use high-entropy private instance/request IDs: the stable scoped replay
nullifiers are not randomized commitments and do not by themselves defeat
dictionary guesses of low-entropy identifiers.

`assertRuntimeInstanceIssuer` requires **both** membership in the allocated
issuer tree and eligibility in the current namespace-authority root. Exact
authority leaves (including policy and validity) are pinned; root rotation
does not silently replace an instance's issuer bindings. This prepared
predicate is now wired into the v4 credential dispatcher (see below), but
**ordinary-action ledger entry points remain unfinished**. The v3 allocation
trace below is historical and does not validate the changed v4 verifier.
The SDK checks the M2 initial state locally; this slice attests the allocator's
exact signed state commitment, not an independent Compact reconstruction of
the M2 JSON. Final ledger-bound policy/configuration checks remain required.

Run `npm run test:live:m6:allocation` after the full real sequential key build.
It uses real M4 allocation and M5 creation APIs and a matching disposable
deployment, a real allocation transaction, indexed reads and reconnect; it
labels SDK/generated-circuit negative preflight failures separately from
node-rejected proof transactions. This partial check does not replace full
M6 action, receipt, privacy or restart acceptance.

The 2026-10-14 v3 run passed: the unchanged Local Dev node accepted the
ten-circuit deployment and 17 transactions (governance plus one allocation),
with exact indexed commitments, reconnect and preserved allocation history
after template retirement/revocation. All 160 local checks passed. Allocation
activation-to-verification was 30.039 seconds for one end-to-end sample, not
isolated proof or ordinary-action latency. The earlier v2 credential/session
trace is not v3 verifier acceptance: program/key hashes changed despite
unchanged dispatcher logic and rows. See
`docs/evidence/M6/allocation-verification.json` for all transaction IDs, asset
hashes, independent public read, and unfinished integration/privacy gates.

私有实例分配延续原有命名空间权限 root、Schnorr 密钥配置和单合约架构。M4 分配授权是类型化内存记录，不是 Ed25519 签名；M6 由独立分配器签署精确链专属断言。SDK 校验 M2 初始状态、M4 分配及原始 M5 快照；链上验证分配器、激活模板、签名、时间和单次使用标识，仅公开 commitment、序号及必要查询／提交时间信息。v4 已将实例签发者双重资格检查接入凭证，普通动作及 M2 初始状态最终电路策略绑定仍待完成。稳定重放 nullifier 不保护低熵标识，应使用高熵私有标识。上述 v3 真实证据只属于历史匹配部署，不能证明已变更的 v4 验证器，也不代替 M6 完整验收。

### Allocation-bound credential dispatcher (v4 continuation)

`updateRuntimeCredentialStatus` now takes a private
`RuntimeCredentialInstanceBinding`: the original allocation opening, the
issuer's allocated-list membership path, and a selected public submission
deadline bounded by the private instance/account/issuer lifetimes. It verifies
the immutable on-ledger allocation commitment and exact template/instance.
Issuance requires an active instance; an expired allocation does not prevent
an authorized revocation or permissionless cleanup of expired staging.
Deadline choice also matters: choosing private expiry minus one second
discloses that expiry by convention. The live fixture does so for long serial
setup; it is not expiry-hiding evidence. A caller needing expiry privacy must
choose a shorter, independently selected submission window within every
private lifetime. This does not change the signed credential's lifetime.

Account issuance and root-capability certification require both current
namespace eligibility and membership in this particular instance's issuer
list. Capability credential/status-leaf version **3** additionally pins the
original namespace issuer authority commitment; even another allocated
issuer cannot revoke that root or replace its issuer during finalization.
Descendants inherit that commitment. Account version 1 and session version 2
remain unchanged. Every status mutation binds its physical Merkle position
to the signed index, and parent/account membership checks bind their positions
too. These are incompatible disposable profile-v4 assets, not an upgrade of
deployed v2/v3 contracts.

`npm run test:live:m6:credential-binding` (also the compatibility alias
`npm run test:live:m6:session`) activates a template, allocates through actual
M4/M5 APIs, then registers an M5 account, issues an M5 root grant and M5 session,
and sends their real Compact certification/revocation transactions. It labels
SDK rejection separately from a node-rejected transaction. The fixture uses
a declared **14,400-second M2 maximum duration** and a two-hour instance for
this serial setup regression; this does not establish that a 900-second
interactive capability can complete this multi-transaction setup. It does not
measure ordinary-action latency or produce the final common DecisionReceipt.
The old unallocated `--memory-smoke` fixture now fails closed; its recorded
historical evidence remains available, not rebranded as current acceptance.

Independently read this fixture's public state with
`npm run verify:m6:public-state -- logs/m6-live-<timestamp>.jsonl`.
Add `--final` only after the complete workflow: it requires status sequence 5,
five consumed credential nonces, no temporary sessions, root version/sequence
2/2 and the final template/module lifecycle states. This deliberately checks
the one-instance disposable fixture, not an arbitrary production deployment.
It does not load wallet/account files, private witnesses, or proving keys.
Input is restricted to the worktree's public log directory (including realpath
checks); malformed paths/options fail before network IO.

The corrected 2026-10-14 v4 run passed: ten-circuit deployment plus **38 real
transactions**, including all 21 allocated account/root/session operations.
All **170** root tests passed. Independent public reads before and after
targeted node/indexer restarts matched exact commitments, status sequence 5,
five consumed credential nonces, zero staging sessions and final lifecycle
states. The first attempt's later expired-replay assertion is preserved in
`docs/evidence/M6/issuer-binding-verification.json`, not hidden or counted as
a whole-harness pass. M6 still lacks final policy/identity/action integration,
common receipts and full negative-node/privacy acceptance. Sampled prover
RSS exceeded 6 GiB and paging occurred; this is not production readiness.

修正后的 v4 完整流程已通过部署加 38 笔真实交易，其中 21 笔为实际分配后的账户／根能力／会话操作；根目录 170 项测试全部通过。节点和索引器定向重启前后的独立公开读取一致，状态序号 5、已使用凭证 nonce 为 5、临时会话为零。首轮过期重放断言失败完整保留，并未当作整轮通过。M6 的最终策略／身份／动作、通用收据、节点负面交易及完整隐私验收仍待完成；证明器 RSS 超过 6 GiB 且发生分页，不代表生产就绪。

v4 将凭证操作绑定到链上不可变分配 commitment、精确模板和实例，并在签发时同时检查当前命名空间资格与实例签发者名单。能力凭证及状态叶升级为 v3，固定原始签发者，其他已分配签发者也不能替其撤销根能力；账户 v1、会话 v2 不变。状态 Merkle 路径位置必须符合签名索引。真实回归使用 M4/M5 API 和新的匹配部署，但长时效测试配置不证明短时效交互场景可行，也不代替最终动作、通用收据、隐私及重启验收。旧未分配内存测试现在明确拒绝运行；历史证据保留。

`npm run test:live:m6` writes public milestone events to a uniquely named,
ignored `logs/m6-live-*.jsonl` file as well as stdout. The current allocated
root/session fixture uses one value in each of seven dimensions; each
certification sends begin, seven stages and finalization. Multi-value ordering
remains covered by simulator tests and historical live evidence. Logs contain transaction
IDs, public contract addresses, counts, and observed lifecycle results; private
scope values, hashes, paths, credentials, and keys are not included.

`npm run test:live:m6 -- --governance-only` runs the existing governance,
admission, lifecycle, and reconnect regression without runtime credential
transactions in that process. Both initial and final public events explicitly
label this scope. This mode does not count as complete M6 acceptance or as a
successful combined run. Both modes accept an optional account-file path before
or after the option; the default is the sibling Local Dev example account file.

### Private current-status multiproof preparation

`CredentialStatusTree.multiproofFor(indices)` prepares a private witness for
multiple exact positions in the same depth-20 status tree. Shared branches
appear once, in deterministic level/parent-index order. The builder rejects
duplicate positions, mismatched path positions, mixed snapshots, and invalid
bounds. `verifyCredentialStatusMultiproof(proof, root, sequence)` requires both
the caller's exact root and sequence and rejects altered leaves, altered or
unused siblings, and noncanonical ordering.

This helper proves **membership only**. Empty and revoked leaves also have
valid membership proofs. It does not certify ancestry, active status, account
validity, session authority, intent authorization, or an on-chain transaction.
The predicates below are implemented as private circuit helpers, but still
need integration into a runtime ledger entry point against its current root.
The witness is not a public receipt and must not be
logged. A 35-leaf fixture exercises the capacity shape of 17 capabilities,
17 accounts, and one session; it is not a live depth-16 authorization claim.

### Private active-ancestry and exact-action predicates

`createRuntimeStatusMultiproof(proof)` encodes the canonical membership witness
as a private, bounded postorder program. It supports 35 selected leaves and
588 instructions: the complete depth-16 shape of 17 capabilities, 17 holder
accounts, and one session. The bound is exact, not a lower delegation limit:
at tree depth `d`, at most `min(2^d, 35)` internal nodes are marked, so the
depth-20 tree needs at most 553 merges plus 35 leaf pushes. Required leaf
indices are unique and sorted. An ordered hash transcript binds every push to
the exact required leaves; hash-linked private stack openings constrain every
pop and merge. Neither working-memory hash is a public status root, a lineage
authority, or a replacement for current ancestor revocation.

`prepareRuntimeActiveAncestry({ capabilities, accounts, session, statusTree,
now })` takes the complete certified root-to-terminal chain and its matching
holder accounts, copies inputs, prepares one shared proof, and runs the
generated Compact preflight. Repeated holder accounts share one status leaf.
The circuit requires exact active leaves for **every** capability, every
holder account, and the session under the supplied exact root and sequence;
it also checks certified parent/issuer links, template/instance/context,
supported versions, time/depth bounds, terminal session binding, and canonical
unused slots. An empty or revoked leaf can have valid membership but cannot
satisfy these active predicates. Status-tree fixtures are not issuance proofs.

`buildRuntimeActionScopePaths(intent, scope)` prepares private membership paths
for all seven intent fields. `verifyRuntimeActionAuthorization` additionally
checks the holder's Schnorr signature over the session, the session's signature
over the exact intent, and each field against both the certified terminal
capability and signed session scope. This is a non-ledger circuit helper: it
cannot allocate an instance, consume a nullifier, advance state, or emit an
accepted decision. Its explicit `now`, root and sequence are caller inputs
until the runtime transaction binds them to protocol time and current ledger
state. Do not expose this helper as an authorization API.

`createRuntimeActionIntent(intent, m5SessionPublicKeyPem, sessionCredential,
allocatedInstance)` now requires the original exact M5 allocation snapshot.
It rejects a validly signed intent naming another instance, or a substituted
snapshot whose canonical hash differs from the session's instance commitment.
M5 Ed25519 verification and the separately signed Midnight runtime intent
remain distinct; this builder does not claim Compact verifies Ed25519.

Tests exercise full depth 16, the exact 588-step worst case, altered stack
openings and leaf transcripts, stale status, revoked ancestors/accounts/session,
missing parent links, cross-context substitution, unauthorized signing keys,
and all seven signed out-of-scope intent fields. These are generated-circuit
simulation tests, not live action acceptance. Private allocation, exact runtime
module/configuration admission, protocol-time binding, atomic state/nullifier
ordering, common receipts, and required Local Dev tests remain unfinished.

`npm run test:live:m6:status -- <diagnostic-assets>` runs the separately built
`contracts/diagnostics/current-status.compact` against the configured disposable
Local Dev stack. It includes all nine existing transaction circuits plus one
non-mutating membership check. Build its generated bindings, ZKIR and real key
pair before running it. It refuses missing keys before wallet startup and may
reuse baseline keys only when their generated proof programs are byte-identical.
Its synthetic constructor root, 35-leaf membership proof and reconnect checks
are explicitly diagnostic, not credential-issuance or action-authorization
acceptance. Logs label client-preflight negatives separately from accepted
transactions and never serialize a private witness or raw SDK exception.

Generate the diagnostic's bindings and proof program in the pinned WSL
environment (this command intentionally does not generate proof keys):

```bash
compact compile +0.31.1 --skip-zk \
  --compact-path packages/midnight-authorization/contracts \
  packages/midnight-authorization/contracts/diagnostics/current-status.compact \
  logs/m6-current-status-managed
```

The include path is required for the included main contract's `schnorr` module.
Use the matching 0.31.1 `zkir compile` executable to generate the diagnostic
key pair before the live runner. The current membership diagnostic is `k=20`,
705,943 rows; local key generation did not complete, so no diagnostic deployment
or accepted membership proof is claimed. Do not treat `--skip-zk`,
`mock-compile`, simulator tests or the failed runner's missing-key guard as a
successful real-proof check.

The user approved full session-subset certification on 2026-10-14. Generated
Compact tests now reject the original parent `{A}` / session `{A,B}`
counterexample at begin, and reject an out-of-parent value even with equal
counts during staging. They cover exact finalization, legacy versions,
altered hashes, unauthorized signers, duplicate/incomplete stages, false
counts, expired cleanup, and parent/holder revocation during staging.
Synthetic constructor roots in these unit tests are explicitly fixtures,
not live parent issuance evidence. No live action entry point uses the helper.

`npm run test:live:m6:session -- [local-account-file]` targets Local Dev and
starts with an empty status root. It attempts actual account issuance,
eight root-capability stages/finalization, seven session stages/finalization,
session revocation, indexed-state comparisons and reconnect: 21 runtime
transactions plus deployment. It does not establish allocator eligibility,
runtime actions, common receipts or negative node transactions. The current
initial run stopped before wallet startup because real matching keys were missing;
see `docs/evidence/M6/session-certification-verification.json`. This is an
unverified chain-facing slice, not M6 completion.

### Pinned Compact build

From the repository root in the configured Linux/WSL environment:

```bash
RAYON_NUM_THREADS=1 TOKIO_WORKER_THREADS=1 npm run compile:compact
```

The root script explicitly selects compiler `+0.31.1`, regenerates bindings,
then calls the pinned ZKIR compiler **one circuit at a time**, largest changed
dispatcher first, with Rayon/Tokio worker settings of one. It writes an ignored
`keys/build-manifest.json` only after all real key pairs succeed. Live runners
check exact program/key/binding hashes and nonempty sizes before wallet startup;
deploy/reconnect wrappers check again. This is build-integrity checking, not
governance trust or proof verification. Missing, empty or stale keys fail closed.
The extension still measures `k=19`, 484,064 rows. Initial batch and sequential
real-key attempts stopped with exit 1 and left empty keys. Sequential generation
is not claimed to solve the workstation failure. No memory/toolchain change
was made. Generated proving keys are ignored and must be regenerated before
a fresh checkout can run live tests.

A subsequent user-authorized retry stopped unrelated Envio containers and
used `node scripts/run-compact-key-retry.mjs` in WSL. This public-only monitor
records descendant PIDs, CPU/RSS/HWM/swap and available Linux memory every
ten seconds, without reading process arguments, environment or wallet files.
That attempt exposed a more specific environment blocker: systemd's
`init.scope` stop timeout explicitly SIGKILLed both Node processes and the
compiler. The scope retained `Result=oom-kill`, `OOMPolicy=stop` and a single
historical OOM kill counter; kernel OOM records did not increase during the
retry. Its last sample still had about 5.5 GiB available. The historical 6 GiB
scope peak is not this retry's compiler peak. See
`docs/evidence/M6/key-generation-retry.json`. No scope-policy change, global
WSL/Docker restart or second monitored retry was performed without approval.

After the user approved a clean WSL/Docker restart, the scope recovered to
active/running with zero OOM counters. Docker's separate Windows stale-socket
startup failure was recovered with the documented timestamped runtime-directory
backups; no containers or data volumes were deleted. Only the three M6 services
were restored. The full pinned sequential build then generated **all nine real
key pairs**, with exact assets verified by the live runner. The monitor measured
627.2 seconds elapsed and maximum observed compiler HWM 5,097,372 KiB, with
zero sampled compiler swap and no new OOM. Its wall-clock timestamps span
660.372 seconds; these two clocks differ, so this is not a production latency
benchmark. No memory setting, OOM policy, compiler, ledger or contract changed.
The formerly missing-key gate is cleared. The Local Dev session test then
**passed all 21 runtime transactions**: account issuance, eight capability
stages and finalization, seven session stages and finalization, session
revocation, indexed-root comparisons and reconnect. The final status-root
sequence is 4. Full-run evidence is in
`docs/evidence/M6/clean-restart-verification.json`. Offline key generation
is not a customer transaction proof and does not establish M6 completion.

This live credential workflow took 3,714.819 seconds (about 61m55s) from
asset verification to final state verification. The event window covering
all nine session-provisioning transactions was 1,607.164 seconds (26m47s).
These are end-to-end event windows, not isolated proof timings. The existing
local weak-cache proof service used four CPUs and one job slot in the shared
7.65 GiB WSL VM with 2 GiB swap: service-lifetime RSS HWM 7,211,336 KiB
(about 6.88 GiB), cgroup memory peak 7,436,992,512 bytes and swap peak
1,477,718,016 bytes, with zero OOM events. Peak RSS and peak swap need not
occur simultaneously. This is not a validated strict-6-GiB or no-swap profile,
stock-upstream result, ordinary-action proof, negative-node test or post-deploy
restart test. Allocation, ledger action/state/nullifier logic and common
receipts remain unfinished; M6 is still incomplete.

`npm run check` runs documentation freshness, TypeScript, Solidity, package
tests, and Hardhat; it does not regenerate Compact keys. Do not run heavy key
generation concurrently with the constrained local proving test.

### Local proving resource profile

`scripts/local-midnight-proof-server.yml` supplies an opt-in constrained
8.1.0 prover: one proving worker, one queued job, four Rayon threads, and a
four-CPU quota. It binds only `127.0.0.1:6300` and does not enable verbose
request logging. The version-matched server source logs raw proof inputs at
debug level, so do not add `-v` to this profile.

Check `/ready` for zero processing/pending jobs before replacing the local
prover. Preserve the existing container and copy only its public parameter
cache into the ignored host directory:

```powershell
New-Item -ItemType Directory -Force logs/m6-proof-server-public-cache
docker cp midnight-proof-server:/.cache/midnight/. logs/m6-proof-server-public-cache
docker stop --timeout 30 midnight-proof-server
docker compose -f scripts/local-midnight-proof-server.yml up -d --pull never
```

The node and indexer keep running. Both proof containers use the same pinned
image; the original's public cache remains available for recovery. To restore
it after verifying the constrained server is idle:

```powershell
docker stop --timeout 30 permio-m6-proof-server
docker start midnight-proof-server
```

The extended default live run includes a second account and a seven-element
delegated capability with real parent-membership proofs. Those positive
transactions passed, but the complete combined run still exited 1 from OOM at
the first module approval. This profile is a reproducible failed memory
mitigation experiment, not a proven memory fix. Only the crashed prover was
restarted afterwards; the node, indexer, and accepted status-root sequence 5
were preserved. The original prover container remains stopped and recoverable.

For long Windows runs, the optional wrapper temporarily requests that the
system not enter automatic idle sleep, and restores the thread's previous
execution state in `finally`:

```powershell
.\scripts\run-live-m6-awake.ps1
# Optional existing runner arguments:
.\scripts\run-live-m6-awake.ps1 -LiveArguments @('--governance-only')
```

Keep the laptop plugged in with its lid open. This does not change power plans,
force the screen on, override deliberate sleep/lid closure, extend contract
expiry, or make interrupted tests successful. See Microsoft's
[SetThreadExecutionState reference](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-setthreadexecutionstate).

### Historical pre-v4 bounded-memory diagnostic and allocator experiment

The recipes/results in this subsection are historical pre-v4 evidence.
v4, v5 and v6 reject the old unallocated `--memory-smoke` workload. To profile
the allocation-bound implementation, run
`.\scripts\run-live-m6-awake.ps1 -LiveArguments @('--credential-binding','--profile-memory')`.
Never recycle or switch a proof-service container while a proof is active.

```powershell
.\scripts\run-live-m6-awake.ps1 -LiveArguments @('--memory-smoke')
# Sample the full existing workflow without changing its coverage:
.\scripts\run-live-m6-awake.ps1 -LiveArguments @('--profile-memory')
```

`--memory-smoke` is **not M6 acceptance**. It deploys the unchanged contract,
issues one account through the large credential dispatcher, submits a module
proposal and two reviews, and performs two distinct approvals in the same
prover process. It verifies indexed status sequence 1, module approval state,
and no active template. It omits capability staging and subsequent governance
lifecycle work only in this explicitly labeled diagnostic. The default live
workflow is unchanged. `--memory-smoke` and `--governance-only` are mutually
exclusive; both accept the optional account file. `--profile-memory` can also
be combined with `--governance-only`.

Sampling requires Docker access to `permio-m6-proof-server`. Every five seconds
and at explicit transaction boundaries it records only allowlisted numeric
process/cgroup resource counters in the existing ignored public event log.
Process memory counters are KiB; cgroup memory counters are bytes. Neither
request bodies nor private witness data are read. Missing initial sampling
access aborts before deployment; subsequent errors mark profiling incomplete.
RSS and high-water measurements do not constitute live-heap/leak diagnosis.

The pinned 8.1.0 prover was verified to load glibc 2.42. A separate experimental
override bounds allocation arenas and fixes mmap/trim thresholds so large freed
allocations can be returned more readily. The allocator-only experiment below
**failed** and is retained for reproduction, not recommended as a working fix.
Apply it only after the current test
has ended and `/ready` reports zero processing/pending jobs:

```powershell
docker compose -f scripts/local-midnight-proof-server.yml -f scripts/local-midnight-proof-memory.yml up -d --pull never
```

This recreates only the opt-in proof service, reusing its public parameter
cache; it does not reset or restart the node/indexer. The image, CPU/concurrency
limits and VM memory budget stay unchanged. No debug request logging, alternate
allocator injection or automatic prover restart is enabled. To remove the
override after checking the service is idle, recreate it with the base file:

```powershell
docker compose -f scripts/local-midnight-proof-server.yml up -d --pull never
```

Compare identical cold-process smoke runs before claiming improvement. A smoke
pass does not prove sustained full-workflow stability, and freeing resident
memory does not necessarily reduce the mathematical proof's intrinsic peak.
See the [GNU libc allocation tunables](https://sourceware.org/glibc/manual/latest/html_node/Memory-Allocation-Tunables.html)
and `docs/evidence/M6/development-log.md` for settings, measurements and scope.

The measured allocator-only comparison failed at the first approval with HTTP
400, while the prover remained alive and its cgroup recorded no OOM events.
It is not the same observed failure as the baseline's exit-137 OOM, nor a
successful mitigation. The allocator override was removed and only the prover
recreated; ledger services/history were preserved.

Source inspection found a separate global decoded-key cache in
`transient-crypto/src/proofs.rs`: five strong `Arc` entries can keep large
decoded keys alive beyond individual requests. This is not the filesystem
parameter cache. `scripts/proof-server-memory/cache.patch` is an opt-in
same-version experiment that replaces cache ownership with weak references.
Live proofs keep owning references; exact-byte hashing, type checks, key
decoding, proof construction and verification remain unchanged. Completed keys
can then be released. This trades cross-request decode reuse for lower retained
memory; it does not reduce circuit constraints or guarantee a lower peak.

For a **fresh** ignored source checkout (do not reapply to an already patched
checkout):

```powershell
git clone --depth 1 --branch ledger-8.1.0 https://github.com/midnightntwrk/midnight-ledger.git logs/m6-prover-source
git -C logs/m6-prover-source rev-parse HEAD
# Must equal d89e0b6334f83bc9477152fb5edf7eca71660237.
git -C logs/m6-prover-source apply --check ../../scripts/proof-server-memory/cache.patch
git -C logs/m6-prover-source apply ../../scripts/proof-server-memory/cache.patch
docker build --progress plain --build-context publicparams=logs/m6-proof-server-public-cache -f scripts/proof-server-memory/Dockerfile -t permio/proof-server:8.1.0-weak-cache logs/m6-prover-source
```

The builder and runtime image digests are pinned. Rust 1.95.0 matches the
upstream Fenix stable manifest's version; the existing runtime's glibc is
retained. Cargo uses the upstream lockfile and one build job. The build requires
network access for public build dependencies and adds no host/WSL Rust install.
It supplies the public parameter cache as an explicit, separate build context
and generates the exact upstream `fallible/count` fixture with the pinned ZKIR
CLI, matching the prerequisite normally supplied by Nix. It runs the cache,
crypto-library and upstream proof-server tests before producing the image.
Tests run serially; no assertion is changed or skipped. BuildKit retains only
compiler output across retries. It is a local patched distribution, not the official
unmodified server, and must pass the real-chain memory diagnostic before any
stability claim. No image is pushed.

After a successful build, verify `/ready` is idle before the explicitly opt-in
switch and repeat the diagnostic without recycling the process between proofs:

The workload command below is the historical pre-v4 experiment, not the
current credential regression. Its preserved numbers must not be attributed
to v4 or used as current production acceptance.

```powershell
docker compose -f scripts/local-midnight-proof-server.yml -f scripts/local-midnight-proof-weak-cache.yml up -d --pull never
.\scripts\run-live-m6-awake.ps1 -LiveArguments @('--memory-smoke')
# Restore the official service, only after the test has ended and it is idle:
docker compose -f scripts/local-midnight-proof-server.yml up -d --pull never
```

`prover-memory-verification.json` records each experiment separately. The
base profile continues to use the official image; the experimental image is
never selected implicitly by the root tests or live runner. The upstream
source is Apache-2.0 licensed; its license/copyright stay in the ignored source
checkout. Only the small patch and reproducible build recipe are tracked.

The weak-cache image passed all 36 upstream server tests and all 58
crypto-library tests, then the real-chain `--memory-smoke` sequence without
restarts or OOM (115/115 samples). At the matching post-credential checkpoint,
RSS was about 203 MiB instead of 4.45 GiB; after both approvals it was about
309 MiB. The high-water mark remained about 6.42 GiB, and the observed cold
credential transaction interval was longer (265 versus 186 seconds). This is
not a throughput improvement or full staged-workflow acceptance. The opt-in
image remains selected on this local test service; the base configuration
continues to select the official image. Exact hashes, timings, command results
and limitations are in `docs/evidence/M6/prover-memory-verification.json`.

## Current WSL/Docker recovery and guarded slot-key attempt

On 2026-10-14 the user restarted Docker Desktop. Current settings enable its
WSL 2 backend and Ubuntu-24.04 integration; Windows and Ubuntu engine IDs match.
The earlier disabled-integration setup note is historical. Start only the
three existing M6 services, preserving their identities, volumes and image:

```bash
docker start midnight-node midnight-indexer permio-m6-proof-server
docker inspect --format '{{.Name}} {{.State.Status}} {{.State.Health.Status}}' midnight-node midnight-indexer permio-m6-proof-server
```

All three recovered healthy; node health, indexer block query and proof
version/readiness checks pass. Ubuntu can reach the node/prover on localhost.
This is not a new Docker engine or a bypass of Docker Desktop. No reset,
recreation, image pull, unrelated-container start or resource change occurred.
See `docs/evidence/M6/docker-wsl-recovery-verification.json` for the observations.

For the current already-generated slot ZKIR, a real isolated key attempt can
explicitly allow k20 without changing VM limits. Run from this repository in
Ubuntu; it writes only to a fresh ignored `logs/` directory, not production keys:

```bash
node scripts/probe-m6-slot-key.mjs --maximum-k=20 --maximum-rss-mib=6144 --minimum-available-mib=768 --timeout-seconds=1800
```

The historical no-argument probe still defaults to a local k19 guard. Both
modes use one worker and actual pinned zkir, not mock keys. One-second RSS/HWM
and shared-VM available-memory samples can request SIGTERM only of their own
compiler; a timeout also stops it. This is a reactive guard, NOT a guaranteed
6 GiB cap, a protocol k/chain-depth restriction, or a customer proof-cost
measurement. Interrupted attempts cannot declare readiness. Key files are
stream-hashed rather than loaded wholesale into the diagnostic's memory.

用户重启 Docker 后，现有 WSL 2 后端和 Ubuntu 集成已启用，两侧引擎 ID 相同。通过
WSL 只启动三个原 M6 容器，身份、卷、镜像不变，健康及 HTTP／索引器查询通过；未重置、
重新创建、拉镜像、启动无关服务或改资源。上述单密钥命令允许实际 k20 尝试，默认模式
仍为本地 k19 保护，只写忽略的 logs，不用 mock、不宣称完整 keys。每秒采样 RSS／HWM
及共享 WSL 可用内存，阈值或时间到后只停止自有编译器，是响应式保护而非保证 6 GiB
硬上限、协议／链深度限制或客户证明成本。大密钥采用流式哈希，避免诊断进程整文件载入。

Observed result: the real k20/818,608 attempt ran 674.337 seconds and stopped
by its shared-VM reserve guard (SIGTERM), with sampled compiler RSS/HWM
5,925,572 KiB and no sampled compiler swap. No usable slot key pair or complete
manifest was produced; all three services stayed healthy and no kernel OOM
record was observed. The subsequent complete root check passed 255 tests,
including six Hardhat tests. See slot-key-resource-attempt-verification.json.
These are interrupted key-generation measurements, not ordinary-action proof
latency, a hardware minimum or current v7 chain acceptance.

实际 k20／818608 尝试运行 674.337 秒后因共享 VM 可用内存保留阈值 SIGTERM，编译器
采样 RSS/HWM 为 5,925,572 KiB、无编译器 swap，未生成可用槽位密钥／完整清单；三服务
仍健康，未观察到内核 OOM 记录。随后完整 255 项检查通过，含六项 Hardhat。具体记录见
slot-key-resource-attempt-verification.json；这些是中止的密钥生成测量，不是普通动作
证明耗时、最低硬件或当前 v7 链上验收。

## Consumer and enterprise delivery planning

The [delivery feasibility assessment](../../docs/evidence/M6/product-delivery-feasibility.md)
separates completed proof/chain work, outstanding M6 authorization, consumer
website and enterprise integration plans, measured costs, and conditional
proof-runtime, hardware and capacity estimates. It does not change milestone
exit gates or authorize moving private witnesses to a hosted service.

交付可行性评估分别记录已完成证明及链上工作、未完成的 M6 授权、C 端网站和 B 端集成规划、实测成本及有条件的证明耗时、硬件和容量估算，不评估开发工期，不改变 milestone 验收门槛，也不授权将私密见证转交托管服务。

Use the representative customer workload for user-performance reporting:

```powershell
npm run benchmark:m6:user -- --iterations 20
npm run benchmark:m6:user -- --require-chain
```

The first command measures real M4/M5 client authorization and seven M6 scope
path preparations for a synthetic support request, directly and through one
bounded delegation. It emits public numeric aggregates only. Proof, chain and
receipt fields remain `null`; it is not an on-chain or browser benchmark.
The second command deliberately exits 2 until the actual ordinary-action
contract and receipt are integrated. The existing live governance diagnostic
and default acceptance runner remain unchanged; neither stands in for user
proof performance. Results are in `docs/evidence/M6/ordinary-user-benchmark.json`.

第一条命令测量合成客服请求在普通会话及一层有限委托下的真实 M4/M5 客户端授权和七个 M6 范围路径准备，仅输出公开数值汇总。证明、链上及收据字段仍为 null，不是链上或浏览器基准。第二条命令在真实普通操作合约及收据集成前明确以退出码 2 失败。已有治理诊断及默认验收流程保持不变，不能替代用户证明性能测量。结果位于 `docs/evidence/M6/ordinary-user-benchmark.json`。

Canonical adapter hashes use versioned, length-delimited encoding from
`@permio/protocol`; Compact typed commitments use the generated
`persistentHash` layout and must not be substituted with a JSON/manifest hash.
The M2 content hash remains the exact SHA-256 value produced by
`@permio/scenario-domain`, not a new hashing scheme.

规范适配器哈希采用 @permio/protocol 的版本化、长度定界编码；Compact 强类型承诺采用编译生成的 persistentHash 布局，不能用 JSON／清单哈希替代。M2 内容哈希仍采用 scenario-domain 的精确 SHA-256 结果，未引入替代算法。
