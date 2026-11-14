# Programmable context creation and template library

Status: approved by the user on 2026-11-15: template authoring + library + configured instances.
Baseline: `57c2b25`.
Builder check: completed; no additional planning blockers found.

## Intent and existing evidence

The user requests a commit before changing context creation, removal of the
two-context restriction, programmable concrete contexts using the existing
general template, and a context library. The baseline commit is complete.

The restriction is in `packages/execution-dashboard/web/context-profiles.js`
and `ContextInterface.newCase`: creation selects one of two presentation
profiles. `LocalContextClient` stores these examples in per-account browser
storage. Separately, `ApplicationStore`, `/api/blueprints`, and
`/api/blueprints/:id/instances` already persist account-scoped templates and
perform M4 review/activation and M5 allocation. `ScenarioTemplate` and
`parseScenarioTemplate` already define and validate the general template.

Reuse those domains and the existing authenticated JSON/CSRF transport. No
Devin tool was available in this session; navigation used the fresh local
codebase index and direct source verification.

## Proposed behavior

The approved scope includes template authoring, the template library, and
configured instance creation.

1. Expose a primary **Context library** view. It lists the current account's
   accessible server templates, with search, lifecycle filters, name,
   description, context/action counts, version, namespace and exact content hash.
   Existing account-level policy/review links remain compatible with this view.
2. **New context** opens template selection from that library. It is not a
   selector over the two example profiles. Users can inspect every context and
   action in a definition. Only an active template for which the current account
   is the allocator offers instance creation; the server rechecks both facts.
3. Instance creation binds the exact selected template target to the existing
   name, participants, issuer and duration inputs. Save an immutable template
   snapshot and target with the instance so display never silently follows a
   later draft. Show created instances and their declared contexts in the
   context overview and after refresh.
4. In the authoring scope, offer a guided simple-template form and an advanced
   declarative-definition editor/import. The latter accepts the existing
   `ScenarioTemplate` shape, including multiple participant slots, contexts,
   actions, transitions, capability/disclosure rules and proof/adapter references.
   No new template language or executable scripting is introduced.
5. Persist authoring through the existing blueprint endpoints. New drafts receive
   a server-owned local namespace and template identity. Import is a new draft,
   never adoption of another namespace's approval. Updates retain the stored
   namespace/identity, are owner-only, and remain limited to unsubmitted drafts.
   Parse with the domain validator and calculate the canonical hash on the
   server. Show actionable validation errors without storing partial changes.
6. The existing review, activation, retirement, revocation and allocator checks
   continue to apply. Saving or structurally validating a draft does not approve
   it. Arbitrary proof references do not create or activate a proof module.

## Boundary with existing examples and runtime integration

Preserve previously saved example cases, consent records and history. Do not
silently convert browser examples into approved server templates, instances,
capabilities or receipts. They remain explicitly documented presentation data.
The two examples may remain visible as saved examples, but they no longer
define the set of creatable server contexts.

New server instances display their template-derived definitions and bindings.
Do not route them through the example-only `profileById`/`policyFor` tables or
infer authorization from their presence in the overview. Their action controls
must not pretend that the unimplemented context-permission HTTP endpoints,
Midnight runtime proof, receipt transport or evidence delivery are available.
This work delivers creation/library integration, not the remaining M11 runtime
integration or native M9 acceptance.

## Implementation choices left to the builder

Retain the current JavaScript frontend, TypeScript backend, SQLite store and
domain packages. Add no dependency or cloud deployment. Reuse existing styles,
dialog infrastructure, same-origin protections and account filtering. The exact
layout, component extraction and form presentation are builder choices.

The advanced editor must preserve every supported domain field and never
silently reduce a multi-context template to its first context/action. The simple
form must not edit a complex definition unless that conversion preserves all
fields; otherwise use the advanced editor. Keep the existing request-size limit
and explain oversized input as a validation error.

## Verification and completion

- A third, independently generated template with multiple contexts and actions
  can be authored (if included), saved, reopened and inspected without adding a
  profile constant or scenario-specific UI branch.
- Domain-invalid references, unknown/executable fields, forged namespace/target,
  foreign-account reads/updates, unapproved allocation, wrong allocator and
  retired/revoked allocation fail without partial persistence.
- An approved allocation retains its exact template version/hash and complete
  context definition across reloads. Draft edits never mutate that snapshot.
- Existing example permissions, saved state and isolation regressions pass.
- Run dashboard tests/typecheck, root typecheck, relevant scenario-domain and
  governance tests, JavaScript syntax checks and documentation checks.
- Verify the visible library, programmable editor, template selection, errors,
  account isolation and persisted created contexts in a real browser, including
  a narrow viewport. Synthetic accounts/data only; no cloud or chain activation.

## 中文翻译

```text
# 可编程 context 创建与模板库

状态：用户已于 2026-11-15 批准模板编写＋模板库＋配置化实例的完整范围。
基线：57c2b25。
可实施性审查已完成，未发现额外规划阻碍。

## 意图与现有证据

用户要求先提交，再修改 context 创建功能：解除两个 context 的限制，利用已有通用模板支持可编程具体 context，并提供 context 库。基线提交已完成。

限制来自 packages/execution-dashboard/web/context-profiles.js 和 ContextInterface.newCase：创建时只能选择两个展示 profile。LocalContextClient 将这些示例按账户保存在浏览器中。另一条独立路径中，ApplicationStore、/api/blueprints 和 /api/blueprints/:id/instances 已经持久化账户范围内的模板，并执行 M4 审核／激活及 M5 分配。ScenarioTemplate 和 parseScenarioTemplate 已定义并验证通用模板。

复用这些领域模块及现有认证 JSON／CSRF 传输。本次会话没有可用 Devin 工具，因此使用了最新本地代码索引及直接源码核验。

## 拟议行为

已批准范围包括模板编写、模板库和配置化实例创建。

1. 提供主要的 Context library 视图，列出当前账户可访问的服务器模板，支持搜索、生命周期筛选，显示名称、描述、context／动作数量、版本、命名空间及精确内容哈希。现有账户级策略／审核链接保持兼容。
2. New context 从该模板库选择模板，不再从两个示例 profile 中选择。用户能够查看定义中的全部 context 和动作。只有模板处于 active 且当前账户是 allocator 时才提供实例创建；服务器再次核验两项条件。
3. 实例创建将精确选定的模板目标与现有名称、参与者、签发者及期限输入绑定。实例保存不可变模板快照及目标，展示内容不会静默跟随之后的草稿修改。创建的实例及其声明的 context 会出现在 context 总览中，并在刷新后保留。
4. 若包含编写功能，提供引导式简单模板表单和高级声明式定义编辑／导入。高级入口接受现有 ScenarioTemplate 格式，包括多个参与者槽位、context、动作、状态转换、能力／披露规则及证明／适配器引用。不新增模板语言或可执行脚本。
5. 通过现有 blueprint 端点保存模板。新草稿采用服务器分配的本地命名空间及模板标识。导入产生新草稿，绝不继承另一命名空间的批准。更新保留已存命名空间／标识，仅允许所有者编辑尚未提交的草稿。使用领域验证器解析，并由服务器计算规范哈希。返回可操作的验证错误，不保存部分修改。
6. 继续执行现有审核、激活、退役、撤销及 allocator 检查。保存或结构验证草稿不等于批准。任意证明引用不会创建或激活证明模块。

## 与现有示例及运行时集成的边界

保留已保存的示例案例、同意记录及历史。不会将浏览器示例静默转换为已批准的服务器模板、实例、能力或收据。它们继续是明确记录的展示数据。两个示例可以作为已存示例保留，但不再定义服务器可创建 context 的全集。

新的服务器实例显示模板派生的定义及绑定，不通过仅用于示例的 profileById／policyFor 表，也不因出现在总览中就推断具有权限。动作控件不能假装尚未实现的 context-permission HTTP 端点、Midnight 运行时证明、收据传输或证据交付已经可用。本次交付创建／模板库集成，不代表完成剩余 M11 运行时集成或 M9 原生验收。

## 由实现者决定的实现细节

保持现有 JavaScript 前端、TypeScript 后端、SQLite 存储及领域包，不增加依赖或云部署。复用样式、弹窗、同源保护和账户筛选。精确布局、组件拆分及表单展示由实现者决定。

高级编辑器必须保留所有受支持领域字段，绝不将多 context 模板静默缩减为第一个 context／动作。简单表单只有在转换能保留全部字段时才能编辑复杂定义，否则使用高级编辑器。保持现有请求大小限制，对超限输入给出验证错误。

## 验证与完成标准

- 第三个独立生成、含多个 context 和动作的模板能够编写（若包括此范围）、保存、重新打开和查看，无需增加 profile 常量或特定情境 UI 分支。
- 无效引用、未知／可执行字段、伪造命名空间／目标、跨账户读取／修改、未批准分配、错误 allocator，以及已退役／撤销模板的分配均被拒绝，不产生部分保存。
- 已批准分配跨刷新保留精确版本／哈希及完整 context 定义，草稿编辑绝不修改其快照。
- 现有示例权限、保存状态及隔离回归通过。
- 执行仪表板测试／类型检查、根类型检查、相关 scenario-domain 和治理测试、JavaScript 语法检查及文档检查。
- 在真实浏览器中验证可见模板库、可编程编辑器、模板选择、错误、账户隔离及已创建 context 的持久化，包括窄屏。只使用合成账户／数据，不进行云端或链上激活。
```
