# M5-P1: private participant-slot assignments

## Scope and compatibility

This is a separately committed follow-up to accepted M5, requested on
2026-10-14. It implements the missing portable runtime interpretation of M2
`ParticipantSlot.assignableBy`, `ContextDefinition.allowedSlotIds`, and
`ActionDefinition.actorSlotId`. It does not reopen the M5 milestone or change
its historical acceptance record. The original `ContextAccountSystem`, model,
intent encoding, signatures, and original 13 tests remain unchanged.

Use the additive `SlotBoundContextAccountSystem` export for slot-enforced
instances. It owns a private legacy M5 engine and forwards its account,
capability, session, allocation, getter, and revocation APIs. An existing legacy
engine is not accepted as an injected runtime, and no underlying engine is
exposed. Selecting this new class is required: merely importing the package
does **not** add slot enforcement to existing `ContextAccountSystem` objects.
There is no automatic migration of existing in-memory instances.

## Assignment and authority rules

`assignParticipantSlot(actor, input, assignedAt)` requires the exact namespace,
template ID, semantic version, and template hash already bound to the instance,
plus an assignment ID, instance ID, context ID, slot ID, and subject account ID.
The account must be active in that exact instance and context. Both the slot
and context must exist, and the context must explicitly allow that slot.

| M2 `assignableBy` value | Required authenticated caller reference |
| --- | --- |
| `@instance-creator` | `kind: "instance-creator"`, with the exact instance's `allocatedBy` principal |
| `@namespace-governance` | `kind: "namespace-governance"`, with a governance authority in M4's policy for the instance namespace |
| Another slot ID | `kind: "occupied-slot"`, with the account ID and an active assignment ID occupying that slot in the same instance and context |

The existing M5 model records `allocatedBy`, not a separate end-user creator;
the creator rule therefore uses that exact recorded allocator. A second
allocator, a capability issuer, an author, a reviewer, an emergency revoker,
an authority from another namespace, and an `administrator` reference do not
gain slot authority from those labels. Governance is not an override for slots
that omit `@namespace-governance`. Occupying a slot does not grant capability
issuance, template activation, or an unrelated slot's assignment authority.
Human, agent, service, and contract accounts use the same explicit rules.

Caller references are **not cryptographic credentials**. As with original M5,
the host application must authenticate the caller before passing its reference
to a mutation method; accepting arbitrary browser-supplied principal/account
IDs would be unsafe. The injected M4 registry must also be trusted. This patch
does not add a new signing scheme or public admission bridge.

Multiple accounts may occupy a slot; M2 has no singleton-slot constraint.
Duplicate active `(instance, context, slot, account)` bindings are rejected.
Assignment IDs cannot be reused, even after revocation. A new assignment may
replace an inactive binding only with a new ID. Returned records are defensive
copies, and extra input properties are not stored.

## Revocation, history, and time

`revokeParticipantSlot(actor, assignmentId, revokedAt)` requires an authority
that currently satisfies the same slot's assignment rule. It appends a separate
revocation record instead of changing or deleting the assignment. Repeated
revocation is rejected. Read APIs expose private assignment history and its
separate revocations; activity queries use inclusive revocation times and an
exclusive instance expiry time.

Occupied-slot assignments retain the **exact parent assignment ID**, not just
the parent slot or account name. Revoking a parent assignment or its account
prospectively makes dependent assignments inactive. Reassigning the parent
account with a new ID does not revive old descendants. The original assignment
records and already returned action decisions are not rewritten. All edges
point to already existing assignments, so provenance cannot contain a cycle.
Instance revocation or expiry also makes every assignment in it inactive.

The host supplies a trusted clock in the same integer time unit used by M5.
Every successful mutation and authorized action advances a per-instance time
watermark. Earlier mutation times are rejected; actions evaluated before the
watermark return `STALE_OPERATION_TIME`. Failed mutations and denied actions
do not advance it. This prevents a caller from submitting a new authorization
at an old time to evade a recorded revocation. Equal timestamps are permitted
and operations are ordered by synchronous API call order; time-based activity
queries show the result of all recorded changes effective at that time, not a
transaction-sequenced historical proof. These in-memory records are not a
durable audit log or a consensus clock.

## Guarded action authorization

The wrapper checks the session signature and exact template/instance/context
routing before inspecting private slot eligibility. The session's subject must
have an active assignment for the action's exact `actorSlotId`. Otherwise it
returns `SLOT_NOT_ASSIGNED` **before** the legacy engine can consume the nonce
or advance the state. Retrying the same signed intent after a permitted
assignment can succeed if all other original M5 checks still pass.

A slot is necessary, not sufficient. Original capability/session scope,
attenuation, freshness, lifetime, ancestor revocation, state-transition, and
nonce-replay checks still run. The new guard may report `SLOT_NOT_ASSIGNED`
before a legacy capability denial; denial precedence is not a substitute for
the underlying policy. No assignment automatically creates a capability or
session. No new receipt format or assignment-commitment protocol is introduced.

## Verification and M6 boundary

Run the existing root entry point:

```sh
npm run test:context-accounts
npm run check
```

The package test script now discovers `test/*.test.ts`, integrating the patch
through the already existing root `test:context-accounts` command without
changing the root manifest. The original 13 cases and 37 new patch cases pass.
No dependency or package version changed, so no lockfile update is needed.
Detailed execution results are recorded separately under
[`docs/evidence/M5-P1`](../../docs/evidence/M5-P1/development-log.md).

This patch is chain-neutral, private, and in-memory. It adds no Compact circuit,
on-chain storage, proof, receipt, persistence, or public identity. M6 must still
explicitly consume these rules, bind the exact private assignment/account and
current revocation state into its authoritative proof contract, and verify
positive and negative transactions on the specified Midnight stack. Existing
M6 fixtures that construct the legacy class remain legacy-only until migrated;
passing these tests is not evidence that Midnight enforces participant slots.

---

# 中文翻译

## 范围与兼容性

这是用户于 2026-10-14 要求、独立提交的已验收 M5 后续补丁。它补齐 M2
`ParticipantSlot.assignableBy`、`ContextDefinition.allowedSlotIds` 和
`ActionDefinition.actorSlotId` 在可移植运行时中的执行规则，不重新开启 M5
milestone，也不改写历史验收记录。原有 `ContextAccountSystem`、模型、意图编码、
签名及原有 13 项测试保持不变。

需要槽位检查的实例应使用新增导出 `SlotBoundContextAccountSystem`。它私有持有
原有 M5 引擎，转发账户、能力、会话、分配、查询和撤销接口。不接受外部已有引擎
作为运行时，也不暴露底层引擎。必须主动选择新类：仅导入包不会为现有
`ContextAccountSystem` 对象增加槽位检查。已有内存实例不会自动迁移。

## 分配与权限规则

`assignParticipantSlot(actor, input, assignedAt)` 要求输入精确匹配实例已绑定的
命名空间、模板 ID、语义版本、模板哈希，并提供分配 ID、实例 ID、上下文 ID、
槽位 ID 和目标账户 ID。账户必须在同一实例和上下文中有效；槽位和上下文必须存在，
且上下文必须明确允许该槽位。

| M2 `assignableBy` 值 | 必需的已认证调用者引用 |
| --- | --- |
| `@instance-creator` | `kind: "instance-creator"`，主体必须是该实例记录的 `allocatedBy` |
| `@namespace-governance` | `kind: "namespace-governance"`，主体必须属于该实例命名空间的 M4 治理权限列表 |
| 另一个槽位 ID | `kind: "occupied-slot"`，提供同一实例、同一上下文中占据该槽位的账户 ID 和有效分配 ID |

现有 M5 只记录 `allocatedBy`，没有独立的最终用户创建者，因此创建者规则使用
该实例记录的具体分配者。另一个分配者、能力签发者、作者、审查者、紧急撤销者、
其他命名空间的治理者和 `administrator` 引用都不会仅凭这些标签获得槽位权限。
对于没有列出 `@namespace-governance` 的槽位，治理权限也不能越权。占据槽位不会
自动赋予能力签发、模板激活或无关槽位的分配权。人类、agent、服务和合约账户均
遵循相同的明确规则。

调用者引用不是密码学凭证。与原 M5 一样，宿主应用必须先认证调用者，再将其引用
传入修改接口；不能直接信任浏览器提供的主体或账户 ID。注入的 M4 注册表也必须
可信。本补丁不引入新签名方案或公共登记桥接。

一个槽位可以分配给多个账户，因为 M2 没有规定单一占用约束。重复的有效
`(实例、上下文、槽位、账户)` 绑定会被拒绝。分配 ID 即使撤销后也不能复用。
替换失效绑定必须使用新 ID。返回记录都是防御性副本，不存储额外输入字段。

## 撤销、历史与时间

`revokeParticipantSlot(actor, assignmentId, revokedAt)` 要求调用者当前符合该槽位
原有分配规则。撤销通过追加独立记录完成，不修改或删除原分配；重复撤销会被拒绝。
查询接口返回私有分配历史及独立撤销记录。有效性查询在撤销时刻即判定失效，
实例到期时刻也不包含在有效期内。

由已占用槽位授权的分配会保留精确的上级分配 ID，而不仅是槽位名或账户名。
撤销上级分配或其账户，将使依赖它的分配从该时刻起失效。用新 ID 重新分配上级
账户不会恢复旧下级。原始分配记录和此前返回的操作决定不会改写。所有依赖只能
指向已经存在的分配，因此不能形成循环。实例撤销或到期也会使其中所有分配失效。

宿主使用可信时钟，时间单位与 M5 使用的整数单位一致。每次成功修改和获准操作
都会推进实例级时间水位。更早的修改时间会被拒绝；在水位之前评估操作会返回
`STALE_OPERATION_TIME`。失败修改和被拒操作不推进水位，以防通过旧时间重新
授权来绕过已记录的撤销。允许相同时间戳，操作按同步接口调用顺序执行；按时间
查询会反映该时刻所有已记录生效变更的结果，不是按交易顺序证明的历史状态。
这些内存记录不是持久审计日志，也不是共识时钟。

## 带槽位检查的操作授权

封装层先验证会话签名，以及精确的模板、实例和上下文，再检查私有槽位资格。
会话主体必须拥有操作 `actorSlotId` 对应的有效分配，否则在原引擎消耗 nonce
或推进状态之前返回 `SLOT_NOT_ASSIGNED`。在获得合法分配后，只要原有 M5 其他
检查仍然满足，同一签名意图可以重试成功。

槽位是必要条件，不是充分条件。原有能力与会话范围、权限收窄、密钥新鲜性、
有效期、上级撤销、状态迁移和 nonce 重放检查仍会执行。新增检查可能先于原有
能力拒绝返回 `SLOT_NOT_ASSIGNED`；拒绝原因的先后顺序不能代替实际策略。
分配不会自动创建能力或会话，也不引入新的收据格式或分配承诺协议。

## 验证与 M6 边界

运行已有根级入口：`npm run test:context-accounts` 和 `npm run check`。
包测试脚本改为发现 `test/*.test.ts`，因此通过已有根级 `test:context-accounts`
自动接入，不修改根级 manifest。原 13 项测试及新增 37 项补丁测试通过。
依赖和包版本均未变化，不需要修改锁文件。具体执行结果另存于
`docs/evidence/M5-P1`。

本补丁与链无关，仅保存私有内存状态，不新增 Compact 电路、链上存储、证明、收据、
持久化或公共身份。M6 仍须明确接入规则，将精确的私有分配、账户及当前撤销状态
绑定进其权威证明合约，并在规定的 Midnight 栈上执行正反交易验证。现有使用旧类的
M6 fixture 在迁移前仍只有旧行为；这些测试通过不代表 Midnight 已执行槽位检查。
