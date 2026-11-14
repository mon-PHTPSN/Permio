# M6 private slot state v1 / instance opening v2

Historical v7 slice: the later v8 credential-state continuation is documented
in [runtime-credential-state-v1.md](runtime-credential-state-v1.md). It shares
the instance watermark/sequence with credentials; the slot fixture now ends
at sequence 5 (one account plus four slot mutations), with four slot nonces.
The v7 measurements and failed attempts below remain historical evidence.

此文保留 v7 阶段历史；后续 v8 凭证状态接入见上述文档。凭证与槽位共用实例水位／
序号，槽位 fixture 现最终为序号 5（一次账户及四次槽位变更），槽位 nonce 仍为 4。
下方 v7 测量及失败不重新标为新版本验收。

Implementation started 2026-10-14 after the user approved the staged/private
state direction. Working SDK tag: permio-authorization-v7. Policy remains v2;
M2 JSON hashes, M4 Ed25519 reviews and accepted M5-P1 remain unchanged. This
document describes implementation, not complete M6 acceptance.

## Exact state and authority changes

RuntimeStateOpening now requires stateVersion 2 and includes instanceCommitment,
stateIdHash, lastMutationAt, slotAssignmentsRoot/slotAssignmentCount,
slotBindingsRoot/slotBindingCount and a private nonce. Allocation initializes
both maps to their exact zero-key sentinel root/count 1, sets lastMutationAt
to allocation.createdAt and checks the template's exact initial label. An
allocator-signed pre-populated role tree or a legacy opening is rejected.
V6 bytes/deployments are not reinterpreted as v7. There is no automatic
migration of historical instances; a reviewed migration requires separate work.

Only allocationCommitment, currentStateCommitment, transitionSequence and
lifecycleStatus remain public per instance. The nested private map roots are
not independent public authority registries. Slot mutation preserves the
private state label, replaces the commitment with a fresh nonce and advances
the same authoritative instance sequence atomically. The committed slot
watermark rejects backdated slot mutations; equal effective times remain
allowed, ordered by the sequence. Cross-credential/ordinary-action watermark
integration is still an end-to-end M6 gate.

Existing namespace kinds 1–12 remain unchanged; participantSlotGovernor is 13.
Only explicit M4 governance principals may be mapped to this separate profile.
It uses the existing Schnorr scheme and namespace root, not a universal admin
or a new reviewer key system. A creator-rule command requires the exact
allocator leaf commitment frozen in the original allocation, not another
eligible allocator. Governance-rule commands require kind 13; occupied-slot
commands require the exact active parent assignment/holder and permitted parent
slot. These rule discriminators 1/2/3 are not namespace authority-kind codes.

## Private authenticated maps

Each map is a depth-20 tree of indexed sorted nodes. A node contains version 1,
full 32-byte key/value, nextKey and nextIndex. Index 0 is a canonical zero-key/
zero-value sentinel. New nodes append at exactly the current count; replacing
a value cannot alter its key or links. The capacity is 1,048,575 non-sentinel
nodes per map, an explicit storage encoding capacity, not a 17-hop chain rule.

Insertion proves an authenticated predecessor and a strict full-256-bit key
gap, updates its successor link, then proves the next physical leaf is empty
under that intermediate root. This establishes uniqueness inductively from
the verified sentinel genesis without shortening the identifier hash, trusting
host sorting or scanning every historical record. A forged predecessor, skipped
duplicate, wrong position, stale root or old intermediate path fails. Keys
are never deleted, including revoked assignment IDs. All lookup witnesses and
raw map state are private; RuntimePrivateMap is only a defensive witness
builder, not an on-chain authorization result.

The assignment map key is the exact domain-separated assignment ID hash;
its value commits the immutable RuntimeSlotAssignment and current active/
revoked status plus revokedAt. Revocation preserves the original assignment
bytes. The binding key commits context/slot/**M5 account ID hash**, not only a
changeable runtime credential commitment. Thus reissuing a credential cannot
create a second active binding for the same account/slot. Binding values point
to exact assignment IDs; a replacement cannot rebind old descendants' parents.

## One transaction dispatcher, three operations

manageRuntimeParticipantSlots adds one real proof entry to the single contract
(eleven total at this slice): operation 1 begin, 2 next ancestry step, 3 finalize.
The signed RuntimeSlotCommand pins issue/revoke kind, exact template target,
instance, exact immutable allocation commitment, state commitment/sequence, authority root version/sequence,
account-status root sequence, context/slot/subject credential and account ID,
assignment/parent/assigner, namespace authority, private M5 evidence commitment,
effective time, public deadline and one-use nonce. The allocation commitment
directly covered by the signature pins deployment/network and the original
allocator/issuer scope; merely passing a separately valid allocation cannot
retarget a signed command to another deployment. Authorization never comes from a host
isParticipantSlotActive flag or an unvalidated serialized M5 snapshot.

Begin and finalization independently open the exact activation-authenticated
policy/rule and verify the signer. Issuance also checks exact active subject
status, signature time, allocated lifetime, ID absence and prior binding. A
retired template can still manage an existing instance; a revoked template
cannot grant new slots. Authorized revocation remains possible without granting
anything new. Ordinary proof-module/action lifecycle checks remain separate
unfinished gates, not implied by slot management.

An occupied-slot command must walk its complete signing-parent ancestry;
replacing a prior binding must additionally prove that prior exact ancestry
inactive. Progress has three phases: signing ancestry, prior-binding activity,
complete. A step opens the next exact admitted private record and its exact
account status under the pinned current root. Issued sequences strictly
decrease toward a creator/governance origin; this rejects cycles, skipping,
repetition and caller-reported fake lengths. A signing ancestor must be active.
A replacement chain accumulates inactive status, including revoked assignment,
revoked holder or genuinely expired holder. Merely selecting an overlong proof
deadline cannot falsely classify a currently active account as expired.

Every transaction rechecks the current allocated state and root sequences.
Finalization requires committed phase 3, exact prior binding and any required
inactivity proof, rejects reused nonces and installs all map/state changes
atomically. Begin/step return zero, grant no slot and emit no DecisionReceipt.
After any pinned state/root change, old progress cannot finalize; a fresh
witness/session is needed. Steps reveal transaction structure/counts, not
account IDs or parent records; inference/privacy costs still require review.

An expired session can be removed by anyone touching its public nonce through
this dispatcher, before private authorization checks. Cleanup cannot consume
the command nonce, change instance state, revoke/grant a slot or emit a receipt.
There is no automatic background keeper or privileged cleanup authority.
Stale-but-not-expired sessions remain unusable until expiry or later explicit
cleanup design; they do not grant authorization.

## Current checks and live harness

Generated Compact tests cover direct creator/governance issuance and revocation,
original-creator identity, privilege separation, occupied-slot ancestry,
incomplete/altered progress, duplicate active binding and replacement after
revocation, state invalidation after ancestor revocation, signatures/hashes/
roots/state/replay, no-backdating and expiry cleanup. The private map tests
cover sorted insertions, full-key comparison, exact replacement, stale/forged
paths and defensive copies. Long 34-record M5 provenance tests remain intact;
the real-node occupied-chain/long-chain tests are not yet claimed.

The explicit live mode is --slot-state. It uses actual M5-P1 and a fresh v7
deployment, then attempts one account issuance and nine slot transactions:
creator issuance, separately scoped governance issuance, creator revocation
and a new-ID replacement with an inactive-predecessor step. Expected final
slot sequence/nonces are 4/4, status sequence/nonces 1/1, zero pending slot
sessions. It emits only public commitments/counters/transaction IDs and scans
private sentinels. Three negatives are generated-Compact preflight, not node
rejections. --slot-state is mutually exclusive with other reduced live modes;
it does not complete ordinary-action or common-receipt acceptance.

The independent public reader supports --slot-state [--final] and checks the
exact logged final commitment, sequence, sessions and nonces without a wallet
or private witness. Its original --final credential-fixture expectations stay
unchanged unless this explicit mode is selected. Passing a new mode is not a
weakening of another fixture's assertions.

Compilation, real-key generation and chain outcomes, including actual failures,
are recorded separately in the development log and runtime-slot-state
verification evidence. Current results: 250 regression cases pass; real size
optimization reduced 1,102,647 rows (k21) to 818,608 (k20). The isolated probe
stopped at its local k19 resource guard and generated no usable slot key pair.
The actual --slot-state run failed before wallet initialization because the
matching real-key manifest is absent. Docker's engine was separately unavailable
at that attempt; the user's later restart and the explicitly scoped WSL
container start recovered all three services. Current recovery observations
are in docker-wsl-recovery-verification.json, not inferred from the old failure.
These are partial source/cost/prerequisite results, not chain slot acceptance.
Production readiness, full M6 completion and M7/M8
receipt integration remain unclaimed.

Later same-day continuation: 255 root checks pass after five diagnostic tests
were added. The actual k20 key attempt, explicitly allowed past the old k19
guard, stops after 674.337 seconds at the shared-VM memory reserve with sampled
compiler RSS/HWM 5,925,572 KiB. Keys remain null. Services remain healthy;
the key-generation measurement is not ordinary-action proof latency or a
production hardware requirement. Exact fingerprints, failed checks/retries
and measurements are in slot-key-resource-attempt-verification.json and the log.

---

# 中文翻译

用户批准分阶段／私有状态方向后于 2026-10-14 开始实现，SDK tag 为 v7，策略仍 v2，
M2 哈希、M4 Ed25519 审查及已验收 M5-P1 不变，不代表 M6 完成。状态 opening v2
含实例、状态标签、最近槽位变更时间、分配／绑定树根与数量、nonce。分配只允许两树
为精确 sentinel 根及数量 1，时间为创建时间、状态为模板初始标签，拒绝预填角色或旧
布局。v6 部署不重新解释，历史实例不自动迁移。实例仍只公开分配／当前状态承诺、
序号及生命周期；私有子树不是独立公开权限根。槽位变更保留状态标签、使用新 nonce，
原子推进同一实例序号并拒绝倒填槽位时间；其他凭证／普通动作的完整时间水位接入仍待完成。

既有权限 1–12 不变，新增窄槽位治理 13，只映射明确 M4 治理主体，使用既有 Schnorr
和命名空间根，不新增通用管理员或第二套审查者。创建者必须为原分配绑定的精确 allocator
叶，不是任意分配器；治理必须为 13；已占用槽位要求精确有效上级／账户及合法上级槽位。
规则编号 1/2/3 不能数字映射成权限编号。

每个私有映射是深度 20 的索引排序树，节点含版本、完整 32 字节键值及后继键／索引，
索引 0 是零键值 sentinel。新节点只在计数对应位置追加，替换不改键或链接。每树可存
1,048,575 个非 sentinel 节点，这是存储编码容量，不是 17 跳链限制。插入认证前驱及
完整 256 位严格键间隙，更新链接后，在中间根下证明下一位置为空，从已验证初态归纳
保证唯一性，不截短哈希、不相信宿主排序或扫描全部历史。错误前驱、遗漏重复、错误位置、
旧根／中间路径拒绝；撤销也不删除 ID。宿主 RuntimePrivateMap 只准备防御性私有 witness。
分配映射保存不可变分配及当前 active/revoked 状态／撤销时间；绑定键使用上下文／槽位／
M5 账户 ID 哈希而非可更换凭证承诺，避免重发凭证造成重复绑定，值指向精确分配 ID，
替换上级不能重新连接旧下级。

单合约增加一个真实证明入口（本阶段共十一），操作 1 开始、2 验证下一上级、3 最终执行。
签名命令固定精确模板／实例／状态／序号、权限及账户状态根、槽位／主体、分配／父／签发者、
命名空间权限、M5 证据承诺、时间、公开截止及 nonce；签名直接绑定精确分配承诺，包含网络／
部署及原分配器／签发者范围，不能用另一份有效分配重新指定部署。不信任宿主
isActive。开始／最终执行各自认证规则与签名；签发检查有效主体、时间、实例有效期、ID 唯一
及旧绑定。retired 模板可管理已有实例，revoked 不可新增槽位但允许合法撤销。普通模块／
动作生命周期仍是独立待完成条件。

已占用槽位命令必须走完签发上级链，替换旧绑定还要证明旧链失效。进度为签发链、旧绑定
活动性、完成三个阶段；每步展开当前私有记录和精确账户状态，签发序号严格递减到创建者／
治理起点，拒绝循环、跳过、重复或虚报长度。签发上级必须有效；替换累计分配撤销、账户撤销
或真实过期，选择过长截止不能把有效账户误判过期。每笔重检当前状态／根；最终要求精确
已提交完成进度、旧绑定及必要失效证明，消耗 nonce 并原子写状态。暂存返回零、不授权、不出
收据；根／状态变化使旧进度不能最终执行，须重做。交易结构／次数可能泄漏，仍须隐私审查。

任何人在过期后触及公开 nonce 都可清理，不消耗命令 nonce、不改变实例／权限或出收据，
无后台 keeper 或特权清理者；尚未过期的旧会话不可用，但暂留到期。生成 Compact 测试覆盖
三类权限／原创建者、链、进度、重复与撤销后替换、撤销使旧状态失效、签名／哈希／根／状态／
重放、时间及清理；私有映射测试覆盖完整键、插入、替换、伪造路径及副本。34 条 M5 链测试
保留，但真实节点的已占用／长链测试未声称完成。

显式实链模式 --slot-state 使用真实 M5-P1 和 v7 新部署，尝试一笔账户签发及九笔槽位交易：
创建者签发、独立治理签发、创建者撤销和经过旧链失效检查的新 ID 替换。预期槽位序号／nonce
4/4、账户状态 1/1、零会话，只记录公开承诺、计数、交易 ID 并扫描私有哨兵。三项负例属于
生成 Compact 预执行，不是节点拒绝；模式互斥，不替代普通动作／收据验收。独立无钱包读取
--slot-state [--final] 核验精确日志承诺、序号、会话及 nonce，未选模式时旧凭证 fixture 的
--final 断言不变。实际编译、真实密钥和节点成败另记，不宣称生产、完整 M6 或 M7/M8 收据。

当前 250 项回归通过，电路由 1102647 行／k21 降为 818608／k20，但超过本地 k19 探测保护
阈值，未产生可用槽位密钥。实际 --slot-state 因真实 manifest 缺失，在钱包初始化前失败；
当时 Docker 引擎也单独不可用；用户随后重启 Docker，再明确批准通过 WSL 启动三个现有
容器，三服务健康及端点已恢复，另记 docker-wsl-recovery-verification.json，不把旧失败
当作当前状态。这只是源码／规模／前置结果，不是链上槽位验收。

同日后续增加五项诊断测试后，完整 255 项通过。显式允许 k20 后的真实密钥尝试仍在
674.337 秒因共享 VM 内存保留保护停止，编译器采样 RSS/HWM 5,925,572 KiB，keys 为
null；三服务健康。这不是普通动作证明耗时或生产硬件要求，精确指纹、失败／重跑及测量
另见 slot-key-resource-attempt-verification.json 和开发日志。
