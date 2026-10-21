# M6 slot-assignment chain boundary — evidence and proposed decision

Date: 2026-10-14. Status: **staged/private-state proposal approved by the user's
subsequent “continue”; implementation and real-chain acceptance in progress**.
The discussion below preserves the proposal's original rationale, not a claim
that all its implementation gates have passed.
This is an implementation decision record, not a milestone definition or M6
acceptance. The accepted M5-P1 commit remains
`07df341ffabc65aa5e23302fddc644498017b018`.

## Reproduced behavior, not a speculative compiler failure

The new M6 regression fixture creates 33 distinct context accounts occupying a
reusable `manager` slot, followed by the ordinary customer's `requester`
assignment. The manager rule permits the creator or another manager to assign
it. These are real M2 validation, M4 review/activation/allocation and M5-P1 API
calls, not manually inserted M5 records. All 34 assignments are accepted.
The customer's capability remains a root grant, at delegation depth zero.
Therefore capability delegation depth is not a bound on slot provenance.

The private M6 adapter returns all 34 exact records in order. Revoking manager
assignment 1, which is outside the last 17 records, invalidates the requester;
manager assignment 0 remains active. Giving the revoked manager a new
assignment ID does not revive the old descendants. Revoking that distant
manager's account also invalidates the requester. Three added regression tests
pin these behaviors; accepted M5 source and evidence are unchanged.

The existing `RuntimeActiveAncestry` has 17 capability/account entries, matching
the existing capability maximum of 16 delegated hops. It is **not an implemented
slot witness**. Merely reusing that bound for slots would reject valid M5-P1
behavior. Omitting earlier slot ancestors instead would miss prospective
revocation. Increasing the fixed bound to 34 or 64 does not solve the general
case; it just moves the cutoff and increases circuit work. No such cutoff or
truncation has been added.

Actual Compact 0.31.1 diagnostics, isolated from production assets:

| Fixture | Observed result |
| --- | --- |
| `default<Vector<count, Uint<32>>>`, runtime `count` | Rejected: invalid context for reference to variable name count |
| `for (const index of 0..count)`, runtime `count` | Rejected with the same language restriction |
| `Vector<17, Uint<32>>` and loop `0..17` | Compiled; compiler 0.31.1 / runtime 0.16.0; no ledger proof entry |

The reproducible runner is `node scripts/diagnose-m6-slot-bounds.mjs` in the
configured WSL/Linux environment. Its saved report is
`logs/m6-slot-bounds-Dj106q/report.json`; a portable copy is retained in
`slot-assignment-boundary-verification.json`. Negative compiler cases use
nonzero status **and the exact expected diagnostic**; an arbitrary environment
failure cannot pass. Shell invocations returned 1 while the runner observed
255 from the wrapper; both mean rejection, not contract/node rejection.

The [official Compact reference](https://docs.midnight.network/compact/reference/compact-reference)
describes compile-time fixed sizes and bounded loops. That page is reviewed for
language 0.27.0, not our pinned 0.23.0; the actual 0.31.1 diagnostics above are
the version-specific evidence. This establishes a problem with a runtime-sized
single-circuit witness, **not that M6, Midnight or all possible representations
are infeasible**. No toolchain/ledger upgrade or inter-contract call is assumed.

## A separate permission mapping must not be silently invented

The template rule discriminator and namespace authority kinds are different:

| Slot rule discriminator | Required authority | Existing namespace code with the same number |
| --- | --- | --- |
| 1 | Exact instance creator (M5 `allocatedBy`) | 1 is template author, not creator |
| 2 | Explicit M4 namespace-governance principal | 2 is reviewer, not slot governance |
| 3 | Exact active same-instance/context parent assignment and its holder | 3 is governance activator, not an occupied slot |

`MIDNIGHT_AUTHORITY_KINDS` currently defines kinds 1–12. It has no separately
profiled participant-slot governance kind. A template activator, allocator,
reviewer, capability issuer or root governor cannot simply inherit arbitrary
slot-assignment power. A creator's identity must match the original allocation;
another currently eligible allocator is not interchangeable with that creator.
M4's Ed25519 reviewer admission decision is unchanged and is not this problem.

## Approved implementation direction (subsequent continuation)

Keep the single Compact deployment, current namespace/account-status roots,
exact M2/M4 identities and existing Schnorr profile. Keep private slot records
and revocations inside the committed private instance state; do not introduce
a separate publicly trusted instance-authority root or host-controlled bridge.
Version that state opening explicitly rather than reinterpreting v1 bytes.

Verify long slot provenance in **bounded stages**, using the already-approved
staging pattern as the starting design. Each stage must prove the next exact
parent link, authenticated assignment/rule and current holder status; the
progress is committed, not a trusted host `isActive` result. Pin the exact
instance/state sequence, namespace authority root, account-status root and
intended operation. Missing, repeated, substituted or out-of-order links must
fail. Completion must reach the permitted creator/governance origin and the
exact requested terminal holder/slot; a caller's claimed length is not proof
of completeness.

Only the final transaction grants an assignment, applies a revocation or
authorizes the ordinary action. Staging itself grants no role/action and emits
no DecisionReceipt. Finalization must recheck the pinned current state/roots,
validity windows, exact active template/module/configuration and replay rules.
Any relevant state/root change requires rebuilding the stale witness; an
ancestor revocation must never leave a usable old certificate. Incomplete
sessions require bounded expiry and permissionless cleanup. Concurrent
transactions must not finalize the same state sequence twice.

Represent `@namespace-governance` with an explicitly authorized, narrow
participant-slot-governance leaf under the **existing** namespace root, mapped
to the actual M4 governance principals. Do not reuse rule discriminator 2 as
namespace kind 2 or grant slot powers implicitly to the activation key. The
new leaf/profile must be versioned and tested for privilege separation; it
introduces no universal administrator and does not re-register reviewers.

Tradeoff: long chains need additional proof transactions before the atomic
final operation. Revocations or other pinned-root/state changes can force a
restart. Transaction count/timing may reveal structural metadata even though
accounts and assignments stay private. This needs privacy tests, measured
proof cost and a UI/server workflow; existing scope-staging success is not
evidence that slot staging is already safe, cheap or production-ready.

The alternative is an explicit, versioned slot-provenance depth limit. That
would change accepted M2/M5 semantics and require a separately approved patch
and migration reasoning, contrary to the current instruction to preserve M5.
It has not been selected. Publishing all slot identities/edges, trusting a
server's activity flag or silently truncating ancestry are not acceptable
substitutes. The user's subsequent continuation authorizes the staged/private-state
approach and the narrow governance authority; source, real keys and chain
verification must still establish its correctness and feasibility.

## Historical diagnostic verification scope (before implementation approval)

This continuation changes regression tests and diagnostics, not the production
Compact contract, generated production bindings, key pairs or deployed state.
It submits **zero Midnight transactions**. The earlier v6 deployment and its
17 finalized governance/allocation transactions remain historical partial
evidence, not new slot enforcement or ordinary-action receipts. Production
slot issuance/revocation and final M6 acceptance remain incomplete.

---

# 中文翻译

日期为 2026-10-14。用户随后回复 continue，批准分阶段／私有状态及窄治理权限的实施方向；
实现与真实链验证仍在进行。下文保留原建议依据，不声称全部验收已通过，不改 milestone 或宣称
M6 验收完成；独立 M5-P1 提交 07df341ffabc65aa5e23302fddc644498017b018 保持不变。

新增回归通过真实 M2 校验、M4 审查／激活／分配及 M5-P1 API，创建 33 个不同上下文账户
的 manager 分配，再给普通客户分配 requester，共 34 条。manager 可由创建者或另一个
manager 分配，客户能力仍是深度零的根授权，所以能力委托深度不能限制槽位上级链。
M6 私有准备保留全部 34 条精确记录。撤销最后 17 条之外的 manager 分配 1，会让末端
requester 失效，但分配 0 仍有效；以新 ID 重新分配上级不会恢复旧下级，撤销远端上级
账户也会使末端失效。三条新增测试固定这些行为，不修改 M5 源码或证据。

现有 RuntimeActiveAncestry 的 17 项对应能力最多 16 次委托，不是已实现的槽位 witness。
直接复用会拒绝合法 M5 行为；省略更早上级会绕过后续撤销；增大到 34 或 64 只是移动
上限并增大电路。本次未增加上限或截断。真实 Compact 0.31.1 拒绝运行时长度的 Vector
和循环，报 invalid context for reference to variable name count；常量 17 对照编译通过，
确认编译器 0.31.1／runtime 0.16.0，且无账本证明入口。WSL 中运行
node scripts/diagnose-m6-slot-bounds.mjs 可复现；报告保存在上述 logs 及独立 JSON 证据。
负例要求非零退出和精确错误，不能用任意环境失败冒充；shell 返回 1、runner 观察到 255，
都不是节点拒绝。官方参考页说明固定大小和有界循环，但面向语言 0.27.0；本项目实际
0.31.1 诊断才是版本对应证据。这只证明运行时长度单电路方案有问题，不证明 M6 或
Midnight 整体不可行，也不假设升级工具链、账本或增加合约间调用。

槽位规则编号不是命名空间权限编号：规则 1 要求实例原创建者，而权限 1 是作者；规则 2
要求实际 M4 命名空间治理者，而权限 2 是审查者；规则 3 要求同实例／上下文的当前有效
上级分配及其持有者，而权限 3 是激活者。当前权限 1–12 没有单独的槽位治理类型，不能
静默让激活者、任意分配器、审查者、能力签发者或 root governor 获得槽位权力；创建者
必须匹配原分配身份。这与之前 Ed25519 审查登记问题不同。

建议保持单部署、当前命名空间和账户状态根、精确 M2/M4 身份及现有 Schnorr，把槽位
记录／撤销留在私有实例状态承诺内，明确升级 opening 版本，不增加独立公开可信的实例
权限根或服务端桥接。采用有界分阶段验证完整槽位上级链：每步验证精确父链接、已认证
分配／规则及当前账户，提交验证进度，固定实例状态序号、权限根、账户状态根及具体操作。
缺失、重复、替换或乱序必须拒绝，完成必须到达合法创建者／治理起点及精确末端，不能
相信调用者自报长度。只有最终交易可以授予槽位、执行撤销或授权普通操作；暂存不授权
也不产生收据。最终重新检查当前根／状态、时间、活动模板／模块／配置和重放；相关根／
状态变化须重做，过期可清理，并发不能消费同一状态两次。

建议在既有命名空间根内增加明确授权的窄槽位治理叶，映射实际 M4 治理者，版本化并测试
权限隔离，不复用编号 2 或自动给激活密钥新增权力，不新增通用管理员或第二套审查者。
代价是长链增加证明交易，根／状态变化可能导致重做，交易数量／时序可能泄漏结构信息，
需要隐私测试、真实成本测量及交互流程；已有能力 scope 暂存不等于槽位暂存已安全或适合
生产。另一方案是明确限制槽位链深度，但会改变已验收 M2/M5 语义，需要独立批准和迁移，
目前未采用。公开身份／父边、信任服务器 isActive 或静默截断都不能替代。链上编码前请求
确认分阶段私有状态方案及窄治理权限。用户随后批准了该方向；源码、真实密钥及节点验证仍须完成。

当时诊断阶段仅改回归测试与诊断，不改生产 Compact／生成绑定／密钥／部署，零 Midnight 交易。
先前 v6 的 17 笔治理／分配交易保持历史部分证据，不能冒充当前槽位执行或普通操作收据；
真实槽位签发／撤销和 M6 最终验收仍未完成。
