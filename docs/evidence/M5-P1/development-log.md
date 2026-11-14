# M5-P1 development log: participant-slot assignment patch

Date: 2026-10-14 (Asia/Shanghai). Parent: `b8710a43c7b324e348d19176f0a2659421866b5c`.
Branch: `feat/m6-m8-midnight-delivery`.

## Request and concrete gap

The user requested that accepted M5 not be reopened, and authorized a small
follow-up patch in a separate local commit. Existing M6 work in this worktree
was already dirty before the patch and is excluded from that commit.

The architecture specifies slot-assignment authority in
`docs/PROGRAMMABLE_CONTEXT_ARCHITECTURE.md` (the authority table and the scenario
allocator section). M2 already validates `assignableBy` references,
`allowedSlotIds`, and the action's `actorSlotId`. Inspection of accepted M5
found no assignment record, assignment/revocation API, or actor-slot check in
`ContextAccountSystem.authorizeAction`. A correctly signed, in-scope capability
could therefore satisfy M5 without proving that its account occupied the
action's slot. This is a portable domain gap, not an Ed25519/Schnorr mismatch,
Compact compiler limitation, or reason to replace the selected architecture.

Devin's Permio wiki was used for orientation but still described the M1-M5
baseline rather than current dirty M6 work. The local codebase-index was
configured for the sibling `information-flow` repository, not this Permio
worktree; it was not used as evidence or updated for the wrong repository.
The diagnosis above was verified against exact current M2, M4 and M5 source.

## Implementation decisions and their consequences

1. Add `SlotBoundContextAccountSystem` rather than changing the accepted
   `ContextAccountSystem`. The new class owns a private legacy engine; external
   callers cannot obtain that engine through the patch API. All account,
   capability, delegation, session and revocation operations remain available
   through forwarding methods. Existing applications must explicitly opt in;
   this does not silently fix old instances or current M6 fixtures.
2. Store private version-1 assignments with the exact M4 template tuple,
   instance, context, slot, subject, assigning authority, and assignment time.
   Read APIs return defensive copies. Input/actor extra properties are not
   retained. No public identifier, receipt schema, commitment encoding, or
   additional signature scheme was introduced.
3. Resolve creator authority from the existing instance `allocatedBy` field,
   namespace governance from M4 `getNamespacePolicy`, and occupied-slot
   authority from one exact live parent assignment in the same instance and
   context. M5 has no independent end-user creator field; the patch does not
   invent one. The host still authenticates caller references, as in M5.
4. Keep assignment permission separate from capability issuance, M4 template
   activation and emergency revocation. Namespace governance cannot assign a
   creator-only slot, and an issuer/reviewer/author/allocator/emergency label
   does not become namespace governance. There is no administrator override.
5. Do not impose one account per slot because M2 specifies no cardinality
   rule. Reject duplicate active account-slot bindings and globally reused
   assignment IDs. Replacements require new IDs, including after revocation.
6. Append a separate revocation record. The revoker must currently satisfy
   that slot's assignment rule. Exact parent IDs make ancestor/account
   revocation prospective and prevent a newly assigned parent from reviving
   old children. Assignment records and already issued decisions are not
   rewritten. Assignment edges point only to existing records, preventing
   cyclic provenance without changing template expressiveness.
7. Apply a per-instance mutation-time watermark across every forwarding write
   and successful action. Reject backdated writes or new action evaluations
   that predate a later recorded change. Denials do not consume a nonce,
   change state, or advance the watermark. Equal times follow synchronous call
   order; timestamp queries are not transaction-sequenced historical proofs.
8. Verify the intent signature and exact routing before checking the actor's
   slot. Reject missing/inactive slot membership before calling the mutating
   legacy authorizer. After the slot guard, the original capability/session,
   resource, purpose, recipient, disclosure, time, state and replay checks
   remain mandatory. The new slot denial can precede some legacy denials.
9. Extend only the package test script to `test/*.test.ts`; the existing root
   `test:context-accounts` entry point already integrates it. No dependency,
   package version, root manifest or lockfile change is needed for this patch.

The implementation and exact API boundaries are documented in
[`SLOT_ASSIGNMENT_PATCH.md`](../../../packages/context-accounts/SLOT_ASSIGNMENT_PATCH.md).

## Tests, failures, and repairs observed during development

- First focused run: all original 13 tests and the initial 32 patch tests
  passed (45 total, no skips).
- First TypeScript check found deliberate test mutations written against
  readonly fields (`TS2540` for the intent resource) and a literal-inferred
  actor (`TS2322`). Widening the actor exposed a second readonly-field
  `TS2540`. These were repaired with explicit mutable casts only at the
  deliberate tampering sites; no production readonly types were weakened.
- The next root check passed documentation freshness and TypeScript, then
  failed at `hardhat build` with `HHE22` inside the restricted execution
  environment. Re-running the same installed repository check with approved
  execution access succeeded; no installation, version change, dependency
  rewrite or replacement contract was used.
- That full run passed 212 cases: diagnostics 16, protocol 6, scenario domain
  15, generator 14, governance 16, context accounts 45, Midnight 94, Hardhat 6.
  The Hardhat registry was exercised on its local EVM. The 94 Midnight cases
  include generated-Compact/local predicate tests and are **not** new live
  Midnight acceptance evidence for this patch.
- Five more regression cases cover failed exact-M4 creation without partial
  state, all four neutral principal kinds, successful delegation/session
  forwarding plus ancestor capability revocation, backdated forwarded grants,
  and caller mutation of the original template. The focused final package run
  passes 50/50 (original 13 plus new 37), with no failures or skips. The root
  TypeScript check also passes.
- Final `npm run check` passes 217 cases: diagnostics 16, protocol 6, domain 15,
  generator 14, governance 16, context accounts 50, Midnight 94, Hardhat 6.
  Documentation freshness, root TypeScript and the installed Solidity build
  also pass. No tests are skipped. Final Midnight suite duration is
  117,203.3004 ms; Hardhat reports six passing cases in 4,756 ms. These are
  regression-suite timings, not proof-generation or end-user latency claims.
- The isolated TypeScript entry check initially reports `TS5112`: this
  installed TypeScript 7 compiler requires explicit `--ignoreConfig` when
  source files are listed beside a tsconfig. Adding that diagnostic-prescribed
  flag passes without loading or editing the dirty root configuration. Exact
  reproducible command and artifact fingerprints are in `acceptance.json`.

New negative coverage explicitly checks altered namespace/template ID/version/
hash; unknown slots; forbidden contexts; cross-context/instance subjects and
assigners; forged or unoccupied assigners; wrong parent slots; duplicate IDs
and bindings; unauthorized revocation; account/instance/ancestor revocation;
expiry; stale or invalid time; signature tampering; wrong session/routing;
replay; scope narrowing; fresh keys; and privilege collapse. Private test keys
are generated in memory and are not saved in this evidence.

## Preserved baseline and remaining integration

The old M5 source files (`system.ts`, `model.ts`, `errors.ts`, `action-intent.ts`),
original test file, package README and entire `docs/evidence/M5` directory are
unchanged. Only the additive export and test discovery change alongside new
patch files. The shared milestone Markdown, generated HTML and local ignored
agent-instruction bridge are not edited or staged. Historical M5 artifact
hashes continue to describe their original committed snapshot, not this
additive follow-up.

The full root check observes the existing dirty M6 working tree. The M5-P1
production code depends only on unchanged M2/M4/M5 APIs; it imports no M6 code.
An isolated TypeScript entry check validates its dependency graph without
relying on the dirty root `tsconfig.json`. Only explicit M5-P1 paths are staged
for the separate local commit; no push is performed.

M6 remains incomplete. It must consume the new slot rules explicitly, bind
assignments and current revocation state in the actual proof contract, and run
real positive/negative Midnight transactions. This patch provides no chain
proof, persistence, production performance claim or new M6 completion claim.

---

# 中文翻译

日期：2026-10-14（Asia/Shanghai）。父提交：`b8710a43c7b324e348d19176f0a2659421866b5c`。
分支：`feat/m6-m8-midnight-delivery`。

## 请求与具体缺口

用户要求不重新开启已验收的 M5，授权将小范围后续补丁独立本地提交。补丁开始前，
此工作树已有未提交的 M6 改动，它们不包含在补丁提交内。

架构文档的权限表和情境分配者章节已经规定槽位分配权限。M2 已验证 `assignableBy`
引用、`allowedSlotIds` 和操作的 `actorSlotId`。检查已验收 M5 后发现，它没有分配
记录、分配或撤销接口，也没有在 `ContextAccountSystem.authorizeAction` 中检查
操作主体槽位。因此，正确签名且范围匹配的能力可能通过 M5，却未证明账户占据
操作所需槽位。这是可移植领域层缺口，不是 Ed25519/Schnorr 不匹配、Compact
编译器限制，也不是替换既定架构的理由。

Devin Permio wiki 用于定位，但仍描述 M1-M5 基线，未反映当前未提交 M6 工作。
本地 codebase-index 配置在相邻的 `information-flow` 仓库，未将其作为此工作树
证据，也未对错误仓库更新索引。上述诊断已对照当前 M2、M4、M5 源码核实。

## 实现决策及影响

1. 新增 `SlotBoundContextAccountSystem`，不修改已验收的原类。新类私有持有原引擎，
   补丁接口不暴露底层引擎，转发账户、能力、委托、会话和撤销操作。应用必须明确
   选用新类，不会悄悄修复旧实例或现有 M6 fixture。
2. 私有版本 1 分配记录绑定精确 M4 模板四元组、实例、上下文、槽位、主体、分配权限
   和时间。查询返回防御性副本，不保留额外输入或权限对象字段。不新增公共标识、
   收据结构、承诺编码或签名方案。
3. 创建者权限使用实例已有 `allocatedBy`，命名空间治理使用 M4 策略，已占用槽位
   权限使用同一实例和上下文中的精确有效上级分配。M5 没有独立最终用户创建者字段，
   补丁也不虚构该字段。宿主仍须像原 M5 一样认证调用者引用。
4. 分配权限与能力签发、模板激活、紧急撤销分离。命名空间治理不能分配仅限创建者的
   槽位；签发者、审查者、作者、分配者或紧急撤销者标签不会变成命名空间治理。
   没有管理员越权入口。
5. M2 没有规定槽位人数限制，因此不强制一槽一人。拒绝重复有效账户槽位绑定和复用
   分配 ID；撤销后替换也必须使用新 ID。
6. 撤销追加独立记录，撤销者必须当前符合该槽位的分配规则。精确上级 ID 使上级或
   账户撤销从该时刻起生效，重新分配上级不会恢复旧下级。不改写原分配及已返回决定。
   依赖只能指向已存在记录，既避免循环，也不修改模板的表达能力。
7. 所有转发修改和成功操作都推进实例时间水位，拒绝早于后来变更的修改或新授权评估。
   拒绝不消耗 nonce、不改状态、不推进水位。同一时间戳按同步调用顺序执行；
   按时间查询不是按交易序列证明的历史状态。
8. 先验证签名和精确路由，再检查操作主体槽位。槽位缺失或失效时，在调用会修改状态
   的原授权器前拒绝。通过槽位检查后，原有能力、会话、资源、目的、接收方、披露、
   时间、状态和重放检查仍不可省略。新槽位拒绝可能先于部分旧拒绝原因返回。
9. 仅将包测试发现改为 `test/*.test.ts`，已有根级入口自动接入。补丁不需要修改依赖、
   包版本、根级 manifest 或锁文件。

具体接口边界另见 `packages/context-accounts/SLOT_ASSIGNMENT_PATCH.md`。

## 开发中实际观察的测试、失败与修复

- 首次针对性测试：原 13 项加初始新增 32 项，合计 45 项通过，无跳过。
- 首次类型检查发现故意篡改测试直接修改只读 resource 字段（`TS2540`），以及权限
  对象被推断为字面量（`TS2322`）；扩大类型后又暴露 principalId 的只读错误。
  只在故意篡改的位置使用明确的可变类型转换，未削弱生产接口的只读类型。
- 随后根级检查通过文档新鲜度和 TypeScript，但受限环境中 `hardhat build` 报
  `HHE22`。获准使用执行访问权限后，同一套已安装检查成功；没有安装依赖、升级、
  重写依赖或替换合约。
- 该轮完整检查通过 212 项：诊断 16、协议 6、领域 15、生成器 14、治理 16、
  上下文账户 45、Midnight 94、Hardhat 6。Hardhat 在本地 EVM 执行现有注册表。
  Midnight 94 项包括生成 Compact 和本地谓词测试，不是补丁新增的真实 Midnight
  验收证据。
- 后增 5 项回归，覆盖 M4 创建失败不留下部分状态、四种中立主体、成功委托和会话
  转发及上级能力撤销、转发授权的倒填时间，以及调用者修改原始模板。最终针对性
  测试 50/50 通过（原 13 加新 37），无失败或跳过，根级 TypeScript 检查也通过。
- 最终 `npm run check` 通过 217 项：诊断 16、协议 6、领域 15、生成器 14、治理 16、
  上下文账户 50、Midnight 94、Hardhat 6。文档新鲜度、根级 TypeScript 和现有
  Solidity 构建也通过，无跳过。最终 Midnight 套件用时 117,203.3004 毫秒；Hardhat
  报告 4,756 毫秒内通过六项。这是回归套件时间，不是证明生成或最终用户延迟。
- 独立 TypeScript 入口检查初次报 `TS5112`：已安装的 TypeScript 7 要求在 tsconfig
  旁明确列出源码时添加 `--ignoreConfig`。按诊断加入该参数后通过，不加载或修改
  未提交的根级配置。精确可复现命令和产物指纹记录在 acceptance.json。

新增反例明确覆盖模板四元组篡改、未知槽位、上下文不允许、跨上下文或跨实例主体
和分配者、伪造或未占用的分配者、错误上级槽位、重复 ID 和绑定、无权撤销、账户/
实例/上级撤销、到期、非法或旧时间、签名篡改、会话和路由错误、重放、权限收窄、
新鲜密钥和权限混同。测试私钥仅在内存中生成，不保存到证据。

## 保留的基线与后续接入

原 M5 的 system.ts、model.ts、errors.ts、action-intent.ts、原测试、包 README
及整个 docs/evidence/M5 不变。只有新增导出和测试发现改动，以及新补丁文件。
共享 milestone Markdown、生成 HTML 和本地忽略的 agent 指令桥接不修改、不暂存。
历史 M5 哈希仍描述原提交快照，不是此后续增量。

完整根级检查观察的是包含现有未提交 M6 的工作树。M5-P1 生产代码仅依赖未变化的
M2/M4/M5 接口，不导入 M6。独立 TypeScript 入口检查不依赖未提交的根级
tsconfig.json。独立本地提交只暂存明确列出的补丁路径，不 push。

M6 仍未完成，必须明确使用新槽位规则，将分配及当前撤销状态绑定到真实证明合约，
并在 Midnight 执行正反交易。本补丁不提供链上证明、持久化、生产性能结论或新的
M6 完成声明。
