# M6 full-depth isolated action proof — V7 provided-key ownership patch

Real constraint check passed: **True**. Real proof
returned: **False**. Diagnostic and cleanup elapsed:
**1001.194 seconds**. Stop reason: `None`.
Proof bytes: `None`; SHA-256: `None`.
Final Docker OOMKilled: **True**.

The existing 16 GiB machine runs the unchanged depth-16, 35-status-leaf circuit,
keys and V6 client. The prover has a 13.5 GiB RAM ceiling, the client 1 GiB,
with 8 GiB existing plus 4 GiB temporary shared swap. These diagnostic ceilings
are not end-user hardware requirements. Maximum simultaneously sampled application
RAM was **13.598 GiB**, swap **11.974 GiB**. No machine or disk expansion,
wallet, deployment, transaction, automatic HTTP retry, or public API publication occurred.

The executable is a **locally patched build of exact upstream 8.1.3**, not the
stock upstream binary. Only `proof-server/src/endpoints.rs` differs from commit
`c85535d0ff8e799f629df127c21fa251199b4332`: discard the deserialized HTTP body,
retain a small IR copy for dispatch, and transfer provided key material exactly
once instead of cloning it. The dependency lock, cryptography, native verification,
circuit and keys are unchanged. The original pinned runtime image is used with
its explicit Nix dynamic loader. HTTP version 8.1.3 and the executable hash were
verified before proving; its hash was verified again afterward. The source patch,
locked build, native linkage, transfer integrity and original run evidence are
recorded separately. Memory savings attributable specifically to the ownership
patch have not been isolated experimentally.

The returned proof, when present, is deserialized by the pinned SDK and its bytes
and SHA-256 are verified after download. The exact upstream native implementation
[calls verification before returning](https://github.com/midnightntwrk/midnight-ledger/blob/c85535d0ff8e799f629df127c21fa251199b4332/transient-crypto/src/proofs.rs#L766);
this source inference does not replace an independent verifier run or chain acceptance.
The synthetic fixture checks full ancestry, current status, two signatures/scopes
and simulated ledger bindings, preserving the entire encoded ledger. Slot provenance,
selected evidence, issuer-policy revalidation, atomic transitions, nullifiers and
common receipts remain outside this diagnostic. Ordinary-action acceptance,
M6 completion and end-user resource qualification remain unclaimed.

Ten prior sealed groups and production assets are verified unchanged. All owned
jobs ended; original inactive swap, swappiness zero and existing file identity were
restored. Temporary swap was removed. Results are locally downloaded and hash-verified.
No running cloud containers or public application listeners remain. Final verified
economical-stop deadline: **2026-10-18T00:40:06+08:00** (Asia/Shanghai), StopCharging, ForceStop=false.
The instance and disks are preserved and automatic deletion is disabled.

---

# M6 完整深度独立动作证明 — V7 密钥所有权补丁

真实约束检查通过：**True**；返回真实证明：
**False**。包括清理共耗时 **1001.194 秒**，
停止原因 `None`。证明为 `None` 字节，哈希见上文。
最终 Docker OOMKilled 为 **True**。

沿用现有 16 GiB 机器、完整 16 层及 35 个状态叶子的电路、密钥和 V6 客户端。
证明器内存上限 13.5 GiB，客户端 1 GiB，共享原有 8 GiB 加临时 4 GiB 交换空间。
这是诊断配额，不是实际用户硬件要求。同时采样的程序内存峰值 **13.598 GiB**、
交换空间峰值 **11.974 GiB**。没有机器或磁盘扩容、钱包、新部署、交易、HTTP 自动重试
或公开 API。

此结果来自准确上游 8.1.3 的本地补丁构建，不是官方原版二进制。仅 HTTP 端点源码
有差异：反序列化后丢弃请求体，仅保留分派需要的小型 IR 副本，并一次性转移提供的
密钥材料，避免重复拷贝。依赖锁、密码学及原生验证、电路和密钥均未改变。固定官方
运行镜像通过其 Nix 动态加载器运行该二进制。证明前核验 HTTP 版本 8.1.3 和文件哈希，
结束后再次核验哈希。补丁、固定构建、动态链接、传输校验及原始运行证据均单独保存。
尚未通过对照实验单独测定此所有权补丁的内存节约量。

若返回证明，则由固定 SDK 解析，并在下载后核验字节数和 SHA-256。准确上游源码
在返回前调用原生验证，这是源码推断，不替代独立验证器或链上验收。合成样例核验
完整祖先链、当前状态、两项签名及范围和模拟账本绑定，账本完整编码保持不变。
槽位来源、指定证据、发行策略复核、原子状态变更、nullifier 和通用收据仍在此诊断
之外；不宣称普通动作验收、M6 完成或最终用户资源要求达标。

十组历史证据和已有生产资产均核验未变。自有任务均已结束，恢复原始交换未启用状态、
swappiness=0 和既有文件身份，移除临时交换文件。结果已下载并核验，没有运行中的云端
容器或公开应用监听。最终核验节省停机时间为北京时间 **2026-10-18T00:40:06+08:00**，StopCharging、
ForceStop=false，保留实例和磁盘，禁用自动删除。
