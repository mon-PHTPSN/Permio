# Remaining M6 tests after the closed-wallet failure — awaiting approval

This proposal supersedes the unanswered 131-attempt / three-instance proposal in
`fallible-outcome-recovery-plan-v1.md`. It is not an approved execution grant.
The current approval remains one contract, 100 submission attempts and two
application instances. These ceilings are our approval boundaries, not Alibaba
Cloud or Midnight limits.

The existing contract is
`70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c`.
The earlier 62 submissions on the permanently revoked old contract remain separate.

## Verified result and failure

There are 54 conservatively counted submission attempts: 53 successful calls and
one local client failure. The first ordinary action changed state, consumed its
scoped nullifier and generated receipt v1; its exact chain bytes and receipt have
been downloaded and independently decoded locally. Reservation 51 was never
submitted and is explicitly abandoned. It does not count as a submission attempt.

The second instance was allocated, its account issued and root-capability
certification started in calls 52–54. Call 54 timed out while waiting for finality,
then read-only reconciliation found its exact successful transaction. The SDK had
already closed its node connection. The test worker incorrectly retained that
wallet and its next SDK submission, reservation 55, failed through the closed
connection. No automatic retry occurred. Both identifiers were absent from the
indexer and the entire contract state matched the state after call 54. Count 55
conservatively; never retry or reuse its saved bytes. This is not an authorization
negative test. The incomplete capability certification remains recorded and grants
no capability by itself.

The harness fix closes and checkpoints a wallet after a successful call that
required timeout reconciliation. The next distinct planned call opens a fresh
connection. Three new regression tests pass; the complete check passes 431 tests
with zero failures or skips. Contract, ABI, SDK production implementation and
receipt schema are unchanged. The fix has not been used for another live call.

## Requested bounded authorization

Use the same contract, templates, proof-module families and 16 GiB Singapore ECS.
Raise the aggregate ceiling to **150 submission attempts** and **four application
instances total**, including all work already performed. Allocate two fresh
instances, leaving the two existing instances and their history intact.

| Work | Planned submission attempts |
| --- | ---: |
| Already counted, including the local client failure | 54 |
| Fresh state-transitioning flow and independently proved competing action | 32 |
| Fresh non-transitioning flow, authority-root/status-root controls and cold-reconnect nullifier replay | 41 |
| Final retirement/revocation of both templates and modules | 8 |
| **Baseline total** | **135** |
| Conservative reserve for further demonstrably pre-send local failures during these same planned operations | **15** |
| **Hard aggregate ceiling** | **150** |

With no reserve used, new reservation identifiers are 56–136. The fresh stateful
flow occupies 56–87, the non-transitioning flow 88–128 and final lifecycle calls 129–136.
Identifier 51 remains abandoned; counted attempts equal the reservation count
minus that single verified abandonment. A future failed SDK attempt still counts
conservatively. Reserve use shifts later identifiers and cannot add operations,
instances, deployments or negative cases.

No automatic native resubmission is authorized. A local failure stops the run for
read-only reconciliation. A replacement SDK attempt is allowed under this reserve
only when the exact code path conclusively failed before invoking the native node
send, all saved identifiers remain unindexed, and the unchanged predecessor state
is verified. Unknown delivery, accepted submissions or a finality timeout never
qualify: reconcile them without a replacement send. Before any replacement, discard
the closed client and verify fresh proof/signature validity and current state.
Do not reuse reservation 55 or expired bytes. Native rejection/partial failure
counts as its intended single negative attempt and must never be retried to get
a desired result. Stop at any unresolved safety or budget boundary.

Both fresh instances retain the existing six-hour allocation and at-most-four-hour
capability policies, future activation on the real clock and genuine proofs.
Use unused credential status indices 13–15 for the fresh stateful flow and 16–18
for the non-transitioning flow. Preserve the existing four issued status leaves,
including the account of the interrupted second instance. For the stale-status
control, revoke the freshly completed stateful flow's capability rather than
depending on the old expired instance. Before allocation and each long proof,
verify enough real validity remains for all subsequent control steps; stop before
submitting if that prerequisite fails. Authority rotation remains one logical
change requiring two approvals.

Without reserve use, expected outcomes are 130 normal finalized calls, four
attributable native authorization-negative outcomes and the already counted local
failure. Included negative results require exact bytes, `FailFallible`, failure of
the actual contract segment and unchanged entire contract state. Pool acceptance,
timeouts, transport/fee/weight errors or expired signatures are not passed negatives.
Expected final state has four instances, three receipts/nullifiers, four unused
action preparations, the old incomplete capability certification, authority
sequence 2 and status sequence 11. Both templates/modules finish revoked with
history preserved. These are expectations to test, not acceptance claims.

No new server, contract, module family, architecture, RAM grant, public developer
endpoint, toolchain upgrade or production assets. Use test DUST only. Do not replay
finalized calls or extend signed validity by changing clocks. Preserve the single
contract, v10 ABI, ordinary profile 9 and receipt v1. Native failure tests and the
independent human security/privacy review remain open until actually completed.

While waiting, finish the currently authorized read-only evidence export and
restore all temporary public offloads/dependencies. Protect and deliberately retain
only dedicated test credentials for continuation. Download and hash-verify scanned
results before finishing the ECS activity record. Leave one verified two-hour
graceful `StopCharging` deadline with `ForceStop=false`; preserve the instance and
disks. If approval arrives after cleanup, re-check source, private access, disk,
timer and exact indexed state before a fresh isolated run.

## 中文翻译

本提案取代尚未答复的“131 次提交、三个应用实例”方案，尚未获得执行授权。现有授权
仍为同一合约、100 次提交、两个应用实例；这些是我们设定的授权范围，并非阿里云或
Midnight 的限制。旧合约的 62 笔单独记录。

当前保守计数为 54 次提交尝试：53 笔成功调用和一次本地连接失败。第一条普通用户
流程已完成状态变更、消耗防重放标记并生成收据 v1，准确链上字节和收据已下载并在
本地独立解码。第 51 项从未提交，已明确放弃，不计入提交次数。

第二实例的第 52–54 项完成分配、账户签发和根能力认证启动。第 54 项等待确认超时，
随后只读查询确认准确交易成功，但 SDK 已关闭连接。测试程序错误保留了该钱包，
导致第 55 项在关闭的连接上本地失败。没有自动重试；两个标识均未被索引，完整合约
状态与第 54 项之后完全一致。第 55 项保守计数，禁止重试或复用其字节。它不是权限
负向测试；保留的部分认证记录本身不授予能力。

修复后，经超时查询才确认成功时会保存钱包检查点并关闭旧连接，下一个不同的计划
调用新建连接。新增三项回归通过，完整检查 431 项通过、无失败或跳过；合约、ABI、
SDK 生产实现和收据格式均不变。尚未使用该修复进行新的真实调用。

申请继续使用同一合约、模板、模块家族及现有新加坡 16 GiB ECS，把包括已有工作的
提交总上限调整为 **150 次**、应用实例总上限调整为 **四个**。新增两个实例，完整
保留已有两个实例及历史。基础计划为：已有 54 次，新的非状态变更流程及权限根／
状态根／冷重连防重放测试 41 次，新的状态变更和独立竞争操作 32 次，最终两模板和
两模块退役／撤销 8 次，共 135 次；另外保留 15 次，仅供同一批计划操作中能够确定
发生在原生发送之前的本地失败保守计数，不允许增加操作、实例、部署或负向案例。
未使用预留时，新编号为 56–136：先执行新的状态变更流程 56–87，再执行非状态变更
流程 88–128，最终生命周期调用为 129–136；第 51 项始终放弃。

禁止自动重发原生交易。发生本地失败时停止并只读核实。仅当准确代码路径能够确定
尚未调用节点发送、全部标识未被索引、前序状态完全未变时，才能在预留额度内建立
新连接并重新核验当前状态、证明和签名有效性后替换 SDK 尝试。发送结果不确定、已
接受或等待确认超时均不能补发，只能查询核实。禁止复用第 55 项或过期字节。负向
测试无论原生拒绝或部分失败，均只尝试一次，不得为了得到期望结果重试。

新实例维持已有六小时实例、最多四小时能力及真实时钟未来生效策略。状态变更流程
使用未占用索引 13–15，非状态变更流程使用 16–18，保留已有四个签发状态记录。
状态根对照撤销新完成的状态变更流程的能力，避免依赖旧的过期实例。分配和每次长
证明前，核验真实有效期足以完成后续全部对照步骤；不满足时在提交前停止。
权限根轮换仍为需要两次批准
的一个逻辑变更。预计最终 130 笔正常调用、四项可归因负向结果及已有一次本地失败，
四个实例、三份收据／防重放标记、四份未使用的操作准备，以及原有部分能力认证。
权限根序列 2、状态根序列 11；两模板与两模块最终撤销并保留历史。以上均为待核验
预期，不能提前声称通过。交易池接受、超时、传输／费用／权重错误或签名过期均不
能算负向测试通过；入块负向结果必须核验准确字节、真正合约阶段失败及全合约状态
不变。

不增加服务器、合约、模块家族、架构、RAM 权限、公网开发接口、工具链升级或生产
资产，仅用测试 DUST。不重放成功调用，不修改时钟延长签名。保留单合约、v10 ABI、
普通操作 profile 9 和收据 v1。真实负向测试及独立人工安全／隐私审查仍须实际完成。

等待决定期间，继续完成已授权的只读证据导出及全部临时公开文件／依赖恢复。专用
测试凭据受保护并明确保留供后续使用。下载并核验扫描通过的结果后结束 ECS 活动
记录，保留最后一次经核验的两小时优雅节省停机，`ForceStop=false`，实例和磁盘保留。
若清理后才批准，重新检查源码、私网访问、磁盘、定时器及准确索引状态再启动独立运行。
