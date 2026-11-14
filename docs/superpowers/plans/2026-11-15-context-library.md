# Programmable Context Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fixed-profile context creation with reusable template authoring, a server-backed library and exactly bound configured instances.

**Architecture:** Reuse ScenarioTemplate validation/canonical hashing and the existing blueprint governance/instance endpoints. The frontend library consumes the authenticated workspace, while legacy browser examples retain their own consent state. Instance snapshots supply generic context views without asserting runtime proof or receipt availability.

**Tech Stack:** Existing JavaScript modules, TypeScript, Node test runner, SQLite, scenario-domain, scenario-governance and context-accounts; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-15-context-library-design.md`

## Global Constraints

- Preserve existing review, activation, allocator, retirement and revocation checks.
- New drafts receive a server-owned namespace/identity; imports receive no inherited approval.
- Updates retain stored namespace/identity and remain owner-only, unsubmitted drafts.
- Keep the existing 32,768-byte request limit and expose useful validation errors.
- Existing browser examples/consents remain saved; no synthetic receipts or runtime authorization.
- Native implementation in the current feature worktree; U1 → U2 → U3 share APIs and execute sequentially.
- User approval covers the full authoring/library/instance flow. Routine implementation choices do not require another approval.

## Review Focus

- A complex imported definition must survive editing without losing its later contexts/actions.
- Stale or forged instance targets must fail before any allocation event is stored.
- Instance definition access must follow existing account/participant filtering.
- Imported names/descriptions must be escaped in cards, dialogs and form values.
- Existing instances without snapshots must remain visible without fabricating a current snapshot.

## Task 1 / U1: General template persistence and bound allocation

**Files:** Modify `packages/execution-dashboard/src/application.ts` and `src/server.ts`; add `test/context-library.test.ts` and `test/fixtures/context-library.ts`.

**Interfaces:** Existing `createBlueprint(user,input)` and `updateBlueprint(user,id,input)` additionally accept `{template: ScenarioTemplate}`. Existing `createInstance` additionally accepts optional `target: TemplateTarget` and returns/stores `template`, `target`; old callers remain compatible. Server validation errors return HTTP 400 with domain path/code. `workspace` returns snapshots only to existing permitted viewers.

- [ ] Write tests for multi-context template round-trip, owner namespace binding, invalid references/unknown executable properties, update identity mismatch, isolation and signed approved allocation preserving snapshots.
- [ ] Run `node --test packages/execution-dashboard/test/context-library.test.ts`; expect failures for missing full-template input/snapshots.
- [ ] Implement full-definition parsing using `parseScenarioTemplate`, server identity assignment for imports, strict stored target retention for edits, optional exact target recheck before allocation, and immutable snapshots. Preserve simple inputs and old instances.
- [ ] Run the focused tests plus `npm run dashboard:test` and `npm run dashboard:typecheck`; expect zero failures.
- [ ] Commit the complete backend unit with its named files once green.

## Task 2 / U2: Library, programmable editor and generic instance views

**Files:** Add `web/context-library.js`; modify `web/site.js`, `web/context-ui.js`, `web/context.css`, `web/index.html`, `web/workspace.js`; add `test/context-library-view.test.ts`.

**Interfaces:** Pure render functions `libraryCards(items, {selecting?})`, `templateDefinition(template)`, `instanceCards(instances)`, `instanceDefinition(instance)` return escaped HTML. They consume U1 workspace template/target snapshots. ContextInterface receives optional `onCreateContext()` and `getInstances()` callbacks; the app supplies them. New context selection uses the server library; legacy local client remains unchanged.

- [ ] Write renderer tests asserting all contexts/actions, exact version/hash, inactive/nonallocator creation exclusion, markup escaping, participant snapshots and legacy snapshot absence. Strengthen workflow search to include all contexts/actions.
- [ ] Run `node --test packages/execution-dashboard/test/context-library-view.test.ts packages/execution-dashboard/test/workspace.test.ts`; expect missing-renderer/search behavior failures.
- [ ] Add primary Context library navigation and a selectable library dialog, retain policy aliases, expose simple creation plus full JSON definition editor/import, and send canonical full-template input on edits. Complex definitions always use the lossless editor.
- [ ] Add instance creation target binding, generic persisted context cards/detail view and callback-driven New context. Display all definition fields needed for review; no permission controls for unintegrated runtime instances.
- [ ] Run dashboard tests/typecheck, root typecheck, and `node --check` for changed JavaScript files; expect zero failures. Check keyboard/modal behavior and narrow layout in U3.

## Task 3 / U3: HTTP, browser and regression acceptance

**Files:** Extend `test/context-library.test.ts`; update `packages/execution-dashboard/README.md`; add `docs/evidence/M11/context-library-20261115.md`.

**Interfaces:** Reuse U1 API and U2 UI. No new runtime authorization endpoint.

- [ ] Add HTTP assertions for useful domain validation errors and authenticated/CSRF template persistence; observe failing behavior before any required correction.
- [ ] Run `npm run dashboard:test`, `npm run dashboard:typecheck`, `npm run typecheck`, `npm run test:scenario-domain`, `npm run test:scenario-governance`, `npm run docs:check` and changed JavaScript syntax checks; expect zero failures.
- [ ] Use a temporary local database and real browser to create a non-example template, inspect library and error paths, edit multi-context JSON losslessly, exercise account isolation and independent signed review/activation/allocation with synthetic accounts, reload the persisted context and inspect mobile layout.
- [ ] Document results and the still-open native/runtime boundaries. Perform final simplification and an independent whole-change code review; fix retained correctness findings with failing regression evidence.
- [ ] Commit only owned files; no push, deployment, cloud resource changes, proof activation or native M9 completion claim.

## 中文翻译

```text
# 可编程 Context 库实施计划

目标：以可复用模板编写、服务器模板库和精确绑定的配置化实例，替换固定 profile 的 context 创建。
架构：复用 ScenarioTemplate 验证／规范哈希及现有 blueprint 治理／实例端点。模板库读取已认证工作区，旧浏览器示例保留自己的同意状态。实例快照提供通用 context 展示，不声称运行时证明或收据已经可用。
技术：保持现有 JavaScript、TypeScript、Node 测试、SQLite 和领域包，不新增依赖。
设计：docs/superpowers/specs/2026-11-15-context-library-design.md。

约束：保留审核、激活、allocator、退役和撤销检查；导入创建服务器命名空间内的新草稿，不继承批准；更新只允许所有者编辑未提交草稿并保留标识；保持 32,768 字节请求上限；保留旧示例及同意，不伪造收据或运行时授权。本地按 U1→U2→U3 顺序实施，用户已批准完整范围，常规实现选择不重复申请批准。

审查重点：复杂定义编辑不丢失后续 context／动作；旧或伪造目标在保存分配前拒绝；快照读取按账户隔离；导入文本全部转义；缺少快照的旧实例仍可见，不伪造当前定义。

U1：修改 application.ts、server.ts，新增 context-library.test.ts 及测试夹具。现有模板创建／更新额外接受完整 template；实例创建接受可选精确 target，并保存 template／target 快照，兼容旧调用。先写多 context 往返、命名空间绑定、无效引用／可执行字段、更新标识、账户隔离及独立签名审批后快照测试；运行观察缺失行为失败；再复用领域解析器实现，并执行聚焦及仪表板测试／类型检查，通过后按文件提交。

U2：新增纯 HTML 渲染模块 context-library.js，修改 site.js、context-ui.js、context.css、index.html、workspace.js，新增视图测试。接口为 libraryCards、templateDefinition、instanceCards、instanceDefinition；ContextInterface 注入创建回调和实例读取回调。先验证全部 context／动作、精确版本／哈希、创建资格、转义、快照及旧实例显示，并扩展搜索全部 context／动作；观察缺失行为失败后实现主要模板库导航、模板选择弹窗、简单创建及完整 JSON 定义编辑／导入。复杂模板始终使用无损编辑器。创建实例绑定 target，显示持久化通用 context 卡片／详情，不提供未接入的运行时权限控件。执行仪表板／根类型检查及 JavaScript 语法检查。

U3：增加 HTTP 验证错误及认证／CSRF 保存测试，先观察需要修正的行为失败。运行仪表板测试／类型检查、根类型检查、scenario-domain／scenario-governance 测试、文档和语法检查。使用临时本地数据库及真实浏览器，以合成账户完成非示例模板创建、错误、复杂定义无损编辑、账户隔离、独立签名审核／激活／分配、刷新及窄屏验证。更新 README 和 M11 证据，保留原生／运行时关卡；完成简化及独立代码审查，对实际正确性问题先写失败回归再修复。只提交所属文件，不推送、部署、改云资源、激活证明模块或宣称 M9 完成。
```
