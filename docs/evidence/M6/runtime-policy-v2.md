# M6 runtime policy v2: authenticated participant-slot rules

Implementation date: 2026-10-14. Working contract profile:
`permio-authorization-v6`. This extends the allocation-policy slice; it does
not complete ordinary-action authorization or M6 acceptance.

## Concrete gap and version boundary

Policy v1 committed `actorSlotIdHash`, but had no authenticated representation
of that slot's M2 `assignableBy` rules. A caller-supplied rule cannot establish
that the activated template allowed the assigner. The separately committed
M5-P1 patch (`07df341ffabc65aa5e23302fddc644498017b018`) supplies portable
assignments and prospective revocation, not chain credentials or a trust bridge.

Policy v2 preserves every v1 field and adds immediately after `actorSlotIdHash`:

```text
slotAssignmentRulesRoot: MerkleTreeDigest
slotAssignmentRuleCount: Uint<32>
```

The policy version is 2 and its typed Compact commitment domain is
`pad(32, "permio:runtime-policy:v2")`, so its configuration hash changes. V1 is
rejected, not reinterpreted. M2 template hashes, M4 Ed25519 review/activation
history, admission-envelope version and common receipt specification are
unchanged. M2-to-projection correspondence remains the approved namespace
activator's responsibility; Compact does not parse arbitrary JSON.

V6 needs fresh module/configuration references, disposable governance fixture
admission, activation and deployment with matching real keys. A v5 deployment
cannot silently accept v2 private data. `runtime-policy-v1.md` and
`template-policy-verification.json` remain historical v5 evidence, not v6
results or ordinary-action proofs. Production module approval is not claimed.

## Rule tree and encoding

`createRuntimeParticipantSlotRules` reparses M2, then walks contexts, each
context's `allowedSlotIds`, and each slot's `assignableBy` alternatives, all in
their meaningful M2 array order. Each permitted combination becomes a private
fixed-size `RuntimeParticipantSlotRule`:

| Field | Meaning |
| --- | --- |
| `ruleVersion = 1` | Rule-leaf layout version |
| `contextHash` | Existing `permio:runtime-context-id:v1` hash |
| `slotIdHash` | Existing `permio:participant-slot-id:v1` hash |
| `authorityKind` | 1: creator; 2: namespace governance; 3: occupied slot |
| `authoritySlotIdHash` | Zero for 1/2; exact allowed assigning slot's hash for 3 |

These are rule-alternative discriminators, not namespace authority-root role
codes. A verifier must not compare the two enums directly.

The leaf is the typed Compact persistent commitment of
`{domain: pad(32, "permio:slot-rule:v1"), rule}`. The depth-20 tree contains
1–1,048,576 rules; this encoding capacity does not impose one account per slot.
A context-excluded slot has no rule there. Unknown authorities are not executed
as expressions. All action policies repeat the same full rule root/count, and
the existing activated binding manifest commits each exact configuration.

The allocation guard authenticates that root/count through configuration along
with the initial-state opening. No new transaction circuit, administrator,
synchronization signer or authority root is introduced.

`assertRuntimeParticipantSlotRule` checks supported versions, exact requested
context and slot, authority discriminator/canonical padding, physical Merkle
index below count, leaf commitment and root. It opens a **rule**, not a
credential. The expected context/slot must eventually come from authenticated
action/account/assignment inputs. It does not verify an assigner's signature,
identity or current status.

## M5-P1 private witness adapter

`prepareRuntimeSlotAssignmentChain` reads an authenticated application-owned
M5-P1 source, trusted M4 namespace-policy source, exact M2 content, the
action/instance/subject/assignment IDs and a safe integer evaluation time. It
returns `kind: "private-witness-only"`, never `allowed: true` or a receipt.

It checks the instance target/lifetime, action's actor slot, every exact parent
ID, each active holder's scope, creator/governance/occupied-slot eligibility,
and every rule opening. It returns the complete root-to-terminal private
assignment/account snapshots and paths. Missing/substituted parents, cycles,
wrong template tuples, inactive descendants, invalid times and cross-context
records are rejected. Returned data are defensive copies.

Creator means M5's exact `allocatedBy`; governance cannot override a creator-only
rule. Replacing a revoked parent ID cannot revive old descendants. Preparation
does not consume a nonce, change state or advance M5's time watermark. It is
not a consensus clock or on-chain current-status witness and does not
cryptographically authenticate arbitrary serialized M5 snapshots.

## Ordinary-user fixture integration and privacy

Customer-session and bounded delegated-session fixtures now use
`SlotBoundContextAccountSystem` and receive explicit requester assignments via
its real API. They select the existing generic action profile as a fixture,
not a production-approved implementation. Missing-slot/revoked-slot cases
extend the negative workload from 10 to 12. Account revocation now returns
`SLOT_NOT_ASSIGNED` at the earlier guard; legacy M5 denial ordering is untouched.

Public reports still whitelist counts/timings/status and must not expose
assignment IDs, accounts, records, chain entries, paths, keys or signatures.
`--require-chain` still exits 2 with zero transactions, null proof latency and
no receipt: ordinary-action chain acceptance is not implemented. Client timings
are not proof latency. This M6 integration does not edit M5-P1 source/evidence.

## Remaining chain enforcement

M6 still must cryptographically verify assignment issuance/permitted revocation,
bind the exact subject/slot and complete relevant ancestry to authoritative
current state, and use actual ledger time/root sequence in both ordinary-action
entry points. A host `isParticipantSlotActive` result is no substitute. Ancestor
revocation cannot be bypassed by silently truncating a chain. This slice adopts
no new credential kind, authority, maximum ancestry depth or public key nullifier.

Exact active module/schema checks, capability duration/depth, selected evidence,
atomic action state/nullifiers, common receipts, real negative-node/concurrency/
replay tests, action restart/wallet recovery, full privacy and production action
measurements remain M6 gates. Allocation or rule-opening success satisfies none
of those remaining gates.

---

# 中文翻译

实现日期为 2026-10-14，当前配置为 `permio-authorization-v6`。本次扩展分配策略
阶段，不代表普通操作授权或 M6 完成。

v1 只绑定动作槽位 ID，没有认证 M2 的 assignableBy 规则，无法仅凭调用者规则证明
激活模板允许该分配者。独立 M5-P1 提供可移植分配和后续撤销行为，不是链上凭证
或新桥接。v2 保留全部 v1 字段，在 actorSlotIdHash 后增加规则根与规则数量，版本
为 2，承诺域为 `permio:runtime-policy:v2`，配置哈希随之改变；拒绝 v1，不重新解释
旧字节。M2 哈希、M4 Ed25519 审查／激活历史、登记封装版本及通用收据规格不变。
JSON 与投影的对应责任仍属既定命名空间激活者，Compact 不解析任意 JSON。

v6 必须使用新的模块／配置引用、一次性测试治理登记、激活、部署及匹配真实密钥，
不能让 v5 偷偷接受 v2 数据。v1 策略文档与 template-policy-verification.json
保留为历史 v5 证据，不改称 v6 或普通操作证明，也不声称生产模块已获批准。

规则工厂重新解析 M2，按上下文、allowedSlotIds、assignableBy 的有意义数组顺序
生成私有定长规则：规则版本 1、既有域的上下文／槽位哈希、权限类型（1 创建者、
2 命名空间治理、3 已占用槽位），以及只对类型 3 非零的合法分配者槽位哈希。
这些是规则替代项类型，不是命名空间权限根的角色编码；不能直接比较两个枚举。
叶为类型化 Compact 持久承诺，域 `permio:slot-rule:v1`。深度 20 树容纳
1–1,048,576 条规则，这是编码容量，不是一槽一人。被上下文排除的槽位没有规则，
不执行未知权限表达式。所有动作策略重复同一完整规则根与数量，由既有激活绑定
清单认证。分配同时验证这些配置和初始状态；不增加交易电路、管理员、同步签名者
或权限根。

规则检查验证版本、精确上下文／槽位、权限类型与填充、实际 Merkle 位置小于数量、
叶与根。它仅展开规则，不验证分配者签名、身份或当前状态。上下文／槽位参数最终
必须来自已认证的操作、账户或分配。

私有适配器读取可信应用持有的 M5-P1 状态、可信 M4 策略、精确 M2、操作／实例／
主体／分配 ID 及安全整数时间，返回 private-witness-only，不返回获准决定或收据。
它验证实例目标／有效期、动作槽位、全部精确上级 ID、账户有效性和作用域、三类
权限及每条规则，返回从根到末端的完整私有快照和路径。缺失／替换上级、循环、
模板不符、下级失效、非法时间或跨上下文记录均拒绝，返回防御性副本。

创建者仍指 M5 的 allocatedBy；治理不能覆盖仅限创建者的槽位；更换撤销上级 ID
不恢复旧下级。准备不消耗 nonce、不改状态或时间水位，不是共识时钟、链上当前
状态证明，也不能密码学认证任意序列化 M5 快照。

普通用户和有限委托 fixture 现在使用真实 M5-P1 API 明确分配 requester，所选通用
动作 profile 只是 fixture，不是已获生产批准的实现。新增缺失／撤销槽位反例，
负例由 10 增至 12。账户撤销在较早槽位检查返回 SLOT_NOT_ASSIGNED，旧 M5 类的
顺序不变。公开报告只允许计数、时间和状态，不泄漏分配 ID、账户、记录、链条、
路径、密钥或签名。--require-chain 仍 exit 2、零交易、空证明延迟且无收据，因为
普通动作真实链验收尚未实现；客户端时间不冒充证明延迟。本次不修改 M5-P1。

M6 仍须密码学验证分配签发和合法撤销，将精确主体／槽位及完整相关上级绑定到当前
权威状态，在两个普通操作入口使用真实账本时间和根序号。宿主有效性查询不能替代，
不能静默截断上级链绕过撤销。本次不采用新凭证种类、权限、最大上级深度或公共
密钥 nullifier。精确模块／模式、能力时长／深度、证据、原子状态／nullifier、
通用收据、节点负面／并发／重放、操作重启／钱包恢复、完整隐私和生产动作测量
仍待完成；分配或规则展开成功不能替代这些条件。
