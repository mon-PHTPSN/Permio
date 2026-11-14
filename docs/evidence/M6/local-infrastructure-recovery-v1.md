# Owned Local Dev interruption and recovery

Passed on 19 October 2026, 08:42:38 Asia/Shanghai. The existing node and indexer
were stopped gracefully and restarted individually. Both endpoints were observed
unavailable while their exact containers were exited. A new SDK reader process
after each restart read byte-identical serialized contract state and the exact
previously successful allocation transaction. Finalized node height progressed
73062 → 73063 → 73065. Both services returned healthy without recreation.

The target is the pinned Local Dev checkout
`902561ddc27a4b096f19835ab1528f38ace515f1`, node 1.0.0, indexer 4.3.3,
ledger library 8.1.0 and Midnight.js 4.1.1. The historical v8 contract was compiled
with compiler 0.31.1. This tests infrastructure persistence and cold application
reconnect on that historical deployment. It does not validate current v10
ordinary-action proofs on Local Dev or replace any Preprod negative test.

- Contract: `a77a72ffb3c45362d24107885ca530ff26e76040d0545eba32f6776375457ffb`.
- Exact transaction: `0083c67f08a4b1780c17d63529f0af71ffd683d33eedb299492190d624b779b7c0`.
- Serialized contract state SHA-256: `c9132885d8c1a542a7224259270cce03ad16ad4b8945855ba8535fe2c0cf431e`.
- Public transaction SHA-256: `3217f6a2146fe8335b01ca8241c1173f9beaceae334b169e0c954a44c30d60b4`.
- Public report: `logs/m6-local-recovery-2026-10-19T00-41-55.367Z.json`.

```powershell
npm run verify:m6:local-recovery -- --interrupt-owned-local-stack logs/m6-live-2026-10-14T19-07-19.986Z.jsonl
```

The command requires explicit interruption opt-in, checks the checkout revision,
actual image IDs, loopback bindings and original container IDs, and recovers the
affected service in `finally` if a stop acknowledgement or outage check fails.
It creates no wallet, proof, deployment or transaction. No ECS or unrelated
container lifecycle operation is invoked. Container writable layers are retained;
deletion/recreation durability and fresh-chain reproduction are separate tests.
Run it only after confirming that other tasks are not using the two shared Local
Dev services. The full root `npm run check` subsequently passed 402 checks with
zero failures or skips; see `local-infrastructure-recovery-verification.json`.

The first preflight stopped before mutation because the initial guard compared
Docker's actual image identity with a historical Compose label. Independent
`docker image inspect` reads established the actual installed image identities
and source revisions before the corrected guard ran. A read-only baseline also
exposed a Windows Node 24 abrupt-exit assertion; allowing normal SDK teardown
resolved it. Neither failed prerequisite interrupted a service or submitted a
transaction.

# 中文翻译

2026 年 10 月 19 日北京时间 08:42:38 通过。现有节点和索引器分别正常停止并重启。
准确容器处于退出状态时，实际端点均不可用。每次重启后，新建 SDK 读取进程核验序列化
合约状态与此前成功分配交易的字节完全一致。节点最终确认高度依次为 73062、73063、
73065。两项服务均恢复健康，未重建容器。

使用上述固定 Local Dev 版本及历史 v8 合约，验证基础设施状态持久化和应用冷启动重连。
此结果不代表在 Local Dev 验证了当前 v10 普通操作证明，也不替代 Preprod 负例测试。
准确合约、交易、SHA-256 校验值、公开报告及复现命令见上方。

命令要求显式开启中断测试，核验固定源码、实际镜像、回环端口和原容器标识；即使停止
结果不明确或故障检查失败，也会在 finally 中恢复对应服务。不创建钱包、证明、部署或
交易，不调用 ECS 或其他容器的生命周期操作。保留容器可写层；删除／重建后的持久性及
新链复现属于其他测试。
再次执行前须确认其他任务没有使用这两项共享 Local Dev 服务。随后完整根检查通过
402 项，零失败、零跳过；准确命令及日志校验值见验证 JSON。

首次预检因误把历史 Compose 标签当成实际镜像标识而在修改前停止；独立读取实际镜像和
源码版本后修正检查。只读基线还遇到了 Windows Node 24 强制退出断言，改为让 SDK
正常结束后解决。两次先决条件失败均未中断服务、未提交交易。
