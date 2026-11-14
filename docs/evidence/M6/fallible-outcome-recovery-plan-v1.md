# Fallible-outcome test recovery — awaiting approval

The contract remains `70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c`.
Fifty of the approved 100 additional native submissions finalized successfully.
Round 50 changed state and inserted one receipt. Round 51 was reserved and balanced
but **never submitted**. The first instance/session has expired; its signed bytes
must remain unused. No contract, application or module is being reactivated.

The test harness incorrectly required a transaction-pool rejection for a contract
whose 143 public instructions are all in one fallible transcript. Exact saved
bytes pass pool validation. Read-only full-runtime application returns dispatch
success, while an exact public-VM differential passes on the pre-winner state,
fails on the post-winner state, and passes if only the previous instance row is
restored in memory. This does not yet establish a native negative outcome.

Pinned runtime 1.0.300 source separates pool validation, guaranteed pre-dispatch
and application; application records `TxPartialSuccess` when not all segments
apply. Pinned SDK types distinguish `FailFallible` from `SucceedEntirely`.

- https://github.com/midnightntwrk/midnight-node/blob/node-1.0.300/pallets/midnight/src/lib.rs
- https://docs.midnight.network/api-reference/midnight-js
- `../../../logs/m6-remaining-preprod-20261019/round51-failure-inspection-v1.json`
- `../../../logs/m6-remaining-preprod-20261019/round51-runtime-diagnostic-v2.json`
- `../../../logs/m6-remaining-preprod-20261019/round51-partition-shape-v1.json`

Correct the harness before any next native attempt. A pool acceptance is never
an application authorization or a passed negative test. A negative must have
either a definite attributable native rejection, or exact indexed bytes with
`FailFallible`, the intended failed segment, and an unchanged entire contract
state (including instance, receipt and nullifier collections). A timeout,
transport failure, fee/weight error, expired signature or `SucceedEntirely`
cannot pass. Positive/negative controls must share the same proved bytes, with
read-set causal isolation recorded separately. Included negative transactions
can consume test DUST; wallet checkpoints must reflect their actual fee effects.
Never automatically retry a native submission or replay completed calls.

Proposed authorization: **at most 131 additional native submission attempts in
total on this same contract, and at most three application instances in total**.
The 50 already finalized submissions count toward 131. This adds at most 81
further submissions, and changes the previous 100 ceiling by 31. Historical 62
on the earlier contract remain separate. These are approval guardrails, not
Alibaba Cloud or Midnight infrastructure limits.

| Remaining work | Maximum submissions |
| --- | ---: |
| Existing second-instance plan, including its authority/status/replay negatives and final lifecycle calls | 49 |
| One fresh third instance for the missed independently proved state-conflict pair | 32 |
| **Further maximum** | **81** |
| Already finalized on this contract | 50 |
| **Aggregate ceiling** | **131** |

The third instance uses the existing stateful template and built-in module. Its
32-call maximum is allocation 1, real account/root/session certification 19,
root-slot begin/finalization 2, two independent four-call preparations 8, one
successful state transition 1, and its competing native attempt 1. It uses a
fresh six-hour instance with a future-start capability lasting at most the
existing four-hour policy maximum, actual-clock activation and freshly signed
intents. It runs before final template/module retirement/revocation.

Preserve round 51 and mark its reservation abandoned without submission; never
overwrite its bytes or journals. Proposed future identifiers are 52..132, which
represent at most 81 actual submissions. The final lifecycle calls move to
125..132; the third flow occupies 93..124. Actual native submission count, rather
than the highest reservation identifier, enforces 131. Expected successful
actions are 127 normal calls plus four attributable native negative outcomes;
included failures remain failures, never successful application calls. Final
expected public state: three instances, three receipts/nullifiers, four unused
preparations, authority sequence 2, status sequence 10, both templates revoked
and both modules revoked. Preserve all historical records.

No new server or contract deployment, new module family, memory upgrade, RAM
grant, public developer API, toolchain change or production asset. Continue on
the existing 16 GiB Singapore ECS with bounded RAM and swap. Refresh its verified
two-hour graceful economical stop during work. Restore all temporary public
offloads, download and verify all scanned public evidence, and leave a final
verified two-hour stop when work finishes. Independent human security/privacy
review remains open; this plan does not waive any M6 acceptance gate.

# 中文翻译

仍使用上述同一合约。获批的 100 次额外提交中，已有 50 笔成功确认。第 50 笔完成了
状态变更并插入一份收据。第 51 项只做了预留和费用平衡，**从未提交**。第一个实例／
会话已过期，不能再使用其已签名交易；不会重新激活任何合约、应用实例或模块。

测试程序错误地要求交易池拒绝交易，但该合约的 143 条公开指令全部属于同一个可失败
阶段。相同交易字节能通过交易池检查；只读完整运行时模拟返回外层执行成功，而准确
公开程序在胜出交易前通过、在胜出交易后失败，仅在内存中恢复旧实例记录后又通过。
这些结果尚不能替代真实提交的负向结果。固定版本的运行时及 SDK 明确区分交易池、
保证执行、合约可失败阶段和部分成功状态，参考资料与证据见上。

继续提交前先修正测试。交易池接受不等于操作获授权，也不能算负向测试通过。负向
必须得到可归因的原生拒绝，或者准确索引交易字节、可失败阶段失败、目标阶段失败及
整个合约状态不变的证据，包含实例、收据和 nullifier 集合。超时、连接故障、费用／
权重错误、签名过期或完整成功均不能算通过。保持相同证明的前后对照及独立因果核验。
入块的失败交易可能消耗测试 DUST，因此必须更新费用钱包检查点。禁止自动重试原生
提交或重放已经完成的调用。

提议将该合约的额外提交总上限从 100 调整到 **131**，应用实例总上限从两个调整到
**三个**。已有 50 笔计入 131，后续最多 81 笔；旧合约上的 62 笔仍单独记录。这些是
授权保护范围，不是阿里云或 Midnight 的基础设施限制。

后续 81 笔由原第二实例方案 49 笔和新增第三实例 32 笔组成。第三实例使用现有状态
变更模板和模块：分配 1 笔，真实账户／根能力／会话认证 19 笔，根槽位 2 笔，两份
独立准备各 4 笔共 8 笔，成功状态变更 1 笔，竞争负向提交 1 笔。使用新的六小时实例、
最多四小时且未来生效的能力、真实时钟等待及新签名；完成后再退役／撤销模板和模块。

原第 51 项保留并标记未提交即放弃，绝不覆盖。后续标识为 52..132，共最多 81 次真实
提交；第三流程为 93..124，最后生命周期调用移至 125..132。上限按实际提交次数检查，
不是按最大预留编号计算。预计 127 笔正常调用及四笔可归因负向结果；失败入块不算应用
调用成功。最终三实例、三收据／nullifier、四份未使用准备，权限序列 2、状态序列 10，
两模板和两模块均撤销，保留全部历史。

不增加服务器或合约部署，不新增模块家族、内存升级、RAM 权限、公网开发接口、工具链
变更或生产资产。继续使用现有新加坡 16 GiB ECS 和受限 RAM／交换空间；工作时续设并
核验两小时优雅节省停机期限。结束前恢复暂存的公开文件，下载并核验全部扫描通过的
公开证据，再保留最后一次经核验的两小时停机期限。独立人工安全／隐私审查仍未完成，
本方案不豁免任何 M6 验收条件。
