# M6 isolated full-depth action proof with reclaimed public cache space — V8

Real constraint check passed: **True**. Real proof
returned: **True**. Diagnostic elapsed: **1559.450
seconds**; including public-file recovery: **1687.844
seconds**. Final Docker OOMKilled: **False**.
Proof: `4860` bytes; SHA-256 `98f580ca34e3002ef9a42dfa0edca2e9f0c350e13a2f0d46da4ee9dae8aac483`.

The existing 16 GiB server, full depth-16/35-current-status-leaf circuit, generated
keys, V6 client and endpoint-only patched 8.1.3 binary are unchanged from V7.
V7 passed checking but exhausted 13.5 GiB prover RAM plus shared 12 GiB swap
and returned no proof after 1,001.194 seconds. V8 retains the 13.5 GiB prover
and 1 GiB client ceilings and expands shared swap to 15 GiB: the original
8 GiB file plus a 7 GiB temporary file. This is not an end-user resource requirement.

The added space comes from 24 hash-verified pairs of public files temporarily
sharing storage and an unused old dependency tree recoverable exactly from its
retained public archive. All 52,411 regular dependency files match the archive.
The old 424,198,828-byte parameter-cache archive is offloaded with an exact,
hash-verified copy retained under `logs/m6-proof-space-public-recovery-v8/`.
The duplicate paths return to separate files and the dependency tree and original
symlinks are restored and verified after the job. No source, credentials, private
payloads, global tools, instance or disk is deleted or resized.

The job retains a 1 GiB physical-free-disk guard. This count includes filesystem
reserved blocks for the root-run diagnostic; filesystem reservation settings
are unchanged. Space available to unprivileged users is recorded separately.
Minimum physical free space: **1582428160 bytes**;
minimum unprivileged available space: **290918400 bytes**.
Maximum simultaneously sampled application RAM: **13.599 GiB**; swap:
**14.914 GiB**. Counters measure cgroups, not whole-host RSS.

At 2026-10-17T14:31:08.552050+00:00 a separate live cache trial enabled zswap for at most
ten minutes, with its compressed pool capped at 6% of host RAM. The proof was
not restarted and swap capacity was not changed. The original disabled state,
20% limit and other recorded settings were restored automatically and verified.
Peak sampled compressed storage was **978406702
bytes**, with **1037656064 bytes** at the
uncompressed-page sample maximum. These observations do not isolate a speedup.
The [kernel documents runtime switching and compressed swap caching](https://docs.kernel.org/admin-guide/mm/zswap.html).

This is a custom build of exact upstream 8.1.3 with only the endpoint ownership
patch; the cryptographic implementation, native verification and dependency lock
are unchanged. It is not a stock upstream binary result. SDK deserialization and
downloaded proof hashes, when a proof is returned, do not establish independent
cryptographic verification or chain acceptance. The exact upstream source calls
[native verification before returning](https://github.com/midnightntwrk/midnight-ledger/blob/c85535d0ff8e799f629df127c21fa251199b4332/transient-crypto/src/proofs.rs#L766).
The synthetic fixture preserves the entire simulated ledger. Slot provenance,
selected evidence, issuer-policy revalidation, atomic transitions, nullifiers and
common receipts remain outside it; ordinary-action acceptance, M6 completion and
end-user resource qualification remain unclaimed. No wallet, deployment or
transaction is used, and no automatic retry occurs.

Eleven prior sealed groups and production assets are verified unchanged. Results
are downloaded and hash-verified. Owned jobs ended, original inactive swap,
swappiness zero and original swap file identity were restored, temporary swap
removed, and public-file recovery verified. No cloud containers or public
application listeners remain running. Final verified economical-stop deadline:
**2026-10-18T00:40:06+08:00** (Asia/Shanghai), StopCharging, ForceStop=false. Instance and disks
are preserved and automatic deletion is disabled.

---

# M6 回收公开缓存空间后的完整深度独立动作证明 — V8

真实约束检查通过：**True**；返回真实证明：
**True**。诊断耗时 **1559.450 秒**，
包括公开文件恢复共 **1687.844 秒**。
最终 Docker OOMKilled 为 **False**。
证明 `4860` 字节，哈希见上文。

沿用现有 16 GiB 服务器、完整 16 层及 35 个当前状态叶子的电路、密钥、V6 客户端和
仅修改 HTTP 端点所有权的 8.1.3 后端。V7 通过检查，但耗尽 13.5 GiB 证明器内存与
12 GiB 共享交换空间，约 1,001.194 秒后未返回证明。V8 保持证明器 13.5 GiB、
客户端 1 GiB 上限，将交换空间增至原有 8 GiB 加临时 7 GiB，共 15 GiB。这不是
实际用户资源要求。

新增空间来自 24 对已核验哈希的公开文件临时共享存储，以及暂时移出的旧依赖目录。
该目录的 52,411 个普通文件均与保留的恢复归档完全一致。旧参数缓存归档为
424,198,828 字节，已移出服务器，并在上述项目日志目录保留精确且已核验的本地副本。
任务结束后，重复文件恢复为独立文件，依赖目录和原符号链接恢复并核验。没有删除或
扩容源码、凭据、私密载荷、全局工具、实例或磁盘。

本轮保留至少 1 GiB 实际空闲磁盘空间；以 root 运行的诊断采用包含文件系统保留块的
实际空闲计数，未修改保留块设置，另行记录普通用户可用空间。最少实际空闲
**1582428160 字节**，普通用户可用
**290918400 字节**。同时采样的程序内存
峰值 **13.599 GiB**，交换空间峰值 **14.914 GiB**，采用 cgroup 计数而非全机 RSS。

在 2026-10-17T14:31:08.552050+00:00 另行开展最多十分钟的在线 zswap 缓存试验，压缩池最多使用
主机内存的 6%。没有重启证明或改变交换空间容量。原始未启用状态、20% 池上限和其他
记录设置均已自动恢复并核验。采样到的压缩存储峰值为
**978406702 字节**，未压缩页面计数的采样峰值为
**1037656064 字节**；这些观察不能单独证明
提速效果，在线切换能力的官方内核说明见上文链接。

这是准确上游 8.1.3 的端点补丁构建，密码学实现、原生验证及依赖锁不变，不是官方
原版二进制结果。若返回证明，则进行固定 SDK 解析与下载后哈希核验；这不等于独立
密码学验证或链上验收。准确上游源码在返回前调用原生验证。合成样例保持完整模拟账本
编码不变，未覆盖槽位来源、指定证据、发行策略复核、原子状态变更、nullifier 和通用
收据；不宣称普通动作验收、M6 完成或用户资源资格已达标。没有钱包、新部署、交易或
自动重试。

十一组历史证据和已有生产资产均核验未变。结果已下载并核验，自有任务已结束，
恢复原始交换未启用状态、swappiness=0 和原交换文件身份，移除临时交换文件并核验
公开文件恢复。没有运行中的云端容器或公开应用监听。最终核验节省停机时间为北京时间
**2026-10-18T00:40:06+08:00**，StopCharging、ForceStop=false，保留实例和磁盘，禁用自动删除。
