# M6 Preprod runtime continuation, 17 October 2026

M6 remains incomplete. The earlier contract's 17 governance transactions are
independently finalized. The new controlled runtime attempt deployed
`7d40639830890a77cfc5e7aa447610095458dfb3f8e7f5c2a70d9ce83df7f567` and
proposed its proof module. Both transactions succeeded in canonical finalized
blocks. Its first module review was rejected with RPC 1010/custom 170
(`InvalidDustSpendProof`). Allocation, credential issuance and slot management
were not reached. The failure's cause remains unresolved. There is no ordinary
action receipt or full M6 acceptance.

The baseline is `f2d8689f95d9294a92f6b2e2b8718d31121dde81`, branch
`feat/m6-m8-midnight-delivery`, with preexisting uncommitted work preserved.
The dependency lock and contract are unchanged. The server uses Node 22.23.2,
Compact compiler 0.31.1/runtime 0.16.0, ledger SDK 8.1.0 and official proof-server
8.1.3, digest `sha256:0f4ab0716985eaebbe55a970348f52ff05ffd8a96631ed7232bd0c4ba02c115c`.
The [official compatibility matrix](https://docs.midnight.network/relnotes/support-matrix)
supports this Ledger 8 toolchain; no Ledger 9 migration was substituted.

The runner saves optional private recovery checkpoints before allocation,
account issuance and slot-command calls. Prepared checkpoints assert neither
submission nor acceptance. The wallet now waits for the current SDK synchronized
state and positive spendable DUST before every balance operation, rather than
reusing startup readiness. Waiting is bounded to 60 seconds and interrupted on
scope closure; cleanup joins pending operations. Closed-wallet calls remain
synchronous failures; SDK balancing errors retain their identity inside the
scope. Three regression cases cover stale synchronization, exhausted DUST and
closure while waiting. All 359 root checks pass: 353 Node tests and six Hardhat
tests. Output `logs/m6-runtime-balance-readiness-root-check-20261017.txt` has
SHA-256 `967558a09e269e47433df6898549bd52b043a2a0e63f6cb80dca562f6f8e88de`.
This guard is not an established fix for error 170.

After large Workbench/OSS transfers timed out, the installed, hash-matched
`midnight-zkir 2.1.0` regenerated all 11 prover/verifier key pairs from the exact
public programs and parameters. Every pair matches the original manifest byte
for byte. Reproduction took 1176.724 seconds, with cgroup memory peak
5,369,212,928 bytes. This measures key construction, not transaction proving
latency. The keygen cleanup unit failed to disable swap; independent host
recovery subsequently verified swap disabled and swappiness restored to zero.
The original failure and unresolved cleanup cause remain preserved. An actual
npm package download also matches the dependency lock's integrity value.

The first runtime preflight used a Docker internal network. Docker accepted the
requested publication, but its effective mapping was absent and loopback health
failed. That attempt initialized no wallet and sent no transaction. The correction
uses a dedicated NAT bridge with explicit `127.0.0.1:6300:6300` publication.
Effective Docker mappings, host listeners, loopback HTTP 200 and nonloopback
denial were checked before plaintext test provisioning. The daemon's private
defaults and cloud boundary are preserved. Docker's
[port-publishing documentation](https://docs.docker.com/engine/network/port-publishing/)
and [internal-network discussion](https://github.com/moby/moby/discussions/53256)
support inspecting effective publication rather than only the requested mapping.

The exact Singapore instance's sole security group has only that instance as a
member and allows SSH only from Workbench's private management range. No public
developer-API or IPv6 allow rule exists. Public-network capability and outbound
access remain available. An external probe received zero application bytes;
its inconsistent TCP handshake does not alone prove persistent access control.
Effective cloud rules and actual loopback listeners provide the primary evidence.
No public website was deployed.

Only explicitly disposable Preprod wallet inputs, three snapshots and a
replaceable test provider credential were provisioned. AES-256-GCM with a
server-held RSA-OAEP-SHA256 key ensures the OSS intermediary receives ciphertext
only. Root-only plaintext stayed outside source, images and public document
roots. Alibaba credentials, local-network example mnemonics, private agent
instructions and existing private flow payloads were excluded. After the failed
runtime, the client/prover stopped, dedicated containers/networks and temporary
plaintext/transport material were removed, swap was disabled and swappiness
restored. One owner-only synthetic governance fixture is deliberately retained
on the server for continuing M6 recovery.

The live attempt records three submission-boundary observations and two SDK
returns. Independent reconciliation confirms two successes and reads state at
canonical finalized block 3012987: module proposed, authority version/sequence
1/1, registry sequence 1, no active template or runtime instance. The third
candidate is not indexed; absence alone is not rejection evidence, so the
captured RPC 1010/170 is kept separately. Rejected transaction bytes were not
retained; their DUST contents cannot be reconstructed from public traces.
The original controller's flat `walletInitialized=false` was a preparation-stage
field mistakenly left unchanged. Wallet initialization and two submissions did
occur, as worker observations and chain evidence show. The original report is
preserved rather than silently rewritten.

Primary evidence is in `preprod-runtime-ecs-v1-verification.json`,
`logs/m6-runtime-ecs-v7-public/` and
`logs/m6-preprod-runtime-public-reconciliation-1792196063960.json`. The first
preflight failure is under `logs/m6-runtime-preflight-v6-public/`. A later
non-submitting review diagnostic exercises the guard against the existing
contract, with a hard submission interceptor and no wallet-submit call. Its
outcome is recorded separately and cannot retroactively validate or replace the
rejected candidate. The HTTP capability-list query failed; earlier dry-run and
runtime validation probes did not yield usable transaction validity results.

The non-submitting diagnostic completed contract proving and wallet balancing,
then intercepted a candidate containing one DUST spend. Read-only runtime
validation returned RPC 4003 without a validity result. An unsigned empty remark
also returns 4003 with a WASM trap/panic marker, so this is not evidence that the
review candidate is invalid. The harness then failed because it expected its
owned interceptor error unchanged; the pinned SDK wraps root submission errors
with `cause`. The original failed outcome is preserved. A corrected bounded
cause check passes three focused tests, including the actual SDK wrapper, but
the corrected worker has not been rerun. Independent inspection afterward
verifies the latest indexed contract action is still the proposal at canonical
finalized block 3012987, with review count zero and no runtime instance. The
initial attempt to query an arbitrary finalized-head offset failed and is not
claimed as a successful state read. No diagnostic transaction was submitted.

Active work refreshes a verified one-time graceful `StopCharging` deadline two
hours ahead at least every 30 minutes. A thread heartbeat backs up the active
owner's CLI refresh. A previous scheduler read timeout/cancellation is preserved;
subsequent renewal succeeded. Final scheduling requires owned jobs stopped,
temporary test credentials removed and public results downloaded/verified.
Instance and disks are preserved; no automatic deletion or broader RAM grant is
introduced. The diagnostic prover's 11.5 GiB maximum and temporary 8 GiB swap
are a server diagnostic profile, not smaller product-memory acceptance. Runtime,
common receipt, privacy, replay/restart and downstream gates remain open.
Local Docker Desktop returned HTTP 500; local node/indexer restart acceptance
is not established. The original v1 document is retained as a preparation note.

---

M6 仍未完成。之前合约的 17 笔治理交易已独立最终确认。本次新合约完成部署及证明
模块提案，两笔交易均在规范链最终确认区块中成功。第一笔审核返回 RPC 1010／170
（InvalidDustSpendProof，DUST 支出证明无效）。尚未到达实例分配、凭证签发或槽位
管理，根因未明；没有普通操作收据或完整 M6 验收结果。

基线、分支及已有未提交工作均被保留。依赖锁文件和合约未变；服务器使用上述固定
版本及镜像摘要。官方兼容矩阵支持这套 Ledger 8 工具链，未改用 Ledger 9 绕过故障。

运行器在分配、账户签发及槽位命令前保存可选私有检查点，准备完成不代表提交或
接受。钱包现于每次配平前等待当前 SDK 同步状态并检查正数可用 DUST，不再复用
启动时就绪结论。等待上限 60 秒，关闭作用域时中断，清理会等待相关操作结束。
关闭的钱包仍同步拒绝调用，SDK 错误在内部保留原身份。新增三项测试覆盖同步过期、
DUST 耗尽及等待期间关闭。全部 359 项检查通过（353 项 Node、六项 Hardhat）；
记录及摘要见上文。这项保护尚不能认定为错误 170 的修复。

大文件传输超时后，使用已有且哈希一致的 midnight-zkir 2.1.0，由完全相同的公开
程序和参数重新生成全部 11 组密钥，逐字节匹配原清单。耗时及内存峰值见上文；这是
密钥构建测量，不是交易证明延迟。密钥生成清理未能关闭 swap，随后独立主机恢复
成功，核验 swap 关闭、swappiness 为零；原失败及未明原因保留。实际 npm 下载也
通过依赖锁文件完整性验证。

第一次预检使用 Docker 内部网络：请求映射被接受，实际映射却缺失，回环健康检查
失败，该次未初始化钱包或提交交易。改为专用 NAT 桥接网络及明确回环映射后，在
配置明文输入之前核验实际 Docker 映射、主机监听、回环 HTTP 200 和非回环拒绝。
保留私有默认值及云边界；上述 Docker 官方资料支持检查实际生效映射。

新加坡实例唯一安全组仅有该实例，SSH 仅向 Workbench 私有网段开放，没有公网
开发 API 或 IPv6 放行。保留公网能力及出站访问。外部探测未收到应用字节，但不一致
的 TCP 握手不能单独证明持久访问控制；主要证据是生效云规则和实际回环监听。
本次未部署公开网站。

仅配置明确授权的一次性 Preprod 钱包、三份快照及可替换测试凭据。上述加密方案
保证 OSS 中转只收到密文；root 专用明文位于源码、镜像和公开网站目录外。排除
阿里云凭据、本地网络示例助记词、私有代理指令及既有私有信息流数据。失败运行后
客户端／证明器已停止，专用容器／网络及临时明文／传输材料已清除，swap 关闭，
swappiness 恢复；仅保留一份属主可读合成治理材料用于继续恢复。

本次记录三次提交边界、两次 SDK 返回。独立核验确认两笔成功交易，并在最终区块
3012987 读取状态：模块为提案状态，权限版本／序号 1／1，注册序号 1，无活跃模板
或运行实例。第三笔未被索引不等于拒绝，另保留 RPC 拒绝证据。未保留被拒交易字节，
无法由公开记录重建其 DUST 内容。原控制器 walletInitialized=false 是准备阶段字段
未更新造成的报告错误，实际已初始化并提交两笔；原报告保留，不静默改写。

主要证据及首次预检失败记录见上述文件。后续不提交诊断针对现有合约构建审核交易，
在提交边界强制拦截，不调用钱包发送；结果另外记录，不能倒推或替换原候选。HTTP
功能查询失败，之前 dry-run／运行时验证也未取得可用交易有效性结果。

不提交诊断已完成合约证明及钱包配平，随后拦截了一笔包含一个 DUST 支出的候选。
只读运行时验证返回 RPC 4003，未取得有效性结果；未签名空备注也返回 4003 并匹配
WASM 陷阱／panic 标记，因此不能据此判定审核候选无效。诊断随后因预期拦截错误
原样返回而失败，实际 SDK 会使用 cause 包装根提交错误。保留原失败结果；修正后的
有界 cause 检查通过三项测试，包含实际 SDK 包装行为，但修正运行器尚未重跑。
之后独立核验最新索引操作仍为规范链最终区块 3012987 中的提案，审核数为零、无
运行实例。最初使用任意最终区块偏移读取状态失败，不计为成功。诊断未提交交易。

工作中至少每 30 分钟核验并将真实一次性平稳 StopCharging 停机延后至两小时后，
线程心跳备用。保留此前调度超时及取消记录，后续续期成功。最终调度须等待自有
任务停止、临时凭据清除及公开结果下载核验。保留实例和磁盘，没有自动删除或扩大
RAM 权限。11.5 GiB 证明器上限及临时 8 GiB swap 属于诊断配置，不证明较小产品
内存预算达标。运行时、通用收据、隐私、重放／重启和下游验收仍待完成。本地 Docker
Desktop 返回 HTTP 500，未建立本地重启验收；v1 文档保留为历史准备说明。
