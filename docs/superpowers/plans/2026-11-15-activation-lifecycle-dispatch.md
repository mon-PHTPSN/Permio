# Activation Lifecycle Dispatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Reduce the authorization constructor to ten provable entries while preserving activation semantics.

**Architecture:** Separately versioned v12 delegates one fixed operation selector to the existing private begin/finalize bodies. Binding staging and all action circuits stay separate. Native inline execution follows the dependent units below.

**Tech Stack:** Compact 0.31.1, runtime 0.16.0, zkir 2.1.0, existing WSL Node 22.23.2 and Windows Node 24.13.1.

**Spec:** `docs/superpowers/specs/2026-11-15-activation-lifecycle-dispatch-design.md`

## Global Constraints

- Preserve v10/v11 source, assets, keys and evidence; DecisionReceipt v1 and policy v4 stay unchanged.
- Preserve branch-specific authority/cleanup ordering; stage binding separately.
- Keep the existing bounded build limits. Reuse requires exact compiled bytes and verified genuine keys.
- No deployment, activation or human/protocol approval is implied.
- Exclude pre-existing edits in `docs/DETERMINISTIC_MILESTONES.md` and `docs/deterministic-milestones.html`.

## Review Focus

- Invalid selectors must fail before any session cleanup.
- Invalid begin authority must not clean a stale session.
- Finalize must clean stale/expired sessions even with invalid authority inputs.
- Incomplete bindings, changed envelope/root/registry and replay cannot activate.
- SDK projections preserve logical results and transaction metadata; receipt decoding uses the actual v12 layout.

### U1. Preserve activation behavior through one proof entry

**Files:** new `contracts/permio-authorization-v12.compact` and its generated managed tree under `packages/midnight-authorization/`; new `test/activation-lifecycle.test.ts` and test fixture.
**Dependencies:** approved design; no other implementation unit.
**Interface:** `manageM4Activation(operation, envelope, signature, activator, authorityPath): FinalizationResult`, operation 1 begin, 2 finalize.

- [ ] Add a test that the generated entry exists and rejects selector 0 before mutation; run and observe its assertion fail before implementation.
- [ ] Copy v11 source to v12, make begin/finalize private and add the fixed dispatcher with unchanged branch bodies. Compile metadata in the existing WSL environment.
- [ ] Exercise real generated circuits: begin/stage/finalize, incomplete binding rejection, nonce replay, signed envelope substitution, stale root/registry, expired cleanup, bad begin authority and invalid selectors. Check state/counters/reservations and no receipt/nullifier effects.
- [ ] Compare all remaining nine compiled proof programs and ledger layout with v11; do not assume reuse. Run focused regressions and type checking; commit named files only.

### U2. Provide explicit v12 SDK and reproducible tooling

**Files:** `src/activation-lifecycle.ts`, `src/compiled-assets.ts`, `src/index.ts`, explicit receipt reader if actual layout requires it; `scripts/compile-business-compact.mjs`, `scripts/check-business-deployment-cost.ts` and their focused tests.
**Dependencies:** U1 contract interface.
**Interface:** explicit v12 circuit and connected-call adapters; version-specific asset verification and `--v12` compile/cost target, keeping v11 default behavior.

- [ ] Write failing tests for v12 target planning, required complete ten-entry genuine assets, SDK logical begin/finalize return projection and unchanged metadata.
- [ ] Add typed adapters that route selectors 1/2 and project the begin registry key; preserve optional logical operation scope for resume/budget tracking. Export explicit v12 contract identity/assets.
- [ ] Extend existing tooling with a fixed v12 target; reject arbitrary target overrides. Verify the actual compiled inventory contains the dispatcher, binding stage and both action preparation circuits, excluding separate exported begin/finalize.
- [ ] Run SDK/tooling tests and the full repository check. Independently review the completed diff before the local named-file commit.

### U3. Verify genuine assets and actual deployment weight

**Files:** ignored build evidence/keys and new public `docs/evidence/M9/` v12 artifact inventory/report.
**Dependencies:** U1, U2.

- [ ] Verify v11 genuine assets and exact nine-program byte identity before copying only reusable assets into the separate v12 destination.
- [ ] Build the new dispatcher key with pinned zkir under existing resource limits. Record measurement, resource peaks, exact hashes and complete ten-entry manifest; run the SDK integrity verifier.
- [ ] Measure the real constructor against the pinned local node; require dispatch weight plus 18,000,000,000 reserve at most 95% of 1,299,891,843,000. Preserve sanitized output and explicitly distinguish estimation from exact balanced validation/submission.
- [ ] Record passing/blocked gates, source revisions, review evidence and private/cloud cleanup. Human/protocol approval and fresh native M9 receipts remain open until actually satisfied. Commit only public report files.

## 中文翻译

```text
# 激活生命周期分发实现计划

执行者须按 executing-plans 技能逐项实现。目标是在保留激活语义的同时，将授权构造函数减少至十个可证明入口。架构为单独版本化的 v12，以固定操作选择值分发到原私有 begin/finalize 函数体；绑定暂存和所有动作电路仍独立。各单元相互依赖，因此在当前会话顺序实现。

技术栈：Compact 0.31.1、运行时 0.16.0、zkir 2.1.0、现有 WSL Node 22.23.2 和 Windows Node 24.13.1。设计见 docs/superpowers/specs/2026-11-15-activation-lifecycle-dispatch-design.md。

全局约束：保留 v10/v11 源码、资产、密钥和证据；DecisionReceipt v1、策略 v4 不变。保留分支权限／清理顺序，绑定暂存独立。保持现有构建资源限制，仅在编译字节完全相同且真实密钥验证通过时复用。此任务不代表部署、激活或人工／协议批准。排除两个已有未提交文档 docs/DETERMINISTIC_MILESTONES.md、docs/deterministic-milestones.html。

审查重点：无效选择值必须先于任何会话清理而失败；begin 权限无效不能清理失效会话；finalize 即使权限输入无效也须清理过期／失效会话；绑定不完整、信封／根／注册表变化和重放不能激活；SDK 保留逻辑结果和交易元数据，收据解码使用实际 v12 布局。

U1：通过单个证明入口保留激活行为。新增 packages/midnight-authorization/contracts/permio-authorization-v12.compact、对应 managed 生成树、test/activation-lifecycle.test.ts 及测试夹具。接口为 manageM4Activation(operation, envelope, signature, activator, authorityPath): FinalizationResult，1 开始，2 完成。先写入口存在且选择值 0 在修改前拒绝的测试，并观察预期断言失败。再复制 v11 至 v12，将 begin/finalize 改为私有，添加固定分发入口，保留分支函数体，使用现有 WSL 环境编译元数据。真实生成电路测试覆盖开始／暂存／完成、绑定不完整、随机数重放、签名信封替换、根／注册表失效、过期清理、begin 权限错误及无效选择值；核查状态、计数器、预留及无收据／nullifier 副作用。比较其余九个证明程序及账本布局与 v11 的字节，不假定可复用。运行聚焦回归和类型检查，仅提交指定文件。

U2：提供明确 v12 SDK 及可复现工具，依赖 U1。新增 src/activation-lifecycle.ts，修改 src/compiled-assets.ts、src/index.ts、必要时的明确收据读取器、scripts/compile-business-compact.mjs、scripts/check-business-deployment-cost.ts 及聚焦测试。提供明确 v12 电路／已连接调用适配器、版本特定资产验证及 --v12 编译／成本目标，v11 默认行为保持。先写失败测试：v12 目标规划、完整十入口真实资产要求、SDK begin/finalize 返回映射及元数据保留。类型化适配器分发选择值 1/2，并将 begin 映射为注册表键；保留用于续跑／预算跟踪的可选逻辑操作作用域，导出明确 v12 合约标识／资产。工具仅增加固定 v12 目标，拒绝任意覆盖。核验编译清单包含分发入口、绑定暂存及两个动作准备入口，不再独立导出 begin/finalize。运行 SDK／工具测试和全仓检查，独立审查完成的差异后本地按文件提交。

U3：验证真实资产及实际部署权重，依赖 U1/U2。写入忽略的构建证据／密钥及公开 docs/evidence/M9/ v12 清单／报告。先验证 v11 真实资产及九个程序精确字节一致，再仅复制可复用资产到独立 v12 目录。使用固定 zkir、现有资源限制构建新分发入口密钥，记录测量、资源峰值、哈希及完整十入口清单，并运行 SDK 完整性验证。查询固定本地节点测量真实构造交易，要求调度权重加 18,000,000,000 预留不超过 1,299,891,843,000 的 95%。保留脱敏结果，明确区分估计与精确平衡验证／提交。记录通过／受阻关卡、源码版本、审查证据及私有／云端清理；人工／协议批准及全新 M9 原生收据仅在真实完成后关闭。只提交公开报告。
```
