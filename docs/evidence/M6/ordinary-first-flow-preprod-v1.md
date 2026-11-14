# Ordinary first-flow execution, Preprod

Status: **first stateful ordinary flow passed; full M6 remains in progress**. The user approved a
total of 62 native test-DUST transactions on the existing contract
`9a5b8e294e61463c5ce5948ba0120479dd69a582e0e7fc5f84c8c9c4197af3bc`:
32 previously finalized and at most 30 further calls for one fresh application
instance. This does not authorize a new contract deployment, a second fresh
instance, prior transaction replay, or automatic native submission retries.

All 62 transactions are finalized. The ordinary action atomically changed the
fresh instance's private-state commitment and advanced its sequence from 4 to 5,
consumed exactly one scoped action nullifier, and inserted exactly one common
receipt v1. The old instance remains at sequence 4, the namespace status-root
sequence remains 6, and no action or credential-preparation session remains.
The template is revoked (3) and module emergency-revoked (6); the receipt remains
readable and matches an independent cold exact-transaction read after cleanup.

- Ordinary transaction: `00395e9e78276ae7525a5ab9639f8a319f006594a37b3962082c8d9f17bad594b8`
- Receipt: `0x12142d2ad7897b6d7c678928d70fcd0e265119543033a368fda083a461289c08`
- Source ledger sequence: `3041277`
- Proof-provider stage: 29.64 minutes, including payload/reset/transport.
- Observed main resident-plus-swap peak: 27.03 GiB.
- Evidence: `logs/m6-governance-v10-assets-20261018/ordinary-first-flow-completion-v1.json`.

Transaction 55 experienced an SDK finality timeout. An independent exact-ID
read confirmed SUCCESS at block 3040384; the SDK read then matched the original
balanced transaction byte for byte. It was not resubmitted. Transactions 56–58
completed using the bounded three-round wallet session, which exported its
checkpoint and closed before the large proof.

The first proof of call 59 was interrupted before submission by the host RAM
reserve guard: the last sample showed 244612 KiB available, below the 256 MiB
reserve. The prover was still running with `OOMKilled=false`; swap was not
exhausted. There were exactly 58 submission journals and no `wallet-059-*`
files. All owned processes stopped and the original swap state and public
duplicate paths were restored. The diagnostic is recorded in
`logs/m6-governance-v10-assets-20261018/after58-resource-interruption-diagnostic-v1.json`.

Recovery retains the same genuine keys, contract, frozen ordinary circuit,
signatures, ancestry, state, nullifier and receipt-v1 checks. It restores the
completed private preparation checkpoint rather than replaying any preparation.
Read-only qualification verified exact transaction-58 bytes, all 58 journal
identifiers, and the current pending-progress commitment. TypeScript checking
and eight targeted regression tests passed; the earlier full root check had
398 passing checks. No contract or circuit was changed in this recovery.

The existing 16 GiB host uses a 14.5 GiB hard prover limit and 14.875 GiB total
host swap. The resumed large proof uses one CPU/Rayon compute thread and a 13.5 GiB
`memory.high` soft reclaim threshold, which starts paging earlier. The 256 MiB
host reserve and 768 MiB disk reserve remain enforced. The controller returns
to four CPU/Rayon compute threads after the large proof completes, still with
one proof job at a time. The source snapshot is
version 12; reviewed source and runtime archives have local SHA-256 manifests.

The proof server remains pinned to ledger 8.1.3 and the existing memory-patched
binary SHA-256 `0661d89eb6a9e18041a41f35a13fe6789d0f149e2244ae3587921114e31c9093`.
This is a custom binary overlay on the pinned image, not a stock-upstream
performance result. Compiler 0.31.1, Compact runtime 0.16.0, client ledger
8.1.3, node ledger 8.1.1 and indexer protocol 1000300 remain unchanged.

The separate cold audit passed after revocation, and the public evidence
archive was downloaded and every whitelisted file hash verified. Credential and
generated-private-value literal scans passed. All 13 promised public artifact
paths were restored with exact hashes and original metadata/link counts. All
owned jobs stopped, the original swap file was preserved and left inactive,
temporary swap was removed, and original swappiness was restored. Dedicated
disposable test credentials remain root-only for continuing authorized M6
tests; none were included in downloaded evidence.

The task's ECS usage record is explicitly finished. The final one-time graceful
economical-stop execution is `exec-2c7134ede4254282ada2`, Waiting for
**2026-10-19T10:26:52+08:00 Asia/Shanghai**, with StopCharging and
ForceStop=false. The previous timer was cancelled and the exact replacement
template verified; the instance and disks are preserved and automatic deletion
is empty. Renewal ceases for this completed server task.

This first flow closes only the requested stateful ordinary-action path. Full
M6 remains IN_PROGRESS: replay/conflict/stale/revoked/scope negatives, the
non-transitioning action and remaining runtime matrix, targeted pinned Local
Dev node/indexer interruption/reconnect acceptance, final milestone evidence
and required independent review remain. Synthetic governance fixtures do not
establish independent human review or production readiness. This controlled
test does not establish minimum user hardware or a production latency target.

## 中文

状态：**首条有状态普通操作流程通过，完整M6仍在进行中**。用户已批准在上述现有合约上执行总计最多
62笔测试DUST交易：此前32笔，加同一个新应用实例的最多30笔。该授权不包括新增合约
部署、第二个新应用实例、重放此前交易或自动重试原生交易提交。

全部62笔交易均已最终确认。普通操作原子地更新新实例的私有状态承诺、把序号4递增到5，
消耗恰好一个限定作用域的一次性操作标记（nullifier），并写入恰好一份通用收据v1。
旧实例仍为序号4，命名空间状态根仍为序号6，没有未完成的操作或凭据准备会话。
模板已撤销（3），模块已紧急撤销（6）；撤销后的独立冷读仍能读取并准确核验收据及其交易。
上述英文部分列出了准确交易标识、收据标识及来源账本序号。证明提供器阶段耗时约
29.64分钟，包括载荷准备、进程重置及传输；内存与交换空间的同时合计峰值实测约为
27.03 GiB。内存按Linux资源组（cgroup）的用量统计，包含
归属该组的缓存；完整结果及测量限制见上述证据文件。

第55笔出现SDK最终确认超时；独立准确标识查询确认其在区块3040384成功，随后SDK读取
也与原已平衡交易逐字节一致，未重新提交。第56至58笔由限定三轮的钱包会话完成，该会话
在最大证明前导出检查点并关闭。

第59笔的首次证明在提交前被主机内存保留保护中断。最后样本可用内存244612 KiB，低于
256 MiB保留阈值；证明程序仍在运行且OOMKilled=false，交换空间未耗尽。提交日志恰好
58份，没有wallet-059文件。自有进程均已停止，原交换状态和公开重复路径均已恢复，
具体诊断保存在上述证据文件中。

恢复保留相同真实密钥、合约、固定普通电路、签名、祖先、状态、nullifier及收据v1检查，
使用完整准备检查点而不重放准备交易。只读核验通过了第58笔准确字节、全部58份日志标识
和当前准备进度承诺。TypeScript检查及八项针对性回归通过；此前完整根检查398项通过。
本次恢复未修改合约或电路。

继续使用现有16 GiB主机、14.5 GiB证明硬上限及14.875 GiB主机总交换空间。恢复后的最大
证明使用单CPU／Rayon计算线程，memory.high软回收阈值设为13.5 GiB以更早换页。仍强制
保留256 MiB主机可用内存及768 MiB磁盘空间。最大证明完成后恢复四个CPU／Rayon计算线程，
始终每次只运行一个证明作业。
源码快照为版本12，经过审查的源码和运行脚本包均有本地SHA-256清单。

证明服务器继续固定使用ledger 8.1.3及上述SHA-256对应的既有内存修补二进制程序。
它是在固定镜像上覆盖的自定义程序，不能算作原版上游程序的性能结果。编译器0.31.1、
Compact runtime 0.16.0、客户端ledger 8.1.3、节点ledger 8.1.1及索引器协议1000300均未变更。

撤销后的独立冷读通过，公开证据包已下载，白名单中每个文件的哈希均已核验。凭据及生成
私有值的字面量扫描通过。全部13个承诺恢复的公开路径均已按准确哈希及原元数据／硬链接数
恢复。自有作业全部停止，原交换文件保留且未启用，临时交换文件移除，原交换倾向恢复。
一次性测试凭据为继续经授权的M6测试保留，仍仅root可访问，未包含在下载证据中。

本任务的ECS使用记录已明确结束。最终一次性正常节省停机任务为
`exec-2c7134ede4254282ada2`，已核验等待北京时间**2026-10-19T10:26:52+08:00**，
StopCharging且ForceStop=false。此前定时任务已取消，替换模板逐项核验，实例和磁盘保留，
自动删除期限为空；本次服务器任务停止续期。

本次仅完成用户要求的有状态普通操作链路。完整M6仍为IN_PROGRESS：重放／冲突／过期／
撤销／范围负例、无状态变更操作及剩余运行时矩阵、固定Local Dev节点／索引器中断与重连
验收、最终里程碑证据及必要独立审查仍未结束。合成治理材料不等于独立人工审查或生产就绪，
本次受控测试也不能确定普通用户最低硬件要求或生产时延目标。
