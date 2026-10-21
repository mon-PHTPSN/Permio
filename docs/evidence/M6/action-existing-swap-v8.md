# M6 existing-swap continuation — V8

The isolated full-depth action ancestry key build completed with real, nonempty keys. Its exact outcome,
limits, original logs and three-second resource samples are preserved in
`logs/m6-action-keygen-ecs-v8/`. M6 remains incomplete. Production contracts,
bindings, eleven key pairs, manifest, dependency pins and prior sealed evidence
are unchanged. This run submitted zero transactions and deployed no contract.

The public runner `scripts/cloud-m6-action-keygen.py` reuses the reviewed existing
8 GiB `/var/lib/permio-m6/swapfile`. An already active selected file is inherited.
Activating an inactive file requires the explicit host-management option and
root permission; the runner never invokes sudo, allocates a second swap file,
formats, deletes or replaces this file. It checks the canonical regular file,
owner, mode, link count, full allocation, swap header, device and inode. Twelve
policy checks pass both locally and remotely. A bounded allocation additionally
demonstrates actual kernel paging before the build.

The host stays at 16 GiB. The build retains its 14 GiB hard RAM cap, 13.5 GiB soft
cap, two-core quota, one worker, 3,600-second build bound and host/disk reserves.
Only available paging changes to the already allocated 8 GiB file. Observed
cgroup RAM peak is 13.500 GiB; maximum sampled swap is 6.328 GiB.
The exact unit outcome is `success`;
the controller stop reason is `none`. Total build
and cleanup time is 1216.456 seconds. Sampled peaks are
observations, not an assertion that every terminal event was captured.

The complete original inactive-swap state and swappiness zero are restored.
The 8 GiB file retains its size, inode, owner and permissions; ordinary paging
writes occurred, so its contents are not claimed unchanged. Independent checks
confirm all owned jobs/probes ended, all three public parameter hashes remain
valid, no Docker container is running and no application TCP listener is public.
Required outputs are downloaded via official Workbench and hash-verified locally.

The separate `scripts/run-m6-action-boundary-proof.mjs` prepares a synthetic
depth-16 chain with 17 capabilities, 17 accounts and one session. Its preparation
passes stale-status and altered-signature negatives, preserves the entire
encoded simulated ledger and produces a 93,783-byte proof preimage in memory.
It persists no private preimage or witness. Preparation is not real constraint
checking, proof generation, independent cryptographic verification or chain
acceptance. Its optional loopback-only diagnostic HTTP path has no retries;
no production proof-client behavior is changed.

## Bounded runtime continuation

Three separate, serial profiles preserve the same **5 GiB combined client/prover
hard RAM allowance and 8 GiB total shared host swap**. These are cgroup limits,
not total machine RSS including the OS and unrelated/shared page cache. Both
client and prover swap ceilings refer to the same existing file; their values
do not reserve or allocate extra swap. All HTTP operations have zero retries.
No wallet, chain call or production key installation occurs.

| Profile | Observed outcome |
| --- | --- |
| V1 | Real constraint check passes. Client reaches its 4 GiB swap ceiling while about 4 GiB host swap remains free. Memory pressure avg10 reaches 82.55% and a thread waits in `__mem_cgroup_handle_over_high`. The owned client is deliberately stopped; its subsequent systemd `timeout`/signal 9 belongs to stop cleanup, not the 1,950-second execution bound or a recorded OOM. |
| V2 | Same 5/8 GiB totals. A disposable worker uses the official ledger payload API, transfers its buffer and terminates before HTTP. Client swap falls sharply after the handoff. The real check passes and a 678,417,548-byte payload is prepared. Native fetch then fails with TypeError before a proof; its original cause was not retained and remains unknown. |
| V3 | Same totals. Fresh Node HTTP connections stream the exact official payload in 64 KiB chunks with backpressure and an explicit content length. The real check passes and the prover receives/processes the request. The shared-swap reserve guard ends the test before any proof is returned. |

Three focused transport tests pass on Windows Node 24.13.1 and the actual Linux
Node 22.23.2: exact chunk-boundary bytes, safe HTTP-status failures, and timeout
cleanup. The initial Windows sandbox attempt reports localhost EACCES; the
authorized network run passes. V3's pinned server image stays at official 8.1.3,
with one worker, one Rayon thread and a loopback-only port. Prover hard RAM is
4 GiB and client hard RAM 1 GiB. The worker shares the client cgroup and adds no
RAM grant. The temporary worker and streamed transport are diagnostic changes;
the production SDK client is unchanged.

V3 maximum sampled simultaneous RAM is
4.271 GiB and shared swap is
7.983 GiB. Its observed
prover swap peak is 7.863 GiB. The guard sees
only 17,636 KiB swap free; host available RAM is still
at least 10,404,192 KiB. That spare host RAM is outside
the deliberately retained application cap. No OOM is established: the explicit
stop reason is `shared-swap-reserve`, and stopped-container state reports no OOM.
Cleanup takes the total to 240.736 seconds. It stops
the owned client/prover, restores inactive swap and swappiness zero, and preserves
the swap file's identity. Original V1/V2 failures are kept separately.

This demonstrates working existing-file paging and removes the client allocation
and transport obstacles. It does **not** qualify the isolated proof within the
5/8 GiB budget, prove the whole architecture impossible, or establish ordinary
action/M6 acceptance. Native prover memory remains the next bottleneck. Further
equivalent circuit/backend optimization can be investigated without weakening
checks; a different proof architecture would require the workspace's design
decision review before implementation.



Neither reusable-key build resources nor this synthetic preflight qualify the
ordinary-user RAM/latency target. Slot provenance, selected-record evidence,
issuer-policy revalidation, action state transitions/nullifiers/common receipts,
live action acceptance and the remaining runtime/privacy gates are still open.
No ancestry depth, membership, signature, authority or product gate is weakened.

The verified one-time economical-stop deadline is **2026-10-17T21:46:54+08:00**,
execution `exec-fdf4ec5aa203446990ff`, with StopCharging and ForceStop=false.
The instance and disks remain preserved; automatic deletion is disabled. Other
task records are preserved, and any still-active owners remain responsible for
renewal. This finished owner ceases refreshing.

---

本次 V8 使用现有 8 GiB 交换文件，对完整深度动作授权祖先链进行隔离密钥构建。
真实密钥构建成功，连同清理耗时 1216.456 秒；M6 仍未完成。生产合约、绑定、十一对密钥、清单、
依赖版本和此前封存证据保持不变。本次没有发送交易，也没有部署合约。

运行器仅在获得明确主机管理授权和 root 权限时启用尚未激活的指定文件；已激活的
指定文件可直接继承。它检查文件类型、路径、所有者、权限、链接数、完整分配、
交换文件头和文件身份，不自行提权，不新建、格式化、删除或替换交换文件。
本地与远端各十二项策略检查通过，构建前还实际验证了内核换页。

主机仍为 16 GiB。构建保留 14 GiB 内存硬上限、13.5 GiB 软上限、两核配额、
单工作线程、3,600 秒时限，以及主机内存和磁盘预留。只增加可用交换容量到现有的
8 GiB。观察到的内存峰值为 13.500 GiB，采样交换空间峰值为 6.328 GiB。
这些是构建测量，不能用于宣称普通用户运行时的资源目标已经通过。

结束后原有交换空间状态和 swappiness 已恢复，现有文件的大小、inode、所有者和
权限保留；正常换页写入确实发生，因此不声称文件内容不变。独立核验确认任务和
探针结束、公共参数哈希正确、没有运行中的 Docker 容器或公开应用监听端口。
所需结果已通过官方 Workbench 下载并校验哈希。

独立合成预检使用 17 项能力、17 个账户和一个会话，完整覆盖 16 层祖先链。
过期状态和篡改签名的反例均被拒绝，模拟账本状态完全保留，并在内存中准备了
93,783 字节证明输入。预检不等于真实证明、独立密码学验证或链上验收。
剩余运行时、隐私、动作状态变更及回执等验收项仍未完成，所有产品门槛保持不变。

之后三个串行运行时方案均保持客户端／证明器合计硬内存 5 GiB、主机共享交换空间
总量 8 GiB。这是 cgroup 记账上限，不等于包含操作系统和共享页缓存的全机 RSS。
各进程交换空间上限均指向同一现有文件，不代表增加或预留新的交换容量。
全部请求禁用自动重试，没有加载钱包、调用区块链或替换生产密钥。

V1 通过真实约束检查，但客户端用满自身 4 GiB 交换额度时，主机仍有约 4 GiB
交换空间可用。内存压力 avg10 达到 82.55%，线程停在内存回收限速函数中。
该自有客户端被主动结束，随后 systemd 的 timeout／信号 9 属于停止清理，
不是达到 1,950 秒执行上限，也不是已观察到的 OOM。

V2 在同样总预算下使用临时工作线程调用固定版本官方序列化 API，转交缓冲区后
先结束线程，再发送 HTTP。线程结束后客户端交换占用明显下降。真实检查通过，
并准备了 678,417,548 字节请求；随后原生 fetch 出现 TypeError，未返回证明。
该原始错误未保留底层 cause，根因仍未确定，原失败证据没有被覆盖。

V3 通过新的本机连接，以 64 KiB 分块及背压发送完全相同的官方请求字节。
跨分块字节一致、HTTP 错误不泄露正文、超时清理这三项测试，在 Windows
Node 24.13.1 和服务器 Node 22.23.2 上均通过。最初 Windows 沙箱因 EACCES
拒绝回环连接，获准使用网络后测试通过。生产 SDK 客户端保持不变。

V3 真实约束检查通过，证明器收到并处理请求，但最终触发共享交换空间预留保护。
同时采样内存峰值为 4.271 GiB，交换空间为
7.983 GiB，证明器交换峰值为
7.863 GiB。保护触发时只剩 17,636 KiB
空闲交换空间，主机仍至少有 10,404,192 KiB 可用内存；这些空余
主机内存位于保留的应用配额之外，不能用来放宽验收。停止原因是交换空间预留保护，
不是已确认的 OOM；包括清理在内耗时 240.736 秒。

这些结果证实现有文件换页可用，并消除了客户端分配及传输障碍，但尚不能宣称该
证明通过 5／8 GiB 预算，更不能从单次受限诊断推导整个架构不可能。
原生证明器的内存峰值仍是下一项瓶颈。可继续研究不削弱检查的等价电路／后端优化；
若改变证明架构，必须先按照工作区指引进行设计决策审查。

已核验的一次性节省停机期限为 **2026-10-17T21:46:54+08:00**，使用
StopCharging、ForceStop=false；实例和磁盘保留，自动删除已禁用。本任务已结束
续期，其他任务的活动记录保留。
