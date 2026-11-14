# M6 action proof with existing-host disk paging — V5

Real constraint check: **True**. Real proof
returned: **False**. Total diagnostic and cleanup:
**755.676 seconds**. Stop reason: `shared-swap-reserve`.
Proof bytes: `None`; proof SHA-256: `None`.

The user directed the continuation to get the flow working on the existing
16 GiB machine and defer end-user memory optimization. V4 removed the artificial
5 GiB cap, allowing 13 GiB prover RAM and 1 GiB client RAM; it passed the real
constraint check but reached the 8 GiB swap reserve before returning a proof.
Its original failed outcome is preserved in `action-proof-16g-v4.md`.

V5 keeps the same 14 GiB combined application RAM, exact circuit/keys, 70-file
public source manifest, client, official 8.1.3 image, single worker and time
bounds. Only paging capacity changes: the existing 8 GiB file plus an exclusively
created, fully allocated 4 GiB temporary file in this new owned run directory.
This uses existing disk space, retains at least 1 GiB free throughout and adds
no cloud resource, RAM grant, disk expansion or machine upgrade. Both process
swap ceilings refer to the same shared 12 GiB total; they are not reservations.
The temporary file is disabled and removed after its exact identity is checked;
the original 8 GiB file and its metadata are preserved.

Maximum simultaneously sampled application RAM: **13.734 GiB**; swap:
**11.873 GiB**. These are cgroup counters rather than whole-host RSS.
Minimum sampled disk free: **1.105 GiB**.
Original measurements, controller/client reports and any returned proof bytes
are downloaded and hash-verified in `logs/m6-action-proof-ecs-v5/`.

This remains the isolated full-depth synthetic action ancestry diagnostic:
35 current-status leaves, both signatures, both scopes, current simulated
allocation/state/root/template/module/policy binding and unchanged encoded
ledger state. No wallet, new deployment, transaction or automatic retry occurs.
Any returned proof is deserialized by the pinned ledger SDK and its downloaded
bytes/hash verified. Independent cryptographic verification, chain acceptance,
ordinary-action acceptance and M6 completion are not claimed. Slot provenance,
selected-record evidence, issuer-policy revalidation, state transitions,
nullifiers and common receipts remain outside this diagnostic circuit.

The exact upstream 8.1.3 source calls native proof verification before its
successful proving response. This source-based inference is documented in
`logs/m6-proof-server-813-public-source/source-findings.json`; it does not
establish a separate independent verifier run or chain acceptance. The same
source has extra owned serialized-key copies worth investigating later, but
no measured memory root cause or saving is established and no backend patch
was used in this run.

The eight previous sealed evidence groups and recorded production source/assets
are reverified unchanged. All owned jobs ended; no running container or public
application listener remains. Original inactive swap and swappiness zero are
restored. Final verified one-time economical stop: **2026-10-18T00:40:06+08:00** (Asia/Shanghai),
StopCharging, ForceStop=false. The instance and disks are preserved and automatic
deletion is disabled. The existing 16 GiB hardware is unchanged.

The pinned upstream image digest is confirmed by the official
[8.1.3 release](https://github.com/midnightntwrk/midnight-ledger/releases/tag/proof-server-8.1.3).

---

# 使用现有主机磁盘换页的 M6 动作证明 — V5

真实约束检查通过：**True**；返回真实证明：
**False**。包括清理在内耗时 **755.676 秒**，
停止原因为 `shared-swap-reserve`。证明字节数为 `None`，
精确哈希见上方英文记录。

按照用户要求，本轮优先在现有 16 GiB 主机上跑通流程，后续再优化实际用户的内存需求。
V4 取消人为设置的 5 GiB 配额，允许证明器 13 GiB、客户端 1 GiB，真实约束检查通过，
但在返回证明前触发原有 8 GiB 交换空间的预留保护；其原始失败记录单独保留。

V5 保持相同的合计 14 GiB 程序内存、电路、证明密钥、70 个公开源文件、客户端、
官方 8.1.3 镜像、单工作线程及时限，仅在原有 8 GiB 交换文件之外，利用现有磁盘空间
独占创建并完整分配 4 GiB 临时交换文件。全程至少保留 1 GiB 空闲磁盘，没有新增云资源、
扩容磁盘、升级机器或更改 RAM 权限。各进程交换上限共享同一总计 12 GiB 容量，
不代表额外预留。结束后核对临时文件身份，再关闭并移除；原有交换文件及元数据保留。

同时采样程序内存峰值 **13.734 GiB**、交换空间峰值 **11.873 GiB**，磁盘空闲
最低 **1.105 GiB**。这些是 cgroup 计数，
不是全机 RSS。完整原始记录和返回的证明均已下载并校验哈希。

该独立诊断使用合成初始状态，覆盖完整祖先链、35 个当前状态叶子、两项签名、两组
范围约束及当前模拟账本绑定，且账本完整编码保持不变。没有加载钱包、新部署、
链上交易或自动重试。返回证明由固定 SDK 解析并校验下载后的字节数／哈希，
不宣称独立密码学验证、链上验收、普通动作验收或 M6 完成。槽位来源、指定记录证据、
发行策略复核、状态变更、nullifier 和通用收据仍不属于此独立电路。

核对的准确上游 8.1.3 源码在成功返回证明前调用原生密码学验证；这是依据固定版本
源码作出的推断，不代表另行运行了独立验证器或通过链上验收。源码还存在可供后续
研究的序列化密钥复制，但尚未测出其内存影响或确认根因，本次没有修改证明器后端。

八组历史封存证据及原有生产源码／资产均重新校验未变。自有任务已结束，原始交换
空间状态和 swappiness=0 已恢复，没有运行中的容器或公开应用监听。最终核验的一次性
节省停机时间为北京时间 **2026-10-18T00:40:06+08:00**，采用 StopCharging、ForceStop=false，保留
实例和磁盘，自动删除已禁用。现有 16 GiB 硬件保持不变。
