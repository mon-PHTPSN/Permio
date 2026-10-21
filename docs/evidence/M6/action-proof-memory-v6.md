# M6 action proof, request-memory correction — V6

Real constraint check: **True**. Real proof returned:
**False**. Diagnostic plus cleanup: **758.482
seconds**. Stop reason: `None`. Returned proof: `None`
bytes; SHA-256 `None`. Request-buffer release events: **1**.
Final Docker prover OOMKilled: **True**.
The proposed extra 256 MiB adjustment was not applied: the prover had already
exited and its final 13.5 GiB memory limit was independently verified unchanged.

The existing 16 GiB machine is unchanged. V4's 14 GiB application/8 GiB swap
and V5's 14 GiB application/12 GiB swap runs passed checking but were stopped
by a swap-reserve guard; their original failures remain separate evidence.
V6 releases the approximately 647 MiB sent request buffer while waiting for
the response and requests collection of unreachable buffers. It allows 13.5 GiB
prover RAM plus a 1 GiB client ceiling, with the same 8 GiB existing and 4 GiB
temporary swap files. These are diagnostic ceilings, not end-user requirements.
The independent swap-reserve stop is removed; actual owned-prover OOM and host
512 MiB available-RAM/1 GiB free-disk guards remain. HTTP/prover time allowance is
one hour, and the whole diagnostic is bounded at 3,800 seconds. No automatic
retry, backend patch, machine upgrade, cloud resource or disk expansion occurs.

Maximum simultaneously sampled application RAM: **13.605 GiB**; swap:
**11.970 GiB**. These are cgroup counters rather than whole-host RSS.
Four transport checks pass on both Windows and the actual pinned Linux Node
22.23.2: exact bytes across chunks, sanitized HTTP error, timeout cleanup, and
body-flushed notification before a delayed response. The 73-file public source
manifest, original client/controller reports, samples and proof bytes are
downloaded and hash-verified in `logs/m6-action-proof-ecs-v6/`.

The diagnostic circuit, keys and official 8.1.3 backend image are unchanged.
The pinned upstream source calls native verification before returning a proof;
this is a source-based inference, not an independent verifier run. See
[the exact source](https://github.com/midnightntwrk/midnight-ledger/blob/c85535d0ff8e799f629df127c21fa251199b4332/transient-crypto/src/proofs.rs#L766).
The isolated synthetic fixture covers full depth-16 ancestry, 35 current-status
leaves, both signatures/scopes and current simulated ledger bindings, while
preserving the entire encoded ledger. No wallet, new deployment or transaction
is involved. Slot provenance, selected evidence, issuer-policy revalidation,
state transitions, nullifiers, common receipts and chain acceptance remain
outside this diagnostic. Ordinary-action/M6 acceptance and end-user resource
qualification remain unclaimed.

Nine prior sealed evidence groups and recorded production source/assets are
verified unchanged. Owned jobs ended; the temporary swap file is removed after
identity verification and original inactive swap/swappiness-zero settings are
restored. No running containers or public application listeners remain. Final
verified economical-stop deadline: **2026-10-18T00:40:06+08:00** (Asia/Shanghai), StopCharging,
ForceStop=false. Instance and disks are preserved; automatic deletion is disabled.

---

# M6 动作证明，请求内存修正 — V6

真实约束检查通过：**True**；返回真实证明：
**False**。包括清理在内耗时 **758.482 秒**。
停止原因 `None`。返回证明 `None` 字节，哈希见上文。
记录到请求缓冲区释放事件 **1** 次。
最终 Docker 证明器 OOMKilled 标记为 **True**。
计划追加的 256 MiB 没有生效：证明器此前已经结束，最终仍为 13.5 GiB 上限，已独立核验。

现有 16 GiB 机器保持不变。V4 的 14 GiB 程序内存／8 GiB 交换空间，以及 V5 的
14 GiB／12 GiB 都通过检查，但被交换预留保护提前停止，原始失败分别保留。
V6 在请求发送完成后释放约 647 MiB 缓冲区并请求回收无引用缓冲区；证明器上限
13.5 GiB、客户端上限 1 GiB，仍使用原有 8 GiB 和临时 4 GiB 交换文件。这是诊断
配额，不是最终用户硬件要求。取消单独的交换空间预留中止，保留真实自有证明器
OOM、主机至少 512 MiB 可用内存及 1 GiB 空闲磁盘保护。HTTP／证明器允许一小时，
整个诊断最多 3,800 秒，没有自动重试、后端补丁、机器升级、云资源新增或磁盘扩容。

同时采样的程序内存峰值 **13.605 GiB**、交换空间峰值 **11.970 GiB**，这是
cgroup 计数而不是全机 RSS。四项传输检查均在 Windows 和固定 Linux Node 22.23.2
通过，分别检查精确分块字节、错误脱敏、超时清理及发送完成通知。73 个公开源文件
的清单、原始记录及返回证明均已下载并校验哈希。

电路、密钥和官方 8.1.3 镜像均未改变。准确上游源码在返回证明前调用原生验证，
这是源码推断，不是另行运行独立验证器。本轮仍是完整 16 层祖先、35 个当前状态叶子、
两项签名／范围和当前模拟账本绑定的合成诊断，账本完整编码保持不变。没有钱包、
新部署或链上交易。槽位来源、指定证据、发行策略复核、状态变更、nullifier、通用
收据及链上验收仍不属于此诊断；不宣称普通动作／M6 验收或用户资源要求已达标。

九组历史证据和原有生产源码／资产均核验未变。自有任务已结束，临时交换文件在
核验身份后移除，原始交换未启用状态和 swappiness=0 已恢复，没有运行中的容器
或公开应用监听。最终核验节省停机时间为北京时间 **2026-10-18T00:40:06+08:00**，采用 StopCharging、
ForceStop=false，保留实例和磁盘，自动删除已禁用。
