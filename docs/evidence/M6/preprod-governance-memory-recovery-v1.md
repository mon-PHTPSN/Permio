# Same-contract Preprod governance recovery

The on-chain governance sequence is independently verified: 17 successful
transactions in canonical finalized blocks, nine generated Compact preflight
negative checks, authority root version/sequence 2/2, module status 6 and registry
sequence 8, and historical template status 3 with lifecycle sequence 3. The last
SDK confirmation callback was missing, so only 16 SDK returns are recorded.
The owned client was closed after independent finality and all public-state
assertions passed. No SDK return, receipt or final-runner assertion event was
invented. The runner is not reported as a clean pass. The callback-loss cause
remains unresolved; full M6 runtime and receipt acceptance remain open.

Future submissions now have a 120-second confirmation deadline. Expiry produces
a safe `finality-timeout`, releases the SDK subscription, and closes that
submission service so an outcome that may already be on-chain cannot be
automatically repeated. It does not synthesize a receipt or retry a transaction.
The regression uses the actual SDK event parser with a Submitted notification
and a deliberately missing Finalized notification. This guard was added after
the live run and has not been validated by an additional funded transaction.

V8 confirmed the first 11 governance transactions on
`47514e87fc1f22c615a9f69a90ce6e4352f6e0d78c1f7c748c8cf36ff4bca084`.
The template activation succeeded and admission replay was rejected by generated
Compact preflight. All 22 candidate identifiers independently resolved to 11
successful indexed transactions. The first authority-root approval then failed
while proving, before balancing or submission. The owned prover's systemd result
was `oom-kill`, exit status 9. Its configured limits were 4 GiB RAM and 1 GiB swap.
The live sampler ended when the cgroup disappeared and missed the final OOM
counter; its zero sampled OOM value does not override the service exit result.
The exact reason for the prover's working-set growth is not established.

The original owner-only M4 fixture was saved before wallet access. The V9
continuation reads that local file, verifies its owner, permissions and real
path, reconstructs the governance registry, revalidates both existing signed
reviews, and compares the rebuilt record, activation and configured bindings.
It then connects to the existing contract and verifies the network, policy,
authority root, thresholds, module and template, and absence of pending sessions,
root approvals, allocations and credential changes. A mismatch aborts before
proof or submission. No new deployment is performed.

The ignored continuation snapshot preserves the original authority-rotation,
module-deprecation/revocation and template-retirement/revocation tail, including
its negative checks and final assertions. Registry keys are read from the real
on-chain entries rather than reconstructed SDK receipts. Provenance records the
original source hash and transformed tail hashes. Six successful transactions
remain, and the submission budget is six with no automatic retry. The owned
loopback-only prover is restarted before each contract proof, with the same
resource caps, pinned binary, public parameters and single-worker settings.
Restart invocation IDs and actual cgroup counters are recorded. This operational
recovery does not establish ordinary-action performance or complete M6.

V9 confirmed both root approvals and module deprecation/revocation, bringing
the sequence to 15 successful transactions. All prover memory-event counters
remained zero; the peak was 3,943,636,992 bytes with no sampled swap. Template
retirement then failed at the SDK's 30-second node connection guard. The pinned
SDK executes that guard before its transaction-send stream. The two candidate
identifiers were not indexed, the pending pool was empty, and the template was
still active; absence alone is not evidence of RPC rejection. A fresh read-only
WebSocket reconnect/header check passed. V10 resumes only retirement/revocation,
with a two-attempt limit and all original final assertions. The failed connection
attempt remains in the composite trace. The independent reader must still
verify exactly 17 successful transactions, while separately accounting for that
unreturned pre-send attempt; it must not manufacture a successful SDK return.

The independent full reader must verify all 17 transactions and the final
authority/module/template state. Original and resumed trace rows are preserved
byte for byte in a composite trace with an explicit provenance boundary. A local
worker success or template activation alone is insufficient for acceptance.
The final result is recorded in `preprod-governance-v2-verification.json`.
Earlier V5 balancing failure remains unresolved and is not reclassified by this
later run. Private fixture caches remain local and owner-only for continuing
M6 diagnostics; they contain no reviewer signing private keys or wallet secrets.

# 同一合约上的 Preprod 治理恢复

链上治理序列已通过独立核验：17 笔成功交易均位于规范链的最终确认区块中，九项
生成的 Compact 预检负向检查齐全，权限根版本／序号为 2／2，模块状态为 6、注册
序号为 8，历史模板状态为 3、生命周期序号为 3。最后一次 SDK 确认回调缺失，因此
实际只记录了 16 次 SDK 返回。在独立最终性及全部公开状态断言通过后，已关闭本任务
所属客户端。没有伪造 SDK 返回、回执或 runner 最终断言事件，也没有将 runner 报告
为干净通过。回调丢失的具体原因仍未确定；完整 M6 运行时及回执验收仍待完成。

后续提交现有 120 秒确认期限。超时会产生安全的 `finality-timeout`，释放 SDK 订阅，
并关闭该提交服务，防止自动重复一笔可能已经上链的交易。不会合成回执或自动重试。
回归测试使用真实 SDK 事件解析器，接收 Submitted 通知后故意缺失 Finalized 通知。
这项保护是在实网运行之后添加的，尚未通过额外消耗测试手续费的交易验证。

V8 在上述合约上确认了前 11 笔治理交易。模板激活成功，准入重放被生成的 Compact
预检拒绝。全部 22 个候选标识经独立查询对应 11 笔已成功收录的交易。随后首笔权限根
批准在证明阶段失败，尚未进入配平或提交。所属证明器的 systemd 结果为 `oom-kill`，
退出状态为 9，资源上限为 4 GiB 内存及 1 GiB 交换空间。实时采样器在 cgroup 消失时
结束，未捕获最后的 OOM 计数；采样中的零值不能覆盖服务退出结果。证明器工作集增长
的具体原因尚未确定。

原始 M4 测试材料在访问钱包前已保存为仅属主可读写的本地文件。V9 续跑读取该文件，
检查属主、权限及真实路径，重建治理注册表，重新验证两份已签名复核，并比对重建的
记录、激活记录及配置绑定。随后连接现有合约，核验网络、策略、权限根、阈值、模块、
模板，以及没有待处理会话、权限根批准、实例分配或凭证变更。任何不一致均在证明或
提交前终止。本次不新建部署。

被忽略的续跑快照保留原程序的权限根轮换、模块弃用／撤销及模板退役／撤销后半段，
包括负向检查与最终断言。注册键来自真实链上记录，不伪造 SDK 回执。溯源记录包含
原始源码及变换前后程序尾部的摘要。剩余六笔成功交易，提交预算为六笔，不自动重试。
每次合约证明前重启本任务所属、仅监听回环地址的证明器，保持资源上限、固定二进制、
公开参数及单工作线程设置。记录重启标识和实际 cgroup 计数。这项运行恢复不构成
普通操作性能验收，也不代表完整 M6 完成。

独立完整读取程序必须核验全部 17 笔交易及最终权限／模块／模板状态。组合轨迹逐字节
保留原运行和续跑的记录，并明确标记溯源边界。仅本地程序成功或模板激活不足以验收。
最终结果记录于 `preprod-governance-v2-verification.json`。更早 V5 的配平故障原因仍
未确定，不依据后续运行重新归类。私有测试材料保留在本地，仅属主可访问，供后续 M6
诊断使用；其中不包含复核签名私钥或钱包秘密。

V9 确认了两笔权限根批准，以及模块弃用／撤销，使整个序列达到 15 笔成功交易。
证明器各项内存事件计数始终为零，峰值为 3,943,636,992 字节，采样未发现交换空间
使用。随后模板退役在 SDK 的 30 秒节点连接检查处失败。固定版本 SDK 在交易发送
流之前执行该检查。两个候选标识未被索引，待处理池为空，模板仍然激活；仅未被收录
不能作为 RPC 拒绝的证据。新的只读 WebSocket 重连／区块头检查通过。V10 仅续跑
模板退役／撤销，最多尝试两次，并保留原有最终断言。连接失败尝试仍保留在组合轨迹
中。独立读取程序仍须核验准确的 17 笔成功交易，并单独记录该次未返回成功的发送前
尝试，不能伪造成功的 SDK 返回事件。
