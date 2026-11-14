# Activation lifecycle v12: implementation and deployment preflight

Date: 2026-11-15, Asia/Shanghai. The user approved a separately versioned entry
combining activation begin/finalize while preserving branch checks and separate
binding staging. The preceding eleven-entry v11 candidate exceeded the node's
weight limit. This report records the approved change and its measured result;
it does not establish deployment, activation or native M9 acceptance.

This continues the [business-predicate extension evidence](business-predicates-extension-20261115.md)
under the [approved v12 design](../../superpowers/specs/2026-11-15-activation-lifecycle-dispatch-design.md).

Implementation commit: `2cbb85192cd7afb01caa92d9f66a51aa22a6cfa8`, based on
`5ffa0109760d7f6e6f1cc4f9cda1780148eacea8`. This report and its artifact inventory
are recorded separately from that source commit.

## Implemented boundary

`permio-authorization-v12.compact` exports one `manageM4Activation` proof entry:
selector 1 begins staging and selector 2 finalizes it. Every other selector is
rejected before session access. The original begin/finalize bodies are private
helpers with their statements and ordering preserved. Begin verifies authority
before replacing stale staging. Finalize cleans expired/stale staging and returns
`activated:false` before authority verification. Binding staging remains separate.

Explicit v12 circuit and connected-call adapters retain the logical begin registry
key, finalize result, transaction metadata and optional logical-operation scope.
They do not migrate checkpoints or reinterpret another deployment's ABI. The
explicit v12 receipt reader uses its measured ledger layout and unchanged public
DecisionReceipt v1. Both action preparations, business predicates, policy v4 and
atomic state/nullifier/receipt execution remain unchanged.

Pinned Compact 0.31.1/runtime 0.16.0 produced ten proof programs. The other nine
programs are byte-identical to v11; their ledger metadata structures are also
identical. All source/program hashes recorded by the preceding v11 evidence
remain unchanged. v10/v11 assets and public evidence are preserved.

## Genuine key inventory

All ten genuine pairs passed the actual SDK integrity verifier. Nine pairs were
reused only after the complete v11 inventory and exact compiled bytes were
verified. NTFS hardlinks avoid duplicating approximately 2 GB on the nearly full
local volume. These shared files are treated as immutable, never overwritten;
future builds must use a separate empty asset destination. Hardlinks are shared
storage, not an independently enforced write-protection mechanism.

The new `manageM4Activation` program measured **k=17, 69,079 rows**. Its genuine
key build completed locally in 62.365 seconds under the existing 5 GiB soft /
6 GiB hard / 8 GiB maximum swap and k<=20 profile. The measured memory peak was
1,354,317,824 bytes, with zero sampled swap use and zero observed OOM/OOM-kill
counters. The owned job is inactive with MainPID 0 and Result success. No swap
file or cloud job was created, and the existing WSL swap configuration remains.

The first attempt measured the same program but exited because the transient
service lacked `HOME`, `XDG_CACHE_HOME` and `MIDNIGHT_PP`. Its failure log is
preserved. An explicit retry supplied the existing `XDG_CACHE_HOME=/root/.cache`
and kept the same program, compiler and limits; no dependency/toolchain upgrade
or automatic compiler retry occurred. A sandbox hardlink denial was resolved
through normal filesystem approval, without changing file contents or profiles.

The new prover is 42,713,224 bytes, SHA-256
`0c655c548353c8569641dec6ca58551fbd8ba398979e6b2777ffe5c7dde2a711`.
The complete manifest SHA-256 is
`30468dac3d151a79941ac589680b709b76eb64d1a55827f29580256e9053d97e`;
total prover material is 2,150,176,656 bytes. Exact verifier/binary/program hashes,
source identities and resource observations are in the accompanying
[artifact inventory](activation-lifecycle-v12-artifacts-20261115.json).
Hash integrity does not supply human or governance approval.

## Actual node measurement

The read-only constructor CLI used all ten genuine verifiers, the actual v12
constructor, local node `1.0.0-8af7d08a`, and pinned genesis
`0xe72f7a21a0397844563b4206f887b779ffa0d937c2d1b2339441faa1f08b9846`.
At **2026-11-15 04:50:04 Asia/Shanghai**, it measured:

| Observation | Reference-time units |
| --- | ---: |
| Ledger cost | 1,190,880,000,001 |
| Node overhead | 20,000,000,000 |
| Estimated dispatch weight | 1,210,880,000,001 |
| Normal maximum extrinsic weight | 1,299,891,843,000 |
| Reduction from v11 | 98,880,000,000 |
| Historical balancing reserve | 18,000,000,000 |

Unbalanced headroom is 6.84%; reserve-adjusted headroom is **5.46%**, above the
unchanged 5% requirement. `weightWithinLimit` and `practicalHeadroomPassed` are
true. This resolves the measured v11 constructor-preflight blocker under the
approved architecture. The reserve is a historical assumption, not a measured
v12 wallet-balancing result. Exact balanced-byte validation remains mandatory.

The 25,154-byte candidate SHA-256 is
`2b3e842850b6a0676d8789056e8230deb358815185c57586d9fa6afb89c618a9`.
Only synthetic public constructor arguments were used. No wallet was initialized,
no application proof was requested, no signing/balancing/transaction validation
or submission occurred, and no template or proof family was activated. Candidate
bytes and the ephemeral maintenance key were not logged. The CLI's full SDK
asset verification and dependency loading through WSL took several minutes;
process counters showed active reads rather than a stalled node submission.

The fixed-target commands are:

```sh
# Compile only into a new empty v12 asset destination; existing keys are protected.
node scripts/compile-business-compact.mjs --skip-zk --v12
# After exact key reuse/build and complete SDK integrity verification:
node --experimental-strip-types scripts/check-business-deployment-cost.ts --check --v12
```

The local owned build command, resource controller, first failure and explicit
retry are retained in `logs/build-activation-v12-key.mjs`,
`logs/activation-v12-key-build/` and `logs/activation-v12-key-build-retry1/`.
`logs/assemble-activation-v12-assets.mjs` records the exclusive hardlink and
complete-manifest procedure. These are local operational evidence; the public
inventory preserves their hashes and exact resulting assets. Prover/key files
remain ignored and are not included in commits.

## Regression and review evidence

The complete repository `npm test` exited 0: **705 Node-runner cases, 704 passed,
zero failures, one Windows-only POSIX skip**, plus **44 Solidity tests passed**.
The unchanged POSIX audit-store test passed in the prior dedicated WSL run;
this continuation did not modify its implementation. Fresh type checking,
documentation checks and the Solidity build exited 0. The sandbox's Hardhat
discovery restriction was resolved with normal filesystem access; no dependency
installation or source workaround was introduced. Full log:
`logs/activation-v12-full-test.log`. No lint command is configured.

The initial generated-entry assertion failed before implementation. SDK adapter,
fixed-target build, v12 profile/inventory routing and explicit receipt-reader
tests likewise failed for their missing behavior before implementation. The
existing incomplete-asset guard was also exercised unchanged for v12.

Generated-circuit regressions cover inert begin, separate canonical binding
staging, successful single finalization, incomplete/duplicate binding rejection,
nonce replay, validly re-signed envelope substitution, invalid live signatures,
invalid selectors with exact encoded-state preservation, stale-session replacement
and nonce release, and branch-specific stale/expired cleanup. An actual generated
v12 action prepares all three predicate kinds, creates DecisionReceipt v1 and
passes exact insertion checks; missing, duplicated and substituted insertions
are rejected. These tests use explicitly synthetic genesis, not human approval,
native proof generation, chain finality or live indexing.

Five simplification lenses completed with zero net edits. The deliberate
branch-order comment was retained to preserve frozen source provenance. Full
review run `20261115-045545-61cfb275` completed all eight lenses with zero
actionable findings. It reviewed the exact 21 implementation/design/test files,
with raw LF `git -U10` diff SHA-256
`153870d3ae5c45966810a26a05e2d46df7b868376a388aa901afa51501c4c217`.
The completed review receipt SHA-256 is
`be32ca08bb9d58efbd89968bf3218b1e1b3d90bd482fed2631a481cc215064be`.
Only the Codex CLI was installed, so the sanctioned independent local adversarial
review covered that lens; no different-provider review occurred. This separately
authored public report was excluded from the frozen source review.

Two coverage limits remain: no successful `readReceiptAtTransaction` test through
the new v12 reader factory, and no native transaction-proving latency or peak
memory measurements for either dispatcher branch. The generated v12 ledger and
insertion checks are tested separately. Key-generation measurements do not
measure transaction proving. Neither limit established an implementation defect.

## Remaining acceptance gates

1. Independent **human** security/privacy review and high-threshold protocol
   governance approval for the new predicate family and exact deployment/source
   artifacts. Agent review is not human review. See
   [Decision 3](../M6/architecture-decision.md) and
   [section 5.8](../../PROGRAMMABLE_CONTEXT_ARCHITECTURE.md).
2. Under the authorized deployment workflow, balance the exact candidate and
   require successful read-only validation plus at least 5% actual headroom
   before submission; retain exact network/deployment/implementation bindings.
3. Complete separate activation/revocation gates, then generate fresh native
   receipts for all three M9 packs and verify gateway, registry, indexing,
   recovery/replay and privacy using actual captures.

Compilation, key generation and application checks used local Windows/WSL
resources; cloud calls only inspected existing lifecycle state. At **2026-11-15
05:14:08 Asia/Shanghai**, the official CLI independently verified the instance
`Running`, no active cloud-task owners, an empty automatic-deletion deadline and
the exact one-time stop template in `Waiting`. The prior ECS build task remains
finished; its pending graceful `StopCharging` stop is **2026-11-15 06:04:07
Asia/Shanghai**, execution `exec-82378c77946144aaa1a8`, with instance and disks
preserved. No renewal or cloud-resource mutation occurred in this continuation.
Native M9 acceptance remains **OPEN**.

## 中文翻译

```text
# 激活生命周期 v12：实现与部署预检

日期：2026-11-15，Asia/Shanghai。用户已批准以单独版本化的入口合并激活 begin/finalize，保留分支检查及独立绑定暂存。此前含十一个入口的 v11 候选超过节点权重上限。本报告记录已批准的变更及实测结果，不证明已经部署、激活或完成 M9 原生验收。

本报告沿用业务谓词扩展证据 business-predicates-extension-20261115.md，并执行已批准的 v12 设计 ../../superpowers/specs/2026-11-15-activation-lifecycle-dispatch-design.md。

实现提交为 2cbb85192cd7afb01caa92d9f66a51aa22a6cfa8，基于 5ffa0109760d7f6e6f1cc4f9cda1780148eacea8。本报告及产物清单与源码提交分开记录。

## 已实现的边界

permio-authorization-v12.compact 导出单个 manageM4Activation 证明入口：选择值 1 开始暂存，2 完成激活。其他值均在访问会话前拒绝。原 begin/finalize 函数体变为私有辅助函数，语句及顺序保持。begin 先验证权限，再替换失效暂存；finalize 先清理过期／失效暂存并返回 activated:false，然后才验证权限。绑定暂存保持独立。

明确的 v12 电路及已连接调用适配器保留逻辑 begin 注册表键、finalize 结果、交易元数据及可选逻辑操作作用域。不迁移检查点，也不重新解释其他部署的 ABI。明确的 v12 收据读取器使用实测账本布局及不变的公开 DecisionReceipt v1。两个动作准备入口、业务谓词、策略 v4，以及状态／nullifier／收据的原子执行均保持不变。

固定的 Compact 0.31.1／运行时 0.16.0 生成十个证明程序。其余九个程序与 v11 字节完全相同，账本元数据结构也一致。此前 v11 证据记录的全部源码／程序哈希保持不变。v10/v11 资产及公开证据均已保留。

## 真实密钥清单

全部十对真实密钥通过了实际 SDK 完整性验证。仅在完整 v11 清单及编译字节精确验证之后，才复用九对密钥。NTFS 硬链接避免在接近满载的本地卷上再复制约 2 GB。这些共享文件按不可变资产使用，绝不覆盖；未来构建必须使用另一个空资产目录。硬链接属于共享存储，并非独立强制执行的写保护机制。

新 manageM4Activation 程序实测为 k=17、69,079 行。真实密钥在本地用时 62.365 秒完成，保持现有 5 GiB 软限制／6 GiB 硬限制／8 GiB 最大交换限制及 k<=20 配置。实测内存峰值为 1,354,317,824 字节，采样交换使用为零，观察到的 OOM／OOM-kill 计数均为零。本任务作业已停止，MainPID 为 0、Result 为 success。没有新建交换文件或云任务，现有 WSL 交换配置保持。

首次尝试测量了同一程序，但因临时服务缺少 HOME、XDG_CACHE_HOME 和 MIDNIGHT_PP 而退出，失败日志予以保留。显式重试提供现有 XDG_CACHE_HOME=/root/.cache，保持相同程序、编译器及资源限制；没有升级依赖／工具链，也没有自动重试编译。沙箱对硬链接的拒绝通过正常文件系统授权解决，文件内容及配置未改变。

新证明密钥为 42,713,224 字节，SHA-256 为 0c655c548353c8569641dec6ca58551fbd8ba398979e6b2777ffe5c7dde2a711。完整清单 SHA-256 为 30468dac3d151a79941ac589680b709b76eb64d1a55827f29580256e9053d97e；证明密钥材料总计 2,150,176,656 字节。精确验证密钥／二进制程序／程序哈希、源码标识及资源观察记录于配套产物清单。哈希完整性不等于人工或治理批准。

## 实际节点测量

只读构造 CLI 使用全部十个真实验证密钥、实际 v12 构造函数、本地节点 1.0.0-8af7d08a，以及固定创世哈希 0xe72f7a21a0397844563b4206f887b779ffa0d937c2d1b2339441faa1f08b9846。于上海时间 2026-11-15 04:50:04 测得：

账本成本：1,190,880,000,001 参考时间单位。
节点开销：20,000,000,000。
估计调度权重：1,210,880,000,001。
普通单笔外部交易最大权重：1,299,891,843,000。
相较 v11 减少：98,880,000,000。
历史平衡预留：18,000,000,000。

未平衡余量为 6.84%；计入预留后的余量为 5.46%，高于未变的 5% 要求。weightWithinLimit 和 practicalHeadroomPassed 均为 true。这解决了已批准架构下实测 v11 构造预检阻碍。预留是历史假设，并非实测 v12 钱包平衡结果。精确平衡字节验证仍是必需关卡。

25,154 字节候选交易的 SHA-256 为 2b3e842850b6a0676d8789056e8230deb358815185c57586d9fa6afb89c618a9。只使用合成公开构造参数。没有初始化钱包、请求应用证明、签名、平衡、验证／提交交易，也没有激活模板或证明家族。候选字节及临时维护密钥未写入日志。CLI 通过 WSL 完成全量 SDK 资产验证及依赖加载耗时数分钟；进程计数器显示读取仍在进行，而非节点提交停滞。

固定目标命令见上方可直接使用的命令块：仅在新的空 v12 资产目录编译，现有密钥受到保护；精确复用／构建密钥并完成 SDK 验证后，再执行 --check --v12 构造测量。命令不另行翻译。本地任务构建命令、资源控制器、首次失败及显式重试保存在 logs/build-activation-v12-key.mjs、logs/activation-v12-key-build/、logs/activation-v12-key-build-retry1/。logs/assemble-activation-v12-assets.mjs 记录排他硬链接及完整清单流程。这些属于本地操作证据；公开清单保留其哈希及精确结果资产。证明密钥／密钥文件保持忽略，不进入提交。

## 回归及审查证据

全仓 npm test 已以退出码 0 完成：705 项 Node 测试，704 项通过，零失败，1 项仅在 Windows 上跳过的 POSIX 测试；另有 44 项 Solidity 测试通过。未变化的 POSIX 审计存储测试此前已在专门 WSL 测试中通过，本次继续工作未修改其实现。新的类型检查、文档检查及 Solidity 构建均退出 0。沙箱的 Hardhat 定位限制通过正常文件系统访问解决，没有安装依赖或绕过源码。完整日志为 logs/activation-v12-full-test.log。项目未配置 lint 命令。

初始生成入口断言在实现前失败。SDK 适配器、固定目标构建、v12 配置／清单路由及明确收据读取器测试也先因行为尚未实现而失败。现有不完整资产保护也对 v12 按原行为执行了测试。

生成电路回归覆盖：无权限效果的 begin、独立规范绑定暂存、成功且仅一次的最终激活、绑定不完整／重复拒绝、随机数重放、有效重新签名的信封替换、当前会话签名无效、无效选择值及精确编码状态保留、失效会话替换及随机数释放，以及各分支的失效／过期清理。实际生成的 v12 动作准备全部三种谓词，产生 DecisionReceipt v1，并通过精确插入检查；缺失、重复及替换插入均被拒绝。这些测试使用明确标注的合成创世状态，不代表人工批准、原生证明生成、链上最终性或真实索引。

五个简化审查视角均完成，最终无代码变更。保留了说明有意维护分支顺序的注释，以维持冻结源码溯源。完整审查 20261115-045545-61cfb275 已完成全部八个视角，未发现需要处理的问题。审查针对精确的 21 个实现／设计／测试文件，原始 LF 格式 git -U10 差异的 SHA-256 为 153870d3ae5c45966810a26a05e2d46df7b868376a388aa901afa51501c4c217；完整审查凭据的 SHA-256 为 be32ca08bb9d58efbd89968bf3218b1e1b3d90bd482fed2631a481cc215064be。由于仅安装了 Codex CLI，使用技能允许的独立本地对抗审查补足该视角，没有进行其他提供商的审查。本次单独编写的公开报告不属于冻结源码审查范围。

仍有两处覆盖限制：新 v12 读取器工厂缺少成功调用 readReceiptAtTransaction 的测试；两个分派分支均尚未测量原生交易证明耗时或内存峰值。生成的 v12 账本和插入检查分别已有测试。密钥生成测量不代表交易证明性能。这两处限制均未证明存在实现缺陷。

## 剩余验收关卡

1. 针对新谓词家族及精确部署／源码产物，完成独立人工安全／隐私审查及高阈值协议治理批准。代理审查不是人工审查。见 ../M6/architecture-decision.md 的决定 3，以及 ../../PROGRAMMABLE_CONTEXT_ARCHITECTURE.md 第 5.8 节。
2. 在已授权部署流程中平衡精确候选交易，提交前要求只读验证成功，且实际余量至少为 5%；保留精确网络／部署／实现绑定。
3. 完成独立激活／撤销关卡后，为全部三个 M9 场景包生成全新原生收据，并用实际捕获验证网关、注册表、索引、恢复／重放及隐私。

编译、密钥生成及应用检查使用本地 Windows／WSL 资源；云端调用仅检查已有生命周期状态。上海时间 2026-11-15 05:14:08，官方 CLI 独立确认实例为 Running、没有活跃云任务所有者、自动删除期限为空，精确的一次性停机模板处于 Waiting。此前 ECS 构建任务仍为完成状态；计划于上海时间 2026-11-15 06:04:07 以优雅 StopCharging 模式经济停机，执行 ID 为 exec-82378c77946144aaa1a8，实例及磁盘保留。本次继续工作没有续期或修改云资源。M9 原生验收仍为 OPEN。
```
