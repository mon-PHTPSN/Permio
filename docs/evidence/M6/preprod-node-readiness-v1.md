# Awaited Preprod node readiness

V7 stalled while the wallet's default submission service initialized node
metadata in the background. Immediately before ending the owned child with
exit code 75, a paused runtime inspection found zero ready SDK submission
clients and one disconnected API whose metadata was unavailable. Its two
public candidate identifiers remained absent from the indexer and pending
pool. Non-inclusion alone is not proof of rejection; no RPC rejection receipt
was obtained. The private fixture was preserved.

Separate read-only probes loaded metadata in Windows, WSL, and the same
isolated systemd runtime. An A/B probe also reproduced a distinct disconnect
race: `disconnect()` returned with a stale connected flag, and the immediate
read failed; waiting for actual disconnection allowed the read to succeed.
Neither result establishes the cause of V5's earlier balancing failure.

`preprod-node-submission.ts` now supplies the SDK's supported submission-service
factory. It awaits metadata and the exact Preprod genesis before wallet start
or synchronization, with a 60-second initialization deadline. It retains the
initial ready connection, uses the pinned SDK node client and finality events,
limits reconnect waits to 30 seconds, and requires the previous disconnect to
settle before another send. It does not retry submissions or change transaction
bytes, wallet signatures, proofs, contracts, receipts, or dependency versions.
Initialization failures expose fixed node-connection phases without raw URLs
or private SDK errors.

Four focused tests cover delayed readiness, wrong genesis, initialization
failure/timeout cleanup, original SDK Finalized results, no repeated send, and
the stale disconnect flag. All 355 root checks pass. A live read-only factory
probe under the same isolation connected, verified genesis, and closed without
loading a wallet or submitting a transaction. V8 subsequently confirmed the
first 11 governance transactions, including template activation, with independent
indexer verification. Its next contract proof hit the prover memory limit before
submission. Same-contract recovery and the final acceptance result are recorded
in `preprod-governance-memory-recovery-v1.md` and
`preprod-governance-v2-verification.json`; the V5 balancing cause remains unknown.

The final governance transaction was independently confirmed in a canonical
finalized block while its SDK Finalized callback remained pending. Current
submission waits now expire after 120 seconds, interrupt the SDK stream, release
its subscription, and close that service. A safe finality-timeout requires
independent reconciliation before another submission; no receipt is fabricated.
The new lost-notification regression passes. Live funded validation of this
post-run deadline guard has not been repeated.

# 明确等待 Preprod 节点就绪

V7 在钱包默认提交服务后台初始化节点元数据时停滞。在以退出码 75 结束所属子进程
之前，暂停运行时的检查发现：可用 SDK 提交客户端数量为零，唯一的 API 已断开，
元数据不可用。其两个公开候选标识始终未出现在索引器及待处理池中。仅未被收录
不能证明交易被拒绝；本次没有取得 RPC 拒绝回执。私有测试材料已保留。

独立只读探测在 Windows、WSL 及相同隔离的 systemd 环境中成功加载元数据。
A/B 探测还复现了另一项断开竞态：disconnect() 返回时连接标志尚未更新，立即读取
失败；等待实际断开后，读取成功。这两项结果均不能确定 V5 更早的配平故障原因。

preprod-node-submission.ts 现通过 SDK 支持的提交服务工厂接入。它在钱包启动或
同步之前等待元数据及准确的 Preprod 创世区块，并设置 60 秒初始化期限。保留初始
就绪连接，继续使用固定版本的 SDK 节点客户端及最终确认事件，将重连等待限定为
30 秒，并要求前次断开状态稳定后才能再次发送。不自动重试提交，不改变交易字节、
钱包签名、证明、合约、回执或依赖版本。初始化故障只公开固定节点连接阶段，不
输出原始 URL 或私密 SDK 错误。

四项针对性测试覆盖延迟就绪、错误创世区块、初始化失败／超时清理、原 SDK 的
Finalized 结果、不重复发送及过时的断开标志。全部 355 项根检查通过。实网只读
工厂探测在相同隔离条件下完成连接、创世区块核验及关闭，没有加载钱包或提交交易。
随后 V8 确认了前 11 笔治理交易，包括模板激活，并经独立索引器核验。下一笔合约
证明在提交前触及证明器内存上限。同一合约的恢复及最终验收结果记录于
`preprod-governance-memory-recovery-v1.md` 和 `preprod-governance-v2-verification.json`；
V5 的配平故障原因仍未确定。

最后一笔治理交易已独立确认位于规范链最终确认区块中，但 SDK 的 Finalized 回调
始终未返回。当前提交等待现于 120 秒后超时，中断 SDK 事件流、释放订阅，并关闭
该服务。安全的 finality-timeout 要求再次提交前先独立核对结果；不会伪造回执。
新增的通知丢失回归测试通过。这项实网运行后添加的期限保护尚未重复进行消耗测试
手续费的实网验证。
