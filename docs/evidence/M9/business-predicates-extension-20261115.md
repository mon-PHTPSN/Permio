# Business predicate extension: implementation and acceptance evidence

Date: 2026-11-15, Asia/Shanghai. User decision: extend the shared Midnight
authorization proof modules, then resume the generated scenario packs' native
acceptance. This report does not establish activation or native acceptance.
Implementation commit: `fc20a76` (`feat(authorization): enforce reusable business predicates`).
Preflight/regression commit: `bcd55aa` (`test(authorization): add genuine deployment cost preflight (U5)`).

Status: implementation, regression checks and all eleven genuine key pairs are
verified. Native acceptance is **BLOCKED** by the measured constructor weight
and the separate human/protocol approval gates. No deployment was submitted.

## Implemented behavior

Template schema 2 declares three reusable predicates: a current signed record,
a signed value no greater than a signed ceiling in the same unit, and a detached
audit acknowledgment tied to the exact intent and selected inputs. The separately
versioned authorization contract v11 binds their ordered commitments to policy v4
and the signed action command. Each preparation step is inert; final execution
requires complete predicate and output coverage, the exact root capability and
original issuer, and fresh authority/status/lifecycle/state checks. The final
state update, nullifier consumption and DecisionReceipt v1 remain atomic.

The legacy policy helper rejects schema 2 instead of silently omitting its
predicates. Contract v10 assets and schema-1 identities are preserved. New pack
version 3.0.0 uses the new family explicitly. A private witness adapter accepts a
fresh Unix-second anchor, derives the delegated terminal subject from the session,
and requires private durable audit storage before creating an acknowledgment.
The explicit v11 receipt reader uses its actual compiled ledger paths.

Exact source, generated binding, schema, program and pack/configuration hashes
are in [the artifact inventory](business-predicate-v11-artifacts-20261115.json).
The action implementation hash is the inventory's exact
`executeRuntimeAction.zkir` SHA-256; no deployment address or implementation
reference has been invented. A final key manifest must bind all eleven proof
programs before any proof request. Hash integrity alone is not governance trust.

## Verification observed

- Pinned Compact 0.31.1/runtime 0.16.0 compiled the complete v11 implementation.
- Final repository `npm test` exited 0: 690 Node-runner cases, 689 passed,
  zero failures and one POSIX-only case skipped on Windows, plus 44 passing
  Solidity tests. The skipped case passed in a separate WSL run of all 24
  witness/profile cases with zero failures/skips. Five cloud cleanup failure
  tests and two read-only constructor-preflight tests passed separately. Log:
  `logs/business-full-test-20261115-post-cross-root.log`. The earlier runs
  preceded the final regression/helper additions; the final count supersedes them.
- A later regression showed the legacy helper accepted schema 2 and dropped its
  predicates. The fail-closed guard fixed it; the fresh combined old/new policy
  suite passed 22/22 after that change. The original v10 compatibility CLI
  explicitly rejected all ten current schema-2 pack cases with
  `BLOCKED_UNSUPPORTED_PROOF_REQUIREMENT` (expected exit 1); this is a
  fail-closed compatibility control, not a failure of the explicit v11 path.
- Generated-contract tests exercise all three predicate kinds, all five flows
  across two seeds, ceiling equality/excess/mixed units, altered signed records,
  wrong eligible issuer, revocation, command substitution, ordered preparation,
  incomplete coverage, cleanup, atomic receipt effects, and explicit receipt
  layout/transcript validation. Their genesis/root fixtures are synthetic and
  do not count as human approval, deployment, finality or native acceptance.
- An additional cross-root regression passed: two independently valid signed predicates
  under distinct active capability roots and the same eligible issuer cannot be
  combined. It calls the generated preparation circuit directly and checks that
  sessions, progress, receipt/nullifier counts and instance state remain unchanged.
  The complete action-execution file passed 7/7 after this addition.
- Type checking, documentation checks and the Solidity build exited 0. Existing
  v10 real-key asset integrity verification passed. Staged whitespace checks
  passed. A sandbox-only disposable-Git test failure and Hardhat discovery
  failure passed when rerun with normal authorized filesystem access; no source
  workaround or reduced test gate was introduced.
- Eight-lens independent agent review completed with no retained findings.
  Four original issues were fixed and independently checked: file-sync retry,
  parent-directory durability, uncertain controller launch cleanup, and
  independent VM-setting restoration. File and parent-sync regressions were
  observed failing before their fixes. Review run:
  `20261115-020115-56167a83`; exact saved full-diff SHA-256:
  `23a95031418a42c3ca4797828ed3047f63df335fea207b2432351638e5384f1a`.
  The saved U10/CRLF diff was independently compared with the committed staged
  source after context/line-ending normalization. Verdict: ready to merge the
  implementation only, explicitly excluding human/protocol activation approval.

A separate focused review of the constructor-cost helper and cross-root test
increment completed with no retained findings, run `20261115-032031-6cde7e93`.
Its exact four-file U10/LF diff SHA-256 is
`b398bad03566c9155b208b0107b34d5cb697c2415ed2e3528287b58a4c1083cf`;
the independent combined targeted run passed 9/9. This is agent review only.

Windows tests used the existing Node 24.13.1 environment. Compact compilation,
POSIX regressions and the read-only constructor CLI use the existing pinned
WSL Node 22.23.2 environment. No Node/toolchain version was changed.

The simplification pass retained version-isolated action helpers to preserve
generated-structure error paths, deferred the duplicate bounded-input hash fold
until its proof-cost effect can be measured, and retained the build comment
explaining exclusive-copy ownership before unlink. Named authority constants,
cached policy commitments, a genuine other-eligible-issuer negative test, and
clearer policy-projection naming were applied.

## Key-generation measurements and controlled build route

The existing bounded local profile measured the new preparation circuit at k=20,
565,028 rows, and final execution at k=21, 1,982,062 rows. It deliberately stopped
at its local k=20 threshold before generating keys. There was no OOM event and
no ready key manifest. Exact measurements, applied cgroup limits and compiler
logs are in `logs/business-compact-BLtSgK/`.

The accepted v10 execution baseline was already k=21, 1,949,234 rows, built on
the authorized 16 GiB Singapore instance. The new execution adds 32,828 rows
(about 1.68%); it does not cross a new k class. The local threshold is an
operational profile, not a Midnight protocol limit. See
[the ordinary-action boundary evidence](../M6/ordinary-action-execution-boundary-v1.md)
and [the existing deployment/resource decision](../M6/deployment-weight-architecture-decision-v1.md).

Only `governAuthorization` and `stageM4ActivationBinding` are byte-identical to
v10. The other nine programs require genuine new keys. The authorized build
instance `i-t4ni11rkjyzgi0vlb68d`, region `ap-southeast-1`, was started through
the existing lifecycle helper. Its sole cloud inbound rule permits Workbench
private SSH; no application container/listener was running. Actual dependency
reads succeeded. The pinned zkir 2.1.0 executable and k=20/21 parameter-cache
hashes match the prior build. Its existing root-owned mode-0600, fully allocated
8 GiB swap file remains intact and was inactive at preflight.

The public-only archive contains 31 explicitly selected files, including exact
Compact sources, compiled programs/bindings and a separate public source patch
against base revision `3b1b22d217a1feddfe5925951463c309c36bbab9`. It excludes
private instructions, wallets, API/cloud credentials and private payloads.
Workbench transfer uses OSS as an intermediary. The archive SHA-256 is
`6807b2a0a5c2cd3cfcd0cdaaa4617de6d7db630a298aa0d686ddf49cdc2e81ee`;
remote extraction and every manifest file hash were independently verified.
Evidence is in `logs/business-ecs-v11-build-20261115/`.

The server has approximately 2.83 GB free. The supplemental public build runner
uses one owned circuit job at a time with the existing 13.5 GiB soft / 14 GiB
hard / 8 GiB swap envelope, one worker thread and two-core CPU quota. It checks
the actual applied cgroup and stops at a 1 GiB disk reserve, 512 MiB host-memory
reserve or one-hour job duration. It restores the prior swap activation and VM
setting and preserves failure reports. Completed key pairs must be downloaded
and hash-verified locally before removing only their owned remote temporary
copies. It creates no swap, changes no cloud resource/RAM grant and submits no
transaction.

The first genuine new pair, `prepareRuntimeBusinessPredicate`, completed in
496 seconds. Its 338,219,651-byte prover hashes to
`540b7bf3c3ccb31aad8832e2ee84800aff67c22933168014961dd365ac41cac5`;
its 2,311-byte verifier and binary program were also verified locally. The
pair is installed separately from the preserved v10 assets. The execution pair subsequently completed in about 21 minutes; its
678,012,676-byte prover hashes to
`89e268fe76b86bc59fc4411c9bfc496cc3bf2b410082f64fffab8fab8754e68a`.
Its verifier and binary program also passed complete local verification.
The participant-slot pair also completed and passed local full-file hashes.
Current complete pair inventory is 11/11, including two exact old-program reuses.
The actual SDK verified the complete inventory and its manifest, SHA-256
`938838cdd66ea27b2d51f0ca297020eb9fa091fe538fd34599fc1b214554c130`.
Total prover material is 2,150,636,068 bytes. All nine new builds completed with
zero observed OOM/OOM-kill counters and restored their temporary settings.
The maximum memory peak was 14,495,776,768 bytes; sampled swap peak was
6,810,845,184 bytes, within the unchanged limits. Per-program measurements and
all prover/verifier/binary hashes are in the artifact inventory. The preserved
v10 genuine assets passed another fresh integrity check after these builds.

Concurrent Workbench file transfers failed with session deadlines. An exact
public-key delta reduced the first transfer to 72,243,200 bytes, then bounded
1 MiB reads through the same authenticated Workbench command channel recovered
it in 72 seconds. Every chunk, the entire delta and the reconstructed full key
passed independent hashes. Only after that verification were this task's
redundant remote prover and transfer files removed. This transfers genuine key
bytes; it does not substitute a key belonging to another program. The execution delta
transfer stopped after 57 MiB. A successful bounded probe and separately reviewed
explicit recovery reverified the preserved remote report/prover/export, compared
the partial local/remote prefix hashes, and resumed without rebuilding the
compiler job. The complete 234,361,979-byte delta and reconstructed 678 MB
execution key passed their exact hashes before remote prover cleanup.

The first execution-key attempt was interrupted at 02:41:33 Asia/Shanghai by
the OS's unattended-upgrade `needrestart` action. Its dpkg log explicitly names
`systemctl restart ... permio-business-v11-controller-execute.service ...`.
The corrected controller stopped its owned child and restored swap/VM settings;
no OOM occurred. The interrupted directory and hash-verified local resource/log
archive are preserved. A temporary dated needrestart override defers automatic
restarts only for this task's `permio-business-v11-*.service` units; its effective
selection was verified. It was removed after all owned jobs stopped and all
results were verified locally.
Security updates and unrelated service policies were preserved. An explicit
retry started at 02:55:01 with the same source and resource limits.

The read-only constructor-cost helper has passed independent review and its
two focused tests. Its real CLI refused the incomplete asset set at
`genuine-asset-preflight`, with `nodeAccessed: false`; no candidate was built.
A separate read-only preflight in the pinned WSL environment reached
`ws://127.0.0.1:9944`, verified node `1.0.0-8af7d08a` and the exact expected
local genesis, without a wallet or submission. After all eleven genuine pairs
passed verification, the actual constructor measurement completed as recorded
below.

The sequential continuation script received a separate read-only review. Four
issues were corrected before running it: terminal owned-unit detection with a
4,000-second monitoring bound, deadline renewal before bounded synchronization,
streamed file hashing/copying and bounded log tails, and exact five-member archive
validation with explicit expansion caps. It monitors the existing execution
retry, then launches seven new jobs one at a time without automatic compiler retries.
An observed startup race was also corrected: the participant-slot controller was
launched at 03:27:41.273 Asia/Shanghai and created its initial report at
03:27:41.794. The monitor now treats a missing initial report as pending only
while the exact owned controller has a live PID, retaining its observation
deadline. Reviewed explicit continuation validates the saved name/unit and
monitors the existing job without launching another compiler.

## Actual deployment-weight blocker

The read-only helper used the actual v11 constructor and all eleven genuine
verifiers against local node `1.0.0-8af7d08a` and the pinned genesis. Its native
candidate was 27,518 bytes. At 2026-11-15 04:03:37 Asia/Shanghai, the node returned:

| Measurement | Reference-time units |
| --- | ---: |
| Ledger cost | 1,289,760,000,001 |
| Node overhead | 20,000,000,000 |
| Estimated dispatch weight | 1,309,760,000,001 |
| Normal maximum extrinsic weight | 1,299,891,843,000 |
| Excess before wallet balancing | 9,868,157,001 |

The dispatch estimate exceeds the actual node limit by approximately 0.75%
before any wallet balancing. With the explicitly historical 18-billion reserve,
headroom is -2.14%; the required final minimum remains 5%. This is a deployment
weight failure, independent of the successful key-generation memory profile.
The node's cost query was read-only. No wallet, application proof, signing,
balancing, transaction validation/submission or activation occurred. This is
not a claim that a submitted deployment was rejected. Exact returned values,
candidate hash, inventory hash and safety flags are preserved in the artifact
inventory and `logs/business-v11-constructor-cost.json`.

## Architecture decision required

The recommended direction to evaluate is a separately versioned fixed-operation
dispatcher combining `beginM4Activation` and `finalizeM4Activation`, while keeping
binding staging separate. Both existing entries accept the same four arguments
and use the same admission-authority verifier. Their measured programs contain
36,419 and 36,883 rows, respectively, compared with 649,618 and 565,028 rows for
the two preparation entries. This is stronger source support for trying the
activation option first; the resulting circuit size remains unmeasured.

Branch ordering must remain exact: begin verifies authority before inspecting
or replacing a stale session; finalize removes an expired/stale session and
returns `activated:false` before authority verification. Do not hoist the shared
verification above operation selection. Preserve nonce reservation/consumption,
envelope commitments, staged-binding coverage, registry/root freshness, counters
and final writes. Reject unsupported operation selectors. Versioned SDK adapters
must preserve the distinct logical return values and resume/checkpoint behavior.
The two action-preparation entries and atomic final execution would remain
separate. Other program/key pairs may be reused only after exact compiled-byte
comparison, not from an assumption about entry count.

An alternative is to consolidate typed-evidence and business-predicate preparation.
It also targets ten entries, but changes action-preparation adapters and may
combine two k=20 programs into k=21; that proving-cost effect is unmeasured.
Either option requires recompilation, cross-operation/security regressions,
genuine required keys within the existing resource profile, the full suite and
a new actual constructor measurement. To retain 5% headroom after the assumed
18-billion balancing reserve, unbalanced dispatch weight must be at most
1,216,897,250,850, a reduction of at least 92,862,749,151 from this candidate.
Ten entries alone do not guarantee that gate. A separate proof-family deployment
would change the single-contract trust model and require broader review.

No direction has been adopted. The existing
[deployment-weight decision](../M6/deployment-weight-architecture-decision-v1.md)
explicitly states that a near-limit or rejected candidate does not authorize
another architectural change. User direction is required before implementation.

After that decision, the remaining acceptance gates are:

1. Meet the actual constructor limit with practical headroom, then require
   successful read-only validation of the exact balanced candidate before any
   permitted submission.
2. Complete independent **human** security/privacy review and high-threshold
   protocol-governance approval, then the separate activation and revocation
   procedure. Agent review supplies no human/protocol approval. This is explicit
   in [the authorization architecture decision, Decision 3](../M6/architecture-decision.md)
   and [the programmable-context architecture, section 5.8](../../PROGRAMMABLE_CONTEXT_ARCHITECTURE.md).
3. Generate fresh native authorization receipts for all three packs, pass them
   through the unchanged receipt gateway and deployed execution registry, verify
   indexing/recovery/replay, and scan actual public captures for private material.
   Historical receipts and synthetic contract evaluation cannot close this gate.

## Build-server completion

The public-key build task is finished and its results are downloaded and
verified. All owned compiler/controller PIDs are zero. The existing 8 GiB swap
file is preserved, inactive, and the original swappiness 0 is restored. The
temporary needrestart override is removed. Only the expected SSH and loopback
system listeners were observed; this task started no application services.

The official lifecycle helper verified one-time OOS execution
`exec-82378c77946144aaa1a8`, status `Waiting`, with economical `StopCharging`,
`ForceStop=false`, for **2026-11-15 06:04:07 Asia/Shanghai**. Its exact template
was verified, the automatic deletion deadline is empty, and the instance and
disks are preserved. Renewals have ceased because this server-using task is
finished. This records a pending economical stop, not an already stopped server.

No new-family activation, public-network submission or new wallet use occurred
for this extension. Native scenario acceptance remains **OPEN**.

## 中文翻译

```text
# 业务谓词扩展：实现与验收证据

日期：2026-11-15，Asia/Shanghai。用户决定：扩展共享 Midnight 授权证明模块，然后继续生成场景包的原生验收。本报告不证明已经激活或完成原生验收。
实现提交：`fc20a76`（`feat(authorization): enforce reusable business predicates`，即“强制执行可复用业务谓词”）。
预检／回归提交：`bcd55aa`（`test(authorization): add genuine deployment cost preflight (U5)`，即“增加真实部署成本预检（U5）”）。

状态：实现、回归检查及全部十一对真实密钥均已验证。实测构造函数权重以及独立的人工／协议审批关卡使原生验收处于 BLOCKED（受阻）状态。没有提交部署交易。

## 已实现的行为

模板模式 2 声明三种可复用谓词：当前有效的签名记录、与签名上限使用同一单位且不大于该上限的签名数值，以及绑定精确意图和已选输入的独立审计确认。单独版本化的授权合约 v11 将其有序承诺绑定到策略 v4 和已签名操作命令。每个准备步骤都不产生授权效果；最终执行要求谓词和输出完整覆盖、精确的根能力及原始签发方，并重新检查权限、状态、生命周期和实例状态。最终状态更新、nullifier（防止重复使用的标记）消耗及 DecisionReceipt v1 收据写入仍以原子方式完成。

旧策略辅助函数拒绝模式 2，而不会静默遗漏其谓词。合约 v10 资产及模式 1 的身份保持不变。新版场景包 3.0.0 显式使用新家族。私有见证适配器接受新的 Unix 秒级时间锚点，从会话推导委托链终端主体，并要求在创建确认之前完成私有持久化审计存储。显式 v11 收据读取器使用其实际编译生成的账本路径。

精确源码、生成绑定、模式、程序和场景包／配置哈希见[产物清单](business-predicate-v11-artifacts-20261115.json)。操作实现哈希是该清单中精确的 `executeRuntimeAction.zkir` SHA-256；没有编造部署地址或实现引用。任何证明请求之前，最终密钥清单都必须绑定全部十一个证明程序。仅有哈希完整性并不等于治理信任。

## 已观察到的验证结果

- 固定版本 Compact 0.31.1/runtime 0.16.0 编译了完整 v11 实现。
- 最终全仓 `npm test` 退出码为 0：690 项 Node 测试运行器用例中，689 项通过、零失败，Windows 跳过一项仅适用于 POSIX 的用例。另有 44 项 Solidity 测试通过。该跳过项已在 WSL 中单独执行的全部 24 项见证／配置测试中通过，该轮零失败、零跳过。五项云清理故障测试及两项只读构造预检测试另行通过。日志：`logs/business-full-test-20261115-post-cross-root.log`。此前测试早于最终回归／辅助工具增量；以上最终数量取代此前结果。
- 后续回归发现，旧辅助函数接受模式 2，却丢弃其谓词。现已通过默认拒绝的保护检查修复；修改后重新执行的新旧策略组合测试 22/22 通过。原 v10 兼容性 CLI 对当前全部十项模式 2 场景包用例明确返回 `BLOCKED_UNSUPPORTED_PROOF_REQUIREMENT`（预期退出码为 1）；这是默认拒绝的兼容性控制，不是显式 v11 路径失败。
- 生成合约测试覆盖三种谓词、两个种子下的全部五条流程、上限相等／超额／单位混用、已签名记录篡改、错误的合格签发方、撤销、命令替换、有序准备、不完整覆盖、清理、原子收据效果，以及显式收据布局／转录验证。其创世／根夹具是合成数据，不计为人工批准、部署、最终确认或原生验收。
- 额外的跨根回归已通过：处于不同活动能力根之下、由同一合格签发方签发且分别独立有效的两份签名谓词不能组合使用。测试直接调用生成的准备电路，并检查会话、进度、收据／nullifier 数量及实例状态保持不变。增加该测试后，完整操作执行测试文件 7/7 通过。
- 类型检查、文档检查和 Solidity 构建退出码均为 0。现有 v10 真实密钥资产完整性验证通过。暂存内容的空白检查通过。仅在沙箱中发生的一次临时 Git 测试失败及一次 Hardhat 测试发现失败，在使用正常授权的文件系统访问权限重跑后通过；没有引入源码规避方案或降低测试门槛。
- 八个视角的独立代理审查已完成，无保留问题。四个原始问题均已修复并独立检查：文件同步重试、父目录持久性、控制程序启动结果不确定时的清理，以及虚拟机设置的独立恢复。文件同步和父目录同步回归在修复前均实际观察到失败。审查编号：`20261115-020115-56167a83`；保存的完整差异精确 SHA-256：`23a95031418a42c3ca4797828ed3047f63df335fea207b2432351638e5384f1a`。保存的 U10/CRLF 差异已在规范化上下文和换行格式后，与已提交的暂存源码独立比较。结论：仅实现本身已可合入，明确不包括人工／协议激活批准。

构造成本辅助工具与跨根测试增量另经一次聚焦审查，无保留问题，编号为 `20261115-032031-6cde7e93`。其四文件 U10/LF 差异的精确 SHA-256 为 `b398bad03566c9155b208b0107b34d5cb697c2415ed2e3528287b58a4c1083cf`；独立组合定向测试 9/9 通过。这仅为代理审查。

Windows 测试使用现有 Node 24.13.1 环境。Compact 编译、POSIX 回归及只读构造 CLI 使用现有固定 WSL Node 22.23.2 环境。没有更改 Node 或工具链版本。

简化检查保留了按版本隔离的操作辅助函数，以维持生成结构的错误处理路径；将重复的有界输入哈希折叠延后，等待测量其证明成本影响；并保留了解释删除源文件前独占复制所有权的构建注释。已应用具名权限常量、策略承诺缓存、真实的另一合格签发方负向测试，以及更清晰的策略投影命名。

## 密钥生成测量与受控构建路径

现有本地受限配置测得，新准备电路为 k=20、565,028 行，最终执行为 k=21、1,982,062 行。该配置在生成密钥之前按本地 k=20 阈值主动停止。未发生 OOM（内存耗尽）事件，也没有就绪密钥清单。精确测量、实际应用的 cgroup（进程组资源控制）限制及编译日志见 `logs/business-compact-BLtSgK/`。

已接受的 v10 执行基线本来就是 k=21、1,949,234 行，在获授权的 16 GiB 新加坡实例上构建。新执行增加 32,828 行（约 1.68%），没有跨入新的 k 等级。本地阈值是操作配置，不是 Midnight 协议限制。参见[普通操作边界证据](../M6/ordinary-action-execution-boundary-v1.md)及[现有部署／资源决定](../M6/deployment-weight-architecture-decision-v1.md)。

仅 `governAuthorization` 和 `stageM4ActivationBinding` 与 v10 字节完全相同。其余九个程序需要真实新密钥。获授权的构建实例 `i-t4ni11rkjyzgi0vlb68d`、区域 `ap-southeast-1` 已通过现有生命周期辅助工具启动。其唯一云端入站规则允许 Workbench 私网 SSH；未运行任何应用容器或监听服务。实际依赖读取成功。固定版本 zkir 2.1.0 可执行文件及 k=20/21 参数缓存哈希与此前构建一致。现有 root 所有、权限为 0600、完整预分配的 8 GiB 交换文件保持完好，预检时未启用。

仅含公开内容的归档包含明确选择的 31 个文件，包括精确 Compact 源码、已编译程序／绑定，以及相对于基线版本 `3b1b22d217a1feddfe5925951463c309c36bbab9` 的独立公开源码补丁。归档不含私有指令、钱包、API／云凭据及私有载荷。Workbench 传输经过 OSS 中介。归档 SHA-256 为 `6807b2a0a5c2cd3cfcd0cdaaa4617de6d7db630a298aa0d686ddf49cdc2e81ee`；远端解压及清单内每个文件的哈希均已独立验证。证据见 `logs/business-ecs-v11-build-20261115/`。

服务器约有 2.83 GB 可用空间。补充的公开构建运行器每次仅执行一个本任务拥有的电路作业，沿用现有 13.5 GiB 软限制／14 GiB 硬限制／8 GiB 交换边界、单工作线程及双核 CPU 配额。它检查实际应用的 cgroup，并在触及 1 GiB 磁盘预留、512 MiB 主机内存预留或一小时作业时限时停止。它恢复此前的交换启用状态和虚拟机设置，并保留失败报告。已完成的密钥对必须先下载并在本地核验哈希，随后才能仅删除其所属的远端临时副本。它不创建交换文件，不更改云资源或 RAM 权限授予，也不提交交易。

首个真实新密钥对 `prepareRuntimeBusinessPredicate` 在 496 秒内完成。其 338,219,651 字节证明密钥的哈希为 `540b7bf3c3ccb31aad8832e2ee84800aff67c22933168014961dd365ac41cac5`；其 2,311 字节验证密钥及二进制程序也已在本地验证。该密钥对与保留的 v10 资产分开安装。执行密钥对随后在约 21 分钟内完成；其 678,012,676 字节证明密钥的哈希为 `89e268fe76b86bc59fc4411c9bfc496cc3bf2b410082f64fffab8fab8754e68a`。其验证密钥及二进制程序也通过了完整本地验证。参与者槽位密钥对也已完成并通过本地完整文件哈希核验。
当前完整密钥对清单为 11/11，包括两个精确旧程序复用。实际 SDK 已验证完整清单及其清单文件，清单文件 SHA-256 为 `938838cdd66ea27b2d51f0ca297020eb9fa091fe538fd34599fc1b214554c130`。证明密钥材料总计 2,150,636,068 字节。九个新构建全部完成，观察到的 OOM／OOM-kill 计数均为零，临时设置均已恢复。最大内存峰值为 14,495,776,768 字节；采样交换峰值为 6,810,845,184 字节，均未超出现有限制。每个程序的测量及全部证明密钥／验证密钥／二进制程序哈希见产物清单。构建后，保留的 v10 真实资产再次通过了新的完整性检查。

并发 Workbench 文件传输因会话时限而失败。精确的公开密钥增量将首次传输缩减至 72,243,200 字节，随后通过同一认证 Workbench 命令通道进行受限的 1 MiB 读取，在 72 秒内恢复完成。每个分块、整个增量及重建的完整密钥均通过独立哈希核验。仅在该验证之后，才删除本任务的冗余远端证明密钥及传输文件。此流程传输的是真实密钥字节，没有用属于另一程序的密钥替代。执行增量传输在 57 MiB 后停止。一次成功的受限探测及另经审查的显式恢复流程重新核验了保留的远端报告／证明密钥／导出文件，比较了本地与远端部分文件的前缀哈希，并在不重建编译任务的情况下续传。完整的 234,361,979 字节增量及重建的 678 MB 执行密钥均先通过精确哈希核验，随后才清理远端证明密钥。

首次执行密钥尝试于 02:41:33 Asia/Shanghai 被操作系统无人值守升级的 `needrestart` 操作中断。dpkg 日志明确记录了 `systemctl restart ... permio-business-v11-controller-execute.service ...`。修正后的控制程序停止了其拥有的子进程，并恢复交换／虚拟机设置；未发生 OOM。中断目录及本地已通过哈希验证的资源／日志归档均予保留。临时带日期的 needrestart 覆盖配置仅延后本任务 `permio-business-v11-*.service` 单元的自动重启，其实际选择范围已验证。所有本任务作业停止且全部结果在本地验证后，该配置已移除。安全更新和无关服务策略保持不变。02:55:01 已按相同源码和资源限制显式开始重试。

只读构造成本辅助工具已通过独立审查和两项聚焦测试。其真实 CLI 对不完整资产集在 `genuine-asset-preflight` 阶段拒绝，记录 `nodeAccessed: false`；没有构建候选交易。固定 WSL 环境中的另一次只读预检连接到 `ws://127.0.0.1:9944`，验证了节点 `1.0.0-8af7d08a` 及精确预期的本地创世信息，没有使用钱包或提交交易。全部十一对真实密钥通过验证后，实际构造测量已完成，结果如下。

顺序续跑脚本另经一次只读审查。执行前修正了四项问题：检测本任务服务单元终止并设置 4,000 秒监控上限、受限同步前续期停机期限、流式文件哈希／复制及受限日志尾部读取，以及精确五成员归档验证和明确的解压大小上限。脚本先监控现有执行重试，再依次启动七个新作业，不自动重试编译。另修正了实际观察到的启动竞态：参与者槽位控制程序于 03:27:41.273 Asia/Shanghai 启动，于 03:27:41.794 创建初始报告。现在，只有在精确指定的本任务控制程序仍有有效 PID 时，监控器才将缺失初始报告视为等待，并保留观察时限。经过审查的显式续跑验证已保存的名称／单元，并监控现有作业，不启动另一个编译进程。

## 实际部署权重阻碍

只读辅助工具使用实际 v11 构造函数及全部十一个真实验证密钥，查询本地节点 `1.0.0-8af7d08a` 和固定创世信息。其原生候选交易为 27,518 字节。在 2026-11-15 04:03:37 Asia/Shanghai，节点返回：

| 测量项 | 参考时间单位 |
| --- | ---: |
| 账本成本 | 1,289,760,000,001 |
| 节点开销 | 20,000,000,000 |
| 估计调度权重 | 1,309,760,000,001 |
| 普通外部交易最大权重 | 1,299,891,843,000 |
| 钱包平衡前超出量 | 9,868,157,001 |

尚未进行任何钱包平衡时，估计调度权重已超出实际节点限制约 0.75%。计入明确基于历史数据的 180 亿预留后，余量为 -2.14%；要求的最终最低余量仍为 5%。这是部署权重失败，独立于已成功满足的密钥生成内存配置。节点成本查询为只读。没有使用钱包、生成应用证明、签名、平衡、验证／提交交易或激活。这不是声称已提交部署遭到拒绝。精确返回值、候选交易哈希、清单哈希及安全标记保存在产物清单和 `logs/business-v11-constructor-cost.json` 中。

## 需要架构决定

建议评估的方向是：在单独版本化的实现中，使用固定操作分发入口合并 `beginM4Activation` 与 `finalizeM4Activation`，同时保留独立的绑定暂存入口。两个现有入口接受相同的四个参数，并使用相同的准入权限验证器。其实测程序分别包含 36,419 和 36,883 行，而两个准备入口分别为 649,618 和 565,028 行。这些源码证据更支持优先尝试激活方案；合并后的电路规模仍未测量。

必须精确保留分支顺序：begin 先验证权限，再检查或替换过期会话；finalize 则在验证权限之前删除过期／失效会话并返回 `activated:false`。不得将共享验证提前到操作选择之前。须保留随机数预留／消费、信封承诺、暂存绑定覆盖、注册表／根的新鲜度、计数器及最终写入。拒绝不支持的操作选择值。版本化 SDK 适配器必须保留不同的逻辑返回值及续跑／检查点行为。两个动作准备入口和原子最终执行仍保持独立。只有精确比较编译后字节，才能复用其他程序／密钥对，不能根据入口数量作出假设。

另一方案是合并带类型证据准备和业务谓词准备。其目标同样是十个入口，但会改变动作准备适配器，并可能将两个 k=20 程序合并为 k=21；该证明成本影响尚未测量。任一方案均须重新编译、执行跨操作／安全回归，在现有资源配置内生成真正需要的密钥，运行完整测试集，并重新测量实际构造函数。计入假定的 180 亿平衡预留后，若要保留 5% 余量，未平衡调度权重必须不高于 1,216,897,250,850，即比当前候选至少减少 92,862,749,151。仅有十个入口不能保证通过此关卡。单独部署证明家族则会改变单合约信任模型，需要更广泛审查。

尚未采纳任何方向。现有[部署权重决定](../M6/deployment-weight-architecture-decision-v1.md)明确指出，候选交易接近上限或遭到拒绝，不构成再次更改架构的授权。实现之前需要用户指示。

作出该决定后，剩余验收关卡为：

1. 以实际可用余量满足真实构造函数限制，然后在任何获准提交之前，要求精确的已平衡候选交易通过只读验证。
2. 完成独立的人工安全／隐私审查和高阈值协议治理批准，随后执行独立的激活与撤销流程。代理审查不能提供人工／协议批准。[授权架构决定中的决定 3](../M6/architecture-decision.md)及[可编程上下文架构第 5.8 节](../../PROGRAMMABLE_CONTEXT_ARCHITECTURE.md)对此有明确要求。
3. 为全部三个场景包生成全新原生授权收据，通过不变的收据网关及已部署执行注册表传输，验证索引／恢复／重放，并扫描真实公开捕获中是否包含私有材料。历史收据及合成合约求值不能关闭此关卡。

## 构建服务器任务完成

公开密钥构建任务已完成，结果已下载并验证。全部本任务编译器／控制程序 PID 均为零。现有 8 GiB 交换文件予以保留，未启用，原 swappiness（交换倾向参数）0 已恢复。临时 needrestart 覆盖配置已移除。仅观察到预期的 SSH 及回环系统监听服务；本任务未启动应用服务。

官方生命周期辅助工具已验证一次性 OOS 执行 `exec-82378c77946144aaa1a8`，状态为 `Waiting`，采用经济停机 `StopCharging`、`ForceStop=false`，安排于 2026-11-15 06:04:07 Asia/Shanghai。其精确模板已验证，自动删除期限为空，实例和磁盘均予保留。由于本次使用服务器的任务已完成，已停止续期。这记录的是待执行的经济停机，不是服务器已经停止。

本次扩展未激活新家族、未提交公网交易，也未使用新钱包。原生场景验收仍为 OPEN（未完成）。
```
