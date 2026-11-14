# Reusable Business Predicates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for chained units. Independent units may use the active ce-work parallel strategy. No worker commits or shared generated-file writes.

**Goal:** Implement reusable business evidence checks in the Midnight authorization contracts, then resume the generated scenario packs' local acceptance within the actual activation-approval boundary.

**Architecture:** Strict template schema 2 data configures bounded reusable predicates. A separately versioned authorization implementation binds those predicates to signed action evidence and retains public DecisionReceipt v1. Existing contract v10 and template schema 1 retain their identities.

**Tech Stack:** TypeScript, Compact compiler 0.31.1/runtime 0.16.0, Midnight JS 4.1.1, local node 1.0.0/indexer 4.3.3/proof server 8.1.0, existing receipt gateway and Solidity execution registry.

**Spec:** `docs/superpowers/specs/2026-11-15-runtime-business-predicates-design.md`

## Global Constraints

- No new participant names or domain branching in shared modules.
- Preserve public DecisionReceipt v1; use new exact module/configuration versions.
- Never edit compiler-managed output by hand.
- Preserve the unrelated dirty milestone Markdown/HTML files.
- No public-network submissions, resource upgrades, RAM-grant expansion or toolchain upgrade. Use the existing authorized build instance only for public-source key generation when the local profile cannot build the exact program; preserve its existing resource envelope and lifecycle controls.
- New-family activation requires actual independent human review and protocol-governance approval. Implement/test first; report the exact remaining gate if approval is unavailable.

## Review Focus

- A valid signature over another selected record must not satisfy this action's predicate.
- Equality at a numeric ceiling passes; one above, a different unit, or an out-of-range integer fails.
- Revocation or authority-root changes after preparation must still deny final execution.
- An audit acknowledgment for another intent/input set must not authorize this action.
- Schema-1 hashes and contract-v10 program identities must not silently change.

### U1: Versioned data-only predicate declarations

**Files:** `packages/scenario-domain/src/model.ts`, `validation.ts`, domain tests.
**Interfaces:** Export `BusinessPredicate` with kinds `current-record-v1`, `bounded-value-v1`, `audit-acknowledgment-v1`; fields `inputRecordType`, `outputClaimType`, and `ceilingRecordType` only for bounded values. `ProofProfile.predicates?`; `ScenarioTemplate.schemaVersion` accepts 1 or 2.
**Dependencies:** none.

- [x] Add failing parser tests for valid schema 2, schema-1 rejection of new fields, unknown fields/kinds, empty/oversized lists, cross-action type references, duplicate outputs and incomplete output coverage.
- [x] Implement strict parsing, canonical field retention and per-action reference checks. Schema 1 keeps its exact historical representation.
- [x] Run `npm run test:scenario-domain`; record observed red and green before integration.

### U2: Compiled reusable record predicates

**Files:** new `packages/midnight-authorization/contracts/runtime-business-predicates.compact`, generated test harness, `test/business-predicates.test.ts`, test fixtures.
**Interfaces:** `RuntimeBusinessRecord`, `RuntimeBusinessPredicate`, `RuntimeBusinessPredicateContext`; domain-separated record and derived-claim commitments; `verifyRuntimeBusinessPredicate` verifies exact selected evidence, current signed records and a fixed predicate kind.
**Dependencies:** U1's agreed wire design, no U1 source import; safe to author independently.

- [x] Add failing tests for absent compiled support, then valid current records and all record/signature/scope/time substitutions.
- [x] Implement the fixed three predicate kinds using existing namespace/instance issuer roots and root-capability status, with eight-item selected-value vectors and exact command hash-chain binding.
- [x] Prove equality/above-ceiling, mixed units, altered records/output claims, missing/mismatched audit acknowledgment and revoked authorization failures through generated Compact evaluation.
- [x] Compile with pinned compiler; record the generated-program inventory and focused tests.

### U3: Bind predicates to authorization execution

**Files:** authorization policy/execution Compact sources, separately generated v11 assets, predicate SDK policy/witness/signing helpers and tests.
**Interfaces:** policy v4 commits the exact base projection plus ordered predicate root/count; new `private-state-transition-predicates` family; ordered command-bound predicate progress required by final execution. Existing v10 exports remain separate.
**Dependencies:** U1, U2.

- [x] First demonstrate missing/skipped predicate and substituted configuration cannot produce a receipt in new-profile generated-contract tests.
- [x] Wire policy projection, exact governed bindings, preparation and final checks. Freshness/revocation must be rechecked at final action time; preparation has no authorization side effects.
- [x] Keep old schema/receipt/program compatibility tests green and run the complete authorization suite.

### U4: Generate live private witnesses

**Files:** scenario-pack templates, model, fixtures/live adapter, pack tests, integration runner.
**Interfaces:** explicit seed plus recorded Unix-second live anchor produces generated records, signed predicate witnesses and exact new bindings; deterministic fixture APIs remain reproducible.
**Dependencies:** U3.

- [x] Add failing tests for future/millisecond fixture misuse, signature/body mismatch, missing predicate coverage and missing audit storage acknowledgment.
- [x] Publish new template/pack major versions; generate qualification/shift records, mandate/request values and scoped audit acknowledgment without literal branches in shared code.
- [x] Verify all seed/flow positive and negative vectors and scan public artifacts for private values.

### U5: Proving and local acceptance evidence

**Files:** reproducible build/integration commands and `docs/evidence/M9/` reports.
**Dependencies:** U3, U4; actual activation approval additionally gates live activation.

- [x] Measure and build exact new proving keys within the existing resource profile; verify hashes before requesting proofs. Preserve old assets.
- [x] Run typecheck, full local checks, focused adversarial review and protocol-upgrade artifact verification.
- [x] If the required human/protocol approvals are absent, prepare the complete review packet and stop before activation; report native acceptance as OPEN.
- [ ] Resolve the measured eleven-entry constructor weight blocker under a separately approved architecture; repeat actual cost/headroom and exact balanced validation. Evidence: `docs/evidence/M9/business-predicates-extension-20261115.md`.
- [ ] Once the activation boundary is satisfied, generate one fresh local authorization receipt per pack, use unchanged gateway transport and deployed execution registry, verify indexing/recovery/replay, and privacy-scan the actual captures. Never replace this evidence with historical receipts.

## 中文译文

```text
目标：在 Midnight 授权合约中实现通用业务证据检查，然后在实际激活审批边界内继续生成场景包的本地验收。
架构：模板模式 2 用严格数据配置有限谓词；单独版本化的授权实现将谓词绑定到签名操作证据，
保留公开 DecisionReceipt v1、旧合约 v10 和旧模式 1 的身份。
技术栈沿用既有 TypeScript、Compact 0.31.1/runtime 0.16.0、Midnight JS 4.1.1、本地节点及执行栈。
约束：共享模块不得出现领域分支；不手改生成产物；保留无关文档更改；不执行公网交易、
本地配置无法构建精确程序时，仅按既有授权使用指定构建实例生成公开源码密钥，保留原资源边界和生命周期控制；
不扩大云资源或 RAM 授权、不升级工具链。新家族激活须实际人工审查与协议治理批准。
审查重点：同类型证据替换、数值边界与单位、准备后的撤销／根变更、审计确认替换、旧身份兼容性。

U1：在场景领域模型、验证器和测试中加入版本化、仅数据的谓词声明。
固定三种操作和精确字段；模式 1 拒绝新增字段，模式 2 验证数量、引用、唯一输出和完整覆盖。
先记录失败，再实现，运行领域测试。该单元无源码依赖。

U2：新增通用业务谓词 Compact 源码、生成的测试程序和测试。
定义记录、谓词和上下文，分域承诺，以及验证精确已选证据、当前签名记录和固定谓词的入口。
使用既有权限根、实例签发方根、根能力状态、八项值向量及精确命令哈希链。
以真实生成电路验证有效记录、所有签名／范围／时间替换、上限等值／超额、单位不符、
输出替换、缺失或错配审计确认、撤销失败。此单元与 U1 按已约定接口独立编写。

U3：将谓词绑定到授权执行，依赖 U1 和 U2。
策略 v4 承诺原投影与有序谓词根／数量；新增独立家族和命令绑定进度，最终执行必须完成全部谓词。
先证明缺失／跳过谓词或配置替换无法签发回执，再接入投影、精确治理绑定、准备和最终检查。
最终阶段重检时效和撤销；准备不产生授权副作用。保留旧模式、回执、程序身份和全部授权测试。

U4：生成真实运行私有见证，依赖 U3。
以显式种子和记录的 Unix 秒时间锚点生成记录、签名见证及新绑定，保留既有确定性夹具。
先测试时间单位误用、签名／正文不一致、谓词覆盖缺失及审计存储确认缺失。
发布新包／模板主版本，生成资质／班次、委托／请求数值及限定审计确认。
执行全部种子／流程正负向用例并扫描公开产物。

U5：证明与本地验收证据，依赖 U3 和 U4；真实激活另依赖实际批准。
已完成：在现有资源配置内测量并构建精确新证明密钥，请求证明前核验哈希，并保留旧资产。
已完成：类型检查、完整本地检查、聚焦对抗审查及协议升级产物核验。
已完成：缺少所需人工／协议批准时准备完整审查包，停在激活之前；原生验收保持 OPEN。
待完成：按单独批准的架构解决实测十一个入口的构造函数权重阻碍；实际估计调度权重为
1,309,760,000,001，高于节点上限 1,299,891,843,000，超出 9,868,157,001；
重新测量实际成本／余量，并验证精确的已平衡候选交易。证据：
`docs/evidence/M9/business-predicates-extension-20261115.md`。
待完成：满足激活边界后，每个场景包生成一份全新本地授权收据，使用不变的网关传输及
已部署执行注册表，验证索引／恢复／重放，并扫描真实捕获中的私有材料。不得用历史收据替代。
```
