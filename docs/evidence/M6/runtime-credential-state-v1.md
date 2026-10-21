# Credential mutations bound to private instance state

Implemented on 2026-10-14 in the M6 delivery worktree, after checkpoint
`f2d8689f95d9294a92f6b2e2b8718d31121dde81`. Working contract tag:
`permio-authorization-v8`; credential-status command version 4. This is a
partial source implementation, not M6 acceptance or a deployed upgrade.

## Concrete defect and correction

The v7 slot dispatcher committed `lastMutationAt` inside private state
opening v2. The credential dispatcher changed only the namespace status root
and command-nonce set. Consequently, a later credential mutation did not
advance the instance watermark/sequence, and a staged credential command
did not pin the private state against intervening slot changes.

Version 4 signatures additionally cover the immutable allocation commitment,
current instance-state commitment, current instance sequence and proposed
next instance-state commitment. The allocation commitment also binds the
network, deployment, original allocator and explicit issuer list. A valid
namespace issuer signature does not allow substitution of another allocation.

`RuntimeCredentialInstanceBinding` now supplies the private current opening,
sequence and fresh next-state nonce, in addition to the original allocation,
issuer membership and selected public submission deadline. Begin, direct
mutation and unexpired finalization verify:

- exact allocation/template/instance and signed allocation commitment;
- state opening v2 and matching instance, signed state hash and ledger hash;
- exact signed/binding/ledger sequence;
- effective time no earlier than the committed mutation watermark;
- nonzero next nonce different from the current nonce;
- the signed next commitment equals the circuit-derived next opening.

The next opening preserves the template-state label, both slot-map roots and
counts, and instance identity. Only `lastMutationAt` and the private nonce
change. Account issuance, authorized direct revocation, and final capability
or session issuance update the status root, consume the command nonce, install
the next state commitment and increment the instance sequence in the same
transaction. Allocation commitment and lifecycle status are preserved.
Equal effective times remain legal; the sequence orders mutations.

## Staging, concurrency and cleanup

Scope-staging begin/element steps grant nothing and leave instance state,
status root and the used-command set unchanged. The certification commitment
already includes the full command commitment, so element steps cannot change
the signed state binding. They may finish against a now-stale state, but such
work cannot finalize. Refreshing the signed command requires a new exact
certification; a caller cannot silently rebase old progress.

An intervening credential or slot mutation invalidates finalization of a
command pinned to the previous state. A losing direct command or stale final
transaction consumes no nonce and rewrites no winning state. Expired staging
can still be removed without a current private state opening: cleanup is not
a credential mutation, authority grant, receipt or sequence increment.

This deliberately adds same-instance contention: credential mutations and
slot mutations now share one sequence. Unrelated instances do not acquire a
new global timestamp, although their existing shared namespace status-root
updates may still require current membership witnesses. No public account
identity, state label, nonce or mutation watermark was added to the ledger.

## Client and compatibility behavior

`createRuntimeCredentialInstanceBinding` requires an explicit current opening
and sequence; it does not infer them from a historical M5 allocation snapshot.
`createRuntimeCredentialStatusCommand` requires that binding and prepares the
signed commitments. `advanceRuntimeCredentialInstanceBinding` updates a
client's private opening only after accepted direct/final execution. It is
not an authority check or a substitute for transaction acceptance. Production
private-state persistence/recovery remains unfinished.

The live credential runner retains its 21 credential transactions, of which
five mutate the private instance (account/root/session issuance, session/root
revocation): expected final instance sequence is now 5, not 0. The slot runner
first issues its account (sequence 1), then performs four slot mutations:
expected sequence 5 with four consumed slot-command nonces, not five. Both
runners verify indexed state against the locally retained exact opening.

The public reader distinguishes explicitly tagged v8 evidence from older
untagged historical logs. It verifies the exact v8 completion commitment and
sequence; historical v6/v7 evidence is not relabeled. Current v8 assets require
matching real keys and a fresh disposable deployment. Command v3 signatures,
old generated bindings and previous manifests are not reused as v8 evidence.
M2 hashes, policy/state-opening versions, M4 Ed25519 review, M5/M5-P1,
authority kinds, signing profile and the eleven transaction entry points
remain unchanged.

## Verification limits

Compiler and regression results, including failed attempts, are recorded in
`credential-state-verification.json` and `development-log.md`. Generated
Compact execution tests are not real-node proof acceptance. The separate
low-memory session experiments against the committed v7 baseline; it does
not generate or validate all current v8 keys automatically.

Ordinary actions, action watermark integration, selected evidence modules,
atomic action nullifiers/state transitions, common receipts, complete privacy
review and restart acceptance remain unfinished. This change does not create
an action receipt, extra authority, trusted host verifier, alternate hash
scheme, extra contract or toolchain upgrade.

---

# 中文翻译

本项于 2026-10-14 在 M6 交付工作树、提交 f2d8689 之后实现。合约 tag 为 v8，
凭证状态命令为 v4；仅为部分源码实现，不是 M6 验收或已部署升级。

v7 的槽位入口把 lastMutationAt 放进私有状态 opening v2，但凭证入口只更新命名空间
凭证根及已用 nonce，不推进实例水位／序号，也不固定分阶段凭证命令所依赖的私有状态。
v4 签名增加不可变分配承诺、当前实例状态承诺／序号及下一状态承诺；分配承诺包含
网络、部署、原分配器及精确签发者列表，命名空间签名不能替换另一份分配。

私有 binding 增加当前 opening、序号及下一私有 nonce。开始、直接变更及未过期的
最终执行检查精确分配／模板／实例、opening v2、签名与账本状态哈希／序号、时间
不早于水位、新 nonce 非零且不同于旧值、下一承诺等于电路计算结果。下一 opening
保留模板状态标签、实例及两个槽位映射根／数量，仅改水位与 nonce。账户签发、合法
直接撤销、能力／会话最终签发在同一交易内更新状态根、消耗命令 nonce、安装下一
状态并推进实例序号，分配承诺及生命周期不变。同一时间允许，以序号排序。

开始及逐项范围检查不授权，也不改实例／状态根／已用 nonce。certification 绑定
整个命令，逐项交易不能改变原签名状态；即使旧状态下继续做完检查，最终执行也会拒绝。
换签新命令必须重新认证，不能偷偷复用旧进度。同一实例中凭证／槽位变更让旧命令
失效；失败命令不消耗 nonce、不覆盖胜出状态。过期清理仍不要求当前私有 opening，
不授权、不产生收据、不推进序号。代价是同实例凭证／槽位共享序号形成竞争，不引入
跨实例全局时间；原命名空间凭证根仍共享。账本不新增账户 ID、状态标签、nonce 或水位。

SDK 必须显式接收当前 opening 和序号，不能从旧 M5 分配快照推断。命令构造器准备
签名承诺；advance helper 仅在交易已接受后更新客户端私有 opening，不是授权或
链验收替代。生产私有状态持久化／恢复仍待完成。真实凭证流程仍有 21 笔交易，五次
实际变更后实例序号为 5 而非 0；槽位流程账户签发先到 1，再做四次槽位变更到 5，
槽位已用 nonce 仍为 4。两流程对比索引状态与私有 opening。公开读取器区分显式
v8 tag 与旧无 tag 日志，不重新标注旧 v6/v7 证据；v8 需要精确真实密钥和新一次性部署。
旧 v3 命令签名／绑定／manifest 不算 v8 证据。M2 哈希、策略及 opening 版本、M4
Ed25519、M5/M5-P1、权限编号、签名配置及十一交易入口不变。

实际编译／回归及失败另存 JSON／日志，生成 Compact 执行不冒充节点证明。独立
低内存会话基于已提交 v7，不会自动生成或验证所有当前 v8 密钥。普通动作、水位接入、
证据模块、动作 nullifier／状态原子更新、通用收据、完整隐私及重启验收仍待完成；
本项不新增动作收据、权限、受信宿主、哈希替换、多合约或工具链升级。
