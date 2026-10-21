# M6 action proof on the existing 16 GiB host — V4

The new wallet-free depth-16 action diagnostic **did not return a proof**. Real constraint
checking passed: **True**. Proof generation passed:
**False**. Total diagnostic and cleanup time:
**370.811 seconds**. Stop reason: `shared-swap-reserve`.

## Resource scope

The user explicitly directed this continuation to use the existing 16 GiB
machine and remove the previously self-imposed 5 GiB application test limit.
This run allows **13 GiB prover RAM + 1 GiB client RAM = 14 GiB application
RAM**, plus the same existing **8 GiB shared swap file**. A separate controller
has a 512 MiB cap. Remaining physical memory is left for the operating system.
These limits describe this diagnostic; they are not an end-user requirement.
The machine, disk and swap file were not enlarged or replaced.

Maximum simultaneously sampled application RAM is **13.671 GiB** and swap
is **7.997 GiB**. These are cgroup counters, not whole-machine RSS.
Measurements, exact image/source/key hashes, the original client/controller
reports and complete resource samples are in `logs/m6-action-proof-ecs-v4/`.
The 70-file public source manifest, circuit, keys, client and official 8.1.3
image are unchanged from V3; the new controller records the larger allowance.
No automatic retry occurred.

## Verification boundary

This uses a synthetic genesis fixture: complete depth-16 capability ancestry,
35 current-status leaves, two signatures, both seven-dimensional scopes and
the current simulated allocation/state/template/module/root bindings. The
entire encoded simulated ledger remains unchanged. It is a feasibility proof
diagnostic, not a production action transaction. No wallet is loaded, no new
contract is deployed and no transaction is submitted. A returned proof is
deserialized by the pinned SDK and its bytes/hash are verified after download;
independent cryptographic verification and chain acceptance are not claimed.
Slot provenance, selected-record evidence, issuer-policy revalidation, state
transitions, nullifiers and common receipts remain outside this isolated
circuit. M6 completion and end-user resource qualification remain unclaimed.

Seven prior sealed evidence groups and all recorded production source/assets
are reverified unchanged. This separate result does not rewrite the failures
under the earlier 5 GiB profile. The current public diagnostic controller is
`scripts/cloud-m6-action-proof-16g.py`; historical scripts remain unchanged.

## Server closeout

All owned jobs ended and required artifacts were downloaded and hash-verified.
The original inactive swap state, VM setting and swap file identity were
restored. No containers or public application listeners remain running.
The final independently verified one-time economical-stop deadline is
**2026-10-18T00:40:06+08:00** (Asia/Shanghai), `StopCharging`, `ForceStop=false`.
The instance/disks are preserved and the automatic deletion deadline is empty.

---

# 现有 16 GiB 主机上的 M6 动作证明 — V4

本轮不加载钱包的完整 16 层动作诊断结果：真实约束检查通过为
**True**，生成真实证明通过为
**False**。包括清理在内耗时 **370.811 秒**，
停止原因为 `shared-swap-reserve`。

按照用户本轮要求，取消此前人为设置的 5 GiB 程序测试上限，改用证明服务器
13 GiB、客户端 1 GiB，合计 14 GiB，并继续使用原有的 8 GiB 共享交换文件。
独立控制器另有 512 MiB 上限，其余物理内存留给操作系统。这只是本轮诊断配额，
不是实际用户的硬件要求。没有升级机器、扩容磁盘或更换交换文件。
同时采样的程序内存峰值为 **13.671 GiB**，交换空间峰值为 **7.997 GiB**；
这是 cgroup 计数，不是全机 RSS。原始记录和校验结果见上述日志目录。

电路、证明密钥、客户端、70 个公开源文件及固定的官方 8.1.3 镜像均与 V3 保持一致。
本轮没有自动重试。合成初始状态覆盖完整祖先链、35 个当前状态叶子、两项签名、
两组七维范围约束及当前模拟账本绑定，且模拟账本完整编码未改变。
这是独立可行性诊断，没有加载钱包、新部署或链上交易。返回的证明使用固定 SDK
解析，下载后校验字节数和哈希；不宣称已经独立完成密码学验证或链上验收。
槽位来源、指定记录证据、发行策略复核、状态变更、nullifier 和通用收据仍在此
独立电路范围之外。M6 尚未完成，也尚未证明普通用户资源要求。

七组历史封存证据和已有生产源码／资产均重新校验未变；没有改写此前受限配额的失败记录。
自有任务已结束，必要结果已下载并核验，原始交换空间启用状态、VM 设置和文件身份已恢复。
没有运行中的容器或公开应用监听端口。最终一次性节省停机期限为北京时间
**2026-10-18T00:40:06+08:00**，使用 StopCharging、ForceStop=false，保留实例和磁盘，自动删除期限为空。
